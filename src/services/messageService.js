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

    // Check for offline messages periodically
    setInterval(() => {
      this.checkOfflineMessages();
    }, 5000);
  }

  // Send message with WebRTC first, Gun fallback
  async sendMessage(recipientPublicKey, content, metadata = {}) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const friend = await friendsService.getFriend(recipientPublicKey);
    if (!friend) throw new Error('Not a friend');

    const message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      content,
      from: user.pub,
      to: recipientPublicKey,
      timestamp: Date.now(),
      conversationId: friend.conversationId,
      ...metadata
    };

    // Try to encrypt message
    let encryptedMessage;
    try {
      encryptedMessage = await gunAuthService.encryptFor(message, recipientPublicKey);
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      encryptedMessage = message; // Fallback to unencrypted
    }

    // Try WebRTC first
    let sent = false;
    const presence = await friendsService.getFriendPresence(recipientPublicKey);
    
    if (presence.isOnline && presence.peerId) {
      try {
        // Try to connect if not already connected
        if (!webrtcService.getConnectionStatus(presence.peerId).connected) {
          await webrtcService.connectToPeer(presence.peerId, {
            publicKey: user.pub,
            nickname: await friendsService.getUserNickname()
          });
        }

        // Send via WebRTC
        await webrtcService.sendMessage(presence.peerId, {
          type: 'message',
          data: encryptedMessage
        });
        
        sent = true;
        message.deliveryMethod = 'webrtc';
        message.delivered = true;
      } catch (error) {
        console.warn('WebRTC send failed, falling back to Gun:', error);
      }
    }

    // Fallback to Gun for offline delivery
    if (!sent) {
      await hybridGunService.storeOfflineMessage(recipientPublicKey, encryptedMessage);
      message.deliveryMethod = 'gun';
      message.delivered = false;
    }

    // Store in conversation history
    await hybridGunService.storeMessageHistory(friend.conversationId, message);

    // Notify handlers
    this.notifyHandlers('sent', message);

    return message;
  }

  // Handle incoming message
  async handleIncomingMessage(peerId, data) {
    if (data.type !== 'message') return;

    try {
      // Decrypt message
      let message = data.data;
      if (message.from) {
        try {
          message = await gunAuthService.decryptFrom(data.data, message.from);
        } catch (error) {
          console.error('Failed to decrypt message:', error);
        }
      }

      // Validate message
      if (!message.content || !message.from) {
        console.warn('Invalid message received:', message);
        return;
      }

      // Get friend info
      const friend = await friendsService.getFriend(message.from);
      if (!friend) {
        console.warn('Message from non-friend:', message.from);
        return;
      }

      // Store in history
      await hybridGunService.storeMessageHistory(friend.conversationId, {
        ...message,
        received: true,
        receivedAt: Date.now()
      });

      // Notify handlers
      this.notifyHandlers('received', message);

    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  // Check for offline messages
  async checkOfflineMessages() {
    if (!gunAuthService.isAuthenticated()) return;

    try {
      const messages = await hybridGunService.getOfflineMessages();
      
      for (const msg of messages) {
        // Decrypt and process
        let decrypted;
        try {
          decrypted = await gunAuthService.decryptFrom(msg, msg.from);
        } catch (error) {
          console.error('Failed to decrypt offline message:', error);
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
            wasOffline: true
          });

          // Notify handlers
          this.notifyHandlers('received', decrypted);
        }

        // Mark as delivered
        hybridGunService.markMessageDelivered(msg.key);
      }
    } catch (error) {
      console.error('Error checking offline messages:', error);
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
        console.error('Message handler error:', error);
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
}

export default new MessageService();