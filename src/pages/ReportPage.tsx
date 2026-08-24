import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { computeResult } from '@/lib/scoring';
import {
  DECISION_LABELS,
  RECOMMENDATION_LABELS,
  SKILL_LABELS,
} from '@/lib/types';
import {
  candidateExport,
  downloadCsv,
  downloadJson,
  interviewCsv,
  reportFilename,
} from '@/lib/exporters';
import { formatDate, formatDuration } from '@/lib/utils';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/Misc';
import { ScoreChip } from '@/components/ui/DomainBadges';
import { HorizontalBars } from '@/components/charts/Charts';
import { QuestionScoreList } from '@/components/interview/AssessmentBreakdown';
import { useToast } from '@/store/ToastProvider';

/**
 * The deliverable a hiring manager receives. Designed for A4/Letter first:
 * flat surfaces, no shadows, sections that avoid breaking across pages.
 * "PDF" is the browser's own print-to-PDF, which keeps the app dependency-free.
 */
export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { interviews, candidates, logEvent } = useAppStore();

  const interview = interviews.find((i) => i.id === id) ?? null;
  const candidate = candidates.find((c) => c.id === interview?.candidateId) ?? null;

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
          icon="fileText"
          title="Report unavailable"
          description="This interview could not be found."
          action={
            <LinkButton to="/interviews" variant="primary" icon="arrowLeft">
              Back to interviews
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const recommendationLabel = result.recommendation
    ? RECOMMENDATION_LABELS[result.recommendation]
    : 'Not scored';
  const tone =
    result.percentage >= interview.scoring.thresholds.strongHire
      ? 's5'
      : result.percentage >= interview.scoring.thresholds.hire
        ? 's4'
        : result.percentage >= interview.scoring.thresholds.maybe
          ? 's3'
          : 's1';

  const print = () => {
    void logEvent('report_exported', 'Report sent to print / PDF.', {
      candidateId: interview.candidateId,
      interviewId: interview.id,
    });
    window.print();
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 no-print">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-muted">
          <Link to="/interviews" className="hover:text-ink">
            Interviews
          </Link>
          <Icon name="chevronRight" size={12} />
          <Link to={`/interviews/${interview.id}/review`} className="hover:text-ink">
            {candidate?.name ?? 'Assessment'}
          </Link>
          <Icon name="chevronRight" size={12} />
          <span className="text-ink">Report</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            icon="download"
            onClick={() => {
              downloadCsv(
                interviewCsv(interview, candidate ?? undefined),
                reportFilename(candidate?.name ?? 'candidate', 'csv'),
              );
              void logEvent('report_exported', 'Report exported as CSV.', {
                candidateId: interview.candidateId,
                interviewId: interview.id,
              });
              toast.success('CSV exported');
            }}
          >
            CSV
          </Button>
          <Button
            variant="secondary"
            icon="download"
            disabled={!candidate}
            onClick={() => {
              if (!candidate) return;
              downloadJson(
                candidateExport(candidate, [interview]),
                reportFilename(candidate.name, 'json'),
              );
              void logEvent('report_exported', 'Report exported as JSON.', {
                candidateId: interview.candidateId,
                interviewId: interview.id,
              });
              toast.success('JSON exported');
            }}
          >
            JSON
          </Button>
          <Button variant="primary" icon="printer" onClick={print}>
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <article className="mx-auto max-w-4xl rounded-xl border border-line bg-surface p-8 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* ------------------------------------------------------------ Header */}
        <header className="border-b-2 border-ink pb-5 print-page">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            UI/UX Designer Interview Assessment
          </p>
          <h1 className="mt-2 text-[28px] font-semibold leading-tight text-ink">
            {candidate?.name ?? 'Unknown candidate'}
          </h1>
          <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1.5 text-[12.5px] text-muted">
            <span>
              <span className="text-subtle">Position: </span>
              <span className="font-medium text-ink-2">{interview.position}</span>
            </span>
            <span>
              <span className="text-subtle">Date: </span>
              <span className="font-medium text-ink-2">
                {formatDate(interview.completedAt ?? interview.startedAt)}
              </span>
            </span>
            <span>
              <span className="text-subtle">Interviewer: </span>
              <span className="font-medium text-ink-2">{interview.interviewer}</span>
            </span>
            <span>
              <span className="text-subtle">Round: </span>
              <span className="font-medium text-ink-2">{interview.roundLabel}</span>
            </span>
            <span>
              <span className="text-subtle">Duration: </span>
              <span className="font-medium text-ink-2">{formatDuration(interview.elapsedMs)}</span>
            </span>
          </div>
        </header>

        {/* ------------------------------------------------------------- Score */}
        <section className="mt-6 flex flex-wrap items-center gap-8 rounded-xl border border-line bg-surface-2/60 p-6 print-page print:bg-transparent">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
              Overall score
            </p>
            <p className="mt-1 flex items-baseline gap-1" style={{ color: `var(--${tone})` }}>
              <span className="text-[52px] font-semibold leading-none tabular">
                {Math.round(result.percentage)}
              </span>
              <span className="text-[20px] font-medium">%</span>
            </p>
            <p className="mt-1.5 text-[12px] text-muted tabular">
              Weighted {result.weightedScore}/{result.weightedMax} · Raw {result.rawScore}/
              {result.maxPossible}
            </p>
          </div>

          <div className="h-16 w-px bg-line" aria-hidden="true" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
              Recommendation
            </p>
            <p
              className="mt-2 inline-flex items-center rounded-lg border px-3.5 py-1.5 text-[16px] font-semibold"
              style={{
                color: `var(--${tone})`,
                borderColor: `color-mix(in oklab, var(--${tone}) 40%, transparent)`,
                background: `color-mix(in oklab, var(--${tone}) 10%, transparent)`,
              }}
            >
              {recommendationLabel}
            </p>
            {interview.decision ? (
              <p className="mt-2 text-[12px] text-muted">
                Interviewer decision:{' '}
                <span className="font-medium text-ink-2">{DECISION_LABELS[interview.decision]}</span>
                {interview.overrideReason ? ' (override)' : ''}
              </p>
            ) : null}
          </div>

          <dl className="ml-auto grid grid-cols-2 gap-x-8 gap-y-2 text-[12.5px]">
            <Pair label="Questions scored" value={`${result.scoredCount} / ${result.totalQuestions}`} />
            <Pair label="Skipped" value={String(result.skippedCount)} />
            <Pair label="Average score" value={`${result.averageScore} / ${interview.scoring.scaleMax}`} />
            <Pair label="Completion" value={`${result.completionPercentage}%`} />
            <Pair
              label="Strongest"
              value={result.strongestSkill ? SKILL_LABELS[result.strongestSkill.skill] : '—'}
            />
            <Pair
              label="Weakest"
              value={result.weakestSkill ? SKILL_LABELS[result.weakestSkill.skill] : '—'}
            />
          </dl>
        </section>

        {/* --------------------------------------------------- Skill breakdown */}
        <Section title="Skill breakdown">
          {result.skills.length ? (
            <HorizontalBars
              data={result.skills.map((skill) => ({
                label: SKILL_LABELS[skill.skill],
                value: skill.average,
                max: interview.scoring.scaleMax,
                hint: `${skill.count} ${skill.count === 1 ? 'question' : 'questions'}`,
              }))}
              max={interview.scoring.scaleMax}
            />
          ) : (
            <p className="text-[13px] text-muted">No scored answers.</p>
          )}
        </Section>

        {/* --------------------------------------------------- Section results */}
        <Section title="Section results">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-subtle">
                <th scope="col" className="py-2 pr-3 font-semibold">Section</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Scored</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Raw</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Weighted</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Average</th>
                <th scope="col" className="py-2 pl-3 text-right font-semibold">Result</th>
              </tr>
            </thead>
            <tbody>
              {result.sections.map((section) => (
                <tr key={section.sectionId} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 font-medium text-ink">{section.title}</td>
                  <td className="px-3 py-2 text-right text-ink-2 tabular">
                    {section.scored}/{section.questions}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-2 tabular">
                    {section.total}/{section.max || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-2 tabular">
                    {section.weightedTotal}/{section.weightedMax || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-2 tabular">
                    {section.scored ? section.average.toFixed(1) : '—'}
                  </td>
                  <td className="py-2 pl-3 text-right font-semibold text-ink tabular">
                    {section.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* -------------------------------------------- Strengths & dev areas */}
        <Section title="Strengths and development areas">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-subtle">
                Strengths
              </h3>
              {result.strengths.length ? (
                <ul className="space-y-1.5">
                  {result.strengths.map((s) => (
                    <li key={s.sectionId} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="text-ink-2">{s.title}</span>
                      <span className="font-semibold text-ink tabular">{s.percentage}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">—</p>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-subtle">
                Development areas
              </h3>
              {result.developmentAreas.length ? (
                <ul className="space-y-1.5">
                  {result.developmentAreas.map((s) => (
                    <li key={s.sectionId} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="text-ink-2">{s.title}</span>
                      <span className="font-semibold text-ink tabular">{s.percentage}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-muted">—</p>
              )}
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------------- Challenge */}
        {interview.challenge.enabled ? (
          <Section title="Practical design challenge">
            <div className="mb-3 flex items-center gap-3">
              <ScoreChip
                score={interview.challenge.score}
                scaleMax={interview.scoring.scaleMax}
                size="lg"
                showMax
              />
              <p className="text-[12.5px] text-muted">Scored separately from the question set.</p>
            </div>
            {interview.challenge.notes ? (
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
                {interview.challenge.notes}
              </p>
            ) : null}
          </Section>
        ) : null}

        {/* -------------------------------------------------------- Summary */}
        <Section title="Interviewer summary">
          {interview.summary ? (
            <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">
              {interview.summary}
            </p>
          ) : (
            <p className="text-[13px] text-muted">No summary was recorded.</p>
          )}
          {interview.overrideReason ? (
            <div className="mt-4 rounded-lg border border-line bg-surface-2/60 p-3.5 print:bg-transparent">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                Recommendation override
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                The interviewer recorded{' '}
                <strong className="text-ink">
                  {interview.decision ? DECISION_LABELS[interview.decision] : '—'}
                </strong>{' '}
                instead of the calculated {recommendationLabel}. Reason: {interview.overrideReason}
              </p>
            </div>
          ) : null}
        </Section>

        {/* ------------------------------------------------- Question detail */}
        <section className="mt-7 print-break">
          <h2 className="mb-3 border-b border-line pb-2 text-[13px] font-semibold uppercase tracking-wide text-ink">
            Question-by-question scores
          </h2>
          <QuestionScoreList interview={interview} />
        </section>

        {/* --------------------------------------------------------- Footer */}
        <footer className="mt-8 border-t border-line pt-4 text-[11px] leading-relaxed text-subtle print-page">
          <p>
            Scoring scale 1–{interview.scoring.scaleMax}. Percentages are weighted by question
            importance and calculated over scored questions only. Recommendation thresholds:{' '}
            {interview.scoring.thresholds.strongHire}%+ Strong Hire ·{' '}
            {interview.scoring.thresholds.hire}%+ Hire · {interview.scoring.thresholds.maybe}%+
            Further Review · below {interview.scoring.thresholds.maybe}% No Hire.
          </p>
          <p className="mt-1.5">
            Generated from the Interview Assessment app on {formatDate(new Date().toISOString())}.
            Confidential — contains candidate personal data.
          </p>
        </footer>
      </article>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7 print-page">
      <h2 className="mb-3 border-b border-line pb-2 text-[13px] font-semibold uppercase tracking-wide text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-subtle">{label}</dt>
      <dd className="font-medium text-ink-2 tabular">{value}</dd>
    </div>
  );
}
