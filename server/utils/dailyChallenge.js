/**
 * Picks today's daily challenge: one problem, solved cold, one attempt.
 *
 * It aims at whatever is most likely to be slipping — problems you've
 * struggled with, in patterns you're weak at, that you haven't seen in a
 * while — then picks among the top few at random so it stays a surprise.
 * The randomness is seeded by user and day, so reloading the page doesn't
 * reroll it.
 *
 * Pure (no DB access) so it can be unit-tested like the other stats modules.
 */

const { normalizeTags } = require('./problemLookup');
const { dayKey } = require('./activityStats');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECALLED = new Set(['good', 'easy']);
const SHORTLIST_SIZE = 5;
const DIFFICULTY_WEIGHT = { easy: 0, medium: 0.15, hard: 0.3 };

function hashString(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * @param {Object} input
 * @param {Array<{_id, title, tags, difficulty}>} input.problems
 * @param {Array<{problemId, nextReviewAt}>} input.cards
 * @param {Array<{problemId, rating, reviewedAt}>} input.logs
 * @param {string} input.seed - stable per user per day, e.g. `${userId}:${day}`
 * @returns {{problemId: string, reason: string} | null}
 */
function pickChallenge({ problems, cards, logs, seed, now = new Date(), tzOffsetMinutes = 0 }) {
  if (problems.length === 0) return null;

  const todayKey = dayKey(now, tzOffsetMinutes);
  const cardByProblem = new Map(cards.map((c) => [String(c.problemId), c]));

  const history = new Map();
  for (const log of logs) {
    const key = String(log.problemId);
    if (!history.has(key)) history.set(key, []);
    history.get(key).push(log);
  }

  // Recall per tag, so a problem in a weak pattern ranks higher.
  const tagStats = new Map();
  for (const problem of problems) {
    const reviews = history.get(String(problem._id)) || [];
    for (const tag of normalizeTags(problem.tags)) {
      const s = tagStats.get(tag) || { total: 0, success: 0 };
      s.total += reviews.length;
      s.success += reviews.filter((l) => RECALLED.has(l.rating)).length;
      tagStats.set(tag, s);
    }
  }
  const tagRecall = (tag) => {
    const s = tagStats.get(tag);
    return s && s.total >= 3 ? s.success / s.total : null;
  };

  const scored = problems
    .map((problem) => {
      const id = String(problem._id);
      const reviews = [...(history.get(id) || [])].sort(
        (a, b) => new Date(a.reviewedAt) - new Date(b.reviewedAt)
      );
      const last = reviews[reviews.length - 1];
      const card = cardByProblem.get(id);

      return {
        problem,
        id,
        reviews,
        last,
        reviewedToday: Boolean(last && dayKey(new Date(last.reviewedAt), tzOffsetMinutes) === todayKey),
        due: Boolean(card && new Date(card.nextReviewAt) <= now),
      };
    })
    // Already reviewed today isn't a cold solve. Due ones are in the queue
    // anyway, so prefer a problem you wouldn't otherwise see today.
    .filter((c) => !c.reviewedToday);

  if (scored.length === 0) return null;
  const pool = scored.some((c) => !c.due) ? scored.filter((c) => !c.due) : scored;

  for (const c of pool) {
    const successes = c.reviews.filter((l) => RECALLED.has(l.rating)).length;
    const ownRecall = c.reviews.length ? successes / c.reviews.length : 0.5;

    let weakestTag = null;
    let weakestRecall = 1;
    for (const tag of normalizeTags(c.problem.tags)) {
      const r = tagRecall(tag);
      if (r !== null && r < weakestRecall) {
        weakestRecall = r;
        weakestTag = tag;
      }
    }

    c.daysSince = c.last ? Math.floor((now - new Date(c.last.reviewedAt)) / MS_PER_DAY) : null;
    c.weakestTag = weakestTag;
    c.weakestRecall = weakestTag ? weakestRecall : null;
    c.score =
      (1 - ownRecall) * 2 +
      (weakestTag ? (1 - weakestRecall) * 2 : 0.6) +
      Math.min(c.daysSince ?? 30, 30) / 30 +
      (DIFFICULTY_WEIGHT[c.problem.difficulty] || 0);
  }

  pool.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const shortlist = pool.slice(0, SHORTLIST_SIZE);
  const pick = shortlist[hashString(seed) % shortlist.length];

  return { problemId: pick.id, reason: reasonFor(pick) };
}

function reasonFor(c) {
  if (c.last?.rating === 'blackout') return 'You blanked on this last time. Recall it for a redemption bonus on top.';
  if (c.weakestTag && c.weakestRecall < 0.6) {
    return `${c.weakestTag} is one of your weakest patterns (${Math.round(c.weakestRecall * 100)}% recall).`;
  }
  if (c.daysSince !== null && c.daysSince >= 14) return `You haven't touched this in ${c.daysSince} days.`;
  if (c.reviews.length === 0) return 'Never revised. Can you still solve it cold?';
  return 'A surprise pull to keep you sharp.';
}

module.exports = { pickChallenge };
