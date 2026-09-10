/**
 * Per-pattern progress for the Pattern Tracker page: how many problems you've
 * solved in each pattern, how often you've revised them, how well you recall
 * them, and which tier that earns.
 *
 * Unlike the weakness map (patternStats.js), which only sees problems that have
 * review history, this starts from the problems themselves — a pattern you've
 * solved five problems in but never reviewed still shows up, with 0 revisions.
 *
 * Pure (no DB access) so it can be unit-tested like the other stats modules.
 */

const { scorePatterns } = require('./patternStats');
const { normalizeTags } = require('./problemLookup');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Not practiced in this long and it's probably slipping, whatever SM-2 says.
const RUSTY_AFTER_DAYS = 14;

// Tiers need both volume and recall: grinding 30 problems you can't
// re-solve isn't Gold, and nailing the only 2 you've done isn't either.
// Recall only counts once there are enough reviews to trust it.
const TIERS = [
  { name: 'unranked', minProblems: 0, minRecall: 0 },
  { name: 'bronze', minProblems: 3, minRecall: 0 },
  { name: 'silver', minProblems: 7, minRecall: 0.6 },
  { name: 'gold', minProblems: 12, minRecall: 0.75 },
  { name: 'platinum', minProblems: 20, minRecall: 0.85 },
];

function meetsTier(tier, problemCount, successRate, reliable) {
  if (problemCount < tier.minProblems) return false;
  if (tier.minRecall === 0) return true;
  return reliable && successRate >= tier.minRecall;
}

// Tiers are climbed in order: failing Silver's recall bar caps you at Bronze
// even with Platinum-level volume.
function tierFor(problemCount, successRate, reliable) {
  let index = 0;
  while (index + 1 < TIERS.length && meetsTier(TIERS[index + 1], problemCount, successRate, reliable)) {
    index += 1;
  }

  const next = TIERS[index + 1];
  return {
    tier: TIERS[index].name,
    nextTier: next
      ? {
          name: next.name,
          problemsNeeded: Math.max(0, next.minProblems - problemCount),
          recallNeededPercent: Math.round(next.minRecall * 100),
          recallMet: next.minRecall === 0 || (reliable && successRate >= next.minRecall),
        }
      : null,
  };
}

/**
 * @param {Object} input
 * @param {Array<{_id, title, tags, difficulty}>} input.problems
 * @param {Array<{problemId, state, nextReviewAt}>} input.cards
 * @param {Array<{problemId, rating, timeTakenSec, reviewedAt}>} input.logs
 * @param {Date} [input.now]
 */
function buildPatternTracker({ problems, cards, logs, now = new Date() }) {
  const cardByProblem = new Map(cards.map((c) => [String(c.problemId), c]));
  const logsByProblem = new Map();
  for (const log of logs) {
    const key = String(log.problemId);
    if (!logsByProblem.has(key)) logsByProblem.set(key, []);
    logsByProblem.get(key).push(log);
  }

  // Group case-insensitively and through the same aliases the URL auto-fill
  // uses, so a hand-typed "dp" and an auto-filled "Dynamic Programming" land
  // in one pattern instead of two.
  const groups = new Map();
  for (const problem of problems) {
    for (const tag of normalizeTags(problem.tags)) {
      const key = tag.toLowerCase();
      if (!groups.has(key)) groups.set(key, { tag, problems: [] });
      groups.get(key).problems.push(problem);
    }
  }

  const rows = [...groups.values()].map(({ tag, problems: tagged }) => {
    const ratings = { blackout: 0, hard: 0, good: 0, easy: 0 };
    const byState = { learning: 0, review: 0, mastered: 0 };
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    let timeSum = 0;
    let timeCount = 0;
    let lastPracticedAt = null;
    let dueNow = 0;

    const problemRows = tagged.map((problem) => {
      const id = String(problem._id);
      const card = cardByProblem.get(id);
      const history = logsByProblem.get(id) || [];

      for (const log of history) {
        if (ratings[log.rating] !== undefined) ratings[log.rating] += 1;
        if (typeof log.timeTakenSec === 'number' && log.timeTakenSec > 0) {
          timeSum += log.timeTakenSec;
          timeCount += 1;
        }
        const at = new Date(log.reviewedAt);
        if (!lastPracticedAt || at > lastPracticedAt) lastPracticedAt = at;
      }

      const state = card?.state || 'learning';
      byState[state] = (byState[state] || 0) + 1;
      if (byDifficulty[problem.difficulty] !== undefined) byDifficulty[problem.difficulty] += 1;
      const isDue = Boolean(card && new Date(card.nextReviewAt) <= now);
      if (isDue) dueNow += 1;

      const latest = history.reduce(
        (a, b) => (!a || new Date(b.reviewedAt) > new Date(a.reviewedAt) ? b : a),
        null
      );

      return {
        _id: id,
        title: problem.title,
        difficulty: problem.difficulty,
        state,
        reviews: history.length,
        lastRating: latest?.rating || null,
        nextReviewAt: card?.nextReviewAt || null,
        due: isDue,
      };
    });

    const daysSincePractice = lastPracticedAt
      ? Math.floor((now - lastPracticedAt) / MS_PER_DAY)
      : null;

    return {
      tag,
      total: ratings.blackout + ratings.hard + ratings.good + ratings.easy,
      ...ratings,
      avgTimeSec: timeCount > 0 ? timeSum / timeCount : null,
      problemCount: tagged.length,
      byState,
      byDifficulty,
      dueNow,
      lastPracticedAt,
      daysSincePractice,
      rusty: daysSincePractice !== null && daysSincePractice >= RUSTY_AFTER_DAYS,
      // Due first, then least-revised — the ones most worth revising next.
      problems: problemRows.sort(
        (a, b) => Number(b.due) - Number(a.due) || a.reviews - b.reviews
      ),
    };
  });

  const patterns = scorePatterns(rows).map((p) => ({
    ...p,
    revisions: p.total,
    ...tierFor(p.problemCount, p.successRate, p.reliable),
  }));

  return {
    patterns,
    totals: {
      patterns: patterns.length,
      problems: problems.length,
      revisions: logs.length,
    },
  };
}

module.exports = {
  buildPatternTracker,
  tierFor,
  TIERS,
  RUSTY_AFTER_DAYS,
};
