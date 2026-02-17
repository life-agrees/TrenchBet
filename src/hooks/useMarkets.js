import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS } from '../config/wagmi';
import { PREDICTION_MARKET_ABI } from '../contracts/abis';
import { DURATIONS, TIME, PRICE, BATCH } from '../utils/constants';
import { createLogger } from '../utils/logger';
import { calculateMarketPercentages, calculateFixedOddsPercentage } from '../marketUtils';

const logger = createLogger('useMarkets');

/**
 * Enhanced useMarkets hook with all features
 * Fetches all market data including ranges, timeframes, calculated prices, and UI helpers
 */
export function useMarkets() {
  const publicClient = usePublicClient();
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMarkets = useCallback(async () => {
    if (!publicClient || !CONTRACTS.PREDICTION_MARKET) {
      logger.warn('Missing publicClient or contract address');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Get total market count
      const marketCounter = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'marketCounter'
      });

      const totalMarkets = Number(marketCounter);
      logger.info(`Fetching ${totalMarkets} markets...`);

      if (totalMarkets === 0) {
        setMarkets([]);
        setIsLoading(false);
        return;
      }

      // Only show loading on initial fetch, not on background refreshes
      if (markets.length === 0) {
        setIsLoading(true);
      }

      // Use batching to avoid overwhelming the RPC
      const startIndex = Math.max(0, totalMarkets - 50);
      const batchSize = BATCH.MARKET_BATCH_SIZE;
      const validMarkets = [];
      
      // Process in batches
      for (let batchStart = startIndex; batchStart < totalMarkets; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalMarkets);
        const batchIndices = Array.from(
          { length: batchEnd - batchStart }, 
          (_, i) => batchStart + i
        );
        
        try {
          // Fetch batch in parallel
          const batchPromises = batchIndices.map(i => fetchSingleMarket(publicClient, i));
          const batchResults = await Promise.all(batchPromises);
          
          validMarkets.push(...batchResults.filter(m => m !== null));
          
          // Small delay between batches to be nice to the RPC
          if (batchEnd < totalMarkets) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          logger.error(`Error fetching batch ${batchStart}-${batchEnd}:`, err);
          // Continue with next batch instead of failing entirely
        }
      }

      setMarkets(validMarkets);
      setIsLoading(false);
      
      logger.info(`Successfully fetched ${validMarkets.length} markets`);
    } catch (err) {
      logger.error('Failed to fetch markets:', err);
      setError(err.message || 'Failed to fetch markets');
      setIsLoading(false);
    }
  }, [publicClient, markets.length]);

  // Fetch on mount and every 30 seconds
  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, DURATIONS.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  // Calculate live and expired markets
  const { liveMarkets, expiredMarkets } = useMemo(() => {
    const now = Date.now();
    const live = [];
    const expired = [];
    
    for (const market of markets) {
      const endTime = Number(market.endTime);
      
      if (market.resolved || endTime <= now) {
        expired.push(market);
      } else {
        live.push(market);
      }
    }
    
    return { 
      liveMarkets: live.sort((a, b) => a.endTime - b.endTime),
      expiredMarkets: expired.sort((a, b) => b.endTime - a.endTime)
    };
  }, [markets]);

  return {
    markets,
    liveMarkets,
    expiredMarkets,
    isLoading,
    error,
    refresh: fetchMarkets,
    refreshMarkets: fetchMarkets,
  };
}

/**
 * Fetch a single market with all its data
 */
