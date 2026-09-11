import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { formatDuration } from '../utils/format';
import { useToast } from './ToastContext';

const CelebrationContext = createContext(null);

const LEVEL_UP_AUTO_DISMISS_MS = 5000;
const CONFETTI_COLORS = ['#ff5a1f', '#e8c35a', '#4fbf82', '#5b93e0', '#f2f2ef', '#8fdce6'];

function XpToast({ rewards }) {
  return (
    <div>
      <p className="font-semibold text-accent-orange tabular-nums">+{rewards.xpGained} XP</p>
      <p className="text-[11px] text-midnight-muted mt-0.5">
        {rewards.reasons.map((r) => `${r.label} +${r.xp}`).join(' · ')}
      </p>
    </div>
  );
}

function AchievementToast({ achievement }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl leading-none">{achievement.icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-[#e8c35a]">Achievement unlocked</p>
        <p className="font-semibold">{achievement.title}</p>
        <p className="text-[11px] text-midnight-muted">{achievement.description}</p>
      </div>
    </div>
  );
}

function HighlightToast({ icon, title, detail }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl leading-none">{icon}</span>
      <div>
        <p className="font-semibold">{title}</p>
        {detail && <p className="text-[11px] text-midnight-muted">{detail}</p>}
      </div>
    </div>
  );
}

function Confetti() {
  // Generated once per mount so pieces don't jump on re-render.
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2.2 + Math.random() * 1.6,
        drift: `${(Math.random() - 0.5) * 30}vw`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            backgroundColor: p.color,
            '--drift': p.drift,
            animation: `confettiFall ${p.duration}s ${p.delay}s cubic-bezier(0.2, 0.6, 0.4, 1) forwards`,
          }}
        />
      ))}
    </div>
  );
}

function LevelUpOverlay({ level, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, LEVEL_UP_AUTO_DISMISS_MS);
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Level up: ${level.title}`}
    >
      <Confetti />
      <div className="relative border border-accent-orange bg-midnight-surface px-10 py-8 text-center animate-[levelUpIn_0.35s_ease-out] max-w-sm w-full">
        <p className="eyebrow">Level Up</p>
        <p className="display-heading text-6xl text-accent-orange mt-4 tabular-nums">LV {level.level}</p>
        <p className="display-heading text-2xl mt-2">{level.title}</p>
        {level.nextTitle && (
          <p className="text-xs text-midnight-muted mt-4">
            Next: {level.nextTitle} at {level.nextLevelXp.toLocaleString()} XP
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 bg-accent-orange hover:bg-accent-orange/90 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-black"
        >
          Keep going
        </button>
      </div>
    </div>
  );
}

export function CelebrationProvider({ children }) {
  const { showToast } = useToast();
  const [levelUp, setLevelUp] = useState(null);

  // Turn a review's `rewards` payload into toasts and, on a level-up, the overlay.
  const celebrate = useCallback(
    (rewards) => {
      if (!rewards) return;

      showToast(<XpToast rewards={rewards} />, 'xp', 3200);

      if (rewards.challenge === 'won') {
        showToast(<HighlightToast icon="🐉" title="Daily challenge beaten!" detail="Bonus XP banked." />, 'achievement', 4500);
      } else if (rewards.challenge === 'lost') {
        showToast(
          <HighlightToast icon="🌀" title="Challenge got away" detail="It'll come back around soon. Get it next time." />,
          'xp',
          4000
        );
      }

      if (rewards.personalBest) {
        const { timeSec, previousSec } = rewards.personalBest;
        showToast(
          <HighlightToast
            icon="🏆"
            title={`Personal best: ${formatDuration(timeSec)}`}
            detail={`${formatDuration(previousSec - timeSec)} faster than your previous best`}
          />,
          'achievement',
          4500
        );
      }

      rewards.newAchievements?.forEach((a, i) => {
        setTimeout(() => showToast(<AchievementToast achievement={a} />, 'achievement', 5500), 350 * (i + 1));
      });

      if (rewards.levelUp) setTimeout(() => setLevelUp(rewards.levelUp), 400);
    },
    [showToast]
  );

  const close = useCallback(() => setLevelUp(null), []);

  return (
    <CelebrationContext.Provider value={{ celebrate }}>
      {children}
      {levelUp && <LevelUpOverlay level={levelUp} onClose={close} />}
    </CelebrationContext.Provider>
  );
}

export function useCelebration() {
  const ctx = useContext(CelebrationContext);
  if (!ctx) throw new Error('useCelebration must be used within a CelebrationProvider');
  return ctx;
}
