import React, { useState, useMemo } from 'react';
import { BarChart3, Clock, TrendingUp, Calendar } from 'lucide-react';
import { formatUnits } from 'viem';

/**
 * Stats Tabs Component
 *
 * FIX: Previously expected `b.timestamp`, `b.won`, `b.resolved`, `b.payout`,
 * and `Number(b.amount)` — none of which exist on the actual bet objects from
 * useUserBets. Now correctly uses:
 *   - `bet.market.endTime` for time-period filtering
 *   - `bet.market.resolved` for resolved status
 *   - Win/loss derived from `bet.choice` vs `bet.market.priceWentUp`/`winningChoice`
 *   - `formatUnits(bet.amount, 6)` for correct BigInt → USDC conversion
 *   - Payout estimated from stake × multiplier
 */

/**
 * Determine if a resolved bet was a win
 */
const isWinningBet = (bet) => {
  if (!bet.market?.resolved) return null;
  if (bet.market.marketType === 0) {
    const predictedUp = bet.choice === 1;
    if (bet.market.priceWentUp === null || bet.market.priceWentUp === undefined) return null;
    return predictedUp === bet.market.priceWentUp;
  }
  if (bet.market.winningChoice === null || bet.market.winningChoice === undefined) return null;
  return Number(bet.choice) === Number(bet.market.winningChoice);
};

/**
 * Convert BigInt USDC amount (6 decimals) to a human-readable number
 */
const toUSDC = (amount) => {
  if (!amount) return 0;
  try {
    return Number(formatUnits(BigInt(amount), 6));
  } catch {
    return Number(amount) || 0;
  }
};

const StatsTabs = ({ userBets = [] }) => {
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all',   label: 'All Time',   icon: BarChart3  },
    { id: 'today', label: 'Today',      icon: Calendar   },
    { id: 'week',  label: 'This Week',  icon: Clock      },
    { id: 'month', label: 'This Month', icon: TrendingUp },
  ];

  const stats = useMemo(() => {
    let filteredBets = userBets;
    const now = Date.now();

    // Filter by time period using market.endTime as the bet's relevant timestamp
    if (activeTab === 'today') {
      const startOfDay = new Date(now).setHours(0, 0, 0, 0);
      filteredBets = userBets.filter(b => {
        const betTime = b.market?.endTime || 0;
        return betTime >= startOfDay;
      });
    } else if (activeTab === 'week') {
      const startOfWeek = now - 7 * 24 * 60 * 60 * 1000;
      filteredBets = userBets.filter(b => {
        const betTime = b.market?.endTime || 0;
        return betTime >= startOfWeek;
      });
    } else if (activeTab === 'month') {
      const startOfMonth = now - 30 * 24 * 60 * 60 * 1000;
      filteredBets = userBets.filter(b => {
        const betTime = b.market?.endTime || 0;
        return betTime >= startOfMonth;
      });
    }

    // Derive win/loss/pending from actual market data
    let wins = 0;
    let losses = 0;
    let pending = 0;
    let totalBetAmount = 0;
    let totalWinnings = 0;

    filteredBets.forEach(bet => {
      const stake = toUSDC(bet.amount);
      totalBetAmount += stake;

      if (!bet.market?.resolved) {
        pending += 1;
        return;
      }

      const won = isWinningBet(bet);
      if (won === true) {
        wins += 1;
        // Estimate payout: stake × multiplier (basis points, e.g. 150 = 1.5x)
        const mult = bet.multiplier ? Number(bet.multiplier) / 100 : 1.5;
        totalWinnings += stake * mult;
      } else if (won === false) {
        losses += 1;
      } else {
        // Resolved but outcome unknown (edge case)
        pending += 1;
      }
    });

    const resolved = wins + losses;
    const winRate = resolved > 0 ? ((wins / resolved) * 100).toFixed(1) : '0.0';

    return {
      total: filteredBets.length,
      wins,
      losses,
      pending,
      totalBetAmount,
      totalWinnings,
      winRate,
    };
  }, [userBets, activeTab]);

  return (
    <div className="bg-white dark:bg-dark-800 border border-secondary/30 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-dark-700 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-neutral-400 hover:text-neutral-900 dark:text-white hover:bg-neutral-100 dark:bg-dark-700/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stats Grid - Optimized for Mobile Breathing Room */}
      <div className="p-6 sm:p-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-10">
          <div>
            <p className="text-xs text-neutral-400 mb-1">Total Bets</p>
            <p className="text-2xl font-black text-neutral-900 dark:text-white">{stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1">Wins</p>
            <p className="text-2xl font-black text-success">{stats.wins}</p>
            <p className="text-xs text-neutral-500 mt-1">{stats.winRate}%</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1">Losses</p>
            <p className="text-2xl font-black text-red-400">{stats.losses}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1">Pending</p>
            <p className="text-2xl font-black text-yellow-400">{stats.pending}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 mb-1">Net P&L</p>
            <p className={`text-2xl font-black ${
              stats.totalWinnings - stats.totalBetAmount >= 0 ? 'text-success' : 'text-red-400'
            }`}>
              ${(stats.totalWinnings - stats.totalBetAmount).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {/* Win Rate Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-300">Win Rate</span>
              <span className="text-sm font-bold text-primary">{stats.winRate}%</span>
            </div>
            <div className="h-2 bg-neutral-100 dark:bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success to-primary transition-all"
                style={{ width: `${stats.winRate}%` }}
              />
            </div>
          </div>

          {/* Bet Distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 mt-10 pt-10 border-t border-neutral-200 dark:border-dark-700">
            <div className="text-center">
              <p className="text-xs text-neutral-400 mb-1">Avg Bet</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                ${stats.total > 0 ? (stats.totalBetAmount / stats.total).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-400 mb-1">Total Wagered</p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">${stats.totalBetAmount.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-400 mb-1">Total Won</p>
              <p className="text-lg font-bold text-success">${stats.totalWinnings.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsTabs;