const { scorePatterns } = require('../utils/patternStats');

const row = (tag, counts) => ({
  tag,
  blackout: 0,
  hard: 0,
  good: 0,
  easy: 0,
  avgTimeSec: null,
  problemCount: 1,
  ...counts,
  total:
    (counts.blackout || 0) + (counts.hard || 0) + (counts.good || 0) + (counts.easy || 0),
});

describe('scorePatterns', () => {
  it('counts good and easy as successes', () => {
    const [p] = scorePatterns([row('dp', { good: 3, easy: 1, hard: 1, blackout: 1 })]);
    expect(p.total).toBe(6);
    expect(p.successPercent).toBe(67); // 4 of 6
  });

  it('treats hard and blackout as failures', () => {
    const [p] = scorePatterns([row('graphs', { hard: 2, blackout: 2 })]);
    expect(p.successPercent).toBe(0);
    expect(p.level).toBe('weak');
  });

  it('classifies levels against the 80% recall threshold', () => {
    const [solid] = scorePatterns([row('a', { good: 8, hard: 2 })]); // 80%
    const [developing] = scorePatterns([row('b', { good: 6, hard: 4 })]); // 60%
    const [weak] = scorePatterns([row('c', { good: 4, hard: 6 })]); // 40%

    expect(solid.level).toBe('solid');
    expect(developing.level).toBe('developing');
    expect(weak.level).toBe('weak');
  });

  it('sorts weakest first', () => {
    const out = scorePatterns([
      row('strong', { good: 9, hard: 1 }),
      row('weak', { good: 2, hard: 8 }),
      row('mid', { good: 5, hard: 5 }),
    ]);
    expect(out.map((p) => p.tag)).toEqual(['weak', 'mid', 'strong']);
  });

  it('flags low-sample patterns as unreliable', () => {
    const [p] = scorePatterns([row('new-tag', { blackout: 1 })]);
    expect(p.reliable).toBe(false);
  });

  it('ranks reliable weaknesses above noisy low-sample ones', () => {
    // 0% off a single review must not outrank a real 30% measured over 10.
    const out = scorePatterns([
      row('noise', { blackout: 1 }), // 0%, 1 review
      row('real-weakness', { good: 3, hard: 7 }), // 30%, 10 reviews
    ]);
    expect(out[0].tag).toBe('real-weakness');
    expect(out[1].tag).toBe('noise');
  });

  it('breaks success-rate ties by evidence volume', () => {
    const out = scorePatterns([
      row('few', { good: 1, hard: 1 }),
      row('many', { good: 10, hard: 10 }),
    ]);
    expect(out[0].tag).toBe('many');
  });

  it('rounds average time and passes null through', () => {
    const [withTime] = scorePatterns([row('a', { good: 1, avgTimeSec: 92.6 })]);
    const [noTime] = scorePatterns([row('b', { good: 1 })]);
    expect(withTime.avgTimeSec).toBe(93);
    expect(noTime.avgTimeSec).toBeNull();
  });

  it('handles an empty input', () => {
    expect(scorePatterns([])).toEqual([]);
  });

  it('does not divide by zero when a tag has no reviews', () => {
    const [p] = scorePatterns([{ tag: 'x', total: 0, blackout: 0, hard: 0, good: 0, easy: 0, avgTimeSec: null, problemCount: 0 }]);
    expect(p.successRate).toBe(0);
    expect(p.successPercent).toBe(0);
  });
});
