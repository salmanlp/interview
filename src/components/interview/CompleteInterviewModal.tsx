import type { InterviewResult } from '@/lib/scoring';
import type { Interview } from '@/lib/types';
import { formatClock } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { PercentageDisplay, RecommendationBadge } from '@/components/ui/DomainBadges';

export function CompleteInterviewModal({
  open,
  onClose,
  onConfirm,
  interview,
  result,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  interview: Interview;
  result: InterviewResult;
  loading?: boolean;
}) {
  const unanswered = result.unansweredCount;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Complete interview?"
      description="Completing locks the assessment as read-only. You can still reopen it later — any change is recorded in the candidate's audit trail."
      size="md"
      icon={
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink">
          <Icon name="checkCircle" size={18} />
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="check" onClick={onConfirm} loading={loading} data-autofocus>
            Complete interview
          </Button>
        </>
      }
    >
      <dl className="divide-y divide-[var(--line)] overflow-hidden rounded-lg border border-line">
        <Row label="Questions scored" value={`${result.scoredCount} / ${result.totalQuestions}`} />
        <Row label="Questions skipped" value={String(result.skippedCount)} />
        {unanswered > 0 ? (
          <Row
            label="Not answered"
            value={String(unanswered)}
            tone="warning"
            hint="Unanswered questions are excluded from the percentage."
          />
        ) : null}
        <Row label="Current score" value={`${result.rawScore} / ${result.maxPossible}`} />
        <Row
          label="Weighted score"
          value={`${result.weightedScore} / ${result.weightedMax}`}
          hint="Weighted by question importance, over scored questions only."
        />
        <Row label="Average score" value={`${result.averageScore} / ${interview.scoring.scaleMax}`} />
        <Row label="Time elapsed" value={formatClock(interview.elapsedMs)} />
      </dl>

      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-line bg-surface-2 p-4">
        <div>
          <p className="text-[12px] text-muted">Assessment result</p>
          <div className="mt-1.5">
            <RecommendationBadge recommendation={result.recommendation} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-muted">Weighted</p>
          <PercentageDisplay
            percentage={result.percentage}
            size="lg"
            thresholds={interview.scoring.thresholds}
          />
        </div>
      </div>

      {unanswered > 0 ? (
        <p className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-warn">
          <Icon name="alertTriangle" size={14} className="mt-0.5 shrink-0" />
          {unanswered} {unanswered === 1 ? 'question has' : 'questions have'} no score. You can go back
          and score {unanswered === 1 ? 'it' : 'them'}, or complete now — the percentage is calculated
          from the questions you did score.
        </p>
      ) : null}
    </Modal>
  );
}

function Row({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'warning';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 bg-surface px-4 py-2.5">
      <dt className="text-[13px] text-muted">
        {label}
        {hint ? <span className="mt-0.5 block text-[11px] text-subtle">{hint}</span> : null}
      </dt>
      <dd
        className={`shrink-0 text-[13px] font-semibold tabular ${tone === 'warning' ? 'text-warn' : 'text-ink'}`}
      >
        {value}
      </dd>
    </div>
  );
}
