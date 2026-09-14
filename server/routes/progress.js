const express = require('express');
const ReviewCard = require('../models/ReviewCard');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');
const { buildProgress, LEVELS, REVIEW_XP, BONUS_XP } = require('../utils/gamification');
const { buildReadiness } = require('../utils/readiness');
const { pickChallenge } = require('../utils/dailyChallenge');
const { dayKey } = require('../utils/activityStats');
const { parseTzOffset, loadHistory } = require('../utils/history');

const router = express.Router();
router.use(requireAuth);

const RECENT_EVENTS = 15;
const MAX_COMPANY_LENGTH = 60;

// GET /api/progress?tzOffset= - XP, level, achievements, streak freezes and a
// feed of recent XP. Everything is replayed from review history.
router.get('/', async (req, res) => {
  try {
    const tzOffsetMinutes = parseTzOffset(req.query.tzOffset);
    const history = await loadHistory(req.userId);
    const progress = buildProgress({ ...history, tzOffsetMinutes });

    const titleById = new Map(history.problems.map((p) => [String(p._id), p.title]));
    const recent = progress.events
      .slice(-RECENT_EVENTS)
      .reverse()
      .map((e) => ({ ...e, title: titleById.get(e.problemId) || 'Deleted problem' }));

    const now = new Date();
    res.json({
      // Read app-wide for the tab title; the cards are already loaded above.
      dueNow: history.cards.filter((c) => new Date(c.nextReviewAt) <= now).length,
      level: progress.level,
      xpToday: progress.xpToday,
      xpByDay: progress.xpByDay,
      achievements: progress.achievements,
      counters: progress.counters,
      streak: progress.streak,
      recent,
      levels: LEVELS,
      rules: { review: REVIEW_XP, bonus: BONUS_XP },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/progress/today?tzOffset= - the dashboard's daily widgets: goal
// ring, today's challenge, and interview readiness.
router.get('/today', async (req, res) => {
  try {
    const tzOffsetMinutes = parseTzOffset(req.query.tzOffset);
    const now = new Date();
    const today = dayKey(now, tzOffsetMinutes);

    const [user, history] = await Promise.all([User.findById(req.userId), loadHistory(req.userId)]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Pick a new challenge on a new day, or if today's hasn't been attempted
    // and its problem has since been deleted (or there was nothing to pick).
    const problemIds = new Set(history.problems.map((p) => String(p._id)));
    const current = user.dailyChallenge;
    const stale =
      !current?.day ||
      current.day !== today ||
      (!current.result && (!current.problemId || !problemIds.has(String(current.problemId))));

    if (stale) {
      const pick = pickChallenge({
        ...history,
        seed: `${req.userId}:${today}`,
        now,
        tzOffsetMinutes,
      });
      user.dailyChallenge = {
        day: today,
        problemId: pick?.problemId || null,
        reason: pick?.reason || null,
        result: null,
      };
      await user.save();
    }

    const challengeCard = user.dailyChallenge.problemId
      ? await ReviewCard.findOne({ userId: req.userId, problemId: user.dailyChallenge.problemId }).populate(
          'problemId'
        )
      : null;

    const reviewedToday = history.logs.filter((l) => dayKey(new Date(l.reviewedAt), tzOffsetMinutes) === today).length;
    const dueNow = history.cards.filter((c) => new Date(c.nextReviewAt) <= now).length;

    res.json({
      dailyGoal: {
        reviewedToday,
        dueNow,
        target: reviewedToday + dueNow,
        complete: dueNow === 0 && reviewedToday > 0,
      },
      challenge: challengeCard?.problemId
        ? {
            day: user.dailyChallenge.day,
            reason: user.dailyChallenge.reason,
            result: user.dailyChallenge.result,
            card: challengeCard,
          }
        : null,
      readiness: buildReadiness({ problems: history.problems, logs: history.logs, goal: user.goal, now }),
      goal: user.goal || {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/progress/goal - set or clear the interview date and target company.
router.put('/goal', async (req, res) => {
  try {
    const { interviewDate, company } = req.body;

    let date = null;
    if (interviewDate) {
      date = new Date(interviewDate);
      if (Number.isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid interview date' });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          'goal.interviewDate': date,
          'goal.company': String(company || '').trim().slice(0, MAX_COMPANY_LENGTH),
        },
      },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ goal: user.goal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
