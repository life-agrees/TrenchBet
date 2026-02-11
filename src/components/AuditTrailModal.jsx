import React, { useState, useEffect } from 'react';
import { X, History, User, CheckCircle, XCircle, Clock, ExternalLink, TrendingUp } from 'lucide-react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACTS } from '../config/wagmi';

export const AuditTrailModal = ({ isOpen, onClose, market }) => {
  const publicClient = usePublicClient();
  const [auditTrail, setAuditTrail] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && market && publicClient) {
      fetchAuditTrail();
    }
  }, [isOpen, market, publicClient]);

  const fetchAuditTrail = async () => {
    setIsLoading(true);
    try {
      const events = [];

      // Fetch BetPlaced events for this market
      const betLogs = await publicClient.getLogs({
        address: CONTRACTS.PREDICTION_MARKET,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
        args: {
          marketId: BigInt(market.id)
        },
        fromBlock: 'earliest'
      });

      // Fetch WinningsClaimed events
      const claimLogs = await publicClient.getLogs({
        address: CONTRACTS.PREDICTION_MARKET,
        event: parseAbiItem('event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)'),
        args: {
          marketId: BigInt(market.id)
        },
        fromBlock: 'earliest'
      });

      // Fetch MarketResolved events
      const resolveLogs = await publicClient.getLogs({
        address: CONTRACTS.PREDICTION_MARKET,
        event: parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice, uint256 protocolFee)'),
        args: {
          marketId: BigInt(market.id)
        },
        fromBlock: 'earliest'
      });

      // Process bet events
      for (const log of betLogs) {
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
        events.push({
          id: log.transactionHash,
          action: 'Bet Placed',
          user: log.args.user,
          timestamp: Number(block.timestamp) * 1000,
          status: 'success',
          details: `${Number(log.args.amount) / 1e6} USDC on choice ${log.args.choice}`,
          txHash: log.transactionHash
        });
      }

      // Process claim events
      for (const log of claimLogs) {
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
        events.push({
          id: log.transactionHash,
          action: 'Winnings Claimed',
          user: log.args.user,
          timestamp: Number(block.timestamp) * 1000,
          status: 'success',
          details: `Claimed ${Number(log.args.amount) / 1e6} USDC`,
          txHash: log.transactionHash
        });
      }

      // Process resolution events
      for (const log of resolveLogs) {
        const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
        events.push({
          id: log.transactionHash,
          action: 'Market Resolved',
          user: 'Admin',
          timestamp: Number(block.timestamp) * 1000,
          status: 'success',
          details: `Resolved with winning choice: ${log.args.winningChoice}. Fee: ${Number(log.args.protocolFee) / 1e6} USDC`,
          txHash: log.transactionHash
        });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-dark-900 border-2 border-[#c0ff00]/50 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-700 bg-dark-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c0ff00]/20 rounded-lg flex items-center justify-center">
              <History className="w-5 h-5 text-[#c0ff00]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Market Audit Trail</h2>
              <p className="text-sm text-gray-400">On-chain transaction history</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Market Info */}
        <div className="p-5 border-b border-dark-700 bg-dark-800/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-bold text-lg">#{market.id} {market.asset}</h3>
              <p className="text-gray-400 text-sm">
                Ended: {new Date(market.endTime).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Total Events</div>
              <div className="text-2xl font-bold text-[#c0ff00]">{auditTrail.length}</div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#c0ff00] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-400">Loading audit trail...</p>
              </div>
            </div>
          ) : auditTrail.length === 0 ? (
            <div className="text-center py-12">
              <History size={48} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No events found for this market</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditTrail.map((entry, index) => (
                <div key={entry.id} className="flex gap-4">
                  {/* Timeline Line */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-dark-800 border-2 border-[#c0ff00] rounded-full flex items-center justify-center flex-shrink-0">
                      {getActionIcon(entry.action)}
                    </div>
                    {index < auditTrail.length - 1 && (
                      <div className="w-0.5 h-full bg-dark-700 my-1"></div>
                    )}
                  </div>

                  {/* Event Card */}
                  <div className="flex-1 pb-3">
                    <div className="bg-dark-800/50 border border-dark-700 hover:border-[#c0ff00]/30 rounded-lg p-4 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(entry.status)}
                          <span className="text-white font-semibold">{entry.action}</span>
                        </div>
                        <span className="text-gray-500 text-xs">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <User className="w-4 h-4" />
                        <span className="font-mono">
                          {entry.user === 'Admin' 
                            ? 'Admin' 
                            : `${entry.user.slice(0, 6)}...${entry.user.slice(-4)}`
                          }
                        </span>
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
        <div className="p-4 border-t border-dark-700 bg-dark-800/50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#c0ff00] hover:bg-[#d4ff33] text-dark-950 font-bold rounded-lg transition-all hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailModal;