import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits, formatUnits, parseAbiItem } from 'viem';
import { TrendingUp, TrendingDown, Clock, Loader2, DollarSign, Users, Wallet, Trophy, Target, Timer, BarChart3, Settings, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { CONTRACTS } from './config/wagmi';
import AdminPanel from './components/AdminPanel';
import { PREDICTION_MARKET_ABI, ERC20_ABI } from './contracts/abis'; 
import { sdk } from '@farcaster/miniapp-sdk';

// ==================== UTILITY FUNCTIONS ====================

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

// FIX: Updated formatting to remove massive days for Time-Based markets
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

// FIX: Helper to format seconds into readable duration (e.g. "24 Hours")
const formatDuration = (seconds) => {
  if (seconds >= 86400) return `${(seconds / 86400).toFixed(0)} Days`;
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(0)} Hours`;
  return `${(seconds / 60).toFixed(0)} Mins`;
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

// ==================== MAIN COMPONENT ====================

const App = () => {
  const lastBetRef = useRef(null);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [markets, setMarkets] = useState([]);
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(true);
  const [currentView, setCurrentView] = useState('markets');
  const [farcasterUser, setFarcasterUser] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState(0n);
  const [userBets, setUserBets] = useState([]); 
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [betAmount, setBetAmount] = useState('10');

  const [userStats, setUserStats] = useState({
    totalBets: 0,
    wins: 0,
    losses: 0,
    streak: 0,
  });

  // ==================== WAGMI & DATA FETCHING ====================

  const checkIsOwner = useCallback(async () => {
    if (!address || !publicClient) {
      setIsOwner(false);
      return;
    }
    try {
      const ownerAddress = await publicClient.readContract({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'owner',
      });
      setIsOwner(ownerAddress.toLowerCase() === address.toLowerCase());
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

        // 💥 ENHANCED FIX: Verify claimability via simulation AND logic
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
    let lastOutcome = null;

    for (const bet of sortedBets) {
      const market = bet.market;
      
      if (market.resolved) {
        // 💥 Logic Update: If it was claimable (verified by simulation) OR claimed, it's a WIN.
        // Otherwise, it is a LOSS.
        const isWinner = bet.isClaimableConfirmed || bet.claimed;

        if (isWinner) {
          wins++;
           
          
          if (lastOutcome === 'win' || lastOutcome === null) currentStreak++;
          else currentStreak = 1; 
          lastOutcome = 'win';
        } else { 
          losses++;
          if (lastOutcome === 'loss' || lastOutcome === null) currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
          else currentStreak = -1; 
          lastOutcome = 'loss';
        }
      }
    }

    setUserStats({
      totalBets: userBets.length,
      wins: wins,
      losses: losses,
      streak: Math.abs(currentStreak),
    });
    
  }, [address, userBets]);

  const refreshData = useCallback(async () => {
    await fetchMarkets(); 
    if (isConnected) {
      await fetchUSDCBalance();
      await fetchUserBets(); 
      await checkIsOwner();
    }
  }, [fetchMarkets, isConnected, fetchUSDCBalance, fetchUserBets, checkIsOwner]);

  // ==================== HANDLERS (Approve, Bet, Resolve, Claim) ====================

  const handleApprove = async (amount) => {
    try {
      const parsedAmount = parseUnits(amount.toString(), 6);
      const txHash = await writeContractAsync({
        address: CONTRACTS.USDC, 
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.PREDICTION_MARKET, parsedAmount],
      });
      return txHash;
    } catch (error) {
      alert(`Approval failed: ${error.shortMessage || error.message}`);
      return null;
    }
  };

  const placeBetOnChain = async (market, choiceIndex) => {
    if (!address) { alert('Please connect your wallet.'); return; }
    const betAmountBigInt = parseUnits(betAmount, 6);
    
    try {
      const allowance = await publicClient.readContract({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, CONTRACTS.PREDICTION_MARKET],
      });

      if (allowance < betAmountBigInt) {
        const approveHash = await handleApprove(betAmount);
        if (!approveHash) return; 
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      const txHash = await writeContractAsync({
        address: CONTRACTS.PREDICTION_MARKET,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'placeBet',
        args: [market.id, choiceIndex, betAmountBigInt], 
      });
      
      lastBetRef.current = txHash;
      
    } catch (error) {
      alert(`Bet failed: ${error.shortMessage || error.message}`);
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

  // ==================== EFFECTS ====================

  useEffect(() => { refreshData(); }, [isConnected, refreshData]);
  useEffect(() => { if (userBets.length > 0 || !isConnected) fetchUserStats(); }, [userBets, isConnected, fetchUserStats]);
  
  useEffect(() => {
    if (isSuccess && lastBetRef.current === hash) {
      alert('Bet placed successfully!');
      setSelectedMarket(null); 
      refreshData();
      lastBetRef.current = null;
    } else if (isSuccess) {
      refreshData();
    }
  }, [isSuccess, hash, refreshData]);

  useEffect(() => {
    if (sdk.isFarcaster) {
      sdk.getUserContext().then(setFarcasterUser).catch(e => console.error(e));
    }
  }, []);

  // ==================== RENDER HELPERS ====================

  const renderMarketDetails = (market) => {
    // Helper to calculate dynamic odds safely
    const getOddsDisplay = (choiceIndex) => {
      // 1. If Fixed Odds, use the multiplier set by Admin
      if (market.useFixedOdds) {
        return formatUnits(market.multipliers[choiceIndex] || 200n, 2);
      }

      // 2. If Pool Odds, but pool is empty/tiny, show default 2.00x (Prevents 4000000X glitch)
      if (Number(market.totalPool) < 0.1) {
        return "2.00";
      }

      // 3. Calculate Dynamic Binary Odds (UP/DOWN)
      if (market.marketType === 0) {
        const sidePool = choiceIndex === 0 ? Number(market.yesPool) : Number(market.noPool);
        if (sidePool < 0.000001) return "2.00"; // Prevent divide by zero
        return (Number(market.totalPool) / sidePool).toFixed(2);
      }

      // 4. For Multi/Range/Time (Complex Pools), show estimated or default
      return "Dynamic"; 
    };

    let choices = [];
    
    if (market.marketType === 0) { // Binary
      choices = [
        { label: 'UP', choiceIndex: 0, multiplier: getOddsDisplay(0) },
        { label: 'DOWN', choiceIndex: 1, multiplier: getOddsDisplay(1) },
      ];
    } else if (market.marketType === 1) { // Multi-Choice
      choices = market.options.map((label, index) => ({
        label,
        choiceIndex: index,
        multiplier: getOddsDisplay(index)
      }));
    } else if (market.marketType === 2) { // Range
      choices = market.rangeMins.map((min, index) => ({
        label: `[${formatUnits(min, 8)} - ${formatUnits(market.rangeMaxs[index], 8)}]`,
        choiceIndex: index,
        multiplier: getOddsDisplay(index)
      }));
    } else if (market.marketType === 3) { // Time-Based
      choices = market.timeframes.map((timeframe, index) => ({
        label: `Hit by ${formatDuration(Number(timeframe))}`,
        choiceIndex: index,
        multiplier: getOddsDisplay(index)
      }));
    }

    const marketStatus = getMarketTimeRemaining(market);
    const isLive = !market.resolved && Number(market.endTime) > Date.now()/1000;

    return (
      <div key={Number(market.id)} className={`bg-gray-800 p-6 rounded-2xl shadow-xl transition-transform transform hover:scale-[1.01] flex flex-col gap-4 ${market.resolved ? 'opacity-50' : ''}`}>
        <div className="flex justify-between items-start">
          <h3 className="text-xl font-extrabold text-white">{getMarketLabel(market.marketType, market.asset)}</h3>
          <span className={`px-3 py-1 text-xs font-bold rounded-full ${isLive ? 'bg-green-500 text-white' : market.resolved ? 'bg-gray-500 text-white' : 'bg-red-500 text-white'}`}>
            {market.resolved ? `Resolved` : marketStatus}
          </span>
        </div>
        <div className="flex justify-between items-end text-sm text-gray-400 border-b border-gray-700 pb-2">
            <div className="flex flex-col">
                <span>Start: {formatPrice(market.startPrice)}</span>
                {/* Display Target Price for Time-Based Markets */}
                {market.marketType === 3 && (
                    <span className="text-yellow-400 font-bold mt-1">
                        Target: {formatPrice(market.targetPrice)}
                    </span>
                )}
            </div>
            
            <div className="flex flex-col items-end">
                <span>Pool: {formatUnits(market.totalPool, 6)} USDC</span>
                {/* FIX: Show exact End Date/Time for clarity */}
                <span className="text-xs text-cyan-300 mt-1">
                    Ends: {new Date(Number(market.endTime)).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                </span>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {choices.map((choice) => (
            <button
              key={choice.choiceIndex}
              onClick={() => setSelectedMarket({...market, betChoice: choice.choiceIndex, choiceLabel: choice.label})}
              disabled={!isLive}
              className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 ${isLive ? 'bg-purple-600/20 hover:bg-purple-600/40' : 'bg-gray-700/50 cursor-not-allowed'} text-white font-bold text-center border-2 border-transparent hover:border-purple-400`}
            >
              <span className="text-lg">{choice.label}</span>
              <span className="text-sm text-yellow-300 mt-1">{choice.multiplier}X Multiplier</span>
            </button>
          ))}
        </div>
        {isOwner && isLive && market.marketType === 0 && (
          <div className="mt-3 flex gap-2">
            <button onClick={() => handleResolve(market.id, 1)} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm">Resolve DOWN (Admin)</button>
            <button onClick={() => handleResolve(market.id, 0)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl text-sm">Resolve UP (Admin)</button>
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
      <div key={bet.txHash} className={`bg-gray-800 p-4 rounded-xl shadow-md flex justify-between items-center transition-all duration-300 ${claimed ? 'opacity-70' : ''}`}>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white">{bet.marketLabel}</span>
          <span className="text-sm text-gray-400">Bet on: <span className="font-semibold text-purple-300">{bet.choiceLabel}</span></span>
          <span className="text-sm text-gray-400">Amount: <span className="font-semibold text-green-400">{formatUnits(bet.amount, 6)} USDC</span></span>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!market.resolved ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500 text-white">{getMarketTimeRemaining(market)}</span>
          ) : canClaim ? ( 
            // FIX: Only show claim button if simulation passed
            <button onClick={() => handleClaim(market.id)} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 px-4 rounded-lg flex items-center gap-1 text-sm">
              <Trophy size={16} /> Claim Winnings
            </button>
          ) : claimed ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-500 text-white flex items-center gap-1"><CheckCircle size={14} /> Claimed</span>
          ) : (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-white flex items-center gap-1"><XCircle size={14} /> Lost</span>
          )}
        </div>
      </div>
    );
  };
  
  const renderConnectWallet = () => (
    <div className="flex flex-col items-center justify-center p-10 bg-gray-800 rounded-xl shadow-2xl text-white">
      <Wallet size={48} className="text-purple-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
      <p className="text-gray-400 mb-6 text-center">Join the action and place your first prediction on the Base Sepolia network.</p>
      <ConnectButton />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">TrenchyBet</h1>
        <div className="flex items-center gap-4">
          {isOwner && <button onClick={() => setShowAdminPanel(true)} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"><Settings size={20} className="text-yellow-400" /></button>}
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {isConnected && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex items-center gap-3"><Wallet size={24} className="text-purple-400" /><div className="flex flex-col"><span className="text-sm text-gray-400">Balance</span><span className="text-lg font-bold">{formatUnits(usdcBalance, 6)} USDC</span></div></div>
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex items-center gap-3"><DollarSign size={24} className="text-green-400" /><div className="flex flex-col"><span className="text-sm text-gray-400">Total Bets</span><span className="text-lg font-bold">{userStats.totalBets}</span></div></div>
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex items-center gap-3"><Trophy size={24} className="text-yellow-400" /><div className="flex flex-col"><span className="text-sm text-gray-400">Wins</span><span className="text-lg font-bold">{userStats.wins}</span></div></div>
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex items-center gap-3"><XCircle size={24} className="text-red-400" /><div className="flex flex-col"><span className="text-sm text-gray-400">Losses</span><span className="text-lg font-bold">{userStats.losses}</span></div></div>
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex items-center gap-3"><Clock size={24} className="text-blue-400" /><div className="flex flex-col"><span className="text-sm text-gray-400">Streak</span><span className="text-lg font-bold">{userStats.streak}</span></div></div>
            <div className="bg-gray-800 p-4 rounded-xl shadow-lg flex items-center gap-3"><TrendingUp size={24} className="text-pink-400" /><div className="flex flex-col"><span className="text-sm text-gray-400">Win Rate</span><span className="text-lg font-bold">{userStats.totalBets > 0 ? ((userStats.wins / userStats.totalBets) * 100).toFixed(1) : 0}%</span></div></div>
          </div>
        )}
        
        {isConnected && (
          <div className="flex border-b border-gray-700 mb-8">
            {['markets', 'myBets', 'leaderboard'].map(view => (
                <button key={view} onClick={() => setCurrentView(view)} className={`py-3 px-6 text-lg font-semibold transition-colors ${currentView === view ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}>
                    {view === 'markets' ? 'All Markets' : view === 'myBets' ? `My Bets (${userBets.length})` : 'Leaderboard'}
                </button>
            ))}
          </div>
        )}

        {!isConnected ? renderConnectWallet() : (
          <>
            {currentView === 'markets' && (
              <>
                {isLoadingMarkets && markets.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-purple-400"><Loader2 className="animate-spin" size={48} /><p className="mt-4 text-xl">Loading Prediction Markets...</p></div>
                )}
                {/* FIX: Filter for Active Markets Only */}
                {(() => {
                    const activeMarkets = markets.filter(m => !m.resolved && Number(m.endTime) > Date.now()/1000);
                    if (!isLoadingMarkets && activeMarkets.length === 0) {
                        return <div className="flex flex-col items-center justify-center h-64 text-gray-400"><AlertTriangle size={48} /><p className="mt-4 text-xl">No active markets. Check back later or use the Admin panel to create one!</p></div>;
                    }
                    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">{activeMarkets.map(renderMarketDetails)}</div>;
                })()}
              </>
            )}

            {currentView === 'myBets' && (
              <div className="animate-in fade-in duration-500">
                <h2 className="text-3xl font-bold mb-6 text-purple-300">My Betting History</h2>
                <div className="flex flex-col gap-4">
                  {userBets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 bg-gray-800 rounded-xl text-gray-400"><BarChart3 size={32} /><p className="mt-3 text-lg">You haven't placed any bets yet.</p></div>
                  ) : (
                    userBets.map(renderUserBet)
                  )}
                </div>
              </div>
            )}

            {currentView === 'leaderboard' && (
              <div className="animate-in fade-in duration-500">
                <h2 className="text-3xl font-bold mb-6 text-purple-300">Top Predictors</h2>
                <div className="bg-gray-800 p-6 rounded-xl">
                  <p className="text-gray-400">Leaderboard functionality coming soon!</p>
                  <ul className="mt-4 space-y-3">
                    {['0x123...456 (50 Wins)', '0xABC...DEF (45 Wins)', '0x789...GHI (40 Wins)'].map((entry, index) => (
                      <li key={index} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg"><span className="text-lg font-bold">{index + 1}.</span><span className="flex-1 ml-4">{entry}</span><Trophy size={20} className="text-yellow-500" /></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      
      {selectedMarket && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4" onClick={() => setSelectedMarket(null)}>
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg animate-in fade-in duration-300 zoom-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-2 text-white">Place Bet on {selectedMarket.asset}</h2>
            <p className="text-lg font-semibold mb-4 text-purple-400">Choice: {selectedMarket.choiceLabel}</p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-2">Bet Amount (USDC)</label>
              <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} min="1" step="1" placeholder="Enter amount" className="w-full p-3 bg-gray-700 text-white rounded-lg border-2 border-gray-600 focus:border-purple-500 outline-none" />
              <div className="grid grid-cols-4 gap-2 mt-3">{[10, 25, 50, 100].map((amount) => (<button key={amount} onClick={() => setBetAmount(amount.toString())} className="bg-white/10 hover:bg-purple-500/30 border border-white/20 hover:border-purple-400 rounded-lg py-3 text-sm font-bold">${amount}</button>))}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSelectedMarket(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl">Cancel</button>
              <button onClick={() => placeBetOnChain(selectedMarket, selectedMarket.betChoice)} disabled={isPending || isConfirming || !betAmount || Number(betAmount) <= 0} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">{isPending || isConfirming ? <><Loader2 className="animate-spin" size={20} />{isPending ? 'Confirming...' : 'Processing...'}</> : 'Confirm Bet'}</button>
            </div>
          </div>
        </div>
      )}
      {showAdminPanel && <AdminPanel onClose={() => { setShowAdminPanel(false); refreshData(); }} />}
    </div>
  );
};

export default App;