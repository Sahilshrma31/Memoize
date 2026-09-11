const express = require('express');
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const ReviewCard = require('../models/ReviewCard');
const ReviewLog = require('../models/ReviewLog');
const requireAuth = require('../middleware/requireAuth');
const { scorePatterns } = require('../utils/patternStats');
const { buildActivity, dayKey, shiftDays } = require('../utils/activityStats');
const { buildPatternTracker } = require('../utils/patternTracker');
const { parseTzOffset, localDayStart } = require('../utils/history');

const router = express.Router();
router.use(requireAuth);

async function loadActivity(userId, tzOffsetMinutes, windowDays) {
  const logs = await ReviewLog.find({ userId }, 'reviewedAt').lean();
  return buildActivity(logs, { tzOffsetMinutes, windowDays });
}

// GET /api/stats
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const tzOffsetMinutes = parseTzOffset(req.query.tzOffset);
    const now = new Date();
    // End of tomorrow in the user's timezone — "what's coming up next".
    const endOfTomorrow = localDayStart(shiftDays(dayKey(now, tzOffsetMinutes), 2), tzOffsetMinutes);

    const [totalProblems, learningCount, reviewCount, masteredCount, dueTodayCount, dueByTomorrow, activity] =
      await Promise.all([
        Problem.countDocuments({ userId }),
        ReviewCard.countDocuments({ userId, state: 'learning' }),
        ReviewCard.countDocuments({ userId, state: 'review' }),
        ReviewCard.countDocuments({ userId, state: 'mastered' }),
        ReviewCard.countDocuments({ userId, nextReviewAt: { $lte: now } }),
        ReviewCard.countDocuments({ userId, nextReviewAt: { $gt: now, $lt: endOfTomorrow } }),
        loadActivity(userId, tzOffsetMinutes, 1),
      ]);

    res.json({
      totalProblems,
      dueToday: dueTodayCount,
      dueByTomorrow,
      streak: activity.currentStreak,
      longestStreak: activity.longestStreak,
      freezesAvailable: activity.freezesAvailable,
      reviewedToday: activity.reviewedToday,
      byState: {
        learning: learningCount,
        review: reviewCount,
        mastered: masteredCount,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/patterns - success rate per DSA tag, weakest first.
// Answers "which patterns do I actually keep failing?" from review history.
router.get('/patterns', async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const rows = await ReviewLog.aggregate([
      { $match: { userId } },
      {
        $lookup: {
          from: Problem.collection.name,
          localField: 'problemId',
          foreignField: '_id',
          as: 'problem',
        },
      },
      { $unwind: '$problem' },
      { $unwind: '$problem.tags' },
      {
        $group: {
          _id: '$problem.tags',
          total: { $sum: 1 },
          blackout: { $sum: { $cond: [{ $eq: ['$rating', 'blackout'] }, 1, 0] } },
          hard: { $sum: { $cond: [{ $eq: ['$rating', 'hard'] }, 1, 0] } },
          good: { $sum: { $cond: [{ $eq: ['$rating', 'good'] }, 1, 0] } },
          easy: { $sum: { $cond: [{ $eq: ['$rating', 'easy'] }, 1, 0] } },
          avgTimeSec: { $avg: '$timeTakenSec' },
          problemIds: { $addToSet: '$problemId' },
        },
      },
      {
        $project: {
          _id: 0,
          tag: '$_id',
          total: 1,
          blackout: 1,
          hard: 1,
          good: 1,
          easy: 1,
          avgTimeSec: 1,
          problemCount: { $size: '$problemIds' },
        },
      },
    ]);

    res.json({ patterns: scorePatterns(rows) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/pattern-tracker - per-pattern problems solved, revisions,
// recall, mastery and tier. Starts from problems, not reviews, so unreviewed
// patterns still appear.
router.get('/pattern-tracker', async (req, res) => {
  try {
    const userId = req.userId;
    const [problems, cards, logs] = await Promise.all([
      Problem.find({ userId }, 'title tags difficulty').lean(),
      ReviewCard.find({ userId }, 'problemId state nextReviewAt').lean(),
      ReviewLog.find({ userId }, 'problemId rating timeTakenSec reviewedAt').lean(),
    ]);

    res.json(buildPatternTracker({ problems, cards, logs }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stats/activity?tzOffset=-330&days=365
// Daily review counts for the contribution heatmap, plus streak figures.
router.get('/activity', async (req, res) => {
  try {
    const tzOffsetMinutes = parseTzOffset(req.query.tzOffset);
    const requested = Number.parseInt(req.query.days, 10);
    const windowDays = Number.isFinite(requested)
      ? Math.min(Math.max(requested, 1), 366)
      : 365;

    res.json(await loadActivity(req.userId, tzOffsetMinutes, windowDays));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
