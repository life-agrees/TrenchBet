/**
 * Achievement Configuration
 * Defines all achievements with their properties
 */

export const ACHIEVEMENTS_LIST = [
  {
    id: 'FIRST_BET',
    name: 'First Bet',
    description: 'Place your first bet',
    icon: '🎯',
    points: 50,
    rarity: 'common',
    condition: (stats) => stats.totalBets >= 1,
  },
  {
    id: 'WIN_STREAK_3',
    name: 'Hot Streak',
    description: 'Win 3 bets in a row',
    icon: '🔥',
    points: 100,
    rarity: 'uncommon',
    condition: (stats) => stats.currentStreak >= 3,
  },
  {
    id: 'WIN_STREAK_5',
    name: 'On Fire',
    description: 'Win 5 bets in a row',
    icon: '💥',
    points: 200,
    rarity: 'rare',
    condition: (stats) => stats.currentStreak >= 5,
  },
  {
    id: 'WHALE',
    name: 'Whale',
    description: 'Place a bet of $1000 or more',
    icon: '🐋',
    points: 150,
    rarity: 'epic',
    condition: (stats) => stats.largestBet >= 1000,
  },
  {
    id: 'SHARPSHOOTER',
    name: 'Sharpshooter',
    description: 'Achieve 80% win rate over 20+ bets',
    icon: '🎯',
    points: 300,
    rarity: 'legendary',
    condition: (stats) => stats.totalBets >= 20 && stats.winRate >= 80,
  },
  {
    id: 'EARLY_BIRD',
    name: 'Early Bird',
    description: 'Place a bet within the first 60 seconds of a market',
    icon: '🐦',
    points: 50,
    rarity: 'common',
    condition: (stats) => stats.earlyBets >= 1,
  },
  {
    id: 'SPEED_DEMON',
    name: 'Speed Demon',
    description: 'Place 10 bets in a single day',
    icon: '⚡',
    points: 100,
    rarity: 'uncommon',
    condition: (stats) => stats.betsInADay >= 10,
  },
  {
    id: 'SOCIAL_BUTTERFLY',
    name: 'Social Butterfly',
    description: 'Refer 5 friends who place bets',
    icon: '🦋',
    points: 150,
    rarity: 'epic',
    condition: (stats) => stats.referralCount >= 5,
  },
  {
    id: 'DIAMOND_HANDS',
    name: 'Diamond Hands',
    description: 'Hold locked TRENCHY for 30 days',
    icon: '💎',
    points: 250,
    rarity: 'epic',
    condition: (stats) => stats.stakedDuration >= 30,
  },
  {
    id: 'ORACLE',
    name: 'Oracle',
    description: 'Correctly predict 10 markets',
    icon: '🔮',
    points: 500,
    rarity: 'legendary',
    condition: (stats) => stats.totalWins >= 10,
  },
  {
    id: 'TRENDSETTER',
    name: 'Trendsetter',
    description: 'Be the first to bet on a market',
    icon: '🌟',
    points: 75,
    rarity: 'uncommon',
    condition: (stats) => stats.firstBettorCount >= 1,
  },
  {
    id: 'FOUNDER',
    name: 'Founder',
    description: 'Claim airdrop during launch',
    icon: '🚀',
    points: 1000,
    rarity: 'legendary',
    condition: (stats) => stats.hasClaimedAirdrop === true,
  },
];

// Rarity colors
export const RARITY_COLORS = {
  common: '#9CA3AF',    // Gray
  uncommon: '#22C55E',  // Green
  rare: '#3B82F6',      // Blue
  epic: '#A855F7',      // Purple
  legendary: '#F59E0B', // Gold
};

// Get achievement by ID
export const getAchievementById = (id) => {
  return ACHIEVEMENTS_LIST.find(a => a.id === id);
};

// Get achievements by rarity
export const getAchievementsByRarity = (rarity) => {
  return ACHIEVEMENTS_LIST.filter(a => a.rarity === rarity);
};

// Get total possible points
export const getTotalPossiblePoints = () => {
  return ACHIEVEMENTS_LIST.reduce((sum, a) => sum + a.points, 0);
};

export default ACHIEVEMENTS_LIST;
