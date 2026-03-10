/**
 * Admin Dashboard Utility Functions
 * Generates mock data and analytics for the admin dashboard
 */

import { formatUnits } from 'viem';

export const generateVolumeTrendData = (stats) => {
  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  const baseVolume = stats?.totalVolume ? stats.totalVolume / 7 : 5000;
  
  return days.map((day, idx) => ({
    name: day,
    volume: Math.round(baseVolume * (0.8 + Math.random() * 0.6)),
    timestamp: Date.now() - (7 - idx) * 86400000
  }));
};

export const generateUserGrowthData = (stats) => {
  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  const baseUsers = stats?.totalUsers ? Math.floor(stats.totalUsers / 7) : 50;
  let cumulativeUsers = 0;
  
  return days.map((day) => {
    cumulativeUsers += Math.max(1, Math.floor(baseUsers + (Math.random() * 15 - 5)));
    return {
      name: day,
      users: cumulativeUsers,
      newUsers: Math.max(1, Math.floor(baseUsers + (Math.random() * 15 - 5)))
    };
  });
};

export const generateMarketTypeData = (markets) => {
  const types = {
    binary: markets?.filter(m => m.marketType === 0).length || 0,
    multiChoice: markets?.filter(m => m.marketType === 1).length || 0,
    range: markets?.filter(m => m.marketType === 2).length || 0,
    time: markets?.filter(m => m.marketType === 3).length || 0
  };

  return [
    { name: 'Binary', value: types.binary, fill: '#c0ff00' },
    { name: 'Multi-Choice', value: types.multiChoice, fill: '#00FF88' },
    { name: 'Range', value: types.range, fill: '#FFA500' },
    { name: 'Time', value: types.time, fill: '#00D4FF' }
  ];
};

export const getMarketStatus = (markets, stats) => {
  const activeMarkets = markets?.filter(m => !m.resolved && m.endTime > Date.now()).length || 0;
  const resolvedMarkets = markets?.filter(m => m.resolved).length || 0;
  const pendingResolution = markets?.filter(m => !m.resolved && m.endTime <= Date.now()).length || 0;
  const issues = pendingResolution; // Markets needing resolution

  return {
    activeMarkets,
    resolvedMarkets,
    pendingResolution,
    issues,
    totalMarkets: markets?.length || 0
  };
};

export const generateAlerts = (stats, markets, marketStatus) => {
  const alerts = [];

  // Alert 1: High pending revenue
  if (stats?.pendingFees && BigInt(stats.pendingFees) > BigInt(10000000000)) { // > $10k
    alerts.push({
      id: 'high-revenue',
      severity: 'info',
      title: 'High Pending Revenue',
      message: `$${(Number(formatUnits(stats.pendingFees, 6))).toFixed(0)} available to withdraw`,
      timestamp: Date.now()
    });
  }

  // Alert 2: Markets pending resolution
  if (marketStatus?.pendingResolution > 0) {
    alerts.push({
      id: 'pending-resolution',
      severity: 'critical',
      title: `${marketStatus.pendingResolution} Markets Pending Resolution`,
      message: 'These markets have ended and need to be resolved',
      timestamp: Date.now()
    });
  }

  // Alert 3: Low contract balance
  if (stats?.contractBalance && BigInt(stats.contractBalance) < BigInt(50000000000)) { // < $50k
    alerts.push({
      id: 'low-balance',
      severity: 'warning',
      title: 'Low Contract Balance',
      message: `Current balance: $${(Number(formatUnits(stats.contractBalance, 6))).toFixed(0)}`,
      timestamp: Date.now()
    });
  }

  // Alert 4: High activity
  if (stats?.totalBets > 100) {
    alerts.push({
      id: 'high-activity',
      severity: 'info',
      title: 'High Platform Activity',
      message: `${stats.totalBets} total bets placed on platform`,
      timestamp: Date.now()
    });
  }

  return alerts;
};

export const getSystemStatus = (stats, markets) => {
  const isHealthy = stats?.contractBalance > BigInt(0) && stats?.totalBets >= 0;
  const status = isHealthy ? 'healthy' : 'warning';
  
  return {
    status,
    displayStatus: status === 'healthy' ? 'Operational' : 'Warning',
    uptime: '99.9%',
    version: 'v2.1.0',
    protocolFee: '2%'
  };
};

export const getPlatformMetrics = (stats, markets) => {
  const marketStatus = getMarketStatus(markets, stats);
  
  return {
    avgBetSize: stats?.totalBets > 0 ? (stats.totalVolume / stats.totalBets).toFixed(2) : 0,
    
    // Use real calculation based on actual bet outcomes
    winRate: calculateWinRate(stats),
    
    // For period change, compare totalBets growth (can be extended with historical snapshots)
    // Current implementation shows growth vs baseline
    periodChange: calculatePeriodChange(
      stats?.totalBets || 0, 
      stats?.totalBets ? Math.max(1, (stats.totalBets * 0.75)) : 1 // Rough 75% baseline
    ),
    
    // Success rate same as win rate (percentage of successful bets)
    successRate: calculateWinRate(stats),
    
    totalMarkets: marketStatus.totalMarkets
  };
};

/**
 * Calculate win rate from actual bet outcomes
 * @param {Object} stats - Admin stats object with wonBets and totalBets
 * @returns {string} Win rate percentage (e.g., "47.2%")
 */
export const calculateWinRate = (stats) => {
  if (!stats || !stats.totalBets || stats.totalBets === 0) {
    return '0.0%';
  }
  
  const wonBets = stats.wonBets || 0;
  const winRate = ((wonBets / stats.totalBets) * 100).toFixed(1);
  return `${winRate}%`;
};

/**
 * Calculate period change from two snapshots
 * Compares current volume/users with previous period
 * @param {bigint|number} current - Current period total
 * @param {bigint|number} previous - Previous period total
 * @returns {string} Change percentage with sign (e.g., "+18.5%" or "-5.2%")
 */
export const calculatePeriodChange = (current, previous) => {
  const curr = typeof current === 'bigint' ? Number(current) : current || 0;
  const prev = typeof previous === 'bigint' ? Number(previous) : previous || 0;
  
  if (prev === 0) {
    if (curr > 0) return '+100%';
    return '0%';
  }
  
  const change = ((curr - prev) / prev) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
};

export const formatTimeString = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  const now = Date.now();
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : Number(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // For older timestamps, show the date
  const date = new Date(time);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const generateMockAlertReasons = () => {
  return [
    'Markets ending in next hour',
    'Unusual bet volume detected',
    'New user registration spike',
    'Contract gas optimization alert',
    'Protocol update available'
  ];
};
