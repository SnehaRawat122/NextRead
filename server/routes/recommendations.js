const express        = require('express');
const router         = express.Router();
const axios          = require('axios');
const authMiddleware = require('../middleware/auth');
const Rating         = require('../models/Rating');
const User           = require('../models/User');
const Book           = require('../models/Book');

const ML_URL = process.env.ML_URL || 'http://localhost:8000';

// ─── HELPER: Rating count se weights decide karo ─────────────
function getWeights(ratingCount) {
  if (ratingCount <= 5)  return { content: 0.8, collaborative: 0.2, image: 0.0 };
  if (ratingCount <= 20) return { content: 0.5, collaborative: 0.5, image: 0.0 };
  return                        { content: 0.2, collaborative: 0.7, image: 0.1 };
}

// ─── FOR YOU (content-based — user preferences se) ───────────
// GET /api/recommendations/for-you
router.get('/for-you', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { genres = [], authors = [], favouriteBooks = [] } = user.preferences || {};

    const mlRes = await axios.post(`${ML_URL}/recommend/preferences`, {
      genres,
      authors,
      favouriteBooks,
    }, { timeout: 10000 });

    return res.json({ recommendations: mlRes.data.recommendations || [] });

  } catch (err) {
    console.error('For-you error:', err.message);
    return res.status(500).json({ message: 'Could not fetch recommendations' });
  }
});

// ─── BY TITLE ────────────────────────────────────────────────
// POST /api/recommendations/by-title
router.post('/by-title', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Title required' });

    const mlRes = await axios.post(`${ML_URL}/recommend/title`, {
      title,
    }, { timeout: 10000 });

    return res.json({ recommendations: mlRes.data.recommendations || [] });

  } catch (err) {
    console.error('By-title error:', err.message);
    return res.status(500).json({ message: 'ML service error' });
  }
});

// ─── HYBRID ("Users Like You Also Liked") ────────────────────
// GET /api/recommendations/hybrid
//
// Strategy:
// 1. User ki top-rated books ke ISBNs lo MongoDB se
// 2. Har ISBN ke liye Kaggle-trained KNN model se similar books lo
//    (isbn-based collaborative — userId match ki zaroorat nahi!)
// 3. Agar ratings nahi hain → preferences se alag genre suggest karo
router.get('/hybrid', authMiddleware, async (req, res) => {
  try {
    const userId      = req.user.id;
    const ratingCount = await Rating.countDocuments({ userId });
    const weights     = getWeights(ratingCount);

    let collabRecs = [];

    if (ratingCount > 0) {
      // ── User ne books rate ki hain → ISBN-based collaborative ──
      // User ki top 5 rated books lo
      const topRatings = await Rating.find({ userId })
        .sort({ rating: -1 })
        .limit(5)
        .lean();

      // Har rated book ka ISBN lo
      const ratedIsbns = new Set();
      for (const r of topRatings) {
        const book = await Book.findById(r.bookId).select('isbn').lean();
        if (book?.isbn) ratedIsbns.add(book.isbn);
      }

      console.log(`User rated ISBNs: ${[...ratedIsbns]}`);

      // Har ISBN ke liye KNN collaborative model se similar books lo
      // Yeh Kaggle ratings.csv pe trained hai — userId ki zaroorat nahi!
      for (const isbn of ratedIsbns) {
        try {
          const res = await axios.post(`${ML_URL}/recommend/collaborative`, {
            isbn,           // ← userId nahi, isbn pass kar rahe hain
          }, { timeout: 8000 });
          collabRecs.push(...(res.data.recommendations || []));
        } catch (e) {
          console.log(`Collab failed for ISBN ${isbn}:`, e.message);
        }
      }

      console.log(`Total collab recs before dedup: ${collabRecs.length}`);
    }

    // ── Fallback: Nahi mili collab recs → different genres suggest karo ──
    let contentRecs = [];
    if (collabRecs.length < 5) {
      const user = await User.findById(userId).lean();
      const userGenres = user?.preferences?.genres || [];

      // For-you se ALAG genres use karo
      const allGenres   = ['Mystery', 'Thriller', 'Romance', 'Science Fiction',
                           'Historical Fiction', 'Biography', 'Fantasy', 'Horror',
                           'Self-Help', 'Adventure'];
      const altGenres   = allGenres.filter(g => !userGenres.includes(g)).slice(0, 3);

      console.log(`Using alt genres for hybrid: ${altGenres}`);

      try {
        const altRes = await axios.post(`${ML_URL}/recommend/preferences`, {
          genres:         altGenres,
          authors:        [],
          favouriteBooks: [],
        }, { timeout: 10000 });
        contentRecs = altRes.data.recommendations || [];
      } catch (e) {
        console.log('Alt genre fallback failed:', e.message);
      }
    }

    // ── Merge aur dedupe ──
    const merged = mergeRecommendations(collabRecs, contentRecs, weights);

    return res.json({
      recommendations: merged,
      weights,
      ratingCount,
    });

  } catch (err) {
    console.error('Hybrid error:', err.message);
    return res.status(500).json({ message: 'Hybrid recommendation failed' });
  }
});

// ─── MERGE HELPER ────────────────────────────────────────────
function mergeRecommendations(collabRecs, contentRecs, weights) {
  const seen   = new Set();
  const scored = [
    ...collabRecs.map((b, i) => ({
      ...b,
      hybridScore: weights.collaborative * (1 - i * 0.04),
      source: 'collaborative',
    })),
    ...contentRecs.map((b, i) => ({
      ...b,
      hybridScore: weights.content * (1 - i * 0.04),
      source: 'content',
    })),
  ];

  const merged = [];
  scored
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .forEach(book => {
      const key = book.isbn || book.title?.toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        merged.push(book);
      }
    });

  return merged.slice(0, 20);
}

module.exports = router;