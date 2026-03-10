import { useState, useCallback, useRef, useEffect } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('useChartDataCache');

/**
 * Chart Data Caching Hook
 * Persists chart data in memory and localStorage
 * Cache TTL: 5 minutes by default
 * Used for admin dashboard analytics
 */
export const useChartDataCache = () => {
  const cacheRef = useRef({
    volumeTrend: null,
    userGrowth: null,
    marketType: null,
    lastFetch: {}
  });

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const CACHE_KEY_PREFIX = 'chart_data_';

  /**
   * Load cached data if still fresh
   */
  const getCachedData = useCallback((type) => {
    try {
      const stored = localStorage.getItem(`${CACHE_KEY_PREFIX}${type}`);
      if (stored) {
        const { data, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < CACHE_TTL) {
          logger.debug(`Chart cache hit for ${type}`);
          return data;
        }
      }
    } catch (error) {
      logger.warn(`Failed to load chart cache for ${type}:`, error);
    }
    return null;
  }, []);

  /**
   * Save data to cache (memory + localStorage)
   */
  const setCachedData = useCallback((type, data) => {
    try {
      // In-memory cache
      cacheRef.current[type] = data;
      cacheRef.current.lastFetch[type] = Date.now();

      // Persistent cache
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}${type}`,
        JSON.stringify({
          data,
          timestamp: Date.now()
        })
      );
      logger.debug(`Chart cache saved for ${type}`);
    } catch (error) {
      logger.warn(`Failed to save chart cache for ${type}:`, error);
    }
  }, []);

  /**
   * Get chart data with caching
   * If cache is fresh, returns cached data
   * Otherwise returns null and caller should fetch fresh data
   */
  const getChartData = useCallback((type) => {
    // Check in-memory cache first
    if (cacheRef.current[type]) {
      const cacheAge = Date.now() - cacheRef.current.lastFetch[type];
      if (cacheAge < CACHE_TTL) {
        return cacheRef.current[type];
      }
    }

    // Check localStorage
    return getCachedData(type);
  }, [getCachedData]);

  /**
   * Check if cache is still fresh for a data type
   */
  const isCacheFresh = useCallback((type) => {
    const lastFetch = cacheRef.current.lastFetch[type];
    if (!lastFetch) return false;
    return Date.now() - lastFetch < CACHE_TTL;
  }, []);

  /**
   * Invalidate all caches (force refresh)
   */
  const invalidateAll = useCallback(() => {
    cacheRef.current = {
      volumeTrend: null,
      userGrowth: null,
      marketType: null,
      lastFetch: {}
    };
    ['volumeTrend', 'userGrowth', 'marketType'].forEach(type => {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${type}`);
    });
    logger.info('All chart caches invalidated');
  }, []);

  /**
   * Invalidate specific cache type
   */
  const invalidate = useCallback((type) => {
    cacheRef.current[type] = null;
    cacheRef.current.lastFetch[type] = 0;
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${type}`);
    logger.debug(`Chart cache invalidated for ${type}`);
  }, []);

  /**
   * Get remaining TTL in milliseconds
   */
  const getRemainingTTL = useCallback((type) => {
    const lastFetch = cacheRef.current.lastFetch[type];
    if (!lastFetch) return 0;
    return Math.max(0, CACHE_TTL - (Date.now() - lastFetch));
  }, []);

  return {
    getChartData,
    setCachedData,
    isCacheFresh,
    invalidate,
    invalidateAll,
    getRemainingTTL,
    CACHE_TTL
  };
};

export default useChartDataCache;
