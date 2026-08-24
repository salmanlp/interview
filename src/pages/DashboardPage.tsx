import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { pipelineCounts, scoreDistribution, skillAverages, summariseAll } from '@/lib/selectors';
import { computeResult } from '@/lib/scoring';
import { SKILL_LABELS, type SkillKey } from '@/lib/types';
import { formatDate, formatDuration, mean, round } from '@/lib/utils';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Avatar, EmptyState, Stat } from '@/components/ui/Misc';
import {
  PercentageDisplay,
  RecommendationBadge,
  StatusBadge,
} from '@/components/ui/DomainBadges';
import { HorizontalBars, PipelineBar, ScoreDistributionChart } from '@/components/charts/Charts';
import { useToast } from '@/store/ToastProvider';

export function DashboardPage() {
  const { candidates, interviews, settings, loadDemoData } = useAppStore();
  const toast = useToast();

  const summaries = useMemo(() => summariseAll(candidates, interviews), [candidates, interviews]);
  const completed = useMemo(() => interviews.filter((i) => i.status === 'completed'), [interviews]);

  const metrics = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = completed.filter(
      (i) => new Date(i.completedAt ?? i.startedAt).getTime() >= weekAgo,
    ).length;

    const results = completed.map((i) =>
      computeResult({ questions: i.questions, answers: i.answers, scoring: i.scoring }),
    );
    const scored = results.filter((r) => r.scoredCount > 0);
    const strongHire = scored.filter((r) => r.recommendation === 'strong_hire').length;
    const pendingReview = completed.filter((i) => !i.decision).length;

    return {
      totalCandidates: candidates.filter((c) => !c.archived).length,
      completed: completed.length,
      thisWeek,
      averageScore: scored.length ? round(mean(scored.map((r) => r.averageScore)), 2) : null,
      averagePercentage: scored.length ? round(mean(scored.map((r) => r.percentage)), 0) : null,
      strongHireRate: scored.length ? round((strongHire / scored.length) * 100, 0) : null,
      pendingReview,
      averageDuration: completed.length ? mean(completed.map((i) => i.elapsedMs)) : 0,
    };
  }, [candidates, completed]);

  const distribution = useMemo(
    () => scoreDistribution(completed, settings.scoring.scaleMax),
    [completed, settings.scoring.scaleMax],
  );
  const totalScored = distribution.reduce((a, d) => a + d.count, 0);

  const skills = useMemo(() => skillAverages(completed), [completed]);
  const skillBars = useMemo(() => {
    const entries = (Object.keys(SKILL_LABELS) as SkillKey[])
      .map((key) => ({ key, ...skills[key] }))
      .filter((s) => s.count > 0);
    const best = Math.max(...entries.map((e) => e.average), 0);
    const worst = Math.min(...entries.map((e) => e.average), 5);
    return entries
      .sort((a, b) => b.average - a.average)
      .map((entry) => ({
        label: SKILL_LABELS[entry.key],
        value: entry.average,
        max: 5,
        emphasis:
          entries.length > 2 && entry.average === best
            ? ('high' as const)
            : entries.length > 2 && entry.average === worst
              ? ('low' as const)
              : undefined,
      }));
  }, [skills]);

  const recent = useMemo(
    () =>
      [...interviews]
        .sort((a, b) => ((a.completedAt ?? a.startedAt) < (b.completedAt ?? b.startedAt) ? 1 : -1))
        .slice(0, 8)
        .map((interview) => ({
          interview,
          candidate: candidates.find((c) => c.id === interview.candidateId),
          result: computeResult({
            questions: interview.questions,
            answers: interview.answers,
            scoring: interview.scoring,
          }),
        })),
    [interviews, candidates],
  );

  const pipeline = useMemo(
    () => pipelineCounts(summaries.filter((s) => !s.candidate.archived)),
    [summaries],
  );

  if (!candidates.length) {
    return (
      <>
        <PageHeader
          title={`Good ${greeting()}, ${settings.interviewerName.split(' ')[0]}`}
          description="Structured UI/UX designer interviews — scored, stored and comparable."
        />
        <Card>
          <EmptyState
            icon="dashboard"
            title="Your dashboard is empty"
            description="Add a candidate and run your first interview, or load a realistic demo data set to see how the app works end to end."
            action={
              <Button
                variant="primary"
                icon="database"
                onClick={async () => {
                  await loadDemoData();
                  toast.success('Demo data loaded', '7 candidates with completed assessments.');
                }}
              >
                Load demo data
              </Button>
            }
            secondaryAction={
              <LinkButton to="/candidates" variant="secondary" icon="plus">
                Add a candidate
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
        title={`Good ${greeting()}, ${settings.interviewerName.split(' ')[0]}`}
        description="Structured UI/UX designer interviews — scored, stored and comparable."
        actions={
          <>
            <LinkButton to="/reports" variant="secondary" icon="barChart">
              Reports
            </LinkButton>
            <LinkButton to="/interviews/new" variant="primary" icon="play">
              Start interview
            </LinkButton>
          </>
        }
      />

      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total candidates" value={metrics.totalCandidates} icon="users" />
        <Stat label="Interviews completed" value={metrics.completed} icon="checkCircle" tone="success" />
        <Stat
          label="This week"
          value={metrics.thisWeek}
          icon="calendar"
          hint={metrics.thisWeek ? 'completed in the last 7 days' : 'none yet this week'}
        />
        <Stat
          label="Average score"
          value={metrics.averageScore != null ? metrics.averageScore.toFixed(1) : '—'}
          icon="target"
          hint={metrics.averagePercentage != null ? `${metrics.averagePercentage}% weighted` : undefined}
        />
        <Stat
          label="Strong Hire rate"
          value={metrics.strongHireRate != null ? `${metrics.strongHireRate}%` : '—'}
          icon="award"
          tone="success"
        />
        <Stat
          label="Pending reviews"
          value={metrics.pendingReview}
          icon="clock"
          tone={metrics.pendingReview ? 'warning' : undefined}
          hint={metrics.pendingReview ? 'awaiting a decision' : 'all decided'}
        />
      </section>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Candidate pipeline"
            description="Where every active candidate currently sits."
            action={
              <LinkButton to="/candidates" variant="ghost" size="sm" iconRight="arrowRight">
                All candidates
              </LinkButton>
            }
          />
          <PipelineBar stages={pipeline} />
        </Card>

        <Card>
          <CardHeader
            title="Score distribution"
            description={
              totalScored
                ? `${totalScored} scored answers across ${completed.length} interviews`
                : 'No scored answers yet'
            }
          />
          {totalScored ? (
            <ScoreDistributionChart data={distribution} scaleMax={settings.scoring.scaleMax} />
          ) : (
            <EmptyState icon="barChart" title="Nothing scored yet" compact />
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2" padded={false}>
          <div className="p-5 pb-3">
            <CardHeader
              title="Recent interviews"
              description="The last eight sessions, newest first."
              className="mb-0"
              action={
                <LinkButton to="/interviews" variant="ghost" size="sm" iconRight="arrowRight">
                  All interviews
                </LinkButton>
              }
            />
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon="clipboard"
              title="No interviews yet"
              description="Start an interview to see it here."
              action={
                <LinkButton to="/interviews/new" variant="primary" icon="play">
                  Start interview
                </LinkButton>
              }
              compact
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[46rem] border-collapse text-left text-[13px]">
                <thead className="border-y border-line bg-surface-2/50 text-[12px] text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Candidate</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Position</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Interviewer</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Score</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Recommendation</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(({ interview, candidate, result }) => (
                    <tr key={interview.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                      <td className="px-5 py-2.5">
                        <Link
                          to={
                            interview.status === 'in_progress'
                              ? `/interviews/${interview.id}`
                              : `/interviews/${interview.id}/review`
                          }
                          className="group flex items-center gap-2.5"
                        >
                          <Avatar name={candidate?.name ?? '?'} size="xs" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-ink group-hover:text-brand">
                              {candidate?.name ?? 'Unknown'}
                            </span>
                            <span className="block truncate text-[11.5px] text-muted">
                              {interview.roundLabel}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-ink-2">{interview.position}</td>
                      <td className="px-4 py-2.5 text-ink-2">{interview.interviewer}</td>
                      <td className="px-4 py-2.5 text-ink-2 tabular">
                        {formatDate(interview.completedAt ?? interview.startedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {result.scoredCount ? (
                          <PercentageDisplay
                            percentage={result.percentage}
                            thresholds={interview.scoring.thresholds}
                          />
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <RecommendationBadge recommendation={result.recommendation} size="sm" />
                      </td>
                      <td className="px-5 py-2.5">
                        {interview.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-warn/40 bg-warn-soft px-2 py-1 text-[11px] font-medium text-warn">
                            <Icon name="clock" size={11} />
                            In progress
                          </span>
                        ) : candidate ? (
                          <StatusBadge status={candidate.status} size="sm" />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Skill performance"
            description={
              skillBars.length
                ? `Average across ${completed.length} completed interviews`
                : 'Complete an interview to see skill averages'
            }
          />
          {skillBars.length ? (
            <>
              <HorizontalBars data={skillBars} max={5} compact />
              <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-subtle">
                Averages are normalised to a 0–5 scale, so interviews run on different scoring scales
                still compare directly. Average interview length:{' '}
                {formatDuration(metrics.averageDuration)}.
              </p>
            </>
          ) : (
            <EmptyState icon="target" title="No skill data yet" compact />
          )}
        </Card>
      </div>
    </>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}
