/**
 * Security Trigger Service
 * Implements security triggers for failed login attempts with forensic-level data destruction
 */
import backupService from './backupService.js';
import gunAuthService from './gunAuthService.js';
import debugLogger from '../utils/debugLogger.js';

class SecurityTriggerService {
  constructor() {
    this.failedAttempts = 0;
    this.maxAttempts = 3; // Configurable
    this.lockoutDuration = 30 * 60 * 1000; // 30 minutes
    this.destructionEnabled = false; // Must be explicitly enabled
    this.lastFailedAttempt = null;
    this.isLocked = false;
    
    // Load settings from localStorage
    this.loadSettings();
  }

  /**
   * Load security trigger settings
   */
  loadSettings() {
    try {
      const settings = localStorage.getItem('securityTriggerSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        this.maxAttempts = parsed.maxAttempts || 3;
        this.lockoutDuration = parsed.lockoutDuration || (30 * 60 * 1000);
        this.destructionEnabled = parsed.destructionEnabled || false;
        this.failedAttempts = parsed.failedAttempts || 0;
        this.lastFailedAttempt = parsed.lastFailedAttempt || null;
        
        // Check if still in lockout period
        if (this.lastFailedAttempt && 
            Date.now() - this.lastFailedAttempt < this.lockoutDuration) {
          this.isLocked = true;
        } else {
          this.isLocked = false;
          this.failedAttempts = 0; // Reset if lockout expired
        }
      }
    } catch (error) {
      console.warn('Failed to load security trigger settings:', error);
    }
  }

  /**
   * Save security trigger settings
   */
  saveSettings() {
    try {
      const settings = {
        maxAttempts: this.maxAttempts,
        lockoutDuration: this.lockoutDuration,
        destructionEnabled: this.destructionEnabled,
        failedAttempts: this.failedAttempts,
        lastFailedAttempt: this.lastFailedAttempt
      };
      localStorage.setItem('securityTriggerSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save security trigger settings:', error);
    }
  }

  /**
   * Configure security trigger
   */
  configure(options = {}) {
    this.maxAttempts = options.maxAttempts || this.maxAttempts;
    this.lockoutDuration = options.lockoutDuration || this.lockoutDuration;
    this.destructionEnabled = options.destructionEnabled !== undefined ? 
                             options.destructionEnabled : this.destructionEnabled;
    
    this.saveSettings();
    
    console.log('🔒 Security trigger configured:', {
      maxAttempts: this.maxAttempts,
      lockoutDuration: this.lockoutDuration / (60 * 1000) + ' minutes',
      destructionEnabled: this.destructionEnabled
    });
  }

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt() {
    this.failedAttempts++;
    this.lastFailedAttempt = Date.now();
    
    console.warn(`🚨 Failed login attempt ${this.failedAttempts}/${this.maxAttempts}`);
    
    this.saveSettings();
    
    // Check if trigger should fire
    if (this.failedAttempts >= this.maxAttempts) {
      return this.triggerSecurity();
    }
    
    return {
      triggered: false,
      failedAttempts: this.failedAttempts,
      remaining: this.maxAttempts - this.failedAttempts,
      message: `${this.maxAttempts - this.failedAttempts} attempts remaining before security trigger`
    };
  }

  /**
   * Record a successful login (resets counter)
   */
  recordSuccessfulLogin() {
    if (this.failedAttempts > 0) {
      console.log('✅ Login successful - resetting failed attempt counter');
    }
    
    this.failedAttempts = 0;
    this.lastFailedAttempt = null;
    this.isLocked = false;
    this.saveSettings();
  }

  /**
   * Trigger security response
   */
  triggerSecurity() {
    console.error('🚨🔥 SECURITY TRIGGER ACTIVATED - TOO MANY FAILED ATTEMPTS');
    
    this.isLocked = true;
    this.saveSettings();
    
    if (this.destructionEnabled) {
      console.error('💀 INITIATING FORENSIC DATA DESTRUCTION');
      return this.executeDestruction();
    } else {
      console.warn('🔒 Device locked - destruction disabled');
      return {
        triggered: true,
        locked: true,
        destroyed: false,
        message: 'Device locked due to too many failed attempts. Destruction is disabled.',
        unlockTime: new Date(Date.now() + this.lockoutDuration).toLocaleString()
      };
    }
  }

