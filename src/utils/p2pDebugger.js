/**
 * P2P Connection Debugger
 * Helps diagnose and fix P2P connection issues
 */

import webrtcService from '../services/webrtcService';
import hybridGunService from '../services/hybridGunService';
import friendsService from '../services/friendsService';

class P2PDebugger {
  constructor() {
    this.logs = [];
    this.connectionAttempts = new Map();
  }

  // Add debug log
  log(message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      data
    };
    this.logs.push(entry);
    console.log(`🔍 [P2P Debug] ${message}`, data);
  }

  // Check WebRTC initialization
  async checkWebRTCStatus() {
    this.log('Checking WebRTC status...');
    
    const isReady = webrtcService.isReady();
    const peerId = webrtcService.getPeerId();
    const peer = webrtcService.peer;
    
    const status = {
      isReady,
      peerId,
      peerExists: !!peer,
      peerOpen: peer?.open || false,
      peerDestroyed: peer?.destroyed || false,
      connections: webrtcService.getConnectedPeers()
    };
    
    this.log('WebRTC Status:', status);
    return status;
  }

  // Check presence broadcasting
  async checkPresenceBroadcast() {
    this.log('Checking presence broadcast...');
    
    const user = await hybridGunService.gun.user().once();
    const publicKey = user?.pub;
    
    if (!publicKey) {
      this.log('ERROR: No user public key found');
      return null;
    }
    
    // Check presence in Gun
    const presence = await new Promise(resolve => {
      hybridGunService.gun
        .get('presence')
        .get(publicKey)
        .once(data => resolve(data));
    });
    
    this.log('My presence data:', presence);
    return presence;
  }

  // Check friend's presence
  async checkFriendPresence(friendPublicKey) {
    this.log(`Checking friend presence for: ${friendPublicKey}`);
    
    // Check in presence space
    const presence = await friendsService.getFriendPresence(friendPublicKey);
    this.log('Friend presence:', presence);
    
    // Also check peer_exchange space
    const peerExchange = await new Promise(resolve => {
      hybridGunService.gun
        .get('peer_exchange')
        .get(friendPublicKey)
        .once(data => resolve(data));
    });
    
    this.log('Friend peer exchange data:', peerExchange);
    
    return { presence, peerExchange };
  }

  // Attempt P2P connection with detailed logging
  async attemptConnection(friendPublicKey) {
    this.log(`Attempting P2P connection to: ${friendPublicKey}`);
    
    try {
      // Step 1: Get friend's presence
      const friendData = await this.checkFriendPresence(friendPublicKey);
      
      if (!friendData.presence?.isOnline) {
        this.log('Friend is offline or presence not found');
        return { success: false, reason: 'Friend offline' };
      }
      
      if (!friendData.presence?.peerId) {
        this.log('Friend peer ID not found in presence');
        return { success: false, reason: 'No peer ID' };
      }
      
      const friendPeerId = friendData.presence.peerId;
      this.log(`Friend peer ID found: ${friendPeerId}`);
      
      // Step 2: Check our WebRTC status
      const ourStatus = await this.checkWebRTCStatus();
      if (!ourStatus.isReady) {
        this.log('Our WebRTC is not ready');
        return { success: false, reason: 'WebRTC not ready' };
      }
      
      // Step 3: Attempt connection
      this.log(`Connecting to peer: ${friendPeerId}`);
      
      const connection = await webrtcService.connectToPeer(friendPeerId, {
        friendPublicKey,
        timestamp: Date.now()
      });
      
      this.log('Connection established!', connection);
      
      // Step 4: Test the connection
      await this.testConnection(friendPeerId);
      
      return { success: true, connection };
      
    } catch (error) {
      this.log('Connection failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Test P2P connection
  async testConnection(peerId) {
    this.log(`Testing connection to: ${peerId}`);
    
    try {
      // Send ping
      const pingData = {
        type: 'ping',
        timestamp: Date.now(),
        random: Math.random()
      };
      
      await webrtcService.sendMessage(peerId, pingData);
      this.log('Ping sent successfully', pingData);
      
      return true;
    } catch (error) {
      this.log('Ping failed:', error);
      return false;
    }
  }

  // Full diagnostic
  async runFullDiagnostic() {
    console.log('🏥 Starting P2P Diagnostic...');
    
    const report = {
      timestamp: new Date().toISOString(),
      webrtc: await this.checkWebRTCStatus(),
      presence: await this.checkPresenceBroadcast(),
      friends: []
    };
    
    // Check each friend
    const friends = await friendsService.getFriends();
    for (const friend of friends) {
      const friendReport = {
        nickname: friend.nickname,
        publicKey: friend.publicKey,
        presence: await this.checkFriendPresence(friend.publicKey),
        connectionAttempt: await this.attemptConnection(friend.publicKey)
      };
      report.friends.push(friendReport);
    }
    
    // Summary
    console.log('📊 P2P Diagnostic Report:', report);
    console.log('📜 Debug logs:', this.logs);
    
    return report;
  }

  // Monitor P2P events
  startMonitoring() {
    console.log('👁️ Starting P2P monitoring...');
    
    // Monitor WebRTC events
    webrtcService.onConnection((event, peerId, metadata) => {
      this.log(`WebRTC event: ${event}`, { peerId, metadata });
    });
    
    // Monitor messages
    webrtcService.onMessage((peerId, data) => {
      this.log('Message received via P2P', { from: peerId, data });
      
      // Auto-respond to pings
      if (data.type === 'ping') {
        webrtcService.sendMessage(peerId, {
          type: 'pong',
          timestamp: Date.now(),
          respondingTo: data.random
        });
        this.log('Pong sent', { to: peerId });
      }
    });
    
    // Monitor presence updates
    const checkInterval = setInterval(() => {
      this.checkWebRTCStatus();
      this.checkPresenceBroadcast();
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(checkInterval);
  }

  // Get connection statistics
  getStats() {
    const stats = {
      totalLogs: this.logs.length,
      connectionAttempts: this.connectionAttempts.size,
      lastLogs: this.logs.slice(-10),
      webrtcStatus: webrtcService.isReady(),
      connectedPeers: webrtcService.getConnectedPeers()
    };
    
    console.log('📈 P2P Statistics:', stats);
    return stats;
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.connectionAttempts.clear();
    console.log('🧹 P2P debug logs cleared');
  }
}

// Create singleton instance
const p2pDebugger = new P2PDebugger();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.p2pDebug = {
    status: () => p2pDebugger.checkWebRTCStatus(),
    presence: () => p2pDebugger.checkPresenceBroadcast(),
    friendPresence: (key) => p2pDebugger.checkFriendPresence(key),
    connect: (key) => p2pDebugger.attemptConnection(key),
    diagnose: () => p2pDebugger.runFullDiagnostic(),
    monitor: () => p2pDebugger.startMonitoring(),
    stats: () => p2pDebugger.getStats(),
    clear: () => p2pDebugger.clearLogs(),
    logs: () => p2pDebugger.logs
  };
  
  console.log(`
🔧 P2P Debugger Loaded! Available commands:
- p2pDebug.status() - Check WebRTC status
- p2pDebug.presence() - Check your presence broadcast
- p2pDebug.friendPresence(publicKey) - Check friend's presence
- p2pDebug.connect(publicKey) - Try connecting to friend
- p2pDebug.diagnose() - Run full diagnostic
- p2pDebug.monitor() - Start monitoring P2P events
- p2pDebug.stats() - Get connection statistics
- p2pDebug.logs() - View debug logs
- p2pDebug.clear() - Clear logs
  `);
}

export default p2pDebugger;