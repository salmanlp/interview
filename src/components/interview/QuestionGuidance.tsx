import { useState } from 'react';
import type { InterviewQuestion } from '@/lib/types';
import { cx } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { DifficultyBadge, SeniorityBadge, WeightBadge } from '@/components/ui/DomainBadges';

function Panel({
  title,
  icon,
  children,
  defaultOpen = true,
  tone = 'default',
}: {
  title: string;
  icon: 'target' | 'zap' | 'award';
  children: React.ReactNode;
  defaultOpen?: boolean;
  tone?: 'default' | 'muted';
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className={cx(
        'overflow-hidden rounded-xl border border-line',
        tone === 'muted' ? 'bg-surface-2/50' : 'bg-surface',
      )}
    >
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2"
        >
          <Icon name={icon} size={14} className="shrink-0 text-subtle" />
          <span className="flex-1 text-[12px] font-semibold uppercase tracking-wide text-subtle">
            {title}
          </span>
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} className="text-subtle" />
        </button>
      </h3>
      {open ? <div className="border-t border-line px-3.5 py-3">{children}</div> : null}
    </section>
  );
}

export function QuestionGuidance({
  question,
  compact,
}: {
  question: InterviewQuestion;
  /** On a phone the score and notes come first — guidance starts collapsed. */
  compact?: boolean;
}) {
  return (
    <div className="space-y-3" key={question.questionId}>
      <div className="flex flex-wrap items-center gap-1.5">
        <DifficultyBadge difficulty={question.difficulty} />
        <SeniorityBadge seniority={question.seniority} />
        <WeightBadge weight={question.weight} />
        {question.required ? (
          <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
            Required
          </span>
        ) : null}
      </div>

      <Panel title="What a good answer covers" icon="target" defaultOpen={!compact}>
        <ul className="space-y-1.5">
          {question.evaluationCriteria.map((criterion) => (
            <li key={criterion} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-2">
              <Icon name="check" size={13} className="mt-0.5 shrink-0 text-ok" />
              <span>{criterion}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {question.followUps.length ? (
        <Panel title="Follow-up questions" icon="zap" defaultOpen={!compact}>
          <ul className="space-y-1.5">
            {question.followUps.map((followUp) => (
              <li key={followUp} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-subtle" aria-hidden="true" />
                <span>{followUp}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {question.idealAnswer ? (
        <Panel title="Ideal answer guidance" icon="award" defaultOpen={false} tone="muted">
          <p className="text-[12.5px] leading-relaxed text-ink-2">{question.idealAnswer}</p>
        </Panel>
      ) : null}
    </div>
  );
}
