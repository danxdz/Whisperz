import { useState, useEffect } from 'react';
import webrtcService from '../services/webrtcService';
import friendsService from '../services/friendsService';

export function useConnectionState(friendPublicKey) {
  const [connectionState, setConnectionState] = useState({
    status: 'disconnected', // 'disconnected', 'connecting', 'webrtc', 'gun', 'local'
    peerId: null,
    isOnline: false,
    lastSeen: null,
    latency: null,
    method: 'local' // Current delivery method
  });

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
    try {
      if (connectionState.peerId && connectionState.isOnline && webrtcService?.connectToPeer) {
        setConnectionState(prev => ({ ...prev, status: 'connecting' }));
        try {
          await webrtcService.connectToPeer(connectionState.peerId);
          setConnectionState(prev => ({ ...prev, status: 'webrtc', method: 'webrtc' }));
          return true;
        } catch (error) {
          // console.error('Failed to establish WebRTC connection:', error);
          setConnectionState(prev => ({ ...prev, status: 'gun', method: 'gun' }));
          return false;
        }
      }
    } catch (error) {
      // console.error('Error in attemptWebRTCConnection:', error);
    }
    return false;
  };

  return {
    connectionState,
    attemptWebRTCConnection
  };
}