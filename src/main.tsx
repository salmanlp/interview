import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { App } from './App';
import { AppStoreProvider } from './store/AppStore';
import { ToastProvider } from './store/ToastProvider';
import { AuthGate } from './store/AuthGate';
import './index.css';

/**
 * Hash routing is used for static single-file builds, where there is no server
 * to rewrite deep links back to index.html. Normal builds use real URLs.
 */
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <ToastProvider>
        <AuthGate>
          <AppStoreProvider>
            <App />
          </AppStoreProvider>
        </AuthGate>
      </ToastProvider>
    </Router>
  </StrictMode>,
);
