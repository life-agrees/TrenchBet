import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, parseAbiItem } from 'viem';
import { CONTRACTS } from '../config/wagmi';
import { PREDICTION_MARKET_ABI, ERC20_ABI } from '../contracts/abis';
import { createLogger } from '../utils/logger';

const logger = createLogger('useAdminStats');

export const useAdminStats = (contractAddress) => {
  const publicClient = usePublicClient();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVolume: 0,
    totalBets: 0,
    pendingFees: 0n,
    contractBalance: 0n,
    isLoading: false,
    error: null
  });

  const fetchStats = useCallback(async () => {
    if (!publicClient || !contractAddress) return;

    setStats(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch accumulated fees from contract
      const accumulatedFees = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'accumulatedFees',
      });

      // Fetch contract USDC balance
      const balance = await publicClient.readContract({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [contractAddress],
      });

      // Get bet logs to calculate total volume and unique users
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
        fromBlock: 'earliest'
      });

      const uniqueUsers = new Set();
      let volume = 0n;

      logs.forEach(log => {
        uniqueUsers.add(log.args.user);
        volume += log.args.amount;
      });

      setStats({
        totalUsers: uniqueUsers.size,
        totalVolume: Number(formatUnits(volume, 6)),
        totalBets: logs.length,
        pendingFees: accumulatedFees,
        contractBalance: balance,
        isLoading: false,
        error: null
      });

      logger.info('Stats fetched successfully', {
        totalUsers: uniqueUsers.size,
        totalVolume: Number(formatUnits(volume, 6)),
        totalBets: logs.length
      });

    } catch (err) {
      logger.error('Error fetching admin stats:', err);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to fetch stats'
      }));
    }
  }, [publicClient, contractAddress]);

  return {
    stats,
    isLoadingStats: stats.isLoading,
    error: stats.error,
    fetchStats
  };
};

export default useAdminStats;
