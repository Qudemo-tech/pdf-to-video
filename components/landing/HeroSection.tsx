'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileText, Maximize, Minimize, Pause, Play, Presentation } from 'lucide-react';

const DEMO_VIDEO = 'https://storage.googleapis.com/pdftovideo/videos/stitched-1774419048529.mp4';

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false;
      videoRef.current.play();
      setIsStarted(true);
      setIsPaused(false);
    }
  };

  const togglePause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

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
                Convert Your First PDF &rarr;
              </a>
              <a href="#how-it-works" className="btn-ghost-outline inline-block">
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
            {/* Floating file icons */}
            <div className="absolute -top-8 -left-8 glass-card px-5 py-5 animate-slide-transform opacity-70 hidden lg:block">
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-6 h-6 text-red-400" />
                <span className="text-xs font-medium text-muted-foreground">.pdf</span>
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 glass-card px-5 py-5 animate-slide-transform opacity-50 hidden lg:block" style={{ animationDelay: '2s' }}>
              <div className="flex flex-col items-center gap-2">
                <Presentation className="w-6 h-6 text-orange-400" />
                <span className="text-xs font-medium text-muted-foreground">.pptx</span>
              </div>
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
                    pdf-to-video.com
                  </div>
                </div>
              </div>
              <div ref={containerRef} className="aspect-video bg-card relative group/video">
                <video
                  ref={videoRef}
                  src={DEMO_VIDEO}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
                {!isStarted ? (
                  <motion.button
                    initial={{ opacity: 1 }}
                    onClick={handlePlay}
                    className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors duration-200"
                    >
                      <Play className="w-7 h-7 text-white fill-white ml-1" />
                    </motion.div>
                  </motion.button>
                ) : (
                  <button
                    onClick={togglePause}
                    className="absolute inset-0 flex items-center justify-center cursor-pointer group/pause"
                  >
                    <div className={`w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center transition-opacity duration-200 ${isPaused ? 'opacity-100' : 'opacity-0 group-hover/pause:opacity-100'}`}>
                      {isPaused ? (
                        <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                      ) : (
                        <Pause className="w-6 h-6 text-white fill-white" />
                      )}
                    </div>
                  </button>
                )}
                {isStarted && (
                  <button
                    onClick={toggleFullscreen}
                    className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover/video:opacity-100 transition-opacity duration-200 hover:bg-black/70 z-10"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
