import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import {
  CATEGORIES,
  type Category,
  type Difficulty,
  type Question,
  type Seniority,
  type Weight,
} from '@/lib/types';
import { cx, matches, now, uid } from '@/lib/utils';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { Field, Input, SearchInput, Select, SegmentedControl, Switch, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/Misc';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { DifficultyBadge, SeniorityBadge, WeightBadge } from '@/components/ui/DomainBadges';
import { useToast } from '@/store/ToastProvider';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const SENIORITIES: Seniority[] = ['junior', 'mid', 'senior', 'lead'];

function blankQuestion(): Question {
  return {
    id: uid('q'),
    text: '',
    category: 'UX Fundamentals',
    difficulty: 'medium',
    seniority: 'mid',
    evaluationCriteria: [''],
    followUps: [''],
    idealAnswer: '',
    weight: 1,
    active: true,
    createdAt: now(),
    updatedAt: now(),
  };
}

export function QuestionBankPage() {
  const { questions, templates, saveQuestion, deleteQuestion } = useAppStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [query, setQuery] = useState(params.get('q') ?? '');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [difficulty, setDifficulty] = useState<Difficulty | 'all'>('all');
  const [seniority, setSeniority] = useState<Seniority | 'all'>('all');
  const [visibility, setVisibility] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);

  useEffect(() => {
    if (query) params.set('q', query);
    else params.delete('q');
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const usage = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const template of templates) {
      for (const section of template.sections) {
        for (const tq of section.questions) {
          const list = map.get(tq.questionId) ?? [];
          if (!list.includes(template.name)) list.push(template.name);
          map.set(tq.questionId, list);
        }
      }
    }
    return map;
  }, [templates]);

  const filtered = useMemo(() => {
    return questions.filter((question) => {
      if (query.trim() && !matches(`${question.text} ${question.category}`, query)) return false;
      if (category !== 'all' && question.category !== category) return false;
      if (difficulty !== 'all' && question.difficulty !== difficulty) return false;
      if (seniority !== 'all' && question.seniority !== seniority) return false;
      if (visibility === 'active' && !question.active) return false;
      if (visibility === 'inactive' && question.active) return false;
      return true;
    });
  }, [questions, query, category, difficulty, seniority, visibility]);

  const grouped = useMemo(() => {
    const map = new Map<Category, Question[]>();
    for (const question of filtered) {
      const list = map.get(question.category) ?? [];
      list.push(question);
      map.set(question.category, list);
    }
    return [...map.entries()].sort((a, b) => CATEGORIES.indexOf(a[0]) - CATEGORIES.indexOf(b[0]));
  }, [filtered]);

  const activeCount = questions.filter((q) => q.active).length;

  return (
    <>
      <PageHeader
        title="Question bank"
        description={`${questions.length} questions across ${new Set(questions.map((q) => q.category)).size} categories · ${activeCount} active. Inactive questions are skipped when an interview starts.`}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setEditing(blankQuestion())}>
            New question
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <SearchInput
            label="Search questions"
            value={query}
            onChange={setQuery}
            placeholder="Search question text…"
            className="min-w-56 flex-1"
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
          <Select
            aria-label="Filter by difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty | 'all')}
            className="w-auto"
          >
            <option value="all">Any difficulty</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d[0].toUpperCase() + d.slice(1)}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filter by seniority"
            value={seniority}
            onChange={(e) => setSeniority(e.target.value as Seniority | 'all')}
            className="w-auto"
          >
            <option value="all">Any seniority</option>
            {SENIORITIES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </Select>
          <SegmentedControl
            label="Filter by status"
            size="sm"
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>

        {grouped.length === 0 ? (
          <EmptyState
            icon="helpCircle"
            title={questions.length ? 'No questions match' : 'The question bank is empty'}
            description={
              questions.length
                ? 'Try a different search or clear the filters.'
                : 'Add your first question, or restore the seeded bank from Settings.'
            }
            action={
              <Button variant="primary" icon="plus" onClick={() => setEditing(blankQuestion())}>
                New question
              </Button>
            }
          />
        ) : (
          <div>
            {grouped.map(([groupCategory, items]) => (
              <section key={groupCategory}>
                <h2 className="sticky top-0 z-10 border-b border-line bg-surface-2/90 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted backdrop-blur-sm">
                  {groupCategory}
                  <span className="ml-2 font-normal text-subtle tabular">{items.length}</span>
                </h2>
                <ul className="divide-y divide-[var(--line)]">
                  {items.map((question) => {
                    const usedIn = usage.get(question.id) ?? [];
                    return (
                      <li
                        key={question.id}
                        className={cx(
                          'flex flex-wrap items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2/50',
                          !question.active && 'opacity-55',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] leading-snug text-ink">{question.text}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <DifficultyBadge difficulty={question.difficulty} />
                            <SeniorityBadge seniority={question.seniority} />
                            <WeightBadge weight={question.weight} />
                            {!question.active ? (
                              <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-muted">
                                Inactive
                              </span>
                            ) : null}
                            {usedIn.length ? (
                              <span className="text-[11.5px] text-subtle">
                                Used in {usedIn.join(', ')}
                              </span>
                            ) : (
                              <span className="text-[11.5px] text-subtle">Not in any template</span>
                            )}
                          </div>
                          {question.evaluationCriteria.filter(Boolean).length ? (
                            <details className="mt-2 group">
                              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[11.5px] font-medium text-muted hover:text-ink">
                                <Icon name="chevronRight" size={12} className="transition-transform group-open:rotate-90" />
                                Evaluation criteria &amp; follow-ups
                              </summary>
                              <div className="mt-2 space-y-2 border-l-2 border-line pl-3">
                                <ul className="space-y-1">
                                  {question.evaluationCriteria.filter(Boolean).map((c) => (
                                    <li key={c} className="flex gap-1.5 text-[12px] text-ink-2">
                                      <Icon name="check" size={12} className="mt-0.5 shrink-0 text-ok" />
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                                {question.followUps.filter(Boolean).length ? (
                                  <ul className="space-y-1">
                                    {question.followUps.filter(Boolean).map((f) => (
                                      <li key={f} className="text-[12px] text-muted">
                                        ↳ {f}
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                                {question.idealAnswer ? (
                                  <p className="text-[12px] leading-relaxed text-muted">
                                    {question.idealAnswer}
                                  </p>
                                ) : null}
                              </div>
                            </details>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <IconButton
                            icon={question.active ? 'eye' : 'x'}
                            label={question.active ? 'Deactivate question' : 'Activate question'}
                            size="sm"
                            onClick={async () => {
                              await saveQuestion({ ...question, active: !question.active });
                              toast.success(question.active ? 'Question deactivated' : 'Question activated');
                            }}
                          />
                          <IconButton
                            icon="edit"
                            label="Edit question"
                            size="sm"
                            onClick={() => setEditing(question)}
                          />
                          <IconButton
                            icon="trash"
                            label="Delete question"
                            size="sm"
                            onClick={() => setDeleting(question)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>

      <QuestionEditor
        question={editing}
        onClose={() => setEditing(null)}
        onSave={async (question) => {
          await saveQuestion(question);
          setEditing(null);
          toast.success(questions.some((q) => q.id === question.id) ? 'Question updated' : 'Question added');
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteQuestion(deleting.id);
          setDeleting(null);
          toast.success('Question deleted', 'It has also been removed from any template that used it.');
        }}
        title="Delete this question?"
        description={
          deleting
            ? `“${deleting.text.slice(0, 90)}${deleting.text.length > 90 ? '…' : ''}” will be removed from the bank and from every template. Interviews already recorded keep their own copy and are unaffected.`
            : undefined
        }
        confirmLabel="Delete question"
        tone="danger"
      />
    </>
  );
}

function QuestionEditor({
  question,
  onClose,
  onSave,
}: {
  question: Question | null;
  onClose: () => void;
  onSave: (question: Question) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Question | null>(question);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(question);
    setError(null);
  }, [question]);

  if (!draft) return null;

  const set = <K extends keyof Question>(key: K, value: Question[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  const setList = (key: 'evaluationCriteria' | 'followUps', index: number, value: string) =>
    setDraft((prev) => {
      if (!prev) return prev;
      const list = [...prev[key]];
      list[index] = value;
      return { ...prev, [key]: list };
    });

  const addListItem = (key: 'evaluationCriteria' | 'followUps') =>
    setDraft((prev) => (prev ? { ...prev, [key]: [...prev[key], ''] } : prev));

  const removeListItem = (key: 'evaluationCriteria' | 'followUps', index: number) =>
    setDraft((prev) =>
      prev ? { ...prev, [key]: prev[key].filter((_, i) => i !== index) } : prev,
    );

  const submit = async () => {
    if (!draft.text.trim()) {
      setError('The question text is required.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...draft,
        text: draft.text.trim(),
        evaluationCriteria: draft.evaluationCriteria.map((c) => c.trim()).filter(Boolean),
        followUps: draft.followUps.map((f) => f.trim()).filter(Boolean),
        idealAnswer: draft.idealAnswer.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={question?.text ? 'Edit question' : 'New question'}
      description="Evaluation criteria and follow-ups appear beside the question during the interview."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="check" onClick={submit} loading={saving}>
            Save question
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Question" required error={error}>
          {({ id, invalid, required }) => (
            <Textarea
              id={id}
              rows={2}
              aria-required={required}
              invalid={invalid}
              value={draft.text}
              onChange={(e) => {
                set('text', e.target.value);
                setError(null);
              }}
              placeholder="e.g. How would you approach a design system audit?"
              data-autofocus
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Category" className="sm:col-span-2">
            {({ id }) => (
              <Select id={id} value={draft.category} onChange={(e) => set('category', e.target.value as Category)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Difficulty">
            {({ id }) => (
              <Select
                id={id}
                value={draft.difficulty}
                onChange={(e) => set('difficulty', e.target.value as Difficulty)}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d[0].toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Seniority">
            {({ id }) => (
              <Select
                id={id}
                value={draft.seniority}
                onChange={(e) => set('seniority', e.target.value as Seniority)}
              >
                {SENIORITIES.map((s) => (
                  <option key={s} value={s}>
                    {s[0].toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field
          label="Default weight"
          hint="Templates can override this. 2× for practical questions, 3× for important scenarios."
        >
          {({ id, describedBy }) => (
            <div id={id} aria-describedby={describedBy}>
              <SegmentedControl
                label="Default weight"
                value={String(draft.weight)}
                onChange={(value) => set('weight', Number(value) as Weight)}
                options={[
                  { value: '1', label: '1× Standard' },
                  { value: '2', label: '2× Important' },
                  { value: '3', label: '3× Critical' },
                ]}
              />
            </div>
          )}
        </Field>

        <ListField
          label="Evaluation criteria"
          hint="What a good answer contains. Shown to the interviewer while scoring."
          items={draft.evaluationCriteria}
          placeholder="e.g. Names the measurable signal, not just the opinion"
          onChange={(index, value) => setList('evaluationCriteria', index, value)}
          onAdd={() => addListItem('evaluationCriteria')}
          onRemove={(index) => removeListItem('evaluationCriteria', index)}
        />

        <ListField
          label="Follow-up questions"
          hint="Prompts to dig deeper when the first answer is thin."
          items={draft.followUps}
          placeholder="e.g. Walk me through a time you did this."
          onChange={(index, value) => setList('followUps', index, value)}
          onAdd={() => addListItem('followUps')}
          onRemove={(index) => removeListItem('followUps', index)}
        />

        <Field label="Ideal answer guidance">
          {({ id }) => (
            <Textarea
              id={id}
              rows={3}
              value={draft.idealAnswer}
              onChange={(e) => set('idealAnswer', e.target.value)}
              placeholder="A paragraph describing what an excellent answer sounds like."
            />
          )}
        </Field>

        <div className="rounded-lg border border-line bg-surface-2 p-3">
          <Switch
            checked={draft.active}
            onChange={(value) => set('active', value)}
            label="Active"
            description="Inactive questions stay in the bank but are excluded when an interview starts."
          />
        </div>
      </div>
    </Modal>
  );
}

function ListField({
  label,
  hint,
  items,
  placeholder,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  hint: string;
  items: string[];
  placeholder: string;
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[13px] font-medium text-ink-2">{label}</legend>
      <p className="mb-2 text-[12px] text-muted">{hint}</p>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => onChange(index, e.target.value)}
              placeholder={placeholder}
              aria-label={`${label} ${index + 1}`}
            />
            <IconButton
              icon="x"
              label={`Remove ${label} ${index + 1}`}
              size="sm"
              onClick={() => onRemove(index)}
              disabled={items.length === 1}
            />
          </li>
        ))}
      </ul>
      <Button variant="ghost" size="sm" icon="plus" className="mt-2" onClick={onAdd}>
        Add
      </Button>
    </fieldset>
  );
}
