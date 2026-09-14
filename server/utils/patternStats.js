/**
 * Per-tag success-rate scoring, shared by the pattern tracker.
 *
 * Kept pure (no DB access) so it can be unit-tested the same way sm2.js is.
 * patternTracker.js feeds it rows already grouped by tag.
 */

// A pattern needs at least this many reviews before its success rate means
// anything — one blackout on a brand-new tag is not a weakness, it's noise.
const MIN_RELIABLE_REVIEWS = 3;

// Matches the 80% recall threshold the retention curve is built around, so
// "solid" here means the same thing it does everywhere else in the app.
const SOLID_THRESHOLD = 0.8;
const WEAK_THRESHOLD = 0.5;

/**
 * @param {Array<{tag: string, total: number, blackout: number, hard: number,
 *                good: number, easy: number, avgTimeSec: number|null,
 *                problemCount: number}>} rows
 * @returns {Array} same rows plus successRate, level, reliable — weakest first
 */
function scorePatterns(rows) {
  return rows
    .map((row) => {
      const successes = row.good + row.easy;
      const successRate = row.total > 0 ? successes / row.total : 0;
      const reliable = row.total >= MIN_RELIABLE_REVIEWS;

      return {
        ...row,
        successRate: Number(successRate.toFixed(4)),
        successPercent: Math.round(successRate * 100),
        reliable,
        level: levelFor(successRate),
        avgTimeSec: row.avgTimeSec == null ? null : Math.round(row.avgTimeSec),
      };
    })
    .sort((a, b) => {
      // Patterns with enough data come first — a 0% rate off one review
      // shouldn't outrank a genuine 40% weakness measured over 20 reviews.
      if (a.reliable !== b.reliable) return a.reliable ? -1 : 1;
      if (a.successRate !== b.successRate) return a.successRate - b.successRate;
      return b.total - a.total; // tie-break: more evidence first
    });
}

function levelFor(successRate) {
  if (successRate < WEAK_THRESHOLD) return 'weak';
  if (successRate < SOLID_THRESHOLD) return 'developing';
  return 'solid';
}

module.exports = {
  scorePatterns,
  MIN_RELIABLE_REVIEWS,
  SOLID_THRESHOLD,
  WEAK_THRESHOLD,
};
