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

    return res.json({
      detected: mlResponse.data.books || [],
      count: mlResponse.data.count || 0
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
