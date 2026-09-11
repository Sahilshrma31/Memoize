import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { formatShortDate } from '../utils/format';

const CATEGORY_ORDER = ['Reviews', 'Streaks', 'Skill', 'Challenges', 'Mastery'];

const BONUS_LABELS = {
  checkIn: ['Daily check-in', 'first review of the day'],
  redemption: ['Redemption', 'recall a problem you last blacked out on'],
  personalBest: ['Personal best', 'recall faster than your previous best'],
  challenge: ['Daily challenge', 'beat the day’s challenge'],
};

function LevelHero({ level, xpToday }) {
  const pct = Math.round(level.progress * 100);
  return (
    <div className="border border-midnight-border bg-midnight-surface p-6 grid gap-6 sm:grid-cols-[auto_1fr] items-center">
      <div className="text-center sm:text-left">
        <p className="text-[10px] uppercase tracking-widest text-midnight-muted">Level</p>
        <p className="display-heading text-6xl text-accent-orange tabular-nums leading-none mt-2">{level.level}</p>
      </div>
      <div className="min-w-0">
        <p className="display-heading text-2xl">{level.title}</p>
        <p className="text-sm text-midnight-muted mt-1 tabular-nums">
          {level.xp.toLocaleString()} XP total{xpToday > 0 && <span className="text-accent-orange"> · +{xpToday} today</span>}
        </p>
        <div className="mt-3 h-2.5 bg-midnight-bg overflow-hidden">
          <div className="h-full bg-accent-orange transition-all duration-1000" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-midnight-muted tabular-nums">
          {level.nextLevelXp
            ? `${(level.nextLevelXp - level.xp).toLocaleString()} XP to ${level.nextTitle} (${level.nextLevelXp.toLocaleString()})`
            : 'Max level reached. Legendary.'}
        </p>
      </div>
    </div>
  );
}

function XpChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.xp));
  return (
    <div className="border border-midnight-border bg-midnight-surface p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="display-heading text-sm tracking-wide">XP · last 14 days</h3>
        <span className="text-xs text-midnight-muted tabular-nums">
          {days.reduce((s, d) => s + d.xp, 0).toLocaleString()} XP
        </span>
      </div>
      <div className="mt-4 flex items-end gap-1.5 h-28">
        {days.map((d, i) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group" title={`${d.xp} XP · ${formatShortDate(`${d.date}T12:00:00`)}`}>
            <span className="text-[9px] text-midnight-muted opacity-0 group-hover:opacity-100 tabular-nums mb-0.5">{d.xp}</span>
            <div
              className={`w-full ${i === days.length - 1 ? 'bg-accent-orange' : d.xp > 0 ? 'bg-accent-orange/50' : 'bg-midnight-border'}`}
              style={{ height: `${d.xp > 0 ? Math.max(6, (d.xp / max) * 100) : 3}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-midnight-muted">
        <span>{formatShortDate(`${days[0].date}T12:00:00`)}</span>
        <span>today</span>
      </div>
    </div>
  );
}

function AchievementTile({ a }) {
  const pct = Math.round((a.current / a.target) * 100);
  return (
    <div
      className={`border p-4 flex gap-3 ${
        a.unlocked ? 'border-[#e8c35a]/40 bg-[#e8c35a]/[0.05]' : 'border-midnight-border bg-midnight-surface'
      }`}
    >
      <span className={`text-2xl leading-none ${a.unlocked ? '' : 'grayscale opacity-30'}`} aria-hidden="true">
        {a.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${a.unlocked ? '' : 'text-midnight-muted'}`}>{a.title}</p>
        <p className="text-[11px] text-midnight-muted">{a.description}</p>
        {a.unlocked ? (
          <p className="mt-1.5 text-[10px] uppercase tracking-widest text-[#e8c35a]">
            Unlocked{a.unlockedAt ? ` · ${formatShortDate(a.unlockedAt)}` : ''}
          </p>
        ) : a.target > 1 && a.current > 0 ? (
          <div className="mt-2">
            <div className="h-1 bg-midnight-bg overflow-hidden">
              <div className="h-full bg-midnight-muted" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-midnight-muted tabular-nums">
              {a.current.toLocaleString()} / {a.target.toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-[10px] uppercase tracking-widest text-midnight-muted/60">Locked</p>
        )}
      </div>
    </div>
  );
}

export default function Progress() {
  const progress = useProgress();

  const grouped = useMemo(() => {
    if (!progress) return [];
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: progress.achievements
        .filter((a) => a.category === category)
        // Unlocked first, then whichever locked one you're closest to.
        .sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.current / b.target - a.current / a.target),
    }));
  }, [progress]);

  if (!progress) return <p className="text-sm text-midnight-muted">Loading your progress…</p>;

  const { level, streak, counters, achievements, recent, rules, levels } = progress;
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="eyebrow mb-3">Your Progress</h2>
        <LevelHero level={level} xpToday={progress.xpToday} />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-5 border border-midnight-border divide-x divide-y sm:divide-y-0 divide-midnight-border bg-midnight-surface">
        <Stat label="Streak" value={`${streak.current}${streak.current > 0 ? ' 🔥' : ''}`} accent="text-accent-orange" />
        <Stat label="Freezes" value={`${'❄'.repeat(streak.freezesAvailable) || '0'}`} accent="text-sky-300" hint={`${streak.freezesAvailable}/${streak.maxFreezes} banked`} />
        <Stat label="Personal bests" value={counters.personalBests} />
        <Stat label="Redemptions" value={counters.redemptions} />
        <Stat label="Challenges won" value={counters.challengesWon} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <XpChart days={progress.xpByDay} />
        <div className="border border-midnight-border bg-midnight-surface">
          <h3 className="display-heading text-sm tracking-wide px-5 py-4 border-b border-midnight-border">Recent XP</h3>
          {recent.length === 0 ? (
            <p className="px-5 py-6 text-sm text-midnight-muted">
              No reviews yet. <Link to="/app" className="text-accent-orange hover:underline">Clear your queue</Link> to start earning.
            </p>
          ) : (
            <ul className="divide-y divide-midnight-border max-h-72 overflow-y-auto">
              {recent.map((e, i) => (
                <li key={e.logId || i} className="px-5 py-2.5 flex items-center gap-3 text-sm">
                  <span className="text-accent-orange tabular-nums w-12 shrink-0">+{e.xp}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{e.title}</span>
                    <span className="block text-[11px] text-midnight-muted truncate">
                      {e.reasons.map((r) => r.label).join(' · ')}
                    </span>
                  </span>
                  <span className="text-[11px] text-midnight-muted shrink-0">{formatShortDate(e.reviewedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="eyebrow">Achievements</h2>
          <span className="text-xs text-midnight-muted tabular-nums">
            {unlockedCount} / {achievements.length} unlocked
          </span>
        </div>
        <div className="space-y-6">
          {grouped.map(({ category, items }) => (
            <div key={category}>
              <p className="text-[10px] uppercase tracking-widest text-midnight-muted mb-2">{category}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((a) => (
                  <AchievementTile key={a.id} a={a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="border border-midnight-border bg-midnight-surface p-5">
          <h3 className="display-heading text-sm tracking-wide">How XP works</h3>
          <p className="mt-3 text-sm text-midnight-muted">
            Every review earns the same XP <span className="text-midnight-text">no matter how you rate it</span>, so there’s
            never a reason to fudge a rating. Bonuses reward real improvement.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm">
            {Object.entries(rules.review).map(([difficulty, xp]) => (
              <li key={difficulty} className="flex justify-between">
                <span className="capitalize">{difficulty} review</span>
                <span className="text-accent-orange tabular-nums">+{xp}</span>
              </li>
            ))}
            {Object.entries(rules.bonus).map(([key, xp]) => (
              <li key={key} className="flex justify-between gap-3">
                <span>
                  {BONUS_LABELS[key]?.[0] || key}{' '}
                  <span className="text-[11px] text-midnight-muted">({BONUS_LABELS[key]?.[1]})</span>
                </span>
                <span className="text-accent-orange tabular-nums shrink-0">+{xp}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-midnight-border bg-midnight-surface p-5">
          <h3 className="display-heading text-sm tracking-wide">The ladder</h3>
          <ol className="mt-3 space-y-1 text-sm">
            {levels.map((l, i) => {
              const reached = level.level >= i + 1;
              const current = level.level === i + 1;
              return (
                <li key={l.title} className={`flex justify-between ${current ? 'text-accent-orange font-semibold' : reached ? '' : 'text-midnight-muted'}`}>
                  <span>
                    <span className="tabular-nums inline-block w-6">{i + 1}</span>
                    {l.title}
                    {current && ' ← you'}
                  </span>
                  <span className="tabular-nums">{l.xp.toLocaleString()} XP</span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent = 'text-midnight-text', hint }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] uppercase tracking-widest text-midnight-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
      {hint && <p className="text-[10px] text-midnight-muted mt-0.5">{hint}</p>}
    </div>
  );
}
