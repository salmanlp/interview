import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { findResumableInterview } from '@/lib/interview';
import { formatClock, relativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/store/ToastProvider';

/**
 * A single unfinished interview is the most urgent thing in the product —
 * surfaced on every page until it is resumed or discarded.
 */
export function ResumeBanner() {
  const { interviews, candidates, deleteInterview, logEvent } = useAppStore();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const interview = findResumableInterview(interviews);
  if (!interview || location.pathname.startsWith('/interviews/')) return null;

  const candidate = candidates.find((c) => c.id === interview.candidateId);
  const scored = Object.values(interview.answers).filter((a) => a.score != null || a.skipped).length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-warn/40 bg-warn-soft/60 p-4 no-print">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-warn-soft text-warn">
          <Icon name="clock" size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-[13.5px] font-semibold text-ink">
            Interview in progress
            <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[11px] font-medium text-warn">
              Not submitted
            </span>
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-2">
            <span className="font-medium">{candidate?.name ?? 'Unknown candidate'}</span> ·{' '}
            <span className="tabular">
              {scored} / {interview.questions.length} questions
            </span>{' '}
            · <span className="tabular">{formatClock(interview.elapsedMs)} elapsed</span> · last
            activity {relativeTime(interview.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(true)}>
            Discard
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon="play"
            onClick={() => navigate(`/interviews/${interview.id}`)}
          >
            Resume interview
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={async () => {
          await deleteInterview(interview.id);
          await logEvent('interview_discarded', `Unfinished interview discarded (${scored} of ${interview.questions.length} questions answered).`, {
            candidateId: interview.candidateId,
          });
          setConfirmDiscard(false);
          toast.success('Interview discarded', 'The unfinished assessment has been deleted.');
        }}
        title="Discard this interview?"
        description={`${scored} scored answers and any notes for ${candidate?.name ?? 'this candidate'} will be permanently deleted. This cannot be undone.`}
        confirmLabel="Discard interview"
        tone="danger"
      />
    </>
  );
}
