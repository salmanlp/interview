/**
 * Domain model.
 *
 * Everything the application persists is described here. The shapes are
 * deliberately storage-agnostic: plain JSON-serialisable objects with string
 * ids, so the IndexedDB repository can be swapped for a REST/SQL backend
 * without touching the UI (see `data/repository.ts`).
 */

export type ID = string;
export type ISODate = string;

/* ---------------------------------------------------------------- Skills */

export const SKILLS = [
  'ux',
  'research',
  'ui',
  'figma',
  'design_systems',
  'product_thinking',
  'accessibility',
  'collaboration',
  'communication',
  'problem_solving',
] as const;

export type SkillKey = (typeof SKILLS)[number];

export const SKILL_LABELS: Record<SkillKey, string> = {
  ux: 'UX Thinking',
  research: 'Research',
  ui: 'UI Design',
  figma: 'Figma',
  design_systems: 'Design Systems',
  product_thinking: 'Product Thinking',
  accessibility: 'Accessibility',
  collaboration: 'Collaboration',
  communication: 'Communication',
  problem_solving: 'Problem Solving',
};

/* ------------------------------------------------------------ Categories */

export const CATEGORIES = [
  'UX Fundamentals',
  'User Research',
  'UI Design',
  'Visual Design',
  'Typography',
  'Accessibility',
  'Responsive Design',
  'Figma',
  'Auto Layout',
  'Components',
  'Variables',
  'Design Systems',
  'Product Thinking',
  'Analytics',
  'Collaboration',
  'Developer Handoff',
  'Portfolio',
  'Leadership',
  'Problem Solving',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Every category rolls up into exactly one skill for the radar/bars. */
export const CATEGORY_SKILL: Record<Category, SkillKey> = {
  'UX Fundamentals': 'ux',
  'User Research': 'research',
  'UI Design': 'ui',
  'Visual Design': 'ui',
  Typography: 'ui',
  Accessibility: 'accessibility',
  'Responsive Design': 'ui',
  Figma: 'figma',
  'Auto Layout': 'figma',
  Components: 'figma',
  Variables: 'figma',
  'Design Systems': 'design_systems',
  'Product Thinking': 'product_thinking',
  Analytics: 'product_thinking',
  Collaboration: 'collaboration',
  'Developer Handoff': 'collaboration',
  Portfolio: 'communication',
  Leadership: 'communication',
  'Problem Solving': 'problem_solving',
};

/* ------------------------------------------------------------- Questions */

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Seniority = 'junior' | 'mid' | 'senior' | 'lead';
export type Weight = 1 | 2 | 3;

export interface Question {
  id: ID;
  text: string;
  category: Category;
  difficulty: Difficulty;
  seniority: Seniority;
  /** What a good answer contains — shown to the interviewer while scoring. */
  evaluationCriteria: string[];
  followUps: string[];
  idealAnswer: string;
  weight: Weight;
  active: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ------------------------------------------------------------- Templates */

export type InterviewMode = 'structured' | 'semi_structured' | 'custom';

export interface TemplateQuestion {
  questionId: ID;
  /** Overrides the question's own weight for this template. */
  weight: Weight;
  required: boolean;
  /** Recommended time on this question, in seconds. */
  recommendedSeconds: number;
}

export interface TemplateSection {
  id: ID;
  title: string;
  questions: TemplateQuestion[];
}

export interface ScoringRules {
  /** Top of the scale. 5 by default; configurable in Settings. */
  scaleMax: number;
  /** Labels + guidance for each point, index 0 === score 1. */
  scale: ScalePoint[];
  thresholds: RecommendationThresholds;
}

export interface ScalePoint {
  value: number;
  label: string;
  description: string;
}

export interface RecommendationThresholds {
  /** Percentage floors. */
  strongHire: number;
  hire: number;
  maybe: number;
}

export interface Template {
  id: ID;
  name: string;
  description: string;
  durationMinutes: number;
  mode: InterviewMode;
  sections: TemplateSection[];
  /** null → inherit global settings. */
  scoring: ScoringRules | null;
  isDefault: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ------------------------------------------------------------ Candidates */

export type CandidateStatus =
  | 'new'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'under_review'
  | 'strong_hire'
  | 'hire'
  | 'hold'
  | 'no_hire';

export const CANDIDATE_STATUSES: CandidateStatus[] = [
  'new',
  'scheduled',
  'in_progress',
  'completed',
  'under_review',
  'strong_hire',
  'hire',
  'hold',
  'no_hire',
];

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  new: 'New',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  under_review: 'Under Review',
  strong_hire: 'Strong Hire',
  hire: 'Hire',
  hold: 'Hold',
  no_hire: 'No Hire',
};

/** Pipeline stages shown on the dashboard. */
export const PIPELINE_STAGES = [
  'New',
  'Interview Scheduled',
  'Interviewed',
  'Review',
  'Hired',
  'Rejected',
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface CandidateNote {
  id: ID;
  body: string;
  author: string;
  createdAt: ISODate;
}

export interface CandidateDocument {
  id: ID;
  name: string;
  kind: 'resume' | 'portfolio' | 'report' | 'other';
  url?: string;
  /** Free-text reference only — files are never uploaded anywhere. */
  reference?: string;
  createdAt: ISODate;
}

export interface Candidate {
  id: ID;
  name: string;
  email: string;
  phone: string;
  position: string;
  yearsExperience: number;
  portfolioUrl: string;
  linkedinUrl: string;
  resume: string;
  location: string;
  interviewer: string;
  status: CandidateStatus;
  archived: boolean;
  notes: CandidateNote[];
  documents: CandidateDocument[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ------------------------------------------------------------ Interviews */

export type Recommendation = 'strong_hire' | 'hire' | 'maybe' | 'no_hire';

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  strong_hire: 'Strong Hire',
  hire: 'Hire',
  maybe: 'Further Review',
  no_hire: 'No Hire',
};

export type HiringDecision = 'strong_hire' | 'hire' | 'hold' | 'no_hire';

export const DECISION_LABELS: Record<HiringDecision, string> = {
  strong_hire: 'Strong Hire',
  hire: 'Hire',
  hold: 'Hold',
  no_hire: 'No Hire',
};

export interface Answer {
  questionId: ID;
  score: number | null;
  notes: string;
  flagged: boolean;
  skipped: boolean;
  /** Milliseconds the interviewer spent with this question open. */
  timeSpentMs: number;
  updatedAt: ISODate;
}

/**
 * A frozen copy of the template at the moment the interview started.
 * Editing a template later must never rewrite interview history.
 */
export interface InterviewQuestion {
  questionId: ID;
  sectionId: ID;
  sectionTitle: string;
  category: Category;
  text: string;
  evaluationCriteria: string[];
  followUps: string[];
  idealAnswer: string;
  difficulty: Difficulty;
  seniority: Seniority;
  weight: Weight;
  required: boolean;
  recommendedSeconds: number;
}

export type InterviewStatus = 'in_progress' | 'completed';

export const CHALLENGE_CRITERIA = [
  'Visual hierarchy',
  'Spacing',
  'Typography',
  'Auto Layout',
  'Components',
  'Variants',
  'States',
  'Accessibility',
  'Responsive thinking',
] as const;
export type ChallengeCriterion = (typeof CHALLENGE_CRITERIA)[number];

export interface DesignChallenge {
  enabled: boolean;
  brief: string;
  criteria: Partial<Record<ChallengeCriterion, number>>;
  notes: string;
  /** Overall challenge score, scored separately from the question set. */
  score: number | null;
}

export interface Interview {
  id: ID;
  candidateId: ID;
  templateId: ID;
  templateName: string;
  position: string;
  interviewer: string;
  round: number;
  roundLabel: string;
  mode: InterviewMode;
  durationMinutes: number;
  status: InterviewStatus;
  startedAt: ISODate;
  completedAt: ISODate | null;
  /** Accumulated running time, excluding paused periods. */
  elapsedMs: number;
  paused: boolean;
  questions: InterviewQuestion[];
  answers: Record<ID, Answer>;
  scoring: ScoringRules;
  challenge: DesignChallenge;
  summary: string;
  /** Rule-based recommendation derived from the score. */
  autoRecommendation: Recommendation | null;
  /** Interviewer's final call; may differ from the automatic one. */
  decision: HiringDecision | null;
  overrideReason: string;
  /** Set once the assessment is edited after completion. */
  editedAfterCompletion: boolean;
  currentQuestionIndex: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/* ---------------------------------------------------------------- Audit */

export type AuditType =
  | 'candidate_created'
  | 'candidate_updated'
  | 'candidate_archived'
  | 'candidate_deleted'
  | 'interview_started'
  | 'interview_resumed'
  | 'interview_completed'
  | 'interview_discarded'
  | 'interview_edited'
  | 'score_changed'
  | 'recommendation_changed'
  | 'report_exported'
  | 'note_added'
  | 'data_imported';

export interface AuditEvent {
  id: ID;
  candidateId: ID | null;
  interviewId: ID | null;
  type: AuditType;
  message: string;
  actor: string;
  at: ISODate;
}

/* -------------------------------------------------------------- Settings */

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Settings {
  id: 'settings';
  interviewerName: string;
  interviewerRole: string;
  defaultDurationMinutes: number;
  /** Minutes remaining at which the timer turns amber. */
  warningMinutes: number;
  /** Minutes remaining at which the timer turns red. */
  criticalMinutes: number;
  autosaveMs: number;
  scoring: ScoringRules;
  theme: ThemePreference;
  density: 'comfortable' | 'compact';
  demoDataLoaded: boolean;
  showKeyboardHints: boolean;
  updatedAt: ISODate;
}

/* ---------------------------------------------------------------- Backup */

export interface BackupFile {
  format: 'interview-assessment-backup';
  version: number;
  exportedAt: ISODate;
  candidates: Candidate[];
  interviews: Interview[];
  templates: Template[];
  questions: Question[];
  audit: AuditEvent[];
  settings: Settings | null;
}
