import { useEffect, useMemo, useState } from 'react';
import {
  SKILLS,
  SKILL_LABELS,
  type Candidate,
  type InterviewQuestion,
  type Question,
  type Seniority,
  type SkillKey,
} from '@/lib/types';
import {
  seniorityFromExperience,
  suggestQuestions,
  toInterviewQuestions,
  type TailoredQuestion,
} from '@/lib/tailor';
import { cx } from '@/lib/utils';
import { Button, IconButton } from '@/components/ui/Button';
import { CardHeader } from '@/components/ui/Card';
import { SegmentedControl, Switch } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { DifficultyBadge, SeniorityBadge, WeightBadge } from '@/components/ui/DomainBadges';

type Stance = 'neutral' | 'strong' | 'unproven';

const STANCE_NEXT: Record<Stance, Stance> = {
  neutral: 'strong',
  strong: 'unproven',
  unproven: 'neutral',
};

const STANCE_COPY: Record<Stance, string> = {
  neutral: 'not assessed',
  strong: 'evidenced strength',
  unproven: 'needs probing',
};

const SENIORITIES: Seniority[] = ['junior', 'mid', 'senior', 'lead'];

interface TailorPanelProps {
  questions: Question[];
  candidate: Candidate | null;
  durationMinutes: number;
  /** null when tailoring is off — the template's own question set is used. */
  onChange: (tailored: InterviewQuestion[] | null) => void;
}

