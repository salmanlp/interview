import { DEFAULT_SCORING, computeResult } from '@/lib/scoring';
import {
  CATEGORY_SKILL,
  DECISION_LABELS,
  RECOMMENDATION_LABELS,
  type AuditEvent,
  type Candidate,
  type CandidateStatus,
  type HiringDecision,
  type Interview,
  type InterviewQuestion,
  type Question,
  type SkillKey,
  type Template,
} from '@/lib/types';
import { clamp, uid } from '@/lib/utils';
import { buildInterviewQuestions } from '@/lib/interview';
import { CHALLENGE_BRIEF } from './template';

/** Deterministic PRNG so the demo data set looks the same on every machine. */
function seeded(seedText: string) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const NOTE_POOL: Record<number, string[]> = {
  1: [
    'Could not answer; moved on quickly.',
    'Confused the terms. No practical grounding.',
    'Guessed. No example to back it up.',
  ],
  2: [
    'Textbook definition only, no application.',
    'Needed several prompts before getting anywhere.',
    'Understands the words but not the trade-off.',
  ],
  3: [
    'Correct and reasonable. Nothing beyond the obvious.',
    'Solid answer, one relevant example.',
    'Right instincts, explanation a little loose.',
  ],
  4: [
    'Clear reasoning, referenced a real project decision.',
    'Strong answer — covered edge cases without prompting.',
    'Explained the trade-off well and picked a side.',
  ],
  5: [
    'Excellent. Walked through a shipped example end to end, including what they got wrong first.',
    'Best answer of the session — named the measurement, not just the change.',
    'Deep, practical, well structured. Would trust this judgement unsupervised.',
  ],
};

interface DemoProfile {
  name: string;
  email: string;
  phone: string;
  position: string;
  yearsExperience: number;
  location: string;
  portfolioUrl: string;
  linkedinUrl: string;
  status: CandidateStatus;
  interviewer: string;
  /** Per-skill target average on the 1–5 scale. */
  skills: Partial<Record<SkillKey, number>>;
  daysAgo: number;
  /** 'complete' fully scored, 'partial' leaves an interview in progress. */
  kind: 'complete' | 'partial' | 'none';
  rounds?: number;
  decision?: HiringDecision;
  summary?: string;
  challenge?: number;
  note?: string;
  /** Required when `decision` disagrees with the calculated recommendation. */
  overrideReason?: string;
}

