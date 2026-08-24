import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { summarise } from '@/lib/selectors';
import { computeResult } from '@/lib/scoring';
import { CANDIDATE_STATUS_LABELS, SKILL_LABELS, type AuditType, type CandidateNote } from '@/lib/types';
import { candidateExport, candidatesCsv, downloadCsv, downloadJson, reportFilename } from '@/lib/exporters';
import { cx, ensureProtocol, formatDate, formatDateTime, formatDuration, now, uid } from '@/lib/utils';
import { Button, IconButton, LinkButton } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';
import { Icon, type IconName } from '@/components/ui/Icon';
import { EmptyState, InfoRow, Tabs } from '@/components/ui/Misc';
import {
  DecisionBadge,
  PercentageDisplay,
  RecommendationBadge,
  StatusBadge,
} from '@/components/ui/DomainBadges';
import { ConfirmDialog } from '@/components/ui/Modal';
import { CandidateForm } from '@/components/candidates/CandidateForm';
import { SkillBreakdown, StrengthsAndGaps } from '@/components/interview/AssessmentBreakdown';
import { useToast } from '@/store/ToastProvider';

type Tab = 'overview' | 'interviews' | 'notes' | 'documents' | 'history';

const AUDIT_ICON: Record<AuditType, IconName> = {
  candidate_created: 'plus',
  candidate_updated: 'edit',
  candidate_archived: 'archive',
  candidate_deleted: 'trash',
  interview_started: 'play',
  interview_resumed: 'refresh',
  interview_completed: 'checkCircle',
  interview_discarded: 'trash',
  interview_edited: 'edit',
  score_changed: 'target',
  recommendation_changed: 'award',
  report_exported: 'download',
  note_added: 'fileText',
  data_imported: 'upload',
};

