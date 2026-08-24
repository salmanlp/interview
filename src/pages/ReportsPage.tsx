import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { computeResult } from '@/lib/scoring';
import {
  questionAnalytics,
  scoreDistribution,
  skillAverages,
  summariseAll,
  type QuestionAnalytics,
} from '@/lib/selectors';
import { SKILL_LABELS, type SkillKey } from '@/lib/types';
import {
  candidatesCsv,
  downloadCsv,
  downloadJson,
  questionAnalyticsCsv,
  reportFilename,
} from '@/lib/exporters';
import { cx, formatDate, formatDuration, mean, round, sortBy } from '@/lib/utils';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Avatar, EmptyState, Stat, Tabs } from '@/components/ui/Misc';
import { PercentageDisplay, RecommendationBadge, ScoreChip } from '@/components/ui/DomainBadges';
import { HorizontalBars, ScoreDistributionChart } from '@/components/charts/Charts';
import { useToast } from '@/store/ToastProvider';

type Tab = 'overview' | 'questions' | 'candidates';
type QuestionSort = 'lowest' | 'highest' | 'differentiation' | 'skipped';

export function ReportsPage() {
  const { candidates, interviews, settings } = useAppStore();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [questionSort, setQuestionSort] = useState<QuestionSort>('lowest');

  const completed = useMemo(() => interviews.filter((i) => i.status === 'completed'), [interviews]);
  const summaries = useMemo(() => summariseAll(candidates, interviews), [candidates, interviews]);

  const results = useMemo(
    () =>
      completed.map((i) =>
        computeResult({ questions: i.questions, answers: i.answers, scoring: i.scoring }),
      ),
    [completed],
  );
  const scored = results.filter((r) => r.scoredCount > 0);

  const rates = useMemo(() => {
    const count = (value: string) => scored.filter((r) => r.recommendation === value).length;
    const total = scored.length || 1;
    return {
      strongHire: round((count('strong_hire') / total) * 100, 0),
      hire: round((count('hire') / total) * 100, 0),
      maybe: round((count('maybe') / total) * 100, 0),
      noHire: round((count('no_hire') / total) * 100, 0),
    };
  }, [scored]);

  const skills = useMemo(() => skillAverages(completed), [completed]);
  const distribution = useMemo(
    () => scoreDistribution(completed, settings.scoring.scaleMax),
    [completed, settings.scoring.scaleMax],
  );

  const analytics = useMemo(
    () => questionAnalytics(completed, settings.scoring.scaleMax),
    [completed, settings.scoring.scaleMax],
  );

  const sortedAnalytics = useMemo(() => {
    switch (questionSort) {
      case 'highest':
        return sortBy(analytics, (a) => a.averageScore, 'desc');
      case 'differentiation':
        return sortBy(analytics, (a) => a.differentiation, 'desc');
      case 'skipped':
        return sortBy(analytics, (a) => a.skipRate, 'desc');
      default:
        return sortBy(analytics, (a) => a.averageScore, 'asc');
    }
  }, [analytics, questionSort]);

  const skillBars = (Object.keys(SKILL_LABELS) as SkillKey[])
    .map((key) => ({ key, ...skills[key] }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.average - a.average)
    .map((s) => ({ label: SKILL_LABELS[s.key], value: s.average, max: 5 }));

  if (!completed.length) {
    return (
      <>
        <PageHeader
          title="Reports"
          description="Hiring analytics and interview quality, computed from your own local data."
        />
        <Card>
          <EmptyState
            icon="barChart"
            title="No completed interviews yet"
            description="Analytics appear once you have completed at least one interview."
            action={
              <LinkButton to="/interviews/new" variant="primary" icon="play">
                Start interview
              </LinkButton>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Reports"
        description={`Computed from ${completed.length} completed interview${completed.length === 1 ? '' : 's'} across ${candidates.length} candidates. Nothing leaves this browser.`}
        actions={
          <>
            <Button
              variant="secondary"
              icon="download"
              onClick={() => {
                downloadCsv(candidatesCsv(summaries), reportFilename('all', 'csv', 'candidates'));
                toast.success('Candidates CSV exported');
              }}
            >
              Candidates CSV
            </Button>
            <Button
              variant="secondary"
              icon="download"
              onClick={() => {
                downloadCsv(
                  questionAnalyticsCsv(analytics),
                  reportFilename('question', 'csv', 'analytics'),
                );
                toast.success('Question analytics exported');
              }}
            >
              Question CSV
            </Button>
          </>
        }
      />

      <Tabs
        label="Report sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Hiring analytics', icon: 'barChart' },
          { value: 'questions', label: 'Interview question analytics', icon: 'helpCircle', count: analytics.length },
          { value: 'candidates', label: 'Candidate reports', icon: 'users', count: completed.length },
        ]}
      />

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-5">
        {tab === 'overview' ? (
          <>
            <section aria-label="Hiring rates" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <Stat
                label="Average candidate score"
                value={scored.length ? `${round(mean(scored.map((r) => r.percentage)), 0)}%` : '—'}
                icon="target"
                hint={
                  scored.length
                    ? `${round(mean(scored.map((r) => r.averageScore)), 1)} / ${settings.scoring.scaleMax} average`
                    : undefined
                }
              />
              <Stat label="Strong Hire rate" value={`${rates.strongHire}%`} icon="award" tone="success" />
              <Stat label="Hire rate" value={`${rates.hire}%`} icon="checkCircle" tone="success" />
              <Stat label="Further review" value={`${rates.maybe}%`} icon="alertCircle" tone="warning" />
              <Stat label="No Hire rate" value={`${rates.noHire}%`} icon="x" tone="danger" />
              <Stat
                label="Average duration"
                value={formatDuration(mean(completed.map((i) => i.elapsedMs)))}
                icon="clock"
              />
            </section>

            <div className="mt-5 grid gap-5 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader
                  title="Average score by skill"
                  description="Across every completed interview, normalised to a 0–5 scale."
                />
                {skillBars.length ? (
                  <HorizontalBars data={skillBars} max={5} />
                ) : (
                  <EmptyState icon="target" title="No skill data" compact />
                )}
              </Card>

              <Card>
                <CardHeader
                  title="Score distribution"
                  description="Every scored answer across all interviews."
                />
                <ScoreDistributionChart data={distribution} scaleMax={settings.scoring.scaleMax} />
                <ul className="mt-4 space-y-1.5 border-t border-line pt-3">
                  {distribution.map((d) => {
                    const total = distribution.reduce((a, x) => a + x.count, 0) || 1;
                    return (
                      <li key={d.score} className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="flex items-center gap-2">
                          <ScoreChip score={d.score} scaleMax={settings.scoring.scaleMax} size="sm" />
                          <span className="text-muted">
                            {settings.scoring.scale.find((s) => s.value === d.score)?.label ?? ''}
                          </span>
                        </span>
                        <span className="text-ink-2 tabular">
                          {d.count} · {round((d.count / total) * 100, 0)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>

            <Card className="mt-5">
              <CardHeader
                title="Interview health"
                description="Signals about the process itself rather than the candidates."
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <HealthStat
                  label="Questions asked per interview"
                  value={round(mean(results.map((r) => r.scoredCount)), 1).toString()}
                  hint={`of ${results[0]?.totalQuestions ?? 0} in the template`}
                />
                <HealthStat
                  label="Average completion"
                  value={`${round(mean(results.map((r) => r.completionPercentage)), 0)}%`}
                  hint="questions scored or explicitly skipped"
                />
                <HealthStat
                  label="Skipped per interview"
                  value={round(mean(results.map((r) => r.skippedCount)), 1).toString()}
                  hint="high numbers suggest the template is too long"
                />
                <HealthStat
                  label="Flagged per interview"
                  value={round(mean(results.map((r) => r.flaggedCount)), 1).toString()}
                  hint="questions marked for follow-up"
                />
              </div>
            </Card>
          </>
        ) : null}

        {tab === 'questions' ? (
          <Card padded={false}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Interview question analytics</h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                  Which questions are too easy, too hard, or not telling you anything. Differentiation
                  is the standard deviation of scores — a question everyone answers identically is not
                  earning its place.
                </p>
              </div>
              <SegmentedControl
                label="Sort questions"
                value={questionSort}
                onChange={setQuestionSort}
                options={[
                  { value: 'lowest', label: 'Lowest scoring' },
                  { value: 'highest', label: 'Highest scoring' },
                  { value: 'differentiation', label: 'Most differentiating' },
                  { value: 'skipped', label: 'Most skipped' },
                ]}
              />
            </div>

            <ul className="divide-y divide-[var(--line)]">
              {sortedAnalytics.map((row) => (
                <QuestionAnalyticsRow key={row.questionId} row={row} />
              ))}
            </ul>
          </Card>
        ) : null}

        {tab === 'candidates' ? (
          <Card padded={false}>
            <div className="border-b border-line p-4">
              <h2 className="text-[15px] font-semibold text-ink">Candidate reports</h2>
              <p className="mt-1 text-[12.5px] text-muted">
                Open a printable assessment report, or export the underlying data.
              </p>
            </div>
            <ul className="divide-y divide-[var(--line)]">
              {sortBy(completed, (i) => i.completedAt ?? i.startedAt, 'desc').map((interview) => {
                const candidate = candidates.find((c) => c.id === interview.candidateId);
                const result = computeResult({
                  questions: interview.questions,
                  answers: interview.answers,
                  scoring: interview.scoring,
                });
                return (
                  <li key={interview.id} className="flex flex-wrap items-center gap-4 p-4">
                    <Avatar name={candidate?.name ?? '?'} size="md" />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/interviews/${interview.id}/review`}
                        className="truncate text-[14px] font-medium text-ink hover:text-brand"
                      >
                        {candidate?.name ?? 'Unknown candidate'}
                      </Link>
                      <p className="mt-0.5 truncate text-[12px] text-muted">
                        {interview.position} · {interview.roundLabel} ·{' '}
                        {formatDate(interview.completedAt)} · {interview.interviewer}
                      </p>
                    </div>
                    <PercentageDisplay
                      percentage={result.percentage}
                      thresholds={interview.scoring.thresholds}
                    />
                    <div className="hidden w-32 sm:block">
                      <RecommendationBadge recommendation={result.recommendation} size="sm" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="download"
                        aria-label={`Export ${candidate?.name ?? 'candidate'} as JSON`}
                        onClick={() => {
                          downloadJson(
                            { interview, result },
                            reportFilename(candidate?.name ?? 'candidate', 'json'),
                          );
                          toast.success('JSON exported');
                        }}
                      >
                        JSON
                      </Button>
                      <LinkButton
                        to={`/interviews/${interview.id}/report`}
                        size="sm"
                        variant="secondary"
                        icon="fileText"
                      >
                        Report
                      </LinkButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}

function HealthStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2/50 p-3.5">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-1 text-[20px] font-semibold text-ink tabular">{value}</p>
      <p className="mt-0.5 text-[11.5px] leading-snug text-subtle">{hint}</p>
    </div>
  );
}

function QuestionAnalyticsRow({ row }: { row: QuestionAnalytics }) {
  const maxCount = Math.max(1, ...row.distribution.map((d) => d.count));
  const difficultySignal =
    row.averageScore >= 4.3
      ? { label: 'Too easy', tone: 'text-warn' }
      : row.averageScore <= 2.2
        ? { label: 'Very hard', tone: 'text-danger' }
        : { label: 'Well calibrated', tone: 'text-ok' };
  const differentiationSignal =
    row.differentiation < 0.5
      ? { label: 'Low differentiation', tone: 'text-warn' }
      : row.differentiation >= 1.1
        ? { label: 'Highly differentiating', tone: 'text-ok' }
        : { label: 'Moderate spread', tone: 'text-muted' };

  return (
    <li className="flex flex-wrap items-start gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug text-ink">{row.text}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
          <span className="text-muted">{row.category}</span>
          <span className="text-subtle" aria-hidden="true">·</span>
          <span className="text-muted tabular">
            {row.candidates} {row.candidates === 1 ? 'candidate' : 'candidates'}
          </span>
          <span className="text-subtle" aria-hidden="true">·</span>
          <span className={cx('font-medium', difficultySignal.tone)}>{difficultySignal.label}</span>
          <span className="text-subtle" aria-hidden="true">·</span>
          <span className={cx('font-medium', differentiationSignal.tone)}>
            {differentiationSignal.label}
          </span>
          {row.skipRate > 0 ? (
            <>
              <span className="text-subtle" aria-hidden="true">·</span>
              <span className={cx('font-medium', row.skipRate > 25 ? 'text-warn' : 'text-muted')}>
                {row.skipRate}% skipped
              </span>
            </>
          ) : null}
        </p>
      </div>

      <div className="flex items-end gap-1" aria-hidden="true">
        {row.distribution.map((d) => (
          <div key={d.score} className="flex w-6 flex-col items-center gap-1">
            <div
              className="w-full rounded-t"
              style={{
                height: `${8 + (d.count / maxCount) * 28}px`,
                background: d.count ? `var(--s${d.score})` : 'var(--surface-3)',
                opacity: d.count ? 0.85 : 1,
              }}
              title={`Score ${d.score}: ${d.count}`}
            />
            <span className="text-[10px] text-subtle tabular">{d.score}</span>
          </div>
        ))}
      </div>

      <div className="w-24 text-right">
        <p className="text-[11px] text-muted">Average</p>
        <p className="text-[18px] font-semibold text-ink tabular">{row.averageScore.toFixed(1)}</p>
        <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-subtle tabular">
          <Icon name="trendingUp" size={11} />σ {row.differentiation.toFixed(2)}
        </p>
      </div>
    </li>
  );
}
