import { NavLink } from 'react-router-dom';
import { cx } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { PRIMARY_NAV } from './navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  counts: Record<string, number>;
  /** Mobile drawer mode. */
  drawer?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggle, counts, drawer, onNavigate }: SidebarProps) {
  return (
    <nav
      aria-label="Main"
      className={cx(
        'flex h-full flex-col border-r border-line bg-surface transition-[width] duration-200',
        collapsed && !drawer ? 'w-16' : 'w-60',
      )}
    >
      <div className={cx('flex h-14 items-center gap-2 border-b border-line px-3', collapsed && !drawer && 'justify-center px-0')}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-on-brand">
          <Icon name="logo" size={17} strokeWidth={2} />
        </span>
        {!collapsed || drawer ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-tight text-ink">Interview Assessment</p>
            <p className="truncate text-[11px] leading-tight text-muted">UI/UX Designer hiring</p>
          </div>
        ) : null}
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
        {PRIMARY_NAV.map((item) => {
          const count = counts[item.to];
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={collapsed && !drawer ? item.label : undefined}
                className={({ isActive }) =>
                  cx(
                    'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150',
                    collapsed && !drawer && 'justify-center px-0',
                    isActive
                      ? 'bg-surface-2 text-ink'
                      : 'text-muted hover:bg-surface-2 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <span
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-brand"
                        aria-hidden="true"
                      />
                    ) : null}
                    <Icon name={item.icon} size={17} className="shrink-0" />
                    {!collapsed || drawer ? (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {count ? (
                          <Badge tone="neutral" size="sm" className="tabular">
                            {count}
                          </Badge>
                        ) : null}
                      </>
                    ) : null}
                  </>
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={onToggle}
          className={cx(
            'hidden w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink lg:flex',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name="panelLeft" size={17} className="shrink-0" />
          {!collapsed ? <span>Collapse</span> : null}
        </button>
        {!collapsed || drawer ? (
          <p className="mt-1 flex items-center gap-1.5 px-2.5 pb-1 text-[11px] leading-snug text-subtle">
            <Icon name="database" size={12} className="shrink-0" />
            Stored in this browser
          </p>
        ) : null}
      </div>
    </nav>
  );
}
