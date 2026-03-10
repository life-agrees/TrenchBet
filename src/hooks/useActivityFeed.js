import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createLogger } from '../utils/logger';

const logger = createLogger('useActivityFeed');

/**
 * Fetch activities from API
 * In production, this would connect to real API endpoints
 */
const fetchActivities = async (address) => {
  try {
    // In production, this would be:
    // const response = await fetch(`/api/activities?wallet=${address}&limit=50`);
    // const data = await response.json();
    // return data.activities;
    
    // For now, return mock data
    const mockMarketActivities = [
      {
        id: 'market-1',
        type: 'market',
        title: 'BTC/USD Market',
        desc: 'Price moved 2.3% up in last hour',
        time: new Date(Date.now() - 2 * 60000),
        icon: 'TrendingUp',
        color: 'text-green-400',
        asset: 'BTC',
        movement: '+2.3%'
      },
      {
        id: 'market-2',
        type: 'market',
        title: 'ETH/USD Market',
        desc: 'High trading volume - 500K+ bets',
        time: new Date(Date.now() - 5 * 60000),
        icon: 'Target',
        color: 'text-blue-400',
        asset: 'ETH',
        volume: '500K+'
      },
      {
        id: 'market-3',
        type: 'resolution',
        title: 'Market Resolved',
        desc: 'BTC closed at $45,200 - Winners paid',
        time: new Date(Date.now() - 8 * 60000),
        icon: 'TrendingUp',
        color: 'text-primary'
      }
    ];

    const mockBetActivities = address ? [
      {
        id: 'bet-1',
        type: 'bet_placed',
        title: 'Bet Placed',
        desc: 'You placed $50 on BTC UP',
        time: new Date(Date.now() - 10 * 60000),
        amount: '$50',
        status: 'pending'
      },
      {
        id: 'bet-2',
        type: 'bet_won',
        title: 'Bet Won!',
        desc: 'Your ETH bet won 2.5x multiplier',
        time: new Date(Date.now() - 1 * 3600000),
        amount: '+$125',
        color: 'text-success'
      }
    ] : [];

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
 * Hook for fetching and managing real-time activity feed data
 * Uses React Query for caching and automatic refetching
 * Polls every 10 seconds for real-time updates
 */
export const useActivityFeed = (address, isConnected) => {
  const queryClient = useQueryClient();
  const intervalRef = useRef(null);
  const [localOptimisticActivities, setLocalOptimisticActivities] = useState([]);

  // React Query configuration for caching and polling
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['activities', address],
    queryFn: () => fetchActivities(address),
    enabled: isConnected,
    staleTime: 5000, // Consider data fresh for 5 seconds
    refetchInterval: 10000, // Auto-refetch every 10 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Manual refresh function
  const refresh = useCallback(() => {
    queryClient.invalidateQueries(['activities', address]);
    refetch();
  }, [address, queryClient, refetch]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Optimistic update: add new activity immediately to UI
  const addOptimisticActivity = useCallback((newActivity) => {
    const optimisticActivity = {
      ...newActivity,
      id: `optimistic-${Date.now()}`,
      time: new Date(),
      read: false,
      pending: true // Mark as pending to show visual indicator
    };
    
    setLocalOptimisticActivities(prev => [optimisticActivity, ...prev]);
    
    // Remove optimistic activity after a short delay (simulating API response)
    setTimeout(() => {
      setLocalOptimisticActivities(prev => 
        prev.filter(a => a.id !== optimisticActivity.id)
      );
    }, 3000);
    
    return optimisticActivity;
  }, []);

  // Combine fetched data with optimistic updates
  const activities = [
    ...localOptimisticActivities,
    ...(data?.activities || [])
  ];

  return {
    activities,
    isLoading,
    error,
    refresh,
    addOptimisticActivity
  };
};

export default useActivityFeed;
