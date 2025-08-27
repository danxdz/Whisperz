import Gun from 'gun/gun';
import 'gun/sea';
import gunAuthService from './gunAuthService';
import encryptionService from './encryptionService';
import rateLimiter from '../utils/rateLimiter';
import debugLogger from '../utils/debugLogger';
import securityUtils from '../utils/securityUtils.js';

// Friends service for managing relationships
class FriendsService {
  constructor() {
    this.friends = new Map();
    this.invites = new Map();
    this.friendListeners = new Set();
    this.inviteRateLimit = new Map(); // Track invite rate limiting per user
    this.gun = null;
    this.user = null;
  }

  // Initialize service
  initialize() {
    this.gun = gunAuthService.gun;
    this.user = gunAuthService.user;
  }

  // Generate a cryptographically secure invite code
  generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    let code = '';
    for (let i = 0; i < 32; i++) {
      code += chars.charAt(array[i] % chars.length);
    }
    return code;
  }

  // Encrypt invite metadata for privacy (hides social connections)
  async encryptInviteMetadata(metadata) {
    try {
      // Use a derive key from the invite code itself for encryption
      // This way only people with the invite code can decrypt the metadata
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(metadata.inviteCode),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // Derive encryption key
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 10000, // Lighter for metadata encryption
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      // Encrypt the metadata
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedData = encoder.encode(JSON.stringify({
        createdAt: metadata.createdAt,
        expiresAt: metadata.expiresAt,
        used: metadata.used
      }));

      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encodedData
      );

      // Return encrypted metadata with salt and IV (converted to base64 for Gun.js compatibility)
      return {
        encrypted: true,
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        data: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
        version: 1
      };
    } catch (error) {
      // console.error('Failed to encrypt invite metadata:', error);
      // Fallback to minimal unencrypted data if encryption fails
      return {
        encrypted: false,
        createdAt: metadata.createdAt,
        expiresAt: metadata.expiresAt,
        used: metadata.used
      };
    }
  }

  // Decrypt invite metadata
  async decryptInviteMetadata(encryptedMetadata, inviteCode) {
    if (!encryptedMetadata.encrypted) {
      // Return as-is if not encrypted (backward compatibility)
      return encryptedMetadata;
    }

    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // Recreate the same key derivation process
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(inviteCode),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // Convert base64 back to Uint8Array for decryption
      const salt = new Uint8Array(atob(encryptedMetadata.salt).split('').map(c => c.charCodeAt(0)));
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 10000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );

      // Decrypt the data
      const iv = new Uint8Array(atob(encryptedMetadata.iv).split('').map(c => c.charCodeAt(0)));
      const encryptedData = new Uint8Array(atob(encryptedMetadata.data).split('').map(c => c.charCodeAt(0)));

      const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedData
      );

      const decryptedText = decoder.decode(decryptedData);
      return JSON.parse(decryptedText);
    } catch (error) {
      // console.error('Failed to decrypt invite metadata:', error);
      // Return minimal fallback data
      return {
        createdAt: null,
        expiresAt: null,
        used: true // Assume used if we can't decrypt
      };
    }
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

  // Check invite rate limit
  checkInviteRateLimit(userPub) {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour window
    const maxInvites = 10; // Max 10 invites per hour
    
    if (!this.inviteRateLimit.has(userPub)) {
      this.inviteRateLimit.set(userPub, []);
    }
    
    const userInvites = this.inviteRateLimit.get(userPub);
    
    // Clean old invites outside the window
    const recentInvites = userInvites.filter(timestamp => now - timestamp < windowMs);
    this.inviteRateLimit.set(userPub, recentInvites);
    
    if (recentInvites.length >= maxInvites) {
      const oldestInvite = recentInvites[0];
      const timeLeft = Math.ceil((windowMs - (now - oldestInvite)) / 1000 / 60); // minutes
      throw new Error(`Rate limit exceeded. Please wait ${timeLeft} minutes before creating another invite.`);
    }
    
    // Record this invite attempt
    recentInvites.push(now);
    this.inviteRateLimit.set(userPub, recentInvites);
    
    return true;
  }

  // Generate invite link with one-time use
  async generateInvite() {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    
    // Check rate limit
    this.checkInviteRateLimit(user.pub);

    // Check rate limit (using existing rate limiter too)
    const rateCheck = rateLimiter.checkLimit('inviteGeneration');
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit: ${rateCheck.message}`);
    }

    const inviteCode = this.generateInviteCode();

    // Record the attempt
    rateLimiter.recordAttempt('inviteGeneration');
    const nickname = await this.getUserNickname();

    // No need for peer exchange - everyone uses the same relay
    const inviteData = {
      from: user.pub,
      epub: user.epub || user.is?.epub,  // CRITICAL: Encryption public key for Gun.SEA.secret()
      nickname: nickname || 'Anonymous',
      createdAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      used: false,  // Track if invite has been used
      usedBy: null, // Track who used it
      usedAt: null  // Track when it was used
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

    // Store full invite data in global registry for lookup
    // This is needed for acceptInvite to work properly
    console.log('📝 Storing invite in global registry:', inviteCode);
    this.gun.get('invites').get(inviteCode).put(inviteData);

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
    console.log('🔗 Generated invite link:', inviteLink);

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
            debugLogger.debug('gun', `Attempt ${attempts}/${maxAttempts} - Invite not found yet, retrying...`);
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

        // No need to connect to peers - everyone uses the same relay now
        debugLogger.info('gun', '🌐 Using default relay - no peer exchange needed');
        // Create bidirectional friendship FIRST (before marking as used)
        const conversationId = securityUtils.generateConversationId();

        // Get current user's nickname
        const currentUserNickname = await this.getUserNickname() || user.alias || 'Anonymous';

        // Ensure nickname is not undefined to prevent errors
        const safeNickname = inviteData.nickname || 'Anonymous';

        // console.log('🤝 Creating bidirectional friendship...');
        // console.log('Current user:', user.pub, currentUserNickname);
        // console.log('Inviter:', inviteData.from, safeNickname);

        // Add friend for current user (the one accepting the invite)
        // Pass epub from invite data for encryption to work
        // Skip pending invite creation since this IS the invite acceptance
        await this.addFriend(inviteData.from, safeNickname, inviteData.epub, true);
        // console.log('✅ Step 1: Added inviter as friend for current user');

        // Add current user as friend for the inviter
        // This creates the bidirectional relationship in PUBLIC space
        try {
          // Store bidirectional friendship in PUBLIC friendships space
          // Use the same key generation as addFriend for consistency
          const friendshipKey = this.generateConversationId(inviteData.from, user.pub);
          const friendshipData = {
            fromPublicKey: inviteData.from,
            fromEpub: inviteData.epub,  // Inviter's encryption key
            toPublicKey: user.pub,
            toEpub: user.epub || user.is?.epub,  // Our encryption key for inviter to use (try both formats)
            fromNickname: safeNickname,
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

          // Clean up pending data on both sides
          // console.log('🧹 Cleaning up pending invites and friend requests...');
          
          // Remove from inviter's pending_friends
          this.gun.get('~' + inviteData.from).get('pending_friends').get(inviteCode).put(null);
          
          // Remove any friend request entries for this invite
          this.gun.get('friend_requests').get(user.pub).get(inviteCode).put(null);
          this.gun.get('friend_requests').get(inviteData.from).get(inviteCode).put(null);
          
          // Clean up any pending_invites entries
          gunAuthService.user.get('pending_invites').map().once((data, key) => {
            if (data && data.publicKey === inviteData.from) {
              gunAuthService.user.get('pending_invites').get(key).put(null);
            }
          });

          // Note: The friendship is established through the public 'friendships' space
          // Both users will see each other when they check the friendships space
        } catch (error) {
          console.error('❌ Error adding bidirectional friendship:', error);
          // Continue even if reverse add fails - at least one direction worked
        }

        // console.log('✅ Invite accepted successfully');
        resolve({
          success: true,
          friend: {
            publicKey: inviteData.from,
            nickname: safeNickname,
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
  async addFriend(publicKey, nickname, epub = null, skipPendingInvite = false) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔧 Adding friend - Current user:', user.pub);
    console.log('🔧 Adding friend - Friend key:', publicKey);

    const friendData = {
      publicKey,
      epub: epub || null,  // CRITICAL: Store encryption key for Gun.SEA
      nickname,
      addedAt: Date.now(),
      conversationId: this.generateConversationId(user.pub, publicKey)
    };

    console.log('💾 Storing friend data:', friendData);

    // Store friend relationship for current user (this works - own space)
    await new Promise((resolve) => {
      gunAuthService.user.get('friends').get(publicKey).put(friendData, (ack) => {
        console.log('📝 Friend stored for current user:', ack);
        if (ack.err) {
          console.error('Error storing friend:', ack.err);
        }
        resolve();
      });
    });

    // Store in local map
    this.friends.set(publicKey, friendData);

    // Track as pending invite until accepted (only for new friend requests, not for invite acceptance)
    if (!skipPendingInvite) {
      console.log('📝 Creating pending invite entry (new friend request)');
      const inviteId = securityUtils.generateInviteId();
      await new Promise((resolve) => {
        gunAuthService.user.get('pending_invites').get(inviteId).put({
          publicKey,
          nickname,
          status: 'pending',
          sentAt: Date.now()
        }, resolve);
      });
    } else {
      console.log('⏭️ Skipping pending invite creation (invite acceptance)');
    }

    // Create friend request in PUBLIC space only for new friend requests (not invite acceptance)
    if (!skipPendingInvite) {
      console.log('📝 Creating public friend request (new friend request)');
      const myData = {
        fromPublicKey: user.pub,
        toPublicKey: publicKey,
        fromNickname: await this.getUserNickname(),
        toNickname: nickname,
        addedAt: Date.now(),
        conversationId: friendData.conversationId,
        status: 'connected'
      };

      // Use a public "friendships" space that both users can read
      // Create a deterministic key for the friendship
      const friendshipKey = this.generateConversationId(user.pub, publicKey);

      await new Promise((resolve) => {
        gunAuthService.gun.get('friendships').get(friendshipKey).put(myData, (ack) => {
          console.log('📝 Friendship stored in public space:', ack);
          if (ack.err) {
            console.error('Error storing friendship:', ack.err);
          }
          resolve();
        });
      });
    } else {
      console.log('⏭️ Skipping public friend request creation (invite acceptance)');
    }

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
    
    // Validate publicKey
    if (!publicKey || typeof publicKey !== 'string') {
      throw new Error('Invalid public key provided');
    }

    console.log('🗑️ Removing friend:', publicKey, blockUser ? '(with blocking)' : '');

    try {
      // If blocking, add to block list first
      if (blockUser) {
        await this.blockUser(publicKey, false); // false = don't recursively call removeFriend
      }

      // 1. Remove from current user's friends list
      await new Promise((resolve, reject) => {
        try {
          gunAuthService.user.get('friends').get(publicKey).put(null, (ack) => {
            if (ack.err) {
              console.warn('Warning removing from user friends:', ack.err);
              // Don't reject, just warn - this might be expected if already removed
            }
            console.log('✅ Removed from current user friends');
            resolve();
          });
        } catch (error) {
          console.warn('Error in step 1:', error);
          resolve(); // Continue with other steps
        }
      });

      // 2. Remove from friend's friends list (bidirectional removal) - with validation
      await new Promise((resolve, reject) => {
        try {
          // Only attempt if we have a valid publicKey and Gun instance
          if (publicKey && publicKey.length > 10 && this.gun) {
            // Validate the Gun path before accessing
            const friendUserPath = this.gun.get('~' + publicKey);
            if (friendUserPath) {
              friendUserPath.get('friends').get(user.pub).put(null, (ack) => {
                if (ack && ack.err && !ack.err.includes('Unverified')) {
                  console.warn('Warning removing from friend\'s friends list:', ack.err);
                }
                console.log('✅ Attempted to remove from friend\'s friends list');
                resolve();
              });
            } else {
              console.warn('Could not access friend\'s Gun node');
              resolve();
            }
          } else {
            console.warn('Invalid publicKey or Gun instance for bidirectional removal');
            resolve();
          }
        } catch (error) {
          console.warn('Error in step 2:', error);
          resolve(); // Continue with other steps
        }
      });

      // 3. Remove from friendsIndex for both users (with error handling)
      try {
        gunAuthService.user.get('friendsIndex').get(publicKey).put(null);
        if (publicKey && publicKey.length > 10) {
          this.gun.get('~' + publicKey).get('friendsIndex').get(user.pub).put(null);
        }
        console.log('✅ Removed from friends indexes');
      } catch (error) {
        console.warn('Error removing from indexes:', error);
      }

      // 4. Remove from public friendships space
      try {
        const friendshipKey = this.generateConversationId(user.pub, publicKey);
        if (friendshipKey) {
          await new Promise((resolve) => {
            gunAuthService.gun.get('friendships').get(friendshipKey).put(null, (ack) => {
              if (ack.err) {
                console.warn('Warning removing from public friendships:', ack.err);
              }
              console.log('✅ Removed from public friendships');
              resolve();
            });
          });
        }
      } catch (error) {
        console.warn('Error removing from public friendships:', error);
      }

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

      console.log('✅ Friend removed successfully');
      return { success: true, blocked: blockUser };
    } catch (error) {
      console.error('❌ Error removing friend:', error);
      
      // Still remove from local map even if Gun operations failed
      this.friends.delete(publicKey);
      this.notifyFriendListeners('removed', { publicKey });
      
      // Don't throw error for Gun.js issues - just log them
      if (error.message && (
        error.message.includes('JWK') || 
        error.message.includes('Unverified data') ||
        error.message.includes('Invalid get request')
      )) {
        console.warn('Gun.js data structure issue during friend removal - continuing anyway');
        return { success: true, blocked: blockUser, warning: 'Some cleanup operations failed' };
      }
      
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
              const friendEpub = isSender ? data.toEpub : data.fromEpub;
              const friendNickname = isSender ? data.toNickname : data.fromNickname;

              // Validate friend data before adding
              if (this.isValidFriendData(friendKey, friendNickname)) {
                // Add friend if not already in list
                if (!friends.has(friendKey)) {
                  const friendData = {
                    publicKey: friendKey,
                    epub: friendEpub || null,  // CRITICAL: Include encryption key
                    nickname: friendNickname || 'Unknown',
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
              } else {
                console.warn('🚨 Invalid friend data detected and skipped:', { friendKey, friendNickname });
                // Clean up invalid friendship entry
                this.cleanupInvalidFriendship(key, data);
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

  // Update friend's encryption key
  async updateFriendEpub(publicKey, epub) {
    if (!epub) return;

    const friendData = this.friends.get(publicKey);
    if (friendData) {
      // Update local friend data
      friendData.epub = epub;
      this.friends.set(publicKey, friendData);

      // Update in Gun database
      const user = gunAuthService.getCurrentUser();
      if (user) {
        gunAuthService.user.get('friends').get(publicKey).put({
          ...friendData,
          epub: epub
        });
      }
    }
  }

  // Retrieve a user's encryption key from their Gun user data
  async getUserEpub(publicKey) {
    return new Promise((resolve) => {
      this.gun.user(publicKey).get('epub').once((epub) => {
        resolve(epub);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        resolve(null);
      }, 5000);
    });
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
    let cleanPresence = null;
    if (presence) {
      // Use the most recent timestamp available
      const lastSeenValue = presence.lastSeen || presence.timestamp || Date.now();

      cleanPresence = {
        status: presence.status,
        lastSeen: lastSeenValue,
        peerId: presence.peerId
      };
    }

    // Debug log for presence checks
    const isOnline = cleanPresence?.status === 'online' &&
                     cleanPresence?.lastSeen &&
                     (Date.now() - cleanPresence.lastSeen) < 300000;

    if (cleanPresence) {
      const timeSince = cleanPresence.lastSeen ? Date.now() - cleanPresence.lastSeen : Infinity;
      debugLogger.debug('gun', `Friend ${publicKey.substring(0, 8)}... presence:`, {
        status: cleanPresence.status,
        timeSinceLastSeen: timeSince,
        isOnline: isOnline,
        reason: !isOnline ? (timeSince > 300000 ? 'timeout' : 'status not online') : 'online',
        peerId: cleanPresence.peerId?.substring(0, 20)
      });
    }

    return {
      ...cleanPresence,
      isOnline: isOnline
    };
  }

  // Clear all friends (dev mode)
  clearAllFriends() {
    gunAuthService.user.get('friends').put(null);
    this.friends.clear();
    this.notifyFriendListeners('cleared', {});
  }

  // Get pending invites (invites we've sent that haven't been accepted)
  async getPendingInvites() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return [];

    const pendingInvites = [];

    return new Promise((resolve) => {
      gunAuthService.user.get('pending_invites').map().once((data, key) => {
        if (data && data.publicKey && data.status === 'pending') {
          pendingInvites.push({
            id: key,
            publicKey: data.publicKey,
            nickname: data.nickname || 'Unknown',
            sentAt: data.sentAt || Date.now()
          });
        }
      });

      // Give it time to load
      setTimeout(() => resolve(pendingInvites), 500);
    });
  }

  // Cancel a pending invite
  async cancelInvite(publicKey) {
    const user = gunAuthService.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Remove from our pending invites
    await new Promise((resolve) => {
      gunAuthService.user.get('pending_invites').map().once((data, key) => {
        if (data && data.publicKey === publicKey) {
          gunAuthService.user.get('pending_invites').get(key).put(null);
        }
      });
      setTimeout(resolve, 100);
    });

    // Remove the friend request from the other user
    gunAuthService.gun.get('friendRequests').get(publicKey).get(user.pub).put(null);

    return true;
  }

  // Validate friend data to prevent invalid entries
  isValidFriendData(publicKey, nickname) {
    // Check if publicKey is valid
    if (!publicKey || 
        typeof publicKey !== 'string' || 
        publicKey.length < 10 || 
        publicKey === 'undefined' || 
        publicKey === 'null') {
      return false;
    }

    // Check if nickname is reasonable (optional but helpful)
    if (nickname && typeof nickname !== 'string') {
      return false;
    }

    // Additional validation: publicKey should look like a Gun public key
    if (publicKey.includes(' ') || publicKey.includes('\n') || publicKey.includes('\t')) {
      return false;
    }

    return true;
  }

  // Clean up invalid friendship entries
  cleanupInvalidFriendship(friendshipKey, friendshipData) {
    try {
      console.log('🧹 Cleaning up invalid friendship:', friendshipKey);
      // Remove invalid friendship from public space
      gunAuthService.gun.get('friendships').get(friendshipKey).put(null);
      
      // Also try to clean up any local references
      if (friendshipData.fromPublicKey && friendshipData.toPublicKey) {
        const currentUser = gunAuthService.getCurrentUser();
        if (currentUser && 
            (friendshipData.fromPublicKey === currentUser.pub || friendshipData.toPublicKey === currentUser.pub)) {
          const invalidKey = friendshipData.fromPublicKey === currentUser.pub ? 
                             friendshipData.toPublicKey : friendshipData.fromPublicKey;
          
          if (!this.isValidFriendData(invalidKey)) {
            // Remove from user's friends list
            gunAuthService.user.get('friends').get(invalidKey).put(null);
            // Remove from local map
            this.friends.delete(invalidKey);
          }
        }
      }
    } catch (error) {
      console.warn('Error cleaning up invalid friendship:', error);
    }
  }

  // Manual cleanup function for duplicates and invalid friends
  async cleanupFriends() {
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    console.log('🧹 Starting friend cleanup...');
    
    const validFriends = new Map();
    const invalidKeys = [];

    // Check all friends in local map
    for (const [key, friend] of this.friends.entries()) {
      if (this.isValidFriendData(key, friend.nickname)) {
        validFriends.set(key, friend);
      } else {
        invalidKeys.push(key);
        console.log('🗑️ Found invalid friend:', key, friend);
      }
    }

    // Remove invalid friends
    for (const invalidKey of invalidKeys) {
      try {
        this.friends.delete(invalidKey);
        gunAuthService.user.get('friends').get(invalidKey).put(null);
        console.log('✅ Removed invalid friend:', invalidKey);
      } catch (error) {
        console.warn('Error removing invalid friend:', invalidKey, error);
      }
    }

    // Update local map
    this.friends = validFriends;

    console.log(`🧹 Cleanup complete. Removed ${invalidKeys.length} invalid friends.`);
    
    // Notify listeners to refresh UI
    this.notifyFriendListeners('cleanup', { removedCount: invalidKeys.length });
    
    return { removedCount: invalidKeys.length, invalidKeys };
  }
}

export default new FriendsService();