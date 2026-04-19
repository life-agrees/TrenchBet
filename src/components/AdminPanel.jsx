import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useReadContract } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';

import { Settings, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import DashboardTabV2 from './DashboardTabV2';
import CreateTab from './CreateTab';
import ManageTab from './ManageTab';
import BotControlPanel from './BotControlPanel.jsx';
import VouchersTab from './VouchersTab';
import { CONTRACTS, PROXY_ADDRESS, CHAINLINK_RESOLVER_ADDRESS, SUPPORTED_ASSETS, hasChainlinkFeed } from '../utils/constants';


import { 
  PREDICTION_MARKET_CORE_ABI, 
  PREDICTION_MARKET_TYPES_ABI, 
  ERC20_ABI,
  CHAINLINK_RESOLVER_ABI
} from '../contracts/abis';
import { PREDICTION_MARKET_PROXY_ABI } from '../contracts/proxyAbi';

import { sanitizeInput } from '../utils/inputSanitization';
import { createLogger } from '../utils/logger';
import { useAppStore } from '../store/useAppStore';
import { formatTimeframeLabel } from '../marketUtils';

const logger = createLogger('AdminPanel');

export default function AdminPanel({ 
  isOpen: propIsOpen, 
  onClose, 
  onMarketCreated, 
  markets: parentMarkets, 
  isLoadingMarkets: parentIsLoadingMarkets,
  vouchersContractAddress 
}) {


/**
 * Helper to get contract info based on market type
 * PROXY PATTERN: Always use PROXY_ADDRESS for all market operations
 * The proxy uses delegatecall to execute logic in Core/Types implementations
 * while keeping all storage (markets, positions, counters) in the proxy itself
 * Binary markets (type 0) -> Proxy delegates to Core implementation
 * Multi/Range/Time markets (types 1-3) -> Proxy delegates to Types implementation
 */
function getContractForMarketType(marketType) {
  // Always use PROXY_ADDRESS and PREDICTION_MARKET_PROXY_ABI
  // The proxy pattern works best with the unified ABI that contains all functions
  return {
    address: PROXY_ADDRESS,
    abi: PREDICTION_MARKET_PROXY_ABI,
    source: 'proxy'
  };
}







/** REMOVED DUPLICATE EXPORT - keep only top-level export **/

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalIsOpen;
  const setIsOpen = (value) => {
    if (propIsOpen === undefined) {
      setInternalIsOpen(value);
    }
    if (!value && onClose) {
      onClose();
    }
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Dashboard state
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVolume: 0,
    totalBets: 0,
    pendingFees: 0n,
    contractBalance: 0n
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Manage tab state - use parent markets if provided, otherwise fetch our own
  const [internalMarkets, setInternalMarkets] = useState([]);
  const [isLoadingInternalMarkets, setIsLoadingInternalMarkets] = useState(false);
  
  // Use parent markets if provided, otherwise use internal
  const markets = parentMarkets !== undefined ? parentMarkets : internalMarkets;
  const isLoadingMarkets = parentIsLoadingMarkets !== undefined ? parentIsLoadingMarkets : isLoadingInternalMarkets;

  const [resolvingId, setResolvingId] = useState(null);
  const [multiChoiceAnswers, setMultiChoiceAnswers] = useState({});

  // Create tab state
  const [marketType, setMarketType] = useState('binary');
  const [currentAssetPrice, setCurrentAssetPrice] = useState(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState({ show: false, success: false, message: '' });
  
  // Transaction tracking for market creation
  const [pendingTxHash, setPendingTxHash] = useState(null);
  const [isConfirmingCreation, setIsConfirmingCreation] = useState(false);

  // Form states
  const [binaryForm, setBinaryForm] = useState({
    asset: 'BTC',
    duration: 15,
    yesMultiplier: 200,
    noMultiplier: 200,
    useFixedOdds: false, // Changed default to true
    useTimeDecay: false,
    decayStartPercent: 50,
    minMultiplier: 120,
  });

  const [multiChoiceForm, setMultiChoiceForm] = useState({
    asset: 'BTC',
    question: '',
    options: ['', '', ''],
    duration: 60,
    multipliers: [200, 200, 200],
    useFixedOdds: false, // Changed default to true
    useTimeDecay: false,
    decayStartPercent: 50,
    minMultiplier: 120,
  });

  const [rangeForm, setRangeForm] = useState({
    asset: 'ETH',
    ranges: [
      { min: 2500, max: 3000 },
      { min: 3000, max: 3500 },
      { min: 3500, max: 4000 },
    ],
    duration: 30,
    multipliers: [200, 200, 200],
    useFixedOdds: false, // Changed default to true
    useTimeDecay: false,
    decayStartPercent: 50,
    minMultiplier: 120,
  });

  const [timeForm, setTimeForm] = useState({    
    asset: 'LINK',
    targetPrice: 200,
    timeframes: [
      { label: '24 hours', seconds: 86400 },
      { label: '7 days', seconds: 604800 },
      { label: '30 days', seconds: 2592000 },
    ],
    multipliers: [300, 200, 150],
    useFixedOdds: false, // Changed default to true
    useTimeDecay: false,
    decayStartPercent: 50,
    minMultiplier: 120,
  });




  // Transaction states
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // ✅ FIXED: Global app store access (moved to top-level)
  const appStore = useAppStore();

  // Admin check - fetch contract owner from PROXY (shared storage)
  const { data: proxyOwner, isLoading: isLoadingProxyOwner } = useReadContract({
    address: PROXY_ADDRESS,
    abi: [{ name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'address' }] }],
    functionName: 'owner',
    enabled: !!address && !!PROXY_ADDRESS,
  });

  // Get owner address from environment variable 
  const ENV_OWNER_ADDRESS = import.meta.env?.OWNER_ADDRESS || import.meta.env?.VITE_OWNER_ADDRESS;
  
  // Check if user is admin - either from proxy contract ownership or env variable
  const isContractOwner = address && proxyOwner
    ? address.toLowerCase() === proxyOwner.toLowerCase()
    : false;
  
  // ✅ FIXED: Strict ENV owner check only - no fallback security hole
  const isEnvOwner = address && ENV_OWNER_ADDRESS
    ? address.toLowerCase() === ENV_OWNER_ADDRESS.toLowerCase()
    : false;
    
  const isLoadingOwner = isLoadingProxyOwner;

  // Warn if proxyOwner fetch failed (helps debugging)
  if (isLoadingOwner === false && proxyOwner === undefined) {
    console.warn('⚠️ Proxy owner() fetch failed - using ENV owner only');
  }
  
  const isAdmin = isContractOwner || isEnvOwner;




  // --- PRICE FETCHING ---
  const fetchCurrentPrice = useCallback(async (asset) => {
    if (!publicClient || !asset) return null;
    setIsPriceLoading(true);
    
    try {
      // Validate asset has a price feed
      const normalizedAsset = asset.toUpperCase().trim();
      
      if (!hasChainlinkFeed(normalizedAsset)) {
        console.warn(`Asset ${asset} does not have a Chainlink feed on Base Sepolia.`);
        console.warn(`Supported assets: ${SUPPORTED_ASSETS.WITH_PRICE_FEEDS.join(', ')}`);
        // Don't clear existing price on validation failure
        return currentAssetPrice;
      }

      // FIXED: Retry logic for flaky RPC connections
      const MAX_RETRIES = 3;
      let lastError = null;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const price = await publicClient.readContract({
            address: CHAINLINK_RESOLVER_ADDRESS,
            abi: CHAINLINK_RESOLVER_ABI,
            functionName: 'getLatestPrice',
            args: [normalizedAsset],
          });

          const priceNumber = parseFloat(formatUnits(price, 8));
          if (priceNumber > 0) {
            setCurrentAssetPrice(priceNumber);
            return priceNumber;
          }
        } catch (retryError) {
          lastError = retryError;
          console.warn(`⚠️ Price fetch attempt ${attempt + 1}/${MAX_RETRIES} failed for ${asset}:`, retryError.message);
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }

      // All retries failed
      const errorMessage = lastError?.message || '';
      if (errorMessage.includes('Price feed not found')) {
        console.warn(`❌ Price feed not configured for ${asset}.`);
      } else if (errorMessage.includes('reverted')) {
        console.warn(`❌ Contract call reverted for ${asset}. Check if getLatestPrice() exists.`);
      } else {
        console.error(`Error fetching price for ${asset} after ${MAX_RETRIES} attempts:`, lastError);
      }
      
      // FIXED: Keep last known good price instead of clearing to null
      // This prevents the price from disappearing on transient RPC failures
      if (currentAssetPrice) {
        console.log(`📌 Keeping last known price for ${asset}: $${currentAssetPrice}`);
        return currentAssetPrice;
      }
      
      setCurrentAssetPrice(null);
      return null;
    } catch (error) {
      console.error(`Unexpected error fetching price for ${asset}:`, error);
      // Keep last known good price on unexpected errors too
      if (currentAssetPrice) return currentAssetPrice;
      setCurrentAssetPrice(null);
      return null;
    } finally {
      setIsPriceLoading(false);
    }
  }, [publicClient, currentAssetPrice]);





  // Effect: Fetch price whenever Asset or Market Type changes
  useEffect(() => {
    let currentAsset = '';
    if (marketType === 'binary') currentAsset = binaryForm.asset;
    else if (marketType === 'multi') currentAsset = multiChoiceForm.asset;
    else if (marketType === 'range') currentAsset = rangeForm.asset;
    else if (marketType === 'time') currentAsset = timeForm.asset;

    if (currentAsset) {
      fetchCurrentPrice(currentAsset).then(price => {
          if (price && marketType === 'range') {
          const band = price * 0.1; // 10% of current price
          const decimals = price >= 1000 ? 0 : price >= 1 ? 2 : 4;
          const fmt = (p) => parseFloat(p.toFixed(decimals));

          setRangeForm(prev => ({
            ...prev,
            ranges: [
              { min: fmt(price - band * 2), max: fmt(price - band) },
              { min: fmt(price - band),     max: fmt(price + band) },
              { min: fmt(price + band),     max: fmt(price + band * 2) }
            ]
          }));
        }
      });
    }
  }, [marketType, binaryForm.asset, multiChoiceForm.asset, rangeForm.asset, timeForm.asset, fetchCurrentPrice]);

  // Watch for pending transaction confirmation
  useEffect(() => {
    if (!pendingTxHash || !publicClient) return;
    
    const checkConfirmation = async () => {
      try {
        setIsConfirmingCreation(true);
        
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: pendingTxHash,
          confirmations: 1,
          timeout: 60000,
        });
        
        if (receipt.status === 'success') {
          toast.success('Market created successfully!', { id: 'create-market' });
          setCreateStatus({ 
            show: true, 
            success: true, 
            message: 'Market created successfully! It will appear in the active markets shortly.' 
          });
          
          // Wait a moment for blockchain state to settle
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Refresh markets list in AdminPanel
          await fetchMarkets();
          
          // Also refresh stats if on dashboard
          if (activeTab === 'dashboard') {
            await fetchStats();
          }
          
          // Notify parent component (App) to refresh markets globally
          if (onMarketCreated) {
            logger.info('Notifying parent component of new market creation');
            onMarketCreated();
          }
        // Note: Removed useMarketsWithStore() call - can't call hooks inside useEffect
        // Parent onMarketCreated will handle global refresh

        } else {
          toast.error('Market creation failed on-chain', { id: 'create-market' });
          setCreateStatus({ 
            show: true, 
            success: false, 
            message: 'Market creation failed. Please try again.' 
          });
        }
      } catch (error) {
        console.error('Error waiting for confirmation:', error);
        toast.error('Failed to confirm transaction', { id: 'create-market' });
        setCreateStatus({ 
          show: true, 
          success: false, 
          message: 'Transaction confirmation failed. Please check your wallet.' 
        });
      } finally {
        setIsConfirmingCreation(false);
        setPendingTxHash(null);
        setIsPending(false);
      }
    };
    
    checkConfirmation();
  }, [pendingTxHash, publicClient, activeTab]);

  // ✅ FIXED: Fetch dashboard stats from PROXY only (shared storage)
  const fetchStats = async () => {
    if (!publicClient || !PROXY_ADDRESS) {
      console.error('Missing publicClient or PROXY_ADDRESS');
      return;
    }

    console.log('📊 Fetching dashboard stats from PROXY...');
    setIsLoadingStats(true);

    try {
      // 1. Get marketCounter from PROXY (shared storage across Core/Types)
      let marketCounter = 0n;
      try {
        marketCounter = await publicClient.readContract({
          address: PROXY_ADDRESS,
          abi: PREDICTION_MARKET_PROXY_ABI,
          functionName: 'marketCounter'
        });
        console.log('✅ Proxy marketCounter:', marketCounter.toString());
      } catch (error) {
        console.warn('⚠️ Proxy marketCounter() failed:', error.message);
      }
      const totalMarkets = Number(marketCounter);

      // 2. Get accumulatedFees from PROXY (shared storage)
      let accumulatedFees = 0n;
      try {
        accumulatedFees = await publicClient.readContract({
          address: PROXY_ADDRESS,
          abi: [{ name: 'accumulatedFees', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] }],
          functionName: 'accumulatedFees'
        });
        console.log('✅ Proxy accumulatedFees:', formatUnits(accumulatedFees, 6));
      } catch (error) {
        console.warn('⚠️ Proxy accumulatedFees() failed:', error.message);
      }

      // 3. Get USDC balanceOf(PROXY)
      let contractBalance = 0n;
      try {
        contractBalance = await publicClient.readContract({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [PROXY_ADDRESS]
        });
        console.log('✅ Proxy USDC balance:', formatUnits(contractBalance, 6));
      } catch (error) {
        console.warn('⚠️ Proxy USDC balanceOf() failed:', error.message);
      }

      // 4. Get bet events from PROXY only (events bubble up via delegatecall)
      let totalBets = 0;
      let totalVolume = 0n;
      let uniqueUsers = new Set();

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const totalBlocks = 500000n;
        const fromBlock = currentBlock > totalBlocks ? currentBlock - totalBlocks : 0n;
        const CHUNK_SIZE = 49999n;
        
        let logs = [];
        const event = parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount, uint256 effectiveMultiplier)');

        for (let from = fromBlock; from < currentBlock; from += CHUNK_SIZE) {
          const to = from + CHUNK_SIZE > currentBlock ? currentBlock : from + CHUNK_SIZE;
          try {
            const chunk = await publicClient.getLogs({
              address: PROXY_ADDRESS,
              event,
              fromBlock: from,
              toBlock: to
            });
            logs.push(...chunk);
          } catch (chunkErr) {
            console.warn(`[Admin] Chunk ${from}-${to} failed:`, chunkErr.message);
          }
        }

        console.log(`✅ Found ${logs.length} bet events from PROXY`);

        logs.forEach(log => {
          if (log.args?.user) uniqueUsers.add(log.args.user.toLowerCase());
          if (log.args?.amount) totalVolume += log.args.amount;
        });

        totalBets = logs.length;
      } catch (error) {
        console.warn('⚠️ Proxy event fetching failed:', error.message);
      }

      setStats({
        totalUsers: uniqueUsers.size,
        totalVolume: Number(formatUnits(totalVolume, 6)),
        totalBets,
        pendingFees: accumulatedFees,
        contractBalance
      });

      console.log('✅ Stats updated from PROXY:', {
        users: uniqueUsers.size,
        volume: formatUnits(totalVolume, 6),
        bets: totalBets,
        markets: totalMarkets
      });

    } catch (error) {
      console.error('❌ Failed to fetch stats:', error);
      toast.error('Failed to load dashboard stats');
    } finally {
      setIsLoadingStats(false);
    }
  };


  /**
   * Helper function to format timeframe labels
   */


  /**
   * Parse market array from contract into structured object
   * Contract returns array, we need to map it to object with named properties
   */
  const parseMarketArray = (marketArray) => {
    if (!Array.isArray(marketArray)) {
      // Already an object (some providers may return objects)
      return marketArray;
    }
    
    // Map array indices to struct field names based on PredictionMarketBase.sol Market struct
    return {
      id: marketArray[0],
      marketType: marketArray[1],
      asset: marketArray[2],
      startTime: marketArray[3],
      endTime: marketArray[4],
      startPrice: marketArray[5],
      endPrice: marketArray[6],
      yesPool: marketArray[7],
      noPool: marketArray[8],
      resolved: marketArray[9],
      priceWentUp: marketArray[10],
      totalBets: marketArray[11],
      useFixedOdds: marketArray[12],
      yesMultiplier: marketArray[13],
      noMultiplier: marketArray[14],
      protocolFee: marketArray[15],
      useTimeDecay: marketArray[16],
      decayStartTime: marketArray[17],
      minMultiplier: marketArray[18]
    };
  };

  /**
   * Fetch a single market with all type-specific data
   * Updated for dual contract architecture
   */
  const fetchSingleMarket = async (publicClient, marketId, contract, contractType) => {
    try {
      // Step 1: Get base market data
      // Note: Contract uses 'markets' mapping, not 'getMarket' function
      let market;
      try {
        const rawMarket = await publicClient.readContract({
          address: contract.address,
          abi: contract.abi,
          functionName: 'markets',
          args: [BigInt(marketId)]
        });
        
        // Parse array into structured object
        market = parseMarketArray(rawMarket);
      } catch (contractError) {
        // Handle ABI decoding errors - market likely doesn't exist or has corrupted data
        if (contractError.message?.includes('out of bounds') || 
            contractError.message?.includes('Position') ||
            contractError.message?.includes('decoding')) {
          console.warn(`Market ${marketId} not found or has invalid data in ${contractType} contract`);
          return null;
        }
        throw contractError;
      }

      // Validate market exists - check if market has been initialized
      // A valid market will have startTime > 0 (set to block timestamp when created)
      // Empty slots have startTime = 0
      if (!market || market.startTime === undefined || market.startTime === 0n) {
        console.debug(`Market ${marketId} does not exist in ${contractType} contract (no startTime)`);
        return null;
      }



      const marketType = Number(market.marketType);


      // Step 2: Base market object
      const baseMarket = {
        id: marketId,
        marketType,
        asset: market.asset || 'Unknown',
        question: market.question || '',
        startTime: Number(market.startTime) * 1000,
        endTime: Number(market.endTime) * 1000,
        startPrice: market.startPrice ? Number(market.startPrice) / 1e8 : 0,
        endPrice: market.endPrice ? Number(market.endPrice) / 1e8 : 0,
        totalPool: 0,

        resolved: market.resolved,
        winningChoice: market.winningChoice ? Number(market.winningChoice) : 0,
        totalBets: Number(market.totalBets) || 0,
        useFixedOdds: market.useFixedOdds || false,
        yesPool: market.yesPool ? Number(market.yesPool) / 1e6 : 0,
        noPool: market.noPool ? Number(market.noPool) / 1e6 : 0,
        contractSource: contractType,
        contractAddress: contract.address,
      };
try {
  const rawTotal = await publicClient.readContract({
    address: PROXY_ADDRESS,
    abi: [{ name: 'getTotalPool', type: 'function', stateMutability: 'view', inputs: [{ name: 'marketId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] }],
    functionName: 'getTotalPool',
    args: [BigInt(marketId)]
  });
  baseMarket.totalPool = Number(rawTotal) / 1e6;
} catch (e) {
  baseMarket.totalPool = baseMarket.yesPool + baseMarket.noPool;
}

      // Step 3: Fetch type-specific data (only from Types contract)
      if (contractType === 'types') {
        if (marketType === 1) {
          // MULTI-CHOICE: Fetch options
          try {
            const options = await publicClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: 'getMultiChoiceOptions',
              args: [BigInt(marketId)]
            });
            baseMarket.options = options || [];
          } catch (error) {
            console.warn(`Failed to fetch options for market ${marketId}:`, error.message);
            baseMarket.options = [];
          }

          // Fetch multipliers
          try {
            const multipliers = await publicClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: 'getCurrentOdds',
              args: [BigInt(marketId)]
            });
            baseMarket.multipliers = (multipliers || []).map(m => Number(m));
          } catch (error) {
            baseMarket.multipliers = [];
          }
        } 
        else if (marketType === 2) {
          // RANGE: Fetch ranges
          try {
            const rangeData = await publicClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: 'getRangeMarketData',
              args: [BigInt(marketId)]
            });

            const mins = rangeData.mins || rangeData[0] || [];
            const maxs = rangeData.maxs || rangeData[1] || [];

            baseMarket.ranges = mins.map((min, idx) => ({
              min: Number(min) / 1e8,
              max: Number(maxs[idx]) / 1e8
            }));
          } catch (error) {
            console.warn(`Failed to fetch range data for market ${marketId}:`, error.message);
            baseMarket.ranges = [];
          }

          // Fetch multipliers
          try {
            const multipliers = await publicClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: 'getCurrentOdds',
              args: [BigInt(marketId)]
            });
            baseMarket.multipliers = (multipliers || []).map(m => Number(m));
          } catch (error) {
            baseMarket.multipliers = [];
          }
        } 
        else if (marketType === 3) {
          // TIME: Fetch target price and timeframes
          try {
            const timeData = await publicClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: 'getTimeMarketData',
              args: [BigInt(marketId)]
            });

            const targetPrice = timeData.targetPrice || timeData[0];
            const timeframeSeconds = timeData.timeframes || timeData[1] || [];

            baseMarket.targetPrice = Number(targetPrice) / 1e8;
            baseMarket.timeframes = timeframeSeconds.map((seconds, idx) => {
              const secondsNum = Number(seconds);
              return {
                label: formatTimeframeLabel(secondsNum),
                seconds: secondsNum
              };
            });
          } catch (error) {
            console.warn(`Failed to fetch time data for market ${marketId}:`, error.message);
            baseMarket.targetPrice = 0;
            baseMarket.timeframes = [];
          }

          // Fetch multipliers
          try {
            const multipliers = await publicClient.readContract({
              address: contract.address,
              abi: contract.abi,
              functionName: 'getCurrentOdds',
              args: [BigInt(marketId)]
            });
            baseMarket.multipliers = (multipliers || []).map(m => Number(m));
          } catch (error) {
            baseMarket.multipliers = [];
          }
        }
      } else {
        // Binary market (type 0) from Core contract
        baseMarket.multipliers = [
          market.yesMultiplier ? Number(market.yesMultiplier) : 0,
          market.noMultiplier ? Number(market.noMultiplier) : 0
        ];
      }

      return baseMarket;

    } catch (error) {
      console.warn(`Failed to fetch market ${marketId}:`, error.message);
      return null;
    }
  };


  /**
   * Fetch markets from a specific contract
   */
  const fetchMarketsFromContract = async (publicClient, contract, contractType) => {
    try {
      const marketCounter = await publicClient.readContract({
        address: contract.address,
        abi: contract.abi,
        functionName: 'marketCounter'
      });

      const totalMarkets = Number(marketCounter);
      console.log(`📋 Fetching ${totalMarkets} markets from ${contractType}...`);

      if (totalMarkets === 0) return [];

      // Fetch each market with full data
      const marketPromises = [];
      for (let i = 0; i < totalMarkets; i++) {
        marketPromises.push(fetchSingleMarket(publicClient, i, contract, contractType));
      }

      const validMarkets = (await Promise.all(marketPromises)).filter(m => m !== null);
      console.log(`✅ Loaded ${validMarkets.length} markets from ${contractType}`);
      
      return validMarkets;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch markets from ${contractType}:`, error.message);
      return [];
    }
  };

  /**
   * Fetch markets from PROXY contract (all markets visible here)
   */
  const fetchMarketsFromProxy = async (publicClient) => {
    try {
      // Read marketCounter from PROXY
      const marketCounter = await publicClient.readContract({
        address: PROXY_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'marketCounter'
      });

      const totalMarkets = Number(marketCounter);
      console.log(`📋 Fetching ${totalMarkets} markets from PROXY...`);

      if (totalMarkets === 0) return [];

      // Fetch each market with full data from PROXY
      const marketPromises = [];
      for (let i = 0; i < totalMarkets; i++) {
        marketPromises.push(fetchSingleMarketFromProxy(publicClient, i));
      }

      const validMarkets = (await Promise.all(marketPromises)).filter(m => m !== null);
      console.log(`✅ Loaded ${validMarkets.length} markets from PROXY`);
      
      return validMarkets;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch markets from PROXY:`, error.message);
      return [];
    }
  };

  /**
   * Fetch a single market from PROXY contract
   */
  const fetchSingleMarketFromProxy = async (publicClient, marketId) => {
    try {
      // Get base market data from PROXY
      const rawMarket = await publicClient.readContract({
        address: PROXY_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'markets',
        args: [BigInt(marketId)]
      });
      
      const market = parseMarketArray(rawMarket);
      
      // Validate market exists
      if (!market || market.startTime === undefined || market.startTime === 0n) {
        console.debug(`Market ${marketId} does not exist in PROXY (no startTime)`);
        return null;
      }

      const marketType = Number(market.marketType);

      // Base market object
      const baseMarket = {
        id: marketId,
        marketType,
        asset: market.asset || 'Unknown',
        question: market.question || '',
        startTime: Number(market.startTime) * 1000,
        endTime: Number(market.endTime) * 1000,
        startPrice: market.startPrice ? Number(market.startPrice) / 1e8 : 0,
        endPrice: market.endPrice ? Number(market.endPrice) / 1e8 : 0,
        totalPool: 0,
        resolved: market.resolved,
        winningChoice: market.winningChoice ? Number(market.winningChoice) : 0,
        totalBets: Number(market.totalBets) || 0,
        useFixedOdds: market.useFixedOdds || false,
        yesPool: market.yesPool ? Number(market.yesPool) / 1e6 : 0,
        noPool: market.noPool ? Number(market.noPool) / 1e6 : 0,
        contractSource: 'proxy',
        contractAddress: PROXY_ADDRESS,
      };
try {
  const rawTotal = await publicClient.readContract({
    address: PROXY_ADDRESS,
    abi: [{ name: 'getTotalPool', type: 'function', stateMutability: 'view', inputs: [{ name: 'marketId', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] }],
    functionName: 'getTotalPool',
    args: [BigInt(marketId)]
  });
  baseMarket.totalPool = Number(rawTotal) / 1e6;
} catch (e) {
  baseMarket.totalPool = baseMarket.yesPool + baseMarket.noPool;
}

      // Fetch type-specific data from PROXY using appropriate ABI
      if (marketType === 1) {
        // MULTI-CHOICE
        try {
          const options = await publicClient.readContract({
            address: PROXY_ADDRESS,
            abi: PREDICTION_MARKET_TYPES_ABI,
            functionName: 'getMultiChoiceOptions',
            args: [BigInt(marketId)]
          });
          baseMarket.options = options || [];
        } catch (error) {
          console.warn(`Failed to fetch options for market ${marketId}:`, error.message);
          baseMarket.options = [];
        }
      } else if (marketType === 2) {
        // RANGE
        try {
          const rangeData = await publicClient.readContract({
            address: PROXY_ADDRESS,
            abi: PREDICTION_MARKET_TYPES_ABI,
            functionName: 'getRangeMarketData',
            args: [BigInt(marketId)]
          });
          const mins = rangeData.mins || rangeData[0] || [];
          const maxs = rangeData.maxs || rangeData[1] || [];
          baseMarket.ranges = mins.map((min, idx) => ({
            min: Number(min) / 1e8,
            max: Number(maxs[idx]) / 1e8
          }));
        } catch (error) {
          console.warn(`Failed to fetch range data for market ${marketId}:`, error.message);
          baseMarket.ranges = [];
        }
      } else if (marketType === 3) {
        // TIME
        try {
          const timeData = await publicClient.readContract({
            address: PROXY_ADDRESS,
            abi: PREDICTION_MARKET_TYPES_ABI,
            functionName: 'getTimeMarketData',
            args: [BigInt(marketId)]
          });
          const targetPrice = timeData.targetPrice || timeData[0];
          const timeframeSeconds = timeData.timeframes || timeData[1] || [];
          baseMarket.targetPrice = Number(targetPrice) / 1e8;
          baseMarket.timeframes = timeframeSeconds.map((seconds) => {
            const secondsNum = Number(seconds);
            return {
              label: formatTimeframeLabel(secondsNum),
              seconds: secondsNum
            };
          });
        } catch (error) {
          console.warn(`Failed to fetch time data for market ${marketId}:`, error.message);
          baseMarket.targetPrice = 0;
          baseMarket.timeframes = [];
        }
      }

      return baseMarket;

    } catch (error) {
      if (error.message?.includes('out of bounds') || 
          error.message?.includes('Position') ||
          error.message?.includes('decoding')) {
        console.warn(`Market ${marketId} not found or has invalid data in PROXY`);
        return null;
      }
      console.warn(`Failed to fetch market ${marketId} from PROXY:`, error.message);
      return null;
    }
  };

  // Fetch markets for manage tab (only if parent doesn't provide markets)

  const fetchMarkets = async () => {
    // Skip if parent provides markets
    if (parentMarkets !== undefined) {
      console.log('📋 Using parent-provided markets, skipping fetch');
      return;
    }
    
    if (!publicClient || !PROXY_ADDRESS) {
      console.error('Missing publicClient or PROXY_ADDRESS');
      return;
    }

    console.log('📋 Fetching markets from PROXY...');
    setIsLoadingInternalMarkets(true);

    try {
      // ✅ FIXED: Fetch from PROXY only (all markets are stored here)
      const proxyMarkets = await fetchMarketsFromProxy(publicClient);

      // Sort by end time
      const allMarkets = proxyMarkets.sort((a, b) => b.endTime - a.endTime);

      console.log(`✅ Loaded ${allMarkets.length} markets from PROXY`);
      setInternalMarkets(allMarkets);

    } catch (error) {
      console.error('❌ Failed to fetch markets:', error);
      toast.error('Failed to load markets');
    } finally {
      setIsLoadingInternalMarkets(false);
    }
  };





  // ✅ FIXED: Withdraw fees from PROXY only (fees stored in proxy)
  const handleWithdraw = async () => {
    if (!walletClient || !address) {
      toast.error('Please connect wallet');
      return;
    }

    if (stats.pendingFees === 0n) {
      toast.error('No fees to withdraw');
      return;
    }

    try {
      setIsPending(true);
      
      toast.loading('Withdrawing fees from PROXY...', { id: 'withdraw' });
      setIsConfirming(true);

      const txHash = await walletClient.writeContract({
        address: PROXY_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'withdrawFees',
        account: address
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      toast.success('Fees withdrawn from PROXY!', { id: 'withdraw' });
      fetchStats(); // Refresh stats

    } catch (error) {
      console.error('Proxy withdraw error:', error);
      toast.error(error.message || 'Failed to withdraw fees', { id: 'withdraw' });
    } finally {
      setIsPending(false);
      setIsConfirming(false);
    }
  };


  // ✅ FIXED: Handle resolve market (removed duplicate, uses correct contracts)
  const handleResolve = async (market) => {
    if (!walletClient || !address) {
      toast.error('Please connect wallet');
      return;
    }

    try {
      setResolvingId(market.id);
      setIsPending(true);

      // ✅ Get correct contract based on market.contractSource
      const contract = getContractForMarketType(market.marketType);

      let txHash;
      let functionName = 'resolveMarket';

      // Determine correct resolve function based on market type
      if (market.marketType === 1) { // MULTI_CHOICE
        const winningChoice = multiChoiceAnswers[market.id];
        if (winningChoice === undefined) {
          toast.error('Please select winning choice');
          setResolvingId(null);
          setIsPending(false);
          return;
        }

        txHash = await walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: 'resolveMultiChoiceMarket',
          args: [BigInt(market.id), winningChoice],
          account: address
        });
      } else if (market.marketType === 2) { // RANGE
        functionName = 'resolveRangeMarket';
        txHash = await walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: functionName,
          args: [BigInt(market.id)],
          account: address
        });
      } else if (market.marketType === 3) { // TIME
        functionName = 'resolveTimeMarket';
        txHash = await walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: functionName,
          args: [BigInt(market.id)],
          account: address
        });
      } else { // BINARY (0)
        txHash = await walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: 'resolveMarket',
          args: [BigInt(market.id)],
          account: address
        });
      }

      toast.loading('Resolving market...', { id: 'resolve' });
      setIsConfirming(true);

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      toast.success('Market resolved!', { id: 'resolve' });
      fetchMarkets(); // Refresh markets

    } catch (error) {
      console.error('Resolve error:', error);
      toast.error(error.message || 'Failed to resolve market', { id: 'resolve' });
    } finally {
      setResolvingId(null);
      setIsPending(false);
      setIsConfirming(false);
    }
  };


  // ✅ FIXED: Create Binary Market (uses PROXY - markets visible to all users)
  const createBinaryMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      
      // Validate inputs
      if (!walletClient || !address) {
        throw new Error('Wallet not connected');
      }
      
      if (!PROXY_ADDRESS) {
        throw new Error('Proxy contract address not configured');
      }

      console.log('🔧 Creating binary market via PROXY with params:', {
        asset: binaryForm.asset,
        duration: binaryForm.duration * 60,
        useFixedOdds: binaryForm.useFixedOdds,
        yesMultiplier: binaryForm.yesMultiplier,
        noMultiplier: binaryForm.noMultiplier,
        useTimeDecay: binaryForm.useTimeDecay,
        decayStartPercent: binaryForm.decayStartPercent,
        minMultiplier: binaryForm.minMultiplier,
        proxy: PROXY_ADDRESS
      });

      toast.loading('Creating binary market...', { id: 'create-market' });
      
      // Add delay to allow wallet state sync (helps with testnet simulation issues)
      console.log('⏳ Waiting for wallet state sync...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // When useFixedOdds is false, multipliers should be 0 unless the contract expects otherwise.
      const yesMultiplier = binaryForm.useFixedOdds ? (binaryForm.yesMultiplier || 200) : 0;
      const noMultiplier = binaryForm.useFixedOdds ? (binaryForm.noMultiplier || 200) : 0;

      const args = [
        sanitizeInput(binaryForm.asset),
        BigInt(binaryForm.duration * 60),
        BigInt(yesMultiplier),
        BigInt(noMultiplier),
        binaryForm.useTimeDecay,
        BigInt(binaryForm.decayStartPercent),
        BigInt(binaryForm.minMultiplier),
      ];

      console.log('🔧 Transaction args:', args);

      console.log('🔧 About to simulate transaction via PROXY...');
      
      // Simulate to catch obvious errors, but don't abort on failure
      // Testnet simulations are unreliable and often fail even when the tx would succeed
      try {
        const { request } = await publicClient.simulateContract({
          address: PROXY_ADDRESS,
          abi: PREDICTION_MARKET_PROXY_ABI,
          functionName: 'createMarketWithOdds',
          args: args,
          account: address,
        });
        console.log('✅ Simulation successful:', request);
      } catch (simError) {
        console.warn('⚠️ Simulation failed (continuing with direct write):', simError.message);
        // Don't throw — testnet simulations are notoriously unreliable
        // The actual transaction may still succeed
      }
      
      // Try without gas limit first to let wallet estimate
      const txParams = {
        address: PROXY_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'createMarketWithOdds',
        args: args,
        account: address,
      };

      console.log('🔧 Transaction params:', txParams);
      
      const hash = await walletClient.writeContract(txParams);





      console.log('✅ Transaction submitted:', hash);
      
      // Set pending hash to trigger confirmation watching
      setPendingTxHash(hash);
      
    } catch (error) {
      console.error('❌ Binary market creation failed:', error);
      
      // Provide specific error messages
      let errorMessage = error.message || String(error);
      
      if (errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction was rejected in wallet';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees';
      } else if (errorMessage.includes('nonce')) {
        errorMessage = 'Transaction nonce error. Please refresh and try again.';
      } else if (errorMessage.includes('simulation')) {
        errorMessage = 'Transaction simulation failed. This is common on testnets. Please try again.';
      }
      
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + errorMessage });
      toast.error('Failed to create market: ' + errorMessage, { id: 'create-market' });
      setIsPending(false);
    }
  };


  // ✅ FIXED: Create MultiChoice Market (uses PROXY - markets visible to all users)
  const createMultiChoiceMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      
      // Validate inputs
      if (!walletClient || !address) {
        throw new Error('Wallet not connected');
      }
      
      if (!PROXY_ADDRESS) {
        throw new Error('Proxy contract address not configured');
      }
      
      const validOptions = multiChoiceForm.options.filter((o) => sanitizeInput(o).trim() !== '');
      if (validOptions.length < 2) {
        toast.error('Please provide at least 2 options');
        setIsPending(false);
        return;
      }
      if (!sanitizeInput(multiChoiceForm.question).trim()) {
        toast.error('Please provide a question');
        setIsPending(false);
        return;
      }

      console.log('🔧 Creating multi-choice market via PROXY with params:', {
        asset: multiChoiceForm.asset,
        options: validOptions,
        question: multiChoiceForm.question,
        duration: multiChoiceForm.duration * 60,
        useFixedOdds: multiChoiceForm.useFixedOdds,
        multipliers: multiChoiceForm.multipliers.slice(0, validOptions.length),
        useTimeDecay: multiChoiceForm.useTimeDecay,
        proxy: PROXY_ADDRESS
      });

      toast.loading('Creating multi-choice market...', { id: 'create-market' });
      
      // Add delay to allow wallet state sync (helps with testnet simulation issues)
      console.log('⏳ Waiting for wallet state sync...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const args = [
        sanitizeInput(multiChoiceForm.asset),
        validOptions.map(o => sanitizeInput(o)),
        sanitizeInput(multiChoiceForm.question),
        BigInt(multiChoiceForm.duration * 60),
multiChoiceForm.useFixedOdds ? validOptions.map((_, idx) => BigInt(multiChoiceForm.multipliers[idx] || 200)) : [],
        multiChoiceForm.useTimeDecay,
        BigInt(multiChoiceForm.decayStartPercent),
        BigInt(multiChoiceForm.minMultiplier),
      ];

      console.log('🔧 Transaction args:', args);

      const hash = await walletClient.writeContract({
        address: PROXY_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'createMultiChoiceMarketWithOdds',
        args: args,
        account: address,
      });






      console.log('✅ Transaction submitted:', hash);
      
      // Set pending hash to trigger confirmation watching
      setPendingTxHash(hash);
      
    } catch (error) {
      console.error('❌ Multi-choice market creation failed:', error);
      
      // Provide specific error messages
      let errorMessage = error.message || String(error);
      
      if (errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction was rejected in wallet';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees';
      } else if (errorMessage.includes('nonce')) {
        errorMessage = 'Transaction nonce error. Please refresh and try again.';
      } else if (errorMessage.includes('simulation')) {
        errorMessage = 'Transaction simulation failed. This is common on testnets. Please try again.';
      }
      
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + errorMessage });
      toast.error('Failed to create market: ' + errorMessage, { id: 'create-market' });
      setIsPending(false);
    }
  };


  // ✅ FIXED: Create Range Market (uses PROXY - markets visible to all users)
  const createRangeMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      
      // Validate inputs
      if (!walletClient || !address) {
        throw new Error('Wallet not connected');
      }
      
      if (!PROXY_ADDRESS) {
        throw new Error('Proxy contract address not configured');
      }
      
      const rangeMins = rangeForm.ranges.map((r) => BigInt(Math.floor(r.min * 1e8)));
      const rangeMaxs = rangeForm.ranges.map((r) => BigInt(Math.floor(r.max * 1e8)));
      
      console.log('🔧 Creating range market via PROXY with params:', {
        asset: rangeForm.asset,
        rangeMins: rangeMins.map(b => b.toString()),
        rangeMaxs: rangeMaxs.map(b => b.toString()),
        duration: rangeForm.duration * 60,
        useFixedOdds: rangeForm.useFixedOdds,
        multipliers: rangeForm.multipliers,
        useTimeDecay: rangeForm.useTimeDecay,
        proxy: PROXY_ADDRESS
      });

      toast.loading('Creating range market...', { id: 'create-market' });
      
      // Add delay to allow wallet state sync (helps with testnet simulation issues)
      console.log('⏳ Waiting for wallet state sync...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const args = [
        sanitizeInput(rangeForm.asset),
        rangeMins,
        rangeMaxs,
        BigInt(rangeForm.duration * 60),
rangeForm.useFixedOdds ? rangeForm.multipliers.map((m) => BigInt(m)) : [],
        rangeForm.useTimeDecay,
        BigInt(rangeForm.decayStartPercent),
        BigInt(rangeForm.minMultiplier),
      ];

      console.log('🔧 Transaction args:', args);

      const hash = await walletClient.writeContract({
        address: PROXY_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'createRangeMarketWithOdds',
        args: args,
        account: address,
      });






      console.log('✅ Transaction submitted:', hash);
      
      // Set pending hash to trigger confirmation watching
      setPendingTxHash(hash);
      
    } catch (error) {
      console.error('❌ Range market creation failed:', error);
      
      // Provide specific error messages
      let errorMessage = error.message || String(error);
      
      if (errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction was rejected in wallet';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees';
      } else if (errorMessage.includes('nonce')) {
        errorMessage = 'Transaction nonce error. Please refresh and try again.';
      } else if (errorMessage.includes('simulation')) {
        errorMessage = 'Transaction simulation failed. This is common on testnets. Please try again.';
      }
      
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + errorMessage });
      toast.error('Failed to create market: ' + errorMessage, { id: 'create-market' });
      setIsPending(false);
    }
  };


  // ✅ FIXED: Create Time Market (uses PROXY - markets visible to all users)
  const createTimeMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      
      // Validate inputs
      if (!walletClient || !address) {
        throw new Error('Wallet not connected');
      }
      
      if (!PROXY_ADDRESS) {
        throw new Error('Proxy contract address not configured');
      }
      
      const targetPriceBigInt = BigInt(Math.floor(timeForm.targetPrice * 1e8));
      // ADD this before building args:
      const sortedTimeframes = [...timeForm.timeframes].sort((a, b) => a.seconds - b.seconds);
      const sortedMultipliers = sortedTimeframes.map(tf => {
        const origIdx = timeForm.timeframes.findIndex(t => t.seconds === tf.seconds);
        return timeForm.multipliers[origIdx] || 200;
      });

      // THEN use sorted values in args:
      const timeframeSeconds = sortedTimeframes.map(tf => BigInt(tf.seconds));
      
      console.log('🔧 Creating time market via PROXY with params:', {
        asset: timeForm.asset,
        targetPrice: targetPriceBigInt.toString(),
        timeframes: timeframeSeconds.map(b => b.toString()),
        useFixedOdds: timeForm.useFixedOdds,
        multipliers: sortedMultipliers,
        useTimeDecay: timeForm.useTimeDecay,
        proxy: PROXY_ADDRESS
      });

      toast.loading('Creating time-based market...', { id: 'create-market' });
      
      // Add delay to allow wallet state sync (helps with testnet simulation issues)
      console.log('⏳ Waiting for wallet state sync...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const args = [
        sanitizeInput(timeForm.asset),
        targetPriceBigInt,
        timeframeSeconds,                                          // ← sorted
        timeForm.useFixedOdds ? sortedMultipliers.map(m => BigInt(m)) : [],
        timeForm.useTimeDecay,
        BigInt(timeForm.decayStartPercent),
        BigInt(timeForm.minMultiplier),
      ];

      console.log('🔧 Transaction args:', args);

      const hash = await walletClient.writeContract({
        address: PROXY_ADDRESS,
        abi: PREDICTION_MARKET_PROXY_ABI,
        functionName: 'createTimeMarketWithOdds',
        args: args,
        account: address,
      });






      console.log('✅ Transaction submitted:', hash);
      
      // Set pending hash to trigger confirmation watching
      setPendingTxHash(hash);
      
    } catch (error) {
      console.error('❌ Time market creation failed:', error);
      
      // Provide specific error messages
      let errorMessage = error.message || String(error);
      
      if (errorMessage.includes('User rejected')) {
        errorMessage = 'Transaction was rejected in wallet';
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH for gas fees';
      } else if (errorMessage.includes('nonce')) {
        errorMessage = 'Transaction nonce error. Please refresh and try again.';
      } else if (errorMessage.includes('simulation')) {
        errorMessage = 'Transaction simulation failed. This is common on testnets. Please try again.';
      }
      
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + errorMessage });
      toast.error('Failed to create market: ' + errorMessage, { id: 'create-market' });
      setIsPending(false);
    }
  };




  const handleCreate = () => {
    if (!walletClient || !address) {
      toast.error('Please connect wallet');
      return;
    }

    setIsPending(true);

    switch (marketType) {
      case 'binary': createBinaryMarket(); break;
      case 'multi': createMultiChoiceMarket(); break;
      case 'range': createRangeMarket(); break;
      case 'time': createTimeMarket(); break;
      default: break;
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'manage') {
      fetchMarkets();
    }
  }, [activeTab, isOpen, publicClient]);

  // Debug logging - MUST be before any conditional returns (React hooks rule)
  useEffect(() => {
    console.log('🔧 AdminPanel Debug:', {
      isOpen,
      internalIsOpen,
      propIsOpen,
      isAdmin,
      address,
      proxyOwner,
      isContractOwner,
      isEnvOwner,
      ENV_OWNER_ADDRESS: import.meta.env?.OWNER_ADDRESS || import.meta.env?.VITE_OWNER_ADDRESS,
      PROXY_ADDRESS
    });
  }, [isOpen, internalIsOpen, propIsOpen, isAdmin, address, proxyOwner, isContractOwner, isEnvOwner]);



  if (isLoadingOwner) {
    return null; // Loading state - don't show anything yet
  }

  if (!isAdmin) {
    console.log('🔧 AdminPanel: Not admin, returning null', { 
      address, 
      proxyOwner, 
      isContractOwner, 
      isEnvOwner,
      PROXY_ADDRESS
    });
    return null;
  }



  // Don't show trigger button if controlled by parent
  const showTrigger = propIsOpen === undefined;


  return (
    <>
      {/* Trigger Button - only show when not controlled by parent */}
      {showTrigger && (
        <button
          onClick={() => {
            console.log('🔧 Admin button clicked, setting isOpen to true');
            setIsOpen(true);
          }}
          className="fixed bottom-6 right-6 p-4 bg-[#c0ff00] text-dark-950 rounded-full shadow-lg hover:bg-[#d4ff33] transition-all hover:scale-110 z-50 cursor-pointer pointer-events-auto"
          title="Admin Panel"
          type="button"
        >
          <Settings className="w-6 h-6" />
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              console.log('🔧 Modal backdrop clicked, closing');
              setIsOpen(false);
            }
          }}
        >
          <div 
            className="bg-neutral-50 dark:bg-dark-900 border border-primary/30 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl dark:shadow-primary/20 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-primary/20">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-primary tracking-tight">Admin Panel</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-neutral-200 dark:bg-dark-800 rounded-lg transition-colors"
                aria-label="Close admin panel"
              >
                <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-primary/20 px-6">
              {['dashboard', 'create', 'manage', 'bot', 'vouchers'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-bold capitalize transition-all border-b-2 ${
                    activeTab === tab
                      ? 'text-neutral-900 dark:text-primary border-primary'
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 border-transparent'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {activeTab === 'dashboard' && (
                <DashboardTabV2
                  stats={stats}
                  isLoadingStats={isLoadingStats}
                  handleWithdraw={handleWithdraw}
                  contractAddress={PROXY_ADDRESS}
                  isPending={isPending}
                  isConfirming={isConfirming}
                  onNavigate={setActiveTab}
                  markets={markets}
                />
              )}

              {activeTab === 'create' && (
                <CreateTab
                  marketType={marketType}
                  setMarketType={setMarketType}
                  binaryForm={binaryForm}
                  setBinaryForm={(field, value) => setBinaryForm(prev => ({ ...prev, [field]: value }))}
                  multiChoiceForm={multiChoiceForm}
                  setMultiChoiceForm={(field, value) => setMultiChoiceForm(prev => ({ ...prev, [field]: value }))}
                  rangeForm={rangeForm}
                  setRangeForm={(field, value) => setRangeForm(prev => ({ ...prev, [field]: value }))}
                  timeForm={timeForm}
                  setTimeForm={(field, value) => setTimeForm(prev => ({ ...prev, [field]: value }))}
                  currentAssetPrice={currentAssetPrice}
                  isPriceLoading={isPriceLoading}
                  createStatus={createStatus}
                  handleCreate={handleCreate}
                  isPending={isPending || isConfirmingCreation}
                  isConfirming={isConfirmingCreation}
                />
              )}
              
              {activeTab === 'manage' && (
                <ManageTab
                  markets={markets}
                  isLoadingMarkets={isLoadingMarkets}
                  resolvingId={resolvingId}
                  multiChoiceAnswers={multiChoiceAnswers}
                  setMultiChoiceAnswers={setMultiChoiceAnswers}
                  handleResolve={handleResolve}
                  isPending={isPending}
                  isConfirming={isConfirming}
                />
              )}
              {activeTab === 'bot' && <BotControlPanel />}
              {activeTab === 'vouchers' && vouchersContractAddress && (
                <VouchersTab vouchersContractAddress={vouchersContractAddress} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
