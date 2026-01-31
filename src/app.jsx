import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits, formatUnits, parseAbiItem } from 'viem';
import { TrendingUp, TrendingDown, Clock, Loader2, DollarSign, Users, Wallet, Trophy, Target, Timer, BarChart3, Settings, AlertTriangle, CheckCircle, XCircle, X, RefreshCw, Copy, Twitter, Send } from 'lucide-react';
import { CONTRACTS, config } from './config/wagmi';
import AdminPanel from './components/AdminPanel';
import AddFundsModal from './components/AddFundsModal';
import { PREDICTION_MARKET_ABI, ERC20_ABI } from './contracts/abis';
import { sdk } from '@farcaster/miniapp-sdk';

import LandingPage from './LandingPage';
import {
  calculateMarketPercentages,
  calculateMultiplier,
  formatPercentage,
  formatMultiplier,
  calculatePayout
} from './marketUtils';

// = UTILITY FUNCTIONS =

// Hero Section Component
const LandingHero = ({ isConnected }) => (
  <div className="text-center py-12 md:py-20 px-4">
    <h1 className="text-4xl md:text-7xl font-black mb-6">
      <span className="text-gradient-primary">Predict. Bet. Win.</span>
    </h1>
    <p className="text-lg md:text-2xl text-neutral-300 max-w-3xl mx-auto mb-12">
      The boldest way to trade predictions on crypto prices. High stakes, real-time odds, pure adrenaline.
    </p>
    
    {/* Preview Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
      <div className="bg-dark-800 border-2 border-primary/30 p-8 rounded-2xl hover:border-primary hover:glow-primary transition-all duration-300">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="font-bold text-xl mb-3 text-white">Binary Markets</h3>
        <p className="text-sm text-neutral-400">Will BTC hit $150K? Simple UP or DOWN predictions with dynamic odds.</p>
      </div>
      
      <div className="bg-dark-800 border-2 border-success/30 p-8 rounded-2xl hover:border-success hover:glow-success transition-all duration-300">
        <div className="text-5xl mb-4">⚡</div>
        <h3 className="font-bold text-xl mb-3 text-white">Live Odds</h3>
        <p className="text-sm text-neutral-400">Real-time multipliers that change as the pool grows. Early bets get better odds.</p>
      </div>
      
      <div className="bg-dark-800 border-2 border-secondary/30 p-8 rounded-2xl hover:border-secondary hover:glow-secondary transition-all duration-300">
        <div className="text-5xl mb-4">💰</div>
        <h3 className="font-bold text-xl mb-3 text-white">Instant Payouts</h3>
        <p className="text-sm text-neutral-400">Win big? Claim your winnings instantly when markets resolve. No delays.</p>
      </div>
    </div>
    
    {!isConnected && (
      <div className="flex flex-col items-center gap-4">
        <ConnectButton />
        <p className="text-sm text-neutral-500">Connect your wallet to start trading predictions</p>
      </div>
    )}
    
    {isConnected && (
      <p className="text-neutral-400 text-lg">No active markets right now. Check back soon or contact the admin to create one!</p>
    )}
  </div>
);
const formatPrice = (price) => {
  return parseFloat(formatUnits(BigInt(price), 8)).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getMarketLabel = (marketType, asset) => {
  const typeMap = {
    0: 'Binary UP/DOWN',
    1: 'Multi-Choice',
    2: 'Range Market',
    3: 'Time-Based',
  };
  return `${asset} - ${typeMap[marketType] || 'Unknown Market'}`;
};

//  Updated formatting to remove massive days for Time-Based markets
const getMarketTimeRemaining = (market) => {
  // For Time-Based markets, we don't show a countdown if it's just a configuration timestamp
  if (market.marketType === 3) {
      return market.resolved ? "Ended" : "Active Target";
  }

  const now = Date.now();
  const end = Number(market.endTime);
  const remaining = end - now;

  if (remaining <= 0) return 'Market Ended';

  const seconds = Math.floor((remaining / 1000) % 60);
  const minutes = Math.floor((remaining / 1000 / 60) % 60);
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
};

//  Helper to format seconds into readable duration (e.g. "24 Hours")
const formatDuration = (seconds) => {
  if (seconds >= 86400) return `${(seconds / 86400).toFixed(0)} Days`;
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(0)} Hours`;
  return `${(seconds / 60).toFixed(0)} Mins`;
};
// Asset emoji helper
const getAssetEmoji = (asset) => {
  const emojiMap = {
    'BTC': '₿',
    'ETH': 'Ξ',
    'SOL': '◎',
    'CRYPTO': '💎',
  };
  return emojiMap[asset] || '💎';
};
const getChoiceLabel = (market, choiceIndex) => {
  if (market.marketType === 0) { // Binary
    return choiceIndex === 0 ? 'UP' : 'DOWN';
  }
  if (market.marketType === 1 && market.options && market.options[choiceIndex]) { // Multi-Choice
    return market.options[choiceIndex];
  }
  if (market.marketType === 2 && market.rangeMins && market.rangeMaxs && market.rangeMins[choiceIndex] !== undefined) { // Range
    const min = formatUnits(BigInt(market.rangeMins[choiceIndex]), 8);
    const max = formatUnits(BigInt(market.rangeMaxs[choiceIndex]), 8);
    return `[${min} - ${max}]`;
  }
  if (market.marketType === 3 && market.timeframes && market.timeframes[choiceIndex] !== undefined) { // Time-Based
    return `Hit by ${formatDuration(Number(market.timeframes[choiceIndex]))}`; // Uses new duration formatter
  }
  return `Choice ${choiceIndex + 1}`;
};

// Loading skeleton for markets
const MarketCardSkeleton = () => (
  <div className="bg-dark-800 border-2 border-dark-600 rounded-2xl p-6 animate-pulse">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-14 h-14 rounded-full bg-dark-700"></div>
      <div className="flex-1">
        <div className="h-6 bg-dark-700 rounded w-24 mb-2"></div>
        <div className="h-4 bg-dark-700 rounded w-32"></div>
      </div>
      <div className="h-6 bg-dark-700 rounded w-16"></div>
    </div>
    <div className="h-20 bg-dark-700 rounded mb-4"></div>
    <div className="grid grid-cols-2 gap-3">
      <div className="h-24 bg-dark-700 rounded"></div>
      <div className="h-24 bg-dark-700 rounded"></div>
    </div>
  </div>
);



// Leaderboard Component
const LeaderboardView = ({ data, isLoading, currentUserAddress }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="mt-4 text-neutral-400">Loading leaderboard...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-dark-800 rounded-2xl border-2 border-dark-600">
        <Trophy size={48} className="text-primary mb-4" />
        <p className="text-xl text-white mb-2">No Rankings Yet</p>
        <p className="text-neutral-400">Be the first to place a bet and climb the leaderboard!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top 3 Podium */}
      {data.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2nd Place */}
          <div className="pt-8">
            <div className="bg-gradient-to-br from-neutral-600 to-neutral-700 border-2 border-neutral-500 rounded-2xl p-6 text-center relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-neutral-500 rounded-full flex items-center justify-center text-2xl font-black border-4 border-dark-950">
                2
              </div>
              <div className="text-4xl mb-2">🥈</div>
              <p className="font-mono text-sm text-white mb-2">{data[1].displayAddress}</p>
              <div className="space-y-1">
                <p className="text-2xl font-black text-white">{data[1].wins} Wins</p>
                <p className="text-sm text-neutral-300">{data[1].winRate}% Win Rate</p>
                <p className="text-xs text-neutral-400">${data[1].totalVolume.toFixed(2)} Volume</p>
              </div>
            </div>
          </div>

          {/* 1st Place */}
          <div className="pt-0">
            <div className="bg-gradient-to-br from-primary to-success border-2 border-primary rounded-2xl p-8 text-center relative glow-primary">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-16 h-16 bg-primary rounded-full flex items-center justify-center text-3xl font-black border-4 border-dark-950 animate-pulse-slow">
                1
              </div>
              <div className="text-5xl mb-3">👑</div>
              <p className="font-mono text-sm text-dark-950 mb-3 font-bold">{data[0].displayAddress}</p>
              <div className="space-y-1">
                <p className="text-3xl font-black text-dark-950">{data[0].wins} Wins</p>
                <p className="text-sm text-dark-950 font-semibold">{data[0].winRate}% Win Rate</p>
                <p className="text-xs text-dark-900 font-medium">${data[0].totalVolume.toFixed(2)} Volume</p>
              </div>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="pt-8">
            <div className="bg-gradient-to-br from-amber-700 to-amber-800 border-2 border-amber-600 rounded-2xl p-6 text-center relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center text-2xl font-black border-4 border-dark-950">
                3
              </div>
              <div className="text-4xl mb-2">🥉</div>
              <p className="font-mono text-sm text-white mb-2">{data[2].displayAddress}</p>
              <div className="space-y-1">
                <p className="text-2xl font-black text-white">{data[2].wins} Wins</p>
                <p className="text-sm text-neutral-200">{data[2].winRate}% Win Rate</p>
                <p className="text-xs text-neutral-300">${data[2].totalVolume.toFixed(2)} Volume</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rest of Rankings */}
      <div className="bg-dark-800 rounded-2xl border-2 border-dark-600 overflow-hidden">
        <div className="bg-dark-700 px-6 py-4 border-b border-dark-600">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-secondary" size={24} />
            Full Rankings
          </h3>
        </div>

        <div className="divide-y divide-dark-600">
          {data.slice(data.length >= 3 ? 3 : 0).map((user, index) => {
            const rank = (data.length >= 3 ? 3 : 0) + index + 1;
            const isCurrentUser = currentUserAddress && user.address.toLowerCase() === currentUserAddress.toLowerCase();

            return (
              <div
                key={user.address}
                className={`px-6 py-4 flex items-center justify-between transition-all ${
                  isCurrentUser ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-dark-700'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    isCurrentUser ? 'bg-primary text-dark-950' : 'bg-dark-700 text-neutral-400'
                  }`}>
                    {rank}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-mono font-semibold ${isCurrentUser ? 'text-primary' : 'text-white'}`}>
                        {user.displayAddress}
                      </p>
                      {isCurrentUser && (
                        <span className="px-2 py-0.5 bg-primary/20 border border-primary text-primary text-xs font-bold rounded-full">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500">{user.totalBets} total bets</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-lg font-bold text-success">{user.wins} Wins</p>
                    <p className="text-xs text-neutral-500">{user.losses} Losses</p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{user.winRate}%</p>
                    <p className="text-xs text-neutral-500">Win Rate</p>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <p className="text-lg font-bold text-secondary">${user.totalVolume.toFixed(2)}</p>
                    <p className="text-xs text-neutral-500">Volume</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Share Modal Component
const ShareModal = ({ market, isOpen, onClose }) => {
  if (!isOpen || !market) return null;

  const shareUrl = `${window.location.origin}/?market=${market.id}`;
  const shareText = `Check out this prediction market on TrenchyBet!\n\n${market.asset} - ${getMarketLabel(market.marketType, market.asset)}\n\nPool: $${formatUnits(market.totalPool, 6)}\nEnds: ${new Date(Number(market.endTime) * 1000).toLocaleDateString()}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Show success feedback
      const button = document.getElementById('copy-button');
      const originalText = button.innerHTML;
      button.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Copied!';
      setTimeout(() => {
        button.innerHTML = originalText;
      }, 2000);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const shareToTwitter = () => {
    const tweetText = encodeURIComponent(`${shareText}\n\n${shareUrl} #TrenchyBet #PredictionMarket #Crypto`);
    window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');
  };

  const shareToTelegram = () => {
    const telegramText = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${telegramText}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const whatsappText = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
  };

  const shareToFarcaster = () => {
    const farcasterText = encodeURIComponent(shareText);
    window.open(`https://warpcast.com/~/compose?text=${farcasterText}&embeds[]=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-dark-800 to-dark-700 border-2 border-primary rounded-3xl p-8 w-full max-w-lg shadow-2xl glow-primary animate-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Share Market</h2>
          <p className="text-neutral-400">Spread the word and compete with friends!</p>
        </div>

        {/* Market Preview */}
        <div className="bg-dark-900 border border-primary/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-2xl">
              {getAssetEmoji(market.asset)}
            </div>
            <div>
              <h3 className="font-bold text-white">{market.asset} Market</h3>
              <p className="text-sm text-neutral-400">{getMarketLabel(market.marketType, market.asset)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-neutral-500">Pool Size</p>
              <p className="font-bold text-success">${formatUnits(market.totalPool, 6)}</p>
            </div>
            <div>
              <p className="text-neutral-500">Ends</p>
              <p className="font-bold text-white">{new Date(Number(market.endTime) * 1000).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Copy Link */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-neutral-300 mb-2">Share Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 px-4 py-3 bg-dark-900 border border-dark-600 rounded-xl text-white font-mono text-sm"
            />
            <button
              id="copy-button"
              onClick={copyToClipboard}
              className="px-6 py-3 bg-primary hover:bg-primary-400 text-dark-950 font-bold rounded-xl transition-all hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-neutral-300 mb-3">Share on Social Media</p>

          {/* Twitter/X */}
          <button
            onClick={shareToTwitter}
            className="w-full flex items-center gap-3 px-4 py-3 bg-black hover:bg-neutral-900 border border-neutral-700 hover:border-neutral-500 rounded-xl transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-neutral-700 flex items-center justify-center transition-all">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-white">Share on X (Twitter)</p>
              <p className="text-xs text-neutral-400">Post to your timeline</p>
            </div>
            <svg className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Telegram */}
          <button
            onClick={shareToTelegram}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#0088cc] hover:bg-[#0077b3] border border-[#0077b3] rounded-xl transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <svg className="w-6 h-6 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.14.121.099.155.232.171.326.016.094.036.308.02.475z"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-white">Share on Telegram</p>
              <p className="text-xs text-blue-200">Send to groups or channels</p>
            </div>
            <svg className="w-5 h-5 text-blue-200 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* WhatsApp */}
          <button
            onClick={shareToWhatsApp}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#25D366] hover:bg-[#1fc555] border border-[#1fc555] rounded-xl transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-white">Share on WhatsApp</p>
              <p className="text-xs text-green-200">Send to contacts</p>
            </div>
            <svg className="w-5 h-5 text-green-200 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Farcaster */}
          <button
            onClick={shareToFarcaster}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#8a63d2] hover:bg-[#7952c4] border border-[#7952c4] rounded-xl transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <svg className="w-6 h-6 text-[#8a63d2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.24 4.32l-3.12 15.6h-6.24l-3.12-15.6h2.88l2.4 12l2.4-12h2.88z"/>
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-white">Share on Farcaster</p>
              <p className="text-xs text-purple-200">Cast to your feed</p>
            </div>
            <svg className="w-5 h-5 text-purple-200 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 bg-dark-700 hover:bg-dark-600 text-white font-bold py-3 rounded-xl transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// ==================== NOTIFICATION HELPER FUNCTIONS ====================

// Notification Helper Functions
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

const showNotification = (title, options = {}) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/vite.svg', // Your app icon
      badge: '/vite.svg',
      vibrate: [200, 100, 200],
      ...options,
    });

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Handle click
    notification.onclick = () => {
      window.focus();
      notification.close();
      if (options.onClick) options.onClick();
    };
  }
};

const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-[70] px-6 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-3 ${
    type === 'success' ? 'bg-gradient-to-r from-success to-primary text-dark-950' :
    type === 'error' ? 'bg-gradient-to-r from-danger to-red-600 text-white' :
    type === 'warning' ? 'bg-gradient-to-r from-secondary to-amber-600 text-dark-950' :
    'bg-gradient-to-r from-primary to-success text-dark-950'
  }`;

  const icon = type === 'success'
    ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
    : type === 'error'
    ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
    : type === 'warning'
    ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
    : '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

  toast.innerHTML = `${icon}<span class="font-bold">${message}</span>`;
  document.body.appendChild(toast);

  // Remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'fade-out 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// ==================== NOTIFICATION SETTINGS COMPONENT ====================

// Notification Settings Component
const NotificationSettings = ({ isOpen, onClose, enabled, onToggle, permission }) => {
  if (!isOpen) return null;

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      onToggle(true);
      showToast('Notifications enabled! You\'ll be notified when you win 🎉', 'success');
    } else {
      showToast('Notification permission denied', 'error');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        className="bg-gradient-to-br from-dark-800 to-dark-700 border-2 border-primary rounded-3xl p-8 w-full max-w-lg shadow-2xl glow-primary animate-in zoom-in duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-white mb-2">Notifications</h2>
          <p className="text-neutral-400">Get notified about important events</p>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="bg-dark-900 border border-primary/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-white text-lg">Push Notifications</h3>
                <p className="text-sm text-neutral-400">
                  {permission === 'granted' 
                    ? 'Stay updated on your bets' 
                    : permission === 'denied'
                    ? 'Permission denied - enable in browser settings'
                    : 'Allow notifications to stay informed'}
                </p>
              </div>
              <button
                onClick={() => enabled ? onToggle(false) : handleEnableNotifications()}
                disabled={permission === 'denied'}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  enabled ? 'bg-primary' : 'bg-dark-700'
                } ${permission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {permission === 'denied' && (
              <div className="bg-danger/10 border border-danger rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-danger mt-0.5 flex-shrink-0" />
                <p className="text-xs text-danger">
                  Notifications are blocked. Please enable them in your browser settings.
                </p>
              </div>
            )}
          </div>

          {/* What you'll be notified about */}
          {enabled && (
            <div className="bg-dark-900 border border-dark-600 rounded-xl p-6">
              <h4 className="font-bold text-white mb-3">You'll be notified about:</h4>
              <ul className="space-y-2">
                {[
                  { icon: '🏆', text: 'When you win a bet' },
                  { icon: '📊', text: 'When markets you bet on are resolved' },
                  { icon: '⏰', text: 'When markets are about to end (15 min warning)' },
                  { icon: '💰', text: 'When you can claim winnings' },
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-sm text-neutral-300">
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.text}</span>
                    <svg className="w-4 h-4 text-success ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Test Notification */}
          {enabled && (
            <button
              onClick={() => {
                showNotification('🎉 Test Notification', {
                  body: 'Notifications are working! You\'ll be alerted when you win bets.',
                  tag: 'test',
                });
                showToast('Test notification sent!', 'info');
              }}
              className="w-full bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 hover:border-primary text-white font-bold py-3 rounded-xl transition-all"
            >
              Send Test Notification
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 bg-primary hover:bg-primary-400 text-dark-950 font-bold py-3 rounded-xl transition-all hover:scale-105"
        >
          Done
        </button>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const App = () => {
  const lastBetRef = useRef(null);
  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [markets, setMarkets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [currentView, setCurrentView] = useState('markets');
  const [betView, setBetView] = useState('ongoing');
  const [farcasterUser, setFarcasterUser] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState(0n);
  const [userBets, setUserBets] = useState([]);
  const [betAmount, setBetAmount] = useState('10');
  const [selectedBet, setSelectedBet] = useState(null);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [selectedAssetFilter, setSelectedAssetFilter] = useState('ALL');
  const [shareModalData, setShareModalData] = useState(null);

  const [userStats, setUserStats] = useState({
    totalBets: 0,
    wins: 0,
    losses: 0,
    streak: 0,
  });

  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  const [showLanding, setShowLanding] = useState(true);

  // Calculate live stats for landing page
  const liveStats = useMemo(() => {
    const activeMarkets = markets.filter(m => m.isActive).length;
    const totalVolume = markets.reduce((sum, m) =>
      sum + (parseFloat(m.upPool || 0) + parseFloat(m.downPool || 0)), 0
    );
    const totalBets = markets.reduce((sum, m) =>
      sum + (parseInt(m.totalBets || 0)), 0
    );

    return {
      activeMarkets,
      totalVolume: Math.round(totalVolume),
      totalBets
    };
  }, [markets]);

  // ==== WAGMI & DATA FETCHING ====
  const checkIsOwner = useCallback(async () => {
    if (!address || !publicClient) {
      console.log('checkIsOwner: No address or publicClient', { address, publicClient });
      setIsOwner(false);
      return;
    }
    try {
      console.log('checkIsOwner: Fetching owner for address:', address);
      const ownerAddress = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'owner',
      });
      console.log('checkIsOwner: Contract owner:', ownerAddress);
      console.log('checkIsOwner: User address:', address);
      const isOwnerCheck = ownerAddress.toLowerCase() === address.toLowerCase();
      console.log('checkIsOwner: Is owner?', isOwnerCheck);
      setIsOwner(isOwnerCheck);
    } catch (error) {
      console.error('Error fetching owner:', error);
      setIsOwner(false);
    }
  }, [address, publicClient]);


  const fetchUSDCBalance = useCallback(async () => {
    if (!address || !publicClient) {
      setUsdcBalance(0n);
      return;
    }
    try {
      const balance = await publicClient.readContract({
        address: CONTRACTS.USDC, 
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      setUsdcBalance(balance);
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      setUsdcBalance(0n);
    }
  }, [address, publicClient]);
  
  const fetchMarketDetails = useCallback(async (marketId) => {
    const market = await publicClient.readContract({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getMarket',
      args: [marketId],
    });

    let extraData = {};
    if (market.marketType === 1) { // Multi-Choice
      const options = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getMultiChoiceOptions',
        args: [marketId],
      });
      extraData = { options };
    } else if (market.marketType === 2) { // Range
      const [rangeMins, rangeMaxs] = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getRangeMarketData',
        args: [marketId],
      });
      extraData = { rangeMins, rangeMaxs };
    } else if (market.marketType === 3) { // Time-Based
      const [targetPrice, timeframes] = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getTimeMarketData',
        args: [marketId],
      });
      extraData = { targetPrice, timeframes };
    }

    const multipliers = await publicClient.readContract({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getCurrentOdds',
      args: [marketId],
    });
    
    let finalWinningChoiceIndex = undefined;
    if (market.resolved) {
        if (market.marketType === 0) { // Binary Market
            finalWinningChoiceIndex = market.priceWentUp ? 0 : 1;
        } else { 
            try {
                const events = await publicClient.getLogs({
                    address: CONTRACTS.PREDICTION_MARKET,
                    event: parseAbiItem('event MarketResolved(uint256 indexed marketId, uint8 winningChoice)'),
                    args: { marketId: BigInt(marketId) },
                    fromBlock: 'earliest'
                });
                
                if (events.length > 0) {
                    finalWinningChoiceIndex = Number(events[0].args.winningChoice);
                }
            } catch (e) {
                // console.warn(`Could not fetch resolution log for Market ${marketId}`);
            }
        }
    }

    let totalPool = market.yesPool + market.noPool;
    if (market.marketType !== 0) {
        totalPool = market.totalBets; 
    }

    return {
      id: market.id,
      marketType: Number(market.marketType),
      asset: market.asset,
      startTime: market.startTime,
      endTime: Number(market.endTime) * 1000, 
      startPrice: market.startPrice,
      endPrice: market.endPrice,
      yesPool: market.yesPool,
      noPool: market.noPool,
      totalPool: totalPool,
      resolved: market.resolved,
      priceWentUp: market.priceWentUp,
      winningChoice: finalWinningChoiceIndex,
      totalBets: market.totalBets,
      useFixedOdds: market.useFixedOdds,
      multipliers: multipliers,
      ...extraData,
    };
  }, [publicClient]);

  const fetchMarkets = useCallback(async () => {
    if (!publicClient) return;
    
    setMarkets(prev => {
        if (prev.length === 0) setIsLoadingMarkets(true);
        return prev;
    });

    try {
      const counter = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'marketCounter',
      });
      
      const marketIds = Array.from({ length: Number(counter) }, (_, i) => BigInt(i + 1));

      const fetchedMarkets = await Promise.all(
        marketIds.map((id) => fetchMarketDetails(id))
      );

      setMarkets(fetchedMarkets.sort((a, b) => Number(b.id) - Number(a.id)));

    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setIsLoadingMarkets(false);
    }
  }, [publicClient, fetchMarketDetails]);

  const fetchUserBets = useCallback(async () => {
    if (!address || !publicClient || markets.length === 0) {
      setUserBets([]);
      return;
    }
    try {
      const userMarkets = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getUserMarkets',
        args: [address],
      });

      const allPositions = await Promise.all(
        userMarkets.map((marketId) =>
          publicClient.readContract({
            address: CONTRACTS.PREDICTION_MARKET,
            abi: PREDICTION_MARKET_ABI,
            functionName: 'getUserPositionsInMarket',
            args: [marketId, address],
          })
        )
      );

      const marketDataMap = new Map(markets.map(m => [m.id, m]));

      const betsWithMarketData = await Promise.all(allPositions.flat().map(async (position) => {
        const market = marketDataMap.get(position.marketId);
        
        let potentialPayout = 0n;
        if (market && !market.resolved) {
          try {
            potentialPayout = await publicClient.readContract({
                address: CONTRACTS.PREDICTION_MARKET,
                abi: PREDICTION_MARKET_ABI,
                functionName: 'calculatePotentialPayout',
                args: [position.marketId, position.choice, position.amount],
            });
          } catch (e) {}
        }

        //  Verify claimability via simulation AND logic
        let isClaimableConfirmed = false;
        if (market && market.resolved && !position.claimed) {
            
            // Logic Check: Does the winner match the bet?
            let logicSaysWin = false;
            
            // If we have the winning choice index (from logs)
            if (market.winningChoice !== undefined) {
                logicSaysWin = Number(market.winningChoice) === Number(position.choice);
            } else if (market.marketType === 0) { 
                // Binary fallback if log missing
                logicSaysWin = market.priceWentUp === (position.choice === 0n);
            } else {
                // For Multi/Range/Time without logs, we rely solely on simulation
                logicSaysWin = true; 
            }

            // Only run simulation if logic suggests a win (saves RPC calls)
            if (logicSaysWin) {
                try {
                    await publicClient.simulateContract({
                        address: CONTRACTS.PREDICTION_MARKET,
                        abi: PREDICTION_MARKET_ABI,
                        functionName: 'claimWinnings',
                        args: [position.marketId],
                        account: address 
                    });
                    isClaimableConfirmed = true;
                } catch (e) {
                    isClaimableConfirmed = false;
                }
            }
        }

        return {
          ...position,
          market: market || {},
          potentialPayout: potentialPayout,
          isClaimableConfirmed: isClaimableConfirmed, // Use this for the button
          marketLabel: market ? getMarketLabel(Number(market.marketType), market.asset) : 'N/A',
          choiceLabel: market ? getChoiceLabel(market, Number(position.choice)) : `Choice ${Number(position.choice)}`,
        };
      }));

      setUserBets(betsWithMarketData.sort((a, b) => Number(b.marketId) - Number(a.marketId)));

    } catch (error) {
      console.error('Error fetching user bets:', error);
    }
  }, [address, publicClient, markets]);

  const fetchUserStats = useCallback(async () => {
    if (!address || userBets.length === 0) {
      setUserStats(prev => ({ ...prev, totalBets: 0, wins: 0, losses: 0, streak: 0 }));
      return;
    }

    let wins = 0;
    let losses = 0;
    let currentStreak = 0;

    const sortedBets = [...userBets].sort((a, b) => Number(b.market.id) - Number(a.market.id));

    for (const bet of sortedBets) {
      const market = bet.market;

      if (market.resolved) {
        //  Logic Update: If it was claimable (verified by simulation) OR claimed, it's a WIN.
        // Otherwise, it is a LOSS.
        const isWinner = bet.isClaimableConfirmed || bet.claimed;

        if (isWinner) {
          wins++;
          currentStreak++; // Increment streak on win
        } else {
          losses++;
          currentStreak = 0; // Reset streak on loss
        }
      }
    }

    setUserStats({
      totalBets: userBets.length,
      wins: wins,
      losses: losses,
      streak: currentStreak, // No Math.abs needed, streak is always positive
    });

  }, [address, userBets]);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    if (!publicClient) return;

    setIsLoadingLeaderboard(true);

    try {
      // Get all unique bettors from events
      // This is a simplified version - in production you'd use The Graph or indexing
      const userBetsMap = new Map();

      // Aggregate data from userBets (we'll need to fetch ALL bets, not just current user)
      // For now, let's create a leaderboard from available data

      // Get recent bet events from the contract
      const betPlacedEvents = await publicClient.getLogs({
        address: CONTRACTS.PREDICTION_MARKET,
        event: {
          type: 'event',
          name: 'BetPlaced',
          inputs: [
            { type: 'uint256', name: 'marketId', indexed: true },
            { type: 'address', name: 'user', indexed: true },
            { type: 'uint256', name: 'choiceIndex', indexed: false },
            { type: 'uint256', name: 'amount', indexed: false },
          ],
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Aggregate by user
      betPlacedEvents.forEach(log => {
        const user = log.args.user;
        const amount = Number(formatUnits(log.args.amount || 0n, 6));

        if (!userBetsMap.has(user)) {
          userBetsMap.set(user, {
            address: user,
            totalBets: 0,
            totalVolume: 0,
            wins: 0,
            losses: 0,
          });
        }

        const userData = userBetsMap.get(user);
        userData.totalBets += 1;
        userData.totalVolume += amount;
      });

      // Get win events
      const betResolvedEvents = await publicClient.getLogs({
        address: CONTRACTS.PREDICTION_MARKET,
        event: {
          type: 'event',
          name: 'BetResolved',
          inputs: [
            { type: 'uint256', name: 'marketId', indexed: true },
            { type: 'address', name: 'user', indexed: true },
            { type: 'uint256', name: 'payout', indexed: false },
          ],
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Update wins
      betResolvedEvents.forEach(log => {
        const user = log.args.user;
        const payout = Number(formatUnits(log.args.payout || 0n, 6));

        if (userBetsMap.has(user)) {
          const userData = userBetsMap.get(user);
          if (payout > 0) {
            userData.wins += 1;
          } else {
            userData.losses += 1;
          }
        }
      });

      // Convert to array and calculate win rates
      const leaderboard = Array.from(userBetsMap.values()).map(user => ({
        ...user,
        winRate: user.totalBets > 0 ? ((user.wins / user.totalBets) * 100).toFixed(1) : '0.0',
        displayAddress: `${user.address.slice(0, 6)}...${user.address.slice(-4)}`,
      }));

      // Sort by wins (you can change sorting criteria)
      leaderboard.sort((a, b) => {
        // Primary: Most wins
        if (b.wins !== a.wins) return b.wins - a.wins;
        // Secondary: Highest win rate
        if (parseFloat(b.winRate) !== parseFloat(a.winRate))
          return parseFloat(b.winRate) - parseFloat(a.winRate);
        // Tertiary: Most volume
        return b.totalVolume - a.totalVolume;
      });

      setLeaderboardData(leaderboard.slice(0, 50)); // Top 50

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboardData([]);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [publicClient]);

const refreshData = useCallback(async () => {
  if (isConnected && address) {
    await Promise.all([
      fetchMarkets(),
      fetchUSDCBalance(),
      // checkIsOwner removed - only check on wallet connect
      fetchUserBets()
    ]);
  }
}, [isConnected, address, fetchMarkets, fetchUSDCBalance, fetchUserBets]);

  //  HANDLERS (Approve, Bet, Resolve, Claim) 

  const handleApprove = async (amount) => {
    if (!address || !publicClient) {
      console.error('Wallet not connected');
      return null;
    }

    try {
      console.log('🔓 Requesting approval for:', amount, 'USDC');

      const hash = await writeContractAsync({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.PREDICTION_MARKET, parseUnits(amount, 6)],
      });

      console.log('✅ Approval transaction sent:', hash);
      return hash;

    } catch (error) {
      console.error('❌ Approval error:', error);

      // Handle user rejection
      if (error.message?.includes('User rejected') || error.message?.includes('user rejected')) {
        console.log('User cancelled approval');
        return null;
      }

      // Log the actual error for debugging
      console.error('Approval failed:', error.message || error);
      throw error; // Re-throw so placeBetOnChain can handle it
    }
  };

  const placeBetOnChain = async (market, choiceIndex) => {
    if (!address) { 
      alert('Please connect your wallet to place bets!');
      return; 
    }

    // Prevent multiple simultaneous bets
    if (isPlacingBet) {
      console.log('Bet already in progress');
      return;
    }

    setIsPlacingBet(true);

    const betAmountBigInt = parseUnits(betAmount, 6);
    
    // Validation
    if (betAmountBigInt <= 0n) {
      alert('Please enter a valid bet amount');
      return;
    }

    try {
      // Check USDC balance first
      let currentBalance;
      try {
        currentBalance = await publicClient.readContract({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        });
      } catch (balanceError) {
        console.error('Error checking balance:', balanceError);
        alert('Network error: Unable to check your balance. Please try again or check your RPC connection.');
        setIsPlacingBet(false);
        return;
      }

      if (currentBalance < betAmountBigInt) {
        alert(`Insufficient balance. You have ${formatUnits(currentBalance, 6)} USDC but trying to bet ${betAmount} USDC.`);
        setIsPlacingBet(false);
        return;
      }

      // Check and request approval if needed
      let allowance;
      try {
        allowance = await publicClient.readContract({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, CONTRACTS.PREDICTION_MARKET],
        });
      } catch (allowanceError) {
        console.error('Error checking allowance:', allowanceError);
        alert('Network error: Unable to check token allowance. Please try again.');
        setIsPlacingBet(false);
        return;
      }

      // If allowance is insufficient, request approval
      if (allowance < betAmountBigInt) {
        try {
          console.log('💰 Insufficient allowance. Requesting approval...');
          const approveHash = await handleApprove(betAmount);

          if (!approveHash) {
            console.log('Approval was cancelled by user');
            setIsPlacingBet(false);
            return;
          }

          console.log('⏳ Waiting for approval to be mined...');
          await publicClient.waitForTransactionReceipt({
            hash: approveHash,
            timeout: 60000,
            confirmations: 1,
          });

          console.log('✅ Approval confirmed! Waiting 2s before placing bet...');
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (approveError) {
          console.error('❌ Approval error:', approveError);

          // Better error messages
          let errorMessage = 'Token approval failed';

          if (approveError.message?.includes('User rejected')) {
            errorMessage = 'You cancelled the approval';
          } else if (approveError.message?.includes('insufficient funds')) {
            errorMessage = 'Insufficient ETH for gas fees';
          } else if (approveError.message?.includes('getChainId')) {
            errorMessage = 'Wallet connection error. Please reconnect your wallet and try again.';
          } else {
            errorMessage = `Approval failed: ${approveError.shortMessage || approveError.message || 'Unknown error'}`;
          }

          alert(errorMessage);
          setIsPlacingBet(false);
          return;
        }
      }

      // Place the bet
      try {
        const txHash = await writeContractAsync({
          address: CONTRACTS.PREDICTION_MARKET,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'placeBet',
          args: [market.id, choiceIndex, betAmountBigInt], 
        });
        
        lastBetRef.current = txHash;
        
      } catch (betError) {
        console.error('Bet placement error:', betError);
        
        // User rejected transaction
        if (betError.message?.includes('User rejected') || betError.message?.includes('user rejected')) {
          alert('Transaction cancelled');
          setIsPlacingBet(false);
          return;
        }
        
        // Network/RPC error
        if (betError.message?.includes('503') || betError.message?.includes('rate limit')) {
          alert('Network error: RPC rate limit reached. Please wait a moment and try again.');
          return;
        }
        
        // Generic error
        alert('Failed to place bet: ' + (betError.shortMessage || betError.message || 'Unknown error'));
      }
      
    } catch (error) {
      console.error('Unexpected error in placeBetOnChain:', error);
      alert('An unexpected error occurred. Please refresh the page and try again.');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleResolve = async (marketId, winningChoice) => {
    if (!isOwner) { alert('Admin only.'); return; }
    const market = markets.find(m => m.id === marketId);
    if (!market) return;

    let functionName = 'resolveMarket';
    let args = [marketId];

    if (market.marketType === 1) { 
      functionName = 'resolveMultiChoiceMarket';
      args = [marketId, winningChoice];
    } else if (market.marketType === 2) functionName = 'resolveRangeMarket';
    else if (market.marketType === 3) functionName = 'resolveTimeMarket';

    try {
      await writeContractAsync({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: functionName,
        args: args,
      });
      alert('Resolution sent.');
    } catch (error) {
      alert(`Resolution failed: ${error.shortMessage || error.message}`);
    }
  };

  const handleClaim = async (marketId) => {
    if (!address) { alert('Connect wallet.'); return; }
    try {
      await writeContractAsync({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'claimWinnings',
        args: [marketId],
      });
      alert('Claim sent.');
    } catch (error) {
      alert(`Claim failed: ${error.shortMessage || error.message}`);
    }
  };

  //  EFFECTS 

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Check if it's an RPC error
      if (event.reason?.message?.includes('503') || 
          event.reason?.message?.includes('rate limit') ||
          event.reason?.message?.includes('Too Many Requests')) {
        
        // Show user-friendly error
        alert('Network congestion detected. Please wait a moment and try again.');
        
        // Prevent the error from crashing the app
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    refreshData();

    // Auto-refresh markets every 30 seconds
    const interval = setInterval(() => {
      if (isConnected) {
        fetchMarkets();
        fetchUSDCBalance();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, refreshData, fetchMarkets, fetchUSDCBalance]);

  // Auto-update market status every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update "LIVE" badges
      setMarkets(prev => [...prev]);
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userBets.length > 0 || !isConnected) fetchUserStats();
  }, [userBets, isConnected, fetchUserStats]);

  // Check if user is owner - ONLY when wallet connects/changes
  useEffect(() => {
    if (address && publicClient) {
      checkIsOwner();
    } else {
      setIsOwner(false);
    }
  }, [address, publicClient, checkIsOwner]);

  useEffect(() => {
    if (isSuccess && lastBetRef.current === hash) {
      setSelectedBet(null);

      // Show success toast
      showToast('Bet placed successfully! 🎉', 'success');

      // Show notification if enabled
      if (notificationsEnabled) {
        showNotification('✅ Bet Placed!', {
          body: `Your bet of $${betAmount} has been placed successfully. Good luck!`,
          tag: 'bet-placed',
        });
      }

      refreshData();
      lastBetRef.current = null;
    } else if (isSuccess) {
      refreshData();
    }
  }, [isSuccess, hash, refreshData, notificationsEnabled, betAmount]);

  useEffect(() => {
    if (sdk.isFarcaster) {
      sdk.getUserContext().then(setFarcasterUser).catch(e => console.error(e));
    }
  }, []);

  // Fetch leaderboard data when leaderboard tab is selected
  useEffect(() => {
    if (isConnected && currentView === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [isConnected, currentView, fetchLeaderboard]);

  // Check notification permission on load
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === 'granted' && localStorage.getItem('notifications_enabled') === 'true');
    }
  }, []);

  // Save notification preference
  useEffect(() => {
    if (notificationsEnabled) {
      localStorage.setItem('notifications_enabled', 'true');
    } else {
      localStorage.setItem('notifications_enabled', 'false');
    }
  }, [notificationsEnabled]);

  // Watch for resolved bets and notify on wins
  useEffect(() => {
    if (!notificationsEnabled || !isConnected || !address) return;

    const previousBets = JSON.parse(localStorage.getItem('previous_bets') || '[]');
    const currentBetIds = userBets.map(bet => bet.marketId.toString());

    // Find newly resolved bets
    userBets.forEach(bet => {
      const betKey = `${bet.marketId}-${bet.user}`;
      const wasPending = previousBets.includes(betKey);

      if (wasPending && bet.payout > 0n) {
        // User won!
        const winAmount = formatUnits(bet.payout, 6);

        showNotification('🏆 You Won!', {
          body: `Congratulations! You won $${winAmount} USDC!`,
          tag: `win-${bet.marketId}`,
          onClick: () => {
            setCurrentView('myBets');
          },
        });

        showToast(`You won $${winAmount} USDC! 🎉`, 'success');
      } else if (wasPending && bet.claimed) {
        // Bet resolved but lost
        showToast('Market resolved - Better luck next time!', 'warning');
      }
    });

    // Save current bets
    localStorage.setItem('previous_bets', JSON.stringify(
      userBets.filter(bet => !bet.claimed).map(bet => `${bet.marketId}-${bet.user}`)
    ));

  }, [userBets, notificationsEnabled, isConnected, address]);

  // Notify when markets are ending soon (15 minutes)
  useEffect(() => {
    if (!notificationsEnabled || markets.length === 0) return;

    const checkEndingSoonMarkets = () => {
      const now = Date.now();
      const fifteenMinutes = 15 * 60 * 1000;

      markets.forEach(market => {
        if (market.resolved) return;

        const timeUntilEnd = (Number(market.endTime) * 1000) - now;
        const notifiedKey = `notified-ending-${market.id}`;

        // If market ends in less than 15 minutes and we haven't notified yet
        if (timeUntilEnd > 0 && timeUntilEnd <= fifteenMinutes && !localStorage.getItem(notifiedKey)) {
          // Check if user has a bet on this market
          const hasBet = userBets.some(bet => bet.marketId.toString() === market.id.toString());

          if (hasBet) {
            showNotification('⏰ Market Ending Soon!', {
              body: `${market.asset} market ends in ${Math.floor(timeUntilEnd / 60000)} minutes!`,
              tag: `ending-${market.id}`,
              onClick: () => {
                setCurrentView('markets');
              },
            });

            localStorage.setItem(notifiedKey, 'true');
          }
        }

        // Clean up old notifications
        if (timeUntilEnd < 0) {
          localStorage.removeItem(notifiedKey);
        }
      });
    };

    // Check immediately
    checkEndingSoonMarkets();

    // Check every minute
    const interval = setInterval(checkEndingSoonMarkets, 60000);

    return () => clearInterval(interval);
  }, [markets, notificationsEnabled, userBets]);

  //  RENDER HELPERS

  const renderMarketDetails = (market) => {
    // Asset emoji mapping
    const getAssetEmoji = (asset) => {
      const emojiMap = {
        'BTC': '₿',
        'ETH': 'Ξ',
        'SOL': '◎',
      };
      return emojiMap[asset] || '💎';
    };

    const getOddsDisplay = (choiceIndex) => {
      if (market.useFixedOdds) {
        return formatUnits(market.multipliers[choiceIndex] || 200n, 2);
      }

      if (Number(market.totalPool) < 0.1) {
        return "2.00";
      }

      if (market.marketType === 0) {
        const sidePool = choiceIndex === 0 ? Number(market.yesPool) : Number(market.noPool);
        if (sidePool < 0.000001) return "2.00";
        return (Number(market.totalPool) / sidePool).toFixed(2);
      }

      return "Dynamic";
    };

    let choices = [];
    
    if (market.marketType === 0) {
      choices = [
        { label: 'UP', choiceIndex: 0, multiplier: getOddsDisplay(0) },
        { label: 'DOWN', choiceIndex: 1, multiplier: getOddsDisplay(1) },
      ];
    } else if (market.marketType === 1) {
      choices = market.options.map((label, index) => ({
        label,
        choiceIndex: index,
        multiplier: getOddsDisplay(index)
      }));
    } else if (market.marketType === 2) {
      choices = market.rangeMins.map((min, index) => ({
        label: `[${formatUnits(min, 8)} - ${formatUnits(market.rangeMaxs[index], 8)}]`,
        choiceIndex: index,
        multiplier: getOddsDisplay(index)
      }));
    } else if (market.marketType === 3) {
      choices = market.timeframes.map((timeframe, index) => ({
        label: `Hit by ${formatDuration(Number(timeframe))}`,
        choiceIndex: index,
        multiplier: getOddsDisplay(index)
      }));
    }

    const now = Date.now();
    const marketStatus = getMarketTimeRemaining(market);
    const isLive = !market.resolved && Number(market.endTime) > now;
    const isExpired = !market.resolved && Number(market.endTime) <= now;
    const isResolved = market.resolved;

    return (
      <div 
        key={Number(market.id)} 
        className="bg-dark-800 border-2 border-dark-600 rounded-2xl p-6 hover:border-primary hover:glow-primary transition-all duration-300 cursor-pointer group"
      >
        {/* Header with Asset Icon */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Asset Icon Circle */}
            <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
              {getAssetEmoji(market.asset)}
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">{market.asset}</h3>
              <p className="text-sm text-neutral-400">{getMarketLabel(market.marketType, market.asset)}</p>
            </div>
          </div>
          
          {/* Live Badge with Pulse */}
          <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 border ${
            isLive ? 'bg-success/20 text-success border-success' :
            isExpired ? 'bg-secondary/20 text-secondary border-secondary' :
            'bg-neutral-600 text-white border-neutral-600'
          }`}>
            {isLive && <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>}
            {isExpired && <Clock size={14} />}
            {isResolved ? 'RESOLVED' : isLive ? 'LIVE' : isExpired ? 'ENDED' : marketStatus}
          </span>
        </div>

        {/* Price Info */}
        <div className="flex justify-between items-center text-sm text-neutral-400 border-b border-dark-600 pb-4 mb-4">
          <div className="flex flex-col">
            <span className="text-xs text-neutral-500">Start Price</span>
            <span className="font-semibold text-white">{formatPrice(market.startPrice)}</span>
            {market.marketType === 3 && (
              <span className="text-secondary font-bold mt-1 text-xs">
                Target: {formatPrice(market.targetPrice)}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end">
            <span className="text-xs text-neutral-500">Pool Size</span>
            <span className="font-bold text-success flex items-center gap-1">
              <DollarSign size={14} />
              {formatUnits(market.totalPool, 6)}
            </span>
            <span className="text-xs text-primary mt-1">
              Ends: {new Date(Number(market.endTime)).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Admin Notice for Expired Markets */}
        {isOwner && isExpired && (
          <div className="bg-secondary/10 border-2 border-secondary rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-secondary" />
              <span className="text-sm font-bold text-secondary">Admin Action Required</span>
            </div>
            <p className="text-xs text-neutral-400 mb-3">
              This market has ended and needs resolution. Go to Admin Panel to resolve.
            </p>
            <button
              onClick={() => setShowAdminPanel(true)}
              className="w-full bg-secondary hover:bg-secondary-500 text-dark-950 font-bold py-2 px-4 rounded-lg text-sm transition-all hover:scale-105"
            >
              Open Admin Panel
            </button>
          </div>
        )}

        {/* Betting buttons with PERCENTAGES + MULTIPLIERS */}
        {(() => {
          const { upPercentage, downPercentage } = calculateMarketPercentages(
            parseFloat(market.yesPool || 0),
            parseFloat(market.noPool || 0)
          );
          const totalPool = parseFloat(market.yesPool || 0) + parseFloat(market.noPool || 0);
          const upMultiplier = calculateMultiplier(totalPool, parseFloat(market.yesPool || 0));
          const downMultiplier = calculateMultiplier(totalPool, parseFloat(market.noPool || 0));

          return (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* UP Button */}
                <button
                  onClick={() => {
                    if (!isLive) {
                      if (isExpired) {
                        alert('This market has ended and is awaiting resolution by the admin.');
                      } else {
                        alert('This market has been resolved.');
                      }
                      return;
                    }
                    if (!address) {
                      alert('Please connect your wallet first!');
                      return;
                    }
                    try {
                      const balance = Number(formatUnits(usdcBalance, 6));
                      const defaultBet = balance > 10 ? '10' : balance > 1 ? '1' : '0.5';
                      setBetAmount(defaultBet);
                  setSelectedBet({...market, choice: 0, choiceLabel: 'UP', multiplier: upMultiplier});
                    } catch (error) {
                      console.error('Error opening bet modal:', error);
                      alert('Failed to open bet modal. Please try again.');
                    }
                  }}
                  disabled={!isLive}
                  className="p-4 bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/50 rounded-xl hover:border-green-500 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-sm text-gray-400 mb-1">UP</div>
                  <div className="text-3xl font-black text-green-400 mb-1">
                    {upPercentage}%
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {formatMultiplier(upMultiplier)}
                  </div>
                </button>

                {/* DOWN Button */}
                <button
                  onClick={() => {
                    if (!isLive) {
                      if (isExpired) {
                        alert('This market has ended and is awaiting resolution by the admin.');
                      } else {
                        alert('This market has been resolved.');
                      }
                      return;
                    }
                    if (!address) {
                      alert('Please connect your wallet first!');
                      return;
                    }
                    try {
                      const balance = Number(formatUnits(usdcBalance, 6));
                      const defaultBet = balance > 10 ? '10' : balance > 1 ? '1' : '0.5';
                      setBetAmount(defaultBet);
                      setSelectedBet({...market, choice: 1, choiceLabel: 'DOWN', multiplier: downMultiplier});
                    } catch (error) {
                      console.error('Error opening bet modal:', error);
                      alert('Failed to open bet modal. Please try again.');
                    }
                  }}
                  disabled={!isLive}
                  className="p-4 bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-700/50 rounded-xl hover:border-red-500 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-sm text-gray-400 mb-1">DOWN</div>
                  <div className="text-3xl font-black text-red-400 mb-1">
                    {downPercentage}%
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {formatMultiplier(downMultiplier)}
                  </div>
                </button>
              </div>

              {/* Pool distribution bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Pool Split</span>
                  <span>{upPercentage}% / {downPercentage}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-green-500 transition-all duration-500"
                    style={{ width: `${upPercentage}%` }}
                  />
                  <div
                    className="bg-red-500 transition-all duration-500"
                    style={{ width: `${downPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Admin Controls */}
        {isOwner && isLive && market.marketType === 0 && (
          <div className="mt-4 flex gap-2 pt-4 border-t border-dark-600">
            <button onClick={() => handleResolve(market.id, 1)} className="flex-1 bg-danger hover:bg-danger-dark text-white font-bold py-3 rounded-xl text-sm transition-all hover:scale-105">
              Resolve DOWN (Admin)
            </button>
            <button onClick={() => handleResolve(market.id, 0)} className="flex-1 bg-success hover:bg-success-dark text-dark-950 font-bold py-3 rounded-xl text-sm transition-all hover:scale-105">
              Resolve UP (Admin)
            </button>
          </div>
        )}
      </div>
    );
  };
  
  const renderUserBet = (bet) => {
    const market = bet.market;
    const claimed = bet.claimed;
    const canClaim = bet.isClaimableConfirmed; // FIX: Use the simulation result

    return (
      <div key={bet.txHash} className={`bg-dark-800 p-4 rounded-xl shadow-md flex justify-between items-center transition-all duration-300 ${claimed ? 'opacity-70' : ''}`}>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white">{bet.marketLabel}</span>
          <span className="text-sm text-neutral-400">Bet on: <span className="font-semibold text-primary">{bet.choiceLabel}</span></span>
          <span className="text-sm text-neutral-400">Amount: <span className="font-semibold text-success">{formatUnits(bet.amount, 6)} USDC</span></span>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!market.resolved ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500 text-white">{getMarketTimeRemaining(market)}</span>
          ) : canClaim ? ( 
            // FIX: Only show claim button if simulation passed
            <button onClick={() => handleClaim(market.id)} className="bg-secondary hover:bg-secondary-500 text-neutral-900 font-bold py-2 px-4 rounded-lg flex items-center gap-1 text-sm">
              <Trophy size={16} /> Claim Winnings
            </button>
          ) : claimed ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-success text-white flex items-center gap-1"><CheckCircle size={14} /> Claimed</span>
          ) : (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-white flex items-center gap-1"><XCircle size={14} /> Lost</span>
          )}
        </div>
      </div>
    );
  };
  
  const renderConnectWallet = () => (
    <div className="flex flex-col items-center justify-center p-10 bg-dark-800 rounded-xl shadow-2xl text-white">
      <Wallet size={48} className="text-primary mb-4" />
      <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
      <p className="text-neutral-400 mb-6 text-center">Join the action and place your first prediction on the Base Sepolia network.</p>
      <ConnectButton />  
    </div>
  );

  // Show landing page if not connected and showLanding is true
  if (showLanding && !isConnected) {
    return (
      <LandingPage
        onLaunchApp={() => setShowLanding(false)}
        liveStats={liveStats}
      />
    );
  }

  // Existing app UI
  return (
    <div className="min-h-screen bg-dark-950 text-white font-sans p-4 sm:p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-extrabold text-gradient-primary">TrenchyBet</h1>
          <span className="px-3 py-1 bg-secondary/20 border border-secondary text-secondary text-xs font-bold rounded-full animate-pulse-slow">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isOwner && (
            <button 
              onClick={() => setShowAdminPanel(true)} 
              className="p-3 rounded-full bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 hover:border-secondary transition-all hover:scale-110"
              title="Open Admin Panel"
            >
              <Settings size={20} className="text-secondary" />
            </button>
          )}
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
  {/* Stats - Only show if connected */}
  {isConnected && (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* FEATURED Balance Card - Takes full width on mobile, 1/3 on desktop */}
        <div 
          className="md:col-span-1 bg-gradient-to-br from-primary/20 via-primary/10 to-success/10 border-2 border-primary p-6 rounded-2xl shadow-xl glow-primary hover:scale-105 transition-all duration-300 cursor-pointer"
          title="Your available USDC balance for placing bets"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wide">Your Balance</h3>
            <Wallet size={32} className="text-primary" />
          </div>
          <div className="text-4xl md:text-5xl font-black text-white mb-4">
            {formatUnits(usdcBalance, 6)} <span className="text-2xl text-primary">USDC</span>
          </div>
          <button
            onClick={() => setShowAddFundsModal(true)}
            className="w-full bg-primary hover:bg-primary-400 text-dark-950 font-bold py-3 rounded-xl text-sm transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <DollarSign size={16} />
            Add Funds
          </button>
        </div>
        
        {/* Win/Loss Summary - 2/3 width on desktop */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          {/* Wins Card */}
          <div 
            className="bg-dark-800 border border-success/30 p-5 rounded-xl hover:border-success hover:glow-success transition-all duration-300 cursor-pointer"
            title="Total number of winning bets you've placed"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400 font-semibold">Wins</span>
              <Trophy size={24} className="text-secondary" />
            </div>
            <div className="text-3xl font-black text-white mb-1">{userStats.wins}</div>
            <div className="text-xs text-success font-semibold">
              {userStats.totalBets > 0 ? `${((userStats.wins / userStats.totalBets) * 100).toFixed(0)}% Win Rate` : 'No bets yet'}
            </div>
          </div>

          {/* Losses Card */}
          <div 
            className="bg-dark-800 border border-danger/30 p-5 rounded-xl hover:border-danger hover:glow-danger transition-all duration-300 cursor-pointer"
            title="Total number of losing bets"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400 font-semibold">Losses</span>
              <XCircle size={24} className="text-danger" />
            </div>
            <div className="text-3xl font-black text-white mb-1">{userStats.losses}</div>
            <div className="text-xs text-danger font-semibold">
              {userStats.totalBets > 0 ? `${((userStats.losses / userStats.totalBets) * 100).toFixed(0)}% Loss Rate` : 'Clean slate'}
            </div>
          </div>

          {/* Total Bets */}
          <div 
            className="bg-dark-800 border border-primary/30 p-5 rounded-xl hover:border-primary hover:glow-primary transition-all duration-300 cursor-pointer"
            title="Total number of bets placed across all markets"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400 font-semibold">Total Bets</span>
              <DollarSign size={24} className="text-primary" />
            </div>
            <div className="text-3xl font-black text-white">{userStats.totalBets}</div>
          </div>

          {/* Streak */}
          <div
            className="bg-dark-800 border border-secondary/30 p-5 rounded-xl hover:border-secondary hover:glow-secondary transition-all duration-300 cursor-pointer"
            title="Your current winning streak"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400 font-semibold">Streak</span>
              <Clock size={24} className="text-secondary" />
            </div>
            <div className="text-3xl font-black text-white flex items-center gap-2">
              {userStats.streak}
              <TrendingUp size={20} className="text-secondary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
  
  {/* Tabs - Show always (leaderboard is public) */}
  <div className="flex border-b border-dark-600 mb-8 overflow-x-auto">
    {(isConnected ? (
      // Full tabs when connected
      [
        { key: 'markets', label: 'All Markets', icon: Target },
        { key: 'myBets', label: `My Bets (${userBets.length})`, icon: BarChart3 },
        { key: 'leaderboard', label: 'Leaderboard', icon: Trophy }
      ]
    ) : (
      // Limited tabs when not connected
      [
        { key: 'markets', label: 'All Markets', icon: Target },
        { key: 'leaderboard', label: 'Leaderboard', icon: Trophy }
      ]
    )).map(({ key, label, icon: Icon }) => (
      <button
        key={key}
        onClick={() => setCurrentView(key)}
        className={`py-3 px-6 text-lg font-semibold transition-all duration-300 flex items-center gap-2 relative ${
          currentView === key
            ? 'text-primary border-b-2 border-primary'
            : 'text-neutral-400 hover:text-white hover:bg-primary/5'
        }`}
      >
        <Icon size={20} className={currentView === key ? 'text-primary' : 'text-neutral-500'} />
        {label}
        {currentView === key && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-success animate-pulse-slow"></span>
        )}
      </button>
    ))}
  </div>

  {/* Connect Banner - Show only if not connected */}
  {!isConnected && (
    <div className="bg-gradient-to-r from-primary/10 to-success/10 border-2 border-primary rounded-2xl p-8 mb-8 text-center relative overflow-hidden glow-primary animate-in slide-in-from-top-4">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-success/5 animate-pulse-slow"></div>

      <div className="relative z-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse-slow">
          <Wallet size={32} className="text-primary" />
        </div>
        <h3 className="text-3xl font-black text-white mb-3">Ready to start winning?</h3>
        <p className="text-lg text-neutral-300 mb-6 max-w-2xl mx-auto">
          Connect your wallet to place bets, track your performance, and join the action
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
        <p className="text-xs text-neutral-500 mt-4">
          🔒 Secure connection via RainbowKit • Base Sepolia Network
        </p>
      </div>
    </div>
  )}

  {/* Preview Cards - Show below connect banner for non-connected users */}
  {!isConnected && (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
      <div className="bg-dark-800 border-2 border-primary/30 p-8 rounded-2xl hover:border-primary hover:glow-primary transition-all duration-300">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="font-bold text-xl mb-3 text-white">Binary Markets</h3>
        <p className="text-sm text-neutral-400">Will BTC hit $150K? Simple UP or DOWN predictions with dynamic odds.</p>
      </div>

      <div className="bg-dark-800 border-2 border-success/30 p-8 rounded-2xl hover:border-success hover:glow-success transition-all duration-300">
        <div className="text-5xl mb-4">⚡</div>
        <h3 className="font-bold text-xl mb-3 text-white">Live Odds</h3>
        <p className="text-sm text-neutral-400">Real-time multipliers that change as the pool grows. Early bets get better odds.</p>
      </div>

      <div className="bg-dark-800 border-2 border-secondary/30 p-8 rounded-2xl hover:border-secondary hover:glow-secondary transition-all duration-300">
        <div className="text-5xl mb-4">💰</div>
        <h3 className="font-bold text-xl mb-3 text-white">Instant Payouts</h3>
        <p className="text-sm text-neutral-400">Win big? Claim your winnings instantly when markets resolve. No delays.</p>
      </div>
    </div>
  )}

    {/* Search Bar */}
    {!isLoadingMarkets && markets.length > 0 && (
      <div className="mb-6">
        <div className="relative max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search markets by asset or type..."
            className="w-full px-5 py-4 pl-12 bg-dark-800 border-2 border-dark-600 rounded-xl text-white placeholder-neutral-500 focus:border-primary focus:outline-none transition-all"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>
    )}

  {/* Markets View - ALWAYS VISIBLE */}
  {(!isConnected || currentView === 'markets') && (
    <>
    {/* Market Filters */}
    {!isLoadingMarkets && markets.length > 0 && (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Active Markets</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400 mr-2">Filter by:</span>
            {['ALL', 'BTC', 'ETH', 'SOL'].map((asset) => {
              const now = Date.now();
              const activeMarkets = markets.filter(m => !m.resolved && Number(m.endTime) * 1000 > now);
              const count = asset === 'ALL' 
                ? activeMarkets.length 
                : activeMarkets.filter(m => m.asset === asset).length;
              
              return (
                <button
                  key={asset}
                  onClick={() => setSelectedAssetFilter(asset)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${
                    selectedAssetFilter === asset
                      ? 'bg-primary text-dark-950 scale-105 glow-primary'
                      : 'bg-dark-800 border-2 border-dark-600 text-neutral-400 hover:border-primary hover:text-white'
                  }`}
                >
                  {asset === 'BTC' && '₿'}
                  {asset === 'ETH' && 'Ξ'}
                  {asset === 'SOL' && '◎'}
                  {asset === 'ALL' && '🌐'}
                  <span>{asset}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedAssetFilter === asset ? 'bg-dark-950/30' : 'bg-dark-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    )}

    {isLoadingMarkets && markets.length === 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MarketCardSkeleton />
        <MarketCardSkeleton />
        <MarketCardSkeleton />
      </div>
    )}
    
    {(() => {
      const now = Date.now();

      // Separate markets by status
      const liveMarkets = markets.filter(m =>
        !m.resolved && Number(m.endTime) > now
      );

      const expiredMarkets = markets.filter(m =>
        !m.resolved && Number(m.endTime) <= now
      );

      const resolvedMarkets = markets.filter(m => m.resolved);

      // For "All Markets" tab, show only LIVE markets
      const activeMarkets = liveMarkets;
      
      // Apply asset filter
      let filteredMarkets = selectedAssetFilter === 'ALL'
        ? activeMarkets
        : activeMarkets.filter(m => m.asset === selectedAssetFilter);

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredMarkets = filteredMarkets.filter(m =>
          m.asset.toLowerCase().includes(query) ||
          getMarketLabel(m.marketType, m.asset).toLowerCase().includes(query) ||
          (m.options && m.options.some(opt => opt.toLowerCase().includes(query)))
        );
      }
      
      if (!isLoadingMarkets && activeMarkets.length === 0) {
        return <LandingHero isConnected={isConnected} />;
      }
      
      if (!isLoadingMarkets && filteredMarkets.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-64 bg-dark-800 rounded-2xl border-2 border-dark-600">
            <AlertTriangle size={48} className="text-primary mb-4" />
            <p className="text-xl text-neutral-400 mb-2">
              {searchQuery
                ? `No markets found for "${searchQuery}"`
                : `No ${selectedAssetFilter} markets available`}
            </p>
            <div className="flex gap-3 mt-4">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-2 bg-secondary text-dark-950 font-bold rounded-xl hover:scale-105 transition-all"
                >
                  Clear Search
                </button>
              )}
              {selectedAssetFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedAssetFilter('ALL')}
                  className="px-6 py-2 bg-primary text-dark-950 font-bold rounded-xl hover:scale-105 transition-all"
                >
                  View All Markets
                </button>
              )}
            </div>
          </div>
        );
      }
      
      {/* Admin: Show Expired Markets Awaiting Resolution */}
      {isOwner && expiredMarkets.length > 0 && (
        <div className="mb-8 bg-secondary/10 border-2 border-secondary rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} className="text-secondary" />
              <div>
                <h3 className="text-xl font-bold text-white">Markets Pending Resolution</h3>
                <p className="text-sm text-neutral-400">{expiredMarkets.length} market{expiredMarkets.length !== 1 ? 's' : ''} need admin action</p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowAdminPanel(true);
                // You can add logic to auto-open the "Manage" tab
              }}
              className="bg-secondary hover:bg-secondary-500 text-dark-950 font-bold py-3 px-6 rounded-xl transition-all hover:scale-105"
            >
              Resolve Now
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {expiredMarkets.slice(0, 3).map(market => (
              <div key={market.id} className="bg-dark-800 border border-secondary/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getAssetEmoji(market.asset)}</span>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">{market.asset} Market</p>
                    <p className="text-xs text-neutral-400">ID: #{market.id}</p>
                  </div>
                </div>
                <p className="text-xs text-secondary font-semibold">
                  Ended {new Date(market.endTime).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {filteredMarkets.map(renderMarketDetails)}
        </div>
      );
    })()}
  </>
)}

  {/* My Bets - Only if connected */}
  {isConnected && currentView === 'myBets' && (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold mb-6 text-primary">My Bets</h2>

      {/* Sub-tabs for bet views */}
      <div className="flex border-b border-dark-600 mb-6 overflow-x-auto">
        {[
          { key: 'ongoing', label: 'Ongoing Markets', icon: Clock },
          { key: 'wins', label: 'Wins', icon: Trophy },
          { key: 'losses', label: 'Losses', icon: XCircle }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setBetView(key)}
            className={`py-3 px-6 text-lg font-semibold transition-all duration-300 flex items-center gap-2 relative ${
              betView === key
                ? 'text-primary border-b-2 border-primary'
                : 'text-neutral-400 hover:text-white hover:bg-primary/5'
            }`}
          >
            <Icon size={20} className={betView === key ? 'text-primary' : 'text-neutral-500'} />
            {label}
            {betView === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-success animate-pulse-slow"></span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {(() => {
          // Filter bets based on current view
          const filteredBets = userBets.filter(bet => {
            const market = bet.market;
            if (!market) return false;

            if (betView === 'ongoing') {
              return !market.resolved;
            } else if (betView === 'wins') {
              return market.resolved && (bet.claimed || bet.isClaimableConfirmed);
            } else if (betView === 'losses') {
              return market.resolved && !bet.claimed && !bet.isClaimableConfirmed;
            }
            return true;
          });

          if (filteredBets.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center h-48 bg-dark-800 rounded-xl text-neutral-400">
                <BarChart3 size={32} />
                <p className="mt-3 text-lg">
                  {betView === 'ongoing' ? 'No ongoing bets' :
                   betView === 'wins' ? 'No winning bets yet' :
                   'No losing bets'}
                </p>
              </div>
            );
          }

          return filteredBets.map(renderUserBet);
        })()}
      </div>
    </div>
  )}

  {/* Leaderboard */}
  {currentView === 'leaderboard' && (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
          <Trophy size={32} className="text-secondary" />
          Top Predictors
        </h2>
        <button
          onClick={() => fetchLeaderboard()}
          disabled={isLoadingLeaderboard}
          className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 hover:border-primary rounded-xl transition-all"
        >
          <RefreshCw size={16} className={isLoadingLeaderboard ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <LeaderboardView
        data={leaderboardData}
        isLoading={isLoadingLeaderboard}
        currentUserAddress={address}
      />
    </div>
  )}
</main>
      
      {selectedBet && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedBet(null)}
        >
          <div 
            className="bg-gradient-to-br from-dark-800 to-dark-700 border-2 border-primary rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 w-full max-w-lg shadow-2xl glow-primary animate-in zoom-in duration-300 my-auto relative" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: 'calc(100vh - 2rem)' }}
          >
            {/* Scrollable content wrapper */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
              
              {/* Close Button - Fixed at top */}
              <button
                onClick={() => setSelectedBet(null)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 text-neutral-400 hover:text-white transition-colors z-10"
              >
                <X size={24} />
              </button>

              {/* Choice Display */}
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">You're betting</div>
                <div className={`text-4xl font-black ${
                  selectedBet.choice === 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {selectedBet.choice === 0 ? 'UP ↗' : 'DOWN ↘'}
                </div>

                {/* Market Stats */}
                {(() => {
                  const { upPercentage, downPercentage } = calculateMarketPercentages(
                    parseFloat(selectedBet.market.upPool || 0),
                    parseFloat(selectedBet.market.downPool || 0)
                  );
                  const percentage = selectedBet.choice === 0 ? upPercentage : downPercentage;
                  const totalPool = parseFloat(selectedBet.market.upPool || 0) + parseFloat(selectedBet.market.downPool || 0);
                  const choicePool = selectedBet.choice === 0
                    ? parseFloat(selectedBet.market.upPool || 0)
                    : parseFloat(selectedBet.market.downPool || 0);
                  const multiplier = calculateMultiplier(totalPool, choicePool);

                  return (
                    <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-xs text-gray-500">Market</div>
                          <div className="text-xl font-bold text-white">{percentage}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Multiplier</div>
                          <div className="text-xl font-bold text-[#c0ff00]">
                            {formatMultiplier(multiplier)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bet Amount Input - KEEP YOUR EXISTING INPUT */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">Bet Amount (USDC)</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-[#c0ff00] focus:outline-none text-lg"
                  placeholder="Enter amount"
                  min="0.01"
                  step="0.01"
                />
              </div>

              {/* Potential Payout Calculation */}
              {betAmount && parseFloat(betAmount) > 0 && (
                <div className="bg-gradient-to-br from-[#c0ff00]/10 to-[#c0ff00]/5 border border-[#c0ff00]/30 rounded-xl p-4">
                  <div className="text-sm text-gray-400 mb-1">Potential Payout</div>
                  <div className="text-3xl font-black text-[#c0ff00]">
                    {(() => {
                      const totalPool = parseFloat(selectedBet.market.upPool || 0) + parseFloat(selectedBet.market.downPool || 0);
                      const choicePool = selectedBet.choice === 0
                        ? parseFloat(selectedBet.market.upPool || 0)
                        : parseFloat(selectedBet.market.downPool || 0);
                      const multiplier = calculateMultiplier(totalPool, choicePool);
                      const payout = calculatePayout(parseFloat(betAmount), multiplier);
                      return `${payout.toFixed(2)} USDC`;
                    })()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Net profit after 2% fee on winnings
                  </div>
                </div>
              )}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs sm:text-sm font-bold text-neutral-300 flex items-center gap-2">
                    <DollarSign size={14} className="text-primary" />
                    Bet Amount (USDC)
                  </label>
                  <button
                    onClick={() => setBetAmount(formatUnits(usdcBalance, 6))}
                    className="text-xs font-bold px-2 py-1 bg-secondary/20 border border-secondary text-secondary rounded-lg hover:bg-secondary/30 transition-all"
                  >
                    MAX
                  </button>
                </div>
                <input 
                  type="number" 
                  value={betAmount} 
                  onChange={(e) => setBetAmount(e.target.value)}
                  min="0.01"
                  step="0.1"
                  className="w-full p-4 bg-dark-900 text-white text-2xl sm:text-3xl font-black text-center rounded-xl border-2 border-dark-600 focus:border-primary outline-none transition-all"
                  placeholder="0.00"
                  autoFocus
                />
                
                {/* Quick Bet Buttons - COMPACT */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {(() => {
                    const balance = Number(formatUnits(usdcBalance, 6));
                    let amounts;
                    
                    if (balance < 5) {
                      amounts = [0.5, 1, 1.5, balance > 0 ? Math.floor(balance * 10) / 10 : 2];
                    } else if (balance < 20) {
                      amounts = [1, 5, 10, Math.floor(balance)];
                    } else if (balance < 100) {
                      amounts = [10, 25, 50, Math.floor(balance)];
                    } else {
                      amounts = [10, 25, 50, 100];
                    }
                    
                    return amounts.map((amount, idx) => {
                      const isMax = idx === 3 && balance < 100;
                      const isDisabled = amount > balance;
                      
                      return (
                        <button 
                          key={amount}
                          onClick={() => setBetAmount(amount.toString())}
                          disabled={isDisabled}
                          className={`border-2 rounded-lg py-2 text-xs sm:text-sm font-bold transition-all ${
                            isDisabled 
                              ? 'bg-dark-800 border-dark-700 text-neutral-600 cursor-not-allowed'
                              : 'bg-dark-700 hover:bg-primary/20 border-dark-600 hover:border-primary hover:scale-105'
                          } ${isMax ? 'border-secondary text-secondary' : ''}`}
                        >
                          {isMax ? 'MAX' : `$${amount}`}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Balance Check with Validation - COMPACT */}
              {isConnected && (
                <div className={`rounded-xl p-3 mb-4 border-2 transition-all ${
                  betAmount && parseUnits(betAmount, 6) > usdcBalance 
                    ? 'bg-danger/10 border-danger' 
                    : 'bg-dark-900/50 border-dark-600'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-semibold text-neutral-300">Your Balance:</span>
                    <span className="text-base sm:text-lg font-bold text-white">{formatUnits(usdcBalance, 6)} USDC</span>
                  </div>
                  
                  {betAmount && parseUnits(betAmount, 6) > usdcBalance && (
                    <div className="flex items-center gap-2 pt-2 border-t border-danger/30">
                      <AlertTriangle size={14} className="text-danger flex-shrink-0" />
                      <span className="text-xs font-bold text-danger">
                        Insufficient balance! Need {betAmount} USDC.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Action Buttons - STICKY at bottom */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-dark-600 bg-gradient-to-br from-dark-800 to-dark-700 sticky bottom-0">
              <button
                onClick={() => setSelectedBet(null)}
                className="bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 hover:border-neutral-500 text-white font-bold py-3 rounded-xl transition-all text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                onClick={() => placeBetOnChain(selectedBet, selectedBet.choice)}
                disabled={
                  isPending || 
                  isConfirming || 
                  isPlacingBet || 
                  !betAmount || 
                  Number(betAmount) <= 0 ||
                  (isConnected && parseUnits(betAmount, 6) > usdcBalance)
                }
                className="bg-gradient-to-r from-primary to-success hover:from-primary-400 hover:to-success-dark disabled:from-neutral-600 disabled:to-neutral-600 text-dark-950 font-bold py-3 rounded-xl shadow-lg glow-primary hover:scale-105 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isPending || isConfirming || isPlacingBet ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Placing...'}
                  </>
                ) : (
                  <>
                    <TrendingUp size={18} />
                    Place Bet
                  </>
                )}
              </button>
            </div>

            {/* Disclaimer - COMPACT */}
            <p className="text-xs text-neutral-500 text-center mt-3">
              Real money. Bet responsibly.
            </p>
          </div>
        </div>
      )}
      {showAdminPanel && <AdminPanel onClose={() => { setShowAdminPanel(false); refreshData(); }} />}

      {/* Add Funds Modal */}
      <AddFundsModal
        isOpen={showAddFundsModal}
        onClose={() => setShowAddFundsModal(false)}
        network={chain?.name || 'Base Sepolia'}
        address={address}
      />

      {/* Share Modal */}
      <ShareModal
        market={shareModalData}
        isOpen={!!shareModalData}
        onClose={() => setShareModalData(null)}
      />

      {/* Notification Settings Modal */}
      <NotificationSettings
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
        enabled={notificationsEnabled}
        onToggle={setNotificationsEnabled}
        permission={notificationPermission}
      />

      {/* Footer - only show when not on landing page */}
      {!showLanding && (
        <footer className="bg-gray-900 border-t border-gray-800 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Brand */}
              <div>
                <div className="flex items-center mb-3">
                  <div className="bg-[#c0ff00] p-2 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-gray-900" />
                  </div>
                  <span className="ml-2 text-xl font-black text-white">
                    Trenchy<span className="text-[#c0ff00]">Bet</span>
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  High-velocity prediction markets on Base
                </p>
              </div>

              {/* Links */}
              <div>
                <h5 className="text-white font-bold mb-3 text-sm">Community</h5>
                <div className="space-y-2">
                  <a
                    href="https://x.com/life_agreez"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-400 hover:text-[#c0ff00] transition-colors text-sm"
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                  </a>
                  <a
                    href="https://t.me/trenchybet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-gray-400 hover:text-[#c0ff00] transition-colors text-sm"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Telegram
                  </a>
                </div>
              </div>

              {/* Info */}
              <div>
                <h5 className="text-white font-bold mb-3 text-sm">Network</h5>
                <div className="space-y-1 text-sm text-gray-400">
                  <div>Chain: <span className="text-[#c0ff00] font-mono">Base Sepolia</span></div>
                  <div>Status: <span className="text-green-400">Live</span></div>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="mt-8 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
              © 2026 TrenchyBet. Built on Base, powered by Chainlink.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;