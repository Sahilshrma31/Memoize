import { LANGUAGES } from '../utils/highlight';

export default function LanguageSelect({ value, onChange, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Solution language"
      className={`border border-midnight-border bg-midnight-bg px-2 py-1 text-xs outline-none focus:border-accent-orange/60 transition-colors ${className}`}
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.id} value={lang.id}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
