/**
 * Referral Service
 * Handles referral-related API calls and data processing
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('ReferralService');

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Create a new referral record
 * @param {string} referrerAddress - The address of the referrer
 * @param {string} referredAddress - The address of the referred user
 * @returns {Promise<Object>} Created referral record
 */
export const createReferral = async (referrerAddress, referredAddress) => {
  try {
    const response = await fetch(`${API_BASE_URL}/referrals/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        referrer_address: referrerAddress,
        referred_address: referredAddress,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info('Referral created', data);
    return data;
  } catch (error) {
    logger.error('Error creating referral:', error);
    throw error;
  }
};

/**
 * Get referral list for a user
 * @param {string} address - The wallet address
 * @returns {Promise<Object>} Referral stats and list
 */
export const getReferrals = async (address) => {
  try {
    const response = await fetch(`${API_BASE_URL}/referrals/list?address=${address}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.info('Referrals fetched', { count: data.referrals?.length || 0 });
    return data;
  } catch (error) {
    logger.error('Error fetching referrals:', error);
    throw error;
  }
};

/**
 * Generate referral code from address
 * @param {string} address - The wallet address
 * @returns {string} Referral code
 */
export const generateReferralCode = (address) => {
  // Simple hash of address for referral code
  return btoa(address.toLowerCase()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8).toUpperCase();
};

/**
 * Get referral link for sharing
 * @param {string} address - The wallet address
 * @returns {string} Full referral URL
 */
export const getReferralLink = (address) => {
  const baseUrl = window.location.origin;
  const code = generateReferralCode(address);
  return `${baseUrl}/?ref=${code}`;
};

/**
 * Share referral on Twitter
 * @param {string} address - The wallet address
 */
export const shareOnTwitter = (address) => {
  const link = getReferralLink(address);
  const text = `Join me on @TrenchyBet and start predicting crypto prices! Use my referral link: ${link}`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

/**
 * Share referral on Telegram
 * @param {string} address - The wallet address
 */
export const shareOnTelegram = (address) => {
  const link = getReferralLink(address);
  const text = `Join me on TrenchyBet and start predicting crypto prices! Use my referral link: ${link}`;
  const url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};

/**
 * Copy referral link to clipboard
 * @param {string} address - The wallet address
 * @returns {Promise<boolean>} Success status
 */
export const copyReferralLink = async (address) => {
  try {
    const link = getReferralLink(address);
    await navigator.clipboard.writeText(link);
    logger.info('Referral link copied to clipboard');
    return true;
  } catch (error) {
    logger.error('Error copying referral link:', error);
    return false;
  }
};
