import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { createLogger } from '../utils/logger';
import { CONTRACTS } from '../config/wagmi';
import { PREDICTION_MARKET_ABI } from '../contracts/abis';

const logger = createLogger('useUserBets');

// Block range configuration - adjust based on your deployment
// Base mainnet: ~1 block per 2 seconds, so 50000 blocks ≈ 1 day
const DEFAULT_FROM_BLOCK = BigInt(-50000); // Last 50000 blocks (negative means from current - N)
const MAX_BLOCK_RANGE = 50000; // Maximum blocks to query at once

export const useUserBets = (address, markets) => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const effectiveAddress = address || connectedAddress;
  const [userBets, setUserBets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [rawBets, setRawBets] = useState([]); // Store raw bet data before enrichment

  // Helper to get current block number
  const getCurrentBlock = useCallback(async () => {
    try {
      return await publicClient.getBlockNumber();
    } catch (err) {
      logger.warn('Failed to get current block:', err);
      return null;
    }
  }, [publicClient]);

  // Fetch raw bet events from blockchain
  const fetchRawBets = useCallback(async (force = false) => {
    if (!effectiveAddress || !publicClient) {
      logger.debug('Skipping fetch - no address or publicClient');
      return;
    }
    
    // Rate limiting: don't refresh more than once every 3 seconds unless forced
    const now = Date.now();
    if (!force && now - lastRefreshTime < 3000) {
      logger.debug('Skipping fetch - rate limited');
      return;
    }
    
    // Only set loading on initial load or force refresh, not on background refreshes
    if (rawBets.length === 0 || force) {
      setIsLoading(true);
    }

    setError(null);
    setLastRefreshTime(now);
    
    try {
      // Get current block for range calculation
      const currentBlock = await getCurrentBlock();
      let fromBlock = DEFAULT_FROM_BLOCK;
      
      // If we have a current block, calculate fromBlock as current - range
      if (currentBlock) {
        fromBlock = currentBlock - BigInt(MAX_BLOCK_RANGE);
        if (fromBlock < 0) fromBlock = BigInt(0);
      }
      
      logger.info(`Fetching bets for user ${effectiveAddress} from block ${fromBlock}...`);
      
      // Fetch BetPlaced events for the user with retry logic
      let logs = [];
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          logs = await publicClient.getLogs({
            address: CONTRACTS.PREDICTION_MARKET,
            event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
            args: { user: effectiveAddress },
            fromBlock: fromBlock,
            toBlock: 'latest'
          });
          
          logger.info(`Found ${logs.length} bet events`);
          break; // Success, exit retry loop
        } catch (err) {
          retryCount++;
          logger.warn(`getLogs attempt ${retryCount} failed:`, err.message);
          
          // If error is about block range, try with smaller range
          if (err.message?.includes('block range') || err.message?.includes('range too large')) {
            const reducedRange = BigInt(Math.floor(MAX_BLOCK_RANGE / (2 ** retryCount)));
            fromBlock = currentBlock ? currentBlock - reducedRange : BigInt(0);
            if (fromBlock < 0) fromBlock = BigInt(0);
            logger.info(`Retrying with reduced block range: ${reducedRange} blocks`);
          }
          
          if (retryCount >= maxRetries) {
            logger.error('Max retries reached for getLogs');
            throw err; // Re-throw after max retries
          }
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
      
      // Store raw bet data
      const rawBetData = logs.map(log => ({
        txHash: log.transactionHash,
        marketId: Number(log.args.marketId),
        choice: Number(log.args.choice),
        amount: log.args.amount,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex
      }));
      
      // Sort by block number (newest first)
      rawBetData.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) {
          return Number(b.blockNumber) - Number(a.blockNumber);
        }
        return b.logIndex - a.logIndex;
      });
      
      setRawBets(rawBetData);
      logger.info(`Stored ${rawBetData.length} raw bet events`);
    } catch (err) {
      logger.error('Error fetching user bets:', err);
      setError(err.message || 'Failed to fetch user bets');
      // Don't clear existing bets on error
    } finally {
      setIsLoading(false);
    }
  }, [effectiveAddress, publicClient, rawBets.length, lastRefreshTime, getCurrentBlock]);

  // Enrich raw bets with market data and claim status
  const enrichBets = useCallback(async () => {
    if (rawBets.length === 0) {
      setUserBets([]);
      return;
    }

    if (!markets || markets.length === 0) {
      logger.debug('Markets not loaded yet, skipping enrichment');
      // Still show bets without market enrichment
      const basicBets = rawBets.map(rawBet => ({
        txHash: rawBet.txHash,
        marketId: rawBet.marketId,
        marketLabel: `Market #${rawBet.marketId}`,
        choiceLabel: `Choice ${rawBet.choice + 1}`,
        choice: rawBet.choice,
        amount: rawBet.amount,
        market: {
          id: rawBet.marketId,
          resolved: false,
          endTime: 0,
          marketType: 0,
          asset: 'Unknown'
        },
        claimed: false,
        isClaimableConfirmed: false,
        blockNumber: rawBet.blockNumber,
        logIndex: rawBet.logIndex
      }));
      setUserBets(basicBets);
      return;
    }

    try {
      logger.info(`Enriching ${rawBets.length} bets with market data...`);
      
      const enrichedBets = await Promise.all(rawBets.map(async (rawBet) => {
        const marketId = rawBet.marketId;
        const choice = rawBet.choice;
        const amount = rawBet.amount;
        
        // Find market data from provided markets array
        const market = markets?.find(m => m.id === marketId);
        
        // Get market label
        const marketLabel = market 
          ? `${market.asset} - ${getMarketTypeLabel(market.marketType)}`
          : `Market #${marketId}`;
        
        // Get choice label
        const choiceLabel = getChoiceLabel(market, choice);
        
        // Check if user has claimed winnings for this specific bet
        let claimed = false;
        let isClaimableConfirmed = false;
        
        if (market && market.resolved && publicClient) {
          try {
            const userPositions = await publicClient.readContract({
              address: CONTRACTS.PREDICTION_MARKET,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'getUserPositionsInMarket',
              args: [BigInt(marketId), effectiveAddress]
            });
            
            // Find the specific position for this bet (matching by choice)
            const position = userPositions.find(pos => Number(pos.choice) === choice);
            
            if (position) {
              // Check if this specific position was claimed
              claimed = position.claimed;
              
              // Check if this position is a winning position that can be claimed
              if (!position.claimed) {
                if (market.marketType === 0) { // Binary
                  const predictedUp = choice === 1;
                  const userWon = predictedUp === market.priceWentUp;
                  isClaimableConfirmed = userWon;
                } else if (market.marketType === 1) { // Multi-choice
                  isClaimableConfirmed = choice === market.winningChoice;
                }
              }
            }
          } catch (err) {
            logger.warn(`Failed to check claim status for market ${marketId}:`, err.message);
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
            id: marketId,
            resolved: false,
            endTime: 0,
            marketType: 0,
            asset: 'Unknown'
          },
          claimed,
          isClaimableConfirmed,
          blockNumber: rawBet.blockNumber,
          logIndex: rawBet.logIndex
        };
      }));
      
      setUserBets(enrichedBets);
      logger.info(`Enriched ${enrichedBets.length} user bets`);
    } catch (err) {
      logger.error('Error enriching bets:', err);
      // Keep existing bets on error
    }
  }, [rawBets, markets, effectiveAddress, publicClient]);

  // Combined fetch function for backward compatibility
  const fetchUserBets = useCallback(async (force = false) => {
    await fetchRawBets(force);
  }, [fetchRawBets]);

  // Initial fetch and when dependencies change
  useEffect(() => {
    fetchRawBets();
  }, [fetchRawBets, refreshTrigger]);

  // Re-enrich bets when markets data becomes available or changes
  useEffect(() => {
    enrichBets();
  }, [enrichBets, markets]);

  // Auto-refresh every 10 seconds to catch new bets
  useEffect(() => {
    if (!effectiveAddress) return;
    
    const interval = setInterval(() => {
      fetchRawBets(false);
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [effectiveAddress, fetchRawBets]);

  // Force refresh function
  const forceRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setLastRefreshTime(0); // Reset rate limit
    fetchRawBets(true);
  }, [fetchRawBets]);

  // Compute ongoing, won, lost, and pending bets
  const ongoingBets = useMemo(() => {
    const filtered = userBets.filter(bet => {
      // If market data not available yet, consider it ongoing
      if (!bet.market) return true;
      return !bet.market.resolved;
    });
    logger.info(`ongoingBets: ${filtered.length} of ${userBets.length}`);
    return filtered;
  }, [userBets]);

  const pendingBets = useMemo(() => {
    const filtered = userBets.filter(bet => {
      // Pending = market is resolved but outcome data is missing
      if (!bet.market) {
        logger.info(`Bet ${bet.marketId}: no market data`);
        return false;
      }
      if (!bet.market.resolved) {
        logger.info(`Bet ${bet.marketId}: market not resolved`);
        return false;
      }
      
      // For binary markets: check if priceWentUp is missing
      if (bet.market.marketType === 0) {
        const actualUp = bet.market.priceWentUp;
        const isPending = actualUp === null || actualUp === undefined;
        logger.info(`Bet ${bet.marketId}: binary, priceWentUp=${actualUp}, pending=${isPending}`);
        return isPending;
      }
      
      // For multi-choice markets: check if winningChoice is missing
      if (bet.market.marketType === 1) {
        const isPending = bet.market.winningChoice === null || bet.market.winningChoice === undefined;
        logger.info(`Bet ${bet.marketId}: multi-choice, winningChoice=${bet.market.winningChoice}, pending=${isPending}`);
        return isPending;
      }
      
      logger.info(`Bet ${bet.marketId}: other market type ${bet.market.marketType}`);
      return false;
    });
    logger.info(`pendingBets: ${filtered.length} of ${userBets.length}`);
    return filtered;
  }, [userBets]);

  const wonBets = useMemo(() => {
    const filtered = userBets.filter(bet => {
      // Need market data to determine win/loss
      if (!bet.market) {
        logger.info(`Bet ${bet.marketId}: won filter - no market`);
        return false;
      }
      if (!bet.market.resolved) {
        logger.info(`Bet ${bet.marketId}: won filter - not resolved`);
        return false;
      }
      
      // Skip if outcome data is missing (these go to pendingBets)
      if (bet.market.marketType === 0) {
        const actualUp = bet.market.priceWentUp;
        if (actualUp === null || actualUp === undefined) {
          logger.info(`Bet ${bet.marketId}: won filter - missing priceWentUp`);
          return false;
        }
      } else if (bet.market.marketType === 1) {
        if (bet.market.winningChoice === null || bet.market.winningChoice === undefined) {
          logger.info(`Bet ${bet.marketId}: won filter - missing winningChoice`);
          return false;
        }
      }
      
      // For binary markets: check if user's choice matches the outcome
      if (bet.market.marketType === 0) { // Binary UP/DOWN
        const predictedUp = bet.choice === 1;
        const actualUp = bet.market.priceWentUp;
        const userWon = predictedUp === actualUp;
        logger.info(`Bet ${bet.marketId}: binary, predicted=${predictedUp}, actual=${actualUp}, won=${userWon}`);
        return userWon;
      }
      
      // For multi-choice markets: check if choice matches winningChoice
      if (bet.market.marketType === 1) {
        const won = bet.choice === bet.market.winningChoice;
        logger.info(`Bet ${bet.marketId}: multi-choice, choice=${bet.choice}, winning=${bet.market.winningChoice}, won=${won}`);
        return won;
      }
      
      // Default: use claimable status
      const won = bet.claimed || bet.isClaimableConfirmed;
      logger.info(`Bet ${bet.marketId}: default, won=${won}`);
      return won;
    });
    logger.info(`wonBets: ${filtered.length} of ${userBets.length}`);
    return filtered;
  }, [userBets]);

  const lostBets = useMemo(() => {
    const filtered = userBets.filter(bet => {
      // Need market data to determine win/loss
      if (!bet.market) {
        logger.info(`Bet ${bet.marketId}: lost filter - no market`);
        return false;
      }
      if (!bet.market.resolved) {
        logger.info(`Bet ${bet.marketId}: lost filter - not resolved`);
        return false;
      }
      
      // Skip if outcome data is missing (these go to pendingBets)
      if (bet.market.marketType === 0) {
        const actualUp = bet.market.priceWentUp;
        if (actualUp === null || actualUp === undefined) {
          logger.info(`Bet ${bet.marketId}: lost filter - missing priceWentUp`);
          return false;
        }
      } else if (bet.market.marketType === 1) {
        if (bet.market.winningChoice === null || bet.market.winningChoice === undefined) {
          logger.info(`Bet ${bet.marketId}: lost filter - missing winningChoice`);
          return false;
        }
      }
      
      // For binary markets: check if user's choice doesn't match the outcome
      if (bet.market.marketType === 0) { // Binary UP/DOWN
        const predictedUp = bet.choice === 1;
        const actualUp = bet.market.priceWentUp;
        // User lost if their prediction doesn't match actual outcome
        const userLost = predictedUp !== actualUp;
        logger.info(`Bet ${bet.marketId}: binary, predicted=${predictedUp}, actual=${actualUp}, lost=${userLost}`);
        return userLost;
      }
      
      // For multi-choice markets: check if choice doesn't match winningChoice
      if (bet.market.marketType === 1) {
        const lost = bet.choice !== bet.market.winningChoice;
        logger.info(`Bet ${bet.marketId}: multi-choice, choice=${bet.choice}, winning=${bet.market.winningChoice}, lost=${lost}`);
        return lost;
      }
      
      // Default: not claimable means lost
      const lost = !bet.isClaimableConfirmed;
      logger.info(`Bet ${bet.marketId}: default, lost=${lost}`);
      return lost;
    });
    logger.info(`lostBets: ${filtered.length} of ${userBets.length}`);
    return filtered;
  }, [userBets]);

  return {
    userBets,
    ongoingBets,
    pendingBets,
    wonBets,
    lostBets,
    isLoading,
    error,
    refresh: forceRefresh
  };
};

// Helper functions
function getMarketTypeLabel(marketType) {
  const labels = {
    0: 'Binary UP/DOWN',
    1: 'Multi-Choice',
    2: 'Range Market',
    3: 'Time-Based'
  };
  return labels[marketType] || 'Unknown';
}

function getChoiceLabel(market, choice) {
  if (!market) return `Choice ${choice + 1}`;
  
  if (market.marketType === 0) { // Binary
    return choice === 1 ? 'UP' : 'DOWN';
  }
  
  if (market.marketType === 1 && market.options && market.options[choice]) {
    return market.options[choice];
  }
  
  return `Choice ${choice + 1}`;
}

export default useUserBets;
