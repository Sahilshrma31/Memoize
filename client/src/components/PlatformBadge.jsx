const STYLES = {
  leetcode: 'text-amber-400/90 bg-amber-400/10 ring-amber-400/25',
  codeforces: 'text-sky-400/90 bg-sky-400/10 ring-sky-400/25',
  gfg: 'text-emerald-400/90 bg-emerald-400/10 ring-emerald-400/25',
  other: 'text-midnight-muted bg-white/5 ring-white/10',
};

export default function PlatformBadge({ platform }) {
  const cls = STYLES[platform] || STYLES.other;
  return (
    <span className={`chip ring-1 ring-inset ${cls}`}>
      {platform}
    </span>
  );
}
