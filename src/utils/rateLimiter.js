/**
 * Simple rate limiter for client-side protection
 * Stores attempts in localStorage with timestamps
 */

class RateLimiter {
  constructor() {
    this.limits = {
      inviteGeneration: {
        max: 3,        // Max 3 invites
        window: 300000, // per 5 minutes
        key: 'RL_INVITES'
      },
      userCreation: {
        max: 2,        // Max 2 users
        window: 600000, // per 10 minutes
        key: 'RL_USERS'
      },
      loginAttempts: {
        max: 5,        // Max 5 login attempts
        window: 300000, // per 5 minutes
        key: 'RL_LOGIN'
      },
      messagesSent: {
        max: 30,       // Max 30 messages
        window: 60000,  // per minute
        key: 'RL_MESSAGES'
      }
    };
  }

  /**
   * Check if action is allowed
   * @param {string} action - The action to check (e.g., 'inviteGeneration')
   * @returns {Object} { allowed: boolean, remaining: number, resetIn: number }
   */
  checkLimit(action) {
    const limit = this.limits[action];
    if (!limit) {
      return { allowed: true, remaining: Infinity, resetIn: 0 };
    }

    const now = Date.now();
    const stored = this.getStoredAttempts(limit.key);

    // Clean old attempts
    const validAttempts = stored.filter(timestamp =>
      now - timestamp < limit.window
    );

    // Check if under limit
    const allowed = validAttempts.length < limit.max;
    const remaining = Math.max(0, limit.max - validAttempts.length);

    // Calculate reset time
    let resetIn = 0;
    if (validAttempts.length > 0) {
      const oldestAttempt = Math.min(...validAttempts);
      resetIn = Math.max(0, limit.window - (now - oldestAttempt));
    }

    return {
      allowed,
      remaining,
      resetIn: Math.ceil(resetIn / 1000), // Convert to seconds
      message: allowed
        ? `${remaining} attempts remaining`
        : `Rate limit exceeded. Try again in ${Math.ceil(resetIn / 1000)} seconds`
    };
  }

  /**
   * Record an attempt
   * @param {string} action - The action performed
   */
  recordAttempt(action) {
    const limit = this.limits[action];
    if (!limit) return;

    const now = Date.now();
    const stored = this.getStoredAttempts(limit.key);

    // Clean old attempts and add new one
    const validAttempts = stored.filter(timestamp =>
      now - timestamp < limit.window
    );
    validAttempts.push(now);

    // Store updated attempts
    try {
      localStorage.setItem(limit.key, JSON.stringify(validAttempts));
    } catch (e) {
      console.error('Failed to store rate limit data:', e);
    }
  }

  /**
   * Get stored attempts from localStorage
   * @param {string} key - The storage key
   * @returns {Array<number>} Array of timestamps
   */
  getStoredAttempts(key) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to read rate limit data:', e);
      return [];
    }
  }

  /**
   * Clear rate limit for an action (admin use)
   * @param {string} action - The action to clear
   */
  clearLimit(action) {
    const limit = this.limits[action];
    if (limit) {
      localStorage.removeItem(limit.key);
    }
  }

  /**
   * Clear all rate limits (admin use)
   */
  clearAllLimits() {
    Object.values(this.limits).forEach(limit => {
      localStorage.removeItem(limit.key);
    });
  }

  /**
   * Get current status for all actions
   * @returns {Object} Status for each action
   */
  getStatus() {
    const status = {};
    Object.keys(this.limits).forEach(action => {
      status[action] = this.checkLimit(action);
    });
    return status;
  }
}

// Export singleton instance
const rateLimiter = new RateLimiter();
export default rateLimiter;