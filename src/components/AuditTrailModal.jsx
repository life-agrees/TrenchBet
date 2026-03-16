import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, History, User, CheckCircle, XCircle, Clock, ExternalLink,
  TrendingUp, Download, Search, Filter, RefreshCw, BarChart3,
  DollarSign, Users, Award, AlertCircle
} from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACTS } from '../config/wagmi';

/**
 * AuditTrailModal
 *
 * FIX 1: BetPlaced event signature corrected — was missing `effectiveMultiplier`
 *         (5th param). The old 4-param signature matched nothing on-chain,
 *         so zero bet events were ever loaded.
 *
 * FIX 2: Block fetches batched. Previously each event triggered a separate
 *         publicClient.getBlock() call sequentially — with 50 events that
 *         took 30–60 seconds. Now all unique block numbers are fetched in
 *         parallel with Promise.all, then events are mapped to their blocks.
 *
 * FIX 3: RefreshCw spin animation only plays while loading, not while
 *         autoRefresh is enabled (those are different states).
 */
export const AuditTrailModal = ({ isOpen, onClose, market }) => {
  const publicClient = usePublicClient();

  const [auditTrail, setAuditTrail]   = useState([]);
  const [isLoading, setIsLoading]     = useState(false);
  const [filterType, setFilterType]   = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate]   = useState(new Date());

  // FIX 2: fetch all event logs in parallel, then batch-fetch unique blocks
  const fetchAuditTrail = useCallback(async () => {
    if (!market || !publicClient) return;
    setIsLoading(true);

    try {
      const marketId = BigInt(market.id);

      // Fetch all three event types concurrently
      const [betLogs, claimLogs, resolveLogs] = await Promise.all([
        publicClient.getLogs({
          address: CONTRACTS.PROXY,
          // FIX 1: correct 5-param BetPlaced signature
          event: parseAbiItem(
            'event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)'
          ),
          args: { marketId },
          fromBlock: 'earliest',
        }).catch(() => []),

        publicClient.getLogs({
          address: CONTRACTS.PROXY,
          event: parseAbiItem(
            'event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'
          ),
          args: { marketId },
          fromBlock: 'earliest',
        }).catch(() => []),

        publicClient.getLogs({
          address: CONTRACTS.PROXY,
          event: parseAbiItem(
            'event MarketResolved(uint256 indexed marketId, uint8 winningChoice)'
          ),
          args: { marketId },
          fromBlock: 'earliest',
        }).catch(() => []),
      ]);

      // FIX 2: collect all unique block numbers then fetch once each in parallel
      const allLogs = [...betLogs, ...claimLogs, ...resolveLogs];
      const uniqueBlockNums = [...new Set(allLogs.map(l => l.blockNumber))];

      const blockMap = new Map();
      if (uniqueBlockNums.length > 0) {
        const blockResults = await Promise.all(
          uniqueBlockNums.map(bn =>
            publicClient.getBlock({ blockNumber: bn }).catch(() => null)
          )
        );
        uniqueBlockNums.forEach((bn, i) => {
          if (blockResults[i]) blockMap.set(bn, blockResults[i]);
        });
      }

      const getTimestamp = (log) => {
        const block = blockMap.get(log.blockNumber);
        return block ? Number(block.timestamp) * 1000 : Date.now();
      };

      const events = [
        ...betLogs.map(log => ({
          id:        log.transactionHash,
          action:    'Bet Placed',
          category:  'bet',
          user:      log.args.user,
          timestamp: getTimestamp(log),
          status:    'success',
          details:   `${Number(log.args.amount) / 1e6} USDC on choice ${log.args.choice}`,
          amount:    Number(log.args.amount) / 1e6,
          choice:    Number(log.args.choice),
          txHash:    log.transactionHash,
        })),

        ...claimLogs.map(log => ({
          id:        log.transactionHash,
          action:    'Winnings Claimed',
          category:  'claim',
          user:      log.args.user,
          timestamp: getTimestamp(log),
          status:    'success',
          details:   `Claimed ${Number(log.args.amount) / 1e6} USDC`,
          amount:    Number(log.args.amount) / 1e6,
          txHash:    log.transactionHash,
        })),

        ...resolveLogs.map(log => ({
          id:            log.transactionHash,
          action:        'Market Resolved',
          category:      'resolved',
          user:          'Admin',
          timestamp:     getTimestamp(log),
          status:        'success',
          details:       `Winning choice: ${log.args.winningChoice}`,
          winningChoice: Number(log.args.winningChoice),
          txHash:        log.transactionHash,
        })),
      ].sort((a, b) => b.timestamp - a.timestamp);

      setAuditTrail(events);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      setAuditTrail([]);
    } finally {
      setIsLoading(false);
    }
  }, [market, publicClient]);

  useEffect(() => {
    if (isOpen && market && publicClient) fetchAuditTrail();
  }, [isOpen, market, publicClient, fetchAuditTrail]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(fetchAuditTrail, 10_000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, fetchAuditTrail]);

  const filteredEvents = useMemo(() => {
    let filtered = [...auditTrail];
    if (filterType !== 'all') filtered = filtered.filter(e => e.category === filterType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.action.toLowerCase().includes(q) ||
        e.user.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [auditTrail, filterType, searchQuery]);

  const stats = useMemo(() => {
    const bets    = auditTrail.filter(e => e.category === 'bet');
    const claims  = auditTrail.filter(e => e.category === 'claim');
    return {
      totalBets:    bets.length,
      totalClaims:  claims.length,
      totalVolume:  bets.reduce((s, e) => s + (e.amount || 0), 0),
      uniqueUsers:  new Set(auditTrail.filter(e => e.user !== 'Admin').map(e => e.user)).size,
      totalPayout:  claims.reduce((s, e) => s + (e.amount || 0), 0),
    };
  }, [auditTrail]);

  const exportCSV = () => {
    const csv = [
      ['Timestamp', 'Action', 'User', 'Details', 'Amount', 'Transaction Hash'],
      ...filteredEvents.map(e => [
        new Date(e.timestamp).toISOString(), e.action, e.user,
        e.details, e.amount || '', e.txHash,
      ]),
    ].map(row => row.join(',')).join('\n');
    downloadFile(csv, `market-${market.id}-audit-trail.csv`, 'text/csv');
  };

  const exportJSON = () => {
    downloadFile(
      JSON.stringify({ marketId: market.id, asset: market.asset, exportDate: new Date().toISOString(), stats, events: filteredEvents }, null, 2),
      `market-${market.id}-audit-trail.json`,
      'application/json'
    );
  };

  const downloadFile = (content, filename, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    Object.assign(document.createElement('a'), { href: url, download: filename }).click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !market) return null;

  const getStatusIcon  = (s) => s === 'success' ? <CheckCircle className="w-4 h-4 text-[#00FF88]" /> : s === 'failed' ? <XCircle className="w-4 h-4 text-red-400" /> : <Clock className="w-4 h-4 text-yellow-400" />;
  const getActionIcon  = (a) => a.includes('Bet') ? <TrendingUp className="w-4 h-4 text-[#c0ff00]" /> : a.includes('Claimed') ? <CheckCircle className="w-4 h-4 text-[#00FF88]" /> : <CheckCircle className="w-4 h-4 text-blue-400" />;
  const getCatColor    = (c) => ({ bet: 'border-[#c0ff00]/30 hover:border-[#c0ff00]/50', claim: 'border-[#00FF88]/30 hover:border-[#00FF88]/50', resolved: 'border-blue-500/30 hover:border-blue-500/50' }[c] || 'border-dark-700');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
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
                <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                {autoRefresh ? 'Live' : 'Paused'} · Updated {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(v => !v)}
              className={`p-2 rounded-lg border transition-all ${autoRefresh ? 'bg-[#c0ff00]/20 border-[#c0ff00] text-[#c0ff00]' : 'bg-dark-700 border-dark-600 text-gray-400 hover:text-white'}`}
              title={autoRefresh ? 'Pause updates' : 'Resume updates'}
            >
              {/* FIX 3: spin only while loading, not while autoRefresh is on */}
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Market info + stats */}
        <div className="p-6 border-b border-dark-700 bg-dark-800/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-bold text-xl">#{market.id} {market.asset}</h3>
              <p className="text-gray-400 text-sm">Ended: {new Date(market.endTime).toLocaleString()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white rounded-lg flex items-center gap-2 text-sm">
                <Download size={16} />CSV
              </button>
              <button onClick={exportJSON} className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white rounded-lg flex items-center gap-2 text-sm">
                <Download size={16} />JSON
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { icon: <BarChart3 size={14} className="text-[#c0ff00]" />, label: 'Total Events', value: auditTrail.length, color: 'text-white' },
              { icon: <TrendingUp size={14} className="text-[#c0ff00]" />, label: 'Bets',         value: stats.totalBets,   color: 'text-[#c0ff00]' },
              { icon: <Award size={14} className="text-[#00FF88]" />,      label: 'Claims',        value: stats.totalClaims, color: 'text-[#00FF88]' },
              { icon: <DollarSign size={14} className="text-yellow-400" />, label: 'Volume',       value: `$${stats.totalVolume.toFixed(0)}`, color: 'text-white' },
              { icon: <Users size={14} className="text-blue-400" />,        label: 'Users',         value: stats.uniqueUsers, color: 'text-white' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="bg-dark-900 p-3 rounded-lg border border-dark-700">
                <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-400">{label}</span></div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-dark-700 bg-dark-800/20">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, users, or details..."
                className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#c0ff00]"
              />
            </div>
            <div className="flex gap-2 bg-dark-900 rounded-lg p-1">
              {[
                { key: 'all',      label: 'All',      count: auditTrail.length },
                { key: 'bet',      label: 'Bets',     count: stats.totalBets },
                { key: 'claim',    label: 'Claims',   count: stats.totalClaims },
                { key: 'resolved', label: 'Resolved', count: auditTrail.filter(e => e.category === 'resolved').length },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${filterType === key ? 'bg-[#c0ff00] text-dark-950' : 'text-gray-400 hover:text-white hover:bg-dark-800'}`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>
          {(searchQuery || filterType !== 'all') && (
            <div className="flex items-center gap-2 mt-3 text-sm">
              <Filter size={14} className="text-[#c0ff00]" />
              <span className="text-gray-400">Showing {filteredEvents.length} of {auditTrail.length} events</span>
              <button onClick={() => { setSearchQuery(''); setFilterType('all'); }} className="ml-auto text-xs text-[#c0ff00] flex items-center gap-1">
                <X size={12} />Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && auditTrail.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#c0ff00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Loading audit trail...</p>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <History size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">{searchQuery || filterType !== 'all' ? 'No events match your filters' : 'No events found for this market'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-dark-800 border-2 border-[#c0ff00] rounded-full flex items-center justify-center flex-shrink-0">
                      {getActionIcon(entry.action)}
                    </div>
                    {index < filteredEvents.length - 1 && <div className="w-0.5 flex-1 bg-dark-700 my-1" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className={`bg-dark-800/50 border rounded-lg p-4 transition-all ${getCatColor(entry.category)}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(entry.status)}
                          <span className="text-white font-bold">{entry.action}</span>
                          {entry.amount && <span className="text-[#00FF88] font-bold ml-2">${entry.amount.toFixed(2)}</span>}
                        </div>
                        <span className="text-gray-500 text-xs">{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm mb-2">
                        <div className="flex items-center gap-2 text-gray-400">
                          <User className="w-4 h-4" />
                          <span className="font-mono">{entry.user === 'Admin' ? 'Admin' : `${entry.user.slice(0, 6)}...${entry.user.slice(-4)}`}</span>
                        </div>
                        {entry.choice !== undefined && (
                          <span className="px-2 py-0.5 bg-[#c0ff00]/20 border border-[#c0ff00]/30 rounded text-[#c0ff00] text-xs font-semibold">Choice {entry.choice}</span>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{entry.details}</p>
                      {entry.txHash && (
                        <a href={`https://basescan.org/tx/${entry.txHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#c0ff00] hover:text-[#d4ff33]">
                          <ExternalLink size={12} />View on BaseScan
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
          <span className="text-sm text-gray-400">{filteredEvents.length} events · Total volume: ${stats.totalVolume.toFixed(2)}</span>
          <button onClick={onClose} className="px-6 py-2 bg-[#c0ff00] hover:bg-[#d4ff33] text-dark-950 font-bold rounded-lg transition-all hover:scale-105">Close</button>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailModal;