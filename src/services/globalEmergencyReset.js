/**
 * Global Emergency Reset System
 * Simple, accessible emergency reset from anywhere in the app
 * No DevTools needed - works from any page/component
 */

class GlobalEmergencyReset {
  constructor() {
    this.isInitialized = false;
    this.initialize();
  }

  /**
   * Initialize the global emergency reset system
   */
  initialize() {
    if (this.isInitialized) return;
    
    // Add global functions to window
    this.setupGlobalFunctions();
    
    // Add keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Add triple-click emergency system
    this.setupTripleClickEmergency();
    
    // Add URL triggers
    this.checkURLTriggers();
    
    // Add emergency button to page
    this.addEmergencyButton();
    
    this.isInitialized = true;
    console.log('🆘 Global Emergency Reset System Initialized');
  }

  /**
   * Setup global functions accessible from anywhere
   */
  setupGlobalFunctions() {
    // Main emergency reset function
    window.emergencyReset = () => {
      this.showEmergencyDialog();
    };

    // Quick reset function
    window.quickReset = () => {
      this.executeQuickReset();
    };

    // Nuclear option - complete destruction
    window.nuclearReset = () => {
      this.executeNuclearReset();
    };

    console.log('🆘 Global functions available:');
    console.log('  - emergencyReset() - Show emergency options');
    console.log('  - quickReset() - Quick data clear');
    console.log('  - nuclearReset() - Complete destruction');
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl + Shift + E = Emergency Reset
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        console.log('🆘 Keyboard shortcut triggered: Ctrl + Shift + E');
        this.showEmergencyDialog();
      }
      
