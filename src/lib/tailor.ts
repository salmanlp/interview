import {
  CATEGORY_SKILL,
  SKILL_LABELS,
  type Difficulty,
  type InterviewQuestion,
  type Question,
  type Seniority,
  type SkillKey,
} from './types';

/**
 * Tailors a question set to one candidate.
 *
 * Rule-based and transparent — every question carries the reason it was
 * chosen, so the interviewer can agree or overrule rather than trusting a
 * black box. Nothing here calls out to a model or a network.
 *
 * The guiding idea is that an interview should spend its time where the
 * uncertainty is. An area the candidate has clearly done a lot of needs a
 * couple of hard questions to probe depth; an area with no evidence needs
 * broader coverage starting from the basics.
 */

export type SkillStance = 'strong' | 'unproven' | 'neutral';

export interface TailorInput {
  questions: Question[];
  /** Where the candidate is evidently strong — probe depth, not breadth. */
  strong: SkillKey[];
  /** Where there is no evidence yet — this is what the interview is for. */
  unproven: SkillKey[];
  seniority: Seniority;
  targetCount: number;
}

export interface TailoredQuestion {
  question: Question;
  skill: SkillKey;
  score: number;
  reason: string;
}

export interface TailorResult {
  selected: TailoredQuestion[];
  /** Everything else, ranked — the pool the interviewer can add back from. */
  remaining: TailoredQuestion[];
  /** Unproven skills with no question available in the bank. */
  uncovered: SkillKey[];
  estimatedSeconds: number;
}

const SENIORITY_ORDER: Seniority[] = ['junior', 'mid', 'senior', 'lead'];

/** Rough time to ask and answer, used for the duration estimate. */
const SECONDS_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 45,
  medium: 80,
  hard: 130,
};

/** No single area should dominate, however lopsided the stances are. */
const MAX_PER_SKILL = 4;

function stanceOf(skill: SkillKey, input: TailorInput): SkillStance {
  if (input.unproven.includes(skill)) return 'unproven';
  if (input.strong.includes(skill)) return 'strong';
  return 'neutral';
}

function scoreQuestion(question: Question, input: TailorInput): { score: number; reason: string } {
  const skill = CATEGORY_SKILL[question.category];
  const stance = stanceOf(skill, input);
  const label = SKILL_LABELS[skill];

  let score = 0;
  let reason = 'Broad coverage';

  // Seniority fit. A junior definition wastes a lead's time, and a lead-level
  // systems question is unfair to a junior.
  const distance =
    SENIORITY_ORDER.indexOf(question.seniority) - SENIORITY_ORDER.indexOf(input.seniority);
  if (distance === 0) score += 3;
  else if (Math.abs(distance) === 1) score += 1;
  else score -= 4;

  // Stance is the dominant signal.
  if (stance === 'unproven') {
    score += 6;
    reason = `No evidence in ${label} yet`;
    // Establish a baseline before reaching for the hard ones.
    if (question.difficulty === 'easy') score += 1;
    if (question.difficulty === 'hard') score -= 1;
  } else if (stance === 'strong') {
    score -= 2;
    reason = `Depth check in ${label}`;
    // They have done this a lot — only a hard question tells you anything.
    if (question.difficulty === 'hard') score += 4;
    else if (question.difficulty === 'medium') score += 1;
    else score -= 3;
  }

  // Weighted questions are the ones that predict on-the-job performance.
  if (question.weight >= 3) score += 2;
  else if (question.weight === 2) score += 1;

  if (distance <= -2) reason = `Below ${input.seniority} level`;

  return { score, reason };
}

export function suggestQuestions(input: TailorInput): TailorResult {
  const ranked: TailoredQuestion[] = input.questions
    .filter((q) => q.active)
    .map((question) => {
      const { score, reason } = scoreQuestion(question, input);
      return { question, skill: CATEGORY_SKILL[question.category], score, reason };
    })
    .sort((a, b) => b.score - a.score || a.question.text.localeCompare(b.question.text));

  const selected: TailoredQuestion[] = [];
  const perSkill = new Map<SkillKey, number>();
  const taken = new Set<string>();

  const take = (candidate: TailoredQuestion) => {
    selected.push(candidate);
    taken.add(candidate.question.id);
    perSkill.set(candidate.skill, (perSkill.get(candidate.skill) ?? 0) + 1);
  };

  // Every unproven skill earns at least one question before anything else
  // competes for the slots — that is the whole point of naming it unproven.
  const uncovered: SkillKey[] = [];
  for (const skill of input.unproven) {
    const best = ranked.find((c) => c.skill === skill && !taken.has(c.question.id));
    if (best) take(best);
    else uncovered.push(skill);
  }

  // Fill the rest by rank, keeping any one area from swallowing the interview.
  for (const candidate of ranked) {
    if (selected.length >= input.targetCount) break;
    if (taken.has(candidate.question.id)) continue;
    if ((perSkill.get(candidate.skill) ?? 0) >= MAX_PER_SKILL) continue;
    take(candidate);
  }

  // Present in a sensible asking order rather than by score: group by skill so
  // the conversation does not jump between topics.
  const skillOrder = [...new Set(selected.map((s) => s.skill))];
  selected.sort(
    (a, b) =>
      skillOrder.indexOf(a.skill) - skillOrder.indexOf(b.skill) || b.score - a.score,
  );

  return {
    selected,
    remaining: ranked.filter((c) => !taken.has(c.question.id)),
    uncovered,
    estimatedSeconds: selected.reduce(
      (total, c) => total + SECONDS_BY_DIFFICULTY[c.question.difficulty],
      0,
    ),
  };
}

/** Turns a tailored selection into the frozen question list an interview runs on. */
export function toInterviewQuestions(selection: TailoredQuestion[]): InterviewQuestion[] {
  return selection.map((item) => ({
    questionId: item.question.id,
    // Sections are the skill groupings, so section scores stay meaningful.
    sectionId: item.skill,
    sectionTitle: SKILL_LABELS[item.skill],
    category: item.question.category,
    text: item.question.text,
    evaluationCriteria: item.question.evaluationCriteria,
    followUps: item.question.followUps,
    idealAnswer: item.question.idealAnswer,
    difficulty: item.question.difficulty,
    seniority: item.question.seniority,
    weight: item.question.weight,
    required: item.question.weight >= 2,
    recommendedSeconds: SECONDS_BY_DIFFICULTY[item.question.difficulty],
  }));
}

/** Sensible default seniority from a candidate's years of experience. */
export function seniorityFromExperience(years: number): Seniority {
  if (years < 2) return 'junior';
  if (years < 5) return 'mid';
  if (years < 9) return 'senior';
  return 'lead';
}
