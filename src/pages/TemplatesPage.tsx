import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { DEFAULT_SCORING } from '@/lib/scoring';
import { seedTemplates } from '@/lib/seed/template';
import type { Template } from '@/lib/types';
import { formatDate, now, uid } from '@/lib/utils';
import { Button, IconButton, LinkButton } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Misc';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/store/ToastProvider';

export function TemplatesPage() {
  const { templates, interviews, saveTemplate, deleteTemplate } = useAppStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [deleting, setDeleting] = useState<Template | null>(null);

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const interview of interviews) {
      map.set(interview.templateId, (map.get(interview.templateId) ?? 0) + 1);
    }
    return map;
  }, [interviews]);

  const create = async () => {
    const template: Template = {
      id: uid('tpl'),
      name: 'Untitled template',
      description: '',
      durationMinutes: 30,
      mode: 'structured',
      sections: [{ id: uid('sec'), title: 'Section 1', questions: [] }],
      scoring: DEFAULT_SCORING,
      isDefault: false,
      createdAt: now(),
      updatedAt: now(),
    };
    await saveTemplate(template);
    navigate(`/templates/${template.id}`);
  };

  const duplicate = async (template: Template) => {
    const copy: Template = {
      ...template,
      id: uid('tpl'),
      name: `${template.name} (copy)`,
      isDefault: false,
      sections: template.sections.map((s) => ({ ...s, id: uid('sec'), questions: [...s.questions] })),
      createdAt: now(),
      updatedAt: now(),
    };
    await saveTemplate(copy);
    toast.success('Template duplicated');
    navigate(`/templates/${copy.id}`);
  };

  return (
    <>
      <PageHeader
        title="Interview templates"
        description="Reusable question sets. Editing a template never changes an interview that has already been run — each interview keeps its own frozen copy."
        actions={
          <>
            {templates.every((t) => !t.isDefault) ? (
              <Button
                variant="secondary"
                icon="refresh"
                onClick={async () => {
                  for (const template of seedTemplates()) await saveTemplate(template);
                  toast.success('Default template restored');
                }}
              >
                Restore default
              </Button>
            ) : null}
            <Button variant="primary" icon="plus" onClick={create}>
              New template
            </Button>
          </>
        }
      />

      {templates.length === 0 ? (
        <Card>
          <EmptyState
            icon="layers"
            title="No templates"
            description="Create a template, or restore the default 31-question UI/UX interview."
            action={
              <Button variant="primary" icon="plus" onClick={create}>
                New template
              </Button>
            }
            secondaryAction={
              <Button
                variant="secondary"
                icon="refresh"
                onClick={async () => {
                  for (const template of seedTemplates()) await saveTemplate(template);
                  toast.success('Default template restored');
                }}
              >
                Restore default
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const questionCount = template.sections.reduce((a, s) => a + s.questions.length, 0);
            const maxScore = questionCount * (template.scoring?.scaleMax ?? 5);
            const weighted = template.sections.reduce(
              (a, s) => a + s.questions.reduce((b, q) => b + q.weight, 0),
              0,
            );
            const used = usage.get(template.id) ?? 0;

            return (
              <Card key={template.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-[15px] font-semibold text-ink">{template.name}</h2>
                      {template.isDefault ? (
                        <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10.5px] font-medium text-brand-ink">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted">
                      {template.description || 'No description.'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton
                      icon="copy"
                      label={`Duplicate ${template.name}`}
                      size="sm"
                      onClick={() => duplicate(template)}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete ${template.name}`}
                      size="sm"
                      onClick={() => setDeleting(template)}
                    />
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-2/50 p-3 text-[12px]">
                  <Metric label="Questions" value={String(questionCount)} />
                  <Metric label="Sections" value={String(template.sections.length)} />
                  <Metric label="Duration" value={`${template.durationMinutes} min`} />
                  <Metric label="Max score" value={String(maxScore)} />
                  <Metric label="Weight total" value={`${weighted}×`} />
                  <Metric label="Used in" value={`${used} interview${used === 1 ? '' : 's'}`} />
                </dl>

                <ul className="mt-3 flex flex-wrap gap-1">
                  {template.sections.slice(0, 5).map((section) => (
                    <li
                      key={section.id}
                      className="rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] text-muted"
                    >
                      {section.title}
                      <span className="ml-1 text-subtle tabular">{section.questions.length}</span>
                    </li>
                  ))}
                  {template.sections.length > 5 ? (
                    <li className="px-1.5 py-0.5 text-[11px] text-subtle">
                      +{template.sections.length - 5} more
                    </li>
                  ) : null}
                </ul>

                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <span className="text-[11.5px] text-subtle">
                    Updated {formatDate(template.updatedAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <LinkButton
                      to={`/interviews/new`}
                      variant="ghost"
                      size="sm"
                      icon="play"
                      aria-label={`Start an interview with ${template.name}`}
                    >
                      Use
                    </LinkButton>
                    <LinkButton to={`/templates/${template.id}`} variant="secondary" size="sm" icon="edit">
                      Edit
                    </LinkButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteTemplate(deleting.id);
          setDeleting(null);
          toast.success('Template deleted');
        }}
        title="Delete this template?"
        description={
          deleting
            ? `“${deleting.name}” will be removed. Interviews already run with it keep their own copy of the questions and are unaffected.`
            : undefined
        }
        confirmLabel="Delete template"
        tone="danger"
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-subtle">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink tabular">{value}</dd>
    </div>
  );
}
