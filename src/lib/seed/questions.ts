import type { Category, Difficulty, Question, Seniority, Weight } from '@/lib/types';
import { now } from '@/lib/utils';

interface Spec {
  id: string;
  text: string;
  category: Category;
  difficulty: Difficulty;
  seniority: Seniority;
  weight: Weight;
  criteria: string[];
  followUps: string[];
  ideal: string;
}

const q = (s: Spec): Question => ({
  id: s.id,
  text: s.text,
  category: s.category,
  difficulty: s.difficulty,
  seniority: s.seniority,
  evaluationCriteria: s.criteria,
  followUps: s.followUps,
  idealAnswer: s.ideal,
  weight: s.weight,
  active: true,
  createdAt: now(),
  updatedAt: now(),
});

/* ------------------------------------------------------------------
   The 31 questions of the default "UI/UX Designer — 30 Minute"
   interview, in template order.
------------------------------------------------------------------ */

export const CORE_QUESTION_SPECS: Spec[] = [
  // ---------------------------------------------------------- UX Fundamentals
  {
    id: 'q_ux_ui_vs_ux',
    text: 'What is the difference between UI and UX?',
    category: 'UX Fundamentals',
    difficulty: 'easy',
    seniority: 'junior',
    weight: 1,
    criteria: [
      'Separates the experience (goals, flow, research) from the interface (visual surface, controls)',
      'Explains that the two overlap rather than being sequential stages',
      'Uses a concrete product example rather than a dictionary definition',
    ],
    followUps: [
      'Where does the boundary blur in your day-to-day work?',
      'Which of the two do you naturally lean towards, and why?',
    ],
    ideal:
      'UX is the whole journey — the problem being solved, the flow, the information architecture, the moments of friction. UI is the tangible surface that carries it: layout, hierarchy, type, colour, states, motion. A strong answer makes clear they are one product concern viewed at different altitudes and grounds it in a real screen the candidate has shipped.',
  },
  {
    id: 'q_ux_before_redesign',
    text: 'What would you do before redesigning an existing screen?',
    category: 'UX Fundamentals',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Starts by understanding the goal and the metric the screen is meant to move',
      'Looks at existing data: analytics, funnels, support tickets, session recordings',
      'Talks to users or stakeholders before touching the canvas',
      'Audits the current screen instead of assuming it is bad',
    ],
    followUps: [
      'What would make you decide *not* to redesign it?',
      'How do you know afterwards whether the redesign worked?',
    ],
    ideal:
      'Understand why the redesign is being asked for, define the success metric, review quantitative data and qualitative feedback, audit the current design and its constraints, then scope the smallest change that could move the metric. Weak answers jump straight to visual refresh.',
  },
  {
    id: 'q_ux_evaluate_flow',
    text: 'How do you evaluate whether a user flow is good?',
    category: 'UX Fundamentals',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Counts steps, decisions and required inputs against the user goal',
      'Considers error, empty, loading and recovery paths — not just the happy path',
      'Mentions measurable signals: completion rate, drop-off, time on task, error rate',
      'Considers cognitive load and whether each step earns its place',
    ],
    followUps: [
      'Walk me through a flow you simplified.',
      'How do you decide between one long step and several short ones?',
    ],
    ideal:
      'A good flow gets the user to their goal with the fewest meaningful decisions, makes the current state and next action obvious, and handles failure gracefully. The candidate should name both heuristic evaluation and behavioural measurement.',
  },
  {
    id: 'q_res_research_vs_usability',
    text: 'What is the difference between user research and usability testing?',
    category: 'User Research',
    difficulty: 'easy',
    seniority: 'junior',
    weight: 1,
    criteria: [
      'Research explores problems and needs; usability testing evaluates a specific solution',
      'Knows research happens earlier and is generative, testing is evaluative',
      'Can name at least one method for each',
    ],
    followUps: [
      'How many participants would you test with, and why?',
      'What is the last thing you learned from a usability test that surprised you?',
    ],
    ideal:
      'Research answers "what problem should we solve and for whom" through interviews, diary studies, field work and surveys. Usability testing answers "can people actually use what we built" by watching them attempt tasks on a prototype or live product. Both are needed at different points.',
  },
  {
    id: 'q_res_checkout_dropoff',
    text: 'A checkout flow has a 60% drop-off. What would you investigate?',
    category: 'User Research',
    difficulty: 'hard',
    seniority: 'senior',
    weight: 3,
    criteria: [
      'Asks where in the funnel the drop happens before hypothesising',
      'Separates technical causes (errors, latency, payment failures) from design causes',
      'Considers trust, unexpected costs, forced account creation, form friction',
      'Segments by device, geography, new vs returning users',
      'Proposes a way to validate the hypothesis rather than guessing',
    ],
    followUps: [
      'Which single change would you test first, and what would you expect to happen?',
      'How would you tell a UX problem apart from a pricing problem?',
    ],
    ideal:
      'Instrument the funnel step by step, find the exact step that leaks, then segment. Check for hard failures first (payment errors, validation traps, slow pages), then classic checkout killers: surprise shipping cost, mandatory sign-up, too many fields, no guest checkout, unclear security. Confirm with session recordings and a short usability test, then run a targeted experiment.',
  },

  // ------------------------------------------------------ UI & Visual Design
  {
    id: 'q_ui_good_ui',
    text: 'What makes a user interface visually good?',
    category: 'UI Design',
    difficulty: 'easy',
    seniority: 'junior',
    weight: 1,
    criteria: [
      'Names hierarchy, alignment, consistent spacing, restraint and contrast',
      'Connects aesthetics to comprehension rather than taste',
      'Mentions legibility and accessible contrast',
    ],
    followUps: ['Show me an interface you think is beautiful and tell me why.'],
    ideal:
      'Clear hierarchy, a consistent spacing and type scale, disciplined use of colour, generous alignment, and restraint. Good UI is not decoration — it makes the important thing obvious first and everything else findable.',
  },
  {
    id: 'q_type_font_sizes',
    text: 'Why should we avoid using too many font sizes in a product?',
    category: 'Typography',
    difficulty: 'easy',
    seniority: 'junior',
    weight: 1,
    criteria: [
      'Understands that a type scale creates predictable hierarchy',
      'Mentions maintenance, consistency and handoff cost',
      'Knows weight, colour and spacing can carry hierarchy instead of new sizes',
    ],
    followUps: ['How many sizes would you define for a typical web product?'],
    ideal:
      'Every additional size dilutes hierarchy and adds a decision for every future screen. A small scale (roughly 5–7 steps) plus weight and colour variation covers almost everything and keeps design and code in sync.',
  },
  {
    id: 'q_ui_fifteen_buttons',
    text: 'A page in the product has 15 different button styles. What would you do?',
    category: 'UI Design',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Audits first — inventories the variants and what each is trying to say',
      'Reduces to a semantic set: primary, secondary, tertiary, destructive',
      'Thinks about migration, not just the ideal end state',
      'Considers one primary action per view',
    ],
    followUps: [
      'How would you roll this out without blocking the roadmap?',
      'How do you stop it happening again?',
    ],
    ideal:
      'Inventory every instance, group by intent, collapse to a small semantic set with defined sizes and states, build it as a component with variants, then migrate incrementally and document the rule. The point is fewer decisions, not fewer pixels.',
  },
  {
    id: 'q_vis_hierarchy',
    text: 'Explain visual hierarchy and how you create it.',
    category: 'Visual Design',
    difficulty: 'easy',
    seniority: 'junior',
    weight: 1,
    criteria: [
      'Names the levers: size, weight, colour, contrast, spacing, position, grouping',
      'Starts from what the user needs to see first',
      'Understands whitespace as a hierarchy tool',
    ],
    followUps: ['How would you fix a screen where everything shouts equally?'],
    ideal:
      'Decide the order in which things should be read, then use the cheapest lever that achieves it — usually spacing and grouping before size and colour. Hierarchy is a ranking exercise, not a styling one.',
  },
  {
    id: 'q_resp_approach',
    text: 'How do you approach responsive design?',
    category: 'Responsive Design',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Thinks in content and constraints rather than fixed device sizes',
      'Mentions breakpoints driven by the content breaking, not by phone models',
      'Knows how layout intent changes (reflow, priority, disclosure) across sizes',
      'Mentions touch targets and thumb reach on mobile',
    ],
    followUps: [
      'How do you handle a dense data table on mobile?',
      'Do you design mobile-first? Why or why not?',
    ],
    ideal:
      'Define the content priority once, then let layout adapt: fluid grids, min/max constraints, breakpoints set where the layout actually breaks. Reprioritise rather than shrink, and account for touch, reach and performance on small screens.',
  },

  // ------------------------------------------------------------------ Figma
  {
    id: 'q_figma_comfort',
    text: 'How comfortable are you with Figma? Walk me through how you use it day to day.',
    category: 'Figma',
    difficulty: 'easy',
    seniority: 'junior',
    weight: 1,
    criteria: [
      'Describes an actual workflow, not a feature list',
      'Mentions file organisation, pages, naming and shared libraries',
      'Comfortable with prototyping and dev handoff',
    ],
    followUps: ['What is the largest file you have owned?'],
    ideal:
      'A confident answer describes structure: how files and pages are organised, where components live, how work moves from exploration to ready-for-dev, and how they collaborate in the file.',
  },
  {
    id: 'q_figma_core_concepts',
    text: 'Explain Auto Layout, Constraints, Components, Variants and Variables.',
    category: 'Figma',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Auto Layout: flex-like stacking with padding, gap and resizing behaviour',
      'Constraints: how a layer anchors when its frame resizes',
      'Components: single source of truth with instances and overrides',
      'Variants: grouped states/properties of one component',
      'Variables: named, mode-aware values for colour, number, string and boolean',
      'Explains when to reach for each rather than reciting definitions',
    ],
    followUps: ['Where do Constraints still matter once you use Auto Layout?'],
    ideal:
      'Five correct definitions plus the relationships between them: Auto Layout drives resizing, Constraints handle absolute positioning inside a frame, Components hold reusable structure, Variants collapse related components into properties, and Variables hold the tokens the whole system reads from — including theme modes.',
  },
  {
    id: 'q_figma_when_autolayout',
    text: 'When would you use Auto Layout, and when would you not?',
    category: 'Auto Layout',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Uses it for anything list-like, content-driven or resizable',
      'Understands hug vs fill vs fixed sizing',
      'Can name cases where absolute positioning is simply faster',
      'Connects Auto Layout to how the front end will actually build it',
    ],
    followUps: ['How do you handle a badge that overlaps an avatar?'],
    ideal:
      'Almost always for real UI — it keeps spacing honest and mirrors flexbox. Skip it for free-form illustration, overlapping decorative elements or quick exploration; use absolute position inside an Auto Layout frame for overlays like badges.',
  },
  {
    id: 'q_figma_button_component',
    text: 'How would you build a reusable button component in Figma?',
    category: 'Components',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Auto Layout with padding and hug sizing so the label drives width',
      'Variants for hierarchy, size, state and icon slots',
      'Boolean/instance-swap properties for icons, text property for the label',
      'Colour and radius wired to variables/styles rather than hard-coded',
      'Considers focus and disabled states, not just hover',
    ],
    followUps: [
      'How would you support a loading state?',
      'How do you keep the component from exploding into 60 variants?',
    ],
    ideal:
      'One component with Auto Layout, hug sizing, token-driven fills, and component properties for label, icons and state. Variants cover hierarchy × size × state; everything else becomes a property so the matrix stays manageable.',
  },
  {
    id: 'q_figma_variables',
    text: 'What are Figma Variables and what would you use them for?',
    category: 'Variables',
    difficulty: 'medium',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Knows the four types: colour, number, string, boolean',
      'Understands modes — light/dark, density, brand, locale',
      'Connects variables to design tokens and to code',
      'Mentions aliasing/semantic layers over raw values',
    ],
    followUps: ['How would you structure tokens for light and dark mode?'],
    ideal:
      'Named values with modes, so one component reads `surface/default` and renders correctly in every theme. The mature answer separates primitive values from semantic aliases and treats variables as the design half of a shared token pipeline.',
  },
  {
    id: 'q_figma_cleanup',
    text: 'You inherit a 200-screen Figma file with no structure and inconsistent styles. How do you clean it up?',
    category: 'Figma',
    difficulty: 'hard',
    seniority: 'senior',
    weight: 3,
    criteria: [
      'Audits and inventories before deleting anything',
      'Establishes tokens/styles first, then components, then screens',
      'Works incrementally and keeps the team unblocked',
      'Archives rather than destroys; communicates the change',
      'Puts naming, page structure and library rules in place to prevent regression',
    ],
    followUps: [
      'How do you get buy-in for the time this takes?',
      'What do you do about screens that are already in development?',
    ],
    ideal:
      'Audit and inventory, agree what "current" means, extract colour/type/spacing into styles and variables, build the twenty components that cover 80% of the screens, then migrate page by page with an archive page for the old work. Finish with naming conventions and a published library so drift does not return.',
  },

  // --------------------------------------------------------- Design Systems
  {
    id: 'q_ds_what_is',
    text: 'What is a design system?',
    category: 'Design Systems',
    difficulty: 'easy',
    seniority: 'junior',
    weight: 1,
    criteria: [
      'More than a UI kit: principles, tokens, components, patterns, documentation, governance',
      'Understands it is a shared product between design and engineering',
      'Mentions adoption and maintenance',
    ],
    followUps: ['Who owns a design system?'],
    ideal:
      'A living, versioned set of decisions — tokens, components, patterns, content and accessibility guidance — plus the documentation and process that keeps design and code in agreement. It is a product with users (the team) and a maintenance cost.',
  },
  {
    id: 'q_ds_library_vs_system',
    text: 'What is the difference between a component library and a design system?',
    category: 'Design Systems',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Library = the components; system = components + rules + rationale + process',
      'Mentions usage guidance, contribution model and versioning',
      'Understands a library without governance decays',
    ],
    followUps: ['Which one would you build first at a 10-person startup?'],
    ideal:
      'The library is the artefact — the buttons and inputs in Figma and code. The system adds the why and the how: principles, tokens, usage rules, accessibility requirements, contribution and release process.',
  },
  {
    id: 'q_ds_dev_pushback',
    text: 'A developer tells you the design system component does not support your design. What do you do?',
    category: 'Design Systems',
    difficulty: 'hard',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Asks whether the new design is genuinely necessary before pushing',
      'Distinguishes a one-off from a genuine gap in the system',
      'Proposes extending the component or contributing back rather than forking',
      'Weighs delivery timeline against system integrity',
    ],
    followUps: ['When is a one-off exception acceptable?'],
    ideal:
      'First check whether the existing component solves the user problem. If it does, use it. If there is a real gap, decide with the developer whether to extend the component (and contribute it back) or ship a documented exception with a follow-up. The wrong answers are "just build it my way" and "fine, I will change my design" without reasoning.',
  },

  // -------------------------------------------------------- Product Thinking
  {
    id: 'q_pt_conversion_button',
    text: 'A PM asks you to "make the button bigger to improve conversion". What questions do you ask?',
    category: 'Product Thinking',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Asks what problem the request is trying to solve and what data prompted it',
      'Separates the symptom from the diagnosis',
      'Proposes measuring rather than debating opinions',
      'Stays collaborative rather than defensive',
    ],
    followUps: ['What if the data does not exist?'],
    ideal:
      'What conversion number are we trying to move, where are users dropping, is the button being seen at all, is the problem visibility, clarity, trust or motivation? Treat the request as a hypothesis, look for evidence, and propose a test — often the real fix is copy, placement or the surrounding context, not size.',
  },
  {
    id: 'q_pt_disagree_pm',
    text: 'Would you ever disagree with a PM? How do you handle it?',
    category: 'Product Thinking',
    difficulty: 'medium',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Yes, but with evidence and a shared goal rather than taste',
      'Knows how to disagree and commit',
      'Can describe a real example and its outcome',
    ],
    followUps: ['Tell me about a time you were wrong.'],
    ideal:
      'Disagreement is expected; the mechanism matters. Reframe around the user problem and the metric, bring data or a cheap test, propose an alternative rather than only objecting, and commit once the decision is made.',
  },

  // ----------------------------------------------------------- Collaboration
  {
    id: 'q_collab_too_expensive',
    text: 'A developer says your design is too expensive to build. What do you do?',
    category: 'Collaboration',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Asks which part is expensive and why, rather than accepting or arguing',
      'Separates the user outcome from the specific implementation',
      'Offers to trade detail for delivery — phased approach, simpler interaction',
      'Involves the developer early next time',
    ],
    followUps: ['How early do you normally involve engineering?'],
    ideal:
      'Find out what exactly is costly, restate the user outcome that part protects, then explore cheaper ways to achieve the same outcome or phase it. Good designers treat feasibility as a design constraint they own, not an obstacle imposed on them.',
  },
  {
    id: 'q_handoff_process',
    text: 'How do you hand designs over to engineering?',
    category: 'Developer Handoff',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Handoff is a conversation, not a file drop',
      'Specifies states, edge cases, responsive behaviour and content rules',
      'Uses tokens/components so spacing and colour are not eyeballed',
      'Stays available during build and reviews the implementation',
    ],
    followUps: ['What do you document, and what do you deliberately leave out?'],
    ideal:
      'Walk the team through the flow, document states and edge cases, reference the design system rather than redlining every pixel, agree what is negotiable, then review the build in a real browser or device before it ships.',
  },

  // ------------------------------------------------- Real-World UX Scenario
  {
    id: 'q_bank_redesign_flow',
    text: 'A banking app has a 7-screen money transfer flow. How would you redesign it?',
    category: 'Problem Solving',
    difficulty: 'hard',
    seniority: 'senior',
    weight: 3,
    criteria: [
      'Asks what each screen currently does before removing anything',
      'Distinguishes regulatory/security steps from avoidable friction',
      'Groups related inputs and considers progressive disclosure',
      'Designs for repeat transfers, not only first-time ones',
      'Names how success would be measured',
    ],
    followUps: [
      'Which screens would you merge first?',
      'How would you treat a first-time recipient differently from a saved one?',
    ],
    ideal:
      'Audit what each screen is for, keep the legally and security-required steps, merge the rest into recipient → amount → review → result. Save recipients, remember common amounts, and make the review step carry the weight rather than spreading confirmation across five screens.',
  },
  {
    id: 'q_bank_information',
    text: 'In that transfer flow, what information should the user provide, and when?',
    category: 'UX Fundamentals',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Recipient, amount, source account, reference/purpose, schedule',
      'Asks for the minimum at each step and defers the optional',
      'Considers validation timing and useful defaults',
      'Thinks about saved recipients and recent transfers',
    ],
    followUps: ['Which fields would you pre-fill, and what are the risks?'],
    ideal:
      'Recipient first (from saved list or new details), then amount and source account with balance visible, then optional reference and scheduling. Validate inline as they type, default sensibly, and never ask twice for something the bank already knows.',
  },
  {
    id: 'q_bank_wrong_person',
    text: 'How would you prevent a user transferring money to the wrong person?',
    category: 'Problem Solving',
    difficulty: 'hard',
    seniority: 'senior',
    weight: 3,
    criteria: [
      'Confirmation of payee / name matching against the account',
      'Clear review step showing recipient, masked account and amount',
      'Friction proportional to risk: first-time recipient and large amounts',
      'Undo or delay window where possible',
      'Warns about known scam patterns without crying wolf',
    ],
    followUps: ['How do you avoid making the flow feel distrustful for regular transfers?'],
    ideal:
      'Verify the payee name against the account and surface a mismatch prominently, show an unambiguous review screen, add extra confirmation only for new recipients or unusually large amounts, and offer a short cancellation window. Risk-based friction beats blanket friction.',
  },
  {
    id: 'q_bank_failure',
    text: 'What should happen if the transaction fails?',
    category: 'UX Fundamentals',
    difficulty: 'hard',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Says clearly whether money left the account',
      'Explains the reason in plain language and gives a next action',
      'Preserves the entered data so the user can retry',
      'Handles the ambiguous "unknown state" case and timeouts',
      'Provides a reference number and route to support',
    ],
    followUps: ['What about a failure where you genuinely do not know the outcome yet?'],
    ideal:
      'The single most important message is the state of the money. Then: why it failed, what to do next, retry without re-entering everything, a reference to quote, and honest handling of pending states rather than a false "failed".',
  },
  {
    id: 'q_bank_success',
    text: 'How would you communicate a successful transfer?',
    category: 'UI Design',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Immediate, unambiguous confirmation with the key facts repeated back',
      'Sets expectations for when the money actually arrives',
      'Offers the natural next actions: receipt, share, repeat, done',
      'Considers out-of-app confirmation such as notification or email',
      'Accessible confirmation — not colour or animation alone',
    ],
    followUps: ['Would you use a full screen or an inline confirmation? Why?'],
    ideal:
      'Confirm with amount, recipient and expected arrival time, give a reference, offer receipt and "send again", and return the user cleanly to their balance. Reassurance about *when* it lands matters as much as the tick.',
  },

  // ------------------------------------------------ Portfolio & Communication
  {
    id: 'q_port_changed_decision',
    text: 'Tell me about a design decision you changed after feedback.',
    category: 'Portfolio',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Gives a specific, recent example with context',
      'Explains what the feedback was and why it was persuasive',
      'Shows the change and its outcome',
      'Demonstrates ego-free ownership rather than blame',
    ],
    followUps: ['What signal tells you feedback is worth acting on?'],
    ideal:
      'A concrete story: original rationale, the feedback or evidence that challenged it, what changed, and what happened afterwards. Look for genuine reflection rather than a rehearsed "I always listen to feedback".',
  },
  {
    id: 'q_lead_stakeholder_disagreement',
    text: 'Tell me about a design disagreement with a stakeholder and how it ended.',
    category: 'Leadership',
    difficulty: 'medium',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Describes the stakeholder position fairly',
      'Used evidence, prototypes or tests rather than authority',
      'Reached a decision and moved forward, whatever the outcome',
      'Maintained the relationship',
    ],
    followUps: ['What would you do differently now?'],
    ideal:
      'A real disagreement, handled by reframing around shared goals and bringing evidence. Strong candidates describe outcomes where they were overruled too, and what they learned from it.',
  },
  {
    id: 'q_port_biggest_mistake',
    text: 'What is the biggest UX mistake you have made, and what did you learn?',
    category: 'Portfolio',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 1,
    criteria: [
      'Names a genuine mistake with real consequences',
      'Takes ownership rather than blaming the team or the timeline',
      'Articulates a concrete behaviour change since',
    ],
    followUps: ['How would you catch that earlier today?'],
    ideal:
      'Honest self-assessment: what went wrong, the impact, and a specific practice adopted afterwards. Deflection ("I work too hard") or a mistake with no consequence scores low.',
  },
];

