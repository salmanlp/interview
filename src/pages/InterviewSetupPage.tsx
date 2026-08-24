import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { createInterview, nextRoundNumber, ROUND_LABEL_SUGGESTIONS } from '@/lib/interview';
import type { InterviewMode } from '@/lib/types';
import { cx } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input, Select, Switch } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Avatar, DataNotice, EmptyState } from '@/components/ui/Misc';
import { CandidateForm } from '@/components/candidates/CandidateForm';
import { useToast } from '@/store/ToastProvider';

const DURATIONS = [15, 30, 45, 60];

const MODES: { value: InterviewMode; label: string; description: string }[] = [
  {
    value: 'structured',
    label: 'Structured',
    description: 'Every question in template order. Best for comparable, defensible scoring.',
  },
  {
    value: 'semi_structured',
    label: 'Semi-structured',
    description: 'Same question set, but skip freely and follow the conversation.',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Treat the template as a prompt sheet — score only what you ask.',
  },
];

export function InterviewSetupPage() {
  const {
    candidates,
    interviews,
    templates,
    questions,
    settings,
    saveInterview,
    saveCandidate,
    logEvent,
  } = useAppStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();

  const activeCandidates = useMemo(() => candidates.filter((c) => !c.archived), [candidates]);
  const [candidateId, setCandidateId] = useState(params.get('candidate') ?? '');
  const [templateId, setTemplateId] = useState(
    templates.find((t) => t.isDefault)?.id ?? templates[0]?.id ?? '',
  );
  const [interviewer, setInterviewer] = useState(settings.interviewerName);
  const [duration, setDuration] = useState(settings.defaultDurationMinutes);
  const [customDuration, setCustomDuration] = useState(false);
  const [mode, setMode] = useState<InterviewMode>('structured');
  const [position, setPosition] = useState('');
  const [roundLabel, setRoundLabel] = useState('');
  const [includeChallenge, setIncludeChallenge] = useState(false);
  const [candidateFormOpen, setCandidateFormOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const candidate = candidates.find((c) => c.id === candidateId) ?? null;
  const template = templates.find((t) => t.id === templateId) ?? null;
  const round = candidate ? nextRoundNumber(interviews, candidate.id) : 1;

  useEffect(() => {
    if (candidate) setPosition(candidate.position);
  }, [candidate]);

  useEffect(() => {
    if (template) {
      setDuration(template.durationMinutes);
      setMode(template.mode);
    }
  }, [template]);

  useEffect(() => {
    setRoundLabel(ROUND_LABEL_SUGGESTIONS[Math.min(round - 1, ROUND_LABEL_SUGGESTIONS.length - 1)]);
  }, [round]);

  const questionCount = useMemo(() => {
    if (!template) return 0;
    const active = new Set(questions.filter((q) => q.active).map((q) => q.id));
    return template.sections.reduce(
      (acc, s) => acc + s.questions.filter((q) => active.has(q.questionId)).length,
      0,
    );
  }, [template, questions]);

  const openInterview = interviews.find(
    (i) => i.status === 'in_progress' && i.candidateId === candidateId,
  );

  const start = async () => {
    if (!candidate || !template) return;
    if (!questionCount) {
      toast.error('This template has no active questions', 'Add questions to the template before starting.');
      return;
    }
    setStarting(true);
    try {
      const interview = createInterview({
        candidate,
        template,
        questions,
        interviewer: interviewer.trim() || settings.interviewerName,
        position: position.trim() || candidate.position,
        durationMinutes: duration,
        mode,
        round,
        roundLabel: roundLabel.trim() || `Round ${round}`,
        includeChallenge,
        settings,
      });
      await saveInterview(interview);
      if (candidate.status === 'new' || candidate.status === 'scheduled') {
        await saveCandidate({ ...candidate, status: 'in_progress' });
      }
      await logEvent(
        'interview_started',
        `${interview.roundLabel} started using "${template.name}" (${questionCount} questions, ${duration} min).`,
        { candidateId: candidate.id, interviewId: interview.id },
      );
      navigate(`/interviews/${interview.id}`, { replace: true });
    } finally {
      setStarting(false);
    }
  };

  if (!templates.length) {
    return (
      <Card>
        <EmptyState
          icon="layers"
          title="No interview templates"
          description="An interview needs a template. Create one, or restore the default from Settings."
          action={
            <Button variant="primary" icon="plus" onClick={() => navigate('/templates')}>
              Go to templates
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title="Start an interview"
        description="Set up the session. The timer starts as soon as you begin, and everything is saved automatically."
        actions={
          <Button variant="ghost" icon="arrowLeft" onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Candidate"
              description="Who are you interviewing?"
              action={
                <Button variant="secondary" size="sm" icon="plus" onClick={() => setCandidateFormOpen(true)}>
                  New candidate
                </Button>
              }
            />
            {activeCandidates.length === 0 ? (
              <EmptyState
                icon="users"
                title="No candidates yet"
                description="Create a candidate record before starting an interview."
                action={
                  <Button variant="primary" icon="plus" onClick={() => setCandidateFormOpen(true)}>
                    New candidate
                  </Button>
                }
                compact
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Candidate" required className="sm:col-span-2">
                  {({ id }) => (
                    <Select id={id} value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
                      <option value="">Select a candidate…</option>
                      {activeCandidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.position}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                {candidate ? (
                  <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-line bg-surface-2 p-3">
                    <Avatar name={candidate.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{candidate.name}</p>
                      <p className="truncate text-[12px] text-muted">
                        {candidate.position} · {candidate.yearsExperience} yrs
                        {candidate.location ? ` · ${candidate.location}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-surface px-2 py-1 text-[11.5px] font-medium text-muted">
                      Round {round}
                    </span>
                  </div>
                ) : null}

                <Field label="Position interviewed for" required>
                  {({ id }) => (
                    <Input id={id} value={position} onChange={(e) => setPosition(e.target.value)} />
                  )}
                </Field>

                <Field label="Round label" hint="Shown in the candidate's interview history.">
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      value={roundLabel}
                      onChange={(e) => setRoundLabel(e.target.value)}
                      list="round-suggestions"
                    />
                  )}
                </Field>
                <datalist id="round-suggestions">
                  {ROUND_LABEL_SUGGESTIONS.map((label) => (
                    <option key={label} value={label} />
                  ))}
                </datalist>
              </div>
            )}

            {openInterview ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-warn/40 bg-warn-soft/60 p-3">
                <Icon name="alertTriangle" size={16} className="text-warn" />
                <p className="flex-1 text-[12.5px] text-ink-2">
                  This candidate already has an unfinished interview. Starting a new one leaves the old
                  one in progress.
                </p>
                <Button size="sm" variant="secondary" onClick={() => navigate(`/interviews/${openInterview.id}`)}>
                  Resume it
                </Button>
              </div>
            ) : null}
          </Card>

          <Card>
            <CardHeader title="Template" description="Which question set will you run?" />
            <div className="space-y-2">
              {templates.map((t) => {
                const count = t.sections.reduce((acc, s) => acc + s.questions.length, 0);
                const active = t.id === templateId;
                return (
                  <label
                    key={t.id}
                    className={cx(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                      active ? 'border-brand bg-brand-soft/40' : 'border-line hover:bg-surface-2',
                    )}
                  >
                    <input
                      type="radio"
                      name="template"
                      value={t.id}
                      checked={active}
                      onChange={() => setTemplateId(t.id)}
                      className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-medium text-ink">{t.name}</span>
                        {t.isDefault ? (
                          <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10.5px] font-medium text-muted">
                            Default
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">
                        {t.description}
                      </span>
                      <span className="mt-1.5 block text-[11.5px] text-subtle tabular">
                        {count} questions · {t.sections.length} sections · {t.durationMinutes} min
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Session" description="Duration, mode and interviewer." />
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink-2">Interview duration</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Interview duration">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      role="radio"
                      aria-checked={!customDuration && duration === d}
                      onClick={() => {
                        setDuration(d);
                        setCustomDuration(false);
                      }}
                      className={cx(
                        'h-9 rounded-lg border px-3.5 text-[13px] font-medium transition-colors tabular',
                        !customDuration && duration === d
                          ? 'border-brand bg-brand-soft text-brand-ink'
                          : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2',
                      )}
                    >
                      {d} min
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={customDuration}
                    onClick={() => setCustomDuration(true)}
                    className={cx(
                      'h-9 rounded-lg border px-3.5 text-[13px] font-medium transition-colors',
                      customDuration
                        ? 'border-brand bg-brand-soft text-brand-ink'
                        : 'border-line-strong bg-surface text-ink-2 hover:bg-surface-2',
                    )}
                  >
                    Custom
                  </button>
                </div>
                {customDuration ? (
                  <div className="mt-2.5 flex items-center gap-2">
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      value={duration}
                      onChange={(e) => setDuration(Math.max(5, Math.min(240, Number(e.target.value))))}
                      className="w-24"
                      aria-label="Custom duration in minutes"
                    />
                    <span className="text-[13px] text-muted">minutes</span>
                  </div>
                ) : null}
                <p className="mt-2 text-[11.5px] text-subtle">
                  The timer keeps running past the scheduled time rather than stopping.
                </p>
              </div>

              <Field label="Interviewer" required>
                {({ id }) => (
                  <Input id={id} value={interviewer} onChange={(e) => setInterviewer(e.target.value)} />
                )}
              </Field>

              <div className="sm:col-span-2">
                <p className="mb-2 text-[13px] font-medium text-ink-2">Interview mode</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {MODES.map((m) => (
                    <label
                      key={m.value}
                      className={cx(
                        'flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors',
                        mode === m.value ? 'border-brand bg-brand-soft/40' : 'border-line hover:bg-surface-2',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === m.value}
                          onChange={() => setMode(m.value)}
                          className="h-4 w-4 accent-[var(--brand)]"
                        />
                        <span className="text-[13px] font-medium text-ink">{m.label}</span>
                      </span>
                      <span className="text-[11.5px] leading-snug text-muted">{m.description}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 rounded-lg border border-line bg-surface-2 p-3.5">
                <Switch
                  checked={includeChallenge}
                  onChange={setIncludeChallenge}
                  label="Include the practical Figma challenge"
                  description="Adds an optional login-form design task, scored separately from the question set."
                />
              </div>
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title="Ready to start" />
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Candidate</dt>
                <dd className="truncate font-medium text-ink">{candidate?.name ?? '—'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Template</dt>
                <dd className="truncate text-right font-medium text-ink">{template?.name ?? '—'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Questions</dt>
                <dd className="font-medium text-ink tabular">{questionCount}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Maximum score</dt>
                <dd className="font-medium text-ink tabular">
                  {questionCount * (template?.scoring?.scaleMax ?? settings.scoring.scaleMax)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Duration</dt>
                <dd className="font-medium text-ink tabular">{duration} min</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-muted">Round</dt>
                <dd className="font-medium text-ink tabular">{round}</dd>
              </div>
              {includeChallenge ? (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Challenge</dt>
                  <dd className="font-medium text-ink">Included</dd>
                </div>
              ) : null}
            </dl>

            <Button
              variant="primary"
              size="lg"
              full
              icon="play"
              className="mt-5"
              disabled={!candidate || !template || !questionCount}
              loading={starting}
              onClick={start}
            >
              Start interview
            </Button>
            {!candidate ? (
              <p className="mt-2 text-center text-[11.5px] text-subtle">Select a candidate to continue.</p>
            ) : null}

            <div className="mt-4 border-t border-line pt-3.5">
              <DataNotice />
            </div>
          </Card>
        </aside>
      </div>

      <CandidateForm
        open={candidateFormOpen}
        onClose={() => setCandidateFormOpen(false)}
        onSaved={(created) => setCandidateId(created.id)}
      />
    </>
  );
}
