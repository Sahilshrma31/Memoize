const mongoose = require('mongoose');

const reviewCardSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true,
    },
    easeFactor: { type: Number, default: 2.5 },
    intervalDays: { type: Number, default: 1 },
    repetitions: { type: Number, default: 0 },
    lastReviewedAt: { type: Date },
    nextReviewAt: { type: Date, default: Date.now },
    state: {
      type: String,
      enum: ['learning', 'review', 'mastered'],
      default: 'learning',
    },
  },
  { timestamps: true }
);

reviewCardSchema.index({ userId: 1, nextReviewAt: 1 });

module.exports = mongoose.model('ReviewCard', reviewCardSchema);
