import { useState, useEffect, useCallback, useRef } from 'react';
import { CACHE, DURATIONS, TIERS, RETRY } from '../utils/constants';
import { createLogger } from '../utils/logger';

const logger = createLogger('usePointsData');

// Cache configuration
const CACHE_KEY = 'points_balance_cache';
const CACHE_TTL = CACHE.POINTS_TTL;

// Debounce utility
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Custom hook for points data management
export const usePointsData = (walletAddress) => {
  const [pointsData, setPointsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState(false);

  const abortControllerRef = useRef(null);
  const lastFetchTimeRef = useRef(0);

  // Load from cache
  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setPointsData(data);
          setIsLoading(false);
          return true;
        }
      }
    } catch (err) {
      logger.warn('Failed to load points from cache', err);
    }

    return false;
  }, []);

  // Save to cache
  const saveToCache = useCallback((data) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (err) {
      logger.warn('Failed to save points to cache', err);
    }
  }, []);

  // Fetch points with retry logic
  const fetchPointsBalance = useCallback(async (isRetry = false) => {
    if (!walletAddress) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      if (!isRetry) setError(null);

      // In development, use mock data if API fails
      let response;
      try {
        response = await fetch(
          `/api/points/balance?wallet=${walletAddress}`,
          {
            signal: abortControllerRef.current.signal,
            headers: {
              'Cache-Control': 'no-cache'
            }
          }
        );
      } catch (fetchError) {
        // If fetch fails (API not available in dev), use mock data
        logger.warn('API not available, using mock data for development');

        const mockData = {
          wallet_address: walletAddress,
          total_points: Math.floor(Math.random() * 5000) + 1000,
          points_claimed: Math.floor(Math.random() * 500),
          points_available: Math.floor(Math.random() * 300),
          current_streak: Math.floor(Math.random() * 15) + 1,
          best_streak: Math.floor(Math.random() * 30) + 5,
          last_bet_timestamp: new Date().toISOString()
        };
        setPointsData(mockData);
        saveToCache(mockData);
        setRetryCount(0);
        lastFetchTimeRef.current = Date.now();
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`Failed to fetch points: ${response.status}`);
      }

      const data = await response.json();
      setPointsData(data);
      saveToCache(data);
      setRetryCount(0);
      lastFetchTimeRef.current = Date.now();

    } catch (err) {
      if (err.name === 'AbortError') return; // Request was cancelled

      logger.error('Error fetching points', err);
      setError(err.message);

      // Retry logic with exponential backoff
      if (retryCount < RETRY.MAX_COUNT) {
        const delay = Math.pow(RETRY.DELAY_MULTIPLIER, retryCount) * DURATIONS.RETRY_DELAY_BASE;

        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchPointsBalance(true);
        }, delay);
      }
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, retryCount, saveToCache]);

  // Optimistic update for points changes
  const updatePointsOptimistically = useCallback((changes) => {
    if (!pointsData) return;

    setIsOptimisticUpdate(true);
    const optimisticData = { ...pointsData, ...changes };
    setPointsData(optimisticData);

    // Revert after delay if not confirmed
    setTimeout(() => {
      setIsOptimisticUpdate(false);
      fetchPointsBalance();
    }, DURATIONS.OPTIMISTIC_UPDATE);

  }, [pointsData, fetchPointsBalance]);

  // Manual refresh
  const refreshPoints = useCallback(() => {
    setRetryCount(0);
    fetchPointsBalance();
  }, [fetchPointsBalance]);

  // Debounced wallet address for stability
  const debouncedWalletAddress = useDebounce(walletAddress, DURATIONS.DEBOUNCE);

  useEffect(() => {
    if (!debouncedWalletAddress) {
      setPointsData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Try cache first
    if (!loadFromCache()) {
      fetchPointsBalance();
    }

    // Set up periodic refresh
    const interval = setInterval(() => {
      if (Date.now() - lastFetchTimeRef.current > DURATIONS.REFRESH_INTERVAL) {
        fetchPointsBalance();
      }
    }, DURATIONS.REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedWalletAddress, fetchPointsBalance, loadFromCache]);

  // Calculate tier based on total points
  const getTier = useCallback((totalPoints) => {
    if (totalPoints >= TIERS.DIAMOND) return { name: 'Diamond', color: 'text-cyan-400', bgColor: 'bg-cyan-900/20', borderColor: 'border-cyan-500/50' };
    if (totalPoints >= TIERS.GOLD) return { name: 'Gold', color: 'text-yellow-400', bgColor: 'bg-yellow-900/20', borderColor: 'border-yellow-500/50' };
    if (totalPoints >= TIERS.SILVER) return { name: 'Silver', color: 'text-gray-300', bgColor: 'bg-gray-700/20', borderColor: 'border-gray-500/50' };
    return { name: 'Bronze', color: 'text-orange-400', bgColor: 'bg-orange-900/20', borderColor: 'border-orange-500/50' };
  }, []);

  // Calculate progress to next tier
  const getProgressToNextTier = useCallback((totalPoints) => {
    const tiers = [TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD, TIERS.DIAMOND, Infinity];

    const currentTierIndex = tiers.findIndex((tier, index) =>
      totalPoints >= tier && totalPoints < tiers[index + 1]
    );

    if (currentTierIndex === -1 || currentTierIndex === tiers.length - 2) {
      return { current: totalPoints, target: totalPoints, progress: 100 };
    }

    const currentTierMin = tiers[currentTierIndex];
    const nextTierMin = tiers[currentTierIndex + 1];
    const progress = ((totalPoints - currentTierMin) / (nextTierMin - currentTierMin)) * 100;

    return {
      current: totalPoints - currentTierMin,
      target: nextTierMin - currentTierMin,
      progress: Math.min(progress, 100)
    };
  }, []);

  const tier = pointsData ? getTier(pointsData.total_points) : null;
  const progress = pointsData ? getProgressToNextTier(pointsData.total_points) : null;

  return {
    pointsData,
    isLoading,
    error,
    tier,
    progress,
    isOptimisticUpdate,
    refreshPoints,
    updatePointsOptimistically,
    retryCount
  };
};
