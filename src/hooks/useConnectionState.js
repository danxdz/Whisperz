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

    let intervalId;

    const checkConnection = async () => {
      try {
        // Check friend's online presence
        const presence = await friendsService.getFriendPresence(friendPublicKey);
        
        if (presence.isOnline && presence.peerId) {
          // Check WebRTC connection status
          const connStatus = webrtcService.getConnectionStatus(presence.peerId);
          
          if (connStatus.connected) {
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
        console.error('Error checking connection state:', error);
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

    // Listen for WebRTC connection events
    const handleConnection = (peerId) => {
      checkConnection();
    };

    const handleDisconnection = (peerId) => {
      checkConnection();
    };

    webrtcService.on('peer-connected', handleConnection);
    webrtcService.on('peer-disconnected', handleDisconnection);

    return () => {
      clearInterval(intervalId);
      webrtcService.off('peer-connected', handleConnection);
      webrtcService.off('peer-disconnected', handleDisconnection);
    };
  }, [friendPublicKey]);

  const attemptWebRTCConnection = async () => {
    if (connectionState.peerId && connectionState.isOnline) {
      setConnectionState(prev => ({ ...prev, status: 'connecting' }));
      try {
        await webrtcService.connectToPeer(connectionState.peerId);
        setConnectionState(prev => ({ ...prev, status: 'webrtc', method: 'webrtc' }));
        return true;
      } catch (error) {
        console.error('Failed to establish WebRTC connection:', error);
        setConnectionState(prev => ({ ...prev, status: 'gun', method: 'gun' }));
        return false;
      }
    }
    return false;
  };

  return {
    connectionState,
    attemptWebRTCConnection
  };
}