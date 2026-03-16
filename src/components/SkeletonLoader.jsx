import React from 'react';

/**
 * SkeletonLoader
 *
 * FIX: All skeleton components used gray-* tokens (bg-gray-800, bg-gray-700,
 *      border-gray-700 etc.) while the real cards use dark-* tokens.
 *      This caused a visible flash where skeletons looked lighter/different
 *      than the cards they replaced. Migrated to dark-* tokens throughout.
 */

export const HeaderSkeleton = () => (
  <div className="animate-pulse flex items-center gap-4">
    <div className="h-8 w-32 bg-dark-700 rounded" />
    <div className="h-6 w-16 bg-dark-700 rounded" />
  </div>
);

export const MarketCardSkeleton = () => (
  <div className="bg-dark-800/80 border border-dark-700 rounded-xl p-4 animate-pulse">
    {/* Header row */}
    <div className="flex items-center gap-2 mb-3">
      <div className="h-8 bg-dark-700 rounded-lg w-24" />
      <div className="h-6 bg-dark-700 rounded-md w-16" />
      <div className="h-6 bg-dark-700 rounded-full w-16 ml-auto" />
    </div>

    {/* Title */}
    <div className="h-6 bg-dark-700 rounded w-3/4 mb-2" />

    {/* Description */}
    <div className="h-4 bg-dark-700 rounded w-full mb-1" />
    <div className="h-4 bg-dark-700 rounded w-2/3 mb-3" />

    {/* Price display */}
    <div className="mb-3 p-2.5 bg-dark-900/50 rounded-lg border border-dark-700">
      <div className="h-4 bg-dark-700 rounded w-1/2" />
    </div>

    {/* Stats grid */}
    <div className="grid grid-cols-2 gap-2 mb-4">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="bg-dark-900/50 rounded-lg p-2.5 border border-dark-700/50">
          <div className="h-3 bg-dark-700 rounded w-16 mb-1" />
          <div className="h-4 bg-dark-700 rounded w-20" />
        </div>
      ))}
    </div>

    {/* Bet buttons */}
    <div className="grid grid-cols-2 gap-2">
      <div className="bg-dark-700/30 rounded-lg p-3 h-24" />
      <div className="bg-dark-700/30 rounded-lg p-3 h-24" />
    </div>
  </div>
);

export const SkeletonLoader = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <MarketCardSkeleton key={i} />
    ))}
  </div>
);

export const StatSkeleton = () => (
  <div className="bg-dark-800 border border-dark-700 p-5 rounded-xl animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-3 bg-dark-700 rounded w-16" />
      <div className="h-6 w-6 bg-dark-700 rounded-full" />
    </div>
    <div className="h-8 bg-dark-700 rounded w-20 mb-1" />
    <div className="h-3 bg-dark-700 rounded w-24" />
  </div>
);

export const BetCardSkeleton = () => (
  <div className="bg-dark-800 p-4 rounded-xl shadow-md animate-pulse">
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <div className="h-5 bg-dark-700 rounded w-48 mb-2" />
        <div className="h-4 bg-dark-700 rounded w-32 mb-1" />
        <div className="h-4 bg-dark-700 rounded w-24" />
      </div>
      <div className="h-8 bg-dark-700 rounded w-24" />
    </div>
  </div>
);

export default SkeletonLoader;