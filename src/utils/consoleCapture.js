/**
 * Console Capture Utility
 * Captures console.log, console.error, console.warn messages for display in DevTools
 */

class ConsoleCapture {
  constructor() {
    this.logs = [];
    this.maxLogs = 500; // Maximum number of logs to keep
    this.listeners = new Set();
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };
    this.isCapturing = false;
  }

  start() {
    if (this.isCapturing) return;
    this.isCapturing = true;

    // Override console methods
    console.log = (...args) => {
      this.capture('log', args);
      this.originalConsole.log.apply(console, args);
    };

    console.error = (...args) => {
      this.capture('error', args);
      this.originalConsole.error.apply(console, args);
    };

    console.warn = (...args) => {
      this.capture('warn', args);
      this.originalConsole.warn.apply(console, args);
    };

    console.info = (...args) => {
      this.capture('info', args);
      this.originalConsole.info.apply(console, args);
    };

    console.debug = (...args) => {
      this.capture('debug', args);
      this.originalConsole.debug.apply(console, args);
    };
  }

  stop() {
    if (!this.isCapturing) return;
    this.isCapturing = false;

    // Restore original console methods
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  capture(type, args) {
    const log = {
      type,
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString(),
      message: this.formatArgs(args),
      raw: args,
      stack: type === 'error' ? new Error().stack : undefined
    };

    this.logs.push(log);

    // Keep only the latest logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Notify listeners
    this.notifyListeners(log);
  }

  formatArgs(args) {
    return args.map(arg => {
      if (arg === undefined) return 'undefined';
      if (arg === null) return 'null';
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return arg.toString();
        }
      }
      return String(arg);
    }).join(' ');
  }

  clear() {
    this.logs = [];
    this.notifyListeners({ type: 'clear' });
  }

  getLogs(filter = null) {
    if (!filter) return this.logs;
    
    if (typeof filter === 'string') {
      return this.logs.filter(log => log.type === filter);
    }
    
    if (Array.isArray(filter)) {
      return this.logs.filter(log => filter.includes(log.type));
    }
    
    return this.logs;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(log) {
    this.listeners.forEach(callback => {
      try {
        callback(log);
      } catch (e) {
        this.originalConsole.error('ConsoleCapture listener error:', e);
      }
    });
  }

  getStats() {
    const stats = {
      total: this.logs.length,
      log: 0,
      error: 0,
      warn: 0,
      info: 0,
      debug: 0
    };

    this.logs.forEach(log => {
      stats[log.type] = (stats[log.type] || 0) + 1;
    });

    return stats;
  }

  export() {
    return JSON.stringify(this.logs, null, 2);
  }

  download() {
    const dataStr = this.export();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `console-logs-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
}

// Create singleton instance
const consoleCapture = new ConsoleCapture();

export default consoleCapture;