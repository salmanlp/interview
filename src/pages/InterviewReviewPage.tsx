import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { computeResult } from '@/lib/scoring';
import {
  CHALLENGE_CRITERIA,
  DECISION_LABELS,
  RECOMMENDATION_LABELS,
  SKILL_LABELS,
  type HiringDecision,
  type Interview,
} from '@/lib/types';
import { candidateExport, downloadCsv, downloadJson, interviewCsv, reportFilename } from '@/lib/exporters';
import { cx, formatClock, formatDate, formatDuration } from '@/lib/utils';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Avatar, EmptyState, Tabs } from '@/components/ui/Misc';
import {
  DecisionBadge,
  PercentageDisplay,
  RecommendationBadge,
  ScoreChip,
} from '@/components/ui/DomainBadges';
import { ConfirmDialog } from '@/components/ui/Modal';
import {
  QuestionScoreList,
  SectionScores,
  SkillBreakdown,
  StrengthsAndGaps,
} from '@/components/interview/AssessmentBreakdown';
import { useToast } from '@/store/ToastProvider';

type Tab = 'summary' | 'sections' | 'questions';

const DECISIONS: HiringDecision[] = ['strong_hire', 'hire', 'hold', 'no_hire'];

export function InterviewReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { interviews, candidates, saveInterview, saveCandidate, logEvent } = useAppStore();

  const interview = interviews.find((i) => i.id === id) ?? null;
  const candidate = candidates.find((c) => c.id === interview?.candidateId) ?? null;

  const [tab, setTab] = useState<Tab>('summary');
  const [summary, setSummary] = useState(interview?.summary ?? '');
  const [decision, setDecision] = useState<HiringDecision | null>(interview?.decision ?? null);
  const [overrideReason, setOverrideReason] = useState(interview?.overrideReason ?? '');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!interview) return;
    setSummary(interview.summary);
    setDecision(interview.decision);
    setOverrideReason(interview.overrideReason);
    setTouched(false);
  }, [interview?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = useMemo(
    () =>
      interview
        ? computeResult({
            questions: interview.questions,
            answers: interview.answers,
            scoring: interview.scoring,
          })
        : null,
    [interview],
  );

  if (!interview || !result) {
    return (
      <Card>
        <EmptyState
          icon="alertCircle"
          title="Interview not found"
          description="It may have been discarded, or the link is out of date."
          action={
            <LinkButton to="/interviews" variant="primary" icon="arrowLeft">
              Back to interviews
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const autoDecision = mapRecommendation(result.recommendation);
  const isOverride = decision != null && autoDecision != null && decision !== autoDecision;
  const needsReason = isOverride && !overrideReason.trim();
  const inProgress = interview.status === 'in_progress';

  const save = async () => {
    if (needsReason) {
      toast.error('A reason is required', 'Explain why your decision differs from the calculated recommendation.');
      return;
    }
    setSaving(true);
    try {
      const decisionChanged = decision !== interview.decision;
      const next: Interview = {
        ...interview,
        summary,
        decision,
        overrideReason: isOverride ? overrideReason.trim() : '',
        autoRecommendation: result.recommendation,
      };
      await saveInterview(next);

      if (decisionChanged && decision && candidate) {
        const statusMap: Record<HiringDecision, typeof candidate.status> = {
          strong_hire: 'strong_hire',
          hire: 'hire',
          hold: 'hold',
          no_hire: 'no_hire',
        };
        await saveCandidate({ ...candidate, status: statusMap[decision] });
        await logEvent(
          'recommendation_changed',
          isOverride
            ? `Hiring decision set to ${DECISION_LABELS[decision]}, overriding the calculated ${result.recommendation ? RECOMMENDATION_LABELS[result.recommendation] : 'result'}. Reason: ${overrideReason.trim()}`
            : `Hiring decision set to ${DECISION_LABELS[decision]}.`,
          { candidateId: interview.candidateId, interviewId: interview.id },
        );
      }
      setTouched(false);
      toast.success('Assessment saved', decision ? DECISION_LABELS[decision] : undefined);
    } finally {
      setSaving(false);
    }
  };

  const reopen = async () => {
    await saveInterview({
      ...interview,
      status: 'in_progress',
      paused: true,
      editedAfterCompletion: true,
    });
    await logEvent('interview_edited', 'Completed assessment reopened for editing.', {
      candidateId: interview.candidateId,
      interviewId: interview.id,
    });
    setReopenOpen(false);
    navigate(`/interviews/${interview.id}`);
  };

  const challengeCriteriaScored = Object.entries(interview.challenge.criteria).filter(
    ([, value]) => value != null,
  );

  return (
    <>
      <PageHeader
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-muted">
            <Link to="/interviews" className="hover:text-ink">
              Interviews
            </Link>
            <Icon name="chevronRight" size={12} />
            {candidate ? (
              <Link to={`/candidates/${candidate.id}`} className="hover:text-ink">
                {candidate.name}
              </Link>
            ) : (
              <span>Unknown candidate</span>
            )}
            <Icon name="chevronRight" size={12} />
            <span className="text-ink">{interview.roundLabel}</span>
          </nav>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            Interview assessment
            {interview.editedAfterCompletion ? (
              <span className="rounded-md border border-line bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted">
                Edited after completion
              </span>
            ) : null}
            {inProgress ? (
              <span className="rounded-md border border-warn/40 bg-warn-soft px-2 py-1 text-[11px] font-medium text-warn">
                Reopened — not finalised
              </span>
            ) : null}
          </span>
        }
        description={`${interview.templateName} · ${formatDate(interview.completedAt ?? interview.startedAt)} · ${formatDuration(interview.elapsedMs)} · ${interview.interviewer}`}
        actions={
          <>
            <Button
              variant="secondary"
              icon="download"
              onClick={() => {
                downloadJson(
                  candidateExport(candidate!, [interview]),
                  reportFilename(candidate?.name ?? 'candidate', 'json', 'interview'),
                );
                void logEvent('report_exported', 'Interview exported as JSON.', {
                  candidateId: interview.candidateId,
                  interviewId: interview.id,
                });
                toast.success('JSON exported');
              }}
              disabled={!candidate}
            >
              JSON
            </Button>
            <Button
              variant="secondary"
              icon="download"
              onClick={() => {
                downloadCsv(
                  interviewCsv(interview, candidate ?? undefined),
                  reportFilename(candidate?.name ?? 'candidate', 'csv', 'interview'),
                );
                void logEvent('report_exported', 'Interview exported as CSV.', {
                  candidateId: interview.candidateId,
                  interviewId: interview.id,
                });
                toast.success('CSV exported');
              }}
            >
              CSV
            </Button>
            <LinkButton to={`/interviews/${interview.id}/report`} variant="secondary" icon="fileText">
              Report
            </LinkButton>
            {inProgress ? (
              <Button variant="primary" icon="play" onClick={() => navigate(`/interviews/${interview.id}`)}>
                Continue interview
              </Button>
            ) : (
              <Button variant="secondary" icon="edit" onClick={() => setReopenOpen(true)}>
                Edit assessment
              </Button>
            )}
          </>
        }
      />

      {/* -------------------------------------------------------- Score header */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Avatar name={candidate?.name ?? '?'} size="lg" />
            <div className="min-w-0">
              <p className="text-[16px] font-semibold text-ink">{candidate?.name ?? 'Unknown candidate'}</p>
              <p className="text-[13px] text-muted">
                {interview.position} · {candidate?.yearsExperience ?? '—'} yrs experience
              </p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-x-8 gap-y-4">
            <Metric label="Weighted score">
              <PercentageDisplay
                percentage={result.scoredCount ? result.percentage : null}
                size="xl"
                thresholds={interview.scoring.thresholds}
              />
            </Metric>
            <Metric label="Raw score">
              <span className="text-[22px] font-semibold text-ink tabular">
                {result.rawScore}
                <span className="text-[14px] font-normal text-subtle">/{result.maxPossible}</span>
              </span>
            </Metric>
            <Metric label="Average">
              <span className="text-[22px] font-semibold text-ink tabular">
                {result.averageScore.toFixed(1)}
                <span className="text-[14px] font-normal text-subtle">/{interview.scoring.scaleMax}</span>
              </span>
            </Metric>
            <Metric label="Calculated">
              <RecommendationBadge recommendation={result.recommendation} />
            </Metric>
            <Metric label="Decision">
              <DecisionBadge decision={interview.decision} />
            </Metric>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4 lg:grid-cols-6">
          <MiniStat label="Questions" value={`${result.scoredCount}/${result.totalQuestions}`} />
          <MiniStat label="Skipped" value={String(result.skippedCount)} />
          <MiniStat label="Flagged" value={String(result.flaggedCount)} />
          <MiniStat label="Completion" value={`${result.completionPercentage}%`} />
          <MiniStat label="Duration" value={formatClock(interview.elapsedMs)} />
          <MiniStat
            label="Strongest"
            value={result.strongestSkill ? SKILL_LABELS[result.strongestSkill.skill] : '—'}
          />
        </div>
      </Card>

      <Tabs
        label="Assessment sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'summary', label: 'Summary', icon: 'fileText' },
          { value: 'sections', label: 'Section scores', icon: 'barChart', count: result.sections.length },
          { value: 'questions', label: 'Questions', icon: 'helpCircle', count: result.totalQuestions },
        ]}
      />

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-5">
        {tab === 'summary' ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-5">
              <Card>
                <CardHeader
                  title="Skill breakdown"
                  description="Question categories rolled up into skills, normalised to the interview's scale."
                />
                <SkillBreakdown result={result} scaleMax={interview.scoring.scaleMax} />
              </Card>

              <Card>
                <CardHeader
                  title="Strengths and development areas"
                  description="Derived from section scores — rule-based, no AI involved."
                />
                <StrengthsAndGaps result={result} />
              </Card>

              {interview.challenge.enabled ? (
                <Card>
                  <CardHeader
                    title="Practical design challenge"
                    description="Scored separately from the question set."
                    action={
                      <ScoreChip
                        score={interview.challenge.score}
                        scaleMax={interview.scoring.scaleMax}
                        size="lg"
                        showMax
                      />
                    }
                  />
                  <p className="whitespace-pre-line rounded-lg border border-line bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-2">
                    {interview.challenge.brief}
                  </p>
                  {challengeCriteriaScored.length ? (
                    <ul className="mt-3 grid gap-1.5 sm:grid-cols-3">
                      {CHALLENGE_CRITERIA.filter((c) => interview.challenge.criteria[c] != null).map((c) => (
                        <li key={c} className="flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5">
                          <span className="truncate text-[12px] text-ink-2">{c}</span>
                          <ScoreChip score={interview.challenge.criteria[c] ?? null} size="sm" />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {interview.challenge.notes ? (
                    <p className="mt-3 border-l-2 border-line pl-3 text-[13px] leading-relaxed text-ink-2">
                      {interview.challenge.notes}
                    </p>
                  ) : null}
                </Card>
              ) : null}
            </div>

            <div className="space-y-5">
              <Card>
                <CardHeader title="Interviewer summary" />
                <Field label="Overall assessment" className="[&>div:first-child]:sr-only">
                  {({ id }) => (
                    <Textarea
                      id={id}
                      rows={10}
                      value={summary}
                      onChange={(e) => {
                        setSummary(e.target.value);
                        setTouched(true);
                      }}
                      placeholder="What stood out, what concerned you, and what you would recommend to the hiring manager…"
                    />
                  )}
                </Field>
              </Card>

              <Card>
                <CardHeader
                  title="Hiring decision"
                  description={
                    result.recommendation
                      ? `Calculated recommendation: ${RECOMMENDATION_LABELS[result.recommendation]} (${result.percentage}%)`
                      : 'No score yet, so no recommendation has been calculated.'
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  {DECISIONS.map((option) => {
                    const active = decision === option;
                    const isAuto = autoDecision === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={active}
                        onClick={() => {
                          setDecision(active ? null : option);
                          setTouched(true);
                        }}
                        className={cx(
                          'relative rounded-lg border-2 px-3 py-2.5 text-left transition-colors',
                          active
                            ? 'border-brand bg-brand-soft/50'
                            : 'border-line hover:border-line-strong hover:bg-surface-2',
                        )}
                      >
                        <span className="block text-[13px] font-medium text-ink">
                          {DECISION_LABELS[option]}
                        </span>
                        {isAuto ? (
                          <span className="mt-0.5 block text-[11px] text-muted">Calculated</span>
                        ) : (
                          <span className="mt-0.5 block text-[11px] text-transparent">—</span>
                        )}
                        {active ? (
                          <Icon
                            name="check"
                            size={13}
                            strokeWidth={3}
                            className="absolute right-2 top-2 text-brand"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {isOverride ? (
                  <div className="mt-4 rounded-lg border border-warn/40 bg-warn-soft/50 p-3">
                    <p className="mb-2 flex items-start gap-2 text-[12px] leading-snug text-ink-2">
                      <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0 text-warn" />
                      You are overriding the calculated recommendation
                      {result.recommendation ? ` (${RECOMMENDATION_LABELS[result.recommendation]})` : ''}. A
                      reason is required and will be recorded in the audit trail.
                    </p>
                    <Field label="Reason for override" required error={needsReason && touched ? 'Please give a reason.' : null}>
                      {({ id, invalid }) => (
                        <Textarea
                          id={id}
                          rows={3}
                          invalid={invalid}
                          value={overrideReason}
                          onChange={(e) => {
                            setOverrideReason(e.target.value);
                            setTouched(true);
                          }}
                          placeholder="e.g. Score is borderline but the portfolio and scenario answers were exceptional…"
                        />
                      )}
                    </Field>
                  </div>
                ) : null}

                <Button
                  variant="primary"
                  full
                  className="mt-4"
                  icon="save"
                  loading={saving}
                  disabled={!touched}
                  onClick={save}
                >
                  {touched ? 'Save assessment' : 'Saved'}
                </Button>
                {interview.overrideReason && !isOverride ? (
                  <p className="mt-2 text-[11.5px] text-muted">
                    Previous override reason: “{interview.overrideReason}”
                  </p>
                ) : null}
              </Card>
            </div>
          </div>
        ) : null}

        {tab === 'sections' ? (
          <Card>
            <CardHeader
              title="Section scores"
              description="Raw is the sum of scores; weighted applies each question's multiplier."
            />
            <SectionScores result={result} />
          </Card>
        ) : null}

        {tab === 'questions' ? (
          <Card>
            <CardHeader
              title="Question-by-question"
              description="Every question with its score and the notes recorded during the interview."
            />
            <QuestionScoreList interview={interview} />
          </Card>
        ) : null}
      </div>

      <ConfirmDialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        onConfirm={reopen}
        title="Edit this assessment?"
        description="The interview reopens for editing and is marked as modified after completion. The change is recorded in the candidate's audit trail."
        confirmLabel="Reopen for editing"
      />
    </>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11.5px] font-medium uppercase tracking-wide text-subtle">{label}</p>
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11.5px] text-muted">{label}</p>
      <p className="mt-0.5 truncate text-[14px] font-medium text-ink tabular">{value}</p>
    </div>
  );
}

function mapRecommendation(recommendation: ReturnType<typeof computeResult>['recommendation']): HiringDecision | null {
  switch (recommendation) {
    case 'strong_hire':
      return 'strong_hire';
    case 'hire':
      return 'hire';
    case 'maybe':
      return 'hold';
    case 'no_hire':
      return 'no_hire';
    default:
      return null;
  }
}
