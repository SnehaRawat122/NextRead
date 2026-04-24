import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import BookRow from '../components/BookRow';
import axios from 'axios';
import { getCollaborativeRecommendations } from '../services/api';

const ML_URL = 'http://localhost:8000';
const API_URL = 'http://localhost:5000/api';

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
          genres: prefs.genres || [],
          authors: prefs.authors || [],
          favouriteBooks: prefs.favouriteBooks || []
        });
        setForYouBooks(mlRes.data.recommendations || []);
      } catch (err) {
        console.log('ForYou Error:', err);
      } finally {
        setLoadingForYou(false);
      }
    };
    fetchForYou();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoadingSearch(true);
    setSearchResults([]);
    try {
      const mlRes = await axios.post(`${ML_URL}/recommend/title`, {
        title: searchQuery
      });
      setSearchResults(mlRes.data.recommendations || []);
    } catch (err) {
      console.log('Search Error:', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSuggestMe = async () => {
    setShowCollab(true);
    setLoadingCollab(true);
    try {
      const response = await getCollaborativeRecommendations();
      setCollaborativeBooks(response.data.recommendations || []);
    } catch (err) {
      console.log('Collab Error:', err);
    } finally {
      setLoadingCollab(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
      <Navbar />

      {/* ─── HERO ────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '2.2rem',
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: '0.5rem'
        }}>
          Welcome back, {user?.name}! 
        </h1>
        <p style={{
          color: '#c4b5fd',
          marginBottom: '2rem',
          fontSize: '1.1rem'
        }}>
          Discover your next favourite book
        </p>

        {/* SEARCH BAR */}
        <form onSubmit={handleSearch} style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '1rem'
        }}>
          <input
            style={{
              width: '420px',
              padding: '14px 22px',
              background: '#ffffff',
              border: 'none',
              borderRadius: '30px',
              color: '#333',
              fontSize: '15px',
              outline: 'none',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
            }}
            placeholder="🔍 Search by book title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={loadingSearch}
            style={{
              padding: '14px 28px',
              background: '#ffffff',
              color: '#4f46e5',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
            }}>
            {loadingSearch ? '...' : 'Search'}
          </button>
        </form>

        {/* SUGGEST ME BUTTON */}
        <button
          onClick={handleSuggestMe}
          style={{
            marginTop: '0.5rem',
            padding: '12px 32px',
            background: 'rgba(255,255,255,0.15)',
            color: 'white',
            border: '2px solid rgba(255,255,255,0.5)',
            borderRadius: '30px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: 'bold',
            backdropFilter: 'blur(10px)'
          }}>
          ✨ Suggest Me Books
        </button>
      </div>

      {/* ─── CONTENT ─────────────────────────────────────── */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem'
      }}>

        {/* SEARCH RESULTS */}
        {(searchResults.length > 0 || loadingSearch) && (
          <BookRow
            title={`🔍 Results for "${searchQuery}"`}
            books={searchResults}
            loading={loadingSearch}
          />
        )}

        {/* COLLABORATIVE */}
        {showCollab && (
          <BookRow
            title="👥 Users Like You Also Liked..."
            books={collaborativeBooks}
            loading={loadingCollab}
          />
        )}

        {/* FOR YOU */}
        <BookRow
          title=" Recommended For You"
          books={forYouBooks}
          loading={loadingForYou}
        />

      </div>
    </div>
  );
}
