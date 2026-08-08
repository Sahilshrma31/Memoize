/**
 * Daily activity grid + streak maths for the contribution heatmap.
 *
 * Pure (no DB access) so it can be unit-tested like sm2.js and patternStats.js.
 *
 * Timezone matters here more than anywhere else in the app: a review at 2am in
 * IST (UTC+5:30) is still "yesterday" in UTC, which would silently break a
 * streak the user believes they kept. Every day boundary is therefore computed
 * against the caller's offset rather than UTC.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 365;

/**
 * @param {Date} date
 * @param {number} tzOffsetMinutes - Date.prototype.getTimezoneOffset() from the
 *   client: minutes *behind* UTC, so IST is -330.
 * @returns {string} YYYY-MM-DD in the caller's local time
 */
function dayKey(date, tzOffsetMinutes = 0) {
  return new Date(date.getTime() - tzOffsetMinutes * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function shiftDays(dateKey, delta) {
  const d = new Date(dateKey + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {Array<{reviewedAt: Date}>} logs
 * @param {{tzOffsetMinutes?: number, windowDays?: number, now?: Date}} opts
 */
function buildActivity(logs, opts = {}) {
  const {
    tzOffsetMinutes = 0,
    windowDays = DEFAULT_WINDOW_DAYS,
    now = new Date(),
  } = opts;

  const counts = new Map();
  for (const log of logs) {
    const key = dayKey(log.reviewedAt, tzOffsetMinutes);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const todayKey = dayKey(now, tzOffsetMinutes);

  // Contiguous run of days ending today. Today not yet reviewed doesn't break
  // the streak — the day isn't over — so start counting from yesterday instead.
  let currentStreak = 0;
  let cursor = counts.has(todayKey) ? todayKey : shiftDays(todayKey, -1);
  while (counts.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDays(cursor, -1);
  }

  // Longest run anywhere in history.
  const sortedKeys = [...counts.keys()].sort();
  let longestStreak = 0;
  let run = 0;
  let prev = null;
  for (const key of sortedKeys) {
    run = prev !== null && shiftDays(prev, 1) === key ? run + 1 : 1;
    if (run > longestStreak) longestStreak = run;
    prev = key;
  }

  // Dense day list for the grid — every day in the window, zeros included.
  const days = [];
  const startKey = shiftDays(todayKey, -(windowDays - 1));
  for (let i = 0; i < windowDays; i += 1) {
    const key = shiftDays(startKey, i);
    days.push({ date: key, count: counts.get(key) || 0 });
  }

  const totalReviews = logs.length;

  return {
    days,
    currentStreak,
    longestStreak,
    activeDays: counts.size,
    totalReviews,
    reviewedToday: counts.get(todayKey) || 0,
    busiestDay: sortedKeys.reduce(
      (best, k) => (counts.get(k) > (best.count || 0) ? { date: k, count: counts.get(k) } : best),
      { date: null, count: 0 }
    ),
  };
}

module.exports = { buildActivity, dayKey, shiftDays, MS_PER_DAY, DEFAULT_WINDOW_DAYS };
