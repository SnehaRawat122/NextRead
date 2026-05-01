const express        = require('express');
const router         = express.Router();
const axios          = require('axios');
const Book           = require('../models/Book');
const authMiddleware = require('../middleware/auth');

// ─── GOOGLE BOOKS PROXY ───────────────────────────────────────
// ⚠️  MUST be before /:isbn — warna "google" isbn samajh leta hai Express
// GET /api/books/google/search?q=ikigai
router.get('/google/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim())
      return res.status(400).json({ message: 'Query required' });

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url    = 'https://www.googleapis.com/books/v1/volumes'
                 + `?q=${encodeURIComponent(q)}`
                 + `&maxResults=10`
                 + `&orderBy=relevance`
                 + (apiKey ? `&key=${apiKey}` : '');

    const response = await axios.get(url, { timeout: 5000 });

    const books = (response.data.items || []).map(item => {
      const info = item.volumeInfo;
      return {
        isbn:   item.id,
        title:  info.title               || 'Unknown',
        author: info.authors?.join(', ') || 'Unknown',
        cover:  (info.imageLinks?.thumbnail || '').replace('http://', 'https://'),
      };
    });

    return res.json({ books });

  } catch (err) {
    if (err.response?.status === 429)
      return res.status(429).json({ message: 'Rate limit hit, try again in a minute' });
    console.error('Google Books error:', err.message);
    return res.status(500).json({ message: 'Google Books search failed' });
  }
});

// ─── ADD BOOK (save Google Books result to MongoDB) ───────────
// POST /api/books/add
// BookDetail.jsx use karta hai jab user Google Books ki book rate karta hai
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { title, author, isbn, coverImage, description, publisher, publishedYear, genre } = req.body;

    if (!title || !author)
      return res.status(400).json({ message: 'Title and author required' });

    // Already exists? Return existing
    const existing = await Book.findOne({ isbn });
    if (existing)
      return res.json({ book: existing });

    const book = await Book.create({
      title,
      author,
      isbn,
      coverImage: coverImage || '',
      description: description || '',
      publisher: publisher || '',
      publishedYear: publishedYear || null,
      genre: genre || [],
      avgRating: 0,
    });

    return res.status(201).json({ book });

  } catch (err) {
    console.error('Book add error:', err.message);
    return res.status(500).json({ message: 'Could not save book' });
  }
});

// ─── GET ALL BOOKS ────────────────────────────────────────────
// GET /api/books?page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const books = await Book.find().skip(skip).limit(limit);
    const total = await Book.countDocuments();

    return res.json({ books, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── GET SINGLE BOOK BY ISBN / ID ────────────────────────────
// ⚠️  ALWAYS last — wildcard hai yeh
// GET /api/books/:isbn
router.get('/:isbn', async (req, res) => {
  try {
    const book = await Book.findOne({ isbn: req.params.isbn })
               || await Book.findById(req.params.isbn).catch(() => null);

    if (!book) return res.status(404).json({ message: 'Book not found' });
    return res.json(book);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;