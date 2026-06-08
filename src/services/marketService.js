/**
 * Market Service Layer
 * Abstracts contract interactions for cleaner API
 */

import { readContract, multicall } from 'wagmi/actions';
import { CONTRACTS, config } from '../config/wagmi';

// Use PROXY contract for all interactions
const PREDICTION_MARKET_ADDRESS = CONTRACTS.PROXY;

import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';
import { CHAINLINK_RESOLVER_ABI } from '../contracts/abis';
import { CHAINLINK_RESOLVER_ADDRESS } from '../utils/constants';
import { createLogger } from '../utils/logger';


const logger = createLogger('marketService');

/**
 * Market Service API
 */
export const marketService = {
  /**
   * Get market counter (total markets)
   * @returns {Promise<number>}
   */
  async getMarketCounter() {
    try {
      const result = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'marketCounter',
      });
      return Number(result);
    } catch (error) {
      logger.error('Failed to get market counter', error);
      throw error;
    }
  },

  /**
   * Get single market by ID
   * @param {number} marketId 
   * @returns {Promise<Object>}
   */
  async getMarket(marketId) {
    try {
      const result = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'markets',
        args: [BigInt(marketId)],
      });
      return result;
    } catch (error) {
      logger.error(`Failed to get market ${marketId}`, error);
      throw error;
    }
  },

  /**
   * Get multiple markets using multicall (optimized)
   * @param {number[]} marketIds 
   * @returns {Promise<Array>}
   */
  async getMarketsBatch(marketIds) {
    try {
      const contracts = marketIds.map(id => ({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'markets',
        args: [BigInt(id)],
      }));

      const results = await multicall(config, {
        contracts,
        allowFailure: true,
      });

      return results.map((result, index) => ({
        id: marketIds[index],
        data: result.status === 'success' ? result.result : null,
        error: result.status === 'failure' ? result.error : null,
      }));
    } catch (error) {
      logger.error('Failed to get markets batch', error);
      throw error;
    }
  },

  /**
   * Get current price for an asset
   * @param {string} asset - Asset symbol (BTC, ETH, SOL)
   * @returns {Promise<number>}
   */
  async getCurrentPrice(asset) {
    try {
      const result = await readContract(config, {
        address: CHAINLINK_RESOLVER_ADDRESS,
        abi: CHAINLINK_RESOLVER_ABI,
        functionName: 'getLatestPrice',
        args: [asset],
      });
      return Number(result);
    } catch (error) {
      logger.error(`Failed to get price for ${asset}`, error);
      throw error;
    }
  },


  /**
   * Get odds for a market
   * @param {number} marketId 
   * @returns {Promise<Object>}
   */
  async getMarketOdds(marketId) {
    try {
      const result = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'getOdds',
        args: [BigInt(marketId)],
      });
      return {
        yesOdds: Number(result.yesOdds),
        noOdds: Number(result.noOdds),
      };
    } catch (error) {
      logger.error(`Failed to get odds for market ${marketId}`, error);
      throw error;
    }
  },

  /**
   * Get current odds (multipliers) for a market
   * @param {number} marketId 
   * @returns {Promise<number[]>}
   */
  async getCurrentOdds(marketId) {
    try {
      const result = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'getCurrentOdds',
        args: [BigInt(marketId)],
      });
      return result.map(r => Number(r));
    } catch (error) {
      logger.error(`Failed to get current odds for market ${marketId}`, error);
      throw error;
    }
  },

  /**
   * Calculate potential winnings
   * @param {number} marketId 
   * @param {boolean} predictedUp 
   * @param {number} amount 
   * @returns {Promise<number>}
   */
  async calculatePotentialWinnings(marketId, predictedUp, amount) {
    try {
      const result = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'calculatePotentialPayout',
        args: [BigInt(marketId), predictedUp ? 0 : 1, BigInt(amount)],
      });
      return Number(result);
    } catch (error) {
      logger.error(`Failed to calculate winnings for market ${marketId}`, error);
      throw error;
    }
  },

  /**
   * Get user positions in a market
   * @param {number} marketId 
   * @param {string} userAddress 
   * @returns {Promise<Array>}
   */
  async getUserPositions(marketId, userAddress) {
    try {
      const result = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'getUserPositionsInMarket',
        args: [BigInt(marketId), userAddress],
      });
      return result;
    } catch (error) {
      logger.error(`Failed to get positions for user ${userAddress} in market ${marketId}`, error);
      throw error;
    }
  },

  /**
   * Get all markets for a user
   * @param {string} userAddress 
   * @returns {Promise<number[]>}
   */
  async getUserMarkets(userAddress) {
    try {
      const result = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'getUserMarkets',
        args: [userAddress],
      });
      return result.map(r => Number(r));
    } catch (error) {
      logger.error(`Failed to get markets for user ${userAddress}`, error);
      throw error;
    }
  },

  /**
   * Get leaderboard
   * @param {number} count - Number of top users to fetch
   * @returns {Promise<Object>}
   */
  async getLeaderboard(count = 10) {
    try {
      const result = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'getLeaderboard',
        args: [BigInt(count)],
      });
      return {
        topUsers: result.topUsers,
        earnings: result.earnings.map(e => Number(e)),
      };
    } catch (error) {
      logger.error('Failed to get leaderboard', error);
      throw error;
    }
  },

  /**
   * Get contract accumulated fees
   * @returns {Promise<number>}
   */
  async getAccumulatedFees() {
    try {
      const result = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'accumulatedFees',
      });
      return Number(result);
    } catch (error) {
      logger.error('Failed to get accumulated fees', error);
      throw error;
    }
  },

  /**
   * Get contract owner
   * @returns {Promise<string>}
   */
  async getOwner() {
    try {
      const result = await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'owner',
      });
      return result;
    } catch (error) {
      logger.error('Failed to get contract owner', error);
      throw error;
    }
  },
};

