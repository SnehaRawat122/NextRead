import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// ─── AUTH ────────────────────────────────────────────────
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);

// ─── ONBOARDING ──────────────────────────────────────────
export const savePreferences = (data) => API.post('/onboarding/preferences', data);
export const getOnboardingStatus = () => API.get('/onboarding/status');

// ─── BOOKS ───────────────────────────────────────────────
export const getAllBooks = () => API.get('/books/all');
export const searchBooks = (query) => API.get(`/books/search/${query}`);
export const getBookById = (id) => API.get(`/books/${id}`);

// ─── RATINGS ─────────────────────────────────────────────
export const submitRating = (data) => API.post('/ratings/rate', data);
export const getBookRatings = (bookId) => API.get(`/ratings/book/${bookId}`);
export const getUserRatings = () => API.get('/ratings/user');