
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div
        onClick={() => navigate('/home')}
        style={{
          fontSize: '1.7rem',
          fontWeight: 'bold',
          cursor: 'pointer',
     fontFamily: "'Pacifico', cursive",
      color: "#333",
  
        }}>
       NextRead
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ color: "#333", fontSize: '1.4rem', fontWeight: '500',fontFamily: "'Pacifico', cursive" }}>
          👤 {user?.name}
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 18px',
            background: 'white',
            color: '#4f46e5',
            border: '1px solid #4f46e5',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1.4rem',
            fontWeight: '500'
          }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
