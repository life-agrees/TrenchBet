import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createClient } from '@supabase/supabase-js';
import {
  TrendingUp, TrendingDown, Target, DollarSign,
  Activity, Award, BarChart3, PieChart, AlertTriangle, Loader2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RePieChart, Pie, Cell
} from 'recharts';

/**
 * Portfolio Component
 *
 * FIX 1: Migrated entire design system from gray-*/blue-600 to dark-*/primary
 *         tokens so it matches the rest of the app.
 * FIX 2: All stats?.x accesses null-guarded with ?? 0 so .toFixed() never
 *         throws when stats is still null during first load.
 * FIX 3: ROI subtitle guarded against division by zero when totalBet === 0.
 * FIX 4: Error state now rendered in UI (was catch-and-console only).
 * NOTE:  Portfolio queries Supabase `user_bets` table. If your bets are stored
 *        on-chain only (Base Sepolia via useUserBets.js), this table may not
 *        exist — you'll need to either sync on-chain events to Supabase or
 *        replace fetchUserStats with the useUserBets hook.
 */

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const Portfolio = () => {
  const { address } = useAccount();
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null); // FIX 4: error state
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (address) fetchUserStats(address);
  }, [address, timeRange]);

  const fetchUserStats = async (addr) => {
    try {
      setLoading(true);
      setError(null);

      const { data: pointsData, error: pointsErr } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('wallet_address', addr)
        .gte('created_at', getTimeRangeDate(timeRange));

      if (pointsErr) throw pointsErr;

      const { data: betsData, error: betsErr } = await supabase
        .from('user_bets')
        .select('*')
        .eq('wallet_address', addr)
        .gte('created_at', getTimeRangeDate(timeRange));

      if (betsErr) throw betsErr;

      const bets      = betsData ?? [];
      const wins      = bets.filter(b => b.won === true);
      const losses    = bets.filter(b => b.won === false);
      const totalBets = bets.length;
      const winRate   = totalBets > 0 ? (wins.length / totalBets) * 100 : 0;

      const totalBet  = bets.reduce((sum, b) => sum + (b.bet_amount || 0), 0);
      const totalWon  = wins.reduce((sum, b) => sum + (b.winnings || 0), 0);
      const profit    = totalWon - totalBet;

      const totalPoints = (pointsData ?? []).reduce((sum, p) => sum + (p.points_earned || 0), 0);

      setStats({
        totalBets,
        wins: wins.length,
        losses: losses.length,
        winRate,
        totalBet,
        totalWon,
        profit,
        totalPoints,
        ...calculateMarketPerformance(bets),
        chartData: generateChartData(bets),
        recentBets: bets.slice(0, 10),
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Failed to load portfolio data'); // FIX 4
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeDate = (range) => {
    const now = new Date();
    const offsets = { '7d': 7, '30d': 30, '90d': 90 };
    if (offsets[range]) {
      return new Date(now - offsets[range] * 24 * 60 * 60 * 1000).toISOString();
    }
    return new Date(0).toISOString();
  };

  const calculateMarketPerformance = (bets) => {
    const marketStats = {};
    bets.forEach(bet => {
      if (!marketStats[bet.market_id]) {
        marketStats[bet.market_id] = { marketId: bet.market_id, asset: bet.asset, bets: 0, wins: 0, profit: 0 };
      }
      marketStats[bet.market_id].bets++;
      if (bet.won) {
        marketStats[bet.market_id].wins++;
        marketStats[bet.market_id].profit += (bet.winnings - bet.bet_amount);
      } else {
        marketStats[bet.market_id].profit -= bet.bet_amount;
      }
    });
    const sorted = Object.values(marketStats).sort((a, b) => b.profit - a.profit);
    return { bestMarkets: sorted.slice(0, 3), worstMarkets: sorted.slice(-3).reverse() };
  };

  const generateChartData = (bets) => {
    const grouped = {};
    bets.forEach(bet => {
      const date = new Date(bet.created_at).toLocaleDateString();
      if (!grouped[date]) grouped[date] = { date, profit: 0, bets: 0 };
      grouped[date].bets++;
      grouped[date].profit += bet.won ? (bet.winnings - bet.bet_amount) : -bet.bet_amount;
    });
    return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-dark-950">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-neutral-400">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  // FIX 4: error state shown in UI instead of silently logged
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-center gap-4 m-6">
        <AlertTriangle size={32} className="text-red-400 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-red-400 mb-1">Error Loading Portfolio</h3>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // FIX 2 & 3: safe accessors throughout
  const safeStats = {
    winRate:    stats?.winRate    ?? 0,
    profit:     stats?.profit     ?? 0,
    totalBet:   stats?.totalBet   ?? 0,
    totalBets:  stats?.totalBets  ?? 0,
    totalPoints: stats?.totalPoints ?? 0,
    wins:       stats?.wins       ?? 0,
    losses:     stats?.losses     ?? 0,
  };

  // FIX 3: ROI safe against division by zero
  const roiDisplay = safeStats.totalBet > 0
    ? `${safeStats.profit >= 0 ? '+' : ''}${((safeStats.profit / safeStats.totalBet) * 100).toFixed(1)}% ROI`
    : '—';

  return (
    // FIX 1: dark-950/dark-800 instead of gray-900/gray-800 throughout
    <div className="min-h-screen bg-dark-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
          <p className="text-neutral-400">Track your betting performance and earnings</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-6">
          {['7d', '30d', '90d', 'all'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary text-dark-950 font-bold'
                  : 'bg-dark-800 text-neutral-400 hover:bg-dark-700 border border-dark-700'
              }`}
            >
              {range === 'all' ? 'All Time' : range}
            </button>
          ))}
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Win Rate"
            value={`${safeStats.winRate.toFixed(1)}%`}
            icon={<Target className="w-6 h-6" />}
            color="text-green-400"
            bgColor="bg-green-500/10"
            borderColor="border-green-500/30"
            subtitle={`${safeStats.wins}W / ${safeStats.losses}L`}
          />
          <StatCard
            title="Total Profit"
            value={`$${safeStats.profit.toFixed(2)}`}
            icon={safeStats.profit >= 0
              ? <TrendingUp className="w-6 h-6" />
              : <TrendingDown className="w-6 h-6" />}
            color={safeStats.profit >= 0 ? 'text-green-400' : 'text-red-400'}
            bgColor={safeStats.profit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
            borderColor={safeStats.profit >= 0 ? 'border-green-500/30' : 'border-red-500/30'}
            subtitle={roiDisplay}
          />
          <StatCard
            title="Total Bets"
            value={safeStats.totalBets}
            icon={<Activity className="w-6 h-6" />}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
            borderColor="border-blue-500/30"
            subtitle="All time"
          />
          <StatCard
            title="Points Earned"
            value={safeStats.totalPoints.toLocaleString()}
            icon={<Award className="w-6 h-6" />}
            color="text-yellow-400"
            bgColor="bg-yellow-500/10"
            borderColor="border-yellow-500/30"
            subtitle="Lifetime"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Chart */}
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <BarChart3 className="w-5 h-5 text-primary" />
              Profit/Loss Over Time
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.chartData ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(192,255,0,0.2)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="profit" stroke="#c0ff00" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win/Loss Pie Chart */}
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
              <PieChart className="w-5 h-5 text-primary" />
              Win/Loss Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={[
                      { name: 'Wins',   value: safeStats.wins   },
                      { name: 'Losses', value: safeStats.losses },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5} dataKey="value"
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid rgba(192,255,0,0.2)', borderRadius: '8px' }} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-neutral-400">Wins ({safeStats.wins})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-neutral-400">Losses ({safeStats.losses})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Best/Worst Markets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TopMarkets markets={stats?.bestMarkets}  type="best"  title="Best Performing Markets" />
          <TopMarkets markets={stats?.worstMarkets} type="worst" title="Markets to Avoid" />
        </div>

        {/* Recent Bets Table */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Recent Bets</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-neutral-500 border-b border-dark-700 text-sm">
                  <th className="pb-3">Market</th>
                  <th className="pb-3">Prediction</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Result</th>
                  <th className="pb-3">P&L</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentBets ?? []).map((bet, idx) => (
                  <tr key={idx} className="border-b border-dark-700/50">
                    <td className="py-3 text-white">{bet.asset}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        bet.choice === 1 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {bet.choice === 1 ? 'UP' : 'DOWN'}
                      </span>
                    </td>
                    <td className="py-3 text-white">${bet.bet_amount}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        bet.won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {bet.won ? 'Won' : 'Lost'}
                      </span>
                    </td>
                    <td className={`py-3 font-semibold ${bet.won ? 'text-green-400' : 'text-red-400'}`}>
                      {bet.won ? '+' : '-'}${Math.abs(bet.won ? bet.winnings - bet.bet_amount : bet.bet_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

const StatCard = ({ title, value, icon, color, bgColor, borderColor, subtitle }) => (
  <div className={`${bgColor} border ${borderColor} rounded-xl p-6`}>
    <div className="flex items-center justify-between mb-4">
      <span className="text-neutral-400 text-sm">{title}</span>
      <div className={color}>{icon}</div>
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    {subtitle && <div className="text-sm text-neutral-500 mt-1">{subtitle}</div>}
  </div>
);

const TopMarkets = ({ markets, type, title }) => (
  <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
    <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>
    <div className="space-y-3">
      {(markets ?? []).map((market, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              type === 'best' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <span className={`text-sm font-bold ${type === 'best' ? 'text-green-400' : 'text-red-400'}`}>
                {idx + 1}
              </span>
            </div>
            <div>
              <div className="font-medium text-white">{market.asset}</div>
              <div className="text-sm text-neutral-400">{market.bets} bets</div>
            </div>
          </div>
          <div className={`font-semibold ${market.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {market.profit >= 0 ? '+' : ''}${market.profit.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Portfolio;