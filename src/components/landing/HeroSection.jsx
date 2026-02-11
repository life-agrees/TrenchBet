import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export const HeroSection = ({ onLaunchApp }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Effects - Electric Lime Theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#c0ff00]/10 via-dark-900 to-[#00FF88]/10" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23c0ff00%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-20" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#c0ff00]/10 border border-[#c0ff00]/30 rounded-full mb-8">
          <Sparkles className="w-4 h-4 text-[#c0ff00]" />
          <span className="text-[#c0ff00] text-sm font-medium">High-Velocity Prediction Markets</span>
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Predict the Future.
          <br />
          <span className="bg-gradient-to-r from-[#c0ff00] to-[#00FF88] bg-clip-text text-transparent">
            Earn TRENCHY.
          </span>
        </h1>

        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          The fastest prediction markets on Base. 15-minute cycles, instant payouts, 
          and earn points with every bet. Convert points to $TRENCHY tokens.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onLaunchApp}
            className="group inline-flex items-center gap-2 px-8 py-4 bg-[#c0ff00] hover:bg-[#d4ff33] text-gray-900 font-bold rounded-xl transition-all hover:scale-105"
          >
            Launch App
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            className="px-8 py-4 bg-gray-800/50 hover:bg-gray-800 text-white font-semibold rounded-xl border border-gray-700 transition-all"
          >
            Learn More
          </button>
        </div>

        {/* Stats Preview */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">$2.5M+</div>
            <div className="text-gray-500 text-sm">Total Volume</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">50K+</div>
            <div className="text-gray-500 text-sm">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">100+</div>
            <div className="text-gray-500 text-sm">Markets</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;