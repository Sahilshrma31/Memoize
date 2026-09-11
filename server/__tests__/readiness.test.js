const { buildReadiness, CORE_PATTERNS, TARGET_PER_PATTERN } = require('../utils/readiness');

const problem = (id, tags) => ({ _id: id, tags });
const log = (problemId, rating) => ({ problemId, rating });

describe('buildReadiness', () => {
  test('zero with no problems, every pattern not started', () => {
    const r = buildReadiness({ problems: [], logs: [] });
    expect(r.score).toBe(0);
    expect(r.patterns).toHaveLength(CORE_PATTERNS.length);
    expect(r.patterns.every((p) => p.status === 'not-started')).toBe(true);
    expect(r.countdown).toBeNull();
  });

  test('maps platform tags onto core patterns through aliases', () => {
    const r = buildReadiness({
      problems: [problem('a', ['Breadth-First Search']), problem('b', ['dp']), problem('c', ['Binary Tree'])],
      logs: [],
    });
    const count = (name) => r.patterns.find((p) => p.name === name).problemCount;
    expect(count('Graphs')).toBe(1);
    expect(count('Dynamic Programming')).toBe(1);
    expect(count('Trees')).toBe(1);
  });

  test('score is coverage × recall, with unproven recall at 40%', () => {
    const problems = Array.from({ length: TARGET_PER_PATTERN }, (_, i) => problem(`s${i}`, ['Sliding Window']));
    const unreviewed = buildReadiness({ problems, logs: [] });
    expect(unreviewed.patterns.find((p) => p.name === 'Sliding Window').scorePercent).toBe(40);

    const logs = problems.map((p) => log(p._id, 'good'));
    const proven = buildReadiness({ problems, logs });
    const sw = proven.patterns.find((p) => p.name === 'Sliding Window');
    expect(sw).toMatchObject({ scorePercent: 100, recallPercent: 100, status: 'ready' });
  });

  test('countdown and daily pace', () => {
    const now = new Date('2026-09-10T00:00:00Z');
    const r = buildReadiness({
      problems: [],
      logs: [],
      goal: { interviewDate: new Date('2026-10-10T00:00:00Z'), company: 'Google' },
      now,
    });
    expect(r.countdown).toMatchObject({ daysLeft: 30, company: 'Google' });
    expect(r.countdown.problemsNeeded).toBe(CORE_PATTERNS.length * TARGET_PER_PATTERN);
    expect(r.countdown.problemsPerDay).toBeCloseTo((CORE_PATTERNS.length * TARGET_PER_PATTERN) / 30, 1);
  });

  test('focus lists the weakest non-ready patterns', () => {
    const r = buildReadiness({ problems: [problem('a', ['Array'])], logs: [] });
    expect(r.focus).toHaveLength(3);
    expect(r.focus).not.toContain('Arrays & Hashing');
  });
});
