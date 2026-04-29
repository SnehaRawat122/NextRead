const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// ✅ Middleware PEHLE
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));  // limit badhao — image base64 badi hoti hai
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected ✅'))
  .catch((err) => console.log('DB Error ❌', err));

// ✅ Routes EK BAAR
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const ratingRoutes = require('./routes/ratings');
const uploadRoutes = require('./routes/upload');
const onboardingRoutes = require('./routes/onboarding');
const recommendRoutes = require('./routes/recommendations');
const imageSearchRoutes = require('./routes/imageSearch');

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/recommendations', recommendRoutes);
app.use('/api/image-search', imageSearchRoutes);

app.get('/', (req, res) => res.send('Server running ✅'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));