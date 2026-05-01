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
  const { address, isConnecting, isReconnecting } = useAccount();
  const isConnected = !!address && !isReconnecting;
  const publicClient = usePublicClient({ chainId: 84532 });
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
      if (isReconnecting) {
        throw new Error('Wallet is resyncing... please try again in a moment.');
      }
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
      } else if (err.message?.toLowerCase().includes('rate limit')) {
        throw new Error('Network is busy (rate limited). Please wait a few seconds and try again.');
      }
      
      throw new Error(err.message || 'Failed to approve USDC');
    }
  }, [walletClient, address, waitForConfirmation, checkAllowance]);

  /**
   * PROXY PATTERN: Execute the place bet transaction through proxy
   */
  const executePlaceBet = useCallback(async (marketId, choice, amount, marketType) => {
    if (!walletClient || !address) {
      if (isReconnecting) {
        throw new Error('Wallet is resyncing... please try again in a moment.');
      }
      throw new Error('Wallet not connected');
    }

    // Validate inputs
    if (marketId === undefined || marketId === null) {
      throw new Error('Invalid market ID: marketId is null or undefined');
    }
    
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
      const amountInUnits = parseUnits(amount.toString(), 6);
      
      // CRITICAL FIX: Use different functions based on market type
      const isBinary = marketType === 0;
      const functionName = isBinary ? 'placeBet' : 'placeBetAdvanced';
      
      logger.info(`Placing bet via proxy (${functionName}):`, {
        marketId: numericMarketId,
        choice: numericChoice,
        amount: amount.toString(),
        amountInUnits: amountInUnits.toString(),
        marketType,
        isBinary,
        proxyAddress: PROXY_CONTRACT_ADDRESS
      });

      setIsPending(true);

      // Route to correct function based on market type
      const txHash = await walletClient.writeContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: functionName,  // ✅ Dynamic: 'placeBet' OR 'placeBetAdvanced'
        args: [BigInt(numericMarketId), numericChoice, amountInUnits],
        account: address,
      });

      logger.info('Bet placement transaction submitted:', { txHash });
      setHash(txHash);
      setIsPending(false);
      setIsConfirming(true);

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
      } else if (err.message?.toLowerCase().includes('rate limit')) {
        throw new Error('Network is busy (rate limited). Please wait a few seconds and try again.');
      }
      
      throw new Error(err.message || 'Failed to place bet');
    }
  }, [walletClient, address, waitForConfirmation]);

/**
 * Main placeBet function - handles approval ONLY (not betting)
 * Betting happens in separate placeBetAfterApproval function
 */
const placeBet = useCallback(async (market, choice, amount) => {
  if (!address && !isReconnecting) {
    setError('Wallet not connected');
    return { success: false, error: 'Wallet not connected' };
  }

  if (isReconnecting) {
    setError('Wallet is resyncing...');
    return { success: false, error: 'Wallet is resyncing... please wait.' };
  }

  if (!market || market.id === undefined || market.id === null) {
    setError('Invalid market data');
    return { success: false, error: 'Invalid market data' };
  }

  setIsPlacingBet(true);
  setIsPending(false);
  setIsConfirming(false);
  setIsSuccess(false);
  setError(null);
  setNeedsApproval(false);
  setHash(null);

  try {
    // ONLY check and approve - DO NOT place bet yet!
    logger.info('Checking if approval is needed...');
    const hasAllowance = await checkAllowance(amount);
    
    if (!hasAllowance) {
      logger.info('Approval needed, requesting USDC approval...');
      const approvalHash = await approveUSDC(amount);
      
      // STOP HERE! Don't place bet automatically
      setIsPlacingBet(false);
      return { 
        success: true, 
        approved: true,
        needsBet: true, // Signal that bet still needs to be placed
        approvalHash 
      };
    } else {
      logger.info('Sufficient allowance already exists');
      // Allowance exists, signal ready to bet
      setIsPlacingBet(false);
      return {
        success: true,
        approved: true,
        needsBet: true
      };
    }
    
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
}, [address, checkAllowance, approveUSDC]);

/**
 * Place bet AFTER approval is confirmed
 * This is called by the SECOND button
 */
const placeBetAfterApproval = useCallback(async (market, choice, amount) => {
  if (!address) {
    setError('Wallet not connected');
    return { success: false, error: 'Wallet not connected' };
  }

  setIsPlacingBet(true);
  setIsPending(false);
  setIsConfirming(false);
  setIsSuccess(false);
  setError(null);
  setHash(null);

  try {
    // Place the bet!
    logger.info('Placing bet via proxy...');
    const betHash = await executePlaceBet(market.id, choice, amount, market.marketType);
    
    return { 
      success: true, 
      txHash: betHash
    };
    
  } catch (err) {
    logger.error('Error placing bet:', err);
    setError(err.message || 'Transaction failed');
    setIsPlacingBet(false);
    setIsPending(false);
    setIsConfirming(false);
    
    return { 
      success: false, 
      error: err.message || 'Transaction failed' 
    };
  }
}, [address, executePlaceBet]);

  return {
    placeBet,
    placeBetAfterApproval, // NEW!
    checkAllowance,
    isPending,
    isConfirming,
    isPlacingBet,
    isSuccess,
    isReconnecting,
    isConnecting,
    hash,
    needsApproval,
    lastBetRef,
    error,
    reset,
    proxyAllowance: proxyAllowance ? formatUnits(proxyAllowance, 6) : '0',
    coreAllowance: proxyAllowance ? formatUnits(proxyAllowance, 6) : '0',
    typesAllowance: proxyAllowance ? formatUnits(proxyAllowance, 6) : '0'
  };
};

export default useBetPlacement;
