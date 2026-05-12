import React, { useRef, useState, useEffect } from 'react';
import { Trophy, Zap, TrendingUp } from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * WinShareCard
 * Renders an off-screen card that can be converted to an image for sharing.
 */
const WinShareCard = ({ bet, isVisible = false, onClose }) => {
  const cardRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataUrl, setDataUrl] = useState(null);

  // ── Derived values (safe even when bet is null) ──
  const market      = bet?.market ?? null;
  const amount      = bet?.amount ?? 0;
  const rawMultiplier = bet?.multiplier ? Number(bet.multiplier) : 150;
  // Contract returns multiplier as 150 for 1.5x, 200 for 2x, etc.
  const actualMultiplier = rawMultiplier > 10 ? rawMultiplier / 100 : rawMultiplier;
  const choiceLabel = bet?.choiceLabel ?? '';
  const amountWon   = (Number(amount) / 1e6) * actualMultiplier;

  // All hooks MUST be declared before any conditional return (React rule of hooks)
  useEffect(() => {
    if (bet && isVisible && cardRef.current) {
      generateImage();
    }
  }, [isVisible, bet]);

  // NOW it is safe to return early
  if (!bet) return null;

  const generateImage = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0F172A',
        logging: false,
      });
      const url = canvas.toDataURL('image/png');
      setDataUrl(url);
    } catch (err) {
      console.error('Error generating share card:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `trenchybet-win-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="relative w-full max-w-md bg-dark-800 rounded-3xl border border-dark-700 shadow-2xl p-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-white">Share Your Win! 🎉</h3>
          <button onClick={onClose} className="p-2 bg-dark-700 rounded-full text-neutral-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Display generated image or loading state */}
        <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden mb-6 bg-dark-900 border border-dark-600 flex flex-col items-center justify-center">
          {isGenerating ? (
            <div className="flex flex-col items-center">
              <Zap className="animate-pulse text-primary mb-2" size={32} />
              <p className="text-primary font-bold">Generating Card...</p>
            </div>
          ) : dataUrl ? (
            <img src={dataUrl} alt="Win Share Card" className="w-full h-full object-contain" />
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button 
            onClick={downloadImage}
            disabled={!dataUrl || isGenerating}
            className="flex-1 py-3 bg-secondary hover:bg-secondary-500 text-dark-950 font-black rounded-xl transition-all disabled:opacity-50"
          >
            Download Image
          </button>
          <button 
            onClick={() => {
              if (navigator.share && dataUrl) {
                fetch(dataUrl)
                  .then(res => res.blob())
                  .then(blob => {
                    const file = new File([blob], 'trenchybet-win.png', { type: 'image/png' });
                    navigator.share({
                      title: 'I just won on TrenchyBet!',
                      text: `I successfully predicted ${market?.displayName || 'a market'} on TrenchyBet! 🚀`,
                      files: [file]
                    });
                  });
              } else {
                downloadImage();
              }
            }}
            disabled={!dataUrl || isGenerating}
            className="flex-1 py-3 bg-white text-dark-950 font-black rounded-xl transition-all disabled:opacity-50"
          >
            Share Native
          </button>
        </div>

        {/* --- OFF-SCREEN ELEMENT TO RENDER --- */}
        <div className="fixed top-[-9999px] left-[-9999px]">
          <div 
            ref={cardRef} 
            className="w-[1080px] h-[1350px] bg-gradient-to-br from-dark-900 via-[#111] to-dark-800 flex flex-col p-16 relative overflow-hidden font-sans"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] -mr-[200px] -mt-[200px]"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] -ml-[100px] -mb-[100px]"></div>
            
            {/* Logo */}
            <div className="flex items-center gap-4 mb-auto relative z-10">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center transform -rotate-6 shadow-[0_0_30px_rgba(205,255,0,0.3)]">
                <TrendingUp size={36} className="text-dark-950" />
              </div>
              <span className="text-5xl font-black text-white tracking-tighter">TrenchyBet</span>
            </div>

            {/* Main Content */}
            <div className="flex flex-col items-center text-center relative z-10 w-full mb-16">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-success/20 border-2 border-success text-success font-black text-2xl uppercase tracking-widest mb-10 shadow-[0_0_40px_rgba(34,197,94,0.4)]">
                <Trophy size={28} /> Prediction Won
              </div>
              
              <h2 className="text-[72px] leading-[1.1] font-black text-white mb-8 tracking-tight">
                {market?.displayName || "Crypto Prediction"}
              </h2>
              
              <div className="flex items-center justify-center gap-4 mb-16">
                <span className="text-3xl text-neutral-400 font-bold">Predicted:</span>
                <span className="px-6 py-2 bg-primary/20 border-2 border-primary text-primary rounded-xl text-3xl font-black">
                  {choiceLabel}
                </span>
              </div>
              
              {/* Payout Box */}
              <div className="w-full max-w-3xl bg-white/5 border border-white/10 rounded-[40px] p-12 backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
                <div className="relative z-10 flex justify-between items-center">
                  <div className="flex flex-col items-start">
                    <span className="text-2xl text-neutral-400 font-bold uppercase tracking-widest mb-2">Payout</span>
                    <span className="text-[100px] leading-none font-black text-success drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]">
                      ${amountWon.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-[120px] w-px bg-white/20 mx-8"></div>
                  <div className="flex flex-col items-end">
                    <span className="text-2xl text-neutral-400 font-bold uppercase tracking-widest mb-2">Multiplier</span>
                    <span className="text-[72px] leading-none font-black text-white">
                      {actualMultiplier.toFixed(2)}x
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-auto flex justify-between items-end relative z-10 border-t-2 border-white/10 pt-10">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">trenchybet.com</span>
                <span className="text-xl text-neutral-500 font-bold uppercase tracking-wider mt-2">The premier prediction market</span>
              </div>
              <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center p-2 border-4 border-white">
                {/* Placeholder for QR Code */}
                <div className="w-full h-full bg-dark-900 rounded-lg flex items-center justify-center flex-col">
                  <TrendingUp size={48} className="text-primary mb-2" />
                  <span className="text-[10px] text-white font-bold uppercase">Play Now</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WinShareCard;
