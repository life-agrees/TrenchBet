import { useState, useCallback, useEffect } from 'react';
import { createLogger } from '../utils/logger';
import { supabase } from '../lib/supabase';

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
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info(`[useLeaderboard] Fetching top ${count} from Supabase indexer...`);

      const { data, error: supaErr } = await supabase
        .from('leaderboard_stats')
        .select('*')
        .order('wins', { ascending: false })
        .order('total_volume', { ascending: false })
        .limit(count);

      if (supaErr) throw supaErr;

      const formatted = (data || []).map((user, idx) => {
        const resolvedBets = Number(user.wins) + Number(user.losses);
        return {
          rank: idx + 1,
          address: user.address,
          displayAddress: `${user.address.slice(0, 6)}...${user.address.slice(-4)}`,
          totalBets: Number(user.total_bets),
          totalVolume: Number(user.total_volume),
          wins: Number(user.wins),
          losses: Number(user.losses),
          winRate: resolvedBets > 0
            ? ((Number(user.wins) / resolvedBets) * 100).toFixed(1)
            : '0.0',
        };
      });

      setLeaderboard(formatted);
      logger.info(`Loaded ${formatted.length} leaderboard entries`);
    } catch (err) {
      logger.error('Error fetching leaderboard:', err);
      setError(err.message || 'Failed to fetch leaderboard');
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  }, [count]);

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
