import { useEffect, useState } from 'react';
import webrtcService from '../services/webrtcService';
import hybridGunService from '../services/hybridGunService';
import gunAuthService from '../services/gunAuthService';

/**
 * Custom hook for managing WebRTC connection and presence
 * Ensures WebRTC is properly initialized and presence is updated
 */
export function useWebRTC() {
  const [webrtcStatus, setWebrtcStatus] = useState('disconnected');
  const [peerId, setPeerId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    let presenceInterval;

    const initializeWebRTC = async () => {
      const user = gunAuthService.getCurrentUser();
      if (!user) {
        console.log('⚠️ No user found, skipping WebRTC initialization');
        return;
      }

      try {
        setWebrtcStatus('connecting');
        console.log('🚀 Initializing WebRTC for user:', user.pub);
        
        // Initialize WebRTC
        const id = await webrtcService.initialize(user.pub);
        
        if (!mounted) return;
        
        console.log('✅ WebRTC initialized with peer ID:', id);
        setPeerId(id);
        setWebrtcStatus('connected');
        setError(null);
        
        // Update presence with peer ID
        hybridGunService.updatePresence('online', {
          peerId: id,
          webrtcEnabled: true,
          timestamp: Date.now()
        });
        
        // Keep presence updated
        presenceInterval = setInterval(() => {
          if (webrtcService.peer?.open) {
            hybridGunService.updatePresence('online', {
              peerId: webrtcService.peerId,
              webrtcEnabled: true,
              timestamp: Date.now()
            });
          }
        }, 30000); // Update every 30 seconds
        
      } catch (err) {
        if (!mounted) return;
        
        console.error('❌ WebRTC initialization failed:', err);
        setWebrtcStatus('error');
        setError(err.message);
        
        // Update presence without peer ID
        hybridGunService.updatePresence('online', {
          peerId: null,
          webrtcEnabled: false,
          timestamp: Date.now()
        });
      }
    };

    // Initialize on mount
    initializeWebRTC();

    // Listen for connection status changes
    const checkStatus = setInterval(() => {
      if (webrtcService.peer) {
        if (webrtcService.peer.open) {
          setWebrtcStatus('connected');
        } else if (webrtcService.peer.disconnected) {
          setWebrtcStatus('disconnected');
        } else if (webrtcService.peer.destroyed) {
          setWebrtcStatus('destroyed');
        }
      }
    }, 2000);

    // Cleanup on unmount
    return () => {
      mounted = false;
      clearInterval(checkStatus);
      clearInterval(presenceInterval);
      
      // Update presence to offline
      hybridGunService.updatePresence('offline', {
        peerId: null,
        webrtcEnabled: false,
        timestamp: Date.now()
      });
    };
  }, []);

  // Reconnect function
  const reconnect = async () => {
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    try {
      setWebrtcStatus('reconnecting');
      await webrtcService.destroy();
      const id = await webrtcService.initialize(user.pub);
      setPeerId(id);
      setWebrtcStatus('connected');
      setError(null);
      
      // Update presence with new peer ID
      hybridGunService.updatePresence('online', {
        peerId: id,
        webrtcEnabled: true,
        timestamp: Date.now()
      });
    } catch (err) {
      setWebrtcStatus('error');
      setError(err.message);
    }
  };

  // Connect to a specific peer
  const connectToPeer = async (targetPeerId, metadata = {}) => {
    try {
      await webrtcService.connectToPeer(targetPeerId, metadata);
      return true;
    } catch (err) {
      console.error('Failed to connect to peer:', err);
      return false;
    }
  };

  // Send message to peer
  const sendToPeer = async (targetPeerId, data) => {
    try {
      await webrtcService.sendMessage(targetPeerId, data);
      return true;
    } catch (err) {
      console.error('Failed to send to peer:', err);
      return false;
    }
  };

  return {
    status: webrtcStatus,
    peerId,
    error,
    reconnect,
    connectToPeer,
    sendToPeer,
    isConnected: webrtcStatus === 'connected',
    isConnecting: webrtcStatus === 'connecting' || webrtcStatus === 'reconnecting'
  };
}

export default useWebRTC;