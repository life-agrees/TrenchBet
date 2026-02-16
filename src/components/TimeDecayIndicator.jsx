import React, { useMemo } from 'react';
import { Clock, TrendingDown, AlertTriangle, Ban } from 'lucide-react';
import { 
  calculateTimeDecay, 
  getDecayStatus, 
  formatMultiplier,
  formatTimeRemaining,
  getDecayUrgencyColor,
  getDecayBadgeText
} from '../utils/timeDecayUtils';

/**
 * TimeDecayIndicator Component
 * 
 * Displays time-decaying odds status with visual indicators
 * Shows current multiplier, decay progress, and warnings
 */
export const TimeDecayIndicator = ({ 
  market, 
  baseMultiplier, 
  choice,
  showDetails,
  compact 
}) => {

  // Calculate decay information
  const decayInfo = useMemo(() => {
    if (!market?.useFixedOdds || !market?.useTimeDecay) return null;
    
    const startTime = market.startTime;
    const endTime = market.endTime;
    
    const effectiveMultiplier = calculateTimeDecay(
      baseMultiplier,
      endTime,
      startTime,
      50, // decayStartPercent
      market.minMultiplier || 120
    );
    
    const status = getDecayStatus(endTime, startTime, 50);
    
    return {
      effectiveMultiplier,
      status,
      decayAmount: baseMultiplier - effectiveMultiplier,
      decayPercent: ((baseMultiplier - effectiveMultiplier) / (baseMultiplier - (market.minMultiplier || 120))) * 100
    };
  }, [market, baseMultiplier]);

  if (!decayInfo) return null;

  const { effectiveMultiplier, status, decayAmount } = decayInfo;
  const isDecaying = status.isDecaying;
  const isEnded = status.isEnded;
  const urgencyColor = getDecayUrgencyColor(status.phase);
  const badgeText = getDecayBadgeText(status.phase);

  // Compact mode for small spaces
  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        isEnded ? 'bg-red-500/20 text-red-400' :
        isDecaying ? 'bg-yellow-500/20 text-yellow-400' :
        'bg-green-500/20 text-green-400'
      }`}>
        {isEnded ? <Ban className="w-3 h-3" /> :
         isDecaying ? <TrendingDown className="w-3 h-3" /> :
         <Clock className="w-3 h-3" />}
        <span>{formatMultiplier(effectiveMultiplier)}</span>
      </div>
    );
  }

  return (
    <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-3 space-y-2">
      {/* Header with status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${urgencyColor}`} />
          <span className="text-sm font-medium text-gray-300">Time Decay</span>
        </div>
        <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          isEnded ? 'bg-red-500/20 text-red-400' :
          isDecaying ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-green-500/20 text-green-400'
        }`}>
          {badgeText}
        </div>
      </div>

      {/* Multiplier display */}
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${urgencyColor}`}>
          {formatMultiplier(effectiveMultiplier)}
        </span>
        {decayAmount > 0 && (
          <span className="text-sm text-gray-500 line-through">
            {formatMultiplier(baseMultiplier)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {showDetails && isDecaying && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Decay Progress</span>
            <span>{status.progress}%</span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-1000"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Time remaining */}
      {showDetails && !isEnded && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {isDecaying ? 'Time remaining:' : 'Decay starts in:'}
          </span>
          <span className={urgencyColor}>
            {isDecaying 
              ? formatTimeRemaining(status.totalRemaining)
              : formatTimeRemaining(status.timeUntilDecay)
            }
          </span>
        </div>
      )}

      {/* Warning for late phase */}
      {isDecaying && status.progress > 75 && (
        <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400">
            Odds approaching minimum! Bet soon for better returns.
          </span>
        </div>
      )}

      {/* Betting closed warning */}
      {isEnded && (
        <div className="flex items-center gap-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
          <Ban className="w-4 h-4 text-red-400" />
          <span className="text-sm font-medium text-red-400">
            Betting is closed for this market
          </span>
        </div>
      )}
    </div>
  );
};

export default TimeDecayIndicator;
