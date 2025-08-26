/**
 * WebRTC Service using Gun.js for signaling
 * No PeerJS dependency - pure WebRTC with Gun signaling
 */

import gunAuthService from './gunAuthService';
import debugLogger from '../utils/debugLogger';
import securityUtils from '../utils/securityUtils.js';

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

    // Extract just the public key part (before the dot if it exists)
    // Gun.js sometimes adds .epub to the user ID
    this.peerId = userId.split('.')[0];
    this.listenForSignals();
    this.isInitialized = true;

    debugLogger.webrtc('WebRTC initialized with ID:', this.peerId);
    return true;
  }

  // Listen for WebRTC signals via Gun
  listenForSignals() {
    const gun = gunAuthService.gun;
    if (!this.peerId) {
      debugLogger.error('Cannot listen for signals - no peer ID');
      return;
    }

    debugLogger.webrtc('👂 Listening for signals at:', this.peerId);

    // Listen for incoming signals
    gun.get('webrtc_signals')
      .get(this.peerId)
      .map()
      .on((signal, key) => {
        if (!signal || !signal.type) return;

        // Ignore old signals (older than 30 seconds)
        if (Date.now() - signal.timestamp > 30000) {
          debugLogger.webrtc('Ignoring old signal:', signal.type);
          // Clean up old signal
          gun.get('webrtc_signals').get(this.peerId).get(key).put(null);
          return;
        }

        debugLogger.webrtc('📨 Received signal:', signal.type, 'from:', signal.from);

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
    // Normalize peer ID (remove .epub if present)
    const normalizedPeerId = targetPeerId.split('.')[0];
    
    if (this.connections.has(normalizedPeerId)) {
      debugLogger.webrtc('Already connected to:', normalizedPeerId);
      return this.connections.get(normalizedPeerId);
    }

    debugLogger.webrtc('Creating connection to:', normalizedPeerId);

    const pc = new RTCPeerConnection(this.iceConfig);
    this.connections.set(normalizedPeerId, pc);

    // Create data channel
    const dc = pc.createDataChannel('messages', {
      ordered: true
    });

    // Store data channel immediately to avoid race conditions
    this.dataChannels.set(normalizedPeerId, dc);

    this.setupDataChannel(dc, normalizedPeerId);
    this.setupPeerConnection(pc, normalizedPeerId);

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.sendSignal(normalizedPeerId, {
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
    const { offer, metadata } = signal;
    // Normalize the sender's peer ID
    const from = signal.from.split('.')[0];

    // Check if we already have a connection
    const existingPc = this.connections.get(from);
    if (existingPc) {
      // If we're already connected, ignore
      if (existingPc.connectionState === 'connected') {
        debugLogger.webrtc('Already connected to:', from);
        return;
      }

      // Handle simultaneous connection attempts (offer collision)
      // Use peer ID comparison to decide who wins
      if (existingPc.signalingState === 'have-local-offer') {
        // We both sent offers - use deterministic resolution
        if (this.peerId > from) {
          // We win - ignore their offer
          debugLogger.webrtc('Offer collision - we win, ignoring offer from:', from);
          return;
        } else {
          // They win - accept their offer, cancel ours
          debugLogger.webrtc('Offer collision - they win, accepting offer from:', from);
          existingPc.close();
          this.connections.delete(from);
          this.dataChannels.delete(from);
        }
      }
    }

    debugLogger.webrtc('Handling offer from:', from);

    const pc = new RTCPeerConnection(this.iceConfig);
    this.connections.set(from, pc);

    // Setup handlers
    this.setupPeerConnection(pc, from);

    // Handle data channel
    pc.ondatachannel = (event) => {
      debugLogger.webrtc('📦 Data channel received from:', from);
      const dc = event.channel;
      this.setupDataChannel(dc, from);
      // Store the data channel immediately
      this.dataChannels.set(from, dc);
      debugLogger.webrtc('✅ Data channel stored for:', from);
    };

    // Set remote description and create answer
    try {
      // Validate offer before using it
      if (!offer || !offer.type || !offer.sdp) {
        throw new Error(`Invalid offer received: ${JSON.stringify(offer)}`);
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      debugLogger.webrtc('✅ Remote description set, creating answer...');
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      debugLogger.webrtc('✅ Local description set, sending answer...');

      // Send answer back to the offerer
      this.sendSignal(from, {
        type: 'answer',
        answer: answer,
        from: this.peerId,
        timestamp: Date.now()
      });
      
      debugLogger.webrtc('📤 Answer sent back to:', from);
    } catch (error) {
      debugLogger.error('Failed to create/send answer:', error);
      throw error;
    }

    // Notify handlers
    this.connectionHandlers.forEach(handler => {
      handler('incoming', from, metadata);
    });
  }

  // Handle incoming answer
  async handleAnswer(signal) {
    const { answer } = signal;
    // Normalize the sender's peer ID
    const from = signal.from.split('.')[0];
    
    debugLogger.webrtc('📥 Received answer from:', from);
    
    const pc = this.connections.get(from);
    if (!pc) {
      debugLogger.error('❌ No connection found for answer from:', from);
      debugLogger.error('Active connections:', Array.from(this.connections.keys()));
      return;
    }

    try {
      // Validate answer before using it
      if (!answer || !answer.type || !answer.sdp) {
        throw new Error(`Invalid answer received: ${JSON.stringify(answer)}`);
      }
      
      debugLogger.webrtc('Setting remote description with answer from:', from);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      debugLogger.webrtc('✅ Answer processed successfully, connection should be established');
      
      // Log connection state
      debugLogger.webrtc('Connection state:', pc.connectionState);
      debugLogger.webrtc('ICE connection state:', pc.iceConnectionState);
    } catch (error) {
      debugLogger.error('Failed to set remote description:', error);
    }
  }

  // Handle ICE candidate
  async handleIceCandidate(signal) {
    const { candidate } = signal;
    // Normalize the sender's peer ID
    const from = signal.from.split('.')[0];
    const pc = this.connections.get(from);

    if (!pc) {
      debugLogger.warn('No connection found for ICE candidate from:', from);
      return;
    }

    try {
      debugLogger.webrtc('Adding ICE candidate from:', from);

      // Skip if no candidate (end of candidates signal)
      if (!candidate) {
        return;
      }

      // Check if candidate is already an RTCIceCandidate object or needs to be created
      if (candidate instanceof RTCIceCandidate) {
        await pc.addIceCandidate(candidate);
      } else if (candidate && typeof candidate === 'object') {
        // Ensure required fields are present
        const candidateInit = {
          candidate: candidate.candidate || '',
          sdpMLineIndex: candidate.sdpMLineIndex !== undefined ? candidate.sdpMLineIndex : 0,
          sdpMid: candidate.sdpMid || '0'
        };

        // Only add if we have a valid candidate string
        if (candidateInit.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        }
      } else {
        debugLogger.error('Invalid ICE candidate format:', candidate);
      }
    } catch (error) {
      debugLogger.error('Failed to add ICE candidate:', error.message);
      // Don't throw - ICE candidates can fail and that's okay
    }
  }

  // Setup peer connection handlers
  setupPeerConnection(pc, peerId) {
    // Monitor connection state changes
    pc.onconnectionstatechange = () => {
      debugLogger.webrtc(`📊 Connection state changed for ${peerId}:`, pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        debugLogger.webrtc(`✅ P2P CONNECTED with ${peerId}!`);
      } else if (pc.connectionState === 'failed') {
        debugLogger.error(`❌ P2P connection FAILED with ${peerId}`);
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      debugLogger.webrtc(`🧊 ICE state changed for ${peerId}:`, pc.iceConnectionState);
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        debugLogger.webrtc('Sending ICE candidate to:', peerId);
        // Send only the serializable properties of the ICE candidate
        this.sendSignal(peerId, {
          type: 'ice-candidate',
          candidate: {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
            usernameFragment: event.candidate.usernameFragment
          },
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
      // Remove from map to prevent stale references
      this.dataChannels.delete(peerId);
    };

    dc.onerror = (error) => {
      debugLogger.error('Data channel error with', peerId, ':', error);
    };
  }

  // Send signal via Gun
  sendSignal(targetPeerId, signal) {
    const gun = gunAuthService.gun;
    const signalId = securityUtils.generateSignalId();

    debugLogger.webrtc(`📤 Sending ${signal.type} to:`, targetPeerId);
    
    gun.get('webrtc_signals')
      .get(targetPeerId)
      .get(signalId)
      .put(signal, (ack) => {
        if (ack.err) {
          debugLogger.error('Failed to send signal:', ack.err);
        } else {
          debugLogger.webrtc(`✅ ${signal.type} sent successfully`);
        }
      });

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
    // Normalize peer ID
    const normalizedPeerId = peerId.split('.')[0];
    let dc = this.dataChannels.get(normalizedPeerId);

    // If no data channel or not open, wait a bit for it to open
    if (!dc || dc.readyState !== 'open') {
      debugLogger.webrtc('Data channel not ready, waiting...');
      
      // Wait up to 5 seconds for data channel to open
      const maxWaitTime = 5000;
      const checkInterval = 100;
      let waited = 0;
      
      while (waited < maxWaitTime) {
        dc = this.dataChannels.get(normalizedPeerId);
        if (dc && dc.readyState === 'open') {
          debugLogger.webrtc('Data channel now ready!');
          break;
        }
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }
      
      // Final check
      if (!dc || dc.readyState !== 'open') {
        debugLogger.webrtc(`Data channel still not open after ${maxWaitTime}ms`);
        throw new Error(`No open data channel with ${normalizedPeerId}`);
      }
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    dc.send(message);
    debugLogger.webrtc('Message sent via P2P to:', peerId);
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
    // Normalize peer ID
    const normalizedPeerId = peerId.split('.')[0];
    const pc = this.connections.get(normalizedPeerId);
    const dc = this.dataChannels.get(normalizedPeerId);

    // Log current state for debugging (only if there's an active connection)
    if (pc) {
      debugLogger.webrtc(`Connection status for ${peerId}:`, {
        pcState: pc.connectionState,
        dcState: dc?.readyState,
        iceState: pc.iceConnectionState
      });
    }

    return {
      connected: pc?.connectionState === 'connected' && dc?.readyState === 'open',
      connectionState: pc?.connectionState || 'disconnected',
      dataChannelState: dc?.readyState || 'closed',
      iceConnectionState: pc?.iceConnectionState || 'disconnected'
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