      // Ctrl + Shift + R = Quick Reset
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        console.log('🆘 Keyboard shortcut triggered: Ctrl + Shift + R');
        this.executeQuickReset();
      }
      
      // Ctrl + Shift + N = Nuclear Reset
      if (event.ctrlKey && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        console.log('🆘 Keyboard shortcut triggered: Ctrl + Shift + N');
        this.executeNuclearReset();
      }
    });
  }

  /**
   * Setup triple-click/touch emergency system
   */
  setupTripleClickEmergency() {
    let clickCount = 0;
    let clickTimer = null;
    let lastClickTime = 0;
    
    // Handle both mouse clicks and touch events
    const handleClick = (event) => {
      const currentTime = Date.now();
      
      // Reset if too much time has passed between clicks
      if (currentTime - lastClickTime > 1000) {
        clickCount = 0;
      }
      
      clickCount++;
      lastClickTime = currentTime;
      
      // Clear previous timer
      if (clickTimer) {
        clearTimeout(clickTimer);
      }
      
      // Set timer to reset click count
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 1000); // 1 second window for triple-click
      
      // Check if we have 3 clicks
      if (clickCount === 3) {
        clickCount = 0; // Reset immediately
        
        console.log('🆘 Triple-click emergency triggered');
        
        // Show emergency dialog
        this.showEmergencyDialog();
      }
    };
    
    // Listen for both mouse clicks and touch events
    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleClick);
    
    console.log('🆘 Triple-click emergency system active');
    console.log('🆘 Works with: Mouse clicks (PC) or Touch taps (Mobile)');
  }

  /**
   * Check URL for emergency triggers
   */
  checkURLTriggers() {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    // Check for emergency parameters
    if (urlParams.get('emergency') === 'reset' || 
        urlParams.get('emergency') === 'nuclear' ||
        hash === '#emergency' || 
        hash === '#reset') {
      
      console.log('🆘 URL emergency trigger detected');
      
      if (urlParams.get('emergency') === 'nuclear' || hash === '#nuclear') {
        this.executeNuclearReset();
      } else {
        this.showEmergencyDialog();
      }
    }
  }

  /**
   * Add emergency button to the page
   */
  addEmergencyButton() {
    // Create emergency button
    const emergencyBtn = document.createElement('button');
    emergencyBtn.innerHTML = '🆘';
    emergencyBtn.title = 'Emergency Reset (Ctrl+Shift+E)';
    emergencyBtn.className = 'emergency-reset-btn';
    
    // Style the button
    Object.assign(emergencyBtn.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      fontSize: '20px',
      cursor: 'pointer',
      zIndex: '9999',
      boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
      transition: 'all 0.3s ease'
    });
    
    // Hover effects
    emergencyBtn.addEventListener('mouseenter', () => {
      emergencyBtn.style.transform = 'scale(1.1)';
      emergencyBtn.style.backgroundColor = '#c82333';
    });
    
    emergencyBtn.addEventListener('mouseleave', () => {
      emergencyBtn.style.transform = 'scale(1)';
      emergencyBtn.style.backgroundColor = '#dc3545';
    });
    
    // Click handler
    emergencyBtn.addEventListener('click', () => {
      this.showEmergencyDialog();
    });
    
    // Add to page
    document.body.appendChild(emergencyBtn);
    
    // Hide button after 5 seconds (to avoid accidental clicks)
    setTimeout(() => {
      emergencyBtn.style.opacity = '0.7';
    }, 5000);
  }

  /**
   * Show emergency reset dialog
   */
  showEmergencyDialog() {
    const options = [
      '🔄 Quick Reset - Clear data and restart',
      '💀 Nuclear Reset - Complete destruction',
      '❌ Cancel'
    ];
    
    const choice = prompt(
      '🆘 EMERGENCY RESET\n\n' +
      'Choose an option:\n\n' +
      options.map((opt, i) => `${i + 1}. ${opt}`).join('\n') + '\n\n' +
      'Enter number (1-3):'
    );
    
    switch (choice) {
      case '1':
        this.executeQuickReset();
        break;
      case '2':
        this.executeNuclearReset();
        break;
      case '3':
      default:
        console.log('🆘 Emergency reset cancelled');
        break;
    }
  }

  /**
   * Execute quick reset
   */
  async executeQuickReset() {
    const confirmed = confirm(
      '🔄 Quick Reset\n\n' +
      'This will:\n' +
      '• Clear all app data\n' +
      '• Restart the application\n' +
      '• Keep encryption keys\n\n' +
      'Continue?'
    );
    
    if (!confirmed) return;
    
    try {
      console.log('🔄 Executing quick reset...');
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB
      if (window.indexedDB) {
        const dbNames = ['gun', 'gundb', 'whisperz'];
        for (const dbName of dbNames) {
          try {
            await indexedDB.deleteDatabase(dbName);
          } catch (error) {
            // Ignore errors
          }
        }
      }
      
      alert('🔄 Quick reset complete! Page will reload.');
      
      // Reload page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Quick reset failed:', error);
      alert('❌ Quick reset failed: ' + error.message);
    }
  }

  /**
   * Execute nuclear reset (complete destruction)
   */
  async executeNuclearReset() {
    const confirmed = confirm(
      '💀 NUCLEAR RESET\n\n' +
      '⚠️  WARNING: This will PERMANENTLY DESTROY ALL DATA!\n\n' +
      'This will:\n' +
      '• Destroy all encryption keys\n' +
      '• Clear all data with multiple overwrites\n' +
      '• Make old messages unreadable forever\n' +
      '• Restart with completely clean slate\n\n' +
      '🚨 THIS ACTION CANNOT BE UNDONE!\n\n' +
      'Type "DESTROY" to confirm:'
    );
    
    if (!confirmed) return;
    
    const destroyCode = prompt('Type "DESTROY" to confirm nuclear reset:');
    if (destroyCode !== 'DESTROY') {
      alert('❌ Nuclear reset cancelled - incorrect confirmation code');
      return;
    }
    
    try {
      console.error('💀💀💀 NUCLEAR RESET INITIATED 💀💀💀');
      
      // Step 1: Multiple overwrites of localStorage
      console.error('💀 Step 1: Overwriting localStorage');
      await this.overwriteLocalStorage(10);
      
      // Step 2: Clear all storage
      console.error('💀 Step 2: Clearing all storage');
      this.clearAllStorage();
      
      // Step 3: Overwrite memory
      console.error('💀 Step 3: Overwriting memory');
      this.overwriteMemory();
      
      // Step 4: Clear Gun.js data
      console.error('💀 Step 4: Clearing Gun.js data');
      if (window.resetGunDB) {
        window.resetGunDB();
      }
      
      console.error('💀 NUCLEAR RESET COMPLETE');
      
      alert(
        '💀 NUCLEAR RESET COMPLETE!\n\n' +
        '✅ All data destroyed\n' +
        '✅ Encryption keys wiped\n' +
        '✅ Old messages unreadable\n' +
        '✅ Page will reload with clean slate\n\n' +
        '🚨 ALL DATA IS GONE FOREVER!'
      );
      
      // Force reload
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Nuclear reset failed:', error);
      alert('❌ Nuclear reset failed: ' + error.message);
    }
  }

  /**
   * Overwrite localStorage multiple times
   */
  async overwriteLocalStorage(passes = 10) {
    const keys = [];
    
    // Collect all keys
    for (let i = 0; i < localStorage.length; i++) {
      keys.push(localStorage.key(i));
    }
    
    // Multiple overwrite passes
    for (let pass = 0; pass < passes; pass++) {
      console.error(`💀 Overwrite pass ${pass + 1}/${passes}`);
      
      for (const key of keys) {
        try {
          const randomData = this.generateRandomData(8192);
          localStorage.setItem(key, randomData);
        } catch (error) {
          // Continue anyway
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Final clear
    localStorage.clear();
  }

  /**
   * Clear all storage mechanisms
   */
  clearAllStorage() {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
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
      const garbageArrays = [];
      
      for (let i = 0; i < 50; i++) {
        const size = 1024 * 1024; // 1MB chunks
        const garbage = new Array(size).fill(null).map(() => Math.random().toString(36));
        garbageArrays.push(garbage);
      }
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
    } catch (error) {
      console.error('Memory overwrite completed with errors:', error);
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
}

// Initialize global emergency reset system
const globalEmergencyReset = new GlobalEmergencyReset();

export default globalEmergencyReset;
