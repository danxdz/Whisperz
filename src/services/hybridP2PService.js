import gunAuthService from './gunAuthService';
import webrtcService from './webrtcService';

/**
 * Hybrid P2P Service
 * Uses Gun ONLY for WebRTC signaling, all messages go P2P
 */
class HybridP2PService {
  constructor() {
    this.peerExchange = new Map(); // Track peer ID exchanges
    this.autoConnectEnabled = true;
  }

  /**
   * Initialize hybrid P2P mode
   */
  async initialize() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    // Broadcast our WebRTC peer ID via Gun (for signaling only)
    this.broadcastPeerId();
    
    // Listen for friends' peer IDs and auto-connect
    this.listenForFriendsPeerIds();
    
    // Periodically refresh our peer ID broadcast
    setInterval(() => {
      if (this.autoConnectEnabled) {
        this.broadcastPeerId();
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Broadcast our WebRTC peer ID through Gun (signaling only)
   */
  broadcastPeerId() {
    const user = gunAuthService.getCurrentUser();
    const peerId = webrtcService.getPeerId();
    
    if (!user || !peerId) return;
    
    // Store in Gun's peer_exchange space (public)
    gunAuthService.gun.get('peer_exchange').get(user.pub).put({
      peerId: peerId,
      timestamp: Date.now(),
      nickname: user.alias || 'Anonymous',
      status: 'online'
    });
    
    console.log('📡 Broadcasting peer ID for P2P discovery:', peerId, 'for user:', user.pub);
  }

  /**
   * Listen for friends' peer IDs and auto-connect
   */
  async listenForFriendsPeerIds() {
    const { default: friendsService } = await import('./friendsService');
    const friends = await friendsService.getFriends();
    
    friends.forEach(friend => {
      const friendKey = friend.publicKey || friend.pub;
      
      // Listen for this friend's peer ID
      gunAuthService.gun.get('peer_exchange').get(friendKey).on((data) => {
        if (data && data.peerId && data.timestamp) {
          // Check if peer ID is fresh (within last minute)
          if (Date.now() - data.timestamp < 60000) {
            this.handleFriendOnline(friendKey, data.peerId, friend.nickname);
          }
        }
      });
    });
  }

  /**
   * Handle when a friend comes online
   */
  async handleFriendOnline(friendPublicKey, friendPeerId, friendNickname) {
    // Check if we're already connected
    const existingConn = webrtcService.getConnectionStatus(friendPeerId);
    if (existingConn.connected) {
      console.log('✅ Already connected to', friendNickname);
      return;
    }
    
    // Check if we recently tried to connect
    const lastAttempt = this.peerExchange.get(friendPublicKey);
    if (lastAttempt && Date.now() - lastAttempt < 10000) {
      return; // Don't retry within 10 seconds
    }
    
    console.log('🔗 Friend online, attempting P2P connection:', friendNickname);
    this.peerExchange.set(friendPublicKey, Date.now());
    
    try {
      // Attempt WebRTC connection
      const connection = await webrtcService.connectToPeer(friendPeerId);
      
      if (connection) {
        console.log('✅ P2P connection established with', friendNickname);
        
        // Store connection info
        connection.metadata = {
          publicKey: friendPublicKey,
          nickname: friendNickname,
          connectedAt: Date.now()
        };
        
        // Notify UI (optional)
        this.notifyConnectionEstablished(friendNickname);
      }
    } catch (error) {
      console.error('Failed to connect to', friendNickname, error);
    }
  }

  /**
   * Manually connect to a specific friend
   */
  async connectToFriend(friendPublicKey) {
    return new Promise((resolve) => {
      // Get friend's peer ID from Gun
      gunAuthService.gun.get('peer_exchange').get(friendPublicKey).once(async (data) => {
        if (data && data.peerId) {
          try {
            const connection = await webrtcService.connectToPeer(data.peerId);
            resolve({
              success: !!connection,
              peerId: data.peerId,
              timestamp: data.timestamp
            });
          } catch (error) {
            resolve({ success: false, error: error.message });
          }
        } else {
          resolve({ success: false, error: 'Friend not online' });
        }
      });
    });
  }

  /**
   * Get online status of all friends
   */
  async getFriendsOnlineStatus() {
    const { default: friendsService } = await import('./friendsService');
    const friends = await friendsService.getFriends();
    const statuses = new Map();
    
    for (const friend of friends) {
      const friendKey = friend.publicKey || friend.pub;
      
      await new Promise((resolve) => {
        gunAuthService.gun.get('peer_exchange').get(friendKey).once((data) => {
          if (data && data.timestamp) {
            // Consider online if updated within last 2 minutes
            const isOnline = Date.now() - data.timestamp < 120000;
            statuses.set(friendKey, {
              online: isOnline,
              lastSeen: data.timestamp,
              peerId: data.peerId
            });
          } else {
            statuses.set(friendKey, { online: false });
          }
          resolve();
        });
      });
    }
    
    return statuses;
  }

  /**
   * Notify UI about connection
   */
  notifyConnectionEstablished(friendNickname) {
    // Create a subtle notification
    const notification = document.createElement('div');
    notification.textContent = `🔗 P2P connected: ${friendNickname}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(67, 231, 123, 0.9);
      color: black;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Enable/disable auto-connect
   */
  setAutoConnect(enabled) {
    this.autoConnectEnabled = enabled;
    if (enabled) {
      this.broadcastPeerId();
    }
  }

  /**
   * Get connection mode info
   */
  getConnectionMode() {
    const privateMode = localStorage.getItem('P2P_PRIVATE_MODE') === 'true';
    
    return {
      mode: privateMode ? 'Hybrid P2P' : 'Standard',
      gunUsage: 'Signaling only',
      messageTransport: 'WebRTC P2P',
      privacy: 'High - Gun only sees peer IDs, not messages'
    };
  }
}

export default new HybridP2PService();