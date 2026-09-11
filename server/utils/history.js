/**
 * Shared loaders for the routes that replay a user's whole history
 * (progress, rewards on review, daily challenge).
 */

const Problem = require('../models/Problem');
const ReviewCard = require('../models/ReviewCard');
const ReviewLog = require('../models/ReviewLog');

// Clients send Date.prototype.getTimezoneOffset(), so day boundaries land in
// the user's local time rather than UTC. Falls back to UTC when absent.
function parseTzOffset(raw) {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && Math.abs(n) <= 840 ? n : 0;
}

// The UTC instant a local YYYY-MM-DD day starts, for a given offset.
function localDayStart(key, tzOffsetMinutes) {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) + tzOffsetMinutes * 60 * 1000);
}

async function loadHistory(userId) {
  const [problems, cards, logs] = await Promise.all([
    Problem.find({ userId }, 'title tags difficulty createdAt').lean(),
    ReviewCard.find({ userId }, 'problemId state nextReviewAt lastReviewedAt').lean(),
    ReviewLog.find({ userId }, 'problemId rating timeTakenSec reviewedAt challenge')
      .sort({ reviewedAt: 1 })
      .lean(),
  ]);
  return { problems, cards, logs };
}

module.exports = { parseTzOffset, localDayStart, loadHistory };
