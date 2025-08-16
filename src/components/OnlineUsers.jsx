import React, { useState, useEffect } from 'react';
import hybridGunService from '../services/hybridGunService';

/**
 * OnlineUsers Component
 * Shows only online friends with real-time status updates
 */
function OnlineUsers({ friends, selectedFriend, onSelectFriend, currentUser }) {
  const [onlineStatus, setOnlineStatus] = useState({});
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Monitor friends' online status
  useEffect(() => {
    if (!friends || friends.length === 0) return;

    const checkPresence = async () => {
      const status = {};
      
      for (const friend of friends) {
        try {
          const presence = await hybridGunService.getPresence(friend.pub || friend.publicKey);
          status[friend.pub || friend.publicKey] = presence;
        } catch (error) {
          console.error(`Failed to get presence for ${friend.nickname}:`, error);
          status[friend.pub || friend.publicKey] = { online: false };
        }
      }
      
      setOnlineStatus(status);
    };

    // Initial check
    checkPresence();

    // Set up interval for periodic checks
    const interval = setInterval(checkPresence, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [friends]);

  // Filter friends based on online status and search
  const filteredFriends = friends.filter(friend => {
    const isOnline = onlineStatus[friend.pub || friend.publicKey]?.online;
    const matchesSearch = friend.nickname.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showOnlineOnly) {
      return isOnline && matchesSearch;
    }
    return matchesSearch;
  });

  // Sort friends: online first, then alphabetically
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    const aOnline = onlineStatus[a.pub || a.publicKey]?.online || false;
    const bOnline = onlineStatus[b.pub || b.publicKey]?.online || false;
    
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return a.nickname.localeCompare(b.nickname);
  });

  const onlineCount = Object.values(onlineStatus).filter(status => status?.online).length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Friends
          </h3>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(67, 233, 123, 0.2)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#43e97b',
              fontWeight: '500'
            }}>
              {onlineCount} online
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{
          position: 'relative',
          marginBottom: '12px'
        }}>
          <input
            type="text"
            placeholder="Search friends..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.3s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(102, 126, 234, 0.5)';
              e.target.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          />
          <span style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            🔍
          </span>
        </div>

        {/* Toggle Online Only */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          <input
            type="checkbox"
            checked={showOnlineOnly}
            onChange={(e) => setShowOnlineOnly(e.target.checked)}
            style={{
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }}
          />
          Show online only
        </label>
      </div>

      {/* Friends List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px'
      }}>
        {sortedFriends.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            {showOnlineOnly ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>😴</div>
                <p>No friends online right now</p>
              </>
            ) : friends.length === 0 ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>👋</div>
                <p>No friends yet</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>
                  Share your invite link to add friends
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                <p>No friends match your search</p>
              </>
            )}
          </div>
        ) : (
          sortedFriends.map((friend) => {
            const isOnline = onlineStatus[friend.pub || friend.publicKey]?.online;
            const presence = onlineStatus[friend.pub || friend.publicKey];
            const isSelected = selectedFriend?.pub === (friend.pub || friend.publicKey);
            const lastSeen = presence?.lastActive 
              ? new Date(presence.lastActive).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })
              : 'Unknown';

            return (
              <div
                key={friend.pub || friend.publicKey}
                onClick={() => onSelectFriend(friend)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  marginBottom: '8px',
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected 
                    ? '1px solid rgba(102, 126, 234, 0.5)'
                    : '1px solid transparent',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                {/* Avatar */}
                <div style={{
                  position: 'relative',
                  marginRight: '12px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: isOnline 
                      ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#fff',
                    boxShadow: isOnline 
                      ? '0 0 0 3px rgba(67, 233, 123, 0.3)'
                      : 'none'
                  }}>
                    {friend.nickname.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Online indicator */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isOnline ? '#43e97b' : '#666',
                    border: '2px solid #1a1a2e',
                    boxShadow: isOnline 
                      ? '0 0 8px rgba(67, 233, 123, 0.5)'
                      : 'none'
                  }} />
                </div>

                {/* Friend Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#fff',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {friend.nickname}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: isOnline 
                      ? '#43e97b'
                      : 'rgba(255, 255, 255, 0.5)'
                  }}>
                    {isOnline ? '🟢 Online now' : `Last seen: ${lastSeen}`}
                  </div>
                </div>

                {/* Unread indicator (placeholder for future) */}
                {false && (
                  <div style={{
                    padding: '2px 8px',
                    background: '#fa709a',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff',
                    fontWeight: '600'
                  }}>
                    3
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Stats */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center'
      }}>
        {friends.length} total friends • {onlineCount} online
      </div>
    </div>
  );
}

export default OnlineUsers;