import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Award, Target, Zap, DollarSign, Percent, Clock } from 'lucide-react';

/**
 * Performance Card Component
 * Displays key user statistics and performance metrics
 */
const PerformanceCard = ({ userStats = {}, currentPrices = {} }) => {
  const {
    totalBets = 0,
    wins = 0,
    losses = 0,
    streak = 0,
    totalWinnings = 0,
    totalLosses = 0,
    roi = 0,
    winRate = 0,
  } = userStats;

  const stats = useMemo(() => {
    return [
      {
        id: 'winrate',
        label: 'Win Rate',
        value: `${winRate.toFixed(1)}%`,
        trend: 'up',
        icon: TrendingUp,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30'
      },
      {
        id: 'roi',
        label: 'ROI',
        value: `${roi > 0 ? '+' : ''}${roi.toFixed(1)}%`,
        trend: roi > 0 ? 'up' : 'down',
        icon: roi > 0 ? TrendingUp : TrendingDown,
        color: roi > 0 ? 'text-green-400' : 'text-red-400',
        bgColor: roi > 0 ? 'bg-green-500/10' : 'bg-red-500/10',
        borderColor: roi > 0 ? 'border-green-500/30' : 'border-red-500/30'
      },
      {
        id: 'streak',
        label: 'Current Streak',
        value: `${streak}`,
        trend: streak > 0 ? 'up' : 'neutral',
        icon: Zap,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30'
      },
      {
        id: 'winnings',
        label: 'Total Winnings',
        value: `$${totalWinnings.toFixed(2)}`,
        trend: totalWinnings > 0 ? 'up' : 'neutral',
        icon: DollarSign,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/30'
      }
    ];
  }, [winRate, roi, streak, totalWinnings]);

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
        <div className="bg-dark-800 border border-secondary/30 rounded-xi p-5 hover:border-secondary hover:glow-secondary transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-semibold">Total Bets Placed</span>
            <Target size={20} className="text-secondary" />
          </div>
          <div className="text-3xl font-black text-white">{totalBets}</div>
          {wins > 0 && (
            <div className="text-xs text-success mt-2">{wins} wins • {losses} losses</div>
          )}
        </div>

        <div className="bg-dark-800 border border-secondary/30 rounded-xl p-5 hover:border-secondary hover:glow-secondary transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-semibold">Total Losses</span>
            <TrendingDown size={20} className="text-red-400" />
          </div>
          <div className="text-3xl font-black text-white">${totalLosses.toFixed(2)}</div>
          <div className="text-xs text-red-400 mt-2">From {losses} bets</div>
        </div>

        <div className="bg-dark-800 border border-secondary/30 rounded-xl p-5 hover:border-secondary hover:glow-secondary transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400 font-semibold">Avg Bet Size</span>
            <DollarSign size={20} className="text-primary" />
          </div>
          <div className="text-3xl font-black text-white">
            ${totalBets > 0 ? ((totalWinnings + totalLosses) / totalBets).toFixed(2) : '0.00'}
          </div>
          <div className="text-xs text-neutral-400 mt-2">From {totalBets} bets</div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceCard;
