import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Activity, Wallet,
  Loader2, ExternalLink, Bell, AlertCircle, CheckCircle, Clock, Target, Zap, 
  Award, Plus, Settings as SettingsIcon, RefreshCw, Download, FileText, 
  Calendar, Search, Filter, Eye, EyeOff
} from 'lucide-react';
import { formatUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { CONTRACTS } from '../utils/constants';
import {
  generateVolumeTrendData, generateUserGrowthData, generateMarketTypeData,
  getMarketStatus, generateAlerts, getSystemStatus, getPlatformMetrics, formatTimeString
} from '../utils/adminDashboardUtils';

const DashboardTab = ({
  stats, isLoadingStats, handleWithdraw, contractAddress, isPending, isConfirming, 
  onNavigate, markets = []
}) => {
  const publicClient = usePublicClient();
  const [timeRange, setTimeRange] = useState('7d');
  const [marketFilter, setMarketFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [topUsers, setTopUsers] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Cache for block timestamps to avoid redundant RPC calls
  const blockCache = useRef({});

  // Format number helper
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    if (!publicClient) return;
    setIsLoadingActivity(true);
    try {
      const { fromBlock, toBlock } = await getSafeBlockRange();
      const logs = await publicClient.getLogs({
        address: CONTRACTS.PROXY,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
        fromBlock, toBlock
      });

      const recentLogs = logs.slice(-15).reverse();
      
      // Parallel fetch block timestamps with caching
      const activities = await Promise.all(recentLogs.map(async (log) => {
        try {
          const blockNumber = Number(log.blockNumber);
          let timestamp;
          
          if (blockCache.current[blockNumber]) {
            timestamp = blockCache.current[blockNumber];
          } else {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            timestamp = Number(block.timestamp) * 1000;
            blockCache.current[blockNumber] = timestamp;
          }

          // Resolve market details (question/asset) from markets prop
          const marketId = Number(log.args.marketId);
          const marketData = markets.find(m => Number(m.id) === marketId);

          return {
            id: log.transactionHash,
            type: 'bet',
            marketId,
            marketQuestion: marketData?.question || `Market #${marketId}`,
            asset: marketData?.asset || 'Unknown',
            user: log.args.user,
            amount: Number(log.args.amount) / 1e6,
            choice: Number(log.args.choice),
            timestamp,
            txHash: log.transactionHash
          };
        } catch (error) {
          console.warn('Failed to process log:', error);
          return null;
        }
      }));

      setRecentActivity(activities.filter(Boolean));
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Fetch top users
  const fetchTopUsers = async () => {
    if (!publicClient) return;
    setIsLoadingLeaderboard(true);
    try {
      const { fromBlock, toBlock } = await getSafeBlockRange();
      const logs = await publicClient.getLogs({
        address: CONTRACTS.PROXY,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
        fromBlock, toBlock
      });

      const userStats = {};
      logs.forEach((log) => {
        const addr = log.args.user.toLowerCase();
        if (!userStats[addr]) {
          userStats[addr] = { address: log.args.user, bets: 0, volume: 0 };
        }
        userStats[addr].bets += 1;
        userStats[addr].volume += Number(log.args.amount) / 1e6;
      });

      const sorted = Object.values(userStats)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5)
        .map((user, idx) => ({ ...user, rank: idx + 1 }));

      setTopUsers(sorted);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const getSafeBlockRange = async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      // Increase scan window to 10,000 blocks for more comprehensive user metrics
      const fromBlock = currentBlock > BigInt(10000) ? currentBlock - BigInt(10000) : BigInt(0);
      return { fromBlock, toBlock: 'latest' };
    } catch {
      return { fromBlock: BigInt(-10000), toBlock: 'latest' };
    }
  };

  // Generate all analytics data
  const analyticsData = useMemo(() => ({
    volumeTrend: generateVolumeTrendData(stats),
    userGrowth: generateUserGrowthData(stats),
    marketTypes: generateMarketTypeData(markets),
    alerts: generateAlerts(stats, markets, getMarketStatus(markets, stats)),
    marketStatus: getMarketStatus(markets, stats),
    systemStatus: getSystemStatus(stats, markets),
    metrics: getPlatformMetrics(stats, markets)
  }), [stats, markets]);

  // Initial fetch
  useEffect(() => {
    if (publicClient) {
      fetchRecentActivity();
      fetchTopUsers();
    }
  }, [publicClient, stats]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchRecentActivity();
      fetchTopUsers();
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, publicClient]);

  if (isLoadingStats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-dark-800/50 rounded-xl p-6 border border-neutral-200 dark:border-dark-700 animate-pulse">
              <div className="h-8 bg-neutral-200 dark:bg-dark-700 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-neutral-200 dark:bg-dark-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-black text-neutral-900 dark:text-white mb-1 tracking-tight">Platform Analytics</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-2 font-medium">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-neutral-400'}`}></span>
            {autoRefresh ? 'Live' : 'Paused'} • Last updated {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg border transition-all shadow-sm ${
              autoRefresh 
                ? 'bg-primary/20 border-primary text-neutral-900 dark:text-primary' 
                : 'bg-white dark:bg-dark-700 border-neutral-200 dark:border-dark-600 text-neutral-400'
            }`}
            title={autoRefresh ? 'Pause' : 'Resume'}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {/* Export */}}
            className="px-4 py-2 bg-white dark:bg-dark-700 hover:bg-neutral-100 dark:bg-dark-600 border border-neutral-200 dark:border-dark-600 text-neutral-900 dark:text-white rounded-lg flex items-center gap-2 transition-all font-bold shadow-sm"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-black tracking-widest">Period Change</p>
            <p className="text-3xl font-black text-neutral-900 dark:text-primary mt-2">{analyticsData.metrics.periodChange}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 font-bold">vs previous period</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-black tracking-widest">Avg Bet Size</p>
            <p className="text-3xl font-black text-neutral-900 dark:text-secondary mt-2">${analyticsData.metrics.avgBetSize}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 font-bold">stable trend</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-black tracking-widest">Success Rate</p>
            <p className="text-3xl font-black text-green-600 dark:text-success mt-2">{analyticsData.metrics.successRate}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 font-bold">market predictability</p>
          </div>
        </div>
      </div>

      {/* TIME RANGE & FILTERS */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-neutral-200/50 dark:bg-dark-800 rounded-lg p-1 border border-neutral-200 dark:border-dark-700 shadow-inner">
          {['24h', '7d', '30d', 'All'].map(period => (
            <button 
              key={period}
              onClick={() => setTimeRange(period)}
              className={`px-4 py-1.5 rounded-md transition-all text-sm font-bold ${
                timeRange === period 
                  ? 'bg-neutral-900 dark:bg-primary text-white dark:text-dark-950 shadow-md' 
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        <select 
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value)}
          className="bg-white dark:bg-dark-700 border border-neutral-200 dark:border-dark-600 rounded-lg px-4 py-2 text-neutral-900 dark:text-white text-sm font-bold shadow-sm"
        >
          <option value="all">All Markets</option>
          <option value="binary">Binary</option>
          <option value="multi">Multi-Choice</option>
          <option value="range">Range</option>
          <option value="time">Time</option>
        </select>
      </div>

      {/* ALERTS BANNER */}
      {analyticsData.alerts.length > 0 && (
        <div className="space-y-2 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl shadow-sm">
          {analyticsData.alerts.slice(0, 2).map(alert => (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20' : 'bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20'}`}>
              <AlertCircle size={16} className={alert.severity === 'critical' ? 'text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' : 'text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5'} />
              <div className="flex-1">
                <p className={`font-bold text-sm ${alert.severity === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{alert.title}</p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 font-medium">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2-COL LAYOUT: Alerts Sidebar + Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT SIDEBAR: ALERTS */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-800/50 rounded-xl border border-neutral-200 dark:border-dark-700 sticky top-4 h-fit">
            <div className="p-4 border-b border-neutral-200 dark:border-dark-700">
              <h3 className="font-bold text-neutral-900 dark:text-white text-sm flex items-center gap-2">
                <Bell size={14} />
                Active Alerts ({analyticsData.alerts.length})
              </h3>
            </div>
            <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
              {analyticsData.alerts.map(alert => (
                <div key={alert.id} className={`p-3 rounded-lg border text-xs shadow-sm ${alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-500/20' : alert.severity === 'warning' ? 'bg-yellow-50 dark:bg-yellow-500/5 border-yellow-200 dark:border-yellow-500/20' : 'bg-blue-50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20'}`}>
                  <div className={`font-bold ${alert.severity === 'critical' ? 'text-red-700 dark:text-red-400' : alert.severity === 'warning' ? 'text-yellow-700 dark:text-yellow-400' : 'text-blue-700 dark:text-blue-400'}`}>{alert.title}</div>
                  <div className="text-neutral-500 dark:text-neutral-400 mt-1 font-medium">{alert.message}</div>
                </div>
              ))}
              {analyticsData.alerts.length === 0 && (
                <div className="text-center py-6 text-neutral-400 dark:text-neutral-500 text-xs font-bold">
                  <CheckCircle size={20} className="mx-auto mb-2 opacity-30" />
                  All systems healthy
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT: 3 COL */}
        <div className="lg:col-span-3 space-y-6">
          {/* KEY METRICS - PRIMARY */}
          <div className="grid grid-cols-2 gap-4">
            {/* Primary Metric 1: Volume */}
            <div className="col-span-1 lg:col-span-1 bg-white dark:bg-dark-800/50 rounded-xl p-6 border border-primary/30 hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm dark:shadow-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-neutral-500 dark:text-neutral-400 text-[10px] font-black uppercase tracking-widest">Total Volume</h3>
                  <div className="bg-primary/20 p-2 rounded-lg shadow-inner"><DollarSign className="text-neutral-900 dark:text-primary" size={18} /></div>
                </div>
                <div className="text-4xl font-black text-neutral-900 dark:text-primary tracking-tight">${formatNumber(stats?.totalVolume || 0)}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 font-bold">{stats?.totalBets || 0} total bets</div>
                {stats?.totalVolume > 0 && <div className="text-green-600 dark:text-green-400 text-xs font-black mt-2">↑ 18.5% increase</div>}
              </div>
            </div>

            {/* Primary Metric 2: Active Users */}
            <div className="col-span-1 lg:col-span-1 bg-white dark:bg-dark-800/50 rounded-xl p-6 border border-secondary/30 hover:border-secondary/50 transition-all group relative overflow-hidden shadow-sm dark:shadow-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-neutral-500 dark:text-neutral-400 text-[10px] font-black uppercase tracking-widest">Active Users</h3>
                  <div className="bg-secondary/20 p-2 rounded-lg shadow-inner"><Users className="text-neutral-900 dark:text-secondary" size={18} /></div>
                </div>
                <div className="text-4xl font-black text-neutral-900 dark:text-secondary tracking-tight">{stats?.totalUsers || 0}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 font-bold">unique participants</div>
                {stats?.totalUsers > 0 && <div className="text-green-600 dark:text-green-400 text-xs font-black mt-2">↑ 12.3% growth</div>}
              </div>
            </div>
          </div>

          {/* KEY METRICS - SECONDARY */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700 shadow-sm">
              <p className="text-neutral-500 dark:text-neutral-400 text-[10px] uppercase font-black tracking-widest mb-2">Total Bets</p>
              <p className="text-2xl font-black text-neutral-900 dark:text-primary tracking-tight">{formatNumber(stats?.totalBets || 0)}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 font-bold">all-time</p>
            </div>
            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700 shadow-sm">
              <p className="text-neutral-500 dark:text-neutral-400 text-[10px] uppercase font-black tracking-widest mb-2">Pending Revenue</p>
              <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400 tracking-tight">${Number(formatUnits(stats?.pendingFees || 0n, 6)).toFixed(0)}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 font-bold">withdrawable</p>
            </div>
            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700 shadow-sm">
              <p className="text-neutral-500 dark:text-neutral-400 text-[10px] uppercase font-black tracking-widest mb-2">Contract TVL</p>
              <p className="text-2xl font-black text-neutral-900 dark:text-secondary tracking-tight">${Number(formatUnits(stats?.contractBalance || 0n, 6)).toFixed(0)}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 font-bold">USDC balance</p>
            </div>
          </div>

          {/* ANALYTICS CHARTS */}
          <div className="grid grid-cols-3 gap-4">
            {/* Chart 1: Volume Trend */}
            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700">
              <h3 className="text-neutral-900 dark:text-white font-bold text-sm mb-3">Volume Trend (7d)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={analyticsData.volumeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="volume" stroke="#c0ff00" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: User Growth */}
            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700">
              <h3 className="text-neutral-900 dark:text-white font-bold text-sm mb-3">User Growth (7d)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={analyticsData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="users" fill="#00FF88" stroke="#00FF88" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 3: Market Distribution */}
            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700">
              <h3 className="text-neutral-900 dark:text-white font-bold text-sm mb-3">Market Types</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={analyticsData.marketTypes} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                    {analyticsData.marketTypes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MARKET STATUS OVERVIEW */}
          <div className="bg-white dark:bg-dark-800/50 rounded-xl p-6 border border-neutral-200 dark:border-dark-700 shadow-sm">
            <h3 className="text-neutral-900 dark:text-white font-black text-sm mb-4 uppercase tracking-widest">Market Status Overview</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-black text-neutral-900 dark:text-primary tracking-tight">{analyticsData.marketStatus.activeMarkets}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 font-black uppercase tracking-widest">Active</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-neutral-900 dark:text-secondary tracking-tight">{analyticsData.marketStatus.resolvedMarkets}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 font-black uppercase tracking-widest">Resolved</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-yellow-600 dark:text-yellow-400 tracking-tight">{analyticsData.marketStatus.pendingResolution}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 font-black uppercase tracking-widest">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-red-600 dark:text-red-400 tracking-tight">{analyticsData.marketStatus.issues}</p>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 font-black uppercase tracking-widest">Attention</p>
              </div>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="bg-white dark:bg-dark-800/50 rounded-xl p-5 border border-primary/20">
            <h3 className="text-neutral-900 dark:text-white font-bold mb-4 flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => onNavigate?.('create')} className="bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary p-3 rounded-lg font-bold text-sm transition-all hover:scale-105">
                ➕ Create Market
              </button>
              <button onClick={() => onNavigate?.('manage')} className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 p-3 rounded-lg font-bold text-sm transition-all hover:scale-105">
                ⚙️ Manage
              </button>
              <button onClick={handleWithdraw} disabled={!stats?.pendingFees || stats.pendingFees === 0n} className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg font-bold text-sm transition-all hover:scale-105 disabled:opacity-50">
                💰 Withdraw
              </button>
            </div>
          </div>

          {/* ADVANCED ACTIVITY TABLE */}
          <div className="bg-white dark:bg-dark-800/50 rounded-xl border border-neutral-200 dark:border-dark-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-200 dark:border-dark-700 flex items-center justify-between">
              <h3 className="text-neutral-900 dark:text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                Recent Activity
              </h3>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-500 font-bold uppercase tracking-widest">Last 15 transactions</span>
            </div>
            {isLoadingActivity ? (
              <div className="p-8 text-center text-neutral-500"><Loader2 className="animate-spin mx-auto" /></div>
            ) : recentActivity.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 font-bold text-sm">No recent activity</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-dark-900/50 border-b border-neutral-200 dark:border-dark-700">
                    <tr className="text-left text-[10px] text-neutral-500 dark:text-neutral-400 font-black uppercase tracking-widest">
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Market</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-dark-700">
                    {recentActivity.map(activity => (
                      <tr key={activity.id} className="hover:bg-neutral-50 dark:hover:bg-dark-700/30 transition">
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300 font-medium whitespace-nowrap">{formatTimeString(activity.timestamp)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-neutral-900 dark:text-primary font-bold line-clamp-1">{activity.marketQuestion}</span>
                            <span className="text-[10px] text-neutral-500 uppercase font-black">{activity.asset} • #{activity.marketId}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-neutral-500 dark:text-neutral-400 font-bold">
                          <a 
                            href={`https://sepolia.basescan.org/address/${activity.user}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors"
                          >
                            {activity.user.slice(0, 6)}...{activity.user.slice(-4)}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-secondary font-black tracking-tight">${activity.amount.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <a 
                            href={`https://sepolia.basescan.org/tx/${activity.txHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-dark font-bold text-xs underline underline-offset-2"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TOP PREDICTORS */}
          <div className="bg-white dark:bg-dark-800/50 rounded-xl border border-neutral-200 dark:border-dark-700">
            <div className="p-4 border-b border-neutral-200 dark:border-dark-700">
              <h3 className="text-neutral-900 dark:text-white font-bold flex items-center gap-2">
                <Award size={16} className="text-primary" />
                Top Predictors
              </h3>
            </div>
            {isLoadingLeaderboard ? (
              <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-dark-700">
                {topUsers.map(user => (
                  <div key={user.address} className="p-4 hover:bg-neutral-50 dark:hover:bg-dark-700/30 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-sm ${
                          user.rank === 1 ? 'bg-yellow-400 text-neutral-900' : 
                          user.rank === 2 ? 'bg-neutral-300 dark:bg-gray-400 text-neutral-900' : 
                          'bg-neutral-100 dark:bg-dark-700 text-neutral-500 dark:text-neutral-400'
                        }`}>#{user.rank}</div>
                        <div className="font-mono text-sm text-neutral-900 dark:text-white font-bold">{user.address.slice(0, 10)}...</div>
                      </div>
                      <div className="text-right">
                        <p className="text-secondary font-black tracking-tight">${formatNumber(user.volume)}</p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-500 font-bold uppercase tracking-widest">{user.bets} bets</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CONTRACT MANAGEMENT */}
          <div className="bg-white dark:bg-dark-800/50 rounded-xl p-6 border border-primary/20">
            <h3 className="text-neutral-900 dark:text-white font-bold mb-4 flex items-center gap-2">
              <Wallet size={18} className="text-primary" />
              Smart Contract
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-neutral-500 dark:text-neutral-400 text-[10px] mb-2 font-black uppercase tracking-widest">Contract Address</p>
                <div className="flex items-center gap-2 bg-neutral-100 dark:bg-dark-900 p-3 rounded-lg border border-neutral-200 dark:border-dark-700 shadow-inner">
                  <p className="font-mono text-sm text-neutral-900 dark:text-white flex-1 break-all font-bold">{contractAddress || 'Not connected'}</p>
                  {contractAddress && (
                    <a href={`https://sepolia.basescan.org/address/${contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-dark">
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-neutral-100 dark:bg-dark-900 p-4 rounded-lg border border-neutral-200 dark:border-dark-700 shadow-sm">
                  <p className="text-neutral-500 dark:text-neutral-400 text-[10px] mb-2 uppercase font-black tracking-widest">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-neutral-900 dark:text-white font-black text-sm uppercase tracking-widest">Operational</p>
                  </div>
                </div>
                <div className="bg-neutral-100 dark:bg-dark-900 p-4 rounded-lg border border-neutral-200 dark:border-dark-700 shadow-sm">
                  <p className="text-neutral-500 dark:text-neutral-400 text-[10px] mb-2 uppercase font-black tracking-widest">Version</p>
                  <p className="text-neutral-900 dark:text-white font-black text-sm">v2.1.0</p>
                </div>
                <div className="bg-neutral-100 dark:bg-dark-900 p-4 rounded-lg border border-neutral-200 dark:border-dark-700 shadow-sm">
                  <p className="text-neutral-500 dark:text-neutral-400 text-[10px] mb-2 uppercase font-black tracking-widest">Uptime</p>
                  <p className="text-neutral-900 dark:text-white font-black text-sm">99.9%</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-secondary/20 border border-primary/30 rounded-xl p-5 shadow-sm">
                <h4 className="text-neutral-900 dark:text-white font-black text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                  <DollarSign size={16} className="text-primary" />
                  Revenue Withdrawal
                </h4>
                <p className="text-neutral-600 dark:text-neutral-300 text-xs mb-4 font-bold">Pending fees available for withdrawal from the smart contract.</p>
                <div className="bg-white/50 dark:bg-dark-900/50 p-4 rounded-lg mb-4 border border-primary/20 shadow-inner">
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mb-1 font-black uppercase tracking-widest">Available Revenue</p>
                  <p className="text-4xl font-black text-neutral-900 dark:text-primary tracking-tighter">${Number(formatUnits(stats?.pendingFees || 0n, 6)).toFixed(2)}</p>
                </div>
                <button 
                  onClick={handleWithdraw}
                  disabled={isPending || isConfirming || !stats?.pendingFees || stats.pendingFees === 0n}
                  className="w-full bg-neutral-900 dark:bg-primary hover:bg-black dark:hover:bg-primary-dark disabled:bg-neutral-300 dark:disabled:bg-gray-700 text-white dark:text-dark-950 font-black py-4 rounded-lg transition-all disabled:cursor-not-allowed uppercase tracking-widest text-sm shadow-lg shadow-primary/10"
                >
                  {isPending || isConfirming ? 'Processing...' : 'Withdraw Revenue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
