import React from 'react';
import { TrendingUp, TrendingDown, Clock, Bitcoin, CircleDollarSign, Layers, DollarSign, Users, PlayCircle, Loader2 } from 'lucide-react';
import { safeToFixed, formatOddsDisplay, calculateMarketPercentages } from '../marketUtils';
import { MarketCardSkeleton } from './SkeletonLoader';




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

// Helper to get market type label
const getMarketTypeLabel = (type) => {
  const labels = {
    0: 'Binary',
    1: 'Multi',
    2: 'Range',
    3: 'Time'
  };
  return labels[type] || 'Unknown';
};

export const MarketCard = ({ market, onClick, onBetClick, usdcBalance, isLoading = false, isPlacingBet = false }) => {
  
  // Show skeleton loader while loading
  if (isLoading || !market) {
    return <MarketCardSkeleton />;
  }

  const assetInfo = getAssetInfo(market.asset);
  const AssetIcon = assetInfo.icon;

  // Calculate odds for display
  const yesOdds = formatOddsDisplay({
    useFixedOdds: market.useFixedOdds,
    multiplier: market.yesMultiplier,
    poolPercentage: calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).upPercentage,
    choice: 1
  });

  const noOdds = formatOddsDisplay({
    useFixedOdds: market.useFixedOdds,
    multiplier: market.noMultiplier,
    poolPercentage: calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).downPercentage,
    choice: 0
  });

  const handleYesClick = (e) => {
    e.stopPropagation();
    if (onBetClick) {
      onBetClick(market, 1, 'Yes', yesOdds.multiplier, usdcBalance >= 10 ? 10 : 1);
    }
  };

  const handleNoClick = (e) => {
    e.stopPropagation();
    if (onBetClick) {
      onBetClick(market, 0, 'No', noOdds.multiplier, usdcBalance >= 10 ? 10 : 1);
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer group"
    >

      {/* Asset Badge - Prominent Display */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-sm ${assetInfo.color}`}>
          <AssetIcon className="w-4 h-4" />
          <span>{market.asset || 'Unknown'}</span>
        </div>
        <div className="px-2 py-1 rounded-md bg-dark-700/50 text-gray-400 text-xs font-medium border border-dark-600">
          {getMarketTypeLabel(market.marketType)}
        </div>
        <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
          market.status === 'active' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {market.status}
        </span>
      </div>

      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
          {market.title}
        </h3>
      </div>

      
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
        {market.description}
      </p>

      {/* Market Stats Grid - 2x2 Layout */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Start Price */}
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Start Price</span>
          </div>
          <div className="text-white font-semibold text-sm">
            ${market.startPrice ? safeToFixed(market.startPrice, 0) : '---'}
          </div>
        </div>

        {/* Pool Size */}
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Pool Size</span>
          </div>
          <div className="text-white font-semibold text-sm">
            {market.totalPool ? safeToFixed(market.totalPool, 2) : '0.00'} USDC
          </div>
        </div>

        {/* Volume */}
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Volume</span>
          </div>
          <div className="text-white font-semibold text-sm">
            {market.volume ? safeToFixed(market.volume, 2) : '0.00'} USDC
          </div>
        </div>


        {/* End Date & Time */}
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Ends</span>
          </div>
          <div className="text-white font-semibold text-xs">
            {market.endDate ? new Date(market.endDate).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : '---'}
          </div>
        </div>
      </div>

      
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleYesClick}
          disabled={isPlacingBet || market.status !== 'active'}
          className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 rounded-lg p-3 text-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label={`Bet Yes on ${market.asset} at ${yesOdds.text} odds`}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            {isPlacingBet ? (
              <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4 text-green-400" />
            )}
            <span className="text-green-400 font-bold text-sm">Price Up</span>
          </div>
          <div className="text-green-400 font-semibold text-lg">
            {yesOdds.text}
          </div>
          <div className="text-green-400/70 text-xs mt-1">
            {isPlacingBet ? 'Processing...' : 'Click to bet Yes'}
          </div>
        </button>
        <button
          onClick={handleNoClick}
          disabled={isPlacingBet || market.status !== 'active'}
          className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 rounded-lg p-3 text-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          aria-label={`Bet No on ${market.asset} at ${noOdds.text} odds`}
        >
          <div className="flex items-center justify-center gap-1 mb-1">
            {isPlacingBet ? (
              <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className="text-red-400 font-bold text-sm">Price Down</span>
          </div>
          <div className="text-red-400 font-semibold text-lg">
            {noOdds.text}
          </div>
          <div className="text-red-400/70 text-xs mt-1">
            {isPlacingBet ? 'Processing...' : 'Click to bet No'}
          </div>
        </button>
      </div>



    </div>
  );
};

export default MarketCard;
