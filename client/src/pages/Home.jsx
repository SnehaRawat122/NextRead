import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BookRow from '../components/BookRow';
import axios from 'axios';

const ML_URL = process.env.REACT_APP_ML_URL || 'http://localhost:8000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ─── Remove duplicate books by title+author ──────────────
const dedupe = (books) => {
  const seen = new Set();
  return books.filter(book => {
    const key = `${book.title?.toLowerCase().trim()}__${book.author?.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ─── Save ML books to MongoDB ─────────────────────────────
const saveBooksToMongo = async (books, token) => {
  const promises = books.map(book =>
    axios.post(`${API_URL}/books/add`, {
      title:         book.title        || 'Unknown Title',
      author:        book.author       || 'Unknown Author',
      genre:         book.genre        ? [book.genre] : [],
      description:   book.description  || '',
      coverImage:    book.cover        || book.coverImage || '',
      isbn:          book.isbn         || '',
      publishedYear: book.year         || book.publishedYear || null,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(() => {})
  );
  await Promise.all(promises);
};

export default function Home() {
  const [forYouBooks, setForYouBooks]               = useState([]);
  const [collaborativeBooks, setCollaborativeBooks] = useState([]);
  const [searchResults, setSearchResults]           = useState([]);
  const [searchQuery, setSearchQuery]               = useState('');
  const [loadingForYou, setLoadingForYou]           = useState(true);
  const [loadingCollab, setLoadingCollab]           = useState(false);
  const [loadingSearch, setLoadingSearch]           = useState(false);
  const [showCollab, setShowCollab]                 = useState(false);
  const [searchError, setSearchError]               = useState('');
  const [collabError, setCollabError]               = useState('');

  const user = JSON.parse(localStorage.getItem('user'));

  // ─── FOR YOU ─────────────────────────────────────────────
  useEffect(() => {
    const fetchForYou = async () => {
      try {
        const token = localStorage.getItem('token');
        const prefRes = await axios.get(
          `${API_URL}/onboarding/preferences`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const prefs = prefRes.data;

        const mlRes = await axios.post(`${ML_URL}/recommend/preferences`, {
          genres:         prefs.genres         || [],
          authors:        prefs.authors        || [],
          favouriteBooks: prefs.favouriteBooks || []
        });

        const books = dedupe(mlRes.data.recommendations || []);
        await saveBooksToMongo(books, token);
        setForYouBooks(books);
      } catch (err) {
        console.log('ForYou error:', err.message);
      } finally {
        setLoadingForYou(false);
      }
    };
    fetchForYou();
  }, []);

  // ─── SEARCH ──────────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoadingSearch(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const token = localStorage.getItem('token');

      const mlRes = await axios.post(
        `${ML_URL}/recommend/title`,
        { title: searchQuery },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const books = dedupe(mlRes.data.recommendations || []);

      if (books.length === 0) {
        setSearchError('No books found. Try a different title.');
      } else {
        await saveBooksToMongo(books, token);
        setSearchResults(books);
      }
    } catch (err) {
      console.error('Search error:', err);
      if (err.code === 'ERR_NETWORK') {
        setSearchError('ML service not running. Start: cd ml && python app.py');
      } else {
        setSearchError(`Search failed: ${err.message}`);
      }
    } finally {
      setLoadingSearch(false);
    }
  };

  // ─── SUGGEST ME ──────────────────────────────────────────
  const handleSuggestMe = async () => {
    setShowCollab(true);
    setLoadingCollab(true);
    setCollabError('');
    setCollaborativeBooks([]);

    try {
      const token = localStorage.getItem('token');

      const ratingsRes = await axios.get(
        `${API_URL}/ratings/user`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const userRatings = ratingsRes.data.map(r => ({
        isbn:   r.bookId?.isbn || r.bookId,
        rating: r.rating
      }));

      if (userRatings.length === 0) {
        setCollabError('Rate some books first to get personalised suggestions!');
        setLoadingCollab(false);
        return;
      }

      const mlRes = await axios.post(
        `${ML_URL}/recommend/collaborative`,
        { user_ratings: userRatings },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const books = dedupe(mlRes.data.recommendations || []);

      if (books.length === 0) {
        setCollabError('Not enough data yet. Rate more books!');
      } else {
        await saveBooksToMongo(books, token);
        setCollaborativeBooks(books);
      }
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setCollabError('ML service not running. Start: cd ml && python app.py');
      } else {
        setCollabError(`Failed: ${err.message}`);
      }
    } finally {
      setLoadingCollab(false);
    }
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>

        {/* HERO */}
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Welcome back, {user?.name}! 👋</h1>
          <p style={styles.heroSubtitle}>Discover your next favourite book</p>

          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              style={styles.searchInput}
              placeholder="🔍 Search by book title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" style={styles.searchBtn} disabled={loadingSearch}>
              {loadingSearch ? 'Searching...' : 'Search'}
            </button>
          </form>

          {searchError && <p style={styles.errorText}>⚠️ {searchError}</p>}

          <button style={styles.suggestBtn} onClick={handleSuggestMe} disabled={loadingCollab}>
            {loadingCollab ? '⏳ Loading...' : '✨ Suggest Me Books'}
          </button>

          {collabError && <p style={styles.errorText}>⚠️ {collabError}</p>}
        </div>

        {/* SEARCH RESULTS */}
        {(searchResults.length > 0 || loadingSearch) && (
          <BookRow
            title={`🔍 Results for "${searchQuery}"`}
            books={searchResults}
            loading={loadingSearch}
          />
        )}

        {/* COLLABORATIVE */}
        {showCollab && !collabError && (
          <BookRow
            title="👥 Users Like You Also Liked..."
            books={collaborativeBooks}
            loading={loadingCollab}
          />
        )}

        {/* FOR YOU */}
        <BookRow
          title="📚 Recommended For You"
          books={forYouBooks}
          loading={loadingForYou}
        />

      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#f0f4f8' },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
  hero: { textAlign: 'center', padding: '3rem 0 2rem', marginBottom: '2rem' },
  heroTitle: { fontSize: '2rem', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '0.5rem' },
  heroSubtitle: { color: '#6b7280', marginBottom: '2rem', fontSize: '1.1rem' },
  searchForm: { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1rem' },
  searchInput: {
    width: '400px', padding: '12px 20px', background: '#ffffff',
    border: '1px solid #e2e8f0', borderRadius: '25px', color: '#333',
    fontSize: '15px', outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  searchBtn: {
    padding: '12px 24px', background: '#4f46e5', color: 'white',
    border: 'none', borderRadius: '25px', cursor: 'pointer',
    fontSize: '15px', fontWeight: 'bold'
  },
  suggestBtn: {
    marginTop: '1rem', padding: '12px 32px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer',
    fontSize: '15px', fontWeight: 'bold',
    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)'
  },
  errorText: {
    color: '#ef4444', fontSize: '13px', marginTop: '8px',
    background: '#fef2f2', padding: '8px 16px', borderRadius: '8px',
    display: 'inline-block'
  }
};
