import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { CONTRACTS } from '../config/wagmi';
import { TRENCHY_REFERRALS_ABI } from '../contracts/abis';
import { createLogger } from '../utils/logger';

const logger = createLogger('useReferrals');

/**
 * useReferrals
 *
 * FIX: Contract reads were using Ethers.js v5 syntax via `window.trenchyReferrals`
 * which is never set anywhere in the codebase:
 *   window.trenchyReferrals?.read.getReferrer([address])  ← always undefined
 *
 * This meant every call silently fell through to localStorage, and the
 * actual REFERRALS contract was never queried — even when deployed.
 *
 * Fix: Use Wagmi's `usePublicClient` for contract reads (consistent with the
 * rest of the codebase). localStorage remains as a graceful fallback for
 * when the contract isn't deployed yet.
 *
 * NOTE: `stats` prop shape added to match App.jsx destructuring:
 *   const { stats: referralStats, generateReferralCode, shareReferral } = useReferrals();
 * The hook now returns a `stats` object and a `shareReferral` alias.
 */
export const useReferrals = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient({ chainId: 84532 });

  const [referralCode, setReferralCode]         = useState('');
  const [referrer, setReferrer]                 = useState(null);
  const [referralCount, setReferralCount]       = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [isLoading, setIsLoading]               = useState(false);
  const [error, setError]                       = useState(null);

  const { writeContractAsync: writeContract } = useWriteContract();

  const generateReferralCode = useCallback((addr) => {
    if (!addr) return '';
    return addr.slice(2, 10).toUpperCase();
  }, []);

  const fetchReferralData = useCallback(async () => {
    if (!isConnected || !address) {
      setReferralCode('');
      setReferrer(null);
      setReferralCount(0);
      setReferralEarnings(0);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      setReferralCode(generateReferralCode(address));

      // FIX: use Wagmi publicClient instead of window.trenchyReferrals
      if (publicClient && CONTRACTS.REFERRALS && CONTRACTS.REFERRALS !== '0x0000000000000000000000000000000000000000') {
        try {
          const [refAddr, count, earnings] = await Promise.all([
            publicClient.readContract({
              address: CONTRACTS.REFERRALS,
              abi: TRENCHY_REFERRALS_ABI,
              functionName: 'getReferrer',
              args: [address],
            }),
            publicClient.readContract({
              address: CONTRACTS.REFERRALS,
              abi: TRENCHY_REFERRALS_ABI,
              functionName: 'getReferralCount',
              args: [address],
            }),
            publicClient.readContract({
              address: CONTRACTS.REFERRALS,
              abi: TRENCHY_REFERRALS_ABI,
              functionName: 'getReferralEarnings',
              args: [address],
            }),
          ]);

          setReferrer(refAddr || null);
          setReferralCount(Number(count) || 0);
          setReferralEarnings(Number(earnings) || 0);
          return;
        } catch (e) {
          logger.warn('Referral contract read failed, falling back to localStorage:', e.message);
        }
      }

      // Fallback: localStorage
      const stored = localStorage.getItem(`referral_${address}`);
      if (stored) {
        const data = JSON.parse(stored);
        setReferrer(data.referrer ?? null);
        setReferralCount(data.count ?? 0);
        setReferralEarnings(data.earnings ?? 0);
      }
    } catch (err) {
      logger.error('Error fetching referral data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, publicClient, generateReferralCode]);

  const registerReferral = useCallback(async (referralCodeOrAddress) => {
    if (!isConnected || !address) throw new Error('Wallet not connected');

    let referrerAddress = referralCodeOrAddress;
    if (referralCodeOrAddress.length === 8 && !referralCodeOrAddress.startsWith('0x')) {
      referrerAddress = '0x' + referralCodeOrAddress.toLowerCase();
    }

    if (!referrerAddress?.match(/^0x[a-fA-F0-9]{40}$/)) throw new Error('Invalid referral code or address');
    if (referrerAddress.toLowerCase() === address.toLowerCase()) throw new Error('Cannot refer yourself');

    try {
      setIsLoading(true);
      setError(null);

      if (CONTRACTS.REFERRALS && CONTRACTS.REFERRALS !== '0x0000000000000000000000000000000000000000') {
        try {
          const hash = await writeContract({
            address: CONTRACTS.REFERRALS,
            abi: TRENCHY_REFERRALS_ABI,
            functionName: 'registerReferral',
            args: [referrerAddress],
          });
          logger.info('Referral registered on-chain:', hash);
          await fetchReferralData();
          return hash;
        } catch (e) {
          logger.warn('Referral contract write failed, using localStorage fallback:', e.message);
        }
      }

      // localStorage fallback
      localStorage.setItem(`referred_${address}`, JSON.stringify({ referrer: referrerAddress, timestamp: Date.now() }));
      const referrerKey   = `referral_${referrerAddress}`;
      const existingData  = localStorage.getItem(referrerKey);
      const referrerData  = existingData ? JSON.parse(existingData) : { count: 0, earnings: 0 };
      referrerData.count  = (referrerData.count || 0) + 1;
      localStorage.setItem(referrerKey, JSON.stringify(referrerData));
      await fetchReferralData();
      return null;
    } catch (err) {
      logger.error('Error registering referral:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, writeContract, fetchReferralData]);

  const getReferralLink  = useCallback(() => referralCode ? `https://trenchy.bet/ref/${referralCode}` : '', [referralCode]);
  const shareToTwitter   = useCallback(() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join me on @TrenchyBet and earn 1,000 Points! 🚀 Use my referral code: ${referralCode}`)}`, '_blank'), [referralCode]);
  const shareToTelegram  = useCallback(() => window.open(`https://t.me/share/url?url=${encodeURIComponent(getReferralLink())}&text=${encodeURIComponent(`Join me on TrenchyBet! Get 1,000 Points using my code: ${referralCode}`)}`, '_blank'), [referralCode, getReferralLink]);
  const copyReferralCode = useCallback(async () => { try { await navigator.clipboard.writeText(referralCode); return true; } catch { return false; } }, [referralCode]);
  const copyReferralLink = useCallback(async () => { try { await navigator.clipboard.writeText(getReferralLink()); return true; } catch { return false; } }, [getReferralLink]);

  // Share alias matching App.jsx destructuring: shareReferral
  const shareReferral = shareToTwitter;

  useEffect(() => { fetchReferralData(); }, [fetchReferralData]);

  // stats object matching App.jsx: const { stats: referralStats } = useReferrals()
  const stats = {
    referralCode,
    referrer,
    referralCount,
    referralEarnings,
    hasReferrer: !!referrer,
    isReferrer:  referralCount > 0,
  };

  return {
    // Flat exports (backwards compatible)
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
    shareReferral,       // alias for App.jsx
    generateReferralCode,
    refresh: fetchReferralData,
    hasReferrer: !!referrer,
    isReferrer:  referralCount > 0,
    // Stats object for App.jsx destructuring
    stats,
  };
};

export default useReferrals;
