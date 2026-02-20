import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Activity,
  Award,
  BarChart3,
  PieChart,
  Calendar
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const Portfolio = () => {
  const { address } = useAccount();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (address) {
      fetchUserStats(address);
    }
  }, [address, timeRange]);

  const fetchUserStats = async (addr) => {
    try {
      setLoading(true);
      
      // Fetch from Supabase
      const { data: pointsData } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('wallet_address', addr)
        .gte('created_at', getTimeRangeDate(timeRange));

      const { data: betsData } = await supabase
        .from('user_bets')
        .select('*')
        .eq('wallet_address', addr)
        .gte('created_at', getTimeRangeDate(timeRange));

      // Calculate statistics
      const wins = betsData?.filter(b => b.won === true) || [];
      const losses = betsData?.filter(b => b.won === false) || [];
      const totalBets = betsData?.length || 0;
      const winRate = totalBets > 0 ? (wins.length / totalBets) * 100 : 0;

      // Calculate P&L
      const totalBet = betsData?.reduce((sum, b) => sum + (b.bet_amount || 0), 0) || 0;
      const totalWon = wins.reduce((sum, b) => sum + (b.winnings || 0), 0);
      const profit = totalWon - totalBet;

      // Calculate points
      const totalPoints = pointsData?.reduce((sum, p) => sum + (p.points_earned || 0), 0) || 0;

      // Get best/worst markets
      const marketPerformance = calculateMarketPerformance(betsData || []);
      
      // Generate chart data
      const chartData = generateChartData(betsData || [], timeRange);

      setStats({
        totalBets,
        wins: wins.length,
        losses: losses.length,
        winRate,
        totalBet,
        totalWon,
        profit,
        totalPoints,
        bestMarkets: marketPerformance.best,
        worstMarkets: marketPerformance.worst,
        chartData,
        recentBets: betsData?.slice(0, 10) || []
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeDate = (range) => {
    const now = new Date();
    switch(range) {
      case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d': return new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
      default: return new Date(0).toISOString();
    }
  };

  const calculateMarketPerformance = (bets) => {
    const marketStats = {};
    
    bets.forEach(bet => {
      if (!marketStats[bet.market_id]) {
        marketStats[bet.market_id] = {
          marketId: bet.market_id,
          asset: bet.asset,
          bets: 0,
          wins: 0,
          profit: 0
        };
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
    
    return {
      best: sorted.slice(0, 3),
      worst: sorted.slice(-3).reverse()
    };
  };

  const generateChartData = (bets, range) => {
    const grouped = {};
    
    bets.forEach(bet => {
      const date = new Date(bet.created_at).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = { date, profit: 0, bets: 0 };
      }
      grouped[date].bets++;
      grouped[date].profit += bet.won ? (bet.winnings - bet.bet_amount) : -bet.bet_amount;
    });
    
    return Object.values(grouped).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
  };

  const COLORS = ['#10B981', '#EF4444'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
          <p className="text-gray-400">Track your betting performance and earnings</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-6">
          {['7d', '30d', '90d', 'all'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
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
            value={`${stats?.winRate.toFixed(1)}%`}
            icon={<Target className="w-6 h-6" />}
            color="text-green-400"
            bgColor="bg-green-500/10"
            subtitle={`${stats?.wins}W / ${stats?.losses}L`}
          />
          <StatCard
            title="Total Profit"
            value={`$${stats?.profit.toFixed(2)}`}
            icon={stats?.profit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            color={stats?.profit >= 0 ? 'text-green-400' : 'text-red-400'}
            bgColor={stats?.profit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
            subtitle={`${stats?.profit >= 0 ? '+' : ''}${((stats?.profit / stats?.totalBet) * 100).toFixed(1)}% ROI`}
          />
          <StatCard
            title="Total Bets"
            value={stats?.totalBets}
            icon={<Activity className="w-6 h-6" />}
            color="text-blue-400"
            bgColor="bg-blue-500/10"
            subtitle="All time"
          />
          <StatCard
            title="Points Earned"
            value={stats?.totalPoints?.toLocaleString()}
            icon={<Award className="w-6 h-6" />}
            color="text-yellow-400"
            bgColor="bg-yellow-500/10"
            subtitle="Lifetime"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Performance Chart */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Profit/Loss Over Time
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win/Loss Pie Chart */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Win/Loss Distribution
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={[
                      { name: 'Wins', value: stats?.wins || 0 },
                      { name: 'Losses', value: stats?.losses || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats && stats.wins + stats.losses > 0 && [
                      <Cell key="cell-0" fill="#10B981" />,
                      <Cell key="cell-1" fill="#EF4444" />
                    ]}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-400">Wins ({stats?.wins})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-gray-400">Losses ({stats?.losses})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Best/Worst Markets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <TopMarkets 
            markets={stats?.bestMarkets} 
            type="best" 
            title="Best Performing Markets"
          />
          <TopMarkets 
            markets={stats?.worstMarkets} 
            type="worst" 
            title="Markets to Avoid"
          />
        </div>

        {/* Recent Bets Table */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Bets</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-3">Market</th>
                  <th className="pb-3">Prediction</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Result</th>
                  <th className="pb-3">P&L</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentBets?.map((bet, idx) => (
                  <tr key={idx} className="border-b border-gray-700/50">
                    <td className="py-3">{bet.asset}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        bet.choice === 1 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {bet.choice === 1 ? 'UP' : 'DOWN'}
                      </span>
                    </td>
                    <td className="py-3">${bet.bet_amount}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-sm ${
                        bet.won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {bet.won ? 'Won' : 'Lost'}
                      </span>
                    </td>
                    <td className={`py-3 ${bet.won ? 'text-green-400' : 'text-red-400'}`}>
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

const StatCard = ({ title, value, icon, color, bgColor, subtitle }) => (
  <div className={`${bgColor} rounded-xl p-6`}>
    <div className="flex items-center justify-between mb-4">
      <span className="text-gray-400">{title}</span>
      <div className={color}>{icon}</div>
    </div>
    <div className="text-2xl font-bold">{value}</div>
    {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
  </div>
);

const TopMarkets = ({ markets, type, title }) => (
  <div className="bg-gray-800 rounded-xl p-6">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <div className="space-y-3">
      {markets?.map((market, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              type === 'best' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              <span className={`text-sm font-bold ${
                type === 'best' ? 'text-green-400' : 'text-red-400'
              }`}>{idx + 1}</span>
            </div>
            <div>
              <div className="font-medium">{market.asset}</div>
              <div className="text-sm text-gray-400">{market.bets} bets</div>
            </div>
          </div>
          <div className={`font-semibold ${
            market.profit >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {market.profit >= 0 ? '+' : ''}${market.profit.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Portfolio;
