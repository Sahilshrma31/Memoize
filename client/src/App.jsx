import { useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import StatsHeader from './components/StatsHeader';
import WakingBanner from './components/WakingBanner';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AllProblems from './pages/AllProblems';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ProblemDetail from './pages/ProblemDetail';

const NAV_LINKS = [
  { to: '/app', label: 'Today', end: true },
  { to: '/problems', label: 'All Problems', end: false },
];

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpStats = () => setRefreshKey((k) => k + 1);
  const { user, isAuthenticated, logout } = useAuth();

  const withStats = (element) => (
    <ProtectedRoute>
      <div className="space-y-8">
        <StatsHeader refreshKey={refreshKey} />
        {element}
      </div>
    </ProtectedRoute>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-midnight-bg">
        <WakingBanner />
        <header className="border-b border-midnight-border">
          <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-10">
              <Link to="/" className="flex items-center gap-2.5">
                <span className="h-3 w-3 bg-accent-orange" />
                <span className="display-heading text-lg tracking-widest">MEMOIZE</span>
              </Link>
              {isAuthenticated && (
                <nav className="flex items-center gap-6">
                  {NAV_LINKS.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        `border-b-2 pb-0.5 text-sm uppercase tracking-wide transition-colors ${
                          isActive
                            ? 'border-accent-orange text-midnight-text'
                            : 'border-transparent text-midnight-muted hover:text-midnight-text'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
              )}
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                {user?.picture && (
                  <img
                    src={user.picture}
                    alt=""
                    className="h-7 w-7 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className="hidden sm:inline text-sm text-midnight-muted">{user?.name}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="border border-midnight-border px-3 py-1.5 text-xs uppercase tracking-wide text-midnight-muted hover:text-midnight-text hover:border-accent-orange/50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-accent-orange hover:bg-accent-orange/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-8">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/app" element={withStats(<Home onDataChange={bumpStats} />)} />
            <Route path="/problems" element={withStats(<AllProblems />)} />
            <Route path="/problems/:id" element={withStats(<ProblemDetail />)} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