const PROFILES: DemoProfile[] = [
  {
    name: 'Amara Okafor',
    email: 'amara.okafor@example.com',
    phone: '+44 7700 900142',
    position: 'Senior Product Designer',
    yearsExperience: 8,
    location: 'London, UK',
    portfolioUrl: 'https://amaraokafor.design',
    linkedinUrl: 'https://linkedin.com/in/amaraokafor',
    status: 'strong_hire',
    interviewer: 'Salman Khan',
    skills: {
      ux: 4.8,
      research: 4.4,
      ui: 4.6,
      figma: 5,
      design_systems: 4.9,
      product_thinking: 4.5,
      accessibility: 4.3,
      collaboration: 4.7,
      communication: 4.6,
      problem_solving: 4.7,
    },
    daysAgo: 3,
    kind: 'complete',
    rounds: 2,
    decision: 'strong_hire',
    challenge: 5,
    summary:
      'The strongest candidate in this round by a clear margin. Systems thinking is exceptional — she rebuilt a 200-screen file at her last company and could describe the migration plan, the governance model and the adoption metrics without prompting. Product instincts are genuinely senior: pushed back on the conversion-button question by asking for the funnel data first. Only softer area is quantitative research, where she leans on a researcher. Recommend moving to final.',
    note: 'Available from the 1st of next month. Currently interviewing at two other companies — move quickly.',
  },
  {
    name: 'Daniel Whitfield',
    email: 'dan.whitfield@example.com',
    phone: '+44 7700 900318',
    position: 'Product Designer',
    yearsExperience: 5,
    location: 'Manchester, UK',
    portfolioUrl: 'https://danwhitfield.cc',
    linkedinUrl: 'https://linkedin.com/in/danwhitfield',
    status: 'hire',
    interviewer: 'Salman Khan',
    skills: {
      ux: 4.1,
      research: 3.6,
      ui: 4.2,
      figma: 4.4,
      design_systems: 3.8,
      product_thinking: 4,
      accessibility: 3.4,
      collaboration: 4.3,
      communication: 4.2,
      problem_solving: 3.9,
    },
    daysAgo: 6,
    kind: 'complete',
    decision: 'hire',
    challenge: 4,
    summary:
      'Well-rounded mid-to-senior designer. Craft is good, Figma is fluent, and he works well with engineering — the "too expensive to build" answer was the best of the day. Design systems knowledge is practical rather than deep: he consumes systems well but has not built one. Accessibility is the weakest area; he knows contrast but nothing about focus management. Hire for the product squad, pair him with someone stronger on systems.',
  },
  {
    name: 'Priya Raghunathan',
    email: 'priya.r@example.com',
    phone: '+91 98200 41128',
    position: 'Senior UI Designer',
    yearsExperience: 7,
    location: 'Bengaluru, India (remote)',
    portfolioUrl: 'https://priyar.studio',
    linkedinUrl: 'https://linkedin.com/in/priyaraghunathan',
    status: 'under_review',
    interviewer: 'Salman Khan',
    skills: {
      ux: 3.4,
      research: 2.8,
      ui: 4.8,
      figma: 4.9,
      design_systems: 4.5,
      product_thinking: 3.2,
      accessibility: 3.8,
      collaboration: 3.9,
      communication: 3.7,
      problem_solving: 3.3,
    },
    daysAgo: 9,
    kind: 'complete',
    decision: 'hire',
    challenge: 5,
    summary:
      'Exceptional visual and Figma craft — the login challenge was production-ready in eight minutes, with variants, tokens and a focus state she added unprompted. Typography and hierarchy answers were the best in the set. Product and research thinking are noticeably lighter: on the checkout drop-off she went to visual polish before asking where in the funnel the loss was. Strong hire for a UI-heavy or design-systems role; not the right fit if the role owns discovery.',
    note: 'Would need visa sponsorship if relocating. Happy to stay remote.',
  },
  {
    name: 'Marco Bianchi',
    email: 'marco.bianchi@example.com',
    phone: '+39 340 118 2277',
    position: 'UX Designer',
    yearsExperience: 4,
    location: 'Milan, Italy',
    portfolioUrl: 'https://bianchi.work',
    linkedinUrl: 'https://linkedin.com/in/marcobianchi',
    status: 'hold',
    interviewer: 'Salman Khan',
    skills: {
      ux: 3.4,
      research: 3.6,
      ui: 2.9,
      figma: 2.8,
      design_systems: 2.6,
      product_thinking: 3.3,
      accessibility: 3,
      collaboration: 3.4,
      communication: 3.5,
      problem_solving: 3.2,
    },
    daysAgo: 12,
    kind: 'complete',
    decision: 'hold',
    overrideReason:
      'The calculated score lands in No Hire territory, but it is dragged down by the Figma and design-systems sections rather than by his thinking. Holding rather than rejecting so we can reconsider him for a research-leaning role.',
    summary:
      'Thoughtful about users and comfortable talking through flows, but the execution side is behind where we need it. Figma answers were shallow — he could describe Auto Layout but not why it matters for handoff, and had not used variables. Visual craft in the portfolio is inconsistent. Hold: worth revisiting for a research-leaning role, or in six months if he invests in craft.',
  },
  {
    name: 'Elena Sokolova',
    email: 'elena.sokolova@example.com',
    phone: '+31 6 2233 8890',
    position: 'Junior UI/UX Designer',
    yearsExperience: 1,
    location: 'Amsterdam, Netherlands',
    portfolioUrl: 'https://elenasokolova.me',
    linkedinUrl: 'https://linkedin.com/in/elenasokolova',
    status: 'no_hire',
    interviewer: 'Salman Khan',
    skills: {
      ux: 2.6,
      research: 2.2,
      ui: 3.1,
      figma: 3,
      design_systems: 2,
      product_thinking: 2.1,
      accessibility: 2,
      collaboration: 2.8,
      communication: 3.2,
      problem_solving: 2.3,
    },
    daysAgo: 15,
    kind: 'complete',
    decision: 'no_hire',
    summary:
      'Enthusiastic and communicates clearly, but a year of bootcamp-plus-freelance work is not enough for this role. Definitions were memorised rather than understood: the design system answer was "a component library in Figma" and did not improve when probed. Struggled with every scenario question. Not a hire for this level — encouraged her to reapply after a couple of years in a team with senior designers.',
  },
  {
    name: 'Tomas Lindgren',
    email: 'tomas.lindgren@example.com',
    phone: '+46 70 555 9021',
    position: 'Lead Product Designer',
    yearsExperience: 11,
    location: 'Stockholm, Sweden',
    portfolioUrl: 'https://lindgren.design',
    linkedinUrl: 'https://linkedin.com/in/tomaslindgren',
    status: 'in_progress',
    interviewer: 'Salman Khan',
    skills: {
      ux: 4.5,
      research: 4.2,
      ui: 4.1,
      figma: 4.3,
      design_systems: 4.6,
      product_thinking: 4.6,
      accessibility: 4,
      collaboration: 4.4,
      communication: 4.5,
      problem_solving: 4.4,
    },
    daysAgo: 0,
    kind: 'partial',
  },
  {
    name: 'Yuki Tanaka',
    email: 'yuki.tanaka@example.com',
    phone: '+81 90 1234 5678',
    position: 'Product Designer',
    yearsExperience: 6,
    location: 'Tokyo, Japan',
    portfolioUrl: 'https://yukitanaka.design',
    linkedinUrl: 'https://linkedin.com/in/yukitanaka',
    status: 'scheduled',
    interviewer: 'Salman Khan',
    skills: {},
    daysAgo: -2,
    kind: 'none',
    note: 'Referred by Amara. Portfolio is strong on fintech. Interview booked for Thursday 14:00.',
  },
];

