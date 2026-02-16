import React from 'react';
import { 
  Plus, 
  TrendingUp, 
  BarChart3, 
  Target, 
  Timer, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Zap,
  Clock,
  DollarSign,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { generateQuickRanges, getTimeframePresets, formatPriceDisplay, DECAY_CONFIG } from '../marketUtils';


/**
 * CreateTab Component - Admin market creation interface
 * Supports 4 market types: Binary, Multi-Choice, Range, Time-Based
 * Features: Live price feeds, fixed odds, quick presets, visual indicators
 */
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
  // ============================================================
  // CONSTANTS
  // ============================================================
  
  const MARKET_TYPES = [
    { type: 'binary', icon: TrendingUp, label: 'Binary', description: 'UP or DOWN' },
    { type: 'multi', icon: BarChart3, label: 'Multi-Choice', description: '2-10 options' },
    { type: 'range', icon: Target, label: 'Range', description: 'Price bands' },
    { type: 'time', icon: Timer, label: 'Time-Based', description: 'Hit target' },
  ];

  const ASSETS = [
    { value: 'BTC', label: 'Bitcoin (BTC)' },
    { value: 'ETH', label: 'Ethereum (ETH)' },
    { value: 'SOL', label: 'Solana (SOL)' },
  ];

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const formatPrice = (price) => {
    if (!price) return '---';
    return formatPriceDisplay(price);
  };

  const handleQuickRange = (percent) => {
    if (!currentAssetPrice) return;
    const newRanges = generateQuickRanges(currentAssetPrice, percent, 3);
    setRangeForm('ranges', newRanges);
    if (rangeForm.multipliers.length !== newRanges.length) {
      setRangeForm('multipliers', new Array(newRanges.length).fill(200));
    }
  };

  const handleTimeframePreset = (seconds) => {
    const currentTimeframes = timeForm.timeframes;
    const exists = currentTimeframes.some(tf => tf.seconds === seconds);
    if (!exists && currentTimeframes.length < 5) {
      const preset = getTimeframePresets().find(p => p.seconds === seconds);
      setTimeForm('timeframes', [...currentTimeframes, { label: preset.label, seconds }]);
      setTimeForm('multipliers', [...timeForm.multipliers, 200]);
    }
  };

  // ============================================================
  // REUSABLE COMPONENTS
  // ============================================================

  const PriceDisplay = ({ asset, showTarget = false, targetPrice = null }) => (
    <div className="bg-dark-900/50 p-4 rounded-lg mb-4 border border-dark-700">
      {isPriceLoading ? (
        <span className="text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={14} /> Fetching price...
        </span>
      ) : currentAssetPrice ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm flex items-center gap-2">
              <DollarSign size={14} />
              Current {asset} Price
            </span>
            <span className="text-yellow-400 font-mono font-bold text-lg">
              ${formatPrice(currentAssetPrice)}
            </span>
          </div>
          {showTarget && targetPrice > 0 && (
            <div className="text-xs text-gray-400 text-right">
              Target: ${formatPrice(targetPrice)} (
              {((targetPrice - currentAssetPrice) / currentAssetPrice * 100).toFixed(1)}% 
              {targetPrice > currentAssetPrice ? ' ↑' : ' ↓'})
            </div>
          )}
        </div>
      ) : (
        <span className="text-red-400 text-sm">Could not fetch live price</span>
      )}
    </div>
  );

  const AssetSelector = ({ value, onChange }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-2">Asset</label>
      <select 
        value={value} 
        onChange={(e) => onChange('asset', e.target.value)}
        className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors"
      >
        {ASSETS.map(asset => (
          <option key={asset.value} value={asset.value}>{asset.label}</option>
        ))}
      </select>
    </div>
  );

  const DurationInput = ({ value, onChange }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (mins)</label>
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange('duration', parseInt(e.target.value) || 0)}
        className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#c0ff00] transition-colors"
        min="1"
        placeholder="e.g. 15"
      />
    </div>
  );

  const FixedOddsToggle = ({ id, checked, onChange }) => (
    <div className="flex items-center gap-3 p-4 bg-[#c0ff00]/10 border border-[#c0ff00]/30 rounded-lg">
      <input 
        type="checkbox" 
        id={id}
        checked={checked} 
        onChange={(e) => onChange('useFixedOdds', e.target.checked)}
        className="w-5 h-5 rounded border-dark-600 text-[#c0ff00] focus:ring-[#c0ff00] focus:ring-offset-dark-800" 
      />
      <label htmlFor={id} className="text-sm font-semibold cursor-pointer select-none text-[#c0ff00]">
        Use Fixed Odds (Casino Mode)
      </label>
    </div>
  );

  const TimeDecayConfig = ({ config, onChange, duration }) => (
    <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg space-y-4">
      <div className="flex items-center gap-3">
        <input 
          type="checkbox" 
          id="useTimeDecay"
          checked={config.useTimeDecay} 
          onChange={(e) => onChange('useTimeDecay', e.target.checked)}
          className="w-5 h-5 rounded border-dark-600 text-orange-500 focus:ring-orange-500 focus:ring-offset-dark-800" 
        />
        <label htmlFor="useTimeDecay" className="text-sm font-semibold cursor-pointer select-none text-orange-400 flex items-center gap-2">
          <TrendingDown size={16} />
          Enable Time-Decaying Odds
        </label>
      </div>
      
      {config.useTimeDecay && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-2 text-xs text-orange-300/80 bg-orange-500/10 p-2 rounded">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>
              Odds will decrease linearly from full multiplier to minimum over time. 
              Early bettors get better odds!
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-orange-400 mb-2">
                Decay Starts At
              </label>
              <select
                value={config.decayStartPercent}
                onChange={(e) => onChange('decayStartPercent', parseInt(e.target.value))}
                className="w-full bg-dark-800 border border-orange-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
              >
                {DECAY_CONFIG.START_PERCENT_OPTIONS.map(percent => (
                  <option key={percent} value={percent}>
                    {percent}% of duration ({Math.round((duration * percent) / 100)}m)
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Odds start decaying after this time
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-orange-400 mb-2">
                Minimum Odds Floor
              </label>
              <select
                value={config.minMultiplier}
                onChange={(e) => onChange('minMultiplier', parseInt(e.target.value))}
                className="w-full bg-dark-800 border border-orange-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
              >
                {DECAY_CONFIG.MIN_ODDS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                Lowest odds at market end
              </div>
            </div>
          </div>
          
          {/* Visual decay preview */}
          <div className="bg-dark-900/50 p-3 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">Decay Preview:</div>
            <div className="relative h-8 bg-dark-800 rounded-lg overflow-hidden">
              {/* Full odds phase */}
              <div 
                className="absolute left-0 top-0 h-full bg-green-500/30 flex items-center justify-center text-xs text-green-400 font-semibold"
                style={{ width: `${config.decayStartPercent}%` }}
              >
                Full Odds
              </div>
              {/* Decay phase */}
              <div 
                className="absolute top-0 h-full bg-gradient-to-r from-green-500/30 via-yellow-500/30 to-red-500/30 flex items-center justify-center text-xs text-white font-semibold"
                style={{ 
                  left: `${config.decayStartPercent}%`, 
                  width: `${100 - config.decayStartPercent}%` 
                }}
              >
                Decaying → {(config.minMultiplier / 100).toFixed(1)}x
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Start</span>
              <span style={{ marginLeft: `${config.decayStartPercent - 10}%` }}>Decay begins</span>
              <span>End</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );


  const MultiplierInput = ({ value, onChange, label, color = '[#c0ff00]' }) => (
    <div>
      <label className={`block text-sm font-semibold text-${color} mb-2`}>
        {label} (200 = 2.0x)
      </label>
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value) || 200)}
        className={`w-full bg-dark-800 border border-${color}/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-${color} transition-colors`}
        min="100"
        max="1000"
      />
      <div className="text-xs text-gray-400 mt-1">
        Payout: {(value / 100).toFixed(2)}x
      </div>
    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Market Type Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MARKET_TYPES.map(({ type, icon: Icon, label, description }) => (
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
            <div className={`text-sm font-semibold ${marketType === type ? 'text-[#c0ff00]' : 'text-gray-300'}`}>
              {label}
            </div>
            <div className="text-xs text-gray-500 mt-1">{description}</div>
          </button>
        ))}
      </div>

      {/* ========================================== */}
      {/* BINARY MARKET FORM */}
      {/* ========================================== */}
      {marketType === 'binary' && (
        <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <TrendingUp size={20} className="text-[#c0ff00]" />
            Create Binary Market
          </h3>
          
          <div className="space-y-4">
            <PriceDisplay asset={binaryForm.asset} />

            <div className="grid grid-cols-2 gap-4">
              <AssetSelector value={binaryForm.asset} onChange={setBinaryForm} />
              <DurationInput value={binaryForm.duration} onChange={setBinaryForm} />
            </div>
            
            <FixedOddsToggle 
              id="binaryFixedOdds" 
              checked={binaryForm.useFixedOdds} 
              onChange={setBinaryForm} 
            />
            
            {binaryForm.useFixedOdds && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <MultiplierInput
                  value={binaryForm.yesMultiplier}
                  onChange={(val) => setBinaryForm('yesMultiplier', val)}
                  label="UP Multiplier"
                  color="[#00FF88]"
                />
                <MultiplierInput
                  value={binaryForm.noMultiplier}
                  onChange={(val) => setBinaryForm('noMultiplier', val)}
                  label="DOWN Multiplier"
                  color="red-400"
                />
              </div>
            )}
            
            {/* Time Decay Configuration */}
            <TimeDecayConfig 
              config={binaryForm}
              onChange={setBinaryForm}
              duration={binaryForm.duration}
            />
          </div>
        </div>
      )}


      {/* ========================================== */}
      {/* MULTI-CHOICE MARKET FORM */}
      {/* ========================================== */}
      {marketType === 'multi' && (
        <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-700">
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
              <AssetSelector value={multiChoiceForm.asset} onChange={setMultiChoiceForm} />
              <DurationInput value={multiChoiceForm.duration} onChange={setMultiChoiceForm} />
            </div>

            <FixedOddsToggle 
              id="multiFixedOdds" 
              checked={multiChoiceForm.useFixedOdds} 
              onChange={setMultiChoiceForm} 
            />

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Options (2-10)
              </label>
              {multiChoiceForm.options.map((option, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={option} 
                    onChange={(e) => { 
                      const newOptions = [...multiChoiceForm.options]; 
                      newOptions[idx] = e.target.value; 
                      setMultiChoiceForm('options', newOptions); 
                    }} 
                    className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                    placeholder={`Option ${idx + 1}`} 
                  />
                  {multiChoiceForm.useFixedOdds && (
                    <input
                      type="number"
                      value={multiChoiceForm.multipliers[idx] || 200}
                      onChange={(e) => {
                        const newMultipliers = [...multiChoiceForm.multipliers];
                        newMultipliers[idx] = parseInt(e.target.value) || 200;
                        setMultiChoiceForm('multipliers', newMultipliers);
                      }}
                      className="w-24 bg-dark-800 border border-[#c0ff00]/30 rounded-lg px-2 py-2 text-white text-center focus:outline-none focus:border-[#c0ff00] transition-colors"
                      placeholder="2.0x"
                      min="100"
                      max="1000"
                    />
                  )}
                  {idx >= 2 && (
                    <button 
                      onClick={() => { 
                        const newOptions = multiChoiceForm.options.filter((_, i) => i !== idx); 
                        const newMultipliers = multiChoiceForm.multipliers.filter((_, i) => i !== idx);
                        setMultiChoiceForm('options', newOptions);
                        setMultiChoiceForm('multipliers', newMultipliers);
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
            
            {/* Time Decay Configuration */}
            <TimeDecayConfig 
              config={multiChoiceForm}
              onChange={setMultiChoiceForm}
              duration={multiChoiceForm.duration}
            />
          </div>
        </div>
      )}


      {/* ========================================== */}
      {/* RANGE MARKET FORM */}
      {/* ========================================== */}
      {marketType === 'range' && (
        <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Target size={20} className="text-[#c0ff00]" />
            Range Market
          </h3>
          
          <div className="space-y-4">
            {/* Enhanced Price Display with Visual Position */}
            <div className="bg-dark-900/50 p-4 rounded-lg mb-4 border border-dark-700">
              {isPriceLoading ? (
                <span className="text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={14} /> Fetching price...
                </span>
              ) : currentAssetPrice ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm flex items-center gap-2">
                      <DollarSign size={14} />
                      Current {rangeForm.asset} Price
                    </span>
                    <span className="text-yellow-400 font-mono font-bold text-lg">
                      ${formatPrice(currentAssetPrice)}
                    </span>
                  </div>
                  
                  {/* Visual Price Position Bar */}
                  {rangeForm.ranges.length > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>${formatPrice(Math.min(...rangeForm.ranges.map(r => r.min || Infinity)))}</span>
                        <span className="text-[#c0ff00]">Current</span>
                        <span>${formatPrice(Math.max(...rangeForm.ranges.map(r => r.max || 0)))}</span>
                      </div>
                      <div className="relative h-3 bg-dark-800 rounded-full overflow-hidden">
                        {/* Range bands */}
                        <div className="absolute inset-0 flex">
                          {rangeForm.ranges.map((range, idx) => {
                            const min = range.min || 0;
                            const max = range.max || 0;
                            const allMin = Math.min(...rangeForm.ranges.map(r => r.min || min));
                            const allMax = Math.max(...rangeForm.ranges.map(r => r.max || max));
                            const totalRange = allMax - allMin || 1;
                            const left = ((min - allMin) / totalRange) * 100;
                            const width = ((max - min) / totalRange) * 100;
                            const isActive = currentAssetPrice >= min && currentAssetPrice <= max;
                            
                            return (
                              <div
                                key={idx}
                                className={`h-full ${isActive ? 'bg-[#c0ff00]/60' : 'bg-dark-600/50'} border-r border-dark-800 last:border-r-0`}
                                style={{ 
                                  left: `${Math.max(0, left)}%`, 
                                  width: `${Math.max(0, width)}%`,
                                  position: 'absolute'
                                }}
                              />
                            );
                          })}
                        </div>
                        {/* Current price marker */}
                        {(() => {
                          const allMin = Math.min(...rangeForm.ranges.map(r => r.min || currentAssetPrice));
                          const allMax = Math.max(...rangeForm.ranges.map(r => r.max || currentAssetPrice));
                          const totalRange = allMax - allMin || 1;
                          const position = ((currentAssetPrice - allMin) / totalRange) * 100;
                          return (
                            <div
                              className="absolute top-0 w-1 h-full bg-yellow-400 shadow-lg shadow-yellow-400/50"
                              style={{ left: `${Math.max(0, Math.min(100, position))}%` }}
                            />
                          );
                        })()}
                      </div>
                      <div className="flex justify-between mt-2">
                        {rangeForm.ranges.map((range, idx) => {
                          const min = range.min || 0;
                          const max = range.max || 0;
                          const isActive = currentAssetPrice >= min && currentAssetPrice <= max;
                          return (
                            <div key={idx} className={`text-xs px-2 py-1 rounded ${isActive ? 'bg-[#c0ff00]/20 text-[#c0ff00]' : 'text-gray-500'}`}>
                              R{idx + 1}{isActive && ' ✓'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-red-400 text-sm">Could not fetch live price</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <AssetSelector value={rangeForm.asset} onChange={setRangeForm} />
              <DurationInput value={rangeForm.duration} onChange={setRangeForm} />
            </div>

            {/* Quick Range Presets */}
            {currentAssetPrice && (
              <div className="p-4 bg-dark-900/30 border border-dark-700 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-[#c0ff00]" />
                  <span className="text-sm font-semibold text-gray-300">Quick Range Presets</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map(percent => (
                    <button
                      key={percent}
                      onClick={() => handleQuickRange(percent)}
                      className="px-3 py-2 bg-[#c0ff00]/10 hover:bg-[#c0ff00]/20 border border-[#c0ff00]/30 rounded-lg text-sm text-[#c0ff00] transition-colors"
                    >
                      ±{percent}%
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Auto-generates 3 ranges around ${formatPrice(currentAssetPrice)}
                </p>
              </div>
            )}

            <FixedOddsToggle 
              id="rangeFixedOdds" 
              checked={rangeForm.useFixedOdds} 
              onChange={setRangeForm} 
            />

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Price Ranges {rangeForm.ranges.length > 0 && `(${rangeForm.ranges.length})`}
              </label>
              {rangeForm.ranges.map((range, idx) => {
                const min = range.min || 0;
                const max = range.max || 0;
                const isActive = currentAssetPrice && currentAssetPrice >= min && currentAssetPrice <= max;
                return (
                  <div key={idx} className={`flex gap-2 mb-2 items-center p-2 rounded-lg ${isActive ? 'bg-[#c0ff00]/10 border border-[#c0ff00]/30' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-[#c0ff00] text-dark-900' : 'bg-dark-700 text-gray-400'}`}>
                      {idx + 1}
                    </div>
                    <input 
                      type="number" 
                      value={range.min} 
                      onChange={(e) => { 
                        const newRanges = [...rangeForm.ranges]; 
                        newRanges[idx] = { ...newRanges[idx], min: parseFloat(e.target.value) || 0 }; 
                        setRangeForm('ranges', newRanges); 
                      }} 
                      className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                      placeholder="Min" 
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input 
                      type="number" 
                      value={range.max} 
                      onChange={(e) => { 
                        const newRanges = [...rangeForm.ranges]; 
                        newRanges[idx] = { ...newRanges[idx], max: parseFloat(e.target.value) || 0 }; 
                        setRangeForm('ranges', newRanges); 
                      }} 
                      className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                      placeholder="Max" 
                    />
                    {rangeForm.useFixedOdds && (
                      <input
                        type="number"
                        value={rangeForm.multipliers[idx] || 200}
                        onChange={(e) => {
                          const newMultipliers = [...rangeForm.multipliers];
                          newMultipliers[idx] = parseInt(e.target.value) || 200;
                          setRangeForm('multipliers', newMultipliers);
                        }}
                        className="w-20 bg-dark-800 border border-[#c0ff00]/30 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-[#c0ff00] transition-colors"
                        placeholder="2.0x"
                        min="100"
                        max="1000"
                      />
                    )}
                    {isActive && (
                      <span className="text-xs text-[#c0ff00] font-semibold whitespace-nowrap">
                        ✓
                      </span>
                    )}
                    {idx >= 2 && (
                      <button 
                        onClick={() => { 
                          const newRanges = rangeForm.ranges.filter((_, i) => i !== idx); 
                          const newMultipliers = rangeForm.multipliers.filter((_, i) => i !== idx);
                          setRangeForm('ranges', newRanges);
                          setRangeForm('multipliers', newMultipliers);
                        }} 
                        className="px-3 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
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
            
            {/* Time Decay Configuration */}
            <TimeDecayConfig 
              config={rangeForm}
              onChange={setRangeForm}
              duration={rangeForm.duration}
            />
          </div>
        </div>
      )}


      {/* ========================================== */}
      {/* TIME-BASED MARKET FORM */}
      {/* ========================================== */}
      {marketType === 'time' && (
        <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-700">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Timer size={20} className="text-[#c0ff00]" />
            Time-Based Market
          </h3>
          
          <div className="space-y-4">
            <PriceDisplay 
              asset={timeForm.asset} 
              showTarget={true} 
              targetPrice={timeForm.targetPrice} 
            />

            <div className="grid grid-cols-2 gap-4">
              <AssetSelector value={timeForm.asset} onChange={setTimeForm} />
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

            {/* Quick Target Suggestions */}
            {currentAssetPrice && (
              <div className="flex gap-2 flex-wrap items-center">
                <span className="text-xs text-gray-500">Quick targets:</span>
                {[5, 10, 20].map(percent => (
                  <button
                    key={percent}
                    onClick={() => setTimeForm('targetPrice', currentAssetPrice * (1 + percent / 100))}
                    className="text-xs px-2 py-1 bg-dark-700 hover:bg-dark-600 text-[#c0ff00] rounded transition-colors"
                  >
                    +{percent}%
                  </button>
                ))}
                {[5, 10, 20].map(percent => (
                  <button
                    key={`-${percent}`}
                    onClick={() => setTimeForm('targetPrice', currentAssetPrice * (1 - percent / 100))}
                    className="text-xs px-2 py-1 bg-dark-700 hover:bg-dark-600 text-red-400 rounded transition-colors"
                  >
                    -{percent}%
                  </button>
                ))}
              </div>
            )}

            <FixedOddsToggle 
              id="timeFixedOdds" 
              checked={timeForm.useFixedOdds} 
              onChange={setTimeForm} 
            />

            {/* Timeframe Presets */}
            <div className="p-4 bg-dark-900/30 border border-dark-700 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-[#c0ff00]" />
                <span className="text-sm font-semibold text-gray-300">Quick Timeframe Presets</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {getTimeframePresets().map((preset) => {
                  const isAdded = timeForm.timeframes.some(tf => tf.seconds === preset.seconds);
                  return (
                    <button
                      key={preset.seconds}
                      onClick={() => handleTimeframePreset(preset.seconds)}
                      disabled={isAdded || timeForm.timeframes.length >= 5}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                        isAdded 
                          ? 'bg-[#c0ff00]/20 text-[#c0ff00] border border-[#c0ff00]/30 cursor-default' 
                          : timeForm.timeframes.length >= 5
                            ? 'bg-dark-800 text-gray-600 cursor-not-allowed'
                            : 'bg-dark-800 hover:bg-dark-700 text-gray-300 border border-dark-700'
                      }`}
                    >
                      <div className="font-semibold">{preset.label}</div>
                      <div className="text-xs opacity-70">{preset.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Timeframes {timeForm.timeframes.length > 0 && `(${timeForm.timeframes.length})`}
              </label>
              {timeForm.timeframes.map((tf, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input 
                    type="text" 
                    value={tf.label} 
                    onChange={(e) => { 
                      const newTimeframes = [...timeForm.timeframes]; 
                      newTimeframes[idx] = { ...newTimeframes[idx], label: e.target.value }; 
                      setTimeForm('timeframes', newTimeframes); 
                    }} 
                    className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                    placeholder="Label (e.g. 24h)" 
                  />
                  <input 
                    type="number" 
                    value={tf.seconds} 
                    onChange={(e) => { 
                      const newTimeframes = [...timeForm.timeframes]; 
                      newTimeframes[idx] = { ...newTimeframes[idx], seconds: parseInt(e.target.value) || 0 }; 
                      setTimeForm('timeframes', newTimeframes); 
                    }} 
                    className="w-32 bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#c0ff00] transition-colors" 
                    placeholder="Seconds" 
                  />
                  {timeForm.useFixedOdds && (
                    <input
                      type="number"
                      value={timeForm.multipliers[idx] || 200}
                      onChange={(e) => {
                        const newMultipliers = [...timeForm.multipliers];
                        newMultipliers[idx] = parseInt(e.target.value) || 200;
                        setTimeForm('multipliers', newMultipliers);
                      }}
                      className="w-20 bg-dark-800 border border-[#c0ff00]/30 rounded-lg px-2 py-2 text-white text-center text-sm focus:outline-none focus:border-[#c0ff00] transition-colors"
                      placeholder="2.0x"
                      min="100"
                      max="1000"
                    />
                  )}
                  {idx >= 2 && (
                    <button 
                      onClick={() => { 
                        const newTimeframes = timeForm.timeframes.filter((_, i) => i !== idx); 
                        const newMultipliers = timeForm.multipliers.filter((_, i) => i !== idx);
                        setTimeForm('timeframes', newTimeframes);
                        setTimeForm('multipliers', newMultipliers);
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
            
            {/* Time Decay Configuration */}
            <TimeDecayConfig 
              config={timeForm}
              onChange={setTimeForm}
              duration={timeForm.timeframes.reduce((max, tf) => Math.max(max, tf.seconds / 60), 0)}
            />
          </div>
        </div>
      )}


      {/* ========================================== */}
      {/* CREATE STATUS & BUTTON */}
      {/* ========================================== */}
      
      {createStatus.show && (
        <div className={`p-4 rounded-xl border-2 flex items-center gap-3 ${createStatus.success ? 'bg-green-500/10 border-green-500/50' : 'bg-red-500/10 border-red-500/50'}`}>
          {createStatus.success ? <CheckCircle className="text-green-400" size={24} /> : <XCircle className="text-red-400" size={24} />}
          <span className="flex-1">{createStatus.message}</span>
        </div>
      )}

      <button 
        onClick={handleCreate} 
        disabled={isPending || isConfirming} 
        className="w-full bg-[#c0ff00] hover:bg-[#d4ff33] disabled:bg-gray-700 text-dark-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg shadow-lg shadow-[#c0ff00]/20 transition-all hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <><Loader2 className="animate-spin" size={24} />Confirm in Wallet...</>
        ) : isConfirming ? (
          <><Loader2 className="animate-spin" size={24} />Creating Market...</>
        ) : (
          <><Plus size={24} />Create {MARKET_TYPES.find(t => t.type === marketType)?.label} Market</>
        )}
      </button>
    </div>
  );
};

export default CreateTab;