/* ------------------------------------------------------------------
   Additional bank questions — not in the default template, but
   available when building your own.
------------------------------------------------------------------ */

export const EXTRA_QUESTION_SPECS: Spec[] = [
  {
    id: 'q_a11y_basics',
    text: 'What accessibility requirements do you check before calling a screen done?',
    category: 'Accessibility',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Colour contrast against WCAG AA at minimum',
      'Keyboard reachability and a visible focus state',
      'Labels, headings and alt text for assistive technology',
      'Never conveying meaning by colour alone',
      'Target size and motion sensitivity',
    ],
    followUps: ['How do you test it?', 'What do you do when the brand colour fails contrast?'],
    ideal:
      'Contrast, keyboard path, focus visibility, semantic labelling, non-colour redundancy, target size and reduced-motion handling — with an actual check (contrast tool, tab through, screen reader pass), not just intent.',
  },
  {
    id: 'q_a11y_contrast',
    text: 'A brand colour fails contrast on white. What are your options?',
    category: 'Accessibility',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Knows AA thresholds (4.5:1 body, 3:1 large text and UI)',
      'Offers a darker product tint alongside the marketing brand colour',
      'Considers using the colour as a background rather than text',
      'Escalates with evidence rather than silently shipping a failure',
    ],
    followUps: ['Who do you need to convince?'],
    ideal:
      'Keep the brand colour for large surfaces and introduce an accessible tint for text and controls, documented as a semantic token. Bring measurements to the brand conversation instead of arguing aesthetics.',
  },
  {
    id: 'q_a11y_forms',
    text: 'How would you make a complex form accessible?',
    category: 'Accessibility',
    difficulty: 'hard',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Persistent visible labels, not placeholder-only',
      'Errors announced, associated with the field, and described in text',
      'Logical tab order and grouped fieldsets',
      'Clear required/optional marking and inline validation timing',
    ],
    followUps: ['How do you handle a multi-step form?'],
    ideal:
      'Real labels, programmatic error association, a summary of errors at the top with links, sensible grouping, keyboard-first interaction and no reliance on colour to indicate an error.',
  },
  {
    id: 'q_analytics_metrics',
    text: 'Which metrics would you track for a feature you designed?',
    category: 'Analytics',
    difficulty: 'medium',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Picks metrics tied to the user goal, not vanity numbers',
      'Names a counter-metric or guardrail',
      'Knows the difference between adoption, engagement and success',
      'Plans instrumentation before launch',
    ],
    followUps: ['What would make you roll the feature back?'],
    ideal:
      'One primary success metric tied to the user outcome, supporting funnel metrics, and a guardrail that catches harm (support tickets, error rate, churn). Defined and instrumented before release.',
  },
  {
    id: 'q_analytics_qual_quant',
    text: 'How do you combine qualitative and quantitative evidence?',
    category: 'Analytics',
    difficulty: 'medium',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Quant shows what and how much; qual shows why',
      'Uses one to generate hypotheses and the other to size them',
      'Knows the limits of small-sample research and of A/B tests',
    ],
    followUps: ['What do you do when the two disagree?'],
    ideal:
      'Numbers locate the problem, conversations explain it. When they conflict, look for a segmentation or instrumentation issue before assuming either source is wrong.',
  },
  {
    id: 'q_res_interview_bias',
    text: 'How do you avoid leading participants during user interviews?',
    category: 'User Research',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Open questions about past behaviour rather than hypothetical preference',
      'Comfortable with silence, avoids confirming answers',
      'Separates observation from interpretation in notes',
    ],
    followUps: ['Give me an example of a leading question and a better version of it.'],
    ideal:
      'Ask what they did last time rather than what they would do, avoid offering the answer inside the question, let pauses run, and record behaviour before conclusions.',
  },
  {
    id: 'q_res_no_budget',
    text: 'You have no research budget and two days. What do you do?',
    category: 'User Research',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Uses existing evidence: support tickets, sales calls, analytics, reviews',
      'Runs a guerrilla or internal-proxy test rather than nothing',
      'Is explicit about the confidence level of the findings',
    ],
    followUps: ['How do you communicate the caveats?'],
    ideal:
      'Mine what already exists, then run five quick sessions with anyone close to the target user, and report findings with honest confidence caveats. Some evidence beats an opinion.',
  },
  {
    id: 'q_vis_grid',
    text: 'How do you use a grid and spacing system?',
    category: 'Visual Design',
    difficulty: 'easy',
    seniority: 'junior',
    weight: 1,
    criteria: [
      'Consistent base unit (4 or 8px) and a small spacing scale',
      'Understands columns, gutters and margins across breakpoints',
      'Uses spacing to group rather than to decorate',
    ],
    followUps: ['When do you break the grid?'],
    ideal:
      'A base unit and a limited scale, applied so proximity communicates grouping. The grid is a default to make decisions cheap, not a rule to obey blindly.',
  },
  {
    id: 'q_type_pairing',
    text: 'How do you choose typefaces for a product interface?',
    category: 'Typography',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 1,
    criteria: [
      'Prioritises legibility at small sizes and in dense UI',
      'Checks numerals, weights, language coverage and licensing',
      'Considers performance and fallback stacks',
    ],
    followUps: ['Would you use two typefaces? When?'],
    ideal:
      'Start from legibility and range of weights, verify numerals and language support, check licence and file size, then consider character. A second face only when it earns a clear role.',
  },
  {
    id: 'q_ds_adoption',
    text: 'Teams are not adopting the design system. How do you find out why?',
    category: 'Design Systems',
    difficulty: 'hard',
    seniority: 'lead',
    weight: 3,
    criteria: [
      'Treats adoption as a product problem with users to interview',
      'Looks for missing components, poor docs, hard contribution path or performance issues',
      'Measures adoption rather than assuming it',
      'Fixes causes rather than mandating compliance',
    ],
    followUps: ['What would you measure?'],
    ideal:
      'Talk to the teams, find the friction (gaps, discoverability, docs, contribution cost), instrument component usage, then fix the top blockers and make the system the easiest path.',
  },
  {
    id: 'q_pt_prioritise',
    text: 'How do you decide what to design first when everything is urgent?',
    category: 'Product Thinking',
    difficulty: 'hard',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Anchors on user and business impact, not on who asked loudest',
      'Considers effort, risk and reversibility',
      'Makes the trade-off visible to stakeholders',
    ],
    followUps: ['How do you say no?'],
    ideal:
      'Frame the options by impact and cost, surface what will be delayed, and get an explicit decision rather than quietly absorbing all of it.',
  },
  {
    id: 'q_lead_mentoring',
    text: 'How do you give design feedback to a more junior designer?',
    category: 'Leadership',
    difficulty: 'medium',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Feedback aimed at the goal and the user, not personal taste',
      'Asks about intent before critiquing',
      'Specific and actionable, with reasoning attached',
      'Leaves the designer owning the work',
    ],
    followUps: ['How does that change in a group critique?'],
    ideal:
      'Ask what problem they were solving, respond to that, be specific about what and why, separate must-fix from preference, and let them make the call.',
  },
  {
    id: 'q_ps_ambiguity',
    text: 'You are given a vague brief with no requirements. What do you do?',
    category: 'Problem Solving',
    difficulty: 'medium',
    seniority: 'mid',
    weight: 2,
    criteria: [
      'Writes down assumptions and gets them confirmed',
      'Defines the user, the job and the success measure first',
      'Uses cheap artefacts (sketch, flow, prototype) to force clarity',
    ],
    followUps: ['What if nobody will give you an answer?'],
    ideal:
      'Turn ambiguity into a written set of assumptions and a proposed success measure, then use a rough artefact to provoke the feedback that resolves it.',
  },
  {
    id: 'q_resp_data_table',
    text: 'How would you design a dense data table for mobile?',
    category: 'Responsive Design',
    difficulty: 'hard',
    seniority: 'senior',
    weight: 2,
    criteria: [
      'Identifies the two or three columns that matter for the primary task',
      'Considers card-per-row, priority columns, horizontal scroll with pinned key column',
      'Keeps sorting/filtering reachable',
      'Does not simply shrink the desktop table',
    ],
    followUps: ['How would you handle bulk actions?'],
    ideal:
      'Decide the task first, promote the columns that serve it into a card or summary row, and put the rest behind expansion or a pinned-column scroll. Filters and sort must stay first-class.',
  },
];

export const ALL_QUESTION_SPECS = [...CORE_QUESTION_SPECS, ...EXTRA_QUESTION_SPECS];

export function seedQuestions(): Question[] {
  return ALL_QUESTION_SPECS.map(q);
}
