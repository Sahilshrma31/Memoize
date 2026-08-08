import { useState } from 'react';
import Chip from './Chip';

export default function ChipsInput({ label, placeholder, values, onChange }) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const value = draft.trim();
    if (value && !values.includes(value)) {
      onChange([...values, value]);
    }
    setDraft('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const remove = (idx) => onChange(values.filter((_, i) => i !== idx));

  return (
    <div>
      {label && (
        <label className="block text-xs uppercase tracking-wide text-midnight-muted mb-1.5">
          {label}
        </label>
      )}
      <div className="flex flex-wrap items-center gap-1.5 border border-midnight-border bg-midnight-bg px-3 py-2 focus-within:border-accent-orange/60 transition-colors">
        {values.map((v, i) => (
          <Chip key={v} label={v} onRemove={() => remove(i)} />
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-midnight-text placeholder:text-midnight-muted/60 outline-none py-0.5"
        />
      </div>
    </div>
  );
}
