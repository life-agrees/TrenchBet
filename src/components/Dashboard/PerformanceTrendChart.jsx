// ─── PerformanceTrendChart.jsx ────────────────────────────────────────────────
// Displays cumulative P&L over time based on the user's resolved bets.
//
// FIX: Previously expected `bet.timestamp`, `bet.won`, `bet.payout`, and
// `Number(bet.amount)` — none of which exist on the actual bet objects from
// useUserBets. Now correctly uses:
//   - `bet.market.endTime` for date grouping (the market's close date)
//   - `bet.market.resolved`, `bet.choice`, `bet.market.priceWentUp` / 
//     `bet.market.winningChoice` to determine win vs loss
//   - `formatUnits(bet.amount, 6)` for correct BigInt → USDC conversion
//   - `bet.multiplier` (basis points from contract) for payout estimation

import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatUnits } from 'viem';

/**
 * Determine if a resolved bet was won
 */
const isWinningBet = (bet) => {
  if (!bet.market?.resolved) return null;
  if (bet.market.marketType === 0) {
    // Binary: choice 1 = UP, choice 0 = DOWN
    const predictedUp = bet.choice === 1;
    if (bet.market.priceWentUp === null || bet.market.priceWentUp === undefined) return null;
    return predictedUp === bet.market.priceWentUp;
  }
  // Multi-choice / Range / Time
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

const PerformanceTrendChart = ({ userBets = [], isLoading = false }) => {
  const data = useMemo(() => {
    if (!userBets || userBets.length === 0) return [];

    // Only consider resolved bets for P&L
    const resolvedBets = userBets.filter(b => b.market?.resolved);
    if (resolvedBets.length === 0) return [];

    // Sort by market end time (oldest first) so cumulative line reads left→right
    const sorted = [...resolvedBets].sort((a, b) => {
      const aTime = a.market?.endTime || 0;
      const bTime = b.market?.endTime || 0;
      return aTime - bTime;
    });

    const trendMap = {};
    let cumulativeProfit = 0;

    sorted.forEach((bet) => {
      const ts = bet.market?.endTime || Date.now();
      const date = new Date(ts).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric'
      });

      if (!trendMap[date]) trendMap[date] = { date, profit: 0, bets: 0, wins: 0, losses: 0 };

      const stake = toUSDC(bet.amount);
      const won = isWinningBet(bet);

      if (won === true) {
        // Payout = stake × multiplier. Multiplier is in basis points (150 = 1.5x)
        const mult = bet.multiplier ? Number(bet.multiplier) / 100 : 1.5;
        const payout = stake * mult;
        cumulativeProfit += (payout - stake); // net gain
        trendMap[date].wins += 1;
      } else if (won === false) {
        cumulativeProfit -= stake; // full loss
        trendMap[date].losses += 1;
      }

      trendMap[date].profit = parseFloat(cumulativeProfit.toFixed(2));
      trendMap[date].bets += 1;
    });

    return Object.values(trendMap).slice(-14); // last 14 data points
  }, [userBets]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700 rounded-xl p-6 h-80 flex flex-col">
        <div className="h-5 w-40 bg-neutral-100 dark:bg-dark-700 rounded animate-pulse mb-6" />
        <div className="flex-1 bg-neutral-100 dark:bg-dark-700/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700 rounded-xl p-6 flex flex-col items-center justify-center h-80">
        <TrendingUp size={48} className="text-neutral-600 mb-3" />
        <p className="text-neutral-500">No trend data yet</p>
        <p className="text-xs text-neutral-600">Resolved bets will appear here as P&L</p>
      </div>
    );
  }

  // Determine if overall P&L is positive for color theming
  const lastProfit = data[data.length - 1]?.profit ?? 0;
  const isPositive = lastProfit >= 0;

  return (
    <div className="bg-white dark:bg-dark-800 border border-secondary/30 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <TrendingUp size={20} className="text-secondary" />
          P&L Trend
        </h3>
        <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
          isPositive 
            ? 'bg-green-100 dark:bg-success/10 text-green-700 dark:text-success border border-green-200 dark:border-success/20' 
            : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'
        }`}>
          {isPositive ? '+' : ''}${lastProfit.toFixed(2)}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorProfitPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="colorProfitNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" stroke="#666" style={{ fontSize: '11px' }} />
          <YAxis stroke="#666" style={{ fontSize: '11px' }} tickFormatter={(v) => `$${v}`} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1f2e',
              border: '1px solid rgba(192,255,0,0.3)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '13px',
            }}
            formatter={(value, name) => {
              if (name === 'Cumulative P&L') return [`$${Number(value).toFixed(2)}`, name];
              return [value, name];
            }}
            labelStyle={{ color: '#999', marginBottom: '4px' }}
          />
          <Area
            type="monotone"
            dataKey="profit"
            stroke={isPositive ? '#10B981' : '#EF4444'}
            strokeWidth={2.5}
            fill={isPositive ? 'url(#colorProfitPos)' : 'url(#colorProfitNeg)'}
            dot={{ fill: isPositive ? '#10B981' : '#EF4444', r: 4, strokeWidth: 2, stroke: '#1a1f2e' }}
            activeDot={{ r: 6, strokeWidth: 2 }}
            name="Cumulative P&L"
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Summary footer */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-neutral-200 dark:border-dark-700">
        <div className="text-center">
          <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Resolved</p>
          <p className="text-lg font-black text-neutral-900 dark:text-white">{data.reduce((s,d) => s + d.bets, 0)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Wins</p>
          <p className="text-lg font-black text-success">{data.reduce((s,d) => s + d.wins, 0)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Losses</p>
          <p className="text-lg font-black text-red-400">{data.reduce((s,d) => s + d.losses, 0)}</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTrendChart;
