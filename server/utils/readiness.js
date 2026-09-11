/**
 * Interview readiness: how prepared you are across the patterns FAANG-style
 * interviews actually draw from, and whether you're on pace for your date.
 *
 * For each core pattern: coverage (problems solved, up to a target) times
 * recall (your success rate on them). Recall only counts once there are
 * enough reviews to trust it; before that it's assumed middling, because
 * solving something once proves little about solving it again in a month.
 *
 * Pure (no DB access) so it can be unit-tested like the other stats modules.
 */

const { normalizeTags } = require('./problemLookup');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TARGET_PER_PATTERN = 5;
const MIN_RELIABLE_REVIEWS = 3;
const UNPROVEN_RECALL = 0.4;
const RECALLED = new Set(['good', 'easy']);

// Tags are compared after normalizeTags(), lower-cased.
const CORE_PATTERNS = [
  { name: 'Arrays & Hashing', tags: ['array', 'hash table', 'string', 'prefix sum', 'counting'] },
  { name: 'Two Pointers', tags: ['two pointers'] },
  { name: 'Sliding Window', tags: ['sliding window'] },
  { name: 'Stack', tags: ['stack', 'monotonic stack'] },
  { name: 'Binary Search', tags: ['binary search'] },
  { name: 'Linked List', tags: ['linked list'] },
  { name: 'Trees', tags: ['tree', 'binary tree', 'binary search tree'] },
  { name: 'Tries', tags: ['trie'] },
  { name: 'Heap / Priority Queue', tags: ['heap (priority queue)'] },
  { name: 'Backtracking', tags: ['backtracking', 'recursion'] },
  { name: 'Graphs', tags: ['graph', 'bfs', 'dfs', 'union find', 'topological sort'] },
  { name: 'Dynamic Programming', tags: ['dynamic programming', 'memoization'] },
  { name: 'Greedy', tags: ['greedy'] },
  { name: 'Bit Manipulation', tags: ['bit manipulation'] },
];

function statusFor(score, problemCount) {
  if (problemCount === 0) return 'not-started';
  if (score >= 0.8) return 'ready';
  if (score >= 0.5) return 'developing';
  return 'weak';
}

/**
 * @param {Object} input
 * @param {Array<{_id, tags}>} input.problems
 * @param {Array<{problemId, rating}>} input.logs
 * @param {{interviewDate?: Date, company?: string}} [input.goal]
 * @param {Date} [input.now]
 */
function buildReadiness({ problems, logs, goal = {}, now = new Date() }) {
  const logsByProblem = new Map();
  for (const log of logs) {
    const key = String(log.problemId);
    if (!logsByProblem.has(key)) logsByProblem.set(key, []);
    logsByProblem.get(key).push(log);
  }

  const tagsByProblem = problems.map((p) => ({
    id: String(p._id),
    tags: new Set(normalizeTags(p.tags).map((t) => t.toLowerCase())),
  }));

  const patterns = CORE_PATTERNS.map(({ name, tags }) => {
    const ids = tagsByProblem.filter((p) => tags.some((t) => p.tags.has(t))).map((p) => p.id);
    const reviews = ids.flatMap((id) => logsByProblem.get(id) || []);
    const successes = reviews.filter((l) => RECALLED.has(l.rating)).length;
    const reliable = reviews.length >= MIN_RELIABLE_REVIEWS;
    const recall = reliable ? successes / reviews.length : UNPROVEN_RECALL;
    const coverage = Math.min(ids.length, TARGET_PER_PATTERN) / TARGET_PER_PATTERN;
    const score = ids.length === 0 ? 0 : coverage * recall;

    return {
      name,
      problemCount: ids.length,
      target: TARGET_PER_PATTERN,
      reviews: reviews.length,
      recallPercent: reliable ? Math.round((successes / reviews.length) * 100) : null,
      score: Number(score.toFixed(3)),
      scorePercent: Math.round(score * 100),
      status: statusFor(score, ids.length),
    };
  });

  const overall = patterns.reduce((sum, p) => sum + p.score, 0) / patterns.length;

  // Focus: lowest-scoring patterns, not-started ones first.
  const focus = [...patterns]
    .sort((a, b) => a.score - b.score || a.problemCount - b.problemCount)
    .filter((p) => p.status !== 'ready')
    .slice(0, 3)
    .map((p) => p.name);

  let countdown = null;
  if (goal?.interviewDate) {
    const interview = new Date(goal.interviewDate);
    const daysLeft = Math.max(0, Math.ceil((interview - now) / MS_PER_DAY));
    const problemsNeeded = patterns.reduce(
      (sum, p) => sum + Math.max(0, TARGET_PER_PATTERN - p.problemCount),
      0
    );
    countdown = {
      interviewDate: interview,
      company: goal.company || '',
      daysLeft,
      problemsNeeded,
      // New problems a day to cover every core pattern before the date.
      problemsPerDay: daysLeft > 0 ? Number((problemsNeeded / daysLeft).toFixed(1)) : problemsNeeded,
    };
  }

  return {
    score: Math.round(overall * 100),
    patterns,
    focus,
    countdown,
    targetPerPattern: TARGET_PER_PATTERN,
  };
}

module.exports = { buildReadiness, CORE_PATTERNS, TARGET_PER_PATTERN };
