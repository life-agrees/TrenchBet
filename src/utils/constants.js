/**
 * Application-wide constants
 * All magic numbers should be defined here for maintainability
 */

// Time durations in milliseconds
export const DURATIONS = {
  DEBOUNCE: 300,                    // Search input debounce
  BATCH_DELAY: 2000,                // Delay between batch requests (increased for rate limiting)

  OPTIMISTIC_UPDATE: 2000,          // Optimistic update revert delay
  NOTIFICATION_AUTO_CLOSE: 5000,    // Notification auto-close time
  REFRESH_INTERVAL: 30000,          // Auto-refresh interval (30 seconds)
  TIMEOUT: 60000,                   // Request timeout
  RETRY_DELAY_BASE: 1000,           // Base retry delay (1 second)
  ANIMATION_DELAY_1: 2000,          // Animation delay 1 (2 seconds)
  ANIMATION_DELAY_2: 4000,          // Animation delay 2 (4 seconds)
};

// Cache configuration
export const CACHE = {
  MARKETS_TTL: 2 * 60 * 1000,       // 2 minutes
  POINTS_TTL: 5 * 60 * 1000,        // 5 minutes
  PREFETCH_TTL: 15 * 1000,          // 15 seconds for prefetch cache
};


// Batch processing
export const BATCH = {
  MARKET_BATCH_SIZE: 2,             // Number of markets to fetch per batch (reduced for rate limiting)
};


// Retry configuration
export const RETRY = {
  MAX_COUNT: 3,                     // Maximum retry attempts
  DELAY_MULTIPLIER: 2,              // Exponential backoff multiplier
};

// Points tier thresholds
export const TIERS = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  DIAMOND: 10000,
};

// Time conversion constants
export const TIME = {
  MS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  SECONDS_PER_HOUR: 3600,
  SECONDS_PER_DAY: 86400,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
};

// Rate limiting
export const RATE_LIMIT = {
  MAX_REQUESTS: 3,                  // Maximum requests per window (reduced for Alchemy)
  WINDOW_MS: 120000,                // Window size in milliseconds (2 minutes)
};


// Notification configuration
export const NOTIFICATION = {
  VIBRATION_PATTERN: [200, 100, 200], // Vibration pattern for mobile
};

// Price formatting
export const PRICE = {
  DECIMALS: 8,                      // Price decimal places
  USDC_DECIMALS: 6,                 // USDC token decimals
};

// Market configuration
export const MARKET = {
  MIN_DURATION_MINUTES: 15,         // Minimum market duration
  MAX_DURATION_MINUTES: 1440,     // Maximum market duration (24 hours)
  FEE_PERCENTAGE: 2,              // Platform fee percentage
};

// API configuration
export const API = {
  CACHE_CONTROL: 'no-cache',
};

// Virtual scrolling configuration
export const VIRTUAL_SCROLL = {
  ITEM_HEIGHT: 400,                 // Height of each market card in pixels
  OVERSCAN: 3,                      // Number of items to render outside viewport
  MIN_ITEMS_FOR_VIRTUALIZATION: 20, // Minimum items before enabling virtualization
};


// Log levels
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Environment
export const ENV = {
  IS_DEV: import.meta.env?.MODE === 'development',
  IS_PROD: import.meta.env?.MODE === 'production',
};

// Points Claim Configuration
export const POINTS_CLAIM = {
  POINTS_PER_TRENCHY: 100,          // 100 points = 1 TRENCHY
  MIN_CLAIM_POINTS: 100,            // Minimum points to claim
  MONTHLY_CAP_TRENCHY: 10000,       // 10,000 TRENCHY per month
  LOCK_PERIOD_DAYS: 15,             // 15-day lock for standard claims
  CONTRACT_ADDRESS: import.meta.env.VITE_CLAIMS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
};

// Contract Addresses
// IMPORTANT: These are BASE SEPOLIA TESTNET addresses
// For mainnet, these would be different
export const CONTRACTS = {
  // USDC on Base Sepolia Testnet (NOT mainnet!)
  // This is the testnet USDC contract for testing
  USDC: import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  // PredictionMarket contract - Updated with Time-Decay Odds feature
  PREDICTION_MARKET: import.meta.env.VITE_PREDICTION_MARKET_ADDRESS || '0x5c07E771b5BC9e574b551A3f032AE3A8A3BeeE9E',

};
