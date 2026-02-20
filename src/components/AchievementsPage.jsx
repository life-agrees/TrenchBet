import React, { useState, useMemo } from 'react';
import { Trophy, Share2, Lock, CheckCircle, TrendingUp, Users, Target, Zap, Award } from 'lucide-react';
import useAchievements from '../hooks/useAchievements';
import { RARITY_COLORS } from '../utils/achievementConfig';
import { useAccount } from 'wagmi';

/**
 * AchievementsPage Component
 * Displays all achievements with progress bars and unlock status
 */
const AchievementsPage = () => {
  const { address, isConnected } = useAccount();
  const {
    achievements,
    totalPoints,
    achievementCount,
    isLoading,
    getAllAchievementsWithProgress,
    shareAchievement,
    getRarityStats,
  } = useAchievements();

  const [filter, setFilter] = useState('all');
  const [showShareModal, setShowShareModal] = useState(null);

  // Mock stats for progress calculation (would come from real data)
  const mockStats = {
    totalBets: 5,
    currentStreak: 2,
    largestBet: 500,
    winRate: 60,
    earlyBets: 1,
    betsInADay: 3,
    referralCount: 2,
    stakedDuration: 15,
    totalWins: 3,
    firstBettorCount: 0,
    hasClaimedAirdrop: false,
  };

  const allAchievements = useMemo(() => {
    return getAllAchievementsWithProgress(mockStats);
  }, [getAllAchievementsWithProgress, mockStats]);

  const filteredAchievements = useMemo(() => {
    if (filter === 'all') return allAchievements;
    if (filter === 'unlocked') return allAchievements.filter(a => a.unlocked);
    if (filter === 'locked') return allAchievements.filter(a => !a.unlocked);
    return allAchievements.filter(a => a.rarity === filter);
  }, [allAchievements, filter]);

  const rarityStats = getRarityStats();

  const getRarityIcon = (rarity) => {
    switch (rarity) {
      case 'common': return <Target size={16} />;
      case 'uncommon': return <Zap size={16} />;
      case 'rare': return <Trophy size={16} />;
      case 'epic': return <Award size={16} />;
      case 'legendary': return <Trophy size={16} className="text-yellow-400" />;
      default: return <Target size={16} />;
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-neutral-500">
        <Trophy size={64} className="mb-4 opacity-30" />
        <h2 className="text-2xl font-bold mb-2">Connect Wallet</h2>
        <p>Connect your wallet to view your achievements</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <Trophy className="text-yellow-400" size={40} />
          Achievements
        </h1>
        <p className="text-neutral-400">Unlock badges and earn points for your betting activity</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <div className="text-3xl font-bold text-primary mb-1">{achievementCount}</div>
          <div className="text-sm text-neutral-400">Unlocked</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <div className="text-3xl font-bold text-secondary mb-1">{totalPoints}</div>
          <div className="text-sm text-neutral-400">Total Points</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <div className="text-3xl font-bold text-accent mb-1">
            {Math.round((achievementCount / allAchievements.length) * 100)}%
          </div>
          <div className="text-sm text-neutral-400">Completion</div>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <div className="text-3xl font-bold text-white mb-1">
            #{allAchievements.filter(a => a.unlocked).length > 0 ? '—' : '—'}
          </div>
          <div className="text-sm text-neutral-400">Global Rank</div>
        </div>
      </div>

      {/* Rarity Distribution */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Rarity Distribution</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(rarityStats).map(([rarity, count]) => {
            const totalOfRarity = allAchievements.filter(a => a.rarity === rarity).length;
            return (
              <div key={rarity} className="flex items-center gap-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: RARITY_COLORS[rarity] }}
                />
                <span className="text-sm text-neutral-400 capitalize">{rarity}:</span>
                <span className="text-sm font-semibold text-white">
                  {count}/{totalOfRarity}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all', 'unlocked', 'locked', 'common', 'uncommon', 'rare', 'epic', 'legendary'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-dark-700 text-neutral-400 hover:bg-dark-600'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative bg-dark-800 border-2 rounded-xl p-6 transition-all ${
              achievement.unlocked
                ? 'border-primary/50 shadow-lg shadow-primary/10'
                : 'border-dark-700 opacity-75'
            }`}
          >
            {/* Unlocked Badge */}
            {achievement.unlocked && (
              <div className="absolute top-4 right-4">
                <CheckCircle className="text-green-400" size={24} />
              </div>
            )}

            {/* Locked Overlay */}
            {!achievement.unlocked && (
              <div className="absolute top-4 right-4">
                <Lock className="text-neutral-600" size={24} />
              </div>
            )}

            {/* Icon */}
            <div className="text-4xl mb-4">{achievement.icon}</div>

            {/* Content */}
            <h3 className="text-lg font-bold text-white mb-1">{achievement.name}</h3>
            <p className="text-sm text-neutral-400 mb-3">{achievement.description}</p>

            {/* Rarity Badge */}
            <div 
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mb-3"
              style={{ 
                backgroundColor: `${RARITY_COLORS[achievement.rarity]}20`,
                color: RARITY_COLORS[achievement.rarity]
              }}
            >
              {getRarityIcon(achievement.rarity)}
              <span className="capitalize">{achievement.rarity}</span>
            </div>

            {/* Points */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-neutral-500">Points</span>
              <span className="text-lg font-bold text-secondary">+{achievement.points}</span>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-500">Progress</span>
                <span className="text-neutral-400">{achievement.progress}%</span>
              </div>
              <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${achievement.progress}%` }}
                />
              </div>
            </div>

            {/* Share Button (only for unlocked) */}
            {achievement.unlocked && (
              <button
                onClick={() => shareAchievement(achievement)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-neutral-300 transition-colors"
              >
                <Share2 size={16} />
                Share on Twitter
              </button>
            )}
          </div>
        ))}
      </div>

      {filteredAchievements.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <Trophy size={48} className="mx-auto mb-4 opacity-30" />
          <p>No achievements found for this filter</p>
        </div>
      )}
    </div>
  );
};

export default AchievementsPage;
