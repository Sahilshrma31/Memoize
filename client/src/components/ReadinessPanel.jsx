import { useEffect, useState } from 'react';
import { progressApi } from '../api/client';
import { useToast } from '../context/ToastContext';

const STATUS = {
  ready: { text: 'text-rating-good', dot: 'bg-rating-good', label: 'ready' },
  developing: { text: 'text-rating-hard', dot: 'bg-rating-hard', label: 'developing' },
  weak: { text: 'text-rating-blackout', dot: 'bg-rating-blackout', label: 'weak' },
  'not-started': { text: 'text-midnight-muted', dot: 'bg-midnight-border', label: 'not started' },
};

const inputCls =
  'border border-midnight-border bg-midnight-bg px-3 py-2 text-sm outline-none focus:border-accent-orange/60 transition-colors';

function recallCls(percent) {
  if (percent >= 80) return 'text-rating-good';
  if (percent >= 50) return 'text-rating-hard';
  return 'text-rating-blackout';
}

function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

function GoalForm({ goal, onSaved, onCancel }) {
  const [date, setDate] = useState(toDateInput(goal?.interviewDate));
  const [company, setCompany] = useState(goal?.company || '');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await progressApi.setGoal({ interviewDate: date || null, company });
      showToast(date ? 'Interview goal saved. Countdown on.' : 'Interview goal cleared');
      onSaved?.();
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not save goal', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-midnight-muted">Interview date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} style={{ colorScheme: 'dark' }} />
      </label>
      <label className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
        <span className="text-xs uppercase tracking-wide text-midnight-muted">Company</span>
        <input
          type="text"
          value={company}
          maxLength={60}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Google, Meta, Amazon…"
          className={inputCls}
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="bg-accent-orange hover:bg-accent-orange/90 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-black disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className="border border-midnight-border px-4 py-2 text-xs uppercase tracking-wide text-midnight-muted hover:text-midnight-text">
          Cancel
        </button>
      )}
    </form>
  );
}

/**
 * How ready you are across the core interview patterns, and whether you're on
 * pace for your interview date.
 */
export default function ReadinessPanel({ readiness, goal, onGoalSaved }) {
  const [editing, setEditing] = useState(false);
  const countdown = readiness?.countdown;

  useEffect(() => {
    setEditing(false);
  }, [goal?.interviewDate, goal?.company]);

  if (!readiness) return null;

  return (
    <div className="border border-midnight-border bg-midnight-surface">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] divide-y sm:divide-y-0 sm:divide-x divide-midnight-border">
        {/* Countdown */}
        <div className="px-5 py-5">
          {countdown && !editing ? (
            <>
              <p className="display-heading text-5xl text-accent-orange tabular-nums">{countdown.daysLeft}</p>
              <p className="mt-1 text-sm">
                day{countdown.daysLeft === 1 ? '' : 's'} to {countdown.company || 'your interview'}
              </p>
              <p className="text-xs text-midnight-muted mt-0.5">
                {new Date(countdown.interviewDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
              <button type="button" onClick={() => setEditing(true)} className="mt-3 text-xs text-accent-orange hover:underline">
                Edit goal
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">{editing ? 'Update your goal' : 'When’s the interview?'}</p>
              <p className="text-xs text-midnight-muted mt-1 mb-4">
                Set a date to get a countdown and a daily pace to hit full coverage in time.
              </p>
              <GoalForm goal={goal} onSaved={onGoalSaved} onCancel={editing ? () => setEditing(false) : null} />
            </>
          )}
        </div>

        {/* Score */}
        <div className="px-5 py-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[10px] uppercase tracking-widest text-midnight-muted">Readiness</p>
            <p className="display-heading text-3xl tabular-nums">{readiness.score}%</p>
          </div>
          <div className="mt-2 h-2 bg-midnight-bg overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${readiness.score >= 80 ? 'bg-rating-good' : readiness.score >= 50 ? 'bg-rating-hard' : 'bg-accent-orange'}`}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
          {readiness.focus.length > 0 && (
            <p className="mt-3 text-sm">
              <span className="text-midnight-muted">Focus next: </span>
              {readiness.focus.join(' · ')}
            </p>
          )}
          {countdown && countdown.problemsNeeded > 0 && (
            <p className="mt-1 text-xs text-midnight-muted">
              Pace: ~{countdown.problemsPerDay} new problem{countdown.problemsPerDay === 1 ? '' : 's'}/day in these patterns to cover all{' '}
              {readiness.patterns.length} core patterns before {countdown.company || 'the interview'}.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-midnight-border grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-midnight-border">
        {[readiness.patterns.slice(0, 7), readiness.patterns.slice(7)].map((column, i) => (
          <ul key={i} className="divide-y divide-midnight-border">
            {column.map((p) => {
              const s = STATUS[p.status];
              return (
                <li key={p.name} className="px-5 py-2 flex items-center gap-3 text-sm">
                  <span className="flex-1 truncate" title={p.name}>{p.name}</span>
                  <span className="flex gap-0.5" title={`${p.problemCount} of ${p.target} problems`}>
                    {Array.from({ length: p.target }, (_, k) => (
                      <span key={k} className={`h-2 w-2 ${k < p.problemCount ? s.dot : 'bg-midnight-bg ring-1 ring-inset ring-midnight-border'}`} />
                    ))}
                  </span>
                  {/* Dots show the pattern's status; the number is coloured by recall
                      alone, so "100% recall" never shows up red just for low coverage. */}
                  <span className={`w-20 text-right text-[11px] tabular-nums ${p.recallPercent !== null ? recallCls(p.recallPercent) : s.text}`}>
                    {p.recallPercent !== null ? `${p.recallPercent}% recall` : s.label}
                  </span>
                </li>
              );
            })}
          </ul>
        ))}
      </div>

      <p className="px-5 py-3 border-t border-midnight-border text-[11px] text-midnight-muted">
        Each pattern scores coverage (up to {readiness.targetPerPattern} problems) × recall. Until a pattern has 3+ reviews, its recall counts as 40%.
      </p>
    </div>
  );
}
