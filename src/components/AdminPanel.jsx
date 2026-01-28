// src/components/AdminPanel.jsx
import React, { useEffect, useState } from 'react';
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import {
  Plus,
  TrendingUp,
  BarChart3,
  Target,
  Timer,
  Loader2,
  CheckCircle,
  XCircle,
  Settings,
  X,
  List,
  Users,
  DollarSign,
  Wallet,
  Activity
} from 'lucide-react';
import { parseAbiItem, formatUnits } from 'viem';
import { CONTRACTS } from '../config/wagmi';
import { PREDICTION_MARKET_ABI, ERC20_ABI } from '../contracts/abis';

const AdminPanel = ({ onClose }) => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  
  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Owner state
  const [isOwner, setIsOwner] = useState(false);
  const [ownerOnChain, setOwnerOnChain] = useState(null);
  const [checking, setChecking] = useState(false);

  // UI state
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [marketType, setMarketType] = useState('binary');

  // Stats State
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVolume: 0,
    totalBets: 0,
    pendingFees: 0n,
    contractBalance: 0n
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Management State
  const [markets, setMarkets] = useState([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [multiChoiceAnswers, setMultiChoiceAnswers] = useState({});

  // New states for price fetching and display
  const [currentAssetPrice, setCurrentAssetPrice] = useState(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  const MARKET_TYPES = {
    BINARY: 0,
    MULTI_CHOICE: 1,
    RANGE: 2,
    TIME_BASED: 3
  };

  // Forms
  const [binaryForm, setBinaryForm] = useState({
    asset: 'BTC',
    duration: 15,
    yesMultiplier: 200,
    noMultiplier: 200,
    useFixedOdds: false,
  });

  const [multiChoiceForm, setMultiChoiceForm] = useState({
    asset: 'CRYPTO',
    question: '',
    options: ['', '', ''],
    duration: 60,
    multipliers: [200, 200, 200],
    useFixedOdds: false,
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
  });

  const [createStatus, setCreateStatus] = useState({ show: false, success: false, message: '' });

// Function to fetch the current asset price from the Chainlink oracle via the contract
// --- PRICE FETCHING LOGIC (FIXED) ---
const fetchCurrentPrice = async (asset) => {
  if (!publicClient || !asset) return null;
  setIsPriceLoading(true);
  try {
    // 1. Read price from contract
    const price = await publicClient.readContract({
      address: CONTRACTS.PREDICTION_MARKET,
      abi: PREDICTION_MARKET_ABI,
      functionName: 'getCurrentPrice', // <--- FIXED: Matches your ABI
      args: [asset],
    });
    
    // 2. Format: Chainlink uses 8 decimals
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
};

// Effect: Fetch price whenever Asset or Market Type changes
useEffect(() => {
  let currentAsset = '';
  // Determine asset based on active form
  if (marketType === 'binary') currentAsset = binaryForm.asset;
  else if (marketType === 'multi') currentAsset = multiChoiceForm.asset;
  else if (marketType === 'range') currentAsset = rangeForm.asset;
  else if (marketType === 'time') currentAsset = timeForm.asset;
  
  if (currentAsset) {
    fetchCurrentPrice(currentAsset).then(price => {
      // Auto-fill Range Market defaults if price found
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
}, [marketType, binaryForm.asset, multiChoiceForm.asset, rangeForm.asset, timeForm.asset, publicClient]);

  const contractAddress = CONTRACTS.PREDICTION_MARKET;

  // --- OWNER CHECK ---
  useEffect(() => {
    let mounted = true;
    const checkOwner = async () => {
      if (!mounted) return;
      setIsOwner(false);
      setOwnerOnChain(null);

      if (!address || !publicClient) return;

      setChecking(true);
      try {
        if (!contractAddress) {
          setChecking(false);
          return;
        }

        const OWNER_ABI = [{ name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }];
        const ownerRaw = await publicClient.readContract({
          address: contractAddress,
          abi: OWNER_ABI,
          functionName: 'owner',
        });

        const owner = String(ownerRaw).toLowerCase();
        const user = String(address).toLowerCase();
        setOwnerOnChain(owner);

        if (owner === user) {
          setIsOwner(true);
          setChecking(false);
          return;
        }

        // Try Gnosis Safe check
        const SAFE_ABI = [{ name: 'getOwners', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address[]' }] }];
        try {
          const safeOwners = await publicClient.readContract({
            address: owner,
            abi: SAFE_ABI,
            functionName: 'getOwners',
          });
          const normalized = (safeOwners || []).map((o) => String(o).toLowerCase());
          if (normalized.includes(user)) {
            setIsOwner(true);
          }
        } catch (e) {
          // Not a safe, ignore
        }

        setChecking(false);
      } catch (error) {
        console.error('Error checking owner:', error);
        setIsOwner(false);
        setChecking(false);
      }
    };

    checkOwner();
    return () => { mounted = false; };
  }, [address, publicClient, contractAddress]);

  // Effect to fetch price and pre-fill Range Market form
  useEffect(() => {
    if (marketType === 'range' && rangeForm.asset) {
      fetchCurrentPrice(rangeForm.asset).then(price => {
        if (price) {
          const currentPrice = price; 
          
          // Determine a default band based on asset size
          // $100 band for smaller coins (ETH/SOL) or $1000 band for BTC
          const defaultBand = currentPrice > 10000 ? 1000 : 100;
          
          // Define 3 simple ranges centered around the current price
          const min1 = currentPrice - defaultBand * 2;
          const max1 = currentPrice - defaultBand;
          const min2 = currentPrice - defaultBand;
          const max2 = currentPrice + defaultBand;
          const min3 = currentPrice + defaultBand;
          const max3 = currentPrice + defaultBand * 2;
          
          // Format price: 0 decimals for large assets (BTC), 2 for smaller ones (ETH)
          const formatPriceInput = (p) => p.toFixed(currentPrice > 1000 ? 0 : 2); 
          
          setRangeForm(prev => ({
            ...prev,
            rangeMins: [formatPriceInput(min1), formatPriceInput(min2), formatPriceInput(min3)],
            rangeMaxs: [formatPriceInput(max1), formatPriceInput(max2), formatPriceInput(max3)],
            // Default to 3 ranges (if not already set)
            multipliers: prev.multipliers.length === 3 ? prev.multipliers : ['2.00', '2.00', '2.00']
          }));
        }
      });
    }
  }, [marketType, rangeForm.asset, publicClient]);

  // --- FETCH STATS ---
  useEffect(() => {
    if (currentTab === 'dashboard' && isOwner) {
      fetchStats();
    }
  }, [currentTab, isOwner]);

  const fetchStats = async () => {
    if (!publicClient || !contractAddress) return;
    setIsLoadingStats(true);
    try {
      const accumulatedFees = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'accumulatedFees',
      });

      const balance = await publicClient.readContract({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [contractAddress],
      });

      // Get bet logs to calculate total volume/users
      // Note: We use a generic signature that matches what your contract emits most recently
      // If you have multiple event versions, this grabs the latest style
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event: parseAbiItem('event BetPlaced(uint256 indexed marketId, address indexed user, uint8 choice, uint256 amount)'),
        fromBlock: 'earliest'
      });

      const uniqueUsers = new Set();
      let volume = 0n;

      logs.forEach(log => {
        uniqueUsers.add(log.args.user);
        volume += log.args.amount;
      });

      setStats({
        totalUsers: uniqueUsers.size,
        totalVolume: Number(formatUnits(volume, 6)),
        totalBets: logs.length,
        pendingFees: accumulatedFees,
        contractBalance: balance
      });

    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      await writeContractAsync({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'withdrawFees',
        args: [],
      });
    } catch (error) {
      alert("Withdraw failed: " + (error.shortMessage || error.message));
    }
  };

  // --- FETCH MARKETS ---
  useEffect(() => {
    if (currentTab === 'manage' && isOwner) {
      fetchMarkets();
    }
  }, [currentTab, isOwner]);

  const fetchMarkets = async () => {
    if (!publicClient) return;
    setIsLoadingMarkets(true);
    try {
      const counter = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'marketCounter',
      });
      const count = Number(counter);
      const marketPromises = [];
      for (let i = count - 1; i >= 0; i--) {
        marketPromises.push(fetchMarketDetails(i));
      }
      const fetched = await Promise.all(marketPromises);
      setMarkets(fetched);
    } catch (error) {
      console.error("Error fetching markets:", error);
    } finally {
      setIsLoadingMarkets(false);
    }
  };

  const fetchMarketDetails = async (id) => {
    try {
      const data = await publicClient.readContract({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'getMarket',
        args: [BigInt(id)],
      });

      const market = {
        id,
        marketType: Number(data.marketType),
        asset: data.asset,
        endTime: Number(data.endTime) * 1000,
        resolved: data.resolved,
        totalBets: Number(data.totalBets),
        options: []
      };

      if (market.marketType === 1) {
        const options = await publicClient.readContract({
          address: contractAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'getMultiChoiceOptions',
          args: [BigInt(id)],
        });
        market.options = options;
      }
      return market;
    } catch (e) { return null; }
  };

  // --- RESOLVE ---
  const handleResolve = async (market) => {
    try {
      setResolvingId(market.id);
      if (market.marketType === 1) {
        const winningIndex = multiChoiceAnswers[market.id];
        if (winningIndex === undefined || winningIndex === "") {
          alert("Please select a winning option first!");
          setResolvingId(null);
          return;
        }
        await writeContractAsync({
          address: contractAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'resolveMultiChoiceMarket',
          args: [BigInt(market.id), Number(winningIndex)],
        });
      } else {
        let functionName = 'resolveMarket';
        if (market.marketType === 2) functionName = 'resolveRangeMarket';
        if (market.marketType === 3) functionName = 'resolveTimeMarket';

        await writeContractAsync({
          address: contractAddress,
          abi: PREDICTION_MARKET_ABI,
          functionName: functionName,
          args: [BigInt(market.id)],
        });
      }
    } catch (error) {
      alert("Resolution failed: " + error.message);
    } finally {
      setResolvingId(null);
    }
  };

  // --- CREATE ---
  const createBinaryMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      await writeContractAsync({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'createMarketWithOdds',
        args: [
          binaryForm.asset,
          BigInt(binaryForm.duration * 60),
          binaryForm.useFixedOdds ? BigInt(binaryForm.yesMultiplier) : BigInt(0),
          binaryForm.useFixedOdds ? BigInt(binaryForm.noMultiplier) : BigInt(0),
        ],
      });
    } catch (error) {
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + (error.message || String(error)) });
    }
  };

  const createMultiChoiceMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      const validOptions = multiChoiceForm.options.filter((o) => o.trim() !== '');
      if (validOptions.length < 2) { alert('Please provide at least 2 options'); return; }
      if (!multiChoiceForm.question.trim()) { alert('Please provide a question'); return; }

      await writeContractAsync({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'createMultiChoiceMarketWithOdds',
        args: [
          multiChoiceForm.asset,
          validOptions,
          multiChoiceForm.question,
          BigInt(multiChoiceForm.duration * 60),
          multiChoiceForm.useFixedOdds ? multiChoiceForm.multipliers.slice(0, validOptions.length).map((m) => BigInt(m)) : [],
        ],
      });
    } catch (error) {
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + (error.message || String(error)) });
    }
  };

  const createRangeMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      const rangeMins = rangeForm.ranges.map((r) => BigInt(Math.floor(r.min * 1e8)));
      const rangeMaxs = rangeForm.ranges.map((r) => BigInt(Math.floor(r.max * 1e8)));
      await writeContractAsync({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'createRangeMarketWithOdds',
        args: [
          rangeForm.asset,
          rangeMins,
          rangeMaxs,
          BigInt(rangeForm.duration * 60),
          rangeForm.useFixedOdds ? rangeForm.multipliers.map((m) => BigInt(m)) : [],
        ],
      });
    } catch (error) {
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + (error.message || String(error)) });
    }
  };

  const createTimeMarket = async () => {
    try {
      setCreateStatus({ show: false, success: false, message: '' });
      const targetPriceBigInt = BigInt(Math.floor(timeForm.targetPrice * 1e8));
      const timeframeSeconds = timeForm.timeframes.map((tf) => BigInt(tf.seconds));
      await writeContractAsync({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'createTimeMarketWithOdds',
        args: [
          timeForm.asset,
          targetPriceBigInt,
          timeframeSeconds,
          timeForm.useFixedOdds ? timeForm.multipliers.map((m) => BigInt(m)) : [],
        ],
      });
    } catch (error) {
      setCreateStatus({ show: true, success: false, message: 'Failed: ' + (error.message || String(error)) });
    }
  };

  const handleCreate = () => {
    if (marketType === 'binary') createBinaryMarket();
    else if (marketType === 'multi') createMultiChoiceMarket();
    else if (marketType === 'range') createRangeMarket();
    else if (marketType === 'time') createTimeMarket();
  };

  useEffect(() => {
    if (txSuccess) {
      setCreateStatus({ show: true, success: true, message: '✅ Action successful on-chain!' });
      if (currentTab === 'dashboard') fetchStats();
      if (currentTab === 'manage') fetchMarkets();
      setTimeout(() => setCreateStatus({ show: false, success: false, message: '' }), 4000);
    }
  }, [txSuccess]);

  if (!isOwner) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800 rounded-3xl p-8 max-w-4xl w-full border-2 border-primary/50 shadow-[0_0_40px_rgba(205,255,0,0.2)] my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="text-primary" size={32} />
            <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={32} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/20 pb-2 overflow-x-auto">
          <button onClick={() => setCurrentTab('dashboard')} className={`px-4 py-2 font-semibold rounded-t-lg transition-all flex items-center gap-2 ${currentTab === 'dashboard' ? 'bg-primary/20 text-primary border-b-2 border-primary' : 'text-neutral-400 hover:text-white'}`}>
            <Activity size={18} /> Dashboard
          </button>
          <button onClick={() => setCurrentTab('create')} className={`px-4 py-2 font-semibold rounded-t-lg transition-all flex items-center gap-2 ${currentTab === 'create' ? 'bg-purple-500/30 text-white border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>
            <Plus size={18} /> Create
          </button>
          <button onClick={() => setCurrentTab('manage')} className={`px-4 py-2 font-semibold rounded-t-lg transition-all flex items-center gap-2 ${currentTab === 'manage' ? 'bg-purple-500/30 text-white border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>
            <List size={18} /> Manage
          </button>
        </div>

        {/* --- DASHBOARD TAB --- */}
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Users */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-semibold">Total Unique Users</h3>
                  <Users className="text-primary" size={20} />
                </div>
                {isLoadingStats ? <Loader2 className="animate-spin" /> : 
                  <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
                }
              </div>

              {/* Total Volume */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-semibold">Total Volume (USDC)</h3>
                  <BarChart3 className="text-success" size={20} />
                </div>
                {isLoadingStats ? <Loader2 className="animate-spin" /> : 
                  <div className="text-3xl font-bold text-success">${stats.totalVolume.toLocaleString()}</div>
                }
                <div className="text-xs text-gray-500 mt-1">{stats.totalBets} total bets placed</div>
              </div>

              {/* Fees & Revenue */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-semibold">Pending Revenue</h3>
                  <DollarSign className="text-secondary" size={20} />
                </div>
                {isLoadingStats ? <Loader2 className="animate-spin" /> : 
                  <div className="text-3xl font-bold text-secondary">${Number(formatUnits(stats.pendingFees || 0n, 6)).toFixed(2)}</div>
                }
                <div className="text-xs text-gray-500 mt-1">Available to withdraw</div>
              </div>
            </div>

            {/* Wallet & Contract Info */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Wallet size={20} className="text-primary"/> Contract Management
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Contract Address</p>
                  <p className="font-mono text-sm bg-black/30 p-2 rounded">{contractAddress}</p>
                  
                  <div className="mt-4">
                    <p className="text-gray-400 text-sm mb-1">Total Value Locked (TVL)</p>
                    <p className="text-2xl font-bold">${Number(formatUnits(stats.contractBalance || 0n, 6)).toFixed(2)} USDC</p>
                  </div>
                </div>

                <div className="flex flex-col justify-center items-start border-l border-white/10 pl-6">
                  <p className="text-gray-300 mb-4">
                    Withdraw accumulated fees to your wallet.
                    <br/><span className="text-xs text-gray-500">Note: 48h delay may apply if timelock is active.</span>
                  </p>
                  
                  <button 
                    onClick={handleWithdraw}
                    disabled={isPending || isConfirming || stats.pendingFees === 0n}
                    className="bg-success hover:bg-success-dark disabled:bg-neutral-600 text-dark-950 font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all hover:glow-success"
                  >
                    {isPending || isConfirming ? <Loader2 className="animate-spin" size={20}/> : <DollarSign size={20}/>}
                    Withdraw Revenue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- CREATE TAB --- */}
        {currentTab === 'create' && (
          <div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { type: 'binary', icon: TrendingUp, label: 'Binary' },
                { type: 'multi', icon: BarChart3, label: 'Multi-Choice' },
                { type: 'range', icon: Target, label: 'Range' },
                { type: 'time', icon: Timer, label: 'Time-Based' },
              ].map(({ type, icon: Icon, label }) => (
                <button key={type} onClick={() => setMarketType(type)} className={`p-4 rounded-xl border-2 transition-all ${marketType === type ? 'bg-primary/20 border-primary glow-primary' : 'bg-white/5 border-white/10 hover:border-primary/50'}`}>
                  <Icon className="mx-auto mb-2" size={24} />
                  <div className="text-sm font-semibold">{label}</div>
                </button>
              ))}
            </div>

            {/* Binary Form */}
            {marketType === 'binary' && (
              <div className="bg-white/5 rounded-xl p-6 mb-4">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><TrendingUp size={20} />Create Binary Market</h3>
                <div className="space-y-4">
                  {/* Price Display */}
                  <div className="bg-black/20 p-3 rounded-lg text-center mb-4 border border-white/10">
                    {isPriceLoading ? (
                      <span className="text-gray-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={14}/> Fetching price...</span>
                    ) : currentAssetPrice ? (
                      <span className="text-secondary font-mono font-bold">Current Price: ${currentAssetPrice.toLocaleString()}</span>
                    ) : (
                      <span className="text-red-400 text-sm">Could not fetch live price (Check Asset)</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Asset</label>
                      <select value={binaryForm.asset} onChange={(e) => setBinaryForm({ ...binaryForm, asset: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary">
                        <option value="BTC">Bitcoin (BTC)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="SOL">Solana (SOL)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (mins)</label>
                      <input type="number" value={binaryForm.duration} onChange={(e) => setBinaryForm({ ...binaryForm, duration: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  
                  {/* Odds Toggle & Inputs  */}
                  <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/30 rounded-lg">
                    <input type="checkbox" id="binaryFixedOdds" checked={binaryForm.useFixedOdds} onChange={(e) => setBinaryForm({ ...binaryForm, useFixedOdds: e.target.checked })} className="w-5 h-5 rounded border-gray-500 text-purple-600 focus:ring-purple-500" />
                    <label htmlFor="binaryFixedOdds" className="text-sm font-semibold cursor-pointer select-none">Use Fixed Odds (Casino Mode)</label>
                  </div>
                  
                  {binaryForm.useFixedOdds && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="block text-sm font-semibold text-green-400 mb-2">UP Multiplier (200 = 2.0x)</label>
                        <input type="number" value={binaryForm.yesMultiplier} onChange={(e) => setBinaryForm({ ...binaryForm, yesMultiplier: e.target.value })} className="w-full bg-slate-800 border border-green-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500" />
                        <div className="text-xs text-gray-400 mt-1">Payout: {(binaryForm.yesMultiplier / 100).toFixed(2)}x</div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-red-400 mb-2">DOWN Multiplier (200 = 2.0x)</label>
                        <input type="number" value={binaryForm.noMultiplier} onChange={(e) => setBinaryForm({ ...binaryForm, noMultiplier: e.target.value })} className="w-full bg-slate-800 border border-red-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500" />
                        <div className="text-xs text-gray-400 mt-1">Payout: {(binaryForm.noMultiplier / 100).toFixed(2)}x</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Multi-Choice Form */}
            {marketType === 'multi' && (
              <div className="bg-white/5 rounded-xl p-6 mb-4">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><BarChart3 size={20} />Multi-Choice</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Question</label>
                    <input type="text" value={multiChoiceForm.question} onChange={(e) => setMultiChoiceForm({ ...multiChoiceForm, question: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary" placeholder="Which coin will pump?" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (mins)</label>
                    <input type="number" value={multiChoiceForm.duration} onChange={(e) => setMultiChoiceForm({ ...multiChoiceForm, duration: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Options</label>
                    {multiChoiceForm.options.map((option, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input type="text" value={option} onChange={(e) => { const n = [...multiChoiceForm.options]; n[idx] = e.target.value; setMultiChoiceForm({ ...multiChoiceForm, options: n }); }} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder={`Option ${idx + 1}`} />
                        {idx >= 2 && <button onClick={() => { const n = multiChoiceForm.options.filter((_, i) => i !== idx); setMultiChoiceForm({ ...multiChoiceForm, options: n }); }} className="px-4 py-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors">✕</button>}
                      </div>
                    ))}
                    {multiChoiceForm.options.length < 10 && <button onClick={() => setMultiChoiceForm({ ...multiChoiceForm, options: [...multiChoiceForm.options, ''], multipliers: [...multiChoiceForm.multipliers, 200] })} className="w-full py-2 bg-primary/20 rounded-lg text-sm font-semibold hover:bg-primary/30 transition-colors border border-primary/30 hover:border-primary">+ Add Option</button>}
                  </div>
                </div>
              </div>
            )}

            {/* Range Form  */}
            {/* NEW: Price Context and Loading State */}
            <div className="mb-4 text-center">
              {isPriceLoading ? (
                <span className="text-purple-400 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={16} /> Fetching price...
                </span>
              ) : currentAssetPrice ? (
                <span className="text-lg font-bold text-yellow-400">
                  Current {rangeForm.asset} Price: ${currentAssetPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-red-400">Could not fetch live price.</span>
              )}
            </div>

            {marketType === 'range' && (
              <div className="bg-white/5 rounded-xl p-6 mb-4">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Target size={20} />Range Market</h3>
                <div className="space-y-4">
                  {/* Price Display */}
                  <div className="bg-black/20 p-3 rounded-lg text-center mb-4 border border-white/10">
                    {isPriceLoading ? (
                      <span className="text-gray-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={14}/> Fetching price...</span>
                    ) : currentAssetPrice ? (
                      <span className="text-secondary font-mono font-bold">Current Price: ${currentAssetPrice.toLocaleString()}</span>
                    ) : (
                      <span className="text-red-400 text-sm">Could not fetch live price (Check Asset)</span>
                    )}
                 </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Asset</label>
                      <select value={rangeForm.asset} onChange={(e) => setRangeForm({ ...rangeForm, asset: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary">
                        <option value="BTC">Bitcoin (BTC)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="SOL">Solana (SOL)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (mins)</label>
                      <input type="number" value={rangeForm.duration} onChange={(e) => setRangeForm({ ...rangeForm, duration: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Price Ranges</label>
                    {rangeForm.ranges.map((range, idx) => (
                      <div key={idx} className="flex gap-2 mb-2 items-center">
                        <input type="number" value={range.min} onChange={(e) => { const n = [...rangeForm.ranges]; n[idx].min = parseFloat(e.target.value); setRangeForm({ ...rangeForm, ranges: n }); }} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="Min" />
                        <span className="text-gray-400 font-bold">-</span>
                        <input type="number" value={range.max} onChange={(e) => { const n = [...rangeForm.ranges]; n[idx].max = parseFloat(e.target.value); setRangeForm({ ...rangeForm, ranges: n }); }} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="Max" />
                        {idx >= 2 && <button onClick={() => { const n = rangeForm.ranges.filter((_, i) => i !== idx); setRangeForm({ ...rangeForm, ranges: n }); }} className="px-3 py-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors">✕</button>}
                      </div>
                    ))}
                    {rangeForm.ranges.length < 10 && <button onClick={() => setRangeForm({ ...rangeForm, ranges: [...rangeForm.ranges, { min: 0, max: 0 }] })} className="w-full py-2 bg-primary/20 rounded-lg text-sm font-semibold hover:bg-primary/30 transition-colors border border-primary/30 hover:border-primary">+ Add Range</button>}
                  </div>
                </div>
              </div>
            )}

            {/* Time-Based Form */}
            {marketType === 'time' && (
              <div className="bg-white/5 rounded-xl p-6 mb-4">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Timer size={20} />Time-Based Market</h3>
                <div className="space-y-4">
                  {/* Price Display */}
                  <div className="bg-black/20 p-3 rounded-lg text-center mb-4 border border-white/10">
                    {isPriceLoading ? (
                      <span className="text-gray-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={14}/> Fetching price...</span>
                    ) : currentAssetPrice ? (
                      <span className="text-secondary font-mono font-bold">Current Price: ${currentAssetPrice.toLocaleString()}</span>
                    ) : (
                      <span className="text-red-400 text-sm">Could not fetch live price (Check Asset)</span>
                    )}
                 </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Asset</label>
                      <select value={timeForm.asset} onChange={(e) => setTimeForm({ ...timeForm, asset: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white ">
                        <option value="BTC">Bitcoin (BTC)</option>focus:outline-none focus:border-primary
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="SOL">Solana (SOL)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">Target Price ($)</label>
                      <input type="number" value={timeForm.targetPrice} onChange={(e) => setTimeForm({ ...timeForm, targetPrice: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary" placeholder="e.g. 100000" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Timeframes</label>
                    {timeForm.timeframes.map((tf, idx) => (
                      <div key={idx} className="flex gap-2 mb-2">
                        <input type="text" value={tf.label} onChange={(e) => { const n = [...timeForm.timeframes]; n[idx].label = e.target.value; setTimeForm({ ...timeForm, timeframes: n }); }} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="Label (e.g. 24h)" />
                        <input type="number" value={tf.seconds} onChange={(e) => { const n = [...timeForm.timeframes]; n[idx].seconds = parseInt(e.target.value); setTimeForm({ ...timeForm, timeframes: n }); }} className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary" placeholder="Seconds" />
                        {idx >= 2 && <button onClick={() => { const n = timeForm.timeframes.filter((_, i) => i !== idx); setTimeForm({ ...timeForm, timeframes: n }); }} className="px-3 py-2 bg-red-500/20 rounded-lg hover:bg-red-500/40 transition-colors">✕</button>}
                      </div>
                    ))}
                    {timeForm.timeframes.length < 5 && <button onClick={() => setTimeForm({ ...timeForm, timeframes: [...timeForm.timeframes, { label: '', seconds: 0 }] })} className="w-full py-2 bg-primary/20 rounded-lg text-sm font-semibold hover:bg-primary/30 transition-colors border border-primary/30 hover:border-primary">+ Add Timeframe</button>}
                  </div>
                </div>
              </div>
            )}

            {/* Create Status & Button */}
            {createStatus.show && (
              <div className={`p-4 rounded-xl border-2 flex items-center gap-3 mb-4 ${createStatus.success ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
                {createStatus.success ? <CheckCircle className="text-success" size={24} /> : <XCircle className="text-danger" size={24} />}
                <span className="flex-1">{createStatus.message}</span>
              </div>
            )}

            <button onClick={handleCreate} disabled={isPending || isConfirming} className="w-full bg-gradient-to-r from-primary to-success hover:from-primary-400 hover:to-success-dark disabled:from-neutral-600 disabled:to-neutral-600 text-dark-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg shadow-lg glow-primary transition-all hover:scale-105">
              {isPending ? (<><Loader2 className="animate-spin" size={24} />Confirm in Wallet...</>) : isConfirming ? (<><Loader2 className="animate-spin" size={24} />Creating Market...</>) : (<><Plus size={24} />Create Market</>)}
            </button>
          </div>
        )}

        {/* --- MANAGE TAB CONTENT --- */}
        {currentTab === 'manage' && (
          <div className="space-y-4">
            {isLoadingMarkets ? (
              <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-purple-400" size={32} /></div>
            ) : markets.length === 0 ? (
              <div className="text-center text-gray-400 py-8 bg-white/5 rounded-xl border border-white/10">No markets found.</div>
            ) : (
              markets.map(market => {
                if(!market) return null;
                const isExpired = Date.now() > market.endTime;
                const statusColor = market.resolved ? 'bg-neutral-600' : isExpired ? 'bg-secondary text-dark-950' : 'bg-success text-dark-950';
                const statusText = market.resolved ? 'Resolved' : isExpired ? 'Pending Resolution' : 'Active';

                return ( 
                  <div key={market.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-primary/50 hover:glow-primary transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg text-white">#{market.id} {market.asset}</span>
                          <span className={`text-xs px-2 py-1 rounded font-bold ${statusColor}`}>{statusText}</span>
                        </div>
                        <div className="text-gray-400 text-sm">
                          Type: {market.marketType} | Bets: {market.totalBets}
                        </div>
                      </div>
                      
                      {!market.resolved && isExpired && (
                        <div className="flex flex-col items-end gap-2">
                          {market.marketType === 1 && (
                            <select 
                              className="bg-slate-800 text-white text-sm p-2 rounded border border-dark-600 focus:border-primary outline-none"
                              onChange={(e) => setMultiChoiceAnswers({...multiChoiceAnswers, [market.id]: e.target.value})}
                              value={multiChoiceAnswers[market.id] || ""}
                            >
                              <option value="">Select Winner...</option>
                              {market.options?.map((opt, idx) => (
                                <option key={idx} value={idx}>{opt} (Index {idx})</option>
                              ))}
                            </select>
                          )}
                          <button
                            onClick={() => handleResolve(market)}
                            disabled={resolvingId === market.id || isPending || isConfirming}
                            className="bg-gradient-to-r from-secondary to-danger hover:from-secondary-500 hover:to-danger-dark text-dark-950 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50 shadow-lg glow-secondary hover:scale-105 transition-all"
                          >
                            {resolvingId === market.id ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>}
                            Resolve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;