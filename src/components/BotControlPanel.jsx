import { useState, useEffect, useCallback } from 'react';
import {
  Play, Square, RefreshCw, Zap, Clock, Settings,
  CheckCircle, XCircle, Loader2, Terminal, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const BOT_URL = import.meta.env.VITE_BOT_URL || 'http://localhost:3001';
const BOT_KEY = import.meta.env.VITE_BOT_API_KEY || 'trenchybet-bot-secret';

const api = async (method, path, body) => {
  const res = await fetch(`${BOT_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-bot-key': BOT_KEY },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
};

const ASSETS = ['BTC', 'ETH', 'LINK'];
const CYCLES = [
  { key: 'binary',   label: '15m Binary',     color: 'text-[#CDFF00]' },
  { key: 'range30',  label: '30m Range',      color: 'text-blue-400'   },
  { key: 'range45',  label: '45m Range',      color: 'text-cyan-400'   },
  { key: 'range60',  label: '60m Range',      color: 'text-indigo-400' },
  { key: 'time',     label: '2h Time-Based',  color: 'text-orange-400' },
  { key: 'resolve',  label: 'Resolve Expired',color: 'text-purple-400' },
];

export default function BotControlPanel() {
  const [status, setStatus]       = useState(null);
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showLogs, setShowLogs]   = useState(false);
  const [firing, setFiring]       = useState({});

  // Local config state
  const [cfg, setCfg] = useState({
    assets: ['BTC', 'ETH', 'LINK'],
    durations: { binary: 900, range30: 1800, range45: 2700, range60: 3600, time: 7200 },
    rangeBandPercent: 10,
    timePriceTargetPct: 5,
    schedules: { binary: '*/15 * * * *', range30: '*/30 * * * *', range45: '*/45 * * * *', range60: '0 * * * *', time: '0 */2 * * *', resolve: '*/2 * * * *' },
    useFixedOdds: false,
    useTimeDecay: false,
    decayStartPercent: 50,
    minMultiplier: 120,
  });

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api('GET', '/status');
      setStatus(data);
      setCfg(data.config);
    } catch { /* bot may be offline */ }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const data = await api('GET', '/logs?limit=50');
      setLogs(data.logs || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleStartStop = async () => {
    setLoading(true);
    try {
      if (status?.running) {
        await api('POST', '/stop');
        toast.success('Bot stopped');
      } else {
        await api('POST', '/start');
        toast.success('Bot started');
      }
      await fetchStatus();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      await api('POST', '/config', cfg);
      toast.success('Config saved — bot restarted with new settings');
      await fetchStatus();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFireCycle = async (cycle) => {
    setFiring(f => ({ ...f, [cycle]: true }));
    try {
      await api('POST', `/run/${cycle}`);
      toast.success(`${cycle} cycle fired`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFiring(f => ({ ...f, [cycle]: false }));
    }
  };

  const toggleAsset = (asset) => {
    setCfg(c => ({
      ...c,
      assets: c.assets.includes(asset)
        ? c.assets.filter(a => a !== asset)
        : [...c.assets, asset],
    }));
  };

  const isRunning = status?.running;

  return (
    <div className="space-y-4">
      {/* Header status card */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-[#CDFF00] animate-pulse' : 'bg-neutral-600'}`} />
            <h3 className="text-lg font-bold text-white">Market Bot</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${isRunning ? 'bg-[#CDFF00]/10 text-[#CDFF00] border-[#CDFF00]/30' : 'bg-neutral-700 text-neutral-400 border-neutral-600'}`}>
              {isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          <button
            onClick={handleStartStop}
            disabled={loading || !status}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50 ${
              isRunning
                ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                : 'bg-[#CDFF00] text-dark-950 hover:bg-[#d4ff33]'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Stop Bot' : 'Start Bot'}
          </button>
        </div>

        {/* Stats */}
        {status && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Created',  value: status.stats.marketsCreated  },
              { label: 'Resolved', value: status.stats.marketsResolved },
              { label: 'Errors',   value: status.stats.errors,  red: true },
            ].map(({ label, value, red }) => (
              <div key={label} className="bg-dark-900/60 rounded-lg p-3 border border-dark-700">
                <p className="text-xs text-neutral-500">{label}</p>
                <p className={`text-2xl font-black ${red && value > 0 ? 'text-red-400' : 'text-white'}`}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual cycle fire buttons */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
        <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wide mb-3">Manual Fire</h4>
        <div className="grid grid-cols-2 gap-2">
          {CYCLES.map(({ key, label, color }) => {
            const running = status?.cycleRunning?.[key];
            const last    = status?.lastRun?.[key];
            return (
              <button
                key={key}
                onClick={() => handleFireCycle(key)}
                disabled={firing[key] || running}
                className="flex items-center justify-between px-4 py-3 bg-dark-900/60 border border-dark-700 hover:border-dark-500 rounded-lg transition-all disabled:opacity-50 text-left"
              >
                <div>
                  <p className={`text-sm font-bold ${color}`}>{label}</p>
                  {last && <p className="text-[10px] text-neutral-600 mt-0.5">Last: {new Date(last).toLocaleTimeString()}</p>}
                </div>
                {(firing[key] || running)
                  ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                  : <Zap className="w-4 h-4 text-neutral-600" />
                }
              </button>
            );
          })}
        </div>
      </div>

      {/* Config panel */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowConfig(s => !s)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-700/30 transition-all"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#CDFF00]" />
            <span className="font-bold text-white">Configuration</span>
          </div>
          {showConfig ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
        </button>

        {showConfig && (
          <div className="px-5 pb-5 space-y-5 border-t border-dark-700">
            {/* Assets */}
            <div className="pt-4">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide block mb-2">Assets</label>
              <div className="flex gap-2">
                {ASSETS.map(a => (
                  <button
                    key={a}
                    onClick={() => toggleAsset(a)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm border transition-all ${
                      cfg.assets.includes(a)
                        ? 'bg-[#CDFF00]/20 border-[#CDFF00]/50 text-[#CDFF00]'
                        : 'bg-dark-900 border-dark-600 text-neutral-500'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Durations */}
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide block mb-2">Durations (minutes)</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { key: 'binary', label: 'Binary' },
                  { key: 'range30', label: 'Range 30' },
                  { key: 'range45', label: 'Range 45' },
                  { key: 'range60', label: 'Range 60' },
                  { key: 'time', label: 'Time' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-xs text-neutral-500 mb-1">{label}</p>
                    <input
                      type="number"
                      value={cfg.durations[key] / 60}
                      onChange={e => setCfg(c => ({ ...c, durations: { ...c.durations, [key]: parseInt(e.target.value) * 60 } }))}
                      className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#CDFF00]"
                      min="1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Range band + time target */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide block mb-2">Range Band %</label>
                <input
                  type="number"
                  value={cfg.rangeBandPercent}
                  onChange={e => setCfg(c => ({ ...c, rangeBandPercent: parseFloat(e.target.value) }))}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#CDFF00]"
                  min="1" max="50" step="0.5"
                />
                <p className="text-[10px] text-neutral-600 mt-1">±{cfg.rangeBandPercent}% around current price</p>
              </div>
              <div>
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide block mb-2">Time Target %</label>
                <input
                  type="number"
                  value={cfg.timePriceTargetPct}
                  onChange={e => setCfg(c => ({ ...c, timePriceTargetPct: parseFloat(e.target.value) }))}
                  className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#CDFF00]"
                  min="1" max="100" step="0.5"
                />
                <p className="text-[10px] text-neutral-600 mt-1">+{cfg.timePriceTargetPct}% price target</p>
              </div>
            </div>

            {/* Schedules */}
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wide block mb-2">Cron Schedules</label>
              <div className="space-y-2">
                {['binary', 'range30', 'range45', 'range60', 'time', 'resolve'].map(k => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500 w-20 capitalize">{k}</span>
                    <input
                      type="text"
                      value={cfg.schedules[k]}
                      onChange={e => setCfg(c => ({ ...c, schedules: { ...c.schedules, [k]: e.target.value } }))}
                      className="flex-1 bg-dark-900 border border-dark-600 rounded-lg px-3 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-[#CDFF00]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Market Strategy Section */}
            <div>
              <label className="text-xs font-bold text-[#CDFF00] uppercase tracking-wide block mb-3">🎮 Market Strategy</label>
              <div className="space-y-4 bg-dark-900/60 border border-dark-700 rounded-lg p-4">
                
                {/* Fixed Odds Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="useFixedOdds"
                    checked={cfg.useFixedOdds}
                    onChange={e => setCfg(c => ({ ...c, useFixedOdds: e.target.checked }))}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="useFixedOdds" className="text-sm text-neutral-300 cursor-pointer">
                    Use Fixed Odds (Casino Mode)
                  </label>
                </div>

                {/* Time Decay Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="useTimeDecay"
                    checked={cfg.useTimeDecay}
                    onChange={e => setCfg(c => ({ ...c, useTimeDecay: e.target.checked }))}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="useTimeDecay" className="text-sm text-neutral-300 cursor-pointer">
                    Enable Time-Decaying Odds
                  </label>
                </div>

                {/* Decay Percent */}
                {cfg.useTimeDecay && (
                  <div className="ml-7 space-y-2 pt-2 border-t border-dark-700">
                    <label className="text-xs text-neutral-400 font-semibold">Decay Starts At (%)</label>
                    <input
                      type="number"
                      value={cfg.decayStartPercent}
                      onChange={e => setCfg(c => ({ ...c, decayStartPercent: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#CDFF00]"
                      min="0"
                      max="100"
                    />
                    <p className="text-[10px] text-neutral-600">Market must complete this % before decay starts</p>
                  </div>
                )}

                {/* Min Multiplier */}
                <div className="space-y-2 pt-2 border-t border-dark-700">
                  <label className="text-xs text-neutral-400 font-semibold">Min Multiplier (x)</label>
                  <input
                    type="number"
                    value={cfg.minMultiplier / 100}
                    onChange={e => setCfg(c => ({ ...c, minMultiplier: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
                    className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#CDFF00]"
                    min="1"
                    max="2"
                    step="0.05"
                  />
                  <p className="text-[10px] text-neutral-600">Minimum odds floor (1.0x = even, 2.0x = double)</p>
                </div>

              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={loading}
              className="w-full bg-[#CDFF00] hover:bg-[#d4ff33] text-dark-950 font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Save & Apply Config
            </button>
          </div>
        )}
      </div>

      {/* Logs */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        <button
          onClick={() => { setShowLogs(s => !s); if (!showLogs) fetchLogs(); }}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-dark-700/30 transition-all"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-neutral-400" />
            <span className="font-bold text-white">Bot Logs</span>
          </div>
          <div className="flex items-center gap-2">
            {showLogs && <button onClick={(e) => { e.stopPropagation(); fetchLogs(); }} className="p-1 hover:text-white text-neutral-500"><RefreshCw className="w-3.5 h-3.5" /></button>}
            {showLogs ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
          </div>
        </button>

        {showLogs && (
          <div className="border-t border-dark-700 bg-dark-950 max-h-[300px] overflow-y-auto p-4 font-mono text-xs space-y-1">
            {logs.length === 0
              ? <p className="text-neutral-600">No logs yet</p>
              : [...logs].reverse().map((entry, i) => (
                <div key={i} className={`${entry.level === 'error' ? 'text-red-400' : entry.level === 'warn' ? 'text-yellow-400' : entry.level === 'success' ? 'text-[#CDFF00]' : 'text-neutral-400'}`}>
                  <span className="text-neutral-600">{new Date(entry.ts).toLocaleTimeString()} </span>
                  {entry.msg}
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
}