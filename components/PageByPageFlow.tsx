'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Download, RotateCcw, ChevronRight } from 'lucide-react';
import { PageByPageStep, PageScript, PageVideo } from '@/types';
import { API_BASE } from '@/lib/api';

interface PageByPageFlowProps {
  pdfFile: File;
  extractedText: string;
  pageCount: number;
  onReset: () => void;
}

const STEP_LABELS: Record<PageByPageStep, string> = {
  'converting-pages': 'Converting pages',
  'generating-scripts': 'Generating scripts',
  'generating-videos': 'Generating videos',
  'stitching': 'Stitching video',
  'done': 'Done',
  'error': 'Error',
};

const STEPS_ORDER: PageByPageStep[] = [
  'converting-pages',
  'generating-scripts',
  'generating-videos',
  'stitching',
  'done',
];

export default function PageByPageFlow({
  pdfFile,
  extractedText,
  pageCount,
  onReset,
}: PageByPageFlowProps) {
  const [step, setStep] = useState<PageByPageStep>('converting-pages');
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [localPaths, setLocalPaths] = useState<string[]>([]);
  const [scripts, setScripts] = useState<PageScript[]>([]);
  const [pageVideos, setPageVideos] = useState<PageVideo[]>([]);
  const [videosReady, setVideosReady] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null);
  const startedRef = useRef(false);

  // Poll video statuses
  const pollVideos = useCallback(async (videos: PageVideo[]): Promise<PageVideo[]> => {
    const updated = [...videos];
    let allReady = true;
    let readyCount = 0;

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'ready') {
        readyCount++;
        continue;
      }

      try {
        const res = await fetch(`${API_BASE}/api/video-status?videoId=${updated[i].videoId}`);
        const data = await res.json();
        if (data.success) {
          updated[i] = {
            ...updated[i],
            status: data.status,
            hostedUrl: data.hostedUrl,
            downloadUrl: data.downloadUrl,
          };
          if (data.status === 'ready') {
            readyCount++;
          } else if (data.status === 'error') {
            throw new Error(`Video for page ${updated[i].pageNumber} failed: ${data.errorMessage}`);
          } else {
            allReady = false;
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('failed')) throw err;
        allReady = false;
      }
    }

    setVideosReady(readyCount);

    if (!allReady) {
      // Wait 10 seconds and poll again
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return pollVideos(updated);
    }

    return updated;
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        // Step 1: Convert pages to images
        setStep('converting-pages');
        const formData = new FormData();
        formData.append('file', pdfFile);

        const convertRes = await fetch(`${API_BASE}/api/convert-pages`, {
          method: 'POST',
          body: formData,
        });
        const convertData = await convertRes.json();
        if (!convertData.success) {
          throw new Error(convertData.error || 'Failed to convert pages');
        }
        setImageUrls(convertData.imageUrls);
        setLocalPaths(convertData.localPaths || []);

        // Step 2: Generate scripts
        setStep('generating-scripts');

        // Split text by page (best effort)
        const textByPage = splitTextByPage(extractedText, pageCount);

        const scriptsRes = await fetch(`${API_BASE}/api/generate-page-scripts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textByPage,
            fullText: extractedText,
          }),
        });
        const scriptsData = await scriptsRes.json();
        if (!scriptsData.success) {
          throw new Error(scriptsData.error || 'Failed to generate scripts');
        }
        setScripts(scriptsData.scripts);

        // Step 3: Generate videos via Tavus
        setStep('generating-videos');
        const allScripts: PageScript[] = scriptsData.scripts;
        const numVideos = allScripts.length;
        setTotalVideos(numVideos);

        const videos: PageVideo[] = [];

        for (const scriptItem of allScripts) {
          // No background sent to Tavus — PiP compositing happens during stitch
          const payload: Record<string, string> = {
            script: scriptItem.script,
            videoName: scriptItem.pageNumber === 0
              ? 'Intro'
              : `Page ${scriptItem.pageNumber}`,
          };

          const videoRes = await fetch(`${API_BASE}/api/generate-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const videoData = await videoRes.json();

          if (!videoData.success) {
            throw new Error(videoData.error || `Failed to generate video for page ${scriptItem.pageNumber}`);
          }

          videos.push({
            pageNumber: scriptItem.pageNumber,
            videoId: videoData.videoId,
            status: videoData.status || 'queued',
            hostedUrl: videoData.hostedUrl,
          });
        }

        setPageVideos(videos);

        // Poll until all ready
        const readyVideos = await pollVideos(videos);
        setPageVideos(readyVideos);

        // Step 4: Stitch videos
        setStep('stitching');

        // Collect download URLs in order (intro first, then pages)
        const orderedVideos = readyVideos.sort((a, b) => a.pageNumber - b.pageNumber);
        const downloadUrls = orderedVideos
          .map((v) => v.downloadUrl)
          .filter((url): url is string => !!url);

        if (downloadUrls.length === 0) {
          throw new Error('No download URLs available for stitching');
        }

        const stitchRes = await fetch(`${API_BASE}/api/stitch-videos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoUrls: downloadUrls,
            imageUrls: convertData.localPaths || [],
          }),
        });
        const stitchData = await stitchRes.json();

        if (!stitchData.success) {
          throw new Error(stitchData.error || 'Failed to stitch videos');
        }

        setOutputVideoUrl(stitchData.outputUrl);
        setStep('done');
      } catch (err) {
        console.error('Page-by-page flow error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setStep('error');
      }
    };

    run();
  }, [pdfFile, extractedText, pageCount, pollVideos]);

  const currentStepIndex = STEPS_ORDER.indexOf(step);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Page-by-Page Video</h2>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS_ORDER.filter((s) => s !== 'done').map((s, index) => {
          const isCompleted = step === 'done' || index < currentStepIndex;
          const isCurrent = s === step;

          return (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary/20'
                      : isCurrent
                        ? 'bg-primary/20'
                        : 'bg-secondary'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : isCurrent ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-primary animate-progress-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium transition-colors duration-300 ${
                    isCompleted
                      ? 'text-primary'
                      : isCurrent
                        ? 'text-foreground'
                        : 'text-muted-foreground/50'
                  }`}
                >
                  {STEP_LABELS[s]}
                  {s === 'generating-videos' && isCurrent && totalVideos > 0
                    ? ` (${videosReady}/${totalVideos})`
                    : ''}
                </span>
              </div>
              {index < STEPS_ORDER.length - 2 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground mx-1 flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Status Message */}
      {step !== 'done' && step !== 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4 py-8"
        >
          {/* Waveform animation */}
          <div className="flex items-center justify-center gap-1 mb-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary/30 rounded-full animate-pulse-glow"
                style={{
                  height: `${12 + Math.sin(i * 0.8) * 10}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {step === 'converting-pages' && 'Converting PDF pages to images...'}
            {step === 'generating-scripts' && 'Generating narration scripts for each page...'}
            {step === 'generating-videos' && `Generating videos... ${videosReady} of ${totalVideos} ready`}
            {step === 'stitching' && 'Stitching all videos into one...'}
          </p>
          {step === 'generating-videos' && totalVideos > 0 && (
            <div className="w-64 mx-auto bg-secondary rounded-full h-2 overflow-hidden">
              <motion.div
                className="bg-primary h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(videosReady / totalVideos) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
          {(step === 'generating-videos' || step === 'stitching') && (
            <p className="text-xs text-muted-foreground">This may take several minutes</p>
          )}
        </motion.div>
      )}

      {/* Error State */}
      {step === 'error' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center space-y-3"
        >
          <div className="w-12 h-12 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <p className="text-sm text-destructive">{error}</p>
        </motion.div>
      )}

      {/* Done State — Video Player */}
      {step === 'done' && outputVideoUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
            <p className="text-sm text-primary font-medium">Your page-by-page video is ready!</p>
          </div>

          <div className="glass-card overflow-hidden glow-border">
            <div className="aspect-video bg-card">
              <video
                src={outputVideoUrl}
                controls
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <a
            href={outputVideoUrl}
            download
            className="btn-primary-glow w-full flex items-center justify-center gap-2 text-center"
          >
            <Download className="w-5 h-5" />
            Download Video
          </a>
        </motion.div>
      )}

      {/* Start Over */}
      <div className="pt-4 border-t border-white/[0.08]">
        <button
          onClick={onReset}
          className="btn-ghost-outline w-full flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Start Over
        </button>
      </div>
    </div>
  );
}

/**
 * Split text by page (client-side helper, mirrors lib/pages.ts logic)
 */
function splitTextByPage(fullText: string, pageCount: number): string[] {
  // Try splitting by form feed first
  let pages = fullText.split(/\f/);
  if (pages.length === pageCount) {
    return pages.map((p) => p.trim()).filter(Boolean);
  }

  // Distribute paragraphs evenly
  const paragraphs = fullText.split(/\n{2,}/);
  if (paragraphs.length >= pageCount) {
    const perPage = Math.ceil(paragraphs.length / pageCount);
    pages = [];
    for (let i = 0; i < pageCount; i++) {
      const start = i * perPage;
      const end = Math.min(start + perPage, paragraphs.length);
      pages.push(paragraphs.slice(start, end).join('\n\n'));
    }
    return pages.map((p) => p.trim()).filter(Boolean);
  }

  return [fullText.trim()];
}
