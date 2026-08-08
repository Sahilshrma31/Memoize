import { useEffect, useMemo, useState } from 'react';
import { statsApi } from '../api/client';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = [null, 'Mon', null, 'Wed', null, 'Fri', null]; // Sun-first, label every other

// Five buckets, mirroring GitHub's contribution scale but in the app's orange.
const LEVELS = [
  { max: 0, cls: 'bg-midnight-bg ring-1 ring-inset ring-midnight-border' },
  { max: 2, cls: 'bg-accent-orange/25' },
  { max: 5, cls: 'bg-accent-orange/45' },
  { max: 9, cls: 'bg-accent-orange/70' },
  { max: Infinity, cls: 'bg-accent-orange' },
];

const levelFor = (count) => LEVELS.find((l) => count <= l.max);

function formatDate(key) {
  const d = new Date(key + 'T00:00:00Z');
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export default function ActivityHeatmap({ refreshKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    let cancelled = false;
    statsApi
      .activity()
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Pad the front so the first cell lands on the right weekday row, then the
  // CSS grid fills column-by-column exactly like GitHub's chart.
  const cells = useMemo(() => {
    if (!data?.days?.length) return [];
    const firstWeekday = new Date(data.days[0].date + 'T00:00:00Z').getUTCDay();
    return [...Array(firstWeekday).fill(null), ...data.days];
  }, [data]);

  // Label a week column when it contains the 1st of a month.
  const monthLabels = useMemo(() => {
    if (!cells.length) return [];
    const labels = [];
    let lastMonth = -1;
    for (let week = 0; week * 7 < cells.length; week += 1) {
      const cell = cells.slice(week * 7, week * 7 + 7).find(Boolean);
      if (!cell) continue;
      const month = new Date(cell.date + 'T00:00:00Z').getUTCMonth();
      if (month !== lastMonth) {
        labels.push({ week, label: MONTHS[month] });
        lastMonth = month;
      }
    }
    return labels;
  }, [cells]);

  if (error) {
    return (
      <div className="border border-midnight-border bg-midnight-surface p-6 text-sm text-midnight-muted">
        Couldn’t load your activity.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="border border-midnight-border bg-midnight-surface p-6 text-sm text-midnight-muted">
        Loading activity…
      </div>
    );
  }

  const weekCount = Math.ceil(cells.length / 7);

  return (
    <div className="border border-midnight-border bg-midnight-surface">
      {/* Streak figures */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-midnight-border border-b border-midnight-border">
        <Stat
          value={data.currentStreak}
          label="Current Streak"
          accent="text-accent-orange"
          suffix={data.currentStreak > 0 ? ' 🔥' : ''}
        />
        <Stat value={data.longestStreak} label="Longest Streak" />
        <Stat value={data.activeDays} label="Active Days" />
        <Stat value={data.totalReviews} label="Total Reviews" />
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-b border-midnight-border">
        <h3 className="display-heading text-sm tracking-wide">Activity</h3>
        <span className="text-xs text-midnight-muted tabular-nums">
          {hovered
            ? `${hovered.count} review${hovered.count === 1 ? '' : 's'} · ${formatDate(hovered.date)}`
            : 'last 12 months'}
        </span>
      </div>

      <div className="p-5 overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* month labels */}
          <div
            className="grid gap-[3px] mb-1 ml-8"
            style={{ gridTemplateColumns: `repeat(${weekCount}, 11px)` }}
          >
            {Array.from({ length: weekCount }, (_, i) => {
              const m = monthLabels.find((l) => l.week === i);
              return (
                <span key={i} className="text-[10px] text-midnight-muted whitespace-nowrap">
                  {m ? m.label : ''}
                </span>
              );
            })}
          </div>

          <div className="flex gap-1">
            {/* weekday labels */}
            <div className="grid grid-rows-7 gap-[3px] w-7 shrink-0">
              {WEEKDAY_LABELS.map((d, i) => (
                <span key={i} className="text-[10px] leading-[11px] text-midnight-muted">
                  {d || ''}
                </span>
              ))}
            </div>

            {/* the grid itself */}
            <div
              className="grid grid-rows-7 grid-flow-col gap-[3px]"
              onMouseLeave={() => setHovered(null)}
            >
              {cells.map((cell, i) =>
                cell === null ? (
                  <span key={`pad-${i}`} className="w-[11px] h-[11px]" />
                ) : (
                  <span
                    key={cell.date}
                    onMouseEnter={() => setHovered(cell)}
                    title={`${cell.count} review${cell.count === 1 ? '' : 's'} on ${formatDate(cell.date)}`}
                    className={`w-[11px] h-[11px] ${levelFor(cell.count).cls} transition-colors`}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 py-3 border-t border-midnight-border">
        <span className="text-xs uppercase tracking-widest text-midnight-muted">Less</span>
        {LEVELS.map((l, i) => (
          <span key={i} className={`w-[11px] h-[11px] ${l.cls}`} />
        ))}
        <span className="text-xs uppercase tracking-widest text-midnight-muted">More</span>
        {data.busiestDay?.date && (
          <span className="ml-auto text-xs text-midnight-muted">
            best day: {data.busiestDay.count} on {formatDate(data.busiestDay.date)}
          </span>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, accent = 'text-midnight-text', suffix = '' }) {
  return (
    <div className="px-5 py-4">
      <p className={`display-heading text-2xl tabular-nums ${accent}`}>
        {value}
        {suffix}
      </p>
      <p className="mt-1.5 text-xs uppercase tracking-widest text-midnight-muted">{label}</p>
    </div>
  );
}
