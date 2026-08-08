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
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReviewLog', reviewLogSchema);
