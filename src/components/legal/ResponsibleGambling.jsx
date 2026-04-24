import React from 'react';
import { Info } from 'lucide-react';

const ResponsibleGambling = () => (
  <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-700">
    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-neutral-200 dark:border-dark-700">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
        <Info size={32} className="text-primary" />
      </div>
      <h1 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">Responsible Gambling</h1>
    </div>
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">1. Our Commitment</h2>
        <p className="text-neutral-600 dark:text-neutral-400">TrenchyBet is committed to promoting responsible participation in prediction markets. We want our users to have a safe and enjoyable experience.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">2. Setting Limits</h2>
        <p className="text-neutral-600 dark:text-neutral-400">Never chase losses. Set a budget before you start and stick to it. If you feel you are losing control, please take a break.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">3. Support Resources</h2>
        <p className="text-neutral-600 dark:text-neutral-400">If you or someone you know has a gambling problem, please seek professional help from organizations like Gamblers Anonymous or other local support services.</p>
      </section>
    </div>
  </div>
);

export default ResponsibleGambling;
