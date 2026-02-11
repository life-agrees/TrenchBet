import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { createLogger } from '../utils/logger';
import { CONTRACTS } from '../config/wagmi';
import { PREDICTION_MARKET_ABI } from '../contracts/abis';

const logger = createLogger('useUserBets');


export const useUserBets = (address, markets) => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  const effectiveAddress = address || connectedAddress;
  const [userBets, setUserBets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUserBets = useCallback(async () => {
    if (!effectiveAddress || !publicClient) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch BetPlaced events for the user
      const logs = await publicClient.getLogs({
        address: CONTRACTS.PREDICTION_MARKET,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
        args: { user: effectiveAddress },
        fromBlock: 'earliest',
        toBlock: 'latest'
      });
      
      logger.info(`Found ${logs.length} bet events for user ${effectiveAddress}`);
      
      // Process and enrich bet data
      const bets = await Promise.all(logs.map(async (log) => {
        const marketId = Number(log.args.marketId);
        const choice = Number(log.args.choice);
        const amount = log.args.amount;
        
        // Find market data from provided markets array
        const market = markets?.find(m => m.id === marketId);
        
        // Get market label
        const marketLabel = market 
          ? `${market.asset} - ${getMarketTypeLabel(market.marketType)}`
          : `Market #${marketId}`;
        
        // Get choice label
        const choiceLabel = getChoiceLabel(market, choice);
        
        // Check if user has claimed winnings for this market
        let claimed = false;
        let isClaimableConfirmed = false;
        
        if (market && market.resolved) {
          try {
            const userPositions = await publicClient.readContract({
              address: CONTRACTS.PREDICTION_MARKET,
              abi: PREDICTION_MARKET_ABI,
              functionName: 'getUserPositionsInMarket',
              args: [BigInt(marketId), effectiveAddress]
            });
            
            // Check if any position is unclaimed and user won
            const unclaimedWinningPosition = userPositions.find(pos => {
              if (pos.claimed) return false;
              
              // Determine if user won based on market type
              if (market.marketType === 0) { // Binary
                const predictedUp = choice === 1;
                return predictedUp === market.priceWentUp;
              }
              // Add logic for other market types as needed
              return false;
            });
            
            claimed = !unclaimedWinningPosition && userPositions.some(pos => pos.claimed);
            isClaimableConfirmed = !!unclaimedWinningPosition;
          } catch (err) {
            logger.warn(`Failed to check claim status for market ${marketId}:`, err);
          }
        }
        
        return {
          txHash: log.transactionHash,
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
          blockNumber: log.blockNumber,
          logIndex: log.logIndex
        };
      }));
      
      // Sort by block number (newest first)
      bets.sort((a, b) => {
        if (b.blockNumber !== a.blockNumber) {
          return Number(b.blockNumber) - Number(a.blockNumber);
        }
        return b.logIndex - a.logIndex;
      });
      
      setUserBets(bets);
      logger.info(`Loaded ${bets.length} user bets`);
    } catch (err) {
      logger.error('Error fetching user bets:', err);
      setError(err.message || 'Failed to fetch user bets');
    } finally {
      setIsLoading(false);
    }
  }, [effectiveAddress, publicClient, markets]);


  useEffect(() => {
    fetchUserBets();
  }, [fetchUserBets]);

  // Compute ongoing, won, and lost bets
  const ongoingBets = useMemo(() => {
    return userBets.filter(bet => bet.market && !bet.market.resolved);
  }, [userBets]);

  const wonBets = useMemo(() => {
    return userBets.filter(bet => bet.market && bet.market.resolved && (bet.claimed || bet.isClaimableConfirmed));
  }, [userBets]);

  const lostBets = useMemo(() => {
    return userBets.filter(bet => bet.market && bet.market.resolved && !bet.claimed && !bet.isClaimableConfirmed);
  }, [userBets]);

  return {
    userBets,
    ongoingBets,
    wonBets,
    lostBets,
    isLoading,
    error,
    refresh: fetchUserBets
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
