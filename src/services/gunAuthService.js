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
  initialize(peers = []) {
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

    console.log('🔫 Initializing Gun.js with peers:', [...customPeers, ...peers, ...defaultPeers]);

    this.gun = Gun({
      peers: [...customPeers, ...peers, ...defaultPeers],
      localStorage: true,
      radisk: true,
      multicast: false,
      axe: false,
      ws: {
        reconnect: true,
        reconnectDelay: 1000
      }
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
          .then(() => {
            // Set user profile data
            this.user.get('profile').put({
              nickname: nickname || username,
              createdAt: Date.now(),
              publicKey: this.user.is.pub
            });
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

  // Get user profile
  async getUserProfile(publicKey = null) {
    const key = publicKey || this.getCurrentUser()?.pub;
    if (!key) return null;

    return new Promise((resolve) => {
      this.gun.user(key).get('profile').once((data) => {
        resolve(data);
      });
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