import { useMemo } from 'react';
import { formatUnits } from 'viem';

/**
 * useUserStats hook
 *
 * FIX: Previously only returned totalBets, wins, losses, pending, streak.
 * PerformanceCard also needs winRate, roi, totalWinnings, totalLosses,
 * totalWagered — all were missing and permanently showed 0.
 *
 * Now computes:
 *  - winRate        : wins / (wins + losses) * 100
 *  - totalWinnings  : sum of payouts on winning bets
 *  - totalLosses    : sum of stakes on losing bets
 *  - totalWagered   : sum of all bet stakes (for correct avg bet size)
 *  - roi            : (totalWinnings - totalWagered) / totalWagered * 100
 */
export const useUserStats = (userBets, wonBets, lostBets, pendingBets) => {
  const stats = useMemo(() => {
    const safeBets    = userBets    || [];
    const safeWonBets = wonBets     || [];
    const safeLostBets = lostBets   || [];
    const safePendingBets = pendingBets || [];

    const totalBets = safeBets.length;
    const wins      = safeWonBets.length;
    const losses    = safeLostBets.length;
    const pending   = safePendingBets.length;

    // ── Win Rate ──────────────────────────────────────────────────────────
    const resolved  = wins + losses;
    const winRate   = resolved > 0 ? (wins / resolved) * 100 : 0;

    // ── Financial stats ───────────────────────────────────────────────────
    // Convert BigInt USDC amounts (6 decimals) to numbers safely
    const toUSDC = (amount) => {
      if (!amount) return 0;
      try {
        return Number(formatUnits(BigInt(amount), 6));
      } catch {
        return Number(amount) || 0;
      }
    };

    // Total amount wagered across ALL bets (win or lose)
    const totalWagered = safeBets.reduce((sum, bet) => sum + toUSDC(bet.amount), 0);

    // Largest single bet amount
    const largestBet = safeBets.reduce((max, bet) => {
      const amt = toUSDC(bet.amount);
      return amt > max ? amt : max;
    }, 0);

    // Total payout received from winning bets
    // bet.payout may be present (if enriched), otherwise estimate from multiplier
    const totalWinnings = safeWonBets.reduce((sum, bet) => {
      if (bet.payout) return sum + toUSDC(bet.payout);
      // Fallback: amount * effectiveMultiplier
      const stake = toUSDC(bet.amount);
      const mult  = bet.multiplier ? Number(bet.multiplier) / 100 : 1.5;
      return sum + stake * mult;
    }, 0);

    // Total amount lost (stakes on losing bets)
    const totalLosses = safeLostBets.reduce((sum, bet) => sum + toUSDC(bet.amount), 0);

    // ── ROI ───────────────────────────────────────────────────────────────
    // ROI = net profit / total wagered * 100
    const netProfit = totalWinnings - totalWagered;
    const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;

    // ── Streak ────────────────────────────────────────────────────────────
    // Consecutive wins from most-recently-resolved bet backwards
    const sortedResolved = [...safeBets]
      .filter(bet => bet.market?.resolved)
      .sort((a, b) => {
        const aTime = a.market?.endTime || 0;
        const bTime = b.market?.endTime || 0;
        return bTime - aTime; // newest first
      });

    let streak = 0;
    for (const bet of sortedResolved) {
      let isWin = false;
      if (bet.market.marketType === 0) {
        isWin = (bet.choice === 1) === bet.market.priceWentUp;
      } else if (bet.market.marketType === 1) {
        isWin = bet.choice === bet.market.winningChoice;
      } else {
        isWin = bet.claimed || bet.isClaimableConfirmed;
      }
      if (isWin) streak++;
      else break;
    }

    return {
      totalBets,
      wins,
      losses,
      pending,
      streak,
      currentStreak: streak,
      totalWins: wins,
      largestBet,
      winRate,
      totalWinnings,
      totalLosses,
      totalWagered,
      roi,
      isLoading: false,
      error: null,
    };
  }, [userBets, wonBets, lostBets, pendingBets]);

  return stats;
};

export default useUserStats;
