import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  Wallet,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { formatUnits } from 'viem';

const DashboardTab = ({
  stats,
  isLoadingStats,
  handleWithdraw,
  contractAddress,
  isPending,
  isConfirming
}) => {
  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Stats configuration with electric lime theme
  const statsConfig = [
    {
      label: 'Total Unique Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-[#c0ff00]',
      bgColor: 'bg-[#c0ff00]/10',
      borderColor: 'border-[#c0ff00]/30'
    },
    {
      label: 'Total Volume (USDC)',
      value: stats?.totalVolume ? `$${formatNumber(stats.totalVolume)}` : '$0',
      subValue: `${stats?.totalBets || 0} total bets`,
      icon: BarChart3,
      color: 'text-[#00FF88]',
      bgColor: 'bg-[#00FF88]/10',
      borderColor: 'border-[#00FF88]/30'
    },
    {
      label: 'Total Bets Placed',
      value: formatNumber(stats?.totalBets || 0),
      subValue: 'All-time',
      icon: TrendingUp,
      color: 'text-[#c0ff00]',
      bgColor: 'bg-[#c0ff00]/10',
      borderColor: 'border-[#c0ff00]/30'
    },
    {
      label: 'Pending Revenue',
      value: stats?.pendingFees ? `$${Number(formatUnits(stats.pendingFees, 6)).toFixed(2)}` : '$0.00',
      subValue: 'Available to withdraw',
      icon: DollarSign,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30'
    }
  ];

  if (isLoadingStats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-[#c0ff00]" />
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
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-[#c0ff00]" />
        <h2 className="text-lg font-semibold text-white">Platform Analytics</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index}
              className={`bg-dark-800/50 rounded-xl p-5 border ${stat.borderColor} hover:bg-dark-800 transition-all`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{stat.label}</h3>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={stat.color} size={18} />
                </div>
              </div>
              <div className={`text-3xl font-black ${stat.color} mb-1`}>
                {stat.value}
              </div>
              {stat.subValue && (
                <div className="text-xs text-gray-500">{stat.subValue}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contract Management Section */}
      <div className="bg-dark-800/50 rounded-xl p-6 border border-[#c0ff00]/20">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
          <Wallet size={20} className="text-[#c0ff00]"/> 
          Smart Contract Management
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Contract Info */}
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
                <p className="text-xs text-gray-500 mt-1">Mainnet</p>
              </div>
            </div>
          </div>

          {/* Right Column - Withdraw Section */}
          <div className="flex flex-col justify-center lg:border-l lg:border-dark-700 lg:pl-6">
            <div className="bg-gradient-to-br from-[#c0ff00]/10 to-[#00FF88]/10 border border-[#c0ff00]/30 rounded-xl p-5">
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
                Note: Funds transfer to connected admin wallet
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
          <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Status</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse"></div>
            <span className="text-[#00FF88] text-sm font-semibold">Operational</span>
          </div>
        </div>
        
        <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
          <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Protocol Fee</div>
          <div className="text-white text-lg font-bold">2%</div>
        </div>
        
        <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
          <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Version</div>
          <div className="text-white text-lg font-bold">v2.1.0</div>
        </div>
        
        <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
          <div className="text-gray-400 text-xs mb-1 uppercase tracking-wide">Updated</div>
          <div className="text-white text-sm font-semibold">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;