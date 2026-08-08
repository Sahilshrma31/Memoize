import { useEffect, useState } from 'react';
import { statsApi } from '../api/client';

const LEVEL_STYLES = {
  weak: { bar: 'bg-rating-blackout', text: 'text-rating-blackout', label: 'weak' },
  developing: { bar: 'bg-rating-hard', text: 'text-rating-hard', label: 'developing' },
  solid: { bar: 'bg-rating-good', text: 'text-rating-good', label: 'solid' },
};

export default function PatternMap({ refreshKey }) {
  const [patterns, setPatterns] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    statsApi
      .patterns()
      .then(({ patterns: p }) => !cancelled && setPatterns(p))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) {
    return (
      <div className="border border-midnight-border bg-midnight-surface p-6 text-sm text-midnight-muted">
        Couldn’t load pattern stats.
      </div>
    );
  }

  if (!patterns) {
    return (
      <div className="border border-midnight-border bg-midnight-surface p-6 text-sm text-midnight-muted">
        Analysing your review history…
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="border border-dashed border-midnight-border p-8 text-center">
        <p className="text-midnight-text font-medium">Not enough data yet</p>
        <p className="text-sm text-midnight-muted mt-1">
          Tag your problems and review a few — your weakest patterns will show up here.
        </p>
      </div>
    );
  }

  // The server sorts weakest-first among patterns with enough reviews to trust.
  const weakest = patterns.find((p) => p.reliable && p.level !== 'solid');

  return (
    <div className="border border-midnight-border bg-midnight-surface">
      <div className="flex items-center justify-between px-5 py-4 border-b border-midnight-border">
        <h3 className="display-heading text-sm tracking-wide">Pattern Weakness Map</h3>
        <span className="text-xs text-midnight-muted">success = good + easy</span>
      </div>

      {weakest && (
        <div className="px-5 py-3 border-b border-midnight-border bg-rating-blackout/5">
          <p className="text-sm">
            <span className="text-midnight-muted">Focus here next: </span>
            <span className="text-rating-blackout font-semibold">{weakest.tag}</span>
            <span className="text-midnight-muted">
              {' '}— {weakest.successPercent}% recall across {weakest.total} reviews
            </span>
          </p>
        </div>
      )}

      <div className="divide-y divide-midnight-border">
        {patterns.map((p) => {
          const style = LEVEL_STYLES[p.level] || LEVEL_STYLES.developing;
          return (
            <div key={p.tag} className="px-5 py-3 flex items-center gap-4">
              <span className="w-32 shrink-0 truncate text-sm" title={p.tag}>
                {p.tag}
              </span>

              <div className="flex-1 h-2 bg-midnight-bg overflow-hidden">
                <div
                  className={`h-full ${style.bar} transition-all duration-700`}
                  style={{ width: `${p.successPercent}%` }}
                />
              </div>

              <span className={`w-12 shrink-0 text-right text-sm tabular-nums ${style.text}`}>
                {p.successPercent}%
              </span>

              <span className="w-28 shrink-0 text-right text-xs text-midnight-muted tabular-nums">
                {p.total} review{p.total === 1 ? '' : 's'}
                {!p.reliable && <span className="text-midnight-muted/60"> · low data</span>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 border-t border-midnight-border">
        {Object.entries(LEVEL_STYLES).map(([key, s]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 ${s.bar}`} />
            <span className="text-xs uppercase tracking-widest text-midnight-muted">
              {s.label}
            </span>
          </div>
        ))}
        <span className="ml-auto text-xs text-midnight-muted">
          solid = 80%+ · weak = under 50%
        </span>
      </div>
    </div>
  );
}
