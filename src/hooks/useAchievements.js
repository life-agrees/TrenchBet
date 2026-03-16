import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { createLogger } from '../utils/logger';
import { CONTRACTS } from '../utils/constants';
import { TRENCHY_ACHIEVEMENTS_ABI } from '../contracts/abis';
import ACHIEVEMENTS_LIST from '../utils/achievementConfig';

const logger = createLogger('useAchievements');

/**
 * useAchievements
 *
 * FIX: Previously used `ACHIEVEMENTS.CONTRACT_ADDRESS` which doesn't exist —
 * the `ACHIEVEMENTS` export from constants.js only contains numeric IDs and
 * points values. `address: undefined` caused all `useReadContract` calls to
 * silently do nothing — users never saw their achievements.
 *
 * Fix: Use `CONTRACTS.ACHIEVEMENTS` which is the correct address constant
 * (set from VITE_ACHIEVEMENTS_CONTRACT_ADDRESS env var).
 */
export const useAchievements = () => {
  const { address, isConnected } = useAccount();
  const [userAchievements, setUserAchievements] = useState([]);
  const [totalPoints, setTotalPoints]           = useState(0);
  const [isLoading, setIsLoading]               = useState(false);
  const [error, setError]                       = useState(null);

  // FIX: CONTRACTS.ACHIEVEMENTS (correct) instead of ACHIEVEMENTS.CONTRACT_ADDRESS (undefined)
  const contractAddress = CONTRACTS.ACHIEVEMENTS;

  const { data: achievementsData, refetch } = useReadContract({
    address:      contractAddress,
    abi:          TRENCHY_ACHIEVEMENTS_ABI,
    functionName: 'getUserAchievements',
    args:         address ? [address] : undefined,
    enabled:      isConnected && !!address && !!contractAddress,
  });

  const { data: pointsData } = useReadContract({
    address:      contractAddress,
    abi:          TRENCHY_ACHIEVEMENTS_ABI,
    functionName: 'totalAchievementPoints',
    args:         address ? [address] : undefined,
    enabled:      isConnected && !!address && !!contractAddress,
  });

  const { data: countData } = useReadContract({
    address:      contractAddress,
    abi:          TRENCHY_ACHIEVEMENTS_ABI,
    functionName: 'achievementCount',
    args:         address ? [address] : undefined,
    enabled:      isConnected && !!address && !!contractAddress,
  });

  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    if (!achievementsData) return;
    const unlocked = achievementsData
      .map((has, index) => has && ACHIEVEMENTS_LIST[index] ? { ...ACHIEVEMENTS_LIST[index], unlockedAt: null } : null)
      .filter(Boolean);
    setUserAchievements(unlocked);
  }, [achievementsData]);

  useEffect(() => {
    if (pointsData !== undefined) setTotalPoints(Number(pointsData));
  }, [pointsData]);

  const hasAchievement = useCallback((achievementId) => {
    const index = ACHIEVEMENTS_LIST.findIndex(a => a.id === achievementId);
    if (index === -1 || !achievementsData) return false;
    return achievementsData[index];
  }, [achievementsData]);

  const getAchievementProgress = useCallback((achievementId, stats) => {
    const achievement = ACHIEVEMENTS_LIST.find(a => a.id === achievementId);
    if (!achievement) return 0;
    if (hasAchievement(achievementId)) return 100;
    try {
      return achievement.condition(stats) ? 100 : 0;
    } catch {
      return 0;
    }
  }, [hasAchievement]);

  const getAllAchievementsWithProgress = useCallback((stats) => {
    return ACHIEVEMENTS_LIST.map(achievement => ({
      ...achievement,
      unlocked: hasAchievement(achievement.id),
      progress: getAchievementProgress(achievement.id, stats),
    }));
  }, [hasAchievement, getAchievementProgress]);

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

  const shareAchievement = useCallback((achievement) => {
    const text = `I just unlocked 🏆 ${achievement.name} on @TrenchyBet! ${achievement.description}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  }, []);

  const getRarityStats = useCallback(() => {
    const stats = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
    userAchievements.forEach(a => { if (stats[a.rarity] !== undefined) stats[a.rarity]++; });
    return stats;
  }, [userAchievements]);

  const getNextAchievement = useCallback((stats) => {
    const locked = ACHIEVEMENTS_LIST.filter(a => !hasAchievement(a.id));
    if (!locked.length) return null;
    return locked
      .map(a => ({ ...a, progress: getAchievementProgress(a.id, stats) }))
      .sort((a, b) => b.progress - a.progress)[0];
  }, [hasAchievement, getAchievementProgress]);

  return {
    achievements:                userAchievements,
    totalPoints,
    achievementCount:            countData ? Number(countData) : 0,
    isLoading,
    error,
    refresh,
    hasAchievement,
    getAchievementProgress,
    getAllAchievementsWithProgress,
    shareAchievement,
    getRarityStats,
    getNextAchievement,
    allAchievements:             ACHIEVEMENTS_LIST,
  };
};

export default useAchievements;