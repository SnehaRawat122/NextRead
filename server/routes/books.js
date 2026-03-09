const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const protect = require('../middleware/authMiddleware');

// ─── ADD A BOOK (Protected) ──────────────────────────────
router.post('/add', protect, async (req, res) => {
  try {
    const { title, author, genre, description, coverImage, isbn, publishedYear } = req.body;

    const book = await Book.create({
      title, author, genre, description,
      coverImage, isbn, publishedYear
    });

    res.status(201).json({ message: 'Book added ✅', book });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET ALL BOOKS ───────────────────────────────────────
router.get('/all', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── GET SINGLE BOOK BY ID ───────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── SEARCH BOOKS ────────────────────────────────────────
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    const books = await Book.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { author: { $regex: query, $options: 'i' } },
        { genre: { $regex: query, $options: 'i' } }
      ]
    });
    res.status(200).json(books);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;