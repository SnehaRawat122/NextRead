import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap";
document.head.appendChild(fontLink);

const styles = `
  :root {
    --indigo-50: #eef2ff; --indigo-100: #e0e7ff; --indigo-200: #c7d2fe;
    --indigo-600: #4f46e5; --indigo-700: #4338ca; --indigo-900: #1e1b4b;
    --slate-50: #f8fafc; --slate-100: #f1f5f9; --slate-200: #e2e8f0;
    --slate-400: #94a3b8; --slate-500: #64748b; --slate-700: #334155; --slate-900: #0f172a;
    --gold: #f59e0b;
    --shadow-book: 0 25px 60px -10px rgba(79,70,229,0.25), 0 10px 20px -5px rgba(0,0,0,0.15);
    --shadow-card: 0 4px 24px rgba(15,23,42,0.08);
    --shadow-btn: 0 4px 14px rgba(79,70,229,0.4);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .bd-page { min-height: 100vh; background: var(--slate-50); font-family: 'DM Sans', sans-serif; color: var(--slate-900); }
  .bd-hero { background: linear-gradient(135deg, var(--indigo-900) 0%, #312e81 50%, #1e3a5f 100%); padding: 48px 24px 80px; position: relative; overflow: hidden; }
  .bd-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 70% 50%, rgba(99,102,241,0.3) 0%, transparent 60%); }
  .bd-hero-inner { max-width: 960px; margin: 0 auto; display: flex; gap: 48px; align-items: flex-start; position: relative; z-index: 1; margin-top: 40px; }
  .bd-back { position: absolute; top: 20px; left: 24px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 6px; transition: all 0.2s; z-index: 10; }
  .bd-back:hover { background: rgba(255,255,255,0.2); transform: translateX(-2px); }
  .bd-cover-wrap { flex-shrink: 0; position: relative; }
  .bd-cover { width: 200px; height: 290px; border-radius: 6px 14px 14px 6px; object-fit: cover; box-shadow: var(--shadow-book); display: block; animation: coverReveal 0.6s cubic-bezier(0.22,1,0.36,1) both; }
  .bd-cover-spine { position: absolute; top: 0; left: -6px; width: 6px; height: 100%; background: linear-gradient(to right, #1e1b4b, #312e81); border-radius: 6px 0 0 6px; }
  @keyframes coverReveal { from { opacity: 0; transform: perspective(600px) rotateY(-20deg) translateX(-20px); } to { opacity: 1; transform: perspective(600px) rotateY(0) translateX(0); } }
  .bd-hero-info { flex: 1; padding-top: 12px; animation: fadeUp 0.5s 0.15s both; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .bd-genre-tag { display: inline-block; background: rgba(129,140,248,0.25); border: 1px solid rgba(129,140,248,0.4); color: var(--indigo-200); font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; padding: 4px 12px; border-radius: 100px; margin-bottom: 16px; }
  .bd-title { font-family: 'Playfair Display', serif; font-size: clamp(26px, 4vw, 38px); font-weight: 700; color: white; line-height: 1.2; margin-bottom: 8px; }
  .bd-author { font-size: 15px; color: var(--indigo-200); margin-bottom: 20px; font-weight: 300; }
  .bd-author span { font-weight: 600; color: white; }
  .bd-rating-row { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  .bd-stars { display: flex; gap: 3px; }
  .bd-star { font-size: 18px; }
  .bd-star.filled { color: var(--gold); filter: drop-shadow(0 0 4px rgba(245,158,11,0.5)); }
  .bd-star.empty { color: rgba(255,255,255,0.2); }
  .bd-rating-num { color: white; font-size: 20px; font-weight: 700; }
  .bd-hero-btns { display: flex; flex-wrap: wrap; gap: 12px; }
  .bd-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; text-decoration: none; }
  .bd-btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; box-shadow: var(--shadow-btn); }
  .bd-btn-primary:hover { transform: translateY(-2px); }
  .bd-btn-secondary { background: rgba(255,255,255,0.12); color: white; border: 1px solid rgba(255,255,255,0.25); }
  .bd-btn-secondary:hover { background: rgba(255,255,255,0.2); transform: translateY(-2px); }
  .bd-body { max-width: 960px; margin: -40px auto 0; padding: 0 24px 80px; position: relative; z-index: 2; animation: fadeUp 0.5s 0.3s both; }
  .bd-card { background: white; border-radius: 16px; padding: 28px; box-shadow: var(--shadow-card); margin-bottom: 20px; border: 1px solid var(--slate-100); }
  .bd-card-title { font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 700; color: var(--slate-900); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid var(--indigo-50); display: flex; align-items: center; gap: 8px; }
  .bd-card-title-icon { width: 28px; height: 28px; background: var(--indigo-100); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .bd-card-title-badge { margin-left: auto; font-size: 10px; font-weight: 600; background: var(--indigo-50); color: var(--indigo-600); padding: 3px 8px; border-radius: 100px; letter-spacing: 0.5px; font-family: 'DM Sans', sans-serif; }
  .bd-meta-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; }
  .bd-meta-item { display: flex; flex-direction: column; gap: 3px; }
  .bd-meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--slate-400); }
  .bd-meta-value { font-size: 14px; font-weight: 500; color: var(--slate-700); }
  .bd-desc { font-size: 15px; line-height: 1.8; color: var(--slate-500); }
  .bd-desc.clamped { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
  .bd-read-more { background: none; border: none; color: var(--indigo-600); font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 10px; padding: 0; display: block; }
  .bd-desc-loading { display: flex; align-items: center; gap: 8px; color: var(--slate-400); font-size: 14px; font-style: italic; }
  .bd-desc-loading-dot { width: 6px; height: 6px; background: var(--indigo-400); border-radius: 50%; animation: pulse 1.2s infinite; }
  .bd-desc-loading-dot:nth-child(2) { animation-delay: 0.2s; }
  .bd-desc-loading-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
  .bd-tags { display: flex; flex-wrap: wrap; gap: 8px; }
  .bd-tag { background: var(--indigo-50); color: var(--indigo-700); border: 1px solid var(--indigo-100); font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 100px; }
  .bd-buy-grid { display: flex; flex-wrap: wrap; gap: 12px; }
  .bd-buy-btn { display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.2s; border: 1.5px solid; }
  .bd-buy-amazon { background: #fff8f0; color: #c45500; border-color: #f0b96b; }
  .bd-buy-amazon:hover { background: #fff1e0; transform: translateY(-2px); }
  .bd-buy-google { background: #f0f4ff; color: var(--indigo-700); border-color: var(--indigo-200); }
  .bd-buy-google:hover { background: var(--indigo-50); transform: translateY(-2px); }
  .bd-buy-open { background: #f0fdf4; color: #16a34a; border-color: #86efac; }
  .bd-buy-open:hover { background: #dcfce7; transform: translateY(-2px); }
  .bd-buy-preview { background: var(--slate-50); color: var(--slate-700); border-color: var(--slate-200); }
  .bd-buy-preview:hover { background: var(--slate-100); transform: translateY(-2px); }
  .bd-rate-section { text-align: center; }
  .bd-rate-prompt { font-size: 14px; color: var(--slate-500); margin-bottom: 12px; }
  .bd-rate-stars { display: flex; justify-content: center; gap: 8px; margin-bottom: 16px; }
  .bd-rate-star { font-size: 32px; cursor: pointer; transition: transform 0.15s; filter: grayscale(1) opacity(0.3); }
  .bd-rate-star:hover, .bd-rate-star.active { filter: none; transform: scale(1.2); }
  .bd-rate-submit { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; border: none; padding: 10px 28px; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-btn); }
  .bd-rate-thanks { color: var(--indigo-600); font-weight: 600; font-size: 15px; }
  .bd-already-rated { color: var(--slate-500); font-size: 14px; font-style: italic; }
  .bd-gb-info { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--slate-100); }
  .bd-gb-chip { background: var(--slate-50); border: 1px solid var(--slate-200); color: var(--slate-600); font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 100px; }
  @media (max-width: 640px) {
    .bd-hero-inner { flex-direction: column; align-items: center; text-align: center; gap: 24px; }
    .bd-cover { width: 150px; height: 218px; }
    .bd-hero-btns { justify-content: center; }
    .bd-rating-row { justify-content: center; }
  }
`;

