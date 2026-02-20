/**
 * Achievement Service
 * Handles achievement-related API calls and data processing
 */

import { createLogger } from '../utils/logger';
import { ACHIEVEMENTS } from '../utils/constants';

const logger = createLogger('AchievementService');

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Check achievements for a user
 * @param {string} address - The wallet address
 * @returns {Promise<Object>} Achievement check results
 */
export const checkAchievements = async (address) => {
  try {
    const response = await fetch(`${API_BASE_URL}/achievements/check?address=${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info('Achievements checked', data);
    return data;
  } catch (error) {
    logger.error('Error checking achievements:', error);
    throw error;
  }
};

/**
 * Get achievement list for a user
 * @param {string} address - The wallet address
 * @returns {Promise<Object>} Achievement list and stats
 */
export const getAchievements = async (address) => {
  try {
    const response = await fetch(`${API_BASE_URL}/achievements/list?address=${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info('Achievements fetched', { count: data.achievements?.length || 0 });
    return data;
  } catch (error) {
    logger.error('Error fetching achievements:', error);
    throw error;
  }
};

/**
 * Get achievement name from ID
 * @param {number} achievementId - The achievement ID
 * @returns {string} Achievement name
 */
export const getAchievementName = (achievementId) => {
  const names = {
    [ACHIEVEMENTS.FIRST_BET]: 'First Bet',
    [ACHIEVEMENTS.WIN_STREAK_3]: 'Win Streak 3',
    [ACHIEVEMENTS.WIN_STREAK_5]: 'Win Streak 5',
    [ACHIEVEMENTS.WHALE]: 'Whale',
    [ACHIEVEMENTS.SHARPSHOOTER]: 'Sharpshooter',
    [ACHIEVEMENTS.EARLY_BIRD]: 'Early Bird',
    [ACHIEVEMENTS.SPEED_DEMON]: 'Speed Demon',
    [ACHIEVEMENTS.SOCIAL_BUTTERFLY]: 'Social Butterfly',
    [ACHIEVEMENTS.DIAMOND_HANDS]: 'Diamond Hands',
    [ACHIEVEMENTS.ORACLE]: 'Oracle',
    [ACHIEVEMENTS.TRENDSETTER]: 'Trendsetter',
    [ACHIEVEMENTS.FOUNDER]: 'Founder',
  };
  
  return names[achievementId] || 'Unknown Achievement';
};

/**
 * Get achievement description
 * @param {number} achievementId - The achievement ID
 * @returns {string} Achievement description
 */
export const getAchievementDescription = (achievementId) => {
  const descriptions = {
    [ACHIEVEMENTS.FIRST_BET]: 'Place your first bet on any market',
    [ACHIEVEMENTS.WIN_STREAK_3]: 'Win 3 bets in a row',
    [ACHIEVEMENTS.WIN_STREAK_5]: 'Win 5 bets in a row',
    [ACHIEVEMENTS.WHALE]: 'Place a bet of $1,000 or more',
    [ACHIEVEMENTS.SHARPSHOOTER]: 'Achieve 80% win rate over 20 bets',
    [ACHIEVEMENTS.EARLY_BIRD]: 'Place a bet within the first 60 seconds of market creation',
    [ACHIEVEMENTS.SPEED_DEMON]: 'Place 10 bets in a single day',
    [ACHIEVEMENTS.SOCIAL_BUTTERFLY]: 'Refer 5 friends to TrenchyBet',
    [ACHIEVEMENTS.DIAMOND_HANDS]: 'Hold locked TRENCHY tokens for 30 days',
    [ACHIEVEMENTS.ORACLE]: 'Correctly predict 10 markets',
    [ACHIEVEMENTS.TRENDSETTER]: 'Be the first to bet on a market',
    [ACHIEVEMENTS.FOUNDER]: 'Be among the first 1000 users to claim the airdrop',
  };
  
  return descriptions[achievementId] || 'Complete this achievement to earn points!';
};

/**
 * Get achievement icon
 * @param {number} achievementId - The achievement ID
 * @returns {string} Achievement icon emoji
 */
export const getAchievementIcon = (achievementId) => {
  const icons = {
    [ACHIEVEMENTS.FIRST_BET]: '🎯',
    [ACHIEVEMENTS.WIN_STREAK_3]: '🔥',
    [ACHIEVEMENTS.WIN_STREAK_5]: '🏆',
    [ACHIEVEMENTS.WHALE]: '🐋',
    [ACHIEVEMENTS.SHARPSHOOTER]: '🎯',
    [ACHIEVEMENTS.EARLY_BIRD]: '🐦',
    [ACHIEVEMENTS.SPEED_DEMON]: '⚡',
    [ACHIEVEMENTS.SOCIAL_BUTTERFLY]: '🦋',
    [ACHIEVEMENTS.DIAMOND_HANDS]: '💎',
    [ACHIEVEMENTS.ORACLE]: '🔮',
    [ACHIEVEMENTS.TRENDSETTER]: '👑',
    [ACHIEVEMENTS.FOUNDER]: '🚀',
  };
  
  return icons[achievementId] || '🏅';
};

/**
 * Get achievement color
 * @param {number} achievementId - The achievement ID
 * @returns {string} Tailwind color class
 */
export const getAchievementColor = (achievementId) => {
  const colors = {
    [ACHIEVEMENTS.FIRST_BET]: 'bg-blue-500',
    [ACHIEVEMENTS.WIN_STREAK_3]: 'bg-orange-500',
    [ACHIEVEMENTS.WIN_STREAK_5]: 'bg-yellow-500',
    [ACHIEVEMENTS.WHALE]: 'bg-purple-500',
    [ACHIEVEMENTS.SHARPSHOOTER]: 'bg-red-500',
    [ACHIEVEMENTS.EARLY_BIRD]: 'bg-green-500',
    [ACHIEVEMENTS.SPEED_DEMON]: 'bg-pink-500',
    [ACHIEVEMENTS.SOCIAL_BUTTERFLY]: 'bg-indigo-500',
    [ACHIEVEMENTS.DIAMOND_HANDS]: 'bg-cyan-500',
    [ACHIEVEMENTS.ORACLE]: 'bg-amber-500',
    [ACHIEVEMENTS.TRENDSETTER]: 'bg-rose-500',
    [ACHIEVEMENTS.FOUNDER]: 'bg-emerald-500',
  };
  
  return colors[achievementId] || 'bg-gray-500';
};

/**
 * Get achievement points
 * @param {number} achievementId - The achievement ID
 * @returns {number} Points awarded
 */
export const getAchievementPoints = (achievementId) => {
  return ACHIEVEMENTS.POINTS[achievementId] || 0;
};

/**
 * Share achievement on Twitter
 * @param {number} achievementId - The achievement ID
 * @param {string} username - User's Twitter handle (optional)
 */
export const shareAchievementOnTwitter = (achievementId, username = '') => {
  const name = getAchievementName(achievementId);
  const icon = getAchievementIcon(achievementId);
  const points = getAchievementPoints(achievementId);
  
  const text = `I just unlocked ${icon} ${name} on @TrenchyBet and earned ${points} points! ${username ? `Come join me ${username}!` : ''}`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};
