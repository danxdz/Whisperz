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
        
        if (presence && presence.isOnline && presence.peerId) {
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
          } else if (presence.isOnline) {
            // Online but not connected via WebRTC
            setConnectionState({
              status: 'gun',
              peerId: presence.peerId,
              isOnline: true,
              lastSeen: presence.lastSeen,
              latency: null,
              method: 'gun'
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
    // Helper to show user notifications
    const showNotification = (message, isError = false) => {
      debugLogger[isError ? 'error' : 'info'](message);
      
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isError ? '#ff4444' : '#44ff44'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideDown 0.3s ease;
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
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
          showNotification('❌ Failed to initialize P2P', true);
          debugLogger.error('Failed to reinitialize WebRTC:', error);
          return false;
        }
      } else {
        showNotification('❌ Not logged in', true);
        debugLogger.error('No user found for WebRTC initialization');
        return false;
      }
    }
    
    try {
      // Check friend's online status
      if (!connectionState.isOnline) {
        showNotification('❌ Friend is offline', true);
        debugLogger.p2p('Friend is offline');
        return false;
      }
      
      // Check if friend has peer ID
      if (!connectionState.peerId) {
        showNotification('❌ Friend P2P not available', true);
        debugLogger.p2p('Friend peer ID not found');
        return false;
      }
      
      if (connectionState.peerId && connectionState.isOnline && webrtcService?.connectToPeer) {
        debugLogger.p2p(`📡 Connecting to peer: ${connectionState.peerId}`);
        setConnectionState(prev => ({ ...prev, status: 'connecting' }));
        
        try {
          await webrtcService.connectToPeer(connectionState.peerId);
          showNotification('✅ P2P connection established!');
          debugLogger.p2p('✅ WebRTC connection established!');
          setConnectionState(prev => ({ ...prev, status: 'webrtc', method: 'webrtc' }));
          return true;
        } catch (error) {
          const errorMsg = error.message || 'Connection timeout';
          showNotification(`❌ P2P failed: ${errorMsg}`, true);
          debugLogger.error('Failed to establish WebRTC connection:', error);
          setConnectionState(prev => ({ ...prev, status: 'gun', method: 'gun' }));
          return false;
        }
      } else {
        showNotification('❌ Cannot connect - missing requirements', true);
        debugLogger.warn('Missing P2P requirements:', {
          hasPeerId: !!connectionState.peerId,
          isOnline: connectionState.isOnline,
          hasConnectToPeer: !!webrtcService?.connectToPeer
        });
      }
    } catch (error) {
      showNotification('❌ P2P Error', true);
      debugLogger.error('Error in attemptWebRTCConnection:', error);
    }
    return false;
  };

  return {
    connectionState,
    attemptWebRTCConnection
  };
}