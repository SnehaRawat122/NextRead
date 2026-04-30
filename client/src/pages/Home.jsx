import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BookRow from '../components/BookRow';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const ML_URL = process.env.REACT_APP_ML_URL || 'http://localhost:8000';

export default function Home() {
  const [forYouBooks, setForYouBooks]               = useState([]);
  const [collaborativeBooks, setCollaborativeBooks] = useState([]);
  const [searchResults, setSearchResults]           = useState([]);
  const [searchQuery, setSearchQuery]               = useState('');
  const [loadingForYou, setLoadingForYou]           = useState(true);
  const [loadingCollab, setLoadingCollab]           = useState(false);
  const [loadingSearch, setLoadingSearch]           = useState(false);
  const [showCollab, setShowCollab]                 = useState(false);

  const user     = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  // ─── FOR YOU ─────────────────────────────────────────
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
 const handleSearch = async (query = searchQuery) => {
  console.log('=== SEARCH CALLED ===');
  console.log('Query:', query);
  if (!query.trim()) return;
  setLoadingSearch(true);
  setSearchResults([]);

  const queryLower = query.toLowerCase().trim();
  // "sun" bhi include karo — length > 2
  const queryWords = queryLower.split(' ').filter(w => w.length > 2);

  try {
    const res = await axios.post(`${API_URL}/recommendations/by-title`, {
      title: query
    });
    let results = res.data.recommendations || [];

    console.log('ML results:', results.length, '| Query words:', queryWords);

  const hasExactMatch = results.length > 0 && results.some(b => {
  const titleLower = b.title?.toLowerCase() || '';
  const matchCount = queryWords.filter(w => titleLower.includes(w)).length;
  return matchCount >= Math.ceil(queryWords.length * 0.5);
});
    console.log('Exact match:', hasExactMatch);

    if (!hasExactMatch) {
      const gbRes = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&orderBy=relevance`
      );
      results = (gbRes.data.items || []).map(item => {
        const info = item.volumeInfo;
        return {
          isbn:   item.id,
          title:  info.title  || 'Unknown',
          author: info.authors?.join(', ') || 'Unknown',
          cover:  info.imageLinks?.thumbnail?.replace('http://', 'https://') || '',
        };
      });
    } else if (results.length < 5) {
      const gbRes = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&orderBy=relevance`
      );
      const gbBooks = (gbRes.data.items || []).map(item => {
        const info = item.volumeInfo;
        return {
          isbn:   item.id,
          title:  info.title  || 'Unknown',
          author: info.authors?.join(', ') || 'Unknown',
          cover:  info.imageLinks?.thumbnail?.replace('http://', 'https://') || '',
        };
      });
      const existingTitles = new Set(results.map(b => b.title?.toLowerCase()));
      results = [...results, ...gbBooks.filter(b => !existingTitles.has(b.title?.toLowerCase()))];
    }

    console.log('Final results:', results.length);
    setSearchResults(results);

  } catch (err) {
    console.log('ML failed:', err.message);
    try {
      const gbRes = await axios.get(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&orderBy=relevance`
      );
      setSearchResults((gbRes.data.items || []).map(item => {
        const info = item.volumeInfo;
        return {
          isbn:   item.id,
          title:  info.title  || 'Unknown',
          author: info.authors?.join(', ') || 'Unknown',
          cover:  info.imageLinks?.thumbnail?.replace('http://', 'https://') || '',
        };
      }));
    } catch {
      console.log('Both failed');
    }
  } finally {
    setLoadingSearch(false);
  }
};

  // ─── SUGGEST ME ──────────────────────────────────────
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

  // ─── SCAN ────────────────────────────────────────────
  const handleScanShelf = () => navigate('/bookshelf-scanner');

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.container}>

        {/* HERO */}
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>Welcome back, {user?.name}! 👋</h1>
          <p style={styles.heroSubtitle}>Discover your next favourite book</p>

          {/* SEARCH — form nahi, div hai */}
          <div style={styles.searchForm}>
           <input
  style={styles.searchInput}
  placeholder="🔍 Search by book title..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e.target.value); }}
/>
<button style={styles.searchBtn} onClick={() => handleSearch(searchQuery)}>
  Search
</button>
          </div>

          {/* ACTION BUTTONS */}
          <div style={styles.btnRow}>
            <button style={styles.suggestBtn} onClick={handleSuggestMe}>
              ✨ Suggest Me Books
            </button>
            <button style={styles.scanBtn} onClick={handleScanShelf}>
              Scan Book
            </button>
          </div>
        </div>

        {/* 1. SEARCH RESULTS — SABSE UPAR */}
        {(searchResults.length > 0 || loadingSearch) && (
          <BookRow
            title={`🔍 Results for "${searchQuery}"`}
            books={searchResults}
            loading={loadingSearch}
          />
        )}

        {/* 2. HYBRID */}
        {showCollab && (
          <BookRow
            title="👥 Users Like You Also Liked..."
            books={collaborativeBooks}
            loading={loadingCollab}
          />
        )}

        {/* 3. FOR YOU */}
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
  page:         { minHeight: '100vh', background: '#f0f4f8' },
  container:    { maxWidth: '1200px', margin: '0 auto', padding: '2rem' },
  hero:         { textAlign: 'center', padding: '3rem 0 2rem', marginBottom: '2rem' },
  heroTitle:    { fontSize: '2rem', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '0.5rem' },
  heroSubtitle: { color: '#6b7280', marginBottom: '2rem', fontSize: '1.1rem' },
  searchForm:   { display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1rem' },
  searchInput:  {
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