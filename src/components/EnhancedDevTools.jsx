import React from 'react';

/**
 * ULTRA-MINIMAL DevTools Component - Complete isolation test
 * Removed ALL hooks, services, external dependencies, and complex logic
 */
function EnhancedDevTools({ isVisible, onClose, isMobilePanel = false }) {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#1a1a2e',
        color: '#ffffff',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #333333',
        maxWidth: '400px',
        width: '90%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, color: '#ffffff' }}>DevTools (Minimal Mode)</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#cccccc',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ margin: '0 0 10px 0', color: '#cccccc' }}>
            DevTools is currently in minimal mode due to initialization issues.
          </p>
          <p style={{ margin: '0 0 10px 0', color: '#cccccc', fontSize: '12px' }}>
            This is a temporary state while debugging temporal dead zone errors.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#0f3460',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnhancedDevTools;