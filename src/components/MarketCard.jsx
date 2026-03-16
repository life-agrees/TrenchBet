import React, { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Clock, Bitcoin, CircleDollarSign, Layers,
  Users, PlayCircle, Loader2, BarChart3, Target, Timer,
  AlertCircle, Zap, Star, TrendingDown as DecayIcon
} from 'lucide-react';

import { useCountdown, getUrgency } from '../hooks/useCountdown';
import { useCurrentPrice } from '../hooks/useCurrentPrice';
import { useTimeDecay } from '../hooks/useTimeDecay';

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
  getRangeStatus,
  getDecayPhase
} from '../marketUtils';

import { MiniPriceChart, ActivityBadge, WinProbability } from './Marketcomponents';
import { MarketCardSkeleton } from './SkeletonLoader';

// ── Static helpers ────────────────────────────────────────────────────────────

const getAssetInfo = (asset) => {
  const assetColors = {
    BTC:    'bg-orange-500/20 text-orange-400 border-orange-500/30',
    ETH:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    SOL:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    CRYPTO: 'bg-[#c0ff00]/20 text-[#c0ff00] border-[#c0ff00]/30',
  };
  return {
    color: assetColors[asset] || 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: asset === 'BTC' ? Bitcoin : asset === 'ETH' ? CircleDollarSign : Layers,
  };
};

const getMarketTypeLabel = (type) =>
  ({ 0: 'Binary', 1: 'Multi', 2: 'Range', 3: 'Time' }[type] || 'Unknown');

