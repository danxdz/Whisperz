// WebCrypto-based AES-GCM encryption service
class EncryptionService {
  constructor() {
    this.derivedKeys = new Map();
    this.ITERATIONS = 600000; // OWASP recommended ~600k iterations for PBKDF2
    this.VERSION = 3; // Version 3: WebCrypto AES-GCM

    // Check WebCrypto support
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('WebCrypto API not supported in this browser');
    }

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

  // Derive a key from password using WebCrypto PBKDF2 with 600k iterations
  async deriveKey(password, salt = null) {
    const cacheKey = `${password}-${salt}`;
    if (this.derivedKeys.has(cacheKey)) {
      return this.derivedKeys.get(cacheKey);
    }

    const actualSalt = salt || window.crypto.getRandomValues(new Uint8Array(16));
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: actualSalt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    const result = {
      key: key,
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

  // Encrypt a message with WebCrypto AES-GCM
  async encryptMessage(message, password) {
    try {
      // Input validation
      if (!message || typeof message !== 'string') {
        throw new Error('Invalid message');
      }
      if (!password || typeof password !== 'string') {
        throw new Error('Invalid password');
      }

      const { key, salt } = await this.deriveKey(password);
      const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for GCM

      const encoder = new TextEncoder();
      const plaintext = encoder.encode(message);

      // Encrypt with AES-GCM
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        plaintext
      );

      // WebCrypto returns ciphertext + tag concatenated
      const encryptedArray = new Uint8Array(encrypted);
      const ciphertext = encryptedArray.slice(0, -16); // All but last 16 bytes (tag)
      const tag = encryptedArray.slice(-16); // Last 16 bytes (authentication tag)

      // Combine all components
      const combined = {
        v: this.VERSION, // Version 3: WebCrypto AES-GCM
        salt: btoa(String.fromCharCode(...salt)),
        iv: btoa(String.fromCharCode(...iv)),
        ct: btoa(String.fromCharCode(...ciphertext)),
        tag: btoa(String.fromCharCode(...tag))
      };

      return btoa(JSON.stringify(combined));
    } catch (error) {
      // console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message securely');
    }
  }

  // Decrypt a message with WebCrypto AES-GCM (with backward compatibility)
  async decryptMessage(encryptedData, password) {
    try {
      // Input validation
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Invalid encrypted data');
      }
      if (!password || typeof password !== 'string') {
        throw new Error('Invalid password');
      }

      const combined = JSON.parse(atob(encryptedData));

      // Handle different versions for backward compatibility
      if (combined.v === this.VERSION) {
        // Version 3: WebCrypto AES-GCM
        return await this.decryptVersion3(combined, password);
      } else if (combined.version === 2) {
        // Version 2: AES-CBC + HMAC (legacy)
        return this.decryptVersion2(combined, password);
      } else {
        throw new Error('Unsupported encryption version');
      }
    } catch (error) {
      // console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message: ' + error.message);
    }
  }

  // Decrypt version 3 (WebCrypto AES-GCM)
  async decryptVersion3(combined, password) {
    const decoder = new TextDecoder();

    // Decode components from base64
    const salt = new Uint8Array(atob(combined.salt).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(combined.iv).split('').map(c => c.charCodeAt(0)));
    const ciphertext = new Uint8Array(atob(combined.ct).split('').map(c => c.charCodeAt(0)));
    const tag = new Uint8Array(atob(combined.tag).split('').map(c => c.charCodeAt(0)));

    // Derive the same key
    const { key } = await this.deriveKey(password, salt);

    // Reconstruct the encrypted data (ciphertext + tag)
    const encrypted = new Uint8Array(ciphertext.length + tag.length);
    encrypted.set(ciphertext);
    encrypted.set(tag, ciphertext.length);

    // Decrypt with AES-GCM
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encrypted
    );

    return decoder.decode(decrypted);
  }

  // Decrypt version 2 (legacy AES-CBC + HMAC) for backward compatibility
  decryptVersion2(combined, password) {
    // Fallback to legacy CryptoJS implementation for old messages
    const { key } = this.deriveKeyLegacy(password, combined.salt);

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
  }

  // Legacy key derivation for backward compatibility
  deriveKeyLegacy(password, salt) {
    const cacheKey = `legacy-${password}-${salt}`;
    if (this.derivedKeys.has(cacheKey)) {
      return this.derivedKeys.get(cacheKey);
    }

    // Use original 100k iterations for legacy compatibility
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256/32,
      iterations: 100000,
      hasher: CryptoJS.algo.SHA256
    });

    const result = {
      key: key.toString()
    };

    this.derivedKeys.set(cacheKey, result);
    return result;
  }

  // Generate HMAC for invite links with secure secret using WebCrypto
  async generateHMAC(data, secret = null) {
    const actualSecret = secret || import.meta.env.VITE_INVITE_SECRET;

    // Validate secret
    if (!actualSecret || actualSecret === 'default-invite-secret') {
      throw new Error('SECURITY ERROR: Invalid HMAC secret');
    }

    const encoder = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(actualSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const hashArray = new Uint8Array(signature);

    // Convert to hex string
    return Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Verify HMAC with timing-safe comparison using WebCrypto
  async verifyHMAC(data, hmac, secret = null) {
    const actualSecret = secret || import.meta.env.VITE_INVITE_SECRET;

    // Validate secret
    if (!actualSecret || actualSecret === 'default-invite-secret') {
      throw new Error('SECURITY ERROR: Invalid HMAC secret');
    }

    const calculatedHmac = await this.generateHMAC(data, actualSecret);

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
    if (global.gc) {
      global.gc();
    }
  }

  // Generate secure encryption key using WebCrypto
  async generateSecureKey() {
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
      throw new Error('Failed to generate secure key: ' + error.message);
    }
  }
}

export default new EncryptionService();