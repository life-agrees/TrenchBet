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

export const useAdminOwner = (contractAddress) => {
  const { address, isConnected } = useAccount();
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ownerAddress, setOwnerAddress] = useState(null);

  const checkOwnership = useCallback(async () => {
    if (!isConnected || !address) {
      setIsOwner(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // If no contract address, use dev mode
      if (!contractAddress) {
        const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
        setIsOwner(isDevOwner);
        setOwnerAddress(DEV_OWNER_ADDRESS);
        logger.info('Dev mode ownership:', { isDevOwner, address });
        setIsLoading(false);
        return;
      }

      // Try to read from contract using window.ethereum
      if (window.ethereum) {
        const provider = window.ethereum;
        
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
          const owner = '0x' + result.slice(26);
          const matches = owner.toLowerCase() === address.toLowerCase();
          
          setOwnerAddress(owner);
          setIsOwner(matches);
          
          logger.info('Contract ownership check:', { owner, address, matches });
        } else {
          // Fallback to dev mode
          const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
          setIsOwner(isDevOwner);
          setOwnerAddress(DEV_OWNER_ADDRESS);
        }
      } else {
        // No ethereum provider, use dev mode
        const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
        setIsOwner(isDevOwner);
        setOwnerAddress(DEV_OWNER_ADDRESS);
      }
    } catch (error) {
      logger.error('Error checking ownership:', error);
      // Fallback to dev mode on any error
      const isDevOwner = address.toLowerCase() === DEV_OWNER_ADDRESS.toLowerCase();
      setIsOwner(isDevOwner);
      setOwnerAddress(DEV_OWNER_ADDRESS);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, contractAddress]);

  useEffect(() => {
    // Small delay to ensure React is fully initialized
    const timeoutId = setTimeout(checkOwnership, 100);

    return () => {
      clearTimeout(timeoutId);
    };
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
