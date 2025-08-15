import gunAuthService from './gunAuthService';
import encryptionService from './encryptionService';

// Friends service for managing relationships
class FriendsService {
  constructor() {
    this.friends = new Map();
    this.invites = new Map();
    this.friendListeners = new Set();
  }

  // Generate invite link
  async generateInviteLink() {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const inviteData = {
      publicKey: user.pub,
      nickname: await this.getUserNickname(),
      timestamp: Date.now(),
      nonce: encryptionService.generateRandomString(16)
    };

    const inviteString = JSON.stringify(inviteData);
    let secret = import.meta.env.VITE_INVITE_SECRET;
    
    // Use fallback in production if not configured (with warning)
    if (!secret) {
      console.error('SECURITY WARNING: Using fallback secret. Configure VITE_INVITE_SECRET in Vercel!');
      secret = 'TEMPORARY_FALLBACK_SECRET_PLEASE_CONFIGURE_IN_VERCEL_c6626f78f6e53ac812cd8d11';
    }
    
    // Security check - warn about default secrets
    if (secret === 'default-invite-secret' || secret === 'your-secret-key-here') {
      console.error('Security warning: Default secret detected');
    }
    
    const hmac = encryptionService.generateHMAC(inviteString, secret);

    const invitePayload = {
      data: encryptionService.base64UrlEncode(inviteString),
      hmac: hmac
    };

    // Store invite for single use
    const inviteId = `invite_${inviteData.nonce}`;
    gunAuthService.user.get('invites').get(inviteId).put({
      ...inviteData,
      used: false
    });

    // Create shareable link - use pathname instead of hash for better Vercel routing
    const baseUrl = window.location.origin;
    const inviteCode = encryptionService.base64UrlEncode(JSON.stringify(invitePayload));
    const inviteLink = `${baseUrl}/invite/${inviteCode}`;

    return inviteLink;
  }

  // Accept invite link
  async acceptInvite(inviteCode) {
    try {
      const invitePayload = JSON.parse(encryptionService.base64UrlDecode(inviteCode));
      const inviteData = JSON.parse(encryptionService.base64UrlDecode(invitePayload.data));
      
      // Verify HMAC
      let secret = import.meta.env.VITE_INVITE_SECRET;
      
      // Use fallback in production if not configured (with warning)
      if (!secret) {
        console.error('SECURITY WARNING: Using fallback secret. Configure VITE_INVITE_SECRET in Vercel!');
        secret = 'TEMPORARY_FALLBACK_SECRET_PLEASE_CONFIGURE_IN_VERCEL_c6626f78f6e53ac812cd8d11';
      }
      
      // Security check - warn about default secrets
      if (secret === 'default-invite-secret' || secret === 'your-secret-key-here') {
        console.error('Security warning: Default secret detected');
      }
      
      if (!encryptionService.verifyHMAC(JSON.stringify(inviteData), invitePayload.hmac, secret)) {
        throw new Error('Invalid invite signature');
      }

      // Check if invite is still valid (24 hours)
      if (Date.now() - inviteData.timestamp > 24 * 60 * 60 * 1000) {
        throw new Error('Invite has expired');
      }

      // Check if already friends
      const existingFriend = await this.getFriend(inviteData.publicKey);
      if (existingFriend) {
        return { success: true, message: 'Already friends', friend: existingFriend };
      }

      // Add as friend
      await this.addFriend(inviteData.publicKey, inviteData.nickname);

      // Mark invite as used on sender's side
      gunAuthService.gun.user(inviteData.publicKey)
        .get('invites')
        .get(`invite_${inviteData.nonce}`)
        .put({ used: true });

      return { success: true, friend: inviteData };
    } catch (error) {
      console.error('Failed to accept invite:', error);
      throw error;
    }
  }

  // Add friend
  async addFriend(publicKey, nickname) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const friendData = {
      publicKey,
      nickname,
      addedAt: Date.now(),
      conversationId: this.generateConversationId(user.pub, publicKey)
    };

