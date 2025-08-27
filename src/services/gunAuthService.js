import Gun from 'gun/gun';
import 'gun/sea';
import 'gun/axe';
import securityUtils from '../utils/securityUtils.js';

// Gun.js authentication service
class GunAuthService {
  constructor() {
    this.gun = null;
    this.user = null;
    this.currentUser = null;
    this.listeners = new Map();
  }

  // Initialize Gun instance with peers
  initialize(peers = []) {
    // Gun relay configuration - can be overridden by environment variable
    const defaultRelay = 'https://gun-relay-nchb.onrender.com/gun';
    const gunRelay = import.meta.env.VITE_GUN_RELAY_URL || defaultRelay;
    
    // Support for specific database instance (for multi-instance Gun relay servers)
    const instance = import.meta.env.VITE_GUN_INSTANCE || localStorage.getItem('gun_instance') || '';
    const finalRelay = instance ? `${gunRelay}?instance=${instance}` : gunRelay;

    // Initialization logs moved to debug level
    if (localStorage.getItem('debug_gun') === 'true') {
      console.log('🔫 Initializing Gun.js');
      console.log('🌐 Relay:', finalRelay);
      if (instance) {
        console.log('📦 Instance:', instance);
      }
    }

    // Detect if mobile for optimizations
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);

    try {
      this.gun = Gun({
        peers: [finalRelay], // Use configured relay with optional instance
        localStorage: !isMobile,  // Disable localStorage on mobile to prevent crashes
        radisk: !isMobile,        // Disable radisk on mobile
        multicast: false,         // Disabled for battery saving
        axe: false,               // Disabled to reduce memory usage
        ws: {
          reconnect: true,
          reconnectDelay: isMobile ? 5000 : 1000,  // Longer delay on mobile
          pingInterval: isMobile ? 60000 : 10000,  // Much less frequent pings on mobile
          timeout: isMobile ? 30000 : 20000        // Longer timeout on mobile
        },
        // Mobile optimizations - use memory only
        file: false,  // Disable file storage on mobile
        localStorage: false,  // Force disable localStorage
        batch: isMobile ? 500 : 10,  // Batch more updates on mobile
        throttle: isMobile ? 500 : 10,  // Throttle updates on mobile
        memory: true  // Use memory only on mobile
      });
    } catch (error) {
      console.error('Failed to initialize Gun.js:', error);
      // Fallback to minimal configuration
      this.gun = Gun({
        peers: [finalRelay],
        localStorage: false,
        file: false,
        memory: true
      });
    }

    // Test connection to peers
    setTimeout(() => {
      const connectedPeers = this.gun._.opt.peers;
      // console.log('🔫 Gun.js connected peers:', connectedPeers);
      if (!connectedPeers || Object.keys(connectedPeers).length === 0) {
        // console.error('❌ Gun.js failed to connect to any peers!');
      }
    }, 2000);

    this.user = this.gun.user().recall({ sessionStorage: true });

    // Listen for auth changes
    this.user.on('auth', () => {
      this.currentUser = this.user.is;
      this.notifyListeners('auth', this.currentUser);
    });

    return this.gun;
  }

  // Register a new user
  async register(username, password, nickname) {
    return new Promise((resolve, reject) => {
      if (!this.user) {
        reject(new Error('Gun not initialized'));
        return;
      }

      this.user.create(username, password, (ack) => {
        if (ack.err) {
          reject(new Error(ack.err));
          return;
        }

        // Auto-login after registration
        this.login(username, password)
          .then(async (loginResult) => {
            // Set user profile data with proper await
            const profileData = {
              nickname: nickname || username,
              username: username,
              createdAt: Date.now(),
              publicKey: this.user.is.pub
            };

            // console.log('📝 Setting user profile:', profileData);

            // Store profile with callback to ensure it's saved
            await new Promise((profileResolve) => {
              this.user.get('profile').put(profileData, (ack) => {
                if (ack.err) {
                  // console.error('Error saving profile:', ack.err);
                } else {
                  // console.log('✅ Profile saved successfully');
                }
                profileResolve();
              });
            });

            // Also store nickname in a simpler location for quick access
            this.user.get('nickname').put(nickname || username);

            resolve({ success: true, user: this.user.is });
          })
          .catch(reject);
      });
    });
  }

  // Login existing user
  async login(username, password) {
    return new Promise((resolve, reject) => {
      if (!this.user) {
        reject(new Error('Gun not initialized'));
        return;
      }

      this.user.auth(username, password, (ack) => {
        if (ack.err) {
          reject(new Error(ack.err));
          return;
        }

        this.currentUser = ack.sea;
        resolve({ success: true, user: ack.sea });
      });
    });
  }

  // Logout current user
  logout() {
    if (this.user) {
      this.user.leave();
      this.currentUser = null;
      this.notifyListeners('logout', null);
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser || this.user?.is;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getCurrentUser();
  }

  // Get user profile with fallbacks
  async getUserProfile(publicKey = null) {
    const key = publicKey || this.getCurrentUser()?.pub;
    if (!key) return null;

    return new Promise((resolve) => {
      let profileFound = false;

      // First try to get the full profile
      this.gun.user(key).get('profile').once((data) => {
        if (data && !profileFound) {
          profileFound = true;
          // console.log('📋 Profile found:', data);
          resolve(data);
        }
      });

      // Also check for standalone nickname
      this.gun.user(key).get('nickname').once((nickname) => {
        if (nickname && !profileFound) {
          setTimeout(() => {
            if (!profileFound) {
              profileFound = true;
              // console.log('📋 Nickname found:', nickname);
              resolve({ nickname: nickname });
            }
          }, 500);
        }
      });

      // Timeout fallback
      setTimeout(() => {
        if (!profileFound) {
          profileFound = true;
          // console.log('📋 No profile found for:', key);
          resolve(null);
        }
      }, 1000);
    });
  }

  // Update user profile
  updateProfile(data) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    this.user.get('profile').put(data);
  }

  // Subscribe to auth events
  onAuthChange(callback) {
    const id = `${Date.now()}_${securityUtils.generateSecureRandom(8)}`;
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }

  // Generate encrypted pair for secure communication
  async generateEncryptedPair(recipientEpub) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const user = this.getCurrentUser();
    
    // Debug logging
    console.log('🔑 Gun.SEA Debug:');
    console.log('  Current user:', user);
    console.log('  Current user epub:', user?.epub);
    console.log('  Recipient epub:', recipientEpub);
    
    // Use recipientEpub (encryption public key) instead of pub for proper Gun.SEA secret generation
    const secret = await Gun.SEA.secret(recipientEpub, user);
    console.log('  Secret generated:', !!secret);
    return secret;
  }

  // Encrypt data for a specific user using their encryption public key
  async encryptFor(data, recipientEpub) {
    const secret = await this.generateEncryptedPair(recipientEpub);
    const encrypted = await Gun.SEA.encrypt(data, secret);
    return encrypted;
  }

  // Decrypt data from a specific user using their encryption public key
  async decryptFrom(encryptedData, senderEpub) {
    const secret = await this.generateEncryptedPair(senderEpub);
    const decrypted = await Gun.SEA.decrypt(encryptedData, secret);
    return decrypted;
  }

  // Sign data
  async signData(data) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const user = this.getCurrentUser();
    const signed = await Gun.SEA.sign(data, user);
    return signed;
  }

  // Verify signed data
  async verifySignature(signedData, publicKey) {
    const verified = await Gun.SEA.verify(signedData, publicKey);
    return verified;
  }
}

export default new GunAuthService();