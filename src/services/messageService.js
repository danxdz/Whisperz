import hybridGunService from './hybridGunService';
import gunAuthService from './gunAuthService';
import friendsService from './friendsService';
import securityUtils from '../utils/securityUtils.js';

// Message service for handling all message operations
class MessageService {
  constructor() {
    this.messageHandlers = new Set();
    this.typingTimers = new Map();
  }

  // Initialize message service
  initialize() {
    // Message service initialized - ready for Gun.js messaging
    console.log('📨 Message service initialized');
  }

  // Send message via Gun.js only (simplified)
  async sendMessage(recipientPublicKey, content, metadata = {}) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const friend = await friendsService.getFriend(recipientPublicKey);
    if (!friend) throw new Error('Not a friend');

    const message = {
      id: securityUtils.generateMessageId(),
      content,
      from: user.pub,
      to: recipientPublicKey,
      timestamp: Date.now(),
      conversationId: friend.conversationId,
      deliveryMethod: 'gun',
      ...metadata
    };

    console.log('📤 Sending message via Gun.js:', message);

    // Encrypt message using epub (encryption public key)
    let encryptedMessage;
    try {
      const friendData = await friendsService.getFriend(recipientPublicKey);
      const encryptionKey = friendData?.epub || recipientPublicKey;

      console.log('🔐 Encrypting message for:', encryptionKey);
      encryptedMessage = await gunAuthService.encryptFor(message, encryptionKey);
      console.log('✅ Message encrypted successfully');
    } catch (error) {
      console.error('❌ Failed to encrypt message:', error);
      encryptedMessage = message; // Fallback to unencrypted
    }

    try {
      // Store message in Gun.js for delivery
      await hybridGunService.storeMessage(friend.conversationId, encryptedMessage);
      console.log('📦 Message stored in Gun.js');

      // Store in local conversation history
      await hybridGunService.storeMessageHistory(friend.conversationId, message);

      // Notify handlers
      this.notifyHandlers('sent', message);

      return message;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      throw error;
    }
  }

  // Handle incoming Gun.js message
  async handleIncomingMessage(conversationId, encryptedMessage) {
    try {
      // Decrypt message using epub (encryption public key)
      let message = encryptedMessage;
      if (message.from) {
        try {
          // Use epub from friend data for proper Gun.SEA decryption
          const friendData = await friendsService.getFriend(message.from);
          const encryptionKey = friendData?.epub || message.from; // Fallback to pub if epub not available
          message = await gunAuthService.decryptFrom(encryptedMessage, encryptionKey);
          console.log('✅ Message decrypted successfully');
        } catch (error) {
          console.error('❌ Failed to decrypt message:', error);
          // Use encrypted message as fallback
          message = encryptedMessage;
        }
      }

      // Validate message
      if (!message.content || !message.from) {
        // console.warn('Invalid message received:', message);
        return;
      }

      // Get friend info
      const friend = await friendsService.getFriend(message.from);
      if (!friend) {
        // console.warn('Message from non-friend:', message.from);
        return;
      }

      // Store in history with delivery method
      await hybridGunService.storeMessageHistory(friend.conversationId, {
        ...message,
        received: true,
        receivedAt: Date.now(),
        deliveryMethod: 'gun' // Message came via Gun.js
      });

      // Notify handlers
      this.notifyHandlers('received', message);

    } catch (error) {
      // console.error('Error handling incoming message:', error);
    }
  }

  // Check for offline messages
  async checkOfflineMessages() {
    if (!gunAuthService.isAuthenticated()) return;

    try {
      const messages = await hybridGunService.getOfflineMessages();

      for (const msg of messages) {
        // Decrypt and process using epub (encryption public key)
        let decrypted;
        try {
          // Use epub from friend data for proper Gun.SEA decryption
          const friendData = await friendsService.getFriend(msg.from);
          const encryptionKey = friendData?.epub || msg.from; // Fallback to pub if epub not available
          decrypted = await gunAuthService.decryptFrom(msg, encryptionKey);
        } catch (error) {
          debugLogger.error('Failed to decrypt offline message:', error);
          decrypted = msg;
        }

        // Get friend info
        const friend = await friendsService.getFriend(decrypted.from);
        if (friend) {
          // Store in history
          await hybridGunService.storeMessageHistory(friend.conversationId, {
            ...decrypted,
            received: true,
            receivedAt: Date.now(),
            wasOffline: true,
            deliveryMethod: 'gun' // Message came via Gun relay
          });

          // Notify handlers
          this.notifyHandlers('received', decrypted);
        }

        // Mark as delivered
        hybridGunService.markMessageDelivered(msg.key);
      }
    } catch (error) {
      // console.error('Error checking offline messages:', error);
    }
  }

  // Get conversation history
  async getConversationHistory(conversationId, limit = 50) {
    return await hybridGunService.getMessageHistory(conversationId, limit);
  }

  // Subscribe to conversation
  subscribeToConversation(conversationId, callback) {
    return hybridGunService.subscribeToConversation(conversationId, callback);
  }

  // Send typing indicator
  sendTypingIndicator(conversationId, isTyping = true) {
    // Clear existing timer
    if (this.typingTimers.has(conversationId)) {
      clearTimeout(this.typingTimers.get(conversationId));
    }

    // Set typing status
    hybridGunService.setTypingIndicator(conversationId, isTyping);

    // Auto-stop typing after 3 seconds
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
        // console.error('Message handler error:', error);
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
    try {
      const MAX_OFFLINE_MESSAGES = 100; // Limit per recipient
      const MAX_MESSAGE_SIZE = 10000; // 10KB max per message

      // Check message size
      const messageSize = JSON.stringify(message).length;
      if (messageSize > MAX_MESSAGE_SIZE) {
        // console.warn('Message too large for offline storage:', messageSize);
        throw new Error('Message exceeds maximum size limit');
      }

      // Get existing offline messages for this recipient
      const offlineRef = hybridGunService.gun
        .get('offline_messages')
        .get(recipientPub);

      // Count existing messages
      let messageCount = 0;
      await new Promise((resolve) => {
        offlineRef.map().once(() => {
          messageCount++;
        });
        setTimeout(resolve, 500);
      });

      // Check queue limit
      if (messageCount >= MAX_OFFLINE_MESSAGES) {
        // console.warn(`Offline message queue full for ${recipientPub} (${messageCount} messages)`);
        // Remove oldest messages if queue is full
        const messages = [];
        offlineRef.map().once((data, key) => {
          if (data) messages.push({ key, timestamp: data.timestamp });
        });

        // Sort by timestamp and remove oldest
        setTimeout(() => {
          messages.sort((a, b) => a.timestamp - b.timestamp);
          const toRemove = messages.slice(0, 10); // Remove 10 oldest
          toRemove.forEach(msg => {
            offlineRef.get(msg.key).put(null);
          });
        }, 500);
      }

      // Store the message
      const messageId = securityUtils.generateMessageId();
      offlineRef.get(messageId).put(message);

      // console.log(`📥 Stored offline message for ${recipientPub} (queue: ${messageCount + 1}/${MAX_OFFLINE_MESSAGES})`);
    } catch (error) {
      // console.error('Failed to store offline message:', error);
      throw error;
    }
  }
}

export default new MessageService();