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
  const publicClient = usePublicClient();
  const effectiveAddress = address || connectedAddress;

  const [userBets, setUserBets]           = useState([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshTrigger, setRefreshTrigger]   = useState(0);
  const [rawBets, setRawBets]             = useState([]);

  // FIX 1: Track rawBets length in a ref instead of putting it in fetchRawBets'
  // dependency array. Previously rawBets.length was a dep of fetchRawBets, which
  // meant every time setRawBets() ran, a new fetchRawBets was created, which
  // triggered the useEffect([fetchRawBets]) and kicked off another fetch cycle.
  // The 3-second rate limit masked the loop but it still caused wasteful
  // recreation. Using a ref breaks the cycle entirely.
  const rawBetsLengthRef = useRef(0);

  const getCurrentBlock = useCallback(async () => {
    try {
      return await publicClient.getBlockNumber();
    } catch (err) {
      logger.warn('Failed to get current block:', err);
      return null;
    }
  }, [publicClient]);

  const fetchRawBets = useCallback(async (force = false) => {
    if (!effectiveAddress || !publicClient) {
      logger.debug('Skipping fetch - no address or publicClient');
      return;
    }

    const now = Date.now();
    if (!force && now - lastRefreshTime < 3000) {
      logger.debug('Skipping fetch - rate limited');
      return;
    }

    // FIX 1: use ref instead of rawBets.length in closure/deps
    if (rawBetsLengthRef.current === 0 || force) {
      setIsLoading(true);
    }

    setError(null);
    setLastRefreshTime(now);

    try {
      const currentBlock = await publicClient.getBlockNumber();
      const CHUNK_SIZE = 49999; // RPC max is 50000, stay under
      const totalBlocks = Math.min(MAX_BLOCK_RANGE, Number(currentBlock));
      const numChunks = Math.ceil(totalBlocks / CHUNK_SIZE);

      logger.info(`[useUserBets] Fetching all bets from earliest block...`);

      let allLogs = [];
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACTS.PROXY,
          event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)'),
          args: { user: effectiveAddress },
          fromBlock: 'earliest',
          toBlock: 'latest',
        });
        allLogs = logs;
        logger.info(`[useUserBets] Found ${logs.length} total bet events`);
      } catch (err) {
        // RPC doesn't support 'earliest' — fall back to chunking last 500k blocks
        logger.warn(`[useUserBets] Single call failed, falling back to chunks: ${err.message}`);
        const currentBlock = await publicClient.getBlockNumber();
        const CHUNK_SIZE = 49999; // RPC max is 50000, stay under
        const totalBlocks = Math.min(490000, Number(currentBlock));
        const numChunks = Math.ceil(totalBlocks / CHUNK_SIZE);

        for (let i = 0; i < numChunks; i++) {
          const toBlock   = currentBlock - BigInt(i * CHUNK_SIZE);
          const fromBlock = currentBlock - BigInt(Math.min((i + 1) * CHUNK_SIZE, totalBlocks));
          try {
            const logs = await publicClient.getLogs({
              address: CONTRACTS.PROXY,
              event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)'),
              args: { user: effectiveAddress },
              fromBlock,
              toBlock,
            });
            if (logs.length > 0) allLogs.push(...logs);
          } catch (chunkErr) {
            logger.warn(`[useUserBets] Chunk ${i + 1} failed:`, chunkErr.message);
          }
        }
      }

      logger.info(`[useUserBets] Found ${allLogs.length} total bet events`);

      const rawBetData = allLogs.map(log => ({
        txHash:      log.transactionHash,
        marketId:    Number(log.args.marketId),
        choice:      Number(log.args.choice),
        amount:      log.args.amount,              // actual bet amount
        multiplier:  Number(log.args.effectiveMultiplier), // store for payout calc
        blockNumber: log.blockNumber,
        logIndex:    log.logIndex,
      }));

      rawBetData.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) return Number(b.blockNumber) - Number(a.blockNumber);
        return b.logIndex - a.logIndex;
      });

      // FIX 1: update ref before state so next render's ref is already correct
      rawBetsLengthRef.current = rawBetData.length;
      setRawBets(rawBetData);
      logger.info(`[useUserBets] Stored ${rawBetData.length} raw bet events`);
    } catch (err) {
      logger.error('[useUserBets] Error fetching user bets:', err);
      setError(err.message || 'Failed to fetch user bets');
    } finally {
      setIsLoading(false);
    }
  // FIX 1: rawBets.length removed from deps — use rawBetsLengthRef.current instead
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

      const enrichedBets = await Promise.all(rawBets.map(async (rawBet) => {
        const { marketId, choice, amount } = rawBet;
        const market = markets?.find(m => m.id === marketId);

        const marketLabel = market
          ? `${market.asset} - ${getMarketTypeLabel(market.marketType)}`
          : `Market #${marketId}`;

        const choiceLabel = getChoiceLabel(market, choice);

        let claimed = false;
        let isClaimableConfirmed = false;

        if (market && market.resolved) {
          if (market.marketType === 0) {
            // Binary: compare choice vs priceWentUp
            const predictedUp = choice === 1;
            const didWin = predictedUp === market.priceWentUp;
            isClaimableConfirmed = didWin;
            // claimed: we can't read it without working contract call
            // so check if market resolved and won — user likely needs to claim
            claimed = false;
          } else if (market.marketType === 1 || market.marketType === 2 || market.marketType === 3) {
            // Multi/Range/Time: compare choice vs winningChoice
            if (market.winningChoice !== null && market.winningChoice !== undefined) {
              isClaimableConfirmed = choice === market.winningChoice;
            }
            claimed = false;
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
    setLastRefreshTime(0);
    fetchRawBets(true);
  }, [fetchRawBets]);

  // NOTE: logger.info calls removed from useMemo — side effects inside memo
  // are a React anti-pattern and fire twice in Strict Mode.
  const ongoingBets = useMemo(() =>
    userBets.filter(bet => !bet.market || !bet.market.resolved),
  [userBets]);

  const pendingBets = useMemo(() =>
    userBets.filter(bet => {
      if (!bet.market || !bet.market.resolved) return false;
      if (bet.market.marketType === 0) {
        return bet.market.priceWentUp === null || bet.market.priceWentUp === undefined;
      }
      if (bet.market.marketType === 1) {
        return bet.market.winningChoice === null || bet.market.winningChoice === undefined;
      }
      return false;
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
      if (bet.market.marketType === 1) {
        if (bet.market.winningChoice === null || bet.market.winningChoice === undefined) return false;
        return bet.choice === bet.market.winningChoice;
      }
      return bet.claimed || bet.isClaimableConfirmed;
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
      if (bet.market.marketType === 1) {
        if (bet.market.winningChoice === null || bet.market.winningChoice === undefined) return false;
        return bet.choice !== bet.market.winningChoice;
      }
      return !bet.isClaimableConfirmed;
    }),
  [userBets]);

  return {
    userBets,
    ongoingBets,
    pendingBets,
    wonBets,
    lostBets,
    isLoading,
    error,
    refresh: forceRefresh,
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