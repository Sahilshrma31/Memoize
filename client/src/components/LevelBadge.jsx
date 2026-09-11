import { Link } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';

// Always-visible level in the header — a constant, glanceable reason to do one more review.
export default function LevelBadge() {
  const progress = useProgress();
  if (!progress) return null;
  const { level } = progress;

  return (
    <Link
      to="/progress"
      title={
        level.nextTitle
          ? `${level.xp.toLocaleString()} XP · ${(level.nextLevelXp - level.xp).toLocaleString()} to ${level.nextTitle}`
          : `${level.xp.toLocaleString()} XP · max level`
      }
      className="flex items-center gap-2.5 border border-midnight-border px-2.5 py-1.5 hover:border-accent-orange/50 transition-colors"
    >
      <span className="display-heading text-sm text-accent-orange tabular-nums">LV {level.level}</span>
      <span className="hidden md:block">
        <span className="block text-[10px] uppercase tracking-widest text-midnight-muted leading-none">
          {level.title}
        </span>
        <span className="mt-1 block h-1 w-20 bg-midnight-bg overflow-hidden">
          <span
            className="block h-full bg-accent-orange transition-all duration-700"
            style={{ width: `${Math.round(level.progress * 100)}%` }}
          />
        </span>
      </span>
    </Link>
  );
}
