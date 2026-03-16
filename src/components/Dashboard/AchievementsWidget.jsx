// ─── AchievementsWidget.jsx ──────────────────────────────────────────────────
// FIX: Division by zero on progress bar when totalAchievements === 0
import React from 'react';
import { Trophy, Lock, CheckCircle, ArrowRight } from 'lucide-react';

const AchievementsWidget = ({ achievements = [], onViewAll, isLoading }) => {
  const unlockedAchievements = achievements.filter(a => a.unlocked).slice(0, 3);
  const totalUnlocked = achievements.filter(a => a.unlocked).length;
  const totalAchievements = achievements.length;

  // FIX: Guard against division by zero
  const progressPercent = totalAchievements > 0
    ? (totalUnlocked / totalAchievements) * 100
    : 0;

  return (
    <div className="bg-dark-800 border border-secondary/30 rounded-xl p-6 hover:border-secondary transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <Trophy size={20} className="text-yellow-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Achievements</h3>
            <p className="text-xs text-neutral-400">{totalUnlocked} of {totalAchievements}</p>
          </div>
        </div>
        <button onClick={onViewAll} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
          <ArrowRight size={18} className="text-neutral-400 hover:text-primary" />
        </button>
      </div>

      <div className="mb-6">
        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-neutral-400 mt-2">{totalUnlocked} unlocked achievements</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-dark-700 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : unlockedAchievements.length > 0 ? (
        <div className="space-y-2">
          {unlockedAchievements.map(achievement => (
            <div
              key={achievement.id}
              className="flex items-center gap-3 p-3 bg-dark-900 rounded-lg hover:bg-dark-700/50 transition-all"
            >
              <CheckCircle size={16} className="text-success flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{achievement.name}</p>
                <p className="text-xs text-neutral-400 truncate">{achievement.description}</p>
              </div>
              {achievement.rarity && (
                <span className={`text-xs px-2 py-1 rounded font-bold flex-shrink-0
                  ${achievement.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                  ${achievement.rarity === 'epic'      ? 'bg-purple-500/20 text-purple-400' : ''}
                  ${achievement.rarity === 'rare'      ? 'bg-blue-500/20 text-blue-400'     : ''}
                  ${achievement.rarity === 'uncommon'  ? 'bg-green-500/20 text-green-400'   : ''}
                  ${achievement.rarity === 'common'    ? 'bg-neutral-500/20 text-neutral-300': ''}
                `}>
                  {achievement.rarity}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Lock size={32} className="mx-auto text-neutral-600 mb-2" />
          <p className="text-sm text-neutral-400">No achievements unlocked yet</p>
          <p className="text-xs text-neutral-500 mt-1">Start betting to earn badges!</p>
        </div>
      )}

      <button
        onClick={onViewAll}
        className="w-full mt-4 py-3 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-primary font-bold text-sm transition-all"
      >
        View All Achievements →
      </button>
    </div>
  );
};

export default AchievementsWidget;