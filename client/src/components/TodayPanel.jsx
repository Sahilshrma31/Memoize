import { Link } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';

const RING_SIZE = 72;
const RING_STROKE = 7;

function GoalRing({ done, target, complete }) {
  const r = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = target > 0 ? Math.min(done / target, 1) : complete ? 1 : 0;

  return (
    <svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="shrink-0 -rotate-90">
      <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} fill="none" stroke="#222222" strokeWidth={RING_STROKE} />
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={r}
        fill="none"
        stroke={complete ? '#4fbf82' : '#ff5a1f'}
        strokeWidth={RING_STROKE}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
    </svg>
  );
}

/**
 * Top of the dashboard: today's goal, level and streak at a glance. The goal
 * is simply "clear what's due", so it needs no setup.
 */
export default function TodayPanel({ dailyGoal }) {
  const progress = useProgress();
  const level = progress?.level;
  const streak = progress?.streak;
  const reviewedToday = dailyGoal?.reviewedToday ?? 0;
  const atRisk = streak && streak.current > 0 && reviewedToday === 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 border border-midnight-border bg-midnight-surface divide-y sm:divide-y-0 sm:divide-x divide-midnight-border">
      {/* Daily goal */}
      <div className="px-5 py-4 flex items-center gap-4">
        {dailyGoal ? (
          <>
            <div className="relative">
              <GoalRing done={dailyGoal.reviewedToday} target={dailyGoal.target} complete={dailyGoal.complete} />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
                {dailyGoal.complete ? '✓' : `${dailyGoal.reviewedToday}/${dailyGoal.target}`}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-midnight-muted">Today’s goal</p>
              <p className="mt-1 text-sm font-semibold">
                {dailyGoal.complete
                  ? 'Queue cleared'
                  : dailyGoal.target === 0
                    ? 'Nothing due'
                    : `${dailyGoal.dueNow} left to clear`}
              </p>
              <p className="text-xs text-midnight-muted">
                {dailyGoal.complete
                  ? 'Bonus round: the challenge below'
                  : dailyGoal.target === 0
                    ? 'Take the challenge or add a problem'
                    : 'Clear the queue'}
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-midnight-muted">Loading today…</p>
        )}
      </div>

      {/* Level */}
      <Link to="/progress" className="px-5 py-4 block hover:bg-midnight-raised transition-colors">
        {level ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[10px] uppercase tracking-widest text-midnight-muted">Level</p>
              {progress.xpToday > 0 && (
                <span className="text-xs text-accent-orange tabular-nums">+{progress.xpToday} XP today</span>
              )}
            </div>
            <p className="mt-1">
              <span className="display-heading text-2xl text-accent-orange tabular-nums">{level.level}</span>{' '}
              <span className="text-sm font-semibold">{level.title}</span>
            </p>
            <div className="mt-2 h-1.5 bg-midnight-bg overflow-hidden">
              <div
                className="h-full bg-accent-orange transition-all duration-700"
                style={{ width: `${Math.round(level.progress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-midnight-muted tabular-nums">
              {level.nextLevelXp
                ? `${(level.nextLevelXp - level.xp).toLocaleString()} XP to ${level.nextTitle}`
                : `${level.xp.toLocaleString()} XP · max level`}
            </p>
          </>
        ) : (
          <p className="text-sm text-midnight-muted">Loading level…</p>
        )}
      </Link>

      {/* Streak */}
      <div className="px-5 py-4">
        {streak ? (
          <>
            <p className="text-[10px] uppercase tracking-widest text-midnight-muted">Streak</p>
            <p className="mt-1 display-heading text-2xl text-accent-orange tabular-nums">
              {streak.current} {streak.current > 0 ? '🔥' : ''}
            </p>
            <p className={`text-xs ${atRisk ? 'text-accent-orange' : 'text-midnight-muted'}`}>
              {atRisk
                ? `Review today to make it ${streak.current + 1}`
                : reviewedToday > 0
                  ? 'Today counted ✓'
                  : 'Review once to start a streak'}
            </p>
            <p className="mt-1 text-[11px] text-midnight-muted" title="Earn one every 7 days in a row; a missed day spends one instead of breaking your streak">
              {'❄'.repeat(streak.freezesAvailable) || '○'} {streak.freezesAvailable}/{streak.maxFreezes} freezes banked
            </p>
          </>
        ) : (
          <p className="text-sm text-midnight-muted">Loading streak…</p>
        )}
      </div>
    </div>
  );
}
