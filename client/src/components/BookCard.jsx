import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Nice color palette for placeholders
const COLORS = [
  ['#1e1b4b', '#6366f1'], ['#1a3a2a', '#22c55e'], ['#3a1a1a', '#ef4444'],
  ['#1a2a3a', '#3b82f6'], ['#2a1a3a', '#a855f7'], ['#3a2a1a', '#f59e0b'],
  ['#1a3a3a', '#06b6d4'], ['#2a3a1a', '#84cc16'],
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

function CoverPlaceholder({ title, author }) {
  const [bg, accent] = getColor(title);
  const initials = getInitials(title);
  return (
    <div style={{
      width: '100%', height: '185px', background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', width: '120px', height: '120px',
        borderRadius: '50%', border: `2px solid ${accent}22`,
        top: '-20px', right: '-20px'
      }} />
      <div style={{
        position: 'absolute', width: '80px', height: '80px',
        borderRadius: '50%', border: `2px solid ${accent}33`,
        bottom: '-10px', left: '-10px'
      }} />
      {/* Initials */}
      <div style={{
        fontSize: '36px', fontWeight: '800', color: accent,
        letterSpacing: '-1px', zIndex: 1,
        textShadow: `0 0 30px ${accent}66`
      }}>
        {initials}
      </div>
      {/* Short title */}
      <div style={{
        fontSize: '9px', color: `${accent}aa`, marginTop: '8px',
        textAlign: 'center', padding: '0 12px', zIndex: 1,
        fontWeight: '600', letterSpacing: '0.5px',
        lineHeight: '1.3', textTransform: 'uppercase'
      }}>
        {title?.substring(0, 25)}
      </div>
    </div>
  );
}

export default function BookCard({ book }) {
  const navigate = useNavigate();
  const [cover, setCover] = useState(book.cover || book.coverImage || '');
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    if (cover) return;
    const fetchCover = async () => {
      try {
        // Try 1: Open Library (most reliable for ISBN)
        if (book.isbn) {
          const testUrl = `https://covers.openlibrary.org/b/isbn/${book.isbn}-M.jpg?default=false`;
          const res = await fetch(testUrl);
          if (res.ok) { setCover(testUrl); return; }
        }
        // Try 2: Google Books title search
        if (book.title) {
          const q = encodeURIComponent(`${book.title} ${book.author || ''}`);
          const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`);
          const data = await res.json();
          for (const item of data.items || []) {
            const img = item.volumeInfo?.imageLinks;
            const url = img?.thumbnail || img?.smallThumbnail || '';
            if (url) { setCover(url.replace('http://', 'https://')); return; }
          }
        }
      } catch { /* placeholder dikhega */ }
      // Sab fail — placeholder use karo
      setCoverFailed(true);
    };
    fetchCover();
  }, [book.isbn, book.title, book.author, cover]);

  return (
    <div
      style={{
        background: '#ffffff', borderRadius: '12px', overflow: 'hidden',
        width: '155px', flexShrink: 0, border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)', cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onClick={() => navigate(`/book/${book._id || book.isbn}`)}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.13)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
      }}
    >
      {/* COVER — real image ya styled placeholder */}
      {cover && !coverFailed ? (
        <img
          src={cover}
          alt={book.title}
          style={{ width: '100%', height: '185px', objectFit: 'cover' }}
          onError={() => setCoverFailed(true)}
        />
      ) : (
        <CoverPlaceholder title={book.title} author={book.author} />
      )}

      {/* BOOK INFO */}
      <div style={{ padding: '10px' }}>
        <p style={{
          fontSize: '12px', fontWeight: 'bold', color: '#1a1a2e',
          marginBottom: '4px', lineHeight: '1.4'
        }}>
          {book.title?.length > 40 ? book.title.substring(0, 40) + '...' : book.title}
        </p>
        <p style={{ fontSize: '11px', color: '#4f46e5' }}>
          {book.author}
        </p>
        {book.similarity && (
          <p style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>
            {Math.round(book.similarity * 100)}% match
          </p>
        )}
      </div>
    </div>
  );
}