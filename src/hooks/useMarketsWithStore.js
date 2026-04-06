import { useEffect, useCallback } from 'react';
import { useMarketsOptimized } from './useMarketsOptimized';
import { useAppStore } from '../store/useAppStore';
import { createLogger } from '../utils/logger';

const logger = createLogger('useMarketsWithStore');

/**
 * Hook that combines optimized market fetching with Zustand store
 * Provides caching and global state management for markets
 */
export const useMarketsWithStore = (options = {}) => {
  const { 
    markets: storeMarkets, 
    setMarkets, 
    setMarketsLoading, 
    setMarketsError,
    setLastFetch,
    shouldRefetch,
    selectedMarket,
    setSelectedMarket
  } = useAppStore();

  const { 
    markets: fetchedMarkets, 
    isLoading, 
    error, 
    refetch 
  } = useMarketsOptimized(options);

  // Sync fetched data to store
  useEffect(() => {
    if (fetchedMarkets.length > 0 && !isLoading) {
      setMarkets(fetchedMarkets);
      setLastFetch('markets', Date.now());
      logger.info('Markets synced to store', { count: fetchedMarkets.length });
    }
  }, [fetchedMarkets, isLoading, setMarkets, setLastFetch]);

  // Handle loading state
  useEffect(() => {
    setMarketsLoading(isLoading);
  }, [isLoading, setMarketsLoading]);

  // Handle errors
  useEffect(() => {
    if (error) {
      setMarketsError(error);
    }
  }, [error, setMarketsError]);

  // Smart refetch that respects cache
  // Smart refetch that respects cache (reduced to 5s)
  const smartRefetch = useCallback(() => {
    if (shouldRefetch('markets', 5000)) { // 5 second cache
      logger.info('Cache expired, refetching markets');
      refetch();
    } else {
      logger.info('Using cached markets (5s)');
    }
  }, [refetch, shouldRefetch]);

  // Force refresh bypassing cache
  const forceRefreshMarkets = useCallback(() => {
    logger.info('Force refresh triggered - bypassing cache');
    refetch();
  }, [refetch]);

  return {
    markets: storeMarkets.length > 0 ? storeMarkets : fetchedMarkets,
    isLoading,
    error,
    refetch: smartRefetch,
    refresh: forceRefreshMarkets, // Now bypasses cache
    forceRefresh: forceRefreshMarkets,
    selectedMarket,
    setSelectedMarket,
  };

};

export default useMarketsWithStore;
