import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { summariseAll } from '@/lib/selectors';
import { SKILL_LABELS, type SkillKey } from '@/lib/types';
import { cx, formatDate, round } from '@/lib/utils';
import { downloadCsv, reportFilename, toCsv } from '@/lib/exporters';
import { Button, LinkButton } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Avatar, EmptyState } from '@/components/ui/Misc';
import {
  DecisionBadge,
  PercentageDisplay,
  RecommendationBadge,
  ScoreChip,
} from '@/components/ui/DomainBadges';
import { ChartLegend, GroupedBars, RadarChart, SERIES_COLORS } from '@/components/charts/Charts';
import { SegmentedControl } from '@/components/ui/Field';
import { useToast } from '@/store/ToastProvider';

/** The skills the spec asks to compare, in a fixed order. */
const COMPARE_SKILLS: SkillKey[] = [
  'ux',
  'ui',
  'figma',
  'design_systems',
  'product_thinking',
  'research',
  'communication',
  'problem_solving',
];

export function ComparePage() {
  const [params, setParams] = useSearchParams();
  const { candidates, interviews } = useAppStore();
  const toast = useToast();
  const [view, setView] = useState<'bars' | 'radar'>('bars');
  const [pickerOpen, setPickerOpen] = useState(false);

  const ids = useMemo(
    () => (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, 5),
    [params],
  );

  const summaries = useMemo(() => summariseAll(candidates, interviews), [candidates, interviews]);
  const selected = useMemo(
    () => ids.map((id) => summaries.find((s) => s.candidate.id === id)).filter(Boolean),
    [ids, summaries],
  ) as ReturnType<typeof summariseAll>;

  const available = useMemo(
    () => summaries.filter((s) => !s.candidate.archived && s.result),
    [summaries],
  );

  const setIds = (next: string[]) => {
    const nextParams = new URLSearchParams(params);
    if (next.length) nextParams.set('ids', next.join(','));
    else nextParams.delete('ids');
    setParams(nextParams, { replace: true });
  };

  /** Normalised 0–5 skill value per candidate, or null when never asked. */
  const skillMatrix = useMemo(
    () =>
      COMPARE_SKILLS.map((skill) => ({
        skill,
        label: SKILL_LABELS[skill],
        values: selected.map((summary) => {
          const entry = summary.result?.skills.find((s) => s.skill === skill);
          if (!entry || !summary.result) return null;
          const scaleMax =
            summary.completedInterviews[summary.completedInterviews.length - 1]?.scoring.scaleMax ?? 5;
          return round((entry.average / scaleMax) * 5, 2);
        }),
      })),
    [selected],
  );

  const exportCsv = () => {
    const header = ['Metric', ...selected.map((s) => s.candidate.name)];
    const rows: (string | number | null)[][] = [
      header,
      ['Position', ...selected.map((s) => s.candidate.position)],
      ['Experience (years)', ...selected.map((s) => s.candidate.yearsExperience)],
      ['Overall score %', ...selected.map((s) => s.overallPercentage ?? '')],
      ['Average score', ...selected.map((s) => s.averageScore ?? '')],
      ['Recommendation', ...selected.map((s) => s.result?.recommendation ?? '')],
      ...skillMatrix.map((row) => [row.label, ...row.values.map((v) => v ?? '')]),
    ];
    downloadCsv(toCsv(rows), reportFilename('candidate', 'csv', 'comparison'));
    toast.success('Comparison exported');
  };

  const picker = (
    <Card className="mb-5">
      <CardHeader
        title="Select candidates"
        description={`Choose between 2 and 5 candidates with a completed interview. ${selected.length} selected.`}
        action={
          selected.length >= 2 ? (
            <Button variant="ghost" size="sm" icon="chevronUp" onClick={() => setPickerOpen(false)}>
              Done
            </Button>
          ) : undefined
        }
      />
          {available.length === 0 ? (
            <EmptyState
              icon="compare"
              title="No assessed candidates yet"
              description="Complete at least two interviews before comparing."
              action={
                <LinkButton to="/interviews/new" variant="primary" icon="play">
                  Start interview
                </LinkButton>
              }
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((summary) => {
                const checked = ids.includes(summary.candidate.id);
                return (
                  <li key={summary.candidate.id}>
                    <label
                      className={cx(
                        'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                        checked ? 'border-brand bg-brand-soft/40' : 'border-line hover:bg-surface-2',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && ids.length >= 5}
                        onChange={(e) =>
                          setIds(
                            e.target.checked
                              ? [...ids, summary.candidate.id]
                              : ids.filter((id) => id !== summary.candidate.id),
                          )
                        }
                        className="h-4 w-4 shrink-0 rounded accent-[var(--brand)] disabled:opacity-40"
                      />
                      <Avatar name={summary.candidate.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {summary.candidate.name}
                        </span>
                        <span className="block truncate text-[11.5px] text-muted">
                          {summary.candidate.position}
                        </span>
                      </span>
                      <PercentageDisplay percentage={summary.overallPercentage} size="sm" />
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
    </Card>
  );

  if (selected.length < 2) {
    return (
      <>
        <PageHeader
          title="Compare candidates"
          description="Put two to five assessed candidates side by side across every skill area."
        />
        {picker}
      </>
    );
  }

  const bestOverall = Math.max(...selected.map((s) => s.overallPercentage ?? -1));

  return (
    <>
      <PageHeader
        title="Candidate comparison"
        description={`${selected.length} candidates side by side. The highest value in each row is highlighted.`}
        actions={
          <>
            <Button
              variant="secondary"
              icon="users"
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
            >
              Change selection
            </Button>
            <SegmentedControl
              label="Chart type"
              value={view}
              onChange={setView}
              options={[
                { value: 'bars', label: 'Bars', icon: 'barChart' },
                { value: 'radar', label: 'Radar', icon: 'target' },
              ]}
            />
            <Button variant="secondary" icon="download" onClick={exportCsv}>
              Export CSV
            </Button>
            <Button variant="ghost" icon="x" onClick={() => setIds([])}>
              Clear
            </Button>
          </>
        }
      />

      {pickerOpen ? picker : null}

      <Card className="mb-5" padded={false}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[48rem] border-collapse text-left text-[13px]">
            <caption className="sr-only">Candidate comparison across overall score and skills</caption>
            <thead>
              <tr className="border-b border-line bg-surface-2/50">
                <th scope="col" className="w-44 px-4 py-3 text-[12px] font-medium text-muted">
                  Metric
                </th>
                {selected.map((summary, index) => (
                  <th key={summary.candidate.id} scope="col" className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                        style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }}
                        aria-hidden="true"
                      />
                      <Avatar name={summary.candidate.name} size="xs" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {summary.candidate.name}
                        </span>
                        <span className="block truncate text-[11px] font-normal text-muted">
                          {summary.candidate.position}
                        </span>
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line bg-surface-2/30">
                <th scope="row" className="px-4 py-3 font-medium text-ink">
                  Overall score
                </th>
                {selected.map((summary) => (
                  <td key={summary.candidate.id} className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <PercentageDisplay percentage={summary.overallPercentage} size="lg" />
                      {summary.overallPercentage === bestOverall && bestOverall > 0 ? (
                        <Icon name="award" size={14} className="text-ok" aria-label="Highest overall" />
                      ) : null}
                    </span>
                  </td>
                ))}
              </tr>

              <tr className="border-b border-line">
                <th scope="row" className="px-4 py-2.5 font-medium text-ink-2">
                  Recommendation
                </th>
                {selected.map((summary) => (
                  <td key={summary.candidate.id} className="px-4 py-2.5">
                    <RecommendationBadge recommendation={summary.result?.recommendation ?? null} size="sm" />
                  </td>
                ))}
              </tr>

              <tr className="border-b border-line">
                <th scope="row" className="px-4 py-2.5 font-medium text-ink-2">
                  Decision
                </th>
                {selected.map((summary) => (
                  <td key={summary.candidate.id} className="px-4 py-2.5">
                    <DecisionBadge
                      decision={
                        summary.completedInterviews[summary.completedInterviews.length - 1]?.decision ?? null
                      }
                      size="sm"
                    />
                  </td>
                ))}
              </tr>

              <tr className="border-b border-line">
                <th scope="row" className="px-4 py-2.5 font-medium text-ink-2">
                  Experience
                </th>
                {selected.map((summary) => (
                  <td key={summary.candidate.id} className="px-4 py-2.5 text-ink-2 tabular">
                    {summary.candidate.yearsExperience} yrs
                  </td>
                ))}
              </tr>

              <tr className="border-b border-line">
                <th scope="row" className="px-4 py-2.5 font-medium text-ink-2">
                  Last interview
                </th>
                {selected.map((summary) => (
                  <td key={summary.candidate.id} className="px-4 py-2.5 text-ink-2 tabular">
                    {summary.lastInterviewDate ? formatDate(summary.lastInterviewDate) : '—'}
                  </td>
                ))}
              </tr>

              {skillMatrix.map((row) => {
                const best = Math.max(...row.values.map((v) => v ?? -1));
                return (
                  <tr key={row.skill} className="border-b border-line last:border-0">
                    <th scope="row" className="px-4 py-2.5 font-medium text-ink-2">
                      {row.label}
                    </th>
                    {row.values.map((value, index) => (
                      <td key={selected[index].candidate.id} className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <ScoreChip score={value} scaleMax={5} showMax />
                          {value != null && value === best && best > 0 ? (
                            <span className="text-[11px] font-medium text-ok">Highest</span>
                          ) : null}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Skill comparison"
          description="All values normalised to a 0–5 scale so interviews on different scoring scales compare directly."
          action={
            <ChartLegend
              items={selected.map((summary, index) => ({
                name: summary.candidate.name,
                color: SERIES_COLORS[index % SERIES_COLORS.length],
              }))}
            />
          }
        />
        {view === 'bars' ? (
          <GroupedBars
            seriesNames={selected.map((s) => s.candidate.name)}
            data={skillMatrix.map((row) => ({ category: row.label, values: row.values }))}
            max={5}
          />
        ) : (
          <div className="mx-auto max-w-lg">
            <RadarChart
              axes={skillMatrix.map((row) => row.label)}
              series={selected.map((summary, index) => ({
                name: summary.candidate.name,
                color: SERIES_COLORS[index % SERIES_COLORS.length],
                values: skillMatrix.map((row) => row.values[index] ?? 0),
              }))}
              max={5}
              size={360}
            />
            <p className="mt-3 text-center text-[11.5px] text-subtle">
              Overlapping shapes get hard to read past three candidates — the bar view and the table
              above stay precise.
            </p>
          </div>
        )}
      </Card>
    </>
  );
}
