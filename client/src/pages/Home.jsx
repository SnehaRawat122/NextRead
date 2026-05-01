import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BookRow from '../components/BookRow';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export default function Home() {
  const [forYouBooks,        setForYouBooks]        = useState([]);
  const [collaborativeBooks, setCollaborativeBooks] = useState([]);
  const [searchResults,      setSearchResults]      = useState([]);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [loadingForYou,      setLoadingForYou]      = useState(true);
  const [loadingCollab,      setLoadingCollab]      = useState(false);
  const [loadingSearch,      setLoadingSearch]      = useState(false);
  const [showCollab,         setShowCollab]         = useState(false);
  const [stats,              setStats]              = useState({ rated: 0 });
  const [activeGenre,        setActiveGenre]        = useState(null);

  const user     = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  // ─── GREETING ────────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // ─── FETCH STATS ─────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/auth/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats({ rated: res.data.ratingCount || 0 });
      } catch {
        // silently fail — stats decorative hain
      }
    };
    fetchStats();
  }, []);

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

  // ─── GOOGLE BOOKS — backend proxy se call ────────────
  // Direct googleapis.com frontend se nahi — 429 avoid karne ke liye
  const searchGoogleBooks = async (query) => {
    try {
      const res = await axios.get(
        `${API_URL}/books/google/search?q=${encodeURIComponent(query)}`
      );
      return res.data.books || [];
    } catch (err) {
      console.log('Google Books proxy failed:', err.message);
      return [];
    }
  };

  // ─── SEARCH ──────────────────────────────────────────
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    setLoadingSearch(true);
    setSearchResults([]);

    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(' ').filter(w => w.length > 2);

    try {
      // Step 1 — ML service se results lo
      const res = await axios.post(`${API_URL}/recommendations/by-title`, { title: query });
      let results = res.data.recommendations || [];

      // Step 2 — ML ne relevant result diya ya nahi check karo
      const hasExactMatch = results.length > 0 && results.some(b => {
        const titleLower = b.title?.toLowerCase() || '';
        const matchCount = queryWords.filter(w => titleLower.includes(w)).length;
        return matchCount >= Math.ceil(queryWords.length * 0.5);
      });

      if (!hasExactMatch) {
        // ML irrelevant tha — Google Books se lo
        results = await searchGoogleBooks(query);

      } else if (results.length < 5) {
        // ML ne kam results diye — Google se top up karo
        const gbBooks = await searchGoogleBooks(query);
        const existingTitles = new Set(results.map(b => b.title?.toLowerCase()));
        results = [
          ...results,
          ...gbBooks.filter(b => !existingTitles.has(b.title?.toLowerCase()))
        ];
      }

      setSearchResults(results);

    } catch {
      // ML service down — Google Books fallback
      console.log('ML failed, trying Google Books...');
      const gbBooks = await searchGoogleBooks(query);
      if (gbBooks.length > 0) {
        setSearchResults(gbBooks);
      } else {
        console.log('Both search methods failed');
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
      const res = await axios.get(`${API_URL}/recommendations/hybrid`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Hybrid weights:', res.data.weights);
      console.log('Rating count:', res.data.ratingCount);
      setCollaborativeBooks(res.data.recommendations || []);
    } catch (err) {
      console.log('Hybrid Error:', err.message);
    } finally {
      setLoadingCollab(false);
    }
  };

  // ─── GENRE QUICK FILTER ──────────────────────────────
  const handleGenreClick = (genre) => {
    setActiveGenre(genre === activeGenre ? null : genre);
    handleSearch(genre);
  };

  // ─── SCAN ────────────────────────────────────────────
  const handleScanShelf = () => navigate('/bookshelf-scanner');

  // ─── USER GENRES ─────────────────────────────────────
  const userGenres = user?.preferences?.genres?.length
    ? user.preferences.genres
    : ['Fantasy', 'Mystery', 'Sci-Fi', 'Classic Lit'];

  return (
    <div style={s.page}>
      <Navbar />

      <div style={s.container}>

        {/* ── HERO ─────────────────────────────────────── */}
        <div style={s.hero}>
          <p style={s.greeting}>{getGreeting()}, {user?.name}</p>
          <h1 style={s.heroTitle}>What will you discover<br />today?</h1>
          <p style={s.heroSub}>Your personalised reading guide — powered by NextRead</p>

          <div style={s.searchBar}>
            <span style={s.searchIcon}>🔍</span>
            <input
              style={s.searchInput}
              placeholder="Search by title, author, or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e.target.value); }}
            />
            <button style={s.searchBtn} onClick={() => handleSearch(searchQuery)}>
              Search
            </button>
          </div>

          <div style={s.btnRow}>
            <button style={s.suggestBtn} onClick={handleSuggestMe}>
              <span style={s.btnIcon}>✦</span> Suggest for me
            </button>
            <button style={s.scanBtn} onClick={handleScanShelf}>
              <span style={s.btnIcon}>◎</span> Scan a cover
            </button>
          </div>
        </div>

        {/* ── STATS BAR ────────────────────────────────── */}
        <div style={s.statsBar}>
          <div style={s.statItem}>
            <span style={s.statVal}>{stats.rated}</span>
            <span style={s.statLbl}>books rated</span>
          </div>
        </div>

        {/* ── GENRE CHIPS ──────────────────────────────── */}
        <div style={s.genreWrap}>
          <span style={s.genreLabel}>Your genres</span>
          <div style={s.genreChips}>
            {userGenres.map(g => (
              <button
                key={g}
                style={{ ...s.chip, ...(activeGenre === g ? s.chipActive : {}) }}
                onClick={() => handleGenreClick(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* ── SEARCH RESULTS ───────────────────────────── */}
        {(searchResults.length > 0 || loadingSearch) && (
          <Section title={`Results for "${searchQuery}"`} dot="#7F77DD" onSeeAll={() => {}}>
            <BookRow books={searchResults} loading={loadingSearch} showScore />
          </Section>
        )}

        {/* ── HYBRID / COLLAB ──────────────────────────── */}
        {showCollab && (
          <Section title="Users like you also liked" dot="#1D9E75" onSeeAll={() => {}}>
            <BookRow books={collaborativeBooks} loading={loadingCollab} />
          </Section>
        )}

        {/* ── FOR YOU ──────────────────────────────────── */}
        <Section title="Recommended for you" dot="#BA7517" onSeeAll={() => {}}>
          <BookRow books={forYouBooks} loading={loadingForYou} />
        </Section>

      </div>
    </div>
  );
}

// ─── SECTION WRAPPER ─────────────────────────────────────────
function Section({ title, dot, onSeeAll, children }) {
  return (
    <div style={sec.wrap}>
      <div style={sec.head}>
        <div style={sec.titleRow}>
          <span style={{ ...sec.dot, background: dot }} />
          <span style={sec.title}>{title}</span>
        </div>
        <button style={sec.seeAll} onClick={onSeeAll}>see all →</button>
      </div>
      {children}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────
const s = {
  page:      { minHeight: '100vh', background: '#f5f4fb', fontFamily: "'Georgia', serif" },
  container: { maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 3rem' },

  hero:      { textAlign: 'center', padding: '3rem 0 2rem' },
  greeting:  { fontSize: '12px', fontWeight: '500', letterSpacing: '1.5px', color: '#7F77DD', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'system-ui, sans-serif' },
  heroTitle: { fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: '400', color: '#1a1a2e', margin: '0 0 8px', lineHeight: '1.3' },
  heroSub:   { color: '#6b7280', marginBottom: '2rem', fontSize: '0.95rem', fontFamily: 'system-ui, sans-serif' },

  searchBar:   { display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '40px', padding: '6px 6px 6px 18px', maxWidth: '500px', margin: '0 auto 16px', boxShadow: '0 2px 12px rgba(79,70,229,0.08)' },
  searchIcon:  { fontSize: '14px', marginRight: '6px', opacity: 0.5 },
  searchInput: { flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '14px', color: '#1a1a2e', fontFamily: 'system-ui, sans-serif' },
  searchBtn:   { background: '#534AB7', color: 'white', border: 'none', borderRadius: '30px', padding: '8px 22px', fontSize: '14px', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', fontWeight: '500' },

  btnRow:     { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '4px' },
  btnIcon:    { fontSize: '13px' },
  suggestBtn: { background: 'none', border: '1px solid #c4c0ef', borderRadius: '30px', padding: '8px 20px', fontSize: '13px', color: '#534AB7', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' },
  scanBtn:    { background: 'none', border: '1px solid #c4c0ef', borderRadius: '30px', padding: '8px 20px', fontSize: '13px', color: '#534AB7', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: '6px' },

  statsBar: { display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #e8e6f5', borderRadius: '16px', padding: '0', marginBottom: '20px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(83,74,183,0.06)' },
  statItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px' },
  statVal:  { fontSize: '20px', fontWeight: '500', color: '#534AB7', fontFamily: 'system-ui, sans-serif' },
  statLbl:  { fontSize: '11px', color: '#9ca3af', fontFamily: 'system-ui, sans-serif', marginTop: '2px' },

  genreWrap:  { marginBottom: '24px' },
  genreLabel: { fontSize: '11px', fontWeight: '500', color: '#9ca3af', fontFamily: 'system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'block', marginBottom: '8px' },
  genreChips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip:       { background: '#EEEDFE', color: '#534AB7', border: 'none', borderRadius: '20px', fontSize: '12px', padding: '5px 14px', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', fontWeight: '500' },
  chipActive: { background: '#534AB7', color: '#ffffff' },
};

const sec = {
  wrap:     { marginBottom: '32px', background: '#ffffff', borderRadius: '16px', padding: '20px 20px 16px', border: '1px solid #e8e6f5', boxShadow: '0 2px 8px rgba(83,74,183,0.05)' },
  head:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  dot:      { width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  title:    { fontSize: '14px', fontWeight: '500', color: '#1a1a2e', fontFamily: 'system-ui, sans-serif' },
  seeAll:   { fontSize: '12px', color: '#7F77DD', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', padding: 0 },
};
