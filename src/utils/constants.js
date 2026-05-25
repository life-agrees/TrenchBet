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
export const PROXY_ADDRESS = "0x2d1d11Fb8A0C899c681C2D66b555eF37650fdFC8";

// Implementation contracts (behind proxy - do not use directly)
// UPDATED: New fixed implementations deployed on 2025-01-25
// Fixed storage collision issue - now reads owner from EIP-1967 admin slot
export const PREDICTION_MARKET_CORE_ADDRESS = "0x49E8CBe89934FD2b53aCEcaA05c1DCfE747BB8f8";
export const PREDICTION_MARKET_TYPES_ADDRESS = "0xC58A97aA13103474401A83c9DD2739c6e2788E16";



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
  REFRESH_INTERVAL: 10000,          // Auto-refresh interval (10 seconds)
  TIMEOUT: 60000,                   // Request timeout
  RETRY_DELAY_BASE: 1000,           // Base retry delay (1 second)
  ANIMATION_DELAY_1: 2000,          // Animation delay 1 (2 seconds)
  ANIMATION_DELAY_2: 4000,          // Animation delay 2 (4 seconds)
};

// Cache configuration
export const CACHE = {
  MARKETS_TTL: 10000,               // 10 seconds
  POINTS_TTL: 30 * 1000,             // 30 seconds (was 5 min — too stale for points updates)
  PREFETCH_TTL: 15 * 1000,          // 15 seconds for prefetch cache
};