export function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    candidates,
    interviews,
    audit,
    settings,
    saveCandidate,
    archiveCandidate,
    deleteCandidate,
    logEvent,
  } = useAppStore();

  const candidate = candidates.find((c) => c.id === id) ?? null;
  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  const summary = useMemo(
    () => (candidate ? summarise(candidate, interviews) : null),
    [candidate, interviews],
  );

  const timeline = useMemo(
    () =>
      audit
        .filter((event) => event.candidateId === id)
        .sort((a, b) => (a.at < b.at ? 1 : -1)),
    [audit, id],
  );

  if (!candidate || !summary) {
    return (
      <Card>
        <EmptyState
          icon="users"
          title="Candidate not found"
          description="This candidate may have been deleted."
          action={
            <LinkButton to="/candidates" variant="primary" icon="arrowLeft">
              Back to candidates
            </LinkButton>
          }
        />
      </Card>
    );
  }

  const { result } = summary;
  const latestCompleted = summary.completedInterviews[summary.completedInterviews.length - 1] ?? null;

  const addNote = async () => {
    if (!noteDraft.trim()) return;
    const note: CandidateNote = {
      id: uid('note'),
      body: noteDraft.trim(),
      author: settings.interviewerName,
      createdAt: now(),
    };
    await saveCandidate({ ...candidate, notes: [...candidate.notes, note] });
    await logEvent('note_added', 'Interviewer note added.', { candidateId: candidate.id });
    setNoteDraft('');
    toast.success('Note added');
  };

  const exportReport = () => {
    downloadJson(
      candidateExport(candidate, summary.interviews),
      reportFilename(candidate.name, 'json'),
    );
    void logEvent('report_exported', 'Candidate record exported as JSON.', { candidateId: candidate.id });
    toast.success('Report exported', 'JSON written to your downloads.');
  };

  return (
    <>
      <PageHeader
        breadcrumb={
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-muted">
            <Link to="/candidates" className="hover:text-ink">
              Candidates
            </Link>
            <Icon name="chevronRight" size={12} />
            <span className="text-ink">{candidate.name}</span>
          </nav>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {candidate.name}
            {candidate.archived ? (
              <span className="rounded-md border border-line bg-surface-2 px-2 py-1 text-[11px] font-medium text-muted">
                Archived
              </span>
            ) : null}
          </span>
        }
        description={`${candidate.position} · ${candidate.yearsExperience} years of experience${candidate.location ? ` · ${candidate.location}` : ''}`}
        meta={
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">Status</span>
              <StatusBadge status={candidate.status} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">Overall</span>
              {summary.overallPercentage != null ? (
                <PercentageDisplay
                  percentage={summary.overallPercentage}
                  size="lg"
                  thresholds={latestCompleted?.scoring.thresholds}
                />
              ) : (
                <span className="text-[13px] text-subtle">Not scored</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">Recommendation</span>
              <RecommendationBadge recommendation={result?.recommendation ?? null} />
            </div>
            {latestCompleted?.decision ? (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted">Decision</span>
                <DecisionBadge decision={latestCompleted.decision} />
              </div>
            ) : null}
          </div>
        }
        actions={
          <>
            <IconButton
              icon="trash"
              label="Delete candidate and all their interviews"
              variant="ghost"
              onClick={() => setDeleteOpen(true)}
            />
            <Button
              variant="secondary"
              icon="archive"
              onClick={async () => {
                await archiveCandidate(candidate.id, !candidate.archived);
                toast.success(candidate.archived ? 'Candidate restored' : 'Candidate archived');
              }}
            >
              {candidate.archived ? 'Restore' : 'Archive'}
            </Button>
            <Button variant="secondary" icon="download" onClick={exportReport}>
              Export
            </Button>
            {latestCompleted ? (
              <LinkButton
                to={`/interviews/${latestCompleted.id}/report`}
                variant="secondary"
                icon="printer"
              >
                Report
              </LinkButton>
            ) : null}
            <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <LinkButton
              to={`/interviews/new?candidate=${candidate.id}`}
              variant="primary"
              icon="play"
            >
              Start interview
            </LinkButton>
          </>
        }
      />

      {summary.hasInProgress ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-warn/40 bg-warn-soft/60 p-3.5">
          <Icon name="clock" size={16} className="text-warn" />
          <p className="flex-1 text-[13px] text-ink-2">
            This candidate has an interview in progress.
          </p>
          <Button
            size="sm"
            variant="primary"
            icon="play"
            onClick={() =>
              navigate(
                `/interviews/${summary.interviews.find((i) => i.status === 'in_progress')!.id}`,
              )
            }
          >
            Resume
          </Button>
        </div>
      ) : null}

      <Tabs
        label="Candidate sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview', icon: 'dashboard' },
          { value: 'interviews', label: 'Interviews', icon: 'clipboard', count: summary.interviews.length },
          { value: 'notes', label: 'Notes', icon: 'fileText', count: candidate.notes.length },
          { value: 'documents', label: 'Documents', icon: 'archive', count: candidate.documents.length },
          { value: 'history', label: 'History', icon: 'clock', count: timeline.length },
        ]}
      />

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-5">
        {tab === 'overview' ? (
          <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <Card>
              <CardHeader title="Candidate information" />
              <dl>
                <InfoRow label="Email" icon="mail">
                  {candidate.email ? (
                    <a href={`mailto:${candidate.email}`} className="text-brand hover:underline">
                      {candidate.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </InfoRow>
                <InfoRow label="Phone" icon="phone">
                  {candidate.phone || '—'}
                </InfoRow>
                <InfoRow label="Position" icon="briefcase">
                  {candidate.position}
                </InfoRow>
                <InfoRow label="Experience" icon="award">
                  {candidate.yearsExperience} years
                </InfoRow>
                <InfoRow label="Location" icon="mapPin">
                  {candidate.location || '—'}
                </InfoRow>
                <InfoRow label="Portfolio" icon="link">
                  {candidate.portfolioUrl ? (
                    <a
                      href={ensureProtocol(candidate.portfolioUrl)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-brand hover:underline"
                    >
                      {candidate.portfolioUrl.replace(/^https?:\/\//, '')}
                      <Icon name="external" size={11} />
                    </a>
                  ) : (
                    '—'
                  )}
                </InfoRow>
                <InfoRow label="LinkedIn" icon="link">
                  {candidate.linkedinUrl ? (
                    <a
                      href={ensureProtocol(candidate.linkedinUrl)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-brand hover:underline"
                    >
                      {candidate.linkedinUrl.replace(/^https?:\/\//, '')}
                      <Icon name="external" size={11} />
                    </a>
                  ) : (
                    '—'
                  )}
                </InfoRow>
                <InfoRow label="Résumé" icon="fileText">
                  {candidate.resume || '—'}
                </InfoRow>
                <InfoRow label="Interviewer" icon="users">
                  {candidate.interviewer || '—'}
                </InfoRow>
                <InfoRow label="Added" icon="calendar">
                  {formatDate(candidate.createdAt)}
                </InfoRow>
              </dl>
            </Card>

            <div className="space-y-5">
              {result && latestCompleted ? (
                <>
                  <Card>
                    <CardHeader
                      title="Skill breakdown"
                      description={`From ${latestCompleted.roundLabel} · ${formatDate(latestCompleted.completedAt)}`}
                      action={
                        <LinkButton
                          to={`/interviews/${latestCompleted.id}/review`}
                          variant="ghost"
                          size="sm"
                          iconRight="arrowRight"
                        >
                          Full assessment
                        </LinkButton>
                      }
                    />
                    <SkillBreakdown result={result} scaleMax={latestCompleted.scoring.scaleMax} />
                  </Card>

                  <Card>
                    <CardHeader title="Strengths and development areas" />
                    <StrengthsAndGaps result={result} />
                  </Card>

                  <Card>
                    <CardHeader title="Interview summary" />
                    {latestCompleted.summary ? (
                      <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2">
                        {latestCompleted.summary}
                      </p>
                    ) : (
                      <p className="text-[13px] text-muted">
                        No summary recorded yet.{' '}
                        <Link
                          to={`/interviews/${latestCompleted.id}/review`}
                          className="text-brand hover:underline"
                        >
                          Add one
                        </Link>
                        .
                      </p>
                    )}
                  </Card>
                </>
              ) : (
                <Card>
                  <EmptyState
                    icon="clipboard"
                    title="No completed interviews yet"
                    description="Run an interview to generate a skill breakdown, strengths and a recommendation."
                    action={
                      <LinkButton
                        to={`/interviews/new?candidate=${candidate.id}`}
                        variant="primary"
                        icon="play"
                      >
                        Start interview
                      </LinkButton>
                    }
                  />
                </Card>
              )}
            </div>
          </div>
        ) : null}

        {tab === 'interviews' ? (
          <Card padded={false}>
            {summary.interviews.length === 0 ? (
              <EmptyState
                icon="clipboard"
                title="No interviews yet"
                description="Every round you run with this candidate will appear here."
                action={
                  <LinkButton
                    to={`/interviews/new?candidate=${candidate.id}`}
                    variant="primary"
                    icon="play"
                  >
                    Start interview
                  </LinkButton>
                }
              />
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {summary.interviews.map((interview) => {
                  const interviewResult = computeResult({
                    questions: interview.questions,
                    answers: interview.answers,
                    scoring: interview.scoring,
                  });
                  const inProgress = interview.status === 'in_progress';
                  return (
                    <li key={interview.id} className="flex flex-wrap items-center gap-4 p-4">
                      <span
                        className={cx(
                          'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[13px] font-semibold tabular',
                          inProgress ? 'bg-warn-soft text-warn' : 'bg-surface-2 text-muted',
                        )}
                      >
                        {interview.round}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-ink">
                          {interview.roundLabel}
                          {inProgress ? (
                            <span className="rounded-md border border-warn/40 bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn">
                              In progress
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[12px] text-muted">
                          {interview.templateName} ·{' '}
                          {formatDate(interview.completedAt ?? interview.startedAt)} ·{' '}
                          {formatDuration(interview.elapsedMs)} · {interview.interviewer}
                        </p>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <PercentageDisplay
                            percentage={interviewResult.scoredCount ? interviewResult.percentage : null}
                            thresholds={interview.scoring.thresholds}
                          />
                          <p className="text-[11px] text-subtle tabular">
                            {interviewResult.rawScore}/{interviewResult.maxPossible}
                          </p>
                        </div>
                        <div className="hidden sm:block">
                          {inProgress ? (
                            <RecommendationBadge recommendation={interviewResult.recommendation} size="sm" />
                          ) : (
                            <DecisionBadge decision={interview.decision} size="sm" />
                          )}
                        </div>
                        <LinkButton
                          to={inProgress ? `/interviews/${interview.id}` : `/interviews/${interview.id}/review`}
                          variant="secondary"
                          size="sm"
                          iconRight="chevronRight"
                        >
                          {inProgress ? 'Resume' : 'Open'}
                        </LinkButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ) : null}

        {tab === 'notes' ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card>
              <CardHeader title="Interviewer notes" description="Notes recorded outside of an interview." />
              {candidate.notes.length === 0 ? (
                <EmptyState icon="fileText" title="No notes yet" compact />
              ) : (
                <ul className="space-y-3">
                  {[...candidate.notes]
                    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
                    .map((note) => (
                      <li key={note.id} className="rounded-lg border border-line bg-surface-2/50 p-3.5">
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="text-[12px] font-medium text-ink">{note.author}</span>
                          <span className="text-[11.5px] text-subtle">{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
                          {note.body}
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Add a note" />
              <Textarea
                rows={6}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Availability, salary expectations, referral source, follow-up actions…"
                aria-label="New note"
              />
              <Button
                variant="primary"
                full
                icon="plus"
                className="mt-3"
                disabled={!noteDraft.trim()}
                onClick={addNote}
              >
                Add note
              </Button>
            </Card>
          </div>
        ) : null}

        {tab === 'documents' ? (
          <Card>
            <CardHeader
              title="Documents"
              description="References only — this app never uploads or stores files."
            />
            {candidate.documents.length === 0 ? (
              <EmptyState
                icon="archive"
                title="No documents linked"
                description="Add a portfolio or résumé reference from the Edit dialog."
                action={
                  <Button variant="secondary" icon="edit" onClick={() => setEditOpen(true)}>
                    Edit candidate
                  </Button>
                }
                compact
              />
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {candidate.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-subtle">
                      <Icon name={doc.kind === 'portfolio' ? 'link' : 'fileText'} size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{doc.name}</p>
                      <p className="truncate text-[11.5px] text-muted">
                        {doc.reference ?? doc.url ?? doc.kind}
                      </p>
                    </div>
                    {doc.url ? (
                      <a
                        href={ensureProtocol(doc.url)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-brand hover:bg-surface-2"
                      >
                        Open
                        <Icon name="external" size={11} />
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {latestCompleted ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                <LinkButton
                  to={`/interviews/${latestCompleted.id}/report`}
                  variant="secondary"
                  size="sm"
                  icon="fileText"
                >
                  Interview report
                </LinkButton>
                <Button
                  variant="secondary"
                  size="sm"
                  icon="download"
                  onClick={() => {
                    downloadCsv(
                      candidatesCsv([summary]),
                      reportFilename(candidate.name, 'csv', 'summary'),
                    );
                    toast.success('CSV exported');
                  }}
                >
                  Summary CSV
                </Button>
              </div>
            ) : null}
          </Card>
        ) : null}

        {tab === 'history' ? (
          <Card>
            <CardHeader
              title="Audit trail"
              description="Every recorded change for this candidate, newest first."
            />
            {timeline.length === 0 ? (
              <EmptyState icon="clock" title="Nothing recorded yet" compact />
            ) : (
              <ol className="relative space-y-0">
                {timeline.map((event, index) => (
                  <li key={event.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                    {index < timeline.length - 1 ? (
                      <span
                        className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-line"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-surface text-subtle">
                      <Icon name={AUDIT_ICON[event.type] ?? 'info'} size={14} />
                    </span>
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="text-[13px] leading-snug text-ink">{event.message}</p>
                      <p className="mt-0.5 text-[11.5px] text-subtle">
                        {formatDateTime(event.at)} · {event.actor}
                        {event.interviewId ? (
                          <>
                            {' · '}
                            <Link
                              to={`/interviews/${event.interviewId}/review`}
                              className="text-brand hover:underline"
                            >
                              View interview
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        ) : null}
      </div>

      <CandidateForm open={editOpen} onClose={() => setEditOpen(false)} candidate={candidate} />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await deleteCandidate(candidate.id);
          setDeleteOpen(false);
          toast.success('Candidate deleted', `${candidate.name} and all their interviews were removed.`);
          navigate('/candidates');
        }}
        title="Delete this candidate?"
        description={`${candidate.name}, their ${summary.interviews.length} interview${summary.interviews.length === 1 ? '' : 's'}, notes and audit history will be permanently deleted from this browser. Export first if you need a record.`}
        confirmLabel="Delete permanently"
        tone="danger"
      >
        <div className="rounded-lg border border-line bg-surface-2 p-3">
          <p className="text-[12px] text-muted">
            Status: {CANDIDATE_STATUS_LABELS[candidate.status]}
            {result?.strongestSkill
              ? ` · Strongest skill: ${SKILL_LABELS[result.strongestSkill.skill]}`
              : ''}
          </p>
          <Button variant="secondary" size="sm" icon="download" className="mt-2.5" onClick={exportReport}>
            Export before deleting
          </Button>
        </div>
      </ConfirmDialog>
    </>
  );
}
