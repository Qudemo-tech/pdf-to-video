'use client';

import { motion } from 'framer-motion';
import { CloudUpload, Sparkles, Play } from 'lucide-react';

const steps = [
  {
    icon: CloudUpload,
    title: 'Upload',
    desc: 'Upload or drag PDF file',
  },
  {
    icon: Sparkles,
    title: 'AI Processes',
    desc: 'We analyze your content, generate a script, pick the right voice, add motion.',
  },
  {
    icon: Play,
    title: 'Download & Share',
    desc: 'Download MP4 file. Also get the video in your email',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding">
      <div className="container mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-foreground text-center mb-16"
        >
          How It Works
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-center relative z-10"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <span className="text-xs font-medium text-primary uppercase tracking-widest mb-2 block">
                Step {i + 1}
              </span>
              <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
