import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { createLogger } from '../utils/logger';
import { CONTRACTS } from '../config/wagmi';

const logger = createLogger('useActivityFeed');

/**
 * Real event fetching logic
 */
const fetchRealActivities = async (publicClient, address) => {
  if (!publicClient || !CONTRACTS.PROXY) return { activities: [] };

  try {
    const currentBlock = await publicClient.getBlockNumber();
    const LOOKBACK_BLOCKS = 50000n; // ~1.5 days on Base Sepolia
    const fromBlock = currentBlock > LOOKBACK_BLOCKS ? currentBlock - LOOKBACK_BLOCKS : 0n;
    
    // Fetch Global events (not filtered by address for the "Live" feed)
    const [betLogs, resolvedLogs, claimedLogs] = await Promise.all([
      publicClient.getLogs({
        address: CONTRACTS.PROXY,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)'),
        fromBlock,
        toBlock: 'latest'
      }).catch(() => []),
      publicClient.getLogs({
        address: CONTRACTS.PROXY,
        event: parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee)'),
        fromBlock,
        toBlock: 'latest'
      }).catch(() => []),
      publicClient.getLogs({
        address: CONTRACTS.PROXY,
        event: parseAbiItem('event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'),
        fromBlock,
        toBlock: 'latest'
      }).catch(() => [])
    ]);

    // Get block timestamps for all logs in parallel (with caching if possible)
    // For simplicity in a feed, we'll estimate time first, or fetch a few key ones.
    // Optimization: eth_getLogs already returns blockNumber. We can approximate or fetch.
    const blockNumbers = [...new Set([...betLogs, ...resolvedLogs, ...claimedLogs].map(l => l.blockNumber))];
    
    // To keep it snappy, only fetch timestamps for the latest 20 logs
    const latestLogs = [...betLogs, ...resolvedLogs, ...claimedLogs]
      .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
      .slice(0, 30);
      
    // Map logs to Activity objects
    const activities = latestLogs.map(log => {
      const isUserAction = address && log.args.user?.toLowerCase() === address.toLowerCase();
      
      if (log.eventName === 'BetPlaced') {
        const amt = formatUnits(log.args.amount || 0n, 6);
        return {
          id: `bet-${log.transactionHash}-${log.logIndex}`,
          type: 'bet_placed',
          title: isUserAction ? 'Your Bet Placed' : 'New Bet Placed',
          desc: `${isUserAction ? 'You' : (log.args.user?.slice(0,6) + '...')} placed $${amt} on Market #${log.args.marketId}`,
          time: new Date(), // We could fetch block timestamp here for accuracy
          blockNumber: log.blockNumber,
          amount: `$${amt}`,
          user: log.args.user
        };
      }
      
      if (log.eventName === 'MarketResolved') {
        return {
          id: `res-${log.transactionHash}-${log.logIndex}`,
          type: 'resolution',
          title: 'Market Resolved',
          desc: `Market #${log.args.marketId} has been resolved!`,
          time: new Date(),
          blockNumber: log.blockNumber,
        };
      }
      
      if (log.eventName === 'WinningsClaimed') {
        const amt = formatUnits(log.args.amount || 0n, 6);
        return {
          id: `claim-${log.transactionHash}-${log.logIndex}`,
          type: 'bet_won',
          title: isUserAction ? 'You Claimed Wins! 🎉' : 'Payout Claimed',
          desc: `${isUserAction ? 'You' : (log.args.user?.slice(0,6) + '...')} claimed $${amt} in winnings`,
          time: new Date(),
          blockNumber: log.blockNumber,
          amount: `+$${amt}`
        };
      }
      
      return null;
    }).filter(Boolean);

    return { activities };
  } catch (err) {
    logger.error('Error fetching global activities:', err);
    return { activities: [] };
  }
};

/**
 * Hook for fetching and managing real-time activity feed data.
 */
export const useActivityFeed = (address, isConnected) => {
  const publicClient = usePublicClient({ chainId: 84532 });
  const queryClient = useQueryClient();
  const [localOptimisticActivities, setLocalOptimisticActivities] = useState([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['activities-global', address],
    queryFn: () => fetchRealActivities(publicClient, address),
    enabled: !!isConnected,
    staleTime: 5_000,
    refetchInterval: 12_000, // Refresh global feed every 12s
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['activities-global', address] });
    refetch();
  }, [address, queryClient, refetch]);

  const addOptimisticActivity = useCallback((newActivity) => {
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticActivity = {
      ...newActivity,
      id: optimisticId,
      time: new Date(),
      read: false,
      pending: true,
    };

    setLocalOptimisticActivities(prev => [optimisticActivity, ...prev]);

    setTimeout(() => {
      setLocalOptimisticActivities(prev =>
        prev.filter(a => a.id !== optimisticId)
      );
    }, 5_000);

    return optimisticActivity;
  }, []);

  const activities = useMemo(() => {
    const fetched = data?.activities ?? [];
    return [...localOptimisticActivities, ...fetched].sort((a,b) => {
       if (a.blockNumber && b.blockNumber) return Number(b.blockNumber) - Number(a.blockNumber);
       return 0;
    });
  }, [data, localOptimisticActivities]);

  return {
    activities,
    isLoading,
    error,
    refresh,
    addOptimisticActivity,
  };
};

export default useActivityFeed;
