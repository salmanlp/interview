import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '@/lib/utils';
import { Icon, Spinner, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-on-brand border border-transparent hover:bg-brand-hover shadow-card disabled:hover:bg-brand',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-surface-2 shadow-card disabled:hover:bg-surface',
  subtle: 'bg-surface-2 text-ink-2 border border-transparent hover:bg-surface-3 disabled:hover:bg-surface-2',
  ghost: 'bg-transparent text-muted border border-transparent hover:bg-surface-2 hover:text-ink',
  danger:
    'bg-danger text-white border border-transparent hover:opacity-90 shadow-card dark:text-[#2a0d0d]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl font-semibold',
};

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  full?: boolean;
  children?: ReactNode;
}

export type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

function classes({ variant = 'secondary', size = 'md', full, className }: BaseProps & { className?: string }) {
  return cx(
    'inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
    'transition-[background-color,border-color,color,opacity,box-shadow] duration-150',
    'disabled:opacity-45 disabled:cursor-not-allowed active:translate-y-px',
    VARIANTS[variant],
    SIZES[size],
    full && 'w-full',
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size = 'md', icon, iconRight, loading, full, children, className, disabled, ...rest },
  ref,
) {
  const iconSize = size === 'lg' ? 18 : 16;
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={classes({ variant, size, full, className })}
      {...rest}
    >
      {loading ? <Spinner size={iconSize} /> : icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconRight && !loading ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  );
});

interface LinkButtonProps extends BaseProps {
  to: string;
  className?: string;
  state?: unknown;
  'aria-label'?: string;
  title?: string;
}

export function LinkButton({
  to,
  variant,
  size = 'md',
  icon,
  iconRight,
  full,
  children,
  className,
  state,
  ...rest
}: LinkButtonProps) {
  const iconSize = size === 'lg' ? 18 : 16;
  return (
    <Link to={to} state={state} className={classes({ variant, size, full, className })} {...rest}>
      {icon ? <Icon name={icon} size={iconSize} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={iconSize} /> : null}
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  active?: boolean;
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  active,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(
        'inline-flex items-center justify-center rounded-lg transition-colors duration-150',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
        VARIANTS[variant],
        active && 'bg-surface-3 text-ink',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 15 : 17} />
    </button>
  );
}
