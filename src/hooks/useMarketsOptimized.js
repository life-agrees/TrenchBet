import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useReadContract, useBlockNumber } from 'wagmi';
import { multicall } from 'wagmi/actions';
import { CONTRACTS, config } from '../config/wagmi';
import { PREDICTION_MARKET_ABI } from '../contracts/abis';
import { DURATIONS, TIME, PRICE } from '../utils/constants';
import { createLogger } from '../utils/logger';
import { calculateMarketPercentages, calculateFixedOddsPercentage } from '../marketUtils';

const logger = createLogger('useMarketsOptimized');

/**
 * Optimized hook to fetch and manage markets using multicall
 * Reduces N+1 query problem by batching requests
 */
export function useMarketsOptimized() {
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const refreshTriggerRef = useRef(0);

  // Get current block number to trigger refresh
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // Fetch market counter to know how many markets exist
  const { data: marketCounter, isError: isCounterError, refetch: refetchCounter } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'marketCounter',
    watch: true,
  });

  // Fetch markets using multicall for better performance
  const fetchMarkets = useCallback(async (force = false) => {
    if (!marketCounter || !CONTRACTS.PREDICTION_MARKET) {
      setIsLoading(false);
      return;
    }

    // Rate limiting: don't refresh more than once every 3 seconds unless forced
    const now = Date.now();
    if (!force && now - lastRefreshTime < 3000) {
      logger.info('Skipping refresh - too soon');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const count = Number(marketCounter);
      
      if (count === 0) {
        setMarkets([]);
        setIsLoading(false);
        setLastRefreshTime(now);
        return;
      }

      // Limit to last 50 markets for performance
      const startIndex = Math.max(0, count - 50);
      const marketIds = Array.from({ length: count - startIndex }, (_, i) => startIndex + i);

      // Prepare multicall contracts
      const contracts = marketIds.map(id => ({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getMarket',
        args: [BigInt(id)],
      }));

      // Execute multicall
      const results = await multicall(config, {
        contracts,
        allowFailure: true, // Allow individual calls to fail
      });

      // Process results
      const fetchedMarkets = results
        .map((result, index) => {
          if (result.status === 'failure') {
            logger.warn(`Failed to fetch market ${marketIds[index]}:`, result.error);
            return null;
          }
          return processMarketData(result.result, marketIds[index]);
        })
        .filter(m => m !== null);

      setMarkets(fetchedMarkets);
      setLastRefreshTime(now);
      setIsLoading(false);
      
      logger.info(`Fetched ${fetchedMarkets.length} markets via multicall`);
    } catch (err) {
      logger.error('Error fetching markets with multicall', err);
      setError(err.message || 'Failed to fetch markets');
      setIsLoading(false);
    }
  }, [marketCounter, lastRefreshTime]);

  // Initial fetch and refresh on block change
  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets, blockNumber, refreshTriggerRef.current]);

  // Watch for market counter changes and force refresh
  useEffect(() => {
    if (marketCounter) {
      const currentCount = Number(marketCounter);
      const previousCount = markets.length;
      
      // If counter increased, there might be new markets
      if (currentCount > previousCount) {
        logger.info(`Market counter changed: ${previousCount} -> ${currentCount}, refreshing...`);
        fetchMarkets(true);
      }
    }
  }, [marketCounter, markets.length, fetchMarkets]);

  // Separate markets by status
  const { liveMarkets, expiredMarkets } = useMemo(() => {
    const now = Date.now();
    const live = [];
    const expired = [];

    markets.forEach(market => {
      if (market.endTime > now && !market.resolved) {
        live.push(market);
      } else {
        expired.push(market);
      }
    });

    // Sort by end time
    live.sort((a, b) => a.endTime - b.endTime);
    expired.sort((a, b) => b.endTime - a.endTime);

    return { liveMarkets: live, expiredMarkets: expired };
  }, [markets]);

  // Refresh function - can be called to force immediate refresh
  const refresh = useCallback(() => {
    logger.info('Manual refresh triggered');
    refreshTriggerRef.current += 1;
    fetchMarkets(true);
    refetchCounter();
  }, [fetchMarkets, refetchCounter]);

  // Force refresh function for external use
  const forceRefresh = useCallback(() => {
    logger.info('Force refresh triggered');
    refreshTriggerRef.current += 1;
    setLastRefreshTime(0); // Reset rate limit
    fetchMarkets(true);
    refetchCounter();
  }, [fetchMarkets, refetchCounter]);

  return {
    markets,
    liveMarkets,
    expiredMarkets,
    isLoading,
    error,
    refresh,
    forceRefresh,
    marketCounter: marketCounter ? Number(marketCounter) : 0,
  };
}

/**
 * Process raw market data from contract
 */
function processMarketData(market, marketId) {
  if (!market) return null;

  try {
    // Calculate pool percentages
    const yesPool = Number(market.yesPool || 0) / (10 ** PRICE.USDC_DECIMALS);
    const noPool = Number(market.noPool || 0) / (10 ** PRICE.USDC_DECIMALS);
    const { upPercentage, downPercentage } = calculateMarketPercentages(yesPool, noPool);

    // Calculate prices
    const yesPrice = upPercentage / 100;
    const noPrice = downPercentage / 100;

    // Fixed odds calculations
    const useFixedOdds = market.useFixedOdds || false;
    const yesMultiplier = Number(market.yesMultiplier || 200);
    const noMultiplier = Number(market.noMultiplier || 200);

    const marketData = {
      id: marketId,
      asset: market.asset || 'BTC',
      marketType: Number(market.marketType || 0),
      startPrice: formatPrice(market.startPrice),
      targetPrice: market.targetPrice ? formatPrice(market.targetPrice) : null,
      startTime: Number(market.startTime) * TIME.MS_PER_SECOND,
      endTime: Number(market.endTime) * TIME.MS_PER_SECOND,
      yesPool: yesPool,
      noPool: noPool,
      yesPrice: yesPrice,
      noPrice: noPrice,
      resolved: Boolean(market.resolved),
      priceWentUp: market.priceWentUp !== undefined ? Boolean(market.priceWentUp) : null,
      winningChoice: market.winningChoice !== undefined ? Number(market.winningChoice) : null,
      totalBets: Number(market.totalBets || 0),
      
      // Fixed odds fields
      useFixedOdds: useFixedOdds,
      yesMultiplier: yesMultiplier,
      noMultiplier: noMultiplier,

      // Multi-choice specific
      options: market.options || [],
      choicePools: market.choicePools ? market.choicePools.map(formatUSDC) : [],
      
      // Range market specific
      rangeMin: market.rangeMin ? formatPrice(market.rangeMin) : null,
      rangeMax: market.rangeMax ? formatPrice(market.rangeMax) : null,
      
      // Time-based specific
      timeframes: market.timeframes || [],
      
      // UI helpers
      name: getCoinName(market.asset || 'BTC'),
      color: getCoinColor(market.asset || 'BTC'),
      status: market.resolved ? 'resolved' : 'active',
    };

    return marketData;
  } catch (err) {
    logger.error(`Error processing market ${marketId}`, err);
    return null;
  }
}

/**
 * Format Chainlink price (8 decimals) to readable number
 */
function formatPrice(price) {
  if (!price) return 0;
  return Number(price) / (10 ** PRICE.DECIMALS);
}

/**
 * Format USDC amount (6 decimals) to readable number
 */
function formatUSDC(amount) {
  if (!amount) return 0;
  return Number(amount) / (10 ** PRICE.USDC_DECIMALS);
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

export default useMarketsOptimized;
