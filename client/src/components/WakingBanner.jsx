import { useEffect, useState } from 'react';

/**
 * Free hosting tiers sleep the API after a period of inactivity, so the first
 * request can hang for ~30s while the instance boots. Without feedback that
 * reads as "the app is broken", so surface it explicitly.
 */
export default function WakingBanner() {
  const [waking, setWaking] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const onWaking = () => {
      setSeconds(0);
      setWaking(true);
    };
    const onAwake = () => setWaking(false);

    window.addEventListener('memoize:waking', onWaking);
    window.addEventListener('memoize:awake', onAwake);
    return () => {
      window.removeEventListener('memoize:waking', onWaking);
      window.removeEventListener('memoize:awake', onAwake);
    };
  }, []);

  useEffect(() => {
    if (!waking) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [waking]);

  if (!waking) return null;

  return (
    <div className="border-b border-accent-orange/30 bg-accent-orange/10">
      <div className="mx-auto max-w-5xl px-6 py-2.5 flex items-center gap-3">
        <span className="h-2 w-2 bg-accent-orange animate-pulse" />
        <p className="text-xs text-midnight-text">
          Waking the server — free hosting sleeps when idle. This can take up to 30 seconds.
        </p>
        <span className="ml-auto text-xs tabular-nums text-midnight-muted">{seconds}s</span>
      </div>
    </div>
  );
}
