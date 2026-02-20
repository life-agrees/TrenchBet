import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS } from '../utils/constants';
import { 
  PREDICTION_MARKET_CORE_ABI, 
  PREDICTION_MARKET_TYPES_ABI 
} from '../contracts/abis';
import { DURATIONS, TIME, PRICE, BATCH } from '../utils/constants';
import { createLogger } from '../utils/logger';
import { calculateMarketPercentages, calculateFixedOddsPercentage } from '../marketUtils';

const logger = createLogger('useMarkets');

/**
 * Helper to get contract info based on market type
 * Binary markets (type 0) -> Core contract
 * Multi/Range/Time markets (types 1-3) -> Types contract
 */
function getContractForMarketType(marketType) {
  if (marketType === 0) {
    return {
      address: CONTRACTS.PREDICTION_MARKET_CORE,
      abi: PREDICTION_MARKET_CORE_ABI,
      source: 'core'
    };
  }
  return {
    address: CONTRACTS.PREDICTION_MARKET_TYPES,
    abi: PREDICTION_MARKET_TYPES_ABI,
    source: 'types'
  };
}


/**
 * Enhanced useMarkets hook with dual contract support
 * Fetches from both Core (binary) and Types (multi/range/time) contracts
 */
export function useMarkets() {
  const publicClient = usePublicClient();
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMarkets = useCallback(async () => {
    if (!publicClient || !CONTRACTS.PREDICTION_MARKET_CORE || !CONTRACTS.PREDICTION_MARKET_TYPES) {
      logger.warn('Missing publicClient or contract addresses');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch market counters from BOTH contracts concurrently
      const [coreCounter, typesCounter] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.PREDICTION_MARKET_CORE,
          abi: PREDICTION_MARKET_CORE_ABI,
          functionName: 'marketCounter'
        }),
        publicClient.readContract({
          address: CONTRACTS.PREDICTION_MARKET_TYPES,
          abi: PREDICTION_MARKET_TYPES_ABI,
          functionName: 'marketCounter'
        })
      ]);

      const coreTotal = Number(coreCounter);
      const typesTotal = Number(typesCounter);
      logger.info(`Fetching markets: ${coreTotal} from Core, ${typesTotal} from Types`);

      // Only show loading on initial fetch
      if (markets.length === 0) {
        setIsLoading(true);
      }

      // Fetch from both contracts in parallel
      const [coreMarkets, typesMarkets] = await Promise.all([
        fetchMarketsFromContract(publicClient, 0, coreTotal, 'core'),
        fetchMarketsFromContract(publicClient, 0, typesTotal, 'types')
      ]);

      // Combine and sort by end time (newest first)
      const allMarkets = [...coreMarkets, ...typesMarkets].sort((a, b) => b.endTime - a.endTime);
      
      setMarkets(allMarkets);
      setIsLoading(false);
      
      logger.info(`Successfully fetched ${allMarkets.length} markets (${coreMarkets.length} core, ${typesMarkets.length} types)`);
    } catch (err) {
      logger.error('Failed to fetch markets:', err);
      setError(err.message || 'Failed to fetch markets');
      setIsLoading(false);
    }
  }, [publicClient, markets.length]);

  /**
   * Fetch markets from a specific contract
   */
  async function fetchMarketsFromContract(publicClient, startIndex, totalCount, contractType) {
    if (totalCount === 0) return [];
    
    const contract = contractType === 'core' 
      ? { address: CONTRACTS.PREDICTION_MARKET_CORE, abi: PREDICTION_MARKET_CORE_ABI }
      : { address: CONTRACTS.PREDICTION_MARKET_TYPES, abi: PREDICTION_MARKET_TYPES_ABI };

    const validMarkets = [];
    const batchSize = BATCH.MARKET_BATCH_SIZE;
    
    // Process in batches
    for (let batchStart = startIndex; batchStart < totalCount; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, totalCount);
      const batchIndices = Array.from(
        { length: batchEnd - batchStart }, 
        (_, i) => batchStart + i
      );
      
      try {
        // Fetch batch in parallel
        const batchPromises = batchIndices.map(i => 
          fetchSingleMarket(publicClient, i, contract, contractType)
        );
        const batchResults = await Promise.all(batchPromises);
        
        validMarkets.push(...batchResults.filter(m => m !== null));
        
        // Small delay between batches
        if (batchEnd < totalCount) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (err) {
        logger.error(`Error fetching ${contractType} batch ${batchStart}-${batchEnd}:`, err);
      }
    }
    
    return validMarkets;
  }


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
async function fetchSingleMarket(publicClient, marketId, contract, contractType) {
  try {
    // Step 1: Get base market data
    const market = await publicClient.readContract({
      address: contract.address,
      abi: contract.abi,
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


    // Tag with contract source for later use
    baseMarket.contractSource = contractType;
    baseMarket.contractAddress = contract.address;

    // Step 3: Fetch type-specific data (only from Types contract)
    if (contractType === 'types') {
      if (marketType === 1) {
        // MULTI-CHOICE: Fetch options
        baseMarket.options = await fetchMultiChoiceOptions(publicClient, marketId, contract);
        baseMarket.multipliers = await fetchMultipliers(publicClient, marketId, contract);
        baseMarket.choicePools = market.choicePools 
          ? market.choicePools.map(p => Number(formatUnits(p, 6))) 
          : [];
      } 
      else if (marketType === 2) {
        // RANGE: Fetch ranges
        const rangeData = await fetchRangeData(publicClient, marketId, contract);
        baseMarket.ranges = rangeData.ranges;
        baseMarket.multipliers = await fetchMultipliers(publicClient, marketId, contract);
      } 
      else if (marketType === 3) {
        // TIME: Fetch target price and timeframes
        const timeData = await fetchTimeData(publicClient, marketId, contract);
        baseMarket.targetPrice = timeData.targetPrice;
        baseMarket.timeframes = timeData.timeframes;
        baseMarket.multipliers = await fetchMultipliers(publicClient, marketId, contract);
      }
    } else {
      // Binary market (type 0) from Core contract
      baseMarket.multipliers = [baseMarket.yesMultiplier, baseMarket.noMultiplier];
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
async function fetchMultiChoiceOptions(publicClient, marketId, contract) {
  try {
    const options = await publicClient.readContract({
      address: contract.address,
      abi: contract.abi,
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
async function fetchRangeData(publicClient, marketId, contract) {
  try {
    const data = await publicClient.readContract({
      address: contract.address,
      abi: contract.abi,
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
async function fetchTimeData(publicClient, marketId, contract) {
  try {
    const data = await publicClient.readContract({
      address: contract.address,
      abi: contract.abi,
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
async function fetchMultipliers(publicClient, marketId, contract) {
  try {
    const multipliers = await publicClient.readContract({
      address: contract.address,
      abi: contract.abi,
      functionName: 'getCurrentOdds',
      args: [BigInt(marketId)]
    });
    return (multipliers || []).map(m => Number(m));
  } catch (error) {
    logger.warn(`Failed to fetch multipliers for market ${marketId}:`, error.message);
    return [];
  }
}

// Export helper for other hooks
export { getContractForMarketType };


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
