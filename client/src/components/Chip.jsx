import { colorForLabel } from '../utils/chipColors';

export default function Chip({ label, onRemove }) {
  const { bg, text, ring } = colorForLabel(label);
  return (
    <span
      className="chip"
      style={{ backgroundColor: bg, color: text, boxShadow: `inset 0 0 0 1px ${ring}` }}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label={`Remove ${label}`}
        >
          &times;
        </button>
      )}
    </span>
  );
}
