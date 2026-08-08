import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import useInView from '../hooks/useInView';

const ORANGE = '#ff5a1f';
const MUTED = '#888888';
const BORDER = '#222222';
const INTERVALS = [1, 6, 15, 38]; // mirrors SM-2's interval growth for consecutive "good" reviews
const POINTS_PER_DAY = 4;

function buildSegments(intervals) {
  let cursor = 0;
  return intervals.map((len) => {
    const seg = { start: cursor, end: cursor + len, len };
    cursor += len;
    return seg;
  });
}

function retentionAt(day, segments) {
  const seg = segments.find((s) => day >= s.start && day <= s.end) || segments[segments.length - 1];
  const t = day - seg.start;
  const tau = seg.len / Math.log(1 / 0.8);
  return Math.exp(-t / tau) * 100;
}

const SEGMENTS = buildSegments(INTERVALS);
const TOTAL_DAYS = SEGMENTS[SEGMENTS.length - 1].end;
const REVIEW_POINTS = SEGMENTS.map((s) => s.start).slice(1).concat(TOTAL_DAYS);

const CHART_DATA = Array.from({ length: TOTAL_DAYS * POINTS_PER_DAY + 1 }, (_, i) => {
  const day = i / POINTS_PER_DAY;
  return { day: Number(day.toFixed(2)), retention: Number(retentionAt(day, SEGMENTS).toFixed(1)) };
});

export default function SpacedRepetitionChart() {
  const [sectionRef, inView] = useInView({ threshold: 0.3 });
  const [cursorDay, setCursorDay] = useState(0);

  useEffect(() => {
    if (!inView) return undefined;
    const stepMs = 90;
    const stepDays = 0.35;
    const id = setInterval(() => {
      setCursorDay((d) => (d + stepDays > TOTAL_DAYS ? 0 : d + stepDays));
    }, stepMs);
    return () => clearInterval(id);
  }, [inView]);

  const cursorRetention = useMemo(() => retentionAt(cursorDay, SEGMENTS), [cursorDay]);

  return (
    <div ref={sectionRef} className="border border-midnight-border bg-midnight-surface">
      <div className="flex items-center justify-between px-5 py-4 border-b border-midnight-border">
        <h3 className="display-heading text-sm tracking-wide">The Remembering Curve</h3>
        <span className="text-xs text-midnight-muted">R(t) = e^(-t / τ)</span>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={CHART_DATA} margin={{ top: 20, right: 20, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="srFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ORANGE} stopOpacity={0.35} />
                <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={BORDER} vertical={false} />
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, TOTAL_DAYS]}
              stroke={BORDER}
              fontSize={11}
              tickFormatter={(d) => `${d}d`}
              tick={{ fill: MUTED, fontFamily: 'JetBrains Mono, monospace' }}
            />
            <YAxis
              domain={[0, 100]}
              stroke={BORDER}
              fontSize={11}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: MUTED, fontFamily: 'JetBrains Mono, monospace' }}
            />
            <Tooltip
              contentStyle={{
                background: '#0a0a0a',
                border: `1px solid ${BORDER}`,
                borderRadius: 0,
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
              }}
              labelFormatter={(d) => `Day ${d}`}
              formatter={(value) => [`${value}%`, 'Retention']}
            />
            <ReferenceLine
              y={80}
              stroke="#e0c34c"
              strokeDasharray="4 4"
              label={{
                value: '80% recall threshold',
                position: 'insideTopRight',
                fill: '#e0c34c',
                fontSize: 11,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
            {REVIEW_POINTS.slice(0, -1).map((rp) => (
              <ReferenceLine key={`line-${rp}`} x={rp} stroke={BORDER} strokeDasharray="2 3" />
            ))}
            <Area
              type="monotone"
              dataKey="retention"
              stroke={ORANGE}
              strokeWidth={2}
              fill="url(#srFill)"
              isAnimationActive={inView}
              animationDuration={1400}
            />
            {REVIEW_POINTS.map((rp) => (
              <ReferenceDot key={`dot-${rp}`} x={rp} y={100} r={3.5} fill={ORANGE} stroke="none" />
            ))}
            <ReferenceDot
              x={Number(cursorDay.toFixed(2))}
              y={Number(cursorRetention.toFixed(1))}
              r={5}
              fill="#0a0a0a"
              stroke={ORANGE}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 border-t border-midnight-border">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 bg-accent-orange" />
          <span className="text-xs uppercase tracking-widest text-midnight-muted">
            Retention Probability
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-accent-orange bg-midnight-bg" />
          <span className="text-xs uppercase tracking-widest text-midnight-muted">
            Reviews — Each Recall Doubles The Wait
          </span>
        </div>
      </div>
    </div>
  );
}
