import React, { useState, useEffect } from 'react';
import { Gift, X, CheckCircle, Loader2, AlertCircle, Users } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { LAUNCH_AIRDROP_ABI } from '../contracts/abis';
import { CONTRACTS } from '../utils/constants';
import { createLogger } from '../utils/logger';

const logger = createLogger('AirdropClaimModal');

/**
 * AirdropClaimModal
 *
 * FIX: Previously used `AIRDROP.CONTRACT_ADDRESS` which doesn't exist.
 *      The `AIRDROP` export from constants.js has config values but no
 *      CONTRACT_ADDRESS field. All three `useReadContract` calls received
 *      `address: undefined` and silently did nothing — slots remaining,
 *      eligibility, and claimed status were always undefined/0.
 *
 *      Fix: Use `CONTRACTS.AIRDROP` (set from VITE_AIRDROP_CONTRACT_ADDRESS
 *      env var). Added zero-address guard to prevent reads when not deployed.
 */
const AirdropClaimModal = ({ isOpen, onClose }) => {
  const { address, isConnected } = useAccount();
  const [isClaiming, setIsClaiming]     = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [error, setError]               = useState(null);

  // FIX: CONTRACTS.AIRDROP instead of AIRDROP.CONTRACT_ADDRESS
  const contractAddress = CONTRACTS.AIRDROP;
  const isDeployed = contractAddress &&
    contractAddress !== '0x0000000000000000000000000000000000000000';

  const { data: stats } = useReadContract({
    address:      contractAddress,
    abi:          LAUNCH_AIRDROP_ABI,
    functionName: 'getStats',
    enabled:      isOpen && isConnected && isDeployed,
  });

  const { data: isEligible } = useReadContract({
    address:      contractAddress,
    abi:          LAUNCH_AIRDROP_ABI,
    functionName: 'isEligible',
    args:         address ? [address] : undefined,
    enabled:      isOpen && isConnected && !!address && isDeployed,
  });

  const { data: hasClaimed } = useReadContract({
    address:      contractAddress,
    abi:          LAUNCH_AIRDROP_ABI,
    functionName: 'hasClaimed',
    args:         address ? [address] : undefined,
    enabled:      isOpen && isConnected && !!address && isDeployed,
  });

  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    if (isOpen) {
      setClaimSuccess(false);
      setError(null);
    }
  }, [isOpen]);

  const handleClaim = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }
    if (!isDeployed) {
      setError('Airdrop contract not yet deployed');
      return;
    }

    setIsClaiming(true);
    setError(null);

    try {
      await writeContractAsync({
        address:      contractAddress,
        abi:          LAUNCH_AIRDROP_ABI,
        functionName: 'claimAirdrop',
      });

      setClaimSuccess(true);
      logger.info('Airdrop claimed successfully', { address });
    } catch (err) {
      logger.error('Error claiming airdrop:', err);
      setError(err.message || 'Failed to claim airdrop. Please try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isOpen) return null;

  const remainingSlots   = stats ? Number(stats[1]) : 0;
  const totalRecipients  = stats ? Number(stats[0]) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-neutral-50 dark:bg-dark-900 border-2 border-primary/30 rounded-2xl w-full max-w-md shadow-2xl glow-primary animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Gift className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Launch Airdrop</h2>
              <p className="text-sm text-neutral-400">Claim your free TRENCHY tokens</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:bg-dark-700 transition-colors">
            <X size={20} className="text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!isConnected ? (
            <div className="text-center py-8">
              <AlertCircle size={48} className="mx-auto mb-4 text-neutral-500" />
              <p className="text-neutral-400">Connect your wallet to check eligibility</p>
            </div>
          ) : !isDeployed ? (
            <div className="text-center py-8">
              <AlertCircle size={48} className="mx-auto mb-4 text-yellow-500" />
              <p className="text-neutral-400">Airdrop contract not yet deployed</p>
            </div>
          ) : claimSuccess ? (
            <div className="text-center py-8">
              <CheckCircle size={64} className="mx-auto mb-4 text-green-400" />
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Airdrop Claimed!</h3>
              <p className="text-neutral-400 mb-4">You have successfully claimed 100 TRENCHY tokens.</p>
              <p className="text-sm text-neutral-500">Tokens will be available in your wallet shortly.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-primary mb-1">100</div>
                  <div className="text-xs text-neutral-400">TRENCHY per user</div>
                </div>
                <div className="bg-white dark:bg-dark-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-secondary mb-1">{remainingSlots.toLocaleString()}</div>
                  <div className="text-xs text-neutral-400">Slots remaining</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-neutral-400">Airdrop Progress</span>
                  <span className="text-neutral-900 dark:text-white">{totalRecipients}/1,000 claimed</span>
                </div>
                <div className="h-3 bg-neutral-100 dark:bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                    style={{ width: `${Math.min((totalRecipients / 1000) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-dark-800 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users size={20} className="text-neutral-400" />
                  <span className="text-sm text-neutral-400">Your Status</span>
                </div>
                {hasClaimed ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle size={20} /><span className="font-semibold">Already Claimed</span>
                  </div>
                ) : isEligible ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle size={20} /><span className="font-semibold">Eligible to Claim</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertCircle size={20} /><span className="font-semibold">Place a bet to qualify</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleClaim}
                disabled={isClaiming || hasClaimed || !isEligible || remainingSlots === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  hasClaimed
                    ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                    : !isEligible || remainingSlots === 0
                    ? 'bg-neutral-100 dark:bg-dark-700 text-neutral-500 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90 text-neutral-900 dark:text-white shadow-lg shadow-primary/25'
                }`}
              >
                {isClaiming ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" /> Claiming...
                  </span>
                ) : hasClaimed ? 'Already Claimed'
                  : remainingSlots === 0 ? 'Airdrop Ended'
                  : !isEligible ? 'Place a Bet First'
                  : 'Claim 100 TRENCHY'}
              </button>

              <p className="text-center text-xs text-neutral-500 mt-4">
                First 1,000 users who place a bet can claim. One claim per wallet.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AirdropClaimModal;