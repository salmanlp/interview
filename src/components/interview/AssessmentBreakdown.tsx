import type { InterviewResult } from '@/lib/scoring';
import { SKILL_LABELS, type Interview } from '@/lib/types';
import { cx } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { ScoreChip } from '@/components/ui/DomainBadges';
import { HorizontalBars, RadarChart } from '@/components/charts/Charts';

export function SkillBreakdown({
  result,
  scaleMax,
  view = 'both',
}: {
  result: InterviewResult;
  scaleMax: number;
  view?: 'bars' | 'radar' | 'both';
}) {
  if (!result.skills.length) {
    return <p className="py-6 text-center text-[13px] text-muted">No scored answers yet.</p>;
  }

  const best = result.strongestSkill?.skill;
  const worst = result.weakestSkill?.skill;
  const bars = result.skills.map((skill) => ({
    label: SKILL_LABELS[skill.skill],
    value: skill.average,
    max: scaleMax,
    emphasis:
      result.skills.length > 2 && skill.skill === best
        ? ('high' as const)
        : result.skills.length > 2 && skill.skill === worst
          ? ('low' as const)
          : undefined,
    hint: `${skill.count} ${skill.count === 1 ? 'question' : 'questions'}`,
  }));

  const radar =
    result.skills.length >= 3 ? (
      <RadarChart
        axes={result.skills.map((s) => SKILL_LABELS[s.skill])}
        series={[
          {
            name: 'Candidate',
            color: 'var(--brand)',
            values: result.skills.map((s) => s.average),
          },
        ]}
        max={scaleMax}
      />
    ) : null;

  if (view === 'radar') return radar;
  if (view === 'bars') return <HorizontalBars data={bars} max={scaleMax} />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col justify-center gap-4">
        {radar}
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-2/50 p-3">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle">Strongest</dt>
            <dd className="mt-0.5 flex items-baseline gap-1.5 text-[13px] font-medium text-ink">
              {result.strongestSkill ? SKILL_LABELS[result.strongestSkill.skill] : '—'}
              {result.strongestSkill ? (
                <span className="text-[12px] font-semibold text-ok tabular">
                  {result.strongestSkill.average.toFixed(1)}
                </span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle">Weakest</dt>
            <dd className="mt-0.5 flex items-baseline gap-1.5 text-[13px] font-medium text-ink">
              {result.weakestSkill ? SKILL_LABELS[result.weakestSkill.skill] : '—'}
              {result.weakestSkill ? (
                <span className="text-[12px] font-semibold text-warn tabular">
                  {result.weakestSkill.average.toFixed(1)}
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>
      <HorizontalBars data={bars} max={scaleMax} />
    </div>
  );
}

export function StrengthsAndGaps({ result }: { result: InterviewResult }) {
  if (!result.strengths.length) {
    return (
      <p className="text-[13px] text-muted">
        Score at least one question to generate strengths and development areas.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h3 className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ok">
          <Icon name="trendingUp" size={13} />
          Strengths
        </h3>
        <ul className="space-y-1.5">
          {result.strengths.map((section) => (
            <li
              key={section.sectionId}
              className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2"
            >
              <span className="min-w-0 truncate text-[13px] text-ink">{section.title}</span>
              <span className="shrink-0 text-[12px] font-semibold text-ok tabular">
                {section.percentage}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-warn">
          <Icon name="target" size={13} />
          Development areas
        </h3>
        {result.developmentAreas.length ? (
          <ul className="space-y-1.5">
            {result.developmentAreas.map((section) => (
              <li
                key={section.sectionId}
                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2"
              >
                <span className="min-w-0 truncate text-[13px] text-ink">{section.title}</span>
                <span className="shrink-0 text-[12px] font-semibold text-warn tabular">
                  {section.percentage}%
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-line px-3 py-2 text-[12.5px] text-muted">
            Not enough sections scored to identify weaker areas.
          </p>
        )}
      </div>
    </div>
  );
}

export function SectionScores({ result }: { result: InterviewResult }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[36rem] border-collapse text-left text-[13px]">
        <thead className="border-b border-line text-[12px] text-muted">
          <tr>
            <th scope="col" className="py-2 pr-3 font-medium">Section</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Scored</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Raw</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Weighted</th>
            <th scope="col" className="px-3 py-2 text-right font-medium">Average</th>
            <th scope="col" className="w-32 py-2 pl-3 font-medium">Result</th>
          </tr>
        </thead>
        <tbody>
          {result.sections.map((section) => (
            <tr key={section.sectionId} className="border-b border-line last:border-0">
              <td className="py-2.5 pr-3 font-medium text-ink">{section.title}</td>
              <td className="px-3 py-2.5 text-right text-ink-2 tabular">
                {section.scored}/{section.questions}
                {section.skipped ? (
                  <span className="ml-1 text-[11px] text-subtle">({section.skipped} skipped)</span>
                ) : null}
              </td>
              <td className="px-3 py-2.5 text-right text-ink-2 tabular">
                {section.total}/{section.max || '—'}
              </td>
              <td className="px-3 py-2.5 text-right text-ink-2 tabular">
                {section.weightedTotal}/{section.weightedMax || '—'}
              </td>
              <td className="px-3 py-2.5 text-right tabular">
                <ScoreChip score={section.scored ? section.average : null} size="sm" />
              </td>
              <td className="py-2.5 pl-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${section.percentage}%`,
                        background:
                          section.percentage >= 75
                            ? 'var(--ok)'
                            : section.percentage >= 60
                              ? 'var(--warn)'
                              : 'var(--danger)',
                      }}
                    />
                  </div>
                  <span className="w-10 text-right text-[12px] font-medium text-ink tabular">
                    {section.percentage}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QuestionScoreList({
  interview,
  className,
}: {
  interview: Interview;
  className?: string;
}) {
  let sectionTitle = '';

  return (
    <ol className={cx('space-y-1', className)}>
      {interview.questions.map((question, index) => {
        const answer = interview.answers[question.questionId];
        const showSection = question.sectionTitle !== sectionTitle;
        sectionTitle = question.sectionTitle;

        return (
          <li key={question.questionId}>
            {showSection ? (
              <h4 className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-subtle first:mt-0">
                {question.sectionTitle}
              </h4>
            ) : null}
            <div className="print-page rounded-lg border border-line bg-surface p-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-6 shrink-0 text-[12px] font-medium text-subtle tabular">
                  {index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-ink">{question.text}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-subtle">
                    <span>{question.category}</span>
                    {question.weight > 1 ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium">{question.weight}× weight</span>
                      </>
                    ) : null}
                    {answer?.flagged ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-warn">Flagged</span>
                      </>
                    ) : null}
                    {answer?.skipped ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium">Skipped</span>
                      </>
                    ) : null}
                  </p>
                  {answer?.notes?.trim() ? (
                    <p className="mt-2 border-l-2 border-line pl-3 text-[12.5px] leading-relaxed text-ink-2">
                      {answer.notes}
                    </p>
                  ) : null}
                </div>
                <ScoreChip
                  score={answer?.skipped ? null : (answer?.score ?? null)}
                  scaleMax={interview.scoring.scaleMax}
                  showMax
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
