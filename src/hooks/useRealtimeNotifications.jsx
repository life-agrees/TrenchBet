import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { createLogger } from '../utils/logger';

const logger = createLogger('useRealtimeNotifications');

/**
 * useRealtimeNotifications
 *
 * FIX: `lastActivityId` was in `initializeActivityPolling`'s dependency array.
 * Every time a new activity arrived and `setLastActivityId()` ran:
 *   1. `lastActivityId` state changed
 *   2. New `initializeActivityPolling` callback created
 *   3. useEffect([initializeActivityPolling]) tore down the interval
 *   4. A fresh interval was created — resetting the 5-second clock
 *
 * The poll effectively never fired because it kept restarting.
 *
 * Fix: move `lastActivityId` into a ref (`lastActivityIdRef`). The polling
 * function reads and writes the ref directly — no state change, no callback
 * recreation, no interval teardown. The interval now fires reliably every 5s.
 */
const getSeverityFromType = (type) => {
  if (type.includes('won') || type.includes('unlocked') || type.includes('milestone')) return 'success';
  if (type.includes('lost')) return 'error';
  return 'info';
};

export const useRealtimeNotifications = (address, isConnected) => {
  const [notifications, setNotifications]   = useState([]);
  const [isConnectedWS, setIsConnectedWS]   = useState(false);

  const pollingIntervalRef  = useRef(null);
  const lastActivityIdRef   = useRef(null); // FIX: ref instead of state

  const addNotification = useCallback((notification) => {
    const id    = Date.now();
    const notif = { id, timestamp: new Date(), ...notification };

    setNotifications(prev => [notif, ...prev].slice(0, 50));

    switch (notification.type) {
      case 'achievement':
        toast.success(`🏆 ${notification.title}`); break;
      case 'market_resolved':
        toast.success(`📊 ${notification.title}`); break;
      case 'bet_won':
        toast.success(`✅ ${notification.title}`); break;
      case 'bet_lost':
        toast.error(`❌ ${notification.title}`); break;
      case 'alert':
        toast(() => (
          <div>
            <p className="font-bold">{notification.title}</p>
            <p className="text-sm">{notification.message}</p>
          </div>
        ));
        break;
    }

    return id;
  }, []);

  // FIX: initializeActivityPolling no longer depends on lastActivityId state.
  // It reads/writes lastActivityIdRef instead, so it never needs to be recreated.
  const initializeActivityPolling = useCallback(async () => {
    if (!isConnected || !address) return;

    setIsConnectedWS(true);
    logger.info('Activity polling initialized for:', address);

    const pollActivities = async () => {
      try {
        const response = await fetch(
          `/api/activities?wallet=${address}&limit=20&offset=0`,
          { headers: { 'Cache-Control': 'no-cache' } }
        );

        if (!response.ok) {
          logger.warn('Failed to fetch activities:', response.status);
          return;
        }

        const { activities = [] } = await response.json();

        if (activities.length > 0) {
          const newestId = activities[0]?.id;

          // FIX: read from ref — no state change on every poll
          if (lastActivityIdRef.current && newestId !== lastActivityIdRef.current) {
            const newIndex    = activities.findIndex(a => a.id === lastActivityIdRef.current);
            const newActivities = newIndex > 0 ? activities.slice(0, newIndex) : activities;

            newActivities.forEach(activity => {
              addNotification({
                type:     activity.type,
                title:    activity.title,
                message:  activity.description,
                severity: getSeverityFromType(activity.type),
              });
            });
          }

          // FIX: write to ref — no re-render, no callback recreation
          lastActivityIdRef.current = newestId;
        }
      } catch (error) {
        logger.error('Error polling activities:', error);
      }
    };

    await pollActivities();
    pollingIntervalRef.current = setInterval(pollActivities, 5_000);
  // FIX: lastActivityId removed from deps — interval no longer resets on new activity
  }, [isConnected, address, addNotification]);

  useEffect(() => {
    if (!isConnected || !address) return;

    initializeActivityPolling();

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      setIsConnectedWS(false);
    };
  }, [isConnected, address, initializeActivityPolling]);

  const reconnect = useCallback(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    logger.info('Reconnecting activity polling...');
    initializeActivityPolling();
  }, [initializeActivityPolling]);

  const notifyAchievement   = useCallback((name, desc) => addNotification({ type: 'achievement',      title: `🏆 ${name}`,       message: desc,                      severity: 'success' }), [addNotification]);
  const notifyBetWon        = useCallback((amount, mult) => addNotification({ type: 'bet_won',         title: `Bet Won +${amount}`, message: `${mult}x multiplier`,     severity: 'success' }), [addNotification]);
  const notifyBetLost       = useCallback((amount)       => addNotification({ type: 'bet_lost',        title: `Bet Lost -${amount}`, message: 'Better luck next time',  severity: 'error'   }), [addNotification]);
  const notifyMarketResolved= useCallback((name, winner) => addNotification({ type: 'market_resolved', title: `Market Resolved: ${name}`, message: `Winner: ${winner}`, severity: 'info'    }), [addNotification]);
  const notifyAlert         = useCallback((title, msg, severity = 'info') => addNotification({ type: 'alert', title, message: msg, severity }), [addNotification]);

  const clearNotifications  = useCallback(() => setNotifications([]), []);
  const removeNotification  = useCallback((id) => setNotifications(prev => prev.filter(n => n.id !== id)), []);

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
    reconnect,
  };
};

export default useRealtimeNotifications;