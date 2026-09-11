import { useEffect, useState } from 'react';
import { reviewsApi } from '../api/client';
import { useCelebration } from '../context/CelebrationContext';
import { useToast } from '../context/ToastContext';
import ProblemCard from './ProblemCard';
import SessionSummary from './SessionSummary';

const EMPTY_SESSION = {
  reviewed: 0,
  recalled: 0,
  xp: 0,
  startXp: null,
  level: null,
  streak: null,
  redemptions: 0,
  personalBests: [],
  achievements: [],
};

function addToSession(session, cardId, rating, rewards) {
  const next = {
    ...session,
    reviewed: session.reviewed + 1,
    recalled: session.recalled + (rating === 'good' || rating === 'easy' ? 1 : 0),
  };
  if (!rewards) return next;
  return {
    ...next,
    xp: session.xp + rewards.xpGained,
    startXp: session.startXp ?? rewards.level.xp - rewards.xpGained,
    level: rewards.level,
    streak: rewards.streak,
    redemptions: session.redemptions + (rewards.redemption ? 1 : 0),
    personalBests: rewards.personalBest
      ? [...session.personalBests, { cardId, ...rewards.personalBest }]
      : session.personalBests,
    achievements: [...session.achievements, ...rewards.newAchievements],
  };
}

export default function TodayQueue({ onQueueChange, keyboardEnabled = true }) {
  const [cards, setCards] = useState([]);
  const [leavingIds, setLeavingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(EMPTY_SESSION);
  const { showToast } = useToast();
  const { celebrate } = useCelebration();

  const load = async () => {
    setLoading(true);
    try {
      const data = await reviewsApi.today();
      setCards(data);
      onQueueChange?.();
    } catch {
      showToast('Failed to load today’s queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolves true on success so the card knows whether to re-enable its buttons.
  const handleRate = async (cardId, rating, timeTakenSec) => {
    setLeavingIds((prev) => new Set(prev).add(cardId));
    try {
      const { rewards } = await reviewsApi.submit(cardId, { rating, timeTakenSec });
      celebrate(rewards);
      setSession((s) => addToSession(s, cardId, rating, rewards));
      setTimeout(() => {
        setCards((prev) => prev.filter((c) => c._id !== cardId));
        onQueueChange?.();
      }, 280);
      return true;
    } catch {
      showToast('Failed to submit review', 'error');
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      return false;
    }
  };

  if (loading) {
    return <p className="text-sm text-midnight-muted">Loading today’s queue…</p>;
  }

  if (cards.length === 0) {
    if (session.reviewed > 0) return <SessionSummary session={session} />;
    return (
      <div className="border border-dashed border-midnight-border p-10 text-center">
        <p className="text-midnight-text font-medium">You’re all caught up</p>
        <p className="text-sm text-midnight-muted mt-1">
          Nothing due right now. Take the daily challenge below, or add a problem you solved today.
        </p>
      </div>
    );
  }

  const pending = cards.filter((c) => !leavingIds.has(c._id));
  const activeId = pending[0]?._id;
  const remaining = pending.length;

  return (
    <div className="space-y-3">
      {session.reviewed > 0 && (
        <div className="flex items-center justify-between text-xs text-midnight-muted">
          <span>
            {session.reviewed} done · {remaining} to go
          </span>
          {session.xp > 0 && <span className="text-accent-orange tabular-nums">+{session.xp} XP this session</span>}
        </div>
      )}
      {cards.map((card) => (
        <ProblemCard
          key={card._id}
          card={card}
          onRate={handleRate}
          leaving={leavingIds.has(card._id)}
          active={keyboardEnabled && card._id === activeId}
        />
      ))}
    </div>
  );
}
