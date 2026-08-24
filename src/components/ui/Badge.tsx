import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from './Icon';

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 's1'
  | 's2'
  | 's3'
  | 's4'
  | 's5';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  brand: 'bg-brand-soft text-brand-ink border-transparent dark:border-line',
  success: 'bg-ok-soft text-ok border-transparent dark:border-line',
  warning: 'bg-warn-soft text-warn border-transparent dark:border-line',
  danger: 'bg-danger-soft text-danger border-transparent dark:border-line',
  info: 'bg-info-soft text-info border-transparent dark:border-line',
  s1: 'bg-danger-soft text-s1 border-transparent dark:border-line',
  s2: 'bg-warn-soft text-s2 border-transparent dark:border-line',
  s3: 'bg-warn-soft text-s3 border-transparent dark:border-line',
  s4: 'bg-ok-soft text-s4 border-transparent dark:border-line',
  s5: 'bg-ok-soft text-s5 border-transparent dark:border-line',
};

export function Badge({
  children,
  tone = 'neutral',
  icon,
  dot,
  size = 'md',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: IconName;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {icon ? <Icon name={icon} size={size === 'sm' ? 11 : 13} /> : null}
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1.5 font-mono text-[10.5px] font-medium text-muted shadow-[0_1px_0_var(--line-strong)]">
      {children}
    </kbd>
  );
}
