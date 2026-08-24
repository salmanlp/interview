import { useEffect, useRef, useState } from 'react';
import { cx } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

interface NotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocusKey?: string;
  placeholder?: string;
  rows?: number;
  label?: string;
}

/**
 * The notes field is where the interview actually gets recorded, so it is
 * uncontrolled-ish: local state keeps typing instant, and changes are pushed
 * upward on a short debounce that the workspace autosave then picks up.
 */
export function NotesEditor({
  value,
  onChange,
  disabled,
  autoFocusKey,
  placeholder = 'Record evidence, examples, concerns or important statements…',
  rows = 6,
  label = 'Interviewer notes',
}: NotesEditorProps) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastExternal = useRef(value);

  useEffect(() => {
    if (value !== lastExternal.current) {
      lastExternal.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    setDraft(value);
    lastExternal.current = value;
    // Deliberately keyed on the question, not the value, so switching
    // questions resets the draft without stealing focus mid-typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocusKey]);

  useEffect(() => {
    if (draft === value) return;
    const id = setTimeout(() => {
      lastExternal.current = draft;
      onChange(draft);
    }, 220);
    return () => clearTimeout(id);
  }, [draft, onChange, value]);

  const words = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label htmlFor="interviewer-notes" className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
        <div className="flex items-center gap-3">
          <span className={cx('text-[11.5px] tabular', words > 0 ? 'text-muted' : 'text-subtle')}>
            {words} {words === 1 ? 'word' : 'words'}
          </span>
          <button
            type="button"
            disabled
            title="Voice notes are not available in this local-only build. Nothing is recorded or transmitted."
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-line-strong px-2 py-1 text-[11.5px] text-subtle disabled:cursor-not-allowed"
          >
            <Icon name="mic" size={12} />
            Voice note
          </button>
        </div>
      </div>
      <textarea
        id="interviewer-notes"
        ref={ref}
        rows={rows}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className={cx(
          'w-full rounded-xl border border-line-strong bg-surface px-3.5 py-3 text-[14px] leading-relaxed text-ink',
          'placeholder:text-subtle transition-[border-color,box-shadow] duration-150',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/25',
          'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70',
        )}
      />
    </div>
  );
}
