import { useState } from 'react';

/**
 * MobileDevToolsButton Component
 * Simple floating button for easy DevTools access on mobile
 */
function MobileDevToolsButton({ onClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Floating DevTools Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'transform 0.3s',
          transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)'
        }}
      >
        🛠️
      </button>

      {/* Expanded Menu */}
      {isExpanded && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.95)',
          borderRadius: '12px',
          padding: '10px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          zIndex: 9997,
          minWidth: '180px',
          border: '1px solid rgba(102, 126, 234, 0.3)'
        }}>
          <button
            onClick={() => {
              onClick();
              setIsExpanded(false);
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(102, 126, 234, 0.2)',
              border: '1px solid rgba(102, 126, 234, 0.5)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              marginBottom: '8px',
              cursor: 'pointer'
            }}
          >
            📊 Open DevTools
          </button>
          
          <button
            onClick={() => {
              localStorage.setItem('enableDevTools', 'true');
              window.location.reload();
            }}
            style={{
              width: '100%',
              padding: '12px',
              background: 'rgba(67, 233, 123, 0.2)',
              border: '1px solid rgba(67, 233, 123, 0.5)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              marginBottom: '8px',
              cursor: 'pointer'
            }}
          >
            ✅ Enable Permanently
          </button>
          
          <div style={{
            padding: '8px',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            textAlign: 'center'
          }}>
            Triple-tap corner for quick access
          </div>
        </div>
      )}
    </>
  );
}

export default MobileDevToolsButton;