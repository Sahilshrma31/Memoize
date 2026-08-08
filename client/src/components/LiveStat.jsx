import useCountUp from '../hooks/useCountUp';
import useInView from '../hooks/useInView';

export default function LiveStat({ label, value, accent = 'text-midnight-text' }) {
  const [ref, inView] = useInView({ threshold: 0.4 });
  const animated = useCountUp(value, { start: inView, duration: 1100 });

  return (
    <div ref={ref} className="px-5 py-5">
      <p className={`display-heading text-4xl tabular-nums ${accent}`}>{animated}</p>
      <p className="mt-2 text-xs uppercase tracking-widest text-midnight-muted">{label}</p>
    </div>
  );
}
