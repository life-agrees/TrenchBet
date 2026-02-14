import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing favorite markets with localStorage persistence
 * @returns {Object} favorites state and control functions
 */
export function useFavorites() {
  // Initialize state from localStorage
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('favorite_markets');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
      return [];
    }
  });

  // Persist to localStorage whenever favorites change
  useEffect(() => {
    try {
      localStorage.setItem('favorite_markets', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }, [favorites]);

  /**
   * Toggle a market's favorite status
   * @param {string|number} marketId - The market ID to toggle
   */
  const toggleFavorite = useCallback((marketId) => {
    setFavorites(prev => {
      const id = marketId.toString();
      const newFavorites = prev.includes(id)
        ? prev.filter(favId => favId !== id)
        : [...prev, id];
      
      return newFavorites;
    });
  }, []);

  /**
   * Check if a market is favorited
   * @param {string|number} marketId - The market ID to check
   * @returns {boolean} True if market is favorited
   */
  const isFavorite = useCallback((marketId) => {
    return favorites.includes(marketId.toString());
  }, [favorites]);

  /**
   * Clear all favorites
   */
  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  /**
   * Get count of favorites
   * @returns {number} Number of favorite markets
   */
  const favoritesCount = favorites.length;

  return { 
    favorites, 
    toggleFavorite, 
    isFavorite, 
    clearFavorites,
    favoritesCount 
  };
}

export default useFavorites;
