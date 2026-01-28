import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { parseUnits, formatUnits, parseAbiItem } from 'viem';
import { TrendingUp, TrendingDown, Clock, Loader2, DollarSign, Users, Wallet, Trophy, Target, Timer, BarChart3, Settings, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { CONTRACTS, config } from './config/wagmi';
import AdminPanel from './components/AdminPanel';
import { PREDICTION_MARKET_ABI, ERC20_ABI } from './contracts/abis'; 
import { sdk } from '@farcaster/miniapp-sdk';

// = UTILITY FUNCTIONS =

// Hero Section Component
const LandingHero = ({ isConnected }) => (
  <div className="text-center py-12 md:py-20 px-4">
    <h1 className="text-4xl md:text-7xl font-black mb-6">
      <span className="text-gradient-primary">Predict. Bet. Win.</span>
    </h1>
    <p className="text-lg md:text-2xl text-neutral-300 max-w-3xl mx-auto mb-12">
      The boldest way to trade predictions on crypto prices. High stakes, real-time odds, pure adrenaline.
    </p>
    
    {/* Preview Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
      <div className="bg-dark-800 border-2 border-primary/30 p-8 rounded-2xl hover:border-primary hover:glow-primary transition-all duration-300">
        <div className="text-5xl mb-4">🎯</div>
        <h3 className="font-bold text-xl mb-3 text-white">Binary Markets</h3>
        <p className="text-sm text-neutral-400">Will BTC hit $150K? Simple UP or DOWN predictions with dynamic odds.</p>
      </div>
      
      <div className="bg-dark-800 border-2 border-success/30 p-8 rounded-2xl hover:border-success hover:glow-success transition-all duration-300">
        <div className="text-5xl mb-4">⚡</div>
        <h3 className="font-bold text-xl mb-3 text-white">Live Odds</h3>
        <p className="text-sm text-neutral-400">Real-time multipliers that change as the pool grows. Early bets get better odds.</p>
      </div>
      
      <div className="bg-dark-800 border-2 border-secondary/30 p-8 rounded-2xl hover:border-secondary hover:glow-secondary transition-all duration-300">
        <div className="text-5xl mb-4">💰</div>
        <h3 className="font-bold text-xl mb-3 text-white">Instant Payouts</h3>
        <p className="text-sm text-neutral-400">Win big? Claim your winnings instantly when markets resolve. No delays.</p>
      </div>
    </div>
    
    {!isConnected && (
      <div className="flex flex-col items-center gap-4">
        <ConnectButton />
        <p className="text-sm text-neutral-500">Connect your wallet to start trading predictions</p>
      </div>
    )}
    
    {isConnected && (
      <p className="text-neutral-400 text-lg">No active markets right now. Check back soon or contact the admin to create one!</p>
    )}
  </div>
);
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

const [isPlacingBet, setIsPlacingBet] = useState(false);

//  Updated formatting to remove massive days for Time-Based markets
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

//  Helper to format seconds into readable duration (e.g. "24 Hours")
const formatDuration = (seconds) => {
  if (seconds >= 86400) return `${(seconds / 86400).toFixed(0)} Days`;
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(0)} Hours`;
  return `${(seconds / 60).toFixed(0)} Mins`;
};
// Asset emoji helper
const getAssetEmoji = (asset) => {
  const emojiMap = {
    'BTC': '₿',
    'ETH': 'Ξ',
    'SOL': '◎',
    'CRYPTO': '💎',
  };
  return emojiMap[asset] || '💎';
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

// Loading skeleton for markets
const MarketCardSkeleton = () => (
  <div className="bg-dark-800 border-2 border-dark-600 rounded-2xl p-6 animate-pulse">
    <div className="flex items-center gap-4 mb-6">
      <div className="w-14 h-14 rounded-full bg-dark-700"></div>
      <div className="flex-1">
        <div className="h-6 bg-dark-700 rounded w-24 mb-2"></div>
        <div className="h-4 bg-dark-700 rounded w-32"></div>
      </div>
      <div className="h-6 bg-dark-700 rounded w-16"></div>
    </div>
    <div className="h-20 bg-dark-700 rounded mb-4"></div>
    <div className="grid grid-cols-2 gap-3">
      <div className="h-24 bg-dark-700 rounded"></div>
      <div className="h-24 bg-dark-700 rounded"></div>
    </div>
  </div>
);

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

  // ==== WAGMI & DATA FETCHING ====
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

        //  Verify claimability via simulation AND logic
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
        //  Logic Update: If it was claimable (verified by simulation) OR claimed, it's a WIN.
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

  //  HANDLERS (Approve, Bet, Resolve, Claim) 

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
    if (!address) { 
      alert('Please connect your wallet to place bets!');
      return; 
    }

    // Prevent multiple simultaneous bets
    if (isPlacingBet) {
      console.log('Bet already in progress');
      return;
    }

    setIsPlacingBet(true);

    const betAmountBigInt = parseUnits(betAmount, 6);
    
    // Validation
    if (betAmountBigInt <= 0n) {
      alert('Please enter a valid bet amount');
      return;
    }

    try {
      // Check USDC balance first
      let currentBalance;
      try {
        currentBalance = await publicClient.readContract({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        });
      } catch (balanceError) {
        console.error('Error checking balance:', balanceError);
        alert('Network error: Unable to check your balance. Please try again or check your RPC connection.');
        return;
      }

      if (currentBalance < betAmountBigInt) {
        alert(`Insufficient balance. You have ${formatUnits(currentBalance, 6)} USDC but trying to bet ${betAmount} USDC.`);
        return;
      }

      // Check and request approval if needed
      let allowance;
      try {
        allowance = await publicClient.readContract({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, CONTRACTS.PREDICTION_MARKET],
        });
      } catch (allowanceError) {
        console.error('Error checking allowance:', allowanceError);
        alert('Network error: Unable to check token allowance. Please try again.');
        return;
      }

      // If allowance is insufficient, request approval
      if (allowance < betAmountBigInt) {
        try {
          const approveHash = await handleApprove(betAmount);
          if (!approveHash) {
            console.log('Approval cancelled or failed');
            return;
          }
          
          // Wait for approval to be mined
          await publicClient.waitForTransactionReceipt({ 
            hash: approveHash,
            timeout: 60000 // 60 second timeout
          });
          
          // Small delay to ensure state is updated on-chain
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (approveError) {
          console.error('Approval error:', approveError);
          alert('Token approval failed: ' + (approveError.shortMessage || approveError.message));
          return;
        }
      }

      // Place the bet
      try {
        const txHash = await writeContractAsync({
          address: CONTRACTS.PREDICTION_MARKET,
          abi: PREDICTION_MARKET_ABI,
          functionName: 'placeBet',
          args: [market.id, choiceIndex, betAmountBigInt], 
        });
        
        lastBetRef.current = txHash;
        
      } catch (betError) {
        console.error('Bet placement error:', betError);
        
        // User rejected transaction
        if (betError.message?.includes('User rejected') || betError.message?.includes('user rejected')) {
          alert('Transaction cancelled');
          return;
        }
        
        // Network/RPC error
        if (betError.message?.includes('503') || betError.message?.includes('rate limit')) {
          alert('Network error: RPC rate limit reached. Please wait a moment and try again.');
          return;
        }
        
        // Generic error
        alert('Failed to place bet: ' + (betError.shortMessage || betError.message || 'Unknown error'));
      }
      
    } catch (error) {
      console.error('Unexpected error in placeBetOnChain:', error);
      alert('An unexpected error occurred. Please refresh the page and try again.');
    } finally {
      setIsPlacingBet(false);
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

  //  EFFECTS 

  // Global error handler for unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Check if it's an RPC error
      if (event.reason?.message?.includes('503') || 
          event.reason?.message?.includes('rate limit') ||
          event.reason?.message?.includes('Too Many Requests')) {
        
        // Show user-friendly error
        alert('Network congestion detected. Please wait a moment and try again.');
        
        // Prevent the error from crashing the app
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => { refreshData(); }, [isConnected, refreshData]);
  useEffect(() => { if (userBets.length > 0 || !isConnected) fetchUserStats(); }, [userBets, isConnected, fetchUserStats]);
  
  useEffect(() => {
    if (isSuccess && lastBetRef.current === hash) {
      // Show success message
      setSelectedMarket(null);
      
      // Create a temporary success notification
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 z-[60] bg-gradient-to-r from-success to-primary border-2 border-success text-dark-950 font-bold px-6 py-4 rounded-xl shadow-2xl glow-success animate-in slide-in-from-top-4 flex items-center gap-3';
      successDiv.innerHTML = `
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>Bet placed successfully! 🎉</span>
      `;
      document.body.appendChild(successDiv);
      
      // Remove after 4 seconds
      setTimeout(() => {
        successDiv.style.animation = 'fade-out 0.3s ease-out forwards';
        setTimeout(() => successDiv.remove(), 300);
      }, 4000);
      
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

  //  RENDER HELPERS 

  const renderMarketDetails = (market) => {
    // Asset emoji mapping
    const getAssetEmoji = (asset) => {
      const emojiMap = {
        'BTC': '₿',
        'ETH': 'Ξ',
        'SOL': '◎',
      };
      return emojiMap[asset] || '💎';
    };

    const getOddsDisplay = (choiceIndex) => {
      if (market.useFixedOdds) {
        return formatUnits(market.multipliers[choiceIndex] || 200n, 2);
      }

      if (Number(market.totalPool) < 0.1) {
        return "2.00";
      }

      if (market.marketType === 0) {
        const sidePool = choiceIndex === 0 ? Number(market.yesPool) : Number(market.noPool);
        if (sidePool < 0.000001) return "2.00";
        return (Number(market.totalPool) / sidePool).toFixed(2);
      }

      return "Dynamic";
    };

    let choices = [];
    
    if (market.marketType === 0) {
      choices = [
        { label: 'UP', choiceIndex: 0, multiplier: getOddsDisplay(0) },
        { label: 'DOWN', choiceIndex: 1, multiplier: getOddsDisplay(1) },
      ];
    } else if (market.marketType === 1) {
      choices = market.options.map((label, index) => ({
        label,
        choiceIndex: index,
        multiplier: getOddsDisplay(index)
      }));
    } else if (market.marketType === 2) {
      choices = market.rangeMins.map((min, index) => ({
        label: `[${formatUnits(min, 8)} - ${formatUnits(market.rangeMaxs[index], 8)}]`,
        choiceIndex: index,
        multiplier: getOddsDisplay(index)
      }));
    } else if (market.marketType === 3) {
      choices = market.timeframes.map((timeframe, index) => ({
        label: `Hit by ${formatDuration(Number(timeframe))}`,
        choiceIndex: index,
        multiplier: getOddsDisplay(index)
      }));
    }

    const marketStatus = getMarketTimeRemaining(market);
    const isLive = !market.resolved && Number(market.endTime) > Date.now()/1000;

    return (
      <div 
        key={Number(market.id)} 
        className="bg-dark-800 border-2 border-dark-600 rounded-2xl p-6 hover:border-primary hover:glow-primary transition-all duration-300 cursor-pointer group"
      >
        {/* Header with Asset Icon */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Asset Icon Circle */}
            <div className="w-14 h-14 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
              {getAssetEmoji(market.asset)}
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">{market.asset}</h3>
              <p className="text-sm text-neutral-400">{getMarketLabel(market.marketType, market.asset)}</p>
            </div>
          </div>
          
          {/* Live Badge with Pulse */}
          <span className={`px-3 py-1 text-xs font-bold rounded-full flex items-center gap-1 ${isLive ? 'bg-success/20 text-success' : market.resolved ? 'bg-neutral-600 text-white' : 'bg-danger/20 text-danger'}`}>
            {isLive && <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>}
            {market.resolved ? 'Resolved' : isLive ? 'LIVE' : marketStatus}
          </span>
        </div>

        {/* Price Info */}
        <div className="flex justify-between items-center text-sm text-neutral-400 border-b border-dark-600 pb-4 mb-4">
          <div className="flex flex-col">
            <span className="text-xs text-neutral-500">Start Price</span>
            <span className="font-semibold text-white">{formatPrice(market.startPrice)}</span>
            {market.marketType === 3 && (
              <span className="text-secondary font-bold mt-1 text-xs">
                Target: {formatPrice(market.targetPrice)}
              </span>
            )}
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-xs text-neutral-500">Pool Size</span>
            <span className="font-bold text-success flex items-center gap-1">
              <DollarSign size={14} />
              {formatUnits(market.totalPool, 6)}
            </span>
            <span className="text-xs text-primary mt-1">
              Ends: {new Date(Number(market.endTime)).toLocaleString(undefined, { 
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
              })}
            </span>
          </div>
        </div>

        {/* Betting Options - Enhanced */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {choices.map((choice) => (
            <button
              key={choice.choiceIndex}
              onClick={() => {
                if (!address) {
                  alert('Please connect your wallet first!');
                  return;
                }
                setSelectedMarket({...market, betChoice: choice.choiceIndex, choiceLabel: choice.label, multiplier: choice.multiplier});
              }}
              disabled={!isLive}
              className={`relative overflow-hidden group/button bg-gradient-to-br from-dark-700 to-dark-800 hover:from-primary/20 hover:to-success/20 border-2 p-6 rounded-xl transition-all duration-300 ${isLive ? 'border-dark-600 hover:border-primary cursor-pointer' : 'border-dark-700 cursor-not-allowed opacity-50'}`}
            >
              <div className="relative z-10">
                <div className="text-xl font-black mb-2 text-white group-hover/button:text-primary transition-colors">
                  {choice.label}
                </div>
                <div className="text-3xl font-black text-primary group-hover/button:scale-110 transition-transform">
                  {choice.multiplier}x
                </div>
              </div>
              {isLive && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover/button:translate-x-[100%] transition-transform duration-700"></div>
              )}
            </button>
          ))}
        </div>

        {/* Admin Controls */}
        {isOwner && isLive && market.marketType === 0 && (
          <div className="mt-4 flex gap-2 pt-4 border-t border-dark-600">
            <button onClick={() => handleResolve(market.id, 1)} className="flex-1 bg-danger hover:bg-danger-dark text-white font-bold py-3 rounded-xl text-sm transition-all hover:scale-105">
              Resolve DOWN (Admin)
            </button>
            <button onClick={() => handleResolve(market.id, 0)} className="flex-1 bg-success hover:bg-success-dark text-dark-950 font-bold py-3 rounded-xl text-sm transition-all hover:scale-105">
              Resolve UP (Admin)
            </button>
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
      <div key={bet.txHash} className={`bg-dark-800 p-4 rounded-xl shadow-md flex justify-between items-center transition-all duration-300 ${claimed ? 'opacity-70' : ''}`}>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-white">{bet.marketLabel}</span>
          <span className="text-sm text-neutral-400">Bet on: <span className="font-semibold text-primary">{bet.choiceLabel}</span></span>
          <span className="text-sm text-neutral-400">Amount: <span className="font-semibold text-success">{formatUnits(bet.amount, 6)} USDC</span></span>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!market.resolved ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-500 text-white">{getMarketTimeRemaining(market)}</span>
          ) : canClaim ? ( 
            // FIX: Only show claim button if simulation passed
            <button onClick={() => handleClaim(market.id)} className="bg-secondary hover:bg-secondary-500 text-neutral-900 font-bold py-2 px-4 rounded-lg flex items-center gap-1 text-sm">
              <Trophy size={16} /> Claim Winnings
            </button>
          ) : claimed ? (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-success text-white flex items-center gap-1"><CheckCircle size={14} /> Claimed</span>
          ) : (
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-white flex items-center gap-1"><XCircle size={14} /> Lost</span>
          )}
        </div>
      </div>
    );
  };
  
  const renderConnectWallet = () => (
    <div className="flex flex-col items-center justify-center p-10 bg-dark-800 rounded-xl shadow-2xl text-white">
      <Wallet size={48} className="text-primary mb-4" />
      <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
      <p className="text-neutral-400 mb-6 text-center">Join the action and place your first prediction on the Base Sepolia network.</p>
      <ConnectButton />
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-950 text-white font-sans p-4 sm:p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-extrabold text-gradient-primary">TrenchyBet</h1>
          <span className="px-3 py-1 bg-secondary/20 border border-secondary text-secondary text-xs font-bold rounded-full animate-pulse-slow">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isOwner && (
            <button 
              onClick={() => setShowAdminPanel(true)} 
              className="p-3 rounded-full bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 hover:border-secondary transition-all hover:scale-110"
              title="Open Admin Panel"
            >
              <Settings size={20} className="text-secondary" />
            </button>
          )}
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
  {/* Stats - Only show if connected */}
  {isConnected && (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* FEATURED Balance Card - Takes full width on mobile, 1/3 on desktop */}
        <div 
          className="md:col-span-1 bg-gradient-to-br from-primary/20 via-primary/10 to-success/10 border-2 border-primary p-6 rounded-2xl shadow-xl glow-primary hover:scale-105 transition-all duration-300 cursor-pointer"
          title="Your available USDC balance for placing bets"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wide">Your Balance</h3>
            <Wallet size={32} className="text-primary" />
          </div>
          <div className="text-4xl md:text-5xl font-black text-white mb-4">
            {formatUnits(usdcBalance, 6)} <span className="text-2xl text-primary">USDC</span>
          </div>
          <button className="w-full bg-primary hover:bg-primary-400 text-dark-950 font-bold py-3 rounded-xl text-sm transition-all hover:scale-105 flex items-center justify-center gap-2">
            <DollarSign size={16} />
            Add Funds
          </button>
        </div>
        
        {/* Win/Loss Summary - 2/3 width on desktop */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          {/* Wins Card */}
          <div 
            className="bg-dark-800 border border-success/30 p-5 rounded-xl hover:border-success hover:glow-success transition-all duration-300 cursor-pointer"
            title="Total number of winning bets you've placed"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400 font-semibold">Wins</span>
              <Trophy size={24} className="text-secondary" />
            </div>
            <div className="text-3xl font-black text-white mb-1">{userStats.wins}</div>
            <div className="text-xs text-success font-semibold">
              {userStats.totalBets > 0 ? `${((userStats.wins / userStats.totalBets) * 100).toFixed(0)}% Win Rate` : 'No bets yet'}
            </div>
          </div>

          {/* Losses Card */}
          <div 
            className="bg-dark-800 border border-danger/30 p-5 rounded-xl hover:border-danger hover:glow-danger transition-all duration-300 cursor-pointer"
            title="Total number of losing bets"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400 font-semibold">Losses</span>
              <XCircle size={24} className="text-danger" />
            </div>
            <div className="text-3xl font-black text-white mb-1">{userStats.losses}</div>
            <div className="text-xs text-danger font-semibold">
              {userStats.totalBets > 0 ? `${((userStats.losses / userStats.totalBets) * 100).toFixed(0)}% Loss Rate` : 'Clean slate'}
            </div>
          </div>

          {/* Total Bets */}
          <div 
            className="bg-dark-800 border border-primary/30 p-5 rounded-xl hover:border-primary hover:glow-primary transition-all duration-300 cursor-pointer"
            title="Total number of bets placed across all markets"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400 font-semibold">Total Bets</span>
              <DollarSign size={24} className="text-primary" />
            </div>
            <div className="text-3xl font-black text-white">{userStats.totalBets}</div>
          </div>

          {/* Streak */}
          <div 
            className="bg-dark-800 border border-secondary/30 p-5 rounded-xl hover:border-secondary hover:glow-secondary transition-all duration-300 cursor-pointer"
            title="Your current winning or losing streak"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400 font-semibold">Streak</span>
              <Clock size={24} className="text-secondary" />
            </div>
            <div className="text-3xl font-black text-white flex items-center gap-2">
              {userStats.streak}
              <TrendingUp size={20} className="text-secondary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )}
  
  {/* Tabs - Only show if connected */}
  {isConnected && (
    <div className="flex border-b border-dark-600 mb-8 overflow-x-auto">
      {[
        { key: 'markets', label: 'All Markets', icon: Target },
        { key: 'myBets', label: `My Bets (${userBets.length})`, icon: BarChart3 },
        { key: 'leaderboard', label: 'Leaderboard', icon: Trophy }
      ].map(({ key, label, icon: Icon }) => (
        <button 
          key={key} 
          onClick={() => setCurrentView(key)} 
          className={`py-3 px-6 text-lg font-semibold transition-all duration-300 flex items-center gap-2 relative ${
            currentView === key 
              ? 'text-primary border-b-2 border-primary' 
              : 'text-neutral-400 hover:text-white hover:bg-primary/5'
          }`}
        >
          <Icon size={20} className={currentView === key ? 'text-primary' : 'text-neutral-500'} />
          {label}
          {currentView === key && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-success animate-pulse-slow"></span>
          )}
        </button>
      ))}
    </div>
  )}

  {/* Connect Banner - Show only if not connected */}
  {!isConnected && (
    <div className="bg-gradient-to-r from-primary/10 to-success/10 border-2 border-primary rounded-2xl p-8 mb-8 text-center relative overflow-hidden glow-primary animate-in slide-in-from-top-4">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-success/5 animate-pulse-slow"></div>
      
      <div className="relative z-10">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center animate-pulse-slow">
          <Wallet size={32} className="text-primary" />
        </div>
        <h3 className="text-3xl font-black text-white mb-3">Ready to start winning?</h3>
        <p className="text-lg text-neutral-300 mb-6 max-w-2xl mx-auto">
          Connect your wallet to place bets, track your performance, and join the action
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
        <p className="text-xs text-neutral-500 mt-4">
          🔒 Secure connection via RainbowKit • Base Sepolia Network
        </p>
      </div>
    </div>
  )}

  {/* Markets View - ALWAYS VISIBLE */}
  {(!isConnected || currentView === 'markets') && (
    <>
      {isLoadingMarkets && markets.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MarketCardSkeleton />
          <MarketCardSkeleton />
          <MarketCardSkeleton />
        </div>
      )}
      {(() => {
        const activeMarkets = markets.filter(m => !m.resolved && Number(m.endTime) > Date.now()/1000);
        if (!isLoadingMarkets && activeMarkets.length === 0) {
          return <LandingHero isConnected={isConnected} />;
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {activeMarkets.map(renderMarketDetails)}
          </div>
        );
      })()}
    </>
  )}

  {/* My Bets - Only if connected */}
  {isConnected && currentView === 'myBets' && (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold mb-6 text-primary">My Betting History</h2>
      <div className="flex flex-col gap-4">
        {userBets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-dark-800 rounded-xl text-neutral-400">
            <BarChart3 size={32} />
            <p className="mt-3 text-lg">You haven't placed any bets yet.</p>
          </div>
        ) : (
          userBets.map(renderUserBet)
        )}
      </div>
    </div>
  )}

  {/* Leaderboard - Only if connected */}
  {isConnected && currentView === 'leaderboard' && (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-3xl font-bold mb-6 text-primary">Top Predictors</h2>
      <div className="bg-dark-800 p-6 rounded-xl">
        <p className="text-neutral-400">Leaderboard functionality coming soon!</p>
        <ul className="mt-4 space-y-3">
          {['0x123...456 (50 Wins)', '0xABC...DEF (45 Wins)', '0x789...GHI (40 Wins)'].map((entry, index) => (
            <li key={index} className="flex justify-between items-center p-3 bg-dark-700 rounded-lg">
              <span className="text-lg font-bold">{index + 1}.</span>
              <span className="flex-1 ml-4">{entry}</span>
              <Trophy size={20} className="text-secondary" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )}
</main>
      
      {selectedMarket && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setSelectedMarket(null)}>
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 border-2 border-primary rounded-3xl p-8 w-full max-w-lg shadow-2xl glow-primary animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedMarket(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            {/* Asset Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-5xl animate-pulse-slow">
                {getAssetEmoji(selectedMarket.asset)}
              </div>
              <h2 className="text-3xl font-black text-white mb-2">{selectedMarket.asset} Market</h2>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-full border border-primary">
                <TrendingUp size={16} className="text-primary" />
                <span className="text-lg font-bold text-primary">Betting on: {selectedMarket.choiceLabel}</span>
              </div>
            </div>
            
            {/* Potential Payout Display */}
            <div className="bg-dark-900 border-2 border-primary/30 rounded-2xl p-6 mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-dark-600">
                  <span className="text-neutral-400 text-sm font-semibold">Your Bet Amount</span>
                  <span className="text-2xl font-black text-white">${betAmount || '0'} USDC</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-neutral-400 text-sm font-semibold">Multiplier</span>
                  <span className="text-xl font-bold text-secondary">{selectedMarket.multiplier || '2.00'}x</span>
                </div>
                <div className="flex justify-between items-center text-2xl font-black pt-4 border-t border-primary/30">
                  <span className="text-primary flex items-center gap-2">
                    <Trophy size={24} />
                    Potential Win
                  </span>
                  <span className="text-success">
                    ${(parseFloat(betAmount || 0) * parseFloat(selectedMarket.multiplier || 2)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-primary" />
                Bet Amount (USDC)
              </label>
              <input 
                type="number" 
                value={betAmount} 
                onChange={(e) => setBetAmount(e.target.value)}
                min="1"
                step="1"
                className="w-full p-5 bg-dark-900 text-white text-3xl font-black text-center rounded-2xl border-2 border-dark-600 focus:border-primary outline-none transition-all"
                placeholder="0.00"
                autoFocus
              />
              
              {/* Quick Bet Buttons */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[10, 25, 50, 100].map((amount) => (
                  <button 
                    key={amount}
                    onClick={() => setBetAmount(amount.toString())}
                    className="bg-dark-700 hover:bg-primary/20 border-2 border-dark-600 hover:border-primary rounded-xl py-3 text-sm font-bold transition-all hover:scale-105"
                  >
                    ${amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Balance Check */}
            {isConnected && (
              <div className="bg-dark-900/50 rounded-xl p-3 mb-6 flex items-center justify-between">
                <span className="text-sm text-neutral-400">Your Balance:</span>
                <span className="text-sm font-bold text-white">{formatUnits(usdcBalance, 6)} USDC</span>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setSelectedMarket(null)}
                className="bg-dark-700 hover:bg-dark-600 border-2 border-dark-600 hover:border-neutral-500 text-white font-bold py-4 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => placeBetOnChain(selectedMarket, selectedMarket.betChoice)}
                disabled={isPending || isConfirming || isPlacingBet || !betAmount || Number(betAmount) <= 0}
                className="bg-gradient-to-r from-primary to-success hover:from-primary-400 hover:to-success-dark disabled:from-neutral-600 disabled:to-neutral-600 text-dark-950 font-bold py-4 rounded-xl shadow-lg glow-primary hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                {isPending || isConfirming || isPlacingBet ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Placing Bet...'}
                  </>
                ) : (
                  <>
                    <TrendingUp size={20} />
                    Place Bet
                  </>
                )}
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-neutral-500 text-center mt-4">
              This is real money. Only bet what you can afford to lose.
            </p>
          </div>
        </div>
      )}
      {showAdminPanel && <AdminPanel onClose={() => { setShowAdminPanel(false); refreshData(); }} />}
    </div>
  );
};

export default App;