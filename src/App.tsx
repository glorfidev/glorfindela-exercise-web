import { ArrowDownToLine, ChevronDown, LogIn, LogOut, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { exerciseApi } from './api/client';
import { useAuth } from './auth/AuthContext';
import Button from './components/Button';
import ErrorMessage from './components/ErrorMessage';
import LoadingState from './components/LoadingState';
import DashboardPage from './pages/DashboardPage';
import TrainingDetailPage from './pages/TrainingDetailPage';
import { buildTrainingCsv, downloadCsv } from './utils/trainingCsv';

export default function App() {
  const auth = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userMenuOpen) return;

    function onClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [userMenuOpen]);

  async function exportAllTrainingsCsv() {
    setExportError(null);
    setExportingAll(true);

    try {
      const trainings = await exerciseApi.listTrainings();
      const details = await Promise.all(trainings.map((training) => exerciseApi.getTraining(training.id)));
      const csv = buildTrainingCsv(details);
      downloadCsv(csv, `all-trainings-${new Date().toISOString().slice(0, 10)}.csv`);
      setUserMenuOpen(false);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Could not export all trainings');
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <div className="min-h-screen text-ink">
      {!auth.initializing && auth.authenticated && (
        <header className="mx-auto flex max-w-6xl justify-end px-4 pt-4 sm:px-6 sm:pt-5">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen((current) => !current)}
              className="focus-ring inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:bg-white/70 hover:text-ink"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
            >
              <User size={16} aria-hidden="true" />
              <span className="hidden sm:inline">{auth.user?.displayName ?? auth.user?.username ?? auth.user?.email ?? 'Signed in'}</span>
              <ChevronDown size={16} aria-hidden="true" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 min-w-52 rounded-2xl border border-white bg-white/95 p-2 shadow-soft backdrop-blur">
                <button
                  type="button"
                  onClick={exportAllTrainingsCsv}
                  disabled={exportingAll}
                  className="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-mint-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowDownToLine size={16} aria-hidden="true" />
                  {exportingAll ? 'Exporting...' : 'Export All CSV'}
                </button>
                <button
                  type="button"
                  onClick={auth.logout}
                  className="focus-ring mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-mint-50"
                >
                  <LogOut size={16} aria-hidden="true" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>
      )}

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        {auth.initializing && <LoadingState label="Checking session" />}

        {!auth.initializing && auth.error && <ErrorMessage message={auth.error} />}
        {!auth.initializing && !auth.error && exportError && <ErrorMessage message={exportError} />}

        {!auth.initializing && !auth.error && !auth.authenticated && (
          <section className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-xl place-items-center py-8">
            <div className="flex w-full flex-col items-center rounded-3xl border border-white bg-white/85 px-6 py-10 text-center shadow-card sm:px-10 sm:py-12">
              <picture>
                <source media="(max-width: 639px)" srcSet="/brand/glorfex-stacked.png" />
                <img src="/brand/glorfex-horizontal.png" alt="Glorfex Training Tracker" className="h-auto w-full max-w-[18rem] object-contain sm:max-w-md" />
              </picture>
              <Button className="mt-8" type="button" onClick={auth.login} icon={<LogIn size={17} aria-hidden="true" />}>
                Login
              </Button>
            </div>
          </section>
        )}

        {!auth.initializing && auth.authenticated && (
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/trainings/:id" element={<TrainingDetailPage />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
