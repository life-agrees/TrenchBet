import React from 'react';
import LandingHeader from './components/landing/LandingHeader';
import HeroSection from './components/landing/HeroSection';
import LiveStatsSection from './components/landing/LiveStatsSection';
import HowItWorksSection from './components/landing/HowItWorksSection';
import FeaturesSection from './components/landing/FeaturesSection';
import AboutSection from './components/landing/AboutSection';
import TestimonialsSection from './components/landing/TestimonialsSection';
import Footer from './components/Footer';


const LandingPage = ({ onLaunchApp, liveStats, isLoadingStats }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <LandingHeader onLaunchApp={onLaunchApp} />
      <div className="pt-16 sm:pt-20">
        <HeroSection onLaunchApp={onLaunchApp} />
      </div>
      <div id="live-stats">
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
