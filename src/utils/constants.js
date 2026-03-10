/**
 * Application-wide constants
 * All magic numbers should be defined here for maintainability
 * 
 * ==========================================
 * PROXY PATTERN ARCHITECTURE (IMPORTANT!)
 * ==========================================
 * 
 * This application uses a PROXY PATTERN for the Prediction Market contracts.
 * 
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    Frontend (React/Wagmi)                       │
 * │  - ONLY interacts with PROXY_ADDRESS                            │
 * │  - NEVER reads directly from Core/Types implementations         │
 * └─────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │              PredictionMarketProxy (Storage)                    │
 * │  - Holds ALL market data (markets mapping)                      │
 * │  - Holds ALL user positions                                     │
 * │  - Uses delegatecall to execute logic in implementations        │
 * └─────────────────────────────────────────────────────────────────┘
 *                              │
 *            ┌─────────────────┴─────────────────┐
 *            │                                   │
 *            ▼                                   ▼
 * ┌─────────────────────────┐     ┌─────────────────────────┐
 * │  Core Implementation    │     │   Types Implementation  │
 * │  (logic only)           │     │   (logic only)          │
 * │  - Binary markets       │     │  - Multi/Range/Time     │
 * └─────────────────────────┘     └─────────────────────────┘
 * 
 * KEY PRINCIPLE:
 * - Proxy holds all state (markets, positions, counters)
 * - Implementations are logic-only (executed via delegatecall)
 * - Frontend uses ONLY proxy address for ALL interactions
 * - Reading from implementations directly returns EMPTY data!
 * 
 * USAGE:
 * - Use PROXY_ADDRESS for all reads and writes
 * - Use PREDICTION_MARKET_PROXY_ABI (from proxyAbi.js)
 * - Never use Core/Types addresses directly in frontend
 */


// ==========================================
// MODULAR PREDICTION MARKET CONTRACTS (Phase 2)
// Deployed to Base Sepolia: 2024
// ==========================================

// PROXY PATTERN (NEW - Use this for all interactions!)
// This proxy delegates to Core and Types implementations with shared storage
// Deployed: 2026-02-25 - NEW FIXED PROXY (no storage collision)
// IMPORTANT: New proxy has correct storage layout without Ownable collision
export const PROXY_ADDRESS = "0x0834C6560d6a0f9655C3d8BF2d429d083696B371";

// Implementation contracts (behind proxy - do not use directly)
// UPDATED: New fixed implementations deployed on 2025-01-25
// Fixed storage collision issue - now reads owner from EIP-1967 admin slot
export const PREDICTION_MARKET_CORE_ADDRESS = "0xeD7E731289980D206a62cB3dca145BdA003A4177";
export const PREDICTION_MARKET_TYPES_ADDRESS = "0x91d9d263771E75a74793d22ceC52e29bFeE7d9C4";



// Legacy addresses (old isolated contracts - deprecated)
export const LEGACY_PREDICTION_MARKET_CORE_ADDRESS = "0xb8f08E9CF766389A534dcE49C72E33F92fC4bc30";
export const LEGACY_PREDICTION_MARKET_TYPES_ADDRESS = "0x5BdD5381a283Fb04167019BE35b2102429c8d621";

export const CHAINLINK_RESOLVER_ADDRESS = "0x2Faee1c49d6E4ec7908800e971448B675782ab84";


export const TRENCHY_STAKING_ADDRESS = "0x2513f27B994523B2DB87dE2F3c6C79d6E1557228";
// Note: PredictionMarketPayoutLib is embedded at compile time, no separate address needed



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
  // PredictionMarket contract - DEPRECATED: Use PREDICTION_MARKET_CORE or PREDICTION_MARKET_TYPES
  PREDICTION_MARKET: import.meta.env.VITE_PREDICTION_MARKET_ADDRESS || '0x5c07E771b5BC9e574b551A3f032AE3A8A3BeeE9E',
  // PROXY CONTRACT (NEW - Use this for all interactions!)
  // This proxy delegates to Core and Types implementations with shared storage
  PROXY: import.meta.env.VITE_PROXY_ADDRESS || PROXY_ADDRESS,
  
  // Modular Prediction Market Contracts (Phase 2) - NOW BEHIND PROXY
  // Core contract: Handles binary (UP/DOWN) markets (implementation only)
  PREDICTION_MARKET_CORE: import.meta.env.VITE_PREDICTION_MARKET_CORE_ADDRESS || PREDICTION_MARKET_CORE_ADDRESS,
  // Types contract: Handles multi-choice, range, and time-based markets (implementation only)
  PREDICTION_MARKET_TYPES: import.meta.env.VITE_PREDICTION_MARKET_TYPES_ADDRESS || PREDICTION_MARKET_TYPES_ADDRESS,


  // TrenchyReferrals contract - Referral tracking system
  REFERRALS: import.meta.env.VITE_REFERRALS_CONTRACT_ADDRESS || '0xF5f960a38d6cCF8EabD06fF6fcB15Ee1bBA4021f',
  // TrenchyAchievements contract - Achievements & badges system
  ACHIEVEMENTS: import.meta.env.VITE_ACHIEVEMENTS_CONTRACT_ADDRESS || '0x52D0F8A6c40807d149f382E89949511378056781',
  // TrenchyStreaks contract - Streak tracking system
  STREAKS: import.meta.env.VITE_STREAKS_CONTRACT_ADDRESS || '0xcBB0b5e027a4C2baFCAa928949d889B577646C70',
  // LaunchAirdrop contract - Airdrop for early users
  AIRDROP: import.meta.env.VITE_AIRDROP_CONTRACT_ADDRESS || '0x0971F70091Dc0F956033e991FBF8A9e803a5Ff3b',
  // FirstBetInsurance contract - Insurance for first bet
  INSURANCE: import.meta.env.VITE_INSURANCE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',

  // ChainlinkResolver contract - Automated market resolution
  CHAINLINK_RESOLVER: import.meta.env.VITE_CHAINLINK_RESOLVER_ADDRESS || CHAINLINK_RESOLVER_ADDRESS,

  // TrenchyStaking contract - Tiered staking system
  STAKING: import.meta.env.VITE_STAKING_CONTRACT_ADDRESS || '0x2513f27B994523B2DB87dE2F3c6C79d6E1557228',

};

