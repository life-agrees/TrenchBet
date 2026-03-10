import { useState, useCallback, useEffect } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('useUserPreferences');

const STORAGE_KEY = 'trenchybet_preferences';

/**
 * User preference management hook
 * Handles sidebar state, theme, widget visibility, etc.
 */
export const useUserPreferences = (address) => {
  const [preferences, setPreferences] = useState({
    sidebarCollapsed: false,
    sidebarWidth: 64, // Collapsed width in rem
    activityFeedOpen: false,
    theme: 'dark',
    dashboardWidgets: [
      'performance',
      'trends',
      'achievements',
      'quickstats'
    ],
    notifications: {
      achievements: true,
      bets: true,
      markets: true,
      referrals: true,
      sound: false
    },
    favoriteMarkets: [],
    lastView: 'markets',
    customDashboardOrder: []
  });

  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      if (!address) {
        setIsLoading(false);
        return;
      }

      const storageKey = `${STORAGE_KEY}_${address}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(prev => ({
          ...prev,
          ...parsed
        }));
        logger.info('Preferences loaded from storage');
      }

      setIsLoading(false);
    } catch (error) {
      logger.error('Error loading preferences:', error);
      setIsLoading(false);
    }
  }, [address]);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPrefs) => {
    try {
      if (!address) return;

      const storageKey = `${STORAGE_KEY}_${address}`;
      const merged = {
        ...preferences,
        ...newPrefs
      };

      setPreferences(merged);
      localStorage.setItem(storageKey, JSON.stringify(merged));
      logger.info('Preferences saved');
    } catch (error) {
      logger.error('Error saving preferences:', error);
    }
  }, [address, preferences]);

  // Sidebar preferences
  const setSidebarCollapsed = useCallback((collapsed) => {
    savePreferences({ sidebarCollapsed: collapsed });
  }, [savePreferences]);

  const setSidebarWidth = useCallback((width) => {
    savePreferences({ sidebarWidth: width });
  }, [savePreferences]);

  // Activity feed preferences
  const setActivityFeedOpen = useCallback((open) => {
    savePreferences({ activityFeedOpen: open });
  }, [savePreferences]);

  // Theme preferences
  const setTheme = useCallback((theme) => {
    savePreferences({ theme });
  }, [savePreferences]);

  // Dashboard widget management
  const toggleWidget = useCallback((widgetId) => {
    setPreferences(prev => {
      const widgets = prev.dashboardWidgets;
      const updated = widgets.includes(widgetId)
        ? widgets.filter(w => w !== widgetId)
        : [...widgets, widgetId];

      savePreferences({ dashboardWidgets: updated });
      return { ...prev, dashboardWidgets: updated };
    });
  }, [savePreferences]);

  const reorderWidgets = useCallback((newOrder) => {
    savePreferences({ customDashboardOrder: newOrder });
  }, [savePreferences]);

  // Notification preferences
  const setNotificationPreference = useCallback((key, value) => {
    savePreferences({
      notifications: {
        ...preferences.notifications,
        [key]: value
      }
    });
  }, [preferences, savePreferences]);

  // Favorite markets
  const addFavoriteMarket = useCallback((marketId) => {
    const updated = [...new Set([...preferences.favoriteMarkets, marketId])];
    savePreferences({ favoriteMarkets: updated });
  }, [preferences, savePreferences]);

  const removeFavoriteMarket = useCallback((marketId) => {
    const updated = preferences.favoriteMarkets.filter(id => id !== marketId);
    savePreferences({ favoriteMarkets: updated });
  }, [preferences, savePreferences]);

  const isFavoriteMarket = useCallback((marketId) => {
    return preferences.favoriteMarkets.includes(marketId);
  }, [preferences]);

  // Last viewed page
  const setLastView = useCallback((view) => {
    savePreferences({ lastView: view });
  }, [savePreferences]);

  // Reset preferences to defaults
  const resetPreferences = useCallback(() => {
    try {
      if (!address) return;

      const storageKey = `${STORAGE_KEY}_${address}`;
      localStorage.removeItem(storageKey);

      setPreferences({
        sidebarCollapsed: false,
        sidebarWidth: 64,
        activityFeedOpen: false,
        theme: 'dark',
        dashboardWidgets: ['performance', 'trends', 'achievements', 'quickstats'],
        notifications: {
          achievements: true,
          bets: true,
          markets: true,
          referrals: true,
          sound: false
        },
        favoriteMarkets: [],
        lastView: 'markets',
        customDashboardOrder: []
      });

      logger.info('Preferences reset to defaults');
    } catch (error) {
      logger.error('Error resetting preferences:', error);
    }
  }, [address]);

  return {
    // State
    preferences,
    isLoading,

    // Sidebar
    setSidebarCollapsed,
    setSidebarWidth,
    sidebarCollapsed: preferences.sidebarCollapsed,
    sidebarWidth: preferences.sidebarWidth,

    // Activity Feed
    setActivityFeedOpen,
    activityFeedOpen: preferences.activityFeedOpen,

    // Theme
    setTheme,
    theme: preferences.theme,

    // Widgets
    toggleWidget,
    reorderWidgets,
    visibleWidgets: preferences.dashboardWidgets,
    widgetOrder: preferences.customDashboardOrder,

    // Notifications
    setNotificationPreference,
    notificationSettings: preferences.notifications,

    // Favorites
    addFavoriteMarket,
    removeFavoriteMarket,
    isFavoriteMarket,
    favoriteMarkets: preferences.favoriteMarkets,

    // Last view
    setLastView,
    lastView: preferences.lastView,

    // Reset
    resetPreferences
  };
};

export default useUserPreferences;
