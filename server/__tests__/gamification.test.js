const { buildProgress, diffRewards, levelForXp, REVIEW_XP, BONUS_XP } = require('../utils/gamification');

const NOW = new Date('2026-09-10T18:00:00Z');
const at = (iso) => new Date(iso);

const problem = (id, difficulty = 'medium', tags = ['Array'], createdAt = '2026-09-01T00:00:00Z') => ({
  _id: id,
  title: `P${id}`,
  tags,
  difficulty,
  createdAt: at(createdAt),
});
const log = (problemId, rating, iso, extra = {}) => ({ problemId, rating, reviewedAt: at(iso), ...extra });

const progress = (logs, problems = [problem('a')], cards = []) =>
  buildProgress({ logs, problems, cards, now: NOW });

describe('levelForXp', () => {
  test('starts as Intern and climbs through thresholds', () => {
    expect(levelForXp(0)).toMatchObject({ level: 1, title: 'Intern', nextTitle: 'New Grad' });
    expect(levelForXp(100)).toMatchObject({ level: 2, title: 'New Grad' });
    expect(levelForXp(299).level).toBe(2);
    expect(levelForXp(50).progress).toBeCloseTo(0.5);
  });

  test('tops out at Fellow', () => {
    const top = levelForXp(1e6);
    expect(top.title).toBe('Fellow');
    expect(top.nextLevelXp).toBeNull();
    expect(top.progress).toBe(1);
  });
});

describe('XP', () => {
  test('same XP for every rating — no reason to fudge one', () => {
    const blackout = progress([log('a', 'blackout', '2026-09-10T10:00:00Z')]);
    const easy = progress([log('a', 'easy', '2026-09-10T10:00:00Z')]);
    expect(blackout.level.xp).toBe(easy.level.xp);
    expect(easy.level.xp).toBe(REVIEW_XP.medium + BONUS_XP.checkIn);
  });

  test('harder problems are worth more', () => {
    const hard = progress([log('h', 'good', '2026-09-10T10:00:00Z')], [problem('h', 'hard')]);
    const easy = progress([log('e', 'good', '2026-09-10T10:00:00Z')], [problem('e', 'easy')]);
    expect(hard.level.xp - easy.level.xp).toBe(REVIEW_XP.hard - REVIEW_XP.easy);
  });

  test('check-in bonus only on the first review of each day', () => {
    const p = progress([
      log('a', 'good', '2026-09-09T10:00:00Z'),
      log('a', 'good', '2026-09-09T11:00:00Z'),
      log('a', 'good', '2026-09-10T10:00:00Z'),
    ]);
    expect(p.level.xp).toBe(3 * REVIEW_XP.medium + 2 * BONUS_XP.checkIn);
  });

  test('redemption: recalling after a blackout, once per blackout', () => {
    const p = progress([
      log('a', 'blackout', '2026-09-08T10:00:00Z'),
      log('a', 'hard', '2026-09-09T10:00:00Z'), // struggled — not yet redeemed
      log('a', 'good', '2026-09-10T10:00:00Z'), // redeemed
      log('a', 'good', '2026-09-10T11:00:00Z'), // nothing to redeem
    ]);
    expect(p.counters.redemptions).toBe(1);
    const redeemed = p.events[2];
    expect(redeemed.redemption).toBe(true);
    expect(redeemed.reasons.map((r) => r.label)).toContain('Redemption');
  });

  test('personal best needs a previous successful timed attempt to beat', () => {
    const p = progress([
      log('a', 'good', '2026-09-08T10:00:00Z', { timeTakenSec: 900 }),
      log('a', 'hard', '2026-09-09T10:00:00Z', { timeTakenSec: 300 }), // not recalled — doesn't count
      log('a', 'good', '2026-09-10T10:00:00Z', { timeTakenSec: 600 }),
    ]);
    expect(p.events[0].personalBest).toBeNull();
    expect(p.events[1].personalBest).toBeNull();
    expect(p.events[2].personalBest).toEqual({ timeSec: 600, previousSec: 900 });
    expect(p.counters.personalBests).toBe(1);
  });

  test('times under a minute never count — no farming bests by clicking instantly', () => {
    const p = progress([
      log('a', 'good', '2026-09-08T10:00:00Z', { timeTakenSec: 900 }),
      log('a', 'good', '2026-09-09T10:00:00Z', { timeTakenSec: 1 }),
      log('a', 'good', '2026-09-10T10:00:00Z', { timeTakenSec: 59 }),
    ]);
    expect(p.counters.personalBests).toBe(0);
    // ...and a sub-minute time doesn't become the bar to beat either.
    const later = progress([
      log('a', 'good', '2026-09-08T10:00:00Z', { timeTakenSec: 900 }),
      log('a', 'good', '2026-09-09T10:00:00Z', { timeTakenSec: 1 }),
      log('a', 'good', '2026-09-10T10:00:00Z', { timeTakenSec: 600 }),
    ]);
    expect(later.events[2].personalBest).toEqual({ timeSec: 600, previousSec: 900 });
  });

  test('challenge bonus only when the challenge was recalled', () => {
    const won = progress([log('a', 'good', '2026-09-10T10:00:00Z', { challenge: true })]);
    const lost = progress([log('a', 'blackout', '2026-09-10T10:00:00Z', { challenge: true })]);
    expect(won.level.xp - lost.level.xp).toBe(BONUS_XP.challenge);
    expect(won.counters.challengesWon).toBe(1);
  });

  test('xpByDay covers 14 days ending today', () => {
    const p = progress([log('a', 'good', '2026-09-10T10:00:00Z')]);
    expect(p.xpByDay).toHaveLength(14);
    expect(p.xpByDay[13]).toEqual({ date: '2026-09-10', xp: REVIEW_XP.medium + BONUS_XP.checkIn });
    expect(p.xpToday).toBe(REVIEW_XP.medium + BONUS_XP.checkIn);
  });
});

describe('achievements', () => {
  const byId = (p, id) => p.achievements.find((a) => a.id === id);

  test('locked achievements report progress toward the target', () => {
    const p = progress([log('a', 'good', '2026-09-10T10:00:00Z')]);
    expect(byId(p, 'first-review')).toMatchObject({ unlocked: true, current: 1, target: 1 });
    expect(byId(p, 'first-review').unlockedAt).toEqual(at('2026-09-10T10:00:00Z'));
    expect(byId(p, 'reviews-50')).toMatchObject({ unlocked: false, current: 1, target: 50, unlockedAt: null });
  });

  test('hot hand: 10 recalls in a row, reset by a miss', () => {
    const logs = [];
    for (let i = 0; i < 9; i += 1) logs.push(log('a', 'good', `2026-09-0${1 + (i % 9)}T10:0${i}:00Z`));
    logs.push(log('a', 'hard', '2026-09-09T23:00:00Z'));
    expect(byId(progress(logs), 'hot-hand')).toMatchObject({ unlocked: false, current: 9 });
  });

  test('speed demon: a Hard recalled under 15 minutes', () => {
    const p = progress(
      [log('h', 'good', '2026-09-10T10:00:00Z', { timeTakenSec: 700 })],
      [problem('h', 'hard')]
    );
    expect(byId(p, 'hard-fast').unlocked).toBe(true);
  });

  test('problem-bank milestones are dated by the Nth problem added', () => {
    const problems = Array.from({ length: 10 }, (_, i) =>
      problem(`p${i}`, 'medium', ['Array'], `2026-09-0${Math.min(i, 8) + 1}T00:00:00Z`)
    );
    const p = progress([], problems);
    expect(byId(p, 'problems-10')).toMatchObject({ unlocked: true });
    expect(byId(p, 'problems-10').unlockedAt).toEqual(at('2026-09-09T00:00:00Z'));
  });
});

describe('diffRewards', () => {
  test('reports XP gained, level-ups and newly unlocked achievements', () => {
    const problems = [problem('a')];
    const first = [log('a', 'blackout', '2026-09-09T10:00:00Z')];
    const before = buildProgress({ logs: first, problems, cards: [], now: NOW });
    const after = buildProgress({
      logs: [...first, log('a', 'good', '2026-09-10T10:00:00Z')],
      problems,
      cards: [],
      now: NOW,
    });

    const r = diffRewards(before, after);
    expect(r.xpGained).toBe(REVIEW_XP.medium + BONUS_XP.checkIn + BONUS_XP.redemption);
    expect(r.redemption).toBe(true);
    expect(r.newAchievements.map((a) => a.id)).toContain('redemption-1');
    expect(r.newAchievements.map((a) => a.id)).not.toContain('first-review'); // already had it
    expect(r.levelUp).toBeNull(); // 25 -> 70 XP, still Intern
  });

  test('flags a level-up when a threshold is crossed', () => {
    const problems = [problem('h', 'hard')];
    const logs = [];
    // 3 days × (20 + 10) = 90 XP, then one more hard review = 110 → New Grad
    for (let d = 1; d <= 3; d += 1) logs.push(log('h', 'good', `2026-09-0${d}T10:00:00Z`));
    const before = buildProgress({ logs, problems, cards: [], now: NOW });
    const after = buildProgress({ logs: [...logs, log('h', 'good', '2026-09-04T10:00:00Z')], problems, cards: [], now: NOW });
    expect(before.level.title).toBe('Intern');
    expect(diffRewards(before, after).levelUp).toMatchObject({ level: 2, title: 'New Grad' });
  });
});
