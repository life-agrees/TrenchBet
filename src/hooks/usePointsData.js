import { useState, useEffect, useCallback, useRef } from 'react';
import { CACHE, DURATIONS, TIERS, RETRY } from '../utils/constants';
import { createLogger } from '../utils/logger';

const logger = createLogger('usePointsData');

const CACHE_TTL = CACHE.POINTS_TTL;

// FIX 2: retryCount moved to a ref so it doesn't trigger callback recreation
// FIX 1: cache key is now per-wallet (built inside the hook, not module-level)

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

export const usePointsData = (walletAddress) => {
  const [pointsData, setPointsData]           = useState(null);
  const [isLoading, setIsLoading]             = useState(true);
  const [error, setError]                     = useState(null);
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState(false);

  const abortControllerRef = useRef(null);
  const lastFetchTimeRef   = useRef(0);
  // FIX 2: retryCount as ref — incrementing it won't recreate fetchPointsBalance
  const retryCountRef      = useRef(0);

  // FIX 1: wallet-specific cache key — two wallets no longer share cached points
  const cacheKey = walletAddress ? `points_balance_cache_${walletAddress.toLowerCase()}` : null;

  const loadFromCache = useCallback(() => {
    if (!cacheKey) return false;
    try {
      const cached = localStorage.getItem(cacheKey);
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
  }, [cacheKey]);

  const saveToCache = useCallback((data) => {
    if (!cacheKey) return;
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (err) {
      logger.warn('Failed to save points to cache', err);
    }
  }, [cacheKey]);

  // FIX 2: fetchPointsBalance no longer depends on retryCount state
  const fetchPointsBalance = useCallback(async (isRetry = false) => {
    if (!walletAddress) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      if (!isRetry) setError(null);

      const fetchUrl = `/api/points/balance?wallet=${walletAddress}`;
      logger.info('Fetching points from:', fetchUrl);

      let response;
      try {
        response = await fetch(fetchUrl, {
          signal: abortControllerRef.current.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });
      } catch (networkErr) {
        if (networkErr.name === 'AbortError') throw networkErr; // Let the outer catch handle it
        logger.error('Network error fetching points — API unreachable:', networkErr.message);
        throw new Error(`Points API unreachable: ${networkErr.message}`);
      }

      if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limit exceeded');
        throw new Error(`Failed to fetch points: ${response.status}`);
      }

      const data = await response.json();
      logger.info('Points API response:', JSON.stringify(data));
      setPointsData(data);
      // Only cache non-zero responses — if user has 0 points, we want to
      // re-check on next load in case points were just awarded
      if (data.total_points > 0) {
        saveToCache(data);
      }
      retryCountRef.current = 0;
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      if (err.name === 'AbortError') return;

      logger.error('Error fetching points', err);
      setError(err.message);

      // FIX 2: use ref for retry count — no state update, no dep cycle
      if (retryCountRef.current < RETRY.MAX_COUNT) {
        const delay = Math.pow(RETRY.DELAY_MULTIPLIER, retryCountRef.current) * DURATIONS.RETRY_DELAY_BASE;
        retryCountRef.current += 1;
        setTimeout(() => fetchPointsBalance(true), delay);
      }
    } finally {
      setIsLoading(false);
    }
  // FIX 2: retryCount removed from deps — was causing callback recreation on every retry
  }, [walletAddress, saveToCache]);

  const updatePointsOptimistically = useCallback((changes) => {
    if (!pointsData) return;
    setIsOptimisticUpdate(true);
    setPointsData({ ...pointsData, ...changes });
    setTimeout(() => {
      setIsOptimisticUpdate(false);
      fetchPointsBalance();
    }, DURATIONS.OPTIMISTIC_UPDATE);
  }, [pointsData, fetchPointsBalance]);

  const refreshPoints = useCallback(() => {
    retryCountRef.current = 0;
    fetchPointsBalance();
  }, [fetchPointsBalance]);

  const debouncedWalletAddress = useDebounce(walletAddress, DURATIONS.DEBOUNCE);

  useEffect(() => {
    if (!debouncedWalletAddress) {
      setPointsData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!loadFromCache()) fetchPointsBalance();

    const interval = setInterval(() => {
      if (Date.now() - lastFetchTimeRef.current > DURATIONS.REFRESH_INTERVAL) {
        fetchPointsBalance();
      }
    }, DURATIONS.REFRESH_INTERVAL);

    return () => {
      clearInterval(interval);
      abortControllerRef.current?.abort();
    };
  }, [debouncedWalletAddress, fetchPointsBalance, loadFromCache]);

  const getTier = useCallback((totalPoints) => {
    if (totalPoints >= TIERS.DIAMOND) return { name: 'Diamond', color: 'text-cyan-400',   bgColor: 'bg-cyan-900/20',   borderColor: 'border-cyan-500/50' };
    if (totalPoints >= TIERS.GOLD)    return { name: 'Gold',    color: 'text-yellow-400', bgColor: 'bg-yellow-900/20', borderColor: 'border-yellow-500/50' };
    if (totalPoints >= TIERS.SILVER)  return { name: 'Silver',  color: 'text-gray-300',   bgColor: 'bg-gray-700/20',   borderColor: 'border-gray-500/50' };
    return                                   { name: 'Bronze',  color: 'text-orange-400', bgColor: 'bg-orange-900/20', borderColor: 'border-orange-500/50' };
  }, []);

  const getProgressToNextTier = useCallback((totalPoints) => {
    const tiers = [TIERS.BRONZE, TIERS.SILVER, TIERS.GOLD, TIERS.DIAMOND, Infinity];
    const idx = tiers.findIndex((t, i) => totalPoints >= t && totalPoints < tiers[i + 1]);
    if (idx === -1 || idx === tiers.length - 2) return { current: totalPoints, target: totalPoints, progress: 100 };
    const progress = ((totalPoints - tiers[idx]) / (tiers[idx + 1] - tiers[idx])) * 100;
    return { current: totalPoints - tiers[idx], target: tiers[idx + 1] - tiers[idx], progress: Math.min(progress, 100) };
  }, []);

  const tier     = pointsData ? getTier(pointsData.total_points) : null;
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
    retryCount: retryCountRef.current,
  };
};

export default usePointsData;
