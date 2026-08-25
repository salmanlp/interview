import { DEFAULT_SCORING, emptyAnswer } from './scoring';
import type {
  Answer,
  Candidate,
  Interview,
  InterviewQuestion,
  Question,
  Settings,
  Template,
} from './types';
import { now, uid } from './utils';
import { CHALLENGE_BRIEF } from './seed/template';

/**
 * Flattens a template into the ordered question list an interview runs on.
 * The result is stored *on the interview*, so editing a template later never
 * rewrites an interview that already happened.
 */
export function buildInterviewQuestions(
  template: Template,
  bank: Question[],
): InterviewQuestion[] {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const out: InterviewQuestion[] = [];

  for (const section of template.sections) {
    for (const tq of section.questions) {
      const q = byId.get(tq.questionId);
      if (!q || !q.active) continue;
      out.push({
        questionId: q.id,
        sectionId: section.id,
        sectionTitle: section.title,
        category: q.category,
        text: q.text,
        evaluationCriteria: q.evaluationCriteria,
        followUps: q.followUps,
        idealAnswer: q.idealAnswer,
        difficulty: q.difficulty,
        seniority: q.seniority,
        weight: tq.weight || q.weight,
        required: tq.required,
        recommendedSeconds: tq.recommendedSeconds,
      });
    }
  }
  return out;
}

export interface CreateInterviewInput {
  candidate: Candidate;
  template: Template;
  questions: Question[];
  interviewer: string;
  position: string;
  durationMinutes: number;
  mode: Interview['mode'];
  round: number;
  roundLabel: string;
  includeChallenge: boolean;
  settings: Settings;
  /**
   * A question set tailored to this candidate. When present it replaces the
   * template's own list; the template is still recorded for provenance.
   */
  questionOverride?: InterviewQuestion[];
}

export function createInterview(input: CreateInterviewInput): Interview {
  const questions =
    input.questionOverride?.length
      ? input.questionOverride
      : buildInterviewQuestions(input.template, input.questions);
  const answers: Record<string, Answer> = {};
  for (const q of questions) answers[q.questionId] = emptyAnswer(q.questionId);
  const timestamp = now();

  return {
    id: uid('int'),
    candidateId: input.candidate.id,
    templateId: input.template.id,
    templateName: input.template.name,
    position: input.position,
    interviewer: input.interviewer,
    round: input.round,
    roundLabel: input.roundLabel,
    mode: input.mode,
    durationMinutes: input.durationMinutes,
    status: 'in_progress',
    startedAt: timestamp,
    completedAt: null,
    elapsedMs: 0,
    paused: false,
    questions,
    answers,
    scoring: input.template.scoring ?? input.settings.scoring ?? DEFAULT_SCORING,
    challenge: {
      enabled: input.includeChallenge,
      brief: CHALLENGE_BRIEF,
      criteria: {},
      notes: '',
      score: null,
    },
    summary: '',
    autoRecommendation: null,
    decision: null,
    overrideReason: '',
    editedAfterCompletion: false,
    currentQuestionIndex: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export type QuestionState = 'not_started' | 'answered' | 'scored' | 'flagged' | 'skipped';

/**
 * `answered` means notes were taken but no score given yet; `scored` is the
 * completed state. Flagged and skipped take visual precedence in the navigator.
 */
export function questionState(answer: Answer | undefined): QuestionState {
  if (!answer) return 'not_started';
  if (answer.skipped) return 'skipped';
  if (answer.flagged) return 'flagged';
  if (answer.score != null) return 'scored';
  if (answer.notes.trim()) return 'answered';
  return 'not_started';
}

export const QUESTION_STATE_LABELS: Record<QuestionState, string> = {
  not_started: 'Not started',
  answered: 'Notes only',
  scored: 'Scored',
  flagged: 'Flagged',
  skipped: 'Skipped',
};

export function nextRoundNumber(interviews: Interview[], candidateId: string): number {
  const rounds = interviews.filter((i) => i.candidateId === candidateId).map((i) => i.round);
  return rounds.length ? Math.max(...rounds) + 1 : 1;
}

export const ROUND_LABEL_SUGGESTIONS = [
  'Round 1 — HR Screen',
  'Round 2 — UI/UX',
  'Round 3 — Design Challenge',
  'Round 4 — Final',
];

/** The interview a resume banner should offer, if any. */
export function findResumableInterview(interviews: Interview[]): Interview | null {
  const open = interviews
    .filter((i) => i.status === 'in_progress')
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return open[0] ?? null;
}

export function timerState(
  elapsedMs: number,
  durationMinutes: number,
  settings: Pick<Settings, 'warningMinutes' | 'criticalMinutes'>,
): 'normal' | 'warning' | 'critical' | 'overtime' {
  const remainingMs = durationMinutes * 60_000 - elapsedMs;
  if (remainingMs <= 0) return 'overtime';
  if (remainingMs <= settings.criticalMinutes * 60_000) return 'critical';
  if (remainingMs <= settings.warningMinutes * 60_000) return 'warning';
  return 'normal';
}
