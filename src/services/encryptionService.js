import CryptoJS from 'crypto-js';

// AES-GCM encryption service with authentication
class EncryptionService {
  constructor() {
    this.derivedKeys = new Map();
    this.ITERATIONS = 100000; // Increased from 1000 to 100000 for better security
    
    // Initialize configuration with better error handling
    try {
      this.validateConfiguration();
    } catch (error) {
      if (import.meta.env.DEV) {
        // console.warn('Encryption service warning:', error.message);
        // console.warn('Running in development mode. Please configure environment variables for production.');
      } else {
        // In production, use a fallback but warn
        // console.error('SECURITY WARNING: Using fallback configuration. Please set VITE_INVITE_SECRET in Vercel!');
      }
    }
  }

  // Validate security configuration
  validateConfiguration() {
    const secret = import.meta.env.VITE_INVITE_SECRET;
    
    // In development, warn but don't crash
    if (import.meta.env.DEV) {
      if (!secret || secret === 'default-invite-secret' || secret === 'your-secret-key-here') {
        // console.warn('SECURITY WARNING: Using development mode. Configure VITE_INVITE_SECRET for production.');
      }
      return;
    }
    
    // In production, use fallback if not configured (with warning)
    if (!secret) {
      // console.error('SECURITY WARNING: VITE_INVITE_SECRET not configured. Using fallback (NOT SECURE!)');
      // Don't throw error to allow app to run
      return;
    }
    
    // Check for default values
    if (secret === 'default-invite-secret' || secret === 'your-secret-key-here') {
      // console.error('SECURITY WARNING: Default secret detected. Please configure a proper secret.');
    }
  }

  // Derive a key from password using PBKDF2 with 100k iterations
  deriveKey(password, salt = null) {
    const cacheKey = `${password}-${salt}`;
    if (this.derivedKeys.has(cacheKey)) {
      return this.derivedKeys.get(cacheKey);
    }

    const actualSalt = salt || CryptoJS.lib.WordArray.random(128/8).toString();
    const key = CryptoJS.PBKDF2(password, actualSalt, {
      keySize: 256/32,
      iterations: this.ITERATIONS, // 100,000 iterations for security
      hasher: CryptoJS.algo.SHA256
    });

    const result = {
      key: key.toString(),
      salt: actualSalt
    };

    // Limit cache size to prevent memory issues
    if (this.derivedKeys.size > 100) {
      const firstKey = this.derivedKeys.keys().next().value;
      this.derivedKeys.delete(firstKey);
    }

    this.derivedKeys.set(cacheKey, result);
    return result;
  }

