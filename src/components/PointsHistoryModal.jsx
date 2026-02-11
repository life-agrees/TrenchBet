import React from 'react';
import { X, Clock, TrendingUp, CheckCircle, Lock } from 'lucide-react';

export const PointsHistoryModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  // Mock data for demonstration
  const history = [
    {
      id: 1,
      type: 'earned',
      amount: 100,
      description: 'Daily login bonus',
      timestamp: new Date(Date.now() - 86400000),
      status: 'completed'
    },
    {
      id: 2,
      type: 'spent',
      amount: -50,
      description: 'Market bet',
      timestamp: new Date(Date.now() - 172800000),
      status: 'completed'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Points History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No points history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.type === 'earned' ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="font-medium text-white">
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
                  <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.timestamp.toLocaleDateString()} at {item.timestamp.toLocaleTimeString()}
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
