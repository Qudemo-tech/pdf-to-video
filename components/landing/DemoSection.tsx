'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

export default function DemoSection() {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current || !isDragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(5, Math.min(95, pos)));
  }, []);

  const handlePointerDown = () => { isDragging.current = true; };
  const handlePointerUp = () => { isDragging.current = false; };

  return (
    <section id="demo" className="section-padding grain-overlay">
      <div className="container mx-auto max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">See the Difference</h2>
          <p className="text-muted-foreground text-lg">Drag the slider to compare</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative aspect-video glass-card overflow-hidden cursor-col-resize select-none"
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerMove={(e) => handleMove(e.clientX)}
        >
          {/* Left: Static PDF */}
          <div className="absolute inset-0 bg-[#1a1a2e] flex items-center justify-center p-8 md:p-16">
            <div className="w-full max-w-md bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 md:p-10">
              <div className="space-y-3">
                <div className="h-4 bg-white/[0.06] rounded w-3/4" />
                <div className="h-3 bg-white/[0.04] rounded w-full" />
                <div className="h-3 bg-white/[0.04] rounded w-5/6" />
                <div className="h-3 bg-white/[0.04] rounded w-2/3" />
                <div className="mt-6 h-20 bg-white/[0.03] rounded" />
                <div className="h-3 bg-white/[0.04] rounded w-1/2" />
              </div>
              <p className="text-xs text-muted-foreground/50 mt-6 text-center">Static PDF Slide</p>
            </div>
          </div>

          {/* Right: Polished video */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-card to-accent/10 flex items-center justify-center p-8 md:p-16">
              <div className="w-full max-w-md glass-card p-6 md:p-10 glow-border">
                <div className="space-y-3">
                  <div className="h-4 bg-primary/30 rounded w-3/4" />
                  <div className="h-3 bg-foreground/20 rounded w-full" />
                  <div className="h-3 bg-foreground/20 rounded w-5/6" />
                  <div className="h-3 bg-foreground/15 rounded w-2/3" />
                  <div className="mt-6 h-20 bg-gradient-to-r from-primary/20 to-accent/20 rounded flex items-center justify-center">
                    <Play className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex gap-1 mt-2">
                    <div className="h-1.5 bg-primary/40 rounded flex-1" />
                    <div className="h-1.5 bg-accent/30 rounded flex-1" />
                  </div>
                </div>
                <div className="mt-4 px-3 py-1.5 bg-black/40 rounded-md">
                  <p className="text-xs text-foreground/80">&#9654; &quot;Here&apos;s our quarterly growth...&quot;</p>
                </div>
              </div>
            </div>
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-foreground/60 z-20"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-foreground/90 flex items-center justify-center shadow-lg">
              <span className="text-background text-xs font-bold">&#10231;</span>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-muted-foreground text-sm mt-6">
          This took <span className="text-foreground font-semibold">47 seconds</span>. No editing required.
        </p>
      </div>
    </section>
  );
}
