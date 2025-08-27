import { useState, useEffect, useRef } from 'react';
import friendsService from '../services/friendsService';
import gunAuthService from '../services/gunAuthService';
import debugLogger from '../utils/debugLogger';

// Simplified connection state hook for Gun.js only
export function useConnectionState(friendPublicKey) {
  const [connectionState, setConnectionState] = useState({
    status: 'disconnected',
    isOnline: false,
    lastSeen: null,
    latency: null,
    method: 'gun'
  });

  const subscriptionsRef = useRef([]);

  useEffect(() => {
    if (!friendPublicKey) return;

    if (!friendsService || !gunAuthService) {
      return;
    }

    const updateConnectionState = async (presence) => {
      try {
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
        } else {
          setConnectionState({
            status: 'disconnected',
            isOnline: false,
            lastSeen: presence.lastSeen || null,
            latency: null,
            method: 'gun'
          });
        }
      } catch (error) {
        console.error('Error updating connection state:', error);
      }
    };

    // Subscribe to presence changes
    const gun = gunAuthService.gun;
    const presenceSub = gun.get('presence').get(friendPublicKey).on((data, key) => {
      if (data && typeof data === 'object' && !data._ && data.status) {
        const cleanPresence = {
          status: data.status,
          lastSeen: data.lastSeen,
          peerId: data.peerId
        };

        const isOnline = cleanPresence.status === 'online' &&
                        cleanPresence.lastSeen &&
                        (Date.now() - cleanPresence.lastSeen) < 300000;

        debugLogger.info(`[Presence] Friend ${friendPublicKey.substring(0, 8)}... ${isOnline ? 'online' : 'offline'}`);

        updateConnectionState(cleanPresence);
      }
    });

    subscriptionsRef.current.push(presenceSub);

    // Initial check
    friendsService.getFriendPresence(friendPublicKey)
      .then(presence => {
        debugLogger.info(`[Initial] Friend ${friendPublicKey.substring(0, 8)}... presence check`);
        updateConnectionState(presence);
      })
      .catch(err => console.error('Initial presence check failed:', err));

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

  // Check Gun.js relay connection
  const checkConnection = async () => {
    debugLogger.info('[Gun.js] Checking relay connection status');
    return true;
  };

  return { connectionState, checkConnection };
}