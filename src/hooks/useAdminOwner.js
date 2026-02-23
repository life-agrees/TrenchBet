import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { createLogger } from '../utils/logger';

const logger = createLogger('useAdminOwner');

// Development mode owner address - set to your wallet address
const DEV_OWNER_ADDRESS = '0x52CEb1CC4Fe3cFaCC5F0cd12EA7215734CB0AA3d';

// Simple owner ABI
const OWNER_ABI = [
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  }
];

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
    console.log('[useAdminOwner] checkOwnership called', { isConnected, address, coreContractAddress, typesContractAddress });
    
    if (!isConnected || !address) {
      console.log('[useAdminOwner] Not connected or no address');
      setIsOwner(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      console.log('[useAdminOwner] Checking contract addresses...');
      // If no contract addresses provided, use dev mode
      if (!coreContractAddress && !typesContractAddress) {

        const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
        setIsOwner(isDevOwner);
        setOwnerAddress(DEV_OWNER_ADDRESS);
        logger.info('Dev mode ownership (no contracts):', { isDevOwner, address });
        setIsLoading(false);
        return;
      }

      // Try to read from contracts using window.ethereum
      if (window.ethereum) {
        console.log('[useAdminOwner] window.ethereum available, checking contracts...');
        const provider = window.ethereum;
        
        // Check both contracts in parallel
        const [coreOwner, typesOwner] = await Promise.all([
          checkContractOwner(provider, coreContractAddress),
          checkContractOwner(provider, typesContractAddress)
        ]);

        console.log('[useAdminOwner] Contract owners result:', { coreOwner, typesOwner });

        const userAddressLower = address.toLowerCase();
        const isCoreOwner = coreOwner && coreOwner.toLowerCase() === userAddressLower;
        const isTypesOwner = typesOwner && typesOwner.toLowerCase() === userAddressLower;
        
        // User is owner if they own EITHER contract
        const isAdmin = isCoreOwner || isTypesOwner;
        
        console.log('[useAdminOwner] Ownership check:', { userAddressLower, isCoreOwner, isTypesOwner, isAdmin });
        
        // Set the owner address to the first valid one found
        const validOwner = coreOwner || typesOwner || DEV_OWNER_ADDRESS;
        
        setOwnerAddress(validOwner);
        setIsOwner(isAdmin);
        
        logger.info('Contract ownership check:', { 
          coreOwner, 
          typesOwner, 
          address, 
          isCoreOwner, 
          isTypesOwner, 
          isAdmin 
        });
      } else {
        console.log('[useAdminOwner] window.ethereum NOT available');

        // No ethereum provider, use dev mode
        const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
        setIsOwner(isDevOwner);
        setOwnerAddress(DEV_OWNER_ADDRESS);
        logger.info('Dev mode ownership (no provider):', { isDevOwner, address });
      }
    } catch (error) {
      console.error('[useAdminOwner] Error checking ownership:', error);
      logger.error('Error checking ownership:', error);
      // Fallback to dev mode on any error
      const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
      setIsOwner(isDevOwner);
      setOwnerAddress(DEV_OWNER_ADDRESS);
    } finally {
      console.log('[useAdminOwner] Setting isLoading to false, isOwner:', isOwner);
      setIsLoading(false);
    }
  }, [address, isConnected, coreContractAddress, typesContractAddress]);


  useEffect(() => {
    // Run immediately without delay for faster admin detection
    console.log('[useAdminOwner] Running ownership check...');
    checkOwnership();

    return () => {};
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
