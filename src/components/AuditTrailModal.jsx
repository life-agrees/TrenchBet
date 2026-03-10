import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  History, 
  User, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ExternalLink, 
  TrendingUp,
  Download,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  BarChart3,
  DollarSign,
  Users,
  Award,
  AlertCircle
} from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACTS } from '../config/wagmi';

export const AuditTrailModal = ({ isOpen, onClose, market }) => {
  const publicClient = usePublicClient();
  
  // State
  const [auditTrail, setAuditTrail] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (isOpen && market && publicClient) {
      fetchAuditTrail();
    }
  }, [isOpen, market, publicClient]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!isOpen || !autoRefresh || !market || !publicClient) return;

    const interval = setInterval(() => {
      fetchAuditTrail();
      setLastUpdate(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, market, publicClient]);

  const fetchAuditTrail = async () => {
    setIsLoading(true);
    try {
      const events = [];

      // Fetch BetPlaced events
      const betLogs = await publicClient.getLogs({
        address: CONTRACTS.PROXY,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
        args: { marketId: BigInt(market.id) },
        fromBlock: 'earliest'
      });

      // Fetch WinningsClaimed events
      const claimLogs = await publicClient.getLogs({
        address: CONTRACTS.PROXY,
        event: parseAbiItem('event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'),
        args: { marketId: BigInt(market.id) },
        fromBlock: 'earliest'
      });

      // Fetch MarketResolved events
      const resolveLogs = await publicClient.getLogs({
        address: CONTRACTS.PROXY,
        event: parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice)'),
        args: { marketId: BigInt(market.id) },
        fromBlock: 'earliest'
      });

      // Process bet events
      for (const log of betLogs) {
        try {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          events.push({
            id: log.transactionHash,
            action: 'Bet Placed',
            category: 'bet',
            user: log.args.user,
            timestamp: Number(block.timestamp) * 1000,
            status: 'success',
            details: `${Number(log.args.amount) / 1e6} USDC on choice ${log.args.choice}`,
            amount: Number(log.args.amount) / 1e6,
            choice: Number(log.args.choice),
            txHash: log.transactionHash
          });
        } catch (error) {
          console.warn('Failed to fetch block for bet log:', error);
        }
      }

      // Process claim events
      for (const log of claimLogs) {
        try {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          events.push({
            id: log.transactionHash,
            action: 'Winnings Claimed',
            category: 'claim',
            user: log.args.user,
            timestamp: Number(block.timestamp) * 1000,
            status: 'success',
            details: `Claimed ${Number(log.args.amount) / 1e6} USDC`,
            amount: Number(log.args.amount) / 1e6,
            txHash: log.transactionHash
          });
        } catch (error) {
          console.warn('Failed to fetch block for claim log:', error);
        }
      }

      // Process resolution events
      for (const log of resolveLogs) {
        try {
          const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
          events.push({
            id: log.transactionHash,
            action: 'Market Resolved',
            category: 'resolved',
            user: 'Admin',
            timestamp: Number(block.timestamp) * 1000,
            status: 'success',
            details: `Winning choice: ${log.args.winningChoice}`,
            winningChoice: Number(log.args.winningChoice),
            txHash: log.transactionHash
          });
        } catch (error) {
          console.warn('Failed to fetch block for resolve log:', error);
        }
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => b.timestamp - a.timestamp);

      setAuditTrail(events);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      setAuditTrail([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search
  const filteredEvents = useMemo(() => {
    let filtered = [...auditTrail];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.category === filterType);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.action.toLowerCase().includes(query) ||
        e.user.toLowerCase().includes(query) ||
        e.details.toLowerCase().includes(query)
      );
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(e => e.timestamp >= dateRange.start.getTime());
    }
    if (dateRange.end) {
      filtered = filtered.filter(e => e.timestamp <= dateRange.end.getTime());
    }

    return filtered;
  }, [auditTrail, filterType, searchQuery, dateRange]);

  // Statistics
  const stats = useMemo(() => {
    const totalBets = auditTrail.filter(e => e.category === 'bet').length;
    const totalClaims = auditTrail.filter(e => e.category === 'claim').length;
    const totalVolume = auditTrail
      .filter(e => e.category === 'bet')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const uniqueUsers = new Set(auditTrail.filter(e => e.user !== 'Admin').map(e => e.user)).size;
    const totalPayout = auditTrail
      .filter(e => e.category === 'claim')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    return { totalBets, totalClaims, totalVolume, uniqueUsers, totalPayout };
  }, [auditTrail]);

  // Export functions
  const exportCSV = () => {
    const csv = [
      ['Timestamp', 'Action', 'User', 'Details', 'Amount', 'Transaction Hash'],
      ...filteredEvents.map(e => [
        new Date(e.timestamp).toISOString(),
        e.action,
        e.user,
        e.details,
        e.amount || '',
        e.txHash
      ])
    ].map(row => row.join(',')).join('\n');
    
    downloadFile(csv, `market-${market.id}-audit-trail.csv`, 'text/csv');
  };

  const exportJSON = () => {
    const data = {
      marketId: market.id,
      asset: market.asset,
      exportDate: new Date().toISOString(),
      stats: stats,
      events: filteredEvents
    };
    
    downloadFile(
      JSON.stringify(data, null, 2), 
      `market-${market.id}-audit-trail.json`, 
      'application/json'
    );
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !market) return null;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-[#00FF88]" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('Bet')) return <TrendingUp className="w-4 h-4 text-[#c0ff00]" />;
    if (action.includes('Claimed')) return <CheckCircle className="w-4 h-4 text-[#00FF88]" />;
    if (action.includes('Resolved')) return <CheckCircle className="w-4 h-4 text-blue-400" />;
    return <History className="w-4 h-4 text-gray-400" />;
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'bet': return 'border-[#c0ff00]/30 hover:border-[#c0ff00]/50';
      case 'claim': return 'border-[#00FF88]/30 hover:border-[#00FF88]/50';
      case 'resolved': return 'border-blue-500/30 hover:border-blue-500/50';
      default: return 'border-dark-700 hover:border-[#c0ff00]/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-dark-900 border-2 border-[#c0ff00]/50 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700 bg-dark-800/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#c0ff00]/20 rounded-lg flex items-center justify-center">
              <History className="w-6 h-6 text-[#c0ff00]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Market Audit Trail</h2>
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                {autoRefresh ? 'Live' : 'Paused'} • Updated {lastUpdate.toLocaleTimeString()}
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
              title={autoRefresh ? 'Pause updates' : 'Resume updates'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Market Info + Stats */}
        <div className="p-6 border-b border-dark-700 bg-dark-800/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-xl">#{market.id} {market.asset}</h3>
              <p className="text-gray-400 text-sm">
                Ended: {new Date(market.endTime).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white rounded-lg flex items-center gap-2 text-sm transition-all"
              >
                <Download size={16} />
                CSV
              </button>
              <button
                onClick={exportJSON}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white rounded-lg flex items-center gap-2 text-sm transition-all"
              >
                <Download size={16} />
                JSON
              </button>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={14} className="text-[#c0ff00]" />
                <span className="text-xs text-gray-400">Total Events</span>
              </div>
              <div className="text-2xl font-bold text-white">{auditTrail.length}</div>
            </div>
            <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-[#c0ff00]" />
                <span className="text-xs text-gray-400">Bets</span>
              </div>
              <div className="text-2xl font-bold text-[#c0ff00]">{stats.totalBets}</div>
            </div>
            <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
              <div className="flex items-center gap-2 mb-1">
                <Award size={14} className="text-[#00FF88]" />
                <span className="text-xs text-gray-400">Claims</span>
              </div>
              <div className="text-2xl font-bold text-[#00FF88]">{stats.totalClaims}</div>
            </div>
            <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className="text-yellow-400" />
                <span className="text-xs text-gray-400">Volume</span>
              </div>
              <div className="text-xl font-bold text-white">${stats.totalVolume.toFixed(0)}</div>
            </div>
            <div className="bg-dark-900 p-3 rounded-lg border border-dark-700">
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-blue-400" />
                <span className="text-xs text-gray-400">Users</span>
              </div>
              <div className="text-2xl font-bold text-white">{stats.uniqueUsers}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-dark-700 bg-dark-800/20">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, users, or details..."
                className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#c0ff00] transition-colors"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-dark-900 rounded-lg p-1">
              {[
                { key: 'all', label: 'All', count: auditTrail.length },
                { key: 'bet', label: 'Bets', count: stats.totalBets },
                { key: 'claim', label: 'Claims', count: stats.totalClaims },
                { key: 'resolved', label: 'Resolved', count: auditTrail.filter(e => e.category === 'resolved').length }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${
                    filterType === key
                      ? 'bg-[#c0ff00] text-dark-950'
                      : 'text-gray-400 hover:text-white hover:bg-dark-800'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Active filters indicator */}
          {(searchQuery || filterType !== 'all') && (
            <div className="flex items-center gap-2 mt-3 text-sm">
              <Filter size={14} className="text-[#c0ff00]" />
              <span className="text-gray-400">
                Showing {filteredEvents.length} of {auditTrail.length} events
              </span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                }}
                className="ml-auto text-xs text-[#c0ff00] hover:text-[#d4ff33] flex items-center gap-1"
              >
                <X size={12} />
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#c0ff00] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-400">Loading audit trail...</p>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery || filterType !== 'all' ? (
                <>
                  <AlertCircle size={48} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400">No events match your filters</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('all');
                    }}
                    className="mt-3 text-[#c0ff00] hover:text-[#d4ff33] text-sm"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <History size={48} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400">No events found for this market</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-dark-800 border-2 border-[#c0ff00] rounded-full flex items-center justify-center flex-shrink-0">
                      {getActionIcon(entry.action)}
                    </div>
                    {index < filteredEvents.length - 1 && (
                      <div className="w-0.5 h-full bg-dark-700 my-1"></div>
                    )}
                  </div>

                  {/* Event Card */}
                  <div className="flex-1 pb-3">
                    <div className={`bg-dark-800/50 border rounded-lg p-4 transition-all ${getCategoryColor(entry.category)}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(entry.status)}
                          <span className="text-white font-bold">{entry.action}</span>
                          {entry.amount && (
                            <span className="text-[#00FF88] font-bold ml-2">
                              ${entry.amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500 text-xs">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm mb-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="w-4 h-4" />
                          <span className="font-mono">
                            {entry.user === 'Admin' 
                              ? 'Admin' 
                              : `${entry.user.slice(0, 6)}...${entry.user.slice(-4)}`
                            }
                          </span>
                        </div>
                        {entry.choice !== undefined && (
                          <div className="px-2 py-0.5 bg-[#c0ff00]/20 border border-[#c0ff00]/30 rounded text-[#c0ff00] text-xs font-semibold">
                            Choice {entry.choice}
                          </div>
                        )}
                      </div>

                      <p className="text-gray-300 text-sm mb-2">{entry.details}</p>

                      {entry.txHash && (
                        <a
                          href={`https://basescan.org/tx/${entry.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#c0ff00] hover:text-[#d4ff33] transition-colors"
                        >
                          <ExternalLink size={12} />
                          View on BaseScan
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-700 bg-dark-800/50 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {filteredEvents.length} events • Total volume: ${stats.totalVolume.toFixed(2)}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#c0ff00] hover:bg-[#d4ff33] text-dark-950 font-bold rounded-lg transition-all hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailModal;