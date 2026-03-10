import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { createLogger } from '../utils/logger';

const logger = createLogger('useRealtimeNotifications');

/**
 * Real-time notification system
 * Polls activity feed for real user activities
 * Source: /api/activities endpoint (powered by Supabase + points-listener)
 */
export const useRealtimeNotifications = (address, isConnected) => {
  const [notifications, setNotifications] = useState([]);
  const [isConnectedWS, setIsConnectedWS] = useState(false);
  const [lastActivityId, setLastActivityId] = useState(null);
  const pollingIntervalRef = useRef(null);
  const lastPollRef = useRef(0);

  // Add notification
  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const notif = {
      id,
      timestamp: new Date(),
      ...notification
    };

    setNotifications(prev => [notif, ...prev].slice(0, 50)); // Keep last 50

    // Show toast based on type
    if (notification.type === 'achievement') {
      toast.success(`🏆 ${notification.title}`);
    } else if (notification.type === 'market_resolved') {
      toast.success(`📊 ${notification.title}`);
    } else if (notification.type === 'bet_won') {
      toast.success(`✅ ${notification.title}`);
    } else if (notification.type === 'bet_lost') {
      toast.error(`❌ ${notification.title}`);
    } else if (notification.type === 'alert') {
      toast(() => (
        <div>
          <p className="font-bold">{notification.title}</p>
          <p className="text-sm">{notification.message}</p>
        </div>
      ));
    }

    return id;
  }, []);

  // Initialize polling for activities instead of WebSocket
  const initializeActivityPolling = useCallback(async () => {
    if (!isConnected || !address) return;

    try {
      setIsConnectedWS(true);
      logger.info('Activity polling initialized for:', address);

      // Fetch activities from API
      const pollActivities = async () => {
        try {
          const response = await fetch(
            `/api/activities?wallet=${address}&limit=20&offset=0`,
            {
              headers: { 'Cache-Control': 'no-cache' }
            }
          );

          if (!response.ok) {
            logger.warn('Failed to fetch activities:', response.status);
            return;
          }

          const { activities = [] } = await response.json();

          if (activities.length > 0) {
            // Check for new activities since last poll
            const newestActivityId = activities[0]?.id;
            
            if (lastActivityId && newestActivityId !== lastActivityId) {
              // Find new activities
              const newActivityIndex = activities.findIndex(a => a.id === lastActivityId);
              const newActivities = newActivityIndex > 0 
                ? activities.slice(0, newActivityIndex) 
                : activities;

              // Add new activities and show toast notifications
              newActivities.forEach(activity => {
                addNotification({
                  type: activity.type,
                  title: activity.title,
                  message: activity.description,
                  severity: getSeverityFromType(activity.type)
                });
              });
            }

            // Update last activity ID
            setLastActivityId(newestActivityId);
          }

          lastPollRef.current = Date.now();
        } catch (error) {
          logger.error('Error polling activities:', error);
        }
      };

      // Initial fetch
      await pollActivities();

      // Poll every 5 seconds
      pollingIntervalRef.current = setInterval(pollActivities, 5000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    } catch (error) {
      logger.error('Activity polling initialization error:', error);
      setIsConnectedWS(false);
    }
  }, [isConnected, address, lastActivityId, addNotification]);

  // Reconnect attempt
  const reconnect = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    logger.info('Attempting to reconnect activity polling...');
    initializeActivityPolling();
  }, [initializeActivityPolling]);

  // Initialize on mount and when dependencies change
  useEffect(() => {
    if (isConnected && address) {
      initializeActivityPolling();
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [isConnected, address, initializeActivityPolling]);

  // Emit custom notifications (for app-level events)
  const notifyAchievement = useCallback((name, description) => {
    return addNotification({
      type: 'achievement',
      title: `🏆 ${name}`,
      message: description,
      severity: 'success'
    });
  }, [addNotification]);

  const notifyBetWon = useCallback((amount, multiplier) => {
    return addNotification({
      type: 'bet_won',
      title: `Bet Won +${amount}`,
      message: `${multiplier}x multiplier`,
      severity: 'success'
    });
  }, [addNotification]);

  const notifyBetLost = useCallback((amount) => {
    return addNotification({
      type: 'bet_lost',
      title: `Bet Lost -${amount}`,
      message: 'Better luck next time',
      severity: 'error'
    });
  }, [addNotification]);

  const notifyMarketResolved = useCallback((marketName, winner) => {
    return addNotification({
      type: 'market_resolved',
      title: `Market Resolved: ${marketName}`,
      message: `Winner: ${winner}`,
      severity: 'info'
    });
  }, [addNotification]);

  const notifyAlert = useCallback((title, message, severity = 'info') => {
    return addNotification({
      type: 'alert',
      title,
      message,
      severity
    });
  }, [addNotification]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remove single notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  /**
   * Map activity type to toast severity
   */
  const getSeverityFromType = (type) => {
    if (type.includes('won') || type.includes('unlocked') || type.includes('milestone')) {
      return 'success';
    } else if (type.includes('lost')) {
      return 'error';
    } else if (type.includes('placed')) {
      return 'info';
    }
    return 'info';
  };

  return {
    notifications,
    isConnected: isConnectedWS,
    addNotification,
    notifyAchievement,
    notifyBetWon,
    notifyBetLost,
    notifyMarketResolved,
    notifyAlert,
    clearNotifications,
    removeNotification,
    reconnect
  };
};

export default useRealtimeNotifications;
