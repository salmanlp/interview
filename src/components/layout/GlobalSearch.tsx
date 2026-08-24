import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { cx, matches } from '@/lib/utils';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Kbd } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Misc';
import { PRIMARY_NAV } from './navigation';

interface Result {
  id: string;
  label: string;
  sublabel: string;
  group: string;
  to: string;
  icon?: IconName;
  avatar?: string;
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { candidates, interviews, templates, questions } = useAppStore();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    if (!open) return [];
    const out: Result[] = [];

    for (const candidate of candidates) {
      if (matches(`${candidate.name} ${candidate.position} ${candidate.email}`, query)) {
        out.push({
          id: candidate.id,
          label: candidate.name,
          sublabel: candidate.position,
          group: 'Candidates',
          to: `/candidates/${candidate.id}`,
          avatar: candidate.name,
        });
      }
    }

    for (const interview of interviews) {
      const candidate = candidates.find((c) => c.id === interview.candidateId);
      const haystack = `${candidate?.name ?? ''} ${interview.roundLabel} ${interview.templateName}`;
      if (query.trim() && matches(haystack, query)) {
        out.push({
          id: interview.id,
          label: `${candidate?.name ?? 'Unknown candidate'} — ${interview.roundLabel}`,
          sublabel: interview.status === 'in_progress' ? 'In progress' : 'Completed',
          group: 'Interviews',
          to: interview.status === 'in_progress' ? `/interviews/${interview.id}` : `/interviews/${interview.id}/review`,
          icon: 'clipboard',
        });
      }
    }

    if (query.trim()) {
      for (const template of templates) {
        if (matches(template.name, query)) {
          out.push({
            id: template.id,
            label: template.name,
            sublabel: `${template.sections.reduce((a, s) => a + s.questions.length, 0)} questions`,
            group: 'Templates',
            to: `/templates/${template.id}`,
            icon: 'layers',
          });
        }
      }
      for (const question of questions) {
        if (matches(question.text, query)) {
          out.push({
            id: question.id,
            label: question.text,
            sublabel: question.category,
            group: 'Questions',
            to: `/questions?q=${encodeURIComponent(question.text.slice(0, 40))}`,
            icon: 'helpCircle',
          });
        }
      }
    }

    for (const item of PRIMARY_NAV) {
      if (matches(item.label, query)) {
        out.push({
          id: item.to,
          label: item.label,
          sublabel: 'Go to page',
          group: 'Navigation',
          to: item.to,
          icon: item.icon,
        });
      }
    }

    return out.slice(0, 24);
  }, [open, query, candidates, interviews, templates, questions]);

  const grouped = useMemo(() => {
    const map = new Map<string, Result[]>();
    for (const result of results) {
      const list = map.get(result.group) ?? [];
      list.push(result);
      map.set(result.group, list);
    }
    return [...map.entries()];
  }, [results]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  if (!open) return null;

  const go = (result: Result) => {
    navigate(result.to);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] no-print">
      <div className="fixed inset-0 animate-fade-in" style={{ background: 'var(--overlay)' }} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-pop animate-pop-in"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Icon name="search" size={17} className="shrink-0 text-subtle" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="global-search-results"
            aria-label="Search candidates, interviews, templates and questions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates, interviews, questions…"
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-subtle"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(results.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter' && results[active]) {
                e.preventDefault();
                go(results[active]);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
          />
          <Kbd>Esc</Kbd>
        </div>

        <ul
          id="global-search-results"
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          className="max-h-[50vh] overflow-y-auto p-2 scrollbar-thin"
        >
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-[13px] text-muted">
              No matches for “{query}”.
            </li>
          ) : (
            grouped.map(([group, items]) => (
              <li key={group}>
                <p className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-subtle">
                  {group}
                </p>
                <ul>
                  {items.map((result) => {
                    const index = results.indexOf(result);
                    const isActive = index === active;
                    return (
                      <li key={`${group}-${result.id}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          data-active={isActive}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => go(result)}
                          className={cx(
                            'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                            isActive ? 'bg-surface-2' : 'hover:bg-surface-2',
                          )}
                        >
                          {result.avatar ? (
                            <Avatar name={result.avatar} size="xs" />
                          ) : (
                            <Icon name={result.icon ?? 'fileText'} size={15} className="shrink-0 text-subtle" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] text-ink">{result.label}</span>
                            <span className="block truncate text-[11.5px] text-muted">{result.sublabel}</span>
                          </span>
                          {isActive ? <Icon name="arrowRight" size={14} className="shrink-0 text-subtle" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-line bg-surface-2/50 px-4 py-2 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> open
          </span>
        </div>
      </div>
    </div>
  );
}
