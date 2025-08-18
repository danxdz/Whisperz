/**
 * Logger utility for consistent logging across the application
 * Provides different log levels and can be configured for production/development
 */

class Logger {
  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
    this.logLevel = this.isProduction ? 'error' : 'debug';
    
    // Log levels
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      none: 4
    };
    
    // Set current level
    this.currentLevel = this.levels[this.logLevel];
  }

  setLogLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
      this.logLevel = level;
    }
  }

  debug(...args) {
    if (this.currentLevel <= this.levels.debug) {
      console.log('[DEBUG]', ...args);
    }
  }

  info(...args) {
    if (this.currentLevel <= this.levels.info) {
      console.log('[INFO]', ...args);
    }
  }

  warn(...args) {
    if (this.currentLevel <= this.levels.warn) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args) {
    if (this.currentLevel <= this.levels.error) {
      console.error('[ERROR]', ...args);
    }
  }

  // Group related logs
  group(label) {
    if (this.currentLevel < this.levels.none && console.group) {
      console.group(label);
    }
  }

  groupEnd() {
    if (this.currentLevel < this.levels.none && console.groupEnd) {
      console.groupEnd();
    }
  }

  // Table for structured data
  table(data) {
    if (this.currentLevel <= this.levels.debug && console.table) {
      console.table(data);
    }
  }

  // Performance timing
  time(label) {
    if (this.currentLevel <= this.levels.debug && console.time) {
      console.time(label);
    }
  }

  timeEnd(label) {
    if (this.currentLevel <= this.levels.debug && console.timeEnd) {
      console.timeEnd(label);
    }
  }

  // Clear console (development only)
  clear() {
    if (this.isDevelopment && console.clear) {
      console.clear();
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the instance and the class
export default logger;
export { Logger };