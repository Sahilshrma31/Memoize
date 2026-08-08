import { useEffect, useState } from 'react';
import { reviewsApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import ProblemCard from './ProblemCard';

export default function TodayQueue({ onQueueChange }) {
  const [cards, setCards] = useState([]);
  const [leavingIds, setLeavingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

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

  const handleRate = async (cardId, rating, timeTakenSec) => {
    setLeavingIds((prev) => new Set(prev).add(cardId));
    try {
      await reviewsApi.submit(cardId, { rating, timeTakenSec });
      setTimeout(() => {
        setCards((prev) => prev.filter((c) => c._id !== cardId));
        onQueueChange?.();
      }, 280);
    } catch {
      showToast('Failed to submit review', 'error');
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }
  };

  if (loading) {
    return <p className="text-sm text-midnight-muted">Loading today’s queue…</p>;
  }

  if (cards.length === 0) {
    return (
      <div className="border border-dashed border-midnight-border p-10 text-center">
        <p className="text-midnight-text font-medium">You’re all caught up</p>
        <p className="text-sm text-midnight-muted mt-1">No problems due for review right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <ProblemCard
          key={card._id}
          card={card}
          onRate={handleRate}
          leaving={leavingIds.has(card._id)}
        />
      ))}
    </div>
  );
}
