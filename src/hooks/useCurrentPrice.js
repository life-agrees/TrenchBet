import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
// FIX: Removed unused PRICE_FEEDS import from wagmi.js — it was imported
// but never referenced anywhere in this file.
import { CHAINLINK_RESOLVER_ABI } from '../contracts/abis';
import { CHAINLINK_RESOLVER_ADDRESS, SUPPORTED_ASSETS } from '../utils/constants';
import { createLogger } from '../utils/logger';

const logger = createLogger('useCurrentPrice');

/**
 * Hook to fetch current price for a single asset via Chainlink.
 *
 * ⚠️ PERFORMANCE NOTE: Each component calling this hook creates its own
 * 30-second polling interval. If 10 MarketCards all show BTC markets,
 * that's 10 simultaneous getLatestPrice('BTC') calls every 30 seconds.
 * For lists of cards, prefer passing currentPrice as a prop from a
 * parent-level useCurrentPrices() call instead.
 */
export function useCurrentPrice(asset) {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [isLoading, setIsLoading]       = useState(true);
  const publicClient = usePublicClient({ chainId: baseSepolia.id });

  useEffect(() => {
    // Null asset is valid — parent may pass null to suppress fetching
    if (!asset || !publicClient || !CHAINLINK_RESOLVER_ADDRESS) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchPrice = async () => {
      try {
        setIsLoading(true);
        // FIX: Skip price fetch for custom/multi-choice markets (no Chainlink feed)
        const upperAsset = asset.toUpperCase();
        if (!['BTC', 'ETH', 'LINK'].includes(upperAsset)) {
          logger.debug(`Skipping price fetch for custom asset: ${asset}`);
          if (isMounted) setCurrentPrice(null);
          setIsLoading(false);
          return;
        }

        const price = await publicClient.readContract({
          address: CHAINLINK_RESOLVER_ADDRESS,
          abi: CHAINLINK_RESOLVER_ABI,
          functionName: 'getLatestPrice',
          args: [upperAsset],
        });

        if (isMounted && price) {
          setCurrentPrice(Number(price) / 1e8);
          logger.debug(`Current ${asset} price:`, Number(price) / 1e8);
        }
      } catch (error) {
        logger.error(`Error fetching ${asset} price:`, error);
        if (isMounted) setCurrentPrice(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30_000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [asset, publicClient]);

  return { currentPrice, isLoading };
}

/**
 * Hook to fetch prices for multiple assets in a single effect.
 * Use this at the list/page level and pass prices down as props
 * to avoid N parallel polling intervals for the same assets.
 */
export function useCurrentPrices(assets = ['BTC', 'ETH', 'LINK']) {
  const [prices, setPrices]   = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient({ chainId: baseSepolia.id });

  // Stable serialised key so the effect doesn't re-run on array identity changes
  const assetsKey = JSON.stringify([...assets].sort());

  useEffect(() => {
    const parsedAssets = JSON.parse(assetsKey);

    if (!parsedAssets.length || !publicClient || !CHAINLINK_RESOLVER_ADDRESS) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchPrices = async () => {
      try {
        setIsLoading(true);

        const results = await Promise.all(
          parsedAssets.map(async (asset) => {
            const upper = asset.toUpperCase();

            if (!SUPPORTED_ASSETS.WITH_PRICE_FEEDS.includes(upper)) {
              logger.warn(`Skipping unsupported asset: ${asset}`);
              return [asset, null];
            }

            try {
              const price = await publicClient.readContract({
                address: CHAINLINK_RESOLVER_ADDRESS,
                abi: CHAINLINK_RESOLVER_ABI,
                functionName: 'getLatestPrice',
                args: [upper],
              });
              return [asset, Number(price) / 1e8];
            } catch (error) {
              logger.error(`Error fetching ${asset} price:`, error);
              return [asset, null];
            }
          })
        );

        if (isMounted) {
          setPrices(Object.fromEntries(results));
          logger.debug('Current prices:', Object.fromEntries(results));
        }
      } catch (error) {
        logger.error('Error fetching prices:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [assetsKey, publicClient]);

  return { prices, isLoading };
}

export default useCurrentPrice;
