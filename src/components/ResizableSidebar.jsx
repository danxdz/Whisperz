import React, { useState, useEffect, useRef } from 'react';
import hybridGunService from '../services/hybridGunService';
import friendsService from '../services/friendsService';

/**
 * ResizableSidebar Component
 * A sidebar that can be resized, minimized, and maximized
 */
function ResizableSidebar({ 
  friends, 
  selectedFriend, 
  onSelectFriend, 
  currentUser,
  onFriendsUpdate,
  onGenerateInvite,
  userNickname,
  onLogout,
  onlineStatus
}) {
  const [width, setWidth] = useState(280);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActions, setShowActions] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [showPending, setShowPending] = useState(false);
  const sidebarRef = useRef(null);

  const MIN_WIDTH = 200;
  const MAX_WIDTH = 500;
  const MINIMIZED_WIDTH = 60;

  // Helper function to format time ago
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'unknown';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  // Use the passed onlineStatus instead of polling locally
  // The parent component (App.jsx) already handles real-time updates

  // Load pending invites
  useEffect(() => {
    const loadPendingInvites = async () => {
      try {
        const invites = await friendsService.getPendingInvites();
        setPendingInvites(invites || []);
      } catch (error) {
        console.error('Failed to load pending invites:', error);
      }
    };
    
    loadPendingInvites();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingInvites, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
        setIsMaximized(false);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const onlineFriends = friends.filter(friend => 
    onlineStatus[friend.publicKey]?.online
  );

  const filteredFriends = friends.filter(friend =>
    friend.nickname.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle friend actions
  const handleRemoveFriend = async (friend) => {
    const confirmRemove = window.confirm(`Remove ${friend.nickname} from your friends?`);
    if (!confirmRemove) return;

    try {
      await friendsService.removeFriend(friend.publicKey, false);
      alert(`${friend.nickname} has been removed from your friends.`);
      if (onFriendsUpdate) onFriendsUpdate();
    } catch (error) {
      // console.error('Failed to remove friend:', error);
      alert('Failed to remove friend: ' + error.message);
    }
    setShowActions(null);
  };

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
      await friendsService.removeFriend(friend.publicKey, true);
      alert(`${friend.nickname} has been blocked.`);
      if (onFriendsUpdate) onFriendsUpdate();
    } catch (error) {
      // console.error('Failed to block friend:', error);
      alert('Failed to block friend: ' + error.message);
    }
    setShowActions(null);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
    setIsMaximized(false);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
    setIsMinimized(false);
  };

  const renderFriend = (friend) => {
    const friendKey = friend.publicKey;
    const statusData = onlineStatus[friendKey];
    const isOnline = statusData?.online === true;
    const isSelected = selectedFriend?.publicKey === friendKey;
    const showingActions = showActions === friendKey;
    
    // Debug: Always log to see what we have
    console.log(`🔍 Rendering ${friend.nickname}:`, {
      friendKey,
      statusData,
      isOnline,
      lastSeenValue: statusData?.lastSeen,
      formatted: statusData?.lastSeen ? getTimeAgo(statusData.lastSeen) : 'no lastSeen'
    });

    if (isMinimized) {
      // Minimized view - just avatar
      return (
        <div
          key={friendKey}
          onClick={() => onSelectFriend(friend)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: isSelected 
              ? 'linear-gradient(135deg, #667eea, #764ba2)'
              : isOnline 
                ? 'linear-gradient(135deg, #43e97b, #38f9d7)'
                : 'rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600',
            color: '#fff',
            margin: '0 auto 8px',
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
              bottom: '0',
              right: '0',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#43e97b',
              border: '2px solid #1a1a2e'
            }} />
          )}
        </div>
      );
    }

    // Normal view
    return (
      <div
        key={friendKey}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px',
          background: isSelected 
            ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))'
            : 'transparent',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
          marginBottom: '3px'
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
            flex: 1,
            minWidth: 0
          }}
        >
          {/* Avatar */}
          <div style={{
            width: '32px',
            height: '32px',
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
            flexShrink: 0
          }}>
            {friend.nickname.charAt(0).toUpperCase()}
            {isOnline && (
              <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#43e97b',
                border: '1px solid #1a1a2e'
              }} />
            )}
          </div>

          {/* Name and status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '500',
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {friend.nickname}
            </div>
            {!isMaximized && (
              <div style={{
                fontSize: '10px',
                color: isOnline ? '#43e97b' : 'rgba(255, 255, 255, 0.4)'
              }}>
                {isOnline ? 'Online' : (
                  statusData?.lastSeen ? 
                    `Last seen ${getTimeAgo(statusData.lastSeen)}` : 
                    'Offline'
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isMaximized && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(showingActions ? null : friendKey);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              cursor: 'pointer',
              padding: '2px',
              fontSize: '14px',
              flexShrink: 0
            }}
          >
            ⋮
          </button>
        )}

        {showingActions && (
          <div style={{
            position: 'absolute',
            right: '30px',
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
                padding: '4px 8px',
                background: 'transparent',
                border: 'none',
                color: '#ff9999',
                fontSize: '11px',
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
                padding: '4px 8px',
                background: 'transparent',
                border: 'none',
                color: '#ff6666',
                fontSize: '11px',
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

  const currentWidth = isMinimized ? MINIMIZED_WIDTH : (isMaximized ? MAX_WIDTH : width);

  return (
    <>
      <div 
        ref={sidebarRef}
        style={{
          width: `${currentWidth}px`,
          transition: isResizing ? 'none' : 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          background: 'rgba(20, 20, 30, 0.95)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          flexShrink: 0
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: isMinimized ? '10px 5px' : '12px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: isMinimized ? 'center' : 'space-between',
            marginBottom: isMinimized ? 0 : '10px'
          }}>
            {!isMinimized && (
              <h3 style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: '#fff',
                fontWeight: '600'
              }}>
                Friends ({onlineFriends.length}/{friends.length})
              </h3>
            )}
            
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={toggleMinimize}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  color: 'rgba(255, 255, 255, 0.6)',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
                }}
                title={isMinimized ? 'Restore' : 'Minimize'}
              >
                {isMinimized ? '□' : '−'}
              </button>
              {!isMinimized && (
                <button
                  onClick={toggleMaximize}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                  }}
                  title={isMaximized ? 'Restore' : 'Maximize'}
                >
                  {isMaximized ? '◱' : '□'}
                </button>
              )}
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Tabs */}
              <div style={{ 
                display: 'flex', 
                gap: '4px',
                marginBottom: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                paddingBottom: '4px'
              }}>
                <button
                  onClick={() => setShowPending(false)}
                  style={{
                    flex: 1,
                    padding: '4px',
                    background: !showPending ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: !showPending ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Friends ({friends.length})
                </button>
                <button
                  onClick={() => setShowPending(true)}
                  style={{
                    flex: 1,
                    padding: '4px',
                    background: showPending ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    color: showPending ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  Pending
                  {pendingInvites.length > 0 && (
                    <span style={{
                      marginLeft: '4px',
                      padding: '0 4px',
                      background: '#ff6b6b',
                      borderRadius: '8px',
                      fontSize: '10px'
                    }}>
                      {pendingInvites.length}
                    </span>
                  )}
                </button>
              </div>
              
              {/* Search and Invite */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  placeholder={showPending ? "Search invites..." : "Search friends..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={onGenerateInvite}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '4px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '16px',
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
            </>
          )}
        </div>

        {/* Content Area */}
        <div style={{ 
          flex: 1, 
          padding: isMinimized ? '10px 5px' : '10px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {showPending ? (
            // Pending Invites View
            pendingInvites.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '30px 15px',
                color: 'rgba(255, 255, 255, 0.4)'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '6px' }}>📨</div>
                <p style={{ margin: 0, fontSize: '12px' }}>No pending invites</p>
              </div>
            ) : (
              pendingInvites.map(invite => (
                <div
                  key={invite.id || invite.publicKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    marginBottom: '4px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff' }}>
                      {invite.nickname || invite.publicKey?.substring(0, 8) + '...'}
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px' }}>
                      Invite sent
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await friendsService.cancelInvite(invite.publicKey);
                        setPendingInvites(prev => prev.filter(i => i.publicKey !== invite.publicKey));
                      } catch (error) {
                        console.error('Failed to cancel invite:', error);
                      }
                    }}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(255, 99, 99, 0.2)',
                      border: '1px solid rgba(255, 99, 99, 0.4)',
                      borderRadius: '4px',
                      color: '#ff9999',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ))
            )
          ) : (
            // Friends List View
            filteredFriends.length === 0 ? (
            !isMinimized && (
              <div style={{
                textAlign: 'center',
                padding: '30px 15px',
                color: 'rgba(255, 255, 255, 0.4)'
              }}>
                {friends.length === 0 ? (
                  <>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>👋</div>
                    <p style={{ margin: 0, fontSize: '12px' }}>No friends yet</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>🔍</div>
                    <p style={{ margin: 0, fontSize: '12px' }}>No matches</p>
                  </>
                )}
              </div>
            )
          ) : (
            <>
              {/* Online friends first */}
              {filteredFriends
                .filter(f => onlineStatus[f.publicKey]?.online)
                .map(friend => renderFriend(friend))}
              
              {/* Separator */}
              {!isMinimized && 
               filteredFriends.some(f => onlineStatus[f.publicKey]?.online) &&
               filteredFriends.some(f => !onlineStatus[f.publicKey]?.online) && (
                <div style={{
                  margin: '8px 0',
                  padding: '2px 0',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.3)',
                  textAlign: 'center'
                }}>
                  OFFLINE
                </div>
              )}
              
              {/* Offline friends */}
              {filteredFriends
                .filter(f => !onlineStatus[f.publicKey]?.online)
                .map(friend => renderFriend(friend))}
            </>
          ))}
        </div>

        {/* Footer */}
        <div style={{ 
          padding: isMinimized ? '8px 5px' : '10px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          {isMinimized ? (
            <button 
              onClick={onLogout}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                color: '#ff6666',
                fontSize: '16px',
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
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <span style={{
                color: '#fff',
                fontSize: '12px',
                fontWeight: '500',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}>
                {userNickname}
              </span>
              <button 
                onClick={onLogout}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(255, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 0, 0, 0.3)',
                  borderRadius: '4px',
                  color: '#ff6666',
                  fontSize: '11px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Resize Handle */}
      {!isMinimized && !isMaximized && (
        <div
          onMouseDown={() => setIsResizing(true)}
          style={{
            position: 'absolute',
            left: `${currentWidth - 2}px`,
            top: 0,
            width: '4px',
            height: '100%',
            cursor: 'col-resize',
            background: 'transparent',
            zIndex: 10,
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.5)';
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        />
      )}
    </>
  );
}

export default ResizableSidebar;