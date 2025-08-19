import React, { useState, useEffect } from 'react';
import gunAuthService from '../services/gunAuthService';
import friendsService from '../services/friendsService';
import hybridGunService from '../services/hybridGunService';
import webrtcService from '../services/webrtcService';
import backupService from '../services/backupService';
import p2pDebugger from '../utils/p2pDebugger';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';

/**
 * EnhancedDevTools Component
 * Advanced developer tools with user management, backup system, and mobile optimization
 */
function EnhancedDevTools({ isVisible, onClose, isMobilePanel = false }) {
  const { colors } = useTheme();
  const screen = useResponsive();
  const [activeTab, setActiveTab] = useState('users');
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [allOnlineUsers, setAllOnlineUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [stats, setStats] = useState({});
  const [networkStats, setNetworkStats] = useState({
    gunStatus: 'unknown',
    webrtcStatus: 'unknown',
    peerId: '',
    connectedPeers: 0,
    gunPeers: 0
  });
  const [selectedUser, setSelectedUser] = useState(null);
  
  // P2P Tab state
  const [p2pLogs, setP2PLogs] = useState([]);
  
  // Backup state
  const [backupPassword, setBackupPassword] = useState('');
  const [storageStats, setStorageStats] = useState(null);
  const [backupStatus, setBackupStatus] = useState('');
  
  // Gun DB state
  const [customRelay, setCustomRelay] = useState('');
  const [currentRelays, setCurrentRelays] = useState([]);
  const [savedRelays, setSavedRelays] = useState([]);
  const [privateMode, setPrivateMode] = useState(localStorage.getItem('P2P_PRIVATE_MODE') === 'true');

  // Load users (friends)
  useEffect(() => {
    if (!isVisible) return;
    loadUsers();
    loadInvites();
    loadStats();
    loadRelayConfig();
    loadCurrentUserInfo();
    loadOnlineUsers();
  }, [isVisible]);
  
  // Update P2P logs when P2P tab is active
  useEffect(() => {
    if (activeTab === 'p2p' && isVisible) {
      setP2PLogs(p2pDebugger.logs);
      
      // Auto-refresh logs every second when on P2P tab
      const interval = setInterval(() => {
        setP2PLogs([...p2pDebugger.logs]);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab, isVisible]);

  const loadCurrentUserInfo = () => {
    try {
      const user = gunAuthService.getCurrentUser();
      if (user) {
        // Check Gun P2P status instead of WebRTC
        const gunPeers = gunAuthService.gun?._.opt?.peers || {};
        const connectedPeers = Object.keys(gunPeers).filter(url => {
          const peer = gunPeers[url];
          return peer && peer.wire && !peer.wire.closed;
        });
        
        setCurrentUserInfo({
          publicKey: user.pub,
          alias: user.alias,
          gunConnected: connectedPeers.length > 0,
          peerCount: connectedPeers.length,
          peers: connectedPeers
        });
      }
    } catch (error) {
      console.error('Failed to load current user info:', error);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      // First, make sure we broadcast our own presence
      const currentUser = gunAuthService.getCurrentUser();
      if (currentUser) {
        const peerId = webrtcService.getPeerId();
        hybridGunService.updatePresence('online', { peerId });
        console.log('📢 Broadcasting our presence before checking others');
      }
      
      const onlineList = [];
      const seenKeys = new Set();
      
      // Get all online users from Gun presence space
      await new Promise((resolve) => {
        let checkCount = 0;
        
        // Check presence space
        gunAuthService.gun.get('presence').map().once((data, key) => {
          checkCount++;
          console.log('🔍 Checking presence for key:', key, data);
          
          if (data && key && key !== '_' && !key.startsWith('~')) {
            // Clean Gun metadata
            const cleanData = Object.keys(data).reduce((acc, k) => {
              if (!k.startsWith('_') && k !== '#' && k !== '>') {
                acc[k] = data[k];
              }
              return acc;
            }, {});
            
            // Check if user is online (seen in last 2 minutes)
            if (cleanData.status === 'online' && cleanData.lastSeen && 
                (Date.now() - cleanData.lastSeen) < 120000) {
              if (!seenKeys.has(key)) {
                seenKeys.add(key);
                onlineList.push({
                  publicKey: key,
                  lastSeen: cleanData.lastSeen,
                  peerId: cleanData.peerId,
                  status: cleanData.status
                });
                console.log('✅ Found online user:', key);
              }
            }
          }
        });
        
        // Also check users space for presence
        gunAuthService.gun.get('~@').map().once((alias, key) => {
          if (alias && key && key !== '_') {
            // Extract public key from the ~pubkey format
            const pubKey = key.replace('~', '').split('.')[0];
            if (pubKey && !seenKeys.has(pubKey)) {
              // Check this user's presence
              gunAuthService.gun.user(pubKey).get('presence').once((data) => {
                if (data && data.status === 'online' && data.lastSeen && 
                    (Date.now() - data.lastSeen) < 120000) {
                  seenKeys.add(pubKey);
                  onlineList.push({
                    publicKey: pubKey,
                    alias: alias,
                    lastSeen: data.lastSeen,
                    peerId: data.peerId,
                    status: data.status
                  });
                  console.log('✅ Found online user via alias:', alias, pubKey);
                }
              });
            }
          }
        });
        
        // Wait a bit for data to load
        setTimeout(() => {
          console.log('📊 Total presence checks:', checkCount);
          resolve();
        }, 2000);
      });
      
      setAllOnlineUsers(onlineList);
      console.log('📊 Online users found:', onlineList.length, onlineList);
    } catch (error) {
      console.error('Failed to load online users:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const friends = await friendsService.getFriends();
      const userList = friends.map(friend => ({
        ...friend,
        id: friend.publicKey,
        name: friend.nickname,
        status: 'friend',
        lastSeen: friend.lastSeen || 'Unknown'
      }));
      setUsers(userList);
    } catch (error) {
      // console.error('Failed to load users:', error);
    }
  };

  const loadInvites = async () => {
    try {
      const myInvites = await friendsService.getMyInvites();
      setInvites(myInvites);
    } catch (error) {
      // console.error('Failed to load invites:', error);
    }
  };

  const loadStats = async () => {
    try {
      const dbStats = await hybridGunService.getDatabaseStats();
      const gun = gunAuthService.gun;
      const peers = gun?._.opt?.peers ? Object.keys(gun._.opt.peers).length : 0;
      
      // Load network stats
      const peerId = webrtcService.getPeerId();
      const webrtcPeers = webrtcService.getConnectedPeers ? webrtcService.getConnectedPeers() : [];
      
      setNetworkStats({
        gunStatus: gun ? 'connected' : 'disconnected',
        webrtcStatus: peerId ? 'initialized' : 'not initialized',
        peerId: peerId || 'Not initialized',
        connectedPeers: webrtcPeers.length,
        gunPeers: peers,
        actualConnections: webrtcPeers
      });
      
      setStats({
        ...dbStats,
        totalUsers: users.length,
        activeInvites: invites.filter(i => !i.used && !i.revoked).length,
        usedInvites: invites.filter(i => i.used).length,
        gunPeers: peers,
        webrtcStatus: webrtcService.peer?.open ? 'Connected' : 'Disconnected'
      });
    } catch (error) {
      // console.error('Failed to load stats:', error);
    }
  };

  // Load storage stats for backup tab
  const loadStorageStats = () => {
    try {
      const stats = backupService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      // console.error('Failed to load storage stats:', error);
    }
  };

  // Handle backup export
  const handleBackupExport = async () => {
    try {
      setBackupStatus('Creating backup...');
      const result = backupService.exportToFile(backupPassword || null);
      setBackupStatus(`✅ Backup exported: ${result.filename} (${result.encrypted ? 'Encrypted' : 'Not encrypted'})`);
      setTimeout(() => setBackupStatus(''), 5000);
    } catch (error) {
      setBackupStatus(`❌ Export failed: ${error.message}`);
    }
  };

  // Handle backup import
  const handleBackupImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setBackupStatus('Importing backup...');
      const password = backupPassword || prompt('Enter backup password (leave empty if not encrypted):');
      const result = await backupService.importFromFile(file, password);
      
      if (result.success) {
        setBackupStatus(`✅ Restored ${result.restoredCount} items from backup`);
        loadStorageStats();
      } else if (result.cancelled) {
        setBackupStatus('Import cancelled');
      }
    } catch (error) {
      setBackupStatus(`❌ Import failed: ${error.message}`);
    }
    
    // Clear file input
    event.target.value = '';
  };

  // Handle clear data
  const handleClearData = (category) => {
    const confirmMsg = category === 'all' 
      ? '⚠️ This will delete ALL data! Are you sure?' 
      : `Clear ${category} data?`;
    
    if (window.confirm(confirmMsg)) {
      if (category === 'all' && !window.confirm('This action cannot be undone. Are you REALLY sure?')) {
        return;
      }
      
      const result = backupService.clearData([category]);
      setBackupStatus(`Cleared ${result.count} items`);
      loadStorageStats();
      setTimeout(() => setBackupStatus(''), 3000);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      await friendsService.removeFriend(userId);
      loadUsers();
      alert('Friend removed successfully');
    } catch (error) {
      alert('Failed to remove friend: ' + error.message);
    }
  };

  const handleRevokeInvite = async (inviteCode) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;
    
    try {
      await friendsService.revokeInvite(inviteCode);
      loadInvites();
      alert('Invite revoked successfully');
    } catch (error) {
      alert('Failed to revoke invite: ' + error.message);
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const result = await friendsService.generateInvite();
      await navigator.clipboard.writeText(result.inviteLink);
      alert('New invite generated and copied to clipboard!');
      loadInvites();
    } catch (error) {
      alert('Failed to generate invite: ' + error.message);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('This will delete ALL data including messages, friends, and settings. Are you sure?')) return;
    if (!confirm('This action cannot be undone. Continue?')) return;
    
    try {
      await hybridGunService.clearAllData();
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (error) {
      alert('Failed to clear data: ' + error.message);
    }
  };

  // Gun DB Relay Configuration Functions
  const loadRelayConfig = () => {
    // Load saved relay configurations
    const saved = localStorage.getItem('customGunRelays');
    if (saved) {
      try {
        const relays = JSON.parse(saved);
        setSavedRelays(relays);
      } catch (e) {
        console.error('Failed to load saved relays:', e);
      }
    }

    // Get current Gun peers
    if (gunAuthService.gun && gunAuthService.gun._) {
      const peers = gunAuthService.gun._.opt.peers;
      if (peers) {
        setCurrentRelays(Object.keys(peers));
      }
    }
  };

  const addCustomRelay = () => {
    if (!customRelay.trim()) return;
    
    // Validate URL format
    try {
      new URL(customRelay);
    } catch (e) {
      alert('Invalid URL format. Please enter a valid relay URL (e.g., https://your-relay.com/gun)');
      return;
    }

    // Add to saved relays
    const newRelays = [...savedRelays, customRelay];
    setSavedRelays(newRelays);
    localStorage.setItem('customGunRelays', JSON.stringify(newRelays));
    
    // Store for next app reload
    const existingPeers = localStorage.getItem('GUN_CUSTOM_PEERS') || '';
    const peersArray = existingPeers ? existingPeers.split(',') : [];
    if (!peersArray.includes(customRelay)) {
      peersArray.push(customRelay);
      localStorage.setItem('GUN_CUSTOM_PEERS', peersArray.join(','));
    }
    
    setCustomRelay('');
    alert('Relay added! Reload the app to connect to the new relay.');
  };

  const removeRelay = (relay) => {
    const newRelays = savedRelays.filter(r => r !== relay);
    setSavedRelays(newRelays);
    localStorage.setItem('customGunRelays', JSON.stringify(newRelays));
    
    // Update localStorage peers
    const existingPeers = localStorage.getItem('GUN_CUSTOM_PEERS') || '';
    const peersArray = existingPeers.split(',').filter(p => p !== relay);
    localStorage.setItem('GUN_CUSTOM_PEERS', peersArray.join(','));
  };

  const switchToRelay = (relay) => {
    // Set this as the only active relay
    localStorage.setItem('GUN_CUSTOM_PEERS', relay);
    alert(`Switched to ${relay}. Reload the app to connect.`);
  };

  const useAllRelays = () => {
    // Use all saved relays
    localStorage.setItem('GUN_CUSTOM_PEERS', savedRelays.join(','));
    alert('Using all saved relays. Reload the app to connect.');
  };

  const renderCompactTabs = () => (
    <div style={{
      display: 'flex',
      gap: '4px',
      padding: '8px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch'
    }}>
      {['me', 'friends', 'network', 'p2p', 'gundb', 'backup'].map(tab => (
        <button
          key={tab}
          onClick={() => {
            setActiveTab(tab);
            if (tab === 'backup') loadStorageStats();
          }}
          style={{
            padding: '6px 12px',
            background: activeTab === tab 
              ? colors.primary
              : colors.bgTertiary,
            border: 'none',
            borderRadius: '6px',
            color: colors.textPrimary,
            fontSize: '12px',
            fontWeight: activeTab === tab ? '600' : '400',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );

  const renderUsersTab = () => (
    <div style={{ padding: screen.isTiny ? '8px' : '12px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h4 style={{ margin: 0, fontSize: screen.isTiny ? '14px' : '16px' }}>
          Friends ({users.length})
        </h4>
        <button
          onClick={handleGenerateInvite}
          style={{
            padding: screen.isTiny ? '4px 8px' : '6px 12px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            border: 'none',
            borderRadius: '4px',
            color: colors.textPrimary,
            fontSize: screen.isTiny ? '10px' : '12px',
            cursor: 'pointer'
          }}
        >
          + Invite
        </button>
      </div>
      
      <div style={{ 
        maxHeight: screen.isTiny ? '200px' : '300px', 
        overflowY: 'auto',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '8px'
      }}>
        {users.length === 0 ? (
          <p style={{ 
            textAlign: 'center', 
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: screen.isTiny ? '11px' : '12px'
          }}>
            No friends yet. Generate an invite to add friends.
          </p>
        ) : (
          users.map(user => (
            <div key={user.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: screen.isTiny ? '6px' : '8px',
              marginBottom: '4px',
              background: colors.bgTertiary,
              borderRadius: '4px',
              fontSize: screen.isTiny ? '11px' : '12px'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontWeight: 'bold',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user.name}
                </div>
                <div style={{ 
                  fontSize: screen.isTiny ? '9px' : '10px', 
                  color: 'rgba(255, 255, 255, 0.5)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {user.id.substring(0, 20)}...
                </div>
              </div>
              <button
                onClick={() => handleRemoveUser(user.id)}
                style={{
                  padding: screen.isTiny ? '2px 6px' : '4px 8px',
                  background: 'rgba(255, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 0, 0, 0.5)',
                  borderRadius: '4px',
                  color: colors.danger,
                  fontSize: screen.isTiny ? '9px' : '10px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderInvitesTab = () => (
    <div style={{ padding: screen.isTiny ? '8px' : '12px' }}>
      <h4 style={{ 
        margin: '0 0 12px 0', 
        fontSize: screen.isTiny ? '14px' : '16px' 
      }}>
        Invites ({invites.length})
      </h4>
      
      <div style={{ 
        maxHeight: screen.isTiny ? '200px' : '300px', 
        overflowY: 'auto',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '8px'
      }}>
        {invites.length === 0 ? (
          <p style={{ 
            textAlign: 'center', 
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: screen.isTiny ? '11px' : '12px'
          }}>
            No invites generated yet.
          </p>
        ) : (
          invites.map(invite => (
            <div key={invite.code} style={{
              padding: screen.isTiny ? '6px' : '8px',
              marginBottom: '4px',
              background: colors.bgTertiary,
              borderRadius: '4px',
              fontSize: screen.isTiny ? '11px' : '12px'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{ 
                  fontWeight: 'bold',
                  color: invite.used ? '#66ff66' : invite.revoked ? '#ff6666' : '#ffff66'
                }}>
                  {invite.used ? '✅ Used' : invite.revoked ? '❌ Revoked' : '⏳ Pending'}
                </span>
                <span style={{ fontSize: screen.isTiny ? '9px' : '10px' }}>
                  {new Date(invite.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              {invite.used && invite.usedBy && (
                <div style={{ 
                  fontSize: screen.isTiny ? '9px' : '10px',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}>
                  Used by: {invite.usedBy.substring(0, 20)}...
                </div>
              )}
              
              {!invite.used && !invite.revoked && (
                <div style={{ marginTop: '4px' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(invite.link);
                      alert('Invite link copied!');
                    }}
                    style={{
                      padding: screen.isTiny ? '2px 6px' : '4px 8px',
                      background: 'rgba(102, 126, 234, 0.2)',
                      border: '1px solid rgba(102, 126, 234, 0.5)',
                      borderRadius: '4px',
                      color: colors.primary,
                      fontSize: screen.isTiny ? '9px' : '10px',
                      cursor: 'pointer',
                      marginRight: '4px'
                    }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleRevokeInvite(invite.code)}
                    style={{
                      padding: screen.isTiny ? '2px 6px' : '4px 8px',
                      background: 'rgba(255, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 0, 0, 0.5)',
                      borderRadius: '4px',
                      color: colors.danger,
                      fontSize: screen.isTiny ? '9px' : '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Revoke
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderStatsTab = () => (
    <div style={{ padding: screen.isTiny ? '8px' : '12px' }}>
      <h4 style={{ 
        margin: '0 0 12px 0', 
        fontSize: screen.isTiny ? '14px' : '16px' 
      }}>
        Statistics
      </h4>
      
      {/* Network Status Section */}
      <div style={{
        marginBottom: '16px',
        padding: '12px',
        background: colors.bgTertiary,
        borderRadius: '8px',
        border: `1px solid ${colors.borderColor}`
      }}>
        <h5 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '14px',
          color: colors.primary
        }}>
          🌐 Network Status
        </h5>
        
        <div style={{ display: 'grid', gap: '6px', fontSize: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Gun.js:</span>
            <span style={{ 
              color: networkStats.gunStatus === 'connected' ? '#43e97b' : '#ff6666'
            }}>
              {networkStats.gunStatus} ({networkStats.gunPeers} peers)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>WebRTC:</span>
            <span style={{ 
              color: networkStats.webrtcStatus === 'initialized' ? colors.warning : colors.danger
            }}>
              {networkStats.webrtcStatus}
            </span>
          </div>
          {networkStats.peerId && networkStats.peerId !== 'Not initialized' && (
            <div style={{ 
              fontSize: '10px', 
              color: 'rgba(255, 255, 255, 0.5)',
              wordBreak: 'break-all'
            }}>
              Peer ID: {networkStats.peerId}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Active P2P Connections:</span>
            <span style={{ 
              color: networkStats.connectedPeers > 0 ? colors.success : colors.textMuted 
            }}>
              {networkStats.connectedPeers} {networkStats.connectedPeers > 0 ? '✓' : '(none)'}
            </span>
          </div>
          {networkStats.actualConnections && networkStats.actualConnections.length > 0 && (
            <div style={{ 
              marginTop: '8px', 
              padding: '8px', 
              background: colors.bgTertiary,
              borderRadius: '4px',
              fontSize: '11px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Connected to:</div>
              {networkStats.actualConnections.map((peerId, idx) => (
                <div key={idx} style={{ color: colors.success, wordBreak: 'break-all' }}>
                  • {peerId}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* General Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: screen.isTiny ? '1fr' : 'repeat(2, 1fr)',
        gap: '8px'
      }}>
        {Object.entries(stats).filter(([key]) => 
          !['gunPeers', 'webrtcStatus'].includes(key) // Filter out duplicate network stats
        ).map(([key, value]) => (
          <div key={key} style={{
            padding: screen.isTiny ? '6px' : '8px',
            background: colors.bgTertiary,
            borderRadius: '4px',
            fontSize: screen.isTiny ? '11px' : '12px'
          }}>
            <div style={{ 
              fontSize: screen.isTiny ? '9px' : '10px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '2px'
            }}>
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </div>
            <div style={{ 
              fontWeight: 'bold',
              color: colors.primary
            }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBackupTab = () => (
    <div style={{ padding: '12px' }}>
      <h3 style={{ 
        fontSize: '16px', 
        marginBottom: '12px',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        🔐 Secure Backup System
      </h3>

      {/* Storage Stats */}
      {storageStats && (
        <div style={{
          background: colors.bgTertiary,
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            📊 Storage Usage: {storageStats.totalSizeFormatted}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
            Total items: {storageStats.totalKeys}
          </div>
          
          {/* Category breakdown */}
          <div style={{ marginTop: '8px', fontSize: '11px' }}>
            {Object.entries(storageStats.categories).map(([cat, data]) => (
              <div key={cat} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '2px 0'
              }}>
                <span>{cat}:</span>
                <span>{data.count} items ({data.sizeFormatted})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backup Password */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
          Encryption Password (optional):
        </label>
        <input
          type="password"
          value={backupPassword}
          onChange={(e) => setBackupPassword(e.target.value)}
          placeholder="Enter password for encryption"
          style={{
            width: '100%',
            padding: '8px',
            background: colors.bgTertiary,
            border: `1px solid ${colors.borderColor}`,
            borderRadius: '6px',
            color: colors.textPrimary,
            fontSize: '12px'
          }}
        />
      </div>

      {/* Export/Import Buttons */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <button
          onClick={handleBackupExport}
          style={{
            padding: '10px',
            background: 'linear-gradient(135deg, #43e97b, #38f9d7)',
            border: 'none',
            borderRadius: '6px',
            color: colors.textPrimary,
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          📥 Export Backup
        </button>
        
        <label style={{
          padding: '10px',
          background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
          border: 'none',
          borderRadius: '6px',
          color: colors.textPrimary,
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          textAlign: 'center'
        }}>
          📤 Import Backup
          <input
            type="file"
            accept=".json"
            onChange={handleBackupImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Clear Data Options */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', marginBottom: '8px', color: colors.primary }}>
          ⚠️ Danger Zone
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px'
        }}>
          <button
            onClick={() => handleClearData('messages')}
            style={{
              padding: '8px',
              background: 'rgba(250, 112, 154, 0.1)',
              border: '1px solid rgba(250, 112, 154, 0.3)',
              borderRadius: '4px',
              color: colors.primary,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Clear Messages
          </button>
          <button
            onClick={() => handleClearData('cache')}
            style={{
              padding: '8px',
              background: 'rgba(250, 112, 154, 0.1)',
              border: '1px solid rgba(250, 112, 154, 0.3)',
              borderRadius: '4px',
              color: colors.primary,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Clear Cache
          </button>
          <button
            onClick={() => handleClearData('friends')}
            style={{
              padding: '8px',
              background: 'rgba(250, 112, 154, 0.1)',
              border: '1px solid rgba(250, 112, 154, 0.3)',
              borderRadius: '4px',
              color: colors.primary,
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            Clear Friends
          </button>
          <button
            onClick={() => handleClearData('all')}
            style={{
              padding: '8px',
              background: 'rgba(255, 0, 0, 0.2)',
              border: '1px solid rgba(255, 0, 0, 0.5)',
              borderRadius: '4px',
              color: colors.danger,
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🗑️ Clear ALL
          </button>
        </div>
      </div>

      {/* Status Message */}
      {backupStatus && (
        <div style={{
          padding: '8px',
          background: backupStatus.includes('✅') 
            ? 'rgba(67, 233, 123, 0.1)'
            : backupStatus.includes('❌')
            ? 'rgba(250, 112, 154, 0.1)'
            : 'rgba(255, 255, 255, 0.05)',
          borderRadius: '6px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          {backupStatus}
        </div>
      )}

      {/* Info */}
      <div style={{
        marginTop: '12px',
        padding: '8px',
        background: 'rgba(102, 126, 234, 0.1)',
        borderRadius: '6px',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.7)'
      }}>
        💡 Tips:
        <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
          <li>Always use a password for sensitive data</li>
          <li>Export backups regularly</li>
          <li>Test restore on a different device</li>
        </ul>
      </div>
    </div>
  );

  const renderLogsTab = () => (
    <div style={{ padding: '12px' }}>
      <h3 style={{ 
        fontSize: '16px', 
        marginBottom: '12px',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        📝 Logs
      </h3>
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        height: 'calc(100% - 100px)', // Adjust height to leave space for other tabs
        overflowY: 'auto',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.7)'
      }}>
        {/* Placeholder for logs */}
        <p>No logs available yet.</p>
      </div>
    </div>
  );

  const togglePrivateMode = () => {
    const newMode = !privateMode;
    setPrivateMode(newMode);
    localStorage.setItem('P2P_PRIVATE_MODE', newMode.toString());
    if (newMode) {
      localStorage.setItem('GUN_CUSTOM_PEERS', '');
      alert('Private mode enabled! Reload the app to use 100% P2P (no external servers).');
    } else {
      alert('Private mode disabled. Reload the app to use public relays.');
    }
  };

  const renderGunDBTab = () => (
    <div style={{ padding: '12px', height: '100%', overflowY: 'auto' }}>
      <h3 style={{ 
        fontSize: '16px', 
        marginBottom: '12px',
        background: 'linear-gradient(135deg, #667eea, #764ba2)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        🔫 Gun DB Configuration
      </h3>

      {/* Private Mode Toggle */}
      <div style={{
        background: privateMode ? 'rgba(67, 231, 123, 0.1)' : 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '12px',
        border: privateMode ? '1px solid #43e97b' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h4 style={{ fontSize: '14px', margin: 0, color: colors.textPrimary }}>
            🔒 100% Private Mode
          </h4>
          <button
            onClick={togglePrivateMode}
            style={{
              padding: '6px 12px',
              background: privateMode ? '#43e97b' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: privateMode ? '#000' : '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: privateMode ? '600' : '400'
            }}
          >
            {privateMode ? '✓ Enabled' : 'Disabled'}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
          {privateMode ? (
            <>
              <div style={{ color: '#43e97b', marginBottom: '4px' }}>
                ✅ <strong>You are 100% private!</strong>
              </div>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                <li>No external servers</li>
                <li>Direct P2P connections only</li>
                <li>Data shared only between friends</li>
                <li>Complete privacy & control</li>
              </ul>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '4px' }}>
                Using public relays for convenience:
              </div>
              <ul style={{ margin: '4px 0', paddingLeft: '20px', color: '#ffd700' }}>
                <li>Easier friend discovery</li>
                <li>Better availability</li>
                <li>Works behind firewalls</li>
                <li>But less private</li>
              </ul>
            </>
          )}
        </div>
      </div>



      {/* Current Status */}
      {!privateMode && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <h4 style={{ fontSize: '14px', marginBottom: '8px', color: colors.textPrimary }}>
            🌐 Active Relays ({currentRelays.length})
          </h4>
          <div style={{ fontSize: '11px' }}>
            {currentRelays.length > 0 ? (
              currentRelays.slice(0, 3).map((relay, i) => (
                <div key={i} style={{ 
                  padding: '2px 0',
                  color: 'rgba(255, 255, 255, 0.6)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  • {relay.replace('https://', '').replace('/gun', '')}
                </div>
              ))
            ) : (
              <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>No relays connected</span>
            )}
          </div>
        </div>
      )}

      {/* Custom Relay - Only show if not in private mode */}
      {!privateMode && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <h4 style={{ fontSize: '14px', marginBottom: '8px', color: colors.textPrimary }}>
            ⚙️ Add Custom Relay
          </h4>
        
        <div style={{ marginBottom: '12px' }}>
          <input
            type="text"
            value={customRelay}
            onChange={(e) => setCustomRelay(e.target.value)}
            placeholder="https://your-relay.com/gun or test01.local/gun"
            style={{
              width: '100%',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: colors.textPrimary,
              fontSize: '12px'
            }}
          />
          <button
            onClick={addCustomRelay}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: colors.primary,
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '12px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Add Custom Relay
          </button>
        </div>

        {/* Saved Relays */}
        {savedRelays.length > 0 && (
          <div>
            <h5 style={{ fontSize: '12px', marginBottom: '8px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Saved Relays:
            </h5>
            {savedRelays.map((relay, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '4px',
                marginBottom: '4px',
                fontSize: '11px'
              }}>
                <span style={{ flex: 1, wordBreak: 'break-all' }}>{relay}</span>
                <button
                  onClick={() => switchToRelay(relay)}
                  style={{
                    padding: '2px 6px',
                    marginLeft: '4px',
                    background: 'rgba(67, 231, 123, 0.2)',
                    border: 'none',
                    borderRadius: '3px',
                    color: '#43e97b',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  Use
                </button>
                <button
                  onClick={() => removeRelay(relay)}
                  style={{
                    padding: '2px 6px',
                    marginLeft: '4px',
                    background: 'rgba(255, 0, 0, 0.2)',
                    border: 'none',
                    borderRadius: '3px',
                    color: '#ff4444',
                    fontSize: '10px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={useAllRelays}
              style={{
                marginTop: '8px',
                padding: '6px 12px',
                background: 'rgba(67, 231, 123, 0.2)',
                border: '1px solid #43e97b',
                borderRadius: '6px',
                color: '#43e97b',
                fontSize: '12px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Use All Saved Relays
            </button>
          </div>
        )}

        </div>
      )}

      {/* Simple Status */}
      <div style={{
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        padding: '12px'
      }}>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
          <div>Device: {/Mobile|Android|iPhone/i.test(navigator.userAgent) ? '📱 Mobile' : '💻 Desktop'}</div>
          <div>Status: {privateMode ? '🔒 100% Private' : '🌐 Connected'}</div>
          <div>Network: P2P Active ✅</div>
        </div>
      </div>


    </div>
  );

  // Me Tab Content - User Info and Online Users
  const renderMeTab = () => {
    return (
      <div style={{ padding: '12px' }}>
        {/* Current User Info */}
        {currentUserInfo && (
          <div style={{
            background: 'rgba(0, 255, 0, 0.1)',
            border: '1px solid #00ff00',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#00ff00', fontSize: '14px' }}>
              👤 My Info
            </h4>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
              <div>Alias: {currentUserInfo.alias}</div>
              <div style={{ marginTop: '4px' }}>
                Public Key: 
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '9px',
                  wordBreak: 'break-all',
                  marginTop: '2px',
                  padding: '4px',
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '4px'
                }}>
                  {currentUserInfo.publicKey}
                </div>
              </div>
              <div style={{ marginTop: '4px' }}>
                WebRTC: {currentUserInfo.webrtcReady ? '🟢 Ready' : '🔴 Not Ready'}
                {!currentUserInfo.webrtcReady && (
                  <button
                    onClick={async () => {
                      try {
                        const user = gunAuthService.getCurrentUser();
                        if (user) {
                          console.log('🔧 Forcing WebRTC reconnect...');
                          await webrtcService.forceReconnect(user.pub);
                          loadCurrentUserInfo();
                        }
                      } catch (error) {
                        console.error('Failed to reconnect WebRTC:', error);
                      }
                    }}
                    style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      background: 'rgba(255, 165, 0, 0.2)',
                      border: '1px solid orange',
                      color: 'orange',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Reconnect
                  </button>
                )}
              </div>
              {currentUserInfo.peerId && (
                <div style={{ marginTop: '4px' }}>
                  Peer ID: 
                  <div style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '9px',
                    wordBreak: 'break-all',
                    marginTop: '2px'
                  }}>
                    {currentUserInfo.peerId}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* All Online Users */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#00ff00', fontSize: '14px' }}>
            🌐 Online Users ({allOnlineUsers.length})
          </h4>
          <button
            onClick={loadOnlineUsers}
            style={{
              marginBottom: '8px',
              padding: '4px 8px',
              background: 'rgba(0, 255, 0, 0.2)',
              border: '1px solid #00ff00',
              color: '#00ff00',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            Refresh
          </button>
          <div style={{
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {allOnlineUsers.length > 0 ? (
              allOnlineUsers.map((user, i) => (
                <div key={i} style={{
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '6px',
                  padding: '6px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                  border: user.publicKey === currentUserInfo?.publicKey ? 
                    '1px solid #00ff00' : '1px solid transparent'
                }}>
                  <div style={{ 
                    color: user.publicKey === currentUserInfo?.publicKey ? 
                      '#00ff00' : 'rgba(255, 255, 255, 0.8)'
                  }}>
                    {user.publicKey === currentUserInfo?.publicKey ? 
                      '👤 You' : 
                      (user.alias ? `👤 ${user.alias}` : `User ${i + 1}`)}
                  </div>
                  <div style={{ 
                    fontFamily: 'monospace', 
                    fontSize: '9px',
                    marginTop: '2px'
                  }}>
                    {user.publicKey.substring(0, 20)}...
                  </div>
                  <div style={{ 
                    color: '#666',
                    marginTop: '2px'
                  }}>
                    Last seen: {Math.floor((Date.now() - user.lastSeen) / 1000)}s ago
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
                No online users detected. Click refresh to check.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // P2P Tab Content
  const renderP2PTab = () => {
    const systemInfo = p2pDebugger.systemInfo;
    const logs = p2pLogs; // Use state logs
    
    return (
      <div style={{ padding: '12px' }}>
        {/* System Info */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#00ff00', fontSize: '14px' }}>
            📱 System Info
          </h4>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
            <div>{systemInfo?.deviceType} | Screen: {systemInfo?.screenSize}</div>
            <div>Browser: {systemInfo?.browser} | Platform: {systemInfo?.platform}</div>
            <div>Language: {systemInfo?.language} | Online: {systemInfo?.onLine ? '✅' : '❌'}</div>
          </div>
        </div>

        {/* WebRTC Status */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#00ff00', fontSize: '14px' }}>
            🔗 WebRTC Status
          </h4>
          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
            <div>Peer ID: {webrtcService.getPeerId() || 'Not initialized'}</div>
            <div>Status: {webrtcService.isReady() ? '🟢 Ready' : '🔴 Not Ready'}</div>
            <div>Connected Peers: {webrtcService.getConnectedPeers().length}</div>
          </div>
        </div>

        {/* P2P Actions */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '12px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#00ff00', fontSize: '14px' }}>
            🛠️ P2P Diagnostics
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                const result = await p2pDebugger.runFullDiagnostic();
                console.log('📊 Diagnostic Result:', result);
              }}
              style={{
                padding: '6px 12px',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '1px solid #00ff00',
                color: '#00ff00',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Run Diagnostic
            </button>
            <button
              onClick={() => {
                p2pDebugger.startMonitoring();
                console.log('👁️ P2P Monitoring active');
              }}
              style={{
                padding: '6px 12px',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '1px solid #00ff00',
                color: '#00ff00',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              Restart Monitor
            </button>
            <button
              onClick={() => {
                const stats = p2pDebugger.getStats();
                console.log('📈 P2P Stats:', stats);
              }}
              style={{
                padding: '6px 12px',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '1px solid #00ff00',
                color: '#00ff00',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              View Stats
            </button>
          </div>
        </div>

        {/* Recent Logs */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, color: '#00ff00', fontSize: '14px' }}>
              📜 P2P Logs ({logs.length})
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setP2PLogs([...p2pDebugger.logs]);
                }}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(0, 255, 0, 0.2)',
                  border: '1px solid #00ff00',
                  color: '#00ff00',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                Refresh
              </button>
              <button
                onClick={() => {
                  p2pDebugger.clearLogs();
                  setP2PLogs([]);
                  console.log('🧹 P2P logs cleared');
                }}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(255, 0, 0, 0.2)',
                  border: '1px solid #ff4444',
                  color: '#ff4444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
              >
                Clear
              </button>
            </div>
          </div>
          <div style={{
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.7)',
            maxHeight: '150px',
            overflowY: 'auto',
            fontFamily: 'monospace'
          }}>
            {logs.length > 0 ? logs.map((log, i) => {
              const logColor = log.level === 'error' ? '#ff4444' : 
                              log.level === 'success' ? '#00ff00' :
                              log.level === 'warning' ? '#ffaa00' : 
                              'rgba(255, 255, 255, 0.8)';
              return (
                <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '4px' }}>
                  <span style={{ color: '#666', fontSize: '9px' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  {' '}
                  <span style={{ color: logColor }}>{log.message}</span>
                  {log.data && Object.keys(log.data).length > 0 && (
                    <span style={{ color: '#666', fontSize: '9px' }}> {JSON.stringify(log.data)}</span>
                  )}
                </div>
              );
            }) : (
              <div>No P2P logs yet. Run diagnostic to generate logs.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'me':
        return renderMeTab();
      case 'friends':
        return renderUsersTab();
      case 'network':
        return renderStatsTab();
      case 'p2p':
        return renderP2PTab();
      case 'backup':
        return renderBackupTab();
      case 'gundb':
        return renderGunDBTab();
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  const containerStyle = isMobilePanel ? {
    width: '100%',
    height: '100%',
    background: colors.bgSecondary,
    color: colors.textPrimary,
    fontFamily: 'Inter, -apple-system, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  } : {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: screen.isTiny ? '240px' : screen.isMobile ? '280px' : '320px',
    background: colors.bgSecondary,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: `2px solid ${colors.primary}`,
    color: colors.textPrimary,
    fontFamily: 'Inter, -apple-system, sans-serif',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: screen.isTiny ? '6px 10px' : screen.isMobile ? '8px 12px' : '10px 14px',
        borderBottom: `1px solid ${colors.borderColor}`,
        background: colors.bgCard
      }}>
        <h3 style={{ 
          margin: 0, 
          fontSize: screen.isTiny ? '14px' : '16px',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🛠️ Enhanced Dev Tools
        </h3>
        <button
          onClick={onClose}
          style={{
            background: colors.bgTertiary,
            border: `1px solid ${colors.borderColor}`,
            borderRadius: '4px',
            color: colors.textPrimary,
            padding: screen.isTiny ? '4px 8px' : '6px 12px',
            fontSize: screen.isTiny ? '12px' : '14px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      {renderCompactTabs()}

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        {renderContent()}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

export default EnhancedDevTools;