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
    const { title, url, platform, tags, company, difficulty, notes } = req.body;

    const problem = await Problem.create({
      userId: req.userId,
      title,
      url,
      platform: platform || detectPlatform(url),
      tags,
      company,
      difficulty,
      notes,
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

module.exports = router;
