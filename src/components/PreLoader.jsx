import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

/**
 * TrenchyBet PreLoader - Memorable loading experience
 * Features: Animated TB logo, prediction market themed elements,
 * electric lime/amber gradient, smooth exit animations
 */
const PreLoader = ({ onLoadingComplete }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Staggered animation entrance
    const contentTimer = setTimeout(() => setShowContent(true), 100);
    
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 150);

    // Minimum display time for visual impact (2 seconds)
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      // Give time for exit animation before calling complete
      setTimeout(() => {
        onLoadingComplete();
      }, 800);
    }, 2000);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(exitTimer);
      clearInterval(progressInterval);
    };
  }, [onLoadingComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-dark-950 transition-all duration-700 ease-out ${
        isExiting ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
      }`}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(205,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(205,255,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px] animate-pulse-slow" />
        
        {/* Floating prediction market themed elements */}
        <div className={`absolute top-1/4 left-1/4 transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <div className="flex items-center gap-1 text-primary/20 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}>
            <TrendingUp size={40} />
          </div>
        </div>
        
        <div className={`absolute top-1/3 right-1/4 transition-all duration-1000 delay-200 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <div className="flex items-center gap-1 text-danger/20 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3s' }}>
            <TrendingDown size={35} />
          </div>
        </div>
        
        <div className={`absolute bottom-1/3 left-1/3 transition-all duration-1000 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <div className="flex items-center gap-1 text-success/20 animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }}>
            <Activity size={30} />
          </div>
        </div>

        {/* Glowing orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content */}
      <div className={`relative z-10 flex flex-col items-center transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* TB Logo Container */}
        <div className="relative mb-8">
          {/* Outer glow ring */}
          <div className="absolute inset-0 -m-4 rounded-full border-2 border-primary/30 animate-spin" style={{ animationDuration: '8s' }} />
          <div className="absolute inset-0 -m-8 rounded-full border border-secondary/20 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }} />
          
          {/* Pulsing background behind letters */}
          <div className="absolute inset-0 -m-6 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl blur-xl animate-pulse-slow" />
          
          {/* TB Letters */}
          <div className="relative flex items-center justify-center">
            <span 
              className="text-[120px] md:text-[160px] font-black leading-none tracking-tighter select-none"
              style={{
                background: 'linear-gradient(135deg, #CDFF00 0%, #FFB800 50%, #CDFF00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 0 30px rgba(205, 255, 0, 0.5))',
                animation: 'text-shimmer 3s ease-in-out infinite',
              }}
            >
              TB
            </span>
          </div>

          {/* Decorative corner brackets */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 border-primary/60" />
          <div className="absolute -top-2 -right-2 w-8 h-8 border-r-2 border-t-2 border-primary/60" />
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-2 border-b-2 border-secondary/60" />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 border-secondary/60" />
        </div>

        {/* Brand name */}
        <h1 
          className={`text-3xl md:text-4xl font-black mb-2 tracking-wider transition-all duration-500 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{
            background: 'linear-gradient(90deg, #CDFF00 0%, #FFB800 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          TRENCHYBET
        </h1>

        {/* Tagline */}
        <p className={`text-neutral-400 text-sm md:text-base font-medium tracking-widest uppercase mb-8 transition-all duration-500 delay-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          Predict. Win. Dominate.
        </p>

        {/* Progress bar */}
        <div className={`w-64 h-1 bg-dark-700 rounded-full overflow-hidden mb-4 transition-all duration-500 delay-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
          <div 
            className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${Math.min(progress, 100)}%`,
              boxShadow: '0 0 10px rgba(205, 255, 0, 0.5)'
            }}
          />
        </div>

        {/* Loading text with animated dots */}
        <div className={`flex items-center gap-2 text-neutral-500 text-sm font-medium transition-all duration-500 delay-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
          <span>Initializing Prediction Markets</span>
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </span>
        </div>

        {/* Stats preview */}
        <div className={`flex items-center gap-6 mt-8 transition-all duration-500 delay-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            <span>Live Markets</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            <span>Real-time Odds</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
            <span>Instant Payouts</span>
          </div>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute bottom-8 left-8 text-neutral-600 text-xs font-mono">
        <div className="flex flex-col gap-1">
          <span>v2.0.0</span>
          <span className="text-primary/60">BASE SEPOLIA</span>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 text-neutral-600 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span>SYSTEM ONLINE</span>
        </div>
      </div>
    </div>
  );
};

export default PreLoader;
