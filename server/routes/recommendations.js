const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const Rating = require('../models/Rating');
const protect = require('../middleware/authMiddleware');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// ─── GET RECOMMENDATIONS FOR LOGGED IN USER ──────────────
router.get('/for-you', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    const preferences = user?.preferences || {};

    const mlResponse = await axios.post(`${ML_URL}/recommend/preferences`, {
      genres: preferences.genres || [],
      authors: preferences.authors || [],
      favouriteBooks: preferences.favouriteBooks || []
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
router.get('/similar', protect, async (req, res) => {
  try {
    const ratings = await Rating.find({ userId: req.user.id }).populate('bookId', 'isbn');

    const userRatings = ratings
      .filter((entry) => entry.bookId?.isbn)
      .map((entry) => ({
        isbn: entry.bookId.isbn,
        rating: entry.rating
      }));

    const mlResponse = await axios.post(`${ML_URL}/recommend/collaborative`, {
      user_ratings: userRatings
    });

    res.status(200).json({
      message: 'Collaborative recommendations fetched ✅',
      recommendations: mlResponse.data.recommendations
    });

  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
});

// ─── HYBRID RECOMMENDATIONS ───────────────────────────────
router.get('/hybrid', protect, async (req, res) => {
  try {
    // Step 1: User preferences fetch karo
    const user = await User.findById(req.user.id).select('preferences');

    // Step 2: Rating count fetch karo — weights decide karne ke liye
    const ratingCount = await Rating.countDocuments({ userId: req.user.id });

    // Step 3: Flask hybrid engine call karo
    const mlResponse = await axios.post(`${ML_URL}/recommend/hybrid`, {
      userId: req.user.id.toString(),
      ratingCount,
      genres: user.preferences?.genres || [],
      authors: user.preferences?.authors || [],
      favouriteBooks: user.preferences?.favouriteBooks || []
    });

    // Step 4: Weights bhi return karo — frontend pe dikhayenge kis mode mein hai user
    res.status(200).json({
      message: 'Hybrid recommendations fetched ✅',
      recommendations: mlResponse.data.recommendations,
      weights: mlResponse.data.weights,
      ratingCount
    });

  } catch (err) {
    res.status(500).json({ message: 'Error fetching hybrid recommendations', error: err.message });
  }
});

module.exports = router;
