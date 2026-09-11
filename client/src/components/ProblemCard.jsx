import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Chip from './Chip';
import IntuitionPanel from './IntuitionPanel';
import PlatformBadge from './PlatformBadge';
import RatingButtons, { RATINGS } from './RatingButtons';
import Stopwatch from './Stopwatch';

const RATING_BY_KEY = Object.fromEntries(RATINGS.map((r) => [r.key, r.value]));

// Shortcuts must never fire while typing in a field.
function isTypingTarget(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

/**
 * One problem to review. The `active` card (top of the queue) owns the
 * keyboard: 1–4 rate, Space reveals the intuition, S toggles the timer,
 * O opens the problem and starts the timer.
 */
export default function ProblemCard({
  card,
  onRate,
  leaving,
  active = false,
  autoStart = false,
  variant = 'queue', // 'challenge' hides notes, intuition and companies
}) {
  const [problem, setProblem] = useState(card.problemId);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(autoStart);
  const [revealRequest, setRevealRequest] = useState(0);
  const secondsRef = useRef(0);
  const isChallenge = variant === 'challenge';

  const handleRate = useCallback(
    async (rating) => {
      if (submitting) return;
      setSubmitting(true);
      setRunning(false);
      const ok = await onRate(card._id, rating, secondsRef.current);
      if (ok === false) setSubmitting(false); // failed — let them try again
    },
    [submitting, onRate, card._id]
  );

  const openProblem = useCallback(() => {
    window.open(problem.url, '_blank', 'noopener,noreferrer');
    setRunning(true);
  }, [problem.url]);

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      // A modal (e.g. the level-up overlay) is covering the card — don't rate blind.
      if (document.querySelector('[aria-modal="true"]')) return;
      if (RATING_BY_KEY[e.key]) {
        e.preventDefault();
        handleRate(RATING_BY_KEY[e.key]);
      } else if (e.key === ' ') {
        e.preventDefault();
        setRevealRequest((n) => n + 1);
      } else if (e.key === 's' || e.key === 'S') {
        setRunning((r) => !r);
      } else if (e.key === 'o' || e.key === 'O') {
        openProblem();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, handleRate, openProblem]);

  return (
    <div
      className={`border bg-midnight-surface p-5 transition-all duration-300 ${
        leaving ? 'opacity-0 -translate-x-3 scale-95' : 'opacity-100'
      } ${active ? 'border-accent-orange/40' : 'border-midnight-border'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <PlatformBadge platform={problem.platform} />
            <span className="text-xs text-midnight-muted capitalize">{problem.difficulty}</span>
            {active && !isChallenge && (
              <span className="text-[10px] uppercase tracking-widest text-accent-orange">up next</span>
            )}
          </div>
          <Link
            to={`/problems/${problem._id}`}
            className="text-base font-medium text-midnight-text hover:text-accent-orange transition-colors"
          >
            {problem.title}
          </Link>
        </div>
        <button
          type="button"
          onClick={openProblem}
          className="shrink-0 text-xs text-accent-orange hover:underline"
          title="Opens the problem and starts the timer"
        >
          Open ↗
        </button>
      </div>

      {(problem.tags?.length > 0 || problem.company?.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {problem.tags?.map((t) => (
            <Chip key={`tag-${t}`} label={t} />
          ))}
          {!isChallenge &&
            problem.company?.map((c) => (
              <Chip key={`co-${c}`} label={c} />
            ))}
        </div>
      )}

      {/* A challenge is solved cold: no notes, no intuition. */}
      {!isChallenge && problem.notes && (
        <p className="mt-3 text-sm text-midnight-muted line-clamp-2">{problem.notes}</p>
      )}

      {!isChallenge && (
        <div className="mt-4">
          <IntuitionPanel
            problem={problem}
            onSaved={setProblem}
            startHidden
            compact
            revealRequest={revealRequest}
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <Stopwatch
          running={running}
          onToggle={() => setRunning((r) => !r)}
          onTick={(s) => (secondsRef.current = s)}
        />
        {active && (
          <span className="hidden sm:block text-[10px] text-midnight-muted/70 tracking-wide">
            1–4 rate · {isChallenge ? '' : 'space reveal · '}s timer · o open
          </span>
        )}
      </div>

      <div className="mt-3">
        <RatingButtons onRate={handleRate} disabled={submitting} showKeys={active} />
      </div>
    </div>
  );
}
