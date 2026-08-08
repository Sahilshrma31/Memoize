// Deterministic, muted color assignment for tag/company pills.
// No gradients, low-saturation swatches consistent with the dark theme.
const PALETTE = [
  { bg: 'rgba(91,127,166,0.16)', text: '#8fb2d9', ring: 'rgba(91,127,166,0.35)' },
  { bg: 'rgba(74,157,143,0.16)', text: '#7fc4b6', ring: 'rgba(74,157,143,0.35)' },
  { bg: 'rgba(201,154,76,0.16)', text: '#d9b06f', ring: 'rgba(201,154,76,0.35)' },
  { bg: 'rgba(193,91,91,0.16)', text: '#df9494', ring: 'rgba(193,91,91,0.35)' },
  { bg: 'rgba(140,120,201,0.16)', text: '#b3a3e0', ring: 'rgba(140,120,201,0.35)' },
  { bg: 'rgba(91,166,161,0.16)', text: '#8fd0cb', ring: 'rgba(91,166,161,0.35)' },
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function colorForLabel(label = '') {
  const idx = hashString(label) % PALETTE.length;
  return PALETTE[idx];
}
