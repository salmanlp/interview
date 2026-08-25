import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/AppStore';
import {
  CANDIDATE_STATUSES,
  CANDIDATE_STATUS_LABELS,
  type Candidate,
  type CandidateStatus,
} from '@/lib/types';
import { ensureProtocol, isValidEmail, isValidUrl, now, uid } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { DataNotice } from '@/components/ui/Misc';
import { useToast } from '@/store/ToastProvider';

export function emptyCandidate(interviewer: string): Candidate {
  return {
    id: uid('cand'),
    name: '',
    email: '',
    phone: '',
    position: 'Product Designer',
    yearsExperience: 3,
    portfolioUrl: '',
    linkedinUrl: '',
    resume: '',
    location: '',
    interviewer,
    status: 'new',
    archived: false,
    notes: [],
    documents: [],
    createdAt: now(),
    updatedAt: now(),
  };
}

type Errors = Partial<Record<keyof Candidate, string>>;

function validate(candidate: Candidate): Errors {
  const errors: Errors = {};
  if (!candidate.name.trim()) errors.name = 'A name is required.';
  if (candidate.email.trim() && !isValidEmail(candidate.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!candidate.position.trim()) errors.position = 'A position is required.';
  if (candidate.yearsExperience < 0 || candidate.yearsExperience > 60) {
    errors.yearsExperience = 'Enter a number between 0 and 60.';
  }
  if (!isValidUrl(candidate.portfolioUrl)) errors.portfolioUrl = 'Enter a valid URL.';
  if (!isValidUrl(candidate.linkedinUrl)) errors.linkedinUrl = 'Enter a valid URL.';
  return errors;
}

export const POSITION_SUGGESTIONS = [
  'Product Designer',
  'Senior Product Designer',
  'UI Designer',
  'Senior UI Designer',
  'UX Designer',
  'Senior UX Designer',
  'UI/UX Designer',
  'Lead Product Designer',
  'Design Systems Designer',
  'Junior UI/UX Designer',
];

interface CandidateFormProps {
  open: boolean;
  onClose: () => void;
  candidate?: Candidate | null;
  onSaved?: (candidate: Candidate) => void;
}

export function CandidateForm({ open, onClose, candidate, onSaved }: CandidateFormProps) {
  const { saveCandidate, settings, shared } = useAppStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Candidate>(() => candidate ?? emptyCandidate(settings.interviewerName));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(candidate);

  useEffect(() => {
    if (open) {
      setDraft(candidate ? { ...candidate } : emptyCandidate(settings.interviewerName));
      setErrors({});
    }
  }, [open, candidate, settings.interviewerName]);

  const set = <K extends keyof Candidate>(key: K, value: Candidate[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const submit = async () => {
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      toast.error('Check the form', 'Some fields still need attention.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCandidate({
        ...draft,
        name: draft.name.trim(),
        email: draft.email.trim(),
        position: draft.position.trim(),
        portfolioUrl: draft.portfolioUrl.trim() ? ensureProtocol(draft.portfolioUrl.trim()) : '',
        linkedinUrl: draft.linkedinUrl.trim() ? ensureProtocol(draft.linkedinUrl.trim()) : '',
      });
      toast.success(isEdit ? 'Candidate updated' : 'Candidate created', saved.name);
      onSaved?.(saved);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit candidate' : 'New candidate'}
      description={
        isEdit
          ? 'Update the candidate record. Interview history is unaffected.'
          : 'Only what you need to run and record an interview — nothing more.'
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={saving} icon="check">
            {isEdit ? 'Save changes' : 'Create candidate'}
          </Button>
        </>
      }
    >
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Full name" required error={errors.name} className="sm:col-span-2">
          {({ id, describedBy, invalid, required }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-required={required}
              invalid={invalid}
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Amara Okafor"
              autoComplete="off"
              data-autofocus
            />
          )}
        </Field>

        <Field label="Email" error={errors.email} hint="Optional — used only for your own reference.">
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="email"
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="name@example.com"
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Phone">
          {({ id }) => (
            <Input
              id={id}
              type="tel"
              value={draft.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+44 7700 900000"
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Position" required error={errors.position}>
          {({ id, describedBy, invalid, required }) => (
            <>
              <Input
                id={id}
                list="position-suggestions"
                aria-describedby={describedBy}
                aria-required={required}
                invalid={invalid}
                value={draft.position}
                onChange={(e) => set('position', e.target.value)}
              />
              <datalist id="position-suggestions">
                {POSITION_SUGGESTIONS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </>
          )}
        </Field>

        <Field label="Years of experience" error={errors.yearsExperience}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="number"
              min={0}
              max={60}
              step={0.5}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.yearsExperience}
              onChange={(e) => set('yearsExperience', Number(e.target.value))}
            />
          )}
        </Field>

        <Field label="Portfolio URL" error={errors.portfolioUrl}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.portfolioUrl}
              onChange={(e) => set('portfolioUrl', e.target.value)}
              placeholder="portfolio.com"
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="LinkedIn URL" error={errors.linkedinUrl}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.linkedinUrl}
              onChange={(e) => set('linkedinUrl', e.target.value)}
              placeholder="linkedin.com/in/…"
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Location">
          {({ id }) => (
            <Input
              id={id}
              value={draft.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="City, Country"
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Résumé reference" hint="A filename or ATS reference. No file is uploaded.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={draft.resume}
              onChange={(e) => set('resume', e.target.value)}
              placeholder="candidate-cv.pdf"
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Interviewer">
          {({ id }) => (
            <Input
              id={id}
              value={draft.interviewer}
              onChange={(e) => set('interviewer', e.target.value)}
              autoComplete="off"
            />
          )}
        </Field>

        <Field label="Status">
          {({ id }) => (
            <Select
              id={id}
              value={draft.status}
              onChange={(e) => set('status', e.target.value as CandidateStatus)}
            >
              {CANDIDATE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CANDIDATE_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="sm:col-span-2 mt-1 rounded-lg border border-line bg-surface-2 p-3">
          <DataNotice shared={shared} />
        </div>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
