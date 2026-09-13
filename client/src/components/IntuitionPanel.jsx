import { useEffect, useState } from 'react';
import { problemsApi, recallApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import RecallGrade from './RecallGrade';

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
export default function IntuitionPanel({
  problem,
  onSaved,
  startHidden = false,
  compact = false,
  revealRequest = 0, // bump to reveal from outside (the Space shortcut)
  onGraded, // receives the grade so the card can flag the suggested rating
}) {
  const [revealed, setRevealed] = useState(!startHidden);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(problem.intuition || '');
  const [saving, setSaving] = useState(false);
  // What you think the approach is, typed before peeking. Not saved — its
  // only job is to make you commit to an answer so the reveal means something.
  const [attempt, setAttempt] = useState('');
  // AI recall grading is optional server-side, so the button only appears once
  // the server confirms it has a key.
  const [gradingEnabled, setGradingEnabled] = useState(false);
  const [grading, setGrading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [grade, setGrade] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    setDraft(problem.intuition || '');
    setRevealed(!startHidden);
    setEditing(false);
    setAttempt('');
    setGrade(null);
  }, [problem._id, problem.intuition, startHidden]);

  useEffect(() => {
    // Only the review flow asks you to recall first, so that's the only place
    // the grader is offered.
    if (!startHidden) return undefined;
    let alive = true;
    recallApi
      .status()
      .then((s) => alive && setGradingEnabled(Boolean(s.enabled)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [startHidden]);

  // Grading takes ten seconds or more. Without a ticking counter a static
  // "Grading…" reads as a hung button.
  useEffect(() => {
    if (!grading) return undefined;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [grading]);

  const checkRecall = async () => {
    if (!attempt.trim() || grading) return;
    setGrading(true);
    try {
      const result = await recallApi.grade(problem._id, attempt);
      setGrade(result);
      setRevealed(true); // you've committed to an answer — now compare
      onGraded?.(result);
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not grade that attempt', 'error');
    } finally {
      setGrading(false);
    }
  };

  useEffect(() => {
    if (revealRequest > 0) setRevealed(true);
  }, [revealRequest]);

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
        <div className="border border-dashed border-midnight-border p-3 space-y-2">
          <textarea
            rows={2}
            value={attempt}
            onChange={(e) => setAttempt(e.target.value)}
            placeholder="Before you peek: what's the approach? One line is enough."
            className="w-full bg-transparent text-sm text-midnight-text placeholder:text-midnight-muted/60 outline-none resize-none"
          />
          <div className="flex gap-2">
            {gradingEnabled && (
              <button
                type="button"
                onClick={checkRecall}
                disabled={!attempt.trim() || grading}
                className="flex-1 border border-accent-orange/40 px-4 py-2 text-xs uppercase tracking-wide text-accent-orange hover:bg-accent-orange/10 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {grading ? `Grading… ${elapsed}s` : 'Check my recall'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="flex-1 border border-midnight-border px-4 py-2 text-xs uppercase tracking-wide text-midnight-muted hover:border-accent-orange/50 hover:text-midnight-text transition-colors"
            >
              Reveal intuition{compact && <span className="opacity-50 normal-case"> · space</span>}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {grade && (
            <div className="mb-3">
              <RecallGrade grade={grade} />
            </div>
          )}
          {attempt.trim() && (
            <div className="mb-3 border-l-2 border-midnight-border pl-3">
              <p className="text-[10px] uppercase tracking-widest text-midnight-muted">You recalled</p>
              <p className="text-sm text-midnight-muted whitespace-pre-wrap">{attempt}</p>
            </div>
          )}
          {attempt.trim() && (
            <p className="text-[10px] uppercase tracking-widest text-accent-orange mb-1">Your intuition</p>
          )}
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
