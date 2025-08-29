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

  // Initialize instance change detection for server resets
  initInstanceChangeDetection() {
    if (!this.gun) return;

    // Get the current instance from localStorage
    const storedInstance = localStorage.getItem('whisperz_current_instance');
    
    console.log('🔍 Initializing instance change detection...');
    console.log('📦 Stored instance:', storedInstance || 'none');

    // Handler for instance changes
    const handleInstanceChange = (data) => {
      if (!data || !data.instance) return;

      const newInstance = data.instance;
      const timestamp = data.timestamp;
      
      console.log('📡 Received instance data from server:', {
        instance: newInstance,
        timestamp: timestamp,
        resetBy: data.resetBy,
        message: data.message
      });

      // Check if this is a different instance
      if (storedInstance && storedInstance !== newInstance) {
        console.log('🔄 INSTANCE CHANGED!');
        console.log(`📦 Old: ${storedInstance}`);
        console.log(`📦 New: ${newInstance}`);
        console.log('🧹 Clearing local data and reloading...');

        // Store the new instance before clearing
        const tempInstance = newInstance;
        
        // Clear all local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Store the new instance
        localStorage.setItem('whisperz_current_instance', tempInstance);
        localStorage.setItem('whisperz_last_reset', String(timestamp || Date.now()));
        
        // Clear IndexedDB databases
        if (window.indexedDB) {
          const databases = ['gun', 'radata', 'radata-mobile'];
          databases.forEach(db => {
            try {
              indexedDB.deleteDatabase(db);
              console.log(`🗑️ Deleted IndexedDB: ${db}`);
            } catch (e) {
              console.error(`Failed to delete ${db}:`, e);
            }
          });
        }

        // Show notification to user
        if (window.alert) {
          alert('🔄 Server has been reset! The app will reload with fresh data.');
        }

        // Reload the page after a short delay
        setTimeout(() => {
          console.log('🔄 Reloading application...');
          window.location.reload();
        }, 1000);
      } else if (!storedInstance) {
        // First time - just store the instance
        console.log('📝 Storing initial instance:', newInstance);
        localStorage.setItem('whisperz_current_instance', newInstance);
        localStorage.setItem('whisperz_last_reset', String(timestamp || Date.now()));
      } else {
        console.log('✅ Instance unchanged:', newInstance);
      }
    };

    // Listen for instance changes from the server
    // Use both .once() and .on() to handle offline peers
    
    // Check current value (for peers that were offline during reset)
    this.gun.get('_whisperz_system').get('config').once(handleInstanceChange);
    
    // Listen for future changes (for online peers)
    this.gun.get('_whisperz_system').get('config').on(handleInstanceChange);
    
    console.log('✅ Instance change detection initialized');
  }

  // Initialize Gun instance with peers
  initialize(peers = []) {
    // Gun relay configuration - can be overridden by environment variable
    const defaultRelay = 'https://gun-relay-nchb.onrender.com/gun';
    const gunRelay = import.meta.env.VITE_GUN_RELAY_URL || defaultRelay;
    
    // Support for specific database instance (for multi-instance Gun relay servers)
    const instance = import.meta.env.VITE_GUN_INSTANCE || localStorage.getItem('gun_instance') || '';
    const finalRelay = instance ? `${gunRelay}?instance=${instance}` : gunRelay;

    // Disable all console logs to prevent crashes
    // if (localStorage.getItem('debug_gun') === 'true') {
    //   console.log('🔫 Initializing Gun.js');
    //   console.log('🌐 Relay:', finalRelay);
    //   if (instance) {
    //     console.log('📦 Instance:', instance);
    //   }
    // }

    // Detect if mobile for optimizations
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);

    // Simplified configuration for mobile
    const gunConfig = isMobile ? {
      // Mobile configuration - minimal to prevent crashes
      peers: [finalRelay],
      localStorage: false,
      radisk: false,
      file: false,
      multicast: false,
      axe: false,
      memory: true,
      ws: {
        reconnect: true,
        reconnectDelay: 5000,
        pingInterval: 60000,
        timeout: 30000
      }
    } : {
      // Desktop configuration - full features
      peers: [finalRelay],
      localStorage: true,
      radisk: true,
      multicast: false,
      axe: false,
      ws: {
        reconnect: true,
        reconnectDelay: 1000,
        pingInterval: 10000,
        timeout: 20000
      }
    };
    
    try {
      this.gun = Gun(gunConfig);
    } catch (error) {
      // Silent fail - no console logging
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

    // Initialize instance change detection for server resets
    this.initInstanceChangeDetection();

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

    // Validate encryption keys
    if (!user?.epub) {
      throw new Error('Your encryption key is missing. Please log out and log back in.');
    }

    if (!recipientEpub) {
      throw new Error('Recipient encryption key is missing');
    }

    try {
      console.log('🔑 Gun.SEA Debug:');
      console.log('  Current user epub:', user.epub);
      console.log('  Recipient epub:', recipientEpub);

      // Use recipientEpub (encryption public key) instead of pub for proper Gun.SEA secret generation
      const secret = await Gun.SEA.secret(recipientEpub, user);
      console.log('  Secret generated:', !!secret);

      if (!secret) {
        throw new Error('Failed to generate encryption secret');
      }

      return secret;
    } catch (error) {
      console.error('❌ Gun.SEA.secret() failed:', error);
      throw new Error(`Encryption key error: ${error.message}`);
    }
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