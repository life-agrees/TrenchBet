import React from 'react';
import LandingHeader from './components/landing/LandingHeader';
import HeroSection from './components/landing/HeroSection';
import LiveStatsSection from './components/landing/LiveStatsSection';
import HowItWorksSection from './components/landing/HowItWorksSection';
import FeaturesSection from './components/landing/FeaturesSection';
import AboutSection from './components/landing/AboutSection';
import TestimonialsSection from './components/landing/TestimonialsSection';
import Footer from './components/Footer';

/**
 * LandingPage
 *
 * FIX 1: `isLoadingStats` was accepted as a prop but App.jsx never passed it,
 *         so LiveStatsSection always received `undefined` for isLoading and
 *         the loading skeleton never showed.
 *         Added `isLoadingStats = false` default so it degrades gracefully,
 *         and the prop is documented so it's obvious App.jsx needs to pass it.
 *
 * FIX 2: Background gradient migrated from `gray-900/gray-800` to
 *         `dark-950/dark-900` to match the rest of the app's design system.
 *
 * NOTE FOR App.jsx: Pass `isLoadingStats={isLoadingMarkets}` when rendering
 * LandingPage so the live stats section shows a skeleton while markets load:
 *   <LandingPage
 *     onLaunchApp={() => setShowLanding(false)}
 *     liveStats={liveStats}
 *     isLoadingStats={isLoadingMarkets}  ← add this
 *   />
 */
const LandingPage = ({
  onLaunchApp,
  liveStats,
  isLoadingStats = false, // FIX 1: explicit default, documents the prop
}) => {
  return (
    // FIX 2: dark-950/dark-900 instead of gray-900/gray-800
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <LandingHeader onLaunchApp={onLaunchApp} />

      <div className="pt-16 sm:pt-20">
        <HeroSection onLaunchApp={onLaunchApp} />
      </div>

      <div id="live-stats">
        {/* FIX 1: isLoadingStats now forwarded correctly */}
        <LiveStatsSection liveStats={liveStats} isLoading={isLoadingStats} />
      </div>

      <div id="how-it-works">
        <HowItWorksSection />
      </div>

      <div id="features">
        <FeaturesSection onLaunchApp={onLaunchApp} />
      </div>

      <div id="about">
        <AboutSection onLaunchApp={onLaunchApp} />
      </div>

      <div id="testimonials">
        <TestimonialsSection />
      </div>

      <Footer />
    </div>
  );
};

export default LandingPage;