/**
 * Application Configuration
 * Centralized configuration for the Whisperz app
 */

export const APP_CONFIG = {
  // App metadata
  name: 'Whisperz',
  version: '2.0.0',
  description: 'Secure decentralized P2P chat application',
  
  // Authentication
  auth: {
    maxLoginAttempts: 5,
    loginWindowMs: 60000, // 1 minute
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    usernameMaxLength: 20,
    passwordMinLength: 8,
  },
  
  // Messages
  messages: {
    maxLength: 5000,
    maxOfflineMessages: 100,
    typingIndicatorTimeout: 3000,
    messageRetryAttempts: 3,
    messageRetryDelay: 1000,
  },
  
  // Friends & Invites
  invites: {
    expirationTime: 24 * 60 * 60 * 1000, // 24 hours
    maxActiveInvites: 10,
    inviteCodeLength: 32,
  },
  
  // WebRTC
  webrtc: {
    reconnectDelay: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 5000,
    connectionTimeout: 10000,
  },
  
  // Gun.js
  gun: {
    peers: import.meta.env.VITE_GUN_PEERS?.split(',') || [
      'https://gun-manhattan.herokuapp.com/gun',
      'https://gun-us.herokuapp.com/gun',
      'https://gun-eu.herokuapp.com/gun'
    ],
    localStorage: true,
    radisk: true,
    multicast: false,
  },
  
  // PeerJS
  peerjs: {
    host: import.meta.env.VITE_PEERJS_HOST?.split(':')[0] || null,
    port: import.meta.env.VITE_PEERJS_HOST?.split(':')[1] || 443,
    secure: true,
    debug: import.meta.env.DEV ? 2 : 0,
  },
  
  // UI/UX
  ui: {
    theme: 'unix-dark',
    animationDuration: 200,
    toastDuration: 3000,
    autoScrollThreshold: 100,
    mobileBreakpoint: 768,
  },
  
  // Developer
  dev: {
    enableDevTools: import.meta.env.DEV || window.location.hostname === 'localhost',
    logLevel: import.meta.env.DEV ? 'debug' : 'error',
    enablePerformanceMonitoring: false,
  },
  
  // Security
  security: {
    encryptionAlgorithm: 'AES',
    keyDerivationIterations: 100000,
    inviteHmacSecret: import.meta.env.VITE_INVITE_SECRET || 'default-invite-secret',
    csrfTokenLength: 32,
  },
};

// Freeze config to prevent accidental mutations
Object.freeze(APP_CONFIG);

export default APP_CONFIG;