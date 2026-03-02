'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Tone } from '@/types';
import { API_BASE } from '@/lib/api';

interface ScriptEditorProps {
  extractedText: string;
  pageCount: number;
  characterCount: number;
  onVideoGenerate: (script: string) => void;
}

const toneOptions: { value: Tone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'educational', label: 'Educational' },
];

const durationOptions = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 180, label: '3 minutes' },
];

export default function ScriptEditor({
  extractedText,
  pageCount,
  characterCount,
  onVideoGenerate,
}: ScriptEditorProps) {
  const [tone, setTone] = useState<Tone>('professional');
  const [duration, setDuration] = useState(120);
  const [script, setScript] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptGenerated, setScriptGenerated] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState(0);

  const handleGenerateScript = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedText,
          tone,
          maxLengthSeconds: duration,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to generate script');
        return;
      }

      setScript(data.script);
      setWordCount(data.wordCount);
      setEstimatedDuration(data.estimatedDurationSeconds);
      setScriptGenerated(true);
    } catch {
      setError('Failed to generate script. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScriptChange = (newScript: string) => {
    setScript(newScript);
    const words = newScript.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    setEstimatedDuration(Math.round((words / 150) * 60));
  };

  return (
    <div className="space-y-6">
      {/* Extracted Text Panel */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Extracted Text</h3>
          <span className="text-xs text-muted-foreground">
            {pageCount} pages &middot; {characterCount.toLocaleString()} characters
          </span>
        </div>
        <div className="bg-secondary border border-white/[0.08] rounded-lg p-4 max-h-48 overflow-y-auto">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{extractedText}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            disabled={isGenerating}
            className="w-full bg-secondary border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {toneOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-2">Target Duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={isGenerating}
            className="w-full bg-secondary border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {durationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Generate Script Button */}
      <button
        onClick={handleGenerateScript}
        disabled={isGenerating}
        className="btn-primary-glow w-full flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating Script (5-10 seconds)...
          </>
        ) : scriptGenerated ? (
          <>
            <Sparkles className="w-5 h-5" />
            Regenerate Script
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Script
          </>
        )}
      </button>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-destructive/10 border border-destructive/20 rounded-lg p-3"
          >
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Script Editor */}
      <AnimatePresence>
        {scriptGenerated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Video Script</h3>
              <span className="text-xs text-muted-foreground">
                {wordCount} words &middot; ~{estimatedDuration}s
              </span>
            </div>
            <textarea
              value={script}
              onChange={(e) => handleScriptChange(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 bg-secondary border border-white/[0.08] rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y placeholder:text-muted-foreground"
              placeholder="Your video script will appear here..."
            />
            <p className="text-xs text-muted-foreground">
              You can edit the script above before generating the video.
            </p>
            <button
              onClick={() => onVideoGenerate(script)}
              disabled={!script.trim()}
              className="btn-primary-glow w-full flex items-center justify-center gap-2 !bg-accent"
              style={{ boxShadow: '0 0 40px rgba(7, 182, 213, 0.4), 0 4px 16px rgba(7, 182, 213, 0.25)' }}
            >
              Generate Video
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
