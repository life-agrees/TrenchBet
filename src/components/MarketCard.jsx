import React, { useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Clock, Bitcoin, CircleDollarSign, Layers,
  Users, Loader2, BarChart3, Target, Timer, AlertCircle, Zap,
  Star, TrendingDown as DecayIcon, Trophy
} from 'lucide-react';

import { useCountdown, getUrgency } from '../hooks/useCountdown';
import { useCurrentPrice } from '../hooks/useCurrentPrice';
import { useTimeDecay } from '../hooks/useTimeDecay';
import { ASSET_CONFIG, ASSET_STATUS } from '../config/assets';
import {
  generateMarketTitle,
  calculateTotalPool,
  calculatePriceChange,
} from '../utils/marketDisplay';
import {
  safeToFixed,
  formatOddsDisplay,
  calculateMarketPercentages,
  calculateRangePosition,
  getRangeStatus,
} from '../marketUtils';
import { MiniPriceChart, ActivityBadge, WinProbability } from './Marketcomponents';
import { MarketCardSkeleton } from './SkeletonLoader';

// ── Static helpers ────────────────────────────────────────────────────────────

const getAsset = (symbol) => {
  const config = ASSET_CONFIG[symbol];
  if (!config) {
    return { 
      color: 'text-neutral-900 dark:text-[#CDFF00]', 
      bg: 'bg-primary/20 dark:bg-[#CDFF00]/10', 
      border: 'border-primary/30 dark:border-[#CDFF00]/20', 
      icon: Layers 
    };
  }
  return {
    ...config.style,
    icon: config.icon
  };
};

const TYPE_META = {
  0: { label: 'Binary', Icon: TrendingUp,  accent: '#a3cc00', darkAccent: '#CDFF00' },
  1: { label: 'Multi',  Icon: BarChart3,   accent: '#2563eb', darkAccent: '#60a5fa' },
  2: { label: 'Range',  Icon: Target,      accent: '#7c3aed', darkAccent: '#a78bfa' },
  3: { label: 'Time',   Icon: Timer,       accent: '#ea580c', darkAccent: '#fb923c' },
};

const OPTION_COLORS = [
  { bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   text: 'text-blue-300'   },
  { bg: 'bg-purple-500/15', border: 'border-purple-500/30', text: 'text-purple-300' },
  { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-300' },
  { bg: 'bg-pink-500/15',   border: 'border-pink-500/30',   text: 'text-pink-300'   },
  { bg: 'bg-teal-500/15',   border: 'border-teal-500/30',   text: 'text-teal-300'   },
  { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-yellow-300' },
];
const oc = (i) => OPTION_COLORS[i % OPTION_COLORS.length];

// ── Card Header ───────────────────────────────────────────────────────────────

const CardHeader = ({ market, assetStyle, typeMeta, isFavorite, onToggleFavorite, decayDisplay, liveCount }) => {
  const AssetIcon = assetStyle.icon;
  const TypeIcon  = typeMeta.Icon;
  return (
    <div className="flex items-center gap-2 min-w-0 flex-wrap">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${assetStyle.bg} ${assetStyle.border} ${assetStyle.color}`}>
        <AssetIcon className="w-3.5 h-3.5" />
        <span>{market.asset}</span>
      </div>
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-100 dark:bg-dark-700/60 border border-neutral-200 dark:border-dark-600 text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
        <TypeIcon className="w-3 h-3" style={{ color: document.documentElement.classList.contains('dark') ? typeMeta.darkAccent : typeMeta.accent }} />
        {typeMeta.label}
      </div>

      {liveCount > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-500 animate-pulse">
          <span>🔥</span>
          <span>{liveCount} betting</span>
        </div>
      )}

      {decayDisplay.showBadge && (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${decayDisplay.badgeColor}`}>
          <DecayIcon className="w-3 h-3" />
          {decayDisplay.label}
        </div>
      )}
      {ASSET_CONFIG[market.asset]?.status === ASSET_STATUS.UPCOMING && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/20 border border-secondary/30 text-[10px] font-bold text-secondary">
          Soon
        </div>
      )}
      <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
        <ActivityBadge totalBets={market.totalBets || 0} resolved={market.resolved} />

        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className={`p-1 rounded-md transition-all hover:scale-110 ${isFavorite ? 'text-yellow-400' : 'text-neutral-600 hover:text-yellow-400'}`}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Stats Bar ─────────────────────────────────────────────────────────────────

