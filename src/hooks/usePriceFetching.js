import { useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS } from '../config/wagmi';
import { PREDICTION_MARKET_ABI } from '../contracts/abis';
import { createLogger } from '../utils/logger';

const logger = createLogger('usePriceFetching');

export const usePriceFetching = () => {
  const publicClient = usePublicClient();
  const [currentAssetPrice, setCurrentAssetPrice] = useState(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCurrentPrice = useCallback(async (asset) => {
    if (!publicClient || !asset) return null;
    
    setIsPriceLoading(true);
    setError(null);
    
    try {
      // Read price from Chainlink oracle via contract
      const price = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getCurrentPrice',
        args: [asset],
      });
      
      // Format: Chainlink uses 8 decimals
      const priceNumber = parseFloat(formatUnits(price, 8));
      setCurrentAssetPrice(priceNumber);
      return priceNumber;

    } catch (err) {
      logger.error(`Error fetching price for ${asset}:`, err);
      setError(err.message);
      setCurrentAssetPrice(null);
      return null;
    } finally {
      setIsPriceLoading(false);
    }
  }, [publicClient]);

  return {
    currentAssetPrice,
    isPriceLoading,
    error,
    fetchCurrentPrice
  };
};

export default usePriceFetching;
