'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
      <h2 className="text-xl font-semibold text-gray-900">Page-by-Page Video</h2>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS_ORDER.filter((s) => s !== 'done').map((s, index) => {
          const isCompleted = step === 'done' || index < currentStepIndex;
          const isCurrent = s === step;

          return (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <div
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    isCompleted
                      ? 'bg-green-500'
                      : isCurrent
                        ? 'bg-blue-600 animate-pulse'
                        : 'bg-gray-300'
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    isCompleted
                      ? 'text-green-600'
                      : isCurrent
                        ? 'text-blue-600'
                        : 'text-gray-400'
                  }`}
                >
                  {STEP_LABELS[s]}
                  {s === 'generating-videos' && isCurrent && totalVideos > 0
                    ? ` (${videosReady}/${totalVideos})`
                    : ''}
                </span>
              </div>
              {index < STEPS_ORDER.length - 2 && (
                <svg className="w-4 h-4 text-gray-300 mx-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Status Message */}
      {step !== 'done' && step !== 'error' && (
        <div className="text-center space-y-3 py-8">
          <div className="w-12 h-12 mx-auto">
            <svg className="animate-spin w-12 h-12 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            {step === 'converting-pages' && 'Converting PDF pages to images...'}
            {step === 'generating-scripts' && 'Generating narration scripts for each page...'}
            {step === 'generating-videos' && `Generating videos... ${videosReady} of ${totalVideos} ready`}
            {step === 'stitching' && 'Stitching all videos into one...'}
          </p>
          {step === 'generating-videos' && totalVideos > 0 && (
            <div className="w-64 mx-auto bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(videosReady / totalVideos) * 100}%` }}
              />
            </div>
          )}
          {(step === 'generating-videos' || step === 'stitching') && (
            <p className="text-xs text-gray-400">This may take several minutes</p>
          )}
        </div>
      )}

      {/* Error State */}
      {step === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Done State — Video Player */}
      {step === 'done' && outputVideoUrl && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm text-green-700 font-medium">Your page-by-page video is ready!</p>
          </div>

          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              src={outputVideoUrl}
              controls
              className="w-full h-full"
            />
          </div>

          <a
            href={outputVideoUrl}
            download
            className="w-full py-3 px-4 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Video
          </a>
        </div>
      )}

      {/* Start Over */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={onReset}
          className="w-full py-3 px-4 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
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