async function fetchSingleMarket(publicClient, marketId) {
  try {
    // Step 1: Get base market data
    const market = await publicClient.readContract({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getMarket',
      args: [BigInt(marketId)]
    });

    const marketType = Number(market.marketType);

    // Calculate pools and prices
    const yesPool = market.yesPool ? Number(formatUnits(market.yesPool, 6)) : 0;
    const noPool = market.noPool ? Number(formatUnits(market.noPool, 6)) : 0;
    const useFixedOdds = market.useFixedOdds || false;
    const yesMultiplier = market.yesMultiplier ? Number(market.yesMultiplier) : 0;
    const noMultiplier = market.noMultiplier ? Number(market.noMultiplier) : 0;
    
    let yesPrice, noPrice;
    
    if (useFixedOdds && yesMultiplier > 0 && noMultiplier > 0) {
      const yesMult = yesMultiplier / 100;
      const noMult = noMultiplier / 100;
      yesPrice = calculateFixedOddsPercentage(yesMult) / 100;
      noPrice = calculateFixedOddsPercentage(noMult) / 100;
    } else {
      const { upPercentage, downPercentage } = calculateMarketPercentages(yesPool, noPool);
      yesPrice = upPercentage / 100;
      noPrice = downPercentage / 100;
    }

    // Step 2: Prepare base market object
    const baseMarket = {
      id: marketId,
      marketType,
      asset: market.asset || 'BTC',
      startTime: Number(market.startTime) * 1000,
      endTime: Number(market.endTime) * 1000,
      startPrice: market.startPrice ? Number(formatUnits(market.startPrice, 8)) : 0,
      endPrice: market.endPrice ? Number(formatUnits(market.endPrice, 8)) : 0,
      yesPool,
      noPool,
      yesPrice,
      noPrice,
      resolved: market.resolved || false,
      priceWentUp: market.priceWentUp || false,
      totalBets: Number(market.totalBets) || 0,
      useFixedOdds,
      yesMultiplier,
      noMultiplier,
      protocolFee: market.protocolFee ? Number(market.protocolFee) : 0,
      winningChoice: market.winningChoice !== undefined ? Number(market.winningChoice) : null,
      
      // Time decay fields - CRITICAL for decay calculations
      useTimeDecay: market.useTimeDecay || false,
      decayStartTime: market.decayStartTime ? Number(market.decayStartTime) * 1000 : Number(market.startTime) * 1000,
      minMultiplier: market.minMultiplier ? Number(market.minMultiplier) : 120,

      
      // UI helpers
      name: getCoinName(market.asset || 'BTC'),
      color: getCoinColor(market.asset || 'BTC'),
      status: market.resolved ? 'resolved' : 'active',
    };


    // Step 3: Fetch type-specific data
    if (marketType === 1) {
      // MULTI-CHOICE: Fetch options
      baseMarket.options = await fetchMultiChoiceOptions(publicClient, marketId);
      baseMarket.multipliers = await fetchMultipliers(publicClient, marketId);
      baseMarket.choicePools = market.choicePools 
        ? market.choicePools.map(p => Number(formatUnits(p, 6))) 
        : [];
    } 
    else if (marketType === 2) {
      // RANGE: Fetch ranges
      const rangeData = await fetchRangeData(publicClient, marketId);
      baseMarket.ranges = rangeData.ranges;
      baseMarket.multipliers = await fetchMultipliers(publicClient, marketId);
    } 
    else if (marketType === 3) {
      // TIME: Fetch target price and timeframes
      const timeData = await fetchTimeData(publicClient, marketId);
      baseMarket.targetPrice = timeData.targetPrice;
      baseMarket.timeframes = timeData.timeframes;
      baseMarket.multipliers = await fetchMultipliers(publicClient, marketId);
    }

    return baseMarket;

  } catch (error) {
    logger.warn(`Failed to fetch market ${marketId}:`, error.message);
    return null;
  }
}

/**
 * Fetch multi-choice options
 */
async function fetchMultiChoiceOptions(publicClient, marketId) {
  try {
    const options = await publicClient.readContract({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getMultiChoiceOptions',
      args: [BigInt(marketId)]
    });
    return options || [];
  } catch (error) {
    logger.warn(`Failed to fetch options for market ${marketId}:`, error.message);
    return [];
  }
}

/**
 * Fetch range market data
 */
async function fetchRangeData(publicClient, marketId) {
  try {
    const data = await publicClient.readContract({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getRangeMarketData',
      args: [BigInt(marketId)]
    });

    const mins = data.mins || data[0] || [];
    const maxs = data.maxs || data[1] || [];

    const ranges = mins.map((min, idx) => ({
      min: Number(formatUnits(min, 8)),
      max: Number(formatUnits(maxs[idx], 8))
    }));

    return { ranges };
  } catch (error) {
    logger.warn(`Failed to fetch range data for market ${marketId}:`, error.message);
    return { ranges: [] };
  }
}

/**
 * Fetch time market data
 */
async function fetchTimeData(publicClient, marketId) {
  try {
    const data = await publicClient.readContract({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getTimeMarketData',
      args: [BigInt(marketId)]
    });

    const targetPrice = data.targetPrice || data[0];
    const timeframeSeconds = data.timeframes || data[1] || [];

    const timeframes = timeframeSeconds.map((seconds) => {
      const secondsNum = Number(seconds);
      return {
        label: formatTimeframeLabel(secondsNum),
        seconds: secondsNum
      };
    });

    return {
      targetPrice: Number(formatUnits(targetPrice, 8)),
      timeframes
    };
  } catch (error) {
    logger.warn(`Failed to fetch time data for market ${marketId}:`, error.message);
    return { targetPrice: 0, timeframes: [] };
  }
}

/**
 * Fetch multipliers for any market type
 */
async function fetchMultipliers(publicClient, marketId) {
  try {
    const multipliers = await publicClient.readContract({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getCurrentOdds',
      args: [BigInt(marketId)]
    });
    return (multipliers || []).map(m => Number(m));
  } catch (error) {
    logger.warn(`Failed to fetch multipliers for market ${marketId}:`, error.message);
    return [];
  }
}

/**
 * Format timeframe seconds to human-readable label
 */
function formatTimeframeLabel(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
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

export default useMarkets;
