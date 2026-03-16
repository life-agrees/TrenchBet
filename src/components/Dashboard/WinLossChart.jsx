import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Trophy } from 'lucide-react';

/**
 * Win/Loss Ratio Pie Chart Component
 *
 * FIX: isLoading prop was accepted but never used — component showed empty
 *      state instead of a loading skeleton while parent data was fetching.
 */
const WinLossChart = ({ wins = 0, losses = 0, isLoading = false }) => {
  // FIX: loading skeleton
  if (isLoading) {
    return (
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 h-80 flex flex-col">
        <div className="h-5 w-44 bg-dark-700 rounded animate-pulse mb-6" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-40 h-40 rounded-full bg-dark-700 animate-pulse" />
        </div>
      </div>
    );
  }

  const total = wins + losses;

  if (total === 0) {
    return (
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 flex flex-col items-center justify-center h-80">
        <Trophy size={48} className="text-neutral-600 mb-3" />
        <p className="text-neutral-500">No bets yet</p>
        <p className="text-xs text-neutral-600">Place bets to see your win/loss ratio</p>
      </div>
    );
  }

  const data = [
    { name: 'Wins',   value: wins,   color: '#10B981' },
    { name: 'Losses', value: losses, color: '#EF4444' },
  ];

  const winRate = ((wins / total) * 100).toFixed(1);

  return (
    <div className="bg-dark-800 border border-secondary/30 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <Trophy size={20} className="text-secondary" />
        Win/Loss Distribution
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name}: ${value}`}
            outerRadius={100}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1f2e',
              border: '1px solid rgba(192,255,0,0.3)',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-neutral-300 text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-6 text-center">
        <p className="text-sm text-neutral-400 mb-2">Overall Win Rate</p>
        <p className="text-3xl font-black text-primary">{winRate}%</p>
      </div>
    </div>
  );
};

export default WinLossChart;