import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { cx, formatDate, relativeTime } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Misc';
import { SaveIndicator } from '@/components/ui/DomainBadges';
import type { ThemePreference } from '@/lib/types';
import { isSupabaseConfigured, signOut } from '@/data/supabase';

interface TopBarProps {
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
  onOpenShortcuts: () => void;
}

const THEME_SEQUENCE: ThemePreference[] = ['light', 'dark', 'system'];

export function TopBar({ onOpenSearch, onOpenMobileNav, onOpenShortcuts }: TopBarProps) {
  const { settings, setTheme, candidates, interviews, saveState, lastSavedAt, shared } = useAppStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /**
   * Notifications are derived from the data itself — unfinished interviews and
   * assessments still awaiting a decision. Nothing is fetched or pushed.
   */
  const notifications = useMemo(() => {
    const items: { id: string; title: string; body: string; to: string; at: string; tone: 'warning' | 'info' }[] = [];

    for (const interview of interviews) {
      const candidate = candidates.find((c) => c.id === interview.candidateId);
      if (interview.status === 'in_progress') {
        const scored = Object.values(interview.answers).filter((a) => a.score != null).length;
        items.push({
          id: interview.id,
          title: 'Interview in progress',
          body: `${candidate?.name ?? 'Candidate'} — ${scored}/${interview.questions.length} questions scored`,
          to: `/interviews/${interview.id}`,
          at: interview.updatedAt,
          tone: 'warning',
        });
      } else if (interview.status === 'completed' && !interview.decision) {
        items.push({
          id: interview.id,
          title: 'Awaiting hiring decision',
          body: `${candidate?.name ?? 'Candidate'} — completed ${formatDate(interview.completedAt)}`,
          to: `/interviews/${interview.id}/review`,
          at: interview.completedAt ?? interview.updatedAt,
          tone: 'info',
        });
      }
    }

    return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
  }, [interviews, candidates]);

  const nextTheme = THEME_SEQUENCE[(THEME_SEQUENCE.indexOf(settings.theme) + 1) % THEME_SEQUENCE.length];
  const themeIcon = settings.theme === 'light' ? 'sun' : settings.theme === 'dark' ? 'moon' : 'monitor';

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:px-4 no-print">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation menu"
        className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink lg:hidden"
      >
        <Icon name="menu" size={18} />
      </button>

      <button
        type="button"
        onClick={onOpenSearch}
        className="group flex h-9 min-w-0 flex-1 max-w-md items-center gap-2 rounded-lg border border-line-strong bg-surface-2/60 px-2.5 text-left text-[13px] text-subtle transition-colors hover:bg-surface-2 hover:border-line-strong sm:px-3"
      >
        <Icon name="search" size={15} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          <span className="sm:hidden">Search…</span>
          <span className="hidden sm:inline">Search candidates, interviews…</span>
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <div className="mr-1 hidden md:block">
          <SaveIndicator state={saveState} lastSavedAt={lastSavedAt} />
        </div>

        <IconButton icon="keyboard" label="Keyboard shortcuts" onClick={onOpenShortcuts} className="hidden sm:inline-flex" />

        <IconButton
          icon={themeIcon}
          label={`Theme: ${settings.theme}. Switch to ${nextTheme}.`}
          onClick={() => setTheme(nextTheme)}
        />

        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((v) => !v)}
            aria-label={`Notifications (${notifications.length})`}
            aria-expanded={notificationsOpen}
            className="relative grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-ink"
          >
            <Icon name="bell" size={17} />
            {notifications.length > 0 ? (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9.5px] font-semibold text-on-brand tabular">
                {notifications.length}
              </span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-pop animate-pop-in">
              <div className="border-b border-line px-4 py-2.5">
                <p className="text-[13px] font-semibold text-ink">Notifications</p>
                <p className="text-[11.5px] text-muted">Derived from your local data</p>
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-muted">Nothing needs your attention.</p>
              ) : (
                <ul className="max-h-80 overflow-y-auto scrollbar-thin">
                  {notifications.map((n) => (
                    <li key={`${n.id}-${n.title}`} className="border-b border-line last:border-0">
                      <Link to={n.to} className="block px-4 py-3 transition-colors hover:bg-surface-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cx(
                              'h-1.5 w-1.5 shrink-0 rounded-full',
                              n.tone === 'warning' ? 'bg-warn' : 'bg-info',
                            )}
                          />
                          <p className="flex-1 truncate text-[13px] font-medium text-ink">{n.title}</p>
                          <span className="shrink-0 text-[11px] text-subtle">{relativeTime(n.at)}</span>
                        </div>
                        <p className="mt-0.5 pl-3.5 text-[12px] text-muted">{n.body}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-label="Interviewer profile"
            aria-expanded={profileOpen}
            className="ml-1 flex items-center gap-2 rounded-lg p-0.5 pr-1.5 hover:bg-surface-2"
          >
            <Avatar name={settings.interviewerName} size="sm" />
            <span className="hidden text-left lg:block">
              <span className="block max-w-28 truncate text-[12.5px] font-medium leading-tight text-ink">
                {settings.interviewerName}
              </span>
              <span className="block max-w-28 truncate text-[11px] leading-tight text-muted">
                {settings.interviewerRole}
              </span>
            </span>
            <Icon name="chevronDown" size={14} className="hidden text-subtle lg:block" />
          </button>
          {profileOpen ? (
            <div className="absolute right-0 top-11 z-40 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-pop animate-pop-in">
              <div className="flex items-center gap-3 border-b border-line p-3">
                <Avatar name={settings.interviewerName} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{settings.interviewerName}</p>
                  <p className="truncate text-[11.5px] text-muted">{settings.interviewerRole}</p>
                </div>
              </div>
              <ul className="p-1.5">
                <li>
                  <Link
                    to="/settings"
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-2 hover:bg-surface-2"
                  >
                    <Icon name="settings" size={15} className="text-subtle" />
                    Settings
                  </Link>
                </li>
                <li>
                  <Link
                    to="/settings?tab=data"
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-ink-2 hover:bg-surface-2"
                  >
                    <Icon name="database" size={15} className="text-subtle" />
                    Data &amp; backup
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenShortcuts}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-2"
                  >
                    <Icon name="keyboard" size={15} className="text-subtle" />
                    Keyboard shortcuts
                  </button>
                </li>
              </ul>
              {isSupabaseConfigured() ? (
                <div className="border-t border-line p-1.5">
                  <button
                    type="button"
                    onClick={() => void signOut()}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-2"
                  >
                    <Icon name="external" size={15} className="text-subtle" />
                    Sign out
                  </button>
                </div>
              ) : null}
              <div className="border-t border-line px-3 py-2">
                <p className="flex items-start gap-1.5 text-[11px] leading-snug text-subtle">
                  <Icon name="shield" size={12} className="mt-0.5 shrink-0 text-ok" />
                  {shared
                    ? 'Candidate data is shared with your team and needs a sign-in.'
                    : 'All candidate data stays on this device.'}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
