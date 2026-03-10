import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  DollarSign, 
  Activity, 
  Wallet,
  Loader2,
  ExternalLink,
  Bell,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Award,
  Plus,
  Settings as SettingsIcon,
  RefreshCw,
  Download,
  FileText,
  Calendar
} from 'lucide-react';
import { formatUnits } from 'viem';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACTS } from '../../config/wagmi';

const DashboardTab = ({
  stats,
  isLoadingStats,
  handleWithdraw,
  contractAddress,
  isPending,
  isConfirming,
  onNavigate // NEW: callback to switch tabs
}) => {
  const publicClient = usePublicClient();
  
  // State for enhancements
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Calculate trends (mock data - in production, compare with previous period)
  const calculateTrend = (current, previous = 0) => {
    if (!previous || previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      isPositive: change >= 0
    };
  };

  // Mock previous stats (in production, fetch from API/contract)
  const previousStats = useMemo(() => ({
    totalUsers: Math.max(0, (stats?.totalUsers || 0) - Math.floor(Math.random() * 5)),
    totalVolume: Math.max(0, (stats?.totalVolume || 0) - Math.floor(Math.random() * 1000)),
    totalBets: Math.max(0, (stats?.totalBets || 0) - Math.floor(Math.random() * 10)),
    pendingFees: (stats?.pendingFees || 0n) > BigInt(Math.floor(Math.random() * 100) * 1e6) 
      ? (stats?.pendingFees || 0n) - BigInt(Math.floor(Math.random() * 100) * 1e6)
      : 0n
  }), [stats]);


  // Helper to get safe block range (RPC limit is 10,000 blocks)
  const getSafeBlockRange = async () => {
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > BigInt(5000) ? currentBlock - BigInt(5000) : BigInt(0);
      return { fromBlock, toBlock: 'latest' };
    } catch (err) {
      // Fallback to recent blocks if we can't get current block
      return { fromBlock: BigInt(-5000), toBlock: 'latest' };
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    if (!publicClient) return;
    
    setIsLoadingActivity(true);
    try {
      const { fromBlock, toBlock } = await getSafeBlockRange();
      const logs = await publicClient.getLogs({
        address: CONTRACTS.PREDICTION_MARKET,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
        fromBlock,
        toBlock
      });


      const recentLogs = logs.slice(-10).reverse(); // Last 10 bets
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
          console.warn('Failed to fetch block for log:', error);
        }
      }

      setRecentActivity(activities);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  // Fetch top users (leaderboard)
  const fetchTopUsers = async () => {
    if (!publicClient) return;
    
    setIsLoadingLeaderboard(true);
    try {
      const { fromBlock, toBlock } = await getSafeBlockRange();
      const logs = await publicClient.getLogs({
        address: CONTRACTS.PREDICTION_MARKET,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
        fromBlock,
        toBlock
      });


      // Aggregate by user
      const userTotals = {};
      logs.forEach(log => {
        const user = log.args.user.toLowerCase();
        const amount = Number(log.args.amount) / 1e6;
        userTotals[user] = (userTotals[user] || 0) + amount;
      });

      // Sort and get top 5
      const sorted = Object.entries(userTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([address, volume], index) => ({
          rank: index + 1,
          address,
          volume,
          bets: logs.filter(l => l.args.user.toLowerCase() === address).length
        }));

      setTopUsers(sorted);
    } catch (error) {
      console.error('Failed to fetch top users:', error);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  // Generate notifications
  const generateNotifications = () => {
    const notifs = [];
    
    // Low balance warning
    if (stats?.contractBalance && Number(formatUnits(stats.contractBalance, 6)) < 1000) {
      notifs.push({
        id: 'low-balance',
        type: 'warning',
        title: 'Low Contract Balance',
        message: 'Contract USDC balance is below 1,000. Consider adding liquidity.',
        timestamp: Date.now()
      });
    }

    // Pending fees notification
    if (stats?.pendingFees && Number(formatUnits(stats.pendingFees, 6)) > 100) {
      notifs.push({
        id: 'pending-fees',
        type: 'info',
        title: 'Fees Available',
        message: `$${Number(formatUnits(stats.pendingFees, 6)).toFixed(2)} in fees ready to withdraw.`,
        timestamp: Date.now()
      });
    }

    // High activity notification
    if (stats?.totalBets && stats.totalBets > 100) {
      notifs.push({
        id: 'high-activity',
        type: 'success',
        title: 'High Activity',
        message: `Platform is thriving with ${stats.totalBets} total bets!`,
        timestamp: Date.now()
      });
    }

    setNotifications(notifs);
  };

  // Export report
  const exportReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      stats: {
        totalUsers: stats?.totalUsers || 0,
        totalVolume: stats?.totalVolume || 0,
        totalBets: stats?.totalBets || 0,
        pendingFees: stats?.pendingFees ? Number(formatUnits(stats.pendingFees, 6)) : 0,
        contractBalance: stats?.contractBalance ? Number(formatUnits(stats.contractBalance, 6)) : 0
      },
      topUsers: topUsers,
      recentActivity: recentActivity.slice(0, 20)
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trenchybet-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Initial data fetch
  useEffect(() => {
    if (publicClient) {
      fetchRecentActivity();
      fetchTopUsers();
      generateNotifications();
    }
  }, [publicClient, stats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRecentActivity();
      generateNotifications();
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, publicClient]);

  // Stats configuration with trends
  const statsConfig = useMemo(() => {
    const userTrend = calculateTrend(stats?.totalUsers || 0, previousStats.totalUsers);
    const volumeTrend = calculateTrend(stats?.totalVolume || 0, previousStats.totalVolume);
    const betsTrend = calculateTrend(stats?.totalBets || 0, previousStats.totalBets);
    const feesTrend = calculateTrend(
      Number(formatUnits(stats?.pendingFees || 0n, 6)),
      Number(formatUnits(previousStats.pendingFees, 6))
    );

    return [
      {
        label: 'Total Unique Users',
        value: stats?.totalUsers || 0,
        trend: userTrend,
        icon: Users,
        color: 'text-[#c0ff00]',
        bgColor: 'bg-[#c0ff00]/10',
        borderColor: 'border-[#c0ff00]/30'
      },
      {
        label: 'Total Volume (USDC)',
        value: stats?.totalVolume ? `$${formatNumber(stats.totalVolume)}` : '$0',
        subValue: `${stats?.totalBets || 0} total bets`,
        trend: volumeTrend,
        icon: BarChart3,
        color: 'text-[#00FF88]',
        bgColor: 'bg-[#00FF88]/10',
        borderColor: 'border-[#00FF88]/30'
      },
      {
        label: 'Total Bets Placed',
        value: formatNumber(stats?.totalBets || 0),
        subValue: 'All-time',
        trend: betsTrend,
        icon: TrendingUp,
        color: 'text-[#c0ff00]',
        bgColor: 'bg-[#c0ff00]/10',
        borderColor: 'border-[#c0ff00]/30'
      },
      {
        label: 'Pending Revenue',
        value: stats?.pendingFees ? `$${Number(formatUnits(stats.pendingFees, 6)).toFixed(2)}` : '$0.00',
        subValue: 'Available to withdraw',
        trend: feesTrend,
        icon: DollarSign,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30'
      }
    ];
  }, [stats, previousStats]);

  if (isLoadingStats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-[#c0ff00] animate-pulse" />
          <h2 className="text-lg font-semibold text-white">Dashboard Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      {/* Header with Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#c0ff00]/20 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-[#c0ff00]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Platform Analytics</h2>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
              {autoRefresh ? 'Live' : 'Paused'} • Last updated {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`p-2 rounded-lg border transition-all ${
              autoRefresh 
                ? 'bg-[#c0ff00]/20 border-[#c0ff00] text-[#c0ff00]' 
                : 'bg-dark-700 border-dark-600 text-gray-400 hover:text-white'
            }`}
            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportReport}
            className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white rounded-lg flex items-center gap-2 transition-all"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                notif.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                notif.type === 'info' ? 'bg-blue-500/10 border-blue-500/30' :
                'bg-green-500/10 border-green-500/30'
              }`}
            >
              <div className={`p-2 rounded-lg ${
                notif.type === 'warning' ? 'bg-yellow-500/20' :
                notif.type === 'info' ? 'bg-blue-500/20' :
                'bg-green-500/20'
              }`}>
                {notif.type === 'warning' ? <AlertCircle className="w-4 h-4 text-yellow-400" /> :
                 notif.type === 'info' ? <Bell className="w-4 h-4 text-blue-400" /> :
                 <CheckCircle className="w-4 h-4 text-green-400" />}
              </div>
              <div className="flex-1">
                <h4 className={`font-semibold ${
                  notif.type === 'warning' ? 'text-yellow-400' :
                  notif.type === 'info' ? 'text-blue-400' :
                  'text-green-400'
                }`}>
                  {notif.title}
                </h4>
                <p className="text-gray-300 text-sm">{notif.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend?.isPositive ? TrendingUp : TrendingDown;
          
          return (
            <div 
              key={index}
              className={`bg-dark-800/50 rounded-xl p-5 border ${stat.borderColor} hover:bg-dark-800 transition-all relative overflow-hidden group`}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{stat.label}</h3>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={stat.color} size={18} />
                  </div>
                </div>
                
                <div className="flex items-end justify-between">
                  <div className={`text-3xl font-black ${stat.color}`}>
                    {stat.value}
                  </div>
                  {stat.trend && stat.trend.value > 0 && (
                    <div className={`flex items-center gap-1 ${stat.trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      <TrendIcon size={16} />
                      <span className="text-sm font-bold">{stat.trend.value}%</span>
                    </div>
                  )}
                </div>
                
                {stat.subValue && (
                  <div className="text-xs text-gray-500 mt-1">{stat.subValue}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-dark-800/50 rounded-xl p-5 border border-[#c0ff00]/20">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Zap size={18} className="text-[#c0ff00]" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate && onNavigate('create')}
            className="bg-[#c0ff00]/10 hover:bg-[#c0ff00]/20 border border-[#c0ff00]/30 hover:border-[#c0ff00] text-[#c0ff00] p-4 rounded-lg flex flex-col items-center gap-2 transition-all hover:scale-105"
          >
            <Plus size={24} />
            <span className="text-sm font-semibold">Create Market</span>
          </button>
          <button
            onClick={() => onNavigate && onNavigate('manage')}
            className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500 text-blue-400 p-4 rounded-lg flex flex-col items-center gap-2 transition-all hover:scale-105"
          >
            <SettingsIcon size={24} />
            <span className="text-sm font-semibold">Manage Markets</span>
          </button>
          <button
            onClick={handleWithdraw}
            disabled={!stats?.pendingFees || stats.pendingFees === 0n}
            className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500 text-yellow-400 p-4 rounded-lg flex flex-col items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wallet size={24} />
            <span className="text-sm font-semibold">Withdraw Fees</span>
          </button>
          <button
            onClick={exportReport}
            className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500 text-purple-400 p-4 rounded-lg flex flex-col items-center gap-2 transition-all hover:scale-105"
          >
            <FileText size={24} />
            <span className="text-sm font-semibold">Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity + Top Users */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <div className="bg-dark-800/50 rounded-xl border border-dark-700">
            <div className="p-5 border-b border-dark-700 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Clock size={18} className="text-[#c0ff00]" />
                Recent Activity
              </h3>
              <span className="text-xs text-gray-500">Last 10 bets</span>
            </div>
            
            <div className="p-5">
              {isLoadingActivity ? (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-[#c0ff00] mb-2" size={24} />
                  <p className="text-gray-400 text-sm">Loading activity...</p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Activity size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map(activity => (
                    <div 
                      key={activity.id}
                      className="bg-dark-900/50 p-3 rounded-lg border border-dark-700 hover:border-[#c0ff00]/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#c0ff00]/20 rounded-full flex items-center justify-center">
                            <TrendingUp size={12} className="text-[#c0ff00]" />
                          </div>
                          <span className="text-white font-semibold text-sm">
                            Market #{activity.marketId}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-400 text-xs font-mono">
                          {activity.user.slice(0, 6)}...{activity.user.slice(-4)}
                        </div>
                        <div className="text-[#00FF88] text-sm font-bold">
                          ${activity.amount.toFixed(2)} USDC
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contract Management */}
          <div className="bg-dark-800/50 rounded-xl p-6 border border-[#c0ff00]/20">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <Wallet size={20} className="text-[#c0ff00]"/> 
              Smart Contract
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm mb-2 font-semibold">Contract Address</p>
                <div className="flex items-center gap-2 bg-dark-900 p-3 rounded-lg border border-dark-700">
                  <p className="font-mono text-sm text-white flex-1 break-all">
                    {contractAddress || 'Not connected'}
                  </p>
                  {contractAddress && (
                    <a
                      href={`https://basescan.org/address/${contractAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-[#c0ff00]/10 rounded transition-colors"
                      title="View on BaseScan"
                    >
                      <ExternalLink size={16} className="text-[#c0ff00]" />
                    </a>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark-900 p-4 rounded-lg border border-dark-700">
                  <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Contract TVL</p>
                  <p className="text-2xl font-bold text-[#00FF88]">
                    {stats?.contractBalance 
                      ? `$${Number(formatUnits(stats.contractBalance, 6)).toLocaleString()}`
                      : '$0.00'
                    }
                  </p>
                  <p className="text-xs text-gray-500 mt-1">USDC Balance</p>
                </div>

                <div className="bg-dark-900 p-4 rounded-lg border border-dark-700">
                  <p className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Network</p>
                  <p className="text-lg font-bold text-white">Base</p>
                  <p className="text-xs text-gray-500 mt-1">Sepolia Testnet</p>
                </div>
              </div>

              {/* Withdraw Section */}
              <div className="bg-gradient-to-br from-[#c0ff00]/10 to-[#00FF88]/10 border border-[#c0ff00]/30 rounded-xl p-5 mt-4">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <DollarSign size={18} className="text-[#c0ff00]" />
                  Revenue Withdrawal
                </h4>
                <p className="text-gray-300 text-sm mb-4">
                  Total pending fees available for withdrawal to your admin wallet.
                </p>
                
                <div className="bg-dark-900/50 p-3 rounded-lg mb-4 border border-dark-700">
                  <p className="text-xs text-gray-400 mb-1">Available Revenue</p>
                  <p className="text-3xl font-black text-[#c0ff00]">
                    {stats?.pendingFees 
                      ? `$${Number(formatUnits(stats.pendingFees, 6)).toFixed(2)}`
                      : '$0.00'
                    }
                  </p>
                </div>
                
                <button 
                  onClick={handleWithdraw}
                  disabled={isPending || isConfirming || !stats?.pendingFees || stats.pendingFees === 0n}
                  className="w-full bg-[#c0ff00] hover:bg-[#d4ff33] disabled:bg-gray-700 disabled:cursor-not-allowed text-dark-950 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:hover:scale-100"
                >
                  {isPending || isConfirming ? (
                    <>
                      <Loader2 className="animate-spin" size={20}/>
                      {isPending ? 'Confirm in Wallet...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <DollarSign size={20}/>
                      Withdraw Revenue
                    </>
                  )}
                </button>
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Funds transfer to connected admin wallet
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Top Users Leaderboard */}
        <div className="space-y-6">
          <div className="bg-dark-800/50 rounded-xl border border-dark-700">
            <div className="p-5 border-b border-dark-700">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Award size={18} className="text-[#c0ff00]" />
                Top Predictors
              </h3>
              <p className="text-xs text-gray-500 mt-1">By total volume</p>
            </div>
            
            <div className="p-5">
              {isLoadingLeaderboard ? (
                <div className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto text-[#c0ff00] mb-2" size={24} />
                  <p className="text-gray-400 text-sm">Loading leaderboard...</p>
                </div>
              ) : topUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No users yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topUsers.map(user => (
                    <div 
                      key={user.address}
                      className={`p-3 rounded-lg border transition-all ${
                        user.rank === 1 
                          ? 'bg-yellow-500/10 border-yellow-500/30' 
                          : user.rank === 2
                          ? 'bg-gray-400/10 border-gray-400/30'
                          : user.rank === 3
                          ? 'bg-orange-500/10 border-orange-500/30'
                          : 'bg-dark-900/50 border-dark-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          user.rank === 1 
                            ? 'bg-yellow-500 text-dark-950' 
                            : user.rank === 2
                            ? 'bg-gray-400 text-dark-950'
                            : user.rank === 3
                            ? 'bg-orange-500 text-dark-950'
                            : 'bg-dark-700 text-gray-400'
                        }`}>
                          #{user.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-white truncate">
                            {user.address.slice(0, 8)}...{user.address.slice(-6)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.bets} bets
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#00FF88] font-bold text-sm">
                            ${formatNumber(user.volume)}
                          </div>
                          <div className="text-xs text-gray-500">
                            volume
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-dark-800/50 rounded-xl p-5 border border-dark-700">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Target size={18} className="text-[#c0ff00]" />
              System Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse"></div>
                  <span className="text-[#00FF88] text-sm font-semibold">Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Protocol Fee</span>
                <span className="text-white text-sm font-bold">2%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Version</span>
                <span className="text-white text-sm font-bold">v2.1.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Uptime</span>
                <span className="text-white text-sm font-bold">99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;

