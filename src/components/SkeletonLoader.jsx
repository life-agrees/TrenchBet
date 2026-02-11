import React from 'react';

export const MarketCardSkeleton = () => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
      <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-700 rounded w-2/3 mb-4"></div>
      <div className="flex justify-between items-center mt-4">
        <div className="h-8 bg-gray-700 rounded w-20"></div>
        <div className="h-8 bg-gray-700 rounded w-20"></div>
      </div>
    </div>
  );
};

export const SkeletonLoader = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <MarketCardSkeleton key={index} />
      ))}
    </div>
  );
};

export default SkeletonLoader;
