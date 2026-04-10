import { useEffect, useState, useCallback } from 'react';
import { usePublicClient, useReadContract } from 'wagmi';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';
import { BET_VOUCHERS_ABI } from '../contracts/betVouchersAbi';
import { PROXY_CONTRACT_ADDRESS } from '../utils/constants';
import { zeroAddress } from 'viem';

/**
 * Hook to manage user voucher balance and system status
 * Reads vouchersContract address from proxy and user's voucher balance
 * Returns system status and user balance for display in UI
 */
export const useVouchers = (userAddress) => {
  const [vouchersContractAddress, setVouchersContractAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const publicClient = usePublicClient({ chainId: 84532 });

  // Read vouchersContract address from proxy
  useEffect(() => {
    const fetchVouchersContract = async () => {
      if (!publicClient) return;

      try {
        setIsLoading(true);
        const address = await publicClient.readContract({
          address: PROXY_CONTRACT_ADDRESS,
          abi: PREDICTION_MARKET_PROXY_ABI,
          functionName: 'vouchersContract'
        });

        if (address && address !== zeroAddress) {
          setVouchersContractAddress(address);
        } else {
          setVouchersContractAddress(null);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching vouchersContract address:', err);
        setError(err.message);
        setVouchersContractAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVouchersContract();
  }, [publicClient]);

  // Read user's voucher balance (only if vouchersContract is set and user address exists)
  const { data: voucherBalance, isLoading: isFetchingBalance } = useReadContract({
    address: vouchersContractAddress && vouchersContractAddress !== zeroAddress ? vouchersContractAddress : undefined,
    abi: BET_VOUCHERS_ABI,
    functionName: 'voucherBalance',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!vouchersContractAddress && vouchersContractAddress !== zeroAddress && !!userAddress
    }
  });

  // Check if vouchers system is active
  const isSystemActive = !!vouchersContractAddress && vouchersContractAddress !== zeroAddress;

  // Format voucher balance for display (assuming 6 decimals like USDC)
  const formatVoucherBalance = useCallback((balance) => {
    if (!balance) return '0.00';
    const num = Number(balance) / 1e6;
    return num.toFixed(2);
  }, []);

  const voucherBalanceFormatted = formatVoucherBalance(voucherBalance);

  return {
    vouchersContractAddress,
    voucherBalance,
    voucherBalanceFormatted,
    isSystemActive,
    isLoading: isLoading || isFetchingBalance,
    error
  };
};

export default useVouchers;
