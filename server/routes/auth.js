const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');
const { signToken } = require('../utils/jwt');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/google - exchange a Google ID token for a Memoize session token
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing credential' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const user = await User.findOneAndUpdate(
      { googleId: payload.sub },
      {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const token = signToken(user._id.toString());
    res.json({ token, user });
  } catch (err) {
    res.status(401).json({ error: 'Google sign-in failed: ' + err.message });
  }
});

// GET /api/auth/me - return the current user for a valid session token
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;
