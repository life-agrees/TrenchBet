/**
 * Notification Types Configuration
 * Defines all notification types with their properties
 */

export const NOTIFICATION_TYPES = {
  BET_PLACED: {
    id: 'BET_PLACED',
    icon: '🎯',
    priority: 'low',
    title: 'Bet Placed',
  },
  BET_WON: {
    id: 'BET_WON',
    icon: '🎉',
    priority: 'high',
    title: 'Congratulations!',
    animation: 'confetti',
  },
  BET_LOST: {
    id: 'BET_LOST',
    icon: '😔',
    priority: 'medium',
    title: 'Better Luck Next Time',
  },
  MARKET_ENDING: {
    id: 'MARKET_ENDING',
    icon: '⏰',
    priority: 'high',
    title: 'Market Ending Soon',
  },
  REFERRAL_JOINED: {
    id: 'REFERRAL_JOINED',
    icon: '👥',
    priority: 'medium',
    title: 'New Referral',
  },
  POINTS_EARNED: {
    id: 'POINTS_EARNED',
    icon: '⭐',
    priority: 'low',
    title: 'Points Earned',
  },
  ACHIEVEMENT_UNLOCKED: {
    id: 'ACHIEVEMENT_UNLOCKED',
    icon: '🏆',
    priority: 'high',
    title: 'Achievement Unlocked!',
    animation: 'glow',
  },
  AIRDROP_CLAIMABLE: {
    id: 'AIRDROP_CLAIMABLE',
    icon: '🎁',
    priority: 'high',
    title: 'Airdrop Ready!',
  },
  INSURANCE_ACTIVATED: {
    id: 'INSURANCE_ACTIVATED',
    icon: '🛡️',
    priority: 'medium',
    title: 'Insurance Activated',
  },
  CREDIT_AWARDED: {
    id: 'CREDIT_AWARDED',
    icon: '💰',
    priority: 'medium',
    title: 'Bet Credits Awarded',
  },
};

// Market ending reminder times in milliseconds
export const MARKET_ENDING_REMINDERS = [
  { label: '30 minutes', time: 30 * 60 * 1000 },
  { label: '5 minutes', time: 5 * 60 * 1000 },
  { label: '1 minute', time: 60 * 1000 },
];

// Notification priority levels
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: true,
  desktop: true,
  email: false,
  betPlaced: true,
  betWon: true,
  betLost: true,
  marketEnding: true,
  referralJoined: true,
  pointsEarned: true,
  achievementUnlocked: true,
  airdropClaimable: true,
  insuranceActivated: true,
  creditAwarded: true,
};

export default NOTIFICATION_TYPES;