export function TailorPanel({ questions, candidate, durationMinutes, onChange }: TailorPanelProps) {
  const [enabled, setEnabled] = useState(false);
  const [stances, setStances] = useState<Partial<Record<SkillKey, Stance>>>({});
  const [seniority, setSeniority] = useState<Seniority>('mid');
  const [targetCount, setTargetCount] = useState(12);
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [showPool, setShowPool] = useState(false);

  // Follow the candidate's experience until the interviewer overrides it.
  useEffect(() => {
    if (candidate) setSeniority(seniorityFromExperience(candidate.yearsExperience));
  }, [candidate?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const strong = useMemo(
    () => (Object.keys(stances) as SkillKey[]).filter((s) => stances[s] === 'strong'),
    [stances],
  );
  const unproven = useMemo(
    () => (Object.keys(stances) as SkillKey[]).filter((s) => stances[s] === 'unproven'),
    [stances],
  );

  const result = useMemo(
    () => suggestQuestions({ questions, strong, unproven, seniority, targetCount }),
    [questions, strong, unproven, seniority, targetCount],
  );

  // The interviewer's own additions and removals sit on top of the suggestion.
  const final = useMemo(() => {
    const kept = result.selected.filter((s) => !removed.includes(s.question.id));
    const extras = result.remaining.filter((r) => added.includes(r.question.id));
    return [...kept, ...extras];
  }, [result, removed, added]);

  useEffect(() => {
    onChange(enabled ? toInterviewQuestions(final) : null);
    // onChange identity is not stable in the parent; depend on the payload.
  }, [enabled, final]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset manual edits whenever the inputs change the suggestion underneath.
  useEffect(() => {
    setRemoved([]);
    setAdded([]);
  }, [strong.join(), unproven.join(), seniority, targetCount]);

  const estimatedMinutes = Math.round(
    final.reduce(
      (t, q) => t + ({ easy: 45, medium: 80, hard: 130 } as const)[q.question.difficulty],
      0,
    ) / 60,
  );
  const overruns = estimatedMinutes > durationMinutes;

  const grouped = useMemo(() => {
    const map = new Map<SkillKey, TailoredQuestion[]>();
    for (const item of final) {
      const list = map.get(item.skill) ?? [];
      list.push(item);
      map.set(item.skill, list);
    }
    return [...map.entries()];
  }, [final]);

  return (
    <div>
      <div className="rounded-lg border border-line bg-surface-2 p-3.5">
        <Switch
          checked={enabled}
          onChange={setEnabled}
          label="Tailor the question set to this candidate"
          description="Builds a question set around what you already know, instead of running the whole template."
        />
      </div>

      {!enabled ? null : (
        <div className="mt-4 space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-2">Level to interview at</p>
            <SegmentedControl
              label="Seniority"
              value={seniority}
              onChange={setSeniority}
              options={SENIORITIES.map((s) => ({
                value: s,
                label: s[0].toUpperCase() + s.slice(1),
              }))}
            />
            {candidate ? (
              <p className="mt-1.5 text-[11.5px] text-subtle">
                Suggested from {candidate.yearsExperience} years of experience — change it if the CV
                says otherwise.
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-[13px] font-medium text-ink-2">What do you already know?</p>
            <p className="mb-2.5 text-[12px] leading-snug text-muted">
              Click a skill to cycle it: <span className="font-medium text-ok">evidenced</span> means
              fewer but harder questions; <span className="font-medium text-warn">needs probing</span>{' '}
              means broader coverage. Leave the rest alone.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {SKILLS.map((skill) => {
                const stance = stances[skill] ?? 'neutral';
                const next = STANCE_NEXT[stance];
                return (
                  <li key={skill}>
                    <button
                      type="button"
                      aria-label={`${SKILL_LABELS[skill]}: ${STANCE_COPY[stance]}. Activate to mark as ${STANCE_COPY[next]}.`}
                      onClick={() => setStances((prev) => ({ ...prev, [skill]: next }))}
                      className={cx(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
                        stance === 'strong' && 'border-ok/50 bg-ok-soft text-ok',
                        stance === 'unproven' && 'border-warn/50 bg-warn-soft text-warn',
                        stance === 'neutral' &&
                          'border-line-strong bg-surface text-muted hover:bg-surface-2 hover:text-ink',
                      )}
                    >
                      {stance === 'strong' ? <Icon name="check" size={12} strokeWidth={3} /> : null}
                      {stance === 'unproven' ? <Icon name="target" size={12} /> : null}
                      {SKILL_LABELS[skill]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor="tailor-count" className="text-[13px] font-medium text-ink-2">
                How many questions?
              </label>
              <span className="text-[12px] text-muted tabular">
                {final.length} selected · ~{estimatedMinutes} min
              </span>
            </div>
            <input
              id="tailor-count"
              type="range"
              min={5}
              max={Math.min(30, questions.filter((q) => q.active).length)}
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              className="w-full accent-[var(--brand)]"
            />
            {overruns ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] leading-snug text-warn">
                <Icon name="alertTriangle" size={12} className="mt-0.5 shrink-0" />
                Roughly {estimatedMinutes} minutes of questions for a {durationMinutes} minute
                interview. Trim a few, or extend the session.
              </p>
            ) : null}
          </div>

          {result.uncovered.length ? (
            <p className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn-soft/50 p-2.5 text-[12px] leading-snug text-ink-2">
              <Icon name="alertCircle" size={13} className="mt-0.5 shrink-0 text-warn" />
              No active questions in the bank for{' '}
              {result.uncovered.map((s) => SKILL_LABELS[s]).join(', ')} — add some in the Question
              Bank to probe {result.uncovered.length === 1 ? 'it' : 'them'}.
            </p>
          ) : null}

          <div>
            <CardHeader
              title="Proposed questions"
              description="Every question says why it was picked. Remove anything you disagree with."
              className="mb-3"
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  icon={showPool ? 'chevronUp' : 'plus'}
                  onClick={() => setShowPool((v) => !v)}
                >
                  {showPool ? 'Done adding' : 'Add questions'}
                </Button>
              }
            />

            {final.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[13px] text-muted">
                Nothing selected. Raise the count, or add questions manually.
              </p>
            ) : (
              <div className="space-y-3">
                {grouped.map(([skill, items]) => (
                  <section key={skill}>
                    <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                      {SKILL_LABELS[skill]}
                      <span className="ml-1.5 font-normal tabular">{items.length}</span>
                    </h4>
                    <ul className="space-y-1.5">
                      {items.map((item) => (
                        <li
                          key={item.question.id}
                          className="flex items-start gap-2.5 rounded-lg border border-line bg-surface p-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] leading-snug text-ink">{item.question.text}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <DifficultyBadge difficulty={item.question.difficulty} />
                              <SeniorityBadge seniority={item.question.seniority} />
                              <WeightBadge weight={item.question.weight} />
                              <span className="text-[11.5px] text-muted">{item.reason}</span>
                            </div>
                          </div>
                          <IconButton
                            icon="x"
                            label={`Remove: ${item.question.text.slice(0, 40)}`}
                            size="sm"
                            onClick={() =>
                              added.includes(item.question.id)
                                ? setAdded((a) => a.filter((id) => id !== item.question.id))
                                : setRemoved((r) => [...r, item.question.id])
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            {showPool ? (
              <div className="mt-3 rounded-lg border border-line bg-surface-2/60 p-3">
                <p className="mb-2 text-[12px] font-medium text-ink-2">
                  Everything else in the bank, best fit first
                </p>
                <ul className="max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin">
                  {result.remaining
                    .filter((r) => !added.includes(r.question.id))
                    .slice(0, 40)
                    .map((item) => (
                      <li
                        key={item.question.id}
                        className="flex items-start gap-2.5 rounded-lg border border-line bg-surface p-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] leading-snug text-ink">{item.question.text}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11.5px] text-muted">{item.question.category}</span>
                            <DifficultyBadge difficulty={item.question.difficulty} />
                            <SeniorityBadge seniority={item.question.seniority} />
                          </div>
                        </div>
                        <IconButton
                          icon="plus"
                          label={`Add: ${item.question.text.slice(0, 40)}`}
                          size="sm"
                          onClick={() => {
                            setAdded((a) => [...a, item.question.id]);
                            setRemoved((r) => r.filter((id) => id !== item.question.id));
                          }}
                        />
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
