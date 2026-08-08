const express = require('express');
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const ReviewCard = require('../models/ReviewCard');
const ReviewLog = require('../models/ReviewLog');
const requireAuth = require('../middleware/requireAuth');
const { scorePatterns } = require('../utils/patternStats');

const router = express.Router();
router.use(requireAuth);

function dayKey(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

async function computeStreak(userId) {
  const logs = await ReviewLog.find({ userId }, 'reviewedAt').sort({ reviewedAt: -1 });
  if (logs.length === 0) return 0;

  const reviewedDays = new Set(logs.map((l) => dayKey(l.reviewedAt)));

  const today = new Date();
  let cursor = new Date(today);
  let streak = 0;

  // Streak counts backward from today; today itself doesn't have to have a
  // review yet for the streak to still be "alive" (in progress).
  if (!reviewedDays.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  while (reviewedDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

// GET /api/stats
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const [totalProblems, learningCount, reviewCount, masteredCount, dueTodayCount, streak] =
      await Promise.all([
        Problem.countDocuments({ userId }),
        ReviewCard.countDocuments({ userId, state: 'learning' }),
        ReviewCard.countDocuments({ userId, state: 'review' }),
        ReviewCard.countDocuments({ userId, state: 'mastered' }),
        ReviewCard.countDocuments({ userId, nextReviewAt: { $lte: new Date() } }),
        computeStreak(userId),
      ]);

    res.json({
      totalProblems,
      dueToday: dueTodayCount,
      streak,
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

module.exports = router;
