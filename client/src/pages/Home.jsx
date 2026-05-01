import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BookRow from '../components/BookRow';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ─── CACHE HELPERS ───────────────────────────────────────────
const CACHE_KEYS = {
  forYou:      'nr_cache_forYou',
  collab:      'nr_cache_collab',
  search:      'nr_cache_search',
  searchQuery: 'nr_cache_searchQuery',
  stats:       'nr_cache_stats',
  showCollab:  'nr_cache_showCollab',
  activeGenre: 'nr_cache_activeGenre',
};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes — baad mein fresh fetch hoga

function saveCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function loadCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export default function Home() {
  // ── State — cache se initialize karo ─────────────────────
  const [forYouBooks,        setForYouBooks]        = useState(() => loadCache(CACHE_KEYS.forYou)      || []);
  const [collaborativeBooks, setCollaborativeBooks] = useState(() => loadCache(CACHE_KEYS.collab)      || []);
  const [searchResults,      setSearchResults]      = useState(() => loadCache(CACHE_KEYS.search)      || []);
  const [searchQuery,        setSearchQuery]        = useState(() => loadCache(CACHE_KEYS.searchQuery) || '');
  const [stats,              setStats]              = useState(() => loadCache(CACHE_KEYS.stats)       || { rated: 0 });
  const [showCollab,         setShowCollab]         = useState(() => loadCache(CACHE_KEYS.showCollab)  || false);
  const [activeGenre,        setActiveGenre]        = useState(() => loadCache(CACHE_KEYS.activeGenre) || null);

  const [loadingForYou,  setLoadingForYou]  = useState(false);
  const [loadingCollab,  setLoadingCollab]  = useState(false);
  const [loadingSearch,  setLoadingSearch]  = useState(false);

  const user     = JSON.parse(localStorage.getItem('user'));
  const navigate = useNavigate();

  // ─── GREETING ────────────────────────────────────────────
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // ─── FETCH STATS ─────────────────────────────────────────
  // Sirf fetch karo agar cache nahi hai
  useEffect(() => {
    const cached = loadCache(CACHE_KEYS.stats);
    if (cached) return; // cache hai → skip

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/auth/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const newStats = { rated: res.data.ratingCount || 0 };
        setStats(newStats);
        saveCache(CACHE_KEYS.stats, newStats);
      } catch {}
    };
    fetchStats();
  }, []);

  // ─── FOR YOU ─────────────────────────────────────────────
  // Sirf fetch karo agar cache nahi hai
  useEffect(() => {
    const cached = loadCache(CACHE_KEYS.forYou);
    if (cached && cached.length > 0) return; // cache hai → skip

    const fetchForYou = async () => {
      setLoadingForYou(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/recommendations/for-you`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const books = res.data.recommendations || [];
        setForYouBooks(books);
        saveCache(CACHE_KEYS.forYou, books);
      } catch (err) {
        console.log('Error fetching recommendations:', err.message);
      } finally {
        setLoadingForYou(false);
      }
    };
    fetchForYou();
  }, []);

  // ─── GOOGLE BOOKS PROXY ──────────────────────────────────
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

  // ─── SEARCH ──────────────────────────────────────────────
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    setLoadingSearch(true);
    setSearchResults([]);
    saveCache(CACHE_KEYS.searchQuery, query);

    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(' ').filter(w => w.length > 2);

    try {
      const res = await axios.post(`${API_URL}/recommendations/by-title`, { title: query });
      let results = res.data.recommendations || [];

      const hasExactMatch = results.length > 0 && results.some(b => {
        const titleLower = b.title?.toLowerCase() || '';
        const matchCount = queryWords.filter(w => titleLower.includes(w)).length;
        return matchCount >= Math.ceil(queryWords.length * 0.5);
      });

      if (!hasExactMatch) {
        results = await searchGoogleBooks(query);
      } else if (results.length < 5) {
        const gbBooks = await searchGoogleBooks(query);
        const existingTitles = new Set(results.map(b => b.title?.toLowerCase()));
        results = [
          ...results,
          ...gbBooks.filter(b => !existingTitles.has(b.title?.toLowerCase()))
        ];
      }

      setSearchResults(results);
      saveCache(CACHE_KEYS.search, results);       // ← cache save
      saveCache(CACHE_KEYS.searchQuery, query);

    } catch {
      const gbBooks = await searchGoogleBooks(query);
      if (gbBooks.length > 0) {
        setSearchResults(gbBooks);
        saveCache(CACHE_KEYS.search, gbBooks);     // ← cache save
      }
    } finally {
      setLoadingSearch(false);
    }
  };

  // ─── SUGGEST ME ──────────────────────────────────────────
  const handleSuggestMe = async () => {
    setShowCollab(true);
    saveCache(CACHE_KEYS.showCollab, true);

    // Cache hai toh dobara fetch mat karo
    const cached = loadCache(CACHE_KEYS.collab);
    if (cached && cached.length > 0) return;

    setLoadingCollab(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/recommendations/hybrid`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const books = res.data.recommendations || [];
      setCollaborativeBooks(books);
      saveCache(CACHE_KEYS.collab, books);         // ← cache save
    } catch (err) {
      console.log('Hybrid Error:', err.message);
    } finally {
      setLoadingCollab(false);
    }
  };

  // ─── GENRE CLICK ─────────────────────────────────────────
  const handleGenreClick = (genre) => {
    const newGenre = genre === activeGenre ? null : genre;
    setActiveGenre(newGenre);
    saveCache(CACHE_KEYS.activeGenre, newGenre);
    if (newGenre) {
      setSearchQuery(newGenre);
      handleSearch(newGenre);
    }
  };

  // ─── CLEAR CACHE (logout ya refresh chahiye toh) ─────────
  // Yeh function call karo jab user manually refresh chahta ho
  const handleRefresh = () => {
    Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k));
    setForYouBooks([]);
    setCollaborativeBooks([]);
    setSearchResults([]);
    setSearchQuery('');
    setStats({ rated: 0 });
    setShowCollab(false);
    setActiveGenre(null);
    window.location.reload();
  };

  // ─── SCAN ────────────────────────────────────────────────
  const handleScanShelf = () => navigate('/bookshelf-scanner');

  // ─── USER GENRES ─────────────────────────────────────────
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
            {/* Refresh button — cache clear karta hai */}
            <button style={s.refreshBtn} onClick={handleRefresh} title="Refresh recommendations">
              ↻
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
  refreshBtn: { background: 'none', border: '1px solid #c4c0ef', borderRadius: '50%', width: '36px', height: '36px', fontSize: '16px', color: '#9ca3af', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },

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
