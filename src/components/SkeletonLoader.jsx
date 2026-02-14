import React from 'react';

/**
 * Enhanced MarketCard Skeleton Loader
 * Matches the new enhanced MarketCard design
 */
export const MarketCardSkeleton = () => {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 animate-pulse">
      {/* Header Row - Asset, Type, Activity Badge */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 bg-gray-700 rounded-lg w-24"></div>
        <div className="h-6 bg-gray-700 rounded-md w-16"></div>
        <div className="h-6 bg-gray-700 rounded-full w-16 ml-auto"></div>
      </div>

      {/* Title */}
      <div className="h-6 bg-gray-700 rounded w-3/4 mb-2"></div>

      {/* Description */}
      <div className="h-4 bg-gray-700 rounded w-full mb-1"></div>
      <div className="h-4 bg-gray-700 rounded w-2/3 mb-3"></div>

      {/* Current Price Display */}
      <div className="mb-3 p-2.5 bg-gray-900/50 rounded-lg border border-gray-700">
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>

      {/* Market Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="h-3 bg-gray-700 rounded w-16 mb-1"></div>
          <div className="h-4 bg-gray-700 rounded w-20"></div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="h-3 bg-gray-700 rounded w-16 mb-1"></div>
          <div className="h-4 bg-gray-700 rounded w-20"></div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="h-3 bg-gray-700 rounded w-16 mb-1"></div>
          <div className="h-4 bg-gray-700 rounded w-20"></div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-2.5 border border-gray-700/50">
          <div className="h-3 bg-gray-700 rounded w-16 mb-1"></div>
          <div className="h-4 bg-gray-700 rounded w-20"></div>
        </div>
      </div>

      {/* Bet Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-700/20 rounded-lg p-3 h-24"></div>
        <div className="bg-gray-700/20 rounded-lg p-3 h-24"></div>
      </div>
    </div>
  );
};

/**
 * Grid of skeleton loaders
 */
export const SkeletonLoader = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <MarketCardSkeleton key={index} />
      ))}
    </div>
  );
};

/**
 * Single stat skeleton (for dashboard stats)
 */
export const StatSkeleton = () => (
  <div className="bg-dark-800 border border-dark-700 p-5 rounded-xl animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-3 bg-gray-700 rounded w-16"></div>
      <div className="h-6 w-6 bg-gray-700 rounded-full"></div>
    </div>
    <div className="h-8 bg-gray-700 rounded w-20 mb-1"></div>
    <div className="h-3 bg-gray-700 rounded w-24"></div>
  </div>
);

/**
 * Bet card skeleton (for user bets view)
 */
export const BetCardSkeleton = () => (
  <div className="bg-dark-800 p-4 rounded-xl shadow-md animate-pulse">
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <div className="h-5 bg-gray-700 rounded w-48 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-32 mb-1"></div>
        <div className="h-4 bg-gray-700 rounded w-24"></div>
      </div>
      <div className="h-8 bg-gray-700 rounded w-24"></div>
    </div>
  </div>
);

export default SkeletonLoader;