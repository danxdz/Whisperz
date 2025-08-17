import React, { useState, useRef, useEffect } from 'react';
import ResizableSidebar from './ResizableSidebar';
import EnhancedDevTools from './EnhancedDevTools';
import { useTheme } from '../contexts/ThemeContext';

/**
 * SwipeableChat Component
 * Allows swiping between chat, friends panel, and dev tools on mobile devices
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
  const [currentPanel, setCurrentPanel] = useState(0); // 0: Chat, 1: Friends, 2: DevTools
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const containerRef = useRef(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;
  
  // Debug admin status
  useEffect(() => {
    console.log('🔍 SwipeableChat - User:', currentUser);
    console.log('🔍 SwipeableChat - Is Admin?:', currentUser?.isAdmin);
    console.log('🔍 SwipeableChat - Admin type:', typeof currentUser?.isAdmin);
    console.log('🔍 SwipeableChat - User object keys:', currentUser ? Object.keys(currentUser) : 'No user');
  }, [currentUser]);
  
  // Ensure admin flag is properly evaluated
  const isUserAdmin = currentUser?.isAdmin === true;

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
    // Reset swipe offset when switching panels
    setSwipeOffset(0);
  }, [currentPanel]);

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

    // Check if user is admin for DevTools access
    const maxPanel = currentUser?.isAdmin ? 2 : 1;
    
    if (isLeftSwipe && currentPanel < maxPanel) {
      // Swipe left - move to next panel
      console.log('Moving to panel:', currentPanel + 1);
      setCurrentPanel(currentPanel + 1);
    } else if (isRightSwipe && currentPanel > 0) {
      // Swipe right - move to previous panel
      console.log('Moving to panel:', currentPanel - 1);
      setCurrentPanel(currentPanel - 1);
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




      {/* Minimal Navigation Dots - Top Center */}
      <div style={{
        position: 'absolute',
        top: '4px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '6px',
        zIndex: 999,
        padding: '4px 8px',
        background: 'transparent'
      }}>
        <div
          onClick={() => setCurrentPanel(0)}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: currentPanel === 0 ? colors.primary : colors.bgTertiary,
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: currentPanel === 0 ? 1 : 0.5
          }}
          title="Chat"
        />
        <div
          onClick={() => setCurrentPanel(1)}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: currentPanel === 1 ? colors.primary : colors.bgTertiary,
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: currentPanel === 1 ? 1 : 0.5
          }}
          title="Friends"
        />
        {currentUser?.isAdmin && (
          <div
            onClick={() => setCurrentPanel(2)}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: currentPanel === 2 ? colors.primary : colors.bgTertiary,
              cursor: 'pointer',
              transition: 'all 0.2s',
              opacity: currentPanel === 2 ? 1 : 0.5
            }}
            title="DevTools"
          />
        )}
      </div>

      {/* Content Container - 3 panels */}
      <div style={{
        display: 'flex',
        width: '300%',
        height: '100%',
        transform: `translateX(-${currentPanel * 33.333}%)${swipeOffset ? ` translateX(${swipeOffset}px)` : ''}`,
        transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
      }}>
        {/* Chat View */}
        <div style={{
          width: '33.333%',
          height: '100%',
          position: 'relative'
        }}>
          {children}
        </div>

        {/* Friends Panel */}
        <div style={{
          width: '33.333%',
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
                onClick={() => setCurrentPanel(0)}
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
                    setCurrentPanel(0); // Auto-switch to chat after selecting
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

        {/* DevTools Panel */}
                {currentUser?.isAdmin ? (
          <div style={{ 
            width: '33.333%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <EnhancedDevTools 
              isVisible={true}
              onClose={() => setCurrentPanel(0)}
              isMobilePanel={true}
              isAdmin={true}
              currentUser={currentUser}
            />
          </div>
        ) : (
          <div style={{ 
            width: '33.333%',
            height: '100%'
          }} />
        )}
      </div>
    </div>
  );
}

export default SwipeableChat;