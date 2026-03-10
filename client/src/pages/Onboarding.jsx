import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { savePreferences } from '../services/api';

const GENRES = [
  'Fiction', 'Mystery', 'Fantasy', 'Romance',
  'Thriller', 'Science Fiction', 'Horror',
  'Biography', 'Self Help', 'History',
  'Adventure', 'Crime', 'Drama', 'Comedy',
  'Philosophy', 'Psychology', 'Poetry',
  'Classic Literature', 'Graphic Novel', 'True Crime'
];

const AUTHORS = [
  'J.K. Rowling', 'Dan Brown', 'Stephen King',
  'Agatha Christie', 'George Orwell', 'Jane Austen',
  'Ruskin Bond', 'Chetan Bhagat', 'R.K. Narayan',
  'Amish Tripathi', 'Sudha Murthy', 'Devdutt Pattanaik',
  'Paulo Coelho', 'Haruki Murakami', 'Fyodor Dostoevsky',
  'Leo Tolstoy', 'Ernest Hemingway', 'F. Scott Fitzgerald',
  'Mark Twain', 'Charles Dickens', 'Oscar Wilde',
  'Roald Dahl', 'J.R.R. Tolkien', 'C.S. Lewis',
  'Arundhati Roy', 'Vikram Seth', 'Salman Rushdie', 'Khaled Hosseini',
   'Isabel Allende', 'Margaret Atwood'
];

const FAVOURITE_BOOKS = [
  'Harry Potter Series', 'The Alchemist', '1984',
  'To Kill a Mockingbird', 'The God of Small Things',
  'The Immortals of Meluha', 'Five Point Someone',
  'The Da Vinci Code', 'Pride and Prejudice',
  'The Lord of the Rings', 'Animal Farm', 'Ikigai',
  'Atomic Habits', 'The Monk Who Sold His Ferrari',
  'Sapiens', 'The Diary of a Young Girl',
  'Gone Girl', 'The Silent Patient', 'Educated',
  'The Kite Runner', 'A Thousand Splendid Suns'
];

