import React from 'react';
import { 
  Plus, 
  TrendingUp, 
  BarChart3, 
  Target, 
  Timer, 
  Loader2, 
  CheckCircle, 
  XCircle 
} from 'lucide-react';

const CreateTab = ({
  marketType,
  setMarketType,
  binaryForm,
  setBinaryForm,
  multiChoiceForm,
  setMultiChoiceForm,
  rangeForm,
  setRangeForm,
  timeForm,
  setTimeForm,
  currentAssetPrice,
  isPriceLoading,
  createStatus,
  handleCreate,
  isPending,
  isConfirming
}) => {
  const MARKET_TYPES = [
    { type: 'binary', icon: TrendingUp, label: 'Binary' },
    { type: 'multi', icon: BarChart3, label: 'Multi-Choice' },
    { type: 'range', icon: Target, label: 'Range' },
    { type: 'time', icon: Timer, label: 'Time-Based' },
  ];

  // Helper to format price display
  const formatPrice = (price) => {
    if (!price) return '---';
    return price > 1000 
      ? price.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Market Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {MARKET_TYPES.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => setMarketType(type)}
            className={`p-4 rounded-xl border-2 transition-all ${
              marketType === type 
                ? 'bg-[#c0ff00]/20 border-[#c0ff00] shadow-lg shadow-[#c0ff00]/20' 
                : 'bg-dark-800/50 border-dark-700 hover:border-[#c0ff00]/50'
            }`}
          >
            <Icon className={`mx-auto mb-2 ${marketType === type ? 'text-[#c0ff00]' : 'text-gray-400'}`} size={24} />
            <div className={`text-sm font-semibold ${marketType === type ? 'text-[#c0ff00]' : 'text-gray-300'}`}>{label}</div>
          </button>
        ))}
      </div>

      {/* Binary Form */}
      {marketType === 'binary' && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-4 border border-dark-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <TrendingUp size={20} className="text-[#c0ff00]" />
            Create Binary Market
          </h3>
          
          <div className="space-y-4">
            {/* Price Display */}
            <div className="bg-dark-900/50 p-3 rounded-lg text-center mb-4 border border-dark-700">
              {isPriceLoading ? (
                <span className="text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={14} /> Fetching price...
                </span>
              ) : currentAssetPrice ? (
                <span className="text-yellow-400 font-mono font-bold">
                  Current Price: ${formatPrice(currentAssetPrice)}
                </span>
              ) : (
                <span className="text-red-400 text-sm">Could not fetch live price (Check Asset)</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Asset</label>
                <select 
                  value={binaryForm.asset} 
                  onChange={(e) => setBinaryForm('asset', e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors"
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="SOL">Solana (SOL)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (mins)</label>
                <input 
                  type="number" 
                  value={binaryForm.duration} 
                  onChange={(e) => setBinaryForm('duration', parseInt(e.target.value) || 0)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                />
              </div>
            </div>
            
            {/* Odds Toggle & Inputs */}
            <div className="flex items-center gap-3 p-4 bg-[#c0ff00]/10 border border-[#c0ff00]/30 rounded-lg">
              <input 
                type="checkbox" 
                id="binaryFixedOdds" 
                checked={binaryForm.useFixedOdds} 
                onChange={(e) => setBinaryForm('useFixedOdds', e.target.checked)}
                className="w-5 h-5 rounded border-dark-600 text-[#c0ff00] focus:ring-[#c0ff00] focus:ring-offset-dark-800" 
              />
              <label htmlFor="binaryFixedOdds" className="text-sm font-semibold cursor-pointer select-none text-[#c0ff00]">
                Use Fixed Odds (Casino Mode)
              </label>
            </div>
            
            {binaryForm.useFixedOdds && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-sm font-semibold text-[#00FF88] mb-2">UP Multiplier (200 = 2.0x)</label>
                  <input 
                    type="number" 
                    value={binaryForm.yesMultiplier} 
                    onChange={(e) => setBinaryForm('yesMultiplier', parseInt(e.target.value) || 0)}
                    className="w-full bg-dark-800 border border-[#00FF88]/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00FF88] transition-colors" 
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Payout: {(binaryForm.yesMultiplier / 100).toFixed(2)}x
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-red-400 mb-2">DOWN Multiplier (200 = 2.0x)</label>
                  <input 
                    type="number" 
                    value={binaryForm.noMultiplier} 
                    onChange={(e) => setBinaryForm('noMultiplier', parseInt(e.target.value) || 0)}
                    className="w-full bg-dark-800 border border-red-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" 
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Payout: {(binaryForm.noMultiplier / 100).toFixed(2)}x
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Choice Form */}
      {marketType === 'multi' && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-4 border border-dark-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <BarChart3 size={20} className="text-[#c0ff00]" />
            Multi-Choice Market
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Question</label>
              <input 
                type="text" 
                value={multiChoiceForm.question} 
                onChange={(e) => setMultiChoiceForm('question', e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                placeholder="Which coin will pump the most?" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Asset Category</label>
                <select 
                  value={multiChoiceForm.asset} 
                  onChange={(e) => setMultiChoiceForm('asset', e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors"
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="SOL">Solana (SOL)</option>
                  <option value="CRYPTO">General Crypto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (mins)</label>
                <input 
                  type="number" 
                  value={multiChoiceForm.duration} 
                  onChange={(e) => setMultiChoiceForm('duration', parseInt(e.target.value) || 0)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                />
              </div>
            </div>

            {/* Fixed Odds Toggle */}
            <div className="flex items-center gap-3 p-4 bg-[#c0ff00]/10 border border-[#c0ff00]/30 rounded-lg">
              <input 
                type="checkbox" 
                id="multiFixedOdds" 
                checked={multiChoiceForm.useFixedOdds} 
                onChange={(e) => setMultiChoiceForm('useFixedOdds', e.target.checked)}
                className="w-5 h-5 rounded border-dark-600 text-[#c0ff00] focus:ring-[#c0ff00] focus:ring-offset-dark-800" 
              />
              <label htmlFor="multiFixedOdds" className="text-sm font-semibold cursor-pointer select-none text-[#c0ff00]">
                Use Fixed Odds
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Options</label>
              {multiChoiceForm.options.map((option, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={option} 
                    onChange={(e) => { 
                      const n = [...multiChoiceForm.options]; 
                      n[idx] = e.target.value; 
                      setMultiChoiceForm('options', n); 
                    }} 
                    className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                    placeholder={`Option ${idx + 1}`} 
                  />
                  {multiChoiceForm.useFixedOdds && (
                    <input
                      type="number"
                      value={multiChoiceForm.multipliers[idx] || 200}
                      onChange={(e) => {
                        const n = [...multiChoiceForm.multipliers];
                        n[idx] = parseInt(e.target.value) || 200;
                        setMultiChoiceForm('multipliers', n);
                      }}
                      className="w-24 bg-dark-800 border border-[#c0ff00]/30 rounded-lg px-2 py-2 text-white text-center focus:outline-none focus:border-[#c0ff00] transition-colors"
                      placeholder="2.0x"
                    />
                  )}
                  {idx >= 2 && (
                    <button 
                      onClick={() => { 
                        const n = multiChoiceForm.options.filter((_, i) => i !== idx); 
                        const m = multiChoiceForm.multipliers.filter((_, i) => i !== idx);
                        setMultiChoiceForm('options', n);
                        setMultiChoiceForm('multipliers', m);
                      }} 
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {multiChoiceForm.options.length < 10 && (
                <button 
                  onClick={() => {
                    setMultiChoiceForm('options', [...multiChoiceForm.options, '']);
                    setMultiChoiceForm('multipliers', [...multiChoiceForm.multipliers, 200]);
                  }} 
                  className="w-full py-2 bg-[#c0ff00]/20 hover:bg-[#c0ff00]/30 text-[#c0ff00] rounded-lg text-sm font-semibold transition-colors"
                >
                  + Add Option
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Range Form */}
      {marketType === 'range' && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-4 border border-dark-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Target size={20} className="text-[#c0ff00]" />
            Range Market
          </h3>
          
          <div className="space-y-4">
            {/* Price Display */}
            <div className="bg-dark-900/50 p-3 rounded-lg text-center mb-4 border border-dark-700">
              {isPriceLoading ? (
                <span className="text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={14} /> Fetching price...
                </span>
              ) : currentAssetPrice ? (
                <span className="text-yellow-400 font-mono font-bold">
                  Current {rangeForm.asset} Price: ${formatPrice(currentAssetPrice)}
                </span>
              ) : (
                <span className="text-red-400 text-sm">Could not fetch live price (Check Asset)</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Asset</label>
                <select 
                  value={rangeForm.asset} 
                  onChange={(e) => setRangeForm('asset', e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors"
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="SOL">Solana (SOL)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (mins)</label>
                <input 
                  type="number" 
                  value={rangeForm.duration} 
                  onChange={(e) => setRangeForm('duration', parseInt(e.target.value) || 0)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                />
              </div>
            </div>

            {/* Fixed Odds Toggle */}
            <div className="flex items-center gap-3 p-4 bg-[#c0ff00]/10 border border-[#c0ff00]/30 rounded-lg">
              <input 
                type="checkbox" 
                id="rangeFixedOdds" 
                checked={rangeForm.useFixedOdds} 
                onChange={(e) => setRangeForm('useFixedOdds', e.target.checked)}
                className="w-5 h-5 rounded border-dark-600 text-[#c0ff00] focus:ring-[#c0ff00] focus:ring-offset-dark-800" 
              />
              <label htmlFor="rangeFixedOdds" className="text-sm font-semibold cursor-pointer select-none text-[#c0ff00]">
                Use Fixed Odds
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Price Ranges</label>
              {rangeForm.ranges.map((range, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-center">
                  <input 
                    type="number" 
                    value={range.min} 
                    onChange={(e) => { 
                      const n = [...rangeForm.ranges]; 
                      n[idx] = { ...n[idx], min: parseFloat(e.target.value) || 0 }; 
                      setRangeForm('ranges', n); 
                    }} 
                    className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                    placeholder="Min" 
                  />
                  <span className="text-gray-400 font-bold">-</span>
                  <input 
                    type="number" 
                    value={range.max} 
                    onChange={(e) => { 
                      const n = [...rangeForm.ranges]; 
                      n[idx] = { ...n[idx], max: parseFloat(e.target.value) || 0 }; 
                      setRangeForm('ranges', n); 
                    }} 
                    className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                    placeholder="Max" 
                  />
                  {rangeForm.useFixedOdds && (
                    <input
                      type="number"
                      value={rangeForm.multipliers[idx] || 200}
                      onChange={(e) => {
                        const n = [...rangeForm.multipliers];
                        n[idx] = parseInt(e.target.value) || 200;
                        setRangeForm('multipliers', n);
                      }}
                      className="w-20 bg-dark-800 border border-[#c0ff00]/30 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-[#c0ff00] transition-colors"
                      placeholder="2.0x"
                    />
                  )}
                  {idx >= 2 && (
                    <button 
                      onClick={() => { 
                        const n = rangeForm.ranges.filter((_, i) => i !== idx); 
                        const m = rangeForm.multipliers.filter((_, i) => i !== idx);
                        setRangeForm('ranges', n);
                        setRangeForm('multipliers', m);
                      }} 
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {rangeForm.ranges.length < 10 && (
                <button 
                  onClick={() => {
                    setRangeForm('ranges', [...rangeForm.ranges, { min: 0, max: 0 }]);
                    setRangeForm('multipliers', [...rangeForm.multipliers, 200]);
                  }} 
                  className="w-full py-2 bg-[#c0ff00]/20 hover:bg-[#c0ff00]/30 text-[#c0ff00] rounded-lg text-sm font-semibold transition-colors"
                >
                  + Add Range
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Time-Based Form */}
      {marketType === 'time' && (
        <div className="bg-dark-800/50 rounded-xl p-6 mb-4 border border-dark-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Timer size={20} className="text-[#c0ff00]" />
            Time-Based Market
          </h3>
          
          <div className="space-y-4">
            {/* Price Display */}
            <div className="bg-dark-900/50 p-3 rounded-lg text-center mb-4 border border-dark-700">
              {isPriceLoading ? (
                <span className="text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={14} /> Fetching price...
                </span>
              ) : currentAssetPrice ? (
                <span className="text-yellow-400 font-mono font-bold">
                  Current {timeForm.asset} Price: ${formatPrice(currentAssetPrice)}
                </span>
              ) : (
                <span className="text-red-400 text-sm">Could not fetch live price (Check Asset)</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Asset</label>
                <select 
                  value={timeForm.asset} 
                  onChange={(e) => setTimeForm('asset', e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors"
                >
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="SOL">Solana (SOL)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Target Price ($)</label>
                <input 
                  type="number" 
                  value={timeForm.targetPrice} 
                  onChange={(e) => setTimeForm('targetPrice', parseFloat(e.target.value) || 0)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                  placeholder="e.g. 100000" 
                />
              </div>
            </div>

            {/* Fixed Odds Toggle */}
            <div className="flex items-center gap-3 p-4 bg-[#c0ff00]/10 border border-[#c0ff00]/30 rounded-lg">
              <input 
                type="checkbox" 
                id="timeFixedOdds" 
                checked={timeForm.useFixedOdds} 
                onChange={(e) => setTimeForm('useFixedOdds', e.target.checked)}
                className="w-5 h-5 rounded border-dark-600 text-[#c0ff00] focus:ring-[#c0ff00] focus:ring-offset-dark-800" 
              />
              <label htmlFor="timeFixedOdds" className="text-sm font-semibold cursor-pointer select-none text-[#c0ff00]">
                Use Fixed Odds
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Timeframes</label>
              {timeForm.timeframes.map((tf, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={tf.label} 
                    onChange={(e) => { 
                      const n = [...timeForm.timeframes]; 
                      n[idx] = { ...n[idx], label: e.target.value }; 
                      setTimeForm('timeframes', n); 
                    }} 
                    className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                    placeholder="Label (e.g. 24h)" 
                  />
                  <input 
                    type="number" 
                    value={tf.seconds} 
                    onChange={(e) => { 
                      const n = [...timeForm.timeframes]; 
                      n[idx] = { ...n[idx], seconds: parseInt(e.target.value) || 0 }; 
                      setTimeForm('timeframes', n); 
                    }} 
                    className="w-32 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                    placeholder="Seconds" 
                  />
                  {timeForm.useFixedOdds && (
                    <input
                      type="number"
                      value={timeForm.multipliers[idx] || 200}
                      onChange={(e) => {
                        const n = [...timeForm.multipliers];
                        n[idx] = parseInt(e.target.value) || 200;
                        setTimeForm('multipliers', n);
                      }}
                      className="w-20 bg-dark-800 border border-[#c0ff00]/30 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-[#c0ff00] transition-colors"
                      placeholder="2.0x"
                    />
                  )}
                  {idx >= 2 && (
                    <button 
                      onClick={() => { 
                        const n = timeForm.timeframes.filter((_, i) => i !== idx); 
                        const m = timeForm.multipliers.filter((_, i) => i !== idx);
                        setTimeForm('timeframes', n);
                        setTimeForm('multipliers', m);
                      }} 
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {timeForm.timeframes.length < 5 && (
                <button 
                  onClick={() => {
                    setTimeForm('timeframes', [...timeForm.timeframes, { label: '', seconds: 0 }]);
                    setTimeForm('multipliers', [...timeForm.multipliers, 200]);
                  }} 
                  className="w-full py-2 bg-[#c0ff00]/20 hover:bg-[#c0ff00]/30 text-[#c0ff00] rounded-lg text-sm font-semibold transition-colors"
                >
                  + Add Timeframe
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Status & Button */}
      {createStatus.show && (
        <div className={`p-4 rounded-xl border-2 flex items-center gap-3 mb-4 ${createStatus.success ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
          {createStatus.success ? <CheckCircle className="text-green-400" size={24} /> : <XCircle className="text-red-400" size={24} />}
          <span className="flex-1">{createStatus.message}</span>
        </div>
      )}

      <button 
        onClick={handleCreate} 
        disabled={isPending || isConfirming} 
        className="w-full bg-[#c0ff00] hover:bg-[#d4ff33] disabled:bg-gray-700 text-dark-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg shadow-lg shadow-[#c0ff00]/20 transition-all hover:scale-[1.02] disabled:hover:scale-100"
      >
        {isPending ? (
          <><Loader2 className="animate-spin" size={24} />Confirm in Wallet...</>
        ) : isConfirming ? (
          <><Loader2 className="animate-spin" size={24} />Creating Market...</>
        ) : (
          <><Plus size={24} />Create Market</>
        )}
      </button>
    </div>
  );
};

export default CreateTab;
