'use client';

import { motion } from 'framer-motion';
import { Mic, Captions, Palette } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'AI Narration',
    desc: 'Natural-sounding voiceover generated from your slide content. Choose from 30+ voices and 12 languages.',
  },
  {
    icon: Captions,
    title: 'Auto Captions & Motion',
    desc: 'Every slide gets smooth transitions, kinetic text, and burned-in captions. Accessibility built in.',
  },
  {
    icon: Palette,
    title: 'Brand Kit Ready',
    desc: 'Upload your logo, fonts, and colors. Every video stays on-brand automatically.',
  },
];

export default function FeatureStrip() {
  return (
    <section className="section-padding border-t border-b border-white/[0.04]">
      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card-hover p-6 md:p-8"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