// Batch processing
export const BATCH = {
  MARKET_BATCH_SIZE: 5,             // Reduced for faster batch fetches (proxy fix)
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
  MIN_BET_AMOUNT: 1,              // Minimum bet: 1 USDC
  MAX_BET_AMOUNT: 1000,           // Maximum bet: 1,000 USDC (contract hard cap: 10,000)
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

// Multi-Chain Configuration
// This allows the app to automatically switch contract addresses based on the connected network
export const MULTICHAIN_CONTRACTS = {
  // Base Sepolia (Testnet)
  84532: {
    NAME: "Base",
    EXPLORER: "https://sepolia.basescan.org",
    PROXY: "0x2d1d11Fb8A0C899c681C2D66b555eF37650fdFC8",
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    VOUCHERS: "0x0FcdB56b713a12a6C11Efa33d6DE1CAA1947294c",
    CORE: "0x49E8CBe89934FD2b53aCEcaA05c1DCfE747BB8f8",
    TYPES: "0xC58A97aA13103474401A83c9DD2739c6e2788E16",
    CHAINLINK_RESOLVER: "0x2Faee1c49d6E4ec7908800e971448B675782ab84",
    REFERRALS: "0xF5f960a38d6cCF8EabD06fF6fcB15Ee1bBA4021f",
    ACHIEVEMENTS: "0x52D0F8A6c40807d149f382E89949511378056781",
    STREAKS: "0xcBB0b5e027a4C2baFCAa928949d889B577646C70",
    AIRDROP: "0x0971F70091Dc0F956033e991FBF8A9e803a5Ff3b",
  },
  // Arc Testnet
  5042002: {
    NAME: "Arc",
    EXPLORER: "https://testnet.arcscan.app",
    PROXY: "0xa9d3532401E3DAF004C3031A3715c7bb311CD38f",
    USDC: "0x3600000000000000000000000000000000000000",
    VOUCHERS: "0x4785CFe39f68e1d45a3eCa6c6A8378c3A3CBf3c6",
    CORE: "0x91Da6845Bd26292cacD4E70AbC9cEB3356970DeC",
    TYPES: "0x417aD3CF4F50CdB69371BcC5BD25859fba1c757a",
    CHAINLINK_RESOLVER: "0x2Faee1c49d6E4ec7908800e971448B675782ab84", // Fallback for now
    REFERRALS: "0xF5f960a38d6cCF8EabD06fF6fcB15Ee1bBA4021f", // Fallback for now
    ACHIEVEMENTS: "0x52D0F8A6c40807d149f382E89949511378056781", // Fallback for now
    STREAKS: "0xcBB0b5e027a4C2baFCAa928949d889B577646C70", // Fallback for now
    AIRDROP: "0x0971F70091Dc0F956033e991FBF8A9e803a5Ff3b", // Fallback for now
  },
  // X Layer Testnet (Uniswap V4 Sandbox)
  1952: {
    NAME: "X Layer",
    EXPLORER: "https://www.okx.com/web3/explorer/xlayer-test",
    PROXY: "0x0000000000000000000000000000000000000000",
    USDC: "0x523B6424c64b4539E106A0c0A61247470Bf48D3a",       // Mock USDC (v2 deploy)
    VOUCHERS: "0x0000000000000000000000000000000000000000",
    CORE: "0x0000000000000000000000000000000000000000",
    TYPES: "0x0000000000000000000000000000000000000000",
    CHAINLINK_RESOLVER: "0x0000000000000000000000000000000000000000",
    REFERRALS: "0x0000000000000000000000000000000000000000",
    ACHIEVEMENTS: "0x0000000000000000000000000000000000000000",
    STREAKS: "0x0000000000000000000000000000000000000000",
    AIRDROP: "0x0000000000000000000000000000000000000000",
    TRENCHY_TOKEN: "0x296B9973fFD8fBFB15fACB347153A356d7A80460",  // $TRENCHY token (v2 deploy)
    POOL_MANAGER: "0x8062df199923DA30bcd47EE437C0b58Bb41Ea776",   // Mock PoolManager (v2 deploy)
    MILESTONE_HOOK: "0x29F98086c197B61F73D55b70cAb932Eade06F317",  // TrenchyMilestoneHook v2
    BINARY_AMM: "0xe8BeA516Bd335C860529f087dd891B1096fD955A",     // TrenchyBinaryAMM v2
  }
};

export const HOOK_CONTRACTS = {
  USDC: "0x523B6424c64b4539E106A0c0A61247470Bf48D3a",
  TRENCHY_TOKEN: "0x296B9973fFD8fBFB15fACB347153A356d7A80460",
  POOL_MANAGER: "0x8062df199923DA30bcd47EE437C0b58Bb41Ea776",
  MILESTONE_HOOK: "0x29F98086c197B61F73D55b70cAb932Eade06F317",
  BINARY_AMM: "0xe8BeA516Bd335C860529f087dd891B1096fD955A",
};

/**
 * Get contract addresses for a specific chain
 * Falls back to Base Sepolia if chain is not supported
 */
export function getContracts(chainId) {
  return MULTICHAIN_CONTRACTS[chainId] || MULTICHAIN_CONTRACTS[84532];
}

// Contract Addresses
// IMPORTANT: These are DEFAULT addresses (Base Sepolia)
// Use getContracts(chainId) for dynamic switching
export const CONTRACTS = {
  // USDC on Base Sepolia Testnet (NOT mainnet!)
  USDC: import.meta.env.VITE_USDC_CONTRACT_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  
  // PROXY CONTRACT
  PROXY: import.meta.env.VITE_PROXY_ADDRESS || PROXY_ADDRESS,
  
  // Vouchers
  VOUCHERS: import.meta.env.VITE_BET_VOUCHERS_ADDRESS || '0x0FcdB56b713a12a6C11Efa33d6DE1CAA1947294c',

  // Modular Prediction Market Contracts (Phase 2)
  PREDICTION_MARKET_CORE: import.meta.env.VITE_PREDICTION_MARKET_CORE_ADDRESS || PREDICTION_MARKET_CORE_ADDRESS,
  PREDICTION_MARKET_TYPES: import.meta.env.VITE_PREDICTION_MARKET_TYPES_ADDRESS || PREDICTION_MARKET_TYPES_ADDRESS,

  // Utility Contracts
  REFERRALS: import.meta.env.VITE_REFERRALS_CONTRACT_ADDRESS || '0xF5f960a38d6cCF8EabD06fF6fcB15Ee1bBA4021f',
  ACHIEVEMENTS: import.meta.env.VITE_ACHIEVEMENTS_CONTRACT_ADDRESS || '0x52D0F8A6c40807d149f382E89949511378056781',
  STREAKS: import.meta.env.VITE_STREAKS_CONTRACT_ADDRESS || '0xcBB0b5e027a4C2baFCAa928949d889B577646C70',
  AIRDROP: import.meta.env.VITE_AIRDROP_CONTRACT_ADDRESS || '0x0971F70091Dc0F956033e991FBF8A9e803a5Ff3b',
  INSURANCE: import.meta.env.VITE_INSURANCE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  CHAINLINK_RESOLVER: import.meta.env.VITE_CHAINLINK_RESOLVER_ADDRESS || CHAINLINK_RESOLVER_ADDRESS,
  STAKING: import.meta.env.VITE_STAKING_CONTRACT_ADDRESS || '0x2513f27B994523B2DB87dE2F3c6C79d6E1557228',
};

// Export individual addresses for convenience
// Note: CHAINLINK_RESOLVER_ADDRESS and TRENCHY_STAKING_ADDRESS are defined at the top of this file

// Alias for useVouchers.js compatibility
export const PROXY_CONTRACT_ADDRESS = PROXY_ADDRESS;


// Referral System Configuration

export const REFERRAL = {
  REWARD_AMOUNT: '1000', // Points awarded per referral (mapped from 10 TRENCHY)
  MAX_REFERRALS_PER_USER: 100,
  UNIT_LABEL: 'Points',
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
// SUPPORTED ASSETS (Dynamic Config)
// ==========================================
import { ASSET_CONFIG, APP_ENV, ASSET_STATUS, getFeedAddress, getActiveAssets } from '../config/assets';

/**
 * Assets that have Chainlink price feeds
 * IMPORTANT: This is now dynamic based on APP_ENV in src/config/assets.js
 */
export const SUPPORTED_ASSETS = {
  // Assets with Chainlink price feeds active in current ENV
  WITH_PRICE_FEEDS: getActiveAssets(),
  
  // Assets without price feeds (placeholder if needed)
  WITHOUT_PRICE_FEEDS: ['UNI', 'AAVE', 'CRV'],
  
  // All assets defined in config
  ALL: Object.keys(ASSET_CONFIG),
};

/**
 * Chainlink Price Feed addresses
 * Dynamic lookup based on APP_ENV
 */
export const CHAINLINK_PRICE_FEEDS = Object.keys(ASSET_CONFIG).reduce((acc, symbol) => {
  const feed = getFeedAddress(symbol);
  if (feed) acc[symbol] = feed;
  return acc;
}, {});

/**
 * Check if an asset has a price feed
 */
export function hasChainlinkFeed(asset) {
  if (!asset) return false;
  const upper = asset.toUpperCase();
  return !!getFeedAddress(upper);
}

/**
 * Get Chainlink feed address for an asset
 */
export function getChainlinkFeed(asset) {
  if (!asset) return null;
  return getFeedAddress(asset.toUpperCase());
}
