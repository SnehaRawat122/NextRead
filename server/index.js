const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const ratingRoutes = require('./routes/ratings');
const uploadRoutes = require('./routes/upload');   
const onboardingRoutes = require('./routes/onboarding');

const app = express();
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Uploads folder publicly accessible
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));  

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected ✅'))
  .catch((err) => console.log('DB Error ❌', err));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/onboarding', onboardingRoutes);      


app.get('/', (req, res) => res.send('Server running ✅'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));