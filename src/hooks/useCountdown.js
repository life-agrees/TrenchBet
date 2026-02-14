import { useState, useEffect } from 'react';

/**
 * Hook for live countdown timer
 * Updates every second until expiration
 */
export function useCountdown(endTime) {
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(endTime));

  useEffect(() => {
    // Initial calculation
    setTimeRemaining(calculateTimeRemaining(endTime));

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(endTime);
      setTimeRemaining(remaining);

      // Stop updating if expired
      if (remaining.total <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return timeRemaining;
}

/**
 * Calculate time remaining from timestamp
 */
function calculateTimeRemaining(endTime) {
  const now = Date.now();
  const total = Math.max(0, endTime - now);
  
  if (total <= 0) {
    return { 
      days: 0, 
      hours: 0, 
      minutes: 0, 
      seconds: 0, 
      total: 0, 
      expired: true,
      formatted: 'Expired'
    };
  }
  
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((total % (1000 * 60)) / 1000);

  // Format for display
  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s`;
  } else {
    formatted = `${seconds}s`;
  }

  return { 
    days, 
    hours, 
    minutes, 
    seconds, 
    total, 
    expired: false,
    formatted
  };
}

/**
 * Get urgency level based on time remaining
 */
export function getUrgency(timeRemaining) {
  if (timeRemaining.expired) {
    return { level: 'expired', color: 'text-gray-500', bgColor: 'bg-gray-500/20' };
  }

  const { total } = timeRemaining;
  const minutes = total / (1000 * 60);

  if (minutes < 5) {
    return { 
      level: 'critical', 
      color: 'text-red-400', 
      bgColor: 'bg-red-500/20',
      pulse: true,
      label: '🔴 CLOSING NOW'
    };
  }

  if (minutes < 30) {
    return { 
      level: 'high', 
      color: 'text-orange-400', 
      bgColor: 'bg-orange-500/20',
      pulse: true,
      label: '⚠️ LAST MINUTES'
    };
  }

  const hours = total / (1000 * 60 * 60);
  
  if (hours < 1) {
    return { 
      level: 'medium', 
      color: 'text-yellow-400', 
      bgColor: 'bg-yellow-500/20',
      label: '⏰ <1 HOUR'
    };
  }

  if (hours < 6) {
    return { 
      level: 'low', 
      color: 'text-blue-400', 
      bgColor: 'bg-blue-500/20'
    };
  }

  return { 
    level: 'normal', 
    color: 'text-green-400', 
    bgColor: 'bg-green-500/20'
  };
}

export default useCountdown;