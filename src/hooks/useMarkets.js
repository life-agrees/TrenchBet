import { useState, useEffect, useCallback, useMemo } from 'react';
import { useReadContract, useBlockNumber } from 'wagmi';
import { multicall, readContract } from 'wagmi/actions';
import { CONTRACTS, config } from '../config/wagmi';
import { PREDICTION_MARKET_ABI } from '../contracts/abis';
import { DURATIONS, TIME, PRICE, BATCH } from '../utils/constants';
import { createLogger } from '../utils/logger';
import { calculateMarketPercentages, calculateFixedOddsPercentage } from '../marketUtils';



const logger = createLogger('useMarkets');

/**
 * Unified hook to fetch and manage markets from the smart contract
 * Includes live/expired filtering, auto-refresh, and error handling
 */
export function useMarkets() {
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current block number to trigger refresh
  const { data: blockNumber } = useBlockNumber({ watch: true });

  // Fetch market counter to know how many markets exist
  const { data: marketCounter, isError: isCounterError } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'marketCounter',
    watch: true,
  });

  // Fetch markets when counter or block changes
  const fetchMarkets = useCallback(async () => {
    if (!marketCounter || !CONTRACTS.PREDICTION_MARKET) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const count = Number(marketCounter);
      
      if (count === 0) {
        setMarkets([]);
        setIsLoading(false);
        return;
      }

      // Use multicall to batch requests for better performance
      const startIndex = Math.max(0, count - 50);
      const batchSize = BATCH.MARKET_BATCH_SIZE;
      const validMarkets = [];
      
      // Process in batches to avoid overwhelming the RPC
      for (let batchStart = startIndex; batchStart < count; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, count);
        const batchIndices = Array.from(
          { length: batchEnd - batchStart }, 
          (_, i) => batchStart + i
        );
        
        try {
          const batchResults = await multicall(config, {
            contracts: batchIndices.map(i => ({
              address: CONTRACTS.PREDICTION_MARKET,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'getMarket',
              args: [BigInt(i)],
            })),
          });
          
          // Process batch results
          const batchMarkets = await Promise.all(
            batchResults.map((result, idx) => {
              if (result.status === 'success' && result.result) {
                return processMarketData(batchIndices[idx], result.result);
              }
              return null;
            })
          );
          
          validMarkets.push(...batchMarkets.filter(m => m !== null));
          
          // Small delay between batches to be nice to the RPC
          if (batchEnd < count) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          logger.error(`Error fetching batch ${batchStart}-${batchEnd}:`, err);
          // Continue with next batch instead of failing entirely
        }
      }


      setMarkets(validMarkets);
      setIsLoading(false);
      
      logger.info(`Fetched ${validMarkets.length} markets`);
    } catch (err) {
      logger.error('Error fetching markets', err);
      setError(err.message || 'Failed to fetch markets');
      setIsLoading(false);
    }
  }, [marketCounter]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchMarkets();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMarkets, DURATIONS.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMarkets, blockNumber]);

  // Handle counter fetch errors
  useEffect(() => {
    if (isCounterError) {
      setError('Failed to connect to smart contract');
      setIsLoading(false);
    }
  }, [isCounterError]);

  // Calculate live and expired markets
  const { liveMarkets, expiredMarkets } = useMemo(() => {
    const now = Date.now();
    const live = [];
    const expired = [];
    
    for (const market of markets) {
      const endTime = Number(market.endTime); // Already in milliseconds
      
      if (market.resolved || endTime <= now) {
        expired.push(market);
      } else {
        live.push(market);
      }
    }
    
    return { 
      liveMarkets: live.sort((a, b) => a.endTime - b.endTime), // Sort by ending soonest
      expiredMarkets: expired.sort((a, b) => b.endTime - a.endTime) // Sort by most recent
    };
  }, [markets]);

  return {
    markets,
    liveMarkets,
    expiredMarkets,
    isLoading,
    error,
    refresh: fetchMarkets,
    refreshMarkets: fetchMarkets, // Alias for backward compatibility
  };
}

/**
 * Process raw market data from contract into usable format
 */
function processMarketData(marketId, market) {
  try {
    // Calculate yesPrice and noPrice based on market type
    const yesPool = formatUSDC(market.yesPool || 0);
    const noPool = formatUSDC(market.noPool || 0);
    const useFixedOdds = Boolean(market.useFixedOdds);
    const yesMultiplier = Number(market.yesMultiplier || 0);
    const noMultiplier = Number(market.noMultiplier || 0);
    
    let yesPrice, noPrice;
    
    if (useFixedOdds && yesMultiplier > 0 && noMultiplier > 0) {
      // Fixed odds: calculate implied probability from multipliers
      const yesMult = yesMultiplier / 100;
      const noMult = noMultiplier / 100;
      yesPrice = calculateFixedOddsPercentage(yesMult) / 100;
      noPrice = calculateFixedOddsPercentage(noMult) / 100;
    } else {
      // Pool-based: calculate implied probability from pool sizes
      const { upPercentage, downPercentage } = calculateMarketPercentages(yesPool, noPool);
      yesPrice = upPercentage / 100;
      noPrice = downPercentage / 100;
    }

    // Parse market data based on contract structure
    const marketData = {
      id: Number(market.id || marketId),
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
 * Fetch a single market from the contract (fallback for individual fetching)
 */
async function fetchMarket(marketId) {
  try {
    const market = await readContract(config, {
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getMarket',
      args: [BigInt(marketId)],
    });

    return processMarketData(marketId, market);
  } catch (err) {
    logger.error(`Error fetching market ${marketId}`, err);
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

export default useMarkets;
