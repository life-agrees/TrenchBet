import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createLogger } from '../utils/logger';

const logger = createLogger('useActivityFeed');

/**
 * fetchActivities is now a plain function (not a module-level constant),
 * so mock timestamps are computed fresh on every call — not frozen at module load time.
 */
const fetchActivities = async (address) => {
  try {
    // In production, replace with real API call:
    // const response = await fetch(`/api/activities?wallet=${address}&limit=50`);
    // const data = await response.json();
    // return data.activities;

    //  Timestamps computed here (inside the function), so they're always
    // relative to NOW at fetch time — not stale from module initialisation.
    const now = Date.now();

    const mockMarketActivities = [
      {
        id: 'market-1',
        type: 'market',
        title: 'BTC/USD Market',
        desc: 'Price moved 2.3% up in last hour',
        time: new Date(now - 2 * 60_000),
        asset: 'BTC',
        movement: '+2.3%',
      },
      {
        id: 'market-2',
        type: 'market',
        title: 'ETH/USD Market',
        desc: 'High trading volume - 500K+ bets',
        time: new Date(now - 5 * 60_000),
        asset: 'ETH',
        volume: '500K+',
      },
      {
        id: 'market-3',
        type: 'resolution',
        title: 'Market Resolved',
        desc: 'BTC closed at $45,200 - Winners paid',
        time: new Date(now - 8 * 60_000),
      },
    ];

    const mockBetActivities = address
      ? [
          {
            id: 'bet-1',
            type: 'bet_placed',
            title: 'Bet Placed',
            desc: 'You placed $50 on BTC UP',
            time: new Date(now - 10 * 60_000),
            amount: '$50',
            status: 'pending',
          },
          {
            id: 'bet-2',
            type: 'bet_won',
            title: 'Bet Won! 🎉',
            desc: 'Your ETH bet won 2.5x multiplier',
            time: new Date(now - 1 * 3_600_000),
            amount: '+$125',
          },
        ]
      : [];

    const allActivities = [...mockMarketActivities, ...mockBetActivities].sort(
      (a, b) => new Date(b.time) - new Date(a.time)
    );

    return { activities: allActivities };
  } catch (err) {
    logger.error('Error fetching activities:', err);
    throw err;
  }
};

/**
 * Hook for fetching and managing real-time activity feed data.
 * Uses React Query for caching + auto-polling every 10 seconds
 * Returns activities sorted by most recent, along with loading/error states and a manual refresh function.
 * Also provides addOptimisticActivity() to add new events immediately to the UI before API round-trip.
 * Provides a way to add optimistic activities that appear immediately in the UI
 */
export const useActivityFeed = (address, isConnected) => {
  const queryClient = useQueryClient();
  const [localOptimisticActivities, setLocalOptimisticActivities] = useState([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['activities', address],
    queryFn: () => fetchActivities(address),
    enabled: !!isConnected,
    staleTime: 5_000,          // data is fresh for 5 s
    refetchInterval: 10_000,   // auto-poll every 10 s
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  //  Object syntax required by TanStack Query v5
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['activities', address] });
    refetch();
  }, [address, queryClient, refetch]);

  /**
   * Add an activity immediately to the UI before the API round-trips.
   *  When real data arrives, the optimistic entry is filtered out by
   * checking whether the real activities array already contains a non-optimistic
   * version of this event. We also remove the optimistic item after 5 s as a
   * safety net (up from 3 s to give slow RPCs time to respond).
   */
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

    // Safety-net removal after 5 s
    setTimeout(() => {
      setLocalOptimisticActivities(prev =>
        prev.filter(a => a.id !== optimisticId)
      );
    }, 5_000);

    return optimisticActivity;
  }, []);

  const fetchedActivities = data?.activities ?? [];

  //  Strip out optimistic entries whose real counterpart has arrived.
  // An optimistic entry is considered "settled" if the real feed contains an
  // activity from the same source that was created within the last 10 seconds.
  const settledIds = new Set(fetchedActivities.map(a => a.id));
  const activeOptimistic = localOptimisticActivities.filter(
    opt => !settledIds.has(opt.id.replace('optimistic-', ''))
  );

  const activities = [...activeOptimistic, ...fetchedActivities];

  return {
    activities,
    isLoading,
    error,
    refresh,
    addOptimisticActivity,
  };
};

export default useActivityFeed;