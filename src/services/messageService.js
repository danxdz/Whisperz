import webrtcService from './webrtcService';
import hybridGunService from './hybridGunService';
import gunAuthService from './gunAuthService';
import friendsService from './friendsService';

// Message service for handling all message operations
class MessageService {
  constructor() {
    this.messageHandlers = new Set();
    this.typingTimers = new Map();
  }

  // Initialize message service
  initialize() {
    // Subscribe to WebRTC messages
    webrtcService.onMessage((peerId, data) => {
      this.handleIncomingMessage(peerId, data);
    });

    // Offline messages are checked on initialization and friend selection
    // No need for periodic checking
  }

  // Send message with WebRTC first, Gun fallback
  async sendMessage(recipientPublicKey, content, metadata = {}) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const friend = await friendsService.getFriend(recipientPublicKey);
    if (!friend) throw new Error('Not a friend');
    
    // Check if P2P-only mode is enabled
    const p2pOnlyMode = localStorage.getItem('p2p_only_mode') === 'true';

    const message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      content,
      from: user.pub,
      to: recipientPublicKey,
      timestamp: Date.now(),
      conversationId: friend.conversationId,
      ...metadata
    };

    // console.log('📤 Sending message:', message);

    // Try to encrypt message using epub (encryption public key)
    let encryptedMessage;
    try {
      // Use epub from friend data for proper Gun.SEA encryption
      const friendData = await friendsService.getFriend(recipientPublicKey);
      const encryptionKey = friendData?.epub || recipientPublicKey; // Fallback to pub if epub not available
      encryptedMessage = await gunAuthService.encryptFor(message, encryptionKey);
    } catch (error) {
      debugLogger.error('Failed to encrypt message:', error);
      encryptedMessage = message; // Fallback to unencrypted
    }

    // Try WebRTC first
    let sentViaWebRTC = false;
    const presence = await friendsService.getFriendPresence(recipientPublicKey);

    // console.log('👤 Friend presence:', presence);

    if (presence.isOnline && presence.peerId) {
      try {
        // Try to connect if not already connected
        const connectionStatus = webrtcService.getConnectionStatus(presence.peerId);
        // console.log('🔌 Connection status:', connectionStatus);

        if (!connectionStatus.connected) {
          // console.log('🔄 Attempting to connect to peer:', presence.peerId);
          await webrtcService.connectToPeer(presence.peerId, {
            publicKey: user.pub,
            nickname: await friendsService.getUserNickname()
          });
          
          // Wait a bit for connection to establish
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Send via WebRTC
        // console.log('📡 Sending via WebRTC to:', presence.peerId);
        await webrtcService.sendMessage(presence.peerId, {
          type: 'message',
          data: encryptedMessage
        });

        sentViaWebRTC = true;
        message.deliveryMethod = 'webrtc';
        message.delivered = true;
        // console.log('✅ Message sent via WebRTC');
      } catch (error) {
        console.warn('❌ WebRTC send failed, will use Gun:', error.message);
        
        // If P2P-only mode, throw error instead of falling back
        if (p2pOnlyMode) {
          throw new Error('P2P-only mode: Message not sent (no P2P connection)');
        }
      }
    }

    // Only store in Gun if not P2P-only mode OR if sent via WebRTC (for history)
    if (!p2pOnlyMode || sentViaWebRTC) {
      // console.log('💾 Storing message in Gun.js');
      await hybridGunService.storeOfflineMessage(recipientPublicKey, encryptedMessage);
    }

    if (!sentViaWebRTC) {
      if (p2pOnlyMode) {
        throw new Error('P2P-only mode: Cannot send message without P2P connection');
      }
      message.deliveryMethod = 'gun';
      message.delivered = false;
      // console.log('📦 Message stored in Gun for offline delivery');
    }

    // Store in conversation history
    await hybridGunService.storeMessageHistory(friend.conversationId, message);
    // console.log('📜 Message added to history');

    // Notify handlers
    this.notifyHandlers('sent', message);

    return message;
  }

  // Handle incoming message
  async handleIncomingMessage(peerId, data) {
    if (data.type !== 'message') return;

    try {
      // Decrypt message using epub (encryption public key)
      let message = data.data;
      if (message.from) {
        try {
          // Use epub from friend data for proper Gun.SEA decryption
          const friendData = await friendsService.getFriend(message.from);
          const encryptionKey = friendData?.epub || message.from; // Fallback to pub if epub not available
          message = await gunAuthService.decryptFrom(data.data, encryptionKey);
        } catch (error) {
          debugLogger.error('Failed to decrypt message:', error);
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
        deliveryMethod: 'webrtc' // Message came via WebRTC
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
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      offlineRef.get(messageId).put(message);

      // console.log(`📥 Stored offline message for ${recipientPub} (queue: ${messageCount + 1}/${MAX_OFFLINE_MESSAGES})`);
    } catch (error) {
      // console.error('Failed to store offline message:', error);
      throw error;
    }
  }
}

export default new MessageService();