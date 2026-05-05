import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Home from './pages/Home.jsx';
import BookDetail from './pages/BookDetail.jsx';
import BookshelfScanner from './pages/BookshelfScanner.jsx';
import Landing from "./pages/Landing.jsx";

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
        <Route path="/" element={<Landing />} />
        <Route path="/" element={<Navigate to="/register" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/home" element={<Home />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/bookshelf-scanner" element={<BookshelfScanner />} />
    </Routes>
    </BrowserRouter>
  );
}

export default App;