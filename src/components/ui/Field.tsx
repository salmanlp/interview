import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from './Icon';

const CONTROL =
  'w-full bg-surface border border-line-strong rounded-lg text-sm text-ink placeholder:text-subtle ' +
  'transition-[border-color,box-shadow] duration-150 hover:border-line-strong ' +
  'focus:outline-none focus-visible:outline-none focus:border-brand focus:ring-2 focus:ring-[var(--ring)]/25 ' +
  'disabled:opacity-55 disabled:cursor-not-allowed disabled:bg-surface-2';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: (props: {
    id: string;
    describedBy?: string;
    invalid: boolean;
    required: boolean;
  }) => ReactNode;
  className?: string;
  labelSuffix?: ReactNode;
}

export function Field({ label, hint, error, required, children, className, labelSuffix }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
          {label}
          {required ? (
            <>
              <span className="text-danger ml-0.5" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> (required)</span>
            </>
          ) : null}
        </label>
        {labelSuffix}
      </div>
      {children({ id, describedBy, invalid: Boolean(error), required: Boolean(required) })}
      {error ? (
        <p id={errorId} className="text-[12px] text-danger flex items-center gap-1.5" role="alert">
          <Icon name="alertCircle" size={13} />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-[12px] text-muted leading-snug">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(CONTROL, 'h-9 px-3', invalid && 'border-danger', className)}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(CONTROL, 'px-3 py-2 leading-relaxed min-h-24', invalid && 'border-danger', className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cx(CONTROL, 'h-9 pl-3 pr-9 appearance-none cursor-pointer', invalid && 'border-danger', className)}
        {...rest}
      >
        {children}
      </select>
      <Icon
        name="chevronDown"
        size={15}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
});

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  label,
  className,
  onKeyDown,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className={cx('relative', className)}>
      <Icon
        name="search"
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle"
      />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={cx(CONTROL, 'h-9 pl-9 pr-3 [&::-webkit-search-cancel-button]:appearance-none')}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-subtle hover:text-ink hover:bg-surface-2"
        >
          <Icon name="x" size={13} />
        </button>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-[13px] font-medium text-ink cursor-pointer">
          {label}
        </label>
        {description ? <p className="text-[12px] text-muted mt-0.5 leading-snug">{description}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150 disabled:opacity-50',
          checked ? 'bg-brand border-transparent' : 'bg-surface-3 border-line-strong',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-150',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(
        'inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-[6px] font-medium transition-colors duration-150',
              size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-2.5 text-[13px]',
              active
                ? 'bg-surface text-ink shadow-card'
                : 'text-muted hover:text-ink',
            )}
          >
            {option.icon ? <Icon name={option.icon} size={13} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
