import { useEffect, useRef, useState } from 'react';

function formatTime(totalSec) {
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function Stopwatch({ onTick }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          onTick?.(next);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, onTick]);

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm tabular-nums text-midnight-muted">
        {formatTime(seconds)}
      </span>
      <button
        type="button"
        onClick={() => setRunning((r) => !r)}
        className="border border-midnight-border px-2 py-1 text-xs uppercase tracking-wide text-midnight-muted hover:text-midnight-text hover:border-accent-orange/50 transition-colors"
      >
        {running ? 'Pause' : seconds > 0 ? 'Resume' : 'Start'}
      </button>
    </div>
  );
}
