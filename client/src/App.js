import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import BookDetail from './pages/BookDetail';

// Wrapper so BookDetail gets router hooks
function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <BookDetail
      bookId={id}
      onBack={() => navigate(-1)}
      onBookClick={(newId) => navigate(`/book/${newId}`)}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/register" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/home" element={<Home />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;