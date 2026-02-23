import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS, PROXY_ADDRESS } from '../utils/constants';
import { 
  PREDICTION_MARKET_CORE_ABI, 
  PREDICTION_MARKET_TYPES_ABI,
  PREDICTION_MARKET_ABI
} from '../contracts/abis';

// Use actual Core contract address for reading markets (markets stored there)
// Use PROXY only for new operations that need shared storage
const CORE_CONTRACT_ADDRESS = CONTRACTS.PREDICTION_MARKET_CORE || PROXY_ADDRESS;
const TYPES_CONTRACT_ADDRESS = CONTRACTS.PREDICTION_MARKET_TYPES || PROXY_ADDRESS;


import { DURATIONS, TIME, PRICE, BATCH } from '../utils/constants';

import { createLogger } from '../utils/logger';
import { calculateMarketPercentages, calculateFixedOddsPercentage } from '../marketUtils';

const logger = createLogger('useMarkets');

/**
 * Helper to get contract info based on market type
 * CRITICAL FIX: Read from actual contract addresses where markets are stored
 * Proxy pattern has isolated storage - reading from proxy returns empty data
 * Binary markets (type 0) -> Uses Core contract directly
 * Multi/Range/Time markets (types 1-3) -> Uses Types contract directly
 */
function getContractForMarketType(marketType) {
  // Read from actual contract addresses (not proxy) where markets are stored
  if (marketType === 0) {
    return {
      address: CORE_CONTRACT_ADDRESS,
      abi: PREDICTION_MARKET_CORE_ABI,
      source: 'core'
    };
  }
  return {
    address: TYPES_CONTRACT_ADDRESS,
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

  const fetchMarkets = useCallback(async (force = false) => {
    if (!publicClient || !PROXY_ADDRESS) {
      logger.warn('Missing publicClient or proxy address');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Only show loading on initial fetch or when forced
      if (markets.length === 0 || force) {
        setIsLoading(true);
      }

      logger.info(`Fetching markets from actual contract addresses... (force: ${force})`);
      
      // CRITICAL FIX: Read from actual contract addresses where markets are stored
      // Proxy has isolated storage - markets created directly on Core are NOT in Proxy storage
      const [coreCounter, typesCounter, legacyCounter] = await Promise.all([
        publicClient.readContract({
          address: CORE_CONTRACT_ADDRESS,
          abi: PREDICTION_MARKET_CORE_ABI,
          functionName: 'marketCounter'
        }).catch(() => 0n),
        publicClient.readContract({
          address: TYPES_CONTRACT_ADDRESS,
          abi: PREDICTION_MARKET_TYPES_ABI,
          functionName: 'marketCounter'
        }).catch(() => 0n),
        publicClient.readContract({
          address: CONTRACTS.PREDICTION_MARKET,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'marketCounter'
        }).catch(() => 0n)
      ]);


      const coreTotal = Number(coreCounter);
      const typesTotal = Number(typesCounter);
      const legacyTotal = Number(legacyCounter);
      logger.info(`Market counters: ${coreTotal} from Core (via Proxy), ${typesTotal} from Types (via Proxy), ${legacyTotal} from Legacy`);

      // CRITICAL FIX: Fetch from actual contract addresses where markets are stored
      const [coreMarkets, typesMarkets, legacyMarkets] = await Promise.all([
        fetchMarketsFromContract(publicClient, 0, coreTotal, 'core'),
        fetchMarketsFromContract(publicClient, 0, typesTotal, 'types'),
        legacyTotal > 0 ? fetchMarketsFromLegacyContract(publicClient, 0, legacyTotal) : []
      ]);



      // Combine and sort by end time (newest first)
      const allMarkets = [...coreMarkets, ...typesMarkets, ...legacyMarkets].sort((a, b) => b.endTime - a.endTime);

      
      setMarkets(allMarkets);
      setIsLoading(false);
      
      logger.info(`Successfully fetched ${allMarkets.length} markets (${coreMarkets.length} core, ${typesMarkets.length} types, ${legacyMarkets.length} legacy)`);

    } catch (err) {
      logger.error('Failed to fetch markets:', err);
      setError(err.message || 'Failed to fetch markets');
      setIsLoading(false);
    }
  }, [publicClient]);


  /**
   * Fetch markets from a specific contract via PROXY
   */
  async function fetchMarketsFromContract(publicClient, startIndex, totalCount, contractType) {
    if (totalCount === 0) return [];
   
    // CRITICAL FIX: Use actual contract addresses (not proxy) where markets are stored
    const contract = contractType === 'core' 
      ? { address: CORE_CONTRACT_ADDRESS, abi: PREDICTION_MARKET_CORE_ABI }
      : { address: TYPES_CONTRACT_ADDRESS, abi: PREDICTION_MARKET_TYPES_ABI };
    
    logger.info(`Fetching ${totalCount} markets from ${contractType} at ${contract.address}`);




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

  // Force refresh function that bypasses normal refresh interval
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
 * Fetch markets from legacy contract
 */
async function fetchMarketsFromLegacyContract(publicClient, startIndex, totalCount) {
  if (totalCount === 0) return [];
  
  const contract = { 
    address: CONTRACTS.PREDICTION_MARKET, 
    abi: PREDICTION_MARKET_ABI 
  };
  
  const validMarkets = [];
  const batchSize = 5; // Smaller batch for legacy
  
  for (let batchStart = startIndex; batchStart < totalCount; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalCount);
    const batchIndices = Array.from(
      { length: batchEnd - batchStart }, 
      (_, i) => batchStart + i
    );
    
    try {
      const batchPromises = batchIndices.map(i => 
        fetchSingleLegacyMarket(publicClient, i, contract)
      );
      const batchResults = await Promise.all(batchPromises);
      validMarkets.push(...batchResults.filter(m => m !== null));
      
      if (batchEnd < totalCount) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      logger.error(`Error fetching legacy batch ${batchStart}-${batchEnd}:`, err);
    }
  }
  
  logger.info(`Fetched ${validMarkets.length} markets from legacy contract`);
  return validMarkets;
}

/**
 * Fetch a single market from legacy contract
 */
async function fetchSingleLegacyMarket(publicClient, marketId, contract) {
  try {
    logger.info(`Fetching legacy market ${marketId} from ${contract.address}`);
    
    // Legacy contract uses getMarket function
    const rawMarket = await publicClient.readContract({
      address: contract.address,
      abi: contract.abi,
      functionName: 'getMarket',
      args: [BigInt(marketId)]
    });
    
    // Parse array into structured object
    const market = parseMarketArray(rawMarket);
    
    if (!market || market.id === undefined || market.id === 0n) {
      logger.warn(`Legacy market ${marketId} not found or empty`);
      return null;
    }

    
    // Process legacy market data
    const yesPool = market.yesPool ? Number(formatUnits(market.yesPool, 6)) : 0;
    const noPool = market.noPool ? Number(formatUnits(market.noPool, 6)) : 0;
    const { upPercentage, downPercentage } = calculateMarketPercentages(yesPool, noPool);
    
    const rawEndTime = Number(market.endTime);
    const rawStartTime = Number(market.startTime);
    let validEndTime = rawEndTime;
    if (validEndTime === 0 || validEndTime <= rawStartTime) {
      validEndTime = rawStartTime + (15 * 60);
    }
    
    return {
      id: marketId,
      marketType: Number(market.marketType) || 0,
      asset: market.asset || 'BTC',
      startTime: rawStartTime * 1000,
      endTime: validEndTime * 1000,
      startPrice: market.startPrice ? Number(formatUnits(market.startPrice, 8)) : 0,
      endPrice: market.endPrice ? Number(formatUnits(market.endPrice, 8)) : 0,
      yesPool,
      noPool,
      yesPrice: upPercentage / 100,
      noPrice: downPercentage / 100,
      resolved: market.resolved || false,
      priceWentUp: market.priceWentUp || false,
      totalBets: Number(market.totalBets) || 0,
      useFixedOdds: market.useFixedOdds || false,
      yesMultiplier: market.yesMultiplier ? Number(market.yesMultiplier) : 0,
      noMultiplier: market.noMultiplier ? Number(market.noMultiplier) : 0,
      protocolFee: market.protocolFee ? Number(market.protocolFee) : 0,
      winningChoice: market.winningChoice !== undefined ? Number(market.winningChoice) : null,
      useTimeDecay: market.useTimeDecay || false,
      decayStartTime: market.decayStartTime ? Number(market.decayStartTime) * 1000 : rawStartTime * 1000,
      minMultiplier: market.minMultiplier ? Number(market.minMultiplier) : 120,
      name: getCoinName(market.asset || 'BTC'),
      color: getCoinColor(market.asset || 'BTC'),
      status: market.resolved ? 'resolved' : 'active',
      contractSource: 'legacy',
      contractAddress: contract.address,
      multipliers: [market.yesMultiplier ? Number(market.yesMultiplier) : 0, market.noMultiplier ? Number(market.noMultiplier) : 0]
    };
  } catch (error) {
    logger.warn(`Failed to fetch legacy market ${marketId}:`, error.message);
    return null;
  }
}

/**
 * Parse market array from contract into structured object
 * Contract returns array, we need to map it to object with named properties
 */
function parseMarketArray(marketArray) {
  if (!Array.isArray(marketArray)) {
    // Already an object (some providers may return objects)
    return marketArray;
  }
  
  // Map array indices to struct field names based on PredictionMarketBase.sol Market struct
  return {
    id: marketArray[0],
    marketType: marketArray[1],
    asset: marketArray[2],
    startTime: marketArray[3],
    endTime: marketArray[4],
    startPrice: marketArray[5],
    endPrice: marketArray[6],
    yesPool: marketArray[7],
    noPool: marketArray[8],
    resolved: marketArray[9],
    priceWentUp: marketArray[10],
    totalBets: marketArray[11],
    useFixedOdds: marketArray[12],
    yesMultiplier: marketArray[13],
    noMultiplier: marketArray[14],
    protocolFee: marketArray[15],
    useTimeDecay: marketArray[16],
    decayStartTime: marketArray[17],
    minMultiplier: marketArray[18]
  };
}

/**
 * Fetch a single market with all its data
 * Includes retry logic for better reliability
 */
async function fetchSingleMarket(publicClient, marketId, contract, contractType, retryCount = 0) {

  const MAX_RETRIES = 2;
  
  try {
    // Step 1: Get base market data
    // Note: Contract uses 'markets' mapping, not 'getMarket' function
    let market;
    try {
      logger.info(`Fetching market ${marketId} from ${contractType} contract at ${contract.address}`);
      
      const rawMarket = await publicClient.readContract({
        address: contract.address,
        abi: contract.abi,
        functionName: 'markets',
        args: [BigInt(marketId)]
      });
      
      // Parse array into structured object
      market = parseMarketArray(rawMarket);
      
      logger.info(`Raw market ${marketId} data:`, JSON.stringify(market, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));
    } catch (contractError) {
      logger.error(`Error fetching market ${marketId}:`, contractError.message);
      
      // Handle ABI decoding errors - market likely doesn't exist or has corrupted data
      if (contractError.message?.includes('out of bounds') || 
          contractError.message?.includes('Position') ||
          contractError.message?.includes('decoding')) {
        logger.warn(`Market ${marketId} not found or has invalid data in ${contractType} contract`);
        return null;
      }
      
      // Retry on transient errors
      if (retryCount < MAX_RETRIES && (
        contractError.message?.includes('timeout') ||
        contractError.message?.includes('rate limit') ||
        contractError.message?.includes('503')
      )) {
        logger.info(`Retrying market ${marketId} fetch (attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return fetchSingleMarket(publicClient, marketId, contract, contractType, retryCount + 1);
      }
      
      throw contractError;
    }

    // Validate market exists - check if market has valid data
    // A valid market should have startTime > 0 (markets are initialized with block timestamp)
    const marketIdFromContract = market.id;
    const startTime = Number(market.startTime);
    
    logger.info(`Market ${marketId} data: id=${marketIdFromContract}, startTime=${startTime}`);
    
    // If startTime is 0, the market slot is empty/uninitialized
    if (startTime === 0) {
      logger.warn(`Market ${marketId} slot is empty (startTime=0) in ${contractType} contract`);
      return null;
    }





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

    // Ensure endTime is valid - if it's 0 or in the past, set a reasonable default
    const rawEndTime = Number(market.endTime);
    const rawStartTime = Number(market.startTime);
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    
    // If endTime is 0 or invalid, calculate from startTime + default duration (15 minutes)
    let validEndTime = rawEndTime;
    if (validEndTime === 0 || validEndTime <= rawStartTime) {
      validEndTime = rawStartTime + (15 * 60); // 15 minutes default
      logger.warn(`Market ${marketId} has invalid endTime (${rawEndTime}), using calculated endTime: ${validEndTime}`);
    }

    // Step 2: Prepare base market object
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
      
      // Time decay fields - CRITICAL for decay calculations
      useTimeDecay: market.useTimeDecay || false,
      decayStartTime: market.decayStartTime ? Number(market.decayStartTime) * 1000 : rawStartTime * 1000,
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


export default useMarkets;
