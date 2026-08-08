const express = require('express');
const ReviewCard = require('../models/ReviewCard');
const ReviewLog = require('../models/ReviewLog');
const requireAuth = require('../middleware/requireAuth');
const { schedule } = require('../utils/sm2');

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

// GET /api/reviews/upcoming - ReviewCards due in next 7 days
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const cards = await ReviewCard.find({
      userId: req.userId,
      nextReviewAt: { $gt: now, $lte: sevenDaysFromNow },
    })
      .populate('problemId')
      .sort({ nextReviewAt: 1 });
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reviews/:cardId - submit a review
router.post('/:cardId', async (req, res) => {
  try {
    const { rating, timeTakenSec } = req.body;
    if (!['blackout', 'hard', 'good', 'easy'].includes(rating)) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    const card = await ReviewCard.findOne({ _id: req.params.cardId, userId: req.userId });
    if (!card) return res.status(404).json({ error: 'ReviewCard not found' });

    const result = schedule(
      {
        easeFactor: card.easeFactor,
        intervalDays: card.intervalDays,
        repetitions: card.repetitions,
      },
      rating
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
    });

    res.json({ reviewCard: card, reviewLog });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
