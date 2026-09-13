const express = require('express');
const rateLimit = require('express-rate-limit');
const Problem = require('../models/Problem');
const requireAuth = require('../middleware/requireAuth');
const {
  gradeRecall,
  isConfigured,
  resolveProvider,
  MAX_ATTEMPT_CHARS,
} = require('../utils/recallGrader');

const router = express.Router();
router.use(requireAuth);

// Tighter than the global limiter: these calls cost money, so they're capped
// per account rather than per IP.
const graderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  keyGenerator: (req) => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many recall checks — try again in a few minutes.' },
});

// GET /api/recall/status - lets the UI hide the feature when it isn't configured
router.get('/status', (req, res) => {
  // `provider` is for your own debugging — the UI only reads `enabled`.
  res.json({ enabled: isConfigured(), provider: resolveProvider()?.id || null });
});

// POST /api/recall/:problemId - grade a from-memory attempt against the saved
// intuition and solution
router.post('/:problemId', graderLimiter, async (req, res) => {
  if (!isConfigured()) {
    return res
      .status(503)
      .json({ error: 'Recall grading is not configured on this server.', disabled: true });
  }

  const attempt = typeof req.body?.attempt === 'string' ? req.body.attempt.trim() : '';
  if (!attempt) {
    return res.status(400).json({ error: 'Write what you remember before checking it.' });
  }
  if (attempt.length > MAX_ATTEMPT_CHARS * 2) {
    return res.status(413).json({ error: 'That attempt is too long to grade.' });
  }

  try {
    const problem = await Problem.findOne({ _id: req.params.problemId, userId: req.userId });
    if (!problem) return res.status(404).json({ error: 'Problem not found' });

    // Nothing to grade against — say so plainly instead of asking the model to
    // invent a reference and marking the attempt against it.
    if (!problem.intuition?.trim() && !problem.code?.trim()) {
      return res.status(400).json({
        error: 'Save an intuition or your solution first — there’s nothing to grade against yet.',
      });
    }

    res.json(await gradeRecall({ problem, attempt }));
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message });
  }
});

module.exports = router;
