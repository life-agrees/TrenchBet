import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { createLogger } from '../utils/logger';
import { PROXY_ADDRESS } from '../utils/constants';

const logger = createLogger('useAdminOwner');

// Development mode owner address - your admin wallet
const DEV_OWNER_ADDRESS = '0x52CEb1CC4Fe3cFaCC5F0cd12EA7215734CB0AA3d';

/**
 * Check owner of a single contract
 */
const checkContractOwner = async (provider, contractAddress) => {
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  try {
    // Encode the owner() function call
    const data = '0x8da5cb5b'; // keccak256('owner()') first 4 bytes
    
    const result = await provider.request({
      method: 'eth_call',
      params: [{
        to: contractAddress,
        data: data
      }, 'latest']
    });

    if (result && result !== '0x') {
      // Decode the address (remove 0x prefix and pad)
      return '0x' + result.slice(26);
    }
    return null;
  } catch (error) {
    logger.warn(`Failed to check owner for ${contractAddress}:`, error.message);
    return null;
  }
};

export const useAdminOwner = (coreContractAddress, typesContractAddress) => {
  const { address, isConnected } = useAccount();
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ownerAddress, setOwnerAddress] = useState(null);

  const checkOwnership = useCallback(async () => {
    logger.info('checkOwnership called', { 
      isConnected, 
      address, 
      PROXY_ADDRESS 
    });
    
    if (!isConnected || !address) {
      logger.info('Not connected or no address');
      setIsOwner(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // If no PROXY_ADDRESS, use dev mode
      if (!PROXY_ADDRESS) {
        const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
        setIsOwner(isDevOwner);
        setOwnerAddress(DEV_OWNER_ADDRESS);
        logger.info('Dev mode ownership (no proxy):', { isDevOwner, address });
        setIsLoading(false);
        return;
      }

      // Check PROXY ownership (primary method)
      if (window.ethereum) {
        logger.info('Checking proxy ownership...');
        const provider = window.ethereum;
        
        const proxyOwner = await checkContractOwner(provider, PROXY_ADDRESS);
        logger.info('Proxy owner result:', proxyOwner);
        
        if (proxyOwner) {
          const userAddressLower = address.toLowerCase();
          const isAdmin = proxyOwner.toLowerCase() === userAddressLower;
          
          logger.info('Ownership check:', { 
            userAddressLower, 
            proxyOwner, 
            isAdmin 
          });
          
          setOwnerAddress(proxyOwner);
          setIsOwner(isAdmin);
        } else {
          // No owner found, use dev mode
          const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
          setIsOwner(isDevOwner);
          setOwnerAddress(DEV_OWNER_ADDRESS);
          logger.info('Dev mode ownership (no proxy owner):', { isDevOwner, address });
        }
      } else {
        // No ethereum provider, use dev mode
        const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
        setIsOwner(isDevOwner);
        setOwnerAddress(DEV_OWNER_ADDRESS);
        logger.info('Dev mode ownership (no provider):', { isDevOwner, address });
      }
    } catch (error) {
      logger.error('Error checking ownership:', error);
      // Fallback to dev mode on error
      const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
      setIsOwner(isDevOwner);
      setOwnerAddress(DEV_OWNER_ADDRESS);
    } finally {
      logger.info('Setting isLoading to false, isOwner:', isOwner);
      setIsLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    logger.info('Running ownership check...');
    checkOwnership();
  }, [checkOwnership]);

  const refreshOwnership = useCallback(() => {
    checkOwnership();
  }, [checkOwnership]);

  return {
    isOwner,
    isLoading,
    ownerAddress: ownerAddress || DEV_OWNER_ADDRESS,
    refreshOwnership
  };
};

export default useAdminOwner;