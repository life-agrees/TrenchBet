import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Trophy, XCircle } from 'lucide-react';

/**
 * Win/Loss Ratio Pie Chart Component
 * Visualizes betting performance distribution
 */
const WinLossChart = ({ wins = 0, losses = 0, isLoading = false }) => {
  const total = wins + losses;
  const data = [
    { name: 'Wins', value: wins, color: '#00FF88' },
    { name: 'Losses', value: losses, color: '#FF4757' }
  ];

  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

  if (total === 0) {
    return (
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 flex flex-col items-center justify-center h-80">
        <Trophy size={48} className="text-neutral-600 mb-3" />
        <p className="text-neutral-500">No bets yet</p>
        <p className="text-xs text-neutral-600">Place bets to see your win/loss ratio</p>
      </div>
    );
  }

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
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => value}
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(205, 255, 0, 0.3)',
              borderRadius: '8px',
              color: '#fff'
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
