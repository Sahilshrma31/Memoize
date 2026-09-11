const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    picture: { type: String },
    // Drives the countdown and pace on the dashboard.
    goal: {
      interviewDate: { type: Date },
      company: { type: String, default: '' },
    },
    // Today's challenge, picked once per local day so reloading doesn't reroll it.
    dailyChallenge: {
      day: { type: String }, // YYYY-MM-DD in the user's timezone
      problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
      reason: { type: String },
      result: { type: String, enum: ['won', 'lost', null], default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
