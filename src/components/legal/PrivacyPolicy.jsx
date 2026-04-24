import React from 'react';
import { Shield } from 'lucide-react';

const PrivacyPolicy = () => (
  <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in duration-700">
    <div className="flex items-center gap-4 mb-10 pb-6 border-b border-neutral-200 dark:border-dark-700">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
        <Shield size={32} className="text-primary" />
      </div>
      <h1 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight">Privacy Policy</h1>
    </div>
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">1. Information We Collect</h2>
        <p className="text-neutral-600 dark:text-neutral-400">We do not collect personal identification information. We interact only with your public wallet address to facilitate blockchain transactions.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">2. Use of Data</h2>
        <p className="text-neutral-600 dark:text-neutral-400">Public blockchain data is used to display your betting history and leaderboard standing. We use Supabase to index this public data for performance.</p>
      </section>
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">3. Cookies</h2>
        <p className="text-neutral-600 dark:text-neutral-400">We use local storage only to remember your UI preferences (like dark mode and sidebar state). No tracking cookies are used.</p>
      </section>
    </div>
  </div>
);

export default PrivacyPolicy;
