const { buildActivity, dayKey, shiftDays } = require('../utils/activityStats');

const IST = -330; // UTC+5:30, as getTimezoneOffset() reports it
const log = (iso) => ({ reviewedAt: new Date(iso) });

describe('dayKey', () => {
  it('buckets by UTC when no offset is given', () => {
    expect(dayKey(new Date('2026-08-09T20:30:00Z'))).toBe('2026-08-09');
  });

  it('rolls a late-evening UTC time into the next local day for IST', () => {
    // 20:30 UTC is 02:00 next morning in IST
    expect(dayKey(new Date('2026-08-09T20:30:00Z'), IST)).toBe('2026-08-10');
  });

  it('keeps an early-morning IST review on the correct local day', () => {
    // 02:00 IST on Aug 10 == 20:30 UTC on Aug 9 — must read as Aug 10 locally
    expect(dayKey(new Date('2026-08-09T20:30:00Z'), IST)).toBe('2026-08-10');
    expect(dayKey(new Date('2026-08-09T20:30:00Z'), 0)).toBe('2026-08-09');
  });
});

describe('shiftDays', () => {
  it('moves forward and backward', () => {
    expect(shiftDays('2026-08-09', 1)).toBe('2026-08-10');
    expect(shiftDays('2026-08-09', -1)).toBe('2026-08-08');
  });

  it('crosses month and year boundaries', () => {
    expect(shiftDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(shiftDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('handles a leap day', () => {
    expect(shiftDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('buildActivity — streaks', () => {
  const now = new Date('2026-08-09T12:00:00Z');

  it('counts a run ending today', () => {
    const a = buildActivity(
      [log('2026-08-07T10:00:00Z'), log('2026-08-08T10:00:00Z'), log('2026-08-09T10:00:00Z')],
      { now }
    );
    expect(a.currentStreak).toBe(3);
  });

  it('keeps the streak alive when today has no reviews yet', () => {
    // Day isn't over — yesterday's run should still count.
    const a = buildActivity([log('2026-08-07T10:00:00Z'), log('2026-08-08T10:00:00Z')], { now });
    expect(a.currentStreak).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    const a = buildActivity([log('2026-08-05T10:00:00Z'), log('2026-08-06T10:00:00Z')], { now });
    expect(a.currentStreak).toBe(0);
  });

  it('counts multiple reviews in one day as a single streak day', () => {
    const a = buildActivity(
      [log('2026-08-09T09:00:00Z'), log('2026-08-09T10:00:00Z'), log('2026-08-09T11:00:00Z')],
      { now }
    );
    expect(a.currentStreak).toBe(1);
    expect(a.activeDays).toBe(1);
    expect(a.totalReviews).toBe(3);
  });

  it('finds the longest historical streak even when the current one is shorter', () => {
    const a = buildActivity(
      [
        // a 4-day run back in July
        log('2026-07-01T10:00:00Z'),
        log('2026-07-02T10:00:00Z'),
        log('2026-07-03T10:00:00Z'),
        log('2026-07-04T10:00:00Z'),
        // a 2-day run ending today
        log('2026-08-08T10:00:00Z'),
        log('2026-08-09T10:00:00Z'),
      ],
      { now }
    );
    expect(a.longestStreak).toBe(4);
    expect(a.currentStreak).toBe(2);
  });

  it('returns zeros for no activity', () => {
    const a = buildActivity([], { now });
    expect(a.currentStreak).toBe(0);
    expect(a.longestStreak).toBe(0);
    expect(a.activeDays).toBe(0);
    expect(a.totalReviews).toBe(0);
  });

  it('respects timezone when deciding whether today counts', () => {
    // 2026-08-09T20:30Z is Aug 10 in IST. In UTC the streak would look broken.
    const nowIst = new Date('2026-08-09T20:30:00Z');
    const logs = [log('2026-08-09T20:00:00Z')]; // also Aug 10 in IST
    const ist = buildActivity(logs, { now: nowIst, tzOffsetMinutes: IST });
    expect(ist.currentStreak).toBe(1);
  });
});

describe('buildActivity — grid', () => {
  const now = new Date('2026-08-09T12:00:00Z');

  it('returns a dense day list including zero days', () => {
    const a = buildActivity([log('2026-08-09T10:00:00Z')], { now, windowDays: 7 });
    expect(a.days).toHaveLength(7);
    expect(a.days[a.days.length - 1]).toEqual({ date: '2026-08-09', count: 1 });
    expect(a.days[0]).toEqual({ date: '2026-08-03', count: 0 });
  });

  it('ends the window on today', () => {
    const a = buildActivity([], { now, windowDays: 365 });
    expect(a.days[a.days.length - 1].date).toBe('2026-08-09');
    expect(a.days).toHaveLength(365);
  });

  it('reports the busiest day', () => {
    const a = buildActivity(
      [
        log('2026-08-07T10:00:00Z'),
        log('2026-08-08T10:00:00Z'),
        log('2026-08-08T11:00:00Z'),
        log('2026-08-08T12:00:00Z'),
      ],
      { now }
    );
    expect(a.busiestDay).toEqual({ date: '2026-08-08', count: 3 });
  });

  it('counts reviews outside the window in totals but not in the grid', () => {
    const a = buildActivity([log('2020-01-01T10:00:00Z')], { now, windowDays: 7 });
    expect(a.totalReviews).toBe(1);
    expect(a.days.every((d) => d.count === 0)).toBe(true);
  });
});
