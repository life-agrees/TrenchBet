import { useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { createLogger } from '../utils/logger';
import { CONTRACTS } from '../utils/constants';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';

const logger = createLogger('useBetCredits');

/**
 * Hook for managing bet credits
 * Bet credits are non-withdrawable USDC that can be used for betting
 */
export const useBetCredits = () => {
  const { address, isConnected } = useAccount();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [error, setError] = useState(null);

  // Read bet credits balance
  const { data: creditsBalance, refetch: refetchCredits } = useReadContract({
    address: CONTRACTS.PROXY,
    abi: PREDICTION_MARKET_PROXY_ABI,
    functionName: 'getBetCredits',
    args: address ? [address] : undefined,
    enabled: isConnected && !!address,
  });

  // Write contract
  const { writeContractAsync } = useWriteContract();

  // Place bet using credits only
  const placeBetWithCredits = useCallback(async (marketId, choice, creditAmount) => {
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return false;
    }

    setIsPlacingBet(true);
    setError(null);

    try {
      await writeContractAsync({
        address: CONTRACTS.PROXY,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'placeBetWithCredits',
        args: [marketId, choice, creditAmount],
      });

      logger.info('Bet placed with credits', { marketId, choice, creditAmount });
      await refetchCredits();
      return true;
    } catch (err) {
      logger.error('Error placing bet with credits:', err);
      setError(err.message || 'Failed to place bet with credits');
      return false;
    } finally {
      setIsPlacingBet(false);
    }
  }, [isConnected, address, writeContractAsync, refetchCredits]);

  // Place bet using mixed credits and USDC
  const placeBetWithMixed = useCallback(async (marketId, choice, usdcAmount, creditAmount) => {
    if (!isConnected || !address) {
      setError('Wallet not connected');
      return false;
    }

    setIsPlacingBet(true);
    setError(null);

    try {
      await writeContractAsync({
        address: CONTRACTS.PROXY,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'placeBetWithMixed',
        args: [marketId, choice, usdcAmount, creditAmount],
      });

      logger.info('Bet placed with mixed payment', { marketId, choice, usdcAmount, creditAmount });
      await refetchCredits();
      return true;
    } catch (err) {
      logger.error('Error placing bet with mixed payment:', err);
      setError(err.message || 'Failed to place bet');
      return false;
    } finally {
      setIsPlacingBet(false);
    }
  }, [isConnected, address, writeContractAsync, refetchCredits]);

  // Format credits for display (6 decimals)
  const formattedCredits = creditsBalance 
    ? (Number(creditsBalance) / 1e6).toFixed(2)
    : '0.00';

  return {
    // State
    creditsBalance: creditsBalance || 0,
    formattedCredits,
    isPlacingBet,
    error,
    
    // Actions
    placeBetWithCredits,
    placeBetWithMixed,
    refresh: refetchCredits,
    
    // Helpers
    hasCredits: (amount) => (creditsBalance || 0) >= amount,
  };
};

export default useBetCredits;
