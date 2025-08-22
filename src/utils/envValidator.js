/**
 * Environment Variable Validator
 * Validates and provides typed access to environment variables
 */

const ENV_SCHEMA = {
  // Gun.js configuration
  VITE_GUN_PEERS: {
    required: false,
    type: 'string',
    default: 'https://gun-manhattan.herokuapp.com/gun,https://gun-us.herokuapp.com/gun',
    description: 'Comma-separated list of Gun.js relay servers',
  },

  // PeerJS configuration
  VITE_PEERJS_HOST: {
    required: false,
    type: 'string',
    default: null,
    description: 'PeerJS server host:port',
    validate: (value) => {
      if (!value) return true;
      const pattern = /^[a-zA-Z0-9.-]+:[0-9]+$/;
      return pattern.test(value) || 'Invalid host:port format';
    },
  },

  // Security
  VITE_INVITE_SECRET: {
    required: false,
    type: 'string',
    default: 'default-invite-secret',
    description: 'HMAC secret for invite link signatures',
    validate: (value) => {
      if (value === 'default-invite-secret' && import.meta.env.PROD) {
        // console.warn('⚠️ Using default invite secret in production is not recommended');
      }
      return value.length >= 16 || 'Invite secret should be at least 16 characters';
    },
  },
};

class EnvValidator {
  constructor() {
    this.env = {};
    this.errors = [];
    this.warnings = [];
    this.validated = false;
  }

  /**
   * Validate all environment variables against schema
   * @returns {Object} Validated environment variables
   */
  validate() {
    this.errors = [];
    this.warnings = [];
    this.env = {};

    for (const [key, schema] of Object.entries(ENV_SCHEMA)) {
      const value = import.meta.env[key];

      // Check if required variable is missing
      if (schema.required && !value) {
        this.errors.push(`Missing required environment variable: ${key}`);
        continue;
      }

      // Use default if not provided
      const finalValue = value !== undefined ? value : schema.default;

      // Type checking
      if (finalValue !== null && finalValue !== undefined) {
        const valueType = typeof finalValue;
        if (valueType !== schema.type) {
          this.errors.push(
            `Environment variable ${key} has wrong type. Expected ${schema.type}, got ${valueType}`
          );
          continue;
        }
      }

      // Custom validation
      if (schema.validate && finalValue) {
        const validationResult = schema.validate(finalValue);
        if (validationResult !== true) {
          this.errors.push(`Environment variable ${key}: ${validationResult}`);
          continue;
        }
      }

      this.env[key] = finalValue;
    }

    // Check for unexpected environment variables
    for (const key of Object.keys(import.meta.env)) {
      if (key.startsWith('VITE_') && !ENV_SCHEMA[key] && key !== 'VITE_USER_NODE_ENV') {
        this.warnings.push(`Unknown environment variable: ${key}`);
      }
    }

    this.validated = true;

    // Log validation results in development
    if (import.meta.env.DEV) {
      if (this.errors.length > 0) {
        // console.error('❌ Environment validation errors:', this.errors);
      }
      if (this.warnings.length > 0) {
        // console.warn('⚠️ Environment validation warnings:', this.warnings);
      }
      if (this.errors.length === 0 && this.warnings.length === 0) {
        // console.log('✅ Environment variables validated successfully');
      }
    }

    // Throw error if there are validation errors in production
    if (this.errors.length > 0 && import.meta.env.PROD) {
      throw new Error(`Environment validation failed: ${this.errors.join(', ')}`);
    }

    return this.env;
  }

  /**
   * Get a validated environment variable
   * @param {string} key - Environment variable key
   * @returns {*} Environment variable value
   */
  get(key) {
    if (!this.validated) {
      this.validate();
    }
    return this.env[key];
  }

  /**
   * Get all validated environment variables
   * @returns {Object} All environment variables
   */
  getAll() {
    if (!this.validated) {
      this.validate();
    }
    return { ...this.env };
  }

  /**
   * Check if environment is production
   * @returns {boolean}
   */
  isProduction() {
    return import.meta.env.PROD;
  }

  /**
   * Check if environment is development
   * @returns {boolean}
   */
  isDevelopment() {
    return import.meta.env.DEV;
  }

  /**
   * Get environment mode
   * @returns {string}
   */
  getMode() {
    return import.meta.env.MODE;
  }
}

// Create singleton instance
const envValidator = new EnvValidator();

// Auto-validate on import
if (typeof window !== 'undefined') {
  envValidator.validate();
}

export default envValidator;
export { ENV_SCHEMA };