import hybridGunService from './hybridGunService';
import gunAuthService from './gunAuthService';
import friendsService from './friendsService';
import securityUtils from '../utils/securityUtils.js';
import debugLogger from '../utils/debugLogger.js';

// Message service for handling all message operations
class MessageService {
  constructor() {
    this.messageHandlers = new Set();
    this.typingTimers = new Map();
  }

  // Initialize message service
  initialize() {
    console.log('📨 Message service initialized');
  }

  async resolveFriendEpub(publicKey) {
    const friend = await friendsService.getFriend(publicKey);
    if (friend?.epub) {
      return friend.epub;
    }

    const epub = await friendsService.getUserEpub(publicKey);
    if (epub) {
      await friendsService.updateFriendEpub(publicKey, epub);
    }
    return epub;
  }

  async decryptConversationMessage(rawMessage) {
    if (!rawMessage) return null;

    if (rawMessage.content) {
      return rawMessage;
    }

    if (!rawMessage.encrypted || !rawMessage.payload) {
      return null;
    }

    const currentUser = gunAuthService.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    const peerPublicKey = rawMessage.from === currentUser.pub ? rawMessage.to : rawMessage.from;
    if (!peerPublicKey) {
      return null;
    }

    const peerEpub = await this.resolveFriendEpub(peerPublicKey);
    if (!peerEpub) {
      debugLogger.warn('Missing peer epub for message decryption', { peerPublicKey });
      return null;
    }

    try {
      const decrypted = await gunAuthService.decryptFrom(rawMessage.payload, peerEpub);
      if (!decrypted?.content) {
        return null;
      }

      return {
        ...decrypted,
        id: decrypted.id || rawMessage.id,
        from: decrypted.from || rawMessage.from,
        to: decrypted.to || rawMessage.to,
        timestamp: decrypted.timestamp || rawMessage.timestamp,
        conversationId: decrypted.conversationId || rawMessage.conversationId,
        deliveryMethod: 'gun',
        encryptionStatus: 'encrypted'
      };
    } catch (error) {
      debugLogger.error('Failed to decrypt conversation message', {
        error: error.message,
        messageId: rawMessage.id,
        peerPublicKey
      });
      return null;
    }
  }


  resolveConversationId(currentUserPublicKey, friend) {
    if (friend?.conversationId) {
      return friend.conversationId;
    }
    return friendsService.generateConversationId(currentUserPublicKey, friend.publicKey);
  }

  // Send message via Gun.js only
  async sendMessage(recipientPublicKey, content, metadata = {}) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const friend = await friendsService.getFriend(recipientPublicKey);
    if (!friend) throw new Error('Not a friend');

    const conversationId = this.resolveConversationId(user.pub, { ...friend, publicKey: recipientPublicKey });

    const message = {
      id: securityUtils.generateMessageId(),
      content,
      from: user.pub,
      to: recipientPublicKey,
      timestamp: Date.now(),
      conversationId,
      deliveryMethod: 'gun',
      encryptionStatus: 'encrypted',
      ...metadata
    };

    const peerEpub = await this.resolveFriendEpub(recipientPublicKey);

    let transportMessage;
    if (!peerEpub) {
      transportMessage = {
        ...message,
        encrypted: false,
        encryptionStatus: 'plaintext-fallback'
      };
    } else {
      try {
        const encryptedPayload = await gunAuthService.encryptFor(message, peerEpub);
        transportMessage = {
          id: message.id,
          from: message.from,
          to: message.to,
          timestamp: message.timestamp,
          conversationId: message.conversationId,
          encrypted: true,
          payload: encryptedPayload,
          deliveryMethod: 'gun'
        };
      } catch (error) {
        transportMessage = {
          ...message,
          encrypted: false,
          encryptionStatus: 'plaintext-fallback'
        };
      }
    }

    await hybridGunService.storeMessage(message.conversationId, transportMessage);
    await hybridGunService.storeMessageHistory(message.conversationId, message);

