import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { createLogger } from '../utils/logger';
import { PROXY_ADDRESS } from '../utils/constants';

const logger = createLogger('useAdminOwner');

const DEV_OWNER_ADDRESS = '0x52CEb1CC4Fe3cFaCC5F0cd12EA7215734CB0AA3d';

/**
 * useAdminOwner
 *
 * FIX 1: Replaced `window.ethereum` with wagmi's `usePublicClient`.
 *        `window.ethereum` is only the injected MetaMask provider — it's
 *        undefined for WalletConnect, Coinbase Wallet, and other connectors.
 *        usePublicClient({ chainId: 84532 }) returns whichever transport the user connected with.
 *
 * FIX 2: `coreContractAddress` and `typesContractAddress` params were
 *        accepted but completely unused (only PROXY_ADDRESS was ever read).
 *        Removed from the function signature to avoid confusion.
 *        All ownership lives in the proxy — reading core/types would always
 *        return their local storage which is empty (they're logic-only).
 *
 * FIX 3: `logger.info('...isOwner:', isOwner)` in the finally block read
 *        the stale state variable, not the newly computed value.
 *        Moved the log to use the local `isAdmin` variable instead.
 */
export const useAdminOwner = () => { // FIX 2: unused params removed
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: baseSepolia.id }); // FIX 1: wagmi instead of window.ethereum

  const [isOwner, setIsOwner]         = useState(false);
  const [isLoading, setIsLoading]     = useState(true);
  const [ownerAddress, setOwnerAddress] = useState(null);

  const checkOwnership = useCallback(async () => {
    logger.info('checkOwnership called', { isConnected, address, PROXY_ADDRESS });

    if (!isConnected || !address) {
      setIsOwner(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      if (!PROXY_ADDRESS) {
        const isAdmin = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
        setIsOwner(isAdmin);
        setOwnerAddress(DEV_OWNER_ADDRESS);
        logger.info('Dev mode (no proxy):', { isAdmin });
        return;
      }

      if (!publicClient) {
        // No provider available — fall back to dev check
        const isAdmin = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
        setIsOwner(isAdmin);
        setOwnerAddress(DEV_OWNER_ADDRESS);
        logger.info('Dev mode (no publicClient):', { isAdmin });
        return;
      }

      // FIX 1: use wagmi publicClient.readContract instead of window.ethereum eth_call
      let proxyOwner = null;
      try {
        const result = await publicClient.readContract({
          address: PROXY_ADDRESS,
          abi: [{ name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }],
          functionName: 'owner',
        });
        proxyOwner = result || null;
      } catch (e) {
        logger.warn('Failed to read proxy owner:', e.message);
      }

      let isAdmin;
      if (proxyOwner) {
        isAdmin = proxyOwner.toLowerCase() === address.toLowerCase();
        setOwnerAddress(proxyOwner);
        logger.info('Proxy ownership check:', { address, proxyOwner, isAdmin }); // FIX 3: log local var
      } else {
        isAdmin = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
        setOwnerAddress(DEV_OWNER_ADDRESS);
        logger.info('Dev mode (no proxy owner found):', { isAdmin });
      }

      setIsOwner(isAdmin);
    } catch (error) {
      logger.error('Error checking ownership:', error);
      const isAdmin = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
      setIsOwner(isAdmin);
      setOwnerAddress(DEV_OWNER_ADDRESS);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, publicClient]);

  useEffect(() => {
    checkOwnership();
  }, [checkOwnership]);

  return {
    isOwner,
    isLoading,
    ownerAddress: ownerAddress || DEV_OWNER_ADDRESS,
    refreshOwnership: checkOwnership,
  };
};

export default useAdminOwner;
