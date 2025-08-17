/**
 * Safe localStorage wrapper with error handling
 * Provides fallback mechanisms and size checking
 */

import logger from './logger';

class SafeStorage {
  constructor() {
    this.isAvailable = this.checkAvailability();
    this.memoryStorage = new Map(); // Fallback storage
  }

  /**
   * Check if localStorage is available and working
   */
  checkAvailability() {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      logger.warn('localStorage is not available, using memory storage as fallback');
      return false;
    }
  }

  /**
   * Get item from storage
   */
  getItem(key) {
    try {
      if (this.isAvailable) {
        return localStorage.getItem(key);
      }
      return this.memoryStorage.get(key) || null;
    } catch (error) {
      logger.error('Error getting item from storage:', error);
      return this.memoryStorage.get(key) || null;
    }
  }

  /**
   * Set item in storage with size checking
   */
  setItem(key, value) {
    try {
      // Check size (localStorage typically has 5-10MB limit)
      const size = new Blob([value]).size;
      if (size > 5 * 1024 * 1024) { // 5MB limit
        logger.warn(`Storage item too large (${size} bytes), skipping: ${key}`);
        return false;
      }

      if (this.isAvailable) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (e) {
          if (e.name === 'QuotaExceededError') {
            logger.warn('localStorage quota exceeded, attempting cleanup...');
            this.cleanup();
            // Try once more after cleanup
            try {
              localStorage.setItem(key, value);
              return true;
            } catch (retryError) {
              logger.error('Failed to store after cleanup:', retryError);
              this.memoryStorage.set(key, value);
              return false;
            }
          }
          throw e;
        }
      }
      this.memoryStorage.set(key, value);
      return true;
    } catch (error) {
      logger.error('Error setting item in storage:', error);
      this.memoryStorage.set(key, value);
      return false;
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key) {
    try {
      if (this.isAvailable) {
        localStorage.removeItem(key);
      }
      this.memoryStorage.delete(key);
      return true;
    } catch (error) {
      logger.error('Error removing item from storage:', error);
      this.memoryStorage.delete(key);
      return false;
    }
  }

  /**
   * Clear all storage
   */
  clear() {
    try {
      if (this.isAvailable) {
        localStorage.clear();
      }
      this.memoryStorage.clear();
      return true;
    } catch (error) {
      logger.error('Error clearing storage:', error);
      this.memoryStorage.clear();
      return false;
    }
  }

  /**
   * Get all keys
   */
  keys() {
    try {
      if (this.isAvailable) {
        return Object.keys(localStorage);
      }
      return Array.from(this.memoryStorage.keys());
    } catch (error) {
      logger.error('Error getting storage keys:', error);
      return Array.from(this.memoryStorage.keys());
    }
  }

  /**
   * Get storage size info
   */
  getStorageInfo() {
    const info = {
      available: this.isAvailable,
      itemCount: 0,
      totalSize: 0,
      items: []
    };

    try {
      const keys = this.keys();
      info.itemCount = keys.length;

      for (const key of keys) {
        const value = this.getItem(key);
        const size = value ? new Blob([value]).size : 0;
        info.totalSize += size;
        info.items.push({ key, size });
      }

      // Sort by size
      info.items.sort((a, b) => b.size - a.size);
    } catch (error) {
      logger.error('Error getting storage info:', error);
    }

    return info;
  }

  /**
   * Cleanup old/expired items
   */
  cleanup() {
    try {
      const now = Date.now();
      const keys = this.keys();
      let cleaned = 0;

      for (const key of keys) {
        // Remove old message read markers (older than 30 days)
        if (key.startsWith('lastRead_')) {
          const value = this.getItem(key);
          if (value && (now - parseInt(value)) > 30 * 24 * 60 * 60 * 1000) {
            this.removeItem(key);
            cleaned++;
          }
        }

        // Remove old temporary items
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          this.removeItem(key);
          cleaned++;
        }
      }

      logger.info(`Storage cleanup: removed ${cleaned} items`);
      return cleaned;
    } catch (error) {
      logger.error('Error during storage cleanup:', error);
      return 0;
    }
  }

  /**
   * JSON helpers
   */
  getJSON(key, defaultValue = null) {
    try {
      const value = this.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      logger.error('Error parsing JSON from storage:', error);
      return defaultValue;
    }
  }

  setJSON(key, value) {
    try {
      return this.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error('Error stringifying JSON for storage:', error);
      return false;
    }
  }
}

// Create singleton instance
const safeStorage = new SafeStorage();

// Export both the instance and the class
export default safeStorage;
export { SafeStorage };