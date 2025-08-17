import React, { useState, useEffect } from 'react';
import gunAuthService from '../services/gunAuthService';
import friendsService from '../services/friendsService';
import hybridGunService from '../services/hybridGunService';
import webrtcService from '../services/webrtcService';
import backupService from '../services/backupService';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../hooks/useResponsive';

/**
 * EnhancedDevTools Component
 * Advanced developer tools with user management, backup system, and mobile optimization
 */
function EnhancedDevTools({ isVisible, onClose, isMobilePanel = false, isAdmin = false, currentUser = null }) {
  const { colors } = useTheme();
  const screen = useResponsive();
  const [activeTab, setActiveTab] = useState('users');
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
  
  // Backup state
  const [backupPassword, setBackupPassword] = useState('');
  const [storageStats, setStorageStats] = useState(null);
  const [backupStatus, setBackupStatus] = useState('');

  // Load users (friends)
  useEffect(() => {
    if (!isVisible) return;
    loadUsers();
    loadInvites();
    loadStats();
  }, [isVisible]);

  const loadUsers = async () => {
    try {
      // If admin, load ALL Gun.js users
      if (isAdmin) {
        const allUsers = [];
        
        // Get all users from Gun database
        await new Promise((resolve) => {
          gunAuthService.getGun().get('~@').once().map().once((data, key) => {
            if (data && key && key.startsWith('~')) {
              const publicKey = key.slice(1); // Remove the ~ prefix
              
              // Get user profile
              gunAuthService.getGun().user(publicKey).get('profile').once((profile) => {
                if (profile) {
                  allUsers.push({
                    id: publicKey,
                    publicKey: publicKey,
                    name: profile.nickname || profile.username || 'Unknown',
                    username: profile.username,
                    createdAt: profile.createdAt,
                    isAdmin: profile.isAdmin || false,
                    status: publicKey === currentUser?.pub ? 'self' : 'user'
                  });
                }
              });
            }
          });
          
          // Wait a bit for all users to load
          setTimeout(resolve, 2000);
        });
        
        // Also add friends info
        const friends = await friendsService.getFriends();
        const friendKeys = new Set(friends.map(f => f.publicKey));
        
        // Merge friend status
        const mergedUsers = allUsers.map(user => ({
          ...user,
          status: user.status === 'self' ? 'self' : 
                  friendKeys.has(user.publicKey) ? 'friend' : 'user'
        }));
        
        setUsers(mergedUsers);
        return;
      }
      
      // Non-admin: just show friends
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
      console.error('Failed to load users:', error);
    }
  };

  const loadInvites = async () => {
    try {
      const myInvites = await friendsService.getMyInvites();
      setInvites(myInvites);
    } catch (error) {
      console.error('Failed to load invites:', error);
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
      console.error('Failed to load stats:', error);
    }
  };

  // Load storage stats for backup tab
  const loadStorageStats = () => {
    try {
      const stats = backupService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
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

  // Full Gun.js database reset
  // Admin functions for user management
  const handleDeleteUser = async (userId) => {
    if (!isAdmin) return;
    
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return;
    
    if (!confirm(`Delete user "${userToDelete.name}"?\nThis will remove all their data permanently!`)) return;
    
    try {
      // Delete user from Gun database
      const gun = gunAuthService.getGun();
      
      // Delete user profile and data
      gun.user(userId).get('profile').put(null);
      gun.user(userId).get('nickname').put(null);
      gun.user(userId).get('messages').put(null);
      gun.user(userId).get('friends').put(null);
      
      // Remove from auth index
      gun.get('~@').get(userId).put(null);
      
      setBackupStatus('✅ User deleted successfully');
      setTimeout(() => setBackupStatus(''), 3000);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      setBackupStatus(`❌ Failed to delete user: ${error.message}`);
    }
  };

  const handleBlockUser = async (userId) => {
    if (!isAdmin) return;
    
    const userToBlock = users.find(u => u.id === userId);
    if (!userToBlock) return;
    
    if (!confirm(`Block user "${userToBlock.name}"?`)) return;
    
    try {
      // Add to blocked list
      const gun = gunAuthService.getGun();
      gun.user().get('blocked').get(userId).put(true);
      
      // Also remove as friend if they are one
      if (userToBlock.status === 'friend') {
        await friendsService.removeFriend(userId);
      }
      
      setBackupStatus('✅ User blocked successfully');
      setTimeout(() => setBackupStatus(''), 3000);
      loadUsers();
    } catch (error) {
      console.error('Failed to block user:', error);
      setBackupStatus(`❌ Failed to block user: ${error.message}`);
    }
  };

  const handleRemoveFriend = async (userId) => {
    try {
      await friendsService.removeFriend(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  const handleGunDatabaseReset = async (quickReset = false) => {
    if (!quickReset) {
      const confirmed = window.confirm(
        '🔴 FULL DATABASE RESET\n\n' +
        'This will:\n' +
        '• Delete ALL Gun.js data\n' +
        '• Clear all localStorage\n' +
        '• Remove all user accounts\n' +
        '• Delete all messages & friends\n' +
        '• Reset to factory state\n\n' +
        'Are you absolutely sure?'
      );
      
      if (!confirmed) return;
      
      const doubleConfirm = window.confirm(
        '⚠️ FINAL WARNING\n\n' +
        'This action CANNOT be undone!\n' +
        'All data will be permanently deleted.\n\n' +
        'Type "RESET" to confirm:'
      );
      
      if (!doubleConfirm) return;
      
      const userInput = window.prompt('Type "RESET" to confirm database reset:');
      if (userInput !== 'RESET') {
        alert('Reset cancelled');
        return;
      }
    } else {
      // Quick reset for development (Ctrl+Click on button)
      if (!window.confirm('Quick reset - Delete all data now?')) return;
    }
    
    try {
      setBackupStatus('🔄 Resetting database...');
      
      // Clear all Gun.js specific keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('gun/') ||
          key.startsWith('_gun_') ||
          key.includes('SEA') ||
          key === 'gun' ||
          key === 'whisperz_' ||
          key.startsWith('whisperz_')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Remove Gun keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear hybrid service data
      if (hybridGunService.clearAllData) {
        await hybridGunService.clearAllData();
      }
      
      // Clear all remaining localStorage
      localStorage.clear();
      
      // Clear session storage
      sessionStorage.clear();
      
      // Clear IndexedDB if exists
      if (window.indexedDB) {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          await indexedDB.deleteDatabase(db.name);
        }
      }
      
      setBackupStatus('✅ Database reset complete. Reloading...');
      
      // Wait a moment then reload
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 1500);
      
    } catch (error) {
      console.error('Database reset error:', error);
      setBackupStatus(`❌ Reset failed: ${error.message}`);
      alert('Failed to reset database: ' + error.message);
    }
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
      {['users', 'invites', 'stats', 'backup', 'logs'].map(tab => (
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
          {isAdmin ? `All Users (${users.length})` : `Friends (${users.length})`}
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
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {user.name}
                  {user.isAdmin && (
                    <span style={{
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      color: '#fff',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '9px',
                      fontWeight: 'bold'
                    }}>ADMIN</span>
                  )}
                  {user.status === 'self' && (
                    <span style={{
                      background: colors.success,
                      color: '#fff',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '9px'
                    }}>YOU</span>
                  )}
                  {user.status === 'friend' && (
                    <span style={{
                      background: colors.primary,
                      color: '#fff',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '9px'
                    }}>FRIEND</span>
                  )}
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
              <div style={{ display: 'flex', gap: '4px' }}>
                {isAdmin && user.status !== 'self' && (
                  <>
                    <button
                      onClick={() => handleBlockUser(user.id)}
                      style={{
                        padding: screen.isTiny ? '2px 6px' : '4px 8px',
                        background: 'rgba(255, 165, 0, 0.2)',
                        border: '1px solid rgba(255, 165, 0, 0.5)',
                        borderRadius: '4px',
                        color: colors.warning,
                        fontSize: screen.isTiny ? '9px' : '10px',
                        cursor: 'pointer'
                      }}
                      title="Block user"
                    >
                      Block
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      style={{
                        padding: screen.isTiny ? '2px 6px' : '4px 8px',
                        background: 'rgba(255, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 0, 0, 0.5)',
                        borderRadius: '4px',
                        color: colors.danger,
                        fontSize: screen.isTiny ? '9px' : '10px',
                        cursor: 'pointer'
                      }}
                      title="Delete user permanently"
                    >
                      Delete
                    </button>
                  </>
                )}
                {user.status === 'friend' && (
                  <button
                    onClick={() => handleRemoveFriend(user.id)}
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
                    Unfriend
                  </button>
                )}
              </div>
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

      {/* Full Database Reset */}
      <div style={{ 
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(255, 0, 0, 0.05)',
        border: '2px dashed rgba(255, 0, 0, 0.3)',
        borderRadius: '8px'
      }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '600',
          marginBottom: '10px', 
          color: colors.danger,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔴 Gun.js Database Reset
        </div>
        <div style={{
          fontSize: '11px',
          color: colors.textSecondary,
          marginBottom: '12px',
          lineHeight: '1.4'
        }}>
          Complete factory reset. Deletes ALL Gun.js data, accounts, messages, and friends. 
          This cannot be undone!
        </div>
        <button
          onClick={(e) => handleGunDatabaseReset(e.ctrlKey || e.metaKey)}
          title="Click to reset database (Ctrl+Click for quick reset)"
          style={{
            width: '100%',
            padding: '10px',
            background: 'linear-gradient(135deg, #ff0000, #cc0000)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(255, 0, 0, 0.3)'
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'linear-gradient(135deg, #ff3333, #ff0000)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'linear-gradient(135deg, #ff0000, #cc0000)';
          }}
        >
          🔄 Full Database Reset
        </button>
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

  const renderContent = () => {
    switch(activeTab) {
      case 'users':
        return renderUsersTab();
      case 'invites':
        return renderInvitesTab();
      case 'stats':
        return renderStatsTab();
      case 'backup':
        return renderBackupTab();
      case 'logs':
        return renderLogsTab();
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