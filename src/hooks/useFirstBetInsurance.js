import { useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { createLogger } from '../utils/logger';
import { INSURANCE } from '../utils/constants';
import { FIRST_BET_INSURANCE_ABI } from '../contracts/abis';

const logger = createLogger('useFirstBetInsurance');

/**
 * Hook for managing first bet insurance
 */
export const useFirstBetInsurance = () => {
  const { address, isConnected } = useAccount();
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState(null);

  // Read insurance status
  const { data: insuranceStatus, refetch: refetchStatus } = useReadContract({
    address: INSURANCE.CONTRACT_ADDRESS,
    abi: FIRST_BET_INSURANCE_ABI,
    functionName: 'getInsuranceStatus',
    args: address ? [address] : undefined,
    enabled: isConnected && !!address,
  });

  // Check if can claim
  const { data: canClaim } = useReadContract({
    address: INSURANCE.CONTRACT_ADDRESS,
    abi: FIRST_BET_INSURANCE_ABI,
    functionName: 'canClaimInsurance',
    args: address ? [address] : undefined,
    enabled: isConnected && !!address,
  });

  // Write contract
  const { writeContractAsync } = useWriteContract();

  // Claim insurance
  const claimInsurance = useCallback(async () => {
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return false;
    }

    setIsClaiming(true);
    setError(null);

    try {
      await writeContractAsync({
        address: INSURANCE.CONTRACT_ADDRESS,
        abi: FIRST_BET_INSURANCE_ABI,
        functionName: 'claimInsurance',
      });

      logger.info('Insurance claimed successfully', { address });
      await refetchStatus();
      return true;
    } catch (err) {
      logger.error('Error claiming insurance:', err);
      setError(err.message || 'Failed to claim insurance');
      return false;
    } finally {
      setIsClaiming(false);
    }
  }, [isConnected, address, writeContractAsync, refetchStatus]);

  // Parse insurance status
  const status = insuranceStatus
    ? {
        hasInsurance: insuranceStatus[0],
        betAmount: insuranceStatus[1],
        betLost: insuranceStatus[2],
        claimed: insuranceStatus[3],
      }
    : null;

  return {
    // State
    status,
    canClaim: canClaim || false,
    isClaiming,
    error,
    
    // Actions
    claimInsurance,
    refresh: refetchStatus,
    
    // Constants
    maxCoverage: INSURANCE.MAX_COVERAGE,
  };
};

export default useFirstBetInsurance;
