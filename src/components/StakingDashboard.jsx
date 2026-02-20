import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { 
  Shield, 
  TrendingUp, 
  Percent, 
  Clock, 
  Lock,
  Unlock,
  ChevronRight,
  Award
} from 'lucide-react';
import { useStaking } from '../hooks/useStaking';

const TIER_CONFIG = {
  0: { name: 'None', color: 'gray', icon: null },
  1: { name: 'Bronze', color: 'orange', icon: Award },
  2: { name: 'Silver', color: 'slate', icon: Award },
  3: { name: 'Gold', color: 'yellow', icon: Award },
  4: { name: 'Diamond', color: 'blue', icon: Shield }
};

const StakingDashboard = () => {
  const { address } = useAccount();
  const { stakeInfo, stake, unstake, requestUnstake, canUnstake, isLoading } = useStaking();
  const [stakeAmount, setStakeAmount] = useState('');
  const [activeTab, setActiveTab] = useState('stake'); // 'stake' or 'unstake'

  const currentTier = TIER_CONFIG[stakeInfo?.tier || 0];
  const TierIcon = currentTier.icon;

  const formatAmount = (amount) => {
    if (!amount) return '0';
    return (Number(amount) / 1e18).toLocaleString();
  };

  const formatTime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Staking</h1>
          <p className="text-gray-400">Stake TRENCHY to earn points boost and fee discounts</p>
        </div>

        {/* Current Tier Card */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 bg-${currentTier.color}-500/20 rounded-full flex items-center justify-center`}>
                {TierIcon && <TierIcon className={`w-8 h-8 text-${currentTier.color}-400`} />}
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Current Tier</div>
                <div className="text-2xl font-bold">{currentTier.name}</div>
                <div className="text-sm text-gray-400">
                  {formatAmount(stakeInfo?.amount)} TRENCHY staked
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Benefits</div>
              <div className="text-green-400 font-semibold">+{stakeInfo?.pointsBoost || 0}% Points</div>
              <div className="text-blue-400 font-semibold">{stakeInfo?.feeDiscount || 0}% Fee Discount</div>
            </div>
          </div>
        </div>

        {/* Tier Progression */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Tier Progression</h3>
          <div className="space-y-4">
            {[
              { tier: 1, name: 'Bronze', threshold: 1000, boost: 10, discount: 0, color: 'orange' },
              { tier: 2, name: 'Silver', threshold: 5000, boost: 25, discount: 25, color: 'slate' },
              { tier: 3, name: 'Gold', threshold: 10000, boost: 50, discount: 50, color: 'yellow' },
              { tier: 4, name: 'Diamond', threshold: 50000, boost: 100, discount: 75, color: 'blue' }
            ].map((tier) => {
              const isActive = stakeInfo?.tier >= tier.tier;
              const isCurrent = stakeInfo?.tier === tier.tier;
              
              return (
                <div 
                  key={tier.tier}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    isCurrent ? `bg-${tier.color}-500/10 border border-${tier.color}-500/30` : 
                    isActive ? 'bg-green-500/10' : 'bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-${tier.color}-500/20 rounded-full flex items-center justify-center`}>
                      <Award className={`w-5 h-5 text-${tier.color}-400`} />
                    </div>
                    <div>
                      <div className="font-semibold">{tier.name}</div>
                      <div className="text-sm text-gray-400">{tier.threshold.toLocaleString()} TRENCHY</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 text-sm">+{tier.boost}% Points</div>
                    <div className="text-blue-400 text-sm">{tier.discount}% Fee Discount</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stake/Unstake Tabs */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setActiveTab('stake')}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'stake' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              <Lock className="w-4 h-4 inline mr-2" />
              Stake
            </button>
            <button
              onClick={() => setActiveTab('unstake')}
              className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'unstake' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              <Unlock className="w-4 h-4 inline mr-2" />
              Unstake
            </button>
          </div>

          {activeTab === 'stake' ? (
            <div>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Amount to Stake</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button className="px-4 py-3 bg-gray-700 rounded-lg text-sm text-gray-400 hover:text-white">
                    MAX
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => stake(stakeAmount)}
                disabled={!stakeAmount || isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Staking...' : 'Stake TRENCHY'}
              </button>
              
              <p className="text-sm text-gray-500 mt-4 text-center">
                Staked tokens are locked for 7 days after unstake request
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4 p-4 bg-gray-700/50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Staked Amount</span>
                  <span className="font-semibold">{formatAmount(stakeInfo?.amount)} TRENCHY</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Unlock Time</span>
                  <span className="font-semibold text-yellow-400">
                    {stakeInfo?.unlockTime > 0 
                      ? formatTime(stakeInfo.unlockTime - Math.floor(Date.now() / 1000))
                      : 'Ready'
                    }
                  </span>
                </div>
              </div>

              {stakeInfo?.unlockTime === 0 ? (
                <button
                  onClick={() => requestUnstake(stakeInfo?.amount)}
                  disabled={!stakeInfo?.amount || isLoading}
                  className="w-full py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Request Unstake'}
                </button>
              ) : (
                <button
                  onClick={() => unstake(stakeInfo?.amount)}
                  disabled={!canUnstake?.canUnstake || isLoading}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Processing...' : 'Complete Unstake'}
                </button>
              )}
              
              <p className="text-sm text-gray-500 mt-4 text-center">
                {stakeInfo?.unlockTime === 0 
                  ? 'Requesting unstake starts a 7-day cooldown period'
                  : 'Your tokens are in the cooldown period'
                }
              </p>
            </div>
          )}
        </div>

        {/* Benefits Info */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="font-semibold">Points Boost</div>
              <div className="text-sm text-gray-400">Earn more points on every bet</div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Percent className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="font-semibold">Fee Discount</div>
              <div className="text-sm text-gray-400">Pay less fees on winnings</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakingDashboard;
