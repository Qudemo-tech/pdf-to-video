'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { VideoStatus } from '@/types';
import { API_BASE } from '@/lib/api';

interface VideoPlayerProps {
  videoId: string;
  initialHostedUrl: string;
  onReset: () => void;
}

export default function VideoPlayer({ videoId, initialHostedUrl, onReset }: VideoPlayerProps) {
  const [status, setStatus] = useState<VideoStatus>('queued');
  const [hostedUrl, setHostedUrl] = useState(initialHostedUrl);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/video-status?videoId=${videoId}`);
      const data = await response.json();

      if (data.success) {
        setStatus(data.status);
        if (data.hostedUrl) setHostedUrl(data.hostedUrl);
        if (data.downloadUrl) setDownloadUrl(data.downloadUrl);

        if (data.status === 'ready' || data.status === 'error') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          if (data.status === 'error') {
            setErrorMessage(data.errorMessage || 'Video generation failed');
          }
        }
      }
    } catch {
      // Silently retry on next poll
    }
  }, [videoId]);

  useEffect(() => {
    // Start polling every 10 seconds
    pollStatus();
    pollRef.current = setInterval(pollStatus, 10000);

    // Elapsed time counter
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        // Stop after 10 minutes and show timeout message
        if (prev >= 600) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setErrorMessage(
            `Video is taking longer than expected. You can check back using this link: ${hostedUrl}`
          );
          return prev;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pollStatus, hostedUrl]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(hostedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetry = () => {
    setStatus('queued');
    setErrorMessage(null);
    setElapsedSeconds(0);
    pollStatus();
    pollRef.current = setInterval(pollStatus, 10000);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Status Indicators */}
      {(status === 'queued' || status === 'generating') && !errorMessage && (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto">
            <svg className="animate-spin w-16 h-16 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-3">
            <div className={`flex items-center gap-1.5 ${status === 'queued' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-3 h-3 rounded-full ${status === 'queued' ? 'bg-blue-600 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-sm font-medium">Queued</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className={`flex items-center gap-1.5 ${status === 'generating' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-3 h-3 rounded-full ${status === 'generating' ? 'bg-blue-600 animate-pulse' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium">Generating</span>
            </div>
            <div className="w-8 h-px bg-gray-300" />
            <div className="flex items-center gap-1.5 text-gray-400">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span className="text-sm font-medium">Ready</span>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            {status === 'queued' ? 'Your video is queued for processing...' : 'Your video is being generated...'}
          </p>
          <p className="text-xs text-gray-400">Elapsed: {formatTime(elapsedSeconds)}</p>
        </div>
      )}

      {/* Error State */}
      {(status === 'error' || errorMessage) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-red-700">{errorMessage}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Ready State — Video Player */}
      {status === 'ready' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm text-green-700 font-medium">Your video is ready!</p>
          </div>

          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              src={hostedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {downloadUrl && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            )}
            <button
              onClick={handleCopyLink}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Start Over */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={onReset}
          className="w-full py-3 px-4 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          Create Another Video
        </button>
      </div>
    </div>
  );
}
