import BookCard from './BookCard';

export default function BookRow({ title, books, loading }) {
  return (
    <div style={styles.section}>
      <h2 style={styles.title}>{title}</h2>
      {loading ? (
        <div style={styles.loading}>Loading recommendations... ✨</div>
      ) : books.length === 0 ? (
        <div style={styles.empty}>No books found</div>
      ) : (
        <div style={styles.row}>
          {books.map((book, idx) => (
            <BookCard key={idx} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  section: {
    marginBottom: '2.5rem'
  },
  title: {
    fontSize: '1.2rem',
    color: '#4f46e5',
    marginBottom: '1rem',
    paddingLeft: '0.75rem',
    borderLeft: '3px solid #4f46e5'
  },
  row: {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto',
    paddingBottom: '1rem',
    paddingLeft: '0.5rem'
  },
  loading: {
    color: '#6b7280',
    fontSize: '14px',
    padding: '1rem'
  },
  empty: {
    color: '#6b7280',
    fontSize: '14px',
    padding: '1rem'
  }

};