const { buildPatternTracker, tierFor } = require('../utils/patternTracker');

const NOW = new Date('2026-09-10T12:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

function problem(id, tags, difficulty = 'medium') {
  return { _id: id, title: `Problem ${id}`, tags, difficulty };
}

function log(problemId, rating, reviewedAt = daysAgo(1), timeTakenSec = 600) {
  return { problemId, rating, reviewedAt, timeTakenSec };
}

describe('tierFor', () => {
  test('volume alone earns Bronze but not Silver', () => {
    expect(tierFor(2, 0, false).tier).toBe('unranked');
    expect(tierFor(3, 0, false).tier).toBe('bronze');
    expect(tierFor(30, 0, false).tier).toBe('bronze'); // no reliable recall yet
  });

  test('recall bar caps the tier even with lots of problems', () => {
    expect(tierFor(25, 0.7, true).tier).toBe('silver');
    expect(tierFor(25, 0.8, true).tier).toBe('gold');
    expect(tierFor(25, 0.9, true).tier).toBe('platinum');
  });

  test('reports what the next tier still needs', () => {
    const { nextTier } = tierFor(9, 0.65, true);
    expect(nextTier).toEqual({
      name: 'gold',
      problemsNeeded: 3,
      recallNeededPercent: 75,
      recallMet: false,
    });
    expect(tierFor(20, 0.9, true).nextTier).toBeNull();
  });
});

describe('buildPatternTracker', () => {
  test('counts solved problems per pattern, including never-reviewed ones', () => {
    const { patterns, totals } = buildPatternTracker({
      problems: [problem('a', ['Graph']), problem('b', ['Graph', 'BFS'])],
      cards: [],
      logs: [],
      now: NOW,
    });

    const graph = patterns.find((p) => p.tag === 'Graph');
    expect(graph.problemCount).toBe(2);
    expect(graph.revisions).toBe(0);
    expect(graph.lastPracticedAt).toBeNull();
    expect(totals).toEqual({ patterns: 2, problems: 2, revisions: 0 });
  });

  test('merges aliased and differently-cased tags into one pattern', () => {
    const { patterns } = buildPatternTracker({
      problems: [problem('a', ['dp']), problem('b', ['Dynamic Programming']), problem('c', ['DYNAMIC PROGRAMMING'])],
      cards: [],
      logs: [],
      now: NOW,
    });
    expect(patterns).toHaveLength(1);
    expect(patterns[0].tag).toBe('Dynamic Programming');
    expect(patterns[0].problemCount).toBe(3);
  });

  test('revisions, recall, mastery, difficulty and due counts', () => {
    const { patterns } = buildPatternTracker({
      problems: [problem('a', ['Array'], 'easy'), problem('b', ['Array'], 'hard')],
      cards: [
        { problemId: 'a', state: 'mastered', nextReviewAt: daysAgo(-30) },
        { problemId: 'b', state: 'learning', nextReviewAt: daysAgo(1) },
      ],
      logs: [
        log('a', 'good', daysAgo(3), 300),
        log('a', 'easy', daysAgo(2), 100),
        log('b', 'blackout', daysAgo(5), 1200),
        log('b', 'good', daysAgo(4)),
      ],
      now: NOW,
    });

    const [arr] = patterns;
    expect(arr.revisions).toBe(4);
    expect(arr.successPercent).toBe(75);
    expect(arr.reliable).toBe(true);
    expect(arr.byState).toEqual({ learning: 1, review: 0, mastered: 1 });
    expect(arr.byDifficulty).toEqual({ easy: 1, medium: 0, hard: 1 });
    expect(arr.dueNow).toBe(1);
    expect(arr.daysSincePractice).toBe(2);
    expect(arr.rusty).toBe(false);
    expect(arr.avgTimeSec).toBe(550);

    // Due problem is listed first — it's the one to revise next.
    expect(arr.problems[0]).toMatchObject({ _id: 'b', due: true, reviews: 2, lastRating: 'good' });
  });

  test('flags patterns not practiced in two weeks as rusty', () => {
    const { patterns } = buildPatternTracker({
      problems: [problem('a', ['Heap'])],
      cards: [],
      logs: [log('a', 'good', daysAgo(20))],
      now: NOW,
    });
    expect(patterns[0].rusty).toBe(true);
    expect(patterns[0].daysSincePractice).toBe(20);
  });
});
