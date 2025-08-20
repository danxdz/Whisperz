import { useState, useEffect, useRef } from 'react';
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
  
  // Keep track of subscriptions for cleanup
  const subscriptionsRef = useRef([]);

  useEffect(() => {
    if (!friendPublicKey) return;
    
    // Ensure services are available
    if (!webrtcService || !friendsService || !gunAuthService) {
      return;
    }

    const updateConnectionState = async (presence) => {
      try {
        if (!presence) {
          setConnectionState({
            status: 'disconnected',
            peerId: null,
            isOnline: false,
            lastSeen: null,
            latency: null,
            method: 'local'
          });
          return;
        }

        // Check if friend is actually online (within 5 minutes)
        const isActuallyOnline = presence.status === 'online' && 
                                  presence.lastSeen && 
                                  (Date.now() - presence.lastSeen) < 300000;
        
        if (presence.peerId && isActuallyOnline) {
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
          } else {
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
          // Offline or no peer ID
          setConnectionState({
            status: 'disconnected',
            peerId: presence.peerId || null,
            isOnline: false,
            lastSeen: presence.lastSeen || null,
            latency: null,
            method: 'local'
          });
        }
      } catch (error) {
        console.error('Error updating connection state:', error);
      }
    };

    // Subscribe to presence changes (real-time, no polling!)
    const gun = gunAuthService.gun;
    const presenceSub = gun.get('presence').get(friendPublicKey).on((data, key) => {
      if (data && typeof data === 'object' && !data._) {
        // Clean presence data
        const cleanPresence = {
          status: data.status,
          lastSeen: data.lastSeen,
          peerId: data.peerId
        };
        
        // Only log significant changes
        const isOnline = cleanPresence.status === 'online' && 
                        cleanPresence.lastSeen && 
                        (Date.now() - cleanPresence.lastSeen) < 300000;
        
        debugLogger.info(`[Presence] Friend ${friendPublicKey.substring(0, 8)}... ${isOnline ? 'online' : 'offline'}`);
        
        updateConnectionState(cleanPresence);
      }
    });

    // Store subscription for cleanup
    subscriptionsRef.current.push(presenceSub);

    // Subscribe to WebRTC connection events
    let webrtcUnsubscribe = null;
    if (webrtcService.onConnection) {
      webrtcUnsubscribe = webrtcService.onConnection((status, peerId, info) => {
        // Check if this connection is for our friend
        if (connectionState.peerId === peerId || status === 'connected') {
          friendsService.getFriendPresence(friendPublicKey).then(presence => {
            if (presence && presence.peerId === peerId) {
              debugLogger.info(`[WebRTC] Connection ${status} with friend`);
              updateConnectionState(presence);
            }
          }).catch(err => {
            console.error('Error checking friend presence:', err);
          });
        }
      });
      subscriptionsRef.current.push(webrtcUnsubscribe);
    }

    // Initial check (just once, not polling)
    friendsService.getFriendPresence(friendPublicKey)
      .then(presence => {
        debugLogger.info(`[Initial] Friend ${friendPublicKey.substring(0, 8)}... presence check`);
        updateConnectionState(presence);
      })
      .catch(err => console.error('Initial presence check failed:', err));

    // Cleanup function
    return () => {
      subscriptionsRef.current.forEach(sub => {
        if (sub && typeof sub === 'object' && sub.off) {
          sub.off();
        } else if (typeof sub === 'function') {
          sub();
        }
      });
      subscriptionsRef.current = [];
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
      
      // Check if already connecting or connected
      if (connectionState.status === 'webrtc') {
        logStatus('Already connected via P2P');
        return true;
      }
      
      if (connectionState.status === 'connecting') {
        logStatus('Connection already in progress');
        return false;
      }
      
      // Update state to connecting
      setConnectionState(prev => ({ ...prev, status: 'connecting' }));
      
      debugLogger.p2p(`📡 Connecting to peer: ${connectionState.peerId}`);
      
      // Add a small random delay to avoid simultaneous connections
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
      
      // Attempt connection
      await webrtcService.connectToPeer(connectionState.peerId);
      
      logStatus('P2P connection established!');
      return true;
      
    } catch (error) {
      logStatus(`Connection failed: ${error.message}`, true);
      setConnectionState(prev => ({ ...prev, status: 'gun' }));
      return false;
    }
  };

  return { connectionState, attemptWebRTCConnection };
}