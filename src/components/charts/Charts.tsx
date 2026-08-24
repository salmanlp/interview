import { useId, useState, type ReactNode } from 'react';
import { cx, round } from '@/lib/utils';

/**
 * Charts are hand-drawn SVG rather than a charting dependency: the app needs
 * four simple forms, all of which must inherit the design tokens and respond
 * to the theme. Colour follows the app's own system — score bands use the
 * score tones, single-measure charts use one hue, and only the candidate
 * comparison uses the validated categorical slots.
 */

export const SERIES_COLORS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
];

function Tooltip({ children, x, y }: { children: ReactNode; x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[12px] leading-snug text-ink shadow-pop whitespace-nowrap"
      style={{ left: x, top: y - 8 }}
      role="presentation"
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------- Score distribution */

export interface DistributionDatum {
  score: number;
  count: number;
}

export function ScoreDistributionChart({
  data,
  height = 168,
  scaleMax = 5,
}: {
  data: DistributionDatum[];
  height?: number;
  scaleMax?: number;
}) {
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((a, d) => a + d.count, 0);

  return (
    <div className="relative">
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((datum, index) => {
          const ratio = datum.count / max;
          const tone = `var(--s${Math.min(5, Math.max(1, Math.ceil((datum.score / scaleMax) * 5)))})`;
          return (
            <div
              key={datum.score}
              className="flex h-full flex-1 flex-col justify-end gap-1.5"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const parent = e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                setHover({
                  index,
                  x: rect.left - parent.left + rect.width / 2,
                  y: rect.top - parent.top + rect.height * (1 - ratio),
                });
              }}
              onMouseLeave={() => setHover(null)}
            >
              <span className="text-center text-[11px] font-medium text-muted tabular">{datum.count}</span>
              <div
                className="w-full rounded-t transition-[height] duration-300"
                style={{
                  height: `${Math.max(datum.count > 0 ? 3 : 1, ratio * 100)}%`,
                  background: datum.count > 0 ? tone : 'var(--surface-3)',
                  opacity: datum.count > 0 ? 0.9 : 1,
                  borderRadius: '4px 4px 0 0',
                }}
                role="img"
                aria-label={`Score ${datum.score}: ${datum.count} answers`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2 border-t border-line pt-2">
        {data.map((datum) => (
          <div key={datum.score} className="flex-1 text-center text-[12px] font-medium text-ink tabular">
            {datum.score}
          </div>
        ))}
      </div>
      {hover && total > 0 ? (
        <Tooltip x={hover.x} y={hover.y}>
          <span className="font-medium">Score {data[hover.index].score}</span> ·{' '}
          {data[hover.index].count} answers · {round((data[hover.index].count / total) * 100, 0)}%
        </Tooltip>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ Horizontal bars */

export interface BarDatum {
  label: string;
  value: number;
  max?: number;
  hint?: string;
  tone?: string;
  emphasis?: 'high' | 'low';
}

export function HorizontalBars({
  data,
  max = 5,
  valueFormat = (v: number) => round(v, 1).toFixed(1),
  emptyLabel = 'No data yet',
  compact,
}: {
  data: BarDatum[];
  max?: number;
  valueFormat?: (value: number) => string;
  emptyLabel?: string;
  compact?: boolean;
}) {
  if (!data.length) {
    return <p className="py-6 text-center text-[13px] text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className={cx('flex flex-col', compact ? 'gap-2.5' : 'gap-3')}>
      {data.map((datum) => {
        const ratio = Math.min(1, Math.max(0, datum.value / (datum.max ?? max)));
        return (
          <li key={datum.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
            <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
              <span className="truncate">{datum.label}</span>
              {datum.emphasis === 'high' ? (
                <span className="shrink-0 rounded bg-ok-soft px-1 text-[10px] font-medium text-ok">
                  Strongest
                </span>
              ) : datum.emphasis === 'low' ? (
                <span className="shrink-0 rounded bg-warn-soft px-1 text-[10px] font-medium text-warn">
                  Weakest
                </span>
              ) : null}
            </span>
            <span className="text-[13px] font-semibold text-ink tabular">
              {valueFormat(datum.value)}
              <span className="ml-0.5 text-[11px] font-normal text-subtle">/ {datum.max ?? max}</span>
            </span>
            <div className="col-span-2 h-2 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${ratio * 100}%`,
                  background: datum.tone ?? 'var(--brand)',
                  borderRadius: 4,
                }}
              />
            </div>
            {datum.hint ? (
              <span className="col-span-2 -mt-0.5 text-[11px] text-subtle">{datum.hint}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------- Radar chart */

export interface RadarSeries {
  name: string;
  color: string;
  values: number[];
}

export function RadarChart({
  axes,
  series,
  max = 5,
  size = 280,
}: {
  axes: string[];
  series: RadarSeries[];
  max?: number;
  size?: number;
}) {
  const titleId = useId();
  const count = axes.length;
  if (count < 3) {
    return <p className="py-8 text-center text-[13px] text-muted">Not enough skill data to plot.</p>;
  }

  const cx0 = size / 2;
  const cy0 = size / 2;
  const radius = size / 2 - 30;
  // A little horizontal room inside the viewBox: axis labels wrap onto two
  // lines so they stay inside the SVG instead of spilling over what is beside it.
  const padX = 70;
  const rings = 4;

  const point = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const r = (Math.min(value, max) / max) * radius;
    return [cx0 + Math.cos(angle) * r, cy0 + Math.sin(angle) * r] as const;
  };

  return (
    <svg
      viewBox={`${-padX} 0 ${size + padX * 2} ${size}`}
      className="mx-auto h-auto w-full max-w-[380px]"
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>
        Skill radar: {series.map((s) => s.name).join(', ')} across {axes.join(', ')}
      </title>

      {Array.from({ length: rings }, (_, ring) => {
        const r = (radius * (ring + 1)) / rings;
        const points = Array.from({ length: count }, (_, i) => {
          const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
          return `${cx0 + Math.cos(angle) * r},${cy0 + Math.sin(angle) * r}`;
        }).join(' ');
        return (
          <polygon
            key={ring}
            points={points}
            fill="none"
            stroke="var(--grid)"
            strokeWidth={1}
          />
        );
      })}

      {axes.map((_, i) => {
        const [x, y] = point(i, max);
        return <line key={i} x1={cx0} y1={cy0} x2={x} y2={y} stroke="var(--grid)" strokeWidth={1} />;
      })}

      {series.map((s) => {
        const points = s.values.map((v, i) => point(i, v).join(',')).join(' ');
        return (
          <g key={s.name}>
            <polygon points={points} fill={s.color} fillOpacity={series.length > 1 ? 0.1 : 0.14} />
            <polygon
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {s.values.map((v, i) => {
              const [x, y] = point(i, v);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={s.color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              );
            })}
          </g>
        );
      })}

      {axes.map((axis, i) => {
        const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
        const x = cx0 + Math.cos(angle) * (radius + 18);
        const y = cy0 + Math.sin(angle) * (radius + 18);
        const anchor = Math.abs(Math.cos(angle)) < 0.3 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
        const lines = wrapLabel(axis);
        return (
          <text
            key={axis}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={10}
            fill="var(--muted)"
            fontWeight={500}
          >
            {lines.map((line, lineIndex) => (
              <tspan
                key={line}
                x={x}
                dy={lineIndex === 0 ? (lines.length > 1 ? -5 : 0) : 11}
              >
                {line}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

/** Splits a two-word axis label across two lines so it fits beside the plot. */
function wrapLabel(label: string): string[] {
  const words = label.split(' ');
  if (words.length < 2 || label.length <= 11) return [label];
  return [words[0], words.slice(1).join(' ')];
}

/* ------------------------------------------------------------ Grouped bars */

export interface GroupedDatum {
  category: string;
  values: (number | null)[];
}

export function GroupedBars({
  data,
  seriesNames,
  max = 5,
}: {
  data: GroupedDatum[];
  seriesNames: string[];
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      {data.map((row) => {
        const best = Math.max(...row.values.map((v) => v ?? -1));
        return (
          <div key={row.category}>
            <p className="mb-1.5 text-[12px] font-medium text-ink-2">{row.category}</p>
            <div className="flex flex-col gap-1">
              {seriesNames.map((name, index) => {
                const value = row.values[index];
                const ratio = value == null ? 0 : Math.min(1, value / max);
                const isBest = value != null && value === best && best > 0;
                return (
                  <div key={name} className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2">
                    <div className="h-3.5 w-full overflow-hidden rounded bg-surface-2">
                      <div
                        className="h-full rounded transition-[width] duration-500"
                        style={{
                          width: `${Math.max(value == null ? 0 : 2, ratio * 100)}%`,
                          background: SERIES_COLORS[index % SERIES_COLORS.length],
                        }}
                        title={`${name}: ${value == null ? 'not scored' : round(value, 1)}`}
                      />
                    </div>
                    <span
                      className={cx(
                        'text-right text-[12px] tabular',
                        isBest ? 'font-semibold text-ink' : 'text-muted',
                      )}
                    >
                      {value == null ? '—' : round(value, 1).toFixed(1)}
                      {isBest ? <span className="sr-only"> (highest)</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChartLegend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.name} className="flex items-center gap-1.5 text-[12px] text-ink-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ background: item.color }}
            aria-hidden="true"
          />
          <span className="truncate max-w-40">{item.name}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------- Pipeline bar */

export function PipelineBar({
  stages,
}: {
  stages: { label: string; count: number; tone: string }[];
}) {
  const total = stages.reduce((a, s) => a + s.count, 0);

  return (
    <div>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-3">
        {total === 0 ? (
          <div className="h-full w-full bg-surface-3" />
        ) : (
          stages.map((stage) =>
            stage.count > 0 ? (
              <div
                key={stage.label}
                className="h-full rounded-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${(stage.count / total) * 100}%`, background: stage.tone }}
                title={`${stage.label}: ${stage.count}`}
              />
            ) : null,
          )
        )}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        {stages.map((stage) => (
          <li key={stage.label}>
            <div className="flex items-start gap-1.5">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{ background: stage.tone }}
                aria-hidden="true"
              />
              <span className="text-[12px] leading-tight text-muted">{stage.label}</span>
            </div>
            <p className="mt-0.5 pl-3.5 text-lg font-semibold leading-tight text-ink tabular">
              {stage.count}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
