import { createContext, useContext, useEffect, useState } from 'react';
import { progressApi } from '../api/client';

const ProgressContext = createContext(null);

/**
 * XP, level, achievements and streak, fetched once for the whole app (the
 * header badge, dashboard and Progress page all read it) and refetched
 * whenever `refreshKey` bumps — i.e. after every review.
 */
export function ProgressProvider({ enabled, refreshKey, children }) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setProgress(null);
      return undefined;
    }
    let cancelled = false;
    progressApi
      .get()
      .then((p) => !cancelled && setProgress(p))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  // Due count in the tab title: a pinned tab nudges you back without a
  // notification. It lives here because this is the one place mounted on every
  // signed-in page — it used to sit in StatsHeader, which the dashboard no
  // longer renders.
  useEffect(() => {
    const due = progress?.dueNow ?? 0;
    document.title = due > 0 ? `(${due}) Memoize` : 'Memoize';
  }, [progress]);

  return <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>;
}

// null until the first load finishes.
export function useProgress() {
  return useContext(ProgressContext);
}
