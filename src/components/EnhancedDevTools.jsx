import React, { useState, useEffect } from 'react';
import friendsService from '../services/friendsService';
import gunAuthService from '../services/gunAuthService';

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

  useEffect(() => {
    if (isVisible) {
      loadFriends();
      loadInvites();
      loadAllUsers();
      discoverUsers();
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
      await friendsService.removeFriend(publicKey);
      setStatus('✅ Friend removed');
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