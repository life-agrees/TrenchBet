import { useState, useCallback, useEffect, useRef } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('useUserPreferences');

const STORAGE_KEY = 'trenchybet_preferences';

const DEFAULT_PREFERENCES = {
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
    sound: false,
  },
  favoriteMarkets: [],
  lastView: 'markets',
  customDashboardOrder: [],
};

/**
 * User preference management hook
 *
 * FIX 1: toggleWidget no longer calls savePreferences inside a setPreferences
 *         updater function. Previously this caused nested/double setState: the
 *         updater (which should be pure) was firing savePreferences, which itself
 *         called setPreferences again with stale preferences from the outer
 *         closure — potentially overwriting the correct updated value.
 *         Now toggleWidget reads current state cleanly, updates it, persists it,
 *         then sets it — single setState, no side effects inside updater.
 *
 * FIX 2: savePreferences now uses a prefsRef (useRef) instead of the `preferences`
 *         state variable in its closure. This means savePreferences always writes
 *         the latest preferences to localStorage, not a stale snapshot from when
 *         the callback was last created.
 */
export const useUserPreferences = (address) => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // FIX 2: ref always holds latest preferences so savePreferences never reads stale state
  const prefsRef = useRef(preferences);
  useEffect(() => {
    prefsRef.current = preferences;
  }, [preferences]);

  // Load preferences from localStorage on mount / address change
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
        const merged = { ...DEFAULT_PREFERENCES, ...parsed };
        setPreferences(merged);
        prefsRef.current = merged;
        logger.info('Preferences loaded from storage');
      }
    } catch (error) {
      logger.error('Error loading preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // FIX 2: savePreferences reads from prefsRef, never stale closure
  const savePreferences = useCallback((newPrefs) => {
    try {
      if (!address) return;

      const storageKey = `${STORAGE_KEY}_${address}`;
      const merged = { ...prefsRef.current, ...newPrefs };

      prefsRef.current = merged;
      setPreferences(merged);
      localStorage.setItem(storageKey, JSON.stringify(merged));
      logger.info('Preferences saved');
    } catch (error) {
      logger.error('Error saving preferences:', error);
    }
  }, [address]); // ← no longer depends on `preferences` state

  // Sidebar
  const setSidebarCollapsed = useCallback((collapsed) => {
    savePreferences({ sidebarCollapsed: collapsed });
  }, [savePreferences]);

  const setSidebarWidth = useCallback((width) => {
    savePreferences({ sidebarWidth: width });
  }, [savePreferences]);

  // Activity feed
  const setActivityFeedOpen = useCallback((open) => {
    savePreferences({ activityFeedOpen: open });
  }, [savePreferences]);

  // Theme
  const setTheme = useCallback((theme) => {
    savePreferences({ theme });
  }, [savePreferences]);

  /**
   * FIX 1: toggleWidget reads current widgets from prefsRef (always fresh),
   * builds the updated array, then calls savePreferences once — no nested
   * setState, no side effects inside a state updater.
   */
  const toggleWidget = useCallback((widgetId) => {
    const current = prefsRef.current.dashboardWidgets;
    const updated = current.includes(widgetId)
      ? current.filter(w => w !== widgetId)
      : [...current, widgetId];
    savePreferences({ dashboardWidgets: updated });
  }, [savePreferences]);

  const reorderWidgets = useCallback((newOrder) => {
    savePreferences({ customDashboardOrder: newOrder });
  }, [savePreferences]);

  const setNotificationPreference = useCallback((key, value) => {
    savePreferences({
      notifications: {
        ...prefsRef.current.notifications,
        [key]: value,
      },
    });
  }, [savePreferences]);

  const addFavoriteMarket = useCallback((marketId) => {
    const updated = [...new Set([...prefsRef.current.favoriteMarkets, marketId])];
    savePreferences({ favoriteMarkets: updated });
  }, [savePreferences]);

  const removeFavoriteMarket = useCallback((marketId) => {
    const updated = prefsRef.current.favoriteMarkets.filter(id => id !== marketId);
    savePreferences({ favoriteMarkets: updated });
  }, [savePreferences]);

  const isFavoriteMarket = useCallback((marketId) => {
    return prefsRef.current.favoriteMarkets.includes(marketId);
  }, []);

  const setLastView = useCallback((view) => {
    savePreferences({ lastView: view });
  }, [savePreferences]);

  const resetPreferences = useCallback(() => {
    try {
      if (!address) return;

      const storageKey = `${STORAGE_KEY}_${address}`;
      localStorage.removeItem(storageKey);
      prefsRef.current = DEFAULT_PREFERENCES;
      setPreferences(DEFAULT_PREFERENCES);
      logger.info('Preferences reset to defaults');
    } catch (error) {
      logger.error('Error resetting preferences:', error);
    }
  }, [address]);

  return {
    preferences,
    isLoading,

    setSidebarCollapsed,
    setSidebarWidth,
    sidebarCollapsed: preferences.sidebarCollapsed,
    sidebarWidth: preferences.sidebarWidth,

    setActivityFeedOpen,
    activityFeedOpen: preferences.activityFeedOpen,

    setTheme,
    theme: preferences.theme,

    toggleWidget,
    reorderWidgets,
    visibleWidgets: preferences.dashboardWidgets,
    widgetOrder: preferences.customDashboardOrder,

    setNotificationPreference,
    notificationSettings: preferences.notifications,

    addFavoriteMarket,
    removeFavoriteMarket,
    isFavoriteMarket,
    favoriteMarkets: preferences.favoriteMarkets,

    setLastView,
    lastView: preferences.lastView,

    resetPreferences,
  };
};

export default useUserPreferences;
