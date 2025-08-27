/**
 * Online Status Fix
 * Comprehensive fix for online status detection and display
 */

import gunAuthService from '../services/gunAuthService';
import hybridGunService from '../services/hybridGunService';
import friendsService from '../services/friendsService';
// WebRTC removed - using Gun.js only

class OnlineStatusManager {
  constructor() {
    this.onlineUsers = new Map();
    this.listeners = new Set();
    this.checkInterval = null;
  }

  // Start monitoring online status
  startMonitoring() {
    // Starting online status monitoring...

    // Update own status immediately
    this.updateOwnStatus();

    // Check friends status
    this.checkAllFriendsStatus();

    // DISABLED - No need for periodic status updates
    // Status is updated on login, logout, and visibility change only
    // this.checkInterval = setInterval(() => {
    //   this.updateOwnStatus();
    //   this.checkAllFriendsStatus();
    // }, 5000);

    // Update on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateOwnStatus();
        this.checkAllFriendsStatus();
      }
    });
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Update own online status
  async updateOwnStatus() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    const status = {
      status: 'online',
      lastSeen: Date.now(),
      timestamp: Date.now()
    };

    // Update in Gun
    try {
      // Update in user space
      gunAuthService.user.get('presence').put(status);

      // Update in public space
      gunAuthService.gun.get('presence').get(user.pub).put(status);

      // Updated own presence
    } catch (error) {
      console.error('❌ Failed to update presence:', error);
    }
  }

  // Check a single friend's status
  async checkFriendStatus(publicKey) {
    try {
      // Get presence from Gun
      const presence = await new Promise((resolve) => {
        gunAuthService.gun
          .get('presence')
          .get(publicKey)
          .once((data) => {
            resolve(data);
          });
      });

      if (!presence) {
        this.onlineUsers.set(publicKey, false);
        return false;
      }

      // Check if online (seen in last 5 minutes)
      const isOnline = presence.status === 'online' &&
                      presence.lastSeen &&
                      (Date.now() - presence.lastSeen) < 300000; // 5 minutes, not 30 seconds

      this.onlineUsers.set(publicKey, isOnline);

      // Only log significant changes, not every check
      // console.log(`👤 Friend ${publicKey.substring(0, 8)}... is ${isOnline ? 'online' : 'offline'}`, presence);

      return isOnline;
    } catch (error) {
      console.error('❌ Error checking friend status:', error);
      this.onlineUsers.set(publicKey, false);
      return false;
    }
  }

  // Check all friends status
  async checkAllFriendsStatus() {
    try {
      const friends = await friendsService.getFriends();

      for (const friend of friends) {
        const publicKey = friend.publicKey || friend.pub;
        await this.checkFriendStatus(publicKey);
      }

      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error checking friends status:', error);
    }
  }

  // Subscribe to friend's presence updates
  subscribeFriendPresence(publicKey) {
    gunAuthService.gun
      .get('presence')
      .get(publicKey)
      .on((data) => {
        if (data) {
          const isOnline = data.status === 'online' &&
                          data.lastSeen &&
                          (Date.now() - data.lastSeen) < 30000;

          const wasOnline = this.onlineUsers.get(publicKey);
          this.onlineUsers.set(publicKey, isOnline);

          if (wasOnline !== isOnline) {
            console.log(`🔄 Friend ${publicKey.substring(0, 8)}... changed to ${isOnline ? 'online' : 'offline'}`);
            this.notifyListeners();
          }
        }
      });
  }

  // Get online status for a friend
  isOnline(publicKey) {
    return this.onlineUsers.get(publicKey) || false;
  }

  // Get all online statuses
  getAllStatuses() {
    return new Map(this.onlineUsers);
  }

  // Add listener for status changes
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners() {
    const statuses = this.getAllStatuses();
    this.listeners.forEach(listener => {
      try {
        listener(statuses);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  // Debug function
  debugStatus() {
    console.log('📊 Online Status Debug:');
    console.log('Total friends tracked:', this.onlineUsers.size);

    let onlineCount = 0;
    this.onlineUsers.forEach((isOnline, publicKey) => {
      if (isOnline) onlineCount++;
      console.log(`  ${publicKey.substring(0, 16)}... : ${isOnline ? '🟢 Online' : '⚫ Offline'}`);
    });

    console.log(`Summary: ${onlineCount} online, ${this.onlineUsers.size - onlineCount} offline`);
    return {
      total: this.onlineUsers.size,
      online: onlineCount,
      offline: this.onlineUsers.size - onlineCount,
      statuses: Object.fromEntries(this.onlineUsers)
    };
  }
}

// Create singleton instance
const onlineStatusManager = new OnlineStatusManager();

// Auto-start if user is logged in
if (typeof window !== 'undefined') {
  setTimeout(() => {
    const user = gunAuthService.getCurrentUser();
    if (user) {
      onlineStatusManager.startMonitoring();
    }
  }, 1000);

  // Expose to window for debugging
  window.onlineStatus = {
    debug: () => onlineStatusManager.debugStatus(),
    check: (publicKey) => onlineStatusManager.checkFriendStatus(publicKey),
    updateOwn: () => onlineStatusManager.updateOwnStatus(),
    checkAll: () => onlineStatusManager.checkAllFriendsStatus(),
    isOnline: (publicKey) => onlineStatusManager.isOnline(publicKey),
    getAll: () => onlineStatusManager.getAllStatuses()
  };

  console.log(`
🟢 Online Status Manager Loaded!
Commands:
- onlineStatus.debug() - Show all online statuses
- onlineStatus.check(publicKey) - Check specific friend
- onlineStatus.updateOwn() - Update your status
- onlineStatus.checkAll() - Check all friends
- onlineStatus.getAll() - Get all statuses
  `);
}

export default onlineStatusManager;