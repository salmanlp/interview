import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { computeResult } from '@/lib/scoring';
import { formatClock, formatDate, matches, sortBy } from '@/lib/utils';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { SearchInput, SegmentedControl } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Avatar, EmptyState, Pagination, ProgressBar } from '@/components/ui/Misc';
import {
  DecisionBadge,
  PercentageDisplay,
  RecommendationBadge,
} from '@/components/ui/DomainBadges';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/store/ToastProvider';

type Filter = 'all' | 'in_progress' | 'completed' | 'undecided';

export function InterviewsPage() {
  const { interviews, candidates, deleteInterview, logEvent } = useAppStore();
  const navigate = useNavigate();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [discardId, setDiscardId] = useState<string | null>(null);
  const pageSize = 15;

  const rows = useMemo(() => {
    const mapped = interviews.map((interview) => ({
      interview,
      candidate: candidates.find((c) => c.id === interview.candidateId),
      result: computeResult({
        questions: interview.questions,
        answers: interview.answers,
        scoring: interview.scoring,
      }),
    }));

    let filtered = mapped;
    if (filter === 'in_progress') filtered = filtered.filter((r) => r.interview.status === 'in_progress');
    if (filter === 'completed') filtered = filtered.filter((r) => r.interview.status === 'completed');
    if (filter === 'undecided') {
      filtered = filtered.filter((r) => r.interview.status === 'completed' && !r.interview.decision);
    }
    if (query.trim()) {
      filtered = filtered.filter((r) =>
        matches(
          `${r.candidate?.name ?? ''} ${r.interview.position} ${r.interview.templateName} ${r.interview.roundLabel} ${r.interview.interviewer}`,
          query,
        ),
      );
    }
    return sortBy(filtered, (r) => r.interview.completedAt ?? r.interview.startedAt, 'desc');
  }, [interviews, candidates, filter, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const discarding = interviews.find((i) => i.id === discardId) ?? null;

  const counts = {
    all: interviews.length,
    in_progress: interviews.filter((i) => i.status === 'in_progress').length,
    completed: interviews.filter((i) => i.status === 'completed').length,
    undecided: interviews.filter((i) => i.status === 'completed' && !i.decision).length,
  };

  return (
    <>
      <PageHeader
        title="Interviews"
        description="Every assessment you have run, in progress or completed."
        actions={
          <LinkButton to="/interviews/new" variant="primary" icon="play">
            Start interview
          </LinkButton>
        }
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <SearchInput
            label="Search interviews"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search by candidate, round or template…"
            className="min-w-56 flex-1"
          />
          <SegmentedControl
            label="Filter interviews"
            value={filter}
            onChange={(value) => {
              setFilter(value);
              setPage(1);
            }}
            options={[
              { value: 'all', label: `All (${counts.all})` },
              { value: 'in_progress', label: `In progress (${counts.in_progress})` },
              { value: 'completed', label: `Completed (${counts.completed})` },
              { value: 'undecided', label: `Awaiting decision (${counts.undecided})` },
            ]}
          />
        </div>

        {paged.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title={interviews.length ? 'No interviews match' : 'No interviews yet'}
            description={
              interviews.length
                ? 'Try a different search or filter.'
                : 'Run your first structured assessment — it takes 30 minutes and everything is scored as you go.'
            }
            action={
              interviews.length ? (
                <Button
                  variant="secondary"
                  icon="x"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <LinkButton to="/interviews/new" variant="primary" icon="play">
                  Start interview
                </LinkButton>
              )
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-[var(--line)]">
              {paged.map(({ interview, candidate, result }) => {
                const inProgress = interview.status === 'in_progress';
                const answered = result.scoredCount + result.skippedCount;
                return (
                  <li key={interview.id}>
                    <div className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-2/50">
                      <Avatar name={candidate?.name ?? '?'} size="md" />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={inProgress ? `/interviews/${interview.id}` : `/interviews/${interview.id}/review`}
                            className="truncate text-[14px] font-medium text-ink hover:text-brand"
                          >
                            {candidate?.name ?? 'Unknown candidate'}
                          </Link>
                          {inProgress ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-warn/40 bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn">
                              <span className="h-1.5 w-1.5 rounded-full bg-warn animate-pulse-soft" />
                              In progress
                            </span>
                          ) : null}
                          {interview.editedAfterCompletion ? (
                            <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-medium text-muted">
                              Edited
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-muted">
                          {interview.roundLabel} · {interview.position} · {interview.templateName} ·{' '}
                          {formatDate(interview.completedAt ?? interview.startedAt)} ·{' '}
                          {interview.interviewer}
                        </p>
                        {inProgress ? (
                          <div className="mt-2 flex max-w-md items-center gap-2.5">
                            <ProgressBar
                              value={answered}
                              max={result.totalQuestions}
                              size="xs"
                              className="flex-1"
                            />
                            <span className="text-[11.5px] text-muted tabular">
                              {answered}/{result.totalQuestions} · {formatClock(interview.elapsedMs)}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden text-right sm:block">
                          <PercentageDisplay
                            percentage={result.scoredCount ? result.percentage : null}
                            thresholds={interview.scoring.thresholds}
                          />
                          <p className="text-[11px] text-subtle tabular">
                            {result.rawScore}/{result.maxPossible}
                          </p>
                        </div>
                        <div className="hidden w-32 md:block">
                          {inProgress ? (
                            <RecommendationBadge recommendation={result.recommendation} size="sm" />
                          ) : (
                            <DecisionBadge decision={interview.decision} size="sm" />
                          )}
                        </div>

                        {inProgress ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDiscardId(interview.id)}
                              aria-label="Discard interview"
                            >
                              Discard
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              icon="play"
                              onClick={() => navigate(`/interviews/${interview.id}`)}
                            >
                              Resume
                            </Button>
                          </div>
                        ) : (
                          <Link
                            to={`/interviews/${interview.id}/review`}
                            aria-label="Open assessment"
                            className="grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                          >
                            <Icon name="chevronRight" size={16} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {pageCount > 1 ? (
              <Pagination
                page={currentPage}
                pageCount={pageCount}
                total={rows.length}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            ) : null}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(discarding)}
        onClose={() => setDiscardId(null)}
        onConfirm={async () => {
          if (!discarding) return;
          await deleteInterview(discarding.id);
          await logEvent('interview_discarded', 'Unfinished interview discarded.', {
            candidateId: discarding.candidateId,
          });
          setDiscardId(null);
          toast.success('Interview discarded');
        }}
        title="Discard this interview?"
        description="All scores and notes recorded so far will be permanently deleted."
        confirmLabel="Discard interview"
        tone="danger"
      />
    </>
  );
}
