import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TRENCHY_POINTS_CLAIM_ABI } from '../contracts/abis';
import { createLogger } from '../utils/logger';

const logger = createLogger('usePointsClaim');

// Contract address from env
const CLAIMS_CONTRACT_ADDRESS = import.meta.env.VITE_CLAIMS_CONTRACT_ADDRESS;

export const usePointsClaim = () => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [claimData, setClaimData] = useState(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Step 1: Prepare claim - get signature from backend
  const prepareClaim = useCallback(async (pointsAmount) => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.info('Preparing claim for', pointsAmount, 'points');
      
      const response = await fetch('/api/points/prepare-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet: address,
          pointsAmount: parseInt(pointsAmount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to prepare claim');
      }

      logger.info('Claim prepared successfully:', data);
      setClaimData(data);
      return data;
    } catch (err) {
      logger.error('Error preparing claim:', err);
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Step 2: Execute claim on contract
  const executeClaim = useCallback(async (autoStake = false) => {
    if (!claimData) {
      setError('No claim data available. Prepare claim first.');
      return false;
    }

    if (!CLAIMS_CONTRACT_ADDRESS) {
      setError('Claims contract address not configured');
      return false;
    }

    try {
      logger.info('Executing claim with autoStake:', autoStake);
      
      // ✅ FIXED: Correct argument order matching contract signature
      // function claimPoints(uint256 pointsAmount, bool autoStake, bytes32 nonce, bytes signature)
      await writeContract({
        address: CLAIMS_CONTRACT_ADDRESS,
        abi: TRENCHY_POINTS_CLAIM_ABI,
        functionName: 'claimPoints',
        args: [
          BigInt(claimData.pointsAmount),  // uint256 pointsAmount
          autoStake,                        // bool autoStake
          claimData.nonce,                 // bytes32 nonce
          claimData.signature,             // bytes signature
        ],
      });

      return true;
    } catch (err) {
      logger.error('Error executing claim:', err);
      setError(err.message);
      return false;
    }
  }, [claimData, writeContract]);

  // Reset state
  const reset = useCallback(() => {
    setClaimData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    // State
    isLoading: isLoading || isPending || isConfirming,
    isSuccess,
    error,
    claimData,
    transactionHash: hash,
    
    // Actions
    prepareClaim,
    executeClaim,
    reset,
  };
};

export default usePointsClaim;