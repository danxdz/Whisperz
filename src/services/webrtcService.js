import Peer from 'peerjs';

// WebRTC service for P2P communication
class WebRTCService {
  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
    this.peerId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Initialize PeerJS
  async initialize(userId) {
    return new Promise((resolve, reject) => {
      try {
        // Clean up existing peer if any
        if (this.peer) {
          this.destroy();
        }

        // Generate peer ID from user ID
        this.peerId = `p2p-${userId}-${Date.now()}`;
        
        // PeerJS configuration
        const config = {
          debug: import.meta.env.DEV ? 2 : 0,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' }
            ]
          }
        };

        // Use custom PeerJS server if provided, otherwise use PeerJS cloud
        if (import.meta.env.VITE_PEERJS_HOST) {
          const [host, port] = import.meta.env.VITE_PEERJS_HOST.split(':');
          config.host = host;
          config.port = port || 443;
          config.secure = true;
          config.path = '/peerjs';
          // console.log('🌐 Using custom PeerJS server:', host);
        } else {
          // Use PeerJS cloud service (free tier)
          // console.log('🌐 Using PeerJS cloud service');
          // PeerJS cloud doesn't need host/port configuration
        }

        // console.log('🎯 Initializing PeerJS with ID:', this.peerId);

        this.peer = new Peer(this.peerId, config);

        // Handle peer events
        this.peer.on('open', (id) => {
          // console.log('WebRTC peer opened with ID:', id);
          this.peerId = id;
          this.reconnectAttempts = 0;
          resolve(id);
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('disconnected', () => {
          // console.log('Peer disconnected, attempting reconnect...');
          this.attemptReconnect();
        });

        this.peer.on('error', (err) => {
          // console.error('Peer error:', err);
          if (err.type === 'unavailable-id') {
            // Generate new ID and retry
            this.peerId = `p2p-${userId}-${Date.now()}-${Math.random()}`;
            this.initialize(userId).then(resolve).catch(reject);
          } else if (err.type === 'network' || err.type === 'server-error') {
            this.attemptReconnect();
          } else {
            reject(err);
          }
        });

        // Timeout if connection takes too long
        setTimeout(() => {
          if (!this.peer?.open) {
            reject(new Error('PeerJS connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Connect to another peer
  async connectToPeer(remotePeerId, metadata = {}) {
    return new Promise((resolve, reject) => {
      if (!this.peer || !this.peer.open) {
        reject(new Error('Peer not initialized'));
        return;
      }

      // Check if already connected
      if (this.connections.has(remotePeerId)) {
        const existing = this.connections.get(remotePeerId);
        if (existing.open) {
          resolve(existing);
          return;
        }
      }

      try {
        const conn = this.peer.connect(remotePeerId, {
          reliable: true,
          metadata: {
            ...metadata,
            timestamp: Date.now()
          }
        });

        conn.on('open', () => {
          this.connections.set(remotePeerId, conn);
          this.setupConnectionHandlers(conn);
          this.notifyConnectionHandlers('connected', remotePeerId, metadata);
          resolve(conn);
        });

        conn.on('error', (err) => {
          // console.error(`Connection error with ${remotePeerId}:`, err);
          this.connections.delete(remotePeerId);
          reject(err);
        });

        // Timeout for connection
        setTimeout(() => {
          if (!conn.open) {
            conn.close();
            this.connections.delete(remotePeerId);
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Handle incoming connection
  handleIncomingConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.setupConnectionHandlers(conn);
      this.notifyConnectionHandlers('connected', conn.peer, conn.metadata);
    });
  }

  // Setup connection event handlers
  setupConnectionHandlers(conn) {
    conn.on('data', (data) => {
      this.handleMessage(conn.peer, data);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.notifyConnectionHandlers('disconnected', conn.peer);
    });

    conn.on('error', (err) => {
      // console.error(`Connection error with ${conn.peer}:`, err);
    });
  }

  // Send message to a peer
  async sendMessage(peerId, message) {
    const conn = this.connections.get(peerId);
    if (!conn || !conn.open) {
      throw new Error(`Not connected to peer ${peerId}`);
    }

    try {
      conn.send(message);
      return true;
    } catch (error) {
      // console.error(`Failed to send message to ${peerId}:`, error);
      throw error;
    }
  }

  // Broadcast message to all connected peers
  broadcastMessage(message) {
    const results = [];
    for (const [peerId, conn] of this.connections) {
      if (conn.open) {
        try {
          conn.send(message);
          results.push({ peerId, success: true });
        } catch (error) {
          results.push({ peerId, success: false, error });
        }
      }
    }
    return results;
  }

  // Handle incoming messages
  handleMessage(peerId, data) {
    this.messageHandlers.forEach(handler => {
      try {
        handler(peerId, data);
      } catch (error) {
        // console.error('Message handler error:', error);
      }
    });
  }

  // Register message handler
  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Register connection handler
  onConnection(handler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  // Notify connection handlers
  notifyConnectionHandlers(event, peerId, metadata = {}) {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(event, peerId, metadata);
      } catch (error) {
        // console.error('Connection handler error:', error);
      }
    });
  }

  // Attempt to reconnect
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      if (this.peer && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    }, 1000 * this.reconnectAttempts);
  }

  // Get connection status
  getConnectionStatus(peerId) {
    const conn = this.connections.get(peerId);
    return {
      connected: conn?.open || false,
      metadata: conn?.metadata || null
    };
  }

  // Get all connected peers
  getConnectedPeers() {
    return Array.from(this.connections.keys()).filter(peerId => {
      const conn = this.connections.get(peerId);
      return conn?.open;
    });
  }

  // Disconnect from a specific peer
  disconnectPeer(peerId) {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.close();
      this.connections.delete(peerId);
    }
  }

  // Get current peer ID
  getPeerId() {
    return this.peerId;
  }

  // Check if service is ready
  isReady() {
    return this.peer && this.peer.open;
  }

  // Destroy the peer and cleanup
  destroy() {
    if (this.peer) {
      // Close all connections
      for (const conn of this.connections.values()) {
        conn.close();
      }
      this.connections.clear();
      
      // Destroy peer
      this.peer.destroy();
      this.peer = null;
      this.peerId = null;
    }

    // Clear handlers
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
  }
}

export default new WebRTCService();