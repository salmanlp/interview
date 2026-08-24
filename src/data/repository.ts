import type {
  AuditEvent,
  BackupFile,
  Candidate,
  ID,
  Interview,
  Question,
  Settings,
  Template,
} from '@/lib/types';

/**
 * The storage contract the UI talks to.
 *
 * Nothing above this line knows about IndexedDB. Swapping in a Supabase /
 * Postgres / Firebase implementation means writing one new class that
 * satisfies `Repository` and handing it to `RepositoryProvider` — no
 * component changes.
 */
export interface Repository {
  readonly name: string;

  init(): Promise<void>;

  candidates: Collection<Candidate>;
  interviews: Collection<Interview>;
  templates: Collection<Template>;
  questions: Collection<Question>;
  audit: Collection<AuditEvent>;

  getSettings(): Promise<Settings | null>;
  saveSettings(settings: Settings): Promise<Settings>;

  /** Everything, for backup/export. */
  exportAll(): Promise<BackupFile>;
  /** Replaces or merges a backup file. */
  importAll(backup: BackupFile, mode: 'replace' | 'merge'): Promise<void>;
  clearAll(): Promise<void>;
  estimateUsage(): Promise<{ usage: number; quota: number } | null>;
}

export interface Collection<T extends { id: ID }> {
  all(): Promise<T[]>;
  get(id: ID): Promise<T | undefined>;
  put(item: T): Promise<T>;
  putMany(items: T[]): Promise<T[]>;
  remove(id: ID): Promise<void>;
  removeMany(ids: ID[]): Promise<void>;
  clear(): Promise<void>;
}
