import React, { useState } from 'react';
import { X, Share2, Copy, Twitter, CheckCircle } from 'lucide-react';

/**
 * PointsShareModal
 *
 * FIX 1: Prop mismatch with PointsBalance.jsx.
 *   PointsBalance passes: pointsData={pointsData}, walletAddress={walletAddress}
 *   Modal accepted:       points, tier
 *   Both were always undefined → `points.toLocaleString()` crashed immediately.
 *   Now accepts `pointsData` (the full object from usePointsData) and derives
 *   display values from it, with null guards throughout.
 *
 * FIX 2: Design system — gray-* → dark-*\\/neutral-* tokens.
 */
export const PointsShareModal = ({
  isOpen,
  onClose,
  // FIX 1: accept pointsData object (what PointsBalance actually passes)
  pointsData,
  walletAddress,
  // Legacy support: also accept flat points + tier if called that way
  points: pointsProp,
  tier: tierProp,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // FIX 1: derive display values from whichever prop shape was passed
  const totalPoints = pointsData?.total_points ?? pointsProp ?? 0;
  const tierName    = tierProp?.name ?? tierProp ?? 'Bronze';

  const shareText = `I just reached ${tierName} tier with ${totalPoints.toLocaleString()} points on TrenchyBet! 🚀\n\nJoin me in the ultimate prediction market platform and earn rewards!`;
  const shareUrl  = `${window.location.origin}/leaderboard`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  const shareOnTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  return (
    // FIX 2: dark-* tokens
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Share Achievement</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Points display — FIX 1: null-safe */}
          <div className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {totalPoints.toLocaleString()}
            </div>
            <div className="text-primary font-medium">{tierName} Tier</div>
          </div>

          <div className="bg-dark-800/50 rounded-lg p-4">
            <p className="text-neutral-300 text-sm mb-3">{shareText}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
              />
              <button
                onClick={copyToClipboard}
                className={`p-2 rounded-lg transition-colors ${
                  copied ? 'bg-green-500' : 'bg-primary hover:bg-primary/90'
                }`}
                title={copied ? 'Copied!' : 'Copy link'}
              >
                {copied
                  ? <CheckCircle className="w-5 h-5 text-dark-950" />
                  : <Copy className="w-5 h-5 text-dark-950" />
                }
              </button>
            </div>
          </div>

          <button
            onClick={shareOnTwitter}
            className="w-full flex items-center justify-center gap-2 p-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-lg transition-colors"
          >
            <Twitter className="w-5 h-5 text-[#1DA1F2]" />
            <span className="text-white font-medium">Share on Twitter</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PointsShareModal;