import React, { useState } from 'react';
import { X, Coins, AlertCircle, CheckCircle, Loader2, TrendingUp, Lock } from 'lucide-react';
import { usePointsClaim } from '../hooks/usePointsClaim';
import { usePointsData } from '../hooks/usePointsData';

const POINTS_PER_TRENCHY = 100;

export const PointsClaimModal = ({ isOpen, onClose }) => {
  const [pointsAmount, setPointsAmount] = useState('');
  const [autoStake, setAutoStake] = useState(false);
  const [step, setStep] = useState('input'); // input, confirm, success
  
  const { points, isLoading: isLoadingPoints } = usePointsData();
  const {
    prepareClaim,
    executeClaim,
    isLoading,
    error,
    claimData,
    isSuccess,
    transactionHash,
    reset,
  } = usePointsClaim();

  if (!isOpen) return null;

  const availablePoints = points?.available || 0;
  const trenchyAmount = Math.floor(parseInt(pointsAmount || 0) / POINTS_PER_TRENCHY);

  const handlePrepareClaim = async () => {
    const result = await prepareClaim(pointsAmount);
    if (result) {
      setStep('confirm');
    }
  };

  const handleExecuteClaim = async () => {
    const success = await executeClaim(autoStake);
    if (success) {
      setStep('success');
    }
  };

  const handleClose = () => {
    reset();
    setStep('input');
    setPointsAmount('');
    setAutoStake(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Claim TRENCHY Tokens</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {step === 'input' && (
            <>
              {/* Available Points */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-1">Available Points</div>
                <div className="text-2xl font-bold text-white">
                  {isLoadingPoints ? '...' : availablePoints.toLocaleString()}
                </div>
              </div>

              {/* Points Input */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Points to Claim (min 100)
                </label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="Enter points amount"
                  min="100"
                  step="100"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Conversion Preview */}
              {pointsAmount >= 100 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">You will receive</span>
                    <span className="text-xl font-bold text-blue-400">
                      {trenchyAmount} TRENCHY
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Rate: 100 points = 1 TRENCHY
                  </div>
                </div>
              )}

              {/* Auto-stake Option */}
              <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Auto-stake tokens</span>
                </div>
                <button
                  onClick={() => setAutoStake(!autoStake)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    autoStake ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    autoStake ? 'translate-x-6' : 'translate-x-1'
                  }`} />
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

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 text-sm">{error}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handlePrepareClaim}
                disabled={!pointsAmount || pointsAmount < 100 || isLoading}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  'Prepare Claim'
                )}
              </button>
            </>
          )}

          {step === 'confirm' && claimData && (
            <>
              <div className="text-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-white">Ready to Claim</h3>
                <p className="text-gray-400 text-sm">Your claim has been prepared and signed</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Points</span>
                  <span className="text-white font-medium">{claimData.pointsAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">TRENCHY Amount</span>
                  <span className="text-white font-medium">{claimData.trenchyAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Auto-stake</span>
                  <span className="text-white font-medium">{autoStake ? 'Yes' : 'No'}</span>
                </div>
              </div>

              {claimData.monthlyStatus && (
                <div className="text-xs text-gray-500">
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
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleExecuteClaim}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    'Claim Now'
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Claim Successful!</h3>
              <p className="text-gray-400 mb-4">
                You have successfully claimed {claimData?.trenchyAmount} TRENCHY tokens
              </p>
              {transactionHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  View on BaseScan
                </a>
              )}
              <button
                onClick={handleClose}
                className="w-full mt-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
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
