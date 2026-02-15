import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Bitcoin, 
  CircleDollarSign, 
  Layers, 
  Users, 
  PlayCircle, 
  Loader2, 
  BarChart3, 
  Target, 
  Timer,
  AlertCircle,
  Zap,
  Star
} from 'lucide-react';


import { useCountdown, getUrgency } from '../hooks/useCountdown';
import { useCurrentPrice } from '../hooks/useCurrentPrice';
import { 
  generateMarketTitle, 
  generateMarketDescription,
  calculateTotalPool,
  calculateVolume,
  calculatePriceChange,
  getPriceTrend
} from '../utils/marketDisplay';
import { 
  safeToFixed, 
  formatOddsDisplay, 
  calculateMarketPercentages,
  calculateRangePosition,
  getRangeStatus
} from '../marketUtils';
import { MiniPriceChart, ActivityBadge, WinProbability } from './Marketcomponents';
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
  const labels = { 0: 'Binary', 1: 'Multi', 2: 'Range', 3: 'Time' };
  return labels[type] || 'Unknown';
};

export const MarketCard = ({ 
  market, 
  onClick, 
  onBetClick, 
  usdcBalance, 
  isLoading = false, 
  isPlacingBet = false,
  currentPrice: providedCurrentPrice, // Optional: pass from parent for performance
  isFavorite = false,
  onToggleFavorite
}) => {

  
  // Fetch current price if not provided
  const { currentPrice: fetchedPrice } = useCurrentPrice(
    providedCurrentPrice ? null : market?.asset
  );
  const currentPrice = providedCurrentPrice || fetchedPrice;

  // Live countdown timer
  const countdown = useCountdown(market?.endTime);
  const urgency = getUrgency(countdown);

  // Show skeleton loader while loading
  if (isLoading || !market) {
    return <MarketCardSkeleton />;
  }

  const assetInfo = getAssetInfo(market.asset);
  const AssetIcon = assetInfo.icon;

  // Calculate totals
  const totalPool = calculateTotalPool(market);
  const volume = calculateVolume(market);

  // Calculate price change
  const priceChange = currentPrice && market.startPrice 
    ? calculatePriceChange(currentPrice, market.startPrice)
    : null;

  const priceTrend = priceChange ? getPriceTrend(priceChange.value) : null;

  // Auto-generate title and description
  const title = generateMarketTitle(market);
  const description = generateMarketDescription(market, currentPrice);

  // Calculate odds for binary markets
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

  // Get range position for range markets
  const rangePosition = market.marketType === 2 && market.ranges && currentPrice
    ? calculateRangePosition(currentPrice, market.ranges)
    : null;

  // Helper to get option color based on index
  const getOptionColor = (index) => {
    const colors = [
      'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'bg-teal-500/20 text-teal-400 border-teal-500/30',
      'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'bg-lime-500/20 text-lime-400 border-lime-500/30',
      'bg-rose-500/20 text-rose-400 border-rose-500/30',
    ];
    return colors[index % colors.length];
  };

  // Handle bet clicks
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

  const handleOptionClick = (e, optionIndex, optionLabel) => {
    e.stopPropagation();
    if (onBetClick) {
      const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[optionIndex] : 200;
      onBetClick(market, optionIndex, optionLabel, multiplier / 100, usdcBalance >= 10 ? 10 : 1);
    }
  };

  const handleRangeClick = (e, rangeIndex, rangeLabel) => {
    e.stopPropagation();
    if (onBetClick) {
      const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[rangeIndex] : 200;
      onBetClick(market, rangeIndex, rangeLabel, multiplier / 100, usdcBalance >= 10 ? 10 : 1);
    }
  };

  const handleTimeframeClick = (e, timeframeIndex, timeframeLabel) => {
    e.stopPropagation();
    if (onBetClick) {
      const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[timeframeIndex] : 200;
      onBetClick(market, timeframeIndex, timeframeLabel, multiplier / 100, usdcBalance >= 10 ? 10 : 1);
    }
  };

  return (
    <div 
      onClick={onClick}
      className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden"
    >
      {/* Urgency glow effect for closing markets */}
      {urgency.pulse && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent animate-pulse pointer-events-none" />
      )}

      {/* Header Row - Asset, Type, Activity Badge, Favorite */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-sm ${assetInfo.color}`}>
          <AssetIcon className="w-4 h-4" />
          <span>{market.asset || 'Unknown'}</span>
        </div>
        <div className="px-2 py-1 rounded-md bg-dark-700/50 text-gray-400 text-xs font-medium border border-dark-600">
          {getMarketTypeLabel(market.marketType)}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ActivityBadge totalBets={market.totalBets || 0} resolved={market.resolved} />
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${
                isFavorite 
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                  : 'bg-dark-700/50 text-gray-400 border border-dark-600 hover:text-yellow-400 hover:border-yellow-500/30'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>


      {/* Title */}
      <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors text-lg mb-1">
        {title}
      </h3>

      {/* Description */}
      <p className="text-gray-400 text-sm mb-3">
        {description}
      </p>

      {/* Current Price Display (for Binary, Range, Time markets) */}
      {currentPrice && (market.marketType === 0 || market.marketType === 2 || market.marketType === 3) && (
        <div className="mb-3 p-2.5 bg-dark-900/50 rounded-lg border border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-gray-500">Current Price</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">
                ${safeToFixed(currentPrice, currentPrice >= 1000 ? 0 : 2)}
              </span>
              {priceChange && (
                <>
                  <MiniPriceChart
                    startPrice={market.startPrice}
                    currentPrice={currentPrice}
                    isPositive={priceChange.isPositive}
                  />
                  <span className={`text-xs font-semibold ${priceChange.color} flex items-center gap-0.5`}>
                    <span>{priceChange.icon}</span>
                    <span>{priceChange.formatted}</span>
                  </span>
                </>
              )}
              {priceTrend && (
                <span className={`text-[10px] font-medium ${priceTrend.color} px-1.5 py-0.5 rounded-full bg-dark-800`}>
                  {priceTrend.label}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Range Position Indicator (Range markets only) */}
      {market.marketType === 2 && rangePosition && market.ranges && (
        <div className="mb-3 p-2.5 bg-dark-900/50 rounded-lg border border-dark-700">
          <div className="text-xs text-gray-500 mb-2">Price Position</div>
          <div className="relative h-2 bg-dark-800 rounded-full overflow-hidden">
            {market.ranges.map((range, idx) => {
              const min = range.min || 0;
              const max = range.max || 0;
              const allMin = Math.min(...market.ranges.map(r => r.min || min));
              const allMax = Math.max(...market.ranges.map(r => r.max || max));
              const totalRange = allMax - allMin || 1;
              const left = ((min - allMin) / totalRange) * 100;
              const width = ((max - min) / totalRange) * 100;
              const isActive = rangePosition.rangeIndex === idx;
              
              return (
                <div
                  key={idx}
                  className={`absolute h-full ${isActive ? 'bg-[#c0ff00]/60' : 'bg-dark-600/50'} border-r border-dark-800 last:border-r-0`}
                  style={{ left: `${Math.max(0, left)}%`, width: `${Math.max(0, width)}%` }}
                />
              );
            })}
            {/* Current price marker */}
            {currentPrice && (
              <div
                className="absolute top-0 w-1 h-full bg-yellow-400 shadow-lg shadow-yellow-400/50"
                style={{ left: `${rangePosition.percentThrough}%` }}
              />
            )}
          </div>
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-[10px] text-gray-500">
              ${safeToFixed(Math.min(...market.ranges.map(r => r.min || 0)), 0)}
            </span>
            {rangePosition.inRange && (
              <span className="text-[10px] text-[#c0ff00] font-bold">● IN RANGE</span>
            )}
            <span className="text-[10px] text-gray-500">
              ${safeToFixed(Math.max(...market.ranges.map(r => r.max || 0)), 0)}
            </span>
          </div>
        </div>
      )}

      {/* Market Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Start Price */}
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Start</span>
          </div>
          <div className="text-white font-semibold text-sm">
            ${market.startPrice ? safeToFixed(market.startPrice, 0) : '---'}
          </div>
        </div>

        {/* Pool Size */}
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Pool</span>
          </div>
          <div className="text-white font-semibold text-sm">
            {safeToFixed(totalPool, 2)} USDC
          </div>
        </div>

        {/* Total Bets */}
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Bets</span>
          </div>
          <div className="text-white font-semibold text-sm">
            {market.totalBets || 0}
          </div>
        </div>

        {/* Countdown Timer */}
        <div className={`bg-gray-900/50 rounded-lg p-2.5 border ${urgency.pulse ? 'border-red-500/50 animate-pulse' : 'border-gray-700/50'}`}>
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Ends</span>
          </div>
          <div className={`font-semibold text-sm ${urgency.color}`}>
            {countdown.formatted}
          </div>
        </div>
      </div>

      {/* Urgency Warning Banner */}
      {urgency.label && (
        <div className={`mb-3 p-2 rounded-lg border flex items-center gap-2 ${urgency.bgColor} ${urgency.color.replace('text-', 'border-')}`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-bold">{urgency.label}</span>
        </div>
      )}

      {/* Market Type Specific Betting UI */}
      {market.marketType === 0 && (
        /* Binary Market - Price Up/Down */
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={handleYesClick}
            disabled={isPlacingBet || market.resolved || countdown.expired}
            className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 hover:border-green-500/50 rounded-lg p-3 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              {isPlacingBet ? (
                <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
              ) : (
                <TrendingUp className="w-4 h-4 text-green-400" />
              )}
              <span className="text-green-400 font-bold text-sm">UP</span>
            </div>
            <div className="text-green-400 font-semibold text-lg mb-1">
              {yesOdds.text}
            </div>
            <WinProbability market={market} choice="yes" />
          </button>
          <button
            onClick={handleNoClick}
            disabled={isPlacingBet || market.resolved || countdown.expired}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 rounded-lg p-3 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              {isPlacingBet ? (
                <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className="text-red-400 font-bold text-sm">DOWN</span>
            </div>
            <div className="text-red-400 font-semibold text-lg mb-1">
              {noOdds.text}
            </div>
            <WinProbability market={market} choice="no" />
          </button>
        </div>
      )}

      {market.marketType === 1 && market.options && (
        /* Multi-Choice Market */
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Select an option:</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {market.options.map((option, idx) => {
              const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[idx] : 200;
              const oddsText = market.useFixedOdds ? `${(multiplier / 100).toFixed(2)}x` : 'Dynamic';
              return (
                <button
                  key={idx}
                  onClick={(e) => handleOptionClick(e, idx, option)}
                  disabled={isPlacingBet || market.resolved || countdown.expired}
                  className={`${getOptionColor(idx)} border rounded-lg p-2 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  <div className="font-bold text-sm truncate">{option}</div>
                  <div className="text-xs opacity-80 mb-1">{oddsText}</div>
                  <WinProbability market={market} choice={idx} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {market.marketType === 2 && market.ranges && (
        /* Range Market */
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">Select a range:</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {market.ranges.map((range, idx) => {
              const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[idx] : 200;
              const oddsText = market.useFixedOdds ? `${(multiplier / 100).toFixed(2)}x` : 'Dynamic';
              const rangeLabel = `$${range.min?.toLocaleString?.() || range.min} - $${range.max?.toLocaleString?.() || range.max}`;
              const isActive = rangePosition && rangePosition.rangeIndex === idx;
              const rangeStatus = currentPrice ? getRangeStatus(currentPrice, range) : null;
              
              return (
                <button
                  key={idx}
                  onClick={(e) => handleRangeClick(e, idx, rangeLabel)}
                  disabled={isPlacingBet || market.resolved || countdown.expired}
                  className={`${isActive ? 'bg-[#c0ff00]/20 border-[#c0ff00]/50' : getOptionColor(idx)} border rounded-lg p-3 transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative`}
                >
                  {isActive && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#c0ff00] text-dark-900 text-[10px] font-bold rounded-full">
                      HERE
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm">{rangeLabel}</div>
                    <div className="text-xs opacity-80">{oddsText}</div>
                  </div>
                  {rangeStatus && (
                    <div className="mt-1">
                      <span className={`text-[10px] font-medium ${rangeStatus.textColor}`}>
                        {rangeStatus.label}
                      </span>
                    </div>
                  )}
                  <div className="mt-1">
                    <WinProbability market={market} choice={idx} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {market.marketType === 3 && market.timeframes && (
        /* Time-Based Market */
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-400">Select timeframe:</span>
          </div>
          {market.targetPrice && currentPrice && (
            <div className="mb-3 p-2 bg-dark-900/50 rounded-lg border border-dark-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Target:</span>
                <span className="text-white font-bold">
                  ${safeToFixed(market.targetPrice, market.targetPrice >= 1000 ? 0 : 2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-400">To go:</span>
                <span className={`font-semibold ${
                  currentPrice < market.targetPrice ? 'text-green-400' : 'text-red-400'
                }`}>
                  {Math.abs(((market.targetPrice - currentPrice) / currentPrice) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {market.timeframes.map((tf, idx) => {
              const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[idx] : 200;
              const oddsText = market.useFixedOdds ? `${(multiplier / 100).toFixed(2)}x` : 'Dynamic';
              return (
                <button
                  key={idx}
                  onClick={(e) => handleTimeframeClick(e, idx, tf.label)}
                  disabled={isPlacingBet || market.resolved || countdown.expired}
                  className={`${getOptionColor(idx)} border rounded-lg p-3 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  <div className="font-bold text-sm">{tf.label}</div>
                  <div className="text-xs opacity-80 mb-1">{oddsText}</div>
                  <WinProbability market={market} choice={idx} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketCard;
