import React from 'react';
import HeroSection from './components/landing/HeroSection';
import LiveStatsSection from './components/landing/LiveStatsSection';
import HowItWorksSection from './components/landing/HowItWorksSection';
import FeaturesSection from './components/landing/FeaturesSection';
import TestimonialsSection from './components/landing/TestimonialsSection';
import Footer from './components/Footer';

const LandingPage = ({ onLaunchApp, liveStats, isLoadingStats }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <HeroSection onLaunchApp={onLaunchApp} />
      <LiveStatsSection liveStats={liveStats} isLoading={isLoadingStats} />
      <HowItWorksSection />
      <FeaturesSection onLaunchApp={onLaunchApp} />
      <TestimonialsSection />
      <Footer />
    </div>
  );
};

export default LandingPage;