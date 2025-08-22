import React, { useState, useEffect } from 'react';
import gunAuthService from '../services/gunAuthService';
import friendsService from '../services/friendsService';
import friendRequestService from '../services/friendRequestService';

function DiscoverUsers({ currentUser, existingFriends = [], pendingRequests = [] }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState({});

  useEffect(() => {
    loadOnlineUsers();
    // Removed polling - Gun.js subscriptions handle real-time updates
  }, [existingFriends]);

  const loadOnlineUsers = async () => {
    try {
      setLoading(true);
      const users = [];

      // Get all users from Gun's public space
      await new Promise((resolve) => {
        gunAuthService.gun.get('presence').map().once((data, key) => {
          if (data && key !== currentUser?.pub) {
            // Check if online (last seen within 2 minutes)
            const isOnline = data.lastSeen && (Date.now() - data.lastSeen < 120000);
            if (isOnline) {
              users.push({
                publicKey: key,
                nickname: data.nickname || 'Anonymous',
                status: data.status || 'online',
                lastSeen: data.lastSeen,
                avatar: data.avatar || null
              });
            }
          }
        });
        setTimeout(resolve, 1500); // Give time to load
      });

      // Filter out existing friends and pending requests
      const friendKeys = existingFriends.map(f => f.publicKey || f.pub);
      const pendingKeys = pendingRequests.map(r => r.to || r.from);

      const filteredUsers = users.filter(user =>
        !friendKeys.includes(user.publicKey) &&
        !pendingKeys.includes(user.publicKey) &&
        user.publicKey !== currentUser?.pub
      );

      setOnlineUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to load online users:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (user) => {
    try {
      setSendingRequest(prev => ({ ...prev, [user.publicKey]: true }));

      await friendRequestService.sendFriendRequest(
        user.publicKey,
        `Hi ${user.nickname}, I'd like to connect with you!`
      );

      // Remove from online users list
      setOnlineUsers(prev => prev.filter(u => u.publicKey !== user.publicKey));

      // Show success
      alert(`Friend request sent to ${user.nickname}!`);
    } catch (error) {
      alert(`Failed to send request: ${error.message}`);
    } finally {
      setSendingRequest(prev => ({ ...prev, [user.publicKey]: false }));
    }
  };

  const filteredUsers = onlineUsers.filter(user =>
    user.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <h2 style={{ margin: 0, color: 'white', fontSize: '24px' }}>
          Discover People
        </h2>
        <p style={{ margin: '5px 0 15px', color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
          Find and connect with online users
        </p>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search by nickname..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '25px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.9)',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* Users List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
            <div className="loading-spinner"></div>
            <p>Discovering users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
            <p style={{ fontSize: '18px', marginBottom: '10px' }}>😔 No users found</p>
            <p style={{ fontSize: '14px', opacity: 0.8 }}>
              {searchTerm ? 'Try a different search' : 'Be the first to invite friends!'}
            </p>
          </div>
        ) : (
          filteredUsers.map(user => (
            <div
              key={user.publicKey}
              style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Avatar */}
                <div style={{
                  width: '45px',
                  height: '45px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px'
                }}>
                  {user.nickname[0].toUpperCase()}
                </div>

                {/* User Info */}
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px', color: '#333' }}>
                    {user.nickname}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#4CAF50',
                      display: 'inline-block'
                    }}></span>
                    Online now
                  </div>
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={() => sendFriendRequest(user)}
                disabled={sendingRequest[user.publicKey]}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  border: 'none',
                  background: sendingRequest[user.publicKey]
                    ? '#ccc'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: sendingRequest[user.publicKey] ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {sendingRequest[user.publicKey] ? 'Sending...' : 'Add Friend'}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Online Count */}
      <div style={{
        padding: '15px',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        textAlign: 'center',
        color: 'white',
        fontSize: '14px'
      }}>
        {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} online
      </div>
    </div>
  );
}

export default DiscoverUsers;