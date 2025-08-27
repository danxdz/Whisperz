/**
 * Console Capture Utility
 * Safe console capture that doesn't crash
 */

class ConsoleCapture {
  constructor() {
    this.history = [];
    this.maxHistory = 50; // Limit history to prevent memory issues
    this.capturing = false;
    this.listeners = new Set();
    
    // Don't capture on mobile or production
    this.isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
    this.isProduction = window.location.hostname !== 'localhost';
    
    if (this.isMobile || this.isProduction) {
      // Don't capture anything on mobile/production
      return;
    }
  }
  
  start() {
    // Don't capture on mobile/production
    if (this.isMobile || this.isProduction || this.capturing) {
      return;
    }
    
    this.capturing = true;
    // Don't actually override console methods anymore
    // Just track what debugLogger logs
  }
  
  stop() {
    this.capturing = false;
  }
  
  clear() {
    this.history = [];
    this.notifyListeners();
  }
  
  addLog(type, message, ...args) {
    if (!this.capturing || this.isMobile || this.isProduction) {
      return;
    }
    
    try {
      const entry = {
        type,
        message: this.formatMessage(message, args),
        timestamp: new Date().toISOString()
      };
      
      this.history.push(entry);
      
      // Keep history limited
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
      
      this.notifyListeners();
    } catch (e) {
      // Silent fail
    }
  }
  
  formatMessage(message, args) {
    try {
      let formatted = String(message);
      
      if (args && args.length > 0) {
        const safeArgs = args.map(arg => {
          if (typeof arg === 'object' && arg !== null) {
            return '[Object]';
          }
          return String(arg);
        });
        formatted += ' ' + safeArgs.join(' ');
      }
      
      return formatted;
    } catch (e) {
      return String(message);
    }
  }
  
  getHistory() {
    return [...this.history];
  }
  
  onUpdate(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  subscribe(callback) {
    // Alias for onUpdate for consistency
    return this.onUpdate(callback);
  }

  getLogs() {
    // Alias for getHistory for consistency
    return this.getHistory();
  }

  getStats() {
    return {
      capturing: this.capturing,
      historyLength: this.history.length,
      maxHistory: this.maxHistory,
      listenersCount: this.listeners.size,
      isMobile: this.isMobile,
      isProduction: this.isProduction,
      enabled: !this.isMobile && !this.isProduction
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.history);
      } catch (e) {
        // Silent fail
      }
    });
  }
}

// Create singleton
const consoleCapture = new ConsoleCapture();

export default consoleCapture;