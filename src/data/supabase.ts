import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
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
import { now } from '@/lib/utils';
import type { Collection, Repository } from './repository';

/**
 * Supabase-backed repository — one shared workspace that every signed-in
 * interviewer reads and writes.
 *
 * Each table stores the application object verbatim in a jsonb `data` column,
 * so the domain types stay the single source of truth and adding a field needs
 * no migration. Row-level security means the anon key alone reveals nothing;
 * a session is required for every read.
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when this build is pointed at a shared database rather than local storage. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured for this build.');
  }
  client ??= createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

type TableName = 'candidates' | 'interviews' | 'templates' | 'questions' | 'audit';

/** Turns a PostgrestError into something worth showing a person. */
function fail(action: string, error: { message: string; code?: string } | null): never {
  const detail = error?.message ?? 'unknown error';
  if (error?.code === 'PGRST301' || /JWT|not authenticated/i.test(detail)) {
    throw new Error(`Your session has expired. Sign in again to ${action}.`);
  }
  throw new Error(`Could not ${action}: ${detail}`);
}

class SupabaseCollection<T extends { id: ID }> implements Collection<T> {
  private readonly table: TableName;

  constructor(table: TableName) {
    this.table = table;
  }

  private get db() {
    return getSupabaseClient().from(this.table);
  }

  async all(): Promise<T[]> {
    // Supabase caps a request at 1000 rows; page until the table is drained.
    const pageSize = 1000;
    const rows: T[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.db
        .select('data')
        .range(from, from + pageSize - 1);
      if (error) fail(`load ${this.table}`, error);
      const batch = (data ?? []).map((row) => (row as { data: T }).data);
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }
    return rows;
  }

  async get(id: ID): Promise<T | undefined> {
    const { data, error } = await this.db.select('data').eq('id', id).maybeSingle();
    if (error) fail(`load ${this.table}`, error);
    return (data as { data: T } | null)?.data;
  }

  async put(item: T): Promise<T> {
    const { error } = await this.db.upsert({ id: item.id, data: item }, { onConflict: 'id' });
    if (error) fail(`save ${this.table}`, error);
    return item;
  }

  async putMany(items: T[]): Promise<T[]> {
    if (!items.length) return items;
    // Chunked so a large import does not exceed the request body limit.
    for (let i = 0; i < items.length; i += 500) {
      const chunk = items.slice(i, i + 500).map((item) => ({ id: item.id, data: item }));
      const { error } = await this.db.upsert(chunk, { onConflict: 'id' });
      if (error) fail(`save ${this.table}`, error);
    }
    return items;
  }

  async remove(id: ID): Promise<void> {
    const { error } = await this.db.delete().eq('id', id);
    if (error) fail(`delete from ${this.table}`, error);
  }

  async removeMany(ids: ID[]): Promise<void> {
    if (!ids.length) return;
    for (let i = 0; i < ids.length; i += 500) {
      const { error } = await this.db.delete().in('id', ids.slice(i, i + 500));
      if (error) fail(`delete from ${this.table}`, error);
    }
  }

  async clear(): Promise<void> {
    // `neq` on a value no id can take deletes every row while satisfying
    // PostgREST's requirement that a delete be filtered.
    const { error } = await this.db.delete().neq('id', '__never__');
    if (error) fail(`clear ${this.table}`, error);
  }
}

export class SupabaseRepository implements Repository {
  readonly name = 'Supabase';

  candidates = new SupabaseCollection<Candidate>('candidates');
  interviews = new SupabaseCollection<Interview>('interviews');
  templates = new SupabaseCollection<Template>('templates');
  questions = new SupabaseCollection<Question>('questions');
  audit = new SupabaseCollection<AuditEvent>('audit');

  async init(): Promise<void> {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) throw new Error(`Could not reach the database: ${error.message}`);
    if (!data.session) throw new Error('Not signed in.');
  }

  private async userId(): Promise<string> {
    const { data } = await getSupabaseClient().auth.getUser();
    if (!data.user) throw new Error('Not signed in.');
    return data.user.id;
  }

  async getSettings(): Promise<Settings | null> {
    const { data, error } = await getSupabaseClient()
      .from('settings')
      .select('data')
      .eq('user_id', await this.userId())
      .maybeSingle();
    if (error) fail('load your settings', error);
    return (data as { data: Settings } | null)?.data ?? null;
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    const { error } = await getSupabaseClient()
      .from('settings')
      .upsert({ user_id: await this.userId(), data: settings }, { onConflict: 'user_id' });
    if (error) fail('save your settings', error);
    return settings;
  }

  async exportAll(): Promise<BackupFile> {
    const [candidates, interviews, templates, questions, audit, settings] = await Promise.all([
      this.candidates.all(),
      this.interviews.all(),
      this.templates.all(),
      this.questions.all(),
      this.audit.all(),
      this.getSettings(),
    ]);
    return {
      format: 'interview-assessment-backup',
      version: 1,
      exportedAt: now(),
      candidates,
      interviews,
      templates,
      questions,
      audit,
      settings,
    };
  }

  async importAll(backup: BackupFile, mode: 'replace' | 'merge'): Promise<void> {
    if (mode === 'replace') await this.clearAll();
    await this.candidates.putMany(backup.candidates ?? []);
    await this.interviews.putMany(backup.interviews ?? []);
    await this.templates.putMany(backup.templates ?? []);
    await this.questions.putMany(backup.questions ?? []);
    await this.audit.putMany(backup.audit ?? []);
    if (backup.settings) await this.saveSettings(backup.settings);
  }

  async clearAll(): Promise<void> {
    // Sequential on purpose: interviews reference candidates, and a shared
    // workspace should not be left half-wiped if one statement fails.
    await this.interviews.clear();
    await this.audit.clear();
    await this.candidates.clear();
    await this.templates.clear();
    await this.questions.clear();
  }

  async estimateUsage(): Promise<{ usage: number; quota: number } | null> {
    // Storage is the database's concern, not the browser's.
    return null;
  }
}

/* ------------------------------------------------------------------- auth */

export async function signIn(email: string, password: string): Promise<void> {
  let error;
  try {
    ({ error } = await getSupabaseClient().auth.signInWithPassword({ email, password }));
  } catch (thrown) {
    // The client throws rather than returning an error when the request never
    // reaches Supabase at all.
    throw new Error(networkMessage(thrown));
  }
  if (!error) return;

  if (/invalid login/i.test(error.message)) {
    throw new Error('That email and password do not match an account.');
  }
  if (/email not confirmed/i.test(error.message)) {
    throw new Error('This account still needs its email confirmed.');
  }
  if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
    throw new Error(networkMessage(error));
  }
  throw new Error(error.message);
}

/** "Failed to fetch" tells a person nothing; name the likely causes instead. */
function networkMessage(_cause: unknown): string {
  return (
    'Could not reach the database. Check your connection, and that this site is ' +
    'configured with the right Supabase project URL.'
  );
}

export async function signOut(): Promise<void> {
  await getSupabaseClient().auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session;
}

export function onAuthChange(handler: (session: Session | null) => void): () => void {
  const { data } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
    handler(session);
  });
  return () => data.subscription.unsubscribe();
}
