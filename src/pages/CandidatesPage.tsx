import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { summariseAll, type CandidateSummary } from '@/lib/selectors';
import {
  CANDIDATE_STATUSES,
  CANDIDATE_STATUS_LABELS,
  RECOMMENDATION_LABELS,
  type CandidateStatus,
  type Recommendation,
} from '@/lib/types';
import { cx, formatDate, matches, sortBy } from '@/lib/utils';
import { candidatesCsv, downloadCsv, reportFilename } from '@/lib/exporters';
import { Button, IconButton, LinkButton } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { SearchInput, Select } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Avatar, EmptyState, Pagination } from '@/components/ui/Misc';
import {
  PercentageDisplay,
  RecommendationBadge,
  StatusBadge,
} from '@/components/ui/DomainBadges';
import { CandidateForm } from '@/components/candidates/CandidateForm';
import { useToast } from '@/store/ToastProvider';

type SortKey = 'name' | 'position' | 'experience' | 'score' | 'date' | 'status';

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Candidate',
  position: 'Position',
  experience: 'Experience',
  score: 'Overall score',
  date: 'Interview date',
  status: 'Status',
};

const SCORE_FILTERS = [
  { value: 'all', label: 'Any score' },
  { value: '90', label: '90% and above' },
  { value: '75', label: '75% and above' },
  { value: '60', label: '60% and above' },
  { value: 'below60', label: 'Below 60%' },
  { value: 'none', label: 'Not scored yet' },
];

