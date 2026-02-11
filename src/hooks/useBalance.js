import { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance as useWagmiBalance } from 'wagmi';
import { createLogger } from '../utils/logger';
import { CONTRACTS } from '../config/wagmi';

const logger = createLogger('useBalance');

export const useBalance = () => {
  const { address } = useAccount();
  const [formattedEthBalance, setFormattedEthBalance] = useState('0');
  const [formattedUsdcBalance, setFormattedUsdcBalance] = useState('0');
  
  // Fetch native ETH balance (for gas fees)
  const { 
    data: ethBalanceData, 
    isLoading: isLoadingEth, 
    error: ethError, 
    refetch: refetchEth 
  } = useWagmiBalance({
    address,
    watch: true,
  });

  // Fetch USDC token balance (for betting)
  const { 
    data: usdcBalanceData, 
    isLoading: isLoadingUsdc, 
    error: usdcError, 
    refetch: refetchUsdc 
  } = useWagmiBalance({
    address,
    token: CONTRACTS.USDC,
    watch: true,
  });

  useEffect(() => {
    if (ethBalanceData) {
      const formatted = (Number(ethBalanceData.value) / 1e18).toFixed(4);
      setFormattedEthBalance(formatted);
    }
  }, [ethBalanceData]);

  useEffect(() => {
    if (usdcBalanceData) {
      const formatted = (Number(usdcBalanceData.value) / 1e6).toFixed(2);
      setFormattedUsdcBalance(formatted);
    }
  }, [usdcBalanceData]);

  const refreshBalance = useCallback(async () => {
    try {
      await Promise.all([refetchEth(), refetchUsdc()]);
      logger.info('Balances refreshed');
    } catch (err) {
      logger.error('Error refreshing balances:', err);
    }
  }, [refetchEth, refetchUsdc]);

  // Calculate total USDC balance as number for easy comparison
  const usdcBalanceNum = usdcBalanceData ? Number(usdcBalanceData.value) / 1e6 : 0;

  return {
    // ETH balance (for gas)
    ethBalance: ethBalanceData?.value || BigInt(0),
    formattedEthBalance,
    ethSymbol: ethBalanceData?.symbol || 'ETH',
    
    // USDC balance (for betting)
    usdcBalance: usdcBalanceData?.value || BigInt(0),
    formattedUsdcBalance,
    usdcBalanceNum,
    usdcSymbol: 'USDC',
    
    // Combined loading/error states
    isLoading: isLoadingEth || isLoadingUsdc,
    isLoadingEth,
    isLoadingUsdc,
    error: ethError || usdcError,
    
    refreshBalance
  };
};

export default useBalance;
