import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react';

const LandingHeader = ({ onLaunchApp }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effect for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Smooth scroll to section
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsMobileMenuOpen(false);
  };

  // Navigation items configuration
  const navItems = [
    { label: 'About', sectionId: 'about' },
    { label: 'How It Works', sectionId: 'how-it-works' },
    { label: 'Features', sectionId: 'features' },
    { label: 'Stats', sectionId: 'live-stats' },
  ];


  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-gray-900/95 backdrop-blur-md border-b border-gray-800 shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#c0ff00]" />
              <span className="text-xl sm:text-2xl font-bold text-white">
                TrenchyBet
              </span>
            </div>
            <span className="px-2 py-1 bg-[#c0ff00]/10 border border-[#c0ff00]/30 text-[#c0ff00] text-xs font-bold rounded-full">
              BETA
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.sectionId}
                onClick={() => scrollToSection(item.sectionId)}
                className="text-gray-300 hover:text-[#c0ff00] font-medium transition-colors duration-200 text-sm"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* CTA Button - Desktop */}
          <div className="hidden md:block">
            <button
              onClick={onLaunchApp}
              className="group inline-flex items-center gap-2 px-6 py-2.5 bg-[#c0ff00] hover:bg-[#d4ff33] text-gray-900 font-bold rounded-lg transition-all hover:scale-105 text-sm"
            >
              Launch App
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-gray-900/98 backdrop-blur-md border-b border-gray-800 px-4 py-4 space-y-4">
          {navItems.map((item) => (
            <button
              key={item.sectionId}
              onClick={() => scrollToSection(item.sectionId)}
              className="block w-full text-left text-gray-300 hover:text-[#c0ff00] font-medium transition-colors duration-200 py-2"
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => {
              onLaunchApp();
              setIsMobileMenuOpen(false);
            }}
            className="w-full group inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#c0ff00] hover:bg-[#d4ff33] text-gray-900 font-bold rounded-lg transition-all text-sm mt-4"
          >
            Launch App
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;
