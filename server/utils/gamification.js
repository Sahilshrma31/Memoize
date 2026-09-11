/**
 * XP, levels and achievements.
 *
 * Nothing here is stored — it's all replayed from review history, the same way
 * streaks are. That keeps it impossible to drift out of sync, and means past
 * reviews count the moment this ships.
 *
 * The design rule: reward showing up and genuine improvement, never a rating.
 * Every review earns the same XP whatever you rate it, so there is no reason
 * to click Easy on something you fumbled. Bonuses come from things you can't
 * fake — beating your own time, or recalling a problem you once blanked on.
 *
 * Pure (no DB access) so it can be unit-tested like the other stats modules.
 */

const { buildActivity, dayKey, shiftDays } = require('./activityStats');
const { buildPatternTracker } = require('./patternTracker');

// Harder problems take longer to review, so they're worth more.
const REVIEW_XP = { easy: 10, medium: 15, hard: 20 };

const BONUS_XP = {
  checkIn: 10, // first review of the day
  redemption: 20, // recalled a problem you previously blacked out on
  personalBest: 10, // recalled faster than ever before
  challenge: 40, // beat the daily challenge
};

const RECALLED = new Set(['good', 'easy']);
const HARD_FAST_SEC = 15 * 60;
// Anything faster isn't a re-solve — it's starting the timer and clicking a
// rating. Without a floor, personal bests could be farmed in one second.
const MIN_TIMED_SEC = 60;

const LEVELS = [
  { title: 'Intern', xp: 0 },
  { title: 'New Grad', xp: 100 },
  { title: 'SDE I', xp: 300 },
  { title: 'SDE II', xp: 700 },
  { title: 'Senior SDE', xp: 1400 },
  { title: 'Staff Engineer', xp: 2500 },
  { title: 'Senior Staff', xp: 4000 },
  { title: 'Principal', xp: 6000 },
  { title: 'Distinguished', xp: 9000 },
  { title: 'Fellow', xp: 13000 },
];

function levelForXp(xp) {
  let index = 0;
  while (index + 1 < LEVELS.length && xp >= LEVELS[index + 1].xp) index += 1;
  const current = LEVELS[index];
  const next = LEVELS[index + 1] || null;
  return {
    level: index + 1,
    title: current.title,
    xp,
    levelStartXp: current.xp,
    nextLevelXp: next ? next.xp : null,
    nextTitle: next ? next.title : null,
    progress: next ? (xp - current.xp) / (next.xp - current.xp) : 1,
  };
}

/**
 * Walk logs oldest-first, attaching the XP each one earned and tallying the
 * counters achievements are built on.
 */
