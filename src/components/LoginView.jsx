import { useState, useEffect } from 'react';
import gunAuthService from '../services/gunAuthService';
import { loginRateLimiter } from '../utils/rateLimiter';
import ThemeToggle from './ThemeToggle';

/**
 * LoginView Component
 * Handles user authentication with rate limiting and first-user setup guidance
 * 
 * @param {Object} props
 * @param {Function} props.onLogin - Callback when login is successful
 * @param {string} props.inviteCode - Optional invite code for new users
 */
function LoginView({ onLogin, inviteCode }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFirstUserSetup, setShowFirstUserSetup] = useState(false);

  // Check if this might be the first user (no accounts exist)
  useEffect(() => {
    // Simple check - if in production and no stored auth, show setup hint
    if (window.location.hostname !== 'localhost' && !localStorage.getItem('gun/')) {
      setShowFirstUserSetup(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Input validation
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    // Check rate limiting
    const rateCheck = loginRateLimiter.check(username);
    if (!rateCheck.allowed) {
      setError(rateCheck.error);
      return;
    }

    setLoading(true);

    try {
      const result = await gunAuthService.login(username, password);
      if (result && result.user) {
        onLogin(result.user);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch {
      // console.error('Login error:', err);
      setError(_err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <ThemeToggle />
      <div className="auth-box">
        <h1>Whisperz Login</h1>
        {inviteCode && (
          <div className="info-message">
            You have an invite! Login to your account or create a new one to accept it.
          </div>
        )}
        {showFirstUserSetup && (
          <div className="info-message" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(0, 255, 0, 0.1)', border: '1px solid #00ff00', borderRadius: '4px' }}>
            <p style={{ margin: '0 0 10px 0' }}>👋 <strong>Welcome to Whisperz!</strong></p>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>First time? Create your admin account:</p>
            
            {/* Mobile-friendly setup */}
            <div style={{ textAlign: 'center', margin: '15px 0' }}>
              <a 
                href="?setup=admin"
                style={{ 
                  display: 'inline-block',
                  padding: '12px 24px', 
                  background: '#00ff00', 
                  color: '#000', 
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}
              >
                📱 Create First Account (Mobile Friendly)
              </a>
            </div>
            
            <p style={{ margin: '10px 0 0 0', fontSize: '12px', opacity: '0.8', textAlign: 'center' }}>
              Or manually go to: {window.location.origin}?setup=admin
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
            autoComplete="username"
            maxLength={20}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            autoComplete="current-password"
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="invite-only-notice">
          This is an invite-only chat. You need an invite link from an existing member to join.
        </p>
      </div>
    </div>
  );
}

export default LoginView;