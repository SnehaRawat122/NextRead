const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const protect = require('../middleware/authMiddleware');

// ─── MULTER STORAGE CONFIG ───────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

// ─── FILE TYPE FILTER ────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images allowed! (jpeg, jpg, png, webp)'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── UPLOAD ROUTE ────────────────────────────────────────
router.post('/cover', protect, upload.single('coverImage'), (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No file uploaded' });

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(200).json({ message: 'Image uploaded ✅', imageUrl });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// ─── RECOMMEND BY IMAGE ROUTE (ML se connect hoga baad mein) ──
router.post('/recommend-by-image', protect, upload.single('bookImage'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: 'No image uploaded' });

    // ML service ko image bhejenge (Phase 7 mein)
    res.status(200).json({
      message: 'Image received ✅ ML integration coming in Phase 7',
      filename: req.file.filename
    });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
});

module.exports = router;