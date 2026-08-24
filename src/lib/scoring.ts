import {
  CATEGORY_SKILL,
  type Answer,
  type Interview,
  type InterviewQuestion,
  type Recommendation,
  type RecommendationThresholds,
  type ScoringRules,
  type SkillKey,
} from './types';
import { mean, round } from './utils';

/**
 * Scoring engine.
 *
 * Pure functions only — no storage, no React. Everything the app reports
 * (totals, section rollups, skill breakdown, strengths, recommendation)
 * derives from here, so there is exactly one definition of "the score".
 *
 * Two denominators are tracked on purpose:
 *  - `maxPossible` — every question in the template. Answers the question
 *    "how did they do against the whole interview?" and is what the finish
 *    dialog shows (e.g. 128 / 155).
 *  - `scoredMax` — only the questions that actually received a score. The
 *    percentage used for the recommendation uses this basis, so an interview
 *    that ran out of time is not punished for questions never asked.
 */

export interface SectionScore {
  sectionId: string;
  title: string;
  total: number;
  max: number;
  weightedTotal: number;
  weightedMax: number;
  percentage: number;
  average: number;
  scored: number;
  skipped: number;
  questions: number;
}

export interface SkillScore {
  skill: SkillKey;
  average: number;
  percentage: number;
  count: number;
}

export interface InterviewResult {
  totalQuestions: number;
  scoredCount: number;
  skippedCount: number;
  flaggedCount: number;
  unansweredCount: number;
  /** Sum of raw 1..scaleMax scores. */
  rawScore: number;
  /** Every question × scaleMax. */
  maxPossible: number;
  /** Scored questions × scaleMax. */
  scoredMax: number;
  weightedScore: number;
  weightedMax: number;
  /** Weighted percentage over scored questions — drives the recommendation. */
  percentage: number;
  /** Unweighted percentage over scored questions. */
  rawPercentage: number;
  /** Percentage of raw score against the whole template. */
  coveragePercentage: number;
  averageScore: number;
  completionPercentage: number;
  sections: SectionScore[];
  skills: SkillScore[];
  strengths: SectionScore[];
  developmentAreas: SectionScore[];
  strongestSkill: SkillScore | null;
  weakestSkill: SkillScore | null;
  recommendation: Recommendation | null;
}

export const DEFAULT_THRESHOLDS: RecommendationThresholds = {
  strongHire: 90,
  hire: 75,
  maybe: 60,
};

export const DEFAULT_SCALE = [
  {
    value: 1,
    label: 'Weak',
    description: 'Cannot answer, or the answer shows a fundamental misunderstanding of the topic.',
  },
  {
    value: 2,
    label: 'Developing',
    description: 'Partial or textbook understanding. Needs prompting and lacks practical application.',
  },
  {
    value: 3,
    label: 'Good',
    description: 'Solid, correct answer with reasonable reasoning. Meets the bar for the role.',
  },
  {
    value: 4,
    label: 'Strong',
    description: 'Clear, confident answer backed by real project experience and sound trade-offs.',
  },
  {
    value: 5,
    label: 'Excellent',
    description:
      'Demonstrates deep practical knowledge, strong reasoning and relevant real-world examples.',
  },
];

export const DEFAULT_SCORING: ScoringRules = {
  scaleMax: 5,
  scale: DEFAULT_SCALE,
  thresholds: DEFAULT_THRESHOLDS,
};

export function scalePoint(scoring: ScoringRules, value: number) {
  return (
    scoring.scale.find((p) => p.value === value) ?? {
      value,
      label: `Score ${value}`,
      description: '',
    }
  );
}

/** Builds a scale of `max` points, preserving any labels already configured. */
export function buildScale(max: number, existing: ScoringRules['scale']): ScoringRules['scale'] {
  const fallbackLabels = ['Weak', 'Developing', 'Good', 'Strong', 'Excellent', 'Exceptional', 'Outstanding'];
  return Array.from({ length: max }, (_, i) => {
    const value = i + 1;
    const prev = existing.find((p) => p.value === value);
    return (
      prev ?? {
        value,
        label: fallbackLabels[Math.min(i, fallbackLabels.length - 1)],
        description: '',
      }
    );
  });
}

