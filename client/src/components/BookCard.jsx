import { useNavigate } from 'react-router-dom';
import StarRating from './StarRating';

export default function BookCard({ book }) {
  const fallback = 'https://via.placeholder.com/120x180?text=No+Cover';
  const navigate = useNavigate();

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        width: '155px',
        flexShrink: 0,
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        cursor: 'pointer',
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

      {/* COVER IMAGE */}
      <img
        src={book.cover || fallback}
        alt={book.title}
        style={{
          width: '100%',
          height: '185px',
          objectFit: 'cover'
        }}
        onError={(e) => { e.target.src = fallback }}
      />

      {/* BOOK INFO */}
      <div style={{ padding: '10px' }}>
        <p style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#1a1a2e',
          marginBottom: '4px',
          lineHeight: '1.4'
        }}>
          {book.title?.length > 40
            ? book.title.substring(0, 40) + '...'
            : book.title}
        </p>
        <p style={{
          fontSize: '11px',
          color: '#4f46e5',
          marginBottom: '6px'
        }}>
          {book.author}
        </p>

        {/* STAR RATING */}
        <StarRating
          bookIsbn={book.isbn}
          bookTitle={book.title}
        />

        {book.similarity && (
          <p style={{
            fontSize: '10px',
            color: '#10b981',
            marginTop: '4px'
          }}>
            {Math.round(book.similarity * 100)}% match
          </p>
        )}
      </div>
    </div>
  );
}
