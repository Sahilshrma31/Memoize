const {
  parseProblemUrl,
  normalizeTags,
  normalizeDifficulty,
  difficultyFromRating,
} = require('../utils/problemLookup');

describe('parseProblemUrl', () => {
  test('LeetCode, with or without a trailing tab', () => {
    expect(parseProblemUrl('https://leetcode.com/problems/two-sum/')).toEqual({
      platform: 'leetcode',
      slug: 'two-sum',
    });
    expect(parseProblemUrl('https://leetcode.com/problems/Two-Sum/description/?envType=study-plan')).toEqual({
      platform: 'leetcode',
      slug: 'two-sum',
    });
    expect(parseProblemUrl('https://www.leetcode.com/problems/lru-cache/submissions/123/')).toEqual({
      platform: 'leetcode',
      slug: 'lru-cache',
    });
  });

  test('GeeksforGeeks practice links, old and new host', () => {
    expect(parseProblemUrl('https://www.geeksforgeeks.org/problems/kadanes-algorithm-1587115620/1')).toEqual({
      platform: 'gfg',
      slug: 'kadanes-algorithm-1587115620',
    });
    expect(parseProblemUrl('https://practice.geeksforgeeks.org/problems/key-pair5616/1')).toEqual({
      platform: 'gfg',
      slug: 'key-pair5616',
    });
  });

  test('Codeforces problemset and contest links', () => {
    expect(parseProblemUrl('https://codeforces.com/problemset/problem/1352/C')).toEqual({
      platform: 'codeforces',
      contestId: 1352,
      index: 'C',
    });
    expect(parseProblemUrl('https://codeforces.com/contest/1352/problem/c')).toEqual({
      platform: 'codeforces',
      contestId: 1352,
      index: 'C',
    });
  });

  test('rejects unsupported and look-alike hosts', () => {
    expect(parseProblemUrl('https://leetcode.com/explore/')).toBeNull();
    expect(parseProblemUrl('https://www.geeksforgeeks.org/binary-search/')).toBeNull();
    expect(parseProblemUrl('https://evil.com/leetcode.com/problems/two-sum/')).toBeNull();
    expect(parseProblemUrl('https://leetcode.com.evil.com/problems/two-sum/')).toBeNull();
    expect(parseProblemUrl('not a url')).toBeNull();
    expect(parseProblemUrl('')).toBeNull();
  });
});

describe('normalizeTags', () => {
  test('merges platform-specific names for the same pattern', () => {
    expect(normalizeTags(['Arrays', 'Dynamic Programming'])).toEqual(['Array', 'Dynamic Programming']);
    expect(normalizeTags(['dp', 'dfs and similar', 'dsu'])).toEqual(['Dynamic Programming', 'DFS', 'Union Find']);
  });

  test('keeps unknown tags as-is and drops duplicates and blanks', () => {
    expect(normalizeTags(['Matrix', 'arrays', 'Array', ' ', 'Matrix'])).toEqual(['Matrix', 'Array']);
    expect(normalizeTags(undefined)).toEqual([]);
  });
});

describe('difficulty mapping', () => {
  test('GFG School/Basic count as easy', () => {
    expect(normalizeDifficulty('School')).toBe('easy');
    expect(normalizeDifficulty('Basic')).toBe('easy');
    expect(normalizeDifficulty('Medium')).toBe('medium');
    expect(normalizeDifficulty('Hard')).toBe('hard');
    expect(normalizeDifficulty(undefined)).toBe('medium');
  });

  test('Codeforces rating bands', () => {
    expect(difficultyFromRating(800)).toBe('easy');
    expect(difficultyFromRating(1300)).toBe('easy');
    expect(difficultyFromRating(1600)).toBe('medium');
    expect(difficultyFromRating(2100)).toBe('hard');
    expect(difficultyFromRating(undefined)).toBe('medium');
  });
});
