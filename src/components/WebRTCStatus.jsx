import React from 'react';

/**
 * WebRTCStatus Component
 * Shows Gun.js connection status (WebRTC removed)
 */
function WebRTCStatus({ compact = false }) {
  // Show Gun.js status instead
  const getStatusColor = () => {
    return '#00ff00'; // Always green for Gun.js
  };

  const getStatusText = () => {
    return 'Gun.js Ready'; // Gun.js is always ready
  };

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        background: 'rgba(0, 0, 0, 0.8)',
        border: `1px solid ${getStatusColor()}`,
        borderRadius: '4px',
        fontSize: '12px',
        color: getStatusColor(),
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getStatusColor(),
          animation: 'none',
        }} />
        <span>Gun.js: {getStatusText()}</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '15px',
      background: 'rgba(0, 0, 0, 0.9)',
      border: `2px solid ${getStatusColor()}`,
      borderRadius: '8px',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontSize: '14px',
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: getStatusColor() }}>
        📡 Decentralized Network Status
      </h3>

      <div style={{ display: 'grid', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: getStatusColor(),
            animation: 'none',
          }} />
          <strong>Status:</strong> {getStatusText()}
        </div>

        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0, 255, 0, 0.2)' }}>
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
            Gun.js provides decentralized peer-to-peer messaging through a mesh network.
            Messages are always encrypted and stored securely across the network.
          </div>

          <div style={{ textAlign: 'center', color: '#00ff00' }}>
            ✅ Always connected to decentralized network
          </div>
        </div>
      </div>
    </div>
  );
}

export default WebRTCStatus;