import React, { useState } from 'react';
import { X, Coins, AlertCircle, CheckCircle, Loader2, TrendingUp, Lock } from 'lucide-react';
import { useAccount } from 'wagmi';
import { usePointsClaim } from '../hooks/usePointsClaim';
import { usePointsData } from '../hooks/usePointsData';
import { useContractAddresses } from '../hooks/useContractAddresses';

const POINTS_PER_TRENCHY = 100;

/**
 * PointsClaimModal
 *
 * FIX 1: `usePointsData()` was called with no arguments.
 *         The hook signature is `usePointsData(walletAddress)` — without the
 *         address it always returns `pointsData: null`, so available points
 *         showed 0 for every user. Added `useAccount()` to get the address
 *         and pass it to the hook. Also accepts `walletAddress` as a prop
 *         fallback for when the parent passes it explicitly.
 *
 * FIX 2: Destructured `points?.available` but the hook returns `pointsData`
 *         (not `points`). The field is `pointsData.points_available`.
 *         Fixed destructuring to match the actual return shape.
 *
 * FIX 3: Design system — gray-* → dark-*\\/neutral-* tokens, blue-500 → primary.
 */
export const PointsClaimModal = ({ isOpen, onClose, walletAddress: walletAddressProp }) => {
  const [pointsAmount, setPointsAmount] = useState('');
  const [autoStake, setAutoStake]       = useState(false);
  const [step, setStep]                 = useState('input');

  // FIX 1: get wallet address from wagmi (or prop fallback)
  const { address: connectedAddress } = useAccount();
  const walletAddress = walletAddressProp ?? connectedAddress;
  const { explorerUrl, networkName } = useContractAddresses();

  // FIX 1 + 2: pass walletAddress, destructure pointsData correctly
  const { pointsData, isLoading: isLoadingPoints } = usePointsData(walletAddress);

  const {
    prepareClaim,
    executeClaim,
    isLoading,
    error,
    claimData,
    transactionHash,
    reset,
  } = usePointsClaim();

  if (!isOpen) return null;

  // FIX 2: correct field name from the hook's return shape
  const availablePoints = pointsData?.points_available ?? 0;
  const trenchyAmount   = Math.floor(parseInt(pointsAmount || 0) / POINTS_PER_TRENCHY);

  const handlePrepareClaim = async () => {
    const result = await prepareClaim(pointsAmount);
    if (result) setStep('confirm');
  };

  const handleExecuteClaim = async () => {
    const success = await executeClaim(autoStake);
    if (success) setStep('success');
  };

  const handleClose = () => {
    reset();
    setStep('input');
    setPointsAmount('');
    setAutoStake(false);
    onClose();
  };

  return (
    // FIX 3: dark-* tokens throughout
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-neutral-50 dark:bg-dark-900 border border-neutral-200 dark:border-dark-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-800">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Claim TRENCHY Tokens</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-neutral-400 hover:text-neutral-900 dark:text-white hover:bg-white dark:bg-dark-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">

          {/* ── STEP: input ── */}
          {step === 'input' && (
            <>
              <div className="bg-white dark:bg-dark-800/50 rounded-lg p-4">
                <div className="text-neutral-400 text-sm mb-1">Available Points</div>
                <div className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {/* FIX 2: availablePoints now comes from pointsData.points_available */}
                  {isLoadingPoints ? '...' : availablePoints.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Points to Claim (min 100)
                </label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="Enter points amount"
                  min="100"
                  step="100"
                  className="w-full bg-white dark:bg-dark-800 border border-neutral-200 dark:border-dark-700 rounded-lg px-4 py-3 text-neutral-900 dark:text-white placeholder-neutral-600 focus:outline-none focus:border-primary"
                />
              </div>

              {pointsAmount >= 100 && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-neutral-400">You will receive</span>
                    <span className="text-xl font-bold text-primary">{trenchyAmount} TRENCHY</span>
                  </div>
                  <div className="text-xs text-neutral-500">Rate: 100 points = 1 TRENCHY</div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-white dark:bg-dark-800/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-neutral-300">Auto-stake tokens</span>
                </div>
                <button
                  onClick={() => setAutoStake(!autoStake)}
                  className={`w-12 h-6 rounded-full transition-colors ${autoStake ? 'bg-green-500' : 'bg-neutral-200 dark:bg-dark-600'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${autoStake ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {autoStake && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span>Tokens will be staked immediately (no lock period)</span>
                </div>
              )}
              {!autoStake && pointsAmount >= 100 && (
                <div className="flex items-center gap-2 text-xs text-yellow-400">
                  <Lock className="w-4 h-4" />
                  <span>Tokens will be locked for 15 days</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 text-sm">{error}</span>
                </div>
              )}

              <button
                onClick={handlePrepareClaim}
                disabled={!pointsAmount || pointsAmount < 100 || isLoading}
                className="w-full py-3 bg-primary hover:bg-primary/90 disabled:bg-neutral-100 dark:bg-dark-700 disabled:cursor-not-allowed text-dark-950 disabled:text-neutral-500 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Preparing...</>
                ) : (
                  'Prepare Claim'
                )}
              </button>
            </>
          )}

          {/* ── STEP: confirm ── */}
          {step === 'confirm' && claimData && (
            <>
              <div className="text-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Ready to Claim</h3>
                <p className="text-neutral-400 text-sm">Your claim has been prepared and signed</p>
              </div>

              <div className="bg-white dark:bg-dark-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Points</span>
                  <span className="text-neutral-900 dark:text-white font-medium">{claimData.pointsAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">TRENCHY Amount</span>
                  <span className="text-neutral-900 dark:text-white font-medium">{claimData.trenchyAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Auto-stake</span>
                  <span className="text-neutral-900 dark:text-white font-medium">{autoStake ? 'Yes' : 'No'}</span>
                </div>
              </div>

              {claimData.monthlyStatus && (
                <div className="text-xs text-neutral-500">
                  Monthly cap: {claimData.monthlyStatus.claimedThisMonth} / {claimData.monthlyStatus.cap} TRENCHY claimed
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('input')}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-neutral-100 dark:bg-dark-700 hover:bg-neutral-200 dark:bg-dark-600 text-neutral-900 dark:text-white font-semibold rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleExecuteClaim}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-primary hover:bg-primary/90 disabled:bg-neutral-100 dark:bg-dark-700 text-dark-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Claiming...</>
                  ) : (
                    'Claim Now'
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── STEP: success ── */}
          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Claim Successful!</h3>
              <p className="text-neutral-400 mb-4">
                You have successfully claimed {claimData?.trenchyAmount} TRENCHY tokens
              </p>
              {transactionHash && (
                <a
                  href={`${explorerUrl}/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 text-sm underline"
                >
                  View on {networkName} Explorer
                </a>
              )}
              <button
                onClick={handleClose}
                className="w-full mt-6 py-3 bg-primary hover:bg-primary/90 text-dark-950 font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PointsClaimModal;