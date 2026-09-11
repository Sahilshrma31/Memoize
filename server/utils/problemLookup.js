/**
 * Turn a pasted problem URL into form fields (title, difficulty, tags, companies).
 *
 * The browser can't do this itself — LeetCode, GFG and Codeforces don't send
 * CORS headers — so the server does it. Only the three platform APIs below are
 * ever contacted: the pasted URL is parsed for an identifier and never fetched
 * directly, so this can't be used to make the server request arbitrary hosts.
 *
 * URL parsing and tag normalisation are pure and unit-tested; the fetchers are
 * thin wrappers around each platform's public API.
 */

const FETCH_TIMEOUT_MS = 8000;
const CF_CACHE_TTL_MS = 12 * 60 * 60 * 1000;

class LookupError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/**
 * @param {string} rawUrl
 * @returns {{platform: 'leetcode', slug: string}
 *         | {platform: 'gfg', slug: string}
 *         | {platform: 'codeforces', contestId: number, index: string}
 *         | null}
 */
function parseProblemUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl).trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const parts = url.pathname.split('/').filter(Boolean);

  // leetcode.com/problems/two-sum/description/ — anything after the slug is a tab.
  if (host === 'leetcode.com') {
    const i = parts.indexOf('problems');
    if (i !== -1 && parts[i + 1]) return { platform: 'leetcode', slug: parts[i + 1].toLowerCase() };
    return null;
  }

  // geeksforgeeks.org/problems/kadanes-algorithm-1587115620/1 (also the old practice. subdomain).
  // GFG article URLs have no /problems/ segment and no API, so they're unsupported.
  if (host === 'geeksforgeeks.org' || host === 'practice.geeksforgeeks.org') {
    const i = parts.indexOf('problems');
    if (i !== -1 && parts[i + 1]) return { platform: 'gfg', slug: parts[i + 1] };
    return null;
  }

  // codeforces.com/problemset/problem/1352/C  or  codeforces.com/contest/1352/problem/C
  if (host === 'codeforces.com' || host === 'm1.codeforces.com') {
    let contestId;
    let index;
    if (parts[0] === 'problemset' && parts[1] === 'problem') [, , contestId, index] = parts;
    else if (parts[0] === 'contest' && parts[2] === 'problem') [, contestId, , index] = parts;
    if (/^\d+$/.test(contestId || '') && index) {
      return { platform: 'codeforces', contestId: Number(contestId), index: index.toUpperCase() };
    }
    return null;
  }

  return null;
}

// Each platform names the same pattern differently ("Arrays" on GFG, "Array" on
// LeetCode, "dp" on Codeforces). The pattern map groups by exact tag, so merge
// the common ones or the same weakness gets split across several rows.
const TAG_ALIASES = {
  arrays: 'Array',
  strings: 'String',
  dp: 'Dynamic Programming',
  'dynamic programming': 'Dynamic Programming',
  hashing: 'Hash Table',
  hash: 'Hash Table',
  'hash table': 'Hash Table',
  graphs: 'Graph',
  graph: 'Graph',
  trees: 'Tree',
  tree: 'Tree',
  'binary search': 'Binary Search',
  'two pointers': 'Two Pointers',
  'two-pointer-algorithm': 'Two Pointers',
  greedy: 'Greedy',
  sorting: 'Sorting',
  sortings: 'Sorting',
  math: 'Math',
  mathematical: 'Math',
  'dfs and similar': 'DFS',
  'depth-first search': 'DFS',
  'breadth-first search': 'BFS',
  dsu: 'Union Find',
  'union find': 'Union Find',
  'disjoint set': 'Union Find',
  'linked list': 'Linked List',
  'linked-list': 'Linked List',
  stack: 'Stack',
  queue: 'Queue',
  heap: 'Heap (Priority Queue)',
  'heap (priority queue)': 'Heap (Priority Queue)',
  bitmasks: 'Bit Manipulation',
  'bit magic': 'Bit Manipulation',
  'bit manipulation': 'Bit Manipulation',
  'sliding-window': 'Sliding Window',
  'sliding window': 'Sliding Window',
  recursion: 'Recursion',
  backtracking: 'Backtracking',
  'prefix sum': 'Prefix Sum',
  'prefix-sum': 'Prefix Sum',
};

