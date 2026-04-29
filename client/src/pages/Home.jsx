import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BookRow from '../components/BookRow';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function Home() {
  const [forYouBooks, setForYouBooks]         = useState([]);
  const [collaborativeBooks, setCollaborativeBooks] = useState([]);
  const [searchResults, setSearchResults]     = useState([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [loadingForYou, setLoadingForYou]     = useState(true);
  const [loadingCollab, setLoadingCollab]     = useState(false);
  const [loadingSearch, setLoadingSearch]     = useState(false);
  const [showCollab, setShowCollab]           = useState(false);

  const user     = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  // ─── FOR YOU: preferences → ML ───────────────────────
  useEffect(() => {
    const fetchForYou = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/recommendations/for-you`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setForYouBooks(res.data.recommendations || []);
      } catch (err) {
        console.log('Error fetching recommendations:', err.message);
      } finally {
        setLoadingForYou(false);
      }
    };
    fetchForYou();
  }, []);

  // ─── SEARCH ──────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoadingSearch(true);
    setSearchResults([]);
    try {
      const res = await axios.post(`${API_URL}/recommendations/by-title`, {
        title: searchQuery
      });
      setSearchResults(res.data.recommendations || []);
    } catch (err) {
      console.log('Search error:', err.message);
    } finally {
      setLoadingSearch(false);
    }
  };

  // ─── SUGGEST ME: hybrid via Node backend ─────────────
  const handleSuggestMe = async () => {
    setShowCollab(true);
    setLoadingCollab(true);
    try {
      const token = localStorage.getItem('token');

      const res = await axios.get(
        `${API_URL}/recommendations/hybrid`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Hybrid weights:', res.data.weights);
      console.log('Rating count:', res.data.ratingCount);

      setCollaborativeBooks(res.data.recommendations || []);
    } catch (err) {
      console.log('Hybrid Error:', err.message);
    } finally {
      setLoadingCollab(false);
    }
  };

  // ─── SCAN MY SHELF: navigate to scanner page ─────────
  const handleScanShelf = () => {
    navigate('/bookshelf-scanner');
  };

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>

        {/* HERO */}
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Welcome back, {user?.name}! 👋</h1>
          <p style={styles.heroSubtitle}>Discover your next favourite book</p>

          {/* SEARCH */}
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              style={styles.searchInput}
              placeholder="🔍 Search by book title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" style={styles.searchBtn}>Search</button>
          </form>

          {/* ACTION BUTTONS */}
          <div style={styles.btnRow}>
            <button style={styles.suggestBtn} onClick={handleSuggestMe}>
              ✨ Suggest Me Books
            </button>
            <button style={styles.scanBtn} onClick={handleScanShelf}>
              📚 Scan My Shelf
            </button>
          </div>
        </div>

        {/* SEARCH RESULTS */}
        {(searchResults.length > 0 || loadingSearch) && (
          <BookRow
            title={`🔍 Results for "${searchQuery}"`}
            books={searchResults}
            loading={loadingSearch}
          />
        )}

        {/* HYBRID / COLLAB */}
        {showCollab && (
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
  page:        { minHeight: '100vh', background: '#f0f4f8' },
  container:   { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
  hero:        { textAlign: 'center', padding: '3rem 0 2rem', marginBottom: '2rem' },
  heroTitle:   { fontSize: '2rem', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '0.5rem' },
  heroSubtitle:{ color: '#6b7280', marginBottom: '2rem', fontSize: '1.1rem' },
  searchForm:  { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1rem' },
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
  btnRow: { display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '1rem' },
  suggestBtn: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: 'white', border: 'none', borderRadius: '25px',
    cursor: 'pointer', fontSize: '15px', fontWeight: 'bold',
    boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)'
  },
  scanBtn: {
    padding: '12px 32px', background: 'white', color: '#4f46e5',
    border: '2px solid #4f46e5', borderRadius: '25px',
    cursor: 'pointer', fontSize: '15px', fontWeight: 'bold'
  }
};
