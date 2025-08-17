import React, { useState, useRef, useEffect } from 'react';
import ResizableSidebar from './ResizableSidebar';
import { useTheme } from '../contexts/ThemeContext';

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
  const { colors } = useTheme();
  const [showFriends, setShowFriends] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const containerRef = useRef(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Update mobile detection on resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      console.log('Mobile mode:', mobile, 'Width:', window.innerWidth);
    };
    
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Reset swipe offset when switching views
    setSwipeOffset(0);
  }, [showFriends]);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
    console.log('Touch start:', e.targetTouches[0].clientX);
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

    console.log('Swipe distance:', distance, 'Left:', isLeftSwipe, 'Right:', isRightSwipe);

    if (isLeftSwipe && !showFriends) {
      // Swipe left - show friends
      console.log('Showing friends panel');
      setShowFriends(true);
    } else if (isRightSwipe && showFriends) {
      // Swipe right - show chat
      console.log('Showing chat');
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
        background: colors.bgPrimary
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
        background: colors.bgPrimary
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Hamburger Menu Button - Always visible on mobile */}
      {!showFriends && (
        <button
          onClick={() => setShowFriends(true)}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 1001,
            width: '40px',
            height: '40px',
            background: colors.bgCard,
            border: `1px solid ${colors.borderColor}`,
            borderRadius: '8px',
            color: colors.textPrimary,
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          ☰
        </button>
      )}

      {/* Swipe Indicator - More subtle */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: showFriends ? 'auto' : '4px',
        right: showFriends ? '4px' : 'auto',
        transform: 'translateY(-50%)',
        zIndex: 1000,
        width: '4px',
        height: '60px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '2px',
        opacity: 0.5,
        pointerEvents: 'none',
        transition: 'opacity 0.3s'
      }}/>

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
        background: colors.bgCard,
        borderRadius: '20px',
        backdropFilter: 'blur(10px)',
        border: `1px solid ${colors.borderColor}`
      }}>
        <div 
          onClick={() => setShowFriends(false)}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: !showFriends ? colors.primary : colors.bgTertiary,
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
            background: showFriends ? colors.primary : colors.bgTertiary,
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
            background: colors.bgSecondary,
            borderLeft: `1px solid ${colors.borderColor}`
          }}>
            {/* Mobile Friends Header */}
            <div style={{
              padding: '16px',
              borderBottom: `1px solid ${colors.borderColor}`,
              background: colors.bgCard,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                color: colors.textPrimary,
                fontWeight: '600'
              }}>
                Friends ({friends.length})
              </h3>
              <button
                onClick={() => setShowFriends(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${colors.borderColor}`,
                  borderRadius: '6px',
                  color: colors.textMuted,
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
                      ? colors.primaryBg
                      : colors.bgTertiary,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: colors.primary,
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
                      color: colors.textPrimary
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
              borderTop: `1px solid ${colors.borderColor}`,
              background: colors.bgCard,
              display: 'flex',
              gap: '8px'
            }}>
              <button
                onClick={onGenerateInvite}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: colors.primary,
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
                  background: colors.dangerBg,
                  border: `1px solid ${colors.danger}`,
                  borderRadius: '6px',
                  color: colors.danger,
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