function normalizeTags(tags) {
  const seen = new Set();
  const out = [];
  for (const raw of tags || []) {
    const trimmed = String(raw).trim();
    if (!trimmed) continue;
    const tag = TAG_ALIASES[trimmed.toLowerCase()] || trimmed;
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
}

// GFG uses School/Basic below Easy.
function normalizeDifficulty(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'hard') return 'hard';
  if (v === 'medium') return 'medium';
  if (['easy', 'basic', 'school'].includes(v)) return 'easy';
  return 'medium';
}

// Codeforces has ratings, not difficulties. These cut-offs roughly line up with
// LeetCode: ≤1300 is Easy-ish, 1400–1800 Medium, 1900+ is beyond a typical Hard.
function difficultyFromRating(rating) {
  if (!rating) return 'medium';
  if (rating <= 1300) return 'easy';
  if (rating <= 1800) return 'medium';
  return 'hard';
}

async function fetchJson(url, init = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'User-Agent': 'Mozilla/5.0 (Memoize)', ...init.headers },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    throw new LookupError('Could not reach the problem site — fill the fields in manually', 502);
  }
  if (res.status === 404) throw new LookupError('Problem not found', 404);
  if (!res.ok) throw new LookupError(`Problem site responded with ${res.status}`, 502);
  return res.json();
}

async function lookupLeetCode(slug) {
  const body = await fetchJson('https://leetcode.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: `https://leetcode.com/problems/${slug}/`,
    },
    body: JSON.stringify({
      query:
        'query q($titleSlug: String!) { question(titleSlug: $titleSlug) { questionFrontendId title difficulty topicTags { name } } }',
      variables: { titleSlug: slug },
    }),
  });
  const q = body?.data?.question;
  if (!q) throw new LookupError('Problem not found on LeetCode', 404);
  return {
    title: q.questionFrontendId ? `${q.questionFrontendId}. ${q.title}` : q.title,
    difficulty: normalizeDifficulty(q.difficulty),
    tags: normalizeTags(q.topicTags.map((t) => t.name)),
    company: [], // LeetCode keeps company tags behind Premium
  };
}

async function lookupGfg(slug) {
  const body = await fetchJson(
    `https://practiceapi.geeksforgeeks.org/api/latest/problems/${encodeURIComponent(slug)}/`
  );
  const p = body?.results;
  if (!p?.problem_name) throw new LookupError('Problem not found on GeeksforGeeks', 404);
  return {
    title: p.problem_name,
    difficulty: normalizeDifficulty(p.difficulty),
    tags: normalizeTags(p.tags?.topic_tags),
    company: p.tags?.company_tags || [],
  };
}

// Codeforces blocks scraping problem pages, and its API has no single-problem
// endpoint — only the whole problemset (~2MB). Fetch it at most twice a day.
let cfCache = { at: 0, byKey: null };

async function codeforcesIndex() {
  if (cfCache.byKey && Date.now() - cfCache.at < CF_CACHE_TTL_MS) return cfCache.byKey;
  const body = await fetchJson('https://codeforces.com/api/problemset.problems');
  if (body?.status !== 'OK') throw new LookupError('Codeforces API is unavailable', 502);
  const byKey = new Map(body.result.problems.map((p) => [`${p.contestId}${p.index}`, p]));
  cfCache = { at: Date.now(), byKey };
  return byKey;
}

async function lookupCodeforces(contestId, index) {
  const byKey = await codeforcesIndex();
  const p = byKey.get(`${contestId}${index}`);
  if (!p) throw new LookupError('Problem not found on Codeforces', 404);
  return {
    title: `${contestId}${index}. ${p.name}`,
    difficulty: difficultyFromRating(p.rating),
    tags: normalizeTags(p.tags),
    company: [],
  };
}

/**
 * @param {string} rawUrl
 * @returns {Promise<{platform, title, difficulty, tags, company}>}
 */
async function lookupProblem(rawUrl) {
  const parsed = parseProblemUrl(rawUrl);
  if (!parsed) {
    throw new LookupError('Auto-fill supports LeetCode, GeeksforGeeks and Codeforces problem links', 400);
  }

  let details;
  if (parsed.platform === 'leetcode') details = await lookupLeetCode(parsed.slug);
  else if (parsed.platform === 'gfg') details = await lookupGfg(parsed.slug);
  else details = await lookupCodeforces(parsed.contestId, parsed.index);

  return { platform: parsed.platform, ...details };
}

module.exports = {
  lookupProblem,
  parseProblemUrl,
  normalizeTags,
  normalizeDifficulty,
  difficultyFromRating,
  LookupError,
};
