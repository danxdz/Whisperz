// Simple WebRTC implementation without PeerJS
// Uses Gun.js for signaling only

import gunAuthService from './gunAuthService';
import securityUtils from '../utils/securityUtils.js';

class SimpleWebRTC {
  constructor() {
    this.connections = new Map(); // friendKey -> RTCPeerConnection
    this.dataChannels = new Map(); // friendKey -> RTCDataChannel
    this.messageHandlers = new Set();
    this.isInitialized = false;
    this.userId = null;

    // Use minimal STUN for NAT traversal (optional)
    // Can work without it on same network or with good NAT
    this.iceServers = {
      iceServers: [
        // You could add your own STUN server here if needed
        // For now, try without any - Gun relay handles everything
      ]
    };
  }

  // Initialize WebRTC
  async initialize(userId) {
    if (this.isInitialized) {
      // WebRTC already initialized
      return true;
    }

    this.userId = userId;

    // Listen for WebRTC signals via Gun
    this.listenForSignals();

    this.isInitialized = true;
    console.log('🎉 Simple WebRTC initialized for user:', userId);
    return true;
  }

  // Listen for WebRTC signaling messages via Gun
  listenForSignals() {
    const gun = gunAuthService.gun;
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    // Listen for offers/answers/ICE candidates
    gun.get('webrtc_signals')
      .get(user.pub)
      .map()
      .on(async (signal, key) => {
        if (!signal || key === '_' || !signal.type) return;

        // Ignore old signals (older than 1 minute)
        if (signal.timestamp && (Date.now() - signal.timestamp) > 60000) {
          return;
        }

        console.log('📨 Received WebRTC signal:', signal.type, 'from:', signal.from);

        if (signal.type === 'offer') {
          await this.handleOffer(signal);
        } else if (signal.type === 'answer') {
          await this.handleAnswer(signal);
        } else if (signal.type === 'ice-candidate') {
          await this.handleIceCandidate(signal);
        }

        // Clean up processed signal
        gun.get('webrtc_signals').get(user.pub).get(key).put(null);
      });
  }

