import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { cx } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { GlobalSearch } from './GlobalSearch';
import { ShortcutsModal } from './ShortcutsModal';
import { MOBILE_NAV } from './navigation';
import { ResumeBanner } from '@/components/interview/ResumeBanner';

const SIDEBAR_KEY = 'iaa.sidebar-collapsed';

export function AppShell() {
  const { candidates, interviews } = useAppStore();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (!typing && event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const counts = useMemo(
    () => ({
      '/candidates': candidates.filter((c) => !c.archived).length,
      '/interviews': interviews.length,
    }),
    [candidates, interviews],
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <a
        href="#main-content"
        className="sr-only-focusable fixed left-4 top-4 z-[70] rounded-lg bg-brand px-4 py-2 text-sm font-medium text-on-brand shadow-pop"
      >
        Skip to main content
      </a>

      <div className="hidden shrink-0 lg:block no-print">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} counts={counts} />
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden no-print">
          <div
            className="absolute inset-0 animate-fade-in"
            style={{ background: 'var(--overlay)' }}
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64 animate-slide-in shadow-pop">
            <Sidebar
              drawer
              collapsed={false}
              onToggle={() => setMobileNavOpen(false)}
              counts={counts}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onOpenSearch={() => setSearchOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
        />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto scrollbar-thin pb-16 lg:pb-0"
        >
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
            <ResumeBanner />
            <Outlet />
          </div>
        </main>

        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 backdrop-blur-md lg:hidden no-print"
        >
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium transition-colors',
                  isActive ? 'text-brand' : 'text-muted',
                )
              }
            >
              <Icon name={item.icon} size={19} />
              {item.short}
            </NavLink>
          ))}
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
