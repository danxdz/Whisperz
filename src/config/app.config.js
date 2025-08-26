/**
 * Application Configuration
 * Centralized configuration for the Whisperz app
 */

export const APP_CONFIG = {
  // App metadata
  name: 'Whisperz',
  version: '2.0.1',
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

  // WebRTC removed - using Gun.js only

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
    encryptionAlgorithm: 'AES-GCM', // Updated to WebCrypto AES-GCM
    keyDerivationIterations: 600000, // OWASP recommended for PBKDF2
    csrfTokenLength: 32,
    webcryptoRequired: true, // Requires WebCrypto API support
  },
};

// Freeze config to prevent accidental mutations
Object.freeze(APP_CONFIG);

// Cache for the derived HMAC secret to avoid recalculating
let _cachedHmacSecret = null;

// Get HMAC secret with consistent fallback
export async function getInviteHmacSecret() {
  // Return cached secret if available
  if (_cachedHmacSecret) {
    return _cachedHmacSecret;
  }

  // Use environment variable if available
  const envSecret = import.meta.env.VITE_INVITE_SECRET;
  if (envSecret && envSecret !== 'default-invite-secret' && envSecret !== 'your-secret-key-here') {
    _cachedHmacSecret = envSecret;
    return envSecret;
  }
  
  // Fallback: derive a consistent secret from domain
  // This ensures the same secret across deployments on the same domain
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'fallback-origin';
    const encoder = new TextEncoder();
    const data = encoder.encode(`whisperz-hmac-${origin}-v1`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const derivedSecret = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    _cachedHmacSecret = derivedSecret;
    return derivedSecret;
  } catch (error) {
    // Ultimate fallback if crypto.subtle is not available
    console.error('Failed to derive HMAC secret, using static fallback');
    const fallbackSecret = 'fallback-hmac-secret-please-set-env-var';
    _cachedHmacSecret = fallbackSecret;
    return fallbackSecret;
  }
}

export default APP_CONFIG;