import { useState, useEffect, useRef } from 'react';

/**
 * MobileDevTools Component
 * Mobile-optimized dev tools access with touch gestures
 */
function MobileDevTools({ onOpenDevTools }) {
  const [showTrigger, setShowTrigger] = useState(false);
  const [touchCount, setTouchCount] = useState(0);
  const touchTimeoutRef = useRef(null);
  const lastTapRef = useRef(0);

  // Triple-tap detection for mobile
  useEffect(() => {
    const handleTripleTap = (e) => {
      const currentTime = Date.now();
      const tapLength = currentTime - lastTapRef.current;
      
      if (tapLength < 500 && tapLength > 0) {
        setTouchCount(prev => {
          const newCount = prev + 1;
          if (newCount === 3) {
            // Triple tap detected
            setShowTrigger(true);
            setTimeout(() => setShowTrigger(false), 5000);
            return 0;
          }
          return newCount;
        });
      } else {
        setTouchCount(1);
      }
      
      lastTapRef.current = currentTime;
      
      // Reset count after timeout
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = setTimeout(() => {
        setTouchCount(0);
      }, 500);
    };

    // Listen for taps in the corner area
    const handleCornerTap = (e) => {
      const x = e.touches?.[0]?.clientX || e.clientX;
      const y = e.touches?.[0]?.clientY || e.clientY;
      const cornerSize = 50;
      
      // Check if tap is in bottom-right corner
      if (
        x > window.innerWidth - cornerSize &&
        y > window.innerHeight - cornerSize
      ) {
        handleTripleTap(e);
      }
    };

    window.addEventListener('touchstart', handleCornerTap);
    window.addEventListener('click', handleCornerTap);

    return () => {
      window.removeEventListener('touchstart', handleCornerTap);
      window.removeEventListener('click', handleCornerTap);
      clearTimeout(touchTimeoutRef.current);
    };
  }, []);

  // Long press detection
  useEffect(() => {
    let longPressTimer;
    let touchStartX, touchStartY;
    const longPressDuration = 2000; // 2 seconds

    const handleTouchStart = (e) => {
      // Check if touching with 3 fingers
      if (e.touches.length === 3) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        
        longPressTimer = setTimeout(() => {
          setShowTrigger(true);
          setTimeout(() => setShowTrigger(false), 5000);
        }, longPressDuration);
      }
    };

    const handleTouchMove = (e) => {
      if (longPressTimer && e.touches.length === 3) {
        const moveThreshold = 10;
        const deltaX = Math.abs(e.touches[0].clientX - touchStartX);
        const deltaY = Math.abs(e.touches[0].clientY - touchStartY);
        
        if (deltaX > moveThreshold || deltaY > moveThreshold) {
          clearTimeout(longPressTimer);
        }
      }
    };

    const handleTouchEnd = () => {
      clearTimeout(longPressTimer);
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      clearTimeout(longPressTimer);
    };
  }, []);

  // Swipe gesture detection
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 100;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Swipe up from bottom
      if (
        Math.abs(deltaY) > swipeThreshold &&
        Math.abs(deltaX) < swipeThreshold &&
        deltaY < 0 &&
        touchStartY > window.innerHeight - 100
      ) {
        setShowTrigger(true);
        setTimeout(() => setShowTrigger(false), 5000);
      }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  if (!showTrigger) {
    return (
      <>
        {/* Corner indicator */}
        <div 
          className="mobile-devtools-corner"
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, transparent 50%, rgba(0, 255, 0, 0.1) 50%)',
            pointerEvents: 'none',
            zIndex: 9998,
          }}
        />
        
        {/* Instructions hint (shows briefly on first load) */}
        <MobileDevToolsHint />
      </>
    );
  }

  return (
    <div className="mobile-devtools-trigger" style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(0, 0, 0, 0.95)',
      border: '2px solid #00ff00',
      borderRadius: '10px',
      padding: '15px',
      zIndex: 10000,
      animation: 'slideUp 0.3s ease-out',
      minWidth: '250px',
      textAlign: 'center',
    }}>
      <h4 style={{ color: '#00ff00', margin: '0 0 10px 0' }}>🛠️ Developer Tools</h4>
      
      <button
        onClick={() => {
          onOpenDevTools();
          setShowTrigger(false);
        }}
        style={{
          width: '100%',
          padding: '12px',
          background: 'rgba(0, 255, 0, 0.2)',
          border: '1px solid #00ff00',
          color: '#00ff00',
          borderRadius: '5px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        Open Dev Tools
      </button>
      
      <div style={{
        marginTop: '10px',
        fontSize: '11px',
        color: 'rgba(0, 255, 0, 0.6)',
      }}>
        <div>• Triple-tap corner to show again</div>
        <div>• 3-finger long press</div>
        <div>• Swipe up from bottom</div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, 100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * MobileDevToolsHint Component
 * Shows instructions briefly on first load
 */
function MobileDevToolsHint() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const hasSeenHint = localStorage.getItem('mobileDevToolsHintSeen');
    
    if (!hasSeenHint) {
      setTimeout(() => setShowHint(true), 2000);
      setTimeout(() => {
        setShowHint(false);
        localStorage.setItem('mobileDevToolsHintSeen', 'true');
      }, 8000);
    }
  }, []);

  if (!showHint) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.95)',
      border: '2px solid #00ff00',
      borderRadius: '10px',
      padding: '20px',
      zIndex: 10001,
      maxWidth: '300px',
      textAlign: 'center',
      animation: 'fadeIn 0.5s ease-out',
    }}>
      <h3 style={{ color: '#00ff00', margin: '0 0 15px 0' }}>
        📱 Mobile Dev Tools
      </h3>
      
      <div style={{ color: '#00ff00', fontSize: '14px', lineHeight: '1.6' }}>
        <p style={{ margin: '0 0 10px 0' }}>Access dev tools with:</p>
        
        <div style={{ textAlign: 'left', paddingLeft: '20px' }}>
          <div>• <strong>Triple-tap</strong> bottom-right corner</div>
          <div>• <strong>3-finger long press</strong> (2 sec)</div>
          <div>• <strong>Swipe up</strong> from bottom edge</div>
        </div>
        
        <p style={{ margin: '15px 0 0 0', fontSize: '12px', opacity: 0.7 }}>
          This message won't show again
        </p>
      </div>

      <button
        onClick={() => {
          setShowHint(false);
          localStorage.setItem('mobileDevToolsHintSeen', 'true');
        }}
        style={{
          marginTop: '15px',
          padding: '8px 20px',
          background: 'rgba(0, 255, 0, 0.2)',
          border: '1px solid #00ff00',
          color: '#00ff00',
          borderRadius: '5px',
          cursor: 'pointer',
        }}
      >
        Got it!
      </button>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default MobileDevTools;