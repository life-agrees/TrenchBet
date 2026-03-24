import { useCallback } from 'react';
import { useAccount, useBalance as useWagmiBalance } from 'wagmi';
import { createLogger } from '../utils/logger';
import { CONTRACTS } from '../config/wagmi';

const logger = createLogger('useBalance');

/**
 * useBalance hook
 *
 * FIX 1: Removed useState + useEffect pattern for formattedUsdcBalance and
 *         formattedEthBalance. These were always one render behind
 *         usdcBalanceNum because setState is async — derived display values
 *         were stale on the first render after a balance update.
 *         Now all formatted values are derived directly from wagmi data
 *         (computed inline on every render, always in sync).
 *
 * FIX 2: `watch: true` is deprecated in Wagmi v2 and silently does nothing.
 *         Replaced with `refetchInterval: 15_000` which is the correct
 *         Wagmi v2 API for polling. Also added `refetchOnWindowFocus: true`
 *         so balance refreshes when user switches back to the tab.
 */
export const useBalance = () => {
  const { address } = useAccount();

  // ETH balance (for gas)
  const {
    data: ethBalanceData,
    isLoading: isLoadingEth,
    error: ethError,
    refetch: refetchEth,
  } = useWagmiBalance({
    address,
    // FIX 2: watch is deprecated in Wagmi v2 — use refetchInterval instead
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  // USDC balance (for betting)
  const {
    data: usdcBalanceData,
    isLoading: isLoadingUsdc,
    error: usdcError,
    refetch: refetchUsdc,
  } = useWagmiBalance({
    address,
    token: CONTRACTS.USDC,
    // FIX 2: same here
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

const refetchBalance = useCallback(async () => {
    try {
      await Promise.all([refetchEth(), refetchUsdc()]);
      logger.info('Balances refreshed');
    } catch (err) {
      logger.error('Error refreshing balances:', err);
    }
  }, [refetchEth, refetchUsdc]);

  // FIX 1: Derive all formatted values directly — never stale
  const usdcBalanceNum = usdcBalanceData
    ? Number(usdcBalanceData.value) / 1e6
    : 0;

  const formattedUsdcBalance = usdcBalanceNum.toFixed(2);

  const formattedEthBalance = ethBalanceData
    ? (Number(ethBalanceData.value) / 1e18).toFixed(4)
    : '0.0000';

  return {
    // ETH balance (for gas)
    ethBalance:          ethBalanceData?.value || BigInt(0),
    formattedEthBalance,
    ethSymbol:           ethBalanceData?.symbol || 'ETH',

    // USDC balance (for betting)
    usdcBalance:         usdcBalanceData?.value || BigInt(0),
    formattedUsdcBalance,
    usdcBalanceNum,
    usdcSymbol:          'USDC',

    // States
    isLoading:     isLoadingEth || isLoadingUsdc,
    isLoadingEth,
    isLoadingUsdc,
    error:         ethError || usdcError,

    refetchBalance: refetchBalance,
  };
};

export default useBalance;