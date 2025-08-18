import CryptoJS from 'crypto-js';

/**
 * Secure Backup Service
 * Handles encrypted backup and restore of all application data
 */
class BackupService {
  constructor() {
    this.version = '1.0.0';
    this.encryptionEnabled = true;
  }

  /**
   * Generate a secure backup key from user password
   */
  generateBackupKey(password) {
    // Use PBKDF2 to derive a key from password
    return CryptoJS.PBKDF2(password, 'whisperz-backup-salt', {
      keySize: 256/32,
      iterations: 1000
    }).toString();
  }

  /**
   * Collect all data from localStorage
   */
  collectAllData() {
    const data = {
      version: this.version,
      timestamp: new Date().toISOString(),
      app: 'Whisperz',
      data: {}
    };

    // Collect all localStorage data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        const value = localStorage.getItem(key);
        data.data[key] = value;
      } catch (error) {
        // console.error(`Failed to backup key ${key}:`, error);
      }
    }

    // Add metadata
    data.metadata = {
      totalKeys: Object.keys(data.data).length,
      backupSize: JSON.stringify(data).length,
      userAgent: navigator.userAgent,
      platform: navigator.platform
    };

    return data;
  }

  /**
   * Create an encrypted backup
   */
  createBackup(password = null) {
    try {
      const backupData = this.collectAllData();
      
      // Add sensitive data markers
      const sensitiveKeys = ['gun/', 'user', 'auth', 'key', 'priv', 'pub', 'soul'];
      backupData.metadata.hasSensitiveData = Object.keys(backupData.data).some(key => 
        sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))
      );

      if (password && this.encryptionEnabled) {
        // Encrypt the backup
        const key = this.generateBackupKey(password);
        const encrypted = CryptoJS.AES.encrypt(
          JSON.stringify(backupData),
          key
        ).toString();

        return {
          encrypted: true,
          data: encrypted,
          metadata: {
            version: this.version,
            timestamp: backupData.timestamp,
            encrypted: true,
            totalKeys: backupData.metadata.totalKeys
          }
        };
      }

      // Return unencrypted backup (not recommended for sensitive data)
      return {
        encrypted: false,
        data: backupData,
        warning: 'This backup contains unencrypted sensitive data!'
      };
    } catch (error) {
      // console.error('Backup creation failed:', error);
      throw new Error('Failed to create backup: ' + error.message);
    }
  }

  /**
   * Export backup to file
   */
  exportToFile(password = null, filename = null) {
    try {
      const backup = this.createBackup(password);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultFilename = `whisperz-backup-${timestamp}.json`;
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        filename: filename || defaultFilename,
        encrypted: backup.encrypted,
        size: blob.size
      };
    } catch (error) {
      // console.error('Export failed:', error);
      throw new Error('Failed to export backup: ' + error.message);
    }
  }

  /**
   * Import backup from file
   */
  async importFromFile(file, password = null) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          const result = await this.restoreBackup(backup, password);
          resolve(result);
        } catch (error) {
          reject(new Error('Invalid backup file: ' + error.message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Restore backup to localStorage
   */
  async restoreBackup(backup, password = null) {
    try {
      let backupData;

      // Decrypt if necessary
      if (backup.encrypted) {
        if (!password) {
          throw new Error('Password required for encrypted backup');
        }

        const key = this.generateBackupKey(password);
        try {
          const decrypted = CryptoJS.AES.decrypt(backup.data, key);
          const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
          if (!decryptedText) {
            throw new Error('Invalid password');
          }
          backupData = JSON.parse(decryptedText);
        } catch (error) {
          throw new Error('Failed to decrypt backup. Invalid password or corrupted data.');
        }
      } else {
        backupData = backup.data;
      }

      // Validate backup structure
      if (!backupData.data || typeof backupData.data !== 'object') {
        throw new Error('Invalid backup structure');
      }

      // Create a restore point before clearing
      const restorePoint = this.collectAllData();

      // Ask for confirmation before restoring
      const totalKeys = Object.keys(backupData.data).length;
      const confirmMessage = `This will restore ${totalKeys} items from backup dated ${backupData.timestamp}. Continue?`;
      
      if (!window.confirm(confirmMessage)) {
        return { success: false, cancelled: true };
      }

      // Clear existing data (optional - can be made configurable)
      const clearFirst = window.confirm('Clear existing data before restore? (Recommended)');
      if (clearFirst) {
        localStorage.clear();
      }

      // Restore data
      let restoredCount = 0;
      let failedCount = 0;
      const failures = [];

      for (const [key, value] of Object.entries(backupData.data)) {
        try {
          localStorage.setItem(key, value);
          restoredCount++;
        } catch (error) {
          failedCount++;
          failures.push({ key, error: error.message });
          // console.error(`Failed to restore ${key}:`, error);
        }
      }

      // Reload services if needed
      if (restoredCount > 0) {
        // Trigger a page reload to reinitialize services with new data
        const shouldReload = window.confirm('Backup restored successfully. Reload page to apply changes?');
        if (shouldReload) {
          window.location.reload();
        }
      }

      return {
        success: true,
        restoredCount,
        failedCount,
        failures,
        timestamp: backupData.timestamp,
        version: backupData.version
      };
    } catch (error) {
      // console.error('Restore failed:', error);
      throw error;
    }
  }

  /**
   * Clear specific data categories
   */
  clearData(categories = []) {
    const defaultCategories = {
      messages: ['messages/', 'chat/', 'conversation/'],
      users: ['gun/', 'user/', 'auth/', 'sea/'],
      friends: ['friends/', 'contacts/'],
      settings: ['settings/', 'config/', 'preferences/'],
      cache: ['cache/', 'temp/'],
      all: [] // Special case - clears everything
    };

    const keysToDelete = [];

    if (categories.includes('all')) {
      // Clear everything
      localStorage.clear();
      return { cleared: 'all', count: localStorage.length };
    }

    // Collect keys to delete based on categories
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      for (const category of categories) {
        const patterns = defaultCategories[category] || [];
        if (patterns.some(pattern => key.includes(pattern))) {
          keysToDelete.push(key);
          break;
        }
      }
    }

    // Delete collected keys
    keysToDelete.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // console.error(`Failed to delete ${key}:`, error);
      }
    });

    return {
      cleared: categories,
      count: keysToDelete.length,
      keys: keysToDelete
    };
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    const stats = {
      totalKeys: localStorage.length,
      totalSize: 0,
      categories: {},
      largestKeys: []
    };

    const categoryPatterns = {
      messages: ['messages/', 'chat/', 'conversation/'],
      users: ['gun/', 'user/', 'auth/', 'sea/'],
      friends: ['friends/', 'contacts/'],
      settings: ['settings/', 'config/', 'preferences/'],
      other: []
    };

    // Analyze each key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const size = new Blob([value]).size;
      
      stats.totalSize += size;
      
      // Categorize
      let categorized = false;
      for (const [category, patterns] of Object.entries(categoryPatterns)) {
        if (patterns.length === 0) continue;
        if (patterns.some(pattern => key.includes(pattern))) {
          if (!stats.categories[category]) {
            stats.categories[category] = { count: 0, size: 0 };
          }
          stats.categories[category].count++;
          stats.categories[category].size += size;
          categorized = true;
          break;
        }
      }
      
      if (!categorized) {
        if (!stats.categories.other) {
          stats.categories.other = { count: 0, size: 0 };
        }
        stats.categories.other.count++;
        stats.categories.other.size += size;
      }

      // Track largest keys
      stats.largestKeys.push({ key, size });
    }

    // Sort and limit largest keys
    stats.largestKeys.sort((a, b) => b.size - a.size);
    stats.largestKeys = stats.largestKeys.slice(0, 10);

    // Format sizes
    stats.totalSizeFormatted = this.formatBytes(stats.totalSize);
    for (const category of Object.values(stats.categories)) {
      category.sizeFormatted = this.formatBytes(category.size);
    }
    stats.largestKeys.forEach(item => {
      item.sizeFormatted = this.formatBytes(item.size);
    });

    return stats;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

export default new BackupService();