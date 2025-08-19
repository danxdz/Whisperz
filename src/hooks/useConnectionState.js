import { useState, useEffect } from 'react';
import webrtcService from '../services/webrtcService';
import gunOnlyP2P from '../services/gunOnlyP2P';
import friendsService from '../services/friendsService';
import gunAuthService from '../services/gunAuthService';

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
    // console.log('🚀 Attempting WebRTC connection with state:', connectionState);
    
    // First check if our own WebRTC is ready
    if (!webrtcService.isReady()) {
      // console.error('❌ Our WebRTC is not ready!');
      const user = gunAuthService.getCurrentUser();
      if (user) {
        // console.log('🔧 Attempting to reinitialize WebRTC...');
        try {
          await webrtcService.initialize(user.pub);
          // console.log('✅ WebRTC reinitialized');
        } catch (error) {
          // console.error('❌ Failed to reinitialize WebRTC:', error);
          return false;
        }
      } else {
        // console.error('❌ No user found for WebRTC initialization');
        return false;
      }
    }
    
    try {
      if (connectionState.peerId && connectionState.isOnline && webrtcService?.connectToPeer) {
        // console.log('📡 Connecting to peer:', connectionState.peerId);
        // console.log('Our peer ID:', webrtcService.getPeerId());
        setConnectionState(prev => ({ ...prev, status: 'connecting' }));
        try {
          await webrtcService.connectToPeer(connectionState.peerId);
          // console.log('✅ WebRTC connection established!');
          setConnectionState(prev => ({ ...prev, status: 'webrtc', method: 'webrtc' }));
          return true;
        } catch (error) {
          // console.error('❌ Failed to establish WebRTC connection:', error);
          setConnectionState(prev => ({ ...prev, status: 'gun', method: 'gun' }));
          return false;
        }
      } else {
        // console.log('⚠️ Cannot connect - missing requirements:', {
        //   hasPeerId: !!connectionState.peerId,
        //   friendPeerId: connectionState.peerId,
        //   isOnline: connectionState.isOnline,
        //   hasConnectToPeer: !!webrtcService?.connectToPeer,
        //   ourWebRTCReady: webrtcService.isReady()
        // });
      }
    } catch (error) {
      // console.error('❌ Error in attemptWebRTCConnection:', error);
    }
    return false;
  };

  return {
    connectionState,
    attemptWebRTCConnection
  };
}