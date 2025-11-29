import { useState, useEffect } from 'react';
import { useReadContract, useBlockNumber } from 'wagmi';
import { CONTRACTS } from '../config/wagmi';
import { PREDICTION_MARKET_ABI } from '../contracts/abis';

/**
 * Hook to fetch and manage markets from the smart contract
 */
export function useMarkets() {
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current block number to trigger refresh
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // Fetch market counter to know how many markets exist
  const { data: marketCounter } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'marketCounter',
    watch: true,
  });

  // Fetch markets when counter changes
  useEffect(() => {
    const fetchMarkets = async () => {
      if (!marketCounter || !CONTRACTS.PREDICTION_MARKET) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const count = Number(marketCounter);
        const marketPromises = [];

        // Fetch last 10 markets (or all if less than 10)
        const startIndex = Math.max(0, count - 10);
        
        for (let i = startIndex; i < count; i++) {
          marketPromises.push(fetchMarket(i));
        }

        const fetchedMarkets = await Promise.all(marketPromises);
        
        // Filter out null markets and only show active ones
        const activeMarkets = fetchedMarkets
          .filter(m => m && !m.resolved && Date.now() < m.endTime)
          .sort((a, b) => a.id - b.id);

        setMarkets(activeMarkets);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching markets:', error);
        setIsLoading(false);
      }
    };

    fetchMarkets();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, [marketCounter, blockNumber]);

  return { markets, isLoading, refetch: () => {} };
}

/**
 * Fetch a single market from the contract
 */
async function fetchMarket(marketId) {
  try {
    const { readContract } = await import('wagmi/actions');
    const { config } = await import('../config/wagmi');

    const market = await readContract(config, {
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getMarket',
      args: [BigInt(marketId)],
    });

    // Format market data
    return {
      id: Number(market.id),
      coin: market.asset,
      name: getCoinName(market.asset),
      currentPrice: formatPrice(market.startPrice), // Will be updated with live price
      startPrice: formatPrice(market.startPrice),
      startTime: Number(market.startTime) * 1000, // Convert to ms
      endTime: Number(market.endTime) * 1000,
      yesPool: formatUSDC(market.yesPool),
      noPool: formatUSDC(market.noPool),
      status: market.resolved ? 'resolved' : 'active',
      resolved: market.resolved,
      priceWentUp: market.priceWentUp,
      totalBets: Number(market.totalBets),
      color: getCoinColor(market.asset),
      participants: Number(market.totalBets), // Approximate
    };
  } catch (error) {
    console.error(`Error fetching market ${marketId}:`, error);
    return null;
  }
}

/**
 * Format Chainlink price (8 decimals) to readable number
 */
function formatPrice(price) {
  return Number(price) / 100000000; // Chainlink uses 8 decimals
}

/**
 * Format USDC amount (6 decimals) to readable number
 */
function formatUSDC(amount) {
  return Number(amount) / 1000000; // USDC uses 6 decimals
}

/**
 * Get coin display name
 */
function getCoinName(asset) {
  const names = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SOL': 'Solana',
  };
  return names[asset] || asset;
}

/**
 * Get coin color gradient
 */
function getCoinColor(asset) {
  const colors = {
    'BTC': 'from-orange-500 to-yellow-500',
    'ETH': 'from-blue-500 to-purple-500',
    'SOL': 'from-purple-500 to-pink-500',
  };
  return colors[asset] || 'from-gray-500 to-gray-700';
}