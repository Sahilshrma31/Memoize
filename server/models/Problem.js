const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    platform: {
      type: String,
      enum: ['leetcode', 'codeforces', 'gfg', 'other'],
      default: 'other',
    },
    tags: { type: [String], default: [] },
    company: { type: [String], default: [] },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    notes: { type: String, default: '' },
    // The key insight — the thing you want to recall before re-solving.
    // Deliberately separate from notes: notes say why the problem is worth
    // keeping, intuition is the approach itself, and it gets rewritten as
    // your understanding sharpens across reviews.
    intuition: { type: String, default: '' },
    intuitionUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Problem', problemSchema);
