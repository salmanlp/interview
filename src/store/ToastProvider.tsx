import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { uid } from '@/lib/utils';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'> & { id?: string; duration?: number }) => string;
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback<ToastContextValue['push']>(
    ({ duration = 4200, id, ...toast }) => {
      const toastId = id ?? uid('toast');
      setToasts((prev) => [...prev.filter((t) => t.id !== toastId).slice(-3), { ...toast, id: toastId }]);
      const timer = timers.current.get(toastId);
      if (timer) clearTimeout(timer);
      timers.current.set(
        toastId,
        setTimeout(() => dismiss(toastId), duration),
      );
      return toastId;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      dismiss,
      success: (title, description) => push({ title, description, tone: 'success' }),
      error: (title, description) => push({ title, description, tone: 'error', duration: 7000 }),
      info: (title, description) => push({ title, description, tone: 'info' }),
    }),
    [toasts, push, dismiss],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
