'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const DEMO_PDF = 'https://storage.cloud.google.com/pdftovideo/pdfs/pdftovideo.pdf';
const DEMO_VIDEO = 'https://storage.cloud.google.com/pdftovideo/videos/WhatsApp%20Video%202026-03-16%20at%201.13.55%20AM.mp4';

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
          {/* Left: Video */}
          <div className="absolute inset-0">
            <video
              src={DEMO_VIDEO}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
              <p className="text-xs text-white/80">AI Video</p>
            </div>
          </div>

          {/* Right: Static PDF */}
          <div
            className="absolute inset-0 overflow-hidden bg-[#1a1a2e]"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          >
            <iframe
              src={DEMO_PDF}
              className="absolute top-0 h-full border-0 pointer-events-none"
              style={{ left: '-200px', width: 'calc(100% + 200px)' }}
              title="PDF preview"
            />
            {/* Cover GCS viewer "anonymous" label */}
            <div className="absolute top-0 left-0 w-40 h-10 bg-[#1a1a2e]" />
            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm rounded px-2 py-1">
              <p className="text-xs text-white/80">Static PDF</p>
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