    this.notifyHandlers('sent', message);
    return message;
  }

  // Check for offline messages
  async checkOfflineMessages() {
    if (!gunAuthService.isAuthenticated()) return;

    try {
      const messages = await hybridGunService.getOfflineMessages();

      for (const msg of messages) {
        const decrypted = await this.decryptConversationMessage(msg);
        if (!decrypted) {
          hybridGunService.markMessageDelivered(msg.key);
          continue;
        }

        const friend = await friendsService.getFriend(decrypted.from);
        if (friend) {
          await hybridGunService.storeMessageHistory(friend.conversationId, {
            ...decrypted,
            received: true,
            receivedAt: Date.now(),
            wasOffline: true,
            deliveryMethod: 'gun'
          });

          this.notifyHandlers('received', decrypted);
        }

        hybridGunService.markMessageDelivered(msg.key);
      }
    } catch (error) {
      debugLogger.error('Error checking offline messages', error);
    }
  }

  // Get conversation history (normalized to readable messages)
  async getConversationHistory(conversationId, limit = 50) {
    const history = await hybridGunService.getMessageHistory(conversationId, limit * 2);

    const normalized = [];
    for (const entry of history) {
      const parsed = await this.decryptConversationMessage(entry);
      if (parsed?.content) {
        normalized.push(parsed);
      }
    }

    return normalized
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-limit);
  }

  // Subscribe to conversation updates (returns readable/decrypted messages)
  subscribeToConversation(conversationId, callback) {
    return hybridGunService.subscribeToConversation(conversationId, async (rawMessage) => {
      const parsed = await this.decryptConversationMessage(rawMessage);
      if (parsed?.content) {
        callback(parsed);
      }
    });
  }

  // Send typing indicator
  sendTypingIndicator(conversationId, isTyping = true) {
    if (this.typingTimers.has(conversationId)) {
      clearTimeout(this.typingTimers.get(conversationId));
    }

    hybridGunService.setTypingIndicator(conversationId, isTyping);

    if (isTyping) {
      const timer = setTimeout(() => {
        hybridGunService.setTypingIndicator(conversationId, false);
        this.typingTimers.delete(conversationId);
      }, 3000);
      this.typingTimers.set(conversationId, timer);
    }
  }

  // Subscribe to typing indicators
  subscribeToTyping(conversationId, callback) {
    return hybridGunService.subscribeToTyping(conversationId, callback);
  }

  // Register message handler
  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Notify all handlers
  notifyHandlers(event, data) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(event, data);
      } catch (error) {
        debugLogger.error('Message handler error', error);
      }
    });
  }

  // Clear conversation history
  async clearConversation(conversationId) {
    if (!gunAuthService.isAuthenticated()) return;

    gunAuthService.user
      .get('conversations')
      .get(conversationId)
      .get('messages')
      .put(null);
  }

  // Get unread message count
  async getUnreadCount(conversationId) {
    const messages = await this.getConversationHistory(conversationId);
    const lastRead = localStorage.getItem(`lastRead_${conversationId}`) || 0;
    return messages.filter(m => m.timestamp > lastRead && m.from !== gunAuthService.getCurrentUser()?.pub).length;
  }

  // Mark conversation as read
  markAsRead(conversationId) {
    localStorage.setItem(`lastRead_${conversationId}`, Date.now());
  }

  // Store offline message with queue limits
  async storeOfflineMessage(recipientPub, message) {
    const MAX_OFFLINE_MESSAGES = 100;
    const MAX_MESSAGE_SIZE = 10000;

    const messageSize = JSON.stringify(message).length;
    if (messageSize > MAX_MESSAGE_SIZE) {
      throw new Error('Message exceeds maximum size limit');
    }

    const offlineRef = hybridGunService.gun
      .get('offline_messages')
      .get(recipientPub);

    let messageCount = 0;
    await new Promise((resolve) => {
      offlineRef.map().once(() => {
        messageCount++;
      });
      setTimeout(resolve, 500);
    });

    if (messageCount >= MAX_OFFLINE_MESSAGES) {
      const messages = [];
      offlineRef.map().once((data, key) => {
        if (data) messages.push({ key, timestamp: data.timestamp });
      });

      setTimeout(() => {
        messages.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = messages.slice(0, 10);
        toRemove.forEach(msg => {
          offlineRef.get(msg.key).put(null);
        });
      }, 500);
    }

    const messageId = securityUtils.generateMessageId();
    offlineRef.get(messageId).put(message);
  }

}

export default new MessageService();
