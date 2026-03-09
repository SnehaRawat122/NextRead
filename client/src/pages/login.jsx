import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, getOnboardingStatus } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginUser(form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Onboarding done hai ya nahi check karo
      const status = await getOnboardingStatus();
      if (status.data.onboardingDone) {
        navigate('/home');
      } else {
        navigate('/onboarding');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>📚 Welcome Back</h2>
        {error && <p style={styles.error}>{error}</p>}
        <input style={styles.input} name="email" placeholder="Email"
          type="email" onChange={handleChange} />
        <input style={styles.input} name="password" placeholder="Password"
          type="password" onChange={handleChange} />
        <button style={styles.button} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <p style={styles.link}>New here? <Link to="/register">Register</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center',
    alignItems: 'center', height: '100vh', background: '#f0f4f8' },
  card: { background: 'white', padding: '2rem', borderRadius: '12px',
    width: '350px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
  title: { textAlign: 'center', marginBottom: '1.5rem', color: '#333' },
  input: { width: '100%', padding: '10px', margin: '8px 0',
    borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px',
    boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', background: '#4f46e5',
    color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '16px', cursor: 'pointer', marginTop: '1rem' },
  error: { color: 'red', textAlign: 'center', fontSize: '14px' },
  link: { textAlign: 'center', marginTop: '1rem', fontSize: '14px' }
};