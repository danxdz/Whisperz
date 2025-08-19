/**
 * Debug Logger Utility
 * Controls console logging throughout the app
 * Can be enabled/disabled via DevTools or localStorage
 */

class DebugLogger {
  constructor() {
    // Check localStorage for debug settings
    this.enabled = localStorage.getItem('debug_enabled') === 'true';
    this.levels = {
      error: true, // Always show errors
      warn: localStorage.getItem('debug_warn') !== 'false',
      info: localStorage.getItem('debug_info') === 'true',
      debug: localStorage.getItem('debug_debug') === 'true',
      p2p: localStorage.getItem('debug_p2p') === 'true',
      gun: localStorage.getItem('debug_gun') === 'true',
      webrtc: localStorage.getItem('debug_webrtc') === 'true'
    };

    // Expose to window for DevTools access
    if (typeof window !== 'undefined') {
      window.debugLogger = this;
      window.enableDebug = () => this.enable();
      window.disableDebug = () => this.disable();
      window.debugSettings = () => this.getSettings();
    }
  }

  enable(category = null) {
    if (!category) {
      this.enabled = true;
      localStorage.setItem('debug_enabled', 'true');
      console.log('🔧 Debug logging enabled');
    } else if (this.levels.hasOwnProperty(category)) {
      this.levels[category] = true;
      localStorage.setItem(`debug_${category}`, 'true');
      console.log(`🔧 Debug logging enabled for: ${category}`);
    }
    return this.getSettings();
  }

  disable(category = null) {
    if (!category) {
      this.enabled = false;
      localStorage.setItem('debug_enabled', 'false');
      console.log('🔧 Debug logging disabled');
    } else if (this.levels.hasOwnProperty(category)) {
      this.levels[category] = false;
      localStorage.setItem(`debug_${category}`, 'false');
      console.log(`🔧 Debug logging disabled for: ${category}`);
    }
    return this.getSettings();
  }

  getSettings() {
    return {
      enabled: this.enabled,
      levels: this.levels,
      help: `
        Available commands:
        - enableDebug() - Enable all debug logging
        - disableDebug() - Disable all debug logging
        - enableDebug('category') - Enable specific category
        - disableDebug('category') - Disable specific category
        
        Categories: ${Object.keys(this.levels).join(', ')}
      `
    };
  }

  log(message, ...args) {
    if (this.enabled && this.levels.info) {
      console.log(message, ...args);
    }
  }

  error(message, ...args) {
    // Always show errors
    console.error(message, ...args);
  }

  warn(message, ...args) {
    if (this.levels.warn) {
      console.warn(message, ...args);
    }
  }

  info(message, ...args) {
    if (this.enabled && this.levels.info) {
      console.info(message, ...args);
    }
  }

  debug(message, ...args) {
    if (this.enabled && this.levels.debug) {
      console.log('[DEBUG]', message, ...args);
    }
  }

  p2p(message, ...args) {
    if (this.enabled && this.levels.p2p) {
      console.log('[P2P]', message, ...args);
    }
  }

  gun(message, ...args) {
    if (this.enabled && this.levels.gun) {
      console.log('[GUN]', message, ...args);
    }
  }

  webrtc(message, ...args) {
    if (this.enabled && this.levels.webrtc) {
      console.log('[WebRTC]', message, ...args);
    }
  }

  group(label) {
    if (this.enabled) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.enabled) {
      console.groupEnd();
    }
  }

  table(data) {
    if (this.enabled && this.levels.debug) {
      console.table(data);
    }
  }

  time(label) {
    if (this.enabled && this.levels.debug) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (this.enabled && this.levels.debug) {
      console.timeEnd(label);
    }
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

// Show help message on load if in development
if (import.meta.env.DEV) {
  console.log('%c🔧 Debug Logger Available', 'color: #43e97b; font-size: 14px; font-weight: bold');
  console.log('Type debugSettings() to see available commands');
}

export default debugLogger;