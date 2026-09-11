const { pickChallenge } = require('../utils/dailyChallenge');

const NOW = new Date('2026-09-10T12:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000);
const problem = (id, tags = ['Array'], difficulty = 'medium') => ({ _id: id, title: id, tags, difficulty });
const card = (problemId, dueInDays = 5) => ({ problemId, nextReviewAt: daysAgo(-dueInDays) });
const log = (problemId, rating, ago) => ({ problemId, rating, reviewedAt: daysAgo(ago) });

describe('pickChallenge', () => {
  test('null when there are no problems', () => {
    expect(pickChallenge({ problems: [], cards: [], logs: [], seed: 's', now: NOW })).toBeNull();
  });

  test('same seed, same pick — reloading does not reroll', () => {
    const problems = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => problem(id));
    const cards = problems.map((p) => card(p._id));
    const args = { problems, cards, logs: [], now: NOW };
    const first = pickChallenge({ ...args, seed: 'user:2026-09-10' });
    expect(pickChallenge({ ...args, seed: 'user:2026-09-10' })).toEqual(first);
  });

  test('skips anything already reviewed today', () => {
    const problems = [problem('a'), problem('b')];
    const pick = pickChallenge({
      problems,
      cards: problems.map((p) => card(p._id)),
      logs: [log('a', 'good', 0)],
      seed: 'x',
      now: NOW,
    });
    expect(pick.problemId).toBe('b');
  });

  test('prefers problems that are not already in the due queue', () => {
    const problems = [problem('due'), problem('later')];
    const pick = pickChallenge({
      problems,
      cards: [card('due', -1), card('later', 5)],
      logs: [],
      seed: 'x',
      now: NOW,
    });
    expect(pick.problemId).toBe('later');
  });

  test('targets what you are struggling with, and says why', () => {
    // 'weak' was blacked out; five solid problems pad the pool beyond the shortlist.
    const solid = ['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => problem(id, ['Greedy']));
    const problems = [problem('weak', ['Sliding Window']), ...solid];
    const logs = [
      log('weak', 'blackout', 3),
      ...solid.flatMap((p) => [log(p._id, 'good', 3), log(p._id, 'easy', 2)]),
    ];
    const picks = new Set();
    for (let i = 0; i < 20; i += 1) {
      picks.add(
        pickChallenge({ problems, cards: problems.map((p) => card(p._id)), logs, seed: `u:${i}`, now: NOW }).problemId
      );
    }
    expect(picks.has('weak')).toBe(true);

    const pick = pickChallenge({
      problems: [problem('weak', ['Sliding Window'])],
      cards: [card('weak')],
      logs: [log('weak', 'blackout', 3)],
      seed: 'x',
      now: NOW,
    });
    expect(pick.reason).toMatch(/blanked/);
  });
});