function replayLogs(logs, difficultyByProblem, tzOffsetMinutes) {
  const sorted = [...logs].sort((a, b) => new Date(a.reviewedAt) - new Date(b.reviewedAt));

  const checkedInDays = new Set();
  const awaitingRedemption = new Set();
  const bestTime = new Map();
  const perDay = new Map();

  const counters = {
    reviews: 0,
    redemptions: 0,
    personalBests: 0,
    challengesWon: 0,
    recallRun: 0,
    bestRecallRun: 0,
    hardFast: 0,
    bestDay: 0,
  };
  // When each counter first reached each value, for achievement dates.
  const crossed = {};
  const mark = (counter, value, at) => {
    crossed[counter] = crossed[counter] || {};
    if (!crossed[counter][value]) crossed[counter][value] = at;
  };

  let totalXp = 0;
  const events = sorted.map((log) => {
    const pid = String(log.problemId);
    const at = new Date(log.reviewedAt);
    const day = dayKey(at, tzOffsetMinutes);
    const recalled = RECALLED.has(log.rating);
    const difficulty = difficultyByProblem.get(pid) || 'medium';
    const reasons = [{ label: 'Review', xp: REVIEW_XP[difficulty] || REVIEW_XP.medium }];
    let personalBest = null;
    let redemption = false;

    counters.reviews += 1;
    mark('reviews', counters.reviews, at);

    if (!checkedInDays.has(day)) {
      checkedInDays.add(day);
      reasons.push({ label: 'Daily check-in', xp: BONUS_XP.checkIn });
    }

    if (log.rating === 'blackout') {
      awaitingRedemption.add(pid);
    } else if (recalled && awaitingRedemption.has(pid)) {
      awaitingRedemption.delete(pid);
      redemption = true;
      counters.redemptions += 1;
      mark('redemptions', counters.redemptions, at);
      reasons.push({ label: 'Redemption', xp: BONUS_XP.redemption });
    }

    const time =
      typeof log.timeTakenSec === 'number' && log.timeTakenSec >= MIN_TIMED_SEC ? log.timeTakenSec : null;
    if (recalled && time) {
      const previous = bestTime.get(pid);
      if (previous !== undefined && time < previous) {
        personalBest = { timeSec: time, previousSec: previous };
        counters.personalBests += 1;
        mark('personalBests', counters.personalBests, at);
        reasons.push({ label: 'Personal best', xp: BONUS_XP.personalBest });
      }
      if (previous === undefined || time < previous) bestTime.set(pid, time);
      if (difficulty === 'hard' && time < HARD_FAST_SEC) {
        counters.hardFast += 1;
        mark('hardFast', counters.hardFast, at);
      }
    }

    if (log.challenge && recalled) {
      counters.challengesWon += 1;
      mark('challengesWon', counters.challengesWon, at);
      reasons.push({ label: 'Daily challenge', xp: BONUS_XP.challenge });
    }

    counters.recallRun = recalled ? counters.recallRun + 1 : 0;
    if (counters.recallRun > counters.bestRecallRun) {
      counters.bestRecallRun = counters.recallRun;
      mark('bestRecallRun', counters.bestRecallRun, at);
    }

    const dayCount = (perDay.get(day)?.count || 0) + 1;
    if (dayCount > counters.bestDay) {
      counters.bestDay = dayCount;
      mark('bestDay', dayCount, at);
    }

    const xp = reasons.reduce((sum, r) => sum + r.xp, 0);
    totalXp += xp;
    perDay.set(day, { count: dayCount, xp: (perDay.get(day)?.xp || 0) + xp });

    return {
      logId: log._id ? String(log._id) : null,
      problemId: pid,
      rating: log.rating,
      reviewedAt: at,
      xp,
      reasons,
      personalBest,
      redemption,
      challenge: Boolean(log.challenge),
    };
  });

  // Date the counter first reached `target`, or null. Every counter climbs one
  // step at a time, so each value it passed through is recorded.
  const crossedAt = (counter, target) => crossed[counter]?.[target] || null;

  return { totalXp, events, counters, crossedAt, perDay };
}

/**
 * Each achievement: how far along you are (current / target) and when it
 * unlocked. `unlockedAt` is null for ones we can't date precisely (pattern
 * tiers are recomputed from scratch), in which case `unlocked` still says so.
 */
