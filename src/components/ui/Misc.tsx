import type { ReactNode } from 'react';
import { cx, initials, avatarTint, pct } from '@/lib/utils';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const dimensions = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-7 w-7 text-[11px]',
    md: 'h-9 w-9 text-[12px]',
    lg: 'h-12 w-12 text-sm',
    xl: 'h-16 w-16 text-lg',
  }[size];
  const hue = avatarTint(name);

  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold select-none border',
        dimensions,
        className,
      )}
      style={{
        background: `color-mix(in oklab, hsl(${hue} 55% 50%) 14%, var(--surface))`,
        color: `color-mix(in oklab, hsl(${hue} 55% 42%) 88%, var(--ink))`,
        borderColor: `color-mix(in oklab, hsl(${hue} 55% 50%) 22%, transparent)`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({
  value,
  max = 100,
  label,
  tone = 'brand',
  size = 'md',
  showValue,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'xs' | 'sm' | 'md';
  showValue?: boolean;
  className?: string;
}) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const colors = {
    brand: 'var(--brand)',
    success: 'var(--ok)',
    warning: 'var(--warn)',
    danger: 'var(--danger)',
    neutral: 'var(--line-strong)',
  };
  const height = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' }[size];

  return (
    <div className={className}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label ? <span className="text-[12px] text-muted">{label}</span> : <span />}
          {showValue ? (
            <span className="text-[12px] font-medium text-ink tabular">{pct(percentage)}</span>
          ) : null}
        </div>
      ) : null}
      <div
        className={cx('w-full overflow-hidden rounded-full bg-surface-3', height)}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${percentage}%`, background: colors[tone] }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  icon = 'fileText',
  title,
  description,
  action,
  secondaryAction,
  compact,
}: {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-14 px-6',
      )}
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-surface-2 text-subtle">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>
      ) : null}
      {action || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton rounded-md', className)} aria-hidden="true" />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col gap-3 p-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
  tone,
  trend,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  tone?: 'brand' | 'success' | 'warning' | 'danger';
  trend?: ReactNode;
}) {
  const toneColor = tone
    ? { brand: 'text-brand', success: 'text-ok', warning: 'text-warn', danger: 'text-danger' }[tone]
    : 'text-muted';
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-muted">{label}</span>
        {icon ? <Icon name={icon} size={15} className={toneColor} /> : null}
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none text-ink tabular">{value}</p>
      {hint || trend ? (
        <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
          {trend}
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3"
      aria-label="Pagination"
    >
      <p className="text-[12px] text-muted tabular">
        Showing <span className="font-medium text-ink">{from}</span>–
        <span className="font-medium text-ink">{to}</span> of{' '}
        <span className="font-medium text-ink">{total}</span>
      </p>
      <div className="flex items-center gap-3">
        {onPageSizeChange ? (
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            <span className="hidden sm:inline">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-md border border-line-strong bg-surface px-1.5 text-[12px] text-ink"
              aria-label="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="secondary"
            icon="chevronLeft"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <span className="hidden sm:inline">Prev</span>
          </Button>
          <span className="px-2 text-[12px] text-muted tabular">
            {page} / {Math.max(1, pageCount)}
          </span>
          <Button
            size="sm"
            variant="secondary"
            iconRight="chevronRight"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string; count?: number; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex items-center gap-1 overflow-x-auto border-b border-line no-scrollbar">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`panel-${tab.value}`}
            id={`tab-${tab.value}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => {
              const idx = tabs.findIndex((t) => t.value === value);
              if (e.key === 'ArrowRight') onChange(tabs[(idx + 1) % tabs.length].value);
              if (e.key === 'ArrowLeft') onChange(tabs[(idx - 1 + tabs.length) % tabs.length].value);
            }}
            className={cx(
              'relative -mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors',
              active
                ? 'border-brand text-ink'
                : 'border-transparent text-muted hover:text-ink hover:border-line-strong',
            )}
          >
            {tab.icon ? <Icon name={tab.icon} size={14} /> : null}
            {tab.label}
            {tab.count != null ? (
              <span
                className={cx(
                  'rounded-md px-1.5 py-0.5 text-[11px] tabular',
                  active ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-muted',
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function InfoRow({
  label,
  children,
  icon,
}: {
  label: string;
  children: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon ? <Icon name={icon} size={15} className="mt-0.5 shrink-0 text-subtle" /> : null}
      <div className="min-w-0 flex-1">
        <dt className="text-[12px] text-muted">{label}</dt>
        <dd className="mt-0.5 text-[13px] text-ink break-words">{children}</dd>
      </div>
    </div>
  );
}

export function DataNotice({ shared }: { shared?: boolean }) {
  return (
    <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted">
      <Icon name="shield" size={14} className="mt-0.5 shrink-0 text-ok" />
      <span>
        {shared
          ? 'Candidate data is stored in your team\u2019s database and is readable only by signed-in colleagues. No analytics leave this device.'
          : 'Candidate data is stored in this browser only (IndexedDB). Nothing is uploaded, and no analytics leave this device.'}
      </span>
    </p>
  );
}
