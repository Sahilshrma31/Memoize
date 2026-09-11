export const RATINGS = [
  { value: 'blackout', key: '1', label: 'Blackout', cls: 'bg-rating-blackout/15 text-rating-blackout ring-rating-blackout/30 hover:bg-rating-blackout/25' },
  { value: 'hard', key: '2', label: 'Hard', cls: 'bg-rating-hard/15 text-rating-hard ring-rating-hard/30 hover:bg-rating-hard/25' },
  { value: 'good', key: '3', label: 'Good', cls: 'bg-rating-good/15 text-rating-good ring-rating-good/30 hover:bg-rating-good/25' },
  { value: 'easy', key: '4', label: 'Easy', cls: 'bg-rating-easy/15 text-rating-easy ring-rating-easy/30 hover:bg-rating-easy/25' },
];

export default function RatingButtons({ onRate, disabled, showKeys = false }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {RATINGS.map((r) => (
        <button
          key={r.value}
          type="button"
          disabled={disabled}
          onClick={() => onRate(r.value)}
          className={`ring-1 ring-inset px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-40 ${r.cls}`}
        >
          {showKeys && <span className="mr-1.5 opacity-50 font-normal">{r.key}</span>}
          {r.label}
        </button>
      ))}
    </div>
  );
}
