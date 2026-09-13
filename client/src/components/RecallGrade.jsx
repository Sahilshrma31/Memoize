const RATING_COLOR = {
  blackout: 'text-rating-blackout',
  hard: 'text-rating-hard',
  good: 'text-rating-good',
  easy: 'text-rating-easy',
};

const RATING_BAR = {
  blackout: 'bg-rating-blackout',
  hard: 'bg-rating-hard',
  good: 'bg-rating-good',
  easy: 'bg-rating-easy',
};

/**
 * The result of grading a from-memory attempt against your own saved intuition
 * and solution. The score is the model's; the rating it maps to is decided
 * server-side in utils/recallGrader.js so it stays consistent.
 */
export default function RecallGrade({ grade }) {
  const color = RATING_COLOR[grade.suggestedRating] || 'text-midnight-text';

  return (
    <div className="border border-midnight-border bg-midnight-bg p-3">
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-medium tabular-nums ${color}`}>{grade.score}</span>
        <span className="text-[10px] uppercase tracking-widest text-midnight-muted">/ 100 recall</span>
        <span className={`ml-auto text-[10px] uppercase tracking-widest ${color}`}>
          suggests {grade.suggestedRating}
        </span>
      </div>

      <div className="mt-2 h-0.5 w-full bg-midnight-border">
        <div
          className={`h-full transition-all duration-500 ${RATING_BAR[grade.suggestedRating] || 'bg-midnight-muted'}`}
          style={{ width: `${grade.score}%` }}
        />
      </div>

      {grade.verdict && (
        <p className="mt-2.5 text-sm text-midnight-text leading-relaxed">{grade.verdict}</p>
      )}

      {grade.matched?.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {grade.matched.map((item) => (
            <li key={item} className="text-xs text-rating-good">
              ✓ {item}
            </li>
          ))}
        </ul>
      )}

      {grade.missed?.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {grade.missed.map((item) => (
            <li key={item} className="text-xs text-midnight-muted">
              <span className="text-rating-hard">✗</span> {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
