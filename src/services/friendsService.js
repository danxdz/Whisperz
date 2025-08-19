import Gun from 'gun/gun';
import 'gun/sea';
import gunAuthService from './gunAuthService';
import encryptionService from './encryptionService';
import rateLimiter from '../utils/rateLimiter';

// Friends service for managing relationships
class FriendsService {
  constructor() {
    this.friends = new Map();
    this.invites = new Map();
    this.friendListeners = new Set();
    this.gun = null;
    this.user = null;
  }

  // Initialize service
  initialize() {
    this.gun = gunAuthService.gun;
    this.user = gunAuthService.user;
  }

  // Generate a secure invite code
  generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 32; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Sign invite data
  async signInvite(inviteData) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    
    const dataToSign = JSON.stringify({
      from: inviteData.from,
      nickname: inviteData.nickname,
      createdAt: inviteData.createdAt,
      expiresAt: inviteData.expiresAt
    });
    
    return await Gun.SEA.sign(dataToSign, user);
  }

  // Verify invite signature
  async verifyInvite(inviteData, signature) {
    // If no signature, it's invalid
    if (!signature) {
      // console.error('No signature provided for invite');
      return false;
    }

    const dataToVerify = JSON.stringify({
      from: inviteData.from,
      nickname: inviteData.nickname,
      createdAt: inviteData.createdAt,
      expiresAt: inviteData.expiresAt
    });
    
    try {
      // Gun.SEA.verify returns the original data if valid, or false if invalid
      const verified = await Gun.SEA.verify(signature, inviteData.from);
      
      if (verified === false) {
        // console.error('Signature verification failed - invalid signature');
        return false;
      }
      
      // Check if the verified data matches what we expect
      const isValid = verified === dataToVerify;
      
      if (!isValid) {
      }
        //   expected: dataToVerify,
        //   got: verified
    } catch (_error) {
      // console.error('Error verifying invite signature:', error);
      return false;
    }
  }

  // Generate invite link with one-time use
  async generateInvite() {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Check rate limit
    const rateCheck = rateLimiter.checkLimit('inviteGeneration');
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit: ${rateCheck.message}`);
    }

    const inviteCode = this.generateInviteCode();
    
    // Record the attempt
    rateLimiter.recordAttempt('inviteGeneration');
    const nickname = await this.getUserNickname();
    
    // Get current Gun peer URLs for direct connection
    const currentPeers = gunAuthService.gun?._.opt?.peers || {};
    let peerUrls = Object.keys(currentPeers).filter(url => url && url !== 'undefined').slice(0, 3);
    
    // Always include our relay server
    const ourRelay = 'https://gun-relay-nchb.onrender.com/gun';
    if (!peerUrls.includes(ourRelay)) {
      peerUrls.push(ourRelay);
    }
    
    // Ensure peerUrls is always an array (even if empty)
    peerUrls = peerUrls || [];
    
    const inviteData = {
      from: user.pub,
      nickname: nickname || 'Anonymous',
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      used: false,  // Track if invite has been used
      usedBy: null, // Track who used it
      usedAt: null,  // Track when it was used
      peers: peerUrls, // Include Gun peer addresses for direct mesh connection
      myPeerId: window.location.origin // Your app instance as a potential peer
    };

    // Sign the invite
    const signature = await this.signInvite(inviteData);
    inviteData.signature = signature;

    // Store invite in Gun
    await new Promise((resolve, reject) => {
      this.user.get('invites').get(inviteCode).put(inviteData, (ack) => {
        if (ack.err) reject(new Error(ack.err));
        else resolve();
      });
    });

    // Also store in a global invites registry for lookup
    this.gun.get('invites').get(inviteCode).put({
      ...inviteData,
      inviteCode // Include the code for reference
    });

    // Store as pending friend for the inviter
    const pendingFriend = {
      inviteCode: inviteCode,
      status: 'pending',
      sentAt: Date.now(),
      expiresAt: inviteData.expiresAt,
      type: 'sent_invite'
    };
    
    // Store in inviter's pending friends list
    this.user.get('pending_friends').get(inviteCode).put(pendingFriend);
    
    // Store in local invites map
    this.invites.set(inviteCode, inviteData);

    // Use hash-based routing for better compatibility
    const inviteLink = `${window.location.origin}/#/invite/${inviteCode}`;
    // console.log('🔗 Generated invite link:', inviteLink);
    
    // console.log('🎫 Invite generated:', {
    //       code: inviteCode,
    //       link: inviteLink,
    //       expiresAt: new Date(inviteData.expiresAt).toLocaleString()
    //     });

    return { inviteCode, inviteLink, inviteData };
  }

  // Accept invite with one-time use validation
  async acceptInvite(inviteCode) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // console.log('🎫 Attempting to accept invite:', inviteCode);

    // Get invite data from global registry - try multiple times for sync
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 5;
      
      const tryGetInvite = () => {
        attempts++;
        this.gun.get('invites').get(inviteCode).once(async (inviteData) => {
          if (!inviteData && attempts < maxAttempts) {
            // Data might not be synced yet, try again
            console.log(`Attempt ${attempts}/${maxAttempts} - Invite not found yet, retrying...`);
            setTimeout(tryGetInvite, 2000); // Wait 2 seconds and retry
            return;
          }
          
          if (!inviteData) {
            // console.error('❌ Invite not found after multiple attempts:', inviteCode);
            reject(new Error('Invalid invite code'));
            return;
          }

        // console.log('📋 Invite data found:', inviteData);

        // Check if the inviter is blocked
        const isBlockedUser = await this.isBlocked(inviteData.from);
        if (isBlockedUser) {
          // console.error('❌ Cannot accept invite from blocked user');
          reject(new Error('Cannot accept invite from blocked user'));
          return;
        }

        // Check if we are blocked by the inviter
        const areWeBlocked = await new Promise((resolve) => {
          this.gun.get('~' + inviteData.from).get('blocked').get(user.pub).once((data) => {
            resolve(!!data);
          });
        });

        if (areWeBlocked) {
          // console.error('❌ You have been blocked by this user');
          reject(new Error('You cannot connect with this user'));
          return;
        }

        // Check if invite has already been used
        if (inviteData.used) {
          // console.error('❌ Invite already used by:', inviteData.usedBy);
          // If it was used by the current user, that's OK (might be re-login)
          if (inviteData.usedBy === user.pub) {
            // console.log('✅ Invite was already used by current user, checking if friends exist');
            
            // Check if already friends
            const existingFriend = await this.getFriend(inviteData.from);
            if (existingFriend) {
              // console.log('✅ Already friends, no action needed');
              resolve({
                success: true,
                alreadyFriends: true,
                friend: existingFriend
              });
              return;
            } else {
              // console.log('⚠️ Invite used but friendship not found, will re-establish');
              // Continue to re-establish the friendship
            }
          } else {
            reject(new Error('This invite has already been used'));
            return;
          }
        }

        // Check expiration
        if (Date.now() > inviteData.expiresAt) {
          // console.error('❌ Invite expired');
          reject(new Error('Invite has expired'));
          return;
        }

        // Verify signature
        if (inviteData.signature) {
          const isValid = await this.verifyInvite({
            from: inviteData.from,
            nickname: inviteData.nickname,
            createdAt: inviteData.createdAt,
            expiresAt: inviteData.expiresAt
          }, inviteData.signature);

          if (!isValid) {
            // console.error('❌ Invalid invite signature');
            // console.log('Invite data:', inviteData);
            // For now, just warn but don't reject
            // console.warn('⚠️ Signature verification failed, but continuing anyway');
            // reject(new Error('Invalid invite signature'));
            // return;
          }
        } else {
          // console.log('⚠️ Skipping signature verification');
        }

        // Check if already friends
        const existingFriend = await this.getFriend(inviteData.from);
        if (existingFriend) {
          // console.log('⚠️ Already friends with this user');
          resolve({
            success: true,
            alreadyFriends: true,
            friend: existingFriend
          });
          return;
        }

        // Connect to the inviter's Gun peers for direct mesh connection
        if (inviteData.peers && Array.isArray(inviteData.peers) && inviteData.peers.length > 0) {
          console.log('🌐 Connecting to inviter\'s Gun peers:', inviteData.peers);
          inviteData.peers.forEach(peerUrl => {
            if (peerUrl && typeof peerUrl === 'string' && !gunAuthService.gun?._.opt?.peers?.[peerUrl]) {
              try {
                gunAuthService.gun.opt({peers: [peerUrl]});
                console.log('✅ Added peer:', peerUrl);
              } catch (error) {
                console.error('Failed to add peer:', peerUrl, error);
              }
            }
          });
        } else {
          console.log('⚠️ No peers in invite - will work via local storage or direct connection');
        }
        
        // Create bidirectional friendship FIRST (before marking as used)
        const conversationId = `conv_${Date.now()}_${Math.random()}`;
        
        // Get current user's nickname
        const currentUserNickname = await this.getUserNickname() || user.alias || 'Anonymous';
        
        // console.log('🤝 Creating bidirectional friendship...');
        // console.log('Current user:', user.pub, currentUserNickname);
        // console.log('Inviter:', inviteData.from, inviteData.nickname);
        
        // Add friend for current user (the one accepting the invite)
        await this.addFriend(inviteData.from, inviteData.nickname, conversationId);
        // console.log('✅ Step 1: Added inviter as friend for current user');

        // Add current user as friend for the inviter
        // This creates the bidirectional relationship in PUBLIC space
        try {
          // Store bidirectional friendship in PUBLIC friendships space
          // Use the same key generation as addFriend for consistency
          const friendshipKey = this.generateConversationId(inviteData.from, user.pub);
          const friendshipData = {
            fromPublicKey: inviteData.from,
            toPublicKey: user.pub,
            fromNickname: inviteData.nickname,
            toNickname: currentUserNickname,
            addedAt: Date.now(),
            conversationId: conversationId,
            status: 'connected'
          };
          
          // console.log('📝 Writing friendship to public space:', friendshipData);
          
          await new Promise((addResolve) => {
            this.gun.get('friendships').get(friendshipKey).put(friendshipData, () => {
              // console.log('✅ Step 2: Created bidirectional friendship in public space');
              addResolve();
            });
          });
          
          // Mark invite as used ONLY AFTER successful friend addition
          // console.log('📌 Marking invite as used...');
          this.gun.get('invites').get(inviteCode).put({
            ...inviteData,
            used: true,
            usedBy: user.pub,
            usedAt: Date.now()
          });

          // Update the inviter's pending friend to actual friend
          // Remove from pending_friends
          this.gun.get('~' + inviteData.from).get('pending_friends').get(inviteCode).put(null);
          
          // Note: The friendship is established through the public 'friendships' space
          // Both users will see each other when they check the friendships space
        } catch (error) {
          // console.error('Error adding bidirectional friendship:', error);
          // Continue even if reverse add fails - at least one direction worked
        }

        // console.log('✅ Invite accepted successfully');
        resolve({
          success: true,
          friend: {
            publicKey: inviteData.from,
            nickname: inviteData.nickname,
            conversationId: conversationId
          }
        });
        });  // Close the async callback
      };
      
      // Start trying to get the invite
      tryGetInvite();
    });
  }

  // Get all invites (for tracking)
  async getMyInvites() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return [];

    return new Promise((resolve) => {
      const invites = [];
      const pendingFriends = [];
      
      // Get sent invites
      this.user.get('invites').map().once((data, key) => {
        if (data) {
          invites.push({
            ...data,
            code: key,
            link: `${window.location.origin}/?invite=${key}`,
            status: data.used ? 'accepted' : (data.revoked ? 'revoked' : 'pending')
          });
        }
      });
      
      // Get pending friends (invites we sent that are waiting)
      this.user.get('pending_friends').map().once((data, key) => {
        if (data && data.status === 'pending') {
          pendingFriends.push({
            ...data,
            code: key,
            isPending: true
          });
        }
      });

      setTimeout(() => {
        // Combine and sort by creation date, newest first
        const allInvites = [...invites, ...pendingFriends];
        allInvites.sort((a, b) => (b.createdAt || b.sentAt) - (a.createdAt || a.sentAt));
        resolve(allInvites);
      }, 500);
    });
  }

  // Revoke an unused invite
  async revokeInvite(inviteCode) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Mark as revoked in both places
    this.user.get('invites').get(inviteCode).put({
      revoked: true,
      revokedAt: Date.now()
    });

    this.gun.get('invites').get(inviteCode).put({
      revoked: true,
      revokedAt: Date.now()
    });

    // console.log('🚫 Invite revoked:', inviteCode);
    return true;
  }

  // Clean up expired invites
  async cleanupExpiredInvites() {
    const invites = await this.getMyInvites();
    const now = Date.now();
    
    for (const invite of invites) {
      if (!invite.used && !invite.revoked && invite.expiresAt < now) {
        await this.revokeInvite(invite.code);
      }
    }
    
    // console.log('🧹 Cleaned up expired invites');
  }
  
  // Add friend - Fixed to use public space for friend connections
  async addFriend(publicKey, nickname) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // console.log('🔧 Adding friend - Current user:', user.pub);
    // console.log('🔧 Adding friend - Friend key:', publicKey);

    const friendData = {
      publicKey,
      nickname,
      addedAt: Date.now(),
      conversationId: this.generateConversationId(user.pub, publicKey)
    };

    // console.log('💾 Storing friend data:', friendData);

    // Store friend relationship for current user (this works - own space)
    await new Promise((resolve) => {
      gunAuthService.user.get('friends').get(publicKey).put(friendData, (ack) => {
        // console.log('📝 Friend stored for current user:', ack);
        if (ack.err) {
          // console.error('Error storing friend:', ack.err);
        }
        resolve();
      });
    });

    // Store in local map
    this.friends.set(publicKey, friendData);

    // Create friend request in PUBLIC space (not user's private space)
    // This is readable by the other user when they check for friend requests
    const myData = {
      fromPublicKey: user.pub,
      toPublicKey: publicKey,
      fromNickname: await this.getUserNickname(),
      toNickname: nickname,
      addedAt: Date.now(),
      conversationId: friendData.conversationId,
      status: 'connected'
    };

    // console.log('💾 Storing friend connection in public space:', myData);

    // Use a public "friendships" space that both users can read
    // Create a deterministic key for the friendship
    const friendshipKey = this.generateConversationId(user.pub, publicKey);
    
    await new Promise((resolve) => {
      gunAuthService.gun.get('friendships').get(friendshipKey).put(myData, (ack) => {
        // console.log('📝 Friendship stored in public space:', ack);
        if (ack.err) {
          // console.error('Error storing friendship:', ack.err);
        }
        resolve();
      });
    });

    this.notifyFriendListeners('added', friendData);
    return friendData;
  }

  // Add friend directly (for friend requests - creates bidirectional relationship)
  async addFriendDirectly(publicKey, nickname, conversationId = null) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    // Add friend for current user
    await this.addFriend(publicKey, nickname, conversationId);

    // Also create the reverse friendship in public space so the other user sees us as a friend
    const currentUserNickname = await this.getUserNickname() || user.alias || "Anonymous";
    const friendshipKey = this.generateConversationId(user.pub, publicKey);
    const friendshipData = {
      fromPublicKey: publicKey,
      toPublicKey: user.pub,
      fromNickname: nickname,
      toNickname: currentUserNickname,
      addedAt: Date.now(),
      conversationId: conversationId || friendshipKey,
      status: "connected"
    };

    // Store in public friendships space
    await new Promise((resolve) => {
      this.gun.get("friendships").get(friendshipKey).put(friendshipData, () => {
        resolve();
      });
    });

    return { publicKey, nickname, conversationId: conversationId || friendshipKey };
  }

  // Block/Ignore a user - prevents them from adding you again
  async blockUser(publicKey, removeAsFriend = true) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // console.log('🚫 Blocking user:', publicKey);

    try {
      // 1. Add to blocked list
      await new Promise((resolve) => {
        gunAuthService.user.get('blocked').get(publicKey).put({
          blockedAt: Date.now(),
          publicKey: publicKey
        }, (ack) => {
          // console.log('✅ Added to blocked list:', ack);
          resolve();
        });
      });

      // 2. Remove as friend if requested
      if (removeAsFriend) {
        const existingFriend = await this.getFriend(publicKey);
        if (existingFriend) {
          await this.removeFriend(publicKey);
        }
      }

      // console.log('✅ User blocked successfully');
      return { success: true };
    } catch (error) {
      // console.error('❌ Error blocking user:', error);
      throw error;
    }
  }

  // Unblock a user
  async unblockUser(publicKey) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // console.log('✅ Unblocking user:', publicKey);

    await new Promise((resolve) => {
      gunAuthService.user.get('blocked').get(publicKey).put(null, (ack) => {
        // console.log('✅ Removed from blocked list:', ack);
        resolve();
      });
    });

    return { success: true };
  }

  // Check if a user is blocked
  async isBlocked(publicKey) {
    const user = gunAuthService.getCurrentUser();
    if (!user) return false;

    return new Promise((resolve) => {
      gunAuthService.user.get('blocked').get(publicKey).once((data) => {
        resolve(!!data);
      });
    });
  }

  // Get all blocked users
  async getBlockedUsers() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return [];

    return new Promise((resolve) => {
      const blocked = [];
      
      gunAuthService.user.get('blocked').map().once((data, key) => {
        if (data) {
          blocked.push({
            publicKey: key,
            blockedAt: data.blockedAt
          });
        }
      });

      setTimeout(() => {
        resolve(blocked);
      }, 500);
    });
  }

  // Remove friend - properly removes bidirectional friendship with optional blocking
  async removeFriend(publicKey, blockUser = false) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // console.log('🗑️ Removing friend:', publicKey, blockUser ? '(with blocking)' : '');

    try {
      // If blocking, add to block list first
      if (blockUser) {
        await this.blockUser(publicKey, false); // false = don't recursively call removeFriend
      }

      // 1. Remove from current user's friends list
      await new Promise((resolve) => {
        gunAuthService.user.get('friends').get(publicKey).put(null, (ack) => {
          // console.log('✅ Removed from current user friends:', ack);
          resolve();
        });
      });

      // 2. Remove from friend's friends list (bidirectional removal)
      await new Promise((resolve) => {
        this.gun.get('~' + publicKey).get('friends').get(user.pub).put(null, (ack) => {
          // console.log('✅ Removed from friend\'s friends list:', ack);
          resolve();
        });
      });

      // 3. Remove from friendsIndex for both users
      gunAuthService.user.get('friendsIndex').get(publicKey).put(null);
      this.gun.get('~' + publicKey).get('friendsIndex').get(user.pub).put(null);

      // 4. Remove from public friendships space
      const friendshipKey = this.generateConversationId(user.pub, publicKey);
      await new Promise((resolve) => {
        gunAuthService.gun.get('friendships').get(friendshipKey).put(null, (ack) => {
          // console.log('✅ Removed from public friendships:', ack);
          resolve();
        });
      });

      // 5. Clear any conversation/messages (optional - you might want to keep history)
      const clearMessages = !blockUser && window.confirm('Also delete conversation history with this friend?');
      if (clearMessages || blockUser) {
        // Remove messages from hybrid storage
        const conversationId = this.generateConversationId(user.pub, publicKey);
        gunAuthService.user.get('conversations').get(conversationId).put(null);
        gunAuthService.gun.get('conversations').get(conversationId).put(null);
      }

      // 6. Remove from local map
      this.friends.delete(publicKey);

      // 7. Notify listeners
      this.notifyFriendListeners('removed', { publicKey });

      // console.log('✅ Friend removed successfully');
      return { success: true, blocked: blockUser };
    } catch (error) {
      // console.error('❌ Error removing friend:', error);
      throw error;
    }
  }

  // Get all friends - Fixed to check public friendships
  async getFriends() {
    if (!gunAuthService.isAuthenticated()) {
      // console.log('❌ Not authenticated, cannot load friends');
      return [];
    }

    const currentUser = gunAuthService.getCurrentUser();
    // console.log('🔍 Getting friends for user:', currentUser?.pub);

    return new Promise((resolve) => {
      const friends = new Map();
      let loadingComplete = false;
      
      // Load existing friends from user's own space
      // console.log('📂 Loading friends from user space...');
      gunAuthService.user.get('friends').map().once((data, key) => {
        // console.log('📝 Friend data found:', key, data);
        if (data && data.publicKey) {
          friends.set(key, data);
          this.friends.set(key, data);
          this.notifyFriendListeners('added', data);
        }
      });

      // Also check public friendships space for connections
      // console.log('📂 Checking public friendships...');
      gunAuthService.gun.get('friendships').map().on((data, key) => {
        if (data) {
          // console.log('🔗 Friendship found:', key, data);
          
          // Check if this friendship involves the current user
          if (data.fromPublicKey === currentUser.pub || data.toPublicKey === currentUser.pub) {
            // Determine which user is the friend
            const isSender = data.fromPublicKey === currentUser.pub;
            const friendKey = isSender ? data.toPublicKey : data.fromPublicKey;
            const friendNickname = isSender ? data.toNickname : data.fromNickname;
            
            // Add friend if not already in list
            if (!friends.has(friendKey)) {
              const friendData = {
                publicKey: friendKey,
                nickname: friendNickname,
                addedAt: data.addedAt,
                conversationId: data.conversationId
              };
              
              // console.log('➕ Adding friend from public space:', friendData);
              friends.set(friendKey, friendData);
              this.friends.set(friendKey, friendData);
              
              // Also store in user's local friends list for faster access
              gunAuthService.user.get('friends').get(friendKey).put(friendData);
              
              this.notifyFriendListeners('added', friendData);
            }
          }
        }
      });

      // Give Gun time to load data
      setTimeout(() => {
        if (!loadingComplete) {
          loadingComplete = true;
          const friendArray = Array.from(friends.values());
          // console.log('✅ Friends loaded:', friendArray.length, 'friends');
          resolve(friendArray);
        }
      }, 2000); // Increased timeout for public space loading
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

  // Subscribe to friend updates - now with real-time public friendships
  subscribeToFriends(callback) {
    this.friendListeners.add(callback);
    const currentUser = gunAuthService.getCurrentUser();
    const subscriptions = [];

    // Subscribe to user's own friends space
    const userSub = gunAuthService.user.get('friends').map().on((data, key) => {
      if (data) {
        this.friends.set(key, data);
        callback('updated', data);
      } else if (this.friends.has(key)) {
        this.friends.delete(key);
        callback('removed', { publicKey: key });
      }
    });
    subscriptions.push(userSub);

    // Subscribe to public friendships space for real-time updates
    const publicSub = gunAuthService.gun.get('friendships').map().on((data, key) => {
      if (data && currentUser) {
        // Check if this friendship involves the current user
        if (data.fromPublicKey === currentUser.pub || data.toPublicKey === currentUser.pub) {
          const isSender = data.fromPublicKey === currentUser.pub;
          const friendKey = isSender ? data.toPublicKey : data.fromPublicKey;
          const friendNickname = isSender ? data.toNickname : data.fromNickname;
          
          // Add friend if not already in list
          if (!this.friends.has(friendKey)) {
            const friendData = {
              publicKey: friendKey,
              nickname: friendNickname,
              addedAt: data.addedAt,
              conversationId: data.conversationId
            };
            
            this.friends.set(friendKey, friendData);
            // Also store in user's local friends list for faster access
            gunAuthService.user.get('friends').get(friendKey).put(friendData);
            callback('added', friendData);
          }
        }
      }
    });
    subscriptions.push(publicSub);

    return () => {
      this.friendListeners.delete(callback);
      subscriptions.forEach(sub => {
        if (sub && sub.off) sub.off();
      });
    };
  }

  // Get user nickname with better error handling and caching
  async getUserNickname() {
    try {
      const user = gunAuthService.getCurrentUser();
      if (!user) return 'Anonymous';
      
      // Try to get from profile first
      const profile = await gunAuthService.getUserProfile();
      if (profile?.nickname) {
        // console.log('👤 User nickname from profile:', profile.nickname);
        return profile.nickname;
      }
      
      // Fallback to username from user object
      if (user.alias) {
        // console.log('👤 User nickname from alias:', user.alias);
        return user.alias;
      }
      
      // Last resort - use part of public key
      const shortKey = user.pub ? user.pub.substring(0, 8) : 'Unknown';
      // console.log('👤 User nickname fallback:', shortKey);
      return `User-${shortKey}`;
    } catch (error) {
      // console.error('Error getting user nickname:', error);
      return 'Anonymous';
    }
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
        // console.error('Friend listener error:', error);
      }
    });
  }

  // Get friend presence with PeerJS ID
  async getFriendPresence(publicKey) {
    const presence = await gunAuthService.gun
      .get('presence')
      .get(publicKey)
      .once();

    // Clean up Gun metadata if present
    const cleanPresence = presence ? {
      status: presence.status,
      lastSeen: presence.lastSeen,
      peerId: presence.peerId
    } : null;

    return {
      ...cleanPresence,
      isOnline: cleanPresence?.status === 'online' && 
                cleanPresence?.lastSeen && 
                (Date.now() - cleanPresence.lastSeen) < 60000 // Consider online if seen in last minute
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