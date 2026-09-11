import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { statsApi } from '../api/client';
import StateBadge from '../components/StateBadge';
import { formatDaysAgo, formatDuration } from '../utils/format';

const TIER_STYLES = {
  unranked: { label: 'Unranked', icon: '○', text: 'text-midnight-muted', chip: 'ring-white/10 bg-white/5' },
  bronze: { label: 'Bronze', icon: '◆', text: 'text-[#d49a6a]', chip: 'ring-[#d49a6a]/30 bg-[#d49a6a]/10' },
  silver: { label: 'Silver', icon: '◆', text: 'text-[#c9cdd4]', chip: 'ring-[#c9cdd4]/30 bg-[#c9cdd4]/10' },
  gold: { label: 'Gold', icon: '◆', text: 'text-[#e8c35a]', chip: 'ring-[#e8c35a]/30 bg-[#e8c35a]/10' },
  platinum: { label: 'Platinum', icon: '✦', text: 'text-[#8fdce6]', chip: 'ring-[#8fdce6]/30 bg-[#8fdce6]/10' },
};

const LEVEL_STYLES = {
  weak: { bar: 'bg-rating-blackout', text: 'text-rating-blackout' },
  developing: { bar: 'bg-rating-hard', text: 'text-rating-hard' },
  solid: { bar: 'bg-rating-good', text: 'text-rating-good' },
};

const STATE_BARS = [
  { key: 'learning', cls: 'bg-rating-hard' },
  { key: 'review', cls: 'bg-accent-orange' },
  { key: 'mastered', cls: 'bg-rating-good' },
];

const SORTS = [
  { key: 'weakest', label: 'Weakest' },
  { key: 'solved', label: 'Most solved' },
  { key: 'revised', label: 'Most revised' },
  { key: 'rusty', label: 'Rustiest' },
];

const TIER_ORDER = ['unranked', 'bronze', 'silver', 'gold', 'platinum'];

function sortPatterns(patterns, sort) {
  const list = [...patterns];
  if (sort === 'solved') return list.sort((a, b) => b.problemCount - a.problemCount);
  if (sort === 'revised') return list.sort((a, b) => b.revisions - a.revisions);
  if (sort === 'rusty') {
    // Never-practiced patterns are the rustiest of all.
    const age = (p) => (p.daysSincePractice === null ? Infinity : p.daysSincePractice);
    return list.sort((a, b) => age(b) - age(a));
  }
  return list; // server already sorts weakest-first
}

function TierBadge({ tier }) {
  const t = TIER_STYLES[tier] || TIER_STYLES.unranked;
  return (
    <span className={`chip ring-1 ring-inset uppercase tracking-wider ${t.text} ${t.chip}`}>
      {t.icon} {t.label}
    </span>
  );
}

function NextTier({ pattern }) {
  const { nextTier } = pattern;
  if (!nextTier) {
    return <p className="text-xs text-[#8fdce6]">Top tier reached. Keep it from slipping.</p>;
  }
  const needs = [];
  if (nextTier.problemsNeeded > 0) {
    needs.push(`${nextTier.problemsNeeded} more problem${nextTier.problemsNeeded === 1 ? '' : 's'}`);
  }
  if (!nextTier.recallMet) {
    needs.push(
      pattern.reliable
        ? `recall ${nextTier.recallNeededPercent}%+ (now ${pattern.successPercent}%)`
        : `recall ${nextTier.recallNeededPercent}%+ over 3+ reviews`
    );
  }
  return (
    <p className="text-xs text-midnight-muted">
      <span className="uppercase tracking-wider">Next: </span>
      <span className={TIER_STYLES[nextTier.name].text}>{TIER_STYLES[nextTier.name].label}</span>
      {needs.length > 0 && <> — {needs.join(' · ')}</>}
    </p>
  );
}

