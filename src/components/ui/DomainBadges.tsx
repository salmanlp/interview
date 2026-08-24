import {
  CANDIDATE_STATUS_LABELS,
  DECISION_LABELS,
  RECOMMENDATION_LABELS,
  type CandidateStatus,
  type Difficulty,
  type HiringDecision,
  type Recommendation,
  type Seniority,
  type Weight,
} from '@/lib/types';
import { cx, round } from '@/lib/utils';
import { scoreTone } from '@/lib/scoring';
import { Badge, type BadgeTone } from './Badge';
import { Icon, type IconName } from './Icon';

const STATUS_TONE: Record<CandidateStatus, BadgeTone> = {
  new: 'neutral',
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'brand',
  under_review: 'info',
  strong_hire: 'success',
  hire: 'success',
  hold: 'warning',
  no_hire: 'danger',
};

export function StatusBadge({ status, size }: { status: CandidateStatus; size?: 'sm' | 'md' }) {
  return (
    <Badge tone={STATUS_TONE[status]} dot size={size}>
      {CANDIDATE_STATUS_LABELS[status]}
    </Badge>
  );
}

const RECOMMENDATION_TONE: Record<Recommendation, BadgeTone> = {
  strong_hire: 'success',
  hire: 'success',
  maybe: 'warning',
  no_hire: 'danger',
};

const RECOMMENDATION_ICON: Record<Recommendation, IconName> = {
  strong_hire: 'award',
  hire: 'checkCircle',
  maybe: 'alertCircle',
  no_hire: 'x',
};

export function RecommendationBadge({
  recommendation,
  size,
}: {
  recommendation: Recommendation | null;
  size?: 'sm' | 'md';
}) {
  if (!recommendation) {
    return (
      <Badge tone="neutral" size={size}>
        Not scored
      </Badge>
    );
  }
  return (
    <Badge tone={RECOMMENDATION_TONE[recommendation]} icon={RECOMMENDATION_ICON[recommendation]} size={size}>
      {RECOMMENDATION_LABELS[recommendation]}
    </Badge>
  );
}

const DECISION_TONE: Record<HiringDecision, BadgeTone> = {
  strong_hire: 'success',
  hire: 'success',
  hold: 'warning',
  no_hire: 'danger',
};

export function DecisionBadge({ decision, size }: { decision: HiringDecision | null; size?: 'sm' | 'md' }) {
  if (!decision) return <Badge tone="neutral" size={size}>No decision</Badge>;
  return (
    <Badge tone={DECISION_TONE[decision]} dot size={size}>
      {DECISION_LABELS[decision]}
    </Badge>
  );
}

const DIFFICULTY_TONE: Record<Difficulty, BadgeTone> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
};

export function DifficultyBadge({ difficulty, size = 'sm' }: { difficulty: Difficulty; size?: 'sm' | 'md' }) {
  return (
    <Badge tone={DIFFICULTY_TONE[difficulty]} size={size}>
      {difficulty[0].toUpperCase() + difficulty.slice(1)}
    </Badge>
  );
}

const SENIORITY_LABELS: Record<Seniority, string> = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
  lead: 'Lead',
};

export function SeniorityBadge({ seniority, size = 'sm' }: { seniority: Seniority; size?: 'sm' | 'md' }) {
  return (
    <Badge tone="neutral" size={size}>
      {SENIORITY_LABELS[seniority]}
    </Badge>
  );
}

export function WeightBadge({ weight, size = 'sm' }: { weight: Weight; size?: 'sm' | 'md' }) {
  if (weight <= 1) {
    return (
      <Badge tone="neutral" size={size} className="font-mono">
        1×
      </Badge>
    );
  }
  return (
    <Badge tone={weight >= 3 ? 'brand' : 'info'} size={size} className="font-mono">
      {weight}×
    </Badge>
  );
}

/**
 * A score chip. Colour signals the band but the number always carries the
 * meaning, so the control never depends on colour alone.
 */
export function ScoreChip({
  score,
  scaleMax = 5,
  size = 'md',
  showMax,
}: {
  score: number | null;
  scaleMax?: number;
  size?: 'sm' | 'md' | 'lg';
  showMax?: boolean;
}) {
  const tone = scoreTone(score, scaleMax);
  const sizeClass = {
    sm: 'h-5 min-w-5 px-1 text-[11px]',
    md: 'h-6 min-w-6 px-1.5 text-[12px]',
    lg: 'h-8 min-w-8 px-2 text-sm',
  }[size];

  if (score == null) {
    return (
      <span
        className={cx(
          'inline-flex items-center justify-center rounded-md border border-dashed border-line-strong text-subtle tabular',
          sizeClass,
        )}
        title="Not scored"
      >
        —
      </span>
    );
  }

  return (
    <span
      className={cx(
        'inline-flex items-center justify-center gap-0.5 rounded-md border font-semibold tabular',
        sizeClass,
      )}
      style={{
        background: `color-mix(in oklab, var(--${tone}) 12%, var(--surface))`,
        color: `var(--${tone})`,
        borderColor: `color-mix(in oklab, var(--${tone}) 28%, transparent)`,
      }}
    >
      {round(score, 1)}
      {showMax ? <span className="opacity-60 font-normal">/{scaleMax}</span> : null}
    </span>
  );
}

export function PercentageDisplay({
  percentage,
  size = 'md',
  thresholds,
}: {
  percentage: number | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  thresholds?: { strongHire: number; hire: number; maybe: number };
}) {
  if (percentage == null) return <span className="text-subtle tabular">—</span>;
  const t = thresholds ?? { strongHire: 90, hire: 75, maybe: 60 };
  const tone =
    percentage >= t.strongHire ? 's5' : percentage >= t.hire ? 's4' : percentage >= t.maybe ? 's3' : 's1';
  const sizeClass = {
    sm: 'text-[12px]',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-[40px] leading-none',
  }[size];
  return (
    <span className={cx('font-semibold tabular', sizeClass)} style={{ color: `var(--${tone})` }}>
      {round(percentage, 0)}
      <span className="text-[0.65em] font-medium opacity-70">%</span>
    </span>
  );
}

export function SaveIndicator({
  state,
  lastSavedAt,
}: {
  state: 'idle' | 'saving' | 'saved' | 'error' | 'offline';
  lastSavedAt?: string | null;
}) {
  const config = {
    idle: { label: 'Saved', tone: 'text-muted', dot: 'bg-ok', icon: null as IconName | null },
    saving: { label: 'Saving…', tone: 'text-muted', dot: 'bg-warn animate-pulse-soft', icon: null },
    saved: { label: 'Saved', tone: 'text-ok', dot: 'bg-ok', icon: null },
    error: { label: 'Not saved', tone: 'text-danger', dot: 'bg-danger', icon: 'alertTriangle' as IconName },
    offline: { label: 'Offline — saved locally', tone: 'text-muted', dot: 'bg-subtle', icon: null },
  }[state];

  const title =
    state === 'error'
      ? 'The last change could not be written to local storage.'
      : lastSavedAt
        ? `Last saved ${new Date(lastSavedAt).toLocaleTimeString()}`
        : 'All changes are stored in this browser.';

  return (
    <span
      className={cx('inline-flex items-center gap-1.5 text-[12px] font-medium tabular', config.tone)}
      title={title}
      role="status"
      aria-live="polite"
    >
      {config.icon ? (
        <Icon name={config.icon} size={13} />
      ) : (
        <span className={cx('h-1.5 w-1.5 rounded-full', config.dot)} aria-hidden="true" />
      )}
      {config.label}
    </span>
  );
}
