import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { IndexedDbRepository } from '@/data/indexedDb';
import type { Repository } from '@/data/repository';
import { DEFAULT_SCORING } from '@/lib/scoring';
import { buildDemoData, DEMO_CANDIDATE_IDS } from '@/lib/seed/demo';
import { seedQuestions } from '@/lib/seed/questions';
import { DEFAULT_TEMPLATE_ID, seedTemplates } from '@/lib/seed/template';
import type {
  AuditEvent,
  AuditType,
  BackupFile,
  Candidate,
  ID,
  Interview,
  Question,
  Settings,
  Template,
  ThemePreference,
} from '@/lib/types';
import { now, uid } from '@/lib/utils';
import { useToast } from './ToastProvider';

export const THEME_STORAGE_KEY = 'iaa.theme';

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  interviewerName: 'Salman Khan',
  interviewerRole: 'Design Lead',
  defaultDurationMinutes: 30,
  warningMinutes: 5,
  criticalMinutes: 1,
  autosaveMs: 1200,
  scoring: DEFAULT_SCORING,
  theme: 'system',
  density: 'comfortable',
  demoDataLoaded: false,
  showKeyboardHints: true,
  updatedAt: now(),
};

export type SaveState = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface AppStoreValue {
  ready: boolean;
  error: string | null;
  repository: Repository;

  candidates: Candidate[];
  interviews: Interview[];
  templates: Template[];
  questions: Question[];
  audit: AuditEvent[];
  settings: Settings;

  saveState: SaveState;
  online: boolean;
  lastSavedAt: string | null;

  /* Candidates */
  saveCandidate: (candidate: Candidate, options?: { audit?: string }) => Promise<Candidate>;
  deleteCandidate: (id: ID) => Promise<void>;
  archiveCandidate: (id: ID, archived: boolean) => Promise<void>;

  /* Interviews */
  saveInterview: (interview: Interview, options?: { silent?: boolean }) => Promise<Interview>;
  deleteInterview: (id: ID) => Promise<void>;

  /* Templates & questions */
  saveTemplate: (template: Template) => Promise<Template>;
  deleteTemplate: (id: ID) => Promise<void>;
  saveQuestion: (question: Question) => Promise<Question>;
  deleteQuestion: (id: ID) => Promise<void>;

  /* Settings & theme */
  saveSettings: (settings: Settings) => Promise<Settings>;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: 'light' | 'dark';

  /* Audit */
  logEvent: (
    type: AuditType,
    message: string,
    refs?: { candidateId?: ID | null; interviewId?: ID | null },
  ) => Promise<void>;

  /* Data management */
  loadDemoData: () => Promise<void>;
  clearDemoData: () => Promise<void>;
  importBackup: (backup: BackupFile, mode: 'replace' | 'merge') => Promise<void>;
  exportBackup: () => Promise<BackupFile>;
  clearAllData: () => Promise<void>;
  storageUsage: { usage: number; quota: number } | null;
  refreshStorageUsage: () => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

const repository: Repository = new IndexedDbRepository();

function readStoredTheme(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'system';
  const value = localStorage.getItem(THEME_STORAGE_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

function applyTheme(theme: ThemePreference): 'light' | 'dark' {
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  return dark ? 'dark' : 'light';
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [storageUsage, setStorageUsage] = useState<{ usage: number; quota: number } | null>(null);

  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    typeof document === 'undefined' ? 'light' : document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------------------------------------------------ bootstrap */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await repository.init();
        const [c, i, t, q, a, s] = await Promise.all([
          repository.candidates.all(),
          repository.interviews.all(),
          repository.templates.all(),
          repository.questions.all(),
          repository.audit.all(),
          repository.getSettings(),
        ]);
        if (cancelled) return;

        let seededQuestions = q;
        let seededTemplates = t;

        // First run — install the question bank and the default template.
        if (!q.length) {
          seededQuestions = seedQuestions();
          await repository.questions.putMany(seededQuestions);
        }
        if (!t.length) {
          seededTemplates = seedTemplates();
          await repository.templates.putMany(seededTemplates);
        }

        const nextSettings: Settings = s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS };
        if (!s) await repository.saveSettings(nextSettings);

        setCandidates(c);
        setInterviews(i);
        setTemplates(seededTemplates);
        setQuestions(seededQuestions);
        setAudit(a);
        setSettings(nextSettings);
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error
            ? e.message
            : 'Could not open local storage. Private browsing can block IndexedDB.',
        );
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------- theme */
  useEffect(() => {
    setResolvedTheme(applyTheme(theme));
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolvedTheme(applyTheme('system'));
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  /* --------------------------------------------------------------- online */
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const markSaved = useCallback(() => {
    setLastSavedAt(now());
    setSaveState('saved');
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaveState('idle'), 2500);
  }, []);

  const withSave = useCallback(
    async <T,>(fn: () => Promise<T>, silent = false): Promise<T> => {
      if (!silent) setSaveState('saving');
      try {
        const result = await fn();
        if (!silent) markSaved();
        return result;
      } catch (e) {
        setSaveState('error');
        toast.error('Could not save', e instanceof Error ? e.message : 'Unknown storage error.');
        throw e;
      }
    },
    [markSaved, toast],
  );

  const logEvent = useCallback<AppStoreValue['logEvent']>(
    async (type, message, refs) => {
      const event: AuditEvent = {
        id: uid('aud'),
        candidateId: refs?.candidateId ?? null,
        interviewId: refs?.interviewId ?? null,
        type,
        message,
        actor: settings.interviewerName,
        at: now(),
      };
      await repository.audit.put(event);
      setAudit((prev) => [...prev, event]);
    },
    [settings.interviewerName],
  );

  /* ----------------------------------------------------------- candidates */
  const saveCandidate = useCallback<AppStoreValue['saveCandidate']>(
    async (candidate) => {
      const existing = candidates.find((c) => c.id === candidate.id);
      const next: Candidate = { ...candidate, updatedAt: now() };
      await withSave(() => repository.candidates.put(next));
      setCandidates((prev) => {
        const idx = prev.findIndex((c) => c.id === next.id);
        if (idx === -1) return [...prev, next];
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      });
      await logEvent(
        existing ? 'candidate_updated' : 'candidate_created',
        existing ? `Candidate details updated.` : `${next.name} added as a candidate for ${next.position}.`,
        { candidateId: next.id },
      );
      return next;
    },
    [candidates, logEvent, withSave],
  );

  const deleteCandidate = useCallback<AppStoreValue['deleteCandidate']>(
    async (id) => {
      const related = interviews.filter((i) => i.candidateId === id).map((i) => i.id);
      await withSave(async () => {
        await repository.candidates.remove(id);
        await repository.interviews.removeMany(related);
        await repository.audit.removeMany(
          audit.filter((a) => a.candidateId === id).map((a) => a.id),
        );
      });
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      setInterviews((prev) => prev.filter((i) => i.candidateId !== id));
      setAudit((prev) => prev.filter((a) => a.candidateId !== id));
    },
    [audit, interviews, withSave],
  );

  const archiveCandidate = useCallback<AppStoreValue['archiveCandidate']>(
    async (id, archived) => {
      const candidate = candidates.find((c) => c.id === id);
      if (!candidate) return;
      const next = { ...candidate, archived, updatedAt: now() };
      await withSave(() => repository.candidates.put(next));
      setCandidates((prev) => prev.map((c) => (c.id === id ? next : c)));
      await logEvent('candidate_archived', archived ? 'Candidate archived.' : 'Candidate restored from archive.', {
        candidateId: id,
      });
    },
    [candidates, logEvent, withSave],
  );

  /* ----------------------------------------------------------- interviews */
  const saveInterview = useCallback<AppStoreValue['saveInterview']>(
    async (interview, options) => {
      const next: Interview = { ...interview, updatedAt: now() };
      await withSave(() => repository.interviews.put(next), options?.silent);
      setInterviews((prev) => {
        const idx = prev.findIndex((i) => i.id === next.id);
        if (idx === -1) return [...prev, next];
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      });
      return next;
    },
    [withSave],
  );

  const deleteInterview = useCallback<AppStoreValue['deleteInterview']>(
    async (id) => {
      await withSave(() => repository.interviews.remove(id));
      setInterviews((prev) => prev.filter((i) => i.id !== id));
    },
    [withSave],
  );

  /* ---------------------------------------------------- templates & bank */
  const saveTemplate = useCallback<AppStoreValue['saveTemplate']>(
    async (template) => {
      const next = { ...template, updatedAt: now() };
      await withSave(() => repository.templates.put(next));
      setTemplates((prev) => {
        const idx = prev.findIndex((t) => t.id === next.id);
        if (idx === -1) return [...prev, next];
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      });
      return next;
    },
    [withSave],
  );

  const deleteTemplate = useCallback<AppStoreValue['deleteTemplate']>(
    async (id) => {
      await withSave(() => repository.templates.remove(id));
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    },
    [withSave],
  );

  const saveQuestion = useCallback<AppStoreValue['saveQuestion']>(
    async (question) => {
      const next = { ...question, updatedAt: now() };
      await withSave(() => repository.questions.put(next));
      setQuestions((prev) => {
        const idx = prev.findIndex((q) => q.id === next.id);
        if (idx === -1) return [...prev, next];
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      });
      return next;
    },
    [withSave],
  );

  const deleteQuestion = useCallback<AppStoreValue['deleteQuestion']>(
    async (id) => {
      await withSave(async () => {
        await repository.questions.remove(id);
        // Keep templates consistent — a deleted question cannot stay referenced.
        const affected = templates
          .filter((t) => t.sections.some((s) => s.questions.some((q) => q.questionId === id)))
          .map((t) => ({
            ...t,
            sections: t.sections.map((s) => ({
              ...s,
              questions: s.questions.filter((q) => q.questionId !== id),
            })),
            updatedAt: now(),
          }));
        if (affected.length) {
          await repository.templates.putMany(affected);
          setTemplates((prev) => prev.map((t) => affected.find((a) => a.id === t.id) ?? t));
        }
      });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    },
    [templates, withSave],
  );

  /* ------------------------------------------------------------- settings */
  const saveSettings = useCallback<AppStoreValue['saveSettings']>(
    async (nextSettings) => {
      const next = { ...nextSettings, updatedAt: now() };
      await withSave(() => repository.saveSettings(next));
      setSettings(next);
      return next;
    },
    [withSave],
  );

  const setTheme = useCallback(
    (nextTheme: ThemePreference) => {
      setThemeState(nextTheme);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        /* storage may be unavailable in private mode — theme still applies */
      }
      setSettings((prev) => {
        const next = { ...prev, theme: nextTheme, updatedAt: now() };
        void repository.saveSettings(next).catch(() => undefined);
        return next;
      });
    },
    [],
  );

  /* --------------------------------------------------------- data actions */
  const refreshStorageUsage = useCallback(async () => {
    setStorageUsage(await repository.estimateUsage());
  }, []);

  const loadDemoData = useCallback(async () => {
    const template = templates.find((t) => t.id === DEFAULT_TEMPLATE_ID) ?? templates[0];
    if (!template) throw new Error('No interview template available to build demo data from.');
    const demo = buildDemoData(questions, template);
    await withSave(async () => {
      await repository.candidates.putMany(demo.candidates);
      await repository.interviews.putMany(demo.interviews);
      await repository.audit.putMany(demo.audit);
      await repository.saveSettings({ ...settings, demoDataLoaded: true, updatedAt: now() });
    });
    setCandidates((prev) => [
      ...prev.filter((c) => !demo.candidates.some((d) => d.id === c.id)),
      ...demo.candidates,
    ]);
    setInterviews((prev) => [
      ...prev.filter((i) => !demo.interviews.some((d) => d.id === i.id)),
      ...demo.interviews,
    ]);
    setAudit((prev) => [...prev, ...demo.audit]);
    setSettings((prev) => ({ ...prev, demoDataLoaded: true }));
  }, [questions, settings, templates, withSave]);

  const clearDemoData = useCallback(async () => {
    const demoIds = new Set(DEMO_CANDIDATE_IDS);
    const interviewIds = interviews.filter((i) => demoIds.has(i.candidateId)).map((i) => i.id);
    const auditIds = audit.filter((a) => a.candidateId && demoIds.has(a.candidateId)).map((a) => a.id);
    await withSave(async () => {
      await repository.candidates.removeMany([...demoIds]);
      await repository.interviews.removeMany(interviewIds);
      await repository.audit.removeMany(auditIds);
      await repository.saveSettings({ ...settings, demoDataLoaded: false, updatedAt: now() });
    });
    setCandidates((prev) => prev.filter((c) => !demoIds.has(c.id)));
    setInterviews((prev) => prev.filter((i) => !demoIds.has(i.candidateId)));
    setAudit((prev) => prev.filter((a) => !a.candidateId || !demoIds.has(a.candidateId)));
    setSettings((prev) => ({ ...prev, demoDataLoaded: false }));
  }, [audit, interviews, settings, withSave]);

  const exportBackup = useCallback(() => repository.exportAll(), []);

  const importBackup = useCallback<AppStoreValue['importBackup']>(
    async (backup, mode) => {
      await withSave(() => repository.importAll(backup, mode));
      const [c, i, t, q, a, s] = await Promise.all([
        repository.candidates.all(),
        repository.interviews.all(),
        repository.templates.all(),
        repository.questions.all(),
        repository.audit.all(),
        repository.getSettings(),
      ]);
      setCandidates(c);
      setInterviews(i);
      setTemplates(t);
      setQuestions(q);
      setAudit(a);
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
      await logEvent('data_imported', `Backup imported (${mode}) — ${c.length} candidates, ${i.length} interviews.`);
    },
    [logEvent, withSave],
  );

  const clearAllData = useCallback(async () => {
    await withSave(() => repository.clearAll());
    const freshQuestions = seedQuestions();
    const freshTemplates = seedTemplates();
    await repository.questions.putMany(freshQuestions);
    await repository.templates.putMany(freshTemplates);
    const freshSettings = { ...settings, demoDataLoaded: false, updatedAt: now() };
    await repository.saveSettings(freshSettings);
    setCandidates([]);
    setInterviews([]);
    setAudit([]);
    setQuestions(freshQuestions);
    setTemplates(freshTemplates);
    setSettings(freshSettings);
  }, [settings, withSave]);

  const value = useMemo<AppStoreValue>(
    () => ({
      ready,
      error,
      repository,
      candidates,
      interviews,
      templates,
      questions,
      audit,
      settings,
      saveState: online ? saveState : 'offline',
      online,
      lastSavedAt,
      saveCandidate,
      deleteCandidate,
      archiveCandidate,
      saveInterview,
      deleteInterview,
      saveTemplate,
      deleteTemplate,
      saveQuestion,
      deleteQuestion,
      saveSettings,
      setTheme,
      resolvedTheme,
      logEvent,
      loadDemoData,
      clearDemoData,
      importBackup,
      exportBackup,
      clearAllData,
      storageUsage,
      refreshStorageUsage,
    }),
    [
      ready,
      error,
      candidates,
      interviews,
      templates,
      questions,
      audit,
      settings,
      saveState,
      online,
      lastSavedAt,
      saveCandidate,
      deleteCandidate,
      archiveCandidate,
      saveInterview,
      deleteInterview,
      saveTemplate,
      deleteTemplate,
      saveQuestion,
      deleteQuestion,
      saveSettings,
      setTheme,
      resolvedTheme,
      logEvent,
      loadDemoData,
      clearDemoData,
      importBackup,
      exportBackup,
      clearAllData,
      storageUsage,
      refreshStorageUsage,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used inside <AppStoreProvider>');
  return ctx;
}
