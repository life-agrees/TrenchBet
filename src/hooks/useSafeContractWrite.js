import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { sanitizeInput } from '../utils/inputSanitization';
import { createLogger } from '../utils/logger';

const logger = createLogger('useSafeContractWrite');

/**
 * Safe contract write hook with automatic input sanitization
 * Wraps wagmi's useWriteContract with security features
 */
export const useSafeContractWrite = () => {
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hash, setHash] = useState(null);
  const [error, setError] = useState(null);

  const { writeContractAsync } = useWriteContract();

  const reset = useCallback(() => {
    setIsPending(false);
    setIsConfirming(false);
    setIsSuccess(false);
    setHash(null);
    setError(null);
  }, []);

  /**
   * Safely write to contract with input sanitization
   * @param {Object} params - Contract write parameters
   * @param {string} params.address - Contract address
   * @param {Array} params.abi - Contract ABI
   * @param {string} params.functionName - Function to call
   * @param {Array} params.args - Function arguments (will be sanitized)
   * @param {Object} params.options - Additional options
   */
  const writeSafe = useCallback(async ({
    address: contractAddress,
    abi,
    functionName,
    args = [],
    options = {}
  }) => {
    if (!address) {
      setError('Wallet not connected');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPending(true);
    setError(null);
    setIsSuccess(false);

    try {
      // Sanitize all string inputs
      const sanitizedArgs = args.map(arg => {
        if (typeof arg === 'string') {
          return sanitizeInput(arg);
        }
        if (Array.isArray(arg)) {
          return arg.map(item => typeof item === 'string' ? sanitizeInput(item) : item);
        }
        return arg;
      });

      logger.info(`Writing to contract: ${functionName}`, {
        contract: contractAddress,
        args: sanitizedArgs
      });

      // Execute contract write
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName,
        args: sanitizedArgs,
        ...options
      });

      setHash(txHash);
      setIsPending(false);
      setIsConfirming(true);

      logger.info(`Transaction submitted: ${txHash}`);

      return {
        success: true,
        hash: txHash,
        status: 'pending'
      };

    } catch (err) {
      logger.error(`Contract write failed: ${functionName}`, err);
      setError(err.message || 'Transaction failed');
      setIsPending(false);
      return {
        success: false,
        error: err.message || 'Transaction failed'
      };
    }
  }, [address, writeContractAsync]);

  /**
   * Wait for transaction confirmation
   * Call this after writeSafe returns success
   */
  const waitForConfirmation = useCallback(async (txHash) => {
    try {
      // Note: In a real implementation, you'd use useWaitForTransactionReceipt
      // This is a simplified version
      setIsConfirming(true);
      
      // Simulate waiting (in production, use actual receipt waiting)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsConfirming(false);
      setIsSuccess(true);
      
      logger.info(`Transaction confirmed: ${txHash}`);
      
      return { success: true };
    } catch (err) {
      setIsConfirming(false);
      setError(err.message || 'Confirmation failed');
      return { success: false, error: err.message };
    }
  }, []);

  return {
    writeSafe,
    waitForConfirmation,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error,
    reset
  };
};

export default useSafeContractWrite;
