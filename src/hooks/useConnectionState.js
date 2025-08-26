import { useState, useEffect, useRef } from 'react';
import gunOnlyP2P from '../services/gunOnlyP2P';
import friendsService from '../services/friendsService';
import gunAuthService from '../services/gunAuthService';
import debugLogger from '../utils/debugLogger';

// Simplified connection state hook for Gun.js only
export function useConnectionState(friendPublicKey) {
  const [connectionState, setConnectionState] = useState({
    status: 'disconnected', // 'disconnected', 'connecting', 'gun', 'local'
    isOnline: false,
    lastSeen: null,
    latency: null,
    method: 'gun' // Always Gun.js now
  });

  // Keep track of subscriptions for cleanup
  const subscriptionsRef = useRef([]);

  useEffect(() => {
    if (!friendPublicKey) return;

    // Ensure services are available
    if (!friendsService || !gunAuthService) {
      return;
    }

    const updateConnectionState = async () => {
      try {
        // Get friend's presence from Gun.js
        const presence = await friendsService.getFriendPresence(friendPublicKey);

        if (!presence) {
          setConnectionState({
            status: 'disconnected',
            isOnline: false,
            lastSeen: null,
            latency: null,
            method: 'gun'
          });
          return;
        }

        // Check if friend is actually online (within 5 minutes)
        const isActuallyOnline = presence.status === 'online' &&
                                  presence.lastSeen &&
                                  (Date.now() - presence.lastSeen) < 300000;

        if (isActuallyOnline) {
          setConnectionState({
            status: 'gun',
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
      // Validate data before processing
      if (data && typeof data === 'object' && !data._ && data.status) {
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

    // No WebRTC subscriptions needed - using Gun.js only

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

  // Simplified connection attempt - Gun.js is always available
  const attemptWebRTCConnection = async () => {
    debugLogger.info('[Gun.js] Connection attempt - decentralized messaging always available');
    return true; // Gun.js is always ready
  };

  return { connectionState, attemptWebRTCConnection };
}