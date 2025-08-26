import React, { useState, useEffect } from 'react';
import gunAuthService from '../services/gunAuthService';
import friendsService from '../services/friendsService';
// WebRTC removed - using Gun.js only
import { useTheme } from '../contexts/ThemeContext';

/**
 * SimplifiedDevTools - Cleaned up version with only working features
 */
function SimplifiedDevTools({ isVisible, onClose }) {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('status');
  const [currentUser, setCurrentUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [connectionInfo, setConnectionInfo] = useState({});

  useEffect(() => {
    if (!isVisible) return;
    loadCurrentUser();
    loadFriends();
    loadConnectionInfo();
  }, [isVisible]);

  const loadCurrentUser = () => {
    const user = gunAuthService.getCurrentUser();
    if (user) {
      setCurrentUser({
        alias: user.alias,
        publicKey: user.pub?.substring(0, 20) + '...',
        authenticated: gunAuthService.isAuthenticated()
      });
    }
  };

  const loadFriends = async () => {
    try {
      const friendList = await friendsService.getFriends();
      setFriends(friendList);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadConnectionInfo = () => {
    const gunPeers = gunAuthService.gun?._.opt?.peers || {};
    const connectedRelays = Object.keys(gunPeers).filter(url => {
      const peer = gunPeers[url];
      return peer && peer.wire && !peer.wire.closed;
    });

    setConnectionInfo({
      webrtcReady: false, // WebRTC removed
      peerId: 'Gun.js only',
      connectedPeers: 0, // Decentralized
      gunRelays: connectedRelays.length
    });
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      gunAuthService.logout();
      window.location.reload();
    }
  };

  if (!isVisible) return null;

  const tabs = [
    { id: 'status', label: 'Status' },
    { id: 'friends', label: 'Friends' },
    { id: 'debug', label: 'Debug' }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '400px',
      height: '100vh',
      background: colors.bgSecondary,
      borderLeft: `1px solid ${colors.borderColor}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10000,
      boxShadow: '-2px 0 10px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${colors.borderColor}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: colors.bgCard
      }}>
        <h3 style={{ margin: 0, color: colors.textPrimary, fontSize: '16px' }}>
          Dev Tools
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: colors.textMuted,
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${colors.borderColor}`,
        background: colors.bgCard
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px',
              background: activeTab === tab.id ? colors.primary : 'transparent',
              color: activeTab === tab.id ? '#fff' : colors.textSecondary,
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px'
      }}>
        {activeTab === 'status' && (
          <div>
            {currentUser && (
              <div style={{
                background: colors.bgCard,
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <h4 style={{ margin: '0 0 8px 0', color: colors.textPrimary }}>
                  Current User
                </h4>
                <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                  <div>Alias: {currentUser.alias}</div>
                  <div>Key: {currentUser.publicKey}</div>
                  <div>Auth: {currentUser.authenticated ? '✅' : '❌'}</div>
                </div>
              </div>
            )}

            <div style={{
              background: colors.bgCard,
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: colors.textPrimary }}>
                Connections
              </h4>
              <div style={{ fontSize: '13px', color: colors.textSecondary }}>
                <div>WebRTC: {connectionInfo.webrtcReady ? '✅' : '❌'}</div>
                <div>P2P Peers: {connectionInfo.connectedPeers}</div>
                <div>Gun Relays: {connectionInfo.gunRelays}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '10px',
                background: colors.danger,
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Logout
            </button>
          </div>
        )}

        {activeTab === 'friends' && (
          <div>
            <div style={{ marginBottom: '12px', color: colors.textSecondary }}>
              Total: {friends.length} friends
            </div>
            {friends.map(friend => (
              <div
                key={friend.publicKey}
                style={{
                  background: colors.bgCard,
                  padding: '10px',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}
              >
                <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                  {friend.nickname}
                </div>
                <div style={{ color: colors.textMuted, fontSize: '11px' }}>
                  {friend.publicKey.substring(0, 30)}...
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'debug' && (
          <div>
            <div style={{
              background: colors.bgCard,
              padding: '12px',
              borderRadius: '8px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: colors.textPrimary }}>
                Debug Console
              </h4>
              <div style={{
                padding: '8px',
                background: colors.bgSecondary,
                borderRadius: '4px',
                fontSize: '11px',
                color: colors.textMuted
              }}>
                <div>Open DevTools console and use:</div>
                <div>• enableDebug() - Enable logging</div>
                <div>• disableDebug() - Disable logging</div>
                <div>• debugSettings() - Show options</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimplifiedDevTools;