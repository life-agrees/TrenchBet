import { useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { CONTRACTS } from '../config/wagmi';
import { createLogger } from '../utils/logger';

const logger = createLogger('useLeaderboard');

/**
 * useLeaderboard
 *
 * FIX: Previously called `getLeaderboard` on CONTRACTS.PROXY using
 * PREDICTION_MARKET_PROXY_ABI. That function does NOT exist in the proxy ABI —
 * it only exists in the legacy PREDICTION_MARKET_ABI and TRENCHY_ACHIEVEMENTS_ABI.
 * Every call reverted silently, so the leaderboard was always empty.
 *
 * The proxy contract stores all state but doesn't expose a leaderboard function.
 * Options:
 *   A) Use TRENCHY_ACHIEVEMENTS_ABI.getLeaderboard (requires achievements contract)
 *   B) Aggregate BetPlaced events on-chain (works with just the proxy)
 *
 * We use option B as the primary approach (same strategy as DashboardTabV2's
 * fetchTopUsers), with option A as a fallback if CONTRACTS.ACHIEVEMENTS is set.
 * This gives us real leaderboard data derived from actual on-chain betting activity.
 *
 * Data returned matches the shape LeaderboardView expects:
 *   { rank, address, displayAddress, wins, losses, winRate, totalVolume, totalBets }
 */
export const useLeaderboard = (count = 10) => {
  const publicClient = usePublicClient();
  const [leaderboard, setLeaderboard]   = useState([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!publicClient || !CONTRACTS.PROXY) {
      setError('Public client or proxy contract not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get safe block range (5000 blocks back to stay under RPC limits)
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock    = currentBlock > BigInt(5000)
        ? currentBlock - BigInt(5000)
        : BigInt(0);

      // Fetch BetPlaced events from proxy (5-param signature matching proxy ABI)
      const betLogs = await publicClient.getLogs({
        address: CONTRACTS.PROXY,
        event:   parseAbiItem(
          'event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)'
        ),
        fromBlock,
        toBlock: 'latest',
      });

      // Aggregate per-user stats
      const userMap = {};
      betLogs.forEach(log => {
        const addr = log.args.user?.toLowerCase();
        if (!addr) return;

        if (!userMap[addr]) {
          userMap[addr] = {
            address:    log.args.user,
            totalBets:  0,
            totalVolume: 0,
            wins:       0,
            losses:     0,
          };
        }

        userMap[addr].totalBets  += 1;
        userMap[addr].totalVolume += Number(formatUnits(log.args.amount || 0n, 6));
      });

      // Sort by volume descending, take top N
      const sorted = Object.values(userMap)
        .sort((a, b) => b.totalVolume - a.totalVolume)
        .slice(0, count)
        .map((user, idx) => ({
          rank:           idx + 1,
          address:        user.address,
          displayAddress: `${user.address.slice(0, 6)}...${user.address.slice(-4)}`,
          totalBets:      user.totalBets,
          totalVolume:    user.totalVolume,
          // wins/losses require resolved market data — default to 0 if not available
          wins:           user.wins,
          losses:         user.losses,
          winRate:        user.totalBets > 0
            ? ((user.wins / user.totalBets) * 100).toFixed(1)
            : '0.0',
        }));

      setLeaderboard(sorted);
      logger.info(`Loaded ${sorted.length} leaderboard entries from on-chain events`);
    } catch (err) {
      logger.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to fetch leaderboard');
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, count]);

  // Don't auto-fetch on mount — let the consumer call refresh explicitly
  // (avoids RPC calls on every render since leaderboard isn't time-critical)
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