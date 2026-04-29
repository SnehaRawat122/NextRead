const express = require('express');
const router = express.Router();
const User = require('../models/User');
const protect = require('../middleware/authMiddleware');

// ─── SAVE USER PREFERENCES ───────────────────────────────
router.post('/preferences', protect, async (req, res) => {
  try {
    const {
      genres = [],
      authors = [],
      favouriteBooks = [],
      moods = []
    } = req.body;
    const userId = req.user.id;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        preferences: {
          genres,
          authors,
          favouriteBooks,
          moods
        }
      },
      { new: true }
    );

    res.status(200).json({
      message: 'Preferences saved ✅',
      preferences: user.preferences
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET USER PREFERENCES ────────────────────────────────
router.get('/preferences', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    res.status(200).json(user?.preferences || {
      genres: [],
      authors: [],
      favouriteBooks: [],
      moods: []
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── CHECK IF ONBOARDING DONE ────────────────────────────
router.get('/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    const isDone = (user?.preferences?.genres || []).length > 0;
    res.status(200).json({ onboardingDone: isDone });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
