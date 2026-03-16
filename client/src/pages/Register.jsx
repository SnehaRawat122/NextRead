import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../services/api';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await registerUser(form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f4f8',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{
        background: '#ffffff',
        padding: '2.5rem',
        borderRadius: '16px',
        width: '400px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)'
      }}>
        <h2 style={{
          textAlign: 'center',
          color: '#4f46e5',
          fontSize: '1.6rem',
          marginBottom: '1.5rem'
        }}>Create Account</h2>

        {error && (
          <div style={{
            background: '#fff5f5',
            border: '1px solid #feb2b2',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <p style={{ color: '#e53e3e', fontSize: '14px' }}>{error}</p>
            {error === 'Email already registered' && (
              <p style={{ color: '#718096', fontSize: '13px', marginTop: '6px' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#4f46e5', fontWeight: 'bold' }}>
                  Login here →
                </Link>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {['name', 'email', 'password'].map((field) => (
            <input
              key={field}
              name={field}
              type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              placeholder={field === 'name' ? 'Full Name' : field === 'email' ? 'Email' : 'Password'}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px',
                margin: '8px 0',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#333',
                fontSize: '14px',
                boxSizing: 'border-box',
                outline: 'none'
              }}
            />
          ))}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              marginTop: '1rem'
            }}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: '1.5rem 0'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <span style={{ padding: '0 10px', color: '#a0aec0', fontSize: '13px' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        <Link to="/login">
          <button style={{
            width: '100%',
            padding: '12px',
            background: 'white',
            color: '#4f46e5',
            border: '1px solid #4f46e5',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            Already have an account? Login
          </button>
        </Link>
      </div>
    </div>
  );
}