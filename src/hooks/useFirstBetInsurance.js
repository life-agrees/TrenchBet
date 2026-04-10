import { useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { createLogger } from '../utils/logger';
import { CONTRACTS } from '../utils/constants';
import { FIRST_BET_INSURANCE_ABI } from '../contracts/abis';

const logger = createLogger('useFirstBetInsurance');

/**
 * useFirstBetInsurance
 *
 * FIX: Previously used `INSURANCE.CONTRACT_ADDRESS` which doesn't exist.
 * The `INSURANCE` export from constants.js only has `MAX_COVERAGE: '100'` —
 * no CONTRACT_ADDRESS field. Both `useReadContract` calls received
 * `address: undefined` and silently did nothing, meaning:
 *   - `insuranceStatus` was always undefined
 *   - `canClaim` was always undefined
 *   - The insurance feature was completely non-functional
 *
 * Fix: Use `CONTRACTS.INSURANCE` which is the correct address constant
 * (set from VITE_INSURANCE_CONTRACT_ADDRESS env var, defaults to zero address).
 *
 * NOTE: CONTRACTS.INSURANCE defaults to '0x000...000' in constants.js.
 * The `enabled` guard below prevents reads when the address is the zero address.
 */
export const useFirstBetInsurance = () => {
  const { address, isConnected } = useAccount();
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError]           = useState(null);

  // FIX: CONTRACTS.INSURANCE (correct) instead of INSURANCE.CONTRACT_ADDRESS (undefined)
  const contractAddress = CONTRACTS.INSURANCE;

  // Guard: skip reads if contract not deployed (zero address)
  const isDeployed = contractAddress &&
    contractAddress !== '0x0000000000000000000000000000000000000000';

  const { data: insuranceStatus, refetch: refetchStatus } = useReadContract({
    address:      contractAddress,
    abi:          FIRST_BET_INSURANCE_ABI,
    functionName: 'getInsuranceStatus',
    args:         address ? [address] : undefined,
    enabled:      isConnected && !!address && isDeployed,
  });

  const { data: canClaimData } = useReadContract({
    address:      contractAddress,
    abi:          FIRST_BET_INSURANCE_ABI,
    functionName: 'canClaimInsurance',
    args:         address ? [address] : undefined,
    enabled:      isConnected && !!address && isDeployed,
  });

  const { writeContractAsync } = useWriteContract();

  const claimInsurance = useCallback(async () => {
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return false;
    }
    if (!isDeployed) {
      setError('Insurance contract not deployed');
      return false;
    }

    setIsClaiming(true);
    setError(null);

    try {
      await writeContractAsync({
        address:      contractAddress,
        abi:          FIRST_BET_INSURANCE_ABI,
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
  }, [isConnected, address, isDeployed, contractAddress, writeContractAsync, refetchStatus]);

  const status = insuranceStatus
    ? {
        hasInsurance: insuranceStatus[0],
        betAmount:    insuranceStatus[1],
        betLost:      insuranceStatus[2],
        claimed:      insuranceStatus[3],
      }
    : null;

  return {
    status,
    canClaim:    canClaimData ?? false,
    isClaiming,
    error,
    claimInsurance,
    refresh:     refetchStatus,
    maxCoverage: '100', // INSURANCE.MAX_COVERAGE
  };
};

export default useFirstBetInsurance;
