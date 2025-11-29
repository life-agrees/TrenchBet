import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'PredictCast',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  chains: [
    ...(import.meta.env.MODE === 'production' ? [base] : [baseSepolia])
  ],
  ssr: false,
});

// Contract addresses
export const CONTRACTS = {
  PREDICTION_MARKET: import.meta.env.VITE_PREDICTION_MARKET_ADDRESS,
  USDC: import.meta.env.VITE_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
};

// Chainlink Price Feeds
export const PRICE_FEEDS = {
  BTC: import.meta.env.VITE_BTC_PRICE_FEED || '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
  ETH: import.meta.env.VITE_ETH_PRICE_FEED || '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165',
  SOL: '0x0000000000000000000000000000000000000000', // Update when available
};