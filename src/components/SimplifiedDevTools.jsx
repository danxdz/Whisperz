import React, { useState, useEffect } from 'react';
import gunAuthService from '../services/gunAuthService';
import friendsService from '../services/friendsService';
import webrtcService from '../services/webrtcService';
import debugLogger from '../utils/debugLogger';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';

/**
 * SimplifiedDevTools Component
 * Cleaned up version with only working features and no duplicates
 */
function SimplifiedDevTools({ isVisible, onClose }) {
  const { colors } = useTheme();
  const screen = useResponsive();
  const [activeTab, setActiveTab] = useState('status');
  const [currentUser, setCurrentUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [connectionInfo, setConnectionInfo] = useState({});
  const [debugEnabled, setDebugEnabled] = useState(debugLogger.enabled);

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
      debugLogger.error('Failed to load friends:', error);
    }
  };

  const loadConnectionInfo = () => {
    const gunPeers = gunAuthService.gun?._.opt?.peers || {};
    const connectedRelays = Object.keys(gunPeers).filter(url => {
      const peer = gunPeers[url];
      return peer && peer.wire && !peer.wire.closed;
    });

    setConnectionInfo({
      webrtcReady: webrtcService.isReady(),
      peerId: webrtcService.getPeerId() || 'Not initialized',
      connectedPeers: webrtcService.getConnectedPeers().length,
      gunRelays: connectedRelays.length,
      relayUrls: connectedRelays
    });
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      gunAuthService.logout();
      window.location.reload();
    }
  };

  const toggleDebug = () => {
    if (debugEnabled) {
      debugLogger.disable();
    } else {
      debugLogger.enable();
    }
    setDebugEnabled(!debugEnabled);
  };

  const clearLocalStorage = () => {
    if (window.confirm('Clear all local data? This will log you out.')) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  const removeFriend = async (publicKey) => {
    if (window.confirm('Remove this friend?')) {
      try {
        await friendsService.removeFriend(publicKey);
        loadFriends();
      } catch (error) {
        alert('Failed to remove friend');
      }
    }
  };

  const tabs = [
    { id: 'status', label: 'Status' },
    { id: 'friends', label: 'Friends' },
    { id: 'debug', label: 'Debug' }
  ];

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: screen.isMobile ? '100%' : '400px',
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
            cursor: 'pointer',
            padding: '4px 8px'
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
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? '600' : '400'
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
            {/* Current User */}
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

            {/* Connection Info */}
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
                <div>Peer ID: {connectionInfo.peerId?.substring(0, 20)}...</div>
                <div>P2P Peers: {connectionInfo.connectedPeers}</div>
                <div>Gun Relays: {connectionInfo.gunRelays}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleLogout}
                style={{
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
              <button
                onClick={clearLocalStorage}
                style={{
                  padding: '10px',
                  background: colors.warning,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Clear Local Storage
              </button>
            </div>
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
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontSize: '13px' }}>
                  <div style={{ color: colors.textPrimary, fontWeight: '500' }}>
                    {friend.nickname}
                  </div>
                  <div style={{ color: colors.textMuted, fontSize: '11px' }}>
                    {friend.publicKey.substring(0, 20)}...
                  </div>
                </div>
                <button
                  onClick={() => removeFriend(friend.publicKey)}
                  style={{
                    padding: '4px 8px',
                    background: colors.danger,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'debug' && (
          <div>
            <div style={{
              background: colors.bgCard,
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: colors.textPrimary }}>
                Debug Settings
              </h4>
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: colors.textSecondary,
                  fontSize: '13px'
                }}>
                  <input
                    type="checkbox"
                    checked={debugEnabled}
                    onChange={toggleDebug}
                  />
                  Enable Debug Logging
                </label>
              </div>
              <div style={{
                padding: '8px',
                background: colors.bgSecondary,
                borderRadius: '4px',
                fontSize: '11px',
                color: colors.textMuted
              }}>
                <div>Console Commands:</div>
                <div>• enableDebug() - Enable all</div>
                <div>• disableDebug() - Disable all</div>
                <div>• debugSettings() - Show options</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  debugLogger.enable('p2p');
                  alert('P2P logging enabled');
                }}
                style={{
                  padding: '8px',
                  background: colors.bgTertiary,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Enable P2P Logs
              </button>
              <button
                onClick={() => {
                  debugLogger.enable('webrtc');
                  alert('WebRTC logging enabled');
                }}
                style={{
                  padding: '8px',
                  background: colors.bgTertiary,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Enable WebRTC Logs
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px',
                  background: colors.primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Reload App
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimplifiedDevTools;