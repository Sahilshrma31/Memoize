const mongoose = require('mongoose');

const reviewLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
    },
    rating: {
      type: String,
      enum: ['blackout', 'hard', 'good', 'easy'],
      required: true,
    },
    timeTakenSec: { type: Number },
    reviewedAt: { type: Date, default: Date.now },
    // This review was the day's challenge attempt. Stored on the log (not just
    // the user) so the challenge XP bonus can be replayed from history.
    challenge: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReviewLog', reviewLogSchema);
