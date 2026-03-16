import React, { useState, useMemo } from 'react';
import { BarChart3, Clock, TrendingUp, Calendar } from 'lucide-react';

/**
 * Stats Tabs Component
 *
 * FIX 1: Win rate now divides by (wins + losses) with a proper guard so it
 *         returns 0 instead of NaN/Infinity when all bets are still pending
 *         (wins + losses === 0 but filteredBets.length > 0).
 * FIX 2: calculateStats is now wrapped in useMemo so it only recomputes when
 *         userBets or activeTab changes — not on every parent render.
 */
const StatsTabs = ({ userBets = [] }) => {
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all',   label: 'All Time',   icon: BarChart3  },
    { id: 'today', label: 'Today',      icon: Calendar   },
    { id: 'week',  label: 'This Week',  icon: Clock      },
    { id: 'month', label: 'This Month', icon: TrendingUp },
  ];

  // FIX 2: memoized — only recalculates when userBets or activeTab changes
  const stats = useMemo(() => {
    let filteredBets = userBets;
    const now = Date.now();

    if (activeTab === 'today') {
      const startOfDay = new Date(now).setHours(0, 0, 0, 0);
      filteredBets = userBets.filter(b => new Date(b.timestamp).getTime() >= startOfDay);
    } else if (activeTab === 'week') {
      const startOfWeek = now - 7 * 24 * 60 * 60 * 1000;
      filteredBets = userBets.filter(b => new Date(b.timestamp).getTime() >= startOfWeek);
    } else if (activeTab === 'month') {
      const startOfMonth = now - 30 * 24 * 60 * 60 * 1000;
      filteredBets = userBets.filter(b => new Date(b.timestamp).getTime() >= startOfMonth);
    }

    const wins    = filteredBets.filter(b => b.won).length;
    const losses  = filteredBets.filter(b => !b.won && b.resolved).length;
    const pending = filteredBets.filter(b => !b.resolved).length;

    const totalBetAmount = filteredBets.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalWinnings  = filteredBets.reduce((sum, b) => sum + (b.won ? (b.payout || 0) : 0), 0);

    // FIX 1: guard against wins + losses === 0 (all pending) — was NaN/Infinity before
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
    <div className="bg-dark-800 border border-secondary/30 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-dark-700 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-neutral-400 hover:text-white hover:bg-dark-700/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-neutral-400 mb-1">Total Bets</p>
            <p className="text-2xl font-black text-white">{stats.total}</p>
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
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success to-primary transition-all"
                style={{ width: `${stats.winRate}%` }}
              />
            </div>
          </div>

          {/* Bet Distribution */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-dark-700">
            <div className="text-center">
              <p className="text-xs text-neutral-400 mb-1">Avg Bet</p>
              <p className="text-lg font-bold text-white">
                ${stats.total > 0 ? (stats.totalBetAmount / stats.total).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-400 mb-1">Total Wagered</p>
              <p className="text-lg font-bold text-white">${stats.totalBetAmount.toFixed(2)}</p>
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