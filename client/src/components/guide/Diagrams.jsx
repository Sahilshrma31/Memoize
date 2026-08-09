const ORANGE = '#ff5a1f';
const MUTED = '#888888';
const BORDER = '#222222';
const MONO = 'JetBrains Mono, monospace';

function Frame({ label, children, height = 210 }) {
  return (
    <figure className="border border-midnight-border bg-midnight-surface">
      <div className="px-4 py-2.5 border-b border-midnight-border">
        <figcaption className="text-xs uppercase tracking-widest text-midnight-muted">
          {label}
        </figcaption>
      </div>
      <div className="p-4 overflow-x-auto">
        <svg viewBox={`0 0 660 ${height}`} className="w-full min-w-[520px]" role="img">
          {children}
        </svg>
      </div>
    </figure>
  );
}

/** Memory decaying to nothing vs. being reset by well-timed reviews. */
export function ForgettingCurve() {
  return (
    <Frame label="Fig 1 — why reviewing beats re-grinding" height={210}>
      {/* axes */}
      <line x1="40" y1="170" x2="640" y2="170" stroke={BORDER} strokeWidth="1" />
      <line x1="40" y1="15" x2="40" y2="170" stroke={BORDER} strokeWidth="1" />

      {/* 80% threshold */}
      <line x1="40" y1="58" x2="640" y2="58" stroke="#e0c34c" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
      <text x="636" y="74" fill="#e0c34c" fontSize="10" fontFamily={MONO} textAnchor="end" opacity="0.9">
        80% — the review point
      </text>

      {/* not reviewed */}
      <path
        d="M40,22 C100,70 180,130 300,152 C420,168 520,172 640,174"
        fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="5 4" opacity="0.75"
      />
      <text x="470" y="162" fill={MUTED} fontSize="11" fontFamily={MONO}>never reviewed</text>

      {/* reviewed — sawtooth resetting at the threshold */}
      <path
        d="M40,22 C55,36 70,48 95,58 L95,22 C125,36 155,48 190,58 L190,22 C250,36 310,48 375,58 L375,22 C450,36 540,48 640,58"
        fill="none" stroke={ORANGE} strokeWidth="2.5"
      />
      {[95, 190, 375].map((x) => (
        <g key={x}>
          <line x1={x} y1="22" x2={x} y2="58" stroke={ORANGE} strokeWidth="1" opacity="0.35" />
          <circle cx={x} cy="22" r="3.5" fill={ORANGE} />
        </g>
      ))}
      <text x="430" y="16" fill={ORANGE} fontSize="11" fontFamily={MONO}>reviewed on schedule</text>

      {/* labels */}
      <text x="14" y="26" fill={MUTED} fontSize="10" fontFamily={MONO}>100%</text>
      <text x="20" y="174" fill={MUTED} fontSize="10" fontFamily={MONO}>0%</text>
      <text x="40" y="196" fill={MUTED} fontSize="10" fontFamily={MONO}>time →</text>
      <text x="560" y="196" fill={MUTED} fontSize="10" fontFamily={MONO}>gaps get longer</text>
    </Frame>
  );
}

/** The four-step daily loop. */
export function ReviewLoop() {
  const steps = [
    { x: 20, label: 'ADD', sub: 'once' },
    { x: 180, label: 'RECALL', sub: 'try first' },
    { x: 340, label: 'RATE', sub: '4 buttons' },
    { x: 500, label: 'RESCHEDULE', sub: 'automatic' },
  ];
  return (
    <Frame label="Fig 2 — the daily loop" height={150}>
      {steps.map((s, i) => (
        <g key={s.label}>
          <rect x={s.x} y="35" width="130" height="56" fill="none" stroke={i === 3 ? ORANGE : BORDER} strokeWidth="1" />
          <text x={s.x + 65} y="60" fill={i === 3 ? ORANGE : '#f2f2ef'} fontSize="13" fontFamily={MONO} textAnchor="middle">
            {s.label}
          </text>
          <text x={s.x + 65} y="77" fill={MUTED} fontSize="10" fontFamily={MONO} textAnchor="middle">
            {s.sub}
          </text>
          {i < 3 && (
            <>
              <line x1={s.x + 130} y1="63" x2={s.x + 172} y2="63" stroke={BORDER} strokeWidth="1" />
              <path d={`M${s.x + 172},63 l-6,-4 v8 z`} fill={MUTED} />
            </>
          )}
        </g>
      ))}
      {/* loop-back arrow */}
      <path d="M565,91 v22 H85 v-22" fill="none" stroke={ORANGE} strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
      <path d="M85,91 l-4,7 h8 z" fill={ORANGE} opacity="0.7" />
      <text x="325" y="129" fill={ORANGE} fontSize="10" fontFamily={MONO} textAnchor="middle" opacity="0.85">
        repeats at a wider gap each time
      </text>
    </Frame>
  );
}

/** How the gap between reviews grows. */
export function IntervalGrowth() {
  const gaps = [
    { n: '1st', days: 1 },
    { n: '2nd', days: 6 },
    { n: '3rd', days: 15 },
    { n: '4th', days: 38 },
    { n: '5th', days: 95 },
    { n: '6th', days: 238 },
  ];
  const max = 238;
  return (
    <Frame label="Fig 3 — the gap after each successful review" height={190}>
      {gaps.map((g, i) => {
        const y = 12 + i * 28;
        const w = Math.max(4, (g.days / max) * 500);
        return (
          <g key={g.n}>
            <text x="40" y={y + 13} fill={MUTED} fontSize="11" fontFamily={MONO} textAnchor="end">
              {g.n}
            </text>
            <rect x="52" y={y} width={w} height="17" fill={ORANGE} opacity={0.35 + i * 0.13} />
            <text x={52 + w + 10} y={y + 13} fill="#f2f2ef" fontSize="11" fontFamily={MONO}>
              {g.days} {g.days === 1 ? 'day' : 'days'}
            </text>
          </g>
        );
      })}
      <text x="52" y="182" fill={MUTED} fontSize="10" fontFamily={MONO}>
        6 reviews ≈ 1 year → the problem is yours for good
      </text>
    </Frame>
  );
}
