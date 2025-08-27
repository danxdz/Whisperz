/**
 * Safe console wrapper that prevents crashes
 * Replaces native console methods with safe versions
 */

// Store original console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Override console methods to prevent crashes
export const initSafeConsole = () => {
  // Detect if we should disable console (mobile or production)
  const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);
  const isProduction = window.location.hostname !== 'localhost';
  
  if (isMobile || isProduction) {
    // Completely disable console on mobile and production
    console.log = () => {};
    console.error = () => {};
    console.warn = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.trace = () => {};
    console.group = () => {};
    console.groupEnd = () => {};
    console.table = () => {};
    console.dir = () => {};
    console.dirxml = () => {};
    console.time = () => {};
    console.timeEnd = () => {};
    console.profile = () => {};
    console.profileEnd = () => {};
    console.count = () => {};
    console.assert = () => {};
    console.clear = () => {};
  } else {
    // In development, make console safer by stringifying objects
    console.log = (...args) => {
      try {
        const safeArgs = args.map(arg => {
          if (typeof arg === 'object' && arg !== null) {
            // Don't log complex objects, just show type
            return `[${arg.constructor?.name || 'Object'}]`;
          }
          return arg;
        });
        originalConsole.log(...safeArgs);
      } catch (e) {
        // Silent fail
      }
    };
    
    console.error = (...args) => {
      try {
        const safeArgs = args.map(arg => {
          if (typeof arg === 'object' && arg !== null) {
            return `[${arg.constructor?.name || 'Object'}]`;
          }
          return arg;
        });
        originalConsole.error(...safeArgs);
      } catch (e) {
        // Silent fail
      }
    };
    
    console.warn = console.log;
    console.info = console.log;
    console.debug = console.log;
  }
};

// Initialize safe console immediately
initSafeConsole();

export default initSafeConsole;