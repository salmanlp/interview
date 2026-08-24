import { CHALLENGE_CRITERIA, type ChallengeCriterion, type DesignChallenge } from '@/lib/types';
import { scoreTone } from '@/lib/scoring';
import { cx, mean, round } from '@/lib/utils';

/**
 * The practical challenge is judged on nine named qualities. Scoring each one
 * keeps the overall challenge score defensible instead of a gut feel — but
 * every criterion is optional, so a rushed challenge can still be scored once.
 */
export function ChallengeCriteria({
  challenge,
  scaleMax,
  disabled,
  onChange,
}: {
  challenge: DesignChallenge;
  scaleMax: number;
  disabled?: boolean;
  onChange: (criteria: DesignChallenge['criteria']) => void;
}) {
  const scored = CHALLENGE_CRITERIA.map((c) => challenge.criteria[c]).filter(
    (value): value is number => value != null,
  );
  const average = scored.length ? round(mean(scored), 1) : null;

  return (
    <div className="rounded-xl border border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-3.5 py-2.5">
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-subtle">
          Evaluation criteria
        </h4>
        <p className="text-[11.5px] text-muted tabular">
          {scored.length} of {CHALLENGE_CRITERIA.length} scored
          {average != null ? ` · avg ${average.toFixed(1)}` : ''}
        </p>
      </div>

      <ul className="divide-y divide-[var(--line)]">
        {CHALLENGE_CRITERIA.map((criterion) => (
          <li key={criterion} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2">
            <span className="text-[12.5px] text-ink-2">{criterion}</span>
            <div
              role="radiogroup"
              aria-label={`${criterion} score`}
              className="flex items-center gap-1"
            >
              {Array.from({ length: scaleMax }, (_, i) => i + 1).map((value) => {
                const selected = challenge.criteria[criterion] === value;
                const tone = scoreTone(value, scaleMax);
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${criterion}: ${value} of ${scaleMax}`}
                    disabled={disabled}
                    onClick={() =>
                      onChange({
                        ...challenge.criteria,
                        [criterion]: selected ? undefined : (value as number),
                      } as Partial<Record<ChallengeCriterion, number>>)
                    }
                    className={cx(
                      'h-6 w-6 rounded-md border text-[11.5px] font-semibold tabular transition-colors',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      selected
                        ? 'border-transparent'
                        : 'border-line-strong bg-surface text-muted hover:bg-surface-2 hover:text-ink',
                    )}
                    style={
                      selected
                        ? {
                            background: `color-mix(in oklab, var(--${tone}) 14%, var(--surface))`,
                            borderColor: `var(--${tone})`,
                            color: `var(--${tone})`,
                          }
                        : undefined
                    }
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
