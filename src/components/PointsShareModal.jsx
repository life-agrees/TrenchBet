import React, { useState } from 'react';
import { X, Share2, Copy, Twitter, CheckCircle } from 'lucide-react';

export const PointsShareModal = ({ isOpen, onClose, points, tier }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = `I just reached ${tier} tier with ${points.toLocaleString()} points on TrenchyBet! 🚀\n\nJoin me in the ultimate prediction market platform and earn rewards!`;
  const shareUrl = `${window.location.origin}/leaderboard`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(shareUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Share Achievement</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">{points.toLocaleString()}</div>
            <div className="text-blue-400 font-medium">{tier} Tier</div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-300 text-sm mb-3">{shareText}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <button
                onClick={copyToClipboard}
                className={`p-2 rounded-lg transition-colors ${
                  copied ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Copy className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={shareOnTwitter}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Twitter className="w-5 h-5 text-blue-400" />
              <span className="text-white">Share on Twitter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsShareModal;
