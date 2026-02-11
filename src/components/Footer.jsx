import React, { useState, useEffect } from 'react';
import { TrendingUp, Twitter, Send, FileText, Shield, Mail, ArrowRight, ExternalLink, ChevronUp } from 'lucide-react';


const Footer = () => {
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

    <footer className="bg-gray-900 border-t border-gray-800 mt-16">
      {/* Gradient top border */}
      <div className="h-1 bg-gradient-to-r from-transparent via-[#c0ff00]/50 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-3">
              <div className="bg-[#c0ff00] p-2 rounded-xl">
                <TrendingUp className="w-6 h-6 text-gray-900" />
              </div>
              <span className="ml-2 text-xl font-black text-white">
                Trenchy<span className="text-[#c0ff00]">Bet</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              High-velocity prediction markets on Base. 15-minute cycles, instant payouts, provably fair.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/life_agreez"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-gray-800 hover:bg-[#c0ff00] hover:text-gray-900 text-gray-400 rounded-lg flex items-center justify-center transition-all duration-200"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://t.me/trenchybet"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-gray-800 hover:bg-[#c0ff00] hover:text-gray-900 text-gray-400 rounded-lg flex items-center justify-center transition-all duration-200"
                aria-label="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h5 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Product</h5>
            <ul className="space-y-3">
              <li>
                <a href="/" className="link-hover-underline text-gray-400 hover:text-[#c0ff00] transition-colors text-sm flex items-center gap-1 group">
                  Launch App
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a href="https://trench-bet.vercel.app/" target="_blank" rel="noopener noreferrer" className="link-hover-underline text-gray-400 hover:text-[#c0ff00] transition-colors text-sm flex items-center gap-1 group">
                  Documentation
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a href="#" className="link-hover-underline text-gray-400 hover:text-[#c0ff00] transition-colors text-sm flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Audit Report
                </a>
              </li>

            </ul>
          </div>

          {/* Legal */}
          <div>
            <h5 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Legal</h5>
            <ul className="space-y-3">
              <li>
                <a href="#" className="link-hover-underline text-gray-400 hover:text-[#c0ff00] transition-colors text-sm flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="link-hover-underline text-gray-400 hover:text-[#c0ff00] transition-colors text-sm flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="mailto:pndukwe824@gmail.com" className="link-hover-underline text-gray-400 hover:text-[#c0ff00] transition-colors text-sm flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  Contact Us
                </a>
              </li>

            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h5 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Stay Updated</h5>
            <p className="text-sm text-gray-400 mb-3">
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
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#c0ff00]/50 transition-colors"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#c0ff00] hover:bg-[#d4ff33] text-gray-900 rounded-lg px-3 py-2 transition-colors"
                  aria-label="Subscribe"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} TrenchyBet. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
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
