const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/user');
const protect = require('../middleware/authMiddleware');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// ─── GET RECOMMENDATIONS FOR LOGGED IN USER ──────────────
router.get('/for-you', protect, async (req, res) => {
  try {
    // user prefernce taken
    const user = await User.findById(req.user.id).select('preferences');

    // ML service preference send
    const mlResponse = await axios.post(`${ML_URL}/recommend/preferences`, {
      genres: user.preferences.genres || [],
      authors: user.preferences.authors || [],
      favouriteBooks: user.preferences.favouriteBooks || []
    });

    res.status(200).json({
      message: 'Recommendations fetched ✅',
      recommendations: mlResponse.data.recommendations
    });

  } catch (err) {
    res.status(500).json({ message: 'Error fetching recommendations', error: err.message });
  }
});

// ─── GET RECOMMENDATIONS BY BOOK TITLE ───────────────────
router.post('/by-title', async (req, res) => {
  try {
    const { title } = req.body;

    const mlResponse = await axios.post(`${ML_URL}/recommend/title`, { title });

    res.status(200).json({
      message: 'Similar books fetched ',
      recommendations: mlResponse.data.recommendations
    });

  } catch (err) {
    res.status(500).json({ message: 'Error fetching recommendations', error: err.message });
  }
});


// ─── COLLABORATIVE RECOMMENDATIONS ───────────────────────
router.post('/similar', async (req, res) => {
  try {
    const { isbn } = req.body;

    const mlResponse = await axios.post(`${ML_URL}/recommend/collaborative`, {
      isbn
    });

    res.status(200).json({
      message: 'Similar books fetched ✅',
      recommendations: mlResponse.data.recommendations
    });

  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
});

module.exports = router;