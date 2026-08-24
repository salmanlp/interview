import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { computeResult } from '@/lib/scoring';
import { questionState } from '@/lib/interview';
import type { Answer, Interview } from '@/lib/types';
import { cx, now } from '@/lib/utils';
import { Button, IconButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Kbd } from '@/components/ui/Badge';
import { EmptyState, ProgressBar } from '@/components/ui/Misc';
import { SaveIndicator, ScoreChip } from '@/components/ui/DomainBadges';
import { ConfirmDialog } from '@/components/ui/Modal';
import { InterviewTimer } from '@/components/interview/InterviewTimer';
import { QuestionNavigator } from '@/components/interview/QuestionNavigator';
import { ScoreSelector } from '@/components/interview/ScoreSelector';
import { NotesEditor } from '@/components/interview/NotesEditor';
import { QuestionGuidance } from '@/components/interview/QuestionGuidance';
import { CompleteInterviewModal } from '@/components/interview/CompleteInterviewModal';
import { ChallengeCriteria } from '@/components/interview/ChallengeCriteria';
import { ShortcutsModal } from '@/components/layout/ShortcutsModal';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useToast } from '@/store/ToastProvider';

/** Timer ticks are frequent; persist them on a slower cadence than edits. */
const TIMER_PERSIST_MS = 5000;

