import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../utils/format';

/**
 * Controlled by the parent (`running` / `onToggle`) so a keyboard shortcut or
 * opening the problem can start it too.
 */
export default function Stopwatch({ running, onToggle, onTick }) {
  const [seconds, setSeconds] = useState(0);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!running) return undefined;
    const interval = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        onTickRef.current?.(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`font-mono text-sm tabular-nums ${running ? 'text-midnight-text' : 'text-midnight-muted'}`}
      >
        {formatDuration(seconds).padStart(5, '0')}
      </span>
      <button
        type="button"
        onClick={onToggle}
        className="border border-midnight-border px-2 py-1 text-xs uppercase tracking-wide text-midnight-muted hover:text-midnight-text hover:border-accent-orange/50 transition-colors"
      >
        {running ? 'Pause' : seconds > 0 ? 'Resume' : 'Start'}
      </button>
    </div>
  );
}