const READING_MOODS = [
  '😊 Feel Good', '😢 Emotional', '🤯 Mind Bending',
  '😂 Funny', '😰 Suspenseful', '🌟 Inspirational',
  '🧠 Educational', '🌍 World Building', '❤️ Romantic'
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleItem = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedGenres.length === 0) {
      setError('Please select at least one genre!');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await savePreferences({
        genres: selectedGenres,
        authors: selectedAuthors,
        favouriteBooks: selectedBooks,
        moods: selectedMoods
      });
      navigate('/home');
    } catch (err) {
      setError('Something went wrong. Try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        {/* PROGRESS BAR */}
        <div style={styles.progressBar}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{
              ...styles.progressDot,
              background: step >= s ? '#4f46e5' : '#ddd'
            }} />
          ))}
        </div>
        <p style={styles.stepText}>Step {step} of 4</p>

        {error && <p style={styles.error}>{error}</p>}

        {/* ─── STEP 1 — GENRES ─────────────────────────── */}
        {step === 1 && (
          <>
            <h2 style={styles.title}> Favourite Genres</h2>
            <p style={styles.subtitle}>Select all that you enjoy reading</p>
            <div style={styles.grid}>
              {GENRES.map(genre => (
                <button key={genre} style={{
                  ...styles.chip,
                  background: selectedGenres.includes(genre) ? '#4f46e5' : '#f0f4f8',
                  color: selectedGenres.includes(genre) ? 'white' : '#333',
                }}
                  onClick={() => toggleItem(genre, selectedGenres, setSelectedGenres)}
                >
                  {genre}
                </button>
              ))}
            </div>
            <p style={styles.count}>✅ {selectedGenres.length} selected</p>
          </>
        )}

        {/* ─── STEP 2 — AUTHORS ────────────────────────── */}
        {step === 2 && (
          <>
            <h2 style={styles.title}>✍️ Favourite Authors</h2>
            <p style={styles.subtitle}>Who do you love reading?</p>
            <div style={styles.grid}>
              {AUTHORS.map(author => (
                <button key={author} style={{
                  ...styles.chip,
                  background: selectedAuthors.includes(author) ? '#4f46e5' : '#f0f4f8',
                  color: selectedAuthors.includes(author) ? 'white' : '#333',
                }}
                  onClick={() => toggleItem(author, selectedAuthors, setSelectedAuthors)}
                >
                  {author}
                </button>
              ))}
            </div>
            <p style={styles.count}>✅ {selectedAuthors.length} selected</p>
          </>
        )}

        {/* ─── STEP 3 — FAVOURITE BOOKS ────────────────── */}
        {step === 3 && (
          <>
            <h2 style={styles.title}>❤️ Favourite Books</h2>
            <p style={styles.subtitle}>Books you've already loved</p>
            <div style={styles.grid}>
              {FAVOURITE_BOOKS.map(book => (
                <button key={book} style={{
                  ...styles.chip,
                  background: selectedBooks.includes(book) ? '#4f46e5' : '#f0f4f8',
                  color: selectedBooks.includes(book) ? 'white' : '#333',
                }}
                  onClick={() => toggleItem(book, selectedBooks, setSelectedBooks)}
                >
                  {book}
                </button>
              ))}
            </div>
            <p style={styles.count}>✅ {selectedBooks.length} selected</p>
          </>
        )}

        {/* ─── STEP 4 — READING MOOD ───────────────────── */}
        {step === 4 && (
          <>
            <h2 style={styles.title}>🌙 Reading Mood</h2>
            <p style={styles.subtitle}>What kind of reading experience do you prefer?</p>
            <div style={styles.grid}>
              {READING_MOODS.map(mood => (
                <button key={mood} style={{
                  ...styles.chip,
                  fontSize: '15px',
                  padding: '10px 18px',
                  background: selectedMoods.includes(mood) ? '#4f46e5' : '#f0f4f8',
                  color: selectedMoods.includes(mood) ? 'white' : '#333',
                }}
                  onClick={() => toggleItem(mood, selectedMoods, setSelectedMoods)}
                >
                  {mood}
                </button>
              ))}
            </div>
            <p style={styles.count}>✅ {selectedMoods.length} selected</p>
          </>
        )}

        {/* ─── NAVIGATION BUTTONS ──────────────────────── */}
        <div style={styles.navButtons}>
          {step > 1 && (
            <button style={styles.backButton} onClick={handleBack}>
              ← Back
            </button>
          )}
          {step < 4 ? (
            <button style={styles.button} onClick={handleNext}>
              Next →
            </button>
          ) : (
            <button style={styles.button} onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : '🚀 Get My Recommendations'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f0f4f8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem'
  },
  card: {
    background: 'white',
    padding: '2rem',
    borderRadius: '16px',
    maxWidth: '650px',
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  progressBar: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '0.5rem'
  },
  progressDot: {
    width: '40px',
    height: '6px',
    borderRadius: '3px',
    transition: 'background 0.3s'
  },
  stepText: {
    textAlign: 'center',
    color: '#888',
    fontSize: '13px',
    marginBottom: '1.5rem'
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '0.5rem'
  },
  subtitle: {
    textAlign: 'center',
    color: '#888',
    marginBottom: '1.5rem'
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px'
  },
  chip: {
    padding: '8px 16px',
    borderRadius: '20px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '2rem',
    gap: '10px'
  },
  button: {
    flex: 1,
    padding: '14px',
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  backButton: {
    flex: 1,
    padding: '14px',
    background: '#f0f4f8',
    color: '#333',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  error: {
    color: 'red',
    textAlign: 'center',
    fontSize: '14px',
    marginBottom: '1rem'
  },
  count: {
    textAlign: 'center',
    color: '#666',
    marginTop: '1rem',
    fontSize: '14px'
  }
};