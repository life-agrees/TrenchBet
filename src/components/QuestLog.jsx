import React from 'react';
import { Target, Trophy, Users, Zap, TrendingUp, Award } from 'lucide-react';
import { ACHIEVEMENTS_LIST, RARITY_COLORS } from '../utils/achievementConfig';

/**
 * Quest Log Component
 * Shows next achievable milestones and progress
 */
const QuestLog = ({ userStats, achievements, onClose }) => {
  // Calculate progress for each quest
  const getQuestProgress = (achievement) => {
    const { condition, points } = achievement;
    
    if (!userStats) return { progress: 0, target: 1, current: 0 };
    
    // Check if already unlocked
    const isUnlocked = achievements?.some(a => a.id === achievement.id);
    if (isUnlocked) return { progress: 100, target: 1, current: 1, unlocked: true };
    
    // Calculate progress based on condition
    let current = 0;
    let target = 1;
    
    switch (achievement.id) {
      case 'FIRST_BET':
        current = userStats.totalBets || 0;
        target = 1;
        break;
      case 'WIN_STREAK_3':
        current = userStats.currentStreak || 0;
        target = 3;
        break;
      case 'WIN_STREAK_5':
        current = userStats.currentStreak || 0;
        target = 5;
        break;
      case 'WHALE':
        current = userStats.largestBet || 0;
        target = 1000;
        break;
      case 'SHARPSHOOTER':
        current = userStats.winRate || 0;
        target = 80;
        break;
      case 'SPEED_DEMON':
        current = userStats.betsInADay || 0;
        target = 10;
        break;
      case 'SOCIAL_BUTTERFLY':
        current = userStats.referralCount || 0;
        target = 5;
        break;
      case 'ORACLE':
        current = userStats.totalWins || 0;
        target = 10;
        break;
      default:
        // For achievements we can't track easily, show as "in progress"
        current = 0;
        target = 1;
    }
    
    const progress = Math.min((current / target) * 100, 100);
    return { progress, target, current, unlocked: false };
  };

  // Get next 3 most achievable quests
  const getNextQuests = () => {
    if (!ACHIEVEMENTS_LIST) return [];
    
    return ACHIEVEMENTS_LIST
      .map(achievement => ({
        ...achievement,
        ...getQuestProgress(achievement)
      }))
      .filter(q => !q.unlocked)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);
  };

  // Get recently unlocked achievements
  const getRecentUnlocks = () => {
    if (!achievements) return [];
    return achievements.slice(-2).reverse();
  };

  const nextQuests = getNextQuests();
  const recentUnlocks = getRecentUnlocks();

  const getIcon = (id) => {
    const icons = {
      FIRST_BET: Target,
      WIN_STREAK_3: Zap,
      WIN_STREAK_5: Zap,
      WHALE: TrendingUp,
      SHARPSHOOTER: Target,
      SPEED_DEMON: Zap,
      SOCIAL_BUTTERFLY: Users,
      ORACLE: Award,
    };
    return icons[id] || Trophy;
  };

  return (
    <div className="bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-600 rounded-2xl p-4 w-full max-w-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Target className="text-primary" size={20} />
          Quest Log
        </h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-900 dark:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Next Quests */}
      <div className="space-y-3 mb-4">
        <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
          Next Up
        </h4>
        
        {nextQuests.map((quest) => {
          const Icon = getIcon(quest.id);
          const color = RARITY_COLORS[quest.rarity];
          
          return (
            <div 
              key={quest.id}
              className="bg-neutral-50 dark:bg-dark-900 rounded-xl p-3 border border-neutral-200 dark:border-dark-700 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Icon size={20} style={{ color }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-neutral-900 dark:text-white text-sm truncate">
                      {quest.name}
                    </span>
                    <span 
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      {quest.points} pts
                    </span>
                  </div>
                  
                  <p className="text-xs text-neutral-400 mb-2">
                    {quest.description}
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-neutral-100 dark:bg-dark-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${quest.progress}%`,
                          backgroundColor: color
                        }}
                      />
                    </div>
                    <span className="text-xs text-neutral-400 font-mono">
                      {quest.current}/{quest.target}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Unlocks */}
      {recentUnlocks.length > 0 && (
        <div className="border-t border-neutral-200 dark:border-dark-700 pt-3">
          <h4 className="text-xs font-semibold text-success uppercase tracking-wide mb-2">
            Recently Unlocked 🎉
          </h4>
          
          <div className="flex flex-wrap gap-2">
            {recentUnlocks.map((achievement) => (
              <div 
                key={achievement.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-success/10 border border-success/30 rounded-full"
              >
                <span className="text-lg">{achievement.icon}</span>
                <span className="text-xs font-semibold text-success">
                  {achievement.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View All Link */}
      <button className="w-full mt-3 py-2 text-sm text-primary hover:text-primary-400 font-semibold transition-colors">
        View All Achievements →
      </button>
    </div>
  );
};

export default QuestLog;
