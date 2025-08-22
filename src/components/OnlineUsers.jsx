import React, { useState, useEffect } from 'react';
import hybridGunService from '../services/hybridGunService';

/**
 * OnlineUsers Component
 * Shows only online friends with real-time status updates
 * Responsive design for small screens (4-inch and up)
 */
function OnlineUsers({ friends, selectedFriend, onSelectFriend, currentUser, onlineStatus = {} }) {
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCompact, setIsCompact] = useState(window.innerWidth <= 375);

  // Detect screen size changes
  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth <= 375);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use the passed onlineStatus instead of polling locally
  // The parent component should handle real-time updates

  // Filter friends based on online status and search
  const filteredFriends = friends.filter(friend => {
    const isOnline = onlineStatus[friend.publicKey]?.online;
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
      maxHeight: '100%',
      background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(22, 33, 62, 0.95) 100%)',
      borderRadius: isCompact ? '8px' : '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
    }}>
      {/* Header */}
      <div style={{
        padding: isCompact ? '8px' : '12px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isCompact ? '6px' : '8px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: isCompact ? '14px' : '16px',
            fontWeight: '600',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Friends
          </h3>
          <span style={{
            padding: isCompact ? '2px 6px' : '3px 8px',
            background: 'rgba(67, 233, 123, 0.2)',
            borderRadius: '10px',
            fontSize: isCompact ? '10px' : '11px',
            color: '#43e97b',
            fontWeight: '500'
          }}>
            {onlineCount} online
          </span>
        </div>

        {/* Search Bar */}
        <div style={{
          position: 'relative',
          marginBottom: isCompact ? '6px' : '8px'
        }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: isCompact ? '6px 8px 6px 28px' : '8px 12px 8px 32px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: isCompact ? '12px' : '13px',
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
            left: isCompact ? '8px' : '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: isCompact ? '12px' : '14px'
          }}>
            🔍
          </span>
        </div>

        {/* Toggle Online Only */}
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          fontSize: isCompact ? '11px' : '12px',
          color: 'rgba(255, 255, 255, 0.8)'
        }}>
          <input
            type="checkbox"
            checked={showOnlineOnly}
            onChange={(e) => setShowOnlineOnly(e.target.checked)}
            style={{
              width: isCompact ? '14px' : '16px',
              height: isCompact ? '14px' : '16px',
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
        overflowX: 'hidden',
        padding: isCompact ? '4px' : '6px',
        minHeight: 0 // Important for flex child scrolling
      }}>
        {sortedFriends.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: isCompact ? '20px 10px' : '30px 15px',
            color: 'rgba(255, 255, 255, 0.5)'
          }}>
            {showOnlineOnly ? (
              <>
                <div style={{ fontSize: isCompact ? '32px' : '40px', marginBottom: '8px' }}>😴</div>
                <p style={{ fontSize: isCompact ? '12px' : '13px', margin: 0 }}>No friends online</p>
              </>
            ) : friends.length === 0 ? (
              <>
                <div style={{ fontSize: isCompact ? '32px' : '40px', marginBottom: '8px' }}>👋</div>
                <p style={{ fontSize: isCompact ? '12px' : '13px', margin: '0 0 4px 0' }}>No friends yet</p>
                <p style={{ fontSize: isCompact ? '10px' : '11px', margin: 0 }}>
                  Share your invite link
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: isCompact ? '32px' : '40px', marginBottom: '8px' }}>🔍</div>
                <p style={{ fontSize: isCompact ? '12px' : '13px', margin: 0 }}>No matches</p>
              </>
            )}
          </div>
        ) : (
          sortedFriends.map((friend) => {
            const isOnline = onlineStatus[friend.publicKey]?.online;
            const presence = onlineStatus[friend.publicKey];
            const isSelected = selectedFriend?.publicKey === friend.publicKey;
            const lastSeen = presence?.lastActive
              ? new Date(presence.lastActive).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : 'Unknown';

            return (
              <div
                key={friend.publicKey}
                onClick={() => onSelectFriend(friend)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: isCompact ? '8px 6px' : '10px 8px',
                  marginBottom: '4px',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected
                    ? '1px solid rgba(102, 126, 234, 0.5)'
                    : '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateX(2px)';
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
                  marginRight: isCompact ? '8px' : '10px',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: isCompact ? '32px' : '36px',
                    height: isCompact ? '32px' : '36px',
                    borderRadius: '50%',
                    background: isOnline
                      ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isCompact ? '14px' : '16px',
                    fontWeight: '600',
                    color: '#fff',
                    boxShadow: isOnline
                      ? '0 0 0 2px rgba(67, 233, 123, 0.3)'
                      : 'none'
                  }}>
                    {friend.nickname.charAt(0).toUpperCase()}
                  </div>

                  {/* Online indicator */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    right: '0',
                    width: isCompact ? '8px' : '10px',
                    height: isCompact ? '8px' : '10px',
                    borderRadius: '50%',
                    background: isOnline ? '#43e97b' : '#666',
                    border: '2px solid #1a1a2e',
                    boxShadow: isOnline
                      ? '0 0 6px rgba(67, 233, 123, 0.5)'
                      : 'none'
                  }} />
                </div>

                {/* Friend Info */}
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    fontSize: isCompact ? '13px' : '14px',
                    fontWeight: '500',
                    color: '#fff',
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {friend.nickname}
                  </div>
                  <div style={{
                    fontSize: isCompact ? '10px' : '11px',
                    color: isOnline
                      ? '#43e97b'
                      : 'rgba(255, 255, 255, 0.5)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {isOnline ? '🟢 Online' : `Last: ${lastSeen}`}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Stats - Compact for small screens */}
      {!isCompact && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.6)',
          textAlign: 'center',
          flexShrink: 0
        }}>
          {friends.length} friends • {onlineCount} online
        </div>
      )}
    </div>
  );
}

export default OnlineUsers;