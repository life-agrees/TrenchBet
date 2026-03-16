import React from 'react';
import { X, Share2, Copy, Twitter } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateMarketTitle } from '../utils/marketDisplay';

/**
 * ShareModal
 *
 * FIX 1: `market.title` is always undefined — market objects don't have a
 *         `title` property. Titles are generated via `generateMarketTitle()`.
 *         Now uses that utility for both the description and the tweet text.
 *
 * FIX 2: `copyToClipboard` had no user feedback — added a toast notification.
 *
 * FIX 3: Design system migrated from gray-* to dark-* tokens to match the
 *         rest of the app.
 */
export const ShareModal = ({ isOpen, onClose, market }) => {
  if (!isOpen || !market) return null;

  const shareUrl = `${window.location.origin}/market/${market.id}`;

  // FIX 1: generate title the same way MarketCard does
  const marketTitle = generateMarketTitle(market);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast.success('Link copied to clipboard!')) // FIX 2: feedback
      .catch(() => toast.error('Failed to copy link'));
  };

  const shareOnTwitter = () => {
    // FIX 1: use generated title, not market.title
    const text = `Check out this prediction market: ${marketTitle}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  return (
    // FIX 3: dark-* tokens throughout
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white">Share Market</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* FIX 1: generated title */}
          <p className="text-neutral-400 text-sm">{marketTitle}</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              title="Copy link"
            >
              <Copy className="w-5 h-5 text-dark-950" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={shareOnTwitter}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded-lg transition-colors"
            >
              <Twitter className="w-5 h-5 text-[#1DA1F2]" />
              <span className="text-white font-medium">Share on Twitter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;