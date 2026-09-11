import { useEffect, useState } from 'react';
import { statsApi } from '../api/client';
import { formatDuration } from '../utils/format';

/**
 * Shown when you clear the queue. The point is to make finishing feel like
 * something happened — and to hand you a reason to come back tomorrow.
 */
export default function SessionSummary({ session }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    statsApi.get().then(setStats).catch(() => {});
  }, []);

  const recallPct = session.reviewed ? Math.round((session.recalled / session.reviewed) * 100) : 0;
  const level = session.level;
  const startPct = level && level.nextLevelXp ? pctOf(session.startXp, level) : null;
  const nowPct = level ? Math.round(level.progress * 100) : null;

  return (
    <div className="border border-accent-orange/40 bg-midnight-surface animate-[popIn_0.35s_ease-out]">
      <div className="px-5 py-4 border-b border-midnight-border flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Session complete</p>
          <p className="mt-2 text-lg font-semibold">Queue cleared. Nice work.</p>
        </div>
        <span className="text-4xl" aria-hidden="true">
          {recallPct >= 80 ? '🏆' : recallPct >= 50 ? '💪' : '🧗'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-midnight-border border-b border-midnight-border">
        <Tile label="Reviewed" value={session.reviewed} />
        <Tile label="Recalled" value={`${recallPct}%`} accent={recallPct >= 80 ? 'text-rating-good' : 'text-rating-hard'} />
        <Tile label="XP earned" value={`+${session.xp}`} accent="text-accent-orange" />
        <Tile label="Streak" value={session.streak ? `${session.streak.current} 🔥` : '—'} />
      </div>

      {level && (
        <div className="px-5 py-4 border-b border-midnight-border">
          <div className="flex items-baseline justify-between text-xs">
            <span>
              <span className="display-heading text-accent-orange">LV {level.level}</span>{' '}
              <span className="text-midnight-muted uppercase tracking-widest">{level.title}</span>
            </span>
            <span className="text-midnight-muted tabular-nums">
              {level.nextLevelXp
                ? `${(level.nextLevelXp - level.xp).toLocaleString()} XP to ${level.nextTitle}`
                : 'Max level'}
            </span>
          </div>
          {/* Grey = where the session started, orange = what it added. */}
          <div className="mt-2 h-2 bg-midnight-bg relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-accent-orange transition-all duration-1000" style={{ width: `${nowPct}%` }} />
            {startPct !== null && startPct < nowPct && (
              <div className="absolute inset-y-0 left-0 bg-[#555555]" style={{ width: `${startPct}%` }} />
            )}
          </div>
        </div>
      )}

      {(session.personalBests.length > 0 || session.redemptions > 0 || session.achievements.length > 0) && (
        <ul className="px-5 py-4 border-b border-midnight-border space-y-1.5 text-sm">
          {session.personalBests.map((pb) => (
            <li key={pb.cardId}>
              🏆 Personal best: {formatDuration(pb.timeSec)}{' '}
              <span className="text-midnight-muted">({formatDuration(pb.previousSec - pb.timeSec)} faster)</span>
            </li>
          ))}
          {session.redemptions > 0 && (
            <li>
              🔁 {session.redemptions} redemption{session.redemptions === 1 ? '' : 's'}: recalled problems you once blanked on
            </li>
          )}
          {session.achievements.map((a) => (
            <li key={a.id}>
              {a.icon} Unlocked <span className="text-[#e8c35a]">{a.title}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="px-5 py-3 text-xs text-midnight-muted">
        {stats
          ? stats.dueByTomorrow > 0
            ? `${stats.dueByTomorrow} problem${stats.dueByTomorrow === 1 ? '' : 's'} come due by tomorrow night. Come back to keep the streak alive.`
            : 'Nothing due tomorrow. A good day to add new problems or take the daily challenge.'
          : ' '}
      </p>
    </div>
  );
}

function pctOf(xp, level) {
  // Session may have started in the previous level; clamp to this level's bar.
  const span = level.nextLevelXp - level.levelStartXp;
  return Math.max(0, Math.round(((xp - level.levelStartXp) / span) * 100));
}

function Tile({ label, value, accent = 'text-midnight-text' }) {
  return (
    <div className="px-5 py-4">
      <p className="text-[10px] uppercase tracking-widest text-midnight-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
