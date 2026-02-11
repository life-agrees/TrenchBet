import { useCallback } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('usePrefetchMarket');

export const usePrefetchMarket = () => {
  const prefetchMarket = useCallback(async (marketId) => {
    try {
      logger.info('Prefetching market:', marketId);
      // Mock prefetch - in real app, this would fetch and cache market data
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (err) {
      logger.error('Error prefetching market:', err);
      return false;
    }
  }, []);

  const handleMouseEnter = useCallback((marketId) => {
    // Prefetch market data on hover
    prefetchMarket(marketId);
  }, [prefetchMarket]);

  const handleMouseLeave = useCallback(() => {
    // Cleanup if needed
  }, []);

  return {
    prefetchMarket,
    handleMouseEnter,
    handleMouseLeave
  };
};

export default usePrefetchMarket;
