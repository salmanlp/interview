import { IndexedDbRepository } from './indexedDb';
import type { Repository } from './repository';
import { isSupabaseConfigured, SupabaseRepository } from './supabase';

/**
 * Picks the storage backend for this build.
 *
 * With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set, the app runs against
 * a shared database and requires a sign-in. Without them it falls back to
 * IndexedDB and stays entirely local and offline — which is still the right
 * mode for a single interviewer who does not want candidate data leaving the
 * machine.
 */
let instance: Repository | null = null;

export function getRepository(): Repository {
  instance ??= isSupabaseConfigured() ? new SupabaseRepository() : new IndexedDbRepository();
  return instance;
}

export function isSharedWorkspace(): boolean {
  return isSupabaseConfigured();
}
