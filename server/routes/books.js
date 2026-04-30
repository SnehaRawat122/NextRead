const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const mongoose = require('mongoose');
const protect = require('../middleware/authMiddleware');

// ─── ADD A BOOK (Protected) ──────────────────────────────
router.post('/add', protect, async (req, res) => {
  try {
    const { title, author, genre, description, coverImage, isbn, publishedYear } = req.body;

    // ── Duplicate check — ISBN ya title+author already exists ──
    if (isbn) {
      const existing = await Book.findOne({ isbn });
      if (existing) {
        return res.status(200).json({ message: 'Book already exists', book: existing });
      }
    } else {
      const existing = await Book.findOne({
        title: { $regex: new RegExp(`^${title}$`, 'i') },
        author: { $regex: new RegExp(`^${author}$`, 'i') }
      });
      if (existing) {
        return res.status(200).json({ message: 'Book already exists', book: existing });
      }
    }

    // ── publishedYear string hai toh number mein convert karo ──
    const year = publishedYear ? parseInt(publishedYear) : undefined;

    const book = await Book.create({
      title, author, genre, description,
      coverImage, isbn, publishedYear: year
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

// ─── GET SINGLE BOOK BY _id OR isbn ─────────────────────
// Pehle MongoDB _id try karta hai, agar valid nahi ya mila nahi
// toh isbn se dhundta hai — ML service wali books ke liye
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let book = null;

    // Check karo valid MongoDB ObjectId hai ya nahi
    if (mongoose.Types.ObjectId.isValid(id)) {
      book = await Book.findById(id);
    }

    // Agar _id se nahi mila → isbn se try karo
    if (!book) {
      book = await Book.findOne({ isbn: id });
    }

    if (!book) return res.status(404).json({ message: 'Book not found' });

    res.status(200).json(book);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
