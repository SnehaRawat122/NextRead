const axios = require('axios');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Content based recommendations
export const getContentRecommendations = async (preferences) => {
  const res = await axios.post(`${ML_URL}/recommend/preferences`, preferences);
  return res.data.recommendations;
};

// Title based recommendations  
export const getTitleRecommendations = async (title) => {
  const res = await axios.post(`${ML_URL}/recommend/title`, { title });
  return res.data.recommendations;
};