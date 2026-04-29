import { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function BookshelfScanner() {
  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [detected, setDetected] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const navigate = useNavigate();

  const handleFile = (file) => {
    if (!file?.type.startsWith('image/')) return;
    setPreview(URL.createObjectURL(file));
    setImageFile(file);
    setDetected([]);
    setRecommendations([]);
    setSelected(new Set());
    setError('');
  };

  const scanBookshelf = async () => {
    if (!imageFile) return;
    setLoading('Scanning bookshelf...');
    setError('');

    const formData = new FormData();
    formData.append('bookshelf', imageFile);

    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post('/api/image-search/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setDetected(data.detected || []);
      if (data.detected?.length === 0) setError('No books detected. Try a clearer photo.');
    } catch (err) {
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
    setLoading('Finding recommendations...');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        '/api/image-search/recommend',
        { detectedBooks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError('Recommendations failed. Try again.');
    } finally {
      setLoading('');
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '2rem auto', padding: '0 1rem' }}>
      <h2 style={{ fontWeight: 600, marginBottom: 4 }}>📚 Bookshelf Scanner</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: 14 }}>
        Upload a photo of your bookshelf — AI will detect books and suggest similar reads
      </p>

      {/* Drop Zone */}
      {!preview ? (
        <div
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${dragOver ? '#6c63ff' : '#ccc'}`,
            borderRadius: 12, padding: '3rem 1rem', textAlign: 'center',
            cursor: 'pointer', background: dragOver ? '#f0eeff' : '#fafafa',
            transition: 'all 0.2s'
          }}
        >
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={e => handleFile(e.target.files[0])} />
          <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
          <p style={{ color: '#555', fontSize: 14 }}>
            Drag & drop a bookshelf photo, or <span style={{ color: '#6c63ff', fontWeight: 500 }}>browse</span>
          </p>
          <p style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>JPG, PNG, WEBP supported</p>
        </div>
      ) : (
        <div>
          <img src={preview} alt="bookshelf"
            style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 10, border: '1px solid #eee' }} />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={scanBookshelf} disabled={!!loading} style={btnStyle('#6c63ff')}>
              {loading || '🔍 Scan for books'}
            </button>
            <button onClick={() => { setPreview(null); setImageFile(null); }} style={btnStyle('#999')}>
              Use different photo
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#e74c3c', marginTop: 12, fontSize: 13 }}>⚠️ {error}</p>}

      {/* Detected Books */}
      {detected.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Books Detected ({detected.length})</h3>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
            Select books you own to get recommendations
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {detected.map((book, i) => (
              <div key={i} onClick={() => toggleSelect(i)} style={{
                padding: 12, borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                border: `2px solid ${selected.has(i) ? '#6c63ff' : '#eee'}`,
                background: selected.has(i) ? '#f0eeff' : '#fff'
              }}>
                {book.coverImage && (
                  <img src={book.coverImage} alt={book.title}
                    style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                )}
                <p style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{book.title}</p>
                <p style={{ color: '#888', fontSize: 12 }}>{book.author || 'Unknown'}</p>
                {book.inDatabase && (
                  <span style={{ fontSize: 10, background: '#e8f5e9', color: '#2e7d32', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>
                    In NextRead
                  </span>
                )}
                <div style={{ marginTop: 8, height: 3, background: '#eee', borderRadius: 2 }}>
                  <div style={{ width: `${(book.confidence || 0.8) * 100}%`, height: '100%', background: '#6c63ff', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={getRecommendations}
            disabled={selected.size === 0 || !!loading}
            style={{ ...btnStyle('#6c63ff'), marginTop: 16, opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            {loading || `✨ Get recommendations for ${selected.size} book${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 12 }}>✨ Recommended Next Reads</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {recommendations.map((rec, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 10, border: '1px solid #eee', background: '#fff' }}>
                {rec.coverImage && (
                  <img src={rec.coverImage} alt={rec.title}
                    style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
                )}
                <p style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{rec.title}</p>
                <p style={{ color: '#888', fontSize: 12 }}>{rec.author}</p>
                <p style={{ color: '#aaa', fontSize: 11, marginTop: 4 }}>{rec.genre}</p>
                <p style={{ color: '#6c63ff', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>{rec.reason}</p>
                <span style={{ fontSize: 10, background: '#f0eeff', color: '#6c63ff', padding: '2px 6px', borderRadius: 4, marginTop: 6, display: 'inline-block' }}>
                  {Math.round((rec.matchScore || 0.85) * 100)}% match
                </span>
                {rec.mongoId && (
                  <button onClick={() => navigate(`/book/${rec.mongoId}`)} style={{ ...btnStyle('#6c63ff'), marginTop: 8, padding: '4px 10px', fontSize: 11 }}>
                    View Book
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle = (bg) => ({
  background: bg, color: 'white', border: 'none',
  borderRadius: 8, padding: '10px 20px', fontSize: 14,
  fontWeight: 500, cursor: 'pointer'
});