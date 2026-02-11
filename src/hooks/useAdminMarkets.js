import { useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { PREDICTION_MARKET_ABI } from '../contracts/abis';
import { createLogger } from '../utils/logger';

const logger = createLogger('useAdminMarkets');

export const useAdminMarkets = (contractAddress) => {
  const publicClient = usePublicClient();
  const [markets, setMarkets] = useState([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
  const [error, setError] = useState(null);

  const fetchMarketDetails = useCallback(async (id) => {
    try {
      const data = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getMarket',
        args: [BigInt(id)],
      });

      const market = {
        id,
        marketType: Number(data.marketType),
        asset: data.asset,
        endTime: Number(data.endTime) * 1000,
        resolved: data.resolved,
        totalBets: Number(data.totalBets),
        options: []
      };

      // Fetch options for multi-choice markets
      if (market.marketType === 1) {
        try {
          const options = await publicClient.readContract({
            address: contractAddress,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'getMultiChoiceOptions',
            args: [BigInt(id)],
          });
          market.options = options;
        } catch (e) {
          logger.warn(`Could not fetch options for market ${id}:`, e);
        }
      }

      return market;
    } catch (e) {
      logger.error(`Error fetching market ${id}:`, e);
      return null;
    }
  }, [publicClient, contractAddress]);

  const fetchMarkets = useCallback(async () => {
    if (!publicClient || !contractAddress) return;

    setIsLoadingMarkets(true);
    setError(null);

    try {
      // Get market counter
      const counter = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'marketCounter',
      });

      const count = Number(counter);
      const marketPromises = [];

      // Fetch all markets in reverse order (newest first)
      for (let i = count - 1; i >= 0; i--) {
        marketPromises.push(fetchMarketDetails(i));
      }

      const fetched = await Promise.all(marketPromises);
      const validMarkets = fetched.filter(m => m !== null);
      
      setMarkets(validMarkets);
      logger.info(`Fetched ${validMarkets.length} markets`);

    } catch (err) {
      logger.error('Error fetching markets:', err);
      setError(err.message);
    } finally {
      setIsLoadingMarkets(false);
    }
  }, [publicClient, contractAddress, fetchMarketDetails]);

  return {
    markets,
    isLoadingMarkets,
    error,
    fetchMarkets,
    fetchMarketDetails
  };
};

export default useAdminMarkets;
