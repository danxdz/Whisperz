import React, { useState, useEffect } from 'react';
import friendsService from '../services/friendsService';
import gunAuthService from '../services/gunAuthService';
import backupService from '../services/backupService';
import securityTriggerService from '../services/securityTriggerService';

/**
 * DevTools Component with Full User Management (CRUD)
 * Admin interface for managing all users, friends, and invites
 */
function EnhancedDevTools({ isVisible, onClose, isMobilePanel = false }) {
  const [activeTab, setActiveTab] = useState('users');
  const [friends, setFriends] = useState([]);
  const [invites, setInvites] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [discoveredUsers, setDiscoveredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newUserForm, setNewUserForm] = useState({ nickname: '', publicKey: '' });
  const [backupPassword, setBackupPassword] = useState('');
  const [securitySettings, setSecuritySettings] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (isVisible) {
      loadFriends();
      loadInvites();
      loadAllUsers();
      discoverUsers();
      loadSecuritySettings();
    }
  }, [isVisible]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      await friendsService.initialize();
      const friendsList = await friendsService.getFriends();
      setFriends(friendsList);
      setStatus(`✅ Loaded ${friendsList.length} friends`);
    } catch (error) {
      console.error('Failed to load friends:', error);
      setStatus(`❌ Failed to load friends: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadInvites = async () => {
    try {
      const invitesList = await friendsService.getMyInvites();
      setInvites(invitesList);
    } catch (error) {
      console.error('Failed to load invites:', error);
    }
  };

  const generateInvite = async () => {
    try {
      setLoading(true);
      const result = await friendsService.generateInvite();
      await navigator.clipboard.writeText(result.inviteLink);
      setStatus(`✅ Invite generated and copied! Code: ${result.inviteCode.substring(0, 8)}...`);
      loadInvites();
    } catch (error) {
      console.error('Failed to generate invite:', error);
      setStatus(`❌ Failed to generate invite: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (publicKey) => {
    if (!confirm('Remove this friend?')) return;
    try {
      setLoading(true);
      const result = await friendsService.removeFriend(publicKey);
      if (result.warning) {
        setStatus(`✅ Friend removed (${result.warning})`);
      } else {
        setStatus('✅ Friend removed');
      }
      loadFriends();
    } catch (error) {
      setStatus(`❌ Failed to remove friend: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (inviteCode) => {
    if (!confirm('Revoke this invite?')) return;
    try {
      setLoading(true);
      await friendsService.revokeInvite(inviteCode);
      setStatus('✅ Invite revoked');
      loadInvites();
    } catch (error) {
      setStatus(`❌ Failed to revoke invite: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Clean up invalid/duplicate friends
  const cleanupFriends = async () => {
    if (!confirm('Clean up invalid and duplicate friends?\n\nThis will remove friends with invalid public keys or corrupted data.')) return;
    try {
      setLoading(true);
      const result = await friendsService.cleanupFriends();
      setStatus(`🧹 Cleanup complete! Removed ${result.removedCount} invalid friends`);
      loadFriends();
      loadAllUsers();
    } catch (error) {
      setStatus(`❌ Cleanup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load all users from Gun network
  const loadAllUsers = async () => {
    try {
      const gun = gunAuthService.gun;
      const usersMap = new Map();
      
      // Get users from presence data
      await new Promise((resolve) => {
        gun.get('presence').map().once((data, key) => {
          if (data && key && key !== '_' && !key.startsWith('~')) {
            usersMap.set(key, {
              publicKey: key,
              nickname: data.nickname || 'Unknown',
              lastSeen: data.lastSeen,
              status: data.status,
              isOnline: data.status === 'online' && data.lastSeen && (Date.now() - data.lastSeen) < 120000
            });
          }
        });
        setTimeout(resolve, 2000);
      });

      // Get users from alias registry
      await new Promise((resolve) => {
        gun.get('~@').map().once((alias, key) => {
          if (alias && key && key !== '_') {
            const pubKey = key.replace('~', '').split('.')[0];
            if (pubKey && !usersMap.has(pubKey)) {
              usersMap.set(pubKey, {
                publicKey: pubKey,
                nickname: alias,
                lastSeen: null,
                status: 'unknown',
                isOnline: false
              });
            } else if (pubKey && usersMap.has(pubKey)) {
              // Update nickname from alias if better
              const existing = usersMap.get(pubKey);
              if (existing.nickname === 'Unknown' || !existing.nickname) {
                existing.nickname = alias;
              }
            }
          }
        });
        setTimeout(resolve, 2000);
      });

      setAllUsers(Array.from(usersMap.values()));
    } catch (error) {
      console.error('Failed to load all users:', error);
      setStatus(`❌ Failed to load users: ${error.message}`);
    }
  };

  // Discover users by scanning Gun network
  const discoverUsers = async () => {
    try {
      const discoveredMap = new Map();
      const gun = gunAuthService.gun;
      const currentUser = gunAuthService.getCurrentUser();
      const friendsList = await friendsService.getFriends();
      const friendKeys = friendsList.map(f => f.publicKey);

      // Scan for active users
      await new Promise((resolve) => {
        gun.get('presence').map().once((data, key) => {
          if (data && key && key !== currentUser?.pub && !friendKeys.includes(key)) {
            discoveredMap.set(key, {
              publicKey: key,
              nickname: data.nickname || key.substring(0, 8) + '...',
              status: data.status,
              lastSeen: data.lastSeen,
              isOnline: data.status === 'online' && data.lastSeen && (Date.now() - data.lastSeen) < 300000,
              source: 'presence'
            });
          }
        });
        setTimeout(resolve, 3000);
      });

      setDiscoveredUsers(Array.from(discoveredMap.values()));
    } catch (error) {
      console.error('Failed to discover users:', error);
    }
  };

  // Add user as friend directly
  const addUserAsFriend = async (user) => {
    try {
      setLoading(true);
      await friendsService.addFriend(user.publicKey, user.nickname);
      setStatus(`✅ Added ${user.nickname} as friend!`);
      loadFriends();
      loadAllUsers();
    } catch (error) {
      setStatus(`❌ Failed to add friend: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Create/Add user manually
  const createUser = async () => {
    if (!newUserForm.nickname || !newUserForm.publicKey) {
      setStatus('❌ Please fill in both nickname and public key');
      return;
    }
    
    try {
      setLoading(true);
      await friendsService.addFriend(newUserForm.publicKey, newUserForm.nickname);
      setStatus(`✅ User ${newUserForm.nickname} added as friend!`);
      setNewUserForm({ nickname: '', publicKey: '' });
      loadFriends();
      loadAllUsers();
    } catch (error) {
      setStatus(`❌ Failed to add user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Block/Unblock user
  const toggleBlockUser = async (publicKey, isBlocked) => {
    try {
      setLoading(true);
      if (isBlocked) {
        await friendsService.unblockUser(publicKey);
        setStatus('✅ User unblocked');
      } else {
        await friendsService.blockUser(publicKey);
        setStatus('✅ User blocked');
      }
      loadAllUsers();
    } catch (error) {
      setStatus(`❌ Failed to ${isBlocked ? 'unblock' : 'block'} user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search
  const filteredUsers = allUsers.filter(user => 
    user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.publicKey.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Load security settings
  const loadSecuritySettings = () => {
    try {
      const settings = securityTriggerService.getStatus();
      setSecuritySettings(settings);
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  // Backup functions
  const createBackup = async () => {
    if (!backupPassword) {
      setStatus('❌ Password required for encrypted backup');
      return;
    }
    
    try {
      setLoading(true);
      const backup = await backupService.createBackup(backupPassword);
      
      // Download backup file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `whisperz-backup-${timestamp}.json`;
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStatus(`✅ Backup created and downloaded: ${filename}`);
      setBackupPassword(''); // Clear password for security
      
    } catch (error) {
      setStatus(`❌ Backup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async () => {
    if (!selectedFile) {
      setStatus('❌ Please select a backup file');
      return;
    }
    
    if (!backupPassword) {
      setStatus('❌ Password required for encrypted backup');
      return;
    }
    
    try {
      setLoading(true);
      const result = await backupService.importFromFile(selectedFile, backupPassword);
      
      if (result.success) {
        setStatus(`✅ Backup restored: ${result.restoredCount} items restored`);
        setSelectedFile(null);
        setBackupPassword('');
        
        // Refresh all data
        setTimeout(() => {
          loadFriends();
          loadInvites();
          loadAllUsers();
          loadSecuritySettings();
        }, 1000);
      } else {
        setStatus(`❌ Restore failed: ${result.error}`);
      }
      
    } catch (error) {
      setStatus(`❌ Restore failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Security functions
  const configureSecurityTrigger = () => {
    const maxAttempts = prompt('Max failed login attempts before trigger (default: 3):', '3');
    const lockoutMinutes = prompt('Lockout duration in minutes (default: 30):', '30');
    const enableDestruction = confirm('Enable data destruction on security trigger?\n\n⚠️ WARNING: This will permanently wipe all data after failed attempts!');
    
    if (maxAttempts && lockoutMinutes) {
      try {
        securityTriggerService.configure({
          maxAttempts: parseInt(maxAttempts),
          lockoutDuration: parseInt(lockoutMinutes) * 60 * 1000,
          destructionEnabled: enableDestruction
        });
        
        setStatus(`✅ Security trigger configured: ${maxAttempts} attempts, ${lockoutMinutes}min lockout, destruction ${enableDestruction ? 'ENABLED' : 'disabled'}`);
        loadSecuritySettings();
        
      } catch (error) {
        setStatus(`❌ Configuration failed: ${error.message}`);
      }
    }
  };

  const createEmergencyKey = () => {
    try {
      const result = securityTriggerService.createEmergencyKey();
      setStatus(`🆘 Emergency key created! Valid until: ${result.validUntil}`);
    } catch (error) {
      setStatus(`❌ Emergency key creation failed: ${error.message}`);
    }
  };

  const showEmergencyMethods = () => {
    const methods = securityTriggerService.getEmergencyMethods();
    let message = '🆘 EMERGENCY RESET METHODS:\n\n';
    
    methods.methods.forEach((method, index) => {
      message += `${index + 1}. ${method.name}\n`;
      message += `   Trigger: ${method.trigger}\n`;
      message += `   ${method.description}\n`;
      message += `   Available: ${method.availability}\n\n`;
    });
    
    message += `Current Status:\n`;
    message += `Failed Attempts: ${methods.currentStatus.failedAttempts}/${methods.currentStatus.maxAttempts}\n`;
    message += `Locked: ${methods.currentStatus.isLocked ? 'YES' : 'No'}\n`;
    message += `Destruction: ${methods.currentStatus.destructionEnabled ? 'ENABLED' : 'Disabled'}`;
    
    alert(message);
  };

  const resetSecurityTrigger = () => {
    if (confirm('Reset security trigger and clear all failed attempts?')) {
      try {
        securityTriggerService.reset();
        setStatus('✅ Security trigger reset');
        loadSecuritySettings();
      } catch (error) {
        setStatus(`❌ Reset failed: ${error.message}`);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#1a1a2e',
        color: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #333333',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#ffffff' }}>🛠️ User Management (CRUD)</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#cccccc',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '6px 12px',
              backgroundColor: activeTab === 'users' ? '#667eea' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            All Users ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            style={{
              padding: '6px 12px',
              backgroundColor: activeTab === 'discover' ? '#667eea' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Discover ({discoveredUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            style={{
              padding: '6px 12px',
              backgroundColor: activeTab === 'friends' ? '#667eea' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            style={{
              padding: '6px 12px',
              backgroundColor: activeTab === 'invites' ? '#667eea' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Invites ({invites.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            style={{
              padding: '6px 12px',
              backgroundColor: activeTab === 'add' ? '#28a745' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            + Add User
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            style={{
              padding: '6px 12px',
              backgroundColor: activeTab === 'backup' ? '#17a2b8' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            💾 Backup
          </button>
          <button
            onClick={() => setActiveTab('security')}
            style={{
              padding: '6px 12px',
              backgroundColor: activeTab === 'security' ? '#dc3545' : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🔒 Security
          </button>
        </div>

        {/* Status */}
        {status && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: status.includes('✅') ? '#0d4f3c' : '#4a1a1a',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '12px'
          }}>
            {status}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'users' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>All Users</h4>
                <button
                  onClick={loadAllUsers}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {loading ? 'Loading...' : 'Scan Network'}
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Search users by nickname or public key..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '15px',
                  backgroundColor: '#2a2a3e',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px'
                }}
              />
              
              {filteredUsers.length === 0 ? (
                <p style={{ color: '#999', fontSize: '14px' }}>No users found. Click "Scan Network" to discover users.</p>
              ) : (
                filteredUsers.map(user => (
                  <div key={user.publicKey} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    backgroundColor: '#2a2a3e',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    border: user.isOnline ? '1px solid #28a745' : '1px solid transparent'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 'bold' }}>{user.nickname}</div>
                        {user.isOnline && <span style={{ color: '#28a745', fontSize: '12px' }}>🟢 Online</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {user.publicKey.substring(0, 30)}...
                      </div>
                      {user.lastSeen && (
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          Last seen: {Math.floor((Date.now() - user.lastSeen) / 1000)}s ago
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                      <button
                        onClick={() => addUserAsFriend(user)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#007bff',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        Add Friend
                      </button>
                      <button
                        onClick={() => toggleBlockUser(user.publicKey, false)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        Block
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'discover' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>Discover New Users</h4>
                <button
                  onClick={discoverUsers}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {loading ? 'Scanning...' : 'Discover'}
                </button>
              </div>
              
              {discoveredUsers.length === 0 ? (
                <p style={{ color: '#999', fontSize: '14px' }}>No new users discovered. Click "Discover" to scan for users.</p>
              ) : (
                discoveredUsers.map(user => (
                  <div key={user.publicKey} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    backgroundColor: '#2a2a3e',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    border: user.isOnline ? '1px solid #ffc107' : '1px solid transparent'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontWeight: 'bold' }}>{user.nickname}</div>
                        {user.isOnline && <span style={{ color: '#ffc107', fontSize: '12px' }}>🟢 Online</span>}
                        <span style={{ fontSize: '10px', color: '#666' }}>({user.source})</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {user.publicKey.substring(0, 25)}...
                      </div>
                    </div>
                    <button
                      onClick={() => addUserAsFriend(user)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Add Friend
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div>
              <h4 style={{ margin: '0 0 15px 0' }}>Add User Manually</h4>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Nickname:</label>
                <input
                  type="text"
                  placeholder="Enter user nickname"
                  value={newUserForm.nickname}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, nickname: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#2a2a3e',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Public Key:</label>
                <textarea
                  placeholder="Enter user's public key"
                  value={newUserForm.publicKey}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, publicKey: e.target.value }))}
                  style={{
                    width: '100%',
                    height: '80px',
                    padding: '8px',
                    backgroundColor: '#2a2a3e',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '12px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <button
                onClick={createUser}
                disabled={loading || !newUserForm.nickname || !newUserForm.publicKey}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: loading || !newUserForm.nickname || !newUserForm.publicKey ? '#666' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading || !newUserForm.nickname || !newUserForm.publicKey ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {loading ? 'Adding User...' : 'Add User as Friend'}
              </button>

              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#1a2332', borderRadius: '4px', fontSize: '11px', color: '#999' }}>
                💡 <strong>How to get a public key:</strong><br/>
                • Ask the user to share their public key from their profile<br/>
                • Copy it from invite links (the long string after the domain)<br/>
                • Find it in browser developer tools under Gun user data
              </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>Friends</h4>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={cleanupFriends}
                    disabled={loading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#ffc107',
                      color: '#000',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🧹 Cleanup
                  </button>
                  <button
                    onClick={loadFriends}
                    disabled={loading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
              </div>
              
              {friends.length === 0 ? (
                <p style={{ color: '#999', fontSize: '14px' }}>No friends yet. Generate an invite to add friends!</p>
              ) : (
                friends.map(friend => (
                  <div key={friend.publicKey} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px',
                    backgroundColor: '#2a2a3e',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{friend.nickname}</div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {friend.publicKey.substring(0, 20)}...
                      </div>
                      {friend.conversationId && (
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          Chat ID: {friend.conversationId.substring(0, 8)}...
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeFriend(friend.publicKey)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'invites' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>Invites</h4>
                <button
                  onClick={generateInvite}
                  disabled={loading}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#007bff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {loading ? 'Generating...' : '+ Generate Invite'}
                </button>
              </div>

              {invites.length === 0 ? (
                <p style={{ color: '#999', fontSize: '14px' }}>No invites generated yet.</p>
              ) : (
                invites.map(invite => (
                  <div key={invite.code} style={{
                    padding: '10px',
                    backgroundColor: '#2a2a3e',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: invite.used ? '#28a745' : invite.revoked ? '#dc3545' : '#ffc107' }}>
                          {invite.used ? '✅ Used' : invite.revoked ? '❌ Revoked' : '⏳ Active'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          Code: {invite.code.substring(0, 8)}...
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          Created: {new Date(invite.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {!invite.used && !invite.revoked && (
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(invite.inviteLink);
                              setStatus('✅ Invite link copied!');
                            }}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#17a2b8',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => revokeInvite(invite.code)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#dc3545',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                          >
                            Revoke
                          </button>
                        </div>
                      )}
                    </div>
                    {invite.used && invite.usedBy && (
                      <div style={{ fontSize: '10px', color: '#28a745', marginTop: '5px' }}>
                        Used by: {invite.usedBy.substring(0, 20)}...
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'backup' && (
            <div>
              <h4 style={{ margin: '0 0 15px 0' }}>Backup & Restore</h4>
              
              {/* Create Backup */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#1a2332', borderRadius: '4px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#17a2b8' }}>💾 Create Backup</h5>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#999' }}>
                  Create an encrypted backup of all your data including friends, messages, and settings.
                </p>
                
                <input
                  type="password"
                  placeholder="Backup encryption password"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '10px',
                    backgroundColor: '#2a2a3e',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                
                <button
                  onClick={createBackup}
                  disabled={loading || !backupPassword}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: loading || !backupPassword ? '#666' : '#17a2b8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading || !backupPassword ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {loading ? 'Creating Backup...' : '💾 Create & Download Backup'}
                </button>
              </div>

              {/* Restore Backup */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#1a2332', borderRadius: '4px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#28a745' }}>📥 Restore Backup</h5>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#999' }}>
                  Restore data from a previous backup. This will replace current data.
                </p>
                
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '10px',
                    backgroundColor: '#2a2a3e',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                
                <input
                  type="password"
                  placeholder="Backup decryption password"
                  value={backupPassword}
                  onChange={(e) => setBackupPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginBottom: '10px',
                    backgroundColor: '#2a2a3e',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                
                <button
                  onClick={restoreBackup}
                  disabled={loading || !selectedFile || !backupPassword}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: loading || !selectedFile || !backupPassword ? '#666' : '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading || !selectedFile || !backupPassword ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {loading ? 'Restoring...' : '📥 Restore from Backup'}
                </button>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#1a2332', borderRadius: '4px', fontSize: '11px', color: '#999' }}>
                💡 <strong>Security Tips:</strong><br/>
                • Use a strong password for backup encryption<br/>
                • Store backups in multiple secure locations<br/>
                • Test restore process periodically<br/>
                • Backups include all sensitive data - protect accordingly
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h4 style={{ margin: '0 0 15px 0' }}>Security & Anti-Tamper</h4>
              
              {/* Current Status */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#1a2332', borderRadius: '4px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#ffc107' }}>🔒 Current Security Status</h5>
                <div style={{ fontSize: '12px' }}>
                  <div>Failed Attempts: <span style={{ color: securitySettings.failedAttempts > 0 ? '#dc3545' : '#28a745' }}>
                    {securitySettings.failedAttempts || 0}/{securitySettings.maxAttempts || 3}
                  </span></div>
                  <div>Device Locked: <span style={{ color: securitySettings.isLocked ? '#dc3545' : '#28a745' }}>
                    {securitySettings.isLocked ? 'YES' : 'No'}
                  </span></div>
                  <div>Data Destruction: <span style={{ color: securitySettings.destructionEnabled ? '#dc3545' : '#666' }}>
                    {securitySettings.destructionEnabled ? 'ENABLED' : 'Disabled'}
                  </span></div>
                  {securitySettings.timeRemaining > 0 && (
                    <div>Unlock In: <span style={{ color: '#ffc107' }}>
                      {Math.ceil(securitySettings.timeRemaining / (60 * 1000))} minutes
                    </span></div>
                  )}
                </div>
              </div>

              {/* Security Configuration */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#1a2332', borderRadius: '4px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>⚙️ Configure Security Trigger</h5>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#999' }}>
                  Set up automatic security response to failed login attempts.
                </p>
                
                <button
                  onClick={configureSecurityTrigger}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginBottom: '10px'
                  }}
                >
                  ⚙️ Configure Security Trigger
                </button>
                
                <button
                  onClick={resetSecurityTrigger}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#ffc107',
                    color: '#000',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🔓 Reset Security Trigger
                </button>
              </div>

              {/* Emergency Reset */}
              <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#1a2332', borderRadius: '4px' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#28a745' }}>🆘 Emergency Reset System</h5>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#999' }}>
                  Multiple ways to reset security locks when everything goes wrong.
                </p>
                
                <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                  <button
                    onClick={createEmergencyKey}
                    style={{
                      padding: '8px',
                      backgroundColor: '#28a745',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🆘 Create Emergency Key
                  </button>
                  
                  <button
                    onClick={showEmergencyMethods}
                    style={{
                      padding: '8px',
                      backgroundColor: '#17a2b8',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    📋 Show All Emergency Methods
                  </button>
                </div>
              </div>

              <div style={{ padding: '10px', backgroundColor: '#2a1a1a', borderRadius: '4px', fontSize: '11px', color: '#dc3545', border: '1px solid #dc3545' }}>
                ⚠️ <strong>DANGER ZONE:</strong><br/>
                • Security triggers can permanently destroy all data<br/>
                • Emergency reset methods bypass all security<br/>
                • Test emergency methods before relying on them<br/>
                • Consider the paranoia level you actually need
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '15px', 
          paddingTop: '15px', 
          borderTop: '1px solid #333',
          fontSize: '11px',
          color: '#666'
        }}>
          💡 <strong>CRUD Operations:</strong> Create (Add), Read (View/Search), Update (Edit), Delete (Remove/Block) users and friends.
        </div>
      </div>
    </div>
  );
}

export default EnhancedDevTools;