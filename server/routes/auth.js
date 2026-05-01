const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const User       = require('../models/User');
const Rating     = require('../models/Rating');
const authMiddleware = require('../middleware/auth');

// ─── REGISTER ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, preferences } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      preferences: preferences || { genres: [], authors: [] }
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({
      message: 'User registered successfully ✅',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(200).json({
      message: 'Login successful ✅',
      token,
      user: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        preferences: user.preferences,
        onboarded:   user.onboarded,
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── STATS ───────────────────────────────────────────────────
// GET /api/auth/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const ratingCount = await Rating.countDocuments({ userId });

    const userDoc = await User.findById(userId)
      .select('recommendations wishlist')
      .lean();

    const recommendedCount = userDoc?.recommendations?.length || 0;
    const wishlistCount    = userDoc?.wishlist?.length        || 0;

    return res.json({ ratingCount, recommendedCount, wishlistCount });
  } catch (err) {
    console.error('Stats error:', err.message);
    return res.status(500).json({ message: 'Could not fetch stats' });
  }
});

module.exports = router;