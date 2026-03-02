'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const tabs = [
  {
    label: 'Sales & Revenue Teams',
    content: 'Replace pitch decks with async video proposals. Prospects watch 68% more video than they read slides.',
    quote: 'We closed 3 enterprise deals in one quarter just by switching from PDFs to video proposals. The response rate doubled.',
    author: 'Sarah Chen',
    role: 'VP Sales, TechCorp',
  },
  {
    label: 'Educators & Trainers',
    content: 'Flip your classroom. Students rewatch video lessons 3x more than they re-read PDFs.',
    quote: "My students' engagement scores went up 40% after I started sending video lectures instead of slide decks.",
    author: 'Dr. James Rivera',
    role: 'Professor, Stanford Online',
  },
  {
    label: 'Creators & Marketers',
    content: 'Repurpose your content. Turn one webinar deck into 10 short-form videos for social.',
    quote: 'I repurposed a 30-slide deck into 12 LinkedIn videos in under an hour. Content creation on autopilot.',
    author: 'Mika Patel',
    role: 'Content Lead, ScaleUp',
  },
];

export default function UseCases() {
  const [active, setActive] = useState(0);

  return (
    <section className="section-padding border-t border-white/[0.04]">
      <div className="container mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
        >
          Built for Your Workflow
        </motion.h2>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActive(i)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                active === i
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-8 md:p-12"
          >
            <p className="text-lg text-foreground mb-8 max-w-2xl">{tabs[active].content}</p>
            <div className="border-l-2 border-primary/40 pl-6">
              <p className="text-muted-foreground italic mb-4">&ldquo;{tabs[active].quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                  {tabs[active].author[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{tabs[active].author}</p>
                  <p className="text-xs text-muted-foreground">{tabs[active].role}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