function PatternCard({ pattern }) {
  const [open, setOpen] = useState(false);
  const level = LEVEL_STYLES[pattern.level] || LEVEL_STYLES.developing;
  const reviewed = pattern.revisions > 0;

  return (
    <div className="border border-midnight-border bg-midnight-surface flex flex-col">
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold truncate" title={pattern.tag}>
          {pattern.tag}
        </h3>
        <TierBadge tier={pattern.tier} />
      </div>

      <div className="grid grid-cols-3 border-y border-midnight-border divide-x divide-midnight-border">
        <Stat label="Solved" value={pattern.problemCount} />
        <Stat label="Revisions" value={pattern.revisions} />
        <Stat
          label="Recall"
          value={reviewed ? `${pattern.successPercent}%` : '—'}
          cls={reviewed ? level.text : 'text-midnight-muted'}
        />
      </div>

      <div className="px-5 py-4 space-y-3 flex-1">
        {/* Recall */}
        <div>
          <div className="h-1.5 bg-midnight-bg overflow-hidden">
            {reviewed && (
              <div
                className={`h-full ${level.bar} transition-all duration-700`}
                style={{ width: `${pattern.successPercent}%` }}
              />
            )}
          </div>
          <p className="mt-1 text-[11px] text-midnight-muted">
            {!reviewed
              ? 'Not revised yet'
              : pattern.reliable
                ? `${pattern.level} · ${pattern.good + pattern.easy} of ${pattern.revisions} recalled`
                : 'Low data — needs 3+ revisions to rate'}
          </p>
        </div>

        {/* Mastery split */}
        <div>
          <div className="flex h-1.5 overflow-hidden bg-midnight-bg">
            {STATE_BARS.map(({ key, cls }) =>
              pattern.byState[key] > 0 ? (
                <div
                  key={key}
                  className={cls}
                  style={{ width: `${(pattern.byState[key] / pattern.problemCount) * 100}%` }}
                />
              ) : null
            )}
          </div>
          <p className="mt-1 text-[11px] text-midnight-muted tabular-nums">
            {pattern.byState.learning} learning · {pattern.byState.review} review ·{' '}
            <span className="text-rating-good">{pattern.byState.mastered} mastered</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-midnight-muted tabular-nums">
          <span>
            <span className="text-rating-good">E {pattern.byDifficulty.easy}</span> ·{' '}
            <span className="text-rating-hard">M {pattern.byDifficulty.medium}</span> ·{' '}
            <span className="text-rating-blackout">H {pattern.byDifficulty.hard}</span>
          </span>
          <span>avg {formatDuration(pattern.avgTimeSec)}</span>
          <span className={pattern.rusty ? 'text-rating-hard' : ''}>
            {pattern.rusty ? '⚠ rusty · ' : ''}last {formatDaysAgo(pattern.daysSincePractice)}
          </span>
          {pattern.dueNow > 0 && <span className="text-accent-orange">{pattern.dueNow} due</span>}
        </div>

        <NextTier pattern={pattern} />
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="border-t border-midnight-border px-5 py-2.5 text-left text-xs uppercase tracking-wide text-midnight-muted hover:text-midnight-text transition-colors"
      >
        {open ? '▾ Hide' : '▸ Show'} {pattern.problemCount} problem{pattern.problemCount === 1 ? '' : 's'}
      </button>

      {open && (
        <ul className="border-t border-midnight-border divide-y divide-midnight-border">
          {pattern.problems.map((p) => (
            <li key={p._id} className="px-5 py-2 flex items-center gap-3 text-sm">
              <Link to={`/problems/${p._id}`} className="flex-1 truncate hover:text-accent-orange" title={p.title}>
                {p.title}
              </Link>
              {p.due && <span className="text-[11px] text-accent-orange uppercase">due</span>}
              <span className="text-[11px] text-midnight-muted tabular-nums w-10 text-right">
                {p.reviews}×
              </span>
              <StateBadge state={p.state} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, cls = 'text-midnight-text' }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-midnight-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

export default function Patterns() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState('weakest');

  useEffect(() => {
    let cancelled = false;
    statsApi
      .patternTracker()
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => (data ? sortPatterns(data.patterns, sort) : []), [data, sort]);

  const tierCounts = useMemo(() => {
    const counts = Object.fromEntries(TIER_ORDER.map((t) => [t, 0]));
    for (const p of data?.patterns || []) counts[p.tier] += 1;
    return counts;
  }, [data]);

  if (error) {
    return <p className="text-sm text-midnight-muted">Couldn’t load the pattern tracker.</p>;
  }
  if (!data) {
    return <p className="text-sm text-midnight-muted">Tallying your patterns…</p>;
  }
  if (data.patterns.length === 0) {
    return (
      <div className="border border-dashed border-midnight-border p-10 text-center">
        <p className="text-midnight-text font-medium">No patterns yet</p>
        <p className="text-sm text-midnight-muted mt-1">
          Add problems with tags (paste a LeetCode link and they fill in automatically) and they’ll
          show up here, grouped by pattern.
        </p>
      </div>
    );
  }

  const focus = data.patterns.find((p) => p.reliable && p.level !== 'solid');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="eyebrow mb-3">Pattern Tracker</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-midnight-border border border-midnight-border">
          <Stat label="Patterns" value={data.totals.patterns} />
          <Stat label="Problems" value={data.totals.problems} />
          <Stat label="Revisions" value={data.totals.revisions} />
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-midnight-muted">Focus next</p>
            <p
              className={`mt-1 text-sm font-semibold truncate ${focus ? 'text-rating-blackout' : 'text-rating-good'}`}
              title={focus?.tag}
            >
              {focus ? `${focus.tag} · ${focus.successPercent}%` : 'All solid'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TIER_ORDER.slice(1)
            .reverse()
            .map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-midnight-muted">
                <TierBadge tier={t} />
                <span className="tabular-nums">×{tierCounts[t]}</span>
              </span>
            ))}
        </div>
        <div className="flex border border-midnight-border">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              className={`px-3 py-1.5 text-xs uppercase tracking-wide transition-colors ${
                sort === s.key
                  ? 'bg-accent-orange text-black font-semibold'
                  : 'text-midnight-muted hover:text-midnight-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((p) => (
          <PatternCard key={p.tag} pattern={p} />
        ))}
      </div>

      <p className="text-xs text-midnight-muted">
        Tiers need both volume and recall — Bronze 3 problems · Silver 7 + 60% · Gold 12 + 75% ·
        Platinum 20 + 85%. Recall counts once a pattern has 3+ revisions.
      </p>
    </div>
  );
}
