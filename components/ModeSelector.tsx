'use client';

import { motion } from 'framer-motion';
import { Play, LayoutGrid } from 'lucide-react';
import { VideoMode } from '@/types';

interface ModeSelectorProps {
  onModeSelect: (mode: VideoMode) => void;
}

export default function ModeSelector({ onModeSelect }: ModeSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Choose Video Mode</h2>
        <p className="text-sm text-muted-foreground">How would you like your PDF presented?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Summary */}
        <motion.button
          onClick={() => onModeSelect('summary')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group p-6 glass-card-hover text-left"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <Play className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Summary</h3>
          <p className="text-sm text-muted-foreground">
            Get a concise video summary of your entire document
          </p>
        </motion.button>

        {/* Card 2: Page-by-Page */}
        <motion.button
          onClick={() => onModeSelect('page-by-page')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="group p-6 glass-card-hover text-left"
        >
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
            <LayoutGrid className="w-6 h-6 text-accent" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Page-by-Page</h3>
          <p className="text-sm text-muted-foreground">
            Watch an explained walkthrough of every page
          </p>
        </motion.button>
      </div>
    </div>
  );
}
