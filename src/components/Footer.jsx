import React, { useState, useEffect } from 'react';
import { TrendingUp, Twitter, Send, FileText, Shield, Mail, ArrowRight, ExternalLink, ChevronUp } from 'lucide-react';
import { TrenchyBetLogo } from "./TrenchyBetLogo.jsx";


const Footer = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      // TODO: Integrate with newsletter service
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (

    <footer className="bg-dark-950 border-t border-white/10 mt-24">
      {/* Gradient top border overlay */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#c0ff00]/30 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-3">
              <TrenchyBetLogo className="w-8 h-8" />
              <span className="ml-2 text-xl font-black text-neutral-900 dark:text-white">
                Trenchy<span className="text-[#c0ff00]">Bet</span>
              </span>
            </div>
            <p className="text-sm text-neutral-300 mb-6 leading-relaxed">
              High-velocity prediction markets on Base. 15-minute cycles, instant payouts, and provably fair outcomes.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/life_agreez"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 border border-white/5 hover:bg-[#c0ff00] hover:text-dark-950 text-neutral-400 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://t.me/trenchybet"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/5 border border-white/5 hover:bg-[#c0ff00] hover:text-dark-950 text-neutral-400 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg"
                aria-label="Telegram"
              >
                <Send className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h5 className="text-neutral-900 dark:text-white font-bold mb-4 text-sm uppercase tracking-wider">Product</h5>
            <ul className="space-y-3">
              <li>
                <a href="/" className="link-hover-underline text-neutral-400 hover:text-[#CDFF00] transition-colors text-sm flex items-center gap-1 group">
                  Launch App
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#CDFF00]" />
                </a>
              </li>
              <li>
                <a href="https://trench-bet.vercel.app/" target="_blank" rel="noopener noreferrer" className="link-hover-underline text-neutral-400 hover:text-[#CDFF00] transition-colors text-sm flex items-center gap-1 group">
                  Documentation
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#CDFF00]" />
                </a>
              </li>
              <li>
                <a href="#" className="link-hover-underline text-neutral-400 hover:text-[#CDFF00] transition-colors text-sm flex items-center gap-2 group">
                  <Shield className="w-3.5 h-3.5 text-neutral-500 group-hover:text-[#CDFF00]" />
                  Audit Report
                </a>
              </li>

            </ul>
          </div>

          {/* Legal */}
          <div>
            <h5 className="text-neutral-900 dark:text-white font-bold mb-4 text-sm uppercase tracking-wider">Legal</h5>
            <ul className="space-y-3">
              <li>
                <button 
                  onClick={() => onNavigate?.('terms')}
                  className="link-hover-underline text-neutral-400 hover:text-[#c0ff00] transition-colors text-sm flex items-center gap-2 group text-left w-full"
                >
                  <FileText className="w-4 h-4 text-neutral-500 group-hover:text-[#c0ff00]" />
                  Terms of Service
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('privacy')}
                  className="link-hover-underline text-neutral-400 hover:text-[#c0ff00] transition-colors text-sm flex items-center gap-2 group text-left w-full"
                >
                  <FileText className="w-4 h-4 text-neutral-500 group-hover:text-[#c0ff00]" />
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onNavigate?.('responsible-gambling')}
                  className="link-hover-underline text-neutral-400 hover:text-[#c0ff00] transition-colors text-sm flex items-center gap-2 group text-left w-full"
                >
                  <Shield className="w-4 h-4 text-neutral-500 group-hover:text-[#c0ff00]" />
                  Responsible Gambling
                </button>
              </li>
              <li>
                <a href="mailto:pndukwe824@gmail.com" className="link-hover-underline text-neutral-400 hover:text-[#c0ff00] transition-colors text-sm flex items-center gap-2 group">
                  <Mail className="w-4 h-4 text-neutral-500 group-hover:text-[#c0ff00]" />
                  Contact Us
                </a>
              </li>

            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h5 className="text-neutral-900 dark:text-white font-bold mb-4 text-sm uppercase tracking-wider">Stay Updated</h5>
            <p className="text-sm text-neutral-400 mb-4 font-medium">
              Get notified when new markets open.
            </p>
            {subscribed ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-sm text-green-400">
                Thanks for subscribing!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#c0ff00]/50 transition-all font-medium"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#c0ff00] hover:bg-[#d4ff33] text-dark-950 rounded-xl px-5 py-2.5 transition-all shadow-lg active:scale-95"
                  aria-label="Subscribe"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="text-sm text-neutral-500 font-medium">
            © {new Date().getFullYear()} TrenchyBet. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-xs text-neutral-600 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00FF88] rounded-full animate-pulse shadow-[0_0_8px_#00FF88]"></span>
              v1.0.0
            </span>
            <span>Built on Base</span>
            <span>Powered by Chainlink</span>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <button
        onClick={scrollToTop}
        className={`back-to-top ${showBackToTop ? 'visible' : ''}`}
        aria-label="Back to top"
      >
        <ChevronUp className="w-6 h-6 text-gray-900" />
      </button>
    </footer>

  );
};

export default Footer;
