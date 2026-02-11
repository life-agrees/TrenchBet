import React from 'react';
import { Star, Quote } from 'lucide-react';

export const TestimonialsSection = () => {
  const testimonials = [
    {
      quote: "TrenchyBet's 15-minute markets are addictive. I love the instant payouts and the points system makes it way more engaging!",
      author: "Alex M.",
      role: "Crypto Trader",
      rating: 5
    },
    {
      quote: "Finally a prediction platform that doesn't take forever. The electric theme and smooth UX make it my go-to for quick bets.",
      author: "Sarah K.",
      role: "DeFi Enthusiast",
      rating: 5
    },
    {
      quote: "Earning TRENCHY tokens while predicting is genius. The points-to-earn system keeps me coming back every day.",
      author: "Mike R.",
      role: "Web3 Developer",
      rating: 5
    }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Loved by Predictors</h2>
          <p className="text-gray-400">Join thousands of traders earning daily</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6 hover:border-[#c0ff00]/30 transition-all group"
            >
              <Quote className="w-8 h-8 text-[#c0ff00]/50 mb-4 group-hover:text-[#c0ff00] transition-colors" />
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-[#c0ff00] fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-6 italic">"{testimonial.quote}"</p>
              <div>
                <div className="text-white font-semibold">{testimonial.author}</div>
                <div className="text-gray-500 text-sm">{testimonial.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;