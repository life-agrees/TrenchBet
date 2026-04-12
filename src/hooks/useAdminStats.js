import { useState, useEffect, useCallback } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits, parseAbiItem } from 'viem';
import { CONTRACTS } from '../config/wagmi';
import { PREDICTION_MARKET_ABI, ERC20_ABI } from '../contracts/abis';
import { createLogger } from '../utils/logger';

const logger = createLogger('useAdminStats');

// RPC block range limit - Base Sepolia limits eth_getLogs to 10,000 blocks
const MAX_BLOCK_RANGE = 8000;


export const useAdminStats = (contractAddress) => {
  const publicClient = usePublicClient({ chainId: 84532 });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVolume: 0,
    totalBets: 0,
    pendingFees: 0n,
    contractBalance: 0n,
    isLoading: false,
    error: null
  });

  const fetchStats = useCallback(async () => {
    if (!publicClient || !contractAddress) return;

    setStats(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch accumulated fees from contract
      const accumulatedFees = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'accumulatedFees',
      });

      // Fetch contract USDC balance
      const balance = await publicClient.readContract({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [contractAddress],
      });

      // Get current block for safe range calculation
      const currentBlock = await publicClient.getBlockNumber();
      const totalBlocks = 490000n;
      const fromBlock = currentBlock > totalBlocks ? currentBlock - totalBlocks : 0n;
      const CHUNK_SIZE = 49999n;

      logger.info(`Fetching bet logs from block ${fromBlock} to ${currentBlock}...`);

      let logs = [];
      const event = parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)');
      
      for (let from = fromBlock; from < currentBlock; from += CHUNK_SIZE) {
        const to = from + CHUNK_SIZE > currentBlock ? currentBlock : from + CHUNK_SIZE;
        try {
          const chunk = await publicClient.getLogs({
            address: contractAddress,
            event,
            fromBlock: from,
            toBlock: to
          });
          logs.push(...chunk);
        } catch (err) {
          logger.warn(`Failed to fetch chunk ${from}-${to}:`, err.message);
        }
      }

      const uniqueUsers = new Set();
      let volume = 0n;

      logs.forEach(log => {
        if (log.args?.user) uniqueUsers.add(log.args.user.toLowerCase());
        if (log.args?.amount) volume += log.args.amount;
      });

      setStats({
        totalUsers: uniqueUsers.size,
        totalVolume: Number(formatUnits(volume, 6)),
        totalBets: logs.length,
        pendingFees: accumulatedFees,
        contractBalance: balance,
        isLoading: false,
        error: null
      });

      logger.info('Stats fetched successfully', {
        totalUsers: uniqueUsers.size,
        totalVolume: Number(formatUnits(volume, 6)),
        totalBets: logs.length
      });

    } catch (err) {
      logger.error('Error fetching admin stats:', err);
      setStats(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || 'Failed to fetch stats'
      }));
    }
  }, [publicClient, contractAddress]);

  return {
    stats,
    isLoadingStats: stats.isLoading,
    error: stats.error,
    fetchStats
  };
};

export default useAdminStats;
