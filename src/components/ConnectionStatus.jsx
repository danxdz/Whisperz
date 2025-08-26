import { useState, useEffect, memo } from 'react';
import gunAuthService from '../services/gunAuthService';
// WebRTC removed - using Gun.js only

/**
 * ConnectionStatus Component
 * Displays real-time connection status for Gun.js and WebRTC
 * Shows as a collapsible status panel in the bottom-left corner
 */
const ConnectionStatus = memo(() => {
  const [gunStatus, setGunStatus] = useState('connecting');
  const [peerStatus, setPeerStatus] = useState('connecting');
  const [relayStatus, setRelayStatus] = useState('checking...');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Monitor Gun.js connection
    const checkGunConnection = () => {
      try {
        const gun = gunAuthService.gun;
        if (gun && gun._ && gun._.opt && gun._.opt.peers) {
          const peers = Object.keys(gun._.opt.peers);
          setGunStatus(peers.length > 0 ? 'connected' : 'disconnected');
          setRelayStatus(`${peers.length} relay${peers.length !== 1 ? 's' : ''}`);
        } else {
          setGunStatus('initializing');
          setRelayStatus('setting up...');
        }
      } catch (error) {
        // console.error('Gun status check error:', error);
        setGunStatus('error');
        setRelayStatus('error');
      }
    };

    // Monitor PeerJS connection
    const checkPeerConnection = () => {
      try {
        // WebRTC removed
        const peer = null;
        // WebRTC removed - always show as disconnected
        setPeerStatus('disconnected');
      } catch (error) {
        // console.error('Peer status check error:', error);
        setPeerStatus('error');
      }
    };

    // Check connections periodically
    checkGunConnection();
    checkPeerConnection();
    const interval = setInterval(() => {
      checkGunConnection();
      checkPeerConnection();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'connected': return '#00ff00';
      case 'connecting': case 'initializing': return '#ffff00';
      case 'disconnected': case 'destroyed': case 'error': return '#ff0000';
      default: return '#808080';
    }
  };

  if (isCollapsed) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '10px',
        left: '10px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid #00ff00',
        borderRadius: '4px',
        padding: '5px 10px',
        fontSize: '12px',
        zIndex: 999,
        cursor: 'pointer'
      }} onClick={() => setIsCollapsed(false)}>
        <span>📡 Status</span>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.9)',
      border: '1px solid #00ff00',
      borderRadius: '4px',
      padding: '10px',
      fontSize: '12px',
      zIndex: 999,
      minWidth: '200px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '5px'
      }}>
        <span style={{ fontWeight: 'bold' }}>Connection Status</span>
        <button
          onClick={() => setIsCollapsed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#00ff00',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            marginLeft: '10px'
          }}
        >−</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getStatusColor(gunStatus),
          marginRight: '8px',
          display: 'inline-block'
        }}></span>
        <span>Gun.js: {gunStatus} ({relayStatus})</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: getStatusColor(peerStatus),
          marginRight: '8px',
          display: 'inline-block'
        }}></span>
        <span>WebRTC: {peerStatus}</span>
      </div>
      {(gunStatus === 'disconnected' || gunStatus === 'error') && (
        <div style={{ marginTop: '10px', fontSize: '11px', color: '#ff0000' }}>
          ⚠️ Database connection failed. Check network.
        </div>
      )}
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';

export default ConnectionStatus;