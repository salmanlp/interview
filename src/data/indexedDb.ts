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

const DB_NAME = 'interview-assessment';
const DB_VERSION = 1;

export const STORES = {
  candidates: 'candidates',
  interviews: 'interviews',
  templates: 'templates',
  questions: 'questions',
  audit: 'audit',
  settings: 'settings',
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.candidates)) {
        const s = db.createObjectStore(STORES.candidates, { keyPath: 'id' });
        s.createIndex('status', 'status');
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(STORES.interviews)) {
        const s = db.createObjectStore(STORES.interviews, { keyPath: 'id' });
        s.createIndex('candidateId', 'candidateId');
        s.createIndex('status', 'status');
        s.createIndex('startedAt', 'startedAt');
      }
      if (!db.objectStoreNames.contains(STORES.templates)) {
        db.createObjectStore(STORES.templates, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.questions)) {
        const s = db.createObjectStore(STORES.questions, { keyPath: 'id' });
        s.createIndex('category', 'category');
      }
      if (!db.objectStoreNames.contains(STORES.audit)) {
        const s = db.createObjectStore(STORES.audit, { keyPath: 'id' });
        s.createIndex('candidateId', 'candidateId');
        s.createIndex('at', 'at');
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open database'));
    request.onblocked = () => reject(new Error('Database upgrade blocked by another open tab.'));
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

class IdbCollection<T extends { id: ID }> implements Collection<T> {
  private readonly getDb: () => Promise<IDBDatabase>;
  private readonly store: StoreName;

  constructor(getDb: () => Promise<IDBDatabase>, store: StoreName) {
    this.getDb = getDb;
    this.store = store;
  }

  private async tx(mode: IDBTransactionMode) {
    const db = await this.getDb();
    const tx = db.transaction(this.store, mode);
    return { tx, store: tx.objectStore(this.store) };
  }

  async all(): Promise<T[]> {
    const { store } = await this.tx('readonly');
    return promisify(store.getAll() as IDBRequest<T[]>);
  }

  async get(id: ID): Promise<T | undefined> {
    const { store } = await this.tx('readonly');
    return promisify(store.get(id) as IDBRequest<T | undefined>);
  }

  async put(item: T): Promise<T> {
    const { tx, store } = await this.tx('readwrite');
    store.put(item);
    await txDone(tx);
    return item;
  }

  async putMany(items: T[]): Promise<T[]> {
    if (!items.length) return items;
    const { tx, store } = await this.tx('readwrite');
    for (const item of items) store.put(item);
    await txDone(tx);
    return items;
  }

  async remove(id: ID): Promise<void> {
    const { tx, store } = await this.tx('readwrite');
    store.delete(id);
    await txDone(tx);
  }

  async removeMany(ids: ID[]): Promise<void> {
    if (!ids.length) return;
    const { tx, store } = await this.tx('readwrite');
    for (const id of ids) store.delete(id);
    await txDone(tx);
  }

  async clear(): Promise<void> {
    const { tx, store } = await this.tx('readwrite');
    store.clear();
    await txDone(tx);
  }
}

/**
 * IndexedDB-backed repository. All candidate data lives in the browser
 * profile of the machine running the app — nothing is sent anywhere.
 */
export class IndexedDbRepository implements Repository {
  readonly name = 'IndexedDB';
  private db: IDBDatabase | null = null;
  private opening: Promise<IDBDatabase> | null = null;

  private getDb = async (): Promise<IDBDatabase> => {
    if (this.db) return this.db;
    if (!this.opening) {
      this.opening = openDatabase().then((db) => {
        this.db = db;
        db.onversionchange = () => {
          db.close();
          this.db = null;
          this.opening = null;
        };
        return db;
      });
    }
    return this.opening;
  };

  candidates = new IdbCollection<Candidate>(this.getDb, STORES.candidates);
  interviews = new IdbCollection<Interview>(this.getDb, STORES.interviews);
  templates = new IdbCollection<Template>(this.getDb, STORES.templates);
  questions = new IdbCollection<Question>(this.getDb, STORES.questions);
  audit = new IdbCollection<AuditEvent>(this.getDb, STORES.audit);

  private settingsStore = new IdbCollection<Settings>(this.getDb, STORES.settings);

  async init(): Promise<void> {
    await this.getDb();
  }

  async getSettings(): Promise<Settings | null> {
    return (await this.settingsStore.get('settings')) ?? null;
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    return this.settingsStore.put(settings);
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
      version: DB_VERSION,
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
    await Promise.all([
      this.candidates.putMany(backup.candidates ?? []),
      this.interviews.putMany(backup.interviews ?? []),
      this.templates.putMany(backup.templates ?? []),
      this.questions.putMany(backup.questions ?? []),
      this.audit.putMany(backup.audit ?? []),
    ]);
    if (backup.settings) await this.saveSettings(backup.settings);
  }

  async clearAll(): Promise<void> {
    await Promise.all([
      this.candidates.clear(),
      this.interviews.clear(),
      this.templates.clear(),
      this.questions.clear(),
      this.audit.clear(),
    ]);
  }

  async estimateUsage(): Promise<{ usage: number; quota: number } | null> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  }
}