const StatsBar = ({ market, totalPool, countdown, urgency }) => (
  <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-100/50 dark:bg-dark-900/60 border border-neutral-200 dark:border-dark-700/50 text-xs">
    <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
      <Users className="w-3 h-3" />
      <span className="text-neutral-900 dark:text-white font-bold">{safeToFixed(totalPool, 1)}</span>
      <span className="font-medium">USDC</span>
    </div>
    <div className="w-px h-3 bg-neutral-300 dark:bg-dark-600" />
    <div className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
      <Trophy className="w-3 h-3" />
      <span className="text-neutral-900 dark:text-white font-bold">{market.totalBets || 0}</span>
      <span className="font-medium">bets</span>
    </div>
    <div className="w-px h-3 bg-neutral-300 dark:bg-dark-600" />
    <div className={`flex items-center gap-1 ml-auto font-bold ${urgency.color || 'text-green-600 dark:text-green-400'}`}>
      <Clock className="w-3 h-3" />
      <span>{countdown.formatted}</span>
    </div>
  </div>
);

// ── Binary Hero ───────────────────────────────────────────────────────────────

const BinaryHero = ({ market, currentPrice, priceChange, yesOdds, noOdds, isPlacingBet, disabled, onYes, onNo }) => {
  const { upPercentage, downPercentage } = calculateMarketPercentages(market.yesPool || 0, market.noPool || 0);
  const upW = market.useFixedOdds ? 50 : upPercentage;
  const dnW = 100 - upW;

  return (
    <div className="space-y-2.5">
      {currentPrice && (
        <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-neutral-50 dark:bg-dark-900/50 border border-neutral-200 dark:border-dark-700/50">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs text-neutral-500">Live</span>
          </div>
          <div className="flex items-center gap-2">
            {priceChange && <MiniPriceChart startPrice={market.startPrice} currentPrice={currentPrice} isPositive={priceChange.isPositive} />}
            <span className="text-sm font-bold text-neutral-900 dark:text-white">${safeToFixed(currentPrice, currentPrice >= 1000 ? 0 : 2)}</span>
            {priceChange && <span className={`text-xs font-semibold ${priceChange.color}`}>{priceChange.formatted}</span>}
          </div>
        </div>
      )}

      <div>
        <div className="flex rounded-full overflow-hidden h-1.5">
          <div className="bg-green-500/70 transition-all duration-500" style={{ width: `${upW}%` }} />
          <div className="bg-red-500/70 flex-1" />
        </div>
        <div className="flex justify-between mt-1 px-0.5 text-[10px]">
          <span className="text-green-400 font-semibold">{upW}% UP</span>
          <span className="text-red-400 font-semibold">DOWN {dnW}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onYes}
          disabled={disabled}
          className="flex flex-col items-center gap-1 py-3 rounded-xl bg-green-500/10 border border-green-500/25 hover:bg-green-500/20 hover:border-green-500/50 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          {isPlacingBet
            ? <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
            : <TrendingUp className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform" />
          }
          <span className="text-green-400 font-bold text-sm">UP</span>
          <span className="text-green-300/60 text-[11px]">{yesOdds.text}</span>
        </button>
        <button
          onClick={onNo}
          disabled={disabled}
          className="flex flex-col items-center gap-1 py-3 rounded-xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 hover:border-red-500/50 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          {isPlacingBet
            ? <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
            : <TrendingDown className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
          }
          <span className="text-red-400 font-bold text-sm">DOWN</span>
          <span className="text-red-300/60 text-[11px]">{noOdds.text}</span>
        </button>
      </div>
    </div>
  );
};

// ── Multi-Choice Hero ─────────────────────────────────────────────────────────

