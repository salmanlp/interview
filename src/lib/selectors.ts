import { computeResult, type InterviewResult } from './scoring';
import {
  PIPELINE_STAGES,
  SKILL_LABELS,
  type Candidate,
  type Interview,
  type PipelineStage,
  type SkillKey,
} from './types';
import { mean, round } from './utils';

/** A candidate plus everything derived from their interviews. */
export interface CandidateSummary {
  candidate: Candidate;
  interviews: Interview[];
  completedInterviews: Interview[];
  latest: Interview | null;
  /** Result of the most recent completed interview. */
  result: InterviewResult | null;
  /** Weighted percentage across every completed interview. */
  overallPercentage: number | null;
  averageScore: number | null;
  lastInterviewDate: string | null;
  hasInProgress: boolean;
}

export function summarise(candidate: Candidate, allInterviews: Interview[]): CandidateSummary {
  const interviews = allInterviews
    .filter((i) => i.candidateId === candidate.id)
    .sort((a, b) => (a.round === b.round ? (a.startedAt < b.startedAt ? -1 : 1) : a.round - b.round));
  const completed = interviews.filter((i) => i.status === 'completed');
  const latestCompleted = [...completed].sort((a, b) =>
    (a.completedAt ?? a.startedAt) < (b.completedAt ?? b.startedAt) ? 1 : -1,
  )[0];

  const results = completed.map((i) =>
    computeResult({ questions: i.questions, answers: i.answers, scoring: i.scoring }),
  );
  const scored = results.filter((r) => r.scoredCount > 0);

  return {
    candidate,
    interviews,
    completedInterviews: completed,
    latest: latestCompleted ?? interviews[interviews.length - 1] ?? null,
    result: latestCompleted
      ? computeResult({
          questions: latestCompleted.questions,
          answers: latestCompleted.answers,
          scoring: latestCompleted.scoring,
        })
      : null,
    overallPercentage: scored.length ? round(mean(scored.map((r) => r.percentage)), 1) : null,
    averageScore: scored.length ? round(mean(scored.map((r) => r.averageScore)), 2) : null,
    lastInterviewDate: latestCompleted?.completedAt ?? interviews[interviews.length - 1]?.startedAt ?? null,
    hasInProgress: interviews.some((i) => i.status === 'in_progress'),
  };
}

export function summariseAll(candidates: Candidate[], interviews: Interview[]): CandidateSummary[] {
  return candidates.map((c) => summarise(c, interviews));
}

/** Aggregated skill averages across a set of completed interviews. */
export function skillAverages(interviews: Interview[]): Record<SkillKey, { average: number; count: number }> {
  const buckets = new Map<SkillKey, number[]>();
  for (const interview of interviews) {
    const result = computeResult({
      questions: interview.questions,
      answers: interview.answers,
      scoring: interview.scoring,
    });
    for (const skill of result.skills) {
      const list = buckets.get(skill.skill) ?? [];
      // Normalise to a 0–5 scale regardless of the interview's own scale.
      list.push((skill.average / interview.scoring.scaleMax) * 5);
      buckets.set(skill.skill, list);
    }
  }
  const out = {} as Record<SkillKey, { average: number; count: number }>;
  for (const key of Object.keys(SKILL_LABELS) as SkillKey[]) {
    const values = buckets.get(key) ?? [];
    out[key] = { average: values.length ? round(mean(values), 2) : 0, count: values.length };
  }
  return out;
}

/** Score distribution across every scored answer in the given interviews. */
export function scoreDistribution(interviews: Interview[], scaleMax = 5): { score: number; count: number }[] {
  const counts = new Map<number, number>();
  for (let i = 1; i <= scaleMax; i++) counts.set(i, 0);
  for (const interview of interviews) {
    for (const answer of Object.values(interview.answers)) {
      if (answer.score == null || answer.skipped) continue;
      counts.set(answer.score, (counts.get(answer.score) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([score, count]) => ({ score, count }));
}

/** Maps candidate status onto the six dashboard pipeline stages. */
export function pipelineStage(candidate: Candidate, summary: CandidateSummary): PipelineStage {
  switch (candidate.status) {
    case 'new':
      return 'New';
    case 'scheduled':
      return 'Interview Scheduled';
    case 'in_progress':
      return summary.hasInProgress ? 'Interview Scheduled' : 'Interviewed';
    case 'completed':
      return 'Interviewed';
    case 'under_review':
    case 'hold':
      return 'Review';
    case 'strong_hire':
    case 'hire':
      return 'Hired';
    case 'no_hire':
      return 'Rejected';
    default:
      return 'New';
  }
}

export const PIPELINE_TONES: Record<PipelineStage, string> = {
  New: 'var(--subtle)',
  'Interview Scheduled': 'var(--info)',
  Interviewed: 'var(--brand)',
  Review: 'var(--warn)',
  Hired: 'var(--ok)',
  Rejected: 'var(--danger)',
};

export function pipelineCounts(summaries: CandidateSummary[]) {
  const counts = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, 0])) as Record<PipelineStage, number>;
  for (const summary of summaries) {
    counts[pipelineStage(summary.candidate, summary)] += 1;
  }
  return PIPELINE_STAGES.map((stage) => ({
    label: stage,
    count: counts[stage],
    tone: PIPELINE_TONES[stage],
  }));
}

/** Per-question analytics used by the interview quality report. */
export interface QuestionAnalytics {
  questionId: string;
  text: string;
  category: string;
  sectionTitle: string;
  candidates: number;
  averageScore: number;
  /** Population standard deviation — how well the question separates candidates. */
  differentiation: number;
  skipRate: number;
  distribution: { score: number; count: number }[];
  scaleMax: number;
}

export function questionAnalytics(interviews: Interview[], scaleMax = 5): QuestionAnalytics[] {
  const map = new Map<
    string,
    { question: Interview['questions'][number]; scores: number[]; asked: number; skipped: number }
  >();

  for (const interview of interviews) {
    for (const question of interview.questions) {
      const answer = interview.answers[question.questionId];
      if (!answer) continue;
      const entry = map.get(question.questionId) ?? {
        question,
        scores: [],
        asked: 0,
        skipped: 0,
      };
      if (answer.skipped) {
        entry.skipped += 1;
        entry.asked += 1;
      } else if (answer.score != null) {
        // Normalise to the reporting scale so mixed-scale interviews combine.
        entry.scores.push((answer.score / interview.scoring.scaleMax) * scaleMax);
        entry.asked += 1;
      }
      map.set(question.questionId, entry);
    }
  }

  return [...map.values()]
    .filter((entry) => entry.asked > 0)
    .map((entry) => {
      const avg = entry.scores.length ? mean(entry.scores) : 0;
      const variance = entry.scores.length
        ? mean(entry.scores.map((s) => (s - avg) ** 2))
        : 0;
      const distribution = Array.from({ length: scaleMax }, (_, i) => ({
        score: i + 1,
        count: entry.scores.filter((s) => Math.round(s) === i + 1).length,
      }));
      return {
        questionId: entry.question.questionId,
        text: entry.question.text,
        category: entry.question.category,
        sectionTitle: entry.question.sectionTitle,
        candidates: entry.scores.length,
        averageScore: round(avg, 2),
        differentiation: round(Math.sqrt(variance), 2),
        skipRate: entry.asked ? round((entry.skipped / entry.asked) * 100, 0) : 0,
        distribution,
        scaleMax,
      };
    });
}
