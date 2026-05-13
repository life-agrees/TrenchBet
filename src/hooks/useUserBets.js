import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { createLogger } from '../utils/logger';
import { useContractAddresses } from './useContractAddresses';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';
import { supabase } from '../lib/supabase';

// FIX 2: Removed unused import PREDICTION_MARKET_ABI
// FIX 3: Removed unused constant DEFAULT_FROM_BLOCK

const logger = createLogger('useUserBets');

const MAX_BLOCK_RANGE = null; // search all blocks

export const useUserBets = (address, markets) => {
  const { address: connectedAddress } = useAccount();
  const { PROXY: PROXY_CONTRACT_ADDRESS, chainId, isArc } = useContractAddresses();
  const publicClient = usePublicClient({ chainId });
  const effectiveAddress = address || connectedAddress;

  const [userBets, setUserBets]           = useState([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [rawBets, setRawBets] = useState([]);
  const [resolvedMap, setResolvedMap] = useState({});
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
    if (isFetchingRef.current) return;
    if (!effectiveAddress) return;

    isFetchingRef.current = true;
    const now = Date.now();
    if (!force && now - lastRefreshTime < 3000) {
      isFetchingRef.current = false;
      return;
    }

    if (rawBetsLengthRef.current === 0 || force) {
      setIsLoading(true);
    }
    setError(null);
    setLastRefreshTime(now);

    try {
      let rawBetData = [];

      if (!isArc) {
        logger.info(`[useUserBets] Fetching bets from Supabase Indexer for ${effectiveAddress}`);
        const { data: bets, error: supaErr } = await supabase
          .from('user_bets')
          .select('*')
          .eq('wallet_address', effectiveAddress.toLowerCase())
          .order('block_number', { ascending: false });

        if (!supaErr && bets) {
          const marketIds = [...new Set(bets.map(b => Number(b.market_id)))];
          let dbMarketsMap = {};
          if (marketIds.length > 0) {
            const { data: mData } = await supabase
              .from('markets')
              .select('id, resolved, winning_choice, price_went_up')
              .in('id', marketIds);
            dbMarketsMap = Object.fromEntries((mData || []).map(m => [m.id, m]));
          }

          rawBetData = bets.map(bet => ({
            txHash: bet.tx_hash,
            marketId: Number(bet.market_id),
            choice: Number(bet.choice),
            amount: BigInt(Math.floor(Number(bet.amount) * 1000000)),
            multiplier: Number(bet.multiplier),
            blockNumber: BigInt(bet.block_number),
            claimed: bet.claimed,
            dbMarket: dbMarketsMap[Number(bet.market_id)] || null
          }));
        }
      }

      // ── Arc Fallback / Chain Sync ──
      // If we are on Arc, or if Supabase is empty, scan the logs directly
      if (isArc || rawBetData.length === 0) {
        logger.info(`[useUserBets] Scanning blockchain logs for ${effectiveAddress} on ${isArc ? 'Arc' : 'Base'}`);
        const currentBlock = await publicClient.getBlockNumber();
        const isArcChain = publicClient.chain?.id === 5042002 || isArc;
        
        // Arc produces ~1 block/second, so:
        //   1 day  =  ~86,400 blocks
        //   2 days = ~172,800 blocks
        // We scan 216,000 blocks (~2.5 days) in safe 2,000-block chunks to avoid RPC timeouts.
        const CHUNK_SIZE = isArcChain ? 5000n : 99999n;  
        const maxHistory = isArcChain ? 1000000n : 490000n;
        const fromBlock = currentBlock > maxHistory ? currentBlock - maxHistory : 0n;
        
        const betPlacedRequests = [];
        const resolvedRequests = [];

        for (let from = fromBlock; from < currentBlock; from += CHUNK_SIZE) {
          const to = from + CHUNK_SIZE > currentBlock ? currentBlock : from + CHUNK_SIZE;
          
          // Queue BetPlaced logs
          betPlacedRequests.push(
            publicClient.getLogs({
              address: PROXY_CONTRACT_ADDRESS,
              event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)'),
              args: { user: effectiveAddress },
              fromBlock: from, toBlock: to
            }).catch(() => [])
          );

          // Queue MarketResolved logs
          resolvedRequests.push(
            publicClient.getLogs({
              address: PROXY_CONTRACT_ADDRESS,
              event: parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee)'),
              fromBlock: from, toBlock: to
            }).catch(() => [])
          );
        }

        // Execute in parallel batches (10 at a time)
        const BATCH_SIZE = 10;
        const allBetLogs = [];
        const allResolvedLogs = [];

        for (let i = 0; i < betPlacedRequests.length; i += BATCH_SIZE) {
          const [bets, resolutions] = await Promise.all([
            Promise.all(betPlacedRequests.slice(i, i + BATCH_SIZE)),
            Promise.all(resolvedRequests.slice(i, i + BATCH_SIZE))
          ]);
          allBetLogs.push(...bets.flat());
          allResolvedLogs.push(...resolutions.flat());
        }

        const logBets = allBetLogs.map(log => ({
          txHash: log.transactionHash,
          marketId: Number(log.args.marketId),
          choice: Number(log.args.choice),
          amount: log.args.amount,
          multiplier: Number(log.args.effectiveMultiplier),
          blockNumber: log.blockNumber,
          claimed: false,
          dbMarket: null
        }));

        const localResolvedMap = {};
        allResolvedLogs.forEach(log => {
          localResolvedMap[Number(log.args.marketId)] = Number(log.args.winningChoice);
        });
        logger.info(`[useUserBets] resolvedMap: ${Object.keys(localResolvedMap).length} resolved markets`);
        setResolvedMap(localResolvedMap);

        // Merge and deduplicate (prioritize logs for freshness)
        const seenHashes = new Set(rawBetData.map(b => b.txHash));
        logBets.forEach(lb => {
          if (!seenHashes.has(lb.txHash)) {
            rawBetData.push(lb);
            seenHashes.add(lb.txHash);
          }
        });
      }

      const previousLength = rawBetsLengthRef.current;
      rawBetsLengthRef.current = rawBetData.length;
      
      setHasMoreBets(false);
      setRawBets(rawBetData);
      
      logger.info(`[useUserBets] Loaded ${rawBetData.length} total bets`);
    } catch (err) {
      logger.error('[useUserBets] Error fetching user bets:', err);
      setError(err.message || 'Failed to fetch user bets');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [effectiveAddress, lastRefreshTime, isArc, publicClient, PROXY_CONTRACT_ADDRESS]);

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
        choice:      rawBet.choice,
        amount:      rawBet.amount,
        multiplier:  rawBet.multiplier,
        blockNumber: rawBet.blockNumber,
        logIndex:    rawBet.logIndex,
        market:      null,
        marketLabel: `Market #${rawBet.marketId}`,
        choiceLabel: `Choice ${rawBet.choice}`,
        claimed:     rawBet.claimed,
        payout:      0n,
      }));
      setUserBets(basicBets);
      return;
    }

    try {
      // ── Arc Real-time Claimed Check ──
      // Log scanning doesn't know if a bet is claimed. We must query the contract.
      const arcClaimedMap = {};
      if (isArc && effectiveAddress) {
        try {
          const uniqueMarketIds = [...new Set(rawBets.map(b => b.marketId))];
          const results = await publicClient.multicall({
            contracts: uniqueMarketIds.map(mId => ({
              address: PROXY_CONTRACT_ADDRESS,
              abi: PREDICTION_MARKET_PROXY_ABI,
              functionName: 'getUserPositionsInMarket',
              args: [BigInt(mId), effectiveAddress],
            })),
          });

          uniqueMarketIds.forEach((mId, idx) => {
            const positions = results[idx]?.result || [];
            // Store as mId -> { choiceIndex -> claimedStatus }
            const marketPositions = {};
            positions.forEach(pos => {
              // Note: the position struct field index for 'claimed' is 5 or 'claimed'
              const choice = Number(pos.choice ?? pos[3]);
              const isClaimed = Boolean(pos.claimed ?? pos[5]);
              // If multiple positions for same choice, if ANY is claimed, we'll see it
              if (isClaimed) marketPositions[choice] = true;
            });
            arcClaimedMap[mId] = marketPositions;
          });
          logger.debug(`[useUserBets] Refreshed claimed status for ${uniqueMarketIds.length} markets on Arc`);
        } catch (err) {
          logger.warn('[useUserBets] Multicall for claimed status failed:', err.message);
        }
      }

      const enrichedBets = await Promise.all(rawBets.map(async (rawBet) => {
        const { marketId, choice, amount, dbMarket } = rawBet;
        
        // Use real-time claimed status for Arc, fallback to rawBet.claimed for Base
        const claimed = isArc 
          ? Boolean(arcClaimedMap[marketId]?.[choice]) 
          : rawBet.claimed;

        let market = markets?.find(m => m.id === marketId);
        
        // Ensure advanced markets get their winning choice from DB if resolved
        if (market && dbMarket && dbMarket.resolved) {
            market = { ...market };
            market.resolved = true;
            if (dbMarket.winning_choice !== null && dbMarket.winning_choice !== undefined) {
                market.winningChoice = dbMarket.winning_choice;
            }
            if (dbMarket.price_went_up !== null) {
                market.priceWentUp = dbMarket.price_went_up;
            }
        }

        // For markets found in cache but still missing winningChoice,
        // patch from our locally-scanned resolvedMap (covers Range/Multi/Time)
        if (market && market.resolved && (market.winningChoice === null || market.winningChoice === undefined)) {
          if (resolvedMap[marketId] !== undefined) {
            market = { ...market, winningChoice: resolvedMap[marketId] };
          }
        }

        if (!market) {
          try {
            const raw = await publicClient.readContract({
              address: PROXY_CONTRACT_ADDRESS,
              abi: PREDICTION_MARKET_PROXY_ABI,
              functionName: 'markets',
              args: [BigInt(marketId)]
            });
            // Safely read fields by name OR positional index —
            // Arc's RPC may return a plain array tuple instead of named fields.
            const startTime = Number(raw.startTime ?? raw[3] ?? 0);
            if (raw && startTime !== 0) {
              const marketTypeNum  = Number(raw.marketType  ?? raw[1]  ?? 0);
              const assetStr       = String(raw.asset       ?? raw[2]  ?? 'BTC');
              const isResolved     = Boolean(dbMarket ? dbMarket.resolved : (raw.resolved ?? raw[9]));
              const priceWentUp    = Boolean(
                dbMarket && dbMarket.price_went_up !== null
                  ? dbMarket.price_went_up
                  : (raw.priceWentUp ?? raw[10])
              );
              // Try resolvedMap first (most reliable for Range/Multi/Time markets)
              const resolvedMapChoice = resolvedMap[marketId] !== undefined ? resolvedMap[marketId] : null;
              const rawWinChoice = resolvedMapChoice ?? raw.winningChoice ?? null;

              market = {
                id: marketId,
                marketType: marketTypeNum,
                asset: assetStr,
                resolved: isResolved,
                priceWentUp,
                winningChoice:
                  dbMarket && dbMarket.winning_choice !== null
                    ? dbMarket.winning_choice
                    : isResolved
                      ? (marketTypeNum === 0
                          ? (priceWentUp ? 1 : 0)
                          : rawWinChoice !== null ? Number(rawWinChoice) : null)
                      : null,
                endTime: Number(raw.endTime ?? raw[4] ?? 0) * 1000,
                yesPool: 0, noPool: 0,
                totalBets: Number(raw.totalBets ?? raw[11] ?? 0),
              };
            }
          } catch { /* leave undefined */ }

        }

        const marketLabel = market
          ? `${market.asset} - ${getMarketTypeLabel(market.marketType)}`
          : `Market #${marketId}`;

        const choiceLabel = getChoiceLabel(market, choice);

        let isClaimableConfirmed = false;

        if (market && market.resolved) {
          if (market.marketType === 0) {
            const predictedUp = choice === 1;
            const isWinner = market.priceWentUp === predictedUp;
            isClaimableConfirmed = isWinner && !claimed;
          } else {
            const isWinner = choice === market.winningChoice;
            isClaimableConfirmed = isWinner && !claimed;
          }
        }

        return {
          txHash: rawBet.txHash,
          marketId,
          marketLabel,
          choiceLabel,
          choice,
          amount,
          multiplier: rawBet.multiplier, // effectiveMultiplier from contract (basis points, e.g. 150 = 1.5x)
          market: market || {
            id: marketId, resolved: false, endTime: 0, marketType: 0, asset: 'Unknown',
          },
          claimed,
          isClaimableConfirmed,
          blockNumber: rawBet.blockNumber,
          logIndex:    rawBet.logIndex,
        };
      }));

      // Sort final enriched array
      enrichedBets.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) return Number(b.blockNumber) - Number(a.blockNumber);
        return b.logIndex - a.logIndex;
      });

      setUserBets(enrichedBets);
      logger.info(`[useUserBets] Enriched ${enrichedBets.length} bets`);
    } catch (err) {
      logger.error('Error enriching bets:', err);
    }
  }, [rawBets, markets, publicClient, resolvedMap, PROXY_CONTRACT_ADDRESS]);

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
    // Deprecated: Supabase indexer loads all bets instantly
    setHasMoreBets(false);
  }, []);

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

  const markAsClaimed = useCallback((marketId) => {
    setUserBets(prev => prev.map(bet => 
      Number(bet.marketId) === Number(marketId) 
        ? { ...bet, claimed: true, isClaimableConfirmed: false } 
        : bet
    ));
  }, []);

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
    markAsClaimed,
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
