import React from 'react';
import { RARITY_COLORS } from '../utils/achievementConfig';

/**
 * AchievementBadge Component
 * Small badge display for achievements (can be used in profile, etc.)
 */
const AchievementBadge = ({ achievement, size = 'md', showName = false }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-20 h-20 text-3xl',
  };

  const getRarityBorder = (rarity) => {
    return {
      boxShadow: `0 0 10px ${RARITY_COLORS[rarity]}40`,
      borderColor: RARITY_COLORS[rarity],
    };
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} flex items-center justify-center rounded-full border-2 bg-dark-800 transition-transform hover:scale-110 cursor-pointer`}
        style={getRarityBorder(achievement.rarity)}
        title={`${achievement.name} - ${achievement.description}`}
      >
        {achievement.icon}
      </div>
      {showName && (
        <span className="text-xs text-neutral-400 text-center max-w-[80px] truncate">
          {achievement.name}
        </span>
      )}
    </div>
  );
};

export default AchievementBadge;
