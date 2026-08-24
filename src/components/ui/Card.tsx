import type { ReactNode } from 'react';
import { cx } from '@/lib/utils';

export function Card({
  children,
  className,
  padded = true,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag
      className={cx(
        // min-w-0 lets a card inside a grid shrink below its widest child
        // (a wide table scrolls inside itself instead of stretching the page).
        'min-w-0 bg-surface border border-line rounded-xl shadow-card',
        padded && 'p-5',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cx('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="min-w-0">
        <h2 id={id} className="text-[15px] font-semibold text-ink leading-tight">
          {title}
        </h2>
        {description ? <p className="text-[13px] text-muted mt-1 leading-snug">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {breadcrumb ? <div className="mb-2">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold text-ink leading-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted mt-1.5 max-w-2xl leading-relaxed">{description}</p>
          ) : null}
          {meta ? <div className="mt-3">{meta}</div> : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cx('border-0 border-t border-line', className)} />;
}
