import React from 'react';
import { Scale } from 'lucide-react';

const TermsOfUse = () => (
  <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-700">
    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-neutral-200 dark:border-dark-700">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
        <Scale size={32} className="text-primary" />
      </div>
      <h1 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">Terms of Use</h1>
    </div>
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
        <p className="text-neutral-600 dark:text-neutral-400">By accessing TrenchyBet, you agree to be bound by these Terms of Use and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">2. Nature of Service</h2>
        <p className="text-neutral-600 dark:text-neutral-400">TrenchyBet is a decentralized prediction market platform. All transactions are processed on the blockchain. We do not provide financial advice, and our platform is for entertainment and informational purposes only.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">3. Risk Disclosure</h2>
        <p className="text-neutral-600 dark:text-neutral-400">Participation in prediction markets involves significant risk. You should only use funds you can afford to lose. We are not responsible for any losses incurred through the use of our platform.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">4. Eligibility</h2>
        <p className="text-neutral-600 dark:text-neutral-400">You must be of legal age in your jurisdiction to use this service. It is your responsibility to ensure that using a prediction market is legal in your country of residence.</p>
      </section>
    </div>
  </div>
);

export default TermsOfUse;
