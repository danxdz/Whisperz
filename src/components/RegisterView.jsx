import React, { useState, useEffect } from 'react';
import gunAuthService from '../services/gunAuthService';

const RegisterView = ({ onRegister, onSwitchToLogin, inviteCode, isAdminSetup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState(null);

  // Parse invite data
  useEffect(() => {
    if (inviteCode) {
      setInviteData({
        code: inviteCode,
        message: 'You have a valid invite code'
      });
    }
  }, [inviteCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await gunAuthService.register(username, password, nickname || username);
      onRegister(result.user, inviteCode);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1a1a',
      color: '#e0e0e0',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '30px',
        background: '#2a2a2a',
        border: '1px solid #444',
        borderRadius: '4px'
      }}>
        <h1 style={{
          textAlign: 'center',
          color: '#00ff00',
          marginBottom: '30px',
          fontSize: '24px'
        }}>
          [REGISTER]
        </h1>

        {isAdminSetup && (
          <div style={{
            padding: '10px',
            background: '#1a1a1a',
            border: '1px solid #00ff00',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#00ff00'
          }}>
            ADMIN SETUP MODE - First user registration
          </div>
        )}

        {inviteData && (
          <div style={{
            padding: '10px',
            background: '#1a1a1a',
            border: '1px solid #00ff00',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#00ff00'
          }}>
            ✓ {inviteData.message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px',
            background: '#1a1a1a',
            border: '1px solid #ff6b6b',
            marginBottom: '20px',
            fontSize: '12px',
            color: '#ff6b6b'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              color: '#808080',
              fontSize: '12px'
            }}>
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1a1a',
                border: '1px solid #444',
                color: '#e0e0e0',
                fontFamily: 'inherit',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00ff00'}
              onBlur={(e) => e.target.style.borderColor = '#444'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              color: '#808080',
              fontSize: '12px'
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1a1a',
                border: '1px solid #444',
                color: '#e0e0e0',
                fontFamily: 'inherit',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00ff00'}
              onBlur={(e) => e.target.style.borderColor = '#444'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '5px',
              color: '#808080',
              fontSize: '12px'
            }}>
              NICKNAME (OPTIONAL)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={username || 'Your display name'}
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1a1a',
                border: '1px solid #444',
                color: '#e0e0e0',
                fontFamily: 'inherit',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#00ff00'}
              onBlur={(e) => e.target.style.borderColor = '#444'}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1a1a1a',
              border: '1px solid #00ff00',
              color: '#00ff00',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'REGISTERING...' : '[CREATE ACCOUNT]'}
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#808080'
        }}>
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#00ff00',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '12px',
              textDecoration: 'underline'
            }}
          >
            LOGIN
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegisterView;