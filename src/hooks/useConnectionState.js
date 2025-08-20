import { useState, useEffect } from 'react';
import webrtcService from '../services/webrtcService';
import gunOnlyP2P from '../services/gunOnlyP2P';
import friendsService from '../services/friendsService';
import gunAuthService from '../services/gunAuthService';
import debugLogger from '../utils/debugLogger';

export function useConnectionState(friendPublicKey) {
  const [connectionState, setConnectionState] = useState({
    status: 'disconnected', // 'disconnected', 'connecting', 'webrtc', 'gun', 'local'
    peerId: null,
    isOnline: false,
    lastSeen: null,
    latency: null,
    method: 'local' // Current delivery method
  });
  
  // Debug logging
  // useEffect(() => {
  //   console.log('🔍 Connection state updated:', connectionState, 'for friend:', friendPublicKey);
  // }, [connectionState]);

  useEffect(() => {
    if (!friendPublicKey) return;
    
    // Ensure services are available
    if (!webrtcService || !friendsService) {
      // console.warn('Services not initialized for connection state');
      return;
    }

    let intervalId;

    const checkConnection = async () => {
      try {
        // Check friend's online presence
        const presence = await friendsService.getFriendPresence(friendPublicKey);
        // console.log('👤 Friend presence check:', presence, 'for:', friendPublicKey);
        
        if (presence && presence.peerId) {
          // Check if friend is actually online
          const isActuallyOnline = presence.status === 'online' || presence.isOnline;
          // Check WebRTC connection status
          const connStatus = webrtcService.getConnectionStatus ? 
            webrtcService.getConnectionStatus(presence.peerId) : 
            { connected: false };
          
          if (connStatus && connStatus.connected) {
            setConnectionState({
              status: 'webrtc',
              peerId: presence.peerId,
              isOnline: true,
              lastSeen: presence.lastSeen,
              latency: connStatus.latency || null,
              method: 'webrtc'
            });
          } else if (isActuallyOnline) {
            // Online but not connected via WebRTC
            setConnectionState({
              status: 'gun',
              peerId: presence.peerId,
              isOnline: true,
              lastSeen: presence.lastSeen,
              latency: null,
              method: 'gun'
            });
          } else {
            // Has peer ID but offline
            setConnectionState({
              status: 'disconnected',
              peerId: presence.peerId,
              isOnline: false,
              lastSeen: presence.lastSeen,
              latency: null,
              method: 'local'
            });
          }
        } else {
          // Offline
          setConnectionState({
            status: 'disconnected',
            peerId: null,
            isOnline: false,
            lastSeen: presence.lastSeen,
            latency: null,
            method: 'local'
          });
        }
      } catch (error) {
        // console.error('Error checking connection state:', error);
        setConnectionState(prev => ({
          ...prev,
          status: 'disconnected',
          method: 'local'
        }));
      }
    };

    // Initial check
    checkConnection();

    // Check every 5 seconds
    intervalId = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [friendPublicKey]);

  const attemptWebRTCConnection = async () => {
    // Just log to debugLogger, no popups
    const logStatus = (message, isError = false) => {
      if (isError) {
        debugLogger.error(`[P2P] ${message}`);
      } else {
        debugLogger.info(`[P2P] ${message}`);
      }
    };
    
    debugLogger.p2p('🚀 Attempting P2P connection');
    
    // First check if our own WebRTC is ready
    if (!webrtcService.isReady()) {
      debugLogger.p2p('❌ Our WebRTC is not ready');
      const user = gunAuthService.getCurrentUser();
      if (user) {
        debugLogger.p2p('🔧 Reinitializing WebRTC...');
        try {
          await webrtcService.initialize(user.pub);
          debugLogger.p2p('✅ WebRTC reinitialized');
        } catch (error) {
          logStatus('Failed to initialize P2P', true);
          return false;
        }
      } else {
        logStatus('Not logged in', true);
        return false;
      }
    }
    
    try {
      // Check friend's online status
      if (!connectionState.isOnline) {
        logStatus('Friend is offline', true);
        return false;
      }
      
      // Check if friend has peer ID
      if (!connectionState.peerId) {
        logStatus('Friend P2P not available', true);
        return false;
      }
      
      // Check if we're already connected
      if (connectionState.status === 'webrtc') {
        debugLogger.p2p('Already connected via WebRTC');
        return true;
      }
      
      // Check if already connecting to avoid conflicts
      if (connectionState.status === 'connecting') {
        debugLogger.p2p('Connection already in progress');
        return false;
      }
      
      if (connectionState.peerId && connectionState.isOnline && webrtcService?.connectToPeer) {
        debugLogger.p2p(`📡 Connecting to peer: ${connectionState.peerId}`);
        setConnectionState(prev => ({ ...prev, status: 'connecting' }));
        
        try {
          // Add a small random delay to avoid simultaneous connections
          if (Math.random() > 0.5) {
            await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
          }
          
          await webrtcService.connectToPeer(connectionState.peerId);
          logStatus('P2P connection established!');
          setConnectionState(prev => ({ ...prev, status: 'webrtc', method: 'webrtc' }));
          return true;
        } catch (error) {
          const errorMsg = error.message || 'Connection timeout';
          logStatus(`P2P failed: ${errorMsg}`, true);
          setConnectionState(prev => ({ ...prev, status: 'gun', method: 'gun' }));
          return false;
        }
      } else {
        logStatus('Cannot connect - missing requirements', true);
        debugLogger.warn('Missing P2P requirements:', {
          hasPeerId: !!connectionState.peerId,
          isOnline: connectionState.isOnline,
          hasConnectToPeer: !!webrtcService?.connectToPeer
        });
      }
    } catch (error) {
      logStatus('P2P Error: ' + error.message, true);
    }
    return false;
  };

  return {
    connectionState,
    attemptWebRTCConnection
  };
}