function evaluateAchievements({ counters, crossedAt, activity, problems, cards, tracker }) {
  const sortedProblems = [...problems].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const problemsAddedAt = (n) => (sortedProblems.length >= n ? sortedProblems[n - 1].createdAt || null : null);

  const mastered = cards.filter((c) => c.state === 'mastered');
  const firstMasteredAt = mastered.length
    ? mastered.map((c) => new Date(c.lastReviewedAt || 0)).sort((a, b) => a - b)[0]
    : null;

  const tierRank = { unranked: 0, bronze: 1, silver: 2, gold: 3, platinum: 4 };
  const bestTier = Math.max(0, ...tracker.patterns.map((p) => tierRank[p.tier] || 0));
  const bronzePlus = tracker.patterns.filter((p) => (tierRank[p.tier] || 0) >= 1).length;

  const streakAt = (n) => {
    const key = activity.milestoneDates[n];
    return key ? new Date(`${key}T12:00:00.000Z`) : null;
  };

  const defs = [
    // Reviews
    { id: 'first-review', icon: '🎯', title: 'First Rep', description: 'Complete your first review', category: 'Reviews', current: counters.reviews, target: 1, at: crossedAt('reviews', 1) },
    { id: 'reviews-50', icon: '💪', title: 'Fifty Reps', description: 'Complete 50 reviews', category: 'Reviews', current: counters.reviews, target: 50, at: crossedAt('reviews', 50) },
    { id: 'reviews-250', icon: '⚙️', title: 'Grinder', description: 'Complete 250 reviews', category: 'Reviews', current: counters.reviews, target: 250, at: crossedAt('reviews', 250) },
    { id: 'reviews-1000', icon: '🏛️', title: 'Thousand Club', description: 'Complete 1,000 reviews', category: 'Reviews', current: counters.reviews, target: 1000, at: crossedAt('reviews', 1000) },
    { id: 'marathon', icon: '🏃', title: 'Marathon', description: '20 reviews in a single day', category: 'Reviews', current: counters.bestDay, target: 20, at: crossedAt('bestDay', 20) },

    // Streaks
    { id: 'streak-3', icon: '🔥', title: 'Warming Up', description: 'Reach a 3-day streak', category: 'Streaks', current: activity.longestStreak, target: 3, at: streakAt(3) },
    { id: 'streak-7', icon: '📅', title: 'Week Warrior', description: 'Reach a 7-day streak', category: 'Streaks', current: activity.longestStreak, target: 7, at: streakAt(7) },
    { id: 'streak-30', icon: '🗓️', title: 'Unbreakable', description: 'Reach a 30-day streak', category: 'Streaks', current: activity.longestStreak, target: 30, at: streakAt(30) },
    { id: 'streak-100', icon: '💯', title: 'Iron Will', description: 'Reach a 100-day streak', category: 'Streaks', current: activity.longestStreak, target: 100, at: streakAt(100) },

    // Skill
    { id: 'redemption-1', icon: '🔁', title: 'Redemption Arc', description: 'Recall a problem you once blacked out on', category: 'Skill', current: counters.redemptions, target: 1, at: crossedAt('redemptions', 1) },
    { id: 'redemption-10', icon: '🦅', title: 'Comeback Kid', description: 'Pull off 10 redemptions', category: 'Skill', current: counters.redemptions, target: 10, at: crossedAt('redemptions', 10) },
    { id: 'hot-hand', icon: '🎰', title: 'Hot Hand', description: 'Recall 10 problems in a row', category: 'Skill', current: counters.bestRecallRun, target: 10, at: crossedAt('bestRecallRun', 10) },
    { id: 'pb-1', icon: '⏱️', title: 'Faster Than Before', description: 'Beat your best time on a problem', category: 'Skill', current: counters.personalBests, target: 1, at: crossedAt('personalBests', 1) },
    { id: 'pb-10', icon: '🏎️', title: 'Speedrunner', description: 'Set 10 personal bests', category: 'Skill', current: counters.personalBests, target: 10, at: crossedAt('personalBests', 10) },
    { id: 'hard-fast', icon: '⚡', title: 'Speed Demon', description: 'Recall a Hard problem in under 15 minutes', category: 'Skill', current: counters.hardFast, target: 1, at: crossedAt('hardFast', 1) },

    // Challenges
    { id: 'challenge-1', icon: '🐉', title: 'Challenger', description: 'Beat a daily challenge', category: 'Challenges', current: counters.challengesWon, target: 1, at: crossedAt('challengesWon', 1) },
    { id: 'challenge-7', icon: '⚔️', title: 'Boss Slayer', description: 'Beat 7 daily challenges', category: 'Challenges', current: counters.challengesWon, target: 7, at: crossedAt('challengesWon', 7) },

    // Problem bank & mastery
    { id: 'problems-10', icon: '📚', title: 'Building the Bank', description: 'Add 10 problems', category: 'Mastery', current: problems.length, target: 10, at: problemsAddedAt(10) },
    { id: 'problems-50', icon: '🗃️', title: 'Half Century', description: 'Add 50 problems', category: 'Mastery', current: problems.length, target: 50, at: problemsAddedAt(50) },
    { id: 'problems-150', icon: '🧠', title: 'The 150', description: 'Add 150 problems', category: 'Mastery', current: problems.length, target: 150, at: problemsAddedAt(150) },
    { id: 'patterns-5', icon: '🗺️', title: 'Well-Rounded', description: 'Bronze or better in 5 patterns', category: 'Mastery', current: bronzePlus, target: 5, at: null },
    { id: 'pattern-silver', icon: '🥈', title: 'Silver Lining', description: 'Reach Silver in any pattern', category: 'Mastery', current: Math.min(bestTier, 2), target: 2, at: null },
    { id: 'pattern-gold', icon: '🥇', title: 'Golden Pattern', description: 'Reach Gold in any pattern', category: 'Mastery', current: Math.min(bestTier, 3), target: 3, at: null },
    { id: 'pattern-platinum', icon: '💎', title: 'Platinum Mind', description: 'Reach Platinum in any pattern', category: 'Mastery', current: Math.min(bestTier, 4), target: 4, at: null },
    { id: 'mastered-1', icon: '🔒', title: 'Locked In', description: 'Fully master a problem (180-day interval)', category: 'Mastery', current: mastered.length, target: 1, at: firstMasteredAt },
  ];

  return defs.map(({ at, ...def }) => {
    const unlocked = def.current >= def.target;
    return {
      ...def,
      current: Math.min(def.current, def.target),
      unlocked,
      unlockedAt: unlocked && at ? new Date(at) : null,
    };
  });
}

