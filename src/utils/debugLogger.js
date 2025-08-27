/**
 * Debug Logger Utility
 * Safe logging that doesn't crash mobile or DevTools
 * Stores logs in memory instead of using console directly
 */

class DebugLogger {
  constructor() {
    // Check if mobile or production
    this.isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    this.isProduction = window.location.hostname !== 'localhost';
    
    // Disable console completely on mobile to prevent crashes
    if (this.isMobile || this.isProduction) {
      this.enabled = false;
    } else {
      this.enabled = localStorage.getItem('debug_enabled') !== 'false';
    }
    
    this.levels = {
      error: true, // Always track errors
      warn: true,
      info: true,
      debug: localStorage.getItem('debug_debug') === 'true',
      gun: localStorage.getItem('debug_gun') === 'true'
    };
    
    // Store logs in memory (limited to prevent memory issues)
    this.logs = [];
    this.maxLogs = 100; // Keep only last 100 logs
    
    // Expose to window for debugging
    if (typeof window !== 'undefined' && !this.isMobile) {
      window.debugLogger = this;
      window.getLogs = () => this.getLogs();
      window.clearLogs = () => this.clearLogs();
    }
  }
  
  // Safe log function that doesn't use console
  safeLog(level, message, ...args) {
    try {
      // Don't do anything on mobile or production
      if (this.isMobile || this.isProduction) {
        return;
      }
      
      // Store in memory
      const logEntry = {
        level,
        message,
        args: args.map(arg => {
          // Convert objects to safe strings
          if (typeof arg === 'object' && arg !== null) {
            try {
              // Don't stringify complex objects
              return `[${arg.constructor?.name || 'Object'}]`;
            } catch (e) {
              return '[Object]';
            }
          }
          return arg;
        }),
        timestamp: new Date().toISOString()
      };
      
      this.logs.push(logEntry);
      
      // Keep only last N logs
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }
      
      // Only use console in development, and only with safe strings
      if (!this.isProduction && !this.isMobile && typeof console !== 'undefined') {
        const safeMessage = `[${level.toUpperCase()}] ${message}`;
        const safeArgs = logEntry.args;
        
        // Use the original console carefully
        try {
          switch(level) {
            case 'error':
              console.error(safeMessage, ...safeArgs);
              break;
            case 'warn':
              console.warn(safeMessage, ...safeArgs);
              break;
            default:
              console.log(safeMessage, ...safeArgs);
          }
        } catch (e) {
          // Silent fail if console fails
        }
      }
    } catch (e) {
      // Silent fail - never crash
    }
  }
  
  enable(category = null) {
    if (!this.isMobile && !this.isProduction) {
      if (!category) {
        this.enabled = true;
        localStorage.setItem('debug_enabled', 'true');
      } else if (this.levels.hasOwnProperty(category)) {
        this.levels[category] = true;
        localStorage.setItem(`debug_${category}`, 'true');
      }
    }
    return this.getSettings();
  }
  
  disable(category = null) {
    if (!category) {
      this.enabled = false;
      localStorage.setItem('debug_enabled', 'false');
    } else if (this.levels.hasOwnProperty(category)) {
      this.levels[category] = false;
      localStorage.setItem(`debug_${category}`, 'false');
    }
    return this.getSettings();
  }
  
  getSettings() {
    return {
      enabled: this.enabled,
      levels: this.levels,
      isMobile: this.isMobile,
      isProduction: this.isProduction,
      logCount: this.logs.length
    };
  }
  
  getLogs() {
    return this.logs;
  }
  
  clearLogs() {
    this.logs = [];
  }
  
  // Public logging methods
  log(message, ...args) {
    if (this.enabled && this.levels.info) {
      this.safeLog('info', message, ...args);
    }
  }
  
  error(message, ...args) {
    if (this.levels.error) {
      this.safeLog('error', message, ...args);
    }
  }
  
  warn(message, ...args) {
    if (this.levels.warn) {
      this.safeLog('warn', message, ...args);
    }
  }
  
  info(message, ...args) {
    if (this.enabled && this.levels.info) {
      this.safeLog('info', message, ...args);
    }
  }
  
  debug(category, message, ...args) {
    if (this.enabled && this.levels.debug) {
      this.safeLog('debug', `[${category}] ${message}`, ...args);
    }
  }
  
  gun(message, ...args) {
    if (this.enabled && this.levels.gun) {
      this.safeLog('gun', message, ...args);
    }
  }
  
  group(label) {
    // No-op on mobile
    if (!this.isMobile && !this.isProduction && this.enabled) {
      try {
        console.group(label);
      } catch (e) {}
    }
  }
  
  groupEnd() {
    // No-op on mobile
    if (!this.isMobile && !this.isProduction && this.enabled) {
      try {
        console.groupEnd();
      } catch (e) {}
    }
  }
  
  table(data) {
    // No-op on mobile
    if (!this.isMobile && !this.isProduction && this.enabled && this.levels.debug) {
      try {
        console.table(data);
      } catch (e) {}
    }
  }
  
  time(label) {
    // No-op on mobile
    if (!this.isMobile && !this.isProduction && this.enabled && this.levels.debug) {
      try {
        console.time(label);
      } catch (e) {}
    }
  }
  
  timeEnd(label) {
    // No-op on mobile
    if (!this.isMobile && !this.isProduction && this.enabled && this.levels.debug) {
      try {
        console.timeEnd(label);
      } catch (e) {}
    }
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

// Don't show anything on mobile or production
if (typeof window !== 'undefined' && !debugLogger.isMobile && !debugLogger.isProduction) {
  // Silent initialization
}

export default debugLogger;