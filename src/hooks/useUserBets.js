import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { createLogger } from '../utils/logger';
import { CONTRACTS } from '../config/wagmi';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';
import { supabase } from '../lib/supabase';

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
      logger.info(`[useUserBets] Fetching bets from Supabase Indexer for ${effectiveAddress}`);
      
      const { data: bets, error: supaErr } = await supabase
        .from('user_bets')
        .select('*')
        .eq('wallet_address', effectiveAddress.toLowerCase())
        .order('block_number', { ascending: false });

      if (supaErr) throw supaErr;

      const marketIds = [...new Set((bets || []).map(b => Number(b.market_id)))];
      let dbMarketsMap = {};
      if (marketIds.length > 0) {
        const { data: mData } = await supabase
          .from('markets')
          .select('id, resolved, winning_choice, price_went_up')
          .in('id', marketIds);
        dbMarketsMap = Object.fromEntries((mData || []).map(m => [m.id, m]));
      }

      const rawBetData = (bets || []).map(bet => ({
        txHash: bet.tx_hash,
        marketId: Number(bet.market_id),
        choice: Number(bet.choice),
        amount: BigInt(Math.floor(Number(bet.amount) * 1000000)), // Convert numeric back to 6-decimal BigInt
        multiplier: Number(bet.multiplier),
        blockNumber: BigInt(bet.block_number),
        claimed: bet.claimed,
        dbMarket: dbMarketsMap[Number(bet.market_id)] || null
      }));

      const previousLength = rawBetsLengthRef.current;
      rawBetsLengthRef.current = rawBetData.length;
      
      setHasMoreBets(false); // Supabase returns ALL bets, no pagination needed yet
      setRawBets(rawBetData);
      
      logger.info(`[useUserBets] Loaded ${rawBetData.length} bets from Supabase`);
    } catch (err) {
      logger.error('[useUserBets] Error fetching user bets:', err);
      setError(err.message || 'Failed to fetch user bets');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [effectiveAddress, lastRefreshTime]);

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
      const enrichedBets = await Promise.all(rawBets.map(async (rawBet) => {
        const { marketId, choice, amount, claimed, dbMarket } = rawBet;
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

        if (!market) {
          try {
            const raw = await publicClient.readContract({
              address: CONTRACTS.PROXY,
              abi: PREDICTION_MARKET_PROXY_ABI,
              functionName: 'markets',
              args: [BigInt(marketId)]
            });
            if (raw && Number(raw.startTime) !== 0) {
              const isResolved = dbMarket ? dbMarket.resolved : raw.resolved;
              market = {
                id: marketId,
                marketType: Number(raw.marketType),
                asset: raw.asset,
                resolved: isResolved,
                priceWentUp: dbMarket && dbMarket.price_went_up !== null ? dbMarket.price_went_up : raw.priceWentUp,
                winningChoice: dbMarket && dbMarket.winning_choice !== null ? dbMarket.winning_choice : (isResolved ? (raw.marketType === 0 ? (raw.priceWentUp ? 1 : 0) : null) : null),
                endTime: Number(raw.endTime) * 1000,
                yesPool: 0, noPool: 0,
                totalBets: Number(raw.totalBets),
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
  }, [rawBets, markets, publicClient]);

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
