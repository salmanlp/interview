import { DEFAULT_SCORING } from '@/lib/scoring';
import type { Template, TemplateQuestion, Weight } from '@/lib/types';
import { now } from '@/lib/utils';
import { CORE_QUESTION_SPECS } from './questions';

export const DEFAULT_TEMPLATE_ID = 'tpl_uiux_30min';

interface SectionSpec {
  id: string;
  title: string;
  questionIds: string[];
  /** Recommended minutes for the whole section. */
  minutes: number;
}

/**
 * "UI/UX Designer — 30 Minute": the 31-question interview, grouped into
 * the eight sections a designer interview naturally falls into.
 */
export const DEFAULT_SECTIONS: SectionSpec[] = [
  {
    id: 'sec_ux_fundamentals',
    title: 'UX Fundamentals',
    minutes: 5,
    questionIds: [
      'q_ux_ui_vs_ux',
      'q_ux_before_redesign',
      'q_ux_evaluate_flow',
      'q_res_research_vs_usability',
      'q_res_checkout_dropoff',
    ],
  },
  {
    id: 'sec_ui_visual',
    title: 'UI & Visual Design',
    minutes: 5,
    questionIds: [
      'q_ui_good_ui',
      'q_type_font_sizes',
      'q_ui_fifteen_buttons',
      'q_vis_hierarchy',
      'q_resp_approach',
    ],
  },
  {
    id: 'sec_figma',
    title: 'Figma',
    minutes: 6,
    questionIds: [
      'q_figma_comfort',
      'q_figma_core_concepts',
      'q_figma_when_autolayout',
      'q_figma_button_component',
      'q_figma_variables',
      'q_figma_cleanup',
    ],
  },
  {
    id: 'sec_design_systems',
    title: 'Design Systems',
    minutes: 3,
    questionIds: ['q_ds_what_is', 'q_ds_library_vs_system', 'q_ds_dev_pushback'],
  },
  {
    id: 'sec_product_thinking',
    title: 'Product Thinking',
    minutes: 2,
    questionIds: ['q_pt_conversion_button', 'q_pt_disagree_pm'],
  },
  {
    id: 'sec_collaboration',
    title: 'Collaboration',
    minutes: 2,
    questionIds: ['q_collab_too_expensive', 'q_handoff_process'],
  },
  {
    id: 'sec_real_world',
    title: 'Real-World UX Scenario',
    minutes: 5,
    questionIds: [
      'q_bank_redesign_flow',
      'q_bank_information',
      'q_bank_wrong_person',
      'q_bank_failure',
      'q_bank_success',
    ],
  },
  {
    id: 'sec_portfolio',
    title: 'Portfolio & Communication',
    minutes: 2,
    questionIds: [
      'q_port_changed_decision',
      'q_lead_stakeholder_disagreement',
      'q_port_biggest_mistake',
    ],
  },
];

const weightOf = (id: string): Weight =>
  (CORE_QUESTION_SPECS.find((s) => s.id === id)?.weight ?? 1) as Weight;

export function seedTemplates(): Template[] {
  const timestamp = now();
  const sections = DEFAULT_SECTIONS.map((section) => {
    const perQuestion = Math.round((section.minutes * 60) / section.questionIds.length);
    return {
      id: section.id,
      title: section.title,
      questions: section.questionIds.map<TemplateQuestion>((questionId) => ({
        questionId,
        weight: weightOf(questionId),
        required: weightOf(questionId) >= 2,
        recommendedSeconds: perQuestion,
      })),
    };
  });

  const total = sections.reduce((acc, s) => acc + s.questions.length, 0);

  return [
    {
      id: DEFAULT_TEMPLATE_ID,
      name: 'UI/UX Designer — 30 Minute',
      description: `The standard structured screen: ${total} questions across eight areas, weighted so practical Figma work and real-world scenarios count for more than definitions.`,
      durationMinutes: 30,
      mode: 'structured',
      sections,
      scoring: DEFAULT_SCORING,
      isDefault: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

export const CHALLENGE_BRIEF = `Create a login form containing:

• Email field
• Password field
• "Forgot password" link
• Login button
• Error state
• Loading state

Build it as you normally would in Figma. Talk me through your decisions as you go — you have roughly 10 minutes.`;