const OPTION_COLORS = [
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
const getOptionColor = (index) => OPTION_COLORS[index % OPTION_COLORS.length];

// ── MarketCard component ──────────────────────────────────────────────────────

const MarketCardComponent = ({
  market,
  onClick,
  onBetClick,
  usdcBalance,
  isLoading     = false,
  isPlacingBet  = false,
  currentPrice: providedCurrentPrice,
  isFavorite    = false,
  onToggleFavorite,
}) => {
  const { currentPrice: fetchedPrice } = useCurrentPrice(
    providedCurrentPrice ? null : market?.asset
  );
  const currentPrice = providedCurrentPrice || fetchedPrice;

  const countdown = useCountdown(market?.endTime);
  const urgency   = getUrgency(countdown);

  const { decayDisplay, isLatePhase, isDecaying } = useTimeDecay(market);

  if (isLoading || !market) return <MarketCardSkeleton />;

  const assetInfo = getAssetInfo(market.asset);
  const AssetIcon = assetInfo.icon;

  const totalPool    = calculateTotalPool(market);
  const priceChange  = currentPrice && market.startPrice
    ? calculatePriceChange(currentPrice, market.startPrice)
    : null;
  const priceTrend   = priceChange ? getPriceTrend(priceChange.value) : null;

  const title       = generateMarketTitle(market);
  const description = generateMarketDescription(market, currentPrice);

  const yesOdds = formatOddsDisplay({
    useFixedOdds: market.useFixedOdds,
    multiplier: market.yesMultiplier,
    poolPercentage: calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).upPercentage,
    choice: 1,
  });
  const noOdds = formatOddsDisplay({
    useFixedOdds: market.useFixedOdds,
    multiplier: market.noMultiplier,
    poolPercentage: calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).downPercentage,
    choice: 0,
  });

  const rangePosition = market.marketType === 2 && market.ranges && currentPrice
    ? calculateRangePosition(currentPrice, market.ranges)
    : null;

  // ── Bet click handlers ──────────────────────────────────────────────────
  const defaultBet = usdcBalance >= 10 ? 10 : 1;

  const handleYesClick = (e) => {
    e.stopPropagation();
    onBetClick?.(market, 1, 'Yes', yesOdds.multiplier, defaultBet);
  };
  const handleNoClick = (e) => {
    e.stopPropagation();
    onBetClick?.(market, 0, 'No', noOdds.multiplier, defaultBet);
  };
  const handleOptionClick = (e, idx, label) => {
    e.stopPropagation();
    const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[idx] : 200;
    onBetClick?.(market, idx, label, multiplier / 100, defaultBet);
  };
  const handleRangeClick = (e, idx, label) => {
    e.stopPropagation();
    const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[idx] : 200;
    onBetClick?.(market, idx, label, multiplier / 100, defaultBet);
  };
  const handleTimeframeClick = (e, idx, label) => {
    e.stopPropagation();
    const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[idx] : 200;
    onBetClick?.(market, idx, label, multiplier / 100, defaultBet);
  };

  return (
    // FIX: Migrated from gray-*/blue-* to dark-*/primary design tokens
    <div
      onClick={onClick}
      className="bg-dark-800/80 border border-dark-700 rounded-xl p-4 hover:border-primary/40 transition-all cursor-pointer group relative overflow-hidden"
    >
      {/* Urgency glow */}
      {urgency.pulse && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent animate-pulse pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-sm ${assetInfo.color}`}>
          <AssetIcon className="w-4 h-4" />
          <span>{market.asset || 'Unknown'}</span>
        </div>
        <div className="px-2 py-1 rounded-md bg-dark-700/50 text-neutral-400 text-xs font-medium border border-dark-600">
          {getMarketTypeLabel(market.marketType)}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {decayDisplay.showBadge && (
            <div className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${decayDisplay.badgeColor}`}>
              <DecayIcon className="w-3 h-3" />
              {decayDisplay.label}
            </div>
          )}
          <ActivityBadge totalBets={market.totalBets || 0} resolved={market.resolved} />
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${
                isFavorite
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                  : 'bg-dark-700/50 text-neutral-400 border border-dark-600 hover:text-yellow-400 hover:border-yellow-500/30'
              }`}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-bold text-white group-hover:text-primary transition-colors text-lg mb-1">
        {title}
      </h3>

      {/* Description */}
      <p className="text-neutral-400 text-sm mb-3">{description}</p>

      {/* Current Price */}
      {currentPrice && (market.marketType === 0 || market.marketType === 2 || market.marketType === 3) && (
        <div className="mb-3 p-2.5 bg-dark-900/50 rounded-lg border border-dark-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-neutral-500">Current Price</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">
                ${safeToFixed(currentPrice, currentPrice >= 1000 ? 0 : 2)}
              </span>
              {priceChange && (
                <>
                  <MiniPriceChart startPrice={market.startPrice} currentPrice={currentPrice} isPositive={priceChange.isPositive} />
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

      {/* Range Position */}
      {market.marketType === 2 && rangePosition && market.ranges && (
        <div className="mb-3 p-2.5 bg-dark-900/50 rounded-lg border border-dark-700">
          <div className="text-xs text-neutral-500 mb-2">Price Position</div>
          <div className="relative h-2 bg-dark-800 rounded-full overflow-hidden">
            {market.ranges.map((range, idx) => {
              const min = range.min || 0;
              const max = range.max || 0;
              const allMin = Math.min(...market.ranges.map(r => r.min || min));
              const allMax = Math.max(...market.ranges.map(r => r.max || max));
              const totalRange = allMax - allMin || 1;
              const left  = ((min - allMin) / totalRange) * 100;
              const width = ((max - min)    / totalRange) * 100;
              const isActive = rangePosition.rangeIndex === idx;
              return (
                <div
                  key={idx}
                  className={`absolute h-full ${isActive ? 'bg-primary/60' : 'bg-dark-600/50'} border-r border-dark-800 last:border-r-0`}
                  style={{ left: `${Math.max(0, left)}%`, width: `${Math.max(0, width)}%` }}
                />
              );
            })}
            {currentPrice && (
              <div
                className="absolute top-0 w-1 h-full bg-yellow-400 shadow-lg shadow-yellow-400/50"
                style={{ left: `${rangePosition.percentThrough}%` }}
              />
            )}
          </div>
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-[10px] text-neutral-500">
              ${safeToFixed(Math.min(...market.ranges.map(r => r.min || 0)), 0)}
            </span>
            {rangePosition.inRange && <span className="text-[10px] text-primary font-bold">● IN RANGE</span>}
            <span className="text-[10px] text-neutral-500">
              ${safeToFixed(Math.max(...market.ranges.map(r => r.max || 0)), 0)}
            </span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-dark-900/50 rounded-lg p-2.5 border border-dark-700/50">
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
            <PlayCircle className="w-3.5 h-3.5" /><span>Start</span>
          </div>
          <div className="text-white font-semibold text-sm">
            ${market.startPrice ? safeToFixed(market.startPrice, 0) : '---'}
          </div>
        </div>

        <div className="bg-dark-900/50 rounded-lg p-2.5 border border-dark-700/50">
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
            <Users className="w-3.5 h-3.5" /><span>Pool</span>
          </div>
          <div className="text-white font-semibold text-sm">{safeToFixed(totalPool, 2)} USDC</div>
        </div>

        <div className="bg-dark-900/50 rounded-lg p-2.5 border border-dark-700/50">
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
            <TrendingUp className="w-3.5 h-3.5" /><span>Bets</span>
          </div>
          <div className="text-white font-semibold text-sm">{market.totalBets || 0}</div>
        </div>

        <div className={`bg-dark-900/50 rounded-lg p-2.5 border ${urgency.pulse ? 'border-red-500/50 animate-pulse' : 'border-dark-700/50'}`}>
          <div className="flex items-center gap-1.5 text-neutral-500 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" /><span>Ends</span>
          </div>
          <div className={`font-semibold text-sm ${urgency.color}`}>{countdown.formatted}</div>
        </div>
      </div>

      {/* Urgency Warning */}
      {urgency.label && (
        <div className={`mb-3 p-2 rounded-lg border flex items-center gap-2 ${urgency.bgColor} ${urgency.color.replace('text-', 'border-')}`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-xs font-bold">{urgency.label}</span>
        </div>
      )}

      {/* Late Phase Warning */}
      {isLatePhase && (
        <div className="mb-3 p-2 rounded-lg border border-red-500/30 bg-red-500/10 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400 font-bold">Late Phase: Reduced Odds</span>
        </div>
      )}

      {/* ── Binary Market ─────────────────────────────────────────────────── */}
      {market.marketType === 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: 'UP',   color: 'green', odds: yesOdds, handler: handleYesClick, Icon: TrendingUp },
            { label: 'DOWN', color: 'red',   odds: noOdds,  handler: handleNoClick,  Icon: TrendingDown },
          ].map(({ label, color, odds, handler, Icon }) => (
            <button
              key={label}
              onClick={handler}
              disabled={isPlacingBet || market.resolved || countdown.expired}
              className={`bg-${color}-500/20 hover:bg-${color}-500/30 border border-${color}-500/30 hover:border-${color}-500/50 rounded-lg p-3 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative`}
            >
              {isDecaying && (
                <div className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-orange-500 text-white text-[9px] font-bold rounded-full">
                  DECAY
                </div>
              )}
              <div className="flex items-center justify-center gap-1 mb-1">
                {isPlacingBet
                  ? <Loader2 className={`w-4 h-4 text-${color}-400 animate-spin`} />
                  : <Icon className={`w-4 h-4 text-${color}-400`} />
                }
                <span className={`text-${color}-400 font-bold text-sm`}>{label}</span>
              </div>
              <div className={`text-${color}-400 font-semibold text-lg mb-1`}>{odds.text}</div>
              <WinProbability market={market} choice={label === 'UP' ? 'yes' : 'no'} />
            </button>
          ))}
        </div>
      )}

      {/* ── Multi-Choice ───────────────────────────────────────────────────── */}
      {market.marketType === 1 && market.options && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-neutral-400">Select an option:</span>
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

      {/* ── Range ──────────────────────────────────────────────────────────── */}
      {market.marketType === 2 && market.ranges && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-neutral-400">Select a range:</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {market.ranges.map((range, idx) => {
              const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[idx] : 200;
              const oddsText   = market.useFixedOdds ? `${(multiplier / 100).toFixed(2)}x` : 'Dynamic';
              const rangeLabel = `$${range.min?.toLocaleString?.() || range.min} - $${range.max?.toLocaleString?.() || range.max}`;
              const isActive   = rangePosition?.rangeIndex === idx;
              const rangeStatus = currentPrice ? getRangeStatus(currentPrice, range) : null;
              return (
                <button
                  key={idx}
                  onClick={(e) => handleRangeClick(e, idx, rangeLabel)}
                  disabled={isPlacingBet || market.resolved || countdown.expired}
                  className={`${isActive ? 'bg-primary/20 border-primary/50' : getOptionColor(idx)} border rounded-lg p-3 transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative`}
                >
                  {isActive && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-dark-950 text-[10px] font-bold rounded-full">
                      HERE
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm">{rangeLabel}</div>
                    <div className="text-xs opacity-80">{oddsText}</div>
                  </div>
                  {rangeStatus && (
                    <span className={`text-[10px] font-medium mt-1 block ${rangeStatus.textColor}`}>
                      {rangeStatus.label}
                    </span>
                  )}
                  <div className="mt-1"><WinProbability market={market} choice={idx} /></div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Time-Based ─────────────────────────────────────────────────────── */}
      {market.marketType === 3 && market.timeframes && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Timer className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-neutral-400">Select timeframe:</span>
          </div>
          {market.targetPrice && currentPrice && (
            <div className="mb-3 p-2 bg-dark-900/50 rounded-lg border border-dark-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Target:</span>
                <span className="text-white font-bold">
                  ${safeToFixed(market.targetPrice, market.targetPrice >= 1000 ? 0 : 2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-neutral-400">To go:</span>
                <span className={`font-semibold ${currentPrice < market.targetPrice ? 'text-green-400' : 'text-red-400'}`}>
                  {Math.abs(((market.targetPrice - currentPrice) / currentPrice) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {market.timeframes.map((tf, idx) => {
              const multiplier = market.useFixedOdds && market.multipliers ? market.multipliers[idx] : 200;
              const oddsText   = market.useFixedOdds ? `${(multiplier / 100).toFixed(2)}x` : 'Dynamic';
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

/**
 * FIX: React.memo custom comparator corrected.
 *
 * Previous issues:
 * 1. `market?.read` — 'read' is not a market field (always undefined === undefined = true,
 *    so it never triggered re-renders). Should be `market?.resolved`.
 * 2. Only checking `market.id` meant live data updates (yesPool, noPool, totalBets,
 *    resolved, priceWentUp) never caused the card to re-render.
 *
 * Now checks all fields that affect the card's visual output.
 */
const MemoizedMarketCard = React.memo(MarketCardComponent, (prev, next) => {
  return (
    prev.market?.id          === next.market?.id          &&
    prev.market?.resolved    === next.market?.resolved    && // FIX: was market.read
    prev.market?.yesPool     === next.market?.yesPool     &&
    prev.market?.noPool      === next.market?.noPool      &&
    prev.market?.totalBets   === next.market?.totalBets   &&
    prev.market?.priceWentUp === next.market?.priceWentUp &&
    prev.isFavorite          === next.isFavorite          &&
    prev.isLoading           === next.isLoading           &&
    prev.isPlacingBet        === next.isPlacingBet        &&
    prev.usdcBalance         === next.usdcBalance
  );
});

export { MemoizedMarketCard };
export default MemoizedMarketCard;