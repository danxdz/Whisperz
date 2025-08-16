import { useState, useEffect, useRef } from 'react';

/**
 * MobileDevTools Component
 * Mobile-optimized dev tools access with touch gestures
 */
function MobileDevTools({ onOpenDevTools }) {
  const [touchCount, setTouchCount] = useState(0);
  const touchTimeoutRef = useRef(null);
  const lastTapRef = useRef(0);

  // Double-tap detection for mobile (simplified from triple-tap)
  useEffect(() => {
    const handleDoubleTap = (e) => {
      const currentTime = Date.now();
      const tapLength = currentTime - lastTapRef.current;
      
      if (tapLength < 500 && tapLength > 0) {
        setTouchCount(prev => {
          const newCount = prev + 1;
          if (newCount === 2) {
            // Double tap detected - directly open DevTools
            onOpenDevTools();
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
        handleDoubleTap(e);
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

  // Removed long press detection - only using corner double-tap

  // Removed swipe gesture - only using corner double-tap

  // Only show subtle corner indicator
  return (
    <>
      {/* Corner indicator - subtle visual hint */}
      <div 
        className="mobile-devtools-corner"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '50px',
          height: '50px',
          background: 'linear-gradient(135deg, transparent 50%, rgba(102, 126, 234, 0.05) 50%)',
          pointerEvents: 'none',
          zIndex: 9998,
        }}
      />
      
      {/* Show hint only on first visit */}
      <MobileDevToolsHint />
    </>
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
          <div>• <strong>Double-tap</strong> bottom-right corner</div>
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