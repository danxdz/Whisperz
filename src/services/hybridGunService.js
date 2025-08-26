import gunAuthService from './gunAuthService';
import securityUtils from '../utils/securityUtils.js';

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

  // Store message in conversation
  async storeMessage(conversationId, message) {
    if (!this.gun) throw new Error('Gun not initialized');

    const messageId = message.id || securityUtils.generateMessageId();

    // Store in public conversation space
    this.gun.get('conversations')
      .get(conversationId)
      .get('messages')
      .get(messageId)
      .put({
        ...message,
        id: messageId,
        storedAt: Date.now()
      });

    return messageId;
  }

  // Store offline message
  async storeOfflineMessage(recipientPub, message) {
    if (!this.gun) throw new Error('Gun not initialized');

    const messageId = securityUtils.generateMessageId();
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

  // Store message history - store in BOTH users' conversation histories
  async storeMessageHistory(conversationId, message) {
    if (!this.user) throw new Error('Not authenticated');

    const messageId = message.id || securityUtils.generateMessageId();

    // Store in sender's history
    this.user.get('conversations')
      .get(conversationId)
      .get('messages')
      .get(messageId)
      .put(message);

    // Also store in a public conversation space that both users can read
    // This ensures messages are visible to both parties
    this.gun.get('conversations')
      .get(conversationId)
      .get('messages')
      .get(messageId)
      .put({
        ...message,
        storedAt: Date.now()
      });

    // console.log('💾 Message stored in conversation:', conversationId, messageId);

    return messageId;
  }

  // Get message history - check both private and public spaces
  async getMessageHistory(conversationId, limit = 50) {
    if (!this.user) return [];

    return new Promise((resolve) => {
      const messages = new Map();
      let privateLoaded = false;
      let publicLoaded = false;

      const checkResolve = () => {
        if (privateLoaded && publicLoaded) {
          const sorted = Array.from(messages.values())
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-limit);
          // console.log(`📜 Loaded ${sorted.length} messages for conversation:`, conversationId);
          resolve(sorted);
        }
      };

      // Load from user's private space
      this.user.get('conversations')
        .get(conversationId)
        .get('messages')
        .map()
        .once((data, key) => {
          if (data && data.content) {
            messages.set(key, data);
          }
        });

      setTimeout(() => {
        privateLoaded = true;
        checkResolve();
      }, 1000);

      // Also load from public conversation space
      this.gun.get('conversations')
        .get(conversationId)
        .get('messages')
        .map()
        .once((data, key) => {
          if (data && data.content) {
            messages.set(key, data);
          }
        });

      setTimeout(() => {
        publicLoaded = true;
        checkResolve();
      }, 1500);
    });
  }

  // Subscribe to conversation updates - subscribe to both private and public
  subscribeToConversation(conversationId, callback) {
    if (!this.user) return () => {};

    const handlers = [];

    // Subscribe to private messages
    const privateSub = this.user.get('conversations')
      .get(conversationId)
      .get('messages')
      .map()
      .on((data, key) => {
        if (data && data.content) {
          // console.log('📨 New private message:', data);
          callback({ ...data, key });
        }
      });

    handlers.push(() => privateSub.off());

    // Subscribe to public conversation space
    const publicSub = this.gun.get('conversations')
      .get(conversationId)
      .get('messages')
      .map()
      .on((data, key) => {
        if (data && data.content) {
          // console.log('📨 New public message:', data);
          callback({ ...data, key });
        }
      });

    handlers.push(() => publicSub.off());

    // Return unsubscribe function
    return () => {
      handlers.forEach(unsub => unsub());
    };
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