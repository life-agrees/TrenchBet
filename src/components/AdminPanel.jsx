import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient, useWalletClient, useReadContract } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';

import { Settings, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import DashboardTab from './DashboardTab';
import CreateTab from './CreateTab';
import ManageTab from './ManageTab';
import { CONTRACTS } from '../utils/constants';
import { 
  PREDICTION_MARKET_CORE_ABI, 
  PREDICTION_MARKET_TYPES_ABI, 
  ERC20_ABI 
} from '../contracts/abis';
import { sanitizeInput } from '../utils/inputSanitization';

/**
 * Helper to get contract info based on market type
 * Binary markets (type 0) -> Core contract
 * Multi/Range/Time markets (types 1-3) -> Types contract
 */
function getContractForMarketType(marketType) {
  if (marketType === 0 || marketType === 'binary') {
    return {
      address: CONTRACTS.PREDICTION_MARKET_CORE,
      abi: PREDICTION_MARKET_CORE_ABI,
      source: 'core'
    };
  }
  return {
    address: CONTRACTS.PREDICTION_MARKET_TYPES,
    abi: PREDICTION_MARKET_TYPES_ABI,
    source: 'types'
  };
}


export default function AdminPanel({ isOpen: propIsOpen, onClose }) {
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

  // Manage tab state
  const [markets, setMarkets] = useState([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
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
    useFixedOdds: false,
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
    useFixedOdds: false,
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
    useFixedOdds: false,
    useTimeDecay: false,
    decayStartPercent: 50,
    minMultiplier: 120,
  });

  const [timeForm, setTimeForm] = useState({
    asset: 'SOL',
    targetPrice: 200,
    timeframes: [
      { label: '24 hours', seconds: 86400 },
      { label: '7 days', seconds: 604800 },
      { label: '30 days', seconds: 2592000 },
    ],
    multipliers: [300, 200, 150],
    useFixedOdds: true,
    useTimeDecay: false,
    decayStartPercent: 50,
    minMultiplier: 120,
  });


  // Transaction states
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Admin check - dynamically fetch contract owner from BOTH contracts
  const { data: coreOwner, isLoading: isLoadingCoreOwner } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET_CORE,
    abi: PREDICTION_MARKET_CORE_ABI,
    functionName: 'owner',
    enabled: !!address && !!CONTRACTS.PREDICTION_MARKET_CORE,
  });

  const { data: typesOwner, isLoading: isLoadingTypesOwner } = useReadContract({
    address: CONTRACTS.PREDICTION_MARKET_TYPES,
    abi: PREDICTION_MARKET_TYPES_ABI,
    functionName: 'owner',
    enabled: !!address && !!CONTRACTS.PREDICTION_MARKET_TYPES,
  });

  const isAdmin = address && (coreOwner || typesOwner)
    ? address.toLowerCase() === (coreOwner?.toLowerCase() || typesOwner?.toLowerCase())
    : false;

  const isLoadingOwner = isLoadingCoreOwner || isLoadingTypesOwner;



  // --- PRICE FETCHING ---
  const fetchCurrentPrice = useCallback(async (asset) => {
    if (!publicClient || !asset) return null;
    setIsPriceLoading(true);
    try {
      // Try Core contract first, then Types
      let price;
      try {
        price = await publicClient.readContract({
          address: CONTRACTS.PREDICTION_MARKET_CORE,
          abi: PREDICTION_MARKET_CORE_ABI,
          functionName: 'getCurrentPrice',
          args: [asset],
        });
      } catch (coreError) {
        // Fallback to Types contract
        price = await publicClient.readContract({
          address: CONTRACTS.PREDICTION_MARKET_TYPES,
          abi: PREDICTION_MARKET_TYPES_ABI,
          functionName: 'getCurrentPrice',
          args: [asset],
        });
      }

      const priceNumber = parseFloat(formatUnits(price, 8));
      setCurrentAssetPrice(priceNumber);
      return priceNumber;
    } catch (error) {
      console.error(`Error fetching price for ${asset}:`, error);
      setCurrentAssetPrice(null);
      return null;
    } finally {
      setIsPriceLoading(false);
    }
  }, [publicClient]);


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
          const defaultBand = price > 10000 ? 1000 : 100;
          const fmt = (p) => p.toFixed(price > 1000 ? 0 : 2);

          setRangeForm(prev => ({
            ...prev,
            ranges: [
              { min: parseFloat(fmt(price - defaultBand*2)), max: parseFloat(fmt(price - defaultBand)) },
              { min: parseFloat(fmt(price - defaultBand)), max: parseFloat(fmt(price + defaultBand)) },
              { min: parseFloat(fmt(price + defaultBand)), max: parseFloat(fmt(price + defaultBand*2)) }
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
          
          // Refresh markets list immediately
          await fetchMarkets();
          
          // Also refresh stats if on dashboard
          if (activeTab === 'dashboard') {
            await fetchStats();
          }
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

  // Fetch dashboard stats
  const fetchStats = async () => {
    if (!publicClient || !CONTRACTS.PREDICTION_MARKET_CORE || !CONTRACTS.PREDICTION_MARKET_TYPES) {
      console.error('Missing publicClient or contract addresses');
      return;
    }

    console.log('📊 Fetching dashboard stats...');
    setIsLoadingStats(true);

    try {
      // 1. Get market counters from BOTH contracts
      let coreCounter = 0n;
      let typesCounter = 0n;
      
      try {
        [coreCounter, typesCounter] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.PREDICTION_MARKET_CORE,
            abi: PREDICTION_MARKET_CORE_ABI,
            functionName: 'marketCounter'
          }),
          publicClient.readContract({
            address: CONTRACTS.PREDICTION_MARKET_TYPES,
            abi: PREDICTION_MARKET_TYPES_ABI,
            functionName: 'marketCounter'
          })
        ]);
        console.log('✅ Market counters:', { core: coreCounter.toString(), types: typesCounter.toString() });
      } catch (error) {
        console.warn('⚠️ marketCounter() failed:', error.message);
      }

      const totalMarkets = Number(coreCounter) + Number(typesCounter);

      // 2. Get accumulated fees from BOTH contracts
      let coreFees = 0n;
      let typesFees = 0n;
      
      try {
        [coreFees, typesFees] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.PREDICTION_MARKET_CORE,
            abi: PREDICTION_MARKET_CORE_ABI,
            functionName: 'accumulatedFees'
          }).catch(() => 0n),
          publicClient.readContract({
            address: CONTRACTS.PREDICTION_MARKET_TYPES,
            abi: PREDICTION_MARKET_TYPES_ABI,
            functionName: 'accumulatedFees'
          }).catch(() => 0n)
        ]);
        console.log('✅ Accumulated fees:', { 
          core: formatUnits(coreFees, 6), 
          types: formatUnits(typesFees, 6) 
        });
      } catch (error) {
        console.warn('⚠️ accumulatedFees() failed:', error.message);
      }

      const accumulatedFees = coreFees + typesFees;

      // 3. Get contract USDC balances from BOTH contracts
      let coreBalance = 0n;
      let typesBalance = 0n;
      
      try {
        [coreBalance, typesBalance] = await Promise.all([
          publicClient.readContract({
            address: CONTRACTS.USDC,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [CONTRACTS.PREDICTION_MARKET_CORE]
          }).catch(() => 0n),
          publicClient.readContract({
            address: CONTRACTS.USDC,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [CONTRACTS.PREDICTION_MARKET_TYPES]
          }).catch(() => 0n)
        ]);
        console.log('✅ Contract balances:', { 
          core: formatUnits(coreBalance, 6), 
          types: formatUnits(typesBalance, 6) 
        });
      } catch (error) {
        console.warn('⚠️ balanceOf() failed:', error.message);
      }

      const contractBalance = coreBalance + typesBalance;

      // 4. Get bet events from BOTH contracts
      let totalBets = 0;
      let totalVolume = 0n;
      let uniqueUsers = new Set();

      try {
        const [coreLogs, typesLogs] = await Promise.all([
          publicClient.getLogs({
            address: CONTRACTS.PREDICTION_MARKET_CORE,
            event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
            fromBlock: 'earliest',
            toBlock: 'latest'
          }).catch(() => []),
          publicClient.getLogs({
            address: CONTRACTS.PREDICTION_MARKET_TYPES,
            event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
            fromBlock: 'earliest',
            toBlock: 'latest'
          }).catch(() => [])
        ]);

        const allLogs = [...coreLogs, ...typesLogs];
        console.log(`✅ Found ${allLogs.length} bet events (${coreLogs.length} core, ${typesLogs.length} types)`);

        allLogs.forEach(log => {
          if (log.args.user) {
            uniqueUsers.add(log.args.user.toLowerCase());
          }
          if (log.args.amount) {
            totalVolume += log.args.amount;
          }
        });

        totalBets = allLogs.length;
      } catch (error) {
        console.warn('⚠️ Event fetching failed:', error.message);
      }

      setStats({
        totalUsers: uniqueUsers.size,
        totalVolume: Number(formatUnits(totalVolume, 6)),
        totalBets,
        pendingFees: accumulatedFees,
        contractBalance
      });

      console.log('✅ Stats updated:', {
        users: uniqueUsers.size,
        volume: formatUnits(totalVolume, 6),
        bets: totalBets,
        totalMarkets
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
  const formatTimeframeLabel = (seconds) => {
    const hours = seconds / 3600;
    const days = seconds / 86400;
    const weeks = seconds / 604800;
    const months = seconds / 2592000;

    if (months >= 1) return `${Math.round(months)} month${Math.round(months) > 1 ? 's' : ''}`;
    if (weeks >= 1) return `${Math.round(weeks)} week${Math.round(weeks) > 1 ? 's' : ''}`;
    if (days >= 1) return `${Math.round(days)} day${Math.round(days) > 1 ? 's' : ''}`;
    return `${Math.round(hours)} hour${Math.round(hours) > 1 ? 's' : ''}`;
  };

  /**
   * Fetch a single market with all type-specific data
   * Updated for dual contract architecture
   */
  const fetchSingleMarket = async (publicClient, marketId, contract, contractType) => {
    try {
      // Step 1: Get base market data
      const market = await publicClient.readContract({
        address: contract.address,
        abi: contract.abi,
        functionName: 'getMarket',
        args: [BigInt(marketId)]
      });

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
        totalPool: Number(((market.yesPool || 0n) + (market.noPool || 0n)) / 1000000n),

        resolved: market.resolved,
        winningChoice: market.winningChoice ? Number(market.winningChoice) : 0,
        totalBets: Number(market.totalBets) || 0,
        useFixedOdds: market.useFixedOdds || false,
        yesPool: market.yesPool ? Number(market.yesPool) / 1e6 : 0,
        noPool: market.noPool ? Number(market.noPool) / 1e6 : 0,
        contractSource: contractType,
        contractAddress: contract.address,
      };

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

  // Fetch markets for manage tab
  const fetchMarkets = async () => {
    if (!publicClient || !CONTRACTS.PREDICTION_MARKET_CORE || !CONTRACTS.PREDICTION_MARKET_TYPES) {
      console.error('Missing publicClient or contract addresses');
      return;
    }

    console.log('📋 Fetching markets from both contracts...');
    setIsLoadingMarkets(true);

    try {
      // Fetch from both contracts in parallel
      const coreContract = {
        address: CONTRACTS.PREDICTION_MARKET_CORE,
        abi: PREDICTION_MARKET_CORE_ABI
      };
      const typesContract = {
        address: CONTRACTS.PREDICTION_MARKET_TYPES,
        abi: PREDICTION_MARKET_TYPES_ABI
      };

      const [coreMarkets, typesMarkets] = await Promise.all([
        fetchMarketsFromContract(publicClient, coreContract, 'core'),
        fetchMarketsFromContract(publicClient, typesContract, 'types')
      ]);

      // Combine and sort by end time
      const allMarkets = [...coreMarkets, ...typesMarkets].sort((a, b) => b.endTime - a.endTime);

      console.log(`✅ Loaded ${allMarkets.length} markets total (${coreMarkets.length} core, ${typesMarkets.length} types)`);
      setMarkets(allMarkets);

    } catch (error) {
      console.error('❌ Failed to fetch markets:', error);
      toast.error('Failed to load markets');
    } finally {
      setIsLoadingMarkets(false);
    }
  };



  // Handle withdraw fees
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
      
      // Withdraw from both contracts
      const withdrawPromises = [];
      
      if (CONTRACTS.PREDICTION_MARKET_CORE) {
        withdrawPromises.push(
          walletClient.writeContract({
            address: CONTRACTS.PREDICTION_MARKET_CORE,
            abi: PREDICTION_MARKET_CORE_ABI,
            functionName: 'withdrawFees',
            account: address
          }).catch(err => {
            console.log('Core withdraw skipped or failed:', err.message);
            return null;
          })
        );
      }
      
      if (CONTRACTS.PREDICTION_MARKET_TYPES) {
        withdrawPromises.push(
          walletClient.writeContract({
            address: CONTRACTS.PREDICTION_MARKET_TYPES,
            abi: PREDICTION_MARKET_TYPES_ABI,
            functionName: 'withdrawFees',
            account: address
          }).catch(err => {
            console.log('Types withdraw skipped or failed:', err.message);
            return null;
          })
        );
      }

      toast.loading('Withdrawing fees...', { id: 'withdraw' });
      setIsConfirming(true);

      const results = await Promise.all(withdrawPromises);
      const successCount = results.filter(r => r !== null).length;

      if (successCount > 0) {
        toast.success(`Fees withdrawn from ${successCount} contract(s)!`, { id: 'withdraw' });
        fetchStats(); // Refresh stats
      } else {
        toast.error('No fees were withdrawn', { id: 'withdraw' });
      }

    } catch (error) {
      console.error('Withdraw error:', error);
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

      let hash;
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

        hash = await walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: 'resolveMultiChoiceMarket',
          args: [BigInt(market.id), winningChoice],
          account: address
        });
      } else if (market.marketType === 2) { // RANGE
        functionName = 'resolveRangeMarket';
        hash = await walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: functionName,
          args: [BigInt(market.id)],
          account: address
        });
      } else if (market.marketType === 3) { // TIME
        functionName = 'resolveTimeMarket';
        hash = await walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: functionName,
          args: [BigInt(market.id)],
          account: address
        });
      } else { // BINARY (0)
        hash = await walletClient.writeContract({
          address: contract.address,
          abi: contract.abi,
          functionName: 'resolveMarket',
          args: [BigInt(market.id)],
          account: address
        });
      }

      toast.loading('Resolving market...', { id: 'resolve' });
      setIsConfirming(true);

      await publicClient.waitForTransactionReceipt({ hash });

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

  // ✅ FIXED: Create Binary Market (uses CORE contract)
  const createBinaryMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      
      toast.loading('Creating binary market...', { id: 'create-market' });
      
      const hash = await walletClient.writeContract({
        address: CONTRACTS.PREDICTION_MARKET_CORE,  // ✅ FIXED: Use Core contract
        abi: PREDICTION_MARKET_CORE_ABI,             // ✅ FIXED: Use Core ABI
        functionName: 'createMarketWithOdds',
        args: [
          sanitizeInput(binaryForm.asset),
          BigInt(binaryForm.duration * 60),
          binaryForm.useFixedOdds ? BigInt(binaryForm.yesMultiplier) : BigInt(0),
          binaryForm.useFixedOdds ? BigInt(binaryForm.noMultiplier) : BigInt(0),
          binaryForm.useTimeDecay,
          BigInt(binaryForm.decayStartPercent),
          BigInt(binaryForm.minMultiplier),
        ],
        account: address
      });

      
      // Set pending hash to trigger confirmation watching
      setPendingTxHash(hash);
      
    } catch (error) {
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + (error.message || String(error)) });
      toast.error('Failed to create market: ' + error.message, { id: 'create-market' });
      setIsPending(false);
    }
  };

  // ✅ FIXED: Create MultiChoice Market (uses TYPES contract)
  const createMultiChoiceMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      
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

      toast.loading('Creating multi-choice market...', { id: 'create-market' });
      
      const hash = await walletClient.writeContract({
        address: CONTRACTS.PREDICTION_MARKET_TYPES,  // ✅ FIXED: Use Types contract
        abi: PREDICTION_MARKET_TYPES_ABI,             // ✅ FIXED: Use Types ABI
        functionName: 'createMultiChoiceMarketWithOdds',
        args: [
          sanitizeInput(multiChoiceForm.asset),
          validOptions.map(o => sanitizeInput(o)),
          sanitizeInput(multiChoiceForm.question),
          BigInt(multiChoiceForm.duration * 60),
          multiChoiceForm.useFixedOdds ? multiChoiceForm.multipliers.slice(0, validOptions.length).map((m) => BigInt(m)) : [],
          multiChoiceForm.useTimeDecay,
          BigInt(multiChoiceForm.decayStartPercent),
          BigInt(multiChoiceForm.minMultiplier),
        ],
        account: address
      });

      
      // Set pending hash to trigger confirmation watching
      setPendingTxHash(hash);
      
    } catch (error) {
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + (error.message || String(error)) });
      toast.error('Failed to create market: ' + error.message, { id: 'create-market' });
      setIsPending(false);
    }
  };

  // ✅ FIXED: Create Range Market (uses TYPES contract)
  const createRangeMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      
      const rangeMins = rangeForm.ranges.map((r) => BigInt(Math.floor(r.min * 1e8)));
      const rangeMaxs = rangeForm.ranges.map((r) => BigInt(Math.floor(r.max * 1e8)));
      
      toast.loading('Creating range market...', { id: 'create-market' });
      
      const hash = await walletClient.writeContract({
        address: CONTRACTS.PREDICTION_MARKET_TYPES,  // ✅ FIXED: Use Types contract
        abi: PREDICTION_MARKET_TYPES_ABI,             // ✅ FIXED: Use Types ABI
        functionName: 'createRangeMarketWithOdds',
        args: [
          sanitizeInput(rangeForm.asset),
          rangeMins,
          rangeMaxs,
          BigInt(rangeForm.duration * 60),
          rangeForm.useFixedOdds ? rangeForm.multipliers.map((m) => BigInt(m)) : [],
          rangeForm.useTimeDecay,
          BigInt(rangeForm.decayStartPercent),
          BigInt(rangeForm.minMultiplier),
        ],
        account: address
      });

      
      // Set pending hash to trigger confirmation watching
      setPendingTxHash(hash);
      
    } catch (error) {
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + (error.message || String(error)) });
      toast.error('Failed to create market: ' + error.message, { id: 'create-market' });
      setIsPending(false);
    }
  };

  // ✅ ALREADY CORRECT: Create Time Market (uses TYPES contract)
  const createTimeMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      
      const targetPriceBigInt = BigInt(Math.floor(timeForm.targetPrice * 1e8));
      const timeframeSeconds = timeForm.timeframes.map((tf) => BigInt(tf.seconds));
      
      toast.loading('Creating time-based market...', { id: 'create-market' });
      
      const hash = await walletClient.writeContract({
        address: CONTRACTS.PREDICTION_MARKET_TYPES,
        abi: PREDICTION_MARKET_TYPES_ABI,
        functionName: 'createTimeMarketWithOdds',
        args: [
          sanitizeInput(timeForm.asset),
          targetPriceBigInt,
          timeframeSeconds,
          timeForm.useFixedOdds ? timeForm.multipliers.map((m) => BigInt(m)) : [],
          timeForm.useTimeDecay,
          BigInt(timeForm.decayStartPercent),
          BigInt(timeForm.minMultiplier),
        ],
        account: address
      });
      
      // Set pending hash to trigger confirmation watching
      setPendingTxHash(hash);
      
    } catch (error) {
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + (error.message || String(error)) });
      toast.error('Failed to create market: ' + error.message, { id: 'create-market' });
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

  if (isLoadingOwner) {
    return null; // Loading state - don't show anything yet
  }

  if (!isAdmin) return null;


  // Don't show trigger button if controlled by parent
  const showTrigger = propIsOpen === undefined;

  return (
    <>
      {/* Trigger Button - only show when not controlled by parent */}
      {showTrigger && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-[#c0ff00] text-dark-950 rounded-full shadow-lg hover:bg-[#d4ff33] transition-all hover:scale-110 z-40"
          title="Admin Panel"
        >
          <Settings className="w-6 h-6" />
        </button>
      )}

      {/* Modal */}
      {isOpen && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-[#c0ff00]/30 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl shadow-[#c0ff00]/20">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#c0ff00]/20">
              <h2 className="text-2xl font-bold text-[#c0ff00]">Admin Panel</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#c0ff00]/20 px-6">
              {['dashboard', 'create', 'manage'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'text-[#c0ff00] border-b-2 border-[#c0ff00]'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {activeTab === 'dashboard' && (
                <DashboardTab
                  stats={stats}
                  isLoadingStats={isLoadingStats}
                  handleWithdraw={handleWithdraw}
                  contractAddress={CONTRACTS.PREDICTION_MARKET_CORE}
                  isPending={isPending}
                  isConfirming={isConfirming}
                  onNavigate={setActiveTab}
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}