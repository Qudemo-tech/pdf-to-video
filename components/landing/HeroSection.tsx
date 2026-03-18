'use client';

import { motion } from 'framer-motion';

const DEMO_VIDEO = 'https://storage.cloud.google.com/pdftovideo/6d4bd452.mp4';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center section-padding grain-overlay overflow-hidden pt-24">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-bold leading-[1.05] tracking-[-0.02em] text-foreground mb-6">
              Stop Sending Slides.{' '}
              <span className="text-gradient-primary">Send Videos That Explain.</span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8 max-w-xl">
              Transform your PDFs into engaging videos with AI-powered narration. Upload, generate, and share in minutes.
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <a href="#upload" className="btn-primary-glow inline-block">
                Convert Your First PDF Free &rarr;
              </a>
              <a href="#demo" className="btn-ghost-outline inline-block">
                See How It Works
              </a>
            </div>

          </motion.div>

          {/* Right - Video mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            {/* Floating PDF thumbnails */}
            <div className="absolute -top-8 -left-8 w-20 h-28 glass-card p-1 animate-slide-transform opacity-60 hidden lg:block">
              <div className="w-full h-full bg-muted/30 rounded-md flex items-center justify-center text-xs text-muted-foreground">PDF</div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-16 h-22 glass-card p-1 animate-slide-transform opacity-40 hidden lg:block" style={{ animationDelay: '2s' }}>
              <div className="w-full h-full bg-muted/30 rounded-md flex items-center justify-center text-xs text-muted-foreground">PPTX</div>
            </div>
            <div className="absolute top-1/2 -right-10 w-14 h-20 glass-card p-1 animate-float opacity-30 hidden lg:block">
              <div className="w-full h-full bg-muted/30 rounded-md flex items-center justify-center text-xs text-muted-foreground">PDF</div>
            </div>

            {/* Browser frame */}
            <div className="glass-card overflow-hidden glow-border">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                  <div className="w-3 h-3 rounded-full bg-white/10" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white/[0.06] rounded-md px-3 py-1 text-xs text-muted-foreground text-center">
                    pdftovideo.ai/demo
                  </div>
                </div>
              </div>
              <div className="aspect-video bg-card">
                <video
                  src={DEMO_VIDEO}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
