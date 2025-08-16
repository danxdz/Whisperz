import React, { useState, useRef, useEffect } from 'react';
import ResizableSidebar from './ResizableSidebar';

/**
 * SwipeableChat Component
 * Allows swiping between friends panel and chat on mobile devices
 */
function SwipeableChat({ 
  children,
  friends,
  selectedFriend,
  onSelectFriend,
  currentUser,
  onFriendsUpdate,
  onGenerateInvite,
  userNickname,
  onLogout
}) {
  const [showFriends, setShowFriends] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const containerRef = useRef(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Check if mobile
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    // Reset swipe offset when switching views
    setSwipeOffset(0);
  }, [showFriends]);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const onTouchMove = (e) => {
    if (!touchStart) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    const diff = currentTouch - touchStart;
    
    // Update swipe offset for visual feedback
    if (Math.abs(diff) > 10) {
      setSwipeOffset(diff);
    }
    
    setTouchEnd(currentTouch);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && !showFriends) {
      // Swipe left - show friends
      setShowFriends(true);
    } else if (isRightSwipe && showFriends) {
      // Swipe right - show chat
      setShowFriends(false);
    }
    
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  // Desktop layout - side by side
  if (!isMobile) {
    return (
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        margin: 0,
        padding: 0,
        background: 'linear-gradient(135deg, #0a0a0f 0%, #16161f 100%)'
      }}>
        <ResizableSidebar
          friends={friends}
          selectedFriend={selectedFriend}
          onSelectFriend={onSelectFriend}
          currentUser={currentUser}
          onFriendsUpdate={onFriendsUpdate}
          onGenerateInvite={onGenerateInvite}
          userNickname={userNickname}
          onLogout={onLogout}
        />
        {children}
      </div>
    );
  }

  // Mobile layout - swipeable
  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #16161f 100%)'
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Swipe Indicator */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: showFriends ? 'auto' : '10px',
        right: showFriends ? '10px' : 'auto',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        padding: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        opacity: 0.7,
        pointerEvents: 'none',
        transition: 'opacity 0.3s'
      }}>
        <div style={{
          fontSize: '20px',
          color: 'rgba(255, 255, 255, 0.5)'
        }}>
          {showFriends ? '→' : '←'}
        </div>
      </div>

      {/* Navigation Dots */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        zIndex: 1000,
        padding: '8px 16px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '20px',
        backdropFilter: 'blur(10px)'
      }}>
        <div 
          onClick={() => setShowFriends(false)}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: !showFriends ? '#667eea' : 'rgba(255, 255, 255, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        />
        <div 
          onClick={() => setShowFriends(true)}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: showFriends ? '#667eea' : 'rgba(255, 255, 255, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
        />
      </div>

      {/* Content Container */}
      <div style={{
        display: 'flex',
        width: '200%',
        height: '100%',
        transform: `translateX(${showFriends ? '-50%' : '0'}${swipeOffset ? ` translateX(${swipeOffset}px)` : ''})`,
        transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
      }}>
        {/* Chat View */}
        <div style={{
          width: '50%',
          height: '100%',
          position: 'relative'
        }}>
          {children}
        </div>

        {/* Friends Panel */}
        <div style={{
          width: '50%',
          height: '100%',
          position: 'relative',
          display: 'flex'
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(20, 20, 30, 0.95)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* Mobile Friends Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                color: '#fff',
                fontWeight: '600'
              }}>
                Friends ({friends.length})
              </h3>
              <button
                onClick={() => setShowFriends(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ×
              </button>
            </div>

            {/* Friends List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px'
            }}>
              {friends.map(friend => (
                <div
                  key={friend.pub || friend.publicKey}
                  onClick={() => {
                    onSelectFriend(friend);
                    setShowFriends(false); // Auto-switch to chat after selecting
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    marginBottom: '8px',
                    background: selectedFriend?.publicKey === (friend.pub || friend.publicKey)
                      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#fff',
                    marginRight: '12px'
                  }}>
                    {friend.nickname.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#fff'
                    }}>
                      {friend.nickname}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.2)',
              display: 'flex',
              gap: '8px'
            }}>
              <button
                onClick={onGenerateInvite}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                + Invite Friend
              </button>
              <button
                onClick={onLogout}
                style={{
                  padding: '10px 16px',
                  background: 'rgba(255, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 0, 0, 0.3)',
                  borderRadius: '6px',
                  color: '#ff6666',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SwipeableChat;