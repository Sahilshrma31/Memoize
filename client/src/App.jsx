import { useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import LevelBadge from './components/LevelBadge';
import ProtectedRoute from './components/ProtectedRoute';
import StatsHeader from './components/StatsHeader';
import WakingBanner from './components/WakingBanner';
import { useAuth } from './context/AuthContext';
import { CelebrationProvider } from './context/CelebrationContext';
import { ProgressProvider } from './context/ProgressContext';
import { ToastProvider } from './context/ToastContext';
import AllProblems from './pages/AllProblems';
import Guide from './pages/Guide';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Patterns from './pages/Patterns';
import ProblemDetail from './pages/ProblemDetail';
import Progress from './pages/Progress';

// Signed-in nav. The guide sits outside this list because it's public — see below.
const NAV_LINKS = [
  { to: '/app', label: 'Today', end: true },
  { to: '/problems', label: 'All Problems', end: false },
  { to: '/patterns', label: 'Patterns', end: false },
  { to: '/progress', label: 'Progress', end: false },
];

const navLinkClass = ({ isActive }) =>
  `border-b-2 pb-0.5 text-sm uppercase tracking-wide transition-colors ${
    isActive
      ? 'border-accent-orange text-midnight-text'
      : 'border-transparent text-midnight-muted hover:text-midnight-text'
  }`;

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
      <CelebrationProvider>
        <ProgressProvider enabled={isAuthenticated} refreshKey={refreshKey}>
          <div className="min-h-screen bg-midnight-bg">
            <WakingBanner />
            <header className="border-b border-midnight-border">
              {/* On narrow screens the nav drops to its own row under the logo. */}
              <div className="mx-auto max-w-5xl px-6 py-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
                <Link to="/" className="flex items-center gap-2.5">
                  <span className="h-3 w-3 bg-accent-orange" />
                  <span className="display-heading text-lg tracking-widest">MEMOIZE</span>
                </Link>

                <nav className="order-3 lg:order-2 w-full lg:w-auto lg:flex-1 flex flex-wrap items-center gap-x-6 gap-y-2">
                  {isAuthenticated &&
                    NAV_LINKS.map((link) => (
                      <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                        {link.label}
                      </NavLink>
                    ))}
                  {/* Public — someone deciding whether to sign up should be able to read this. */}
                  <NavLink to="/guide" className={navLinkClass}>
                    How It Works
                  </NavLink>
                </nav>

                {isAuthenticated ? (
                  <div className="order-2 lg:order-3 flex items-center gap-3">
                    <LevelBadge />
                    {user?.picture && (
                      <img
                        src={user.picture}
                        alt=""
                        className="h-7 w-7 rounded-full"
                        referrerPolicy="no-referrer"
                      />
                    )}
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
                    className="order-2 lg:order-3 bg-accent-orange hover:bg-accent-orange/90 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-black transition-colors"
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
                <Route path="/guide" element={<Guide />} />
                <Route
                  path="/app"
                  element={withStats(<Home onDataChange={bumpStats} refreshKey={refreshKey} />)}
                />
                <Route path="/problems" element={withStats(<AllProblems />)} />
                <Route path="/problems/:id" element={withStats(<ProblemDetail />)} />
                <Route path="/patterns" element={withStats(<Patterns />)} />
                <Route path="/progress" element={withStats(<Progress />)} />
              </Routes>
            </main>
          </div>
        </ProgressProvider>
      </CelebrationProvider>
    </ToastProvider>
  );
}

export default App;
