const express = require('express');
const ReviewCard = require('../models/ReviewCard');
const ReviewLog = require('../models/ReviewLog');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');
const { schedule } = require('../utils/sm2');
const { buildProgress, diffRewards } = require('../utils/gamification');
const { dayKey } = require('../utils/activityStats');
const { parseTzOffset, loadHistory } = require('../utils/history');

const RECALLED = new Set(['good', 'easy']);

const router = express.Router();
router.use(requireAuth);

// GET /api/reviews/today - all ReviewCards due now for the current user, populated with Problem
router.get('/today', async (req, res) => {
  try {
    const cards = await ReviewCard.find({ userId: req.userId, nextReviewAt: { $lte: new Date() } })
      .populate('problemId')
      .sort({ nextReviewAt: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:cardId?tzOffset= - submit a review. The response carries
// `rewards`: XP earned, personal bests, level-ups and newly unlocked
// achievements, worked out by replaying history before and after.
router.post('/:cardId', async (req, res) => {
  try {
    const { rating, timeTakenSec } = req.body;
    if (!['blackout', 'hard', 'good', 'easy'].includes(rating)) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    const card = await ReviewCard.findOne({ _id: req.params.cardId, userId: req.userId });
    if (!card) return res.status(404).json({ error: 'ReviewCard not found' });

    const tzOffsetMinutes = parseTzOffset(req.query.tzOffset);
    const now = new Date();
    const [user, history] = await Promise.all([User.findById(req.userId), loadHistory(req.userId)]);

    // First attempt at today's challenge problem counts as the challenge —
    // whether it came from the challenge card or the regular queue.
    const challenge = user?.dailyChallenge;
    const isChallenge = Boolean(
      challenge &&
        challenge.day === dayKey(now, tzOffsetMinutes) &&
        !challenge.result &&
        challenge.problemId &&
        String(challenge.problemId) === String(card.problemId)
    );

    const result = schedule(
      {
        easeFactor: card.easeFactor,
        intervalDays: card.intervalDays,
        repetitions: card.repetitions,
      },
      rating,
      now
    );

    card.easeFactor = result.easeFactor;
    card.intervalDays = result.intervalDays;
    card.repetitions = result.repetitions;
    card.lastReviewedAt = result.lastReviewedAt;
    card.nextReviewAt = result.nextReviewAt;
    card.state = result.state;
    await card.save();

    const reviewLog = await ReviewLog.create({
      userId: req.userId,
      problemId: card.problemId,
      rating,
      timeTakenSec,
      reviewedAt: now,
      challenge: isChallenge,
    });

    if (isChallenge) {
      user.dailyChallenge.result = RECALLED.has(rating) ? 'won' : 'lost';
      await user.save();
    }

    // Rewards are a bonus: if anything here throws, the review is already
    // saved and must still be reported as a success.
    let rewards = null;
    try {
      const before = buildProgress({ ...history, tzOffsetMinutes, now });
      const after = buildProgress({
        problems: history.problems,
        cards: history.cards.map((c) =>
          String(c._id) === String(card._id)
            ? { ...c, state: card.state, nextReviewAt: card.nextReviewAt, lastReviewedAt: card.lastReviewedAt }
            : c
        ),
        logs: [...history.logs, reviewLog.toObject()],
        tzOffsetMinutes,
        now,
      });
      rewards = {
        ...diffRewards(before, after),
        challenge: isChallenge ? user.dailyChallenge.result : null,
      };
    } catch (err) {
      console.error('Failed to compute rewards:', err);
    }

    res.json({ reviewCard: card, reviewLog, rewards });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
