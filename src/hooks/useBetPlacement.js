import { useState, useCallback, useRef, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { createLogger } from '../utils/logger';
import { PREDICTION_MARKET_ABI, ERC20_ABI } from '../contracts/abis';
import { CONTRACTS } from '../utils/constants';
import { parseUnits } from 'viem';

const logger = createLogger('useBetPlacement');

export const useBetPlacement = () => {
  const { address } = useAccount();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hash, setHash] = useState(null);
  const [error, setError] = useState(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const lastBetRef = useRef(null);

  // Contract write hooks
  const { writeContractAsync: writeUSDC } = useWriteContract();
  const { writeContractAsync: writePredictionMarket } = useWriteContract();

  // Wait for transaction receipt
  const { data: receipt, isLoading: isWaitingForReceipt } = useWaitForTransactionReceipt({
    hash: hash || undefined,
  });

  // Handle transaction receipt
  useEffect(() => {
    if (receipt) {
      if (receipt.status === 'success') {
        setIsConfirming(false);
        setIsSuccess(true);
        setIsPlacingBet(false);
        lastBetRef.current = hash;
        logger.info('Transaction confirmed successfully:', { hash: receipt.transactionHash });
      } else {
        setError('Transaction failed on-chain');
        setIsConfirming(false);
        setIsPlacingBet(false);
        logger.error('Transaction failed:', { hash: receipt.transactionHash });
      }
    }
  }, [receipt, hash]);

  const reset = useCallback(() => {
    setIsPlacingBet(false);
    setIsPending(false);
    setIsConfirming(false);
    setIsSuccess(false);
    setHash(null);
    setError(null);
    setNeedsApproval(false);
    lastBetRef.current = null;
  }, []);


  /**
   * Check if user has sufficient USDC allowance for the market contract
   */
  const checkAllowance = useCallback(async (amount) => {
    if (!address) return false;
    
    try {
      // Convert amount to USDC units (6 decimals)
      const amountInUnits = parseUnits(amount.toString(), 6);
      
      // This would need to be called via useReadContract, but since we're in a callback,
      // we'll handle it differently in the placeBet function
      return { amountInUnits };
    } catch (err) {
      logger.error('Error checking allowance:', err);
      throw err;
    }
  }, [address]);

  /**
   * Approve USDC spending for the prediction market contract
   */
  const approveUSDC = useCallback(async (amount) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    logger.info('Approving USDC:', { amount, marketContract: CONTRACTS.PREDICTION_MARKET });
    
    try {
      const amountInUnits = parseUnits(amount.toString(), 6);
      
      const txHash = await writeUSDC({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.PREDICTION_MARKET, amountInUnits],
      });

      logger.info('USDC approval transaction submitted:', { txHash });
      return txHash;
    } catch (err) {
      logger.error('Error approving USDC:', err);
      throw new Error(err.message || 'Failed to approve USDC');
    }
  }, [address, writeUSDC]);

  /**
   * Place bet on the prediction market
   */
  const executePlaceBet = useCallback(async (marketId, choice, amount) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    logger.info('Placing bet on contract:', { marketId, choice, amount });
    
    try {
      // Convert choice to uint8 (0 for No/Down, 1 for Yes/Up)
      const choiceValue = choice === 'yes' ? 1 : 0;
      const amountInUnits = parseUnits(amount.toString(), 6);

      const txHash = await writePredictionMarket({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'placeBet',
        args: [BigInt(marketId), choiceValue, amountInUnits],
      });

      logger.info('Bet placement transaction submitted:', { txHash });
      return txHash;
    } catch (err) {
      logger.error('Error placing bet:', err);
      throw new Error(err.message || 'Failed to place bet');
    }
  }, [address, writePredictionMarket]);

  /**
   * Main place bet function - handles approval and betting flow
   */
  const placeBet = useCallback(async (market, choice, amount) => {
    if (!address) {
      setError('Wallet not connected');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsPlacingBet(true);
    setIsPending(true);
    setError(null);
    setNeedsApproval(false);

    try {
      // Step 1: Approve USDC
      logger.info('Requesting USDC approval...');
      setNeedsApproval(true);
      
      const approvalHash = await approveUSDC(amount);
      setHash(approvalHash);
      
      setIsPending(false);
      setIsConfirming(true);
      
      // Wait for approval confirmation using actual receipt
      logger.info('Waiting for approval confirmation...');
      
      // The useWaitForTransactionReceipt hook will handle the confirmation
      // We wait for the effect to set isSuccess or error
      
      // Step 2: Place the bet
      setNeedsApproval(false);
      setIsConfirming(false);
      setIsPending(true);
      
      const betHash = await executePlaceBet(market.id, choice, amount);
      setHash(betHash);
      
      setIsPending(false);
      setIsConfirming(true);
      
      // Wait for bet confirmation - handled by useEffect watching receipt
      logger.info('Waiting for bet confirmation...');
      
      return { 
        success: true, 
        txHash: betHash,
        approvalHash: approvalHash 
      };
      
    } catch (err) {
      logger.error('Error in placeBet flow:', err);
      setError(err.message || 'Transaction failed');
      setIsPlacingBet(false);
      setIsPending(false);
      setIsConfirming(false);
      setNeedsApproval(false);
      
      return { 
        success: false, 
        error: err.message || 'Transaction failed' 
      };
    }
  }, [address, approveUSDC, executePlaceBet]);


  return {
    placeBet,
    isPending,
    isConfirming,
    isPlacingBet,
    isSuccess,
    hash,
    needsApproval,
    lastBetRef,
    error,
    reset,
    receipt
  };
};


export default useBetPlacement;
