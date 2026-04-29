import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BookRow from '../components/BookRow';
import {
  getAllBooks,
  searchBooks,
} from '../services/api';
import axios from 'axios';

const ML_URL = process.env.REACT_APP_ML_URL || 'http://localhost:8000';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function Home() {
  const [forYouBooks, setForYouBooks] = useState([]);
  const [collaborativeBooks, setCollaborativeBooks] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingForYou, setLoadingForYou] = useState(true);
  const [loadingCollab, setLoadingCollab] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showCollab, setShowCollab] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));

  // ─── FETCH FOR YOU RECOMMENDATIONS ──────────────────
  useEffect(() => {
    const fetchForYou = async () => {
      try {
        const token = localStorage.getItem('token');
        // Get user preferences
        const prefRes = await axios.get(
          'http://localhost:5000/api/onboarding/preferences',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const prefs = prefRes.data;

        // Get ML recommendations
        const mlRes = await axios.post(`${ML_URL}/recommend/preferences`, {
          genres: prefs.genres || [],
          authors: prefs.authors || [],
          favouriteBooks: prefs.favouriteBooks || []
        });

        setForYouBooks(mlRes.data.recommendations);
      } catch (err) {
        console.log('Error fetching recommendations:', err);
      } finally {
        setLoadingForYou(false);
      }
    };
    fetchForYou();
  }, []);

  // ─── SEARCH BY TITLE ─────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoadingSearch(true);
    try {
      const mlRes = await axios.post(`${ML_URL}/recommend/title`, {
        title: searchQuery
      });
      setSearchResults(mlRes.data.recommendations);
    } catch (err) {
      console.log('Search error:', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  // ─── COLLABORATIVE RECOMMENDATIONS ──────────────────
 const handleSuggestMe = async () => {
  setShowCollab(true);
  setLoadingCollab(true);
  try {
    const token = localStorage.getItem('token');

    // Pehle user ki ratings fetch karo MongoDB se
    const ratingsRes = await axios.get(
      `${API_URL}/ratings/user`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Ratings ko ML format mein convert karo
    const userRatings = ratingsRes.data.map(r => ({
      isbn: r.bookId?.isbn || r.bookId,
      rating: r.rating
    }));

    console.log('User ratings:', userRatings);

    // ML service ko bhejo
    const mlRes = await axios.post(`${ML_URL}/recommend/collaborative`, {
      user_ratings: userRatings
    });

    setCollaborativeBooks(mlRes.data.recommendations || []);
  } catch (err) {
    console.log('Collab Error:', err);
  } finally {
    setLoadingCollab(false);
  }
};
 
  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>

        {/* ─── HERO ──────────────────────────────────── */}
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>
            Welcome back, {user?.name}! 👋
          </h1>
          <p style={styles.heroSubtitle}>
            Discover your next favourite book
          </p>

          {/* SEARCH BAR */}
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              style={styles.searchInput}
              placeholder="🔍 Search by book title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" style={styles.searchBtn}>
              Search
            </button>
          </form>

          {/* SUGGEST ME BUTTON */}
          <button style={styles.suggestBtn} onClick={handleSuggestMe}>
            ✨ Suggest Me Books
          </button>
        </div>

        {/* ─── SEARCH RESULTS ────────────────────────── */}
        {(searchResults.length > 0 || loadingSearch) && (
          <BookRow
            title={`🔍 Results for "${searchQuery}"`}
            books={searchResults}
            loading={loadingSearch}
          />
        )}

        {/* ─── COLLABORATIVE ─────────────────────────── */}
        {showCollab && (
          <BookRow
            title="👥 Users Like You Also Liked..."
            books={collaborativeBooks}
            loading={loadingCollab}
          />
        )}

        {/* ─── FOR YOU ───────────────────────────────── */}
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
 page: {
    minHeight: '100vh',
    background: '#f0f4f8'
      
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
      
  },
  hero: {
    textAlign: 'center',
    padding: '3rem 0 2rem',
    marginBottom: '2rem'
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: '0.5rem'
  },
  heroSubtitle: {
    color: '#6b7280',
    marginBottom: '2rem',
    fontSize: '1.1rem'
  },
  searchForm: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '1rem'
  },
  searchInput: {
    width: '400px',
    padding: '12px 20px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '25px',
    color: '#333',
    fontSize: '15px',
    outline: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  searchBtn: {
    padding: '12px 24px',
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold'
  },
  suggestBtn: {
    marginTop: '1rem',
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white',
    border: 'none',
    borderRadius: '25px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)'
  }

};
