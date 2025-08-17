import Gun from 'gun/gun';
import 'gun/sea';
import 'gun/axe';

// Gun.js authentication service
class GunAuthService {
  constructor() {
    this.gun = null;
    this.user = null;
    this.currentUser = null;
    this.listeners = new Map();
  }

  // Initialize Gun instance with peers
  initialize(peers = [], instanceName = null) {
    // More reliable Gun.js relay servers
    const defaultPeers = [
      'https://relay.peer.ooo/gun',
      'https://gun-relay.herokuapp.com/gun',
      'https://gunjs.herokuapp.com/gun',
      'https://gun-manhattan.herokuapp.com/gun',
      'https://e2eec.herokuapp.com/gun'
    ];

    const customPeers = import.meta.env.VITE_GUN_PEERS 
      ? import.meta.env.VITE_GUN_PEERS.split(',') 
      : [];

    // Get or set instance name
    const currentInstance = instanceName || localStorage.getItem('whisperz_instance') || 'main';
    localStorage.setItem('whisperz_instance', currentInstance);

    console.log('🔫 Initializing Gun.js with peers:', [...customPeers, ...peers, ...defaultPeers]);
    console.log('📦 Using instance:', currentInstance);

    this.gun = Gun({
      peers: [...customPeers, ...peers, ...defaultPeers],
      localStorage: true,
      radisk: true,
      multicast: false,
      axe: false,
      ws: {
        reconnect: true,
        reconnectDelay: 1000
      },
      // Use instance name as file/storage prefix
      file: `whisperz_${currentInstance}`
    });

    // Test connection to peers
    setTimeout(() => {
      const connectedPeers = this.gun._.opt.peers;
      console.log('🔫 Gun.js connected peers:', connectedPeers);
      if (!connectedPeers || Object.keys(connectedPeers).length === 0) {
        console.error('❌ Gun.js failed to connect to any peers!');
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
  async register(username, password, nickname, isAdmin = false) {
    return new Promise(async (resolve, reject) => {
      if (!this.user) {
        reject(new Error('Gun not initialized'));
        return;
      }
      
      // Check if this is the first user (should be admin)
      let shouldBeAdmin = isAdmin;
      if (!shouldBeAdmin) {
        // Check if any users exist
        const existingUsers = await new Promise((checkResolve) => {
          let hasUsers = false;
          this.gun.get('~@').once().map().once((data, key) => {
            if (data && key) {
              hasUsers = true;
            }
          });
          setTimeout(() => checkResolve(hasUsers), 500);
        });
        
        if (!existingUsers) {
          console.log('🎯 First user detected - setting as admin');
          shouldBeAdmin = true;
        }
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
              publicKey: this.user.is.pub,
              isAdmin: shouldBeAdmin || false
            };
            
            console.log('📝 Setting user profile:', profileData);
            console.log('🔑 Admin flag during registration:', shouldBeAdmin);
            
            // Store profile with callback to ensure it's saved
            await new Promise((profileResolve) => {
              this.user.get('profile').put(profileData, (ack) => {
                if (ack.err) {
                  console.error('Error saving profile:', ack.err);
                } else {
                  console.log('✅ Profile saved successfully');
                }
                profileResolve();
              });
            });
            
            // Also store nickname in a simpler location for quick access
            this.user.get('nickname').put(nickname || username);
            
            // Return user data with admin flag
            const userData = {
              ...this.user.is,
              isAdmin: shouldBeAdmin || false,
              nickname: nickname || username
            };
            
            console.log('🎯 Returning user data with admin:', userData.isAdmin);
            resolve({ success: true, user: userData });
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

      this.user.auth(username, password, async (ack) => {
        if (ack.err) {
          reject(new Error(ack.err));
          return;
        }

        // Fetch user profile to get admin status
        const profile = await new Promise((profileResolve) => {
          this.user.get('profile').once((data) => {
            profileResolve(data || {});
          });
        });

        // Merge profile data with auth data
        const userData = {
          ...ack.sea,
          isAdmin: profile.isAdmin || false,
          nickname: profile.nickname || username
        };

        this.currentUser = userData;
        resolve({ success: true, user: userData });
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

  // Get Gun instance (for admin operations)
  getGun() {
    return this.gun;
  }

  // Get current instance name
  getCurrentInstance() {
    return localStorage.getItem('whisperz_instance') || 'main';
  }

  // Get all available instances
  getAvailableInstances() {
    const instances = localStorage.getItem('whisperz_instances');
    return instances ? JSON.parse(instances) : ['main'];
  }

  // Switch to a different instance
  switchInstance(instanceName) {
    // Save current instance to list
    const instances = this.getAvailableInstances();
    if (!instances.includes(this.getCurrentInstance())) {
      instances.push(this.getCurrentInstance());
    }
    if (!instances.includes(instanceName)) {
      instances.push(instanceName);
    }
    localStorage.setItem('whisperz_instances', JSON.stringify(instances));
    
    // Set new instance and reload
    localStorage.setItem('whisperz_instance', instanceName);
    window.location.reload();
  }

  // Create new instance
  createNewInstance(instanceName) {
    if (!instanceName || instanceName.trim() === '') {
      instanceName = 'instance_' + Date.now();
    }
    this.switchInstance(instanceName);
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
          console.log('📋 Profile found:', data);
          resolve(data);
        }
      });
      
      // Also check for standalone nickname
      this.gun.user(key).get('nickname').once((nickname) => {
        if (nickname && !profileFound) {
          setTimeout(() => {
            if (!profileFound) {
              profileFound = true;
              console.log('📋 Nickname found:', nickname);
              resolve({ nickname: nickname });
            }
          }, 500);
        }
      });
      
      // Timeout fallback
      setTimeout(() => {
        if (!profileFound) {
          profileFound = true;
          console.log('📋 No profile found for:', key);
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
    const id = Date.now() + Math.random();
    this.listeners.set(id, callback);
    return () => this.listeners.delete(id);
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => callback(event, data));
  }

  // Generate encrypted pair for secure communication
  async generateEncryptedPair(recipientPub) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const user = this.getCurrentUser();
    const secret = await Gun.SEA.secret(recipientPub, user);
    return secret;
  }

  // Encrypt data for a specific user
  async encryptFor(data, recipientPub) {
    const secret = await this.generateEncryptedPair(recipientPub);
    const encrypted = await Gun.SEA.encrypt(data, secret);
    return encrypted;
  }

  // Decrypt data from a specific user
  async decryptFrom(encryptedData, senderPub) {
    const secret = await this.generateEncryptedPair(senderPub);
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