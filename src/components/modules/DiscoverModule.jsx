import React, { useState, useEffect } from 'react';
import gunAuthService from '../../services/gunAuthService';
import friendsService from '../../services/friendsService';

/**
 * DiscoverModule - IRC-style user discovery
 * Clean, text-based interface for finding online users
 */
function DiscoverModule({ currentUser, onUserSelect }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    discoverUsers();
    // Removed polling - Gun.js subscriptions handle real-time updates
  }, [currentUser]);

  const discoverUsers = async () => {
    try {
      setLoading(true);
      const users = [];

      // Scan for online users in Gun's public presence space
      await new Promise((resolve) => {
        gunAuthService.gun.get('~@').map().once((data, key) => {
          if (data && key && key !== currentUser?.pub) {
            // Check Gun's user space for profiles
            gunAuthService.gun.user(key).get('profile').once((profile) => {
              if (profile?.nickname) {
                users.push({
                  publicKey: key,
                  nickname: profile.nickname,
                  bio: profile.bio || '',
                  lastSeen: profile.lastSeen || Date.now()
                });
              }
            });
          }
        });

        // Also check presence space
        gunAuthService.gun.get('presence').map().once((data, key) => {
          if (data && key !== currentUser?.pub) {
            const isOnline = data.lastSeen && (Date.now() - data.lastSeen < 300000); // 5 minutes
            if (isOnline && !users.find(u => u.publicKey === key)) {
              users.push({
                publicKey: key,
                nickname: data.nickname || `user_${key.slice(0, 6)}`,
                status: data.status || 'online',
                lastSeen: data.lastSeen
              });
            }
          }
        });

        setTimeout(resolve, 2000);
      });

      // Filter out existing friends
      const friends = await friendsService.getFriends();
      const friendKeys = friends.map(f => f.publicKey || f.pub);

      const filteredUsers = users.filter(user =>
        !friendKeys.includes(user.publicKey) &&
        user.publicKey !== currentUser?.pub
      );

      setOnlineUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to discover users:', error);
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (user) => {
    try {
      // Generate an invite and share it with the user
      const { inviteCode } = await friendsService.generateInvite();

      // Store invite request in public space for the user to see
      gunAuthService.gun.get('friend_requests')
        .get(user.publicKey)
        .get(inviteCode)
        .put({
          from: currentUser.pub,
          fromNickname: currentUser.alias || 'Anonymous',
          inviteCode: inviteCode,
          timestamp: Date.now()
        });

      alert(`Friend request sent to ${user.nickname}`);

      // Remove from list
      setOnlineUsers(prev => prev.filter(u => u.publicKey !== user.publicKey));
    } catch (error) {
      alert(`Failed to add user: ${error.message}`);
    }
  };

  const filteredUsers = onlineUsers.filter(user =>
    user.nickname && user.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a1a',
      color: '#e0e0e0',
      fontFamily: 'Consolas, Monaco, "Courier New", monospace'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ marginBottom: '10px' }}>
          <span style={{ color: '#00ff00' }}>[DISCOVER]</span>
          <span style={{ color: '#808080', marginLeft: '10px' }}>
            {filteredUsers.length} users online
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="/search nickname..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* User List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px'
      }}>
        {loading ? (
          <div style={{ color: '#808080', padding: '20px' }}>
            Scanning network...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ color: '#808080', padding: '20px' }}>
            No users found. {searchTerm && 'Try a different search.'}
          </div>
        ) : (
          <div style={{ fontSize: '14px' }}>
            {filteredUsers.map(user => (
              <div
                key={user.publicKey}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #2a2a2a',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#2a2a2a'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => setSelectedUser(user)}
              >
                <div>
                  <span style={{ color: '#00ff00' }}>@{user.nickname}</span>
                  <span style={{ color: '#606060', marginLeft: '10px', fontSize: '12px' }}>
                    {user.publicKey.slice(0, 8)}...
                  </span>
                  {user.bio && (
                    <div style={{ color: '#808080', fontSize: '12px', marginTop: '2px' }}>
                      {user.bio}
                    </div>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addUser(user);
                  }}
                  style={{
                    padding: '5px 15px',
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    color: '#00ff00',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '12px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#333';
                    e.target.style.borderColor = '#00ff00';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#2a2a2a';
                    e.target.style.borderColor = '#444';
                  }}
                >
                  [ADD]
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected User Info */}
      {selectedUser && (
        <div style={{
          padding: '15px',
          borderTop: '1px solid #333',
          background: '#2a2a2a'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ color: '#808080' }}>Selected: </span>
            <span style={{ color: '#00ff00' }}>@{selectedUser.nickname}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#606060' }}>
            Public Key: {selectedUser.publicKey}
          </div>
          <button
            onClick={() => addUser(selectedUser)}
            style={{
              marginTop: '10px',
              padding: '8px 20px',
              background: '#1a1a1a',
              border: '1px solid #00ff00',
              color: '#00ff00',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: '14px',
              width: '100%'
            }}
          >
            Send Friend Request
          </button>
        </div>
      )}
    </div>
  );
}

export default DiscoverModule;