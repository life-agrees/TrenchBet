import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { PROXY_ADDRESS, CONTRACTS, DURATIONS, BATCH } from '../utils/constants';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';
import { PREDICTION_MARKET_ABI } from '../contracts/abis';
import { createLogger } from '../utils/logger';
import { calculateMarketPercentages, calculateFixedOddsPercentage } from '../marketUtils';

const logger = createLogger('useMarkets');

// PROXY PATTERN: All interactions go through the proxy contract
const PROXY_CONTRACT_ADDRESS = PROXY_ADDRESS;

/**
 * PROXY PATTERN: All market types are accessed through the proxy contract
 * The proxy uses delegatecall to execute logic in Core/Types implementations
 * while keeping all storage (markets, positions, counters) in the proxy itself
 */
function getContractForMarketType(marketType) {
  return {
    address: PROXY_CONTRACT_ADDRESS,
    abi: PREDICTION_MARKET_PROXY_ABI,
    source: 'proxy'
  };
}

/**
 * Enhanced useMarkets hook with proxy pattern support
 * Fetches all markets through the proxy contract
 */
export function useMarkets() {
  const publicClient = usePublicClient();
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMarkets = useCallback(async (force = false) => {
    if (!publicClient || !PROXY_CONTRACT_ADDRESS) {
      logger.warn('Missing publicClient or proxy address');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      if (markets.length === 0 || force) {
        setIsLoading(true);
      }

      logger.info(`Fetching markets from proxy contract... (force: ${force})`);
      
      // PROXY PATTERN: Read marketCounter from proxy only
      const proxyCounter = await publicClient.readContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'marketCounter'
      }).catch(() => 0n);

      const proxyTotal = Number(proxyCounter);
      logger.info(`Market counter: ${proxyTotal} from Proxy`);

      // Fetch markets from proxy only - all markets are stored in the proxy contract
      const proxyMarkets = await fetchMarketsFromProxy(publicClient, 0, proxyTotal);

      // Sort by end time (newest first)
      const allMarkets = proxyMarkets.sort((a, b) => b.endTime - a.endTime);

      setMarkets(allMarkets);
      setIsLoading(false);
      
      logger.info(`Successfully fetched ${allMarkets.length} markets from proxy`);

    } catch (err) {
      logger.error('Failed to fetch markets:', err);
      setError(err.message || 'Failed to fetch markets');
      setIsLoading(false);
    }
  }, [publicClient, markets.length]);

  /**
   * Fetch markets from proxy contract
   */
  async function fetchMarketsFromProxy(publicClient, startIndex, totalCount) {
    if (totalCount === 0) return [];
    
    logger.info(`Fetching ${totalCount} markets from proxy at ${PROXY_CONTRACT_ADDRESS}`);

    const validMarkets = [];
    const batchSize = BATCH.MARKET_BATCH_SIZE;
    
    for (let batchStart = startIndex; batchStart < totalCount; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, totalCount);
      const batchIndices = Array.from(
        { length: batchEnd - batchStart }, 
        (_, i) => batchStart + i
      );
      
      try {
        const batchPromises = batchIndices.map(i => 
          fetchSingleMarketFromProxy(publicClient, i)
        );
        const batchResults = await Promise.all(batchPromises);
        
        validMarkets.push(...batchResults.filter(m => m !== null));
        
        if (batchEnd < totalCount) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (err) {
        logger.error(`Error fetching proxy batch ${batchStart}-${batchEnd}:`, err);
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

  const forceRefresh = useCallback(() => {
    logger.info('Force refresh triggered');
    fetchMarkets(true);
  }, [fetchMarkets]);

  return {
    markets,
    liveMarkets,
    expiredMarkets,
    isLoading,
    error,
    refresh: fetchMarkets,
    refreshMarkets: fetchMarkets,
    forceRefresh,
  };
}

/**
 * Fetch a single market from proxy contract
 */
async function fetchSingleMarketFromProxy(publicClient, marketId, retryCount = 0) {
  const MAX_RETRIES = 2;
  
  try {
    logger.info(`Fetching market ${marketId} from proxy at ${PROXY_CONTRACT_ADDRESS}`);
    
    let rawMarket;
    try {
      rawMarket = await publicClient.readContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'markets',
        args: [BigInt(marketId)]
      });
    } catch (readError) {
      // Handle decoding errors specifically
      if (readError.message?.includes('out of bounds') || 
          readError.message?.includes('Position') ||
          readError.message?.includes('decoding') ||
          readError.message?.includes('overflow') ||
          readError.message?.includes('invalid')) {
        logger.warn(`Market ${marketId} has corrupted/invalid data, skipping: ${readError.message}`);
        return null;
      }
      throw readError; // Re-throw other errors for retry logic
    }
    
    // Validate raw market data
    if (!rawMarket) {
      logger.warn(`Market ${marketId} returned null/undefined data`);
      return null;
    }
    
    const market = parseMarketArray(rawMarket);
    
    // Validate parsed market data
    if (!market || typeof market !== 'object') {
      logger.warn(`Market ${marketId} parsed to invalid data: ${market}`);
      return null;
    }
    
    logger.info(`Raw market ${marketId} data:`, JSON.stringify(market, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    ));

    const startTime = Number(market.startTime);
    
    if (startTime === 0) {
      logger.warn(`Market ${marketId} slot is empty (startTime=0) in proxy`);
      return null;
    }

    const marketType = Number(market.marketType);
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

    const rawEndTime = Number(market.endTime);
    const rawStartTime = Number(market.startTime);
    const now = Math.floor(Date.now() / 1000);
    
    let validEndTime = rawEndTime;
    if (validEndTime === 0 || validEndTime <= rawStartTime) {
      validEndTime = rawStartTime + (15 * 60);
      logger.warn(`Market ${marketId} has invalid endTime (${rawEndTime}), using calculated endTime: ${validEndTime}`);
    }

    const baseMarket = {
      id: marketId,
      marketType,
      asset: market.asset || 'BTC',
      startTime: rawStartTime * 1000,
      endTime: validEndTime * 1000,
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
      useTimeDecay: market.useTimeDecay || false,
      decayStartTime: market.decayStartTime ? Number(market.decayStartTime) * 1000 : rawStartTime * 1000,
      minMultiplier: market.minMultiplier ? Number(market.minMultiplier) : 120,
      name: getCoinName(market.asset || 'BTC'),
      color: getCoinColor(market.asset || 'BTC'),
      status: market.resolved ? 'resolved' : 'active',
      contractSource: 'proxy',
      contractAddress: PROXY_CONTRACT_ADDRESS,
    };

    // Fetch type-specific data from proxy
    const contract = { address: PROXY_CONTRACT_ADDRESS, abi: PREDICTION_MARKET_PROXY_ABI };
    
    if (marketType === 1) {
      baseMarket.options = await fetchMultiChoiceOptions(publicClient, marketId, contract);
      baseMarket.multipliers = await fetchMultipliers(publicClient, marketId, contract);
    } else if (marketType === 2) {
      const rangeData = await fetchRangeData(publicClient, marketId, contract);
      baseMarket.ranges = rangeData.ranges;
      baseMarket.multipliers = await fetchMultipliers(publicClient, marketId, contract);
    } else if (marketType === 3) {
      const timeData = await fetchTimeData(publicClient, marketId, contract);
      baseMarket.targetPrice = timeData.targetPrice;
      baseMarket.timeframes = timeData.timeframes;
      baseMarket.multipliers = await fetchMultipliers(publicClient, marketId, contract);
    } else {
      baseMarket.multipliers = [baseMarket.yesMultiplier, baseMarket.noMultiplier];
    }

    return baseMarket;

  } catch (error) {
    logger.error(`Error reading market ${marketId}:`, error);
    
    // Handle specific decoding/contract errors
    if (error.message?.includes('out of bounds') || 
        error.message?.includes('Position') ||
        error.message?.includes('decoding') ||
        error.message?.includes('overflow') ||
        error.message?.includes('invalid') ||
        error.message?.includes('reverted')) {
      logger.warn(`Market ${marketId} not found or has invalid data in proxy: ${error.message}`);
      return null;
    }

    // Retry on transient errors
    if (retryCount < MAX_RETRIES && (
      error.message?.includes('timeout') ||
      error.message?.includes('rate limit') ||
      error.message?.includes('503') ||
      error.message?.includes('network') ||
      error.message?.includes('connection')
    )) {
      logger.info(`Retrying market ${marketId} fetch (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return fetchSingleMarketFromProxy(publicClient, marketId, retryCount + 1);
    }
    
    logger.warn(`Failed to fetch market ${marketId}:`, error.message);
    return null;
  }
}



/**
 * Parse market array from contract into structured object
 * Defensive parsing to handle corrupted or partial data
 */
function parseMarketArray(marketArray) {
  // If not an array, return as-is if it's already an object
  if (!Array.isArray(marketArray)) {
    if (typeof marketArray === 'object' && marketArray !== null) {
      return marketArray;
    }
    logger.warn('parseMarketArray received invalid input:', marketArray);
    return null;
  }
  
  // Validate array has minimum required fields
  if (marketArray.length < 4) {
    logger.warn(`Market array has insufficient fields: ${marketArray.length} fields`);
    return null;
  }
  
  // Safely extract values with defaults for missing fields
  const safeBigInt = (val) => {
    if (val === undefined || val === null) return 0n;
    try {
      return BigInt(val);
    } catch (e) {
      return 0n;
    }
  };
  
  const safeNumber = (val) => {
    if (val === undefined || val === null) return 0;
    try {
      return Number(val);
    } catch (e) {
      return 0;
    }
  };
  
  const safeBool = (val) => {
    if (val === undefined || val === null) return false;
    return Boolean(val);
  };
  
  const safeString = (val) => {
    if (val === undefined || val === null) return '';
    try {
      return String(val);
    } catch (e) {
      return '';
    }
  };
  
  return {
    id: safeBigInt(marketArray[0]),
    marketType: safeNumber(marketArray[1]),
    asset: safeString(marketArray[2]),
    startTime: safeBigInt(marketArray[3]),
    endTime: safeBigInt(marketArray[4]),
    startPrice: safeBigInt(marketArray[5]),
    endPrice: safeBigInt(marketArray[6]),
    yesPool: safeBigInt(marketArray[7]),
    noPool: safeBigInt(marketArray[8]),
    resolved: safeBool(marketArray[9]),
    priceWentUp: safeBool(marketArray[10]),
    totalBets: safeBigInt(marketArray[11]),
    useFixedOdds: safeBool(marketArray[12]),
    yesMultiplier: safeBigInt(marketArray[13]),
    noMultiplier: safeBigInt(marketArray[14]),
    protocolFee: safeBigInt(marketArray[15]),
    useTimeDecay: safeBool(marketArray[16]),
    decayStartTime: safeBigInt(marketArray[17]),
    minMultiplier: safeBigInt(marketArray[18])
  };
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
    'LINK': 'Chainlink',
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
    'LINK': 'from-blue-400 to-green-400',
  };
  return colors[asset] || 'from-gray-500 to-gray-700';
}

// Export helper for other hooks
export { getContractForMarketType };

export default useMarkets;
