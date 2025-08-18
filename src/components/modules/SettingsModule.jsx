import React, { useState, useEffect } from 'react';
import gunAuthService from '../../services/gunAuthService';
import { useTheme } from '../../hooks/useTheme';

/**
 * SettingsModule - IRC-style settings interface
 * User profile, theme, and app settings
 */
function SettingsModule({ currentUser, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => {
    loadProfile();
  }, [currentUser]);

  const loadProfile = async () => {
    try {
      const profile = await gunAuthService.getUserProfile();
      if (profile) {
        setNickname(profile.nickname || currentUser.alias || '');
        setBio(profile.bio || '');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await gunAuthService.updateProfile({
        nickname: nickname || currentUser.alias,
        bio: bio
      });
      alert('Profile updated successfully!');
    } catch (error) {
      alert('Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = () => {
    // Export user data for backup
    const data = {
      publicKey: currentUser.pub,
      alias: currentUser.alias,
      nickname: nickname,
      bio: bio,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whisperz-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a1a',
      color: '#e0e0e0',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
    }}>
      {/* Section Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #333',
        background: '#2a2a2a'
      }}>
        {['profile', 'appearance', 'privacy', 'about'].map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            style={{
              flex: 1,
              padding: '10px',
              background: activeSection === section ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderRight: section !== 'about' ? '1px solid #333' : 'none',
              color: activeSection === section ? '#00ff00' : '#808080',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
              textTransform: 'uppercase'
            }}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px'
      }}>
        {/* Profile Section */}
        {activeSection === 'profile' && (
          <div>
            <h3 style={{ color: '#00ff00', marginBottom: '20px' }}>[PROFILE SETTINGS]</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#808080', fontSize: '12px' }}>
                NICKNAME
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname..."
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#e0e0e0',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#808080', fontSize: '12px' }}>
                BIO
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#e0e0e0',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', color: '#808080', fontSize: '12px' }}>
                PUBLIC KEY
              </label>
              <div style={{
                padding: '8px',
                background: '#2a2a2a',
                border: '1px solid #333',
                color: '#606060',
                fontSize: '12px',
                wordBreak: 'break-all',
                fontFamily: 'monospace'
              }}>
                {currentUser.pub}
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              style={{
                padding: '10px 20px',
                background: '#1a1a1a',
                border: '1px solid #00ff00',
                color: '#00ff00',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                fontSize: '14px',
                opacity: saving ? 0.5 : 1
              }}
            >
              {saving ? 'SAVING...' : '[SAVE PROFILE]'}
            </button>
          </div>
        )}

        {/* Appearance Section */}
        {activeSection === 'appearance' && (
          <div>
            <h3 style={{ color: '#00ff00', marginBottom: '20px' }}>[APPEARANCE]</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', color: '#808080', fontSize: '12px' }}>
                THEME
              </label>
              <button
                onClick={toggleTheme}
                style={{
                  padding: '10px 20px',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px'
                }}
              >
                Current: {theme === 'dark' ? 'DARK' : 'LIGHT'} (Click to toggle)
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', color: '#808080', fontSize: '12px' }}>
                FONT SIZE
              </label>
              <select
                style={{
                  padding: '8px',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#e0e0e0',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="12">Small (12px)</option>
                <option value="14">Medium (14px)</option>
                <option value="16">Large (16px)</option>
              </select>
            </div>
          </div>
        )}

        {/* Privacy Section */}
        {activeSection === 'privacy' && (
          <div>
            <h3 style={{ color: '#00ff00', marginBottom: '20px' }}>[PRIVACY & SECURITY]</h3>
            
            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#e0e0e0', marginBottom: '10px' }}>Data Export</h4>
              <p style={{ color: '#808080', fontSize: '14px', marginBottom: '10px' }}>
                Export your profile data for backup purposes.
              </p>
              <button
                onClick={handleExportData}
                style={{
                  padding: '10px 20px',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  color: '#e0e0e0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px'
                }}
              >
                [EXPORT DATA]
              </button>
            </div>

            <div style={{ marginBottom: '30px' }}>
              <h4 style={{ color: '#e0e0e0', marginBottom: '10px' }}>Clear Local Data</h4>
              <p style={{ color: '#808080', fontSize: '14px', marginBottom: '10px' }}>
                Clear all local cached data. This will not delete your account.
              </p>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear local data?')) {
                    localStorage.clear();
                    sessionStorage.clear();
                    alert('Local data cleared. Please refresh the page.');
                  }
                }}
                style={{
                  padding: '10px 20px',
                  background: '#2a2a2a',
                  border: '1px solid #ff6b6b',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px'
                }}
              >
                [CLEAR DATA]
              </button>
            </div>
          </div>
        )}

        {/* About Section */}
        {activeSection === 'about' && (
          <div>
            <h3 style={{ color: '#00ff00', marginBottom: '20px' }}>[ABOUT WHISPERZ]</h3>
            
            <div style={{ color: '#808080', fontSize: '14px', lineHeight: '1.6' }}>
              <p style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#e0e0e0' }}>Whisperz v2.1.0</strong>
              </p>
              <p style={{ marginBottom: '15px' }}>
                A decentralized P2P chat application built with Gun.js and WebRTC.
              </p>
              <p style={{ marginBottom: '15px' }}>
                • End-to-end encrypted messaging<br />
                • Peer-to-peer connections<br />
                • No central server required<br />
                • Open source and privacy-focused
              </p>
              <p style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#e0e0e0' }}>Technologies:</strong><br />
                React, Gun.js, WebRTC, PeerJS
              </p>
              <p>
                <strong style={{ color: '#e0e0e0' }}>License:</strong> MIT
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div style={{
        padding: '15px',
        borderTop: '1px solid #333',
        background: '#2a2a2a'
      }}>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: '10px',
            background: '#1a1a1a',
            border: '1px solid #ff6b6b',
            color: '#ff6b6b',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '14px'
          }}
        >
          [LOGOUT]
        </button>
      </div>
    </div>
  );
}

export default SettingsModule;