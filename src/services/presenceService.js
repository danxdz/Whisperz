/**
 * Presence Service
 * Handles online/offline status broadcasting and real-time updates
 */

import gunAuthService from './gunAuthService';
import webrtcService from './webrtcService';

class PresenceService {
  constructor() {
    this.isOnline = false;
    this.presenceListeners = new Map();
    this.friendsStatus = new Map();
    this.heartbeatInterval = null;
    this.cleanupInterval = null;
  }

  /**
   * Initialize presence service
   */
  initialize() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    console.log('🟢 Initializing presence service...');
    
    // Set online status
    this.setOnline();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Start cleanup interval for stale presences
    this.startCleanup();
    
    // Listen for window events
    this.setupEventListeners();
  }

  /**
   * Set user as online
   */
  setOnline() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    this.isOnline = true;
    const peerId = webrtcService.getPeerId();
    
    const presence = {
      status: 'online',
      lastSeen: Date.now(),
      peerId: peerId || null,
      timestamp: Date.now()
    };

    // Update in Gun
    gunAuthService.gun.get('presence').get(user.pub).put(presence);
    
    // Broadcast to all connected WebRTC peers
    this.broadcastToWebRTCPeers({
      type: 'presence',
      status: 'online',
      from: user.pub,
      timestamp: Date.now()
    });

    console.log('✅ Set status to online:', presence);
  }

  /**
   * Set user as offline
   */
  setOffline() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    this.isOnline = false;
    
    const presence = {
      status: 'offline',
      lastSeen: Date.now(),
      peerId: null,
      timestamp: Date.now()
    };

    // Update in Gun
    gunAuthService.gun.get('presence').get(user.pub).put(presence);
    
    // Broadcast to all connected WebRTC peers BEFORE going offline
    this.broadcastToWebRTCPeers({
      type: 'presence',
      status: 'offline',
      from: user.pub,
      timestamp: Date.now()
    });

    console.log('⚫ Set status to offline');
  }

  /**
   * Start heartbeat to keep presence alive
   */
  startHeartbeat() {
    // Send heartbeat every 20 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.isOnline) {
        this.setOnline();
      }
    }, 20000);
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Start cleanup interval for stale presences
   */
  startCleanup() {
    // Check for stale presences every 10 seconds
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      this.friendsStatus.forEach((status, publicKey) => {
        // If friend hasn't been seen in 40 seconds, mark as offline
        if (status.lastSeen && (now - status.lastSeen) > 40000) {
          this.updateFriendStatus(publicKey, 'offline');
        }
      });
    }, 10000);
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Subscribe to friend's presence
   */
  subscribeFriendPresence(publicKey) {
    // Listen to Gun for this friend's presence
    const listener = gunAuthService.gun
      .get('presence')
      .get(publicKey)
      .on((data) => {
        if (data) {
          this.handlePresenceUpdate(publicKey, data);
        }
      });

    this.presenceListeners.set(publicKey, listener);
    
    // Also check current status
    this.checkFriendPresence(publicKey);
  }

  /**
   * Check friend's current presence
   */
  async checkFriendPresence(publicKey) {
    const presence = await new Promise((resolve) => {
      gunAuthService.gun
        .get('presence')
        .get(publicKey)
        .once((data) => resolve(data));
    });

    if (presence) {
      this.handlePresenceUpdate(publicKey, presence);
    }
  }

  /**
   * Handle presence update from Gun or WebRTC
   */
  handlePresenceUpdate(publicKey, data) {
    const now = Date.now();
    
    // Check if presence is fresh (within 40 seconds)
    const isOnline = data.status === 'online' && 
                    data.lastSeen && 
                    (now - data.lastSeen) < 40000;

    const status = {
      online: isOnline,
      status: data.status,
      lastSeen: data.lastSeen,
      peerId: data.peerId,
      timestamp: now
    };

    this.friendsStatus.set(publicKey, status);
    
    console.log(`👤 ${publicKey.substring(0, 8)}... is ${isOnline ? '🟢 online' : '⚫ offline'}`);
  }

  /**
   * Update friend status
   */
  updateFriendStatus(publicKey, status) {
    const currentStatus = this.friendsStatus.get(publicKey) || {};
    
    const newStatus = {
      ...currentStatus,
      online: status === 'online',
      status: status,
      lastSeen: Date.now(),
      timestamp: Date.now()
    };

    this.friendsStatus.set(publicKey, newStatus);
    
    console.log(`🔄 Updated ${publicKey.substring(0, 8)}... to ${status}`);
  }

  /**
   * Broadcast to all connected WebRTC peers
   */
  broadcastToWebRTCPeers(message) {
    const connectedPeers = webrtcService.getConnectedPeers();
    
    connectedPeers.forEach(peerId => {
      try {
        webrtcService.sendMessage(peerId, message);
      } catch (error) {
        console.error('Failed to send presence to peer:', peerId);
      }
    });
  }

  /**
   * Handle incoming WebRTC presence message
   */
  handleWebRTCPresence(fromPeerId, message) {
    if (message.type === 'presence') {
      console.log('📨 Received presence via WebRTC:', message);
      
      // Update friend status based on WebRTC message
      if (message.from) {
        this.updateFriendStatus(message.from, message.status);
      }
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📱 Page hidden - keeping online status');
        // Don't go offline when tab is hidden, just stop updates
      } else {
        console.log('📱 Page visible - updating presence');
        this.setOnline();
      }
    });

    // Handle before unload
    window.addEventListener('beforeunload', () => {
      this.setOffline();
    });

    // Handle WebRTC messages
    webrtcService.onMessage((peerId, data) => {
      if (data.type === 'presence') {
        this.handleWebRTCPresence(peerId, data);
      }
    });
  }

  /**
   * Get friend's online status
   */
  isFriendOnline(publicKey) {
    const status = this.friendsStatus.get(publicKey);
    return status?.online || false;
  }

  /**
   * Get all friends' status
   */
  getAllFriendsStatus() {
    const statusMap = new Map();
    
    this.friendsStatus.forEach((status, publicKey) => {
      statusMap.set(publicKey, status.online);
    });
    
    return statusMap;
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    console.log('🔴 Destroying presence service...');
    
    // Set offline before destroying
    this.setOffline();
    
    // Stop intervals
    this.stopHeartbeat();
    this.stopCleanup();
    
    // Clear listeners
    this.presenceListeners.forEach(listener => {
      if (listener && listener.off) {
        listener.off();
      }
    });
    
    this.presenceListeners.clear();
    this.friendsStatus.clear();
  }

  /**
   * Debug function
   */
  debug() {
    console.log('📊 Presence Service Debug:');
    console.log('Is online:', this.isOnline);
    console.log('Friends tracked:', this.friendsStatus.size);
    
    let onlineCount = 0;
    this.friendsStatus.forEach((status, publicKey) => {
      if (status.online) onlineCount++;
      console.log(`  ${publicKey.substring(0, 16)}... : ${status.online ? '🟢' : '⚫'} ${status.status}`);
    });
    
    console.log(`Summary: ${onlineCount} online, ${this.friendsStatus.size - onlineCount} offline`);
    
    return {
      isOnline: this.isOnline,
      totalFriends: this.friendsStatus.size,
      onlineFriends: onlineCount,
      offlineFriends: this.friendsStatus.size - onlineCount
    };
  }
}

// Create singleton instance
const presenceService = new PresenceService();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.presence = {
    debug: () => presenceService.debug(),
    setOnline: () => presenceService.setOnline(),
    setOffline: () => presenceService.setOffline(),
    check: (publicKey) => presenceService.checkFriendPresence(publicKey),
    isOnline: (publicKey) => presenceService.isFriendOnline(publicKey),
    getAll: () => presenceService.getAllFriendsStatus()
  };
  
  console.log(`
🟢 Presence Service Loaded!
Commands:
- presence.debug() - Show presence status
- presence.setOnline() - Set yourself online
- presence.setOffline() - Set yourself offline
- presence.check(publicKey) - Check friend's presence
- presence.isOnline(publicKey) - Is friend online?
- presence.getAll() - Get all friends' status
  `);
}

export default presenceService;