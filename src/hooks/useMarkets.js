import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { formatUnits, parseAbiItem } from 'viem';
import { PROXY_ADDRESS, DURATIONS, BATCH } from '../utils/constants';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';
import { createLogger } from '../utils/logger';
import { calculateMarketPercentages, calculateFixedOddsPercentage, formatTimeframeLabel } from '../marketUtils';

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
  const publicClient = usePublicClient({ chainId: baseSepolia.id });
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const hasLoadedOnce = useRef(false);

  const fetchMarkets = useCallback(async (force = false) => {
    if (!publicClient || !PROXY_CONTRACT_ADDRESS) {
      logger.warn('Missing publicClient or proxy address');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      if (!hasLoadedOnce.current || force) {
        setIsLoading(true);
      }

      logger.info(`Fetching markets via marketCounter (reliable, no getLogs dependency)... (force: ${force})`);

      // ── Step 1: Read marketCounter with retry ──
      // This is a simple view call — highly reliable even on free-tier RPCs
      let proxyTotal = 0;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const proxyCounter = await publicClient.readContract({
            address: PROXY_CONTRACT_ADDRESS,
            abi: PREDICTION_MARKET_PROXY_ABI,
            functionName: 'marketCounter'
          });
          proxyTotal = Number(proxyCounter);
          break;
        } catch (err) {
          logger.warn(`marketCounter read attempt ${attempt + 1} failed: ${err.message}`);
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      logger.info(`Market counter: ${proxyTotal} from Proxy`);

      if (proxyTotal === 0) {
        // No markets exist at all — show empty state
        hasLoadedOnce.current = true;
        setMarkets([]);
        setIsLoading(false);
        return;
      }

      // ── Step 2: Build market IDs directly from counter ──
      // Scan the recent market IDs (or all if fewer exist)
      // This is the PRIMARY discovery mechanism — no getLogs required
      const MAX_SCAN = 20; // Reduced from 300 to 20 to prevent Infura limits while unauthenticated
      const scanCount = Math.min(MAX_SCAN, proxyTotal);
      const recentIds = Array.from(
        { length: scanCount },
        (_, i) => proxyTotal - 1 - i
      );
      logger.info(`Scanning last ${scanCount} market IDs (${proxyTotal - scanCount} to ${proxyTotal - 1})`);

      // ── Step 3: Fetch resolvedMap (optional enrichment — OK if it fails) ──
      const resolvedMap = {};
      // DISABLED getLogs polling to prevent Infura RPC 429 'Too Many Requests' rate-limits.
      // Market.resolved state is provided safely native via multicall instead.

      // ── Step 4: Fetch each market's data by ID via MULTICALL ──
      logger.info(`Fetching ${recentIds.length} specific markets by ID via Multicall`);
      const allMarkets = await fetchMarketsViaMulticall(publicClient, recentIds, resolvedMap);

      hasLoadedOnce.current = true;
      setMarkets(allMarkets);
      setIsLoading(false);

      logger.info(`✅ Loaded ${allMarkets.length} valid markets from ${recentIds.length} IDs (counter-based)`);
    } catch (err) {
      logger.error('Failed to fetch markets:', err);
      // Preserve existing markets on transient errors (don't blank the UI)
      if (hasLoadedOnce.current) {
        logger.info('Keeping previously loaded markets after transient error');
      }
      setError(err.message || 'Failed to fetch markets');
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, DURATIONS.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  const { liveMarkets, expiredMarkets } = useMemo(() => {
    const now = Date.now();
    const fiveMinAgo = now - (5 * 60 * 1000);
    const live = [];
    const expired = [];

    for (const market of markets) {
      const endTime = Number(market.endTime);
      if (market.resolved || endTime < fiveMinAgo) {
        expired.push(market);
      } else {
        live.push(market);
      }
    }

    return {
      liveMarkets: live.sort((a, b) => a.endTime - b.endTime),
      expiredMarkets: expired.sort((a, b) => b.endTime - a.endTime),
    };
  }, [markets]);

  const immediateRefresh = useCallback(async () => {
    logger.info('🚀 IMMEDIATE REFRESH - prioritizing newest markets');
    await fetchMarkets(true);
  }, [fetchMarkets]);

  return {
    markets,
    liveMarkets,
    expiredMarkets,
    isLoading,
    error,
    refresh: fetchMarkets,
    refreshMarkets: fetchMarkets,
    immediateRefresh,
    forceRefresh: immediateRefresh,
  };
}

async function fetchMarketsFromProxy(publicClient, startIndex, totalCount) {
  if (totalCount === 0) return [];

  // Fetch ALL MarketResolved events once — much faster than per-market
  const resolvedMap = {};
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const CHUNK_SIZE = 99999n;  // Optimized for Infura (2x faster)
    const fromBlock = currentBlock > 490000n ? currentBlock - 490000n : 0n;
    for (let from = fromBlock; from < currentBlock; from += CHUNK_SIZE) {
      const to = from + CHUNK_SIZE > currentBlock ? currentBlock : from + CHUNK_SIZE;
      try {
        const chunks = await publicClient.getLogs({
          address: PROXY_CONTRACT_ADDRESS,
          event: parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee)'),
          fromBlock: from, toBlock: to,
        });
        chunks.forEach(log => {
          resolvedMap[Number(log.args.marketId)] = Number(log.args.winningChoice);
        });
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  // Pass resolvedMap to each market fetch
  const validMarkets = [];
  const batchSize = BATCH.MARKET_BATCH_SIZE;
  for (let batchStart = startIndex; batchStart < totalCount; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalCount);
    const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, i) => batchStart + i);
    try {
      const batchResults = await Promise.all(
        batchIndices.map(i => fetchSingleMarketFromProxy(publicClient, i, 0, resolvedMap))
      );
      validMarkets.push(...batchResults.filter(m => m !== null));
    } catch (err) {
      logger.error(`Batch error:`, err);
    }
  }
  return validMarkets;
}

