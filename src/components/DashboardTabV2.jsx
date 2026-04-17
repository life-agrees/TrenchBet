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
import { generateMarketTitle } from '../utils/marketDisplay';

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
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Cache for block timestamps to avoid redundant RPC calls
  const blockCache = useRef({});

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

  // Derive Top Predictors from logs
  const topUsers = useMemo(() => {
    const logs = stats?.rawLogs || [];
    const userStats = {};
    
    logs.forEach((log) => {
      const addr = log.args?.user?.toLowerCase();
      if (!addr) return;
      
      if (!userStats[addr]) {
        userStats[addr] = { address: log.args.user, bets: 0, volume: 0 };
      }
      userStats[addr].bets += 1;
      userStats[addr].volume += Number(formatUnits(log.args.amount || 0n, 6));
    });

    return Object.values(userStats)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5)
      .map((user, idx) => ({ ...user, rank: idx + 1 }));
  }, [stats?.rawLogs]);

  // Process recent activity from logs (Fetch timestamps for only the last 15)
  useEffect(() => {
    const processActivity = async () => {
      const logs = stats?.rawLogs || [];
      if (logs.length === 0 || !publicClient) return;

      setIsLoadingActivity(true);
      try {
        // Take last 15 transactions
        const recentLogs = [...logs].reverse().slice(0, 15);
        
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

            const marketId = Number(log.args.marketId);
            const marketData = markets.find(m => Number(m.id) === marketId);

            return {
              id: log.transactionHash,
              type: 'bet',
              marketId,
              marketQuestion: marketData ? generateMarketTitle(marketData) : `Market #${marketId}`,
              asset: marketData?.asset || 'Unknown',
              user: log.args.user || 'Unknown',
              amount: Number(formatUnits(log.args.amount || 0n, 6)),
              choice: Number(log.args.choice),
              timestamp,
              txHash: log.transactionHash
            };
          } catch (error) {
            console.warn('Failed to process activity log:', error);
            return null;
          }
        }));

        setRecentActivity(activities.filter(Boolean));
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to process recent activity:', error);
      } finally {
        setIsLoadingActivity(false);
      }
    };

    processActivity();
  }, [stats?.rawLogs, markets, publicClient]);

  // Helper: Format number
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(2);
  };

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
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-black tracking-widest">Growth Trend</p>
            <p className="text-3xl font-black text-neutral-900 dark:text-primary mt-2">{analyticsData.metrics.periodChange}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 font-bold">vs previous window</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-black tracking-widest">Avg Bet Size</p>
            <p className="text-3xl font-black text-neutral-900 dark:text-secondary mt-2">${analyticsData.metrics.avgBetSize}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 font-bold">platform average</p>
          </div>
          <div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-black tracking-widest">Success Rate</p>
            <p className="text-3xl font-black text-green-600 dark:text-success mt-2">{analyticsData.metrics.successRate}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1 font-bold">prediction accuracy</p>
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

      {/* ALERTS SIDEBAR & MAIN CONTENT */}
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
            <div className="col-span-1 bg-white dark:bg-dark-800/50 rounded-xl p-6 border border-primary/30 hover:border-primary/50 transition-all group relative overflow-hidden shadow-sm dark:shadow-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-neutral-500 dark:text-neutral-400 text-[10px] font-black uppercase tracking-widest">Total Volume</h3>
                  <div className="bg-primary/20 p-2 rounded-lg shadow-inner"><DollarSign className="text-neutral-900 dark:text-primary" size={18} /></div>
                </div>
                <div className="text-4xl font-black text-neutral-900 dark:text-primary tracking-tight">${formatNumber(stats?.totalVolume || 0)}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 font-bold">{stats?.totalBets || 0} total bets</div>
              </div>
            </div>

            <div className="col-span-1 bg-white dark:bg-dark-800/50 rounded-xl p-6 border border-secondary/30 hover:border-secondary/50 transition-all group relative overflow-hidden shadow-sm dark:shadow-none">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-neutral-500 dark:text-neutral-400 text-[10px] font-black uppercase tracking-widest">Active Users</h3>
                  <div className="bg-secondary/20 p-2 rounded-lg shadow-inner"><Users className="text-neutral-900 dark:text-secondary" size={18} /></div>
                </div>
                <div className="text-4xl font-black text-neutral-900 dark:text-secondary tracking-tight">{stats?.totalUsers || 0}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 font-bold">unique participants</div>
              </div>
            </div>
          </div>

          {/* ANALYTICS CHARTS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700">
              <h3 className="text-neutral-900 dark:text-white font-bold text-sm mb-3">Volume Trend</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={analyticsData.volumeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="volume" stroke="#c0ff00" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700">
              <h3 className="text-neutral-900 dark:text-white font-bold text-sm mb-3">User Growth</h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={analyticsData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="users" fill="#00FF88" stroke="#00FF88" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-4 border border-neutral-200 dark:border-dark-700">
              <h3 className="text-neutral-900 dark:text-white font-bold text-sm mb-3">Market Distribution</h3>
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

          {/* MARKET STATUS & QUICK ACTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-white dark:bg-dark-800/50 rounded-xl p-6 border border-neutral-200 dark:border-dark-700 shadow-sm flex flex-col justify-center">
              <h3 className="text-neutral-900 dark:text-white font-black text-[10px] mb-4 uppercase tracking-widest text-center">Market Pulse</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-2xl font-black text-primary">{analyticsData.marketStatus.activeMarkets}</p>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-secondary">{analyticsData.marketStatus.resolvedMarkets}</p>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Resolved</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-yellow-500">{analyticsData.marketStatus.pendingResolution}</p>
                  <p className="text-[10px] text-neutral-500 uppercase font-bold">Pending</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-5 border border-primary/20">
              <h3 className="text-neutral-900 dark:text-white font-bold mb-4 flex items-center gap-2 text-sm">
                <Zap size={16} className="text-primary" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => onNavigate?.('create')} className="bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary p-3 rounded-lg font-bold text-xs transition-all hover:scale-[1.02]">
                  ➕ Create Market
                </button>
                <button 
                  onClick={handleWithdraw} 
                  disabled={isPending || isConfirming || !stats?.pendingFees || stats.pendingFees === 0n} 
                  className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 p-3 rounded-lg font-bold text-xs transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  💰 Withdraw Revenue
                </button>
              </div>
            </div>
          </div>

          {/* RECENT ACTIVITY TABLE */}
          <div className="bg-white dark:bg-dark-800/50 rounded-xl border border-neutral-200 dark:border-dark-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-neutral-200 dark:border-dark-700 flex items-center justify-between">
              <h3 className="text-neutral-900 dark:text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                Live On-Chain Activity
              </h3>
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">REAL-TIME LOGS</span>
            </div>
            {isLoadingActivity ? (
              <div className="p-12 text-center text-neutral-500"><Loader2 className="animate-spin mx-auto mb-4" />Processing logs...</div>
            ) : recentActivity.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 font-bold text-sm">No recent transactions found in scanned blocks</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-dark-900/50 border-b border-neutral-200 dark:border-dark-700 text-left">
                    <tr className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Market</th>
                      <th className="px-5 py-4">Predictor</th>
                      <th className="px-5 py-4 text-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-dark-700">
                    {recentActivity.map(activity => (
                      <tr key={activity.id} className="hover:bg-neutral-50 dark:hover:bg-dark-700/30 transition group">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] text-neutral-500 font-bold uppercase">{formatTimeString(activity.timestamp)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="text-neutral-900 dark:text-primary font-bold line-clamp-1">{activity.marketQuestion}</span>
                            <span className="text-[10px] text-neutral-500 uppercase font-black">{activity.asset} • Market #{activity.marketId}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-neutral-500 font-bold text-xs underline decoration-primary/30 underline-offset-4">
                          <a href={`https://sepolia.basescan.org/address/${activity.user}`} target="_blank" rel="noopener noreferrer">{activity.user.slice(0, 12)}...</a>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-secondary font-black tracking-tight">${activity.amount.toFixed(2)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TOP PREDICTORS & CONTRACT INFO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-dark-800/50 rounded-xl border border-neutral-200 dark:border-dark-700">
              <div className="p-4 border-b border-neutral-200 dark:border-dark-700">
                <h3 className="text-neutral-900 dark:text-white font-bold flex items-center gap-2 text-sm uppercase tracking-widest">
                  <Award size={16} className="text-primary" />
                  Whale Watch
                </h3>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-dark-700">
                {topUsers.map(user => (
                  <div key={user.address} className="p-4 hover:bg-neutral-50 dark:hover:bg-dark-700/30 transition flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-sm ${
                        user.rank === 1 ? 'bg-yellow-400 text-neutral-900' : 
                        user.rank === 2 ? 'bg-neutral-300 text-neutral-900' : 
                        'bg-neutral-100 dark:bg-dark-700 text-neutral-500'
                      }`}>#{user.rank}</div>
                      <div className="font-mono text-xs text-neutral-900 dark:text-white font-bold">{user.address.slice(0, 14)}...</div>
                    </div>
                    <div className="text-right">
                      <p className="text-secondary font-black text-sm tracking-tight">${formatNumber(user.volume)}</p>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase">{user.bets} bets</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-dark-800/50 rounded-xl p-6 border border-neutral-200 dark:border-dark-700">
              <h3 className="text-neutral-900 dark:text-white font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
                <Wallet size={16} className="text-primary" />
                Contract Intel
              </h3>
              <div className="space-y-4">
                <div className="bg-neutral-50 dark:bg-dark-900 p-3 rounded-lg border border-neutral-200 dark:border-dark-700">
                  <p className="text-neutral-500 text-[9px] uppercase font-black mb-1">Contract Address</p>
                  <p className="font-mono text-xs text-neutral-900 dark:text-white break-all font-bold">{contractAddress || '---'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-50 dark:bg-dark-900 p-3 rounded-lg border border-neutral-200 dark:border-dark-700 text-center">
                    <p className="text-neutral-500 text-[9px] uppercase font-black">TVL (USDC)</p>
                    <p className="text-neutral-900 dark:text-white font-black text-lg">${Number(formatUnits(stats?.contractBalance || 0n, 6)).toFixed(0)}</p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-dark-900 p-3 rounded-lg border border-neutral-200 dark:border-dark-700 text-center">
                    <p className="text-neutral-500 text-[9px] uppercase font-black">System Fee</p>
                    <p className="text-neutral-900 dark:text-white font-black text-lg">2%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
