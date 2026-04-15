/**
 * Admin Dashboard Utility Functions
 *
 * FIX 1: Math.random() in generateVolumeTrendData and generateUserGrowthData.
 *         These are called inside useMemo in DashboardTabV2. Since `stats` and
 *         `markets` are new object refs every 30-second poll, useMemo
 *         recalculates and produces completely different random numbers each
 *         time — charts visibly jump on every auto-refresh.
 *         Fixed by using a simple deterministic seeded approach based on the
 *         actual stats values so chart shape is stable between refreshes.
 *
 * FIX 2: getSystemStatus compared `stats?.contractBalance > BigInt(0)`.
 *         If contractBalance is undefined (before first read), this throws:
 *         "Cannot mix BigInt and other types". Added a safe guard.
 */

import { formatUnits } from 'viem';

// FIX 1: deterministic pseudo-random seeded by a number (no Math.random)
const seededVariation = (seed, index, min, max, intensity = 10000) => {
  const x = Math.sin(seed + index) * intensity;
  const t = x - Math.floor(x); // 0..1
  // Add some secondary harmonics for more 'organic' feel
  const y = Math.cos(seed * 0.5 + index * 1.5) * 5000;
  const t2 = y - Math.floor(y);
  const combined = (t + t2) / 2;
  return min + combined * (max - min);
};

export const generateVolumeTrendData = (stats) => {
  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  const baseVolume = stats?.totalVolume ? stats.totalVolume / 7 : 5000;
  // FIX 1: seed from totalVolume so shape is stable across re-renders
  const seed = stats?.totalVolume ?? 12345;

  return days.map((day, idx) => ({
    name:      day,
    volume:    Math.round(baseVolume * seededVariation(seed, idx, 0.4, 1.8, 15000)),
    timestamp: Date.now() - (7 - idx) * 86400000,
  }));
};

export const generateUserGrowthData = (stats) => {
  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  const baseUsers = stats?.totalUsers ? Math.floor(stats.totalUsers / 7) : 50;
  // FIX 1: seed from totalUsers
  const seed = stats?.totalUsers ?? 99;
  let cumulativeUsers = 0;

  return days.map((day, idx) => {
    const newUsers = Math.max(1, Math.floor(baseUsers + seededVariation(seed, idx, -5, 15)));
    cumulativeUsers += newUsers;
    return { name: day, users: cumulativeUsers, newUsers };
  });
};

export const generateMarketTypeData = (markets) => {
  const types = {
    binary:      markets?.filter(m => m.marketType === 0).length || 0,
    multiChoice: markets?.filter(m => m.marketType === 1).length || 0,
    range:       markets?.filter(m => m.marketType === 2).length || 0,
    time:        markets?.filter(m => m.marketType === 3).length || 0,
  };

  return [
    { name: 'Binary',       value: types.binary,      fill: '#c0ff00' },
    { name: 'Multi-Choice', value: types.multiChoice, fill: '#00FF88' },
    { name: 'Range',        value: types.range,       fill: '#FFA500' },
    { name: 'Time',         value: types.time,        fill: '#00D4FF' },
  ];
};

export const getMarketStatus = (markets, stats) => {
  const now = Date.now();
  const activeMarkets     = markets?.filter(m => !m.resolved && m.endTime > now).length  || 0;
  const resolvedMarkets   = markets?.filter(m => m.resolved).length                      || 0;
  const pendingResolution = markets?.filter(m => !m.resolved && m.endTime <= now).length || 0;

  return {
    activeMarkets,
    resolvedMarkets,
    pendingResolution,
    issues:       pendingResolution,
    totalMarkets: markets?.length || 0,
  };
};

export const generateAlerts = (stats, markets, marketStatus) => {
  const alerts = [];

  if (stats?.pendingFees && BigInt(stats.pendingFees) > BigInt(10_000_000_000)) {
    alerts.push({
      id:        'high-revenue',
      severity:  'info',
      title:     'High Pending Revenue',
      message:   `$${Number(formatUnits(stats.pendingFees, 6)).toFixed(0)} available to withdraw`,
      timestamp: Date.now(),
    });
  }

  if (marketStatus?.pendingResolution > 0) {
    alerts.push({
      id:        'pending-resolution',
      severity:  'critical',
      title:     `${marketStatus.pendingResolution} Markets Pending Resolution`,
      message:   'These markets have ended and need to be resolved',
      timestamp: Date.now(),
    });
  }

  if (stats?.contractBalance && BigInt(stats.contractBalance) < BigInt(50_000_000_000)) {
    alerts.push({
      id:        'low-balance',
      severity:  'warning',
      title:     'Low Contract Balance',
      message:   `Current balance: $${Number(formatUnits(stats.contractBalance, 6)).toFixed(0)}`,
      timestamp: Date.now(),
    });
  }

  if (stats?.totalBets > 100) {
    alerts.push({
      id:        'high-activity',
      severity:  'info',
      title:     'High Platform Activity',
      message:   `${stats.totalBets} total bets placed on platform`,
      timestamp: Date.now(),
    });
  }

  return alerts;
};

export const getSystemStatus = (stats, markets) => {
  // FIX 2: safe BigInt comparison — contractBalance may be undefined on first render
  const balance = stats?.contractBalance;
  const isHealthy = (balance !== undefined && BigInt(balance) > BigInt(0)) &&
                    (stats?.totalBets ?? 0) >= 0;
  const status = isHealthy ? 'healthy' : 'warning';

  return {
    status,
    displayStatus: status === 'healthy' ? 'Operational' : 'Maintenance Required',
    uptime:        '99.9%',
    version:       'v2.1.2-optimized',
    protocolFee:   '2%',
  };
};

export const getPlatformMetrics = (stats, markets) => {
  const marketStatus = getMarketStatus(markets, stats);

  const totalBets = Number(stats?.totalBets || 0);
  const totalVolume = Number(stats?.totalVolume || 0);

  return {
    avgBetSize:   totalBets > 0
      ? (totalVolume / totalBets).toFixed(2)
      : '0.00',
    winRate:      calculateWinRate(stats),
    periodChange: calculatePeriodChange(
      totalBets,
      totalBets > 0 ? Math.max(1, totalBets * 0.75) : 0
    ),
    successRate:  calculateWinRate(stats),
    totalMarkets: marketStatus.totalMarkets,
  };
};

export const calculateWinRate = (stats) => {
  if (!stats?.totalBets || stats.totalBets === 0) return '0.0%';
  const winRate = (((stats.wonBets || 0) / stats.totalBets) * 100).toFixed(1);
  return `${winRate}%`;
};

export const calculatePeriodChange = (current, previous) => {
  const curr = typeof current  === 'bigint' ? Number(current)  : current  || 0;
  const prev = typeof previous === 'bigint' ? Number(previous) : previous || 0;
  if (prev === 0) return curr > 0 ? '+100%' : '0%';
  const change = ((curr - prev) / prev) * 100;
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
};

export const formatTimeString = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const now  = Date.now();
  const time = typeof timestamp === 'string'
    ? new Date(timestamp).getTime()
    : Number(timestamp);
  const diffMs   = now - time;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHrs  = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1)  return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs  < 24) return `${diffHrs}h ago`;
  if (diffDays < 7)  return `${diffDays}d ago`;

  return new Date(time).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

export const generateMockAlertReasons = () => [
  'Markets ending in next hour',
  'Unusual bet volume detected',
  'New user registration spike',
  'Contract gas optimization alert',
  'Protocol update available',
];