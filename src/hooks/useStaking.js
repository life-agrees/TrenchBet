import { useState, useEffect, useCallback } from 'react';
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { TRENCHY_STAKING_ADDRESS } from '../utils/constants';
import { TRENCHY_STAKING_ABI } from '../contracts/abis';

export const useStaking = () => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  // Read stake info
  const { data: stakeInfo, refetch: refetchStakeInfo } = useContractRead({
    address: TRENCHY_STAKING_ADDRESS,
    abi: TRENCHY_STAKING_ABI,
    functionName: 'getStakeInfo',
    args: [address],
    enabled: !!address,
    watch: true
  });

  // Read can unstake
  const { data: canUnstakeData } = useContractRead({
    address: TRENCHY_STAKING_ADDRESS,
    abi: TRENCHY_STAKING_ABI,
    functionName: 'canUnstake',
    args: [address],
    enabled: !!address,
    watch: true
  });

  // Stake
  const { config: stakeConfig } = usePrepareContractWrite({
    address: TRENCHY_STAKING_ADDRESS,
    abi: TRENCHY_STAKING_ABI,
    functionName: 'stake',
    args: [0], // Will be set dynamically
    enabled: false
  });

  const { write: stakeWrite } = useContractWrite({
    ...stakeConfig,
    onSuccess: () => {
      setIsLoading(false);
      refetchStakeInfo();
    },
    onError: () => {
      setIsLoading(false);
    }
  });

  // Request unstake
  const { config: requestUnstakeConfig } = usePrepareContractWrite({
    address: TRENCHY_STAKING_ADDRESS,
    abi: TRENCHY_STAKING_ABI,
    functionName: 'requestUnstake',
    args: [0],
    enabled: false
  });

  const { write: requestUnstakeWrite } = useContractWrite({
    ...requestUnstakeConfig,
    onSuccess: () => {
      setIsLoading(false);
      refetchStakeInfo();
    },
    onError: () => {
      setIsLoading(false);
    }
  });

  // Unstake
  const { config: unstakeConfig } = usePrepareContractWrite({
    address: TRENCHY_STAKING_ADDRESS,
    abi: TRENCHY_STAKING_ABI,
    functionName: 'unstake',
    args: [0],
    enabled: false
  });

  const { write: unstakeWrite } = useContractWrite({
    ...unstakeConfig,
    onSuccess: () => {
      setIsLoading(false);
      refetchStakeInfo();
    },
    onError: () => {
      setIsLoading(false);
    }
  });

  const stake = useCallback(async (amount) => {
    if (!amount || !stakeWrite) return;
    setIsLoading(true);
    
    try {
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      stakeWrite({
        recklesslySetUnpreparedArgs: [amountInWei]
      });
    } catch (error) {
      console.error('Stake error:', error);
      setIsLoading(false);
    }
  }, [stakeWrite]);

  const requestUnstake = useCallback(async (amount) => {
    if (!amount || !requestUnstakeWrite) return;
    setIsLoading(true);
    
    try {
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      requestUnstakeWrite({
        recklesslySetUnpreparedArgs: [amountInWei]
      });
    } catch (error) {
      console.error('Request unstake error:', error);
      setIsLoading(false);
    }
  }, [requestUnstakeWrite]);

  const unstake = useCallback(async (amount) => {
    if (!amount || !unstakeWrite) return;
    setIsLoading(true);
    
    try {
      const amountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      unstakeWrite({
        recklesslySetUnpreparedArgs: [amountInWei]
      });
    } catch (error) {
      console.error('Unstake error:', error);
      setIsLoading(false);
    }
  }, [unstakeWrite]);

  return {
    stakeInfo: stakeInfo ? {
      tier: Number(stakeInfo[0]),
      pointsBoost: Number(stakeInfo[1]),
      feeDiscount: Number(stakeInfo[2]),
      amount: stakeInfo[3],
      unlockTime: Number(stakeInfo[4])
    } : null,
    canUnstake: canUnstakeData ? {
      canUnstake: canUnstakeData[0],
      timeRemaining: Number(canUnstakeData[1])
    } : null,
    stake,
    requestUnstake,
    unstake,
    isLoading,
    refetchStakeInfo
  };
};
