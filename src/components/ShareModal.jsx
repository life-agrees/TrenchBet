import React from 'react';
import { X, Share2, Copy, Twitter, Send } from 'lucide-react';
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

  const shareOnFarcaster = () => {
    const text = `Check out this prediction market: ${marketTitle}`;
    window.open(
      `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(shareUrl)}`,
      '_blank'
    );
  };

  const shareOnTelegram = () => {
    const text = `Check out this prediction market: ${marketTitle}`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      '_blank'
    );
  };

  return (
    // FIX 3: dark-* tokens throughout
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-neutral-50 dark:bg-dark-900 border border-neutral-200 dark:border-dark-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Share Market</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 dark:text-white hover:bg-white dark:bg-dark-800 rounded-lg transition-colors"
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
              className="flex-1 bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700 rounded-lg px-3 py-2 text-neutral-900 dark:text-white text-sm focus:outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              title="Copy link"
            >
              <Copy className="w-5 h-5 text-dark-950" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={shareOnTwitter}
              className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-dark-800 hover:bg-neutral-100 dark:bg-dark-700 border border-neutral-200 dark:border-dark-700 rounded-xl transition-colors"
            >
              <Twitter className="w-5 h-5 text-[#1DA1F2]" />
              <span className="text-neutral-900 dark:text-white font-medium">Share on X (Twitter)</span>
            </button>
            <button
              onClick={shareOnFarcaster}
              className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-dark-800 hover:bg-violet-50 dark:bg-dark-700 border border-neutral-200 dark:border-dark-700 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" className="text-[#8a63d2]" fill="currentColor"><path d="M19.344 6.098c-.283-.49-1.282-.533-2.148-.22l-.128.026v-1.74l-.066-.013c-.886-.188-1.782-.01-2.482.49l-.046-.575c-.078-.96-1.554-1.298-2.673-.557l-.37.24V2.054L10.3 2H9.006A1.002 1.002 0 0 0 8.01 3v13H6.845a2.536 2.536 0 0 0-2.5 2.11L4.015 20.8A1.85 1.85 0 0 0 5.6 22.95h5.45c1.47 0 2.87-1.16 3.033-2.615l.6-5.264a2.298 2.298 0 0 0 .167-.714l.03-.432h.01c.433-.002.827-.14 1.157-.394.39-.296.67-.704.81-1.185l2.673-9.2a1.325 1.325 0 0 0-.186-1.047zm-5.753.11c.214-.15.485-.246.74-.246.066 0 .13.006.196.02L13.59 5.86v1.4l1.242.007-.05.158-.293.94H12.42v-2.158zM8.9 4v12a2.003 2.003 0 0 0-1.87 2.016l-.28 2.45a.86.86 0 0 1-.614.733.863.863 0 0 1-.876-.235.856.856 0 0 1-.168-.868l.33-2.695A3.535 3.535 0 0 1 8.9 14.31V3h.423v1zm5.2 10.985a1.282 1.282 0 0 1-1.173-1.283c0-.186.08-.363.228-.485a.735.735 0 0 1 .465-.164c.2 0 .393.076.545.21u-.002a.754.754 0 0 1 .23.518c0 .248-.094.484-.265.656a.916.916 0 0 1-.03.028z" /></svg>
              <span className="text-neutral-900 dark:text-white font-medium">Cast on Farcaster</span>
            </button>
            <button
              onClick={shareOnTelegram}
              className="w-full flex items-center justify-center gap-2 p-3 bg-white dark:bg-dark-800 hover:bg-sky-50 dark:bg-dark-700 border border-neutral-200 dark:border-dark-700 rounded-xl transition-colors"
            >
              <Send className="w-5 h-5 text-[#24A1DE]" />
              <span className="text-neutral-900 dark:text-white font-medium">Share on Telegram</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;