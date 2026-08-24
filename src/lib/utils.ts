/** Small, dependency-free helpers used across the app. */

export function uid(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return prefix ? `${prefix}_${rand}` : rand;
}

export function now(): string {
  return new Date().toISOString();
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function round(n: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function mean(values: number[]): number {
  return values.length ? sum(values) / values.length : 0;
}

export function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ||= []).push(item);
  }
  return out;
}

export function sortBy<T>(items: T[], key: (item: T) => number | string, dir: 'asc' | 'desc' = 'asc'): T[] {
  const factor = dir === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = key(a);
    const bv = key(b);
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * factor;
  });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable pastel-free avatar tint derived from a name. */
export function avatarTint(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, opts ?? { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (Math.abs(mins) < 1) return 'just now';
  if (Math.abs(mins) < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** MM:SS, or H:MM:SS past an hour. Negative values render with a leading '+'. */
export function formatClock(ms: number): string {
  const negative = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const body = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  return negative ? `+${body}` : body;
}

export function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return '<1 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${round(bytes / 1024 ** i, 1)} ${units[i]}`;
}

export function pct(value: number, digits = 0): string {
  return `${round(value, digits)}%`;
}

/** Case/diacritic-insensitive contains, used by every search box. */
export function matches(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  const norm = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return norm(haystack).includes(norm(needle));
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  const wrapped = (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => t && clearTimeout(t);
  return wrapped;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const u = new URL(value.startsWith('http') ? value : `https://${value}`);
    return Boolean(u.hostname.includes('.'));
  } catch {
    return false;
  }
}

export function ensureProtocol(value: string): string {
  if (!value) return value;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export interface DownloadFailure {
  code: string;
  message: string;
}

type DownloadErrorHandler = (failure: DownloadFailure) => void;

let downloadErrorHandler: DownloadErrorHandler | null = null;

/** Lets the UI surface a save failure without every call site handling it. */
export function setDownloadErrorHandler(handler: DownloadErrorHandler | null): void {
  downloadErrorHandler = handler;
}

interface SandboxHost {
  use?: (name: string) => Promise<{ save: (r: { filename: string; data: Blob }) => Promise<unknown> } | null>;
}

function saveViaAnchor(content: BlobPart, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Hands a generated file to the user.
 *
 * Normally that is an anchor download. When the app runs inside a sandboxed
 * host that blocks page-initiated downloads, the host's own save API is used
 * instead — so exports keep working in an embedded preview.
 */
export function downloadBlob(content: BlobPart, filename: string, type: string): void {
  const host = (globalThis as { claude?: SandboxHost }).claude;

  if (typeof host?.use === 'function') {
    void (async () => {
      try {
        const downloads = await host.use!('downloads');
        if (!downloads) {
          saveViaAnchor(content, filename, type);
          return;
        }
        await downloads.save({ filename, data: new Blob([content], { type }) });
      } catch (error) {
        const failure = error as Partial<DownloadFailure>;
        downloadErrorHandler?.({
          code: failure?.code ?? 'unavailable',
          message: failure?.message ?? 'The file could not be saved.',
        });
      }
    })();
    return;
  }

  saveViaAnchor(content, filename, type);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'export';
}
