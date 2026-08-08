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

const RECALL_THRESHOLD = 80;
const POINTS = 60;
const ORANGE = '#ff5a1f';
const MUTED = '#888888';
const BORDER = '#222222';

function buildCurve(lastReviewedAt, intervalDays) {
  const tau = intervalDays / Math.log(1 / 0.8);
  const start = new Date(lastReviewedAt);

  return Array.from({ length: POINTS + 1 }, (_, i) => {
    const t = (intervalDays * i) / POINTS;
    const retention = Math.exp(-t / tau) * 100;
    const date = new Date(start.getTime() + t * 24 * 60 * 60 * 1000);
    return {
      day: Number(t.toFixed(2)),
      date: date.toLocaleDateString(),
      retention: Number(retention.toFixed(1)),
    };
  });
}

export default function RetentionChart({ reviewCard }) {
  if (!reviewCard?.lastReviewedAt || !reviewCard?.intervalDays) {
    return (
      <div className="border border-dashed border-midnight-border p-8 text-center text-sm text-midnight-muted">
        No review history yet — complete a review to see the retention curve.
      </div>
    );
  }

  const data = buildCurve(reviewCard.lastReviewedAt, reviewCard.intervalDays);
  const lastPoint = data[data.length - 1];

  return (
    <div className="border border-midnight-border bg-midnight-surface">
      <div className="flex items-center justify-between px-5 py-4 border-b border-midnight-border">
        <h3 className="display-heading text-sm tracking-wide">Retention Curve</h3>
        <span className="text-xs text-midnight-muted">R(t) = e^(-t / τ)</span>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 20, right: 40, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ORANGE} stopOpacity={0.35} />
                <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={BORDER} vertical={false} />
            <XAxis
              dataKey="day"
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
              y={RECALL_THRESHOLD}
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
            <Area
              type="monotone"
              dataKey="retention"
              stroke={ORANGE}
              strokeWidth={2}
              fill="url(#retentionFill)"
            />
            <ReferenceDot
              x={lastPoint.day}
              y={lastPoint.retention}
              r={4}
              fill={ORANGE}
              stroke="none"
              label={{
                value: `${lastPoint.retention}%`,
                position: 'right',
                fill: ORANGE,
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-2 px-5 py-3 border-t border-midnight-border">
        <span className="h-2.5 w-2.5 bg-accent-orange" />
        <span className="text-xs uppercase tracking-widest text-midnight-muted">
          Retention Probability
        </span>
      </div>
    </div>
  );
}