// Export individual addresses for convenience
// Note: CHAINLINK_RESOLVER_ADDRESS and TRENCHY_STAKING_ADDRESS are defined at the top of this file

// Referral System Configuration

export const REFERRAL = {
  REWARD_AMOUNT: '10', // TRENCHY tokens per referral
  MAX_REFERRALS_PER_USER: 100,
};

// Achievement Configuration
export const ACHIEVEMENTS = {
  // Achievement IDs
  FIRST_BET: 0,
  WIN_STREAK_3: 1,
  WIN_STREAK_5: 2,
  WHALE: 3,
  SHARPSHOOTER: 4,
  EARLY_BIRD: 5,
  SPEED_DEMON: 6,
  SOCIAL_BUTTERFLY: 7,
  DIAMOND_HANDS: 8,
  ORACLE: 9,
  TRENDSETTER: 10,
  FOUNDER: 11,
  
  // Points per achievement
  POINTS: {
    FIRST_BET: 50,
    WIN_STREAK_3: 100,
    WIN_STREAK_5: 200,
    WHALE: 150,
    SHARPSHOOTER: 300,
    EARLY_BIRD: 50,
    SPEED_DEMON: 100,
    SOCIAL_BUTTERFLY: 150,
    DIAMOND_HANDS: 250,
    ORACLE: 500,
    TRENDSETTER: 75,
    FOUNDER: 1000,
  },
};

// Airdrop Configuration
export const AIRDROP = {
  AMOUNT: '100', // TRENCHY tokens
  MAX_RECIPIENTS: 1000,
};

// Insurance Configuration
export const INSURANCE = {
  MAX_COVERAGE: '100', // USDC
};

// Bet Credits Configuration
export const BET_CREDITS = {
  DEFAULT_AWARD_AMOUNT: '20', // USDC equivalent
  STREAK_REQUIREMENT: 3, // days
  VOLUME_REQUIREMENT: 10, // bets
  REFERRAL_REQUIREMENT: 2, // friends
};
// Add this to your constants.js file

// ==========================================
// SUPPORTED ASSETS (Base Sepolia)
// ==========================================

/**
 * Assets that have Chainlink price feeds on Base Sepolia testnet
 * IMPORTANT: Only these 3 assets have verified price feeds!
 * Other assets (SOL, UNI, AAVE, etc.) do NOT have feeds on Base Sepolia
 */
export const SUPPORTED_ASSETS = {
  // Assets with Chainlink price feeds on Base Sepolia
  WITH_PRICE_FEEDS: ['BTC', 'ETH', 'LINK'],
  
  // Assets without price feeds (cannot be used for markets that require price data)
  WITHOUT_PRICE_FEEDS: ['UNI', 'AAVE', 'CRV', 'MKR', 'COMP', 'YFI'],
  
  // All assets (for display purposes) - Only include assets with price feeds on Base Sepolia
  ALL: ['BTC', 'ETH', 'LINK'],

};

/**
 * Chainlink Price Feed addresses on Base Sepolia
 * Source: https://docs.chain.link/data-feeds/price-feeds/addresses?network=base&page=1#base-sepolia-testnet
 * Official addresses verified from chain.link documentation
 */
export const CHAINLINK_PRICE_FEEDS = {
  BTC: '0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298',   // BTC/USD (Base Sepolia Official)
  ETH: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',   // ETH/USD (Base Sepolia Official)
  LINK: '0xb113F5A928BCfF189C998ab20d753a47F9dE5A61',  // LINK/USD (Base Sepolia Official)
};



/**
 * Check if an asset has a price feed on Base Sepolia
 */
export function hasChainlinkFeed(asset) {
  return SUPPORTED_ASSETS.WITH_PRICE_FEEDS.includes(asset.toUpperCase());
}

/**
 * Get Chainlink feed address for an asset
 */
export function getChainlinkFeed(asset) {
  const upperAsset = asset.toUpperCase();
  return CHAINLINK_PRICE_FEEDS[upperAsset] || null;
}
