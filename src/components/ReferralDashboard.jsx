import React, { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { 
  Copy, Twitter, MessageCircle, Link2, Users, 
  Gift, CheckCircle, AlertCircle, Loader2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import useReferrals from '../hooks/useReferrals';

/**
 * ReferralDashboard Component
 * Displays user's referral code, earnings, and allows sharing
 */
const ReferralDashboard = ({ isOpen, onClose }) => {
  const { isConnected } = useAccount();
  const {
    referralCode,
    referrer,
    referralCount,
    referralEarnings,
    isLoading,
    error,
    registerReferral,
    getReferralLink,
    shareToTwitter,
    shareToTelegram,
    copyReferralCode,
    copyReferralLink,
    hasReferrer,
  } = useReferrals();

  const [inputCode, setInputCode] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Handle referral code input
  const handleRegisterReferral = useCallback(async () => {
    if (!inputCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }

    try {
      setIsRegistering(true);
      await registerReferral(inputCode.trim());
      toast.success('Referral registered successfully!');
      setInputCode('');
    } catch (err) {
      toast.error(err.message || 'Failed to register referral');
    } finally {
      setIsRegistering(false);
    }
  }, [inputCode, registerReferral]);

  // Handle copy code
  const handleCopyCode = useCallback(async () => {
    const success = await copyReferralCode();
    if (success) {
      toast.success('Referral code copied!');
    }
  }, [copyReferralCode]);

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    const success = await copyReferralLink();
    if (success) {
      toast.success('Referral link copied!');
    }
  }, [copyReferralLink]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-dark-900 border-2 border-primary/30 rounded-2xl w-full max-w-lg shadow-2xl glow-primary animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Referral Program</h2>
              <p className="text-sm text-neutral-400">Earn TRENCHY by inviting friends</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-700 transition-colors"
          >
            <span className="text-neutral-400 hover:text-white">✕</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Not Connected */}
          {!isConnected ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto text-yellow-500 mb-3" size={32} />
              <p className="text-neutral-400">Connect your wallet to view your referral code</p>
            </div>
          ) : (
            <>
              {/* Your Referral Code */}
              <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-neutral-400">Your Referral Code</span>
                  {referralCount > 0 && (
                    <span className="px-2 py-1 bg-success/20 text-success text-xs font-bold rounded-full flex items-center gap-1">
                      <CheckCircle size={12} /> Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-dark-950 rounded-lg px-4 py-3 font-mono text-xl font-bold text-primary tracking-wider">
                    {referralCode || '------'}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    disabled={!referralCode}
                    className="p-3 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copy code"
                  >
                    <Copy size={18} className="text-primary" />
                  </button>
                </div>
              </div>

              {/* Referral Link */}
              <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
                <span className="text-sm font-semibold text-neutral-400 mb-3 block">Share Link</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-dark-950 rounded-lg px-3 py-2 text-sm text-neutral-300 truncate font-mono">
                    {getReferralLink() || 'https://trenchy.bet/ref/...'}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    disabled={!referralCode}
                    className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors disabled:opacity-50"
                    title="Copy link"
                  >
                    <Link2 size={16} className="text-neutral-400" />
                  </button>
                </div>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={shareToTwitter}
                  disabled={!referralCode}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 border border-[#1DA1F2]/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Twitter size={18} className="text-[#1DA1F2]" />
                  <span className="font-semibold text-[#1DA1F2]">Twitter</span>
                </button>
                <button
                  onClick={shareToTelegram}
                  disabled={!referralCode}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/30 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={18} className="text-[#0088cc]" />
                  <span className="font-semibold text-[#0088cc]">Telegram</span>
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={16} className="text-secondary" />
                    <span className="text-xs text-neutral-400">Referrals</span>
                  </div>
                  <div className="text-2xl font-black text-white">{referralCount}</div>
                </div>
                <div className="bg-dark-800 rounded-xl p-4 border border-dark-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift size={16} className="text-primary" />
                    <span className="text-xs text-neutral-400">Earnings</span>
                  </div>
                  <div className="text-2xl font-black text-primary">{referralEarnings} TRENCHY</div>
                </div>
              </div>

              {/* Enter Referral Code */}
              {!hasReferrer && (
                <div className="bg-dark-800 rounded-xl p-4 border border-primary/30">
                  <span className="text-sm font-semibold text-neutral-400 mb-3 block">
                    Have a referral code?
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      maxLength={8}
                      className="flex-1 bg-dark-950 border border-dark-600 rounded-lg px-4 py-2 text-white font-mono uppercase placeholder:text-neutral-600 focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={handleRegisterReferral}
                      disabled={isRegistering || !inputCode.trim()}
                      className="px-4 py-2 bg-primary hover:bg-primary-400 text-dark-950 font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isRegistering ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        'Apply'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Your Referrer */}
              {hasReferrer && referrer && (
                <div className="bg-success/10 rounded-xl p-4 border border-success/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-success" />
                    <span className="text-sm text-success">
                      Referred by: <span className="font-mono">{referrer.slice(0, 6)}...{referrer.slice(-4)}</span>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-700 text-center">
          <p className="text-xs text-neutral-500">
            Earn 10 TRENCHY for each friend who places their first bet
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;
