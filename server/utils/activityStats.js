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

// Streak freezes: every 7th consecutive day banks one (up to 2), and a missed
// day spends one instead of resetting the streak. One bad day shouldn't wipe
// out a month of work — that's exactly when people quit.
const FREEZE_EVERY_DAYS = 7;
const MAX_FREEZES = 2;

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
 * Replays every day from the first review to today, applying streak freezes.
 * Today without a review neither extends nor breaks the streak — the day
 * isn't over yet.
 *
 * @returns {{currentStreak, longestStreak, freezesAvailable, frozenDays: Set<string>,
 *            milestoneDates: Object<number, string>}}
 */
function walkStreak(counts, todayKey, milestones = []) {
  let streak = 0;
  let longest = 0;
  let freezes = 0;
  const frozenDays = new Set();
  const milestoneDates = {};

  const firstKey = [...counts.keys()].sort()[0];
  if (firstKey) {
    for (let key = firstKey; key <= todayKey; key = shiftDays(key, 1)) {
      if (counts.has(key)) {
        streak += 1;
        if (streak > longest) longest = streak;
        if (streak % FREEZE_EVERY_DAYS === 0 && freezes < MAX_FREEZES) freezes += 1;
        for (const m of milestones) {
          if (streak >= m && !milestoneDates[m]) milestoneDates[m] = key;
        }
      } else if (key === todayKey) {
        // still time to review today
      } else if (streak > 0 && freezes > 0) {
        freezes -= 1;
        frozenDays.add(key);
      } else {
        streak = 0;
      }
    }
  }

  return { currentStreak: streak, longestStreak: longest, freezesAvailable: freezes, frozenDays, milestoneDates };
}

/**
 * @param {Array<{reviewedAt: Date}>} logs
 * @param {{tzOffsetMinutes?: number, windowDays?: number, now?: Date, milestones?: number[]}} opts
 *   milestones: streak lengths to report the first date of (for achievements)
 */
function buildActivity(logs, opts = {}) {
  const {
    tzOffsetMinutes = 0,
    windowDays = DEFAULT_WINDOW_DAYS,
    now = new Date(),
    milestones = [],
  } = opts;

  const counts = new Map();
  for (const log of logs) {
    const key = dayKey(log.reviewedAt, tzOffsetMinutes);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const todayKey = dayKey(now, tzOffsetMinutes);
  const streak = walkStreak(counts, todayKey, milestones);
  const sortedKeys = [...counts.keys()].sort();

  // Dense day list for the grid — every day in the window, zeros included.
  const days = [];
  const startKey = shiftDays(todayKey, -(windowDays - 1));
  for (let i = 0; i < windowDays; i += 1) {
    const key = shiftDays(startKey, i);
    const day = { date: key, count: counts.get(key) || 0 };
    if (streak.frozenDays.has(key)) day.frozen = true;
    days.push(day);
  }

  const totalReviews = logs.length;

  return {
    days,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    freezesAvailable: streak.freezesAvailable,
    maxFreezes: MAX_FREEZES,
    freezesUsed: streak.frozenDays.size,
    milestoneDates: streak.milestoneDates,
    activeDays: counts.size,
    totalReviews,
    reviewedToday: counts.get(todayKey) || 0,
    busiestDay: sortedKeys.reduce(
      (best, k) => (counts.get(k) > (best.count || 0) ? { date: k, count: counts.get(k) } : best),
      { date: null, count: 0 }
    ),
  };
}

module.exports = {
  buildActivity,
  dayKey,
  shiftDays,
  MS_PER_DAY,
  DEFAULT_WINDOW_DAYS,
  FREEZE_EVERY_DAYS,
  MAX_FREEZES,
};
