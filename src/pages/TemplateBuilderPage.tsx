import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { buildScale, DEFAULT_SCORING } from '@/lib/scoring';
import {
  CATEGORIES,
  type Category,
  type InterviewMode,
  type Question,
  type Template,
  type TemplateSection,
  type Weight,
} from '@/lib/types';
import { cx, matches, uid } from '@/lib/utils';
import { Button, IconButton, LinkButton } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input, SearchInput, Select, Switch, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/Misc';
import { Modal } from '@/components/ui/Modal';
import { DifficultyBadge, SeniorityBadge } from '@/components/ui/DomainBadges';
import { useToast } from '@/store/ToastProvider';

const WEIGHTS: Weight[] = [1, 2, 3];

export function TemplateBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { templates, questions, saveTemplate } = useAppStore();

  const stored = templates.find((t) => t.id === id) ?? null;
  const [draft, setDraft] = useState<Template | null>(stored);
  const [dirty, setDirty] = useState(false);
  const [pickerSection, setPickerSection] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (stored && (!draft || draft.id !== stored.id)) setDraft(stored);
  }, [stored, draft]);

  const questionMap = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  if (!draft) {
    return (
      <Card>
        <EmptyState
          icon="layers"
          title="Template not found"
          description="It may have been deleted."
          action={
            <LinkButton to="/templates" variant="primary" icon="arrowLeft">
              Back to templates
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const update = (mutate: (template: Template) => Template) => {
    setDraft((prev) => (prev ? mutate(prev) : prev));
    setDirty(true);
  };

  const totalQuestions = draft.sections.reduce((a, s) => a + s.questions.length, 0);
  const scoring = draft.scoring ?? DEFAULT_SCORING;
  const maxScore = totalQuestions * scoring.scaleMax;
  const weightedMax = draft.sections.reduce(
    (a, s) => a + s.questions.reduce((b, q) => b + q.weight * scoring.scaleMax, 0),
    0,
  );
  const recommendedSeconds = draft.sections.reduce(
    (a, s) => a + s.questions.reduce((b, q) => b + q.recommendedSeconds, 0),
    0,
  );

  const save = async () => {
    setSaving(true);
    try {
      await saveTemplate(draft);
      setDirty(false);
      toast.success('Template saved', `${totalQuestions} questions across ${draft.sections.length} sections.`);
    } finally {
      setSaving(false);
    }
  };

  const moveSection = (index: number, delta: number) => {
    update((template) => {
      const sections = [...template.sections];
      const target = index + delta;
      if (target < 0 || target >= sections.length) return template;
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...template, sections };
    });
  };

  const moveQuestion = (sectionId: string, index: number, delta: number) => {
    update((template) => ({
      ...template,
      sections: template.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const list = [...section.questions];
        const target = index + delta;
        if (target < 0 || target >= list.length) return section;
        [list[index], list[target]] = [list[target], list[index]];
        return { ...section, questions: list };
      }),
    }));
  };

  return (
    <>
      <PageHeader
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-muted">
            <Link to="/templates" className="hover:text-ink">
              Templates
            </Link>
            <Icon name="chevronRight" size={12} />
            <span className="text-ink">{draft.name}</span>
          </nav>
        }
        title="Template builder"
        description="Add, remove, reorder and weight questions. Set the time you expect each question to take."
        actions={
          <>
            {dirty ? (
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" aria-hidden="true" />
                Unsaved changes
              </span>
            ) : null}
            <Button variant="ghost" onClick={() => navigate('/templates')}>
              Close
            </Button>
            <Button variant="primary" icon="save" onClick={save} loading={saving} disabled={!dirty}>
              Save template
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="Details" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Template name" required className="sm:col-span-2">
                {({ id: fieldId }) => (
                  <Input
                    id={fieldId}
                    value={draft.name}
                    onChange={(e) => update((t) => ({ ...t, name: e.target.value }))}
                  />
                )}
              </Field>
              <Field label="Description" className="sm:col-span-2">
                {({ id: fieldId }) => (
                  <Textarea
                    id={fieldId}
                    rows={2}
                    value={draft.description}
                    onChange={(e) => update((t) => ({ ...t, description: e.target.value }))}
                    placeholder="What this template is for and who it suits."
                  />
                )}
              </Field>
              <Field label="Duration (minutes)">
                {({ id: fieldId }) => (
                  <Input
                    id={fieldId}
                    type="number"
                    min={5}
                    max={240}
                    value={draft.durationMinutes}
                    onChange={(e) =>
                      update((t) => ({ ...t, durationMinutes: Math.max(5, Number(e.target.value)) }))
                    }
                  />
                )}
              </Field>
              <Field label="Default mode">
                {({ id: fieldId }) => (
                  <Select
                    id={fieldId}
                    value={draft.mode}
                    onChange={(e) => update((t) => ({ ...t, mode: e.target.value as InterviewMode }))}
                  >
                    <option value="structured">Structured</option>
                    <option value="semi_structured">Semi-structured</option>
                    <option value="custom">Custom</option>
                  </Select>
                )}
              </Field>
              <div className="sm:col-span-2 rounded-lg border border-line bg-surface-2 p-3">
                <Switch
                  checked={draft.isDefault}
                  onChange={(value) => update((t) => ({ ...t, isDefault: value }))}
                  label="Use as the default template"
                  description="Pre-selected when you start a new interview."
                />
              </div>
            </div>
          </Card>

          {draft.sections.map((section, sectionIndex) => (
            <SectionCard
              key={section.id}
              section={section}
              index={sectionIndex}
              total={draft.sections.length}
              questionMap={questionMap}
              onMove={(delta) => moveSection(sectionIndex, delta)}
              onRename={(title) =>
                update((t) => ({
                  ...t,
                  sections: t.sections.map((s) => (s.id === section.id ? { ...s, title } : s)),
                }))
              }
              onRemove={() =>
                update((t) => ({ ...t, sections: t.sections.filter((s) => s.id !== section.id) }))
              }
              onAddQuestions={() => setPickerSection(section.id)}
              onMoveQuestion={(index, delta) => moveQuestion(section.id, index, delta)}
              onRemoveQuestion={(questionId) =>
                update((t) => ({
                  ...t,
                  sections: t.sections.map((s) =>
                    s.id === section.id
                      ? { ...s, questions: s.questions.filter((q) => q.questionId !== questionId) }
                      : s,
                  ),
                }))
              }
              onUpdateQuestion={(questionId, patch) =>
                update((t) => ({
                  ...t,
                  sections: t.sections.map((s) =>
                    s.id === section.id
                      ? {
                          ...s,
                          questions: s.questions.map((q) =>
                            q.questionId === questionId ? { ...q, ...patch } : q,
                          ),
                        }
                      : s,
                  ),
                }))
              }
            />
          ))}

          <Button
            variant="secondary"
            icon="plus"
            full
            onClick={() =>
              update((t) => ({
                ...t,
                sections: [
                  ...t.sections,
                  { id: uid('sec'), title: `Section ${t.sections.length + 1}`, questions: [] },
                ],
              }))
            }
          >
            Add section
          </Button>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader title="Summary" />
            <dl className="space-y-2.5 text-[13px]">
              <Row label="Sections" value={String(draft.sections.length)} />
              <Row label="Questions" value={String(totalQuestions)} />
              <Row label="Maximum raw score" value={String(maxScore)} />
              <Row label="Maximum weighted score" value={String(weightedMax)} />
              <Row
                label="Recommended time"
                value={`${Math.round(recommendedSeconds / 60)} min of ${draft.durationMinutes}`}
              />
            </dl>
            {recommendedSeconds > draft.durationMinutes * 60 ? (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn-soft/50 p-2.5 text-[12px] leading-snug text-ink-2">
                <Icon name="alertTriangle" size={13} className="mt-0.5 shrink-0 text-warn" />
                The recommended times add up to more than the scheduled duration. Trim questions or
                extend the interview.
              </p>
            ) : null}
          </Card>

          <Card>
            <CardHeader
              title="Scoring rules"
              description="Applied to interviews started from this template."
            />
            <Field label="Score scale maximum">
              {({ id: fieldId }) => (
                <Select
                  id={fieldId}
                  value={scoring.scaleMax}
                  onChange={(e) => {
                    const max = Number(e.target.value);
                    update((t) => ({
                      ...t,
                      scoring: {
                        ...scoring,
                        scaleMax: max,
                        scale: buildScale(max, scoring.scale),
                      },
                    }));
                  }}
                >
                  {[3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      1 – {n}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <div className="mt-4 space-y-3">
              <p className="text-[13px] font-medium text-ink-2">Recommendation thresholds</p>
              {(
                [
                  ['strongHire', 'Strong Hire at or above'],
                  ['hire', 'Hire at or above'],
                  ['maybe', 'Further Review at or above'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <label htmlFor={`threshold-${key}`} className="text-[12.5px] text-muted">
                    {label}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      id={`threshold-${key}`}
                      type="number"
                      min={0}
                      max={100}
                      value={scoring.thresholds[key]}
                      onChange={(e) =>
                        update((t) => ({
                          ...t,
                          scoring: {
                            ...scoring,
                            thresholds: { ...scoring.thresholds, [key]: Number(e.target.value) },
                          },
                        }))
                      }
                      className="w-20"
                    />
                    <span className="text-[12.5px] text-muted">%</span>
                  </div>
                </div>
              ))}
              <p className="text-[11.5px] leading-snug text-subtle">
                Anything below {scoring.thresholds.maybe}% is reported as No Hire.
              </p>
            </div>
          </Card>
        </aside>
      </div>

      <QuestionPicker
        open={pickerSection != null}
        onClose={() => setPickerSection(null)}
        questions={questions}
        excluded={new Set(draft.sections.flatMap((s) => s.questions.map((q) => q.questionId)))}
        onAdd={(selected) => {
          update((t) => ({
            ...t,
            sections: t.sections.map((s) =>
              s.id === pickerSection
                ? {
                    ...s,
                    questions: [
                      ...s.questions,
                      ...selected.map((question) => ({
                        questionId: question.id,
                        weight: question.weight,
                        required: question.weight >= 2,
                        recommendedSeconds: 60,
                      })),
                    ],
                  }
                : s,
            ),
          }));
          setPickerSection(null);
          toast.success(`${selected.length} question${selected.length === 1 ? '' : 's'} added`);
        }}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium text-ink tabular">{value}</dd>
    </div>
  );
}

function SectionCard({
  section,
  index,
  total,
  questionMap,
  onMove,
  onRename,
  onRemove,
  onAddQuestions,
  onMoveQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
}: {
  section: TemplateSection;
  index: number;
  total: number;
  questionMap: Map<string, Question>;
  onMove: (delta: number) => void;
  onRename: (title: string) => void;
  onRemove: () => void;
  onAddQuestions: () => void;
  onMoveQuestion: (index: number, delta: number) => void;
  onRemoveQuestion: (questionId: string) => void;
  onUpdateQuestion: (
    questionId: string,
    patch: Partial<{ weight: Weight; required: boolean; recommendedSeconds: number }>,
  ) => void;
}) {
  return (
    <Card padded={false}>
      <div className="flex items-center gap-2 border-b border-line p-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface-2 text-[12px] font-semibold text-muted tabular">
          {index + 1}
        </span>
        <Input
          value={section.title}
          onChange={(e) => onRename(e.target.value)}
          aria-label={`Section ${index + 1} title`}
          className="flex-1 font-medium"
        />
        <span className="shrink-0 text-[12px] text-muted tabular">
          {section.questions.length} {section.questions.length === 1 ? 'question' : 'questions'}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            icon="arrowUp"
            label={`Move ${section.title} up`}
            size="sm"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          />
          <IconButton
            icon="arrowDown"
            label={`Move ${section.title} down`}
            size="sm"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          />
          <IconButton icon="trash" label={`Delete ${section.title}`} size="sm" onClick={onRemove} />
        </div>
      </div>

      {section.questions.length === 0 ? (
        <EmptyState
          icon="helpCircle"
          title="No questions in this section"
          action={
            <Button variant="secondary" size="sm" icon="plus" onClick={onAddQuestions}>
              Add questions
            </Button>
          }
          compact
        />
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {section.questions.map((templateQuestion, questionIndex) => {
            const question = questionMap.get(templateQuestion.questionId);
            return (
              <li key={templateQuestion.questionId} className="flex flex-wrap items-start gap-3 p-3">
                <span className="mt-1 w-5 shrink-0 text-[12px] text-subtle tabular">
                  {questionIndex + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cx('text-[13px] leading-snug', question ? 'text-ink' : 'text-danger')}>
                    {question?.text ?? 'This question no longer exists in the bank.'}
                  </p>
                  {question ? (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11.5px] text-muted">{question.category}</span>
                      <DifficultyBadge difficulty={question.difficulty} />
                      <SeniorityBadge seniority={question.seniority} />
                      {!question.active ? (
                        <span className="rounded border border-warn/40 bg-warn-soft px-1.5 py-0.5 text-[10.5px] font-medium text-warn">
                          Inactive — will be skipped
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
                    Weight
                    <select
                      value={templateQuestion.weight}
                      onChange={(e) =>
                        onUpdateQuestion(templateQuestion.questionId, {
                          weight: Number(e.target.value) as Weight,
                        })
                      }
                      aria-label={`Weight for question ${questionIndex + 1}`}
                      className="h-7 rounded-md border border-line-strong bg-surface px-1.5 text-[12px] text-ink"
                    >
                      {WEIGHTS.map((w) => (
                        <option key={w} value={w}>
                          {w}×
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
                    Time
                    <input
                      type="number"
                      min={15}
                      max={900}
                      step={15}
                      value={templateQuestion.recommendedSeconds}
                      onChange={(e) =>
                        onUpdateQuestion(templateQuestion.questionId, {
                          recommendedSeconds: Math.max(15, Number(e.target.value)),
                        })
                      }
                      aria-label={`Recommended seconds for question ${questionIndex + 1}`}
                      className="h-7 w-16 rounded-md border border-line-strong bg-surface px-1.5 text-[12px] text-ink tabular"
                    />
                    s
                  </label>

                  <label className="flex items-center gap-1.5 text-[11.5px] text-muted">
                    <input
                      type="checkbox"
                      checked={templateQuestion.required}
                      onChange={(e) =>
                        onUpdateQuestion(templateQuestion.questionId, { required: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded accent-[var(--brand)]"
                    />
                    Required
                  </label>

                  <div className="flex items-center gap-0.5">
                    <IconButton
                      icon="arrowUp"
                      label={`Move question ${questionIndex + 1} up`}
                      size="sm"
                      disabled={questionIndex === 0}
                      onClick={() => onMoveQuestion(questionIndex, -1)}
                    />
                    <IconButton
                      icon="arrowDown"
                      label={`Move question ${questionIndex + 1} down`}
                      size="sm"
                      disabled={questionIndex === section.questions.length - 1}
                      onClick={() => onMoveQuestion(questionIndex, 1)}
                    />
                    <IconButton
                      icon="x"
                      label={`Remove question ${questionIndex + 1}`}
                      size="sm"
                      onClick={() => onRemoveQuestion(templateQuestion.questionId)}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {section.questions.length > 0 ? (
        <div className="border-t border-line p-2.5">
          <Button variant="ghost" size="sm" icon="plus" onClick={onAddQuestions}>
            Add questions to this section
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

function QuestionPicker({
  open,
  onClose,
  questions,
  excluded,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  questions: Question[];
  excluded: Set<string>;
  onAdd: (questions: Question[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCategory('all');
      setSelected([]);
    }
  }, [open]);

  const available = useMemo(
    () =>
      questions.filter(
        (q) =>
          !excluded.has(q.id) &&
          (category === 'all' || q.category === category) &&
          matches(`${q.text} ${q.category}`, query),
      ),
    [questions, excluded, category, query],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add questions"
      description="Pick from the question bank. Questions already in this template are hidden."
      size="xl"
      footer={
        <>
          <span className="mr-auto text-[12px] text-muted tabular">{selected.length} selected</span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon="plus"
            disabled={!selected.length}
            onClick={() => onAdd(questions.filter((q) => selected.includes(q.id)))}
          >
            Add {selected.length || ''}
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <SearchInput
          label="Search the question bank"
          value={query}
          onChange={setQuery}
          className="min-w-48 flex-1"
        />
        <Select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | 'all')}
          className="w-auto min-w-40"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {available.length === 0 ? (
        <EmptyState
          icon="helpCircle"
          title="No questions available"
          description="Every matching question is already in this template."
          compact
        />
      ) : (
        <ul className="space-y-1.5">
          {available.map((question) => {
            const checked = selected.includes(question.id);
            return (
              <li key={question.id}>
                <label
                  className={cx(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    checked ? 'border-brand bg-brand-soft/40' : 'border-line hover:bg-surface-2',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      setSelected((prev) =>
                        e.target.checked ? [...prev, question.id] : prev.filter((id) => id !== question.id),
                      )
                    }
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[var(--brand)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] leading-snug text-ink">{question.text}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11.5px] text-muted">{question.category}</span>
                      <DifficultyBadge difficulty={question.difficulty} />
                      <SeniorityBadge seniority={question.seniority} />
                      {!question.active ? (
                        <span className="rounded border border-line bg-surface-2 px-1.5 py-0.5 text-[10.5px] text-muted">
                          Inactive
                        </span>
                      ) : null}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
