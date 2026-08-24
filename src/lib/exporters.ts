import { computeResult } from './scoring';
import {
  RECOMMENDATION_LABELS,
  DECISION_LABELS,
  SKILL_LABELS,
  type BackupFile,
  type Candidate,
  type Interview,
} from './types';
import type { CandidateSummary } from './selectors';
import { downloadBlob, formatDate, formatDuration, slugify } from './utils';

/* ------------------------------------------------------------------- CSV */

function escapeCsv(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  // A leading BOM keeps Excel from mangling non-ASCII candidate names.
  return '﻿' + rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
}

export function candidatesCsv(summaries: CandidateSummary[]): string {
  const rows: (string | number | null)[][] = [
    [
      'Name',
      'Email',
      'Phone',
      'Position',
      'Years experience',
      'Location',
      'Status',
      'Overall score %',
      'Average score',
      'Recommendation',
      'Decision',
      'Interviews',
      'Last interview',
      'Interviewer',
      'Portfolio',
      'LinkedIn',
    ],
  ];
  for (const summary of summaries) {
    const { candidate, result, latest } = summary;
    rows.push([
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.position,
      candidate.yearsExperience,
      candidate.location,
      candidate.status,
      summary.overallPercentage ?? '',
      summary.averageScore ?? '',
      result?.recommendation ? RECOMMENDATION_LABELS[result.recommendation] : '',
      latest?.decision ? DECISION_LABELS[latest.decision] : '',
      summary.completedInterviews.length,
      summary.lastInterviewDate ? formatDate(summary.lastInterviewDate) : '',
      candidate.interviewer,
      candidate.portfolioUrl,
      candidate.linkedinUrl,
    ]);
  }
  return toCsv(rows);
}

export function interviewCsv(interview: Interview, candidate: Candidate | undefined): string {
  const result = computeResult({
    questions: interview.questions,
    answers: interview.answers,
    scoring: interview.scoring,
  });

  const rows: (string | number | null)[][] = [
    ['UI/UX Designer Interview Assessment'],
    ['Candidate', candidate?.name ?? ''],
    ['Position', interview.position],
    ['Interviewer', interview.interviewer],
    ['Round', interview.roundLabel],
    ['Template', interview.templateName],
    ['Date', formatDate(interview.completedAt ?? interview.startedAt)],
    ['Duration', formatDuration(interview.elapsedMs)],
    ['Raw score', `${result.rawScore}/${result.maxPossible}`],
    ['Weighted score', `${result.weightedScore}/${result.weightedMax}`],
    ['Percentage', `${result.percentage}%`],
    ['Average score', result.averageScore],
    ['Questions scored', result.scoredCount],
    ['Questions skipped', result.skippedCount],
    [
      'Automatic recommendation',
      result.recommendation ? RECOMMENDATION_LABELS[result.recommendation] : '',
    ],
    ['Hiring decision', interview.decision ? DECISION_LABELS[interview.decision] : ''],
    ['Override reason', interview.overrideReason],
    [],
    ['Section', 'Scored', 'Skipped', 'Raw', 'Weighted', 'Percentage', 'Average'],
  ];

  for (const section of result.sections) {
    rows.push([
      section.title,
      section.scored,
      section.skipped,
      `${section.total}/${section.max}`,
      `${section.weightedTotal}/${section.weightedMax}`,
      `${section.percentage}%`,
      section.average,
    ]);
  }

  rows.push([]);
  rows.push(['#', 'Section', 'Category', 'Question', 'Weight', 'Score', 'Status', 'Notes']);
  interview.questions.forEach((question, index) => {
    const answer = interview.answers[question.questionId];
    rows.push([
      index + 1,
      question.sectionTitle,
      question.category,
      question.text,
      `${question.weight}x`,
      answer?.score ?? '',
      answer?.skipped ? 'Skipped' : answer?.flagged ? 'Flagged' : answer?.score != null ? 'Scored' : 'Not answered',
      answer?.notes ?? '',
    ]);
  });

  if (interview.challenge.enabled) {
    rows.push([]);
    rows.push(['Design challenge score', interview.challenge.score ?? '']);
    rows.push(['Design challenge notes', interview.challenge.notes]);
  }

  rows.push([]);
  rows.push(['Interviewer summary', interview.summary]);

  return toCsv(rows);
}

export function questionAnalyticsCsv(
  rows: {
    text: string;
    category: string;
    candidates: number;
    averageScore: number;
    differentiation: number;
    skipRate: number;
  }[],
): string {
  return toCsv([
    ['Question', 'Category', 'Candidates', 'Average score', 'Differentiation (σ)', 'Skip rate %'],
    ...rows.map((r) => [r.text, r.category, r.candidates, r.averageScore, r.differentiation, r.skipRate]),
  ]);
}

/* ------------------------------------------------------------------ JSON */

export interface CandidateExport {
  format: 'interview-assessment-candidate';
  version: number;
  exportedAt: string;
  candidate: Candidate;
  interviews: (Interview & { computed: ReturnType<typeof computeResult> })[];
}

export function candidateExport(candidate: Candidate, interviews: Interview[]): CandidateExport {
  return {
    format: 'interview-assessment-candidate',
    version: 1,
    exportedAt: new Date().toISOString(),
    candidate,
    interviews: interviews.map((interview) => ({
      ...interview,
      computed: computeResult({
        questions: interview.questions,
        answers: interview.answers,
        scoring: interview.scoring,
      }),
    })),
  };
}

/* --------------------------------------------------------------- Helpers */

export function downloadJson(data: unknown, filename: string): void {
  downloadBlob(JSON.stringify(data, null, 2), filename, 'application/json');
}

export function downloadCsv(content: string, filename: string): void {
  downloadBlob(content, filename, 'text/csv;charset=utf-8');
}

export function reportFilename(candidateName: string, extension: string, suffix = 'assessment'): string {
  return `${slugify(candidateName)}-${suffix}-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export function isBackupFile(value: unknown): value is BackupFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as BackupFile).format === 'interview-assessment-backup' &&
    Array.isArray((value as BackupFile).candidates)
  );
}

export function skillLabel(key: keyof typeof SKILL_LABELS): string {
  return SKILL_LABELS[key];
}
