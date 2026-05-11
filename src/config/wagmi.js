import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia, base } from 'wagmi/chains';
import { http, fallback } from 'wagmi';

import { CONTRACTS as CONTRACT_ADDRESSES } from '../utils/constants';

export const CONTRACTS = CONTRACT_ADDRESSES;

const baseSepoliaWithRPC = {
  ...baseSepolia,
  rpcUrls: {
    default: { http: ['https://base-sepolia.infura.io/v3/cbab4b63ab6743aa8c1922a7e97a1e50', 'https://base-sepolia-rpc.publicnode.com'] },
    public:  { http: ['https://base-sepolia.infura.io/v3/cbab4b63ab6743aa8c1922a7e97a1e50', 'https://base-sepolia-rpc.publicnode.com'] },
  },
};

const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  // Arc native USDC uses 18 decimals for gas (like ETH on Ethereum).
  // The ERC-20 interface at 0x3600... uses 6 decimals for token transfers,
  // but nativeCurrency.decimals must match the gas token precision (18).
  // Setting this to 6 causes MetaMask to miscalculate gas by 10^12x,
  // which triggers InternalRpcError on every transaction.
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
};

const createTransport = (publicUrls) => {
  const transports = publicUrls.map(url =>
    http(url, {
      batch: false,  // FIX: Disable batching to prevent free RPC nodes from silently dropping multicall payloads
      retryCount: 3,
      retryDelay: 1000,
      timeout: 30000,
    })
  );

  return fallback(transports, {
    rank: {
      interval: 60_000,
      sampleCount: 5,
      timeout: 5_000,
      weights: { latency: 0.7, stability: 0.3 },
    },
  });
};

const FREE_RPC_PROVIDERS = {
  baseSepolia: [
    'https://base-sepolia.infura.io/v3/cbab4b63ab6743aa8c1922a7e97a1e50',
    'https://base-sepolia-rpc.publicnode.com',
    'https://sepolia.base.org',
  ],
  base: [
    'https://mainnet.base.org',
    'https://base-rpc.publicnode.com',
    'https://base.meowrpc.com',
  ],
};

export const config = getDefaultConfig({
  appName: 'TrenchyBet',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  walletConnectOptions: {
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  },
  chains: [baseSepoliaWithRPC, arcTestnet],
  transports: {
    [baseSepoliaWithRPC.id]: createTransport(FREE_RPC_PROVIDERS.baseSepolia),
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
  },
  ssr: false,
});

/**
 * Chainlink Price Feed addresses on Base Sepolia.
 * Source of truth is CHAINLINK_PRICE_FEEDS in constants.js.
 * These are kept here for legacy imports only — prefer importing
 * from constants.js directly.
 *
 * FIX: Previously PRICE_FEEDS.BTC was '0x4aDC67...' which is the ETH/USD
 *      feed address (as verified in constants.js CHAINLINK_PRICE_FEEDS).
 *      Corrected to match constants.js canonical values.
 */
export const PRICE_FEEDS = {
  BTC:  '0x0FB99723Aee6f420beAD13e6bBB79b7E6F034298', // FIX: was ETH address
  ETH:  '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1',
  LINK: '0xb113F5A928BCfF189C998ab20d753a47F9dE5A61',
  SOL:  '0x0000000000000000000000000000000000000000', // Not available on Base Sepolia
};