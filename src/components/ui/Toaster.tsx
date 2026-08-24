import { useToast, type ToastTone } from '@/store/ToastProvider';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from './Icon';

const TONE_ICON: Record<ToastTone, IconName> = {
  success: 'checkCircle',
  error: 'alertCircle',
  info: 'info',
  warning: 'alertTriangle',
};

const TONE_CLASS: Record<ToastTone, string> = {
  success: 'text-ok',
  error: 'text-danger',
  info: 'text-info',
  warning: 'text-warn',
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 no-print"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className="animate-slide-in flex items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-pop"
        >
          <Icon name={TONE_ICON[toast.tone]} size={17} className={cx('mt-0.5 shrink-0', TONE_CLASS[toast.tone])} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink leading-snug">{toast.title}</p>
            {toast.description ? (
              <p className="text-[12px] text-muted mt-0.5 leading-snug">{toast.description}</p>
            ) : null}
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
                className="mt-2 text-[12px] font-medium text-brand hover:underline"
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="-mt-0.5 -mr-0.5 shrink-0 rounded p-1 text-subtle hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
