/**
 * Rate limiter for login attempts
 * Prevents brute force attacks by limiting login attempts per user
 */
export const loginRateLimiter = (() => {
  const attempts = new Map();
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 60000; // 1 minute
  
  return {
    /**
     * Check if a login attempt is allowed
     * @param {string} username - The username attempting to login
     * @returns {Object} - { allowed: boolean, error?: string }
     */
    check: (username) => {
      const now = Date.now();
      const userAttempts = attempts.get(username) || [];
      const recentAttempts = userAttempts.filter(time => now - time < WINDOW_MS);
      
      if (recentAttempts.length >= MAX_ATTEMPTS) {
        const timeLeft = Math.ceil((WINDOW_MS - (now - recentAttempts[0])) / 1000);
        return { 
          allowed: false, 
          error: `Too many login attempts. Please wait ${timeLeft} seconds.`
        };
      }
      
      recentAttempts.push(now);
      attempts.set(username, recentAttempts);
      return { allowed: true };
    },
    
    /**
     * Clear attempts for a specific user
     * @param {string} username - The username to clear attempts for
     */
    clear: (username) => {
      attempts.delete(username);
    },
    
    /**
     * Clear all attempts
     */
    clearAll: () => {
      attempts.clear();
    }
  };
})();