async function fetchSingleMarketFromProxy(publicClient, marketId, retryCount = 0, resolvedMap = {}) {
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
        logger.debug(`Market ${marketId} slot invalid (normal), skipping silently`);
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

    const marketType = Number(market.marketType);
    const yesPool = market.yesPool ? Number(formatUnits(market.yesPool, 6)) : 0;
    const noPool = market.noPool ? Number(formatUnits(market.noPool, 6)) : 0;
    const useFixedOdds = market.useFixedOdds || false;
    const yesMultiplier = market.yesMultiplier ? Number(market.yesMultiplier) : 0;
    const noMultiplier = market.noMultiplier ? Number(market.noMultiplier) : 0;

    let yesPrice, noPrice;
    if (useFixedOdds && yesMultiplier > 0 && noMultiplier > 0) {
      yesPrice = calculateFixedOddsPercentage(yesMultiplier / 100) / 100;
      noPrice = calculateFixedOddsPercentage(noMultiplier / 100) / 100;
    } else {
      const { upPercentage, downPercentage } = calculateMarketPercentages(yesPool, noPool);
      yesPrice = upPercentage / 100;
      noPrice = downPercentage / 100;
    }

    const rawEndTime = Number(market.endTime);
    const rawStartTime = Number(market.startTime);

    let validEndTime = rawEndTime;
    if (validEndTime === 0 || validEndTime <= rawStartTime) {
      validEndTime = rawStartTime + (15 * 60);
      logger.warn(`Market ${marketId} has invalid endTime (${rawEndTime}), using calculated: ${validEndTime}`);
    }

    const baseMarket = {
      id: marketId,
      marketType,
      asset: market.asset || 'BTC',
      startTime: rawStartTime * 1000,  // stored as ms
      endTime: validEndTime * 1000,  // stored as ms
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

    // REPLACE the entire if (baseMarket.resolved) block with:
    if (baseMarket.resolved) {
      if (resolvedMap[marketId] !== undefined) {
        baseMarket.winningChoice = resolvedMap[marketId];
      }
      // binary fallback
      if (marketType === 0) {
        baseMarket.winningChoice = baseMarket.priceWentUp ? 1 : 0;
      }
    }

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
        baseMarket.noPool = 0;
      } catch (e) {
        logger.warn(`Failed to fetch total pool for market ${marketId}:`, e.message);
      }
    }

    return baseMarket;
  } catch (error) {
    logger.error(`Error reading market ${marketId}:`, error);

    if (
      error.message?.includes('out of bounds') ||
      error.message?.includes('Position') ||
      error.message?.includes('decoding') ||
      error.message?.includes('overflow') ||
      error.message?.includes('invalid')
    ) {
      logger.warn(`Market ${marketId} not found or has invalid data: ${error.message}`);
      return null;
    }

    if (retryCount < MAX_RETRIES) {
      logger.info(`Retrying market ${marketId} (attempt ${retryCount + 1}) due to: ${error.shortMessage || error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return fetchSingleMarketFromProxy(publicClient, marketId, retryCount + 1, resolvedMap);
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
  const safeBool = (val) => Boolean(val);
  const safeString = (val) => { try { return String(val ?? ''); } catch { return ''; } };

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
    minMultiplier: safeBigInt(marketArray[18]),
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
    const targetPrice = data.targetPrice || data[0];
    const timeframeSeconds = data.timeframes || data[1] || [];
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



function getCoinName(asset) {
  return { BTC: 'Bitcoin', ETH: 'Ethereum', LINK: 'Chainlink' }[asset] || asset;
}

async function fetchMarketsViaMulticall(publicClient, recentIds, resolvedMap) {
  const CHUNK_SIZE = 50;
  const proxyMarkets = [];

  // Phase 1: Base Markets
  for (let i = 0; i < recentIds.length; i += CHUNK_SIZE) {
    const chunk = recentIds.slice(i, i + CHUNK_SIZE);
    const contracts = chunk.map(id => ({
      address: PROXY_CONTRACT_ADDRESS,
      abi: PREDICTION_MARKET_PROXY_ABI,
      functionName: 'markets',
      args: [BigInt(id)],
    }));

    try {
      const results = await publicClient.multicall({ contracts, allowFailure: true });
      results.forEach((res, idx) => {
        if (res.status === 'success' && res.result) {
          const raw = res.result;
          const marketId = chunk[idx];
          const market = parseMarketArray(raw);
          if (market && Number(market.startTime) > 0) {
            market.id = marketId; // number
            proxyMarkets.push(market);
          }
        }
      });
    } catch (e) {
      logger.error('Multicall base markets batch failed:', e);
    }
  }

  // Phase 2: Process Base Markets and formulate additional calls
  const finalMarkets = [];
  const additionalCalls = [];
  const callMap = [];

  for (const market of proxyMarkets) {
    const marketType = Number(market.marketType);
    const marketId = Number(market.id);

    const yesPool = market.yesPool ? Number(formatUnits(market.yesPool, 6)) : 0;
    const noPool = market.noPool ? Number(formatUnits(market.noPool, 6)) : 0;
    const useFixedOdds = market.useFixedOdds || false;
    const yesMultiplier = market.yesMultiplier ? Number(market.yesMultiplier) : 0;
    const noMultiplier = market.noMultiplier ? Number(market.noMultiplier) : 0;

    let yesPrice, noPrice;
    if (useFixedOdds && yesMultiplier > 0 && noMultiplier > 0) {
      yesPrice = calculateFixedOddsPercentage(yesMultiplier / 100) / 100;
      noPrice = calculateFixedOddsPercentage(noMultiplier / 100) / 100;
    } else {
      const { upPercentage, downPercentage } = calculateMarketPercentages(yesPool, noPool);
      yesPrice = upPercentage / 100;
      noPrice = downPercentage / 100;
    }

    const rawEndTime = Number(market.endTime);
    const rawStartTime = Number(market.startTime);

    let validEndTime = rawEndTime;
    if (validEndTime === 0 || validEndTime <= rawStartTime) {
      validEndTime = rawStartTime + (15 * 60);
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
      useTimeDecay: market.useTimeDecay || false,
      decayStartTime: market.decayStartTime ? Number(market.decayStartTime) * 1000 : rawStartTime * 1000,
      minMultiplier: market.minMultiplier ? Number(market.minMultiplier) : 120,
      name: getCoinName(market.asset || 'BTC'),
      color: getCoinColor(market.asset || 'BTC'),
      status: market.resolved ? 'resolved' : 'active',
      contractSource: 'proxy',
      contractAddress: PROXY_CONTRACT_ADDRESS,
    };

    if (baseMarket.resolved) {
      if (resolvedMap[marketId] !== undefined) {
        baseMarket.winningChoice = resolvedMap[marketId];
      }
      if (marketType === 0) {
        baseMarket.winningChoice = baseMarket.priceWentUp ? 1 : 0;
      }
    }

    finalMarkets.push(baseMarket);

    if (marketType === 1) {
      additionalCalls.push({ address: PROXY_CONTRACT_ADDRESS, abi: PREDICTION_MARKET_PROXY_ABI, functionName: 'getMultiChoiceOptions', args: [BigInt(marketId)] });
      callMap.push({ marketId, field: 'options' });
    } else if (marketType === 2) {
      additionalCalls.push({ address: PROXY_CONTRACT_ADDRESS, abi: PREDICTION_MARKET_PROXY_ABI, functionName: 'getRangeMarketData', args: [BigInt(marketId)] });
      callMap.push({ marketId, field: 'ranges' });
    } else if (marketType === 3) {
      additionalCalls.push({ address: PROXY_CONTRACT_ADDRESS, abi: PREDICTION_MARKET_PROXY_ABI, functionName: 'getTimeMarketData', args: [BigInt(marketId)] });
      callMap.push({ marketId, field: 'timeframes' });
    }

    if (marketType !== 0) {
      additionalCalls.push({ address: PROXY_CONTRACT_ADDRESS, abi: PREDICTION_MARKET_PROXY_ABI, functionName: 'getTotalPool', args: [BigInt(marketId)] });
      callMap.push({ marketId, field: 'totalPool' });

      additionalCalls.push({ address: PROXY_CONTRACT_ADDRESS, abi: PREDICTION_MARKET_PROXY_ABI, functionName: 'getCurrentOdds', args: [BigInt(marketId)] });
      callMap.push({ marketId, field: 'multipliers' });
    } else {
      baseMarket.multipliers = [baseMarket.yesMultiplier, baseMarket.noMultiplier];
    }
  }

  // Phase 3: Execute additional calls via multicall
  for (let i = 0; i < additionalCalls.length; i += CHUNK_SIZE) {
    const chunk = additionalCalls.slice(i, i + CHUNK_SIZE);
    try {
      const results = await publicClient.multicall({ contracts: chunk, allowFailure: true });
      results.forEach((res, idx) => {
        const mapInfo = callMap[i + idx];
        const market = finalMarkets.find(m => m.id === mapInfo.marketId);
        if (res.status === 'success' && res.result && market) {
          if (mapInfo.field === 'options') market.options = res.result || [];
          if (mapInfo.field === 'ranges') {
            const data = res.result;
            const mins = data.mins || data[0] || [];
            const maxs = data.maxs || data[1] || [];
            market.ranges = mins.map((min, idx2) => ({ min: Number(formatUnits(min, 8)), max: Number(formatUnits(maxs[idx2], 8)) }));
          }
          if (mapInfo.field === 'timeframes') {
            const data = res.result;
            const targetPrice = data.targetPrice || data[0];
            const timeframeSeconds = data.timeframes || data[1] || [];
            market.targetPrice = Number(formatUnits(targetPrice, 8));
            market.timeframes = timeframeSeconds.map(s => ({ label: formatTimeframeLabel(Number(s)), seconds: Number(s) }));
          }
          if (mapInfo.field === 'totalPool') {
            market.yesPool = Number(formatUnits(res.result, 6));
            market.noPool = 0;
          }
          if (mapInfo.field === 'multipliers') {
            market.multipliers = (res.result || []).map(m => Number(m));
          }
        }
      });
    } catch (e) {
      logger.error('Multicall additional fields batch failed:', e);
    }
  }

  return finalMarkets.sort((a, b) => b.id - a.id);
}
function getCoinColor(asset) {
  return {
    BTC: 'from-orange-500 to-yellow-500',
    ETH: 'from-blue-500 to-purple-500',
    LINK: 'from-blue-400 to-green-400',
  }[asset] || 'from-gray-500 to-gray-700';
}

export { getContractForMarketType };
export default useMarkets;