export function emptyAnswer(questionId: string): Answer {
  return {
    questionId,
    score: null,
    notes: '',
    flagged: false,
    skipped: false,
    timeSpentMs: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function recommendationFor(
  percentage: number,
  thresholds: RecommendationThresholds,
): Recommendation {
  if (percentage >= thresholds.strongHire) return 'strong_hire';
  if (percentage >= thresholds.hire) return 'hire';
  if (percentage >= thresholds.maybe) return 'maybe';
  return 'no_hire';
}

interface ScoreInput {
  questions: InterviewQuestion[];
  answers: Record<string, Answer>;
  scoring: ScoringRules;
}

export function computeResult({ questions, answers, scoring }: ScoreInput): InterviewResult {
  const scaleMax = scoring.scaleMax || 5;

  let rawScore = 0;
  let weightedScore = 0;
  let weightedMax = 0;
  let scoredCount = 0;
  let skippedCount = 0;
  let flaggedCount = 0;

  const sectionBuckets = new Map<string, SectionScore>();
  const skillBuckets = new Map<SkillKey, number[]>();

  for (const q of questions) {
    const answer = answers[q.questionId];
    const scored = answer && answer.score != null && !answer.skipped;

    let bucket = sectionBuckets.get(q.sectionId);
    if (!bucket) {
      bucket = {
        sectionId: q.sectionId,
        title: q.sectionTitle,
        total: 0,
        max: 0,
        weightedTotal: 0,
        weightedMax: 0,
        percentage: 0,
        average: 0,
        scored: 0,
        skipped: 0,
        questions: 0,
      };
      sectionBuckets.set(q.sectionId, bucket);
    }
    bucket.questions += 1;

    if (answer?.flagged) flaggedCount += 1;
    if (answer?.skipped) {
      skippedCount += 1;
      bucket.skipped += 1;
    }

    if (scored) {
      const value = answer.score as number;
      const weight = q.weight || 1;
      rawScore += value;
      weightedScore += value * weight;
      weightedMax += scaleMax * weight;
      scoredCount += 1;

      bucket.total += value;
      bucket.max += scaleMax;
      bucket.weightedTotal += value * weight;
      bucket.weightedMax += scaleMax * weight;
      bucket.scored += 1;

      const skill = CATEGORY_SKILL[q.category] ?? 'ux';
      const list = skillBuckets.get(skill) ?? [];
      list.push(value);
      skillBuckets.set(skill, list);
    }
  }

  const sections = [...sectionBuckets.values()].map((s) => ({
    ...s,
    percentage: s.weightedMax ? round((s.weightedTotal / s.weightedMax) * 100, 1) : 0,
    average: s.scored ? round(s.total / s.scored, 2) : 0,
  }));

  const skills: SkillScore[] = [...skillBuckets.entries()]
    .map(([skill, values]) => ({
      skill,
      average: round(mean(values), 2),
      percentage: round((mean(values) / scaleMax) * 100, 1),
      count: values.length,
    }))
    .sort((a, b) => b.average - a.average);

  const rankedSections = sections
    .filter((s) => s.scored > 0)
    .sort((a, b) => b.percentage - a.percentage || a.title.localeCompare(b.title));

  const { strengths, developmentAreas } = splitStrengths(rankedSections);

  const totalQuestions = questions.length;
  const maxPossible = totalQuestions * scaleMax;
  const scoredMax = scoredCount * scaleMax;
  const percentage = weightedMax ? round((weightedScore / weightedMax) * 100, 1) : 0;

  return {
    totalQuestions,
    scoredCount,
    skippedCount,
    flaggedCount,
    unansweredCount: Math.max(0, totalQuestions - scoredCount - skippedCount),
    rawScore,
    maxPossible,
    scoredMax,
    weightedScore,
    weightedMax,
    percentage,
    rawPercentage: scoredMax ? round((rawScore / scoredMax) * 100, 1) : 0,
    coveragePercentage: maxPossible ? round((rawScore / maxPossible) * 100, 1) : 0,
    averageScore: scoredCount ? round(rawScore / scoredCount, 2) : 0,
    completionPercentage: totalQuestions
      ? round(((scoredCount + skippedCount) / totalQuestions) * 100, 0)
      : 0,
    sections,
    skills,
    strengths,
    developmentAreas,
    strongestSkill: skills[0] ?? null,
    weakestSkill: skills.length ? skills[skills.length - 1] : null,
    recommendation: scoredCount ? recommendationFor(percentage, scoring.thresholds) : null,
  };
}

/**
 * Top sections become strengths, bottom sections become development areas.
 * With fewer than six sections the list is split down the middle so that no
 * section is reported as both a strength and a weakness.
 */
function splitStrengths(ranked: SectionScore[]): {
  strengths: SectionScore[];
  developmentAreas: SectionScore[];
} {
  const n = ranked.length;
  if (n === 0) return { strengths: [], developmentAreas: [] };
  if (n === 1) return { strengths: [ranked[0]], developmentAreas: [] };

  const topCount = n >= 6 ? 3 : Math.max(1, Math.min(3, Math.floor(n / 2)));
  const bottomCount = Math.min(3, n - topCount);
  return {
    strengths: ranked.slice(0, topCount),
    developmentAreas: bottomCount > 0 ? ranked.slice(n - bottomCount).reverse() : [],
  };
}

export function resultFor(interview: Interview): InterviewResult {
  return computeResult({
    questions: interview.questions,
    answers: interview.answers,
    scoring: interview.scoring,
  });
}

/** Colour token name for a 1..scaleMax score. Never the only signal. */
export function scoreTone(score: number | null, scaleMax = 5): 's1' | 's2' | 's3' | 's4' | 's5' | 'neutral' {
  if (score == null) return 'neutral';
  const normalised = Math.ceil((score / scaleMax) * 5);
  switch (Math.min(5, Math.max(1, normalised))) {
    case 1:
      return 's1';
    case 2:
      return 's2';
    case 3:
      return 's3';
    case 4:
      return 's4';
    default:
      return 's5';
  }
}

export function percentageTone(percentage: number, thresholds = DEFAULT_THRESHOLDS) {
  if (percentage >= thresholds.strongHire) return 's5';
  if (percentage >= thresholds.hire) return 's4';
  if (percentage >= thresholds.maybe) return 's3';
  return 's1';
}
