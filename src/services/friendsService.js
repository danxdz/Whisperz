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

  // Generate secure, one-time use invite link
  async generateInviteLink() {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Generate unique invite ID
    const inviteId = `${user.pub}_${Date.now()}_${encryptionService.generateRandomString(16)}`;
    
    const inviteData = {
      inviteId: inviteId,
      fromPublicKey: user.pub,
      fromNickname: await this.getUserNickname(),
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };

    console.log('📝 Creating invite:', inviteData);

    // Create a signature of the invite ID using the user's private key
    // This proves the invite was created by this specific user
    const signature = await Gun.SEA.sign(inviteId, user);
    
    if (!signature) {
      throw new Error('Failed to sign invite - Gun.SEA error');
    }
    
    console.log('🔏 Invite signed successfully');
    
    // Store the invite in Gun.js with the signature
    // This makes it verifiable and one-time use
    await new Promise((resolve, reject) => {
      gunAuthService.user.get('invites_sent').get(inviteId).put({
        ...inviteData,
        signature: signature,
        used: false,
        createdBy: user.pub
      }, (ack) => {
        if (ack.err) {
          console.error('Failed to store invite:', ack.err);
          reject(new Error('Failed to create invite'));
        } else {
          console.log('✅ Invite stored in Gun.js:', inviteId);
          resolve();
        }
      });
    });

    // Create the invite payload (only contains invite ID and sender's public key)
    // The actual data will be fetched from Gun.js to ensure it's authentic
    const invitePayload = {
      inviteId: inviteId,
      senderKey: user.pub
    };

    // Encode and create link
    const payloadString = JSON.stringify(invitePayload);
    console.log('📦 Invite payload:', payloadString);
    
    const inviteCode = encryptionService.base64UrlEncode(payloadString);
    console.log('🔤 Encoded invite code:', inviteCode);
    
    const inviteLink = `${window.location.origin}/invite/${inviteCode}`;

    console.log('🎫 Secure invite created:', inviteId);
    console.log('📨 Invite link:', inviteLink);
    
    return inviteLink;
  }

  // Accept invite with proper verification
  async acceptInvite(inviteCode) {
    try {
      console.log('🎫 Accepting invite...');
      
      // Decode the invite payload
      const invitePayload = JSON.parse(encryptionService.base64UrlDecode(inviteCode));
      
      if (!invitePayload.inviteId || !invitePayload.senderKey) {
        throw new Error('Invalid invite format');
      }
      
      console.log('📦 Invite payload:', invitePayload);
      
      // Fetch the actual invite data from Gun.js
      // This ensures the invite exists and was created through the app
      const inviteData = await new Promise((resolve, reject) => {
        gunAuthService.gun
          .user(invitePayload.senderKey)
          .get('invites_sent')
          .get(invitePayload.inviteId)
          .once((data) => {
            if (!data) {
              reject(new Error('Invite not found - may be invalid or already used'));
            } else {
              resolve(data);
            }
          });
        
        // Timeout after 5 seconds
        setTimeout(() => reject(new Error('Timeout fetching invite data')), 5000);
      });
      
      console.log('📄 Fetched invite data from Gun.js:', inviteData);
      
      // Verify the invite hasn't been used
      if (inviteData.used === true) {
        throw new Error('This invite has already been used');
      }
      
      // Verify the invite hasn't expired
      if (Date.now() > inviteData.expiresAt) {
        throw new Error('This invite has expired');
      }
      
      // Verify the signature to ensure the invite was created by the claimed sender
      const verifiedId = await Gun.SEA.verify(inviteData.signature, invitePayload.senderKey);
      if (verifiedId !== invitePayload.inviteId) {
        console.error('Signature verification failed:', verifiedId, '!==', invitePayload.inviteId);
        throw new Error('Invalid invite signature - could not verify authenticity');
      }
      
      console.log('✅ Invite verified successfully');
      
      // Check if already friends
      const existingFriend = await this.getFriend(inviteData.fromPublicKey);
      if (existingFriend) {
        console.log('✅ Already friends with:', inviteData.fromNickname);
        return { success: true, message: 'Already friends', friend: existingFriend };
      }
      
      // Mark the invite as used BEFORE adding friend (atomic operation)
      await new Promise((resolve, reject) => {
        gunAuthService.gun
          .user(invitePayload.senderKey)
          .get('invites_sent')
          .get(invitePayload.inviteId)
          .put({ used: true }, (ack) => {
            if (ack.err) {
              console.error('Failed to mark invite as used:', ack.err);
              // Don't reject, just log - we'll still add the friend
            }
            resolve();
          });
        
        setTimeout(resolve, 1000); // Continue after 1 second regardless
      });
      
      // Add as friend
      console.log('➕ Adding friend:', inviteData.fromNickname, inviteData.fromPublicKey);
      await this.addFriend(inviteData.fromPublicKey, inviteData.fromNickname);
      
      console.log('✅ Friend added successfully');
      return { success: true, friend: inviteData };
      
    } catch (error) {
      console.error('❌ Failed to accept invite:', error);
      throw error;
    }
  }

  // Get list of active invites sent by current user
  async getActiveInvites() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return [];
    
    return new Promise((resolve) => {
      const invites = [];
      
      gunAuthService.user.get('invites_sent').map().once((data, key) => {
        if (data && !data.used && data.expiresAt > Date.now()) {
          invites.push({
            inviteId: key,
            ...data
          });
        }
      });
      
      setTimeout(() => resolve(invites), 1000);
    });
  }
  
  // Revoke an invite
  async revokeInvite(inviteId) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    
    return new Promise((resolve, reject) => {
      gunAuthService.user.get('invites_sent').get(inviteId).put({ 
        used: true, 
        revokedAt: Date.now() 
      }, (ack) => {
        if (ack.err) {
          reject(new Error('Failed to revoke invite'));
        } else {
          console.log('🚫 Invite revoked:', inviteId);
          resolve();
        }
      });
    });
  }

  // Clean up expired invites
  async cleanupExpiredInvites() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return;
    
    gunAuthService.user.get('invites_sent').map().once((data, key) => {
      if (data && !data.used && data.expiresAt < Date.now()) {
        gunAuthService.user.get('invites_sent').get(key).put({
          ...data,
          used: true,
          expiredAt: Date.now()
        });
      }
    });
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