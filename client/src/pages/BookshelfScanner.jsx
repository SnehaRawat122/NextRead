import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const COLORS = [
  ['#1e1b4b', '#6366f1'], ['#1a3a2a', '#22c55e'], ['#3a1a1a', '#ef4444'],
  ['#1a2a3a', '#3b82f6'], ['#2a1a3a', '#a855f7'], ['#3a2a1a', '#f59e0b'],
];
function getColor(title) {
  const idx = (title?.charCodeAt(0) || 0) % COLORS.length;
  return COLORS[idx];
}
function getInitials(title) {
  if (!title) return '??';
  const words = title.trim().split(' ').filter(Boolean);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function BookshelfScanner() {
  const [preview, setPreview]                 = useState(null);
  const [imageFile, setImageFile]             = useState(null);
  const [detected, setDetected]               = useState([]);
  const [selected, setSelected]               = useState(new Set());
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading]                 = useState('');
  const [error, setError]                     = useState('');
  const [dragOver, setDragOver]               = useState(false);
  const [coversLoaded, setCoversLoaded]       = useState(false);
  const fileRef  = useRef();
  const navigate = useNavigate();

  // ── Cover fetch ──
  useEffect(() => {
    if (!detected.length || coversLoaded) return;

    const fetchCovers = async () => {
      const enriched = await Promise.all(
        detected.map(async (book) => {
          if (book.coverImage) return book;
          try {
            if (book.isbn) {
              const r = await fetch(
                `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg?default=false`
              );
              if (r.ok) return {
                ...book,
                coverImage: `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg`
              };
            }
            const q = encodeURIComponent(`${book.title} ${book.author || ''}`);
            const r = await fetch(
              `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`
            );
            const data = await r.json();
            for (const item of data.items || []) {
              const img = item.volumeInfo?.imageLinks;
              const url = img?.thumbnail || img?.smallThumbnail || '';
              if (url) return { ...book, coverImage: url.replace('http://', 'https://') };
            }
          } catch { }
          return book;
        })
      );
      setDetected(enriched);
      setCoversLoaded(true);
    };

    fetchCovers();
  }, [detected.length, coversLoaded]);

  const handleFile = (file) => {
    if (!file?.type.startsWith('image/')) return;
    setPreview(URL.createObjectURL(file));
    setImageFile(file);
    setDetected([]);
    setRecommendations([]);
    setSelected(new Set());
    setCoversLoaded(false);
    setError('');
  };

  const scanBookshelf = async () => {
    if (!imageFile) return;
    setLoading('Scanning your bookshelf...');
    setError('');
    setCoversLoaded(false);
    const formData = new FormData();
    formData.append('bookshelf', imageFile);
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post('/api/image-search/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      setDetected(data.detected || []);
      if (!data.detected?.length) setError('No books detected. Try a clearer photo.');
    } catch {
      setError('Scan failed. Make sure ML service is running.');
    } finally {
      setLoading('');
    }
  };

  const toggleSelect = (idx) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const getRecommendations = async () => {
    const detectedBooks = [...selected].map(i => detected[i]);
    setLoading('Finding your next reads...');
    setError('');
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        '/api/image-search/recommend',
        { detectedBooks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecommendations(data.recommendations || []);
    } catch {
      setError('Recommendations failed. Try again.');
    } finally {
      setLoading('');
    }
  };

  return (
    <div style={s.page}>
      {/* ── HEADER ── */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/home')}>← Back</button>
        <div style={s.headerInner}>
          
          <div>
            <h1 style={s.headerTitle}>Bookshelf Scanner</h1>
            <p style={s.headerSub}>Upload a photo — AI detects books & suggests your next read</p>
          </div>
        </div>
      </div>

      <div style={s.body}>

        {/* ── UPLOAD ZONE ── */}
        {!preview ? (
          <div
            style={{ ...s.dropZone, ...(dragOver ? s.dropZoneActive : {}) }}
            onClick={() => fileRef.current.click()}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
          >
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={e => handleFile(e.target.files[0])} />
            <div style={s.dropIcon}>📚</div>
            <p style={s.dropTitle}>Drop your bookshelf photo here</p>
            <p style={s.dropSub}>or <span style={{ color: '#6366f1', fontWeight: 600 }}>browse files</span></p>
            <p style={s.dropHint}>JPG · PNG · WEBP supported</p>
          </div>
        ) : (
          <div style={s.previewCard}>
            <img src={preview} alt="bookshelf" style={s.previewImg} />
            <div style={s.previewBtns}>
              <button style={s.primaryBtn} onClick={scanBookshelf} disabled={!!loading}>
                {loading
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={s.spinner} />{loading}</span>
                  : '🔍 Scan for books'}
              </button>
              <button style={s.secondaryBtn}
                onClick={() => { setPreview(null); setImageFile(null); setDetected([]); setRecommendations([]); }}>
                Use different photo
              </button>
            </div>
          </div>
        )}

        {error && <div style={s.errorBox}>⚠️ {error}</div>}

        {/* ── DETECTED BOOKS ── */}
        {detected.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionHeader}>
              <div>
                <h2 style={s.sectionTitle}>📖 Books Detected ({detected.length})</h2>
                <p style={s.sectionSub}>Select books you own to get personalised recommendations</p>
              </div>
              {selected.size > 0 && <span style={s.selectedBadge}>{selected.size} selected</span>}
            </div>

            <div style={s.booksGrid}>
              {detected.map((book, i) => {
                const isSelected = selected.has(i);
                const [bg, accent] = getColor(book.title);
                return (
                  <div key={i}
                    style={{ ...s.bookCard, ...(isSelected ? s.bookCardSelected : {}) }}
                    onClick={() => toggleSelect(i)}
                  >
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} style={s.bookCover}
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ ...s.bookPlaceholder, background: bg }}>
                        <span style={{ ...s.bookInitials, color: accent }}>{getInitials(book.title)}</span>
                      </div>
                    )}
                    <div style={s.bookInfo}>
                      <p style={s.bookTitle}>
                        {book.title?.length > 35 ? book.title.substring(0, 35) + '...' : book.title}
                      </p>
                      <p style={s.bookAuthor}>{book.author || 'Unknown Author'}</p>
                      <div style={s.confBar}>
                        <div style={{ ...s.confFill, width: `${(book.confidence || 0.8) * 100}%`, background: isSelected ? '#6366f1' : '#cbd5e1' }} />
                      </div>
                      <p style={s.confText}>{Math.round((book.confidence || 0.8) * 100)}% confidence</p>

                      {/* View button */}
                      <button
                        style={s.viewBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/book/${book.isbn}`);
                        }}
                      >
                        View →
                      </button>
                    </div>

                    {/* Select indicator */}
                    <div style={{ ...s.selectDot, background: isSelected ? '#6366f1' : '#e2e8f0' }}>
                      {isSelected && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              style={{ ...s.primaryBtn, opacity: selected.size === 0 ? 0.5 : 1, marginTop: 20 }}
              onClick={getRecommendations}
              disabled={selected.size === 0 || !!loading}
            >
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={s.spinner} />{loading}</span>
                : `✨ Get recommendations for ${selected.size} book${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}

        {/* ── RECOMMENDATIONS ── */}
        {recommendations.length > 0 && (
          <div style={s.section}>
            <h2 style={s.sectionTitle}>✨ Your Next Reads</h2>
            <p style={s.sectionSub}>Handpicked based on your bookshelf</p>
            <div style={s.recsGrid}>
              {recommendations.map((rec, i) => {
                const [bg, accent] = getColor(rec.title);
                return (
                  <div key={i}
                    style={{ ...s.recCard, cursor: 'pointer' }}
                    onClick={() => navigate(`/book/${rec.isbn || rec.mongoId}`)}
                  >
                    {rec.coverImage || rec.cover ? (
                      <img src={rec.coverImage || rec.cover} alt={rec.title} style={s.recCover}
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ ...s.recPlaceholder, background: bg }}>
                        <span style={{ fontSize: 28, fontWeight: 800, color: accent }}>
                          {getInitials(rec.title)}
                        </span>
                      </div>
                    )}
                    <div style={s.recInfo}>
                      <p style={s.recTitle}>{rec.title?.length > 40 ? rec.title.substring(0, 40) + '...' : rec.title}</p>
                      <p style={s.recAuthor}>{rec.author}</p>
                      {rec.reason && <p style={s.recReason}>"{rec.reason}"</p>}
                      <div style={s.recBottom}>
                        <span style={s.matchBadge}>{Math.round((rec.matchScore || 0.85) * 100)}% match</span>
                        <span style={s.viewBtnSmall}>View →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif" },
  header: { background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e3a5f 100%)', padding: '24px 32px 32px' },
  backBtn: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, marginBottom: 16, display: 'inline-block' },
  headerInner: { display: 'flex', alignItems: 'center', gap: 16 },
  headerIcon: { width: 52, height: 52, background: 'rgba(255,255,255,0.15)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 },
  headerTitle: { fontSize: 26, fontWeight: 700, color: 'white', margin: 0 },
  headerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: '4px 0 0' },
  body: { maxWidth: 800, margin: '-20px auto 0', padding: '0 24px 60px', position: 'relative', zIndex: 2 },
  dropZone: { background: 'white', border: '2px dashed #c7d2fe', borderRadius: 16, padding: '52px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' },
  dropZoneActive: { borderColor: '#6366f1', background: '#eef2ff' },
  dropIcon: { fontSize: 48, marginBottom: 12 },
  dropTitle: { fontSize: 18, fontWeight: 600, color: '#1e1b4b', margin: '0 0 6px' },
  dropSub: { fontSize: 14, color: '#64748b', margin: '0 0 8px' },
  dropHint: { fontSize: 12, color: '#94a3b8', margin: 0 },
  previewCard: { background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' },
  previewImg: { width: '100%', maxHeight: 340, objectFit: 'contain', display: 'block' },
  previewBtns: { display: 'flex', gap: 12, padding: 16 },
  primaryBtn: { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', gap: 8 },
  secondaryBtn: { background: 'white', color: '#64748b', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  spinner: { width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' },
  errorBox: { background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '12px 16px', fontSize: 13, marginTop: 16 },
  section: { marginTop: 28 },
  sectionHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#1e1b4b', margin: '0 0 4px' },
  sectionSub: { fontSize: 13, color: '#64748b', margin: 0 },
  selectedBadge: { background: '#eef2ff', color: '#6366f1', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, border: '1px solid #c7d2fe' },
  booksGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  bookCard: { background: 'white', borderRadius: 12, padding: 12, cursor: 'pointer', border: '2px solid #e2e8f0', transition: 'all 0.15s', position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  bookCardSelected: { border: '2px solid #6366f1', background: '#fafbff', boxShadow: '0 4px 16px rgba(99,102,241,0.15)' },
  bookCover: { width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 10 },
  bookPlaceholder: { width: '100%', height: 120, borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  bookInitials: { fontSize: 28, fontWeight: 800 },
  bookInfo: {},
  bookTitle: { fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 3px', lineHeight: 1.4 },
  bookAuthor: { fontSize: 12, color: '#6366f1', margin: '0 0 8px' },
  confBar: { height: 3, background: '#f1f5f9', borderRadius: 2, marginBottom: 4 },
  confFill: { height: '100%', borderRadius: 2, transition: 'width 0.3s' },
  confText: { fontSize: 10, color: '#94a3b8', margin: '0 0 8px' },
  selectDot: { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' },
  recsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 },
  recCard: { background: 'white', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', transition: 'transform 0.15s, box-shadow 0.15s' },
  recCover: { width: '100%', height: 140, objectFit: 'cover' },
  recPlaceholder: { width: '100%', height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  recInfo: { padding: '12px 14px' },
  recTitle: { fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 3px', lineHeight: 1.4 },
  recAuthor: { fontSize: 12, color: '#6366f1', margin: '0 0 6px' },
  recReason: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.5 },
  recBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  matchBadge: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 100 },
  viewBtn: { background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  viewBtnSmall: { color: '#6366f1', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
};