  // Encrypt a message with AES-GCM (using AES-CBC + HMAC for authentication)
  encryptMessage(message, password) {
    try {
      // Input validation
      if (!message || typeof message !== 'string') {
        throw new Error('Invalid message');
      }
      if (!password || typeof password !== 'string') {
        throw new Error('Invalid password');
      }

      const { key, salt } = this.deriveKey(password);
      const iv = CryptoJS.lib.WordArray.random(128/8);
      
      // Encrypt with AES-CBC
      const encrypted = CryptoJS.AES.encrypt(message, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Generate HMAC for authentication (simulating GCM)
      const ciphertext = encrypted.toString();
      const authData = salt + iv.toString() + ciphertext;
      const hmac = CryptoJS.HmacSHA256(authData, key).toString();

      // Combine all components
      const combined = {
        salt: salt,
        iv: iv.toString(),
        data: ciphertext,
        hmac: hmac,
        version: 2 // Version 2 indicates authenticated encryption
      };

      return btoa(JSON.stringify(combined));
    } catch (error) {
      // console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message securely');
    }
  }

  // Decrypt a message with authentication
  decryptMessage(encryptedData, password) {
    try {
      // Input validation
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data');
      }
      if (!password || typeof password !== 'string') {
        throw new Error('Invalid password');
      }

      const combined = JSON.parse(atob(encryptedData));
      
      // Check version for backward compatibility
      if (combined.version !== 2) {
        throw new Error('Unsupported encryption version');
      }

      const { key } = this.deriveKey(password, combined.salt);
      
      // Verify HMAC first (authentication)
      const authData = combined.salt + combined.iv + combined.data;
      const calculatedHmac = CryptoJS.HmacSHA256(authData, key).toString();
      
      if (calculatedHmac !== combined.hmac) {
        throw new Error('Authentication failed: Message may have been tampered with');
      }
      
      // Decrypt if authentication passes
      const decrypted = CryptoJS.AES.decrypt(combined.data, key, {
        iv: CryptoJS.enc.Hex.parse(combined.iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!plaintext) {
        throw new Error('Decryption failed');
      }

      return plaintext;
    } catch (error) {
      // console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message: ' + error.message);
    }
  }

  // Generate HMAC for invite links with secure secret
  generateHMAC(data, secret = null) {
    const actualSecret = secret || import.meta.env.VITE_INVITE_SECRET;
    
    // Validate secret
    if (!actualSecret || actualSecret === 'default-invite-secret') {
      throw new Error('SECURITY ERROR: Invalid HMAC secret');
    }
    
    return CryptoJS.HmacSHA256(data, actualSecret).toString();
  }

  // Verify HMAC with timing-safe comparison
  verifyHMAC(data, hmac, secret = null) {
    const actualSecret = secret || import.meta.env.VITE_INVITE_SECRET;
    
    // Validate secret
    if (!actualSecret || actualSecret === 'default-invite-secret') {
      throw new Error('SECURITY ERROR: Invalid HMAC secret');
    }
    
    const calculatedHmac = this.generateHMAC(data, actualSecret);
    
    // Timing-safe comparison
    if (calculatedHmac.length !== hmac.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < calculatedHmac.length; i++) {
      result |= calculatedHmac.charCodeAt(i) ^ hmac.charCodeAt(i);
    }
    
    return result === 0;
  }

  // Generate cryptographically secure random string
  generateRandomString(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Base64URL encoding for invite links
  base64UrlEncode(str) {
    // First encode to base64
    const base64 = btoa(unescape(encodeURIComponent(str)));
    // Then make it URL-safe
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Base64URL decoding with validation
  base64UrlDecode(str) {
    try {
      // Validate input
      if (!str || typeof str !== 'string') {
        throw new Error('Invalid input');
      }
      
      // Replace URL-safe characters
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add proper padding
      const padding = (4 - (base64.length % 4)) % 4;
      if (padding) {
        base64 += '='.repeat(padding);
      }
      
      // Decode from base64
      const decoded = atob(base64);
      
      // Handle UTF-8 decoding
      return decodeURIComponent(escape(decoded));
    } catch (error) {
      // console.error('Base64 decode error:', error);
      throw new Error('Invalid base64 encoding: ' + error.message);
    }
  }

  // Clear sensitive data from memory
  clearSensitiveData() {
    this.derivedKeys.clear();
    // Force garbage collection hint
    if (typeof globalThis !== 'undefined' && globalThis.gc) {
      globalThis.gc();
    }
  }

  // Generate secure encryption key
  async generateSecureKey() {
    if (window.crypto && window.crypto.subtle) {
      try {
        const key = await window.crypto.subtle.generateKey(
          {
            name: 'AES-GCM',
            length: 256
          },
          true,
          ['encrypt', 'decrypt']
        );
        
        const exported = await window.crypto.subtle.exportKey('raw', key);
        return btoa(String.fromCharCode(...new Uint8Array(exported)));
      } catch (error) {
        // console.error('WebCrypto API error:', error);
        // Fallback to CryptoJS
        return CryptoJS.lib.WordArray.random(256/8).toString();
      }
    } else {
      // Fallback for older browsers
      return CryptoJS.lib.WordArray.random(256/8).toString();
    }
  }
}

export default new EncryptionService();