import { useEffect, useState } from 'react';

export default function useCountUp(target, { start = false, duration = 900 } = {}) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return undefined;

    let raf;
    const startTime = performance.now();
    const from = 0;

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);

  return value;
}
