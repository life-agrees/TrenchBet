import React from 'react';
import { X, Share2, Copy, Twitter, Facebook, Link2 } from 'lucide-react';

export const ShareModal = ({ isOpen, onClose, market }) => {
  if (!isOpen || !market) return null;

  const shareUrl = `${window.location.origin}/market/${market.id}`;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  const shareOnTwitter = () => {
    const text = `Check out this prediction market: ${market.title}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Share Market</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-gray-400 text-sm">{market.title}</p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <Copy className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={shareOnTwitter}
              className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Twitter className="w-5 h-5 text-blue-400" />
              <span className="text-white">Twitter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
