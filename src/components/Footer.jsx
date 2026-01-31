import React from 'react';
import { TrendingUp, Twitter, Send } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center mb-3">
              <div className="bg-[#c0ff00] p-2 rounded-xl">
                <TrendingUp className="w-6 h-6 text-gray-900" />
              </div>
              <span className="ml-2 text-xl font-black text-white">
                Trenchy<span className="text-[#c0ff00]">Bet</span>
              </span>
            </div>
            <p className="text-sm text-gray-400">
              High-velocity prediction markets on Base
            </p>
          </div>

          {/* Links */}
          <div>
            <h5 className="text-white font-bold mb-3 text-sm">Community</h5>
            <div className="space-y-2">
              <a
                href="https://x.com/life_agreez"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-400 hover:text-[#c0ff00] transition-colors text-sm"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </a>
              <a
                href="https://t.me/trenchybet"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-gray-400 hover:text-[#c0ff00] transition-colors text-sm"
              >
                <Send className="w-4 h-4 mr-2" />
                Telegram
              </a>
            </div>
          </div>

          {/* Info */}
          <div>
            <h5 className="text-white font-bold mb-3 text-sm">Network</h5>
            <div className="space-y-1 text-sm text-gray-400">
              <div>Chain: <span className="text-[#c0ff00] font-mono">Base Sepolia</span></div>
              <div>Status: <span className="text-green-400">Live</span></div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
          © 2026 TrenchyBet. Built on Base, powered by Chainlink.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
