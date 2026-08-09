import { useEffect, useState } from 'react';
import { problemsApi } from '../api/client';
import { useToast } from '../context/ToastContext';

function timeAgo(date) {
  if (!date) return null;
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * Write / revise the key insight for a problem.
 *
 * `startHidden` powers the review flow: during a review the intuition stays
 * covered so you attempt recall first, then reveal to check yourself. Showing
 * it immediately would defeat the point of the review.
 */
export default function IntuitionPanel({ problem, onSaved, startHidden = false, compact = false }) {
  const [revealed, setRevealed] = useState(!startHidden);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(problem.intuition || '');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setDraft(problem.intuition || '');
    setRevealed(!startHidden);
    setEditing(false);
  }, [problem._id, problem.intuition, startHidden]);

  const hasIntuition = Boolean(problem.intuition?.trim());

  const save = async () => {
    setSaving(true);
    try {
      const { problem: updated } = await problemsApi.update(problem._id, { intuition: draft });
      showToast('Intuition saved');
      setEditing(false);
      onSaved?.(updated);
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not save intuition', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(problem.intuition || '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={compact ? '' : 'border border-midnight-border bg-midnight-surface p-5'}>
        {!compact && <Header problem={problem} />}
        <textarea
          autoFocus
          rows={compact ? 3 : 5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What's the key insight? Write it as the thing you'd want to remember in an interview."
          className="w-full border border-midnight-border bg-midnight-bg px-3 py-2 text-sm outline-none focus:border-accent-orange/60 transition-colors resize-none"
        />
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-accent-orange hover:bg-accent-orange/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-black transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="border border-midnight-border px-4 py-1.5 text-xs uppercase tracking-wide text-midnight-muted hover:text-midnight-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'border border-midnight-border bg-midnight-surface p-5'}>
      {!compact && <Header problem={problem} onEdit={() => setEditing(true)} hasIntuition={hasIntuition} />}

      {!hasIntuition ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full border border-dashed border-midnight-border px-4 py-5 text-sm text-midnight-muted hover:border-accent-orange/50 hover:text-midnight-text transition-colors"
        >
          + Write the key insight for this problem
        </button>
      ) : !revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="w-full border border-dashed border-midnight-border px-4 py-4 text-sm text-midnight-muted hover:border-accent-orange/50 hover:text-midnight-text transition-colors"
        >
          Try to recall it first — then reveal your intuition
        </button>
      ) : (
        <div>
          <p className="text-sm text-midnight-text whitespace-pre-wrap leading-relaxed">
            {problem.intuition}
          </p>
          {compact && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 text-xs text-accent-orange hover:underline"
            >
              Refine it
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Header({ problem, onEdit, hasIntuition }) {
  const updated = timeAgo(problem.intuitionUpdatedAt);
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="display-heading text-sm tracking-wide">Intuition</h3>
      <div className="flex items-center gap-3">
        {updated && <span className="text-xs text-midnight-muted">updated {updated}</span>}
        {hasIntuition && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-accent-orange hover:underline"
          >
            Refine
          </button>
        )}
      </div>
    </div>
  );
}
