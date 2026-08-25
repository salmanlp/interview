import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSession, isSupabaseConfigured, onAuthChange, signIn } from '@/data/supabase';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { LoadingState } from '@/components/ui/Misc';

/**
 * Guards the app when it is pointed at a shared database.
 *
 * The store only mounts once there is a session, so no page ever renders
 * against a database it cannot read. In local (IndexedDB) builds this is a
 * pass-through and there is nothing to sign in to.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    void getSession()
      .then((current) => {
        if (!cancelled) setSession(current);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    const unsubscribe = onAuthChange(setSession);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured()) return <>{children}</>;

  if (checking) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <div className="w-72">
          <LoadingState label="Checking your session…" />
        </div>
      </div>
    );
  }

  if (!session) return <SignIn />;

  // Remount the store when the signed-in user changes, so no data outlives a
  // sign-out.
  return <div key={session.user.id} className="contents">{children}</div>;
}

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4">
      <main className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-on-brand">
            <Icon name="logo" size={20} strokeWidth={2} />
          </span>
          <div>
            <h1 className="text-[17px] font-semibold leading-tight text-ink">
              Interview Assessment
            </h1>
            <p className="text-[12.5px] leading-tight text-muted">UI/UX Designer hiring</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-card"
        >
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Sign in</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Candidate records are shared with your team and are not readable without an account.
            </p>
          </div>

          <Field label="Email" required>
            {({ id, required }) => (
              <Input
                id={id}
                type="email"
                autoComplete="email"
                aria-required={required}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoFocus
              />
            )}
          </Field>

          <Field label="Password" required>
            {({ id, required }) => (
              <Input
                id={id}
                type="password"
                autoComplete="current-password"
                aria-required={required}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger-soft/60 p-2.5 text-[12.5px] leading-snug text-ink-2"
            >
              <Icon name="alertCircle" size={14} className="mt-0.5 shrink-0 text-danger" />
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            full
            loading={busy}
            disabled={!email.trim() || !password}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-subtle">
          <Icon name="shield" size={13} className="mt-0.5 shrink-0 text-ok" />
          Accounts are created by your administrator in Supabase. Candidate data is protected by
          row-level security — the public site key alone grants no access to it.
        </p>
      </main>
    </div>
  );
}