function StarDisplay({ rating }) {
  return (
    <div className="bd-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`bd-star ${rating >= i ? "filled" : "empty"}`}>★</span>
      ))}
    </div>
  );
}

// ─── Fetch rich info from Google Books API (free, no key needed) ─────────────
const fetchGoogleBooksInfo = async (isbn, title, author) => {
  try {
    // ISBN se try karo pehle
    let query = isbn ? `isbn:${isbn}` : `intitle:${title}+inauthor:${author}`;
    const res = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`
    );

    const item = res.data.items?.[0];
    if (!item) return null;

    const info = item.volumeInfo;
    return {
      description:   info.description       || null,
      pageCount:     info.pageCount          || null,
      publisher:     info.publisher          || null,
      publishedDate: info.publishedDate      || null,
      categories:    info.categories         || [],
      language:      info.language           || null,
      previewLink:   info.previewLink        || null,
      infoLink:      info.infoLink           || null,
      googleRating:  info.averageRating      || null,
      ratingsCount:  info.ratingsCount       || null,
      maturityRating: info.maturityRating    || null,
    };
  } catch (err) {
    console.log('Google Books fetch failed:', err.message);
    return null;
  }
};

export default function BookDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [book, setBook]                   = useState(null);
  const [gbInfo, setGbInfo]               = useState(null);   // Google Books extra info
  const [gbLoading, setGbLoading]         = useState(false);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(false);
  const [descExpanded, setDescExpanded]   = useState(false);
  const [userRating, setUserRating]       = useState(0);
  const [hoverRating, setHoverRating]     = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [alreadyRated, setAlreadyRated]   = useState(false);
  const [ratingError, setRatingError]     = useState('');

  useEffect(() => {
    const tag = document.createElement("style");
    tag.textContent = styles;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  // ── Fetch book from MongoDB ──
  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      setError(false);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/books/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBook(res.data);
      } catch (err) {
        console.error("Book fetch failed:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBook();
  }, [id]);

  // ── Fetch Google Books info once book is loaded ──
  useEffect(() => {
    if (!book) return;
    const fetchGB = async () => {
      setGbLoading(true);
      const info = await fetchGoogleBooksInfo(book.isbn, book.title, book.author);
      setGbInfo(info);
      setGbLoading(false);
    };
    fetchGB();
  }, [book]);

  // ── Submit Rating ──
  const handleRatingSubmit = async () => {
    if (!userRating) return;
    setRatingError('');
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/ratings/rate`,
        { bookId: book._id, rating: userRating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRatingSubmitted(true);
      setBook(prev => ({ ...prev, avgRating: userRating }));
    } catch (err) {
      if (err.response?.status === 400) {
        setAlreadyRated(true);
      } else {
        setRatingError('Something went wrong. Please try again.');
      }
    }
  };

  const getBuyLinks = (b, gb) => [
    { label: "Buy on Amazon",       icon: "📦", href: `https://www.amazon.in/s?k=${encodeURIComponent(b.title + " " + b.author)}`, className: "bd-buy-amazon"   },
    { label: "Google Books",        icon: "📖", href: gb?.infoLink || `https://books.google.com/books?q=${encodeURIComponent(b.title)}`, className: "bd-buy-google"  },
    { label: "Open Library (Free)", icon: "🌐", href: `https://openlibrary.org/search?q=${encodeURIComponent(b.title)}`, className: "bd-buy-open"    },
    { label: "Preview",             icon: "👁", href: gb?.previewLink || `https://books.google.com/books?q=${encodeURIComponent(b.title)}&lpg=PP1`, className: "bd-buy-preview" },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif", color: "#64748b" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <p>Loading book details...</p>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", fontFamily: "'DM Sans',sans-serif", color: "#64748b" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😕</div>
        <p>Book not found.</p>
        <button onClick={() => navigate(-1)} style={{ marginTop: 16, padding: "10px 24px", background: "#4f46e5", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>
          ← Go Back
        </button>
      </div>
    );
  }

  const displayRating = hoverRating || userRating;
  const fallback = `https://via.placeholder.com/200x290/4338ca/ffffff?text=${encodeURIComponent(book.title || "Book")}`;

  // Description priority: Google Books > MongoDB > nothing
  const description = gbInfo?.description || book.description || null;

  // Rating display: show both our rating + Google's if available
  const displayAvgRating = book.avgRating > 0 ? Number(book.avgRating).toFixed(1) : null;

  // Extra details from Google Books
  const pageCount     = gbInfo?.pageCount     || book.pages     || null;
  const publisher     = gbInfo?.publisher     || book.publisher || null;
  const publishedDate = gbInfo?.publishedDate || book.publishedYear || null;
  const categories    = gbInfo?.categories?.length > 0 ? gbInfo.categories : book.genre || [];

  return (
    <div className="bd-page">

      {/* HERO */}
      <div className="bd-hero">
        <button className="bd-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="bd-hero-inner">
          <div className="bd-cover-wrap">
            <div className="bd-cover-spine" />
            <img className="bd-cover" src={book.coverImage || fallback} alt={book.title}
              onError={(e) => { e.target.src = fallback; }} />
          </div>
          <div className="bd-hero-info">
            {categories.length > 0 && (
              <span className="bd-genre-tag">{typeof categories[0] === 'string' ? categories[0].split('/')[0].trim() : categories[0]}</span>
            )}
            <h1 className="bd-title">{book.title}</h1>
            <p className="bd-author">by <span>{book.author}</span></p>

            <div className="bd-rating-row">
              <StarDisplay rating={Math.round(book.avgRating || 0)} />
              <span className="bd-rating-num">
                {displayAvgRating || "No ratings yet"}
              </span>
              {gbInfo?.googleRating && (
                <span style={{ color: '#a5b4fc', fontSize: 12 }}>
                  · Google: ⭐ {gbInfo.googleRating} ({gbInfo.ratingsCount?.toLocaleString()})
                </span>
              )}
            </div>

            <div className="bd-hero-btns">
              {getBuyLinks(book, gbInfo).slice(0, 2).map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                  className={`bd-btn ${l.label === "Buy on Amazon" ? "bd-btn-primary" : "bd-btn-secondary"}`}>
                  {l.icon} {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="bd-body">

        {/* ABOUT — Google Books description */}
        <div className="bd-card">
          <div className="bd-card-title">
            <div className="bd-card-title-icon">📝</div>
            About This Book
            {gbInfo?.description && (
              <span className="bd-card-title-badge">via Google Books</span>
            )}
          </div>

          {gbLoading ? (
            <div className="bd-desc-loading">
              <div className="bd-desc-loading-dot" />
              <div className="bd-desc-loading-dot" />
              <div className="bd-desc-loading-dot" />
              <span>Fetching book overview...</span>
            </div>
          ) : description ? (
            <>
              <p className={`bd-desc ${descExpanded ? "" : "clamped"}`}
                dangerouslySetInnerHTML={{ __html: description }} />
              <button className="bd-read-more" onClick={() => setDescExpanded(!descExpanded)}>
                {descExpanded ? "Show less ↑" : "Read more ↓"}
              </button>
            </>
          ) : (
            <p className="bd-desc" style={{ fontStyle: 'italic' }}>
              No description available for this book.
            </p>
          )}

          {/* Extra chips from Google Books */}
          {gbInfo && (
            <div className="bd-gb-info">
              {pageCount     && <span className="bd-gb-chip">📄 {pageCount} pages</span>}
              {publisher     && <span className="bd-gb-chip">🏢 {publisher}</span>}
              {publishedDate && <span className="bd-gb-chip">📅 {publishedDate}</span>}
              {gbInfo.language && <span className="bd-gb-chip">🌐 {gbInfo.language.toUpperCase()}</span>}
              {gbInfo.maturityRating === 'NOT_MATURE' && <span className="bd-gb-chip">✅ All ages</span>}
            </div>
          )}
        </div>

        {/* Book Details */}
        <div className="bd-card">
          <div className="bd-card-title"><div className="bd-card-title-icon">📋</div>Book Details</div>
          <div className="bd-meta-grid">
            {book.isbn      && <div className="bd-meta-item"><span className="bd-meta-label">ISBN</span><span className="bd-meta-value">{book.isbn}</span></div>}
            {publishedDate  && <div className="bd-meta-item"><span className="bd-meta-label">Published</span><span className="bd-meta-value">{publishedDate}</span></div>}
            {book.author    && <div className="bd-meta-item"><span className="bd-meta-label">Author</span><span className="bd-meta-value">{book.author}</span></div>}
            {publisher      && <div className="bd-meta-item"><span className="bd-meta-label">Publisher</span><span className="bd-meta-value">{publisher}</span></div>}
            {pageCount      && <div className="bd-meta-item"><span className="bd-meta-label">Pages</span><span className="bd-meta-value">{pageCount}</span></div>}
            {categories.length > 0 && <div className="bd-meta-item"><span className="bd-meta-label">Genre</span><span className="bd-meta-value">{typeof categories[0] === 'string' ? categories[0] : book.genre?.join(', ')}</span></div>}
          </div>
        </div>

        {/* Genre Tags */}
        {categories.length > 0 && (
          <div className="bd-card">
            <div className="bd-card-title"><div className="bd-card-title-icon">🏷</div>Genres & Categories</div>
            <div className="bd-tags">
              {categories.slice(0, 8).map((g, i) => (
                <span key={i} className="bd-tag">
                  {typeof g === 'string' ? g : g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buy / Read Links */}
        <div className="bd-card">
          <div className="bd-card-title"><div className="bd-card-title-icon">🛒</div>Buy or Read Online</div>
          <div className="bd-buy-grid">
            {getBuyLinks(book, gbInfo).map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                className={`bd-buy-btn ${l.className}`}>
                {l.icon} {l.label}
              </a>
            ))}
          </div>
        </div>

        {/* Rate This Book */}
        <div className="bd-card">
          <div className="bd-card-title"><div className="bd-card-title-icon">⭐</div>Rate This Book</div>
          <div className="bd-rate-section">
            {ratingSubmitted ? (
              <p className="bd-rate-thanks">✅ Thanks for rating! Your feedback improves your recommendations.</p>
            ) : alreadyRated ? (
              <p className="bd-already-rated">You have already rated this book.</p>
            ) : (
              <>
                <p className="bd-rate-prompt">How would you rate this book?</p>
                <div className="bd-rate-stars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i}
                      className={`bd-rate-star ${displayRating >= i ? "active" : ""}`}
                      onMouseEnter={() => setHoverRating(i)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setUserRating(i)}>
                      ★
                    </span>
                  ))}
                </div>
                {ratingError && <p style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>{ratingError}</p>}
                {userRating > 0 && (
                  <button className="bd-rate-submit" onClick={handleRatingSubmit}>Submit Rating</button>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
