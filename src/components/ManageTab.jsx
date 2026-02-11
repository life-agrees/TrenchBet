import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  Clock,
  CheckSquare,
  XCircle,
  History,
  CheckCheck,
  Search,
  Filter,
  X,
  Bitcoin,
  CircleDollarSign,
  Layers,
  PlayCircle,
  Users,
  TrendingUp
} from 'lucide-react';
import AuditTrailModal from './AuditTrailModal';
import { safeToFixed } from '../marketUtils';


// Helper to get asset display info
const getAssetInfo = (asset) => {
  const assetColors = {
    'BTC': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'ETH': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'SOL': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'CRYPTO': 'bg-[#c0ff00]/20 text-[#c0ff00] border-[#c0ff00]/30',
  };
  return {
    color: assetColors[asset] || 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: asset === 'BTC' ? Bitcoin : asset === 'ETH' ? CircleDollarSign : Layers
  };
};


const ManageTab = ({
  markets,
  isLoadingMarkets,
  resolvingId,
  multiChoiceAnswers,
  setMultiChoiceAnswers,
  handleResolve,
  isPending,
  isConfirming
}) => {
  const [selectedMarkets, setSelectedMarkets] = useState(new Set());
  const [auditMarket, setAuditMarket] = useState(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'pending', 'resolved'
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', '0', '1', '2', '3'

  // Helper to get market type label
  const getMarketTypeLabel = (type) => {
    const labels = {
      0: 'Binary',
      1: 'Multi-Choice',
      2: 'Range',
      3: 'Time-Based'
    };
    return labels[type] || 'Unknown';
  };

  // Helper to get market status
  const getMarketStatus = (market) => {
    const isExpired = Date.now() > market.endTime;
    if (market.resolved) return 'resolved';
    if (isExpired) return 'pending';
    return 'active';
  };

  // Helper to get status color and text
  const getStatusInfo = (market) => {
    const status = getMarketStatus(market);
    switch (status) {
      case 'resolved':
        return { 
          color: 'bg-gray-600 text-gray-300', 
          text: 'Resolved', 
          icon: CheckSquare,
          badgeColor: 'bg-gray-600'
        };
      case 'pending':
        return { 
          color: 'bg-yellow-500 text-dark-950', 
          text: 'Pending', 
          icon: Clock,
          badgeColor: 'bg-yellow-500'
        };
      case 'active':
        return { 
          color: 'bg-[#00FF88] text-dark-950', 
          text: 'Active', 
          icon: CheckCircle,
          badgeColor: 'bg-[#00FF88]'
        };
      default:
        return { 
          color: 'bg-gray-600 text-gray-300', 
          text: 'Unknown', 
          icon: AlertCircle,
          badgeColor: 'bg-gray-600'
        };
    }
  };

  // Filter markets based on search and filters
  const filteredMarkets = useMemo(() => {
    return markets.filter(market => {
      if (!market) return false;
      
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        market.id.toString().includes(searchLower) ||
        market.asset?.toLowerCase().includes(searchLower) ||
        market.question?.toLowerCase().includes(searchLower);
      
      // Status filter
      const status = getMarketStatus(market);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      // Type filter
      const matchesType = typeFilter === 'all' || market.marketType.toString() === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [markets, searchQuery, statusFilter, typeFilter]);

  // Toggle market selection
  const toggleMarketSelection = (marketId) => {
    const newSet = new Set(selectedMarkets);
    if (newSet.has(marketId)) {
      newSet.delete(marketId);
    } else {
      newSet.add(marketId);
    }
    setSelectedMarkets(newSet);
  };

  // Select all resolvable markets from filtered list
  const selectAllResolvable = () => {
    const resolvable = filteredMarkets
      .filter(m => !m.resolved && Date.now() > m.endTime)
      .map(m => m.id);
    setSelectedMarkets(new Set(resolvable));
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedMarkets(new Set());
  };

  // Bulk resolve selected markets
  const handleBulkResolve = async () => {
    for (const marketId of selectedMarkets) {
      const market = markets.find(m => m.id === marketId);
      if (market && !market.resolved && Date.now() > market.endTime) {
        await handleResolve(market);
        // Small delay between resolutions to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    setSelectedMarkets(new Set());
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all';

  if (isLoadingMarkets) {
    return (
      <div className="text-center py-12">
        <Loader2 className="animate-spin mx-auto text-[#c0ff00]" size={40} />
        <p className="text-gray-400 mt-4">Loading markets...</p>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12 bg-dark-800/50 rounded-xl border border-dark-700">
        <AlertCircle className="mx-auto mb-3 text-gray-600" size={48} />
        <p className="text-lg">No markets found.</p>
        <p className="text-sm text-gray-500 mt-2">Create your first market in the Create tab</p>
      </div>
    );
  }

  const resolvableMarkets = filteredMarkets.filter(m => !m.resolved && Date.now() > m.endTime);

  return (
    <div className="space-y-4">
      {/* Header with Title and Count */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#c0ff00]" />
          <h2 className="text-lg font-semibold text-white">
            Manage Markets 
            <span className="text-gray-400 text-sm ml-2">
              ({filteredMarkets.length} of {markets.length})
            </span>
          </h2>
        </div>
        
        {/* Bulk Actions */}
        {resolvableMarkets.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllResolvable}
              className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 hover:border-[#c0ff00]/50 text-white text-sm font-semibold rounded-lg transition-all"
            >
              Select All Pending ({resolvableMarkets.length})
            </button>
            
            {selectedMarkets.size > 0 && (
              <>
                <button
                  onClick={clearSelection}
                  className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  Clear ({selectedMarkets.size})
                </button>
                <button
                  onClick={handleBulkResolve}
                  disabled={isPending || isConfirming}
                  className="px-4 py-2 bg-[#c0ff00] hover:bg-[#d4ff33] disabled:bg-gray-700 text-dark-950 font-bold rounded-lg flex items-center gap-2 transition-all"
                >
                  <CheckCheck size={18} />
                  Resolve {selectedMarkets.size}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, asset, or question..."
            className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#c0ff00] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-dark-900 rounded-lg p-1">
            {[
              { key: 'all', label: 'All', count: markets.length },
              { key: 'active', label: 'Active', count: markets.filter(m => getMarketStatus(m) === 'active').length },
              { key: 'pending', label: 'Pending', count: markets.filter(m => getMarketStatus(m) === 'pending').length },
              { key: 'resolved', label: 'Resolved', count: markets.filter(m => getMarketStatus(m) === 'resolved').length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  statusFilter === key
                    ? 'bg-[#c0ff00] text-dark-950'
                    : 'text-gray-400 hover:text-white hover:bg-dark-800'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>

          {/* Type Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#c0ff00] transition-colors"
            >
              <option value="all">All Types</option>
              <option value="0">Binary</option>
               <option value="1">Multi-Choice</option>
              <option value="2">Range</option>
              <option value="3">Time-Based</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <X size={14} />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Markets List */}
      <div className="space-y-3">
        {filteredMarkets.length === 0 ? (
          <div className="text-center text-gray-400 py-12 bg-dark-800/50 rounded-xl border border-dark-700">
            <Search className="mx-auto mb-3 text-gray-600" size={48} />
            <p className="text-lg">No markets match your filters.</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredMarkets.map(market => {
            if (!market) return null;
            
            const statusInfo = getStatusInfo(market);
            const StatusIcon = statusInfo.icon;
            const isExpired = Date.now() > market.endTime;
            const canResolve = !market.resolved && isExpired;
            const isSelected = selectedMarkets.has(market.id);

            const assetInfo = getAssetInfo(market.asset);
            const AssetIcon = assetInfo.icon;

            return (
              <div 
                key={market.id} 
                className={`bg-dark-800/50 rounded-xl p-5 border transition-all ${
                  isSelected 
                    ? 'border-[#c0ff00] shadow-lg shadow-[#c0ff00]/20' 
                    : 'border-dark-700 hover:border-dark-600'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  {/* Left Side - Market Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Selection Checkbox */}
                      {canResolve && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMarketSelection(market.id)}
                          className="w-5 h-5 rounded border-gray-600 text-[#c0ff00] focus:ring-[#c0ff00] cursor-pointer"
                        />
                      )}
                      
                      {/* Asset Badge with Icon */}
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-sm ${assetInfo.color}`}>
                        <AssetIcon className="w-4 h-4" />
                        <span>{market.asset || 'Unknown'}</span>
                      </div>
                      
                      <span className="font-black text-xl text-white">
                        #{market.id}
                      </span>
                      
                      <span className={`text-xs px-3 py-1 rounded-full font-bold ${statusInfo.color}`}>
                        <StatusIcon size={12} className="inline mr-1" />
                        {statusInfo.text}
                      </span>
                      
                      <span className="text-xs px-2 py-1 bg-dark-700 text-gray-400 rounded font-semibold">
                        {getMarketTypeLabel(market.marketType)}
                      </span>
                    </div>

                    
                    {/* Market Stats Row */}
                    <div className="flex flex-wrap items-center gap-4 text-sm mt-3 pt-3 border-t border-dark-700/50">
                      <div className="flex items-center gap-1.5">
                        <PlayCircle className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-400">Start:</span>
                        <span className="text-white font-semibold">
                          ${market.startPrice ? safeToFixed(market.startPrice, 0) : '---'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-400">Pool:</span>
                        <span className="text-white font-semibold">
                          {market.totalPool ? safeToFixed(market.totalPool, 2) : '0.00'} USDC
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-400">Vol:</span>
                        <span className="text-white font-semibold">
                          {market.volume ? safeToFixed(market.volume, 2) : '0.00'} USDC
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-gray-400">{isExpired ? 'Ended:' : 'Ends:'}</span>
                        <span className={`font-semibold ${isExpired ? 'text-yellow-400' : 'text-[#00FF88]'}`}>
                          {new Date(market.endTime).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    
                    {market.question && (
                      <div className="text-gray-300 text-sm mt-2 italic bg-dark-900/50 p-2 rounded border border-dark-700">
                        Q: {market.question}
                      </div>
                    )}

                    {/* Multi-Choice Options */}
                    {market.marketType === 1 && market.options && market.options.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-dark-700">
                        <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Options:</div>
                        <div className="flex flex-wrap gap-2">
                          {market.options.map((opt, idx) => (
                            <span 
                              key={idx} 
                              className="px-3 py-1 bg-[#c0ff00]/10 border border-[#c0ff00]/30 rounded-lg text-sm text-[#c0ff00] font-medium"
                            >
                              {idx}: {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Right Side - Actions */}
                  <div className="flex flex-col items-end gap-2 min-w-[200px]">
                    {/* Audit Trail Button */}
                    <button
                      onClick={() => setAuditMarket(market)}
                      className="w-full px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 hover:border-[#c0ff00]/50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
                    >
                      <History size={16} />
                      View Audit Trail
                    </button>

                    {canResolve && (
                      <>
                        {/* Multi-Choice Winner Selection */}
                        {market.marketType === 1 && market.options && market.options.length > 0 && (
                          <select 
                            className="w-full bg-dark-700 text-white text-sm p-3 rounded-lg border border-dark-600 focus:border-[#c0ff00] outline-none transition-colors"
                            onChange={(e) => setMultiChoiceAnswers({...multiChoiceAnswers, [market.id]: e.target.value})}
                            value={multiChoiceAnswers[market.id] || ""}
                          >
                            <option value="">Select Winner...</option>
                            {market.options.map((opt, idx) => (
                              <option key={idx} value={idx}>
                                {opt} (Index {idx})
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {/* Resolve Button */}
                        <button
                          onClick={() => handleResolve(market)}
                          disabled={resolvingId === market.id || isPending || isConfirming || isSelected}
                          className="w-full bg-gradient-to-r from-[#c0ff00] to-[#00FF88] hover:from-[#d4ff33] hover:to-[#00FF99] text-dark-950 px-4 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#c0ff00]/20 transition-all hover:scale-105 disabled:hover:scale-100"
                        >
                          {resolvingId === market.id ? (
                            <>
                              <Loader2 className="animate-spin" size={16}/>
                              Resolving...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16}/>
                              Resolve Market
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Audit Trail Modal */}
      <AuditTrailModal
        isOpen={!!auditMarket}
        onClose={() => setAuditMarket(null)}
        market={auditMarket}
      />
    </div>
  );
};

export default ManageTab;
