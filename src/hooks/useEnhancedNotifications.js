import { useState, useCallback, useEffect, useRef } from 'react';
import { createLogger } from '../utils/logger';
import { NOTIFICATION_TYPES, DEFAULT_NOTIFICATION_SETTINGS, MARKET_ENDING_REMINDERS } from '../utils/notificationTypes';

const logger = createLogger('useEnhancedNotifications');

// Local storage key for notification history
const NOTIFICATION_HISTORY_KEY = 'trenchy_notification_history';
const MAX_NOTIFICATION_HISTORY = 100;

export const useEnhancedNotifications = () => {
  // State
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [marketReminders, setMarketReminders] = useState({});
  
  const reminderTimersRef = useRef({});
  
  // Initialize on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      setEnabled(Notification.permission === 'granted');
    }
    
    // Load notification history from localStorage
    try {
      const stored = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
      if (stored) {
        setNotificationHistory(JSON.parse(stored));
      }
    } catch (e) {
      logger.error('Failed to load notification history:', e);
    }
    
    // Load settings from localStorage
    try {
      const storedSettings = localStorage.getItem('trenchy_notification_settings');
      if (storedSettings) {
        setSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(storedSettings) });
      }
    } catch (e) {
      logger.error('Failed to load notification settings:', e);
    }
  }, []);
  
  // Save notification history to localStorage
  const saveNotificationHistory = useCallback((history) => {
    try {
      localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      logger.error('Failed to save notification history:', e);
    }
  }, []);
  
  // Request notification permission
  const enable = useCallback(async () => {
    if (!isSupported) {
      logger.warn('Notifications not supported');
      return false;
    }
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      const isEnabled = result === 'granted';
      setEnabled(isEnabled);
      return isEnabled;
    } catch (err) {
      logger.error('Error requesting notification permission:', err);
      return false;
    }
  }, [isSupported]);
  
  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('trenchy_notification_settings', JSON.stringify(updated));
      } catch (e) {
        logger.error('Failed to save notification settings:', e);
      }
      return updated;
    });
  }, []);
  
  // Get notification type config
  const getNotificationConfig = useCallback((type) => {
    return NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.BET_PLACED;
  }, []);
  
  // Save to notification center (localStorage)
  const saveToNotificationCenter = useCallback((type, data) => {
    const config = getNotificationConfig(type);
    const notification = {
      id: Date.now(),
      type,
      icon: config.icon,
      title: config.title,
      message: data.message,
      timestamp: Date.now(),
      read: false,
      ...data,
    };
    
    setNotificationHistory(prev => {
      const updated = [notification, ...prev].slice(0, MAX_NOTIFICATION_HISTORY);
      saveNotificationHistory(updated);
      return updated;
    });
    
    return notification;
  }, [getNotificationConfig, saveNotificationHistory]);
  
  // Show browser notification
  const showBrowserNotification = useCallback((type, data) => {
    if (!isSupported || !enabled) {
      return null;
    }
    
    const config = getNotificationConfig(type);
    
    try {
      const notification = new Notification(`${config.icon} ${config.title}`, {
        body: data.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `trenchy-${type}`,
        requireInteraction: config.priority === 'high',
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      return notification;
    } catch (err) {
      logger.error('Error showing notification:', err);
      return null;
    }
  }, [isSupported, enabled, getNotificationConfig]);
  
  // Main send notification function
  const sendNotification = useCallback((type, data) => {
    const config = getNotificationConfig(type);
    
    // Check if this notification type is enabled
    const typeKey = type.toLowerCase();
    if (settings.enabled && settings[typeKey] === false) {
      logger.info(`Notification type ${type} is disabled`);
      return null;
    }
    
    // Save to notification center (always, for history)
    const notification = saveToNotificationCenter(type, data);
    
    // Show browser notification
    if (settings.enabled && settings.desktop) {
      showBrowserNotification(type, data);
    }
    
    return notification;
  }, [settings, getNotificationConfig, saveToNotificationCenter, showBrowserNotification]);
  
  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotificationHistory(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveNotificationHistory(updated);
      return updated;
    });
  }, [saveNotificationHistory]);
  
  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotificationHistory(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotificationHistory(updated);
      return updated;
    });
  }, [saveNotificationHistory]);
  
  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotificationHistory([]);
    saveNotificationHistory([]);
  }, [saveNotificationHistory]);
  
  // Get unread count
  const getUnreadCount = useCallback(() => {
    return notificationHistory.filter(n => !n.read).length;
  }, [notificationHistory]);
  
  // Set up market ending reminder
  const setupMarketReminder = useCallback((marketId, endTime, marketLabel) => {
    if (!settings.enabled || !settings.marketEnding) return;
    
    // Clear existing reminders for this market
    if (reminderTimersRef.current[marketId]) {
      reminderTimersRef.current[marketId].forEach(timer => clearTimeout(timer));
    }
    
    const timers = [];
    const now = Date.now();
    const endTimestamp = Number(endTime) * 1000; // Convert to milliseconds
    
    MARKET_ENDING_REMINDERS.forEach(reminder => {
      const triggerTime = endTimestamp - reminder.time;
      const delay = triggerTime - now;
      
      if (delay > 0) {
        const timer = setTimeout(() => {
          sendNotification('MARKET_ENDING', {
            message: `${marketLabel} ends in ${reminder.label}!`,
            marketId,
            endTime,
          });
        }, delay);
        
        timers.push(timer);
      }
    });
    
    reminderTimersRef.current[marketId] = timers;
    setMarketReminders(prev => ({ ...prev, [marketId]: true }));
  }, [settings.enabled, settings.marketEnding, sendNotification]);
  
  // Clear market reminder
  const clearMarketReminder = useCallback((marketId) => {
    if (reminderTimersRef.current[marketId]) {
      reminderTimersRef.current[marketId].forEach(timer => clearTimeout(timer));
      delete reminderTimersRef.current[marketId];
    }
    setMarketReminders(prev => {
      const updated = { ...prev };
      delete updated[marketId];
      return updated;
    });
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timers
      Object.values(reminderTimersRef.current).forEach(timers => {
        timers.forEach(timer => clearTimeout(timer));
      });
    };
  }, []);
  
  // Notification helpers
  const notifyBetPlaced = useCallback((marketLabel, amount) => {
    return sendNotification('BET_PLACED', {
      message: `Your bet of $${amount} on ${marketLabel} has been placed.`,
    });
  }, [sendNotification]);
  
  const notifyBetWon = useCallback((marketLabel, amount, winnings) => {
    return sendNotification('BET_WON', {
      message: `Congratulations! You won $${winnings} on ${marketLabel}!`,
    });
  }, [sendNotification]);
  
  const notifyBetLost = useCallback((marketLabel, amount) => {
    return sendNotification('BET_LOST', {
      message: `Your bet of $${amount} on ${marketLabel} didn't win. Better luck next time!`,
    });
  }, [sendNotification]);
  
  const notifyAchievement = useCallback((achievementName, description) => {
    return sendNotification('ACHIEVEMENT_UNLOCKED', {
      message: `You unlocked "${achievementName}"! ${description}`,
    });
  }, [sendNotification]);
  
  const notifyReferral = useCallback((newReferralAddress) => {
    return sendNotification('REFERRAL_JOINED', {
      message: `${newReferralAddress.slice(0, 6)}...${newReferralAddress.slice(-4)} joined using your referral code!`,
    });
  }, [sendNotification]);
  
  const notifyPointsEarned = useCallback((points, reason) => {
    return sendNotification('POINTS_EARNED', {
      message: `You earned ${points} points! ${reason}`,
    });
  }, [sendNotification]);
  
  const notifyAirdrop = useCallback(() => {
    return sendNotification('AIRDROP_CLAIMABLE', {
      message: 'Your airdrop is ready to claim! Click to view.',
    });
  }, [sendNotification]);
  
  const notifyBetCredit = useCallback((amount, reason) => {
    return sendNotification('CREDIT_AWARDED', {
      message: `You received $${amount} in bet credits! ${reason}`,
    });
  }, [sendNotification]);
  
  return {
    // State
    enabled,
    permission,
    isSupported,
    settings,
    notificationHistory,
    unreadCount: getUnreadCount(),
    
    // Actions
    enable,
    updateSettings,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    
    // Market reminders
    setupMarketReminder,
    clearMarketReminder,
    hasReminder: (marketId) => !!marketReminders[marketId],
    
    // Notification helpers
    notifyBetPlaced,
    notifyBetWon,
    notifyBetLost,
    notifyAchievement,
    notifyReferral,
    notifyPointsEarned,
    notifyAirdrop,
    notifyBetCredit,
    
    // Config
    notificationTypes: NOTIFICATION_TYPES,
  };
};

export default useEnhancedNotifications;
