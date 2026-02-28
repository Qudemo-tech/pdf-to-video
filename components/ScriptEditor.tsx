'use client';

import { useState } from 'react';
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
          <h3 className="text-sm font-semibold text-gray-700">Extracted Text</h3>
          <span className="text-xs text-gray-500">
            {pageCount} pages &middot; {characterCount.toLocaleString()} characters
          </span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{extractedText}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            disabled={isGenerating}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            {toneOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={isGenerating}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
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
        className="w-full py-3 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
          'Regenerate Script'
        ) : (
          'Generate Script'
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Script Editor */}
      {scriptGenerated && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Video Script</h3>
            <span className="text-xs text-gray-500">
              {wordCount} words &middot; ~{estimatedDuration}s
            </span>
          </div>
          <textarea
            value={script}
            onChange={(e) => handleScriptChange(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            placeholder="Your video script will appear here..."
          />
          <p className="text-xs text-gray-500">
            You can edit the script above before generating the video.
          </p>
          <button
            onClick={() => onVideoGenerate(script)}
            disabled={!script.trim()}
            className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Generate Video
          </button>
        </div>
      )}
    </div>
  );
}
