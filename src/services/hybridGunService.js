import gunAuthService from './gunAuthService';

// Hybrid Gun.js service for data persistence
class HybridGunService {
  constructor() {
    this.gun = null;
    this.user = null;
    this.subscriptions = new Map();
  }

  // Initialize with Gun instance from auth service
  initialize() {
    this.gun = gunAuthService.gun;
    this.user = gunAuthService.user;
    return this.gun;
  }

  // Store offline message
  async storeOfflineMessage(recipientPub, message) {
    if (!this.gun) throw new Error('Gun not initialized');

    const messageId = `msg_${Date.now()}_${Math.random()}`;
    const messageData = {
      ...message,
      id: messageId,
      timestamp: Date.now(),
      delivered: false
    };

    // Store in recipient's offline messages
    this.gun.get('offline_messages')
      .get(recipientPub)
      .get(messageId)
      .put(messageData);

    return messageId;
  }

  // Get offline messages for current user
  async getOfflineMessages() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return [];

    return new Promise((resolve) => {
      const messages = [];
      
      this.gun.get('offline_messages')
        .get(user.pub)
        .map()
        .once((data, key) => {
          if (data && !data.delivered) {
            messages.push({ ...data, key });
          }
        });

      // Give time to collect messages
      setTimeout(() => resolve(messages), 500);
    });
  }

  // Mark message as delivered
  markMessageDelivered(messageKey) {
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    this.gun.get('offline_messages')
      .get(user.pub)
      .get(messageKey)
      .put({ delivered: true });
  }

  // Clear offline messages
  clearOfflineMessages() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    this.gun.get('offline_messages')
      .get(user.pub)
      .put(null);
  }

  // Store message history
  async storeMessageHistory(conversationId, message) {
    if (!this.user) throw new Error('Not authenticated');

    const messageId = `msg_${Date.now()}_${Math.random()}`;
    
    this.user.get('conversations')
      .get(conversationId)
      .get('messages')
      .get(messageId)
      .put(message);

    // Update last message timestamp
    this.user.get('conversations')
      .get(conversationId)
      .put({ lastMessageAt: Date.now() });

    return messageId;
  }

  // Get message history
  async getMessageHistory(conversationId, limit = 50) {
    if (!this.user) return [];

    return new Promise((resolve) => {
      const messages = [];
      
      this.user.get('conversations')
        .get(conversationId)
        .get('messages')
        .map()
        .once((data) => {
          if (data) {
            messages.push(data);
          }
        });

      setTimeout(() => {
        // Sort by timestamp and limit
        const sorted = messages
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
          .slice(-limit);
        resolve(sorted);
      }, 500);
    });
  }

  // Subscribe to conversation updates
  subscribeToConversation(conversationId, callback) {
    if (!this.user) return () => {};

    const sub = this.user.get('conversations')
      .get(conversationId)
      .get('messages')
      .map()
      .on((data, key) => {
        if (data) {
          callback({ ...data, key });
        }
      });

    const unsubscribe = () => {
      if (sub && sub.off) {
        sub.off();
      }
    };

    this.subscriptions.set(conversationId, unsubscribe);
    return unsubscribe;
  }

  // Store user presence
  updatePresence(status, metadata = {}) {
    if (!this.user) return;

    const presence = {
      status, // 'online', 'offline', 'away'
      lastSeen: Date.now(),
      peerId: metadata.peerId || null,
      ...metadata
    };

    this.user.get('presence').put(presence);
    
    // Also update in public space for friends
    const user = gunAuthService.getCurrentUser();
    if (user) {
      this.gun.get('presence')
        .get(user.pub)
        .put(presence);
    }
  }

  // Get user presence
  async getUserPresence(publicKey) {
    return new Promise((resolve) => {
      this.gun.get('presence')
        .get(publicKey)
        .once((data) => {
          resolve(data || { status: 'offline', lastSeen: null });
        });
    });
  }

  // Subscribe to presence updates
  subscribeToPresence(publicKey, callback) {
    const sub = this.gun.get('presence')
      .get(publicKey)
      .on((data) => {
        callback(data || { status: 'offline', lastSeen: null });
      });

    return () => {
      if (sub && sub.off) {
        sub.off();
      }
    };
  }

  // Store typing indicator
  setTypingIndicator(conversationId, isTyping) {
    if (!this.user) return;

    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    this.gun.get('typing')
      .get(conversationId)
      .get(user.pub)
      .put({
        isTyping,
        timestamp: Date.now()
      });

    // Auto-clear after 3 seconds
    if (isTyping) {
      setTimeout(() => {
        this.setTypingIndicator(conversationId, false);
      }, 3000);
    }
  }

  // Subscribe to typing indicators
  subscribeToTyping(conversationId, callback) {
    const sub = this.gun.get('typing')
      .get(conversationId)
      .map()
      .on((data, key) => {
        if (data && data.timestamp > Date.now() - 5000) {
          callback(key, data.isTyping);
        }
      });

    return () => {
      if (sub && sub.off) {
        sub.off();
      }
    };
  }

  // Get database statistics
  async getDatabaseStats() {
    const stats = {
      conversations: 0,
      messages: 0,
      offlineMessages: 0,
      friends: 0
    };

    if (!this.user) return stats;

    return new Promise((resolve) => {
      // Count conversations
      this.user.get('conversations').map().once(() => {
        stats.conversations++;
      });

      // Count messages
      this.user.get('conversations').map().get('messages').map().once(() => {
        stats.messages++;
      });

      // Count offline messages
      const user = gunAuthService.getCurrentUser();
      if (user) {
        this.gun.get('offline_messages').get(user.pub).map().once(() => {
          stats.offlineMessages++;
        });
      }

      // Count friends
      this.user.get('friends').map().once(() => {
        stats.friends++;
      });

      setTimeout(() => resolve(stats), 1000);
    });
  }

  // Clear all user data (for dev mode)
  async clearAllData() {
    if (!this.user) return;

    // Clear conversations
    this.user.get('conversations').put(null);
    
    // Clear friends
    this.user.get('friends').put(null);
    
    // Clear presence
    this.user.get('presence').put(null);

    // Clear offline messages
    const user = gunAuthService.getCurrentUser();
    if (user) {
      this.gun.get('offline_messages').get(user.pub).put(null);
    }

    return true;
  }

  // Cleanup subscriptions
  cleanup() {
    for (const unsubscribe of this.subscriptions.values()) {
      unsubscribe();
    }
    this.subscriptions.clear();
  }
}

export default new HybridGunService();