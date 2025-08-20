// Fully decentralized P2P using only Gun.js peers
// No public servers, no STUN, no external dependencies

import gunAuthService from './gunAuthService';
import friendsService from './friendsService';

class GunOnlyP2P {
  constructor() {
    this.messageHandlers = new Set();
    this.connectionStatus = new Map(); // friendKey -> status
    this.isInitialized = false;
    this.userId = null;
  }

  // Initialize the P2P service
  async initialize(userId) {
    if (this.isInitialized) {
      // Gun P2P already initialized
      return true;
    }

    this.userId = userId;
    
    // Listen for direct messages via Gun
    this.listenForMessages();
    
    // Start presence broadcasting
    this.startPresenceBroadcast();
    
    this.isInitialized = true;
    console.log('🎉 Gun-only P2P initialized for user:', userId);
    return true;
  }

  // Listen for incoming messages
  listenForMessages() {
    const gun = gunAuthService.gun;
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    // Listen for messages in our inbox
    gun.get('p2p_messages')
      .get(user.pub)
      .map()
      .on((message, key) => {
        if (!message || key === '_' || !message.from) return;
        
        // Ignore old messages (older than 24 hours)
        if (message.timestamp && (Date.now() - message.timestamp) > 86400000) {
          return;
        }

        console.log('📨 Received P2P message from:', message.from);
        
        // Decrypt message if encrypted
        this.handleMessage(message.from, message);
        
        // Clean up processed message
        gun.get('p2p_messages').get(user.pub).get(key).put(null);
      });
  }

  // Start broadcasting presence
  startPresenceBroadcast() {
    const gun = gunAuthService.gun;
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    // Broadcast presence every 30 seconds
    const broadcastPresence = () => {
      const presence = {
        status: 'online',
        timestamp: Date.now(),
        gunPeers: this.getConnectedGunPeers()
      };
      
      gun.get('presence').get(user.pub).put(presence);
      console.log('📡 Broadcasting presence');
    };

    broadcastPresence();
    setInterval(broadcastPresence, 30000);
  }

  // Get list of connected Gun peers
  getConnectedGunPeers() {
    const gun = gunAuthService.gun;
    if (!gun || !gun._) return [];
    
    const peers = gun._.opt.peers;
    if (!peers) return [];
    
    // Get URLs of connected peers
    return Object.keys(peers).filter(url => {
      const peer = peers[url];
      return peer && peer.wire && !peer.wire.closed;
    });
  }

  // Send message to a friend
  async sendMessage(friendPublicKey, content) {
    const gun = gunAuthService.gun;
    const user = gunAuthService.getCurrentUser();
    if (!user) return false;

    try {
      // Encrypt message with friend's public key
      const encrypted = await this.encryptForFriend(friendPublicKey, content);
      
      const message = {
        from: user.pub,
        content: encrypted,
        timestamp: Date.now(),
        type: 'direct'
      };

      // Store in friend's inbox
      const messageId = `msg_${Date.now()}_${Math.random()}`;
      gun.get('p2p_messages')
        .get(friendPublicKey)
        .get(messageId)
        .put(message);

      console.log('📤 Sent P2P message to:', friendPublicKey);
      
      // Also store in conversation for history
      const conversationId = this.getConversationId(user.pub, friendPublicKey);
      gun.get('conversations')
        .get(conversationId)
        .get('messages')
        .get(messageId)
        .put({
          ...message,
          to: friendPublicKey
        });

      return true;
    } catch (error) {
      console.error('❌ Failed to send P2P message:', error);
      return false;
    }
  }

  // Encrypt message for friend
  async encryptForFriend(friendPublicKey, content) {
    try {
      // Get friend's public key
      const friend = await friendsService.getFriend(friendPublicKey);
      if (!friend) {
        throw new Error('Friend not found');
      }

      // Use Gun's SEA to encrypt
      const user = gunAuthService.getCurrentUser();
      const secret = await gunAuthService.gun.SEA.secret(friend.epub || friendPublicKey, user);
      const encrypted = await gunAuthService.gun.SEA.encrypt(content, secret);
      
      return encrypted;
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      // Return unencrypted as fallback
      return content;
    }
  }

  // Decrypt message from friend
  async decryptFromFriend(friendPublicKey, encryptedContent) {
    try {
      // Get friend's public key
      const friend = await friendsService.getFriend(friendPublicKey);
      if (!friend) {
        throw new Error('Friend not found');
      }

      // Use Gun's SEA to decrypt
      const user = gunAuthService.getCurrentUser();
      const secret = await gunAuthService.gun.SEA.secret(friend.epub || friendPublicKey, user);
      const decrypted = await gunAuthService.gun.SEA.decrypt(encryptedContent, secret);
      
      return decrypted || encryptedContent;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      // Return as-is if decryption fails
      return encryptedContent;
    }
  }

  // Handle incoming message
  async handleMessage(from, message) {
    try {
      // Decrypt if needed
      let content = message.content;
      if (typeof content === 'string' && content.startsWith('SEA{')) {
        content = await this.decryptFromFriend(from, content);
      }

      const processedMessage = {
        ...message,
        content: content,
        decrypted: true
      };

      console.log('📥 Processing message from:', from);
      
      // Notify all message handlers
      this.messageHandlers.forEach(handler => {
        handler(from, processedMessage);
      });
    } catch (error) {
      console.error('Failed to handle message:', error);
    }
  }

  // Register message handler
  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Check connection to friend
  async checkConnection(friendPublicKey) {
    const gun = gunAuthService.gun;
    
    return new Promise((resolve) => {
      gun.get('presence').get(friendPublicKey).once((presence) => {
        if (!presence) {
          resolve({ connected: false, status: 'offline' });
          return;
        }

        const isOnline = presence.timestamp && (Date.now() - presence.timestamp) < 120000;
        const status = isOnline ? 'online' : 'offline';
        
        // Check if we share Gun peers
        const ourPeers = this.getConnectedGunPeers();
        const theirPeers = presence.gunPeers || [];
        const sharedPeers = ourPeers.filter(p => theirPeers.includes(p));
        
        resolve({
          connected: isOnline,
          status: status,
          lastSeen: presence.timestamp,
          sharedPeers: sharedPeers.length > 0,
          directPath: sharedPeers.length > 0 ? 'gun-mesh' : 'gun-relay'
        });
      });
    });
  }

  // Get conversation ID
  getConversationId(user1, user2) {
    return [user1, user2].sort().join('_');
  }

  // Get connection status
  async getConnectionStatus(friendPublicKey) {
    return await this.checkConnection(friendPublicKey);
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized;
  }

  // Destroy the service
  destroy() {
    this.messageHandlers.clear();
    this.connectionStatus.clear();
    this.isInitialized = false;
    console.log('💥 Gun P2P service destroyed');
  }
}

export default new GunOnlyP2P();