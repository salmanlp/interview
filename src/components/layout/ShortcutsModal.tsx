import { Modal } from '@/components/ui/Modal';
import { Kbd } from '@/components/ui/Badge';

const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: 'Global',
    items: [
      { keys: ['⌘', 'K'], label: 'Open global search' },
      { keys: ['⌘', 'S'], label: 'Save now' },
      { keys: ['?'], label: 'Open this help' },
      { keys: ['Esc'], label: 'Close dialog or search' },
    ],
  },
  {
    title: 'Interview workspace',
    items: [
      { keys: ['N'], label: 'Next question' },
      { keys: ['P'], label: 'Previous question' },
      { keys: ['1'], label: 'Score 1 — Weak' },
      { keys: ['2'], label: 'Score 2 — Developing' },
      { keys: ['3'], label: 'Score 3 — Good' },
      { keys: ['4'], label: 'Score 4 — Strong' },
      { keys: ['5'], label: 'Score 5 — Excellent' },
      { keys: ['F'], label: 'Flag question for follow-up' },
      { keys: ['S'], label: 'Mark question as skipped' },
      { keys: ['Space'], label: 'Pause or resume the timer' },
    ],
  },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      description="Shortcuts in the interview workspace are ignored while you are typing in the notes field, so you can write freely."
      size="lg"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-subtle">
              {group.title}
            </h3>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-4">
                  <span className="text-[13px] text-ink-2">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