    // Store friend relationship
    gunAuthService.user.get('friends').get(publicKey).put(friendData);

    // Store in local map
    this.friends.set(publicKey, friendData);

    // Notify friend (store reverse relationship)
    gunAuthService.gun.user(publicKey)
      .get('friend_requests')
      .get(user.pub)
      .put({
        publicKey: user.pub,
        nickname: await this.getUserNickname(),
        addedAt: Date.now(),
        conversationId: friendData.conversationId
      });

    this.notifyFriendListeners('added', friendData);
    return friendData;
  }

  // Remove friend
  async removeFriend(publicKey) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Remove from Gun
    gunAuthService.user.get('friends').get(publicKey).put(null);

    // Remove from local map
    this.friends.delete(publicKey);

    // Remove reverse relationship
    gunAuthService.gun.user(publicKey)
      .get('friend_requests')
      .get(user.pub)
      .put(null);

    this.notifyFriendListeners('removed', { publicKey });
  }

  // Get all friends
  async getFriends() {
    if (!gunAuthService.isAuthenticated()) return [];

    return new Promise((resolve) => {
      const friends = [];
      
      gunAuthService.user.get('friends').map().once((data, key) => {
        if (data && data.publicKey) {
          friends.push(data);
          this.friends.set(key, data);
        }
      });

      // Check for incoming friend requests
      const user = gunAuthService.getCurrentUser();
      if (user) {
        gunAuthService.user.get('friend_requests').map().once((data, key) => {
          if (data && data.publicKey && !this.friends.has(data.publicKey)) {
            // Auto-accept friend requests
            this.addFriend(data.publicKey, data.nickname);
          }
        });
      }

      setTimeout(() => resolve(Array.from(this.friends.values())), 500);
    });
  }

  // Get specific friend
  async getFriend(publicKey) {
    if (this.friends.has(publicKey)) {
      return this.friends.get(publicKey);
    }

    return new Promise((resolve) => {
      gunAuthService.user.get('friends').get(publicKey).once((data) => {
        if (data) {
          this.friends.set(publicKey, data);
        }
        resolve(data);
      });
    });
  }

  // Subscribe to friend updates
  subscribeToFriends(callback) {
    this.friendListeners.add(callback);

    // Subscribe to Gun updates
    const sub = gunAuthService.user.get('friends').map().on((data, key) => {
      if (data) {
        this.friends.set(key, data);
        callback('updated', data);
      } else if (this.friends.has(key)) {
        this.friends.delete(key);
        callback('removed', { publicKey: key });
      }
    });

    return () => {
      this.friendListeners.delete(callback);
      if (sub && sub.off) sub.off();
    };
  }

  // Get user nickname
  async getUserNickname() {
    const profile = await gunAuthService.getUserProfile();
    return profile?.nickname || 'Anonymous';
  }

  // Generate conversation ID
  generateConversationId(pub1, pub2) {
    // Sort public keys to ensure consistent ID
    const sorted = [pub1, pub2].sort();
    return `conv_${sorted[0]}_${sorted[1]}`;
  }

  // Get friend by conversation ID
  getFriendByConversation(conversationId) {
    for (const friend of this.friends.values()) {
      if (friend.conversationId === conversationId) {
        return friend;
      }
    }
    return null;
  }

  // Notify friend listeners
  notifyFriendListeners(event, data) {
    this.friendListeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Friend listener error:', error);
      }
    });
  }

  // Get friend presence with PeerJS ID
  async getFriendPresence(publicKey) {
    const presence = await gunAuthService.gun
      .get('presence')
      .get(publicKey)
      .once();

    return {
      ...presence,
      isOnline: presence?.status === 'online' && 
                presence?.lastSeen > Date.now() - 60000 // Consider online if seen in last minute
    };
  }

  // Clear all friends (dev mode)
  clearAllFriends() {
    gunAuthService.user.get('friends').put(null);
    this.friends.clear();
    this.notifyFriendListeners('cleared', {});
  }
}

export default new FriendsService();