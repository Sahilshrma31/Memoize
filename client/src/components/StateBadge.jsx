const STYLES = {
  learning: 'text-rating-hard bg-rating-hard/10 ring-rating-hard/25',
  review: 'text-accent-orange bg-accent-orange/10 ring-accent-orange/25',
  mastered: 'text-rating-good bg-rating-good/10 ring-rating-good/25',
};

export default function StateBadge({ state }) {
  const cls = STYLES[state] || STYLES.review;
  return <span className={`chip ring-1 ring-inset ${cls}`}>{state}</span>;
}
