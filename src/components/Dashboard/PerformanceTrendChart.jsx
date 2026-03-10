import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

/**
 * Betting Performance Trend Chart
 * Shows profit/loss over time
 */
const PerformanceTrendChart = ({ userBets = [], isLoading = false }) => {
  // Generate trend data from user bets
  const generateTrendData = () => {
    if (!userBets || userBets.length === 0) return [];

    const trendMap = {};
    let cumulativeProfit = 0;

    userBets
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .forEach((bet) => {
        const date = new Date(bet.timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });

        if (!trendMap[date]) {
          trendMap[date] = { date, profit: 0, bets: 0 };
        }

        // Convert BigInt values to regular numbers to avoid type mixing errors
        const payout = Number(bet.payout) || 0;
        const amount = Number(bet.amount) || 0;
        const profitLoss = bet.won ? payout - amount : -amount;
        cumulativeProfit += profitLoss;
        trendMap[date].profit = cumulativeProfit;
        trendMap[date].bets += 1;
      });

    return Object.values(trendMap).slice(-14); // Last 14 days
  };

  const data = generateTrendData();

  if (data.length === 0) {
    return (
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 flex flex-col items-center justify-center h-80">
        <TrendingUp size={48} className="text-neutral-600 mb-3" />
        <p className="text-neutral-500">No trend data yet</p>
        <p className="text-xs text-neutral-600">Place bets over time to see trends</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 border border-secondary/30 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <TrendingUp size={20} className="text-secondary" />
        P&L Trend (Last 14 Days)
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <defs>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00FF88" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#00FF88" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(205, 255, 0, 0.1)" />
          <XAxis dataKey="date" stroke="#666" style={{ fontSize: '12px' }} />
          <YAxis stroke="#666" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(205, 255, 0, 0.3)',
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={(value) => [`$${value.toFixed(2)}`, 'Cumulative P&L']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="profit"
            stroke="#c0ff00"
            strokeWidth={2}
            dot={{ fill: '#c0ff00', r: 4 }}
            activeDot={{ r: 6 }}
            name="Cumulative P&L"
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceTrendChart;
