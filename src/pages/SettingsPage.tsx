import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { buildScale, DEFAULT_SCORING } from '@/lib/scoring';
import { isBackupFile } from '@/lib/exporters';
import type { Settings, ThemePreference } from '@/lib/types';
import { downloadBlob, formatBytes, formatDateTime, round } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, PageHeader } from '@/components/ui/Card';
import { Field, Input, SegmentedControl, Switch, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Tabs } from '@/components/ui/Misc';
import { ConfirmDialog } from '@/components/ui/Modal';
import { ScoreChip } from '@/components/ui/DomainBadges';
import { useToast } from '@/store/ToastProvider';

type Tab = 'interview' | 'scoring' | 'appearance' | 'data';

export function SettingsPage() {
  const {
    settings,
    saveSettings,
    setTheme,
    candidates,
    interviews,
    questions,
    templates,
    audit,
    loadDemoData,
    clearDemoData,
    exportBackup,
    importBackup,
    clearAllData,
    storageUsage,
    refreshStorageUsage,
  } = useAppStore();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'interview');
  const [draft, setDraft] = useState<Settings>(settings);
  const [dirty, setDirty] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(settings);
    setDirty(false);
  }, [settings]);

  useEffect(() => {
    void refreshStorageUsage();
  }, [refreshStorageUsage, candidates.length, interviews.length]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const changeTab = (next: Tab) => {
    setTab(next);
    const nextParams = new URLSearchParams(params);
    nextParams.set('tab', next);
    setParams(nextParams, { replace: true });
  };

  const save = async () => {
    await saveSettings(draft);
    setDirty(false);
    toast.success('Settings saved');
  };

  const handleImport = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isBackupFile(parsed)) {
        toast.error('Not a valid backup', 'Expected a file exported by this app (format: interview-assessment-backup).');
        return;
      }
      await importBackup(parsed, importMode);
      toast.success(
        'Backup imported',
        `${parsed.candidates.length} candidates and ${parsed.interviews.length} interviews restored.`,
      );
    } catch (error) {
      toast.error('Import failed', error instanceof Error ? error.message : 'The file could not be read.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const usagePercent =
    storageUsage && storageUsage.quota ? (storageUsage.usage / storageUsage.quota) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Interview defaults, the scoring scale, appearance and your local data."
        actions={
          tab !== 'data' ? (
            <Button variant="primary" icon="save" onClick={save} disabled={!dirty}>
              {dirty ? 'Save changes' : 'Saved'}
            </Button>
          ) : undefined
        }
      />

      <Tabs
        label="Settings sections"
        value={tab}
        onChange={changeTab}
        tabs={[
          { value: 'interview', label: 'Interview', icon: 'clipboard' },
          { value: 'scoring', label: 'Scoring', icon: 'target' },
          { value: 'appearance', label: 'Appearance', icon: 'sun' },
          { value: 'data', label: 'Data & privacy', icon: 'database' },
        ]}
      />

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-5 max-w-3xl space-y-5">
        {tab === 'interview' ? (
          <>
            <Card>
              <CardHeader title="Interviewer" description="Used as the default on new interviews and in reports." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.interviewerName}
                      onChange={(e) => set('interviewerName', e.target.value)}
                    />
                  )}
                </Field>
                <Field label="Role">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={draft.interviewerRole}
                      onChange={(e) => set('interviewerRole', e.target.value)}
                    />
                  )}
                </Field>
              </div>
            </Card>

            <Card>
              <CardHeader title="Interview defaults" />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Default duration" hint="Minutes">
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="number"
                      min={5}
                      max={240}
                      value={draft.defaultDurationMinutes}
                      onChange={(e) => set('defaultDurationMinutes', Math.max(5, Number(e.target.value)))}
                    />
                  )}
                </Field>
                <Field label="Warning at" hint="Minutes remaining — timer turns amber">
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="number"
                      min={1}
                      max={30}
                      value={draft.warningMinutes}
                      onChange={(e) => set('warningMinutes', Math.max(1, Number(e.target.value)))}
                    />
                  )}
                </Field>
                <Field label="Critical at" hint="Minutes remaining — timer turns red">
                  {({ id, describedBy }) => (
                    <Input
                      id={id}
                      aria-describedby={describedBy}
                      type="number"
                      min={0}
                      max={15}
                      value={draft.criticalMinutes}
                      onChange={(e) => set('criticalMinutes', Math.max(0, Number(e.target.value)))}
                    />
                  )}
                </Field>
              </div>

              <div className="mt-4">
                <Field
                  label="Autosave frequency"
                  hint="How often pending changes are written to IndexedDB during an interview."
                >
                  {({ id, describedBy }) => (
                    <div id={id} aria-describedby={describedBy}>
                      <SegmentedControl
                        label="Autosave frequency"
                        value={String(draft.autosaveMs)}
                        onChange={(value) => set('autosaveMs', Number(value))}
                        options={[
                          { value: '600', label: 'Every 0.6s' },
                          { value: '1200', label: 'Every 1.2s' },
                          { value: '3000', label: 'Every 3s' },
                          { value: '5000', label: 'Every 5s' },
                        ]}
                      />
                    </div>
                  )}
                </Field>
              </div>

              <div className="mt-4 rounded-lg border border-line bg-surface-2 p-3.5">
                <Switch
                  checked={draft.showKeyboardHints}
                  onChange={(value) => set('showKeyboardHints', value)}
                  label="Show keyboard hints"
                  description="Displays shortcut keys next to the interview controls."
                />
              </div>
            </Card>
          </>
        ) : null}

        {tab === 'scoring' ? (
          <>
            <Card>
              <CardHeader
                title="Score scale"
                description="Applied to new interviews. Existing interviews keep the scale they were run with."
              />
              <Field label="Scale maximum">
                {({ id }) => (
                  <div id={id}>
                    <SegmentedControl
                      label="Scale maximum"
                      value={String(draft.scoring.scaleMax)}
                      onChange={(value) => {
                        const max = Number(value);
                        set('scoring', {
                          ...draft.scoring,
                          scaleMax: max,
                          scale: buildScale(max, draft.scoring.scale),
                        });
                      }}
                      options={[3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `1–${n}` }))}
                    />
                  </div>
                )}
              </Field>

              <ul className="mt-4 space-y-3">
                {draft.scoring.scale.map((point, index) => (
                  <li key={point.value} className="rounded-lg border border-line p-3">
                    <div className="mb-2 flex items-center gap-2.5">
                      <ScoreChip score={point.value} scaleMax={draft.scoring.scaleMax} size="lg" />
                      <Input
                        value={point.label}
                        aria-label={`Label for score ${point.value}`}
                        onChange={(e) => {
                          const scale = [...draft.scoring.scale];
                          scale[index] = { ...point, label: e.target.value };
                          set('scoring', { ...draft.scoring, scale });
                        }}
                        className="max-w-48"
                      />
                    </div>
                    <Textarea
                      rows={2}
                      value={point.description}
                      aria-label={`Description for score ${point.value}`}
                      placeholder="What this score means — shown to the interviewer when selecting it."
                      onChange={(e) => {
                        const scale = [...draft.scoring.scale];
                        scale[index] = { ...point, description: e.target.value };
                        set('scoring', { ...draft.scoring, scale });
                      }}
                    />
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader
                title="Recommendation thresholds"
                description="Percentage floors used to turn a weighted score into a recommendation."
              />
              <div className="space-y-3">
                {(
                  [
                    ['strongHire', 'Strong Hire', 'var(--s5)'],
                    ['hire', 'Hire', 'var(--s4)'],
                    ['maybe', 'Further Review', 'var(--s3)'],
                  ] as const
                ).map(([key, label, color]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: color }}
                      aria-hidden="true"
                    />
                    <label htmlFor={`t-${key}`} className="flex-1 text-[13px] text-ink-2">
                      {label} at or above
                    </label>
                    <Input
                      id={`t-${key}`}
                      type="number"
                      min={0}
                      max={100}
                      value={draft.scoring.thresholds[key]}
                      onChange={(e) =>
                        set('scoring', {
                          ...draft.scoring,
                          thresholds: { ...draft.scoring.thresholds, [key]: Number(e.target.value) },
                        })
                      }
                      className="w-24"
                    />
                    <span className="w-4 text-[13px] text-muted">%</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-1">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: 'var(--s1)' }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-[13px] text-muted">
                    Below {draft.scoring.thresholds.maybe}% → No Hire
                  </span>
                </div>
              </div>

              {draft.scoring.thresholds.strongHire <= draft.scoring.thresholds.hire ||
              draft.scoring.thresholds.hire <= draft.scoring.thresholds.maybe ? (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-warn/40 bg-warn-soft/50 p-2.5 text-[12px] text-ink-2">
                  <Icon name="alertTriangle" size={13} className="mt-0.5 shrink-0 text-warn" />
                  Thresholds should descend: Strong Hire &gt; Hire &gt; Further Review. As configured,
                  some bands can never be reached.
                </p>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                icon="refresh"
                className="mt-4"
                onClick={() => set('scoring', DEFAULT_SCORING)}
              >
                Reset to defaults
              </Button>
            </Card>

            <Card>
              <CardHeader
                title="Question weighting"
                description="Weights are set per question in the bank and can be overridden per template."
              />
              <ul className="space-y-2 text-[13px] text-ink-2">
                <li className="flex gap-2.5">
                  <span className="font-mono font-semibold text-ink">1×</span>
                  <span>Standard — definitions and general knowledge.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-mono font-semibold text-ink">2×</span>
                  <span>Important — practical Figma and craft questions.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="font-mono font-semibold text-ink">3×</span>
                  <span>Critical — real-world scenarios that predict on-the-job performance.</span>
                </li>
              </ul>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                The weighted percentage is what drives the recommendation; the raw score is reported
                alongside it so both are visible.
              </p>
            </Card>
          </>
        ) : null}

        {tab === 'appearance' ? (
          <Card>
            <CardHeader title="Theme" description="Applies immediately and is remembered on this device." />
            <SegmentedControl
              label="Theme"
              value={settings.theme}
              onChange={(value) => setTheme(value as ThemePreference)}
              options={[
                { value: 'light', label: 'Light', icon: 'sun' },
                { value: 'dark', label: 'Dark', icon: 'moon' },
                { value: 'system', label: 'System', icon: 'monitor' },
              ]}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-surface p-3.5">
                <p className="text-[12px] font-medium text-muted">Surface</p>
                <div className="mt-2 flex gap-1.5">
                  {['--canvas', '--surface', '--surface-2', '--surface-3', '--line-strong'].map((token) => (
                    <span
                      key={token}
                      className="h-7 flex-1 rounded border border-line"
                      style={{ background: `var(${token})` }}
                      title={token}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-line bg-surface p-3.5">
                <p className="text-[12px] font-medium text-muted">Score states</p>
                <div className="mt-2 flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <span key={score} className="flex-1">
                      <ScoreChip score={score} size="md" />
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-muted">
              Both themes use the same semantic tokens, so score colours, status badges and charts stay
              consistent and keep their contrast in either mode.
            </p>
          </Card>
        ) : null}

        {tab === 'data' ? (
          <>
            <Card>
              <CardHeader
                title="Where your data lives"
                description="This app has no backend. Everything is written to IndexedDB in this browser profile."
              />
              <div className="rounded-lg border border-ok/30 bg-ok-soft/40 p-3.5">
                <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-2">
                  <Icon name="shield" size={15} className="mt-0.5 shrink-0 text-ok" />
                  <span>
                    Candidate names, contact details and interview notes never leave this device. There
                    is no telemetry, no analytics and no network request carrying candidate data.
                    Clearing your browser's site data deletes everything — export a backup first.
                  </span>
                </p>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Usage label="Candidates" value={candidates.length} />
                <Usage label="Interviews" value={interviews.length} />
                <Usage label="Templates" value={templates.length} />
                <Usage label="Questions" value={questions.length} />
                <Usage label="Audit events" value={audit.length} />
                <Usage
                  label="Storage used"
                  value={storageUsage ? formatBytes(storageUsage.usage) : '—'}
                />
              </dl>

              {storageUsage?.quota ? (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.max(0.5, Math.min(100, usagePercent))}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-subtle tabular">
                    {formatBytes(storageUsage.usage)} of {formatBytes(storageUsage.quota)} available (
                    {round(usagePercent, 1)}%). Settings last saved {formatDateTime(settings.updatedAt)}.
                  </p>
                </div>
              ) : null}
            </Card>

            <Card>
              <CardHeader
                title="Backup and restore"
                description="A full JSON export you can archive or move to another machine."
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  icon="download"
                  loading={busy}
                  onClick={async () => {
                    const backup = await exportBackup();
                    downloadBlob(
                      JSON.stringify(backup, null, 2),
                      `interview-assessment-backup-${new Date().toISOString().slice(0, 10)}.json`,
                      'application/json',
                    );
                    toast.success('Backup exported', 'Everything, including settings and audit trail.');
                  }}
                >
                  Export all data
                </Button>

                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleImport(file);
                  }}
                />
                <Button
                  variant="secondary"
                  icon="upload"
                  loading={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  Import backup
                </Button>

                <SegmentedControl
                  label="Import mode"
                  value={importMode}
                  onChange={setImportMode}
                  options={[
                    { value: 'merge', label: 'Merge' },
                    { value: 'replace', label: 'Replace all' },
                  ]}
                />
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                <strong className="font-medium text-ink-2">Merge</strong> adds the backup's records and
                overwrites any with the same id.{' '}
                <strong className="font-medium text-ink-2">Replace all</strong> wipes the current
                database first — use it when restoring onto a fresh machine.
              </p>
            </Card>

            <Card>
              <CardHeader
                title="Demo data"
                description="Seven realistic candidates with varied scores, skill profiles and one interview still in progress."
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  icon="database"
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await loadDemoData();
                      toast.success('Demo data loaded');
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Load demo data
                </Button>
                <Button
                  variant="ghost"
                  icon="trash"
                  disabled={!settings.demoDataLoaded}
                  onClick={async () => {
                    await clearDemoData();
                    toast.success('Demo data cleared', 'Your own candidates were left untouched.');
                  }}
                >
                  Clear demo data
                </Button>
              </div>
              <p className="mt-3 text-[12px] text-muted">
                {settings.demoDataLoaded
                  ? 'Demo data is currently loaded. Clearing it removes only the demo candidates.'
                  : 'No demo data loaded.'}
              </p>
            </Card>

            <Card className="border-danger/30">
              <CardHeader
                title="Delete all data"
                description="Permanently removes every candidate, interview, note and audit entry from this browser."
              />
              <Button variant="danger" icon="trash" onClick={() => setClearOpen(true)}>
                Delete all data
              </Button>
              <p className="mt-3 text-[12px] text-muted">
                The question bank and the default template are reinstalled afterwards so the app stays
                usable. This cannot be undone — export a backup first.
              </p>
            </Card>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={async () => {
          await clearAllData();
          setClearOpen(false);
          toast.success('All data deleted', 'The question bank and default template were reinstalled.');
        }}
        title="Delete all data?"
        description={`${candidates.length} candidates, ${interviews.length} interviews and ${audit.length} audit entries will be permanently erased from this browser. This cannot be undone.`}
        confirmLabel="Delete everything"
        tone="danger"
      >
        <Button
          variant="secondary"
          size="sm"
          icon="download"
          onClick={async () => {
            const backup = await exportBackup();
            downloadBlob(
              JSON.stringify(backup, null, 2),
              `interview-assessment-backup-${new Date().toISOString().slice(0, 10)}.json`,
              'application/json',
            );
            toast.success('Backup exported');
          }}
        >
          Export a backup first
        </Button>
      </ConfirmDialog>
    </>
  );
}

function Usage({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2/50 p-3">
      <dt className="text-[11.5px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[18px] font-semibold text-ink tabular">{value}</dd>
    </div>
  );
}
