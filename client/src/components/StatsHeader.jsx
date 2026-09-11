import { useEffect, useState } from 'react';
import { statsApi } from '../api/client';

const TILES = [
  { key: 'dueToday', label: 'Due Today', accent: 'text-rating-hard' },
  { key: 'totalProblems', label: 'Total Problems', accent: 'text-midnight-text' },
  { key: 'mastered', label: 'Mastered', accent: 'text-rating-good' },
  { key: 'streak', label: 'Streak', accent: 'text-accent-orange', suffix: ' 🔥' },
];

export default function StatsHeader({ refreshKey }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    statsApi.get().then(setStats).catch(() => {});
  }, [refreshKey]);

  // Due count in the tab title: a pinned tab nudges you back without a notification.
  useEffect(() => {
    if (!stats) return undefined;
    document.title = stats.dueToday > 0 ? `(${stats.dueToday}) Memoize` : 'Memoize';
    return () => {
      document.title = 'Memoize';
    };
  }, [stats]);

  const values = {
    dueToday: stats?.dueToday ?? '—',
    totalProblems: stats?.totalProblems ?? '—',
    mastered: stats?.byState?.mastered ?? '—',
    streak: stats?.streak ?? '—',
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-midnight-border border border-midnight-border">
      {TILES.map((t) => (
        <div key={t.key} className="bg-midnight-surface px-5 py-4">
          <p className="text-xs text-midnight-muted uppercase tracking-widest">{t.label}</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums font-mono ${t.accent}`}>
            {values[t.key]}
            {values[t.key] !== '—' && t.suffix ? t.suffix : ''}
          </p>
        </div>
      ))}
    </div>
  );
}
