import { useState, useRef } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { parseAbiItem } from 'viem';
import { Upload, Send, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { createLogger } from '../utils/logger';

const logger = createLogger('VouchersTab');

// ABI for BetVouchers contract - only the functions we need
const BET_VOUCHERS_ABI = [
  {
    name: 'batchDistributeVouchers',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'users', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'campaignId', type: 'string' }
    ],
    outputs: [{ name: 'distributedCount', type: 'uint256' }]
  },
  {
    name: 'awardVoucher',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'reason', type: 'string' }
    ]
  }
];

export default function VouchersTab({ vouchersContractAddress }) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const fileInputRef = useRef(null);

  // State for batch upload
  const [csvData, setCsvData] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [isDistributing, setIsDistributing] = useState(false);
  const [campaignId, setCampaignId] = useState('waitlist_2025');

  // State for single voucher
  const [singleUser, setSingleUser] = useState('');
  const [singleAmount, setSingleAmount] = useState('10');
  const [singleReason, setSingleReason] = useState('manual_award');

  // Parse CSV format: address, amount
  // Example:
  // 0x123...456, 10
  // 0x789...abc, 15
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const data = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const [addressRaw, amountRaw] = line.split(',').map(s => s.trim());
      
      if (!addressRaw || !amountRaw) {
        logger.warn(`Skipping invalid line: ${line}`);
        continue;
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(addressRaw)) {
        logger.warn(`Invalid address: ${addressRaw}`);
        continue;
      }

      // Parse amount (convert to USDC with 6 decimals)
      const amountNum = parseFloat(amountRaw);
      if (isNaN(amountNum) || amountNum <= 0) {
        logger.warn(`Invalid amount: ${amountRaw}`);
        continue;
      }

      data.push({
        address: addressRaw.toLowerCase(),
        amount: Math.floor(amountNum * 1e6) // Convert to 6 decimals
      });
    }

    return data;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;

      setCsvData(text);
      const parsed = parseCSV(text);
      setParsedData(parsed);

      toast.success(`Parsed ${parsed.length} entries`);
      logger.info(`Parsed ${parsed.length} voucher entries from CSV`);
    };
    reader.readAsText(file);
  };

  const handleBatchDistribute = async () => {
    if (!parsedData || parsedData.length === 0) {
      toast.error('No valid data to distribute');
      return;
    }

    if (!campaignId.trim()) {
      toast.error('Campaign ID required');
      return;
    }

    try {
      setIsDistributing(true);

      const users = parsedData.map(d => d.address);
      const amounts = parsedData.map(d => d.amount);

      logger.info(`Distributing ${users.length} vouchers for campaign: ${campaignId}`);

      const tx = await writeContractAsync({
        address: vouchersContractAddress,
        abi: BET_VOUCHERS_ABI,
        functionName: 'batchDistributeVouchers',
        args: [users, amounts, campaignId]
      });

      toast.success(`✓ Distributed vouchers to ${parsedData.length} wallets`);
      logger.info(`Batch distribution complete: ${tx}`);

      // Reset
      setCsvData('');
      setParsedData(null);
      setCampaignId('waitlist_2025');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
      logger.error('Batch distribution error:', error);
    } finally {
      setIsDistributing(false);
    }
  };

  const handleSingleAward = async () => {
    if (!singleUser.trim()) {
      toast.error('User address required');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(singleUser)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    const amountNum = parseFloat(singleAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Invalid amount');
      return;
    }

    try {
      setIsDistributing(true);

      const amountInUsdc = Math.floor(amountNum * 1e6);

      logger.info(`Awarding $${amountNum} voucher to ${singleUser}`);

      const tx = await writeContractAsync({
        address: vouchersContractAddress,
        abi: BET_VOUCHERS_ABI,
        functionName: 'awardVoucher',
        args: [singleUser.toLowerCase(), amountInUsdc, singleReason]
      });

      toast.success(`✓ Awarded $${amountNum} to ${singleUser.slice(0, 6)}...`);
      logger.info(`Single award complete: ${tx}`);

      // Reset
      setSingleUser('');
      setSingleAmount('10');
      setSingleReason('manual_award');
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
      logger.error('Single award error:', error);
    } finally {
      setIsDistributing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Batch Distribution */}
      <div className="bg-white dark:bg-dark-800 border-2 border-neutral-200 dark:border-dark-600 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
          <Upload size={24} />
          Batch Voucher Campaign
        </h3>

        <div className="space-y-6">
          {/* Campaign ID */}
          <div>
            <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-2">
              Campaign ID
            </label>
            <input
              type="text"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="e.g., waitlist_2025, launch_promo"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-900 border-2 border-neutral-200 dark:border-dark-600 rounded-lg text-neutral-900 dark:text-white focus:border-primary outline-none"
            />
            <p className="text-xs text-neutral-500 mt-2">Used to track and identify the campaign</p>
          </div>

          {/* CSV Upload Instructions */}
          <div className="bg-neutral-100 dark:bg-dark-900/50 border-l-4 border-primary/30 p-4 rounded">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2 font-semibold">CSV Format:</p>
            <code className="text-xs text-neutral-400 block bg-white dark:bg-dark-950 p-3 rounded mt-2">
              0x123...abc, 10<br/>
              0x456...def, 15<br/>
              0x789...ghi, 20
            </code>
            <p className="text-xs text-neutral-500 mt-2">Each line: address, amount (in dollars)</p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-2">
              Upload CSV File
            </label>
            <div className="flex gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="flex-1 px-4 py-3 bg-neutral-50 dark:bg-dark-900 border-2 border-neutral-200 dark:border-dark-600 rounded-lg text-neutral-400 file:text-neutral-900 dark:text-white cursor-pointer"
              />
            </div>
          </div>

          {/* Preview */}
          {parsedData && parsedData.length > 0 && (
            <div className="bg-neutral-50 dark:bg-dark-900/30 border-2 border-primary/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-green-500" />
                <span className="font-semibold text-neutral-900 dark:text-white">{parsedData.length} valid entries</span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                {parsedData.slice(0, 10).map((entry, idx) => (
                  <div key={idx} className="text-neutral-400">
                    {entry.address.slice(0, 10)}... → ${(entry.amount / 1e6).toFixed(2)}
                  </div>
                ))}
                {parsedData.length > 10 && (
                  <div className="text-neutral-500 italic">+{parsedData.length - 10} more...</div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-dark-600">
                <p className="text-neutral-300">
                  Total vouchers: <span className="font-bold text-primary">
                    ${parsedData.reduce((sum, d) => sum + (d.amount / 1e6), 0).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Distribute Button */}
          <button
            onClick={handleBatchDistribute}
            disabled={!parsedData || parsedData.length === 0 || isDistributing}
            className="w-full px-6 py-3 bg-primary text-dark-950 font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {isDistributing ? 'Distributing...' : `Distribute ${parsedData?.length || 0} Vouchers`}
          </button>
        </div>
      </div>

      {/* Single Voucher Award */}
      <div className="bg-white dark:bg-dark-800 border-2 border-neutral-200 dark:border-dark-600 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3">
          <Send size={24} />
          Award Single Voucher
        </h3>

        <div className="space-y-5">
          {/* User Address */}
          <div>
            <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              value={singleUser}
              onChange={(e) => setSingleUser(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-900 border-2 border-neutral-200 dark:border-dark-600 rounded-lg text-neutral-900 dark:text-white focus:border-primary outline-none"
            />
          </div>

          {/* Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-2">
                Amount (USD)
              </label>
              <input
                type="number"
                value={singleAmount}
                onChange={(e) => setSingleAmount(e.target.value)}
                placeholder="10"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-900 border-2 border-neutral-200 dark:border-dark-600 rounded-lg text-neutral-900 dark:text-white focus:border-primary outline-none"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-semibold text-neutral-600 dark:text-neutral-300 mb-2">
                Reason
              </label>
              <select
                value={singleReason}
                onChange={(e) => setSingleReason(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-dark-900 border-2 border-neutral-200 dark:border-dark-600 rounded-lg text-neutral-900 dark:text-white focus:border-primary outline-none"
              >
                <option value="manual_award">Manual Award</option>
                <option value="contest_winner">Contest Winner</option>
                <option value="referral_bonus">Referral Bonus</option>
                <option value="engagement_reward">Engagement Reward</option>
                <option value="support_compensation">Support Compensation</option>
              </select>
            </div>
          </div>

          {/* Award Button */}
          <button
            onClick={handleSingleAward}
            disabled={isDistributing}
            className="w-full px-6 py-3 bg-primary text-dark-950 font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {isDistributing ? 'Awarding...' : `Award $${singleAmount} Voucher`}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-950/30 border-2 border-blue-500/30 rounded-lg p-4 flex gap-3">
        <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-neutral-300">
          <p className="font-semibold text-blue-300 mb-1">💡 Vouchers are non-withdrawable</p>
          Users can only spend them on bets, not withdraw as tokens. Perfect for campaigns!
        </div>
      </div>
    </div>
  );
}