function daysAgoIso(days: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function scoreFor(
  rng: () => number,
  question: InterviewQuestion,
  skills: Partial<Record<SkillKey, number>>,
  scaleMax: number,
): number {
  const skill = CATEGORY_SKILL[question.category];
  const target = skills[skill] ?? 3;
  // Harder questions pull the score down slightly, easy questions lift it.
  const difficultyBias = question.difficulty === 'hard' ? -0.35 : question.difficulty === 'easy' ? 0.25 : 0;
  const jitter = (rng() - 0.5) * 1.2;
  return clamp(Math.round(target + difficultyBias + jitter), 1, scaleMax);
}

export interface DemoData {
  candidates: Candidate[];
  interviews: Interview[];
  audit: AuditEvent[];
}

export function buildDemoData(questions: Question[], template: Template): DemoData {
  const candidates: Candidate[] = [];
  const interviews: Interview[] = [];
  const audit: AuditEvent[] = [];
  const scoring = template.scoring ?? DEFAULT_SCORING;

  for (const profile of PROFILES) {
    const rng = seeded(profile.name);
    const candidateId = `cand_demo_${profile.name.toLowerCase().replace(/[^a-z]/g, '')}`;
    const createdAt = daysAgoIso(profile.daysAgo + 5, 9, 15);

    const candidate: Candidate = {
      id: candidateId,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      position: profile.position,
      yearsExperience: profile.yearsExperience,
      portfolioUrl: profile.portfolioUrl,
      linkedinUrl: profile.linkedinUrl,
      resume: `${profile.name.split(' ')[0].toLowerCase()}-cv.pdf`,
      location: profile.location,
      interviewer: profile.interviewer,
      status: profile.status,
      archived: false,
      notes: profile.note
        ? [
            {
              id: uid('note'),
              body: profile.note,
              author: profile.interviewer,
              createdAt: daysAgoIso(profile.daysAgo, 16, 30),
            },
          ]
        : [],
      documents: [
        {
          id: uid('doc'),
          name: `${profile.name} — CV.pdf`,
          kind: 'resume',
          reference: 'Stored in the ATS. Reference only — no file is uploaded by this app.',
          createdAt,
        },
        {
          id: uid('doc'),
          name: 'Portfolio',
          kind: 'portfolio',
          url: profile.portfolioUrl,
          createdAt,
        },
      ],
      createdAt,
      updatedAt: daysAgoIso(profile.daysAgo, 12, 0),
    };
    candidates.push(candidate);
    audit.push({
      id: uid('aud'),
      candidateId,
      interviewId: null,
      type: 'candidate_created',
      message: `${profile.name} added as a candidate for ${profile.position}.`,
      actor: profile.interviewer,
      at: createdAt,
    });

    if (profile.kind === 'none') continue;

    const rounds = profile.rounds ?? 1;
    for (let round = 1; round <= rounds; round++) {
      const isFinalRound = round === rounds;
      const interviewQuestions = buildInterviewQuestions(template, questions);
      const startedAt = daysAgoIso(profile.daysAgo + (rounds - round) * 4, 11, 0);
      const interviewId = `int_demo_${candidateId.slice(10)}_${round}`;
      const partial = profile.kind === 'partial';
      const answeredCount = partial ? 18 : interviewQuestions.length;

      const answers: Interview['answers'] = {};
      let skipped = 0;
      for (let i = 0; i < interviewQuestions.length; i++) {
        const question = interviewQuestions[i];
        if (i >= answeredCount) {
          answers[question.questionId] = {
            questionId: question.questionId,
            score: null,
            notes: '',
            flagged: false,
            skipped: false,
            timeSpentMs: 0,
            updatedAt: startedAt,
          };
          continue;
        }
        const shouldSkip = !partial && skipped < 2 && rng() < 0.05 && question.weight === 1;
        if (shouldSkip) skipped += 1;
        const score = shouldSkip ? null : scoreFor(rng, question, profile.skills, scoring.scaleMax);
        const notePool = score ? NOTE_POOL[score] : null;
        answers[question.questionId] = {
          questionId: question.questionId,
          score,
          notes: shouldSkip
            ? 'Skipped — ran short on time.'
            : notePool && rng() < 0.72
              ? notePool[Math.floor(rng() * notePool.length)]
              : '',
          flagged: !shouldSkip && rng() < 0.07,
          skipped: shouldSkip,
          timeSpentMs: Math.round(30000 + rng() * 90000),
          updatedAt: startedAt,
        };
      }

      const elapsedMs = partial ? 17 * 60 * 1000 + 42_000 : Math.round((28 + rng() * 6) * 60 * 1000);
      const completedAt = partial
        ? null
        : new Date(new Date(startedAt).getTime() + elapsedMs).toISOString();

      const interview: Interview = {
        id: interviewId,
        candidateId,
        templateId: template.id,
        templateName: template.name,
        position: profile.position,
        interviewer: profile.interviewer,
        round,
        roundLabel: rounds > 1 ? (round === 1 ? 'Round 1 — Screen' : 'Round 2 — UI/UX Deep Dive') : 'Round 1 — UI/UX',
        mode: template.mode,
        durationMinutes: template.durationMinutes,
        status: partial ? 'in_progress' : 'completed',
        startedAt,
        completedAt,
        elapsedMs,
        paused: partial,
        questions: interviewQuestions,
        answers,
        scoring,
        challenge: {
          enabled: Boolean(profile.challenge) && isFinalRound,
          brief: CHALLENGE_BRIEF,
          criteria: {},
          notes: profile.challenge
            ? 'Built the form live in Figma. Used Auto Layout throughout and named layers as they went.'
            : '',
          score: isFinalRound ? (profile.challenge ?? null) : null,
        },
        summary: partial ? '' : isFinalRound ? (profile.summary ?? '') : 'Solid screening round. Moving to the deep-dive.',
        autoRecommendation: null,
        decision: partial ? null : isFinalRound ? (profile.decision ?? null) : null,
        overrideReason: partial || !isFinalRound ? '' : (profile.overrideReason ?? ''),
        editedAfterCompletion: false,
        currentQuestionIndex: partial ? 18 : interviewQuestions.length - 1,
        createdAt: startedAt,
        updatedAt: completedAt ?? startedAt,
      };

      const result = computeResult({
        questions: interview.questions,
        answers: interview.answers,
        scoring,
      });
      interview.autoRecommendation = result.recommendation;
      interviews.push(interview);

      audit.push({
        id: uid('aud'),
        candidateId,
        interviewId,
        type: 'interview_started',
        message: `${interview.roundLabel} started using "${template.name}".`,
        actor: profile.interviewer,
        at: startedAt,
      });
      if (!partial) {
        audit.push({
          id: uid('aud'),
          candidateId,
          interviewId,
          type: 'interview_completed',
          message: `Interview completed — ${result.percentage}% (${result.rawScore}/${result.maxPossible}).`,
          actor: profile.interviewer,
          at: completedAt ?? startedAt,
        });
        if (interview.decision) {
          audit.push({
            id: uid('aud'),
            candidateId,
            interviewId,
            type: 'recommendation_changed',
            message: interview.overrideReason
              ? `Hiring decision set to ${DECISION_LABELS[interview.decision]}, overriding the calculated ${
                  result.recommendation ? RECOMMENDATION_LABELS[result.recommendation] : 'result'
                }. Reason: ${interview.overrideReason}`
              : `Hiring decision set to ${DECISION_LABELS[interview.decision]}.`,
            actor: profile.interviewer,
            at: new Date(new Date(completedAt ?? startedAt).getTime() + 15 * 60_000).toISOString(),
          });
        }
      }
    }
  }

  return { candidates, interviews, audit };
}

export const DEMO_CANDIDATE_IDS = PROFILES.map(
  (p) => `cand_demo_${p.name.toLowerCase().replace(/[^a-z]/g, '')}`,
);
