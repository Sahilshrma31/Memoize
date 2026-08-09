import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { problemsApi } from '../api/client';
import { useToast } from '../context/ToastContext';

/**
 * Two-step delete. Removing a problem also removes its scheduling card and
 * every review ever logged against it, so the history loss is spelled out
 * before the destructive click rather than after.
 */
export default function DeleteProblem({ problem, reviewLogCount = 0 }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await problemsApi.remove(problem._id);
      showToast(`Deleted "${problem.title}"`);
      navigate('/problems', { replace: true });
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not delete problem', 'error');
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs uppercase tracking-wide text-midnight-muted hover:text-rating-blackout transition-colors"
      >
        Delete problem
      </button>
    );
  }

  return (
    <div className="border border-rating-blackout/40 bg-rating-blackout/5 p-4">
      <p className="text-sm text-midnight-text">
        Delete <span className="font-semibold">{problem.title}</span>?
      </p>
      <p className="mt-1 text-xs text-midnight-muted">
        This also removes its schedule and{' '}
        {reviewLogCount === 0
          ? 'any review history'
          : `all ${reviewLogCount} logged review${reviewLogCount === 1 ? '' : 's'}`}
        . Your streak and pattern stats will be recalculated without it. This can’t be undone.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="bg-rating-blackout hover:bg-rating-blackout/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-black transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Yes, delete it'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="border border-midnight-border px-4 py-1.5 text-xs uppercase tracking-wide text-midnight-muted hover:text-midnight-text transition-colors"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
