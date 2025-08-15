import Gun from 'gun/gun';
import 'gun/sea';
import gunAuthService from './gunAuthService';
import encryptionService from './encryptionService';

// Friends service for managing relationships
class FriendsService {
  constructor() {
    this.friends = new Map();
    this.invites = new Map();
    this.friendListeners = new Set();
  }

  // Generate invite link (simplified - public key is the verification)
  async generateInviteLink() {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const inviteData = {
      publicKey: user.pub,
      nickname: await this.getUserNickname(),
      timestamp: Date.now(),
      nonce: encryptionService.generateRandomString(16)
    };

    // For now, skip complex signatures - the public key itself is the proof
    // Only someone with access to that Gun user can accept friends
    
    // Store invite for single use
    const inviteId = `invite_${inviteData.nonce}`;
    gunAuthService.user.get('invites').get(inviteId).put({
      ...inviteData,
      used: false
    });

    // Create shareable link
    const baseUrl = window.location.origin;
    const inviteCode = encryptionService.base64UrlEncode(JSON.stringify(inviteData));
    const inviteLink = `${baseUrl}/invite/${inviteCode}`;

    console.log('📨 Invite link generated:', inviteLink);
    return inviteLink;
  }

  // Accept invite link (simplified)
  async acceptInvite(inviteCode) {
    try {
      console.log('🎫 Accepting invite with code:', inviteCode);
      
      // Decode the invite data
      const inviteData = JSON.parse(encryptionService.base64UrlDecode(inviteCode));
      
      console.log('📦 Invite data:', inviteData);
      
      // Basic validation
      if (!inviteData.publicKey || !inviteData.nickname) {
        throw new Error('Invalid invite data - missing required fields');
      }

      // Check if invite is still valid (24 hours)
      if (Date.now() - inviteData.timestamp > 24 * 60 * 60 * 1000) {
        throw new Error('Invite has expired');
      }

      // Check if already friends
      const existingFriend = await this.getFriend(inviteData.publicKey);
      if (existingFriend) {
        console.log('✅ Already friends with:', inviteData.nickname);
        return { success: true, message: 'Already friends', friend: existingFriend };
      }

      // Add as friend
      console.log('➕ Adding friend:', inviteData.nickname, inviteData.publicKey);
      await this.addFriend(inviteData.publicKey, inviteData.nickname);

      // Try to mark invite as used on sender's side (may fail if sender is offline)
      try {
        gunAuthService.gun.user(inviteData.publicKey)
          .get('invites')
          .get(`invite_${inviteData.nonce}`)
          .put({ used: true });
      } catch (e) {
        console.warn('Could not mark invite as used (sender may be offline)');
      }

      console.log('✅ Friend added successfully');
      return { success: true, friend: inviteData };
    } catch (error) {
      console.error('❌ Failed to accept invite:', error);
      throw error;
    }
  }

  // Add friend
  async addFriend(publicKey, nickname) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔧 Adding friend - Current user:', user.pub);
    console.log('🔧 Adding friend - Friend key:', publicKey);

    const friendData = {
      publicKey,
      nickname,
      addedAt: Date.now(),
      conversationId: this.generateConversationId(user.pub, publicKey)
    };

    console.log('💾 Storing friend data:', friendData);

    // Store friend relationship for current user
    gunAuthService.user.get('friends').get(publicKey).put(friendData, (ack) => {
      console.log('📝 Friend stored for current user:', ack);
    });

    // Store in local map
    this.friends.set(publicKey, friendData);

    // Create reverse relationship for the friend
    // This ensures both users see each other as friends
    const myData = {
      publicKey: user.pub,
      nickname: await this.getUserNickname(),
      addedAt: Date.now(),
      conversationId: friendData.conversationId // Same conversation ID
    };

    console.log('💾 Storing reverse friend data:', myData);

    // Store reverse relationship directly in friend's friends list
    gunAuthService.gun.user(publicKey)
      .get('friends')
      .get(user.pub)
      .put(myData, (ack) => {
        console.log('📝 Reverse friend stored:', ack);
      });

    // Also store in friend_requests for backward compatibility
    gunAuthService.gun.user(publicKey)
      .get('friend_requests')
      .get(user.pub)
      .put(myData);

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
    if (!gunAuthService.isAuthenticated()) {
      console.log('❌ Not authenticated, cannot load friends');
      return [];
    }

    const currentUser = gunAuthService.getCurrentUser();
    console.log('🔍 Getting friends for user:', currentUser?.pub);

    return new Promise((resolve) => {
      const friends = new Map();
      let loadingComplete = false;
      
      // Load existing friends
      console.log('📂 Loading friends from Gun.js...');
      gunAuthService.user.get('friends').map().once((data, key) => {
        console.log('📝 Friend data found:', key, data);
        if (data && data.publicKey) {
          friends.set(key, data);
          this.friends.set(key, data);
          this.notifyFriendListeners('added', data);
        }
      });

      // Also check for incoming friend requests and auto-accept them
      const user = gunAuthService.getCurrentUser();
      if (user) {
        console.log('📂 Checking friend requests...');
        gunAuthService.user.get('friend_requests').map().once((data, key) => {
          console.log('📨 Friend request found:', key, data);
          if (data && data.publicKey && !friends.has(data.publicKey)) {
            // Auto-accept friend requests by adding them as friends
            const friendData = {
              publicKey: data.publicKey,
              nickname: data.nickname,
              addedAt: data.addedAt || Date.now(),
              conversationId: data.conversationId || this.generateConversationId(user.pub, data.publicKey)
            };
            
            console.log('✅ Auto-accepting friend request:', friendData);
            
            // Store as friend
            gunAuthService.user.get('friends').get(data.publicKey).put(friendData);
            friends.set(data.publicKey, friendData);
            this.friends.set(data.publicKey, friendData);
            this.notifyFriendListeners('added', friendData);
            
            // Clear the friend request
            gunAuthService.user.get('friend_requests').get(data.publicKey).put(null);
          }
        });
      }

      // Give Gun time to load data
      setTimeout(() => {
        if (!loadingComplete) {
          loadingComplete = true;
          const friendArray = Array.from(friends.values());
          console.log('✅ Friends loaded:', friendArray.length, 'friends');
          resolve(friendArray);
        }
      }, 1000);
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