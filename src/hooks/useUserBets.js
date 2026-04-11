import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { createLogger } from '../utils/logger';
import { CONTRACTS } from '../config/wagmi';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';

// FIX 2: Removed unused import PREDICTION_MARKET_ABI
// FIX 3: Removed unused constant DEFAULT_FROM_BLOCK

const logger = createLogger('useUserBets');

const MAX_BLOCK_RANGE = null; // search all blocks

export const useUserBets = (address, markets) => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient({ chainId: 84532 });
  const effectiveAddress = address || connectedAddress;

  const [userBets, setUserBets]           = useState([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [rawBets, setRawBets] = useState([]);
  const [hasMoreBets, setHasMoreBets]       = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  // FIX 1: Track rawBets length in a ref instead of putting it in fetchRawBets'
  // dependency array. Previously rawBets.length was a dep of fetchRawBets, which
  // meant every time setRawBets() ran, a new fetchRawBets was created, which
  // triggered the useEffect([fetchRawBets]) and kicked off another fetch cycle.
  // The 3-second rate limit masked the loop but it still caused wasteful
  // recreation. Using a ref breaks the cycle entirely.
const rawBetsLengthRef = useRef(0);
  const isFetchingRef = useRef(false);

  const getCurrentBlock = useCallback(async () => {
    try {
      return await publicClient.getBlockNumber();
    } catch (err) {
      logger.warn('Failed to get current block:', err);
      return null;
    }
  }, [publicClient]);

const fetchRawBets = useCallback(async (force = false) => {
    if (isFetchingRef.current) {
      logger.debug('Skipping fetch - already in progress');
      return;
    }
    if (!effectiveAddress || !publicClient) {
      logger.debug('Skipping fetch - no address or publicClient');
      return;
    }
    isFetchingRef.current = true;

    const now = Date.now();
    if (!force && now - lastRefreshTime < 3000) {
      logger.debug('Skipping fetch - rate limited');
      isFetchingRef.current = false;
      return;
    }

    if (isFetchingRef.current) {
      logger.debug('Skipping fetch - already in progress');
      return;
    }
    isFetchingRef.current = true;

    // FIX 1: use ref instead of rawBets.length in closure/deps
    if (rawBetsLengthRef.current === 0 || force) {
      setIsLoading(true);
    }

    setError(null);
    setLastRefreshTime(now);

    try {
      const currentBlock = await publicClient.getBlockNumber();
      const CHUNK_SIZE = 49999n;
      const totalBlocks = 10000n; // Reduced from 3000000n to 10k to prevent strict Infura 429 Error rate limit
      const fromBlock = currentBlock > totalBlocks ? currentBlock - totalBlocks : 0n;

      logger.info(`[useUserBets] Fetching user bets from block ${fromBlock} (last 490k blocks)...`);

      let allLogs = [];
      for (let from = fromBlock; from < currentBlock; from += CHUNK_SIZE) {
        const to = from + CHUNK_SIZE > currentBlock ? currentBlock : from + CHUNK_SIZE;
        try {
          const chunk = await publicClient.getLogs({
            address: CONTRACTS.PROXY,
            event: parseAbiItem(
              'event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)'
            ),
            args: { user: effectiveAddress },
            fromBlock: from,
            toBlock: to,
          });
          if (Array.isArray(chunk)) allLogs.push(...chunk);
          else logger.warn(`Expected array chunk, got:`, typeof chunk);
        } catch (chunkErr) {
          logger.warn(`[useUserBets] Chunk from ${from} failed:`, chunkErr.message);
        }
      }


      logger.info(`[useUserBets] Found ${allLogs.length} total bet events`);

const rawBetData = allLogs
  .filter(log => log.args && log.args.marketId !== undefined)
  .map(log => ({
        txHash:      log.transactionHash,
        marketId:    Number(log.args.marketId),
        choice:      Number(log.args.choice),
        amount:      log.args.amount,              
        multiplier:  Number(log.args.effectiveMultiplier), 
        blockNumber: log.blockNumber,
        logIndex:    log.logIndex,
      }))
  .filter(bet => !isNaN(bet.marketId) && bet.marketId > 0);

      rawBetData.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) return Number(b.blockNumber) - Number(a.blockNumber);
        return b.logIndex - a.logIndex;
      });

      // FIX 1: update ref before state so next render's ref is already correct
      const previousLength = rawBetsLengthRef.current;
      rawBetsLengthRef.current = rawBetData.length;
      
      // Detect if we found new older bets (for pagination)
      const foundNewBets = rawBetData.length > previousLength;
      setHasMoreBets(foundNewBets);
      
      setRawBets(rawBetData);
      logger.info(`[useUserBets] Stored ${rawBetData.length} raw bet events${foundNewBets ? ' (new older bets found)' : ''}`);
    } catch (err) {
      logger.error('[useUserBets] Error fetching user bets:', err);
      setError(err.message || 'Failed to fetch user bets');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [effectiveAddress, publicClient, lastRefreshTime]);

  const enrichBets = useCallback(async () => {
    if (rawBets.length === 0) {
      setUserBets([]);
      return;
    }

    if (!markets || markets.length === 0) {
      logger.debug('Markets not loaded yet, skipping enrichment');
      const basicBets = rawBets.map(rawBet => ({
        txHash:      rawBet.txHash,
        marketId:    rawBet.marketId,
        marketLabel: `Market #${rawBet.marketId}`,
        choiceLabel: `Choice ${rawBet.choice + 1}`,
        choice:      rawBet.choice,
        amount:      rawBet.amount,
        market: {
          id: rawBet.marketId,
          resolved: false,
          endTime: 0,
          marketType: 0,
          asset: 'Unknown',
        },
        claimed: false,
        isClaimableConfirmed: false,
        blockNumber: rawBet.blockNumber,
        logIndex:    rawBet.logIndex,
      }));
      setUserBets(basicBets);
      return;
    }

    try {
      logger.info(`Enriching ${rawBets.length} bets with market data...`);

      // Fetch all WinningsClaimed events for this user once
      let claimedMarketIds = new Set();
      try {
        let claimedLogs = [];
        try {
          claimedLogs = await publicClient.getLogs({
            address: CONTRACTS.PROXY,
            event: parseAbiItem('event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'),
            args: { user: effectiveAddress },
            fromBlock: 'earliest',
            toBlock: 'latest',
          });
        } catch {
          // Chunk fallback
          const currentBlock = await publicClient.getBlockNumber();
          const CHUNK_SIZE = 49999n;
          const totalBlocks = 10000n; // Reduced to 10k to prevent strict Infura 429 rate limit
          const fromBlock = currentBlock > totalBlocks ? currentBlock - totalBlocks : 0n;
          for (let from = fromBlock; from < currentBlock; from += CHUNK_SIZE) {
            const to = from + CHUNK_SIZE > currentBlock ? currentBlock : from + CHUNK_SIZE;
            try {
              const chunk = await publicClient.getLogs({
                address: CONTRACTS.PROXY,
                event: parseAbiItem('event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'),
                args: { user: effectiveAddress },
                fromBlock: from,
                toBlock: to,
              });
              claimedLogs.push(...chunk);
            } catch { /* skip chunk */ }
          }
        }
        claimedMarketIds = new Set(claimedLogs.map(log => Number(log.args.marketId)));
        logger.info(`Found ${claimedMarketIds.size} claimed markets`);
      } catch (e) {
        logger.warn('Failed to fetch WinningsClaimed events:', e.message);
      }

      const enrichedBets = await Promise.all(rawBets.map(async (rawBet) => {
        const { marketId, choice, amount } = rawBet;
        let market = markets?.find(m => m.id === marketId);
        if (!market) {
          try {
            const raw = await publicClient.readContract({
              address: CONTRACTS.PROXY,
              abi: PREDICTION_MARKET_PROXY_ABI,
              functionName: 'markets',
              args: [BigInt(marketId)]
            });
            if (raw && Number(raw.startTime) !== 0) {
              market = {
                id: marketId,
                marketType: Number(raw.marketType),
                asset: raw.asset,
                resolved: raw.resolved,
                priceWentUp: raw.priceWentUp,
                winningChoice: raw.resolved ? (raw.marketType === 0 ? (raw.priceWentUp ? 1 : 0) : null) : null,
                endTime: Number(raw.endTime) * 1000,
                yesPool: 0, noPool: 0,
                totalBets: Number(raw.totalBets),
              };
              // For resolved advanced markets, get winningChoice from MarketResolved event
              if (raw.resolved && Number(raw.marketType) !== 0) {
                try {
                  const currentBlock = await publicClient.getBlockNumber();
                  const from = currentBlock > 10000n ? currentBlock - 10000n : 0n; // Reduced lookback
                  for (let f = from; f < currentBlock; f += 49999n) {
                    const t = f + 49999n > currentBlock ? currentBlock : f + 49999n;
                    const logs = await publicClient.getLogs({
                      address: CONTRACTS.PROXY,
                      event: parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee)'),
                      args: { marketId: BigInt(marketId) },
                      fromBlock: f, toBlock: t,
                    });
                    if (logs.length > 0) {
                      market.winningChoice = Number(logs[0].args.winningChoice);
                      break;
                    }
                  }
                } catch { /* skip */ }
              }
            }
          } catch { /* leave undefined */ }
        }

        const marketLabel = market
          ? `${market.asset} - ${getMarketTypeLabel(market.marketType)}`
          : `Market #${marketId}`;

        const choiceLabel = getChoiceLabel(market, choice);

        let claimed = false;
        let isClaimableConfirmed = false;

        if (market && market.resolved) {
          if (market.marketType === 0) {
            const predictedUp = choice === 1;
            isClaimableConfirmed = predictedUp === market.priceWentUp;
            claimed = claimedMarketIds.has(marketId);
          } else if (
            market.marketType === 1 ||
            market.marketType === 2 ||
            market.marketType === 3
          ) {
            if (market.winningChoice !== null && market.winningChoice !== undefined) {
              isClaimableConfirmed = Number(choice) === Number(market.winningChoice);
            }
            claimed = claimedMarketIds.has(marketId);
          }
        }

        return {
          txHash: rawBet.txHash,
          marketId,
          marketLabel,
          choiceLabel,
          choice,
          amount,
          market: market || {
            id: marketId, resolved: false, endTime: 0, marketType: 0, asset: 'Unknown',
          },
          claimed,
          isClaimableConfirmed,
          blockNumber: rawBet.blockNumber,
          logIndex:    rawBet.logIndex,
        };
      }));

      setUserBets(enrichedBets);
      logger.info(`Enriched ${enrichedBets.length} user bets`);
    } catch (err) {
      logger.error('Error enriching bets:', err);
    }
  }, [rawBets, markets, effectiveAddress, publicClient]);

  const fetchUserBets = useCallback(async (force = false) => {
    await fetchRawBets(force);
  }, [fetchRawBets]);

  useEffect(() => {
    fetchRawBets();
  }, [fetchRawBets, refreshTrigger]);

  useEffect(() => {
    enrichBets();
  }, [enrichBets, markets]);

  useEffect(() => {
    if (!effectiveAddress) return;
    const interval = setInterval(() => {
      fetchRawBets(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [effectiveAddress, fetchRawBets]);

  const forceRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setHasMoreBets(true);
    setLastRefreshTime(0);
    fetchRawBets(true);
  }, [fetchRawBets]);

  const loadOlderBets = useCallback(async () => {
    if (!effectiveAddress || !publicClient || !hasMoreBets || rawBets.length === 0) {
      return;
    }

    setIsLoadingOlder(true);
    try {
      const oldestBetBlock = rawBets[rawBets.length - 1]?.blockNumber || 0n;
      const currentBlock = await publicClient.getBlockNumber();
      
      if (oldestBetBlock >= currentBlock) {
        setHasMoreBets(false);
        return;
      }

      logger.info(`[useUserBets] Loading older bets before block ${oldestBetBlock}`);
      
      const CHUNK_SIZE = 49999n;
      const totalBlocks = 10000n; // Reduced to 10k to prevent RPC rate-limits
      const fromBlock = oldestBetBlock > totalBlocks ? oldestBetBlock - totalBlocks : 0n;
      
      let olderLogs = [];
      for (let from = fromBlock; from < oldestBetBlock; from += CHUNK_SIZE) {
        const to = from + CHUNK_SIZE > oldestBetBlock ? oldestBetBlock : from + CHUNK_SIZE;
        try {
          const chunk = await publicClient.getLogs({
            address: CONTRACTS.PROXY,
            event: parseAbiItem(
              'event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)'
            ),
            args: { user: effectiveAddress },
            fromBlock: from,
            toBlock: to,
          });
          if (Array.isArray(chunk)) olderLogs.push(...chunk);
        } catch (chunkErr) {
          logger.warn(`Chunk from ${from} failed:`, chunkErr.message);
        }
      }

      if (olderLogs.length > 0) {
        const olderBetData = olderLogs
  .filter(log => log.args && log.args.marketId !== undefined)
  .map(log => ({
          txHash: log.transactionHash,
          marketId: Number(log.args.marketId),
          choice: Number(log.args.choice),
          amount: log.args.amount,
          multiplier: Number(log.args.effectiveMultiplier),
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
        }))
  .filter(bet => !isNaN(bet.marketId) && bet.marketId > 0);

        // Prepend older bets (they're already newest-first sorted)
        const updatedBets = [...rawBets, ...olderBetData];
        rawBetsLengthRef.current = updatedBets.length;
        setRawBets(updatedBets);
        logger.info(`Loaded ${olderBetData.length} older bets. Total: ${updatedBets.length}`);
      } else {
        setHasMoreBets(false);
      }
    } catch (err) {
      logger.error('Error loading older bets:', err);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [effectiveAddress, publicClient, hasMoreBets, rawBets]);

  // NOTE: logger.info calls removed from useMemo — side effects inside memo
  // are a React anti-pattern and fire twice in Strict Mode.
  const ongoingBets = useMemo(() =>
    userBets.filter(bet => !bet.market || !bet.market.resolved),
  [userBets]);

  const pendingBets = useMemo(() =>
    userBets.filter(bet => {
      if (!bet.market || !bet.market.resolved) return false;
      // Only truly pending if resolved but outcome unknown
      if (bet.market.marketType === 0) {
        return bet.market.priceWentUp === null || bet.market.priceWentUp === undefined;
      }
      return bet.market.winningChoice === null || bet.market.winningChoice === undefined;
    }),
  [userBets]);

  const wonBets = useMemo(() =>
    userBets.filter(bet => {
      if (!bet.market || !bet.market.resolved) return false;
      if (bet.market.marketType === 0) {
        const actualUp = bet.market.priceWentUp;
        if (actualUp === null || actualUp === undefined) return false;
        return (bet.choice === 1) === actualUp;
      }
      // Multi-choice, Range, Time — ALL use winningChoice from MarketResolved event
      if (bet.market.winningChoice === null || bet.market.winningChoice === undefined) return false;
      return Number(bet.choice) === Number(bet.market.winningChoice);
    }),
  [userBets]);

  const lostBets = useMemo(() =>
    userBets.filter(bet => {
      if (!bet.market || !bet.market.resolved) return false;
      if (bet.market.marketType === 0) {
        const actualUp = bet.market.priceWentUp;
        if (actualUp === null || actualUp === undefined) return false;
        return (bet.choice === 1) !== actualUp;
      }
      // Multi-choice, Range, Time
      if (bet.market.winningChoice === null || bet.market.winningChoice === undefined) return false;
      return Number(bet.choice) !== Number(bet.market.winningChoice);
    }),
  [userBets]);

return {
    userBets,
    ongoingBets,
    pendingBets,
    wonBets,
    lostBets,
    isLoading,
    isLoadingOlder,
    hasMoreBets,
    error,
    refresh: forceRefresh,
    loadOlderBets,
  };
};

function getMarketTypeLabel(marketType) {
  return { 0: 'Binary UP/DOWN', 1: 'Multi-Choice', 2: 'Range Market', 3: 'Time-Based' }[marketType] || 'Unknown';
}

function getChoiceLabel(market, choice) {
  if (!market) return `Choice ${choice + 1}`;
  if (market.marketType === 0) return choice === 1 ? 'UP' : 'DOWN';
  if (market.marketType === 1 && market.options?.[choice]) return market.options[choice];
  return `Choice ${choice + 1}`;
}

export default useUserBets;
