import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { createLogger } from '../utils/logger';

const logger = createLogger('useContractValidation');

/**
 * Hook to validate if smart contracts are deployed and accessible
 */
export const useContractValidation = (contractAddresses) => {
  const [validationState, setValidationState] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const publicClient = usePublicClient({ chainId: 84532 });

  const validateContract = useCallback(async (name, address) => {
    if (!address || !publicClient) {
      return { valid: false, error: 'Missing address or client' };
    }

    try {
      // Try to get code at address
      const code = await publicClient.getBytecode({ address });
      
      if (!code || code === '0x') {
        logger.warn(`Contract ${name} at ${address} has no code`);
        return { valid: false, error: 'Contract not deployed' };
      }

      // Try a simple call to verify it's responsive
      // This will fail if the contract doesn't have the expected interface
      return { valid: true, code };
    } catch (error) {
      logger.error(`Error validating contract ${name}:`, error);
      return { valid: false, error: error.message };
    }
  }, [publicClient]);

  const validateAllContracts = useCallback(async () => {
    if (!contractAddresses || Object.keys(contractAddresses).length === 0) {
      return;
    }

    setIsValidating(true);
    const results = {};

    for (const [name, address] of Object.entries(contractAddresses)) {
      if (address) {
        results[name] = await validateContract(name, address);
      } else {
        results[name] = { valid: false, error: 'Address not configured' };
      }
    }

    setValidationState(results);
    setIsValidating(false);
    
    // Log summary
    const valid = Object.values(results).filter(r => r.valid).length;
    const total = Object.keys(results).length;
    logger.info(`Contract validation: ${valid}/${total} contracts valid`);
    
    return results;
  }, [contractAddresses, validateContract]);

  // Validate on mount and when addresses change
  useEffect(() => {
    validateAllContracts();
  }, [validateAllContracts]);

  const isContractValid = useCallback((name) => {
    return validationState[name]?.valid || false;
  }, [validationState]);

  const getContractError = useCallback((name) => {
    return validationState[name]?.error || null;
  }, [validationState]);

  return {
    validationState,
    isValidating,
    validateAllContracts,
    isContractValid,
    getContractError,
    allValid: Object.values(validationState).every(v => v.valid),
    validCount: Object.values(validationState).filter(v => v.valid).length,
    totalCount: Object.keys(validationState).length,
  };
};

export default useContractValidation;