/**
 * @param {Object} input
 * @param {Array} input.logs      ReviewLogs: problemId, rating, timeTakenSec, reviewedAt, challenge
 * @param {Array} input.problems  Problems: _id, title, tags, difficulty, createdAt
 * @param {Array} input.cards     ReviewCards: problemId, state, nextReviewAt, lastReviewedAt
 */
function buildProgress({ logs, problems, cards, tzOffsetMinutes = 0, now = new Date() }) {
  const difficultyByProblem = new Map(problems.map((p) => [String(p._id), p.difficulty]));
  const { totalXp, events, counters, crossedAt, perDay } = replayLogs(logs, difficultyByProblem, tzOffsetMinutes);

  const activity = buildActivity(logs, { tzOffsetMinutes, now, windowDays: 1, milestones: [3, 7, 30, 100] });
  const tracker = buildPatternTracker({ problems, cards, logs, now });
  const achievements = evaluateAchievements({ counters, crossedAt, activity, problems, cards, tracker });

  // Last 14 days of XP, oldest first, zeros included.
  const todayKey = dayKey(now, tzOffsetMinutes);
  const xpByDay = [];
  for (let i = 13; i >= 0; i -= 1) {
    const key = shiftDays(todayKey, -i);
    xpByDay.push({ date: key, xp: perDay.get(key)?.xp || 0 });
  }

  return {
    level: levelForXp(totalXp),
    xpToday: perDay.get(todayKey)?.xp || 0,
    xpByDay,
    events,
    achievements,
    counters,
    streak: {
      current: activity.currentStreak,
      longest: activity.longestStreak,
      freezesAvailable: activity.freezesAvailable,
      maxFreezes: activity.maxFreezes,
      freezesUsed: activity.freezesUsed,
    },
  };
}

/**
 * What a single review just earned: diff the progress snapshot from before the
 * review against the one after it.
 */
function diffRewards(before, after) {
  const latest = after.events[after.events.length - 1] || null;
  const wasUnlocked = new Set(before.achievements.filter((a) => a.unlocked).map((a) => a.id));

  return {
    xpGained: after.level.xp - before.level.xp,
    reasons: latest?.reasons || [],
    personalBest: latest?.personalBest || null,
    redemption: Boolean(latest?.redemption),
    levelUp: after.level.level > before.level.level ? after.level : null,
    level: after.level,
    newAchievements: after.achievements.filter((a) => a.unlocked && !wasUnlocked.has(a.id)),
    streak: after.streak,
  };
}

module.exports = {
  buildProgress,
  diffRewards,
  levelForXp,
  LEVELS,
  REVIEW_XP,
  BONUS_XP,
  MIN_TIMED_SEC,
};
