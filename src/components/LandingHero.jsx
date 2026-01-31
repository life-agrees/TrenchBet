import React from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';

const LandingHero = ({ isConnected }) => {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-dark-800 rounded-2xl border-2 border-dark-600">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
          <TrendingUp size={32} className="text-primary" />
        </div>
        <h2 className="text-3xl font-black text-white mb-4">No Active Markets</h2>
        <p className="text-lg text-neutral-400 mb-6 max-w-md">
          There are currently no active prediction markets. Check back later for new opportunities!
        </p>
        {!isConnected && (
          <div className="bg-primary/10 border border-primary rounded-xl p-4">
            <p className="text-sm text-primary font-semibold">
              Connect your wallet to be notified when new markets open
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingHero;
