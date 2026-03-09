const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const Book = require('../models/Book');
const protect = require('../middleware/authMiddleware');

// ─── SUBMIT RATING ───────────────────────────────────────
router.post('/rate', protect, async (req, res) => {
  try {
    const { bookId, rating, review } = req.body;
    const userId = req.user.id;

    // Check if user already rated this book
    const existing = await Rating.findOne({ userId, bookId });
    if (existing)
      return res.status(400).json({ message: 'Already rated this book' });

    // Save rating
    const newRating = await Rating.create({ userId, bookId, rating, review });

    // Update book's average rating
    const allRatings = await Rating.find({ bookId });
    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
    await Book.findByIdAndUpdate(bookId, { avgRating: avgRating.toFixed(1) });

    res.status(201).json({ message: 'Rating submitted ✅', newRating });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET ALL RATINGS FOR A BOOK ──────────────────────────
router.get('/book/:bookId', async (req, res) => {
  try {
    const ratings = await Rating.find({ bookId: req.params.bookId })
      .populate('userId', 'name');
    res.status(200).json(ratings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET ALL RATINGS BY A USER ───────────────────────────
router.get('/user', protect, async (req, res) => {
  try {
    const ratings = await Rating.find({ userId: req.user.id })
      .populate('bookId', 'title author coverImage');
    res.status(200).json(ratings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;