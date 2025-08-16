import React, { useState, useEffect } from 'react';
import hybridGunService from '../services/hybridGunService';
import friendsService from '../services/friendsService';

/**
 * CollapsibleSidebar Component
 * A sidebar that can be collapsed to save space but remains easily accessible
 */
function CollapsibleSidebar({ 
  friends, 
  selectedFriend, 
  onSelectFriend, 
  currentUser, 
  onFriendsUpdate, 
  onGenerateInvite,
  userNickname,
  onLogout 
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showActions, setShowActions] = useState(null);

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
          status[friend.pub || friend.publicKey] = { online: false };
        }
      }
      
      setOnlineStatus(status);
    };

    checkPresence();
    const interval = setInterval(checkPresence, 5000);
    return () => clearInterval(interval);
  }, [friends]);

  const onlineFriends = friends.filter(friend => 
    onlineStatus[friend.pub || friend.publicKey]?.online
  );

  const filteredFriends = friends.filter(friend =>
    friend.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle remove friend
  const handleRemoveFriend = async (friend) => {
    const confirmRemove = window.confirm(`Remove ${friend.nickname} from your friends?`);
    if (!confirmRemove) return;

    try {
      await friendsService.removeFriend(friend.pub || friend.publicKey, false);
      alert(`${friend.nickname} has been removed from your friends.`);
      if (onFriendsUpdate) onFriendsUpdate();
    } catch (error) {
      console.error('Failed to remove friend:', error);
      alert('Failed to remove friend: ' + error.message);
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
      `• Prevent them from sending you invites`
    );
    if (!confirmBlock) return;

    try {
      await friendsService.removeFriend(friend.pub || friend.publicKey, true);
      alert(`${friend.nickname} has been blocked.`);
      if (onFriendsUpdate) onFriendsUpdate();
    } catch (error) {
      console.error('Failed to block friend:', error);
      alert('Failed to block friend: ' + error.message);
    }
    setShowActions(null);
  };

  const renderFriend = (friend) => {
    const friendKey = friend.pub || friend.publicKey;
    const isOnline = onlineStatus[friendKey]?.online;
    const isSelected = selectedFriend?.pub === friendKey || selectedFriend?.publicKey === friendKey;
    const showingActions = showActions === friendKey;

    if (isCollapsed) {
      // Collapsed view - just show avatar
      return (
        <div
          key={friendKey}
          onClick={() => onSelectFriend(friend)}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isSelected 
              ? 'linear-gradient(135deg, #667eea, #764ba2)'
              : isOnline 
                ? 'linear-gradient(135deg, #43e97b, #38f9d7)'
                : 'rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '600',
            color: '#fff',
            margin: '0 auto 12px',
            cursor: 'pointer',
            position: 'relative',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title={friend.nickname}
        >
          {friend.nickname.charAt(0).toUpperCase()}
          {isOnline && (
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#43e97b',
              border: '2px solid #1a1a2e'
            }} />
          )}
        </div>
      );
    }

    // Expanded view - full friend item
    return (
      <div
        key={friendKey}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 10px',
          background: isSelected 
            ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))'
            : 'transparent',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
          marginBottom: '4px'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <div
          onClick={() => onSelectFriend(friend)}
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1
          }}
        >
          {/* Avatar */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: isOnline 
              ? 'linear-gradient(135deg, #43e97b, #38f9d7)'
              : 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600',
            color: '#fff',
            marginRight: '10px',
            position: 'relative',
            flexShrink: 0
          }}>
            {friend.nickname.charAt(0).toUpperCase()}
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isOnline ? '#43e97b' : '#666',
              border: '2px solid #1a1a2e'
            }} />
          </div>

          {/* Name and status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {friend.nickname}
            </div>
            <div style={{
              fontSize: '11px',
              color: isOnline ? '#43e97b' : 'rgba(255, 255, 255, 0.5)'
            }}>
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Actions */}
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
            padding: '4px',
            fontSize: '16px',
            flexShrink: 0
          }}
        >
          ⋮
        </button>

        {showingActions && (
          <div style={{
            position: 'absolute',
            right: '40px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(20, 20, 30, 0.98)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: '4px',
            zIndex: 1000,
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
                borderRadius: '4px'
              }}
            >
              Remove
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
                borderRadius: '4px'
              }}
            >
              Block
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="sidebar"
      style={{
        width: isCollapsed ? '80px' : '300px',
        transition: 'width 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'rgba(20, 20, 30, 0.95)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Header */}
      <div className="sidebar-header" style={{ 
        flexShrink: 0,
        padding: isCollapsed ? '15px 10px' : '15px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between'
        }}>
          {!isCollapsed && (
            <h2 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>
              Friends ({onlineFriends.length}/{friends.length})
            </h2>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.7)',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              transition: 'all 0.2s'
            }}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>

        {!isCollapsed && (
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Search friends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={onGenerateInvite}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Invite friend"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* Friends List */}
      <div style={{ 
        flex: 1, 
        padding: isCollapsed ? '15px 10px' : '15px',
        overflowY: 'auto',
        overflowX: 'hidden'
      }}>
        {filteredFriends.length === 0 ? (
          !isCollapsed && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              {friends.length === 0 ? (
                <>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>👋</div>
                  <p style={{ margin: 0 }}>No friends yet</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>
                    Click + to invite
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                  <p style={{ margin: 0 }}>No matches</p>
                </>
              )}
            </div>
          )
        ) : (
          <>
            {/* Online friends first */}
            {filteredFriends
              .filter(f => onlineStatus[f.pub || f.publicKey]?.online)
              .map(friend => renderFriend(friend))}
            
            {/* Separator if both online and offline exist */}
            {!isCollapsed && 
             filteredFriends.some(f => onlineStatus[f.pub || f.publicKey]?.online) &&
             filteredFriends.some(f => !onlineStatus[f.pub || f.publicKey]?.online) && (
              <div style={{
                margin: '12px 0',
                padding: '4px 0',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.4)',
                textAlign: 'center'
              }}>
                OFFLINE
              </div>
            )}
            
            {/* Offline friends */}
            {filteredFriends
              .filter(f => !onlineStatus[f.pub || f.publicKey]?.online)
              .map(friend => renderFriend(friend))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer" style={{ 
        flexShrink: 0,
        padding: isCollapsed ? '10px' : '15px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {isCollapsed ? (
          <button 
            onClick={onLogout}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              color: '#ff6666',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}
            title={`Logout ${userNickname}`}
          >
            ⏻
          </button>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              color: '#fff',
              fontSize: '14px',
              fontWeight: '500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {userNickname}
            </span>
            <button 
              onClick={onLogout}
              style={{
                padding: '6px 12px',
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                borderRadius: '6px',
                color: '#ff6666',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CollapsibleSidebar;