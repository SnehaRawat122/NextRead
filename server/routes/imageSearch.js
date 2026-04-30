const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Multer — save to /uploads temporarily
const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

const scannerUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'bookshelf', maxCount: 1 }
]);

const getUploadedFile = (req) => {
  if (req.files?.image?.[0]) return req.files.image[0];
  if (req.files?.bookshelf?.[0]) return req.files.bookshelf[0];
  return null;
};

const cleanupFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
};

const detectBooks = async (req, res) => {
  const uploadedFile = getUploadedFile(req);
  if (!uploadedFile) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const filePath = uploadedFile.path;

  try {
    const imageBuffer = await fs.promises.readFile(filePath);
    const imageBase64 = imageBuffer.toString('base64');
    const mlResponse = await axios.post(
      `${ML_SERVICE_URL}/image-search/detect`,
      { image: imageBase64 },
      { timeout: 30000 }
    );

    cleanupFile(filePath);

    const books = mlResponse.data.books || [];

    // ── Google Books se cover fetch karo ──
   const enrichedBooks = await Promise.all(
  books.map(async (book) => {
    try {
      const query = book.isbn
        ? `isbn:${book.isbn}`
        : encodeURIComponent(`${book.title} ${book.author || ''}`);

      const gbRes = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`,
        { timeout: 4000 }
      );

      const item = gbRes.data.items?.[0];
      const info = item?.volumeInfo || {};
      const imageLinks = info.imageLinks || {};

      const coverUrl = imageLinks.thumbnail?.replace('http://', 'https://')
                    || imageLinks.smallThumbnail?.replace('http://', 'https://')
                    || book.cover        // ← ML se aaya 'cover' field
                    || book.coverImage   // ← fallback
                    || '';

      return {
        ...book,
        coverImage: coverUrl,  // ← frontend 'coverImage' expect karta hai
        cover: coverUrl,       // ← dono set karo
      };
    } catch {
      return {
        ...book,
        coverImage: book.cover || '',  // ← ML ka 'cover' → 'coverImage' mein copy
        cover: book.cover || '',
      };
    }
  })
);
    return res.json({
      detected: enrichedBooks,
      count:    enrichedBooks.length
    });

  } catch (err) {
    cleanupFile(filePath);
    console.error('Image search error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'ML service unavailable. Try again later.' });
    }
    return res.status(500).json({
      error: err.response?.data?.error || 'Image search failed'
    });
  }
};

router.post('/detect', scannerUpload, detectBooks);
router.post('/scan', scannerUpload, detectBooks);

router.post('/recommend', async (req, res) => {
  try {
    const { detectedBooks = [], userHistory = [] } = req.body || {};

    const mlResponse = await axios.post(
      `${ML_SERVICE_URL}/image-search/recommend`,
      { detectedBooks, userHistory },
      { timeout: 30000 }
    );

    return res.json({
      recommendations: mlResponse.data.recommendations || []
    });
  } catch (err) {
    console.error('Image recommendation error:', err.message);

    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'ML service unavailable. Try again later.' });
    }

    return res.status(500).json({
      error: err.response?.data?.error || 'Recommendation search failed'
    });
  }
});

module.exports = router;
