import { useMemo } from 'react';
import type { Answer, InterviewQuestion } from '@/lib/types';
import { questionState, QUESTION_STATE_LABELS, type QuestionState } from '@/lib/interview';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/Misc';

const STATE_STYLE: Record<QuestionState, string> = {
  not_started: 'border-line-strong bg-surface text-muted hover:bg-surface-2',
  answered: 'border-info/50 bg-info-soft text-info',
  scored: 'border-ok/50 bg-ok-soft text-ok',
  flagged: 'border-warn/60 bg-warn-soft text-warn',
  skipped: 'border-line-strong bg-surface-2 text-subtle line-through',
};

const STATE_ICON: Partial<Record<QuestionState, IconName>> = {
  scored: 'check',
  flagged: 'flag',
  skipped: 'skip',
  answered: 'edit',
};

interface QuestionNavigatorProps {
  questions: InterviewQuestion[];
  answers: Record<string, Answer>;
  currentIndex: number;
  onSelect: (index: number) => void;
}

export function QuestionNavigator({ questions, answers, currentIndex, onSelect }: QuestionNavigatorProps) {
  const sections = useMemo(() => {
    const map = new Map<string, { title: string; items: { question: InterviewQuestion; index: number }[] }>();
    questions.forEach((question, index) => {
      const entry = map.get(question.sectionId) ?? { title: question.sectionTitle, items: [] };
      entry.items.push({ question, index });
      map.set(question.sectionId, entry);
    });
    return [...map.values()];
  }, [questions]);

  const completed = questions.filter((q) => {
    const state = questionState(answers[q.questionId]);
    return state === 'scored' || state === 'skipped' || state === 'flagged';
  }).length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="text-[12px] font-medium text-ink">Progress</span>
          <span className="text-[12px] text-muted tabular">
            {completed} / {questions.length}
          </span>
        </div>
        <ProgressBar value={completed} max={questions.length} size="sm" label="" />
      </div>

      <nav aria-label="Interview questions" className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        {sections.map((section) => {
          const sectionScored = section.items.filter(
            (i) => answers[i.question.questionId]?.score != null,
          ).length;
          return (
            <div key={section.title} className="mb-4 last:mb-0">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
                  {section.title}
                </h3>
                <span className="text-[10.5px] text-subtle tabular">
                  {sectionScored}/{section.items.length}
                </span>
              </div>
              <ul className="grid grid-cols-5 gap-1.5">
                {section.items.map(({ question, index }) => {
                  const state = questionState(answers[question.questionId]);
                  const current = index === currentIndex;
                  const icon = STATE_ICON[state];
                  return (
                    <li key={question.questionId}>
                      <button
                        type="button"
                        onClick={() => onSelect(index)}
                        aria-current={current ? 'true' : undefined}
                        title={`Q${index + 1} — ${QUESTION_STATE_LABELS[state]}${question.weight > 1 ? ` · ${question.weight}× weight` : ''}`}
                        className={cx(
                          'relative flex h-9 w-full items-center justify-center rounded-lg border text-[12px] font-medium transition-all duration-150',
                          STATE_STYLE[state],
                          current && 'ring-2 ring-[var(--ring)] ring-offset-1 ring-offset-[var(--surface)]',
                        )}
                      >
                        <span className="tabular">{index + 1}</span>
                        {icon ? (
                          <Icon
                            name={icon}
                            size={9}
                            strokeWidth={2.5}
                            className="absolute right-0.5 top-0.5"
                            aria-hidden="true"
                          />
                        ) : null}
                        {question.weight > 1 ? (
                          <span
                            className="absolute bottom-0.5 right-1 text-[8px] font-bold opacity-70"
                            aria-hidden="true"
                          >
                            {question.weight}×
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-line px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">Legend</p>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {(['not_started', 'answered', 'scored', 'flagged', 'skipped'] as QuestionState[]).map((state) => (
            <li key={state} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span
                className={cx(
                  'grid h-4 w-4 shrink-0 place-items-center rounded border',
                  STATE_STYLE[state].replace('hover:bg-surface-2', ''),
                )}
              >
                {STATE_ICON[state] ? (
                  <Icon name={STATE_ICON[state]!} size={8} strokeWidth={3} />
                ) : null}
              </span>
              {QUESTION_STATE_LABELS[state]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
