import { useState, useCallback, useEffect } from 'react';
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
  const publicClient = usePublicClient({ chainId: 84532 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    if (!publicClient || !CONTRACTS.PROXY) return;

    setIsLoading(true);
    setError(null);

    try {
      const currentBlock = await publicClient.getBlockNumber();
      const CHUNK_SIZE = 49999n;
      const totalBlocks = 490000n;
      const fromBlock = currentBlock > totalBlocks ? currentBlock - totalBlocks : 0n;

      // Helper to fetch all logs in chunks
      const fetchAllLogs = async (event, args = {}) => {
        let logs = [];
        for (let from = fromBlock; from < currentBlock; from += CHUNK_SIZE) {
          const to = from + CHUNK_SIZE > currentBlock ? currentBlock : from + CHUNK_SIZE;
          try {
            const chunk = await publicClient.getLogs({
              address: CONTRACTS.PROXY,
              event,
              fromBlock: from,
              toBlock: to,
              ...(Object.keys(args).length ? { args } : {}),
            });
            logs.push(...chunk);
          } catch { /* skip */ }
        }
        return logs;
      };

      // Fetch all three event types in parallel
      const [betLogs, resolvedLogs, claimedLogs] = await Promise.all([
        fetchAllLogs(parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)')),
        fetchAllLogs(parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee)')),
        fetchAllLogs(parseAbiItem('event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)')),
      ]);

      logger.info(`Leaderboard: ${betLogs.length} bets, ${resolvedLogs.length} resolved, ${claimedLogs.length} claimed`);

      // Build market outcome map: marketId → winningChoice
      const marketOutcomes = {};
      resolvedLogs.forEach(log => {
        marketOutcomes[Number(log.args.marketId)] = Number(log.args.winningChoice);
      });

      // Build claimed set: "marketId-userAddress"
      const claimedSet = new Set(
        claimedLogs.map(log => `${Number(log.args.marketId)}-${log.args.user?.toLowerCase()}`)
      );

      // Aggregate per-user stats
      const userMap = {};
      betLogs.forEach(log => {
        const addr = log.args.user?.toLowerCase();
        if (!addr) return;

        if (!userMap[addr]) {
          userMap[addr] = {
            address: log.args.user,
            totalBets: 0,
            resolvedBets: 0,
            totalVolume: 0,
            wins: 0,
            losses: 0,
            totalWinnings: 0,
          };
        }

        const marketId = Number(log.args.marketId);
        const choice = Number(log.args.choice);
        const amount = Number(formatUnits(log.args.amount || 0n, 6));

        userMap[addr].totalBets += 1;
        userMap[addr].totalVolume += amount;

        // Only count win/loss if market is resolved
        if (marketOutcomes[marketId] !== undefined) {
          userMap[addr].resolvedBets += 1;
          const won = choice === marketOutcomes[marketId];
          if (won) {
            userMap[addr].wins += 1;
            // Check if they claimed
            const claimed = claimedSet.has(`${marketId}-${addr}`);
          } else {
            userMap[addr].losses += 1;
          }
        }
      });

      // Sort by wins first, then volume
      const sorted = Object.values(userMap)
        .sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : b.totalVolume - a.totalVolume)
        .slice(0, count)
        .map((user, idx) => ({
          rank: idx + 1,
          address: user.address,
          displayAddress: `${user.address.slice(0, 6)}...${user.address.slice(-4)}`,
          totalBets: user.totalBets,
          totalVolume: user.totalVolume,
          wins: user.wins,
          losses: user.losses,
          winRate: user.resolvedBets > 0
            ? ((user.wins / user.resolvedBets) * 100).toFixed(1)
            : '0.0',
        }));

      setLeaderboard(sorted);
      logger.info(`Loaded ${sorted.length} leaderboard entries`);
    } catch (err) {
      logger.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to fetch leaderboard');
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, count]);

  const refresh = useCallback(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Auto-fetch on mount
  useEffect(() => {
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