  // Create connection to a friend
  async connectToPeer(friendPublicKey) {
    console.log('🔗 Attempting WebRTC connection to:', friendPublicKey);

    // Check if connection already exists
    if (this.connections.has(friendPublicKey)) {
      const conn = this.connections.get(friendPublicKey);
      if (conn.connectionState === 'connected') {
        // Already connected
        return true;
      }
    }

    try {
      // Create new RTCPeerConnection
      const pc = new RTCPeerConnection(this.iceServers);
      this.connections.set(friendPublicKey, pc);

      // Set up ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal(friendPublicKey, {
            type: 'ice-candidate',
            candidate: event.candidate
          });
        }
      };

      // Set up connection state monitoring
      pc.onconnectionstatechange = () => {
        console.log('🔌 Connection state:', pc.connectionState, 'for:', friendPublicKey);
        if (pc.connectionState === 'connected') {
          // WebRTC connected
        } else if (pc.connectionState === 'failed') {
          console.error('❌ WebRTC connection failed to:', friendPublicKey);
          this.cleanup(friendPublicKey);
        }
      };

      // Create data channel for messages
      const dataChannel = pc.createDataChannel('messages', {
        ordered: true,
        reliable: true
      });

      dataChannel.onopen = () => {
        console.log('📬 Data channel opened with:', friendPublicKey);
        this.dataChannels.set(friendPublicKey, dataChannel);
      };

      dataChannel.onmessage = (event) => {
        this.handleMessage(friendPublicKey, event.data);
      };

      dataChannel.onerror = (error) => {
        console.error('❌ Data channel error:', error);
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send offer via Gun signaling
      await this.sendSignal(friendPublicKey, {
        type: 'offer',
        offer: offer
      });

      console.log('📤 Sent WebRTC offer to:', friendPublicKey);
      return true;

    } catch (error) {
      console.error('❌ Failed to create WebRTC connection:', error);
      this.cleanup(friendPublicKey);
      return false;
    }
  }

  // Handle incoming offer
  async handleOffer(signal) {
    const { from, offer } = signal;
    console.log('📥 Handling offer from:', from);

    try {
      // Create peer connection if doesn't exist
      let pc = this.connections.get(from);
      if (!pc) {
        pc = new RTCPeerConnection(this.iceServers);
        this.connections.set(from, pc);

        // Set up ICE candidate handling
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            this.sendSignal(from, {
              type: 'ice-candidate',
              candidate: event.candidate
            });
          }
        };

        // Set up data channel handling
        pc.ondatachannel = (event) => {
          const dataChannel = event.channel;
          dataChannel.onopen = () => {
            console.log('📬 Data channel opened from:', from);
            this.dataChannels.set(from, dataChannel);
          };
          dataChannel.onmessage = (event) => {
            this.handleMessage(from, event.data);
          };
        };

        // Set up connection state monitoring
        pc.onconnectionstatechange = () => {
          console.log('🔌 Connection state:', pc.connectionState, 'from:', from);
        };
      }

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer back
      await this.sendSignal(from, {
        type: 'answer',
        answer: answer
      });

      console.log('📤 Sent answer to:', from);

    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
    }
  }

  // Handle incoming answer
  async handleAnswer(signal) {
    const { from, answer } = signal;
    console.log('📥 Handling answer from:', from);

    try {
      const pc = this.connections.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Set remote description
      }
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(signal) {
    const { from, candidate } = signal;

    try {
      const pc = this.connections.get(from);
      if (pc && candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('🧊 Added ICE candidate from:', from);
      }
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
    }
  }

  // Send signal via Gun
  async sendSignal(targetPublicKey, signal) {
    const gun = gunAuthService.gun;
    const user = gunAuthService.getCurrentUser();
    if (!user) return;

    const signalData = {
      ...signal,
      from: user.pub,
      timestamp: Date.now()
    };

    // Store signal in target's signal space
    gun.get('webrtc_signals')
      .get(targetPublicKey)
      .get(`signal_${securityUtils.generateSignalId()}`)
      .put(signalData);
  }

  // Send message via WebRTC
  sendMessage(friendPublicKey, message) {
    const dataChannel = this.dataChannels.get(friendPublicKey);

    if (dataChannel && dataChannel.readyState === 'open') {
      try {
        dataChannel.send(JSON.stringify(message));
        console.log('📤 Sent via WebRTC to:', friendPublicKey);
        return true;
      } catch (error) {
        console.error('❌ Failed to send via WebRTC:', error);
        return false;
      }
    }

    console.log('⚠️ No open WebRTC channel to:', friendPublicKey);
    return false;
  }

  // Handle incoming message
  handleMessage(from, data) {
    try {
      const message = JSON.parse(data);
      console.log('📥 Received via WebRTC from:', from);

      // Notify all message handlers
      this.messageHandlers.forEach(handler => {
        handler(from, message);
      });
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  // Register message handler
  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // Check if connected to a peer
  isConnected(friendPublicKey) {
    const pc = this.connections.get(friendPublicKey);
    const dc = this.dataChannels.get(friendPublicKey);
    return pc?.connectionState === 'connected' && dc?.readyState === 'open';
  }

  // Get connection status
  getConnectionStatus(friendPublicKey) {
    const pc = this.connections.get(friendPublicKey);
    const dc = this.dataChannels.get(friendPublicKey);

    return {
      webrtc: pc?.connectionState || 'disconnected',
      dataChannel: dc?.readyState || 'closed',
      connected: this.isConnected(friendPublicKey)
    };
  }

  // Clean up connection
  cleanup(friendPublicKey) {
    const pc = this.connections.get(friendPublicKey);
    const dc = this.dataChannels.get(friendPublicKey);

    if (dc) {
      dc.close();
      this.dataChannels.delete(friendPublicKey);
    }

    if (pc) {
      pc.close();
      this.connections.delete(friendPublicKey);
    }

    console.log('🧹 Cleaned up connection to:', friendPublicKey);
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized;
  }

  // Destroy all connections
  destroy() {
    this.connections.forEach((pc, key) => {
      this.cleanup(key);
    });
    this.messageHandlers.clear();
    this.isInitialized = false;
    console.log('💥 WebRTC service destroyed');
  }
}

export default new SimpleWebRTC();