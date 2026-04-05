import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, parseAbiItem } from 'viem';
import { PROXY_ADDRESS, DURATIONS, BATCH } from '../utils/constants';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';
import { createLogger } from '../utils/logger';
import { calculateMarketPercentages, calculateFixedOddsPercentage } from '../marketUtils';

const logger = createLogger('useMarkets');

const PROXY_CONTRACT_ADDRESS = PROXY_ADDRESS;

function getContractForMarketType(marketType) {
  return {
    address: PROXY_CONTRACT_ADDRESS,
    abi: PREDICTION_MARKET_PROXY_ABI,
    source: 'proxy'
  };
}

export function useMarkets() {
  const publicClient = usePublicClient();
  const [markets, setMarkets]   = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState(null);

  /**
   * FIX 1: `markets.length` removed from `fetchMarkets` dependency array.
   *
   * Previously: fetchMarkets read markets.length from its closure to decide
   * whether to show the loading spinner. That put markets.length in the deps
   * array, which meant every setMarkets() call created a new fetchMarkets
   * callback, which triggered the useEffect, which tore down and rebuilt the
   * 30-second polling interval. The interval never fired reliably.
   *
   * Fix: track "has loaded at least once" in a ref. fetchMarkets no longer
   * needs to read markets state at all, so markets.length leaves the deps.
   */
  const hasLoadedOnce = useRef(false);

  const fetchMarkets = useCallback(async (force = false) => {
    if (!publicClient || !PROXY_CONTRACT_ADDRESS) {
      logger.warn('Missing publicClient or proxy address');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Show spinner on first load or forced refresh
      // FIX 1: use ref instead of markets.length
      if (!hasLoadedOnce.current || force) {
        setIsLoading(true);
      }

      logger.info(`Fetching markets from proxy contract... (force: ${force})`);

      const proxyCounter = await publicClient.readContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'marketCounter'
      }).catch(() => 0n);

      const proxyTotal = Number(proxyCounter);
      logger.info(`Market counter: ${proxyTotal} from Proxy`);

      const proxyMarkets = await fetchMarketsFromProxy(publicClient, 0, proxyTotal);
      const allMarkets = proxyMarkets.sort((a, b) => b.endTime - a.endTime);

      hasLoadedOnce.current = true;
      setMarkets(allMarkets);
      setIsLoading(false);

      logger.info(`Successfully fetched ${allMarkets.length} markets from proxy`);
    } catch (err) {
      logger.error('Failed to fetch markets:', err);
      setError(err.message || 'Failed to fetch markets');
      setIsLoading(false);
    }
  // FIX 1: markets.length removed — only stable deps remain
  }, [publicClient]);

  // FIX 3: fetchMarketsFromProxy moved outside the hook body (below) so it
  // isn't recreated on every render. It only uses module-level constants.

  // Fetch on mount; poll every REFRESH_INTERVAL
  // FIX 1: because fetchMarkets is now stable (no markets.length dep), this
  // effect only runs once on mount. The interval fires reliably without being
  // torn down and rebuilt on every successful fetch.
  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, DURATIONS.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  const { liveMarkets, expiredMarkets } = useMemo(() => {
    const now = Date.now();
    const live    = [];
    const expired = [];

    for (const market of markets) {
      // endTime is stored in ms (see fetchSingleMarketFromProxy: validEndTime * 1000)
      const endTime = Number(market.endTime);
      if (market.resolved || endTime <= now) {
        expired.push(market);
      } else {
        live.push(market);
      }
    }

    return {
      liveMarkets:    live.sort((a, b) => a.endTime - b.endTime),
      expiredMarkets: expired.sort((a, b) => b.endTime - a.endTime),
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

// ── Module-level helpers (not recreated on render) ────────────────────────

/**
 * FIX 3: Moved outside the hook — was previously defined inside useMarkets,
 * meaning a new function reference was created on every render.
 */
async function fetchMarketsFromProxy(publicClient, startIndex, totalCount) {
  if (totalCount === 0) return [];

  logger.info(`Fetching ${totalCount} markets from proxy at ${PROXY_CONTRACT_ADDRESS}`);

  const validMarkets = [];
  const batchSize = BATCH.MARKET_BATCH_SIZE;

  for (let batchStart = startIndex; batchStart < totalCount; batchStart += batchSize) {
    const batchEnd     = Math.min(batchStart + batchSize, totalCount);
    const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, i) => batchStart + i);

    try {
      const batchResults = await Promise.all(
        batchIndices.map(i => fetchSingleMarketFromProxy(publicClient, i))
      );
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
      if (
        readError.message?.includes('out of bounds') ||
        readError.message?.includes('Position') ||
        readError.message?.includes('decoding') ||
        readError.message?.includes('overflow') ||
        readError.message?.includes('invalid')
      ) {
        logger.warn(`Market ${marketId} has corrupted/invalid data, skipping: ${readError.message}`);
        return null;
      }
      throw readError;
    }

    if (!rawMarket) {
      logger.warn(`Market ${marketId} returned null/undefined data`);
      return null;
    }

    const market = parseMarketArray(rawMarket);

    if (!market || typeof market !== 'object') {
      logger.warn(`Market ${marketId} parsed to invalid data`);
      return null;
    }

    const startTime = Number(market.startTime);
    if (startTime === 0) {
      logger.warn(`Market ${marketId} slot is empty (startTime=0) in proxy`);
      return null;
    }

    const marketType    = Number(market.marketType);
    const yesPool       = market.yesPool ? Number(formatUnits(market.yesPool, 6)) : 0;
    const noPool        = market.noPool  ? Number(formatUnits(market.noPool, 6))  : 0;
    const useFixedOdds  = market.useFixedOdds  || false;
    const yesMultiplier = market.yesMultiplier ? Number(market.yesMultiplier) : 0;
    const noMultiplier  = market.noMultiplier  ? Number(market.noMultiplier)  : 0;

    let yesPrice, noPrice;
    if (useFixedOdds && yesMultiplier > 0 && noMultiplier > 0) {
      yesPrice = calculateFixedOddsPercentage(yesMultiplier / 100) / 100;
      noPrice  = calculateFixedOddsPercentage(noMultiplier  / 100) / 100;
    } else {
      const { upPercentage, downPercentage } = calculateMarketPercentages(yesPool, noPool);
      yesPrice = upPercentage   / 100;
      noPrice  = downPercentage / 100;
    }

    const rawEndTime   = Number(market.endTime);
    const rawStartTime = Number(market.startTime);

    let validEndTime = rawEndTime;
    if (validEndTime === 0 || validEndTime <= rawStartTime) {
      validEndTime = rawStartTime + (15 * 60);
      logger.warn(`Market ${marketId} has invalid endTime (${rawEndTime}), using calculated: ${validEndTime}`);
    }

    const baseMarket = {
      id:           marketId,
      marketType,
      asset:        market.asset || 'BTC',
      startTime:    rawStartTime  * 1000,  // stored as ms
      endTime:      validEndTime  * 1000,  // stored as ms
      startPrice:   market.startPrice ? Number(formatUnits(market.startPrice, 8)) : 0,
      endPrice:     market.endPrice   ? Number(formatUnits(market.endPrice,   8)) : 0,
      yesPool,
      noPool,
      yesPrice,
      noPrice,
      resolved:     market.resolved   || false,
      priceWentUp:  market.priceWentUp || false,
      totalBets:    Number(market.totalBets) || 0,
      useFixedOdds,
      yesMultiplier,
      noMultiplier,
      protocolFee:  market.protocolFee ? Number(market.protocolFee) : 0,
      winningChoice: market.winningChoice !== undefined ? Number(market.winningChoice) : null,
      useTimeDecay:  market.useTimeDecay  || false,
      decayStartTime: market.decayStartTime ? Number(market.decayStartTime) * 1000 : rawStartTime * 1000,
      minMultiplier:  market.minMultiplier  ? Number(market.minMultiplier)  : 120,
      name:           getCoinName(market.asset  || 'BTC'),
      color:          getCoinColor(market.asset || 'BTC'),
      status:         market.resolved ? 'resolved' : 'active',
      contractSource: 'proxy',
      contractAddress: PROXY_CONTRACT_ADDRESS,
    };

    if (baseMarket.resolved) {
      try {
        // Try single call first
        let resolvedLogs = [];
        try {
          resolvedLogs = await publicClient.getLogs({
            address: PROXY_CONTRACT_ADDRESS,
            event: parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee)'),
            args: { marketId: BigInt(marketId) },
            fromBlock: 'earliest',
            toBlock: 'latest',
          });
        } catch (rangeErr) {
          // RPC block range limit — fall back to chunks
          const currentBlock = await publicClient.getBlockNumber();
          const CHUNK_SIZE = 49999n;
          const totalBlocks = 490000n;
          const fromBlock = currentBlock > totalBlocks ? currentBlock - totalBlocks : 0n;
          for (let from = fromBlock; from < currentBlock; from += CHUNK_SIZE) {
            const to = from + CHUNK_SIZE > currentBlock ? currentBlock : from + CHUNK_SIZE;
            try {
              const chunk = await publicClient.getLogs({
                address: PROXY_CONTRACT_ADDRESS,
                event: parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee)'),
                args: { marketId: BigInt(marketId) },
                fromBlock: from,
                toBlock: to,
              });
              if (chunk.length > 0) { resolvedLogs = chunk; break; }
            } catch { /* skip chunk */ }
          }
        }
        if (resolvedLogs.length > 0) {
          baseMarket.winningChoice = Number(resolvedLogs[0].args.winningChoice);
        }
      } catch (e) {
        logger.warn(`Failed to fetch MarketResolved for market ${marketId}:`, e.message);
      }
    }

    const contract = { address: PROXY_CONTRACT_ADDRESS, abi: PREDICTION_MARKET_PROXY_ABI };

    if (marketType === 1) {
      baseMarket.options    = await fetchMultiChoiceOptions(publicClient, marketId, contract);
      baseMarket.multipliers = await fetchMultipliers(publicClient, marketId, contract);
    } else if (marketType === 2) {
      const rangeData       = await fetchRangeData(publicClient, marketId, contract);
      baseMarket.ranges     = rangeData.ranges;
      baseMarket.multipliers = await fetchMultipliers(publicClient, marketId, contract);
    } else if (marketType === 3) {
      const timeData        = await fetchTimeData(publicClient, marketId, contract);
      baseMarket.targetPrice = timeData.targetPrice;
      baseMarket.timeframes  = timeData.timeframes;
      baseMarket.multipliers = await fetchMultipliers(publicClient, marketId, contract);
    } else {
      baseMarket.multipliers = [baseMarket.yesMultiplier, baseMarket.noMultiplier];
    }

    // Fetch real total pool for advanced markets
    if (marketType !== 0) {
      try {
        const rawTotal = await publicClient.readContract({
          address: PROXY_CONTRACT_ADDRESS,
          abi: PREDICTION_MARKET_PROXY_ABI,
          functionName: 'getTotalPool',
          args: [BigInt(marketId)]
        });
        baseMarket.yesPool = Number(formatUnits(rawTotal, 6));
        baseMarket.noPool  = 0;
      } catch (e) {
        logger.warn(`Failed to fetch total pool for market ${marketId}:`, e.message);
      }
    }
    if (marketType !== 0) {
      try {
        const totalPool = await publicClient.readContract({
          address: PROXY_CONTRACT_ADDRESS,
          abi: [{ name: 'getTotalPool', type: 'function', stateMutability: 'view', inputs: [{ name: 'marketId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] }],
          functionName: 'getTotalPool',
          args: [BigInt(marketId)]
        });
        baseMarket.yesPool = Number(formatUnits(totalPool, 6));
        baseMarket.noPool  = 0;
      } catch { /* leave as 0 */ }
    }

    return baseMarket;
  } catch (error) {
    logger.error(`Error reading market ${marketId}:`, error);

    if (
      error.message?.includes('out of bounds') ||
      error.message?.includes('Position') ||
      error.message?.includes('decoding') ||
      error.message?.includes('overflow') ||
      error.message?.includes('invalid') ||
      error.message?.includes('reverted')
    ) {
      logger.warn(`Market ${marketId} not found or has invalid data: ${error.message}`);
      return null;
    }

    if (retryCount < MAX_RETRIES && (
      error.message?.includes('timeout') ||
      error.message?.includes('rate limit') ||
      error.message?.includes('503') ||
      error.message?.includes('network') ||
      error.message?.includes('connection')
    )) {
      logger.info(`Retrying market ${marketId} (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return fetchSingleMarketFromProxy(publicClient, marketId, retryCount + 1);
    }

    return null;
  }
}

function parseMarketArray(marketArray) {
  if (!Array.isArray(marketArray)) {
    return typeof marketArray === 'object' && marketArray !== null ? marketArray : null;
  }
  if (marketArray.length < 4) return null;

  const safeBigInt = (val) => { try { return BigInt(val ?? 0); } catch { return 0n; } };
  const safeNumber = (val) => { try { return Number(val ?? 0); } catch { return 0; } };
  const safeBool   = (val) => Boolean(val);
  const safeString = (val) => { try { return String(val ?? ''); } catch { return ''; } };

  return {
    id:            safeBigInt(marketArray[0]),
    marketType:    safeNumber(marketArray[1]),
    asset:         safeString(marketArray[2]),
    startTime:     safeBigInt(marketArray[3]),
    endTime:       safeBigInt(marketArray[4]),
    startPrice:    safeBigInt(marketArray[5]),
    endPrice:      safeBigInt(marketArray[6]),
    yesPool:       safeBigInt(marketArray[7]),
    noPool:        safeBigInt(marketArray[8]),
    resolved:      safeBool(marketArray[9]),
    priceWentUp:   safeBool(marketArray[10]),
    totalBets:     safeBigInt(marketArray[11]),
    useFixedOdds:  safeBool(marketArray[12]),
    yesMultiplier: safeBigInt(marketArray[13]),
    noMultiplier:  safeBigInt(marketArray[14]),
    protocolFee:   safeBigInt(marketArray[15]),
    useTimeDecay:  safeBool(marketArray[16]),
    decayStartTime: safeBigInt(marketArray[17]),
    minMultiplier:  safeBigInt(marketArray[18]),
  };
}

async function fetchMultiChoiceOptions(publicClient, marketId, contract) {
  try {
    const options = await publicClient.readContract({
      ...contract, functionName: 'getMultiChoiceOptions', args: [BigInt(marketId)]
    });
    return options || [];
  } catch (error) {
    logger.warn(`Failed to fetch options for market ${marketId}:`, error.message);
    return [];
  }
}

async function fetchRangeData(publicClient, marketId, contract) {
  try {
    const data = await publicClient.readContract({
      ...contract, functionName: 'getRangeMarketData', args: [BigInt(marketId)]
    });
    const mins = data.mins || data[0] || [];
    const maxs = data.maxs || data[1] || [];
    return {
      ranges: mins.map((min, idx) => ({
        min: Number(formatUnits(min, 8)),
        max: Number(formatUnits(maxs[idx], 8)),
      }))
    };
  } catch (error) {
    logger.warn(`Failed to fetch range data for market ${marketId}:`, error.message);
    return { ranges: [] };
  }
}

async function fetchTimeData(publicClient, marketId, contract) {
  try {
    const data = await publicClient.readContract({
      ...contract, functionName: 'getTimeMarketData', args: [BigInt(marketId)]
    });
    const targetPrice      = data.targetPrice || data[0];
    const timeframeSeconds = data.timeframes  || data[1] || [];
    return {
      targetPrice: Number(formatUnits(targetPrice, 8)),
      timeframes: timeframeSeconds.map(s => ({
        label: formatTimeframeLabel(Number(s)),
        seconds: Number(s),
      }))
    };
  } catch (error) {
    logger.warn(`Failed to fetch time data for market ${marketId}:`, error.message);
    return { targetPrice: 0, timeframes: [] };
  }
}

async function fetchMultipliers(publicClient, marketId, contract) {
  try {
    const multipliers = await publicClient.readContract({
      ...contract, functionName: 'getCurrentOdds', args: [BigInt(marketId)]
    });
    return (multipliers || []).map(m => Number(m));
  } catch (error) {
    if (
      error.message?.includes('Not a binary market') ||
      error.shortMessage?.includes('Not a binary market')
    ) {
      logger.warn(`Skipping getCurrentOdds for non-binary market ${marketId}`);
      return [];
    }
    logger.warn(`Failed to fetch multipliers for market ${marketId}:`, error.message);
    return [];
  }
}

function formatTimeframeLabel(seconds) {
  const days    = Math.floor(seconds / 86400);
  const hours   = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0)    return `${days}d`;
  if (hours > 0)   return `${hours}h`;
  return `${minutes}m`;
}

function getCoinName(asset) {
  return { BTC: 'Bitcoin', ETH: 'Ethereum', LINK: 'Chainlink' }[asset] || asset;
}

function getCoinColor(asset) {
  return {
    BTC:  'from-orange-500 to-yellow-500',
    ETH:  'from-blue-500 to-purple-500',
    LINK: 'from-blue-400 to-green-400',
  }[asset] || 'from-gray-500 to-gray-700';
}

export { getContractForMarketType };
export default useMarkets;