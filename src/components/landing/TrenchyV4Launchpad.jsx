import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { HOOK_CONTRACTS } from '../../utils/constants';

// Icon placeholders designed using SVG for premium native looks
const TrophyIcon = () => (
  <svg className="w-6 h-6 text-secondary animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0v4m0 0h2m-2 0H8m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export default function TrenchyV4Launchpad() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' or 'amm'
  
  // Simulation states for V4 sandbox demonstration
  const [milestoneVolume, setMilestoneVolume] = useState(852350); // $852,350 USDC volume (Overdrive Simulation)
  const [accumulatedTax, setAccumulatedTax] = useState(12785); // 1.5% tax collected
  
  const percentComplete = Math.min((milestoneVolume / 1000000) * 100, 100).toFixed(1);
  const isOverdrive = percentComplete >= 80;
  const [priceYES, setPriceYES] = useState(0.512); // P_yes = 0.512 USDC
  const [priceNO, setPriceNO] = useState(0.488); // P_no = 0.488 USDC
  
  const [swapAmount, setSwapAmount] = useState('100');
  const [swapDirection, setSwapDirection] = useState(true); // true = YES->NO, false = NO->YES
  const [estimatedOutput, setEstimatedOutput] = useState('95.2');
  const [betAmount, setBetAmount] = useState('50');

  // Dynamically calculate swap estimates to enforce YES + NO = 1 USDC invariant in real-time
  useEffect(() => {
    const amt = parseFloat(swapAmount) || 0;
    if (amt <= 0) {
      setEstimatedOutput('0.00');
      return;
    }
    
    // Invariant logic: deltaOut = ReserveOut * deltaIn / (ReserveIn + deltaIn)
    // Simulated virtual reserves:
    const reserveIn = swapDirection ? 512000 : 488000;
    const reserveOut = swapDirection ? 488000 : 512000;
    const out = (reserveOut * amt) / (reserveIn + amt);
    setEstimatedOutput(out.toFixed(2));
  }, [swapAmount, swapDirection]);

  // Handler for placing a milestone bet (Concept 1)
  const handlePlaceBet = (choice) => {
    alert(`🎯 Bet Placed on TrenchyBet Milestone Market!\nChoice: ${choice ? 'YES (Hits $1M)' : 'NO (Launch fails/Hedge)'}\nAmount: ${betAmount} USDC\n\nThis wagers USDC and mints standard outcome tokens tradeable in the TrenchyBinaryAMM pool.`);
  };

  // Handler for binary AMM swap (Concept 4)
  const handleSwap = () => {
    alert(`⚖️ Uniswap V4 Custom Swap Executed via TrenchyBinaryAMM!\nSwapped: ${swapAmount} ${swapDirection ? 'YES' : 'NO'}\nReceived: ${estimatedOutput} ${swapDirection ? 'NO' : 'YES'}\n\nEnforcing P_yes + P_no = 1 USDC invariant. Virtual reserves dynamically rebalanced!`);
    
    // Animate reserve shifts
    const amt = parseFloat(swapAmount) || 0;
    if (swapDirection) {
      setPriceYES(prev => Math.max(0.2, prev - 0.015));
      setPriceNO(prev => Math.min(0.8, prev + 0.015));
    } else {
      setPriceYES(prev => Math.min(0.8, prev + 0.015));
      setPriceNO(prev => Math.max(0.2, prev - 0.015));
    }
  };

  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans pb-24">
      {/* Header Area */}
      <div className="max-w-5xl mx-auto mb-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
            Uniswap V4 Hook & X Layer Sandbox
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#c0ff00] via-[#CDFF00] to-[#00FF88] bg-clip-text text-transparent">
            TrenchyV4 Hook Launchpad
          </h1>
          <p className="text-neutral-400 mt-2 text-lg">
            Experience prediction-backed fair token launches and hyper-efficient outcome trading.
          </p>
        </div>
        
        {/* Network Status Badge */}
        <div className="mt-4 md:mt-0 flex items-center gap-3 bg-dark-800 border border-white/10 p-3 rounded-2xl">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(0,255,136,0.4)]"></div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Network</div>
            <div className="text-sm font-bold text-white">X Layer Testnet</div>
          </div>
        </div>
      </div>

      {/* Hook Address Directory */}
      <div className="max-w-5xl mx-auto mb-8 bg-dark-800/40 border border-white/10 rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Deployed Hook Ecosystem (X Layer Testnet)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-dark-950/60 p-4 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-primary/20 transition-all">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">Mock USDC</span>
            <a 
              href={`https://www.okx.com/web3/explorer/xlayer-test/address/${HOOK_CONTRACTS.USDC}`}
              target="_blank"
              rel="noreferrer"
              title={HOOK_CONTRACTS.USDC}
              className="text-xs text-primary hover:text-primary-200 font-mono truncate hover:underline"
            >
              {HOOK_CONTRACTS.USDC}
            </a>
          </div>
          <div className="bg-dark-950/60 p-4 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-primary/20 transition-all">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">Token ($TRENCHY)</span>
            <a 
              href={`https://www.okx.com/web3/explorer/xlayer-test/address/${HOOK_CONTRACTS.TRENCHY_TOKEN}`}
              target="_blank"
              rel="noreferrer"
              title={HOOK_CONTRACTS.TRENCHY_TOKEN}
              className="text-xs text-primary hover:text-primary-200 font-mono truncate hover:underline"
            >
              {HOOK_CONTRACTS.TRENCHY_TOKEN}
            </a>
          </div>
          <div className="bg-dark-950/60 p-4 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-primary/20 transition-all">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">PoolManager</span>
            <a 
              href={`https://www.okx.com/web3/explorer/xlayer-test/address/${HOOK_CONTRACTS.POOL_MANAGER}`}
              target="_blank"
              rel="noreferrer"
              title={HOOK_CONTRACTS.POOL_MANAGER}
              className="text-xs text-primary hover:text-primary-200 font-mono truncate hover:underline"
            >
              {HOOK_CONTRACTS.POOL_MANAGER}
            </a>
          </div>
          <div className="bg-dark-950/60 p-4 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-primary/20 transition-all">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">Milestone Hook</span>
            <a 
              href={`https://www.okx.com/web3/explorer/xlayer-test/address/${HOOK_CONTRACTS.MILESTONE_HOOK}`}
              target="_blank"
              rel="noreferrer"
              title={HOOK_CONTRACTS.MILESTONE_HOOK}
              className="text-xs text-primary hover:text-primary-200 font-mono truncate hover:underline"
            >
              {HOOK_CONTRACTS.MILESTONE_HOOK}
            </a>
          </div>
          <div className="bg-dark-950/60 p-4 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-primary/20 transition-all">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2">Binary AMM</span>
            <a 
              href={`https://www.okx.com/web3/explorer/xlayer-test/address/${HOOK_CONTRACTS.BINARY_AMM}`}
              target="_blank"
              rel="noreferrer"
              title={HOOK_CONTRACTS.BINARY_AMM}
              className="text-xs text-primary hover:text-primary-200 font-mono truncate hover:underline"
            >
              {HOOK_CONTRACTS.BINARY_AMM}
            </a>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="max-w-5xl mx-auto mb-8 flex justify-center max-w-md mx-auto">
        <div className="flex w-full bg-dark-800/60 p-1.5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('milestones')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
              activeTab === 'milestones'
                ? 'bg-primary text-dark-950 shadow-lg shadow-primary/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            🚀 Token Milestones
          </button>
          <button
            onClick={() => setActiveTab('amm')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${
              activeTab === 'amm'
                ? 'bg-primary text-dark-950 shadow-lg shadow-primary/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            ⚖️ Binary AMM
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 gap-8">
        
        {/* TABS 1: MILESTONE LAUNCHPAD */}
        {activeTab === 'milestones' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Live Launch Token Card */}
            <div className="relative overflow-hidden bg-gradient-to-b from-dark-800 to-dark-950 border border-white/10 rounded-3xl p-6 md:p-8">
              {/* Decorative light reflection */}
              <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
              
              <div className="relative flex flex-col lg:flex-row justify-between gap-8">
                {/* Info Block */}
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c0ff00] to-[#00FF88] flex items-center justify-center font-extrabold text-2xl text-dark-950 shadow-lg shadow-primary/30">
                      T
                    </div>
                    <div>
                      <div className="text-xs text-primary font-bold uppercase tracking-wider">Active V4 Fair Launch</div>
                      <h2 className="text-2xl md:text-3xl font-black text-white">$TRENCHY Token Launch</h2>
                    </div>
                  </div>

                  <p className="text-neutral-300 leading-relaxed">
                    When you trade the new $TRENCHY token, a small 1.5% fee goes into a secure vault. If we reach our goal of **$1,000,000** in trading volume in 7 days, that vault money is used to permanently lock in the token's liquidity. If we miss the goal, the vault automatically buys back tokens to protect you!
                  </p>

                  {/* Milestone Progress Bar */}
                  <div className={`space-y-2 ${isOverdrive ? 'animate-pulse' : ''}`}>
                    <div className="flex justify-between items-center text-sm">
                      <span className={`font-semibold ${isOverdrive ? 'text-primary drop-shadow-[0_0_8px_#c0ff00]' : 'text-neutral-400'}`}>
                        Milestone Target: $1,000,000 USDC Launch Volume
                      </span>
                      <span className={`font-black ${isOverdrive ? 'text-primary drop-shadow-[0_0_8px_#c0ff00] text-lg' : 'text-primary'}`}>
                        {percentComplete}% Complete
                      </span>
                    </div>
                    <div className={`w-full h-4 bg-dark-950 rounded-full border p-0.5 overflow-hidden transition-all ${isOverdrive ? 'border-primary/50 shadow-[0_0_15px_rgba(205,255,0,0.3)]' : 'border-white/10'}`}>
                      <div 
                        className={`h-full rounded-full shadow-inner transition-all duration-1000 ${
                          isOverdrive 
                            ? 'bg-gradient-to-r from-[#c0ff00] via-white to-[#00FF88] animate-pulse brightness-150' 
                            : 'bg-gradient-to-r from-[#c0ff00] via-[#CDFF00] to-[#00FF88]'
                        }`} 
                        style={{ width: `${percentComplete}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-neutral-500">
                      <span>$0 Tracked</span>
                      <span className={`font-semibold ${isOverdrive ? 'text-primary drop-shadow-sm' : 'text-neutral-300'}`}>
                        ${milestoneVolume.toLocaleString()} USDC Tracked
                      </span>
                      <span>$1,000,000 Target</span>
                    </div>
                  </div>
                </div>

                {/* Status Dashboard Block */}
                <div className="w-full lg:w-96 bg-dark-950/80 border border-white/10 rounded-2xl p-6 space-y-4">
                  <h3 className="text-lg font-black text-white border-b border-white/10 pb-2">Launch Status</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-dark-800/60 p-3 rounded-xl border border-white/5">
                      <div className="text-xs text-neutral-400">Accumulated Tax</div>
                      <div className="text-lg font-extrabold text-success">${accumulatedTax.toLocaleString()} USDC</div>
                    </div>
                    <div className="bg-dark-800/60 p-3 rounded-xl border border-white/5">
                      <div className="text-xs text-neutral-400">Time Left</div>
                      <div className="text-lg font-extrabold text-secondary">5 Days</div>
                    </div>
                  </div>

                  <div className="bg-dark-800/60 p-4 rounded-xl border border-white/5 space-y-3">
                    <div className="text-sm font-bold text-white">Milestone Odds (TrenchyBet):</div>
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>YES (Hits target): <strong className="text-success font-black">1.8x Payout</strong></span>
                      <span>NO (Fails / Hedge): <strong className="text-danger font-black">2.2x Payout</strong></span>
                    </div>
                  </div>

                  {/* Bet Input Panel */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        value={betAmount} 
                        onChange={(e) => setBetAmount(e.target.value)}
                        className="flex-1 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-primary/50" 
                        placeholder="Bet Amount"
                      />
                      <span className="inline-flex items-center px-3 rounded-xl bg-dark-800 border border-white/10 text-xs font-bold text-neutral-400">USDC</span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handlePlaceBet(true)}
                        className="flex-1 bg-success/10 hover:bg-success/20 border border-success/25 text-success py-3 rounded-xl font-bold transition-all duration-300 active:scale-95 text-xs sm:text-sm"
                      >
                        Bet YES
                      </button>
                      <button
                        onClick={() => handlePlaceBet(false)}
                        className="flex-1 bg-danger/10 hover:bg-danger/20 border border-danger/25 text-danger py-3 rounded-xl font-bold transition-all duration-300 active:scale-95 text-xs sm:text-sm"
                      >
                        Bet NO (Hedge)
                      </button>
                    </div>

                    <button
                      onClick={() => alert(`🦍 Ape & Hedge Executed!\n\n1. BOUGHT $TRENCHY on Uniswap V4 with ${betAmount} USDC.\n2. BOUGHT "NO" outcome tokens to hedge against the launch failing.\n\nDownside completely protected via composable hooks!`)}
                      className="w-full mt-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-dark-950 py-3.5 rounded-xl font-black transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(205,255,0,0.3)] flex items-center justify-center gap-2"
                    >
                      🦍 One-Click Ape & Hedge
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Protects You Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-dark-800/40 border border-white/10 rounded-2xl p-6 flex gap-4">
                <div className="p-3 bg-success/10 rounded-xl border border-success/25 shrink-0 flex items-center justify-center">
                  <ShieldIcon />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">Scenario A: We Hit The Goal</h4>
                  <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
                    If we reach $1,000,000 in volume, the vault's **${accumulatedTax.toLocaleString()} USDC** is permanently locked into the trading pool. This creates a massive safety cushion for the token's price!
                  </p>
                </div>
              </div>

              <div className="bg-dark-800/40 border border-white/10 rounded-2xl p-6 flex gap-4">
                <div className="p-3 bg-secondary/10 rounded-xl border border-secondary/25 shrink-0 flex items-center justify-center">
                  <TrophyIcon />
                </div>
                <div>
                  <h4 className="text-lg font-black text-white">Scenario B: We Miss The Goal</h4>
                  <p className="text-sm text-neutral-400 mt-1 leading-relaxed">
                    If we don't reach the target, the system automatically uses the vault money to buy back tokens and remove them from circulation. This protects the token price so early supporters don't lose out.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TABS 2: BINARY AMM TRADING PANEL */}
        {activeTab === 'amm' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Swap Trading Interface */}
              <div className="lg:col-span-7 bg-dark-800/50 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-black text-white flex items-center gap-2">
                    <ChartIcon /> Outcome Token Swapper
                  </h2>
                  <button 
                    onClick={() => setSwapDirection(!swapDirection)}
                    className="text-xs text-primary hover:text-primary-200 font-bold uppercase tracking-wider bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/25 transition-all"
                  >
                    🔄 Switch Direction
                  </button>
                </div>

                {/* Input Token Box */}
                <div className="bg-dark-950 border border-white/10 p-5 rounded-2xl space-y-2">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Pay</span>
                    <span>Reserve: {swapDirection ? '512,000 YES' : '488,000 NO'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <input 
                      type="number"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                      className="bg-transparent text-2xl font-black text-white focus:outline-none w-2/3"
                      placeholder="0.0"
                    />
                    <div className={`px-4 py-1.5 rounded-xl font-extrabold text-sm ${swapDirection ? 'bg-success/10 border border-success/30 text-success' : 'bg-danger/10 border border-danger/30 text-danger'}`}>
                      {swapDirection ? 'YES Token' : 'NO Token'}
                    </div>
                  </div>
                </div>

                {/* Swap Divider Arrow */}
                <div className="flex justify-center -my-3">
                  <div className="w-10 h-10 rounded-full bg-dark-950 border border-white/10 flex items-center justify-center text-primary font-black shadow-lg">
                    ↓
                  </div>
                </div>

                {/* Output Token Box */}
                <div className="bg-dark-950 border border-white/10 p-5 rounded-2xl space-y-2">
                  <div className="flex justify-between text-xs text-neutral-400">
                    <span>Receive (Estimated)</span>
                    <span>Reserve: {swapDirection ? '488,000 NO' : '512,000 YES'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-black text-primary">{estimatedOutput}</span>
                    <div className={`px-4 py-1.5 rounded-xl font-extrabold text-sm ${!swapDirection ? 'bg-success/10 border border-success/30 text-success' : 'bg-danger/10 border border-danger/30 text-danger'}`}>
                      {!swapDirection ? 'YES Token' : 'NO Token'}
                    </div>
                  </div>
                </div>

                {/* Slippage & Gas info card */}
                <div className="bg-dark-950/60 p-4 rounded-xl border border-white/5 space-y-2 text-xs text-neutral-400">
                  <div className="flex justify-between">
                    <span>Market Rule</span>
                    <span className="font-mono text-primary">YES + NO always equals $1.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transaction Fees</span>
                    <span className="text-success font-bold">Ultra-low (Optimized)</span>
                  </div>
                </div>

                {/* Execute Swap Button */}
                <button
                  onClick={handleSwap}
                  className="w-full bg-[#c0ff00] hover:bg-[#d4ff33] text-dark-950 font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 text-center"
                >
                  Swap Outcome Tokens
                </button>
              </div>

              {/* AMM Mathematics & Pool Status */}
              <div className="lg:col-span-5 bg-dark-800/50 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
                <h3 className="text-xl font-black text-white border-b border-white/10 pb-4">
                  Market Status
                </h3>

                {/* Real-time Invariant Balance Display */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-neutral-400 mb-1">
                      <span>YES Share Price</span>
                      <span className="font-extrabold text-success">${priceYES.toFixed(3)} USDC</span>
                    </div>
                    <div className="w-full h-2 bg-dark-950 rounded-full border border-white/5 overflow-hidden">
                      <div className="h-full bg-success rounded-full" style={{ width: `${priceYES * 100}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-neutral-400 mb-1">
                      <span>NO Share Price</span>
                      <span className="font-extrabold text-danger">${priceNO.toFixed(3)} USDC</span>
                    </div>
                    <div className="w-full h-2 bg-dark-950 rounded-full border border-white/5 overflow-hidden">
                      <div className="h-full bg-danger rounded-full" style={{ width: `${priceNO * 100}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Invariant Equation Box */}
                <div className="bg-dark-950 border border-primary/10 p-5 rounded-2xl text-center space-y-2">
                  <div className="text-xs text-primary font-bold uppercase tracking-wider">How Pricing Works</div>
                  <div className="text-3xl font-black text-white font-mono tracking-tight">
                    ${priceYES.toFixed(3)} + ${priceNO.toFixed(3)} = $1.00
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed px-4">
                    The system dynamically balances the price of YES and NO tokens so they always equal exactly $1.00 when added together.
                  </p>
                </div>

                {/* Bullet Info features */}
                <ul className="space-y-3 text-xs text-neutral-400">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Fair pricing with no hidden loopholes.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Prices never drop below $0 or exceed $1.
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    Works seamlessly with TrenchyBet milestones.
                  </li>
                </ul>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
