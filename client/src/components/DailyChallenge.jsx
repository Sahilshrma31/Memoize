import { useEffect, useState } from 'react';
import { reviewsApi } from '../api/client';
import { useCelebration } from '../context/CelebrationContext';
import { useToast } from '../context/ToastContext';
import Chip from './Chip';
import ProblemCard from './ProblemCard';

function untilMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(0, Math.round((midnight - now) / 60000));
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * One surprise problem a day, from wherever you're weakest. Title hidden until
 * you accept, solved cold with no notes, one attempt. Beat it for bonus XP.
 */
export default function DailyChallenge({ challenge, onDone, onActiveChange }) {
  const [accepted, setAccepted] = useState(false);
  const [localResult, setLocalResult] = useState(null);
  const { celebrate } = useCelebration();
  const { showToast } = useToast();

  const result = localResult || challenge?.result || null;
  const inProgress = accepted && !result;

  // While the challenge is open it owns the keyboard, not the queue.
  useEffect(() => {
    onActiveChange?.(inProgress);
  }, [inProgress, onActiveChange]);

  // A new day brings a new challenge.
  useEffect(() => {
    setAccepted(false);
    setLocalResult(null);
  }, [challenge?.day]);

  const handleRate = async (cardId, rating, timeTakenSec) => {
    try {
      const { rewards } = await reviewsApi.submit(cardId, { rating, timeTakenSec });
      celebrate(rewards);
      setLocalResult(rewards?.challenge || (rating === 'good' || rating === 'easy' ? 'won' : 'lost'));
      onDone?.();
      return true;
    } catch {
      showToast('Failed to submit the challenge', 'error');
      return false;
    }
  };

  if (!challenge) {
    return (
      <div className="border border-dashed border-midnight-border p-6 text-center text-sm text-midnight-muted">
        Add a few problems and a daily challenge unlocks: one surprise problem a day, aimed at your weakest spots.
      </div>
    );
  }

  if (result) {
    const won = result === 'won';
    return (
      <div className={`border p-5 flex items-center gap-4 ${won ? 'border-rating-good/40 bg-rating-good/5' : 'border-midnight-border bg-midnight-surface'}`}>
        <span className="text-3xl" aria-hidden="true">{won ? '🐉' : '🌀'}</span>
        <div>
          <p className="font-semibold">{won ? 'Challenge beaten' : 'The challenge won today'}</p>
          <p className="text-sm text-midnight-muted">
            {won ? 'Bonus XP banked. ' : 'It’s back in your rotation, so you’ll get another shot. '}
            New challenge in {untilMidnight()}.
          </p>
        </div>
      </div>
    );
  }

  const problem = challenge.card.problemId;

  if (inProgress) {
    return <ProblemCard key={challenge.card._id} card={challenge.card} onRate={handleRate} active autoStart variant="challenge" />;
  }

  return (
    <div className="border border-accent-orange/40 bg-midnight-surface animate-[pulseGlow_3s_ease-in-out_infinite]">
      <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-accent-orange">🐉 Daily challenge</p>
          <p className="mt-2 text-base font-semibold">
            Mystery problem · <span className="capitalize">{problem.difficulty}</span>
          </p>
          {problem.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {problem.tags.map((t) => (
                <Chip key={t} label={t} />
              ))}
            </div>
          )}
          <p className="mt-3 text-sm text-midnight-muted">{challenge.reason}</p>
        </div>
        <span className="text-xs text-midnight-muted tabular-nums">resets in {untilMidnight()}</span>
      </div>
      <div className="px-5 py-3 border-t border-midnight-border flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-midnight-muted">
          One attempt · no notes · timer starts on accept · recall it for <span className="text-accent-orange">+40 XP</span>
        </p>
        <button
          type="button"
          onClick={() => setAccepted(true)}
          className="bg-accent-orange hover:bg-accent-orange/90 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-black transition-colors"
        >
          Accept challenge
        </button>
      </div>
    </div>
  );
}
