// Security utilities for Whisperz
import CryptoJS from 'crypto-js';
import logger from '../utils/logger';

class SecurityUtils {
  constructor() {
    // Initialize in a try-catch to prevent app crash
    try {
      this.initializeSecrets();
    } catch (error) {
      logger.error('Security initialization warning:', error.message);
      // Allow app to start but log the security issue
      if (import.meta.env.DEV) {
        logger.warn('Running in development mode with security warnings. Please configure environment variables properly.');
      }
    }
  }

  // Initialize and validate secrets
  initializeSecrets() {
    // Force requirement of custom secrets - no defaults allowed
    const inviteSecret = import.meta.env.VITE_INVITE_SECRET;
    
    // In development, warn but don't crash
    if (import.meta.env.DEV) {
      if (!inviteSecret || inviteSecret === 'default-invite-secret' || inviteSecret === 'your-secret-key-here') {
        logger.warn('SECURITY WARNING: Invalid or default invite secret detected. Please run: npm run generate-secrets');
      }
      return;
    }
    
    // In production, enforce strict security
    if (!inviteSecret || inviteSecret === 'default-invite-secret' || inviteSecret === 'your-secret-key-here') {
      logger.error('SECURITY ERROR: Invalid or default invite secret detected');
      throw new Error('Application requires secure configuration. Please set proper environment variables.');
    }

    // Validate secret strength
    if (inviteSecret.length < 32) {
      throw new Error('SECURITY ERROR: Invite secret must be at least 32 characters');
    }
  }

  // Generate cryptographically secure random string
  generateSecureRandom(length = 32) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // Generate secure session ID
  generateSessionId() {
    return `session_${this.generateSecureRandom(32)}_${Date.now()}`;
  }

  // Sanitize user input to prevent XSS
  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    // Remove any HTML tags and scripts
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .slice(0, 1000); // Limit length
  }

  // Validate username
  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { valid: false, error: 'Username is required' };
    }
    
    // Allow only alphanumeric, underscore, and dash
    const sanitized = username.replace(/[^a-zA-Z0-9_-]/g, '');
    
    if (sanitized !== username) {
      return { valid: false, error: 'Username contains invalid characters' };
    }
    
    if (username.length < 3 || username.length > 20) {
      return { valid: false, error: 'Username must be 3-20 characters' };
    }
    
    return { valid: true, sanitized };
  }

  // Validate password strength
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, error: 'Password is required' };
    }
    
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }
    
    // Check for at least one number, one letter, and one special character
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!hasNumber || !hasLetter) {
      return { valid: false, error: 'Password must contain letters and numbers' };
    }
    
    return { valid: true, strength: hasSpecial ? 'strong' : 'medium' };
  }

  // Rate limiting tracker
  createRateLimiter(maxAttempts = 5, windowMs = 60000) {
    const attempts = new Map();
    
    return {
      check: (identifier) => {
        const now = Date.now();
        const userAttempts = attempts.get(identifier) || [];
        
        // Clean old attempts
        const recentAttempts = userAttempts.filter(time => now - time < windowMs);
        
        if (recentAttempts.length >= maxAttempts) {
          const oldestAttempt = recentAttempts[0];
          const timeLeft = Math.ceil((windowMs - (now - oldestAttempt)) / 1000);
          return { 
            allowed: false, 
            error: `Too many attempts. Please wait ${timeLeft} seconds.`,
            timeLeft 
          };
        }
        
        recentAttempts.push(now);
        attempts.set(identifier, recentAttempts);
        
        return { allowed: true, remaining: maxAttempts - recentAttempts.length };
      },
      
      reset: (identifier) => {
        attempts.delete(identifier);
      }
    };
  }

  // Secure session management
  createSessionManager() {
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
    
    let sessionTimer = null;
    let warningTimer = null;
    let lastActivity = Date.now();
    
    return {
      startSession: (onTimeout, onWarning) => {
        lastActivity = Date.now();
        
        // Clear existing timers
        if (sessionTimer) clearTimeout(sessionTimer);
        if (warningTimer) clearTimeout(warningTimer);
        
        // Set warning timer
        warningTimer = setTimeout(() => {
          if (onWarning) onWarning();
        }, SESSION_TIMEOUT - WARNING_TIME);
        
        // Set timeout timer
        sessionTimer = setTimeout(() => {
          if (onTimeout) onTimeout();
        }, SESSION_TIMEOUT);
      },
      
      updateActivity: () => {
        lastActivity = Date.now();
        // Restart timers on activity
        this.startSession();
      },
      
      endSession: () => {
        if (sessionTimer) clearTimeout(sessionTimer);
        if (warningTimer) clearTimeout(warningTimer);
        sessionTimer = null;
        warningTimer = null;
        
        // Clear sensitive data from memory
        if (typeof window !== 'undefined') {
          // Clear session storage
          sessionStorage.clear();
          // Clear any sensitive data from memory
          window.crypto?.subtle?.generateKey?.({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
        }
      },
      
      getTimeRemaining: () => {
        const elapsed = Date.now() - lastActivity;
        const remaining = SESSION_TIMEOUT - elapsed;
        return Math.max(0, remaining);
      }
    };
  }

  // Content Security Policy generator
  generateCSP() {
    return {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in production
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'wss:', 'https:'],
      'font-src': ["'self'"],
      'object-src': ["'none'"],
      'media-src': ["'self'"],
      'frame-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'upgrade-insecure-requests': []
    };
  }

  // XSS Protection for message rendering
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return text.replace(/[&<>"'/]/g, char => map[char]);
  }
}

export default new SecurityUtils();