const MultiHero = ({ market, disabled, onOption }) => (
  <div>
    <div className="flex items-center gap-1.5 mb-2">
      <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
      <span className="text-xs text-neutral-400 font-medium">Pick one option</span>
    </div>
    <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600/50 scrollbar-track-dark-900 sm:overflow-visible sm:max-h-none scroll-smooth">

      {(market.options || []).map((opt, idx) => {
        const c = oc(idx);
        const rawMult = market.useFixedOdds ? market.multipliers?.[idx] : null;
        const mult = rawMult != null && !isNaN(Number(rawMult)) ? rawMult : 200;
        const oddsText = market.useFixedOdds ? `${(mult / 100).toFixed(2)}x` : 'Pool odds';
        return (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); onOption(e, idx, opt); }}
            disabled={disabled}
            className={`flex flex-col items-start px-3 py-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${c.bg} ${c.border} hover:brightness-110`}
          >
            <span className={`text-xs font-bold truncate w-full ${c.text}`}>{opt}</span>
            <span className="text-[10px] text-neutral-500 mt-0.5">{oddsText}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// ── Range Hero ────────────────────────────────────────────────────────────────

const RangeHero = ({ market, currentPrice, disabled, onRange }) => {
  const ranges  = market.ranges || [];
  const allMin  = Math.min(...ranges.map(r => r.min || 0));
  const allMax  = Math.max(...ranges.map(r => r.max || 0));
  const span    = allMax - allMin || 1;
  const pricePos = currentPrice
    ? Math.min(100, Math.max(0, ((currentPrice - allMin) / span) * 100))
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs text-neutral-400 font-medium">Select range</span>
        </div>
        {currentPrice && (
          <span className="text-xs text-yellow-400 font-semibold">
            ${safeToFixed(currentPrice, currentPrice >= 1000 ? 0 : 2)} now
          </span>
        )}
      </div>

      {/* Visual price track */}
      <div className="relative h-2.5 rounded-full bg-neutral-100 dark:bg-dark-700 mb-3 overflow-visible">
        {ranges.map((range, idx) => {
          const left  = ((range.min - allMin) / span) * 100;
          const width = ((range.max  - range.min) / span) * 100;
          const inRange = currentPrice && currentPrice >= range.min && currentPrice <= range.max;
          const colors  = ['#60a5fa','#a78bfa','#fb923c','#f472b6','#2dd4bf'];
          return (
            <div
              key={idx}
              className="absolute top-0 h-full rounded-sm transition-opacity"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: inRange ? '#CDFF00' : colors[idx % colors.length],
                opacity: inRange ? 1 : 0.4,
              }}
            />
          );
        })}
        {pricePos !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 border-2 border-dark-800 shadow-lg z-10"
            style={{ left: `calc(${pricePos}% - 6px)` }}
          />
        )}
      </div>

      {/* Range option buttons */}
      <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600/50 scrollbar-track-dark-900 scroll-smooth sm:overflow-visible sm:max-h-none">

        {ranges.map((range, idx) => {
          const c = oc(idx);
          const rawMult = market.useFixedOdds ? market.multipliers?.[idx] : null;
          const mult = rawMult != null && !isNaN(Number(rawMult)) ? rawMult : 200;
          const oddsText = market.useFixedOdds ? `${(mult / 100).toFixed(2)}x` : 'Pool';
          const label  = `$${range.min?.toLocaleString?.() || range.min} – $${range.max?.toLocaleString?.() || range.max}`;
          const inRange = currentPrice && currentPrice >= range.min && currentPrice <= range.max;
          return (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); onRange(e, idx, label); }}
              disabled={disabled}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                inRange
                  ? 'bg-[#CDFF00]/10 border-[#CDFF00]/40'
                  : `${c.bg} ${c.border}`
              }`}
            >
              <div className="flex items-center gap-2">
                {inRange && <span className="w-1.5 h-1.5 rounded-full bg-[#CDFF00]" />}
                <span className={`font-semibold ${inRange ? 'text-[#CDFF00]' : c.text}`}>{label}</span>
              </div>
              <span className="text-neutral-500">{oddsText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Time Hero ─────────────────────────────────────────────────────────────────

const TimeHero = ({ market, currentPrice, disabled, onTimeframe }) => {
  const progress = currentPrice && market.targetPrice
    ? Math.min(100, (currentPrice / market.targetPrice) * 100)
    : 0;
  const reached = currentPrice && market.targetPrice && currentPrice >= market.targetPrice;

  return (
    <div>
      {market.targetPrice && (
        <div className="px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-dark-900/60 border border-neutral-200 dark:border-dark-700/50 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-neutral-500 uppercase tracking-wide">Target</span>
            <span className={`text-sm font-bold ${reached ? 'text-[#CDFF00]' : 'text-neutral-900 dark:text-white'}`}>
              ${safeToFixed(market.targetPrice, market.targetPrice >= 1000 ? 0 : 2)}
            </span>
          </div>
          <div className="relative h-1.5 rounded-full bg-neutral-100 dark:bg-dark-700 overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: reached ? '#CDFF00' : '#fb923c' }}
            />
          </div>
          {currentPrice && (
            <div className="flex justify-between mt-1.5 text-[10px]">
              <span className="text-orange-400 font-semibold">
                ${safeToFixed(currentPrice, currentPrice >= 1000 ? 0 : 2)}
              </span>
              <span className="text-neutral-600">
                {Math.abs(((market.targetPrice - currentPrice) / currentPrice) * 100).toFixed(1)}% to go
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-2">
        <Timer className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-xs text-neutral-400 font-medium">When will it hit?</span>
      </div>
        <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-dark-600/50 scrollbar-track-dark-900 sm:overflow-visible sm:max-h-none scroll-smooth">

        {(market.timeframes || []).map((tf, idx) => {
          const c = oc(idx);
          const rawMult = market.useFixedOdds ? market.multipliers?.[idx] : null;
          const mult = rawMult != null && !isNaN(Number(rawMult)) ? rawMult : 200;
          const oddsText = market.useFixedOdds ? `${(mult / 100).toFixed(2)}x` : 'Pool';
          return (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); onTimeframe(e, idx, tf.label); }}
              disabled={disabled}
              className={`flex flex-col items-start px-3 py-2.5 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${c.bg} ${c.border} hover:brightness-110`}
            >
              <span className={`text-xs font-bold ${c.text}`}>{tf.label}</span>
              <span className="text-[10px] text-neutral-500 mt-0.5">{oddsText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Card ─────────────────────────────────────────────────────────────────

const MarketCardComponent = ({
  market,
  onClick,
  onBetClick,
  usdcBalance,
  isLoading    = false,
  isPlacingBet = false,
  currentPrice: providedCurrentPrice,
  isFavorite   = false,
  onToggleFavorite,
  isRecentlyActive = false,
}) => {
  const { currentPrice: fetchedPrice } = useCurrentPrice(
    providedCurrentPrice ? null : market?.asset
  );
  const currentPrice = providedCurrentPrice || fetchedPrice;
  const countdown    = useCountdown(market?.endTime);
  const urgency      = getUrgency(countdown);
  const { decayDisplay, isLatePhase } = useTimeDecay(market);

  if (isLoading || !market) return <MarketCardSkeleton />;

  const assetStyle  = getAsset(market.asset);
  const typeMeta    = TYPE_META[market.marketType] || TYPE_META[0];
  const totalPool   = calculateTotalPool(market);
  const priceChange = currentPrice
    ? calculatePriceChange(currentPrice, market.startPrice)
    : null;

  const liveCount = useMemo(() => {
    if (market.resolved) return 0;
    // Deterministic but "live-looking" number based on ID and bet volume
    const seed = Number(market.id) || 0;
    const base = (seed % 12) + 4; 
    const trendFactor = isRecentlyActive ? 4 : (market.totalBets || 0) > 20 ? 3 : (market.totalBets || 0) > 5 ? 2 : 1;
    return base * trendFactor;
  }, [market.id, market.totalBets, market.resolved, isRecentlyActive]);

  const title    = generateMarketTitle(market);
  const disabled = isPlacingBet || market.resolved || countdown.expired;
  const defaultBet = usdcBalance >= 10 ? 10 : 1;

  const yesOdds = formatOddsDisplay({
    useFixedOdds:   market.useFixedOdds,
    multiplier:     market.yesMultiplier,
    poolPercentage: calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).upPercentage,
    choice: 1,
  });
  const noOdds = formatOddsDisplay({
    useFixedOdds:   market.useFixedOdds,
    multiplier:     market.noMultiplier,
    poolPercentage: calculateMarketPercentages(market.yesPool || 0, market.noPool || 0).downPercentage,
    choice: 0,
  });

  return (
    <div
      onClick={onClick}
      className="relative bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700/50 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer group transition-all duration-200 hover:border-neutral-200 dark:border-dark-600 hover:bg-white dark:bg-dark-800/90 overflow-hidden will-change-transform [backface-visibility:hidden]"

    >
      {/* Type accent strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, transparent 0%, ${typeMeta.accent}99 40%, ${typeMeta.accent}99 60%, transparent 100%)` }}
      />

      {/* Urgency ambient glow */}
      {urgency.pulse && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.07) 0%, transparent 65%)' }}
        />
      )}

      {/* ── Header ── */}
      <CardHeader
        market={market}
        assetStyle={assetStyle}
        typeMeta={typeMeta}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        decayDisplay={decayDisplay}
        liveCount={liveCount}
      />

      {/* ── Title ── */}
      <h3 className="font-bold text-neutral-900 dark:text-white text-sm leading-snug line-clamp-2 group-hover:text-[#CDFF00] transition-colors duration-200 -mt-1">
        {title}
      </h3>

      {/* ── Stats bar ── */}
      <StatsBar market={market} totalPool={totalPool} countdown={countdown} urgency={urgency} />

      {/* ── Warnings ── */}
      {urgency.label && (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${urgency.bgColor}`}>
          <AlertCircle className={`w-3.5 h-3.5 flex-shrink-0 ${urgency.color}`} />
          <span className={urgency.color}>{urgency.label}</span>
        </div>
      )}
      {isLatePhase && !urgency.label && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Late Phase — Reduced Odds
        </div>
      )}

      {/* ── Market-type hero ── */}
      {market.marketType === 0 && (
        <BinaryHero
          market={market}
          currentPrice={currentPrice}
          priceChange={priceChange}
          yesOdds={yesOdds}
          noOdds={noOdds}
          isPlacingBet={isPlacingBet}
          disabled={disabled}
          onYes={(e) => { e.stopPropagation(); onBetClick?.(market, 1, 'Yes', yesOdds.multiplier, defaultBet); }}
          onNo={(e)  => { e.stopPropagation(); onBetClick?.(market, 0, 'No',  noOdds.multiplier,  defaultBet); }}
        />
      )}

      {market.marketType === 1 && market.options && (
        <MultiHero
          market={market}
          disabled={disabled}
          onOption={(e, idx, label) => {
            const rawMult = market.useFixedOdds ? market.multipliers?.[idx] : null;
            const mult = rawMult != null && !isNaN(Number(rawMult)) ? rawMult : 200;
            onBetClick?.(market, idx, label, mult / 100, defaultBet);
          }}
        />
      )}

      {market.marketType === 2 && market.ranges && (
        <RangeHero
          market={market}
          currentPrice={currentPrice}
          disabled={disabled}
          onRange={(e, idx, label) => {
            const rawMult = market.useFixedOdds ? market.multipliers?.[idx] : null;
            const mult = rawMult != null && !isNaN(Number(rawMult)) ? rawMult : 200;
            onBetClick?.(market, idx, label, mult / 100, defaultBet);
          }}
        />
      )}

      {market.marketType === 3 && market.timeframes && (
        <TimeHero
          market={market}
          currentPrice={currentPrice}
          disabled={disabled}
          onTimeframe={(e, idx, label) => {
            const rawMult = market.useFixedOdds ? market.multipliers?.[idx] : null;
            const mult = rawMult != null && !isNaN(Number(rawMult)) ? rawMult : 200;
            onBetClick?.(market, idx, label, mult / 100, defaultBet);
          }}
        />
      )}
    </div>
  );
};

// ── Memo ──────────────────────────────────────────────────────────────────────

const MemoizedMarketCard = React.memo(MarketCardComponent, (prev, next) => (
  prev.market?.id                === next.market?.id              &&
  prev.market?.resolved          === next.market?.resolved        &&
  prev.market?.yesPool           === next.market?.yesPool         &&
  prev.market?.noPool            === next.market?.noPool          &&
  prev.market?.totalBets         === next.market?.totalBets        &&
  prev.market?.priceWentUp       === next.market?.priceWentUp     &&
  prev.market?.options?.length   === next.market?.options?.length &&
  prev.market?.ranges?.length    === next.market?.ranges?.length  &&
  prev.market?.timeframes?.length=== next.market?.timeframes?.length &&
  prev.isFavorite                === next.isFavorite              &&
  prev.isLoading                 === next.isLoading               &&
  prev.isPlacingBet              === next.isPlacingBet            &&
  prev.usdcBalance               === next.usdcBalance
));

export { MemoizedMarketCard };
export default MemoizedMarketCard;