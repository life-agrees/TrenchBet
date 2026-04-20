/**
 * Centralized Asset Configuration for TrenchyBet
 * 
 * This file handles the definitions of all supported and upcoming cryptocurrencies.
 * It supports multi-environment configurations (testnet vs mainnet).
 */

// Current Environment Toggle
// Set to 'testnet' for Sepolia / Testing
// Set to 'mainnet' for Base Mainnet Production
export const APP_ENV = 'testnet'; 

export const ASSET_STATUS = {
  ACTIVE: 'active',
  UPCOMING: 'upcoming',
  DISABLED: 'disabled'
};

import { Bitcoin, CircleDollarSign, Layers, Coins, Zap, Shield, Smile, Activity, Link as LinkIcon } from 'lucide-react';

/**
 * MASTER ASSET CONFIGURATION
 * 
 * Each asset contains:
 * - name: Human readable name
 * - symbol: Ticker symbol (BTC, ETH, etc.)
 * - icon: Lucide icon component
 * - status: Active, Upcoming, or Disabled
 * - style: UI-specific styles (colors, backgrounds, border classes)
 * - feeds: Chainlink feed addresses for both testnet and mainnet
 */
export const ASSET_CONFIG = {
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: Bitcoin,
    status: ASSET_STATUS.ACTIVE,
    style: {
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      border: 'border-orange-200 dark:border-orange-500/20',
      badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    },
    feeds: {
      testnet: '0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298',
      mainnet: '0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298'
    }
  },
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: CircleDollarSign,
    status: ASSET_STATUS.ACTIVE,
    style: {
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      border: 'border-blue-200 dark:border-blue-500/20',
      badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    },
    feeds: {
      testnet: '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
      mainnet: '0x71041dddad3595F8Ce33Ad99F07DA1D3b1F6f34d'
    }
  },
  SOL: {
    name: 'Solana',
    symbol: 'SOL',
    icon: Zap,
    status: APP_ENV === 'mainnet' ? ASSET_STATUS.ACTIVE : ASSET_STATUS.UPCOMING,
    style: {
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-500/10',
      border: 'border-purple-200 dark:border-purple-500/20',
      badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    },
    feeds: {
      testnet: null, 
      mainnet: '0x1062d8DE4A0344d32a90A2E2C33DEB04bBBe3219'
    }
  },
  LINK: {
    name: 'Chainlink',
    symbol: 'LINK',
    icon: LinkIcon,
    status: APP_ENV === 'mainnet' ? ASSET_STATUS.DISABLED : ASSET_STATUS.ACTIVE,
    style: {
      color: 'text-blue-500 dark:text-blue-300',
      bg: 'bg-blue-50 dark:bg-blue-400/10',
      border: 'border-blue-200 dark:border-blue-400/20',
      badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    },
    feeds: {
      testnet: '0xb113F5A928BCfF189C998ab20d753a47F9dE5A61',
      mainnet: '0x6d90393282222E910609681C2D66b555eF37650fdFC8'
    }
  },
  XRP: {
    name: 'Ripple',
    symbol: 'XRP',
    icon: Shield,
    status: APP_ENV === 'mainnet' ? ASSET_STATUS.ACTIVE : ASSET_STATUS.UPCOMING,
    style: {
      color: 'text-blue-400',
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/10',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    feeds: {
      testnet: null,
      mainnet: '0x4561008C39ca8838B57d77E6c98F8aC830206144'
    }
  },
  BNB: {
    name: 'BNB',
    symbol: 'BNB',
    icon: Coins,
    status: APP_ENV === 'mainnet' ? ASSET_STATUS.ACTIVE : ASSET_STATUS.UPCOMING,
    style: {
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/5',
      border: 'border-yellow-500/10',
      badge: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
    },
    feeds: {
      testnet: null,
      mainnet: '0x16a9A977e9234707C951074aab55d141662F6988'
    }
  },
  DOGE: {
    name: 'Dogecoin',
    symbol: 'DOGE',
    icon: Activity,
    status: APP_ENV === 'mainnet' ? ASSET_STATUS.ACTIVE : ASSET_STATUS.UPCOMING,
    style: {
      color: 'text-yellow-600',
      bg: 'bg-yellow-600/5',
      border: 'border-yellow-600/10',
      badge: 'bg-yellow-600/20 text-yellow-600 border-yellow-600/30'
    },
    feeds: {
      testnet: null,
      mainnet: '0x338f0C0B083f2a893E2B8869E96287968593a890'
    }
  },
  ARB: {
    name: 'Arbitrum',
    symbol: 'ARB',
    icon: Layers,
    status: APP_ENV === 'mainnet' ? ASSET_STATUS.ACTIVE : ASSET_STATUS.UPCOMING,
    style: {
      color: 'text-blue-600',
      bg: 'bg-blue-600/5',
      border: 'border-blue-600/10',
      badge: 'bg-blue-600/20 text-blue-400 border-blue-600/30'
    },
    feeds: {
      testnet: null,
      mainnet: '0x0113F5A928BCfF189C998ab20d753a47F9dE5A61'
    }
  },
  PEPE: {
    name: 'Pepe',
    symbol: 'PEPE',
    icon: Smile,
    status: ASSET_STATUS.ACTIVE,
    style: {
      color: 'text-green-500',
      bg: 'bg-green-500/5',
      border: 'border-green-500/10',
      badge: 'bg-green-500/20 text-green-400 border-green-500/30'
    },
    feeds: {
      testnet: null,
      mainnet: '0xB48ac6409C0c3718b956089b0fFE295A10ACDdad'
    }
  }
};

/**
 * HELPER FUNCTIONS
 */

// Get all assets filtered by status (or all if no status provided)
export const getAssets = (status = null) => {
  const assets = Object.values(ASSET_CONFIG);
  if (!status) return assets;
  return assets.filter(a => a.status === status);
};

// Get the specific feed address for the current environment
export const getFeedAddress = (symbol) => {
  const asset = ASSET_CONFIG[symbol.toUpperCase()];
  if (!asset || !asset.feeds) return null;
  return APP_ENV === 'mainnet' ? asset.feeds.mainnet : asset.feeds.testnet;
};

// Get the active asset symbols for the current network
export const getActiveAssets = () => {
  return Object.values(ASSET_CONFIG)
    .filter(a => a.status === ASSET_STATUS.ACTIVE)
    .map(a => a.symbol);
};

// Check if an asset is coming soon
export const isUpcoming = (symbol) => {
  return ASSET_CONFIG[symbol.toUpperCase()]?.status === ASSET_STATUS.UPCOMING;
};
