import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS } from '../config/wagmi.jsx';
import { PREDICTION_MARKET_ABI } from '../contracts/abis';
import { createLogger } from '../utils/logger';

const logger = createLogger('useLeaderboard');

export const useLeaderboard = (count = 10) => {
  const publicClient = usePublicClient();
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!publicClient || !CONTRACTS.PREDICTION_MARKET) {
      setError('Public client or contract not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch leaderboard from contract
      const result = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getLeaderboard',
        args: [BigInt(count)],
      });

      const [topUsers, earnings] = result;

      // Format the data
      const formattedLeaderboard = topUsers.map((user, index) => ({
        rank: index + 1,
        address: user,
        earnings: Number(formatUnits(earnings[index] || 0n, 6)), // USDC has 6 decimals
        displayAddress: `${user.slice(0, 6)}...${user.slice(-4)}`,
      }));

      setLeaderboard(formattedLeaderboard);
      logger.info(`Loaded ${formattedLeaderboard.length} leaderboard entries`);
    } catch (err) {
      logger.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to fetch leaderboard');
      
      // Set empty array on error
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, count]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Refresh function
  const refresh = useCallback(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  return {
    leaderboard,
    isLoading,
    error,
    refresh,
  };
};

export default useLeaderboard;
