import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  calculateTimeDecayedMultiplier, 
  getDecayPhase, 
  formatDecayDisplay,
  getEffectiveMultiplierDisplay 
} from '../marketUtils';
import { createLogger } from '../utils/logger';

const logger = createLogger('useTimeDecay');

/**
 * Hook to track time-decaying odds for a market
 * @param {Object} market - Market object with decay configuration
 * @returns {Object} Decay state and helper functions
 */
export function useTimeDecay(market) {
  // Use milliseconds consistently (matching market.startTime, endTime, decayStartTime)
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate decay phase
  const decayPhase = useMemo(() => {
    if (!market || !market.useTimeDecay) {
      return { phase: 'no_decay', progress: 0, isDecaying: false };
    }
    return getDecayPhase(market, currentTime);
  }, [market, currentTime]);
  
  // Format decay for display
  const decayDisplay = useMemo(() => {
    return formatDecayDisplay(decayPhase);
  }, [decayPhase]);
  
  // Calculate effective multiplier for a specific choice
  const getEffectiveMultiplier = useCallback((choice) => {
    if (!market) return 2.0;
    return getEffectiveMultiplierDisplay(market, choice, currentTime);
  }, [market, currentTime]);
  
  // Calculate decayed multiplier in basis points (for precise calculations)
  const getDecayedMultiplierBasisPoints = useCallback((baseMultiplier) => {
    if (!market || !baseMultiplier) return baseMultiplier;
    return calculateTimeDecayedMultiplier(market, baseMultiplier, currentTime);
  }, [market, currentTime]);
  
  // Check if market is in late phase (high decay)
  const isLatePhase = useMemo(() => {
    return decayPhase.phase === 'decaying' && decayPhase.progress > 75;
  }, [decayPhase]);
  
  // Check if decay is active
  const isDecaying = useMemo(() => {
    return decayPhase.isDecaying;
  }, [decayPhase]);
  
  // Get time until decay starts (in milliseconds)
  const timeUntilDecay = useMemo(() => {
    if (!market || !market.useTimeDecay) return 0;
    return Math.max(0, market.decayStartTime - currentTime);
  }, [market, currentTime]);
  
  // Format time until decay for display
  const timeUntilDecayDisplay = useMemo(() => {
    const ms = timeUntilDecay;
    if (ms <= 0) return '';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    
    if (minutes > 0) {
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    
    return `${seconds}s`;
  }, [timeUntilDecay]);
  
  // Get countdown to next odds drop
  const getOddsDropCountdown = useCallback((baseMultiplier, nextThreshold = 10) => {
    if (!market || !market.useTimeDecay || decayPhase.phase !== 'decaying') {
      return null;
    }
    
    const currentMultiplier = calculateTimeDecayedMultiplier(market, baseMultiplier, currentTime);
    const minMultiplier = market.minMultiplier || 120;
    
    // Calculate what the multiplier will be at next threshold
    // All times are now in milliseconds
    const decayDuration = market.endTime - market.decayStartTime;
    const timeElapsed = currentTime - market.decayStartTime;
    const currentProgress = timeElapsed / decayDuration;
    
    // Find next threshold
    const nextProgress = Math.ceil(currentProgress * (100 / nextThreshold)) * (nextThreshold / 100);
    const targetTime = market.decayStartTime + (decayDuration * nextProgress);
    const msUntil = Math.max(0, targetTime - currentTime);
    
    if (msUntil <= 0) return null;
    
    const secondsUntil = Math.floor(msUntil / 1000);
    const minutes = Math.floor(secondsUntil / 60);
    const hours = Math.floor(minutes / 60);
    
    // Calculate multiplier at that time
    const futureMultiplier = calculateTimeDecayedMultiplier(market, baseMultiplier, targetTime);
    
    return {
      secondsUntil,
      display: hours > 0 ? `${hours}h ${minutes % 60}m` : minutes > 0 ? `${minutes}m` : `${secondsUntil}s`,
      currentMultiplier: (currentMultiplier / 100).toFixed(2),
      futureMultiplier: (futureMultiplier / 100).toFixed(2),
      progress: Math.round(nextProgress * 100)
    };
  }, [market, currentTime, decayPhase.phase]);
  
  return {
    // State
    currentTime,
    decayPhase,
    decayDisplay,
    isLatePhase,
    isDecaying,
    timeUntilDecay,
    timeUntilDecayDisplay,
    
    // Functions
    getEffectiveMultiplier,
    getDecayedMultiplierBasisPoints,
    getOddsDropCountdown,
    
    // Raw values for advanced use
    raw: {
      decayStartTime: market?.decayStartTime,
      endTime: market?.endTime,
      minMultiplier: market?.minMultiplier,
      useTimeDecay: market?.useTimeDecay
    }
  };
}

/**
 * Hook to track multiple markets' decay status
 * @param {Array} markets - Array of market objects
 * @returns {Object} Map of market IDs to decay states
 */
export function useMultipleTimeDecays(markets) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const decayStates = useMemo(() => {
    const states = {};
    
    if (!markets || !Array.isArray(markets)) return states;
    
    markets.forEach(market => {
      if (!market || !market.id) return;
      
      const phase = market.useTimeDecay 
        ? getDecayPhase(market, currentTime)
        : { phase: 'no_decay', isDecaying: false };
      
      states[market.id] = {
        phase,
        display: formatDecayDisplay(phase),
        isDecaying: phase.isDecaying,
        isLatePhase: phase.phase === 'decaying' && phase.progress > 75
      };
    });
    
    return states;
  }, [markets, currentTime]);
  
  return decayStates;
}

export default useTimeDecay;
