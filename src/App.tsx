import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppStore } from '@/store/AppStore';
import { useToast } from '@/store/ToastProvider';
import { setDownloadErrorHandler } from '@/lib/utils';
import { AppShell } from '@/components/layout/AppShell';
import { Toaster } from '@/components/ui/Toaster';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, LoadingState } from '@/components/ui/Misc';
import { LinkButton } from '@/components/ui/Button';

/* The screens an interviewer reaches first are bundled eagerly. */
import { DashboardPage } from '@/pages/DashboardPage';
import { CandidatesPage } from '@/pages/CandidatesPage';
import { CandidateProfilePage } from '@/pages/CandidateProfilePage';
import { InterviewsPage } from '@/pages/InterviewsPage';
import { InterviewSetupPage } from '@/pages/InterviewSetupPage';
import { InterviewWorkspacePage } from '@/pages/InterviewWorkspacePage';
import { InterviewReviewPage } from '@/pages/InterviewReviewPage';

/* Admin and analysis screens load on demand — they are visited far less often. */
const ReportPage = lazy(() => import('@/pages/ReportPage').then((m) => ({ default: m.ReportPage })));
const TemplatesPage = lazy(() =>
  import('@/pages/TemplatesPage').then((m) => ({ default: m.TemplatesPage })),
);
const TemplateBuilderPage = lazy(() =>
  import('@/pages/TemplateBuilderPage').then((m) => ({ default: m.TemplateBuilderPage })),
);
const QuestionBankPage = lazy(() =>
  import('@/pages/QuestionBankPage').then((m) => ({ default: m.QuestionBankPage })),
);
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ComparePage = lazy(() => import('@/pages/ComparePage').then((m) => ({ default: m.ComparePage })));
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

function BootScreen({ error }: { error: string | null }) {
  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas p-6">
        <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-2 shadow-card">
          <EmptyState
            icon="alertTriangle"
            title="Local storage is unavailable"
            description={
              <>
                {error}
                <br />
                <br />
                This app keeps every candidate record in your browser. Private/incognito windows and
                strict privacy settings can block IndexedDB — try a normal window, or enable site data
                for this page.
              </>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-on-brand">
          <Icon name="logo" size={22} strokeWidth={2} />
        </span>
        <p className="text-[13px] text-muted">Opening your local interview database…</p>
        <div className="w-72">
          <LoadingState />
        </div>
      </div>
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState label="Loading page…" />}>{children}</Suspense>;
}

function NotFound() {
  return (
    <EmptyState
      icon="alertCircle"
      title="Page not found"
      description="The page you were looking for does not exist."
      action={
        <LinkButton to="/" variant="primary" icon="dashboard">
          Back to dashboard
        </LinkButton>
      }
    />
  );
}

const DOWNLOAD_MESSAGES: Record<string, string> = {
  declined: 'The save was cancelled.',
  extension_not_enabled: 'This preview cannot save that file type. Run the app locally to export it.',
  rejected_extension: 'This preview cannot save that file type. Run the app locally to export it.',
  too_large: 'The file is too large for this preview to save.',
  rate_limited: 'Another save is already in progress — try again in a moment.',
};

export function App() {
  const { ready, error } = useAppStore();
  const toast = useToast();

  // Exports run through the host's save API when the app is embedded in a
  // sandbox that blocks page-initiated downloads; report anything it refuses.
  useEffect(() => {
    setDownloadErrorHandler(({ code, message }) => {
      if (code === 'declined') {
        toast.info('Save cancelled');
        return;
      }
      toast.error('Could not save the file', DOWNLOAD_MESSAGES[code] ?? message);
    });
    return () => setDownloadErrorHandler(null);
  }, [toast]);

  if (!ready || error) {
    return (
      <>
        <BootScreen error={error} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <Routes>
        {/* The interview workspace runs full-screen, outside the app chrome. */}
        <Route path="/interviews/:id" element={<InterviewWorkspacePage />} />

        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/candidates/:id" element={<CandidateProfilePage />} />
          <Route path="/interviews" element={<InterviewsPage />} />
          <Route path="/interviews/new" element={<InterviewSetupPage />} />
          <Route path="/interviews/:id/review" element={<InterviewReviewPage />} />
          <Route path="/interviews/:id/report" element={<Lazy><ReportPage /></Lazy>} />
          <Route path="/templates" element={<Lazy><TemplatesPage /></Lazy>} />
          <Route path="/templates/:id" element={<Lazy><TemplateBuilderPage /></Lazy>} />
          <Route path="/questions" element={<Lazy><QuestionBankPage /></Lazy>} />
          <Route path="/reports" element={<Lazy><ReportsPage /></Lazy>} />
          <Route path="/compare" element={<Lazy><ComparePage /></Lazy>} />
          <Route path="/settings" element={<Lazy><SettingsPage /></Lazy>} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
