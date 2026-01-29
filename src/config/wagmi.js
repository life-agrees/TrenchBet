import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, base } from 'wagmi/chains';
import { http } from 'wagmi';

// Alchemy RPC endpoints
const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY;

const baseSepoliaWithRPC = {
  ...baseSepolia,
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
};

export const config = getDefaultConfig({
  appName: 'TrenchyBet',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,

  // 🔥 THIS IS WHAT WAS MISSING
  walletConnectOptions: {
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  },

  chains: [baseSepoliaWithRPC, base],

  transports: {
    [baseSepoliaWithRPC.id]: http(`https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
      timeout: 10000,
    }),
    [base.id]: http(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
      timeout: 10000,
    }),
  },

  ssr: false,
});

// Contracts
export const CONTRACTS = {
  PREDICTION_MARKET: import.meta.env.VITE_PREDICTION_MARKET_ADDRESS,
  USDC: import.meta.env.VITE_USDC_ADDRESS ||
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

// Price Feeds
export const PRICE_FEEDS = {
  BTC: import.meta.env.VITE_BTC_PRICE_FEED ||
    '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
  ETH: import.meta.env.VITE_ETH_PRICE_FEED ||
    '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165',
  SOL: '0x0000000000000000000000000000000000000000',
};
