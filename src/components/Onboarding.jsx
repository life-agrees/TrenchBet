import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useContractAddresses } from '../hooks/useContractAddresses';
import { Rocket, Shield, Coins, Wallet, ArrowRight, Zap, Target, Star, Trophy, CheckCircle, ChevronRight, X, ExternalLink, TrendingUp, Gift, ChevronLeft } from 'lucide-react';

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const { chain } = useAccount();
  const { networkName, isArc } = useContractAddresses();

  const networkLabel = chain?.name || networkName || 'Base Sepolia';
  const bridgeUrl = isArc ? 'https://bridge.arc.net' : 'https://bridge.base.org';

  const nextStep = () => {
    if (step < 4) {
      setDirection(1);
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  const Step1Welcome = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <TrendingUp className="w-10 h-10 text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold mb-4">Welcome to TrenchyBet</h2>
      <p className="text-gray-400 leading-relaxed">
        The most transparent multi-chain prediction market. 
        Bet on crypto prices, earn points, and climb the leaderboard.
      </p>
      <div className="mt-6 flex items-center justify-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          <span>Trustless</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span>Transparent</span>
        </div>
      </div>
    </div>
  );

  const Step2HowItWorks = () => (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-blue-400 font-bold">1</span>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Connect Wallet</h3>
            <p className="text-sm text-gray-400">Connect your wallet on any supported network</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-blue-400 font-bold">2</span>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Place Your Bet</h3>
            <p className="text-sm text-gray-400">Predict if price goes up or down with USDC</p>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-blue-400 font-bold">3</span>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Win & Earn</h3>
            <p className="text-sm text-gray-400">Claim winnings + earn points for every bet</p>
          </div>
        </div>
      </div>
    </div>
  );

  const Step3GetUSDC = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Wallet className="w-10 h-10 text-green-400" />
      </div>
      <h2 className="text-2xl font-bold mb-4">Get USDC</h2>
      <p className="text-gray-400 mb-6">
        You'll need USDC to place bets. Here are the best ways to get it:
      </p>
      <div className="space-y-3 text-left">
        <a href={bridgeUrl} target="_blank" rel="noopener noreferrer" className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
          <div className="font-semibold">{networkLabel} Bridge</div>
          <div className="text-sm text-gray-400">Bridge from Ethereum mainnet</div>
        </a>
        <a href="https://coinbase.com" target="_blank" rel="noopener noreferrer" className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
          <div className="font-semibold">Coinbase</div>
          <div className="text-sm text-gray-400">Buy directly with fiat</div>
        </a>
      </div>
    </div>
  );

  const Step4FirstBet = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
        <Gift className="w-10 h-10 text-yellow-400" />
      </div>
      <h2 className="text-2xl font-bold mb-4">First Bet Insurance</h2>
      <p className="text-gray-400 mb-6">
        New users get up to $100 in TRENCHY tokens if their first bet loses. 
        It's risk-free to try!
      </p>
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="text-sm text-blue-400 font-medium mb-2">Your First Bet is Protected</div>
        <div className="text-2xl font-bold text-neutral-900 dark:text-white">100 TRENCHY</div>
        <div className="text-sm text-gray-400">~$100 value</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-lg w-full mx-4 relative overflow-hidden">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-blue-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            {step === 1 && <Step1Welcome />}
            {step === 2 && <Step2HowItWorks />}
            {step === 3 && <Step3GetUSDC />}
            {step === 4 && <Step4FirstBet />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-neutral-900 dark:text-white disabled:opacity-0"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
          >
            {step === 4 ? 'Get Started' : 'Next'}
            {step !== 4 && <ChevronRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
