import React, { useState, useEffect } from 'react';
import hybridGunService from '../services/hybridGunService';
import friendsService from '../services/friendsService';

/**
 * ExpandableFriends Component
 * Collapsible friends list that can expand to show all friends or just online ones
 * With friend management (remove/block)
 */
function ExpandableFriends({ friends, selectedFriend, onSelectFriend, onFriendsUpdate }) {
  const [onlineStatus, setOnlineStatus] = useState({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOnlineOnly, setShowOnlineOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActions, setShowActions] = useState(null); // Track which friend's actions are shown

  // Monitor friends' online status
  useEffect(() => {
    if (!friends || friends.length === 0) return;

    const checkPresence = async () => {
      const status = {};
      
      for (const friend of friends) {
        try {
          const presence = await hybridGunService.getPresence(friend.pub || friend.publicKey);
          status[friend.pub || friend.publicKey] = presence;
        } catch {
          status[friend.pub || friend.publicKey] = { online: false };
        }
      }
      
      setOnlineStatus(status);
    };

    checkPresence();
    const interval = setInterval(checkPresence, 5000);
    return () => clearInterval(interval);
  }, [friends]);

  // Handle remove friend
  const handleRemoveFriend = async (friend) => {
    const confirmRemove = window.confirm(`Remove ${friend.nickname} from your friends?`);
    if (!confirmRemove) return;

    try {
      await friendsService.removeFriend(friend.pub || friend.publicKey, false);
      alert(`${friend.nickname} has been removed from your friends.`);
      
      // Refresh friends list
      if (onFriendsUpdate) {
        onFriendsUpdate();
      }
    } catch {
      // console.error('Failed to remove friend:', error);
      alert('Failed to remove friend: ' + _error.message);
    }
    
    setShowActions(null);
  };

  // Handle block friend
  const handleBlockFriend = async (friend) => {
    const confirmBlock = window.confirm(
      `Block ${friend.nickname}?\n\n` +
      `This will:\n` +
      `• Remove them from your friends\n` +
      `• Delete conversation history\n` +
      `• Prevent them from sending you invites\n` +
      `• They won't be notified`
    );
    if (!confirmBlock) return;

    try {
      await friendsService.removeFriend(friend.pub || friend.publicKey, true); // true = also block
      alert(`${friend.nickname} has been blocked.`);
      
      // Refresh friends list
      if (onFriendsUpdate) {
        onFriendsUpdate();
      }
    } catch {
      // console.error('Failed to block friend:', error);
      alert('Failed to block friend: ' + _error.message);
    }
    
    setShowActions(null);
  };

  // Filter and sort friends
  const onlineFriends = friends.filter(friend => 
    onlineStatus[friend.pub || friend.publicKey]?.online
  );
  
  // const offlineFriends = friends.filter(friend => 

  const filteredFriends = friends.filter(friend =>
    friend.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayedFriends = showOnlineOnly ? 
    onlineFriends.filter(f => f.nickname.toLowerCase().includes(searchTerm.toLowerCase())) :
    filteredFriends;

  const renderFriend = (friend, isOnline) => {
    const friendKey = friend.pub || friend.publicKey;
    const isSelected = selectedFriend?.pub === friendKey || 
                      selectedFriend?.publicKey === friendKey;
    const showingActions = showActions === friendKey;

    return (
      <div
        key={friendKey}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          marginBottom: '4px',
          background: isSelected 
            ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3), rgba(118, 75, 162, 0.3))'
            : 'rgba(255, 255, 255, 0.03)',
          border: isSelected 
            ? '1px solid rgba(102, 126, 234, 0.5)'
            : '1px solid transparent',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          }
        }}
      >
        {/* Clickable area for selecting friend */}
        <div
          onClick={() => onSelectFriend(friend)}
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            minWidth: 0
          }}
        >
          {/* Compact Avatar */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: isOnline 
              ? 'linear-gradient(135deg, #43e97b, #38f9d7)'
              : 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '600',
            color: '#fff',
            marginRight: '8px',
            flexShrink: 0,
            position: 'relative'
          }}>
            {friend.nickname.charAt(0).toUpperCase()}
            
            {/* Online dot */}
            <div style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isOnline ? '#43e97b' : '#666',
              border: '2px solid #0a0a0f'
            }} />
          </div>

          {/* Name */}
          <div style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '500',
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {friend.nickname}
            </div>
          </div>

          {/* Status indicator */}
          {isOnline && (
            <span style={{
              fontSize: '10px',
              color: '#43e97b',
              marginRight: '4px'
            }}>
              ●
            </span>
          )}
        </div>

        {/* Actions button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(showingActions ? null : friendKey);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.5)',
            cursor: 'pointer',
            padding: '2px 4px',
            fontSize: '14px',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.8)'}
          onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.5)'}
        >
          ⋮
        </button>

        {/* Actions dropdown */}
        {showingActions && (
          <div style={{
            position: 'absolute',
            right: '30px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(30, 30, 40, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: '4px',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFriend(friend);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                background: 'transparent',
                border: 'none',
                color: '#ff9999',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 100, 100, 0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              Remove Friend
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleBlockFriend(friend);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '6px 12px',
                background: 'transparent',
                border: 'none',
                color: '#ff6666',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 50, 50, 0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              Block User
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: isExpanded ? 'auto' : 'auto',
      maxHeight: isExpanded ? '70vh' : 'auto',
      background: 'rgba(15, 15, 25, 0.95)',
      borderRadius: '8px',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
      transition: 'all 0.3s ease'
    }}>
      {/* Collapsible Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '10px 12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>
            Friends
          </span>
          <span style={{
            padding: '2px 6px',
            background: 'rgba(67, 233, 123, 0.2)',
            borderRadius: '10px',
            fontSize: '10px',
            color: '#43e97b',
            fontWeight: '500'
          }}>
            {onlineFriends.length} online
          </span>
          <span style={{
            padding: '2px 6px',
            background: 'rgba(102, 126, 234, 0.2)',
            borderRadius: '10px',
            fontSize: '10px',
            color: '#667eea',
            fontWeight: '500'
          }}>
            {friends.length} total
          </span>
        </div>
        
        <span style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.5)',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s'
        }}>
          ▼
        </span>
      </div>

      {/* Quick Online Users (Always Visible) */}
      {!isExpanded && onlineFriends.length > 0 && (
        <div style={{
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '4px'
          }}>
            Online Now:
          </div>
          {onlineFriends.slice(0, 3).map(friend => renderFriend(friend, true))}
          {onlineFriends.length > 3 && (
            <div style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)',
              textAlign: 'center',
              padding: '4px'
            }}>
              +{onlineFriends.length - 3} more online
            </div>
          )}
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <>
          {/* Search and Filter */}
          <div style={{
            padding: '8px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <input
              type="text"
              placeholder="Search friends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none'
              }}
            />
            
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: 'pointer'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                style={{ width: '12px', height: '12px' }}
              />
              Show online only
            </label>
          </div>

          {/* Friends List */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
            maxHeight: '400px'
          }}>
            {displayedFriends.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '12px'
              }}>
                {searchTerm ? 'No friends match your search' : 
                 showOnlineOnly ? 'No friends online' : 'No friends yet'}
              </div>
            ) : (
              <>
                {/* Online Friends */}
                {displayedFriends.filter(f => onlineStatus[f.pub || f.publicKey]?.online).length > 0 && (
                  <>
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginBottom: '6px',
                      fontWeight: '600'
                    }}>
                      ONLINE ({displayedFriends.filter(f => onlineStatus[f.pub || f.publicKey]?.online).length})
                    </div>
                    {displayedFriends
                      .filter(f => onlineStatus[f.pub || f.publicKey]?.online)
                      .map(friend => renderFriend(friend, true))
                    }
                  </>
                )}
                
                {/* Offline Friends */}
                {!showOnlineOnly && displayedFriends.filter(f => !onlineStatus[f.pub || f.publicKey]?.online).length > 0 && (
                  <>
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginTop: '12px',
                      marginBottom: '6px',
                      fontWeight: '600'
                    }}>
                      OFFLINE ({displayedFriends.filter(f => !onlineStatus[f.pub || f.publicKey]?.online).length})
                    </div>
                    {displayedFriends
                      .filter(f => !onlineStatus[f.pub || f.publicKey]?.online)
                      .map(friend => renderFriend(friend, false))
                    }
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ExpandableFriends;