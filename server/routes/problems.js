const express = require('express');
const Problem = require('../models/Problem');
const ReviewCard = require('../models/ReviewCard');
const ReviewLog = require('../models/ReviewLog');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

function detectPlatform(url = '') {
  const lower = url.toLowerCase();
  if (lower.includes('leetcode.com')) return 'leetcode';
  if (lower.includes('codeforces.com')) return 'codeforces';
  return 'other';
}

// POST /api/problems - create a Problem + auto-create its ReviewCard (due now)
router.post('/', async (req, res) => {
  try {
    const { title, url, platform, tags, company, difficulty, notes, intuition } = req.body;

    const problem = await Problem.create({
      userId: req.userId,
      title,
      url,
      platform: platform || detectPlatform(url),
      tags,
      company,
      difficulty,
      notes,
      intuition,
      intuitionUpdatedAt: intuition ? new Date() : undefined,
    });

    const reviewCard = await ReviewCard.create({ userId: req.userId, problemId: problem._id });

    res.status(201).json({ problem, reviewCard });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/problems - list all problems for the current user, support ?tag= and ?company= filters
router.get('/', async (req, res) => {
  try {
    const { tag, company, platform, difficulty } = req.query;
    const filter = { userId: req.userId };
    if (tag) filter.tags = tag;
    if (company) filter.company = company;
    if (platform) filter.platform = platform;
    if (difficulty) filter.difficulty = difficulty;

    const problems = await Problem.find(filter).sort({ createdAt: -1 });
    const cards = await ReviewCard.find({
      userId: req.userId,
      problemId: { $in: problems.map((p) => p._id) },
    });
    const cardByProblemId = new Map(cards.map((c) => [c.problemId.toString(), c]));

    const result = problems.map((p) => ({
      ...p.toObject(),
      reviewCard: cardByProblemId.get(p._id.toString()) || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/problems/:id - single problem with its ReviewCard + ReviewLog history
router.get('/:id', async (req, res) => {
  try {
    const problem = await Problem.findOne({ _id: req.params.id, userId: req.userId });
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const reviewCard = await ReviewCard.findOne({ problemId: problem._id, userId: req.userId });
    const reviewLogs = await ReviewLog.find({ problemId: problem._id, userId: req.userId }).sort({
      reviewedAt: 1,
    });

    res.json({ problem, reviewCard, reviewLogs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/problems/:id - edit the parts of a problem that evolve over time.
// Intuition especially: it gets rewritten as understanding sharpens, so it
// can't be write-once like the rest of the record.
const EDITABLE_FIELDS = ['title', 'url', 'notes', 'intuition', 'tags', 'company', 'difficulty'];

router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    for (const field of EDITABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No editable fields supplied' });
    }

    // Stamp the intuition edit so the UI can show when it was last refined.
    if (Object.prototype.hasOwnProperty.call(updates, 'intuition')) {
      updates.intuitionUpdatedAt = new Date();
    }

    const problem = await Problem.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    res.json({ problem });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/problems/:id - remove a problem and everything hanging off it.
// The ReviewCard and ReviewLogs must go too: stats and the pattern map read
// straight from those collections, so leaving them behind would keep the
// problem contributing to streaks and success rates after it's "deleted".
router.delete('/:id', async (req, res) => {
  try {
    const problem = await Problem.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    const [cards, logs] = await Promise.all([
      ReviewCard.deleteMany({ problemId: problem._id, userId: req.userId }),
      ReviewLog.deleteMany({ problemId: problem._id, userId: req.userId }),
    ]);

    res.json({
      deleted: {
        problem: problem.title,
        reviewCards: cards.deletedCount,
        reviewLogs: logs.deletedCount,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
