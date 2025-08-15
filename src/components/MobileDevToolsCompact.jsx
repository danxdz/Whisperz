import { useState, useEffect } from 'react';

/**
 * MobileDevToolsCompact Component
 * Ultra-compact dev tools for small screens (4-inch devices)
 * Optimized for 320-375px width screens
 */
function MobileDevToolsCompact({ onOpenDevTools }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('console');
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState(0);

  // Detect small screen
  const isSmallScreen = window.innerWidth <= 375;

  // Double-tap detection for small screens (easier than triple-tap)
  useEffect(() => {
    const handleTap = (e) => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTap;
      
      // Check if tapping in corner (smaller target for small screens)
      const x = e.touches?.[0]?.clientX || e.clientX;
      const y = e.touches?.[0]?.clientY || e.clientY;
      const cornerSize = 40; // Smaller corner area
      
      if (
        x > window.innerWidth - cornerSize &&
        y > window.innerHeight - cornerSize
      ) {
        if (timeSinceLastTap < 300) {
          // Double tap detected
          setIsOpen(true);
          setTapCount(0);
        } else {
          setTapCount(1);
        }
        setLastTap(now);
      }
    };

    window.addEventListener('touchstart', handleTap);
    return () => window.removeEventListener('touchstart', handleTap);
  }, [lastTap]);

  if (!isOpen) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '40px',
          height: '40px',
          background: `linear-gradient(135deg, transparent 60%, rgba(0, 255, 0, ${tapCount > 0 ? 0.3 : 0.1}) 60%)`,
          pointerEvents: 'none',
          zIndex: 9998,
          transition: 'background 0.3s',
        }}
      />
    );
  }

  const renderCompactTab = () => {
    switch (activeTab) {
      case 'console':
        return (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              fontSize: '10px',
              lineHeight: '1.3',
              padding: '5px'
            }}>
              <div style={{ color: '#00ff00' }}>[12:34:56] Log message</div>
              <div style={{ color: '#ff6666' }}>[12:34:57] Error occurred</div>
              <div style={{ color: '#ffff66' }}>[12:34:58] Warning</div>
            </div>
            <button
              onClick={() => console.clear()}
              style={{
                padding: '5px',
                fontSize: '10px',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '1px solid #00ff00',
                color: '#00ff00',
              }}
            >
              Clear
            </button>
          </div>
        );
      
      case 'network':
        return (
          <div style={{ padding: '5px', fontSize: '10px' }}>
            <div style={{ marginBottom: '5px' }}>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#00ff00',
                marginRight: '5px'
              }} />
              Gun.js: Connected
            </div>
            <div>
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#ffff00',
                marginRight: '5px'
              }} />
              WebRTC: Connecting
            </div>
          </div>
        );
      
      case 'actions':
        return (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '5px',
            padding: '5px'
          }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 5px',
                fontSize: '10px',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '1px solid #00ff00',
                color: '#00ff00',
              }}
            >
              🔄 Reload
            </button>
            <button
              onClick={() => console.clear()}
              style={{
                padding: '8px 5px',
                fontSize: '10px',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '1px solid #00ff00',
                color: '#00ff00',
              }}
            >
              🗑️ Clear
            </button>
            <button
              onClick={() => localStorage.clear()}
              style={{
                padding: '8px 5px',
                fontSize: '10px',
                background: 'rgba(255, 0, 0, 0.2)',
                border: '1px solid #ff0000',
                color: '#ff0000',
              }}
            >
              💾 Reset
            </button>
            <button
              onClick={onOpenDevTools}
              style={{
                padding: '8px 5px',
                fontSize: '10px',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '1px solid #00ff00',
                color: '#00ff00',
              }}
            >
              🛠️ Full
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: isSmallScreen ? '200px' : '250px',
      background: 'rgba(0, 0, 0, 0.95)',
      borderTop: '1px solid #00ff00',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideUp 0.2s ease-out',
    }}>
      {/* Compact Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px',
        borderBottom: '1px solid #00ff00',
        background: 'rgba(0, 0, 0, 0.8)',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 'bold',
          color: '#00ff00',
        }}>
          🛠️ Dev
        </div>
        
        {/* Tab buttons - icon only for space */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => setActiveTab('console')}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              background: activeTab === 'console' ? 'rgba(0, 255, 0, 0.3)' : 'transparent',
              border: '1px solid #00ff00',
              color: '#00ff00',
              borderRadius: '3px',
            }}
          >
            📝
          </button>
          <button
            onClick={() => setActiveTab('network')}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              background: activeTab === 'network' ? 'rgba(0, 255, 0, 0.3)' : 'transparent',
              border: '1px solid #00ff00',
              color: '#00ff00',
              borderRadius: '3px',
            }}
          >
            📡
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              background: activeTab === 'actions' ? 'rgba(0, 255, 0, 0.3)' : 'transparent',
              border: '1px solid #00ff00',
              color: '#00ff00',
              borderRadius: '3px',
            }}
          >
            ⚡
          </button>
        </div>
        
        <button
          onClick={() => setIsOpen(false)}
          style={{
            padding: '3px 8px',
            background: 'rgba(255, 0, 0, 0.2)',
            border: '1px solid #ff0000',
            color: '#ff0000',
            fontSize: '12px',
            borderRadius: '3px',
            fontWeight: 'bold',
          }}
        >
          ✕
        </button>
      </div>

      {/* Content Area */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        color: '#00ff00',
      }}>
        {renderCompactTab()}
      </div>

      {/* Mini help text */}
      <div style={{
        padding: '3px',
        fontSize: '9px',
        color: 'rgba(0, 255, 0, 0.5)',
        textAlign: 'center',
        borderTop: '1px solid rgba(0, 255, 0, 0.2)',
      }}>
        Double-tap corner to reopen • Swipe down to close
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default MobileDevToolsCompact;