'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { GetStartedButton } from '@/components/GetStartedButton';

const plans = [
  {
    name: 'Starter',
    price: 10,
    minutes: 10,
    badge: 'Limited Offer',
    features: ['10 minutes of video', '1080p resolution', 'AI narration & captions', 'MP4 download', '3 voice options'],
    cta: 'Get Started',
    highlight: false,
  },
  {
    name: 'Creator',
    price: 50,
    minutes: 25,
    badge: 'Best Value',
    features: ['25 minutes of video', '1080p resolution', 'AI narration & captions', '30+ voices & 12 languages', 'Brand kit', 'Priority rendering'],
    cta: 'Get Started',
    highlight: true,
  },
  {
    name: 'Business',
    price: 100,
    minutes: 50,
    badge: null,
    features: ['50 minutes of video', '1080p resolution', 'All export options', '30+ voices & 12 languages', 'Brand kit', 'API access', 'Analytics dashboard'],
    cta: 'Get Started',
    highlight: false,
  },
];

export default function PricingSection() {
  return (
    <section className="section-padding border-t border-white/[0.04]">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Simple Pricing</h2>
          <p className="text-muted-foreground">Buy video minutes. No subscriptions, no surprises.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`rounded-2xl p-7 md:p-8 ${
                plan.highlight
                  ? 'glass-card glow-border border-primary/30 relative'
                  : 'glass-card'
              }`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold ${plan.highlight ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
                  {plan.badge}
                </div>
              )}
              <h3 className="text-xl font-semibold text-foreground mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold text-foreground">
                  ${plan.price}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">{plan.minutes} minutes of video</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <GetStartedButton
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-center block ${
                  plan.highlight
                    ? 'btn-primary-glow !py-3 !text-sm'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                {plan.cta}
              </GetStartedButton>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
