import { useState, useCallback, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import { CONTRACTS } from '../config/wagmi';
import { TRENCHY_REFERRALS_ABI } from '../contracts/abis';
import { createLogger } from '../utils/logger';

const logger = createLogger('useReferrals');

/**
 * Hook for managing referral system
 */
export const useReferrals = () => {
  const { address, isConnected } = useAccount();
  
  // State
  const [referralCode, setReferralCode] = useState('');
  const [referrer, setReferrer] = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Contract writes
  const { writeContractAsync: writeContract } = useWriteContract();
  
  // Generate referral code from address (simple hash for now)
  const generateReferralCode = useCallback((addr) => {
    if (!addr) return '';
    // Create a simple referral code: first 8 chars of address
    return addr.slice(2, 10).toUpperCase();
  }, []);
  
  // Parse referral code back to address (for display)
  const getAddressFromCode = useCallback((code) => {
    if (!code || code.length !== 8) return null;
    // In a real implementation, you'd query a mapping
    // For now, we'll store codes in localStorage
    return null;
  }, []);
  
  // Fetch user's referral data
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
      
      // Generate referral code for current user
      const code = generateReferralCode(address);
      setReferralCode(code);
      
      // Try to read from contract (will fail if not deployed yet)
      try {
        const referrerData = await window.trenchyReferrals?.read.getReferrer([address]);
        setReferrer(referrerData || null);
        
        const count = await window.trenchyReferrals?.read.getReferralCount([address]);
        setReferralCount(Number(count) || 0);
        
        const earnings = await window.trenchyReferrals?.read.getReferralEarnings([address]);
        setReferralEarnings(Number(earnings) || 0);
      } catch (e) {
        // Contract not deployed yet, use localStorage as fallback
        logger.warn('Referral contract not available, using localStorage');
        const stored = localStorage.getItem(`referral_${address}`);
        if (stored) {
          const data = JSON.parse(stored);
          setReferrer(data.referrer);
          setReferralCount(data.count || 0);
          setReferralEarnings(data.earnings || 0);
        }
      }
    } catch (err) {
      logger.error('Error fetching referral data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, generateReferralCode]);
  
  // Register a referral
  const registerReferral = useCallback(async (referralCodeOrAddress) => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }
    
    // Validate input
    let referrerAddress = referralCodeOrAddress;
    
    // If it's a code (8 chars), try to find the address
    if (referralCodeOrAddress.length === 8) {
      // In a real app, you'd query a backend or on-chain mapping
      // For now, check if it's a valid address format
      if (!referralCodeOrAddress.startsWith('0x')) {
        referrerAddress = '0x' + referralCodeOrAddress.toLowerCase();
      }
    }
    
    // Validate it's a proper address
    if (!referrerAddress || !referrerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid referral code or address');
    }
    
    // Can't refer yourself
    if (referrerAddress.toLowerCase() === address.toLowerCase()) {
      throw new Error('Cannot refer yourself');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Try contract first
      try {
        const hash = await writeContract({
          address: CONTRACTS.REFERRALS,
          abi: TRENCHY_REFERRALS_ABI,
          functionName: 'registerReferral',
          args: [referrerAddress],
        });
        
        logger.info('Referral registered on-chain:', hash);
        return hash;
      } catch (e) {
        // Contract not deployed, use localStorage
        logger.warn('Referral contract not available, using localStorage fallback');
        
        // Store in localStorage
        const key = `referred_${address}`;
        localStorage.setItem(key, JSON.stringify({
          referrer: referrerAddress,
          timestamp: Date.now(),
        }));
        
        // Update referrer's count in localStorage
        const referrerKey = `referral_${referrerAddress}`;
        const existingData = localStorage.getItem(referrerKey);
        const referrerData = existingData ? JSON.parse(existingData) : { count: 0, earnings: 0 };
        referrerData.count = (referrerData.count || 0) + 1;
        localStorage.setItem(referrerKey, JSON.stringify(referrerData));
        
        // Refresh data
        await fetchReferralData();
        
        return null;
      }
    } catch (err) {
      logger.error('Error registering referral:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, writeContract, fetchReferralData]);
  
  // Get shareable referral link
  const getReferralLink = useCallback(() => {
    if (!referralCode) return '';
    // In production, this would be your actual domain
    return `https://trenchy.bet/ref/${referralCode}`;
  }, [referralCode]);
  
  // Share to Twitter
  const shareToTwitter = useCallback(() => {
    const text = `Join me on @TrenchyBet - the decentralized prediction market! Use my referral code: ${referralCode}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }, [referralCode]);
  
  // Share to Telegram
  const shareToTelegram = useCallback(() => {
    const text = `Join me on TrenchyBet! Use my referral code: ${referralCode}\n\n${getReferralLink()}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(getReferralLink())}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }, [referralCode, getReferralLink]);
  
  // Copy to clipboard
  const copyReferralCode = useCallback(async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      return true;
    } catch (err) {
      logger.error('Error copying to clipboard:', err);
      return false;
    }
  }, [referralCode]);
  
  // Copy referral link
  const copyReferralLink = useCallback(async () => {
    const link = getReferralLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch (err) {
      logger.error('Error copying link to clipboard:', err);
      return false;
    }
  }, [getReferralLink]);
  
  // Fetch data on mount and when address changes
  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);
  
  return {
    // State
    referralCode,
    referrer,
    referralCount,
    referralEarnings,
    isLoading,
    error,
    
    // Actions
    registerReferral,
    getReferralLink,
    shareToTwitter,
    shareToTelegram,
    copyReferralCode,
    copyReferralLink,
    refresh: fetchReferralData,
    
    // Helpers
    hasReferrer: !!referrer,
    isReferrer: referralCount > 0,
  };
};

export default useReferrals;
