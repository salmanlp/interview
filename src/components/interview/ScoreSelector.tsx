import { useState } from 'react';
import type { ScoringRules } from '@/lib/types';
import { scalePoint, scoreTone } from '@/lib/scoring';
import { cx } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

interface ScoreSelectorProps {
  value: number | null;
  onChange: (score: number | null) => void;
  scoring: ScoringRules;
  disabled?: boolean;
  size?: 'md' | 'lg';
}

/**
 * Large, keyboard-operable score buttons. The number and its label always
 * appear together, so the control never relies on colour to convey the score.
 */
export function ScoreSelector({ value, onChange, scoring, disabled, size = 'lg' }: ScoreSelectorProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value;
  const point = shown != null ? scalePoint(scoring, shown) : null;

  return (
    <div>
      <div
        role="radiogroup"
        aria-label={`Score this answer from 1 to ${scoring.scaleMax}`}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${scoring.scaleMax}, minmax(0, 1fr))` }}
      >
        {scoring.scale.map((scale) => {
          const selected = value === scale.value;
          const tone = scoreTone(scale.value, scoring.scaleMax);
          return (
            <button
              key={scale.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${scale.value} — ${scale.label}. ${scale.description}`}
              disabled={disabled}
              onClick={() => onChange(selected ? null : scale.value)}
              onMouseEnter={() => setPreview(scale.value)}
              onMouseLeave={() => setPreview(null)}
              onFocus={() => setPreview(scale.value)}
              onBlur={() => setPreview(null)}
              className={cx(
                'group relative flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 font-semibold',
                'transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
                size === 'lg' ? 'py-3.5' : 'py-2.5',
                selected
                  ? 'shadow-raised'
                  : 'border-line-strong bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2',
              )}
              style={
                selected
                  ? {
                      borderColor: `var(--${tone})`,
                      background: `color-mix(in oklab, var(--${tone}) 12%, var(--surface))`,
                      color: `var(--${tone})`,
                    }
                  : undefined
              }
            >
              {selected ? (
                <Icon
                  name="check"
                  size={12}
                  strokeWidth={3}
                  className="absolute right-1.5 top-1.5"
                  aria-hidden="true"
                />
              ) : null}
              <span className={size === 'lg' ? 'text-2xl leading-none tabular' : 'text-lg leading-none tabular'}>
                {scale.value}
              </span>
              <span className="text-[10.5px] font-medium leading-tight opacity-80">{scale.label}</span>
            </button>
          );
        })}
      </div>

      <div
        className={cx(
          'mt-2.5 min-h-[2.75rem] rounded-lg border px-3 py-2 transition-colors',
          point ? 'border-line bg-surface-2' : 'border-dashed border-line bg-transparent',
        )}
        aria-live="polite"
      >
        {point ? (
          <p className="text-[12.5px] leading-snug text-ink-2">
            <span className="font-semibold text-ink">
              {point.value} — {point.label}
            </span>
            {point.description ? <span className="text-muted"> · {point.description}</span> : null}
          </p>
        ) : (
          <p className="text-[12.5px] text-subtle">
            Select a score, or press <span className="font-mono">1</span>–
            <span className="font-mono">{scoring.scaleMax}</span> to score without leaving the notes
            field empty-handed.
          </p>
        )}
      </div>
    </div>
  );
}