export function CandidatesPage() {
  const { candidates, interviews } = useAppStore();
  const toast = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CandidateStatus | 'all'>('all');
  const [recommendation, setRecommendation] = useState<Recommendation | 'all'>('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const summaries = useMemo(() => summariseAll(candidates, interviews), [candidates, interviews]);

  const filtered = useMemo(() => {
    let rows = summaries.filter((s) => (showArchived ? true : !s.candidate.archived));

    if (query.trim()) {
      rows = rows.filter((s) =>
        matches(
          `${s.candidate.name} ${s.candidate.position} ${s.candidate.email} ${s.candidate.location} ${s.candidate.interviewer}`,
          query,
        ),
      );
    }
    if (status !== 'all') rows = rows.filter((s) => s.candidate.status === status);
    if (recommendation !== 'all') {
      rows = rows.filter((s) => s.result?.recommendation === recommendation);
    }
    if (scoreFilter !== 'all') {
      rows = rows.filter((s) => {
        const value = s.overallPercentage;
        if (scoreFilter === 'none') return value == null;
        if (value == null) return false;
        if (scoreFilter === 'below60') return value < 60;
        return value >= Number(scoreFilter);
      });
    }

    const keyed: Record<SortKey, (s: CandidateSummary) => string | number> = {
      name: (s) => s.candidate.name.toLowerCase(),
      position: (s) => s.candidate.position.toLowerCase(),
      experience: (s) => s.candidate.yearsExperience,
      score: (s) => s.overallPercentage ?? -1,
      date: (s) => s.lastInterviewDate ?? s.candidate.createdAt,
      status: (s) => CANDIDATE_STATUSES.indexOf(s.candidate.status),
    };
    return sortBy(rows, keyed[sortKey], sortDir);
  }, [summaries, showArchived, query, status, recommendation, scoreFilter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeFilters =
    (status !== 'all' ? 1 : 0) +
    (recommendation !== 'all' ? 1 : 0) +
    (scoreFilter !== 'all' ? 1 : 0) +
    (showArchived ? 1 : 0);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'name' || key === 'position' ? 'asc' : 'desc');
    }
  };

  const resetFilters = () => {
    setStatus('all');
    setRecommendation('all');
    setScoreFilter('all');
    setShowArchived(false);
    setQuery('');
    setPage(1);
  };

  const SortableHeader = ({ label, sortKey: key, align }: { label: string; sortKey: SortKey; align?: 'right' }) => (
    <th scope="col" className={cx('px-4 py-2.5 font-medium', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={cx(
          'inline-flex items-center gap-1 rounded transition-colors hover:text-ink',
          sortKey === key ? 'text-ink' : 'text-muted',
        )}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <Icon
          name={sortKey === key ? (sortDir === 'asc' ? 'chevronUp' : 'chevronDown') : 'chevronsUpDown'}
          size={12}
          className={sortKey === key ? 'opacity-100' : 'opacity-40'}
        />
      </button>
    </th>
  );

  return (
    <>
      <PageHeader
        title="Candidates"
        description="Every designer you have interviewed or scheduled, with their assessment outcome."
        actions={
          <>
            <Button
              variant="secondary"
              icon="compare"
              disabled={selected.length < 2}
              onClick={() => navigate(`/compare?ids=${selected.join(',')}`)}
              title={selected.length < 2 ? 'Select at least two candidates to compare' : undefined}
            >
              Compare{selected.length ? ` (${selected.length})` : ''}
            </Button>
            <Button
              variant="secondary"
              icon="download"
              onClick={() => {
                downloadCsv(candidatesCsv(filtered), reportFilename('candidates', 'csv', 'list'));
                toast.success('CSV exported', `${filtered.length} candidates written to your downloads.`);
              }}
              disabled={!filtered.length}
            >
              Export CSV
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setFormOpen(true)}>
              New candidate
            </Button>
          </>
        }
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput
            label="Search candidates"
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search by name, position, location…"
            className="min-w-56 flex-1"
          />

          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as CandidateStatus | 'all');
              setPage(1);
            }}
            className="w-auto min-w-36"
          >
            <option value="all">All statuses</option>
            {CANDIDATE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CANDIDATE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by recommendation"
            value={recommendation}
            onChange={(e) => {
              setRecommendation(e.target.value as Recommendation | 'all');
              setPage(1);
            }}
            className="w-auto min-w-40"
          >
            <option value="all">Any recommendation</option>
            {(Object.keys(RECOMMENDATION_LABELS) as Recommendation[]).map((r) => (
              <option key={r} value={r}>
                {RECOMMENDATION_LABELS[r]}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by score"
            value={scoreFilter}
            onChange={(e) => {
              setScoreFilter(e.target.value);
              setPage(1);
            }}
            className="w-auto min-w-36"
          >
            {SCORE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>

          <IconButton
            icon="archive"
            label={showArchived ? 'Hide archived candidates' : 'Show archived candidates'}
            active={showArchived}
            onClick={() => {
              setShowArchived((v) => !v);
              setPage(1);
            }}
          />

          {activeFilters > 0 || query ? (
            <Button variant="ghost" size="sm" icon="x" onClick={resetFilters}>
              Clear
            </Button>
          ) : null}
        </div>

        {paged.length === 0 ? (
          candidates.length === 0 ? (
            <EmptyState
              icon="users"
              title="No candidates yet"
              description="Add your first candidate, or load the demo data from Settings to explore the app with realistic assessments."
              action={
                <Button variant="primary" icon="plus" onClick={() => setFormOpen(true)}>
                  New candidate
                </Button>
              }
              secondaryAction={
                <LinkButton to="/settings?tab=data" variant="secondary" icon="database">
                  Load demo data
                </LinkButton>
              }
            />
          ) : (
            <EmptyState
              icon="search"
              title="No candidates match these filters"
              description="Try a different search term, or clear the filters to see everyone."
              action={
                <Button variant="secondary" icon="x" onClick={resetFilters}>
                  Clear filters
                </Button>
              }
              compact
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[62rem] border-collapse text-left text-[13px]">
                <caption className="sr-only">
                  Candidates, sorted by {SORT_LABELS[sortKey]} {sortDir === 'asc' ? 'ascending' : 'descending'}
                </caption>
                <thead className="border-b border-line bg-surface-2/50 text-[12px] text-muted">
                  <tr>
                    <th scope="col" className="w-10 px-3 py-2.5">
                      <span className="sr-only">Select</span>
                    </th>
                    <SortableHeader label="Candidate" sortKey="name" />
                    <SortableHeader label="Position" sortKey="position" />
                    <SortableHeader label="Experience" sortKey="experience" />
                    <SortableHeader label="Status" sortKey="status" />
                    <SortableHeader label="Overall score" sortKey="score" align="right" />
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Recommendation
                    </th>
                    <SortableHeader label="Interview date" sortKey="date" />
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Interviewer
                    </th>
                    <th scope="col" className="w-10 px-3 py-2.5">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((summary) => {
                    const { candidate } = summary;
                    const isSelected = selected.includes(candidate.id);
                    return (
                      <tr
                        key={candidate.id}
                        className={cx(
                          'border-b border-line transition-colors last:border-0 hover:bg-surface-2/60',
                          candidate.archived && 'opacity-60',
                        )}
                      >
                        <td className="px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            aria-label={`Select ${candidate.name} for comparison`}
                            disabled={!isSelected && selected.length >= 5}
                            onChange={(e) =>
                              setSelected((prev) =>
                                e.target.checked
                                  ? [...prev, candidate.id].slice(0, 5)
                                  : prev.filter((id) => id !== candidate.id),
                              )
                            }
                            className="h-4 w-4 cursor-pointer rounded border-line-strong accent-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            to={`/candidates/${candidate.id}`}
                            className="group flex items-center gap-2.5 rounded"
                          >
                            <Avatar name={candidate.name} size="sm" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-ink group-hover:text-brand">
                                {candidate.name}
                                {candidate.archived ? (
                                  <span className="ml-1.5 text-[11px] font-normal text-subtle">(archived)</span>
                                ) : null}
                              </span>
                              <span className="block truncate text-[12px] text-muted">
                                {candidate.email || candidate.location || '—'}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-ink-2">{candidate.position}</td>
                        <td className="px-4 py-2.5 text-ink-2 tabular">
                          {candidate.yearsExperience} {candidate.yearsExperience === 1 ? 'yr' : 'yrs'}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={candidate.status} size="sm" />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {summary.overallPercentage != null ? (
                            <PercentageDisplay percentage={summary.overallPercentage} />
                          ) : (
                            <span className="text-subtle">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <RecommendationBadge
                            recommendation={summary.result?.recommendation ?? null}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-ink-2 tabular">
                          {summary.lastInterviewDate ? formatDate(summary.lastInterviewDate) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-ink-2">{candidate.interviewer || '—'}</td>
                        <td className="px-3 py-2.5">
                          <Link
                            to={`/candidates/${candidate.id}`}
                            aria-label={`Open ${candidate.name}'s profile`}
                            className="grid h-7 w-7 place-items-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                          >
                            <Icon name="chevronRight" size={15} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              total={filtered.length}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>

      {selected.length > 0 ? (
        <div className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-4 lg:bottom-6 no-print">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 shadow-pop">
            <span className="text-[13px] text-ink-2 tabular">
              <span className="font-semibold text-ink">{selected.length}</span> selected
              {selected.length >= 5 ? <span className="text-subtle"> (max 5)</span> : null}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon="compare"
              disabled={selected.length < 2}
              onClick={() => navigate(`/compare?ids=${selected.join(',')}`)}
            >
              Compare
            </Button>
          </div>
        </div>
      ) : null}

      <CandidateForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(candidate) => navigate(`/candidates/${candidate.id}`)}
      />
    </>
  );
}
