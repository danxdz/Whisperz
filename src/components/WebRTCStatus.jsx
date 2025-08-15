import React from 'react';
import { useWebRTC } from '../hooks/useWebRTC';

/**
 * WebRTCStatus Component
 * Shows WebRTC connection status and provides reconnection controls
 */
function WebRTCStatus({ compact = false }) {
  const { status, peerId, error, reconnect, isConnected, isConnecting } = useWebRTC();

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return '#00ff00';
      case 'connecting':
      case 'reconnecting': return '#ffff00';
      case 'disconnected':
      case 'destroyed':
      case 'error': return '#ff0000';
      default: return '#808080';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return 'Reconnecting...';
      case 'disconnected': return 'Disconnected';
      case 'destroyed': return 'Connection Lost';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
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
          animation: isConnecting ? 'pulse 1s infinite' : 'none',
        }} />
        <span>WebRTC: {getStatusText()}</span>
        {!isConnected && !isConnecting && (
          <button
            onClick={reconnect}
            style={{
              padding: '2px 6px',
              background: 'rgba(0, 255, 0, 0.2)',
              border: '1px solid #00ff00',
              borderRadius: '3px',
              color: '#00ff00',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        )}
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
        📡 WebRTC Status
      </h3>
      
      <div style={{ display: 'grid', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: getStatusColor(),
            animation: isConnecting ? 'pulse 1s infinite' : 'none',
          }} />
          <strong>Status:</strong> {getStatusText()}
        </div>
        
        {peerId && (
          <div>
            <strong>Peer ID:</strong>
            <div style={{
              marginTop: '4px',
              padding: '4px 8px',
              background: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '4px',
              fontSize: '11px',
              wordBreak: 'break-all',
              userSelect: 'text',
            }}>
              {peerId}
            </div>
          </div>
        )}
        
        {error && (
          <div style={{ color: '#ff6666' }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(0, 255, 0, 0.2)' }}>
          <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>
            WebRTC enables direct peer-to-peer messaging when both users are online.
            Messages fall back to Gun.js storage when peers can't connect directly.
          </div>
          
          {!isConnected && !isConnecting && (
            <button
              onClick={reconnect}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(0, 255, 0, 0.2)',
                border: '1px solid #00ff00',
                borderRadius: '4px',
                color: '#00ff00',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              🔄 Reconnect WebRTC
            </button>
          )}
          
          {isConnecting && (
            <div style={{ textAlign: 'center', color: '#ffff00' }}>
              Establishing connection...
            </div>
          )}
          
          {isConnected && (
            <div style={{ textAlign: 'center', color: '#00ff00' }}>
              ✅ Ready for P2P messaging
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default WebRTCStatus;