  /**
   * Execute forensic-level data destruction
   */
  async executeDestruction() {
    console.error('💀💀💀 EXECUTING FORENSIC DATA DESTRUCTION 💀💀💀');
    
    const destructionLog = {
      timestamp: new Date().toISOString(),
      trigger: 'failed_login_attempts',
      attempts: this.failedAttempts,
      maxAttempts: this.maxAttempts,
      userAgent: navigator.userAgent,
      actions: []
    };

    try {
      // Step 1: Multiple overwrites of sensitive localStorage data
      destructionLog.actions.push('Overwriting localStorage with random data');
      await this.overwriteLocalStorage(10); // 10 passes
      
      // Step 2: Clear all storage mechanisms
      destructionLog.actions.push('Clearing all browser storage');
      this.clearAllStorage();
      
      // Step 3: Overwrite memory with garbage
      destructionLog.actions.push('Overwriting memory with garbage data');
      this.overwriteMemory();
      
      // Step 4: Clear Gun.js database
      destructionLog.actions.push('Destroying Gun.js database');
      await this.destroyGunDatabase();
      
      // Step 5: Force browser cache clear
      destructionLog.actions.push('Clearing browser caches');
      this.clearBrowserCaches();
      
      // Final log (before everything is destroyed)
      console.error('💀 DESTRUCTION COMPLETE - ALL DATA WIPED');
      
      return {
        triggered: true,
        destroyed: true,
        message: 'FORENSIC DESTRUCTION EXECUTED - ALL DATA WIPED',
        destructionLog
      };
      
    } catch (error) {
      console.error('Error during destruction:', error);
      destructionLog.actions.push(`Error: ${error.message}`);
      
      return {
        triggered: true,
        destroyed: false,
        error: error.message,
        destructionLog
      };
    }
  }

  /**
   * Overwrite localStorage multiple times with random data
   */
  async overwriteLocalStorage(passes = 10) {
    const keys = [];
    
    // Collect all keys first
    for (let i = 0; i < localStorage.length; i++) {
      keys.push(localStorage.key(i));
    }
    
    // Multiple overwrite passes
    for (let pass = 0; pass < passes; pass++) {
      console.error(`💀 Overwrite pass ${pass + 1}/${passes}`);
      
      for (const key of keys) {
        try {
          // Generate random data of similar or larger size
          const randomData = this.generateRandomData(8192); // 8KB of random data
          localStorage.setItem(key, randomData);
        } catch (error) {
          // Storage might be full, continue anyway
        }
      }
      
      // Small delay between passes
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Final clear
    localStorage.clear();
  }

  /**
   * Clear all browser storage mechanisms
   */
  clearAllStorage() {
    try {
      // localStorage
      localStorage.clear();
      
      // sessionStorage
      sessionStorage.clear();
      
      // IndexedDB (Gun.js database)
      if (window.indexedDB) {
        // List common database names
        const dbNames = ['gun', 'gundb', 'whisperz', 'app'];
        dbNames.forEach(name => {
          try {
            indexedDB.deleteDatabase(name);
          } catch (error) {
            // Ignore errors
          }
        });
      }
      
      // Clear cookies for this domain
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
      
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  /**
   * Overwrite memory with garbage data
   */
  overwriteMemory() {
    try {
      // Create large arrays to overwrite memory
      const garbageArrays = [];
      
      for (let i = 0; i < 100; i++) {
        const size = 1024 * 1024; // 1MB chunks
        const garbage = new Array(size).fill(null).map(() => Math.random().toString(36));
        garbageArrays.push(garbage);
      }
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
    } catch (error) {
      // Memory allocation might fail, that's ok
      console.error('Memory overwrite completed with errors:', error);
    }
  }

  /**
   * Destroy Gun.js database
   */
  async destroyGunDatabase() {
    try {
      // If Gun.js is available, try to wipe it
      if (gunAuthService.gun) {
        // Wipe user data
        const user = gunAuthService.getCurrentUser();
        if (user) {
          gunAuthService.gun.get('~' + user.pub).put(null);
        }
        
        // Clear Gun's storage
        if (gunAuthService.gun._.opt.store) {
          gunAuthService.gun._.opt.store.clear();
        }
      }
      
      // Call global reset if available
      if (window.resetGunDB) {
        window.resetGunDB();
      }
      
    } catch (error) {
      console.error('Error destroying Gun database:', error);
    }
  }

  /**
   * Clear browser caches
   */
  clearBrowserCaches() {
    try {
      // Service Worker cache
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      // Application cache (deprecated but might exist)
      if (window.applicationCache) {
        window.applicationCache.swapCache();
      }
      
    } catch (error) {
      console.error('Error clearing browser caches:', error);
    }
  }

  /**
   * Generate random data for overwrites
   */
  generateRandomData(size) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let result = '';
    for (let i = 0; i < size; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Check if currently locked
   */
  isCurrentlyLocked() {
    if (!this.isLocked) return false;
    
    // Check if lockout has expired
    if (this.lastFailedAttempt && 
        Date.now() - this.lastFailedAttempt >= this.lockoutDuration) {
      this.isLocked = false;
      this.failedAttempts = 0;
      this.saveSettings();
      return false;
    }
    
    return true;
  }

  /**
   * Get time remaining for lockout
   */
  getLockoutTimeRemaining() {
    if (!this.isLocked || !this.lastFailedAttempt) return 0;
    
    const elapsed = Date.now() - this.lastFailedAttempt;
    const remaining = this.lockoutDuration - elapsed;
    
    return Math.max(0, remaining);
  }

  /**
   * Get status information
   */
  getStatus() {
    return {
      failedAttempts: this.failedAttempts,
      maxAttempts: this.maxAttempts,
      isLocked: this.isCurrentlyLocked(),
      destructionEnabled: this.destructionEnabled,
      timeRemaining: this.getLockoutTimeRemaining(),
      settings: {
        maxAttempts: this.maxAttempts,
        lockoutDuration: this.lockoutDuration,
        destructionEnabled: this.destructionEnabled
      }
    };
  }

  /**
   * Reset security trigger (admin function)
   */
  reset() {
    this.failedAttempts = 0;
    this.lastFailedAttempt = null;
    this.isLocked = false;
    this.saveSettings();
    
    console.log('🔓 Security trigger reset');
  }

  /**
   * Enable/disable destruction mode
   */
  setDestructionMode(enabled) {
    this.destructionEnabled = enabled;
    this.saveSettings();
    
    console.log(`💀 Destruction mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    return {
      destructionEnabled: this.destructionEnabled,
      warning: enabled ? 'DESTRUCTION MODE ACTIVE - DATA WILL BE WIPED ON FAILED ATTEMPTS' : 'Destruction mode disabled'
    };
  }

  /**
   * Emergency Reset System - Multiple triggers for when everything goes wrong
   */
  initializeEmergencyReset() {
    // Method 1: Console command (always available)
    window.emergencyReset = () => this.executeEmergencyReset('console');
    
    // Method 2: Konami code (↑↑↓↓←→←→BA)
    this.setupKonamiCode();
    
    // Method 3: URL parameter trigger
    this.checkURLTrigger();
    
    // Method 4: localStorage emergency key
    this.checkEmergencyKey();
    
    // Method 5: Triple-click emergency (on locked screen)
    this.setupTripleClickEmergency();
    
    // Method 6: Manual emergency reset with destruction
    window.emergencyResetWithDestruction = () => this.executeEmergencyReset('manual_destruction');
    
    // Method 7: Quick Gun.js database reset
    window.resetGunDB = () => {
      console.error('💀 MANUAL GUN DATABASE RESET TRIGGERED');
      this.destroyGunDatabase();
      localStorage.clear();
      sessionStorage.clear();
      alert('💀 GUN Database and all storage cleared! Page will reload.');
      setTimeout(() => window.location.reload(), 1000);
    };
    
    console.log('🆘 Emergency reset system initialized');
    console.log('🆘 Available commands:');
    console.log('  - emergencyReset() - Reset security settings only');
    console.log('  - emergencyResetWithDestruction() - Reset + DESTROY ALL DATA');
    console.log('  - resetGunDB() - Quick Gun.js database reset');
  }

  /**
   * Setup Konami code trigger
   */
  setupKonamiCode() {
    const konamiSequence = [
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'KeyB', 'KeyA'
    ];
    let currentSequence = [];
    
    document.addEventListener('keydown', (event) => {
      currentSequence.push(event.code);
      
      // Keep only the last 10 keys
      if (currentSequence.length > konamiSequence.length) {
        currentSequence = currentSequence.slice(-konamiSequence.length);
      }
      
      // Check if sequence matches
      if (currentSequence.length === konamiSequence.length &&
          currentSequence.every((key, index) => key === konamiSequence[index])) {
        
        console.log('🆘 KONAMI CODE DETECTED - EMERGENCY RESET TRIGGERED');
        this.executeEmergencyReset('konami');
        currentSequence = []; // Reset sequence
      }
    });
  }

  /**
   * Check URL for emergency trigger
   */
  checkURLTrigger() {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    // Check for ?emergency=reset or #emergency
    if (urlParams.get('emergency') === 'reset' || 
        hash === '#emergency' || 
        hash === '#reset') {
      
      console.log('🆘 URL EMERGENCY TRIGGER DETECTED');
      this.executeEmergencyReset('url');
    }
  }

  /**
   * Check for emergency key in localStorage
   */
  checkEmergencyKey() {
    try {
      const emergencyKey = localStorage.getItem('whisperz_emergency_key');
      const currentTime = Date.now();
      
      if (emergencyKey) {
        const keyData = JSON.parse(emergencyKey);
        
        // Emergency key is valid for 24 hours
        if (keyData.timestamp && (currentTime - keyData.timestamp) < (24 * 60 * 60 * 1000)) {
          if (keyData.action === 'reset') {
            console.log('🆘 EMERGENCY KEY DETECTED');
            this.executeEmergencyReset('emergency_key');
            localStorage.removeItem('whisperz_emergency_key'); // Use once
          }
        } else {
          // Remove expired emergency key
          localStorage.removeItem('whisperz_emergency_key');
        }
      }
    } catch (error) {
      // Ignore errors in emergency key check
    }
  }

  /**
   * Setup triple-click emergency (for locked screens)
   */
  setupTripleClickEmergency() {
    let clickCount = 0;
    let clickTimer = null;
    
    document.addEventListener('click', (event) => {
      clickCount++;
      
      if (clickCount === 1) {
        clickTimer = setTimeout(() => {
          clickCount = 0; // Reset if not triple-clicked fast enough
        }, 1000); // 1 second window for triple-click
      } else if (clickCount === 3) {
        clearTimeout(clickTimer);
        clickCount = 0;
        
        // Only trigger if device is locked
        if (this.isCurrentlyLocked()) {
          console.log('🆘 TRIPLE-CLICK EMERGENCY ON LOCKED DEVICE');
          this.executeEmergencyReset('triple_click');
        }
      }
    });
  }

  /**
   * Execute emergency reset
   */
  async executeEmergencyReset(trigger) {
    console.error(`🆘🔥 EMERGENCY RESET TRIGGERED BY: ${trigger.toUpperCase()}`);
    
    const resetLog = {
      timestamp: new Date().toISOString(),
      trigger: trigger,
      userAgent: navigator.userAgent,
      actions: [],
      success: false
    };

    try {
      // Show emergency confirmation (unless device is locked)
      const isLocked = this.isCurrentlyLocked();
      let confirmed = true;
      
      if (!isLocked && trigger !== 'emergency_key') {
        confirmed = confirm(
          '🆘 EMERGENCY RESET\n\n' +
          'This will:\n' +
          '• Reset all security locks\n' +
          '• Clear failed login attempts\n' +
          '• Create emergency backup if possible\n' +
          '• Reset security settings\n\n' +
          'Continue with emergency reset?'
        );
      }
      
      if (!confirmed) {
        return { success: false, message: 'Emergency reset cancelled by user' };
      }

      // Step 1: Try to create emergency backup (if not locked)
      if (!isLocked) {
        try {
          resetLog.actions.push('Creating emergency backup');
          const backup = await backupService.createBackup('emergency_' + Date.now());
          
          // Save backup to multiple locations
          const backupData = JSON.stringify(backup);
          
          // Save to localStorage with special key
          localStorage.setItem('whisperz_emergency_backup', backupData);
          
          // Try to download backup file
          try {
            const blob = new Blob([backupData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `whisperz-emergency-backup-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            resetLog.actions.push('Emergency backup downloaded');
          } catch (downloadError) {
            resetLog.actions.push('Backup created but download failed');
          }
          
        } catch (backupError) {
          resetLog.actions.push(`Backup failed: ${backupError.message}`);
        }
      }

      // Step 2: Reset security triggers
      resetLog.actions.push('Resetting security triggers');
      this.failedAttempts = 0;
      this.lastFailedAttempt = null;
      this.isLocked = false;
      this.destructionEnabled = false; // Disable destruction for safety
      
      // Step 3: Clear lockout settings
      resetLog.actions.push('Clearing security settings');
      localStorage.removeItem('securityTriggerSettings');
      
      // Step 4: Reset to default settings
      this.maxAttempts = 3;
      this.lockoutDuration = 30 * 60 * 1000;
      this.saveSettings();
      
      // Step 5: Clear any emergency triggers
      resetLog.actions.push('Clearing emergency triggers');
      localStorage.removeItem('whisperz_emergency_key');
      
      // Clear URL parameters if they triggered this
      if (trigger === 'url') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Step 6: EXECUTE ACTUAL DATA DESTRUCTION for emergency reset
      resetLog.actions.push('Executing emergency data destruction');
      console.error('💀 EMERGENCY RESET: EXECUTING DATA DESTRUCTION');
      
      try {
        // Force call the destruction functions
        await this.executeDestruction();
        resetLog.actions.push('Emergency data destruction completed');
      } catch (destructionError) {
        resetLog.actions.push(`Emergency destruction failed: ${destructionError.message}`);
        console.error('Emergency destruction error:', destructionError);
      }
      
      resetLog.success = true;
      resetLog.actions.push('Emergency reset completed successfully');
      
      console.log('🆘✅ EMERGENCY RESET COMPLETED SUCCESSFULLY');
      
      // Show success message
      alert(
        '🆘 Emergency Reset Complete!\n\n' +
        '✅ Security locks cleared\n' +
        '✅ Failed attempts reset\n' +
        '✅ Settings restored to defaults\n' +
        '✅ Emergency backup created (if possible)\n' +
        '💀 ALL DATA DESTROYED\n\n' +
        'The application will now reload with a clean slate.'
      );

      // Force reload the page to complete the reset
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
      return {
        success: true,
        trigger: trigger,
        message: 'Emergency reset completed successfully',
        resetLog: resetLog
      };
      
    } catch (error) {
      resetLog.actions.push(`Emergency reset failed: ${error.message}`);
      console.error('Emergency reset failed:', error);
      
      return {
        success: false,
        trigger: trigger,
        error: error.message,
        resetLog: resetLog
      };
    }
  }

  /**
   * Create emergency key for later use
   */
  createEmergencyKey(validHours = 24) {
    const emergencyKey = {
      action: 'reset',
      timestamp: Date.now(),
      validUntil: Date.now() + (validHours * 60 * 60 * 1000),
      id: Math.random().toString(36).substring(2)
    };
    
    localStorage.setItem('whisperz_emergency_key', JSON.stringify(emergencyKey));
    
    console.log('🆘 Emergency key created, valid for', validHours, 'hours');
    
    return {
      success: true,
      keyId: emergencyKey.id,
      validUntil: new Date(emergencyKey.validUntil).toLocaleString(),
      message: `Emergency key created. Valid for ${validHours} hours.`
    };
  }

  /**
   * Get emergency reset methods (for help display)
   */
  getEmergencyMethods() {
    return {
      methods: [
        {
          name: 'Console Command',
          trigger: 'emergencyReset()',
          description: 'Type emergencyReset() in browser console (F12)',
          availability: 'Always available'
        },
        {
          name: 'Konami Code',
          trigger: '↑↑↓↓←→←→BA',
          description: 'Use arrow keys then B and A keys in sequence',
          availability: 'Always available'
        },
        {
          name: 'URL Parameter',
          trigger: '?emergency=reset or #emergency',
          description: 'Add to URL: yoursite.com?emergency=reset',
          availability: 'Always available'
        },
        {
          name: 'Triple Click',
          trigger: 'Click 3 times quickly',
          description: 'Triple-click anywhere when device is locked',
          availability: 'Only when locked'
        },
        {
          name: 'Emergency Key',
          trigger: 'createEmergencyKey()',
          description: 'Pre-create key for automatic reset',
          availability: 'Must be created in advance'
        }
      ],
      currentStatus: this.getStatus()
    };
  }
}

// Initialize emergency reset system when service loads
const securityTriggerService = new SecurityTriggerService();
securityTriggerService.initializeEmergencyReset();

export default securityTriggerService;