export function InterviewWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    interviews,
    candidates,
    settings,
    saveInterview,
    saveCandidate,
    logEvent,
    saveState,
    lastSavedAt,
  } = useAppStore();

  const stored = interviews.find((i) => i.id === id) ?? null;
  const [draft, setDraft] = useState<Interview | null>(stored);
  const [navOpen, setNavOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const isCompactViewport = !useMediaQuery('(min-width: 1024px)');

  const dirtyRef = useRef(false);
  const draftRef = useRef<Interview | null>(draft);
  const timerPersistRef = useRef(0);
  const questionEnteredAt = useRef(Date.now());

  // Adopt the stored interview once, then own the working copy locally so
  // typing and scoring never wait on a database round-trip.
  useEffect(() => {
    if (stored && (!draft || draft.id !== stored.id)) {
      setDraft(stored);
      draftRef.current = stored;
    }
  }, [stored, draft]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const candidate = candidates.find((c) => c.id === draft?.candidateId) ?? null;
  const readOnly = draft?.status === 'completed';

  /**
   * Entering the workspace *is* resuming: an interview that was left paused
   * starts counting again, and the resume is recorded in the audit trail.
   */
  const resumedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!draft || draft.status !== 'in_progress' || !draft.paused) return;
    if (resumedRef.current === draft.id) return;
    resumedRef.current = draft.id;
    const scored = Object.values(draft.answers).filter((a) => a.score != null || a.skipped).length;
    draftRef.current = { ...draft, paused: false };
    dirtyRef.current = true;
    setDraft(draftRef.current);
    void logEvent(
      'interview_resumed',
      `Interview resumed at question ${draft.currentQuestionIndex + 1} of ${draft.questions.length} (${scored} already answered).`,
      { candidateId: draft.candidateId, interviewId: draft.id },
    );
  }, [draft, logEvent]);

  /**
   * Always mutate from the ref, never from React state. The timer writes the
   * running elapsed time into the ref every second but only re-renders every
   * few seconds, so a state-based update would quietly roll the clock back.
   */
  const update = useCallback((mutate: (interview: Interview) => Interview) => {
    const current = draftRef.current;
    if (!current) return;
    const next = mutate(current);
    draftRef.current = next;
    dirtyRef.current = true;
    setDraft(next);
  }, []);

  /** Pushes the ref (including the live elapsed time) into React state. */
  const syncFromRef = useCallback(() => {
    if (draftRef.current) setDraft(draftRef.current);
  }, []);

  /* ------------------------------------------------------------- autosave */
  const flush = useCallback(async () => {
    const current = draftRef.current;
    if (!current || !dirtyRef.current) return;
    dirtyRef.current = false;
    await saveInterview(current);
  }, [saveInterview]);

  useEffect(() => {
    const interval = setInterval(() => {
      void flush();
    }, Math.max(500, settings.autosaveMs));
    return () => {
      clearInterval(interval);
      void flush();
    };
  }, [flush, settings.autosaveMs]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onBeforeUnload = () => {
      void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onBeforeUnload);
    };
  }, [flush]);

  /* ------------------------------------------------------------ navigation */
  const goTo = useCallback(
    (index: number) => {
      const current = draftRef.current;
      if (!current) return;
      const bounded = Math.max(0, Math.min(current.questions.length - 1, index));
      const spent = Date.now() - questionEnteredAt.current;
      questionEnteredAt.current = Date.now();
      update((interview) => {
        const questionId = interview.questions[interview.currentQuestionIndex]?.questionId;
        const answers = { ...interview.answers };
        if (questionId && answers[questionId]) {
          answers[questionId] = {
            ...answers[questionId],
            timeSpentMs: answers[questionId].timeSpentMs + spent,
          };
        }
        return { ...interview, answers, currentQuestionIndex: bounded };
      });
      setNavOpen(false);
    },
    [update],
  );

  const patchAnswer = useCallback(
    (patch: Partial<Answer>) => {
      update((interview) => {
        const question = interview.questions[interview.currentQuestionIndex];
        if (!question) return interview;
        const existing =
          interview.answers[question.questionId] ??
          ({
            questionId: question.questionId,
            score: null,
            notes: '',
            flagged: false,
            skipped: false,
            timeSpentMs: 0,
            updatedAt: now(),
          } satisfies Answer);
        return {
          ...interview,
          answers: {
            ...interview.answers,
            [question.questionId]: { ...existing, ...patch, updatedAt: now() },
          },
        };
      });
    },
    [update],
  );

  const question = draft?.questions[draft.currentQuestionIndex] ?? null;
  const answer = question ? draft?.answers[question.questionId] : undefined;

  const result = useMemo(
    () =>
      draft
        ? computeResult({ questions: draft.questions, answers: draft.answers, scoring: draft.scoring })
        : null,
    [draft],
  );

  /* ----------------------------------------------------------- shortcuts */
  useEffect(() => {
    if (!draft || readOnly) return;
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void flush().then(() => toast.success('Saved', 'Interview stored in this browser.'));
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();
      if (key === 'n' || event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(draftRef.current!.currentQuestionIndex + 1);
      } else if (key === 'p' || event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(draftRef.current!.currentQuestionIndex - 1);
      } else if (key === 'f') {
        event.preventDefault();
        const current = draftRef.current!;
        const q = current.questions[current.currentQuestionIndex];
        patchAnswer({ flagged: !current.answers[q.questionId]?.flagged });
      } else if (key === 's') {
        event.preventDefault();
        const current = draftRef.current!;
        const q = current.questions[current.currentQuestionIndex];
        const skipped = !current.answers[q.questionId]?.skipped;
        patchAnswer({ skipped, score: skipped ? null : current.answers[q.questionId]?.score ?? null });
      } else if (event.key === ' ') {
        event.preventDefault();
        update((interview) => ({ ...interview, paused: !interview.paused }));
      } else if (/^[1-9]$/.test(event.key)) {
        const value = Number(event.key);
        if (value <= draftRef.current!.scoring.scaleMax) {
          event.preventDefault();
          patchAnswer({ score: value, skipped: false });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [draft, readOnly, goTo, patchAnswer, update, flush, toast]);

  /* ----------------------------------------------------------- completion */
  const complete = async () => {
    const current = draftRef.current;
    if (!current || !result) return;
    setCompleting(true);
    try {
      const completed: Interview = {
        ...current,
        status: 'completed',
        completedAt: now(),
        paused: true,
        autoRecommendation: result.recommendation,
      };
      draftRef.current = completed;
      dirtyRef.current = false;
      setDraft(completed);
      await saveInterview(completed);
      if (candidate) {
        await saveCandidate({ ...candidate, status: 'under_review' });
      }
      await logEvent(
        'interview_completed',
        `${completed.roundLabel} completed — ${result.percentage}% weighted (${result.rawScore}/${result.maxPossible} raw), ${result.scoredCount} scored and ${result.skippedCount} skipped.`,
        { candidateId: completed.candidateId, interviewId: completed.id },
      );
      setCompleteOpen(false);
      toast.success('Interview completed', 'Add your summary and confirm the hiring decision.');
      navigate(`/interviews/${completed.id}/review`, { replace: true });
    } finally {
      setCompleting(false);
    }
  };

  if (!stored && !draft) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas p-6">
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-2">
          <EmptyState
            icon="alertCircle"
            title="Interview not found"
            description="This interview may have been discarded, or the link is out of date."
            action={
              <Button variant="primary" icon="arrowLeft" onClick={() => navigate('/interviews')}>
                Back to interviews
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (!draft || !question || !result) return null;

  const total = draft.questions.length;
  const index = draft.currentQuestionIndex;
  const state = questionState(answer);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      {/* ------------------------------------------------------------ Top bar */}
      <header className="flex h-auto shrink-0 flex-wrap items-center gap-3 border-b border-line bg-surface px-3 py-2.5 sm:h-16 sm:flex-nowrap sm:px-4 sm:py-0">
        <button
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Toggle question list"
          aria-expanded={navOpen}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink lg:hidden"
        >
          <Icon name="list" size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">
              {candidate?.name ?? 'Unknown candidate'}
            </h1>
            {readOnly ? (
              <span className="shrink-0 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-medium text-muted">
                Read-only
              </span>
            ) : null}
          </div>
          <p className="truncate text-[12px] leading-tight text-muted">
            {draft.position} · {draft.templateName} · {draft.roundLabel}
          </p>
        </div>

        <div className="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto">
          <InterviewTimer
            elapsedMs={draft.elapsedMs}
            durationMinutes={draft.durationMinutes}
            paused={draft.paused}
            warningMinutes={settings.warningMinutes}
            criticalMinutes={settings.criticalMinutes}
            readOnly={readOnly}
            onTick={(elapsed) => {
              const current = draftRef.current;
              if (!current) return;
              // The clock lives in the ref; the visible digits are local to the
              // timer component, so ticking never re-renders the workspace.
              draftRef.current = { ...current, elapsedMs: elapsed };
              if (Date.now() - timerPersistRef.current > TIMER_PERSIST_MS) {
                timerPersistRef.current = Date.now();
                dirtyRef.current = true;
              }
            }}
            onTogglePause={() => update((i) => ({ ...i, paused: !i.paused }))}
          />

          <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
            <div className="hidden md:block">
              <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
            </div>
            <IconButton
              icon="keyboard"
              label="Keyboard shortcuts"
              onClick={() => setShortcutsOpen(true)}
              className="hidden sm:inline-flex"
            />
            <IconButton
              icon="x"
              label="Exit interview"
              onClick={() => {
                syncFromRef();
                setExitOpen(true);
              }}
            />
            {readOnly ? (
              <Button
                variant="secondary"
                size="sm"
                icon="fileText"
                onClick={() => navigate(`/interviews/${draft.id}/review`)}
              >
                View assessment
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon="check"
                onClick={() => {
                  syncFromRef();
                  setCompleteOpen(true);
                }}
              >
                <span className="hidden sm:inline">Finish interview</span>
                <span className="sm:hidden">Finish</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ------------------------------------------------------ Navigator */}
        <aside
          className={cx(
            'w-64 shrink-0 border-r border-line bg-surface',
            'hidden lg:block',
          )}
        >
          <QuestionNavigator
            questions={draft.questions}
            answers={draft.answers}
            currentIndex={index}
            onSelect={goTo}
          />
        </aside>

        {navOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0"
              style={{ background: 'var(--overlay)' }}
              onClick={() => setNavOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-72 animate-slide-in border-r border-line bg-surface shadow-pop">
              <QuestionNavigator
                questions={draft.questions}
                answers={draft.answers}
                currentIndex={index}
                onSelect={goTo}
              />
            </div>
          </div>
        ) : null}

        {/* ----------------------------------------------------- Main column */}
        <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 2xl:max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-md bg-brand-soft px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-ink">
                  {question.sectionTitle}
                </span>
                <span className="text-[12px] text-muted">{question.category}</span>
              </div>
              <p className="text-[12px] font-medium text-muted tabular">
                Question <span className="text-ink">{index + 1}</span> / {total}
              </p>
            </div>

            <ProgressBar value={index + 1} max={total} size="xs" className="mb-6" />

            <h2 className="text-[21px] font-semibold leading-snug tracking-[-0.01em] text-ink">
              {question.text}
            </h2>

            <div className="mt-4 2xl:hidden">
              <QuestionGuidance question={question} compact={isCompactViewport} />
            </div>

            <div className="mt-6">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h3 className="text-[13px] font-medium text-ink-2">Score this answer</h3>
                {answer?.skipped ? (
                  <span className="text-[12px] font-medium text-muted">Marked as skipped</span>
                ) : null}
              </div>
              <ScoreSelector
                value={answer?.score ?? null}
                scoring={draft.scoring}
                disabled={readOnly}
                onChange={(score) => patchAnswer({ score, skipped: false })}
              />
            </div>

            <div className="mt-6">
              <NotesEditor
                value={answer?.notes ?? ''}
                disabled={readOnly}
                autoFocusKey={question.questionId}
                onChange={(notes) => patchAnswer({ notes })}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                variant={answer?.flagged ? 'primary' : 'secondary'}
                size="sm"
                icon="flag"
                disabled={readOnly}
                onClick={() => patchAnswer({ flagged: !answer?.flagged })}
                aria-pressed={Boolean(answer?.flagged)}
              >
                {answer?.flagged ? 'Flagged' : 'Flag question'}
                <Kbd>F</Kbd>
              </Button>
              <Button
                variant={answer?.skipped ? 'primary' : 'secondary'}
                size="sm"
                icon="skip"
                disabled={readOnly}
                onClick={() => {
                  const skipped = !answer?.skipped;
                  patchAnswer({ skipped, score: skipped ? null : (answer?.score ?? null) });
                }}
                aria-pressed={Boolean(answer?.skipped)}
              >
                {answer?.skipped ? 'Skipped' : 'Mark as skipped'}
                <Kbd>S</Kbd>
              </Button>
              <span className="ml-auto text-[12px] text-subtle">
                {state === 'scored'
                  ? 'Scored'
                  : state === 'answered'
                    ? 'Notes recorded, not scored'
                    : state === 'flagged'
                      ? 'Flagged for follow-up'
                      : state === 'skipped'
                        ? 'Skipped'
                        : 'Not started'}
              </span>
            </div>

            <nav className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
              <Button
                variant="secondary"
                icon="arrowLeft"
                disabled={index === 0}
                onClick={() => goTo(index - 1)}
              >
                Previous
                <Kbd>P</Kbd>
              </Button>

              <span className="hidden text-[12px] text-subtle sm:block tabular">
                {result.scoredCount} scored · {result.skippedCount} skipped · {result.rawScore}/
                {result.maxPossible}
              </span>

              {index === total - 1 ? (
                <Button
                  variant="primary"
                  iconRight="check"
                  disabled={readOnly}
                  onClick={() => {
                    syncFromRef();
                    setCompleteOpen(true);
                  }}
                >
                  Finish interview
                </Button>
              ) : (
                <Button variant="primary" iconRight="arrowRight" onClick={() => goTo(index + 1)}>
                  Next
                  <Kbd>N</Kbd>
                </Button>
              )}
            </nav>

            {draft.challenge.enabled ? (
              <section className="mt-8 rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
                    <Icon name="zap" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-semibold text-ink">Practical design challenge</h3>
                    <p className="mt-0.5 text-[12px] text-muted">
                      Scored separately from the question set.
                    </p>
                  </div>
                  <ScoreChip score={draft.challenge.score} scaleMax={draft.scoring.scaleMax} showMax />
                </div>
                <p className="mt-3 whitespace-pre-line rounded-lg border border-line bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-2">
                  {draft.challenge.brief}
                </p>
                <div className="mt-3">
                  <ChallengeCriteria
                    challenge={draft.challenge}
                    scaleMax={draft.scoring.scaleMax}
                    disabled={readOnly}
                    onChange={(criteria) =>
                      update((i) => ({ ...i, challenge: { ...i.challenge, criteria } }))
                    }
                  />
                </div>

                <div className="mt-3">
                  <p className="mb-2 text-[13px] font-medium text-ink-2">Overall challenge score</p>
                  <ScoreSelector
                    value={draft.challenge.score}
                    scoring={draft.scoring}
                    size="md"
                    disabled={readOnly}
                    onChange={(score) =>
                      update((i) => ({ ...i, challenge: { ...i.challenge, score } }))
                    }
                  />
                </div>
                <div className="mt-3">
                  <NotesEditor
                    label="Challenge notes"
                    rows={4}
                    value={draft.challenge.notes}
                    disabled={readOnly}
                    autoFocusKey="challenge"
                    placeholder="Auto Layout use, component structure, states, accessibility, how they talked through it…"
                    onChange={(notes) =>
                      update((i) => ({ ...i, challenge: { ...i.challenge, notes } }))
                    }
                  />
                </div>
              </section>
            ) : null}
          </div>
        </main>

        {/* ------------------------------------------------------ Guidance rail */}
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-line bg-canvas p-4 scrollbar-thin 2xl:block">
          <QuestionGuidance question={question} />

          <div className="mt-4 rounded-xl border border-line bg-surface p-3.5">
            <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-subtle">
              Running total
            </h3>
            <dl className="space-y-2 text-[12.5px]">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Raw</dt>
                <dd className="font-medium text-ink tabular">
                  {result.rawScore} / {result.maxPossible}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Weighted</dt>
                <dd className="font-medium text-ink tabular">
                  {result.weightedScore} / {result.weightedMax}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Percentage</dt>
                <dd className="font-medium text-ink tabular">{result.percentage}%</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Average</dt>
                <dd className="font-medium text-ink tabular">
                  {result.averageScore} / {draft.scoring.scaleMax}
                </dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-snug text-subtle">
              Percentages are calculated from scored questions only, so skipped or unasked questions
              do not count against the candidate.
            </p>
          </div>
        </aside>
      </div>

      <CompleteInterviewModal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onConfirm={complete}
        interview={draft}
        result={result}
        loading={completing}
      />

      <ConfirmDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        onConfirm={async () => {
          await flush();
          setExitOpen(false);
          navigate('/interviews');
        }}
        title="Leave the interview?"
        description="Everything you have scored and written is already saved. You can resume from the dashboard at any time."
        confirmLabel="Leave and resume later"
      />

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <Link
        to="/"
        className="sr-only-focusable fixed left-4 top-4 z-50 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
