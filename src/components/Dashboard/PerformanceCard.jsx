import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Award, Target, Zap, DollarSign } from 'lucide-react';

/**
 * Performance Card Component
 *
 * FIX 1: Typo `rounded-xi` → `rounded-xl` (was not a valid Tailwind class,
 *         so the first secondary stats card had no border radius).
 * FIX 2: Removed `hover:glow-secondary` — not a Tailwind utility, silently
 *         did nothing but cluttered class strings.
 * FIX 3: Average bet size now uses `totalWagered` (sum of all bet amounts)
 *         instead of `totalWinnings + totalLosses`, which was incorrect —
 *         totalWinnings is payout, not stake on winning bets.
 *         Requires `totalWagered` to be present in userStats (sum of bet_amount
 *         across all bets). Falls back to 0 gracefully if not provided.
 */
const PerformanceCard = ({ userStats = {} }) => {
  const {
    totalBets    = 0,
    wins         = 0,
    losses       = 0,
    streak       = 0,
    totalWinnings = 0,
    totalLosses  = 0,
    totalWagered = 0, // FIX 3: correct field for avg bet calculation
    roi          = 0,
    winRate      = 0,
  } = userStats;

  const stats = useMemo(() => [
    {
      id: 'winrate',
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      trend: 'up',
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
    },
    {
      id: 'roi',
      label: 'ROI',
      value: `${roi > 0 ? '+' : ''}${roi.toFixed(1)}%`,
      trend: roi > 0 ? 'up' : 'down',
      icon: roi > 0 ? TrendingUp : TrendingDown,
      color: roi > 0 ? 'text-green-400' : 'text-red-400',
      bgColor: roi > 0 ? 'bg-green-500/10' : 'bg-red-500/10',
      borderColor: roi > 0 ? 'border-green-500/30' : 'border-red-500/30',
    },
    {
      id: 'streak',
      label: 'Current Streak',
      value: `${streak}`,
      trend: streak > 0 ? 'up' : 'neutral',
      icon: Zap,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
    },
    {
      id: 'winnings',
      label: 'Total Winnings',
      value: `$${totalWinnings.toFixed(2)}`,
      trend: totalWinnings > 0 ? 'up' : 'neutral',
      icon: DollarSign,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/30',
    },
  ], [winRate, roi, streak, totalWinnings]);

  // FIX 3: correct avg bet calculation using totalWagered
  const avgBetSize = totalBets > 0 ? (totalWagered / totalBets).toFixed(2) : '0.00';

  return (
    <div className="space-y-4">
      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className={`${stat.bgColor} border ${stat.borderColor} rounded-xl p-5 hover:border-primary/50 transition-all duration-300`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-neutral-400 font-semibold uppercase">{stat.label}</span>
                <Icon size={20} className={stat.color} />
              </div>
              <div className="text-3xl font-black text-white mb-2">{stat.value}</div>
              {stat.trend === 'up' && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <TrendingUp size={12} /> Trending up
                </div>
              )}
              {stat.trend === 'down' && (
                <div className="flex items-center gap-1 text-xs text-red-400">
                  <TrendingDown size={12} /> Trending down
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* FIX 1: was `rounded-xi` — now `rounded-xl` */}
        <div className="bg-dark-800 border border-secondary/30 rounded-xl p-5 hover:border-secondary transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-semibold">Total Bets Placed</span>
            <Target size={20} className="text-secondary" />
          </div>
          <div className="text-3xl font-black text-white">{totalBets}</div>
          {wins > 0 && (
            <div className="text-xs text-success mt-2">{wins} wins • {losses} losses</div>
          )}
        </div>

        {/* FIX 2: removed `hover:glow-secondary` (not a Tailwind utility) */}
        <div className="bg-dark-800 border border-secondary/30 rounded-xl p-5 hover:border-secondary transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-semibold">Total Losses</span>
            <TrendingDown size={20} className="text-red-400" />
          </div>
          <div className="text-3xl font-black text-white">${totalLosses.toFixed(2)}</div>
          <div className="text-xs text-red-400 mt-2">From {losses} bets</div>
        </div>

        <div className="bg-dark-800 border border-secondary/30 rounded-xl p-5 hover:border-secondary transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-semibold">Avg Bet Size</span>
            <DollarSign size={20} className="text-primary" />
          </div>
          {/* FIX 3: uses avgBetSize derived from totalWagered */}
          <div className="text-3xl font-black text-white">${avgBetSize}</div>
          <div className="text-xs text-neutral-400 mt-2">From {totalBets} bets</div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCard;