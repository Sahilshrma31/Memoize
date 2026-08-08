const MIN_EASE_FACTOR = 1.3;
const MASTERED_MIN_REPETITIONS = 5;
const MASTERED_MIN_INTERVAL_DAYS = 180;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pure SM-2 scheduling function.
 *
 * @param {Object} card - current scheduling state of a ReviewCard
 * @param {number} card.easeFactor
 * @param {number} card.intervalDays
 * @param {number} card.repetitions
 * @param {'blackout'|'hard'|'good'|'easy'} rating
 * @param {Date} [now] - reference time, defaults to current time
 * @returns {{easeFactor: number, intervalDays: number, repetitions: number,
 *            lastReviewedAt: Date, nextReviewAt: Date, state: 'learning'|'review'|'mastered'}}
 */
function schedule(card, rating, now = new Date()) {
  const { easeFactor, intervalDays, repetitions } = card;

  let nextEaseFactor = easeFactor;
  let nextRepetitions = repetitions;
  let nextIntervalDays = intervalDays;

  if (rating === 'blackout') {
    nextRepetitions = 0;
    nextIntervalDays = 1;
    nextEaseFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
  } else {
    nextRepetitions = repetitions + 1;

    if (rating === 'hard') {
      nextEaseFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
    } else if (rating === 'easy') {
      nextEaseFactor = easeFactor + 0.15;
    } else {
      // good
      nextEaseFactor = easeFactor;
    }

    if (nextRepetitions === 1) {
      nextIntervalDays = 1;
    } else if (nextRepetitions === 2) {
      nextIntervalDays = 6;
    } else {
      nextIntervalDays = Math.round(intervalDays * nextEaseFactor);
    }
  }

  const state = computeState(nextRepetitions, nextIntervalDays);
  const nextReviewAt = new Date(now.getTime() + nextIntervalDays * MS_PER_DAY);

  return {
    easeFactor: nextEaseFactor,
    intervalDays: nextIntervalDays,
    repetitions: nextRepetitions,
    lastReviewedAt: now,
    nextReviewAt,
    state,
  };
}

function computeState(repetitions, intervalDays) {
  if (repetitions < 2) return 'learning';
  if (repetitions >= MASTERED_MIN_REPETITIONS && intervalDays >= MASTERED_MIN_INTERVAL_DAYS) {
    return 'mastered';
  }
  return 'review';
}

module.exports = { schedule, MIN_EASE_FACTOR };
