import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, base } from 'wagmi/chains';
import { http, fallback } from 'wagmi';

// ============================================================
// FREE PUBLIC RPC - NO API KEY NEEDED
// ============================================================
// Using Base's official public RPC endpoints (no rate limits for basic usage)

const baseSepoliaWithRPC = {
  ...baseSepolia,
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
};

// Create transport with multiple free public RPCs for redundancy
const createTransport = (publicUrls) => {
  const transports = publicUrls.map(url => 
    http(url, {
      batch: true, // Enable batching for better performance
      retryCount: 3,
      retryDelay: 1000,
      timeout: 30000,
    })
  );
  
  return fallback(transports);
};

// Free public RPC endpoints (no API keys required)
const FREE_RPC_PROVIDERS = {
  baseSepolia: [
    'https://sepolia.base.org', // Official Base Sepolia RPC (best)
    'https://base-sepolia-rpc.publicnode.com', // Backup
    'https://base-sepolia.blockpi.network/v1/rpc/public', // Backup 2
  ],
  base: [
    'https://mainnet.base.org', // Official Base Mainnet RPC
    'https://base-rpc.publicnode.com', // Backup
    'https://base.meowrpc.com', // Backup 2
  ],
};

export const config = getDefaultConfig({
  appName: 'TrenchyBet',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,

  walletConnectOptions: {
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  },

  chains: [baseSepoliaWithRPC, base],

  // Use FREE public RPCs (no Alchemy needed!)
  transports: {
    [baseSepoliaWithRPC.id]: createTransport(FREE_RPC_PROVIDERS.baseSepolia),
    [base.id]: createTransport(FREE_RPC_PROVIDERS.base),
  },

  ssr: false,
});

// Contracts
export const CONTRACTS = {
  PREDICTION_MARKET: import.meta.env.VITE_PREDICTION_MARKET_ADDRESS,
  USDC: import.meta.env.VITE_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

// Price Feeds (Chainlink on Base Sepolia)
export const PRICE_FEEDS = {
  BTC: import.meta.env.VITE_BTC_PRICE_FEED || '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
  ETH: import.meta.env.VITE_ETH_PRICE_FEED || '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165',
  SOL: '0x0000000000000000000000000000000000000000', // Not available on Base Sepolia
};