import { useState } from 'react';

export default function StarRating({ bookIsbn, bookTitle, onRated }) {
  const [hover, setHover] = useState(0);
  const [selected, setSelected] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleRate = async (rating) => {
    setSelected(rating);
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/ratings/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bookId: bookIsbn,
          rating,
          review
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        if (onRated) onRated(rating);
      } else {
        setError(data.message || 'Error saving rating');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={styles.done}>
        ✅ Rated {selected}⭐
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            style={{
              ...styles.star,
              color: star <= (hover || selected) ? '#f59e0b' : '#d1d5db'
            }}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => handleRate(star)}
          >
            ★
          </span>
        ))}
      </div>
      {error && <p style={styles.error}>{error}</p>}
      {loading && <p style={styles.loading}>Saving...</p>}
    </div>
  );
}

const styles = {
  container: {
    padding: '4px 0'
  },
  stars: {
    display: 'flex',
    gap: '2px'
  },
  star: {
    fontSize: '20px',
    cursor: 'pointer',
    transition: 'color 0.15s'
  },
  done: {
    fontSize: '12px',
    color: '#10b981',
    padding: '4px 0'
  },
  error: {
    fontSize: '11px',
    color: '#ef4444',
    marginTop: '4px'
  },
  loading: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '4px'
  }
};