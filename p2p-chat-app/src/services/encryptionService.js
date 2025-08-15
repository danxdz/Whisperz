import CryptoJS from 'crypto-js';

// AES-256 encryption service for messages
class EncryptionService {
  constructor() {
    this.derivedKeys = new Map(); // Cache for derived keys
  }

  // Derive a key from password using PBKDF2
  deriveKey(password, salt = null) {
    const cacheKey = `${password}-${salt}`;
    if (this.derivedKeys.has(cacheKey)) {
      return this.derivedKeys.get(cacheKey);
    }

    const actualSalt = salt || CryptoJS.lib.WordArray.random(128/8).toString();
    const key = CryptoJS.PBKDF2(password, actualSalt, {
      keySize: 256/32,
      iterations: 1000
    });

    const result = {
      key: key.toString(),
      salt: actualSalt
    };

    this.derivedKeys.set(cacheKey, result);
    return result;
  }

  // Encrypt a message with AES-256
  encryptMessage(message, password) {
    try {
      const { key, salt } = this.deriveKey(password);
      const iv = CryptoJS.lib.WordArray.random(128/8);
      
      const encrypted = CryptoJS.AES.encrypt(message, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Combine salt, iv, and encrypted data
      const combined = {
        salt: salt,
        iv: iv.toString(),
        data: encrypted.toString()
      };

      return btoa(JSON.stringify(combined));
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  // Decrypt a message
  decryptMessage(encryptedData, password) {
    try {
      const combined = JSON.parse(atob(encryptedData));
      const { key } = this.deriveKey(password, combined.salt);
      
      const decrypted = CryptoJS.AES.decrypt(combined.data, key, {
        iv: CryptoJS.enc.Hex.parse(combined.iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  // Generate HMAC for invite links
  generateHMAC(data, secret) {
    return CryptoJS.HmacSHA256(data, secret).toString();
  }

  // Verify HMAC
  verifyHMAC(data, hmac, secret) {
    const calculatedHmac = this.generateHMAC(data, secret);
    return calculatedHmac === hmac;
  }

  // Generate secure random string
  generateRandomString(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Base64URL encoding for invite links
  base64UrlEncode(str) {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  // Base64URL decoding
  base64UrlDecode(str) {
    str = (str + '===').slice(0, str.length + (str.length % 4));
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  }
}

export default new EncryptionService();