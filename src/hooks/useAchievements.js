import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { createLogger } from '../utils/logger';
import { ACHIEVEMENTS } from '../utils/constants';
import { TRENCHY_ACHIEVEMENTS_ABI } from '../contracts/abis';
import ACHIEVEMENTS_LIST from '../utils/achievementConfig';

const logger = createLogger('useAchievements');

/**
 * Hook for managing achievements
 */
export const useAchievements = () => {
  const { address, isConnected } = useAccount();
  const [userAchievements, setUserAchievements] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Read user's achievements from contract
  const { data: achievementsData, refetch } = useReadContract({
    address: ACHIEVEMENTS.CONTRACT_ADDRESS,
    abi: TRENCHY_ACHIEVEMENTS_ABI,
    functionName: 'getUserAchievements',
    args: address ? [address] : undefined,
    enabled: isConnected && !!address,
  });

  // Read total points
  const { data: pointsData } = useReadContract({
    address: ACHIEVEMENTS.CONTRACT_ADDRESS,
    abi: TRENCHY_ACHIEVEMENTS_ABI,
    functionName: 'totalAchievementPoints',
    args: address ? [address] : undefined,
    enabled: isConnected && !!address,
  });

  // Read achievement count
  const { data: countData } = useReadContract({
    address: ACHIEVEMENTS.CONTRACT_ADDRESS,
    abi: TRENCHY_ACHIEVEMENTS_ABI,
    functionName: 'achievementCount',
    args: address ? [address] : undefined,
    enabled: isConnected && !!address,
  });

  // Write contract for admin functions
  const { writeContractAsync } = useWriteContract();

  // Process achievements data
  useEffect(() => {
    if (achievementsData) {
      const unlocked = [];
      achievementsData.forEach((hasAchievement, index) => {
        if (hasAchievement && ACHIEVEMENTS_LIST[index]) {
          unlocked.push({
            ...ACHIEVEMENTS_LIST[index],
            unlockedAt: null, // Could be fetched from events
          });
        }
      });
      setUserAchievements(unlocked);
    }
  }, [achievementsData]);

  // Update total points
  useEffect(() => {
    if (pointsData) {
      setTotalPoints(Number(pointsData));
    }
  }, [pointsData]);

  // Check if user has specific achievement
  const hasAchievement = useCallback((achievementId) => {
    const index = ACHIEVEMENTS_LIST.findIndex(a => a.id === achievementId);
    if (index === -1 || !achievementsData) return false;
    return achievementsData[index];
  }, [achievementsData]);

  // Get achievement progress
  const getAchievementProgress = useCallback((achievementId, stats) => {
    const achievement = ACHIEVEMENTS_LIST.find(a => a.id === achievementId);
    if (!achievement) return 0;
    
    // If already unlocked, return 100
    if (hasAchievement(achievementId)) return 100;
    
    // Calculate progress based on condition
    // This is a simplified version - real implementation would need more sophisticated logic
    try {
      const isComplete = achievement.condition(stats);
      return isComplete ? 100 : 0;
    } catch (e) {
      return 0;
    }
  }, [hasAchievement]);

  // Get all achievements with progress
  const getAllAchievementsWithProgress = useCallback((stats) => {
    return ACHIEVEMENTS_LIST.map(achievement => ({
      ...achievement,
      unlocked: hasAchievement(achievement.id),
      progress: getAchievementProgress(achievement.id, stats),
    }));
  }, [hasAchievement, getAchievementProgress]);

  // Refresh achievements
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await refetch();
      logger.info('Achievements refreshed');
    } catch (err) {
      logger.error('Error refreshing achievements:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [refetch]);

  // Share achievement to Twitter
  const shareAchievement = useCallback((achievement) => {
    const text = `I just unlocked 🏆 ${achievement.name} on @TrenchyBet! ${achievement.description}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }, []);

  // Calculate rarity stats
  const getRarityStats = useCallback(() => {
    const stats = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };
    
    userAchievements.forEach(achievement => {
      if (stats[achievement.rarity] !== undefined) {
        stats[achievement.rarity]++;
      }
    });
    
    return stats;
  }, [userAchievements]);

  // Get next achievement to unlock
  const getNextAchievement = useCallback((stats) => {
    const locked = ACHIEVEMENTS_LIST.filter(a => !hasAchievement(a.id));
    if (locked.length === 0) return null;
    
    // Sort by progress (descending)
    return locked
      .map(a => ({
        ...a,
        progress: getAchievementProgress(a.id, stats),
      }))
      .sort((a, b) => b.progress - a.progress)[0];
  }, [hasAchievement, getAchievementProgress]);

  return {
    // State
    achievements: userAchievements,
    totalPoints,
    achievementCount: countData ? Number(countData) : 0,
    isLoading,
    error,
    
    // Actions
    refresh,
    hasAchievement,
    getAchievementProgress,
    getAllAchievementsWithProgress,
    shareAchievement,
    getRarityStats,
    getNextAchievement,
    
    // Constants
    allAchievements: ACHIEVEMENTS_LIST,
  };
};

export default useAchievements;
