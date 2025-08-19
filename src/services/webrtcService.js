/**
 * WebRTC Service using Gun.js for signaling
 * No PeerJS dependency - pure WebRTC with Gun signaling
 */

import gunAuthService from './gunAuthService';
import debugLogger from '../utils/debugLogger';

class WebRTCService {
  constructor() {
    this.connections = new Map(); // peerId -> RTCPeerConnection
    this.dataChannels = new Map(); // peerId -> RTCDataChannel
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
    this.peerId = null;
    this.isInitialized = false;
    
    // ICE servers configuration
    this.iceConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
  }

  // Initialize service
  async initialize(userId) {
    if (this.isInitialized) {
      debugLogger.webrtc('WebRTC already initialized');
      return true;
    }

    this.peerId = userId;
    this.listenForSignals();
    this.isInitialized = true;
    
    debugLogger.webrtc('WebRTC initialized with ID:', this.peerId);
    return true;
  }

  // Listen for WebRTC signals via Gun
  listenForSignals() {
    const gun = gunAuthService.gun;
    if (!this.peerId) return;

    // Listen for incoming signals
    gun.get('webrtc_signals')
      .get(this.peerId)
      .map()
      .on((signal, key) => {
        if (!signal || !signal.type) return;
        
        // Ignore old signals (older than 30 seconds)
        if (Date.now() - signal.timestamp > 30000) {
          // Clean up old signal
          gun.get('webrtc_signals').get(this.peerId).get(key).put(null);
          return;
        }

        debugLogger.webrtc('Received signal:', signal.type, 'from:', signal.from);
        
        switch (signal.type) {
          case 'offer':
            this.handleOffer(signal);
            break;
          case 'answer':
            this.handleAnswer(signal);
            break;
          case 'ice-candidate':
            this.handleIceCandidate(signal);
            break;
        }
        
        // Clean up processed signal
        gun.get('webrtc_signals').get(this.peerId).get(key).put(null);
      });
  }

  // Create a connection to a peer
  async connectToPeer(targetPeerId, metadata = {}) {
    if (this.connections.has(targetPeerId)) {
      debugLogger.webrtc('Already connected to:', targetPeerId);
      return this.connections.get(targetPeerId);
    }

    debugLogger.webrtc('Creating connection to:', targetPeerId);
    
    const pc = new RTCPeerConnection(this.iceConfig);
    this.connections.set(targetPeerId, pc);
    
    // Create data channel
    const dc = pc.createDataChannel('messages', {
      ordered: true
    });
    
    this.setupDataChannel(dc, targetPeerId);
    this.setupPeerConnection(pc, targetPeerId);
    
    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    this.sendSignal(targetPeerId, {
      type: 'offer',
      offer: offer,
      from: this.peerId,
      metadata: metadata,
      timestamp: Date.now()
    });
    
    return pc;
  }

  // Handle incoming offer
  async handleOffer(signal) {
    const { from, offer, metadata } = signal;
    
    if (this.connections.has(from)) {
      debugLogger.webrtc('Connection already exists for:', from);
      return;
    }
    
    debugLogger.webrtc('Handling offer from:', from);
    
    const pc = new RTCPeerConnection(this.iceConfig);
    this.connections.set(from, pc);
    
    // Setup handlers
    this.setupPeerConnection(pc, from);
    
    // Handle data channel
    pc.ondatachannel = (event) => {
      debugLogger.webrtc('Data channel received from:', from);
      this.setupDataChannel(event.channel, from);
    };
    
    // Set remote description and create answer
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    // Send answer
    this.sendSignal(from, {
      type: 'answer',
      answer: answer,
      from: this.peerId,
      timestamp: Date.now()
    });
    
    // Notify handlers
    this.connectionHandlers.forEach(handler => {
      handler('incoming', from, metadata);
    });
  }

