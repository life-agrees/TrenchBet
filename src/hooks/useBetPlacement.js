import { useState, useCallback, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient, useReadContract } from 'wagmi';
import { createLogger } from '../utils/logger';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';
import { ERC20_ABI } from '../contracts/abis';
import { CONTRACTS, PROXY_ADDRESS } from '../utils/constants';
import { parseUnits, formatUnits } from 'viem';

const logger = createLogger('useBetPlacement');

// PROXY PATTERN: All interactions go through the proxy contract
const PROXY_CONTRACT_ADDRESS = PROXY_ADDRESS;

/**
 * PROXY PATTERN: All market types use the proxy contract
 * The proxy delegates to Core/Types implementations via delegatecall
 */
function getContractForMarketType(marketType) {
  // All market types use the same proxy contract
  return {
    address: PROXY_CONTRACT_ADDRESS,
    abi: PREDICTION_MARKET_PROXY_ABI,
    source: 'proxy'
  };
}

export const useBetPlacement = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hash, setHash] = useState(null);
  const [error, setError] = useState(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const lastBetRef = useRef(null);

  // PROXY PATTERN: Read USDC allowance for proxy contract only
  const { data: proxyAllowance, refetch: refetchProxyAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && PROXY_CONTRACT_ADDRESS ? [address, PROXY_CONTRACT_ADDRESS] : undefined,
    enabled: !!address && !!PROXY_CONTRACT_ADDRESS,
  });

  // Reset state
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
   * Wait for transaction confirmation with polling
   */
  const waitForConfirmation = useCallback(async (txHash, maxAttempts = 30) => {
    if (!publicClient) {
      throw new Error('Public client not available');
    }
    
    logger.info('Waiting for transaction confirmation:', { txHash });
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const receipt = await publicClient.getTransactionReceipt({
          hash: txHash,
        });
        
        if (receipt) {
          logger.info('Transaction confirmed:', { 
            hash: txHash, 
            status: receipt.status,
            blockNumber: receipt.blockNumber 
          });
          return receipt;
        }
      } catch (err) {
        // Transaction not yet mined, continue polling
        logger.debug(`Waiting for transaction... attempt ${attempt + 1}/${maxAttempts}`);
      }
      
      // Exponential backoff: 1s, 2s, 4s, max 5s
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Transaction confirmation timeout');
  }, [publicClient]);

  /**
   * PROXY PATTERN: Check if user has sufficient USDC allowance for proxy
   */
  const checkAllowance = useCallback(async (amount) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Convert amount to USDC units (6 decimals)
      const amountInUnits = parseUnits(amount.toString(), 6);
      
      // Refresh allowance from chain
      const { data } = await refetchProxyAllowance();
      const allowance = data;
      
      logger.info('Checking allowance:', {
        contract: 'proxy',
        currentAllowance: allowance ? formatUnits(allowance, 6) : '0',
        requiredAmount: amount.toString(),
        hasEnough: allowance && allowance >= amountInUnits
      });
      
      return allowance && allowance >= amountInUnits;
    } catch (err) {
      logger.error('Error checking allowance:', err);
      throw new Error('Failed to check USDC allowance: ' + err.message);
    }
  }, [address, refetchProxyAllowance]);

  /**
   * PROXY PATTERN: Approve USDC spending for proxy contract
   */
  const approveUSDC = useCallback(async (amount) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Convert amount to USDC units (6 decimals)
      const amountInUnits = parseUnits(amount.toString(), 6);
      
      logger.info('Approving USDC for proxy:', {
        amount: amount.toString(),
        amountInUnits: amountInUnits.toString(),
        spender: PROXY_CONTRACT_ADDRESS
      });

      setNeedsApproval(true);
      setIsPending(true);

      // Send approval transaction
      const txHash = await walletClient.writeContract({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [PROXY_CONTRACT_ADDRESS, amountInUnits],
        account: address,
      });

      logger.info('USDC approval transaction submitted:', { txHash });
      setHash(txHash);
      setIsPending(false);
      setIsConfirming(true);

      // Wait for confirmation
      const receipt = await waitForConfirmation(txHash);
      
      if (receipt.status !== 'success') {
        throw new Error('USDC approval transaction failed on-chain');
      }

      logger.info('USDC approval confirmed');
      
      // Wait for state propagation (2 seconds)
      logger.info('Waiting for state propagation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Re-check allowance to confirm it worked
      const hasAllowance = await checkAllowance(amount);
      if (!hasAllowance) {
        throw new Error('Allowance check failed after approval. Please try again.');
      }
      
      setNeedsApproval(false);
      setIsConfirming(false);
      
      return txHash;
    } catch (err) {
      logger.error('Error approving USDC:', err);
      setNeedsApproval(false);
      setIsPending(false);
      setIsConfirming(false);
      
      // Provide specific error messages
      if (err.message?.includes('User rejected')) {
        throw new Error('Transaction was rejected in wallet');
      } else if (err.message?.includes('insufficient funds')) {
        throw new Error('Insufficient ETH for gas fees');
      } else if (err.message?.includes('nonce')) {
        throw new Error('Transaction nonce error. Please refresh and try again.');
      }
      
      throw new Error(err.message || 'Failed to approve USDC');
    }
  }, [walletClient, address, waitForConfirmation, checkAllowance]);

  /**
   * PROXY PATTERN: Execute the place bet transaction through proxy
   */
  const executePlaceBet = useCallback(async (marketId, choice, amount, marketType) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    // Validate inputs
    if (marketId === undefined || marketId === null) {
      throw new Error('Invalid market ID: marketId is null or undefined');
    }
    
    // Convert marketId to number if it's a string
    const numericMarketId = typeof marketId === 'string' ? parseInt(marketId, 10) : marketId;
    
    if (isNaN(numericMarketId)) {
      throw new Error(`Invalid market ID: "${marketId}" is not a valid number`);
    }
    
    if (choice === undefined || choice === null) {
      throw new Error('Invalid choice: choice is null or undefined');
    }
    
    const numericChoice = typeof choice === 'string' ? parseInt(choice, 10) : choice;
    
    if (isNaN(numericChoice)) {
      throw new Error(`Invalid choice: "${choice}" is not a valid number`);
    }

    try {
      // Convert amount to USDC units (6 decimals)
      const amountInUnits = parseUnits(amount.toString(), 6);
      
      logger.info('Placing bet via proxy:', {
        marketId: numericMarketId,
        choice: numericChoice,
        amount: amount.toString(),
        amountInUnits: amountInUnits.toString(),
        marketType,
        proxyAddress: PROXY_CONTRACT_ADDRESS
      });

      setIsPending(true);

      // Wait a moment for wallet state sync (1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // PROXY PATTERN: Send bet transaction through proxy
      // The proxy will route to appropriate implementation based on marketType
      const txHash = await walletClient.writeContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'placeBet',
        args: [BigInt(numericMarketId), numericChoice, amountInUnits],
        account: address,
      });

      logger.info('Bet placement transaction submitted:', { txHash });
      setHash(txHash);
      setIsPending(false);
      setIsConfirming(true);

      // Wait for confirmation
      const receipt = await waitForConfirmation(txHash);
      
      if (receipt.status !== 'success') {
        throw new Error('Bet placement transaction failed on-chain');
      }

      logger.info('Bet placement confirmed');
      setIsConfirming(false);
      setIsSuccess(true);
      setIsPlacingBet(false);
      lastBetRef.current = txHash;
      
      return txHash;
    } catch (err) {
      logger.error('Error placing bet:', err);
      setIsPending(false);
      setIsConfirming(false);
      setIsPlacingBet(false);
      
      // Provide specific error messages
      if (err.message?.includes('User rejected')) {
        throw new Error('Transaction was rejected in wallet');
      } else if (err.message?.includes('insufficient funds')) {
        throw new Error('Insufficient ETH for gas fees');
      } else if (err.message?.includes('Market not active')) {
        throw new Error('This market is no longer active');
      } else if (err.message?.includes('Market already resolved')) {
        throw new Error('This market has already been resolved');
      } else if (err.message?.includes('Insufficient allowance')) {
        throw new Error('USDC approval required. Please try again.');
      } else if (err.message?.includes('nonce')) {
        throw new Error('Transaction nonce error. Please refresh and try again.');
      }
      
      throw new Error(err.message || 'Failed to place bet');
    }
  }, [walletClient, address, waitForConfirmation]);

  /**
   * Main place bet function - handles approval and betting flow
   */
  const placeBet = useCallback(async (market, choice, amount) => {
    if (!address) {
      setError('Wallet not connected');
      return { success: false, error: 'Wallet not connected' };
    }

    // Validate market object
    if (!market) {
      setError('Invalid market data');
      return { success: false, error: 'Invalid market data' };
    }
    
    if (market.id === undefined || market.id === null) {
      logger.error('Invalid market object:', market);
      setError('Invalid market ID');
      return { success: false, error: 'Invalid market ID' };
    }

    setIsPlacingBet(true);
    setIsPending(false);
    setIsConfirming(false);
    setIsSuccess(false);
    setError(null);
    setNeedsApproval(false);
    setHash(null);

    try {
      // Step 1: Check if approval is needed
      logger.info('Checking if approval is needed...');
      const hasAllowance = await checkAllowance(amount);
      
      let approvalHash = null;
      
      if (!hasAllowance) {
        // Step 2: Approve USDC for proxy
        logger.info('Approval needed, requesting USDC approval...');
        approvalHash = await approveUSDC(amount);
      } else {
        logger.info('Sufficient allowance already exists');
      }
      
      // Step 3: Place the bet through proxy
      logger.info('Placing bet via proxy...');
      const betHash = await executePlaceBet(market.id, choice, amount, market.marketType);
      
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
  }, [address, checkAllowance, approveUSDC, executePlaceBet]);

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
    // Return proxy allowance for UI display
    proxyAllowance: proxyAllowance ? formatUnits(proxyAllowance, 6) : '0',
    // Keep old names for backward compatibility
    coreAllowance: proxyAllowance ? formatUnits(proxyAllowance, 6) : '0',
    typesAllowance: proxyAllowance ? formatUnits(proxyAllowance, 6) : '0'
  };
};

export default useBetPlacement;
