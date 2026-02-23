import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { PRICE_FEEDS } from '../config/wagmi';
import { CHAINLINK_RESOLVER_ABI } from '../contracts/abis';
import { CHAINLINK_RESOLVER_ADDRESS, SUPPORTED_ASSETS } from '../utils/constants';
import { createLogger } from '../utils/logger';


const logger = createLogger('useCurrentPrice');


/**
 * Hook to fetch current price for a market asset
 * Fetches from contract's getCurrentPrice() which uses Chainlink
 */
export function useCurrentPrice(asset) {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    let isMounted = true;

    const fetchPrice = async () => {
      if (!asset || !publicClient || !CHAINLINK_RESOLVER_ADDRESS) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const price = await publicClient.readContract({
          address: CHAINLINK_RESOLVER_ADDRESS,
          abi: CHAINLINK_RESOLVER_ABI,
          functionName: 'getLatestPrice',
          args: [asset]
        });


        if (isMounted && price) {
          // Convert from 8 decimals (Chainlink format)
          const formattedPrice = Number(price) / (10 ** 8);
          setCurrentPrice(formattedPrice);
          logger.debug(`Current ${asset} price:`, formattedPrice);
        }
      } catch (error) {
        logger.error(`Error fetching ${asset} price:`, error);
        setCurrentPrice(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPrice();

    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [asset, publicClient]);

  return { currentPrice, isLoading };
}

/**
 * Hook to fetch current prices for multiple assets at once
 */
export function useCurrentPrices(assets = ['BTC', 'ETH', 'LINK']) {

  const [prices, setPrices] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    let isMounted = true;

    const fetchPrices = async () => {
      if (!assets || assets.length === 0 || !publicClient || !CHAINLINK_RESOLVER_ADDRESS) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const pricePromises = assets.map(async (asset) => {
          // Skip unsupported assets
          if (!SUPPORTED_ASSETS.WITH_PRICE_FEEDS.includes(asset.toUpperCase())) {
            logger.warn(`Skipping unsupported asset: ${asset}`);
            return [asset, null];
          }

          try {
            const price = await publicClient.readContract({
              address: CHAINLINK_RESOLVER_ADDRESS,
              abi: CHAINLINK_RESOLVER_ABI,
              functionName: 'getLatestPrice',
              args: [asset]
            });

            // Convert from 8 decimals
            const formattedPrice = Number(price) / (10 ** 8);
            return [asset, formattedPrice];
          } catch (error) {
            const errorMessage = error?.message || '';
            if (errorMessage.includes('Price feed not found')) {
              logger.error(`Price feed not configured for ${asset}`);
            } else {
              logger.error(`Error fetching ${asset} price:`, error);
            }
            return [asset, null];
          }
        });


        const results = await Promise.all(pricePromises);
        
        if (isMounted) {
          const pricesObject = Object.fromEntries(results);
          setPrices(pricesObject);
          logger.debug('Current prices:', pricesObject);
        }
      } catch (error) {
        logger.error('Error fetching prices:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPrices();

    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [JSON.stringify(assets), publicClient]); // Stringify assets array for dependency

  return { prices, isLoading };
}

export default useCurrentPrice;
