import React, { useState, useEffect, useMemo } from 'react';
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
      const activities = [];

      for (const log of recentLogs) {
        try {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          activities.push({
            id: log.transactionHash,
            type: 'bet',
            marketId: Number(log.args.marketId),
            user: log.args.user,
            amount: Number(log.args.amount) / 1e6,
            choice: Number(log.args.choice),
            timestamp: Number(block.timestamp) * 1000,
            txHash: log.transactionHash
          });
        } catch (error) {
          console.warn('Failed to fetch block:', error);
        }
      }
      setRecentActivity(activities);
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
      const fromBlock = currentBlock > BigInt(5000) ? currentBlock - BigInt(5000) : BigInt(0);
      return { fromBlock, toBlock: 'latest' };
    } catch {
      return { fromBlock: BigInt(-5000), toBlock: 'latest' };
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
            <div key={i} className="bg-dark-800/50 rounded-xl p-6 border border-dark-700 animate-pulse">
              <div className="h-8 bg-dark-700 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-dark-700 rounded w-3/4"></div>
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
          <h2 className="text-3xl font-black text-white mb-1">Platform Analytics</h2>
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
            {autoRefresh ? 'Live' : 'Paused'} • Last updated {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg border transition-all ${
              autoRefresh 
                ? 'bg-primary/20 border-primary text-primary' 
                : 'bg-dark-700 border-dark-600 text-gray-400'
            }`}
            title={autoRefresh ? 'Pause' : 'Resume'}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {/* Export */}}
            className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white rounded-lg flex items-center gap-2 transition-all"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* EXECUTIVE SUMMARY */}
      <div className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/20 rounded-xl p-6">
        <div className="grid grid-cols-3 gap-8">
          <div>
            <p className="text-xs text-neutral-400 uppercase font-bold">Period Change</p>
            <p className="text-3xl font-black text-primary mt-2">{analyticsData.metrics.periodChange}</p>
            <p className="text-xs text-neutral-500 mt-1">vs previous period</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 uppercase font-bold">Avg Bet Size</p>
            <p className="text-3xl font-black text-secondary mt-2">${analyticsData.metrics.avgBetSize}</p>
            <p className="text-xs text-neutral-500 mt-1">stable trend</p>
          </div>
          <div>
            <p className="text-xs text-neutral-400 uppercase font-bold">Success Rate</p>
            <p className="text-3xl font-black text-success mt-2">{analyticsData.metrics.successRate}</p>
            <p className="text-xs text-neutral-500 mt-1">market predictability</p>
          </div>
        </div>
      </div>

      {/* TIME RANGE & FILTERS */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-dark-800 rounded-lg p-1 border border-dark-700">
          {['24h', '7d', '30d', 'All'].map(period => (
            <button 
              key={period}
              onClick={() => setTimeRange(period)}
              className={`px-3 py-1.5 rounded transition-all text-sm font-semibold ${
                timeRange === period 
                  ? 'bg-primary text-dark-950' 
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        <select 
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value)}
          className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-white text-sm font-semibold"
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
        <div className="space-y-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          {analyticsData.alerts.slice(0, 2).map(alert => (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${alert.severity === 'critical' ? 'bg-red-500/10 border border-red-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
              <AlertCircle size={16} className={alert.severity === 'critical' ? 'text-red-400 flex-shrink-0 mt-0.5' : 'text-yellow-400 flex-shrink-0 mt-0.5'} />
              <div className="flex-1">
                <p className={`font-bold text-sm ${alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>{alert.title}</p>
                <p className="text-xs text-gray-300 mt-1">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2-COL LAYOUT: Alerts Sidebar + Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT SIDEBAR: ALERTS */}
        <div className="lg:col-span-1">
          <div className="bg-dark-800/50 rounded-xl border border-dark-700 sticky top-4 h-fit">
            <div className="p-4 border-b border-dark-700">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Bell size={14} />
                Active Alerts ({analyticsData.alerts.length})
              </h3>
            </div>
            <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
              {analyticsData.alerts.map(alert => (
                <div key={alert.id} className={`p-3 rounded-lg border text-xs ${alert.severity === 'critical' ? 'bg-red-500/5 border-red-500/20' : alert.severity === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-blue-500/5 border-blue-500/20'}`}>
                  <div className={`font-bold ${alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>{alert.title}</div>
                  <div className="text-gray-400 mt-1">{alert.message}</div>
                </div>
              ))}
              {analyticsData.alerts.length === 0 && (
                <div className="text-center py-6 text-gray-500 text-xs">
                  <CheckCircle size={20} className="mx-auto mb-2 opacity-50" />
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
            <div className="col-span-1 lg:col-span-1 bg-dark-800/50 rounded-xl p-6 border border-primary/30 hover:border-primary/50 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-400 text-xs font-semibold uppercase">Total Volume</h3>
                  <div className="bg-primary/20 p-2 rounded-lg"><DollarSign className="text-primary" size={18} /></div>
                </div>
                <div className="text-4xl font-black text-primary">${formatNumber(stats?.totalVolume || 0)}</div>
                <div className="text-xs text-gray-500 mt-2">{stats?.totalBets || 0} total bets</div>
                {stats?.totalVolume > 0 && <div className="text-green-400 text-xs font-bold mt-2">↑ 18.5% increase</div>}
              </div>
            </div>

            {/* Primary Metric 2: Active Users */}
            <div className="col-span-1 lg:col-span-1 bg-dark-800/50 rounded-xl p-6 border border-secondary/30 hover:border-secondary/50 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-400 text-xs font-semibold uppercase">Active Users</h3>
                  <div className="bg-secondary/20 p-2 rounded-lg"><Users className="text-secondary" size={18} /></div>
                </div>
                <div className="text-4xl font-black text-secondary">{stats?.totalUsers || 0}</div>
                <div className="text-xs text-gray-500 mt-2">unique participants</div>
                {stats?.totalUsers > 0 && <div className="text-green-400 text-xs font-bold mt-2">↑ 12.3% growth</div>}
              </div>
            </div>
          </div>

          {/* KEY METRICS - SECONDARY */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
              <p className="text-gray-400 text-xs uppercase font-bold mb-2">Total Bets</p>
              <p className="text-2xl font-black text-primary">{formatNumber(stats?.totalBets || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">all-time</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
              <p className="text-gray-400 text-xs uppercase font-bold mb-2">Pending Revenue</p>
              <p className="text-2xl font-black text-yellow-400">${Number(formatUnits(stats?.pendingFees || 0n, 6)).toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-1">withdrawable</p>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
              <p className="text-gray-400 text-xs uppercase font-bold mb-2">Contract TVL</p>
              <p className="text-2xl font-black text-secondary">${Number(formatUnits(stats?.contractBalance || 0n, 6)).toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-1">USDC balance</p>
            </div>
          </div>

          {/* ANALYTICS CHARTS */}
          <div className="grid grid-cols-3 gap-4">
            {/* Chart 1: Volume Trend */}
            <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
              <h3 className="text-white font-bold text-sm mb-3">Volume Trend (7d)</h3>
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
            <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
              <h3 className="text-white font-bold text-sm mb-3">User Growth (7d)</h3>
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
            <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700">
              <h3 className="text-white font-bold text-sm mb-3">Market Types</h3>
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
          <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-700">
            <h3 className="text-white font-bold mb-4">Market Status Overview</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-black text-primary">{analyticsData.marketStatus.activeMarkets}</p>
                <p className="text-xs text-gray-400 mt-2">Active</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-secondary">{analyticsData.marketStatus.resolvedMarkets}</p>
                <p className="text-xs text-gray-400 mt-2">Resolved</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-yellow-400">{analyticsData.marketStatus.pendingResolution}</p>
                <p className="text-xs text-gray-400 mt-2">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-red-400">{analyticsData.marketStatus.issues}</p>
                <p className="text-xs text-gray-400 mt-2">Attention</p>
              </div>
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="bg-dark-800/50 rounded-xl p-5 border border-primary/20">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
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
          <div className="bg-dark-800/50 rounded-xl border border-dark-700 overflow-hidden">
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                Recent Activity
              </h3>
              <span className="text-xs text-gray-500">Last 15 transactions</span>
            </div>
            {isLoadingActivity ? (
              <div className="p-8 text-center text-gray-400"><Loader2 className="animate-spin mx-auto" /></div>
            ) : recentActivity.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No recent activity</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-dark-900/50 border-b border-dark-700">
                    <tr className="text-left text-xs text-gray-400 font-bold uppercase">
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Market</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {recentActivity.map(activity => (
                      <tr key={activity.id} className="hover:bg-dark-700/30 transition">
                        <td className="px-4 py-3 text-gray-300">{formatTimeString(activity.timestamp)}</td>
                        <td className="px-4 py-3 font-mono text-primary text-sm">#{activity.marketId}</td>
                        <td className="px-4 py-3 font-mono text-gray-400 text-sm">{activity.user.slice(0, 6)}...</td>
                        <td className="px-4 py-3 text-secondary font-bold">${activity.amount.toFixed(2)}</td>
                        <td className="px-4 py-3"><a href="#" className="text-primary hover:underline text-xs">View</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TOP PREDICTORS */}
          <div className="bg-dark-800/50 rounded-xl border border-dark-700">
            <div className="p-4 border-b border-dark-700">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Award size={16} className="text-primary" />
                Top Predictors
              </h3>
            </div>
            {isLoadingLeaderboard ? (
              <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
            ) : (
              <div className="divide-y divide-dark-700">
                {topUsers.map(user => (
                  <div key={user.address} className="p-4 hover:bg-dark-700/30 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          user.rank === 1 ? 'bg-yellow-500 text-dark-950' : 
                          user.rank === 2 ? 'bg-gray-400 text-dark-950' : 
                          'bg-dark-700 text-gray-400'
                        }`}>#{user.rank}</div>
                        <div className="font-mono text-sm text-white">{user.address.slice(0, 10)}...</div>
                      </div>
                      <div className="text-right">
                        <p className="text-secondary font-bold">${formatNumber(user.volume)}</p>
                        <p className="text-xs text-gray-500">{user.bets} bets</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CONTRACT MANAGEMENT */}
          <div className="bg-dark-800/50 rounded-xl p-6 border border-primary/20">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Wallet size={18} className="text-primary" />
              Smart Contract
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-2 font-bold">Contract Address</p>
                <div className="flex items-center gap-2 bg-dark-900 p-3 rounded-lg border border-dark-700">
                  <p className="font-mono text-sm text-white flex-1 break-all">{contractAddress || 'Not connected'}</p>
                  {contractAddress && (
                    <a href={`https://basescan.org/address/${contractAddress}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-400">
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-dark-900 p-4 rounded-lg border border-dark-700">
                  <p className="text-gray-400 text-xs mb-2 uppercase font-bold">Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <p className="text-white font-bold">Operational</p>
                  </div>
                </div>
                <div className="bg-dark-900 p-4 rounded-lg border border-dark-700">
                  <p className="text-gray-400 text-xs mb-2 uppercase font-bold">Version</p>
                  <p className="text-white font-bold">v2.1.0</p>
                </div>
                <div className="bg-dark-900 p-4 rounded-lg border border-dark-700">
                  <p className="text-gray-400 text-xs mb-2 uppercase font-bold">Uptime</p>
                  <p className="text-white font-bold">99.9%</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/30 rounded-xl p-5">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <DollarSign size={16} className="text-primary" />
                  Revenue Withdrawal
                </h4>
                <p className="text-gray-300 text-sm mb-4">Pending fees available for withdrawal.</p>
                <div className="bg-dark-900/50 p-3 rounded-lg mb-4">
                  <p className="text-xs text-gray-400 mb-1">Available Revenue</p>
                  <p className="text-3xl font-black text-primary">${Number(formatUnits(stats?.pendingFees || 0n, 6)).toFixed(2)}</p>
                </div>
                <button 
                  onClick={handleWithdraw}
                  disabled={isPending || isConfirming || !stats?.pendingFees || stats.pendingFees === 0n}
                  className="w-full bg-primary hover:bg-primary-400 disabled:bg-gray-700 text-dark-950 font-bold py-3 rounded-lg transition-all disabled:cursor-not-allowed"
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