  // Handle incoming answer
  async handleAnswer(signal) {
    const { from, answer } = signal;
    const pc = this.connections.get(from);
    
    if (!pc) {
      debugLogger.warn('No connection found for answer from:', from);
      return;
    }
    
    debugLogger.webrtc('Handling answer from:', from);
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  // Handle ICE candidate
  async handleIceCandidate(signal) {
    const { from, candidate } = signal;
    const pc = this.connections.get(from);
    
    if (!pc) {
      debugLogger.warn('No connection found for ICE candidate from:', from);
      return;
    }
    
    debugLogger.webrtc('Adding ICE candidate from:', from);
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  // Setup peer connection handlers
  setupPeerConnection(pc, peerId) {
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        debugLogger.webrtc('Sending ICE candidate to:', peerId);
        this.sendSignal(peerId, {
          type: 'ice-candidate',
          candidate: event.candidate,
          from: this.peerId,
          timestamp: Date.now()
        });
      }
    };
    
    pc.onconnectionstatechange = () => {
      debugLogger.webrtc('Connection state:', pc.connectionState, 'for:', peerId);
      
      if (pc.connectionState === 'connected') {
        this.connectionHandlers.forEach(handler => {
          handler('connected', peerId, {});
        });
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.cleanup(peerId);
        this.connectionHandlers.forEach(handler => {
          handler('disconnected', peerId, {});
        });
      }
    };
  }

  // Setup data channel handlers
  setupDataChannel(dc, peerId) {
    dc.onopen = () => {
      debugLogger.webrtc('Data channel opened with:', peerId);
      this.dataChannels.set(peerId, dc);
    };
    
    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        debugLogger.webrtc('Message received from:', peerId, 'type:', data.type);
        
        this.messageHandlers.forEach(handler => {
          handler(peerId, data);
        });
      } catch (error) {
        debugLogger.error('Failed to parse message:', error);
      }
    };
    
    dc.onclose = () => {
      debugLogger.webrtc('Data channel closed with:', peerId);
      this.dataChannels.delete(peerId);
    };
    
    dc.onerror = (error) => {
      debugLogger.error('Data channel error with', peerId, ':', error);
    };
  }

  // Send signal via Gun
  sendSignal(targetPeerId, signal) {
    const gun = gunAuthService.gun;
    const signalId = `${Date.now()}_${Math.random()}`;
    
    gun.get('webrtc_signals')
      .get(targetPeerId)
      .get(signalId)
      .put(signal);
    
    // Auto-cleanup after 30 seconds
    setTimeout(() => {
      gun.get('webrtc_signals')
        .get(targetPeerId)
        .get(signalId)
        .put(null);
    }, 30000);
  }

  // Send message to peer
  async sendMessage(peerId, data) {
    const dc = this.dataChannels.get(peerId);
    
    if (!dc || dc.readyState !== 'open') {
      throw new Error(`No open data channel with ${peerId}`);
    }
    
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    dc.send(message);
    debugLogger.webrtc('Message sent to:', peerId);
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

  // Get connection status
  getConnectionStatus(peerId) {
    const pc = this.connections.get(peerId);
    const dc = this.dataChannels.get(peerId);
    
    return {
      connected: pc?.connectionState === 'connected' && dc?.readyState === 'open',
      connectionState: pc?.connectionState || 'disconnected',
      dataChannelState: dc?.readyState || 'closed'
    };
  }

  // Get connected peers
  getConnectedPeers() {
    const connected = [];
    this.connections.forEach((pc, peerId) => {
      if (pc.connectionState === 'connected') {
        connected.push(peerId);
      }
    });
    return connected;
  }

  // Check if service is ready
  isReady() {
    return this.isInitialized;
  }

  // Get peer ID
  getPeerId() {
    return this.peerId;
  }

  // Cleanup connection
  cleanup(peerId) {
    const pc = this.connections.get(peerId);
    const dc = this.dataChannels.get(peerId);
    
    if (dc) {
      dc.close();
      this.dataChannels.delete(peerId);
    }
    
    if (pc) {
      pc.close();
      this.connections.delete(peerId);
    }
    
    debugLogger.webrtc('Cleaned up connection with:', peerId);
  }

  // Destroy service
  destroy() {
    // Close all connections
    this.connections.forEach((pc, peerId) => {
      this.cleanup(peerId);
    });
    
    // Clear handlers
    this.messageHandlers.clear();
    this.connectionHandlers.clear();
    
    // Reset state
    this.isInitialized = false;
    this.peerId = null;
    
    debugLogger.webrtc('WebRTC service destroyed');
  }
}

export default new WebRTCService();