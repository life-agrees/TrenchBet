import { useState, useCallback, useRef } from 'react';
import { useAccount, usePublicClient, useWalletClient, useReadContract } from 'wagmi';
import { createLogger } from '../utils/logger';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';
import { ERC20_ABI } from '../contracts/abis';
import { useContractAddresses } from './useContractAddresses';
import { parseUnits, formatUnits } from 'viem';

const logger = createLogger('useBetPlacement');

// PROXY PATTERN: All interactions go through the proxy contract
// Handled dynamically via useContractAddresses inside the hook

export const useBetPlacement = () => {
  const { address, isConnecting, isReconnecting } = useAccount();
  const isConnected = !!address && !isReconnecting;

  const { PROXY: PROXY_CONTRACT_ADDRESS, USDC: USDC_ADDRESS, chainId, isArc } = useContractAddresses();

  const publicClient = usePublicClient({ chainId });
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
    address: USDC_ADDRESS,
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
  const checkAllowance = useCallback(async (amount, useCache = false) => {
    if (!address) {
      if (isReconnecting) {
        throw new Error('Wallet is resyncing... please try again in a moment.');
      }
      throw new Error('Wallet not connected');
    }
    
    try {
      // Convert amount to USDC units (6 decimals)
      const amountInUnits = parseUnits(amount.toString(), 6);
      
      let allowance = proxyAllowance;
      
      // Refresh allowance from chain only if requested or if cache is empty
      if (!useCache || allowance === undefined) {
        const { data } = await refetchProxyAllowance();
        allowance = data;
      }
      
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
  }, [address, refetchProxyAllowance, proxyAllowance]);

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
      // On Arc, eth_estimateGas is very slow/fails. We bypass it by providing a manual gas limit.
      const gasLimit = isArc ? 100000n : undefined;
      
      let txHash;
      try {
        txHash = await walletClient.writeContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [PROXY_CONTRACT_ADDRESS, amountInUnits],
          account: address,
          gas: gasLimit,
        });
      } catch (approveErr) {
        const isRpcSimFailure = approveErr.message?.includes('Internal error') ||
          approveErr.message?.includes('InternalRpcError') ||
          (approveErr.cause?.message || '').includes('Transaction failed');
        
        if (isRpcSimFailure && !gasLimit) {
          logger.warn('Approve simulation failed on RPC, retrying with manual gas...');
          txHash = await walletClient.writeContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [PROXY_CONTRACT_ADDRESS, amountInUnits],
            account: address,
            gas: 100000n, // ERC-20 approve is cheap; 100k gas is more than enough
          });
        } else {
          throw approveErr;
        }
      }

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
      
      // Wait for state propagation — Arc produces ~1 block/sec so we wait 5 blocks (5s)
      // to ensure the allowance is readable by the next RPC call.
      logger.info('Waiting for state propagation (5s for Arc)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
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

      // ── Step 1: Pre-flight market validity check ──
      try {
        const marketState = await publicClient.readContract({
          address: PROXY_CONTRACT_ADDRESS,
          abi: PREDICTION_MARKET_PROXY_ABI,
          functionName: 'markets',
          args: [BigInt(numericMarketId)],
        });
        if (marketState) {
          const resolved  = Boolean(marketState.resolved  ?? marketState[9]);
          const endTime   = Number(marketState.endTime    ?? marketState[4] ?? 0);
          const startTime = Number(marketState.startTime  ?? marketState[3] ?? 0);
          const nowSec    = Math.floor(Date.now() / 1000);

          if (resolved) throw new Error('This market has already been resolved. Please choose an active market.');
          if (startTime === 0) throw new Error('Market not found on this network.');
          if (endTime > 0 && nowSec >= endTime) throw new Error('This market has already expired. Please choose an active market.');
          
          logger.info('Pre-flight market check passed:', { marketId: numericMarketId, resolved, endTime, nowSec });
        }
      } catch (preflightErr) {
        if (preflightErr.message?.includes('already') || 
            preflightErr.message?.includes('expired') ||
            preflightErr.message?.includes('not found')) {
          throw preflightErr;
        }
        logger.warn('Pre-flight check failed (non-critical):', preflightErr.message);
      }

      // ── Step 2: Verify USDC allowance is still valid ──
      // The allowance might have staled or changed between approve and bet.
      try {
        const { data: currentAllowance } = await refetchProxyAllowance();
        logger.info('Live allowance check before bet:', {
          allowance: currentAllowance ? formatUnits(currentAllowance, 6) : '0',
          required: amount.toString(),
          sufficient: currentAllowance >= amountInUnits
        });
        if (currentAllowance < amountInUnits) {
          throw new Error(`Insufficient USDC allowance. Approved: ${formatUnits(currentAllowance, 6)}, Required: ${amount}. Please re-approve.`);
        }
      } catch (allowanceErr) {
        if (allowanceErr.message?.includes('Insufficient USDC allowance')) throw allowanceErr;
        logger.warn('Live allowance check failed (non-critical):', allowanceErr.message);
      }

      // ── Step 3: Determine correct function ──
      const normalizedType = Number(marketType);
      const isBinary = normalizedType === 0;
      const functionName = isBinary ? 'placeBet' : 'placeBetAdvanced';
      
      logger.info(`Placing bet via proxy (${functionName}):`, {
        marketId: numericMarketId,
        choice: numericChoice,
        amountInUnits: amountInUnits.toString(),
        marketType: normalizedType,
        proxyAddress: PROXY_CONTRACT_ADDRESS
      });

      setIsPending(true);

      // ── Step 4: Simulate first to get REAL revert reason ──
      // Skip simulation on Arc to prevent extreme latency, as Arc RPC struggles with simulateContract
      if (!isArc) {
        try {
          await publicClient.simulateContract({
            address: PROXY_CONTRACT_ADDRESS,
            abi: PREDICTION_MARKET_PROXY_ABI,
            functionName: functionName,
            args: [BigInt(numericMarketId), numericChoice, amountInUnits],
            account: address,
          });
          logger.info('Simulation passed, sending transaction...');
        } catch (simErr) {
          // Extract the most useful error message
          const simMsg = simErr.cause?.shortMessage || simErr.shortMessage || simErr.message || '';
          logger.warn('Simulation failed:', simMsg);

          // If it's a known contract revert, throw a user-friendly error
          if (simMsg.includes('already resolved') || simMsg.includes('Market resolved')) {
            throw new Error('This market has already been resolved.');
          } else if (simMsg.includes('expired') || simMsg.includes('ended')) {
            throw new Error('This market has expired and is no longer accepting bets.');
          } else if (simMsg.includes('allowance') || simMsg.includes('ERC20') || simMsg.includes('transfer')) {
            throw new Error('USDC allowance issue. Please re-approve and try again.');
          } else if (simMsg.includes('paused')) {
            throw new Error('The contract is currently paused. Please try again later.');
          }
          // For RPC/network simulation errors
          const isGenericFailure = simMsg.includes('Transaction failed') || 
                                  simMsg.includes('Internal error') || 
                                  simMsg.includes('InternalRpcError');

          if (!isGenericFailure && simMsg.includes('execution reverted')) {
            // Real contract revert with specific reason — surface the error clearly
            throw new Error(`Transaction would fail: ${simMsg || 'Unknown contract error. Market may be inactive.'}`);
          } else {
            logger.warn('Simulation error may be RPC-related or generic failure, attempting writeContract anyway...', { simMsg });
          }
        }
      } else {
        logger.info('Skipping simulation on Arc to ensure instant wallet popup');
      }

      // ── Step 5: Send the transaction ──
      // Bypass gas estimation on Arc to prevent wallet popup latency
      const betGasLimit = isArc ? 500000n : undefined;
      
      const txHash = await walletClient.writeContract({
        address: PROXY_CONTRACT_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: functionName,
        args: [BigInt(numericMarketId), numericChoice, amountInUnits],
        account: address,
        gas: betGasLimit,
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
        throw new Error('Insufficient USDC balance for this bet');
      } else if (err.message?.includes('Market not active') || err.message?.includes('Market already resolved')) {
        throw err; // Already user-friendly
      } else if (err.message?.includes('Insufficient USDC allowance')) {
        throw err; // Already user-friendly
      } else if (err.message?.includes('Transaction would fail')) {
        throw err; // Already user-friendly
      } else if (err.message?.includes('nonce')) {
        throw new Error('Transaction nonce error. Please refresh and try again.');
      } else if (err.message?.toLowerCase().includes('rate limit')) {
        throw new Error('Network is busy. Please wait a few seconds and try again.');
      }
      
      throw new Error(err.message || 'Failed to place bet');
    }
  }, [walletClient, address, publicClient, PROXY_CONTRACT_ADDRESS, refetchProxyAllowance, waitForConfirmation, isReconnecting]);

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
    // Use cached allowance data for instant check instead of forcing a network read
    logger.info('Checking if approval is needed (using cache)...');
    const hasAllowance = await checkAllowance(amount, true);
    
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
