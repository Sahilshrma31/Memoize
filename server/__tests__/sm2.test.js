const { schedule } = require('../utils/sm2');

const NOW = new Date('2026-01-01T00:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const freshCard = () => ({ easeFactor: 2.5, intervalDays: 1, repetitions: 0 });

describe('sm2.schedule', () => {
  describe('blackout rating', () => {
    it('resets repetitions to 0, intervalDays to 1, and lowers easeFactor by 0.2', () => {
      const card = { easeFactor: 2.5, intervalDays: 20, repetitions: 4 };
      const result = schedule(card, 'blackout', NOW);

      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(1);
      expect(result.easeFactor).toBeCloseTo(2.3);
      expect(result.state).toBe('learning');
      expect(result.nextReviewAt.getTime()).toBe(NOW.getTime() + 1 * DAY_MS);
      expect(result.lastReviewedAt).toBe(NOW);
    });

    it('clamps easeFactor at the 1.3 floor', () => {
      const card = { easeFactor: 1.35, intervalDays: 10, repetitions: 3 };
      const result = schedule(card, 'blackout', NOW);

      expect(result.easeFactor).toBe(1.3);
    });
  });

  describe('hard rating', () => {
    it('increments repetitions and lowers easeFactor by 0.15', () => {
      const card = freshCard();
      const result = schedule(card, 'hard', NOW);

      expect(result.repetitions).toBe(1);
      expect(result.easeFactor).toBeCloseTo(2.35);
      expect(result.intervalDays).toBe(1); // repetitions === 1
      expect(result.state).toBe('learning'); // repetitions < 2
    });

    it('clamps easeFactor at the 1.3 floor', () => {
      const card = { easeFactor: 1.4, intervalDays: 6, repetitions: 1 };
      const result = schedule(card, 'hard', NOW);

      expect(result.easeFactor).toBe(1.3);
    });

    it('sets intervalDays to 6 on second repetition', () => {
      const card = { easeFactor: 2.5, intervalDays: 1, repetitions: 1 };
      const result = schedule(card, 'hard', NOW);

      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
      expect(result.state).toBe('review');
    });

    it('multiplies intervalDays by easeFactor beyond the second repetition', () => {
      const card = { easeFactor: 2.0, intervalDays: 6, repetitions: 2 };
      const result = schedule(card, 'hard', NOW);

      expect(result.repetitions).toBe(3);
      // easeFactor drops to 1.85 first, then intervalDays = round(6 * 1.85) = 11
      expect(result.easeFactor).toBeCloseTo(1.85);
      expect(result.intervalDays).toBe(11);
    });
  });

  describe('good rating', () => {
    it('increments repetitions and leaves easeFactor unchanged', () => {
      const card = freshCard();
      const result = schedule(card, 'good', NOW);

      expect(result.repetitions).toBe(1);
      expect(result.easeFactor).toBe(2.5);
      expect(result.intervalDays).toBe(1);
    });

    it('sets intervalDays to 6 on second repetition', () => {
      const card = { easeFactor: 2.5, intervalDays: 1, repetitions: 1 };
      const result = schedule(card, 'good', NOW);

      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
    });

    it('multiplies intervalDays by easeFactor beyond the second repetition', () => {
      const card = { easeFactor: 2.5, intervalDays: 6, repetitions: 2 };
      const result = schedule(card, 'good', NOW);

      expect(result.repetitions).toBe(3);
      expect(result.intervalDays).toBe(15); // round(6 * 2.5)
    });

    it('reaches mastered once repetitions >= 5 and intervalDays >= 180', () => {
      const card = { easeFactor: 2.5, intervalDays: 100, repetitions: 4 };
      const result = schedule(card, 'good', NOW);

      expect(result.repetitions).toBe(5);
      expect(result.intervalDays).toBe(250); // round(100 * 2.5)
      expect(result.state).toBe('mastered');
    });
  });

  describe('easy rating', () => {
    it('increments repetitions and raises easeFactor by 0.15', () => {
      const card = freshCard();
      const result = schedule(card, 'easy', NOW);

      expect(result.repetitions).toBe(1);
      expect(result.easeFactor).toBeCloseTo(2.65);
      expect(result.intervalDays).toBe(1);
    });

    it('sets intervalDays to 6 on second repetition', () => {
      const card = { easeFactor: 2.5, intervalDays: 1, repetitions: 1 };
      const result = schedule(card, 'easy', NOW);

      expect(result.repetitions).toBe(2);
      expect(result.intervalDays).toBe(6);
    });

    it('multiplies intervalDays by the boosted easeFactor beyond the second repetition', () => {
      const card = { easeFactor: 2.5, intervalDays: 6, repetitions: 2 };
      const result = schedule(card, 'easy', NOW);

      expect(result.repetitions).toBe(3);
      expect(result.easeFactor).toBeCloseTo(2.65);
      expect(result.intervalDays).toBe(16); // round(6 * 2.65)
    });
  });

  describe('nextReviewAt computation', () => {
    it('adds intervalDays days to the reference time', () => {
      const card = { easeFactor: 2.5, intervalDays: 6, repetitions: 2 };
      const result = schedule(card, 'good', NOW);

      expect(result.nextReviewAt.toISOString()).toBe(
        new Date(NOW.getTime() + 15 * DAY_MS).toISOString()
      );
    });
  });
});
