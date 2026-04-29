import { useState, useRef } from 'react';
import axios from 'axios';

export default function BookshelfScanner() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file?.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setPreview(URL.createObjectURL(file));
    setImage(file);
    setRecommendations([]);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const scanAndRecommend = async () => {
    if (!image) return;

    setLoading(true);
    setError('');
    setRecommendations([]);

    const formData = new FormData();
    formData.append('image', image); // ✅ field name matches backend multer

    try {
      const { data } = await axios.post('/api/image-search/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 35000, // ML service can be slow
      });

      if (!data.recommendations?.length) {
        setError('No similar books found. Try a clearer book cover photo.');
      } else {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. ML service may be loading — try again in a moment.');
      } else {
        setError(err.response?.data?.error || 'Scan failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setImage(null);
    setRecommendations([]);
    setError('');
  };

  return (
    <div className="bookshelf-scanner">

      {/* ── Upload / Drop Zone ── */}
      {!preview ? (
        <div
          className="drop-zone"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div className="drop-icon">📚</div>
          <p>Upload a <strong>book cover photo</strong> to find similar books</p>
          <p className="hint">Drop here or <span className="link">browse</span></p>
        </div>
      ) : (
        <div className="preview-area">
          <img src={preview} alt="Uploaded book cover" className="preview-img" />

          <div className="preview-actions">
            <button
              className="btn-primary"
              onClick={scanAndRecommend}
              disabled={loading}
            >
              {loading ? (
                <span className="loading-text">
                  <span className="spinner" /> Finding similar books...
                </span>
              ) : (
                '🔍 Find Similar Books'
              )}
            </button>

            <button className="btn-secondary" onClick={reset} disabled={loading}>
              Use different photo
            </button>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="error-box">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* ── Results ── */}
      {recommendations.length > 0 && (
        <section className="results-section">
          <h3>📖 Similar Books ({recommendations.length})</h3>
          <div className="books-grid">
            {recommendations.map((book, i) => (
              <div key={i} className="book-card">
                {book.cover ? (
                  <img src={book.cover} alt={book.title} className="book-cover" />
                ) : (
                  <div className="cover-placeholder">📗</div>
                )}
                <div className="book-info">
                  <h4 className="book-title">{book.title}</h4>
                  <p className="book-author">{book.author}</p>
                  <div className="similarity-bar">
                    <div
                      className="similarity-fill"
                      style={{ width: `${Math.round((book.similarity || 0) * 100)}%` }}
                    />
                  </div>
                  <span className="similarity-label">
                    {Math.round((book.similarity || 0) * 100)}% visual match
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
