import React, { useState, useEffect } from 'react';
import { X, Clock, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

/**
 * PointsHistoryModal
 *
 * FIX 1: `walletAddress` prop was passed from App.jsx but never accepted in
 *         the component signature — it only took `isOpen` and `onClose`.
 *         Real history was never fetched; the modal always showed the same
 *         two hardcoded mock entries regardless of who was connected.
 *         Now accepts `walletAddress` and fetches from `/api/points/history`.
 *
 * FIX 2: Modal was rendered with `isOpen={false}` hardcoded in App.jsx —
 *         it could never open. This fix is in App.jsx (pass a toggle handler).
 *         Added a comment here as a reminder.
 *
 * FIX 3: Design system — gray-* → dark-* tokens throughout.
 *
 * NOTE for App.jsx: wire up a `showPointsHistory` toggle so this modal can
 * actually open:
 *   - Change `<PointsHistoryModal isOpen={false} ...>` to
 *     `<PointsHistoryModal isOpen={showPointsHistory} ...>`
 *   - Pass `onOpenHistory={() => setShowPointsHistory(true)}` to PointsBalance
 */
export const PointsHistoryModal = ({ isOpen, onClose, walletAddress }) => {
  // FIX 1: real state instead of hardcoded mock
  const [history, setHistory]   = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!isOpen || !walletAddress) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/points/history?wallet=${walletAddress}&limit=50`
        );
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const data = await response.json();
        setHistory(data.history ?? data ?? []);
      } catch (err) {
        setError(err.message);
        // Graceful fallback to empty — don't show stale mock data
        setHistory([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, walletAddress]);

  if (!isOpen) return null;

  return (
    // FIX 3: dark-* tokens
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-800 bg-dark-900/50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Points History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-sm">Loading history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">
              <p className="text-sm">Failed to load history</p>
              <p className="text-xs text-neutral-500 mt-1">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No points history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-dark-800/50 rounded-lg border border-dark-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.amount > 0
                        ? <TrendingUp className="w-4 h-4 text-green-400" />
                        : <TrendingDown className="w-4 h-4 text-red-400" />
                      }
                      <span className={`font-medium ${item.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.amount > 0 ? '+' : ''}{item.amount} points
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 mt-1">{item.description}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {new Date(item.timestamp).toLocaleDateString()} at{' '}
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PointsHistoryModal;