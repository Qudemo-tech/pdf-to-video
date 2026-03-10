'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Download, Copy, Check, AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';
import { VideoStatus } from '@/types';
import { API_BASE } from '@/lib/api';
import { updateSession } from '@/lib/sessions';
import { downloadWithFilename } from '@/lib/download';

interface VideoPlayerProps {
  videoId: string;
  initialHostedUrl: string;
  onReset: () => void;
  dbSessionId: string | null;
  downloadFileName?: string;
}

export default function VideoPlayer({ videoId, initialHostedUrl, onReset, dbSessionId, downloadFileName }: VideoPlayerProps) {
  const [status, setStatus] = useState<VideoStatus>('queued');
  const [hostedUrl, setHostedUrl] = useState(initialHostedUrl);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const sanitizeError = (msg: string): string => {
    return msg.replace(/tavus/gi, 'video service');
  };

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
            setErrorMessage(sanitizeError(data.errorMessage || 'Video generation failed'));
            // Mark session as failed
            if (dbSessionId) {
              updateSession(dbSessionId, { status: 'failed' });
            }
          }
          // Save GCS URL and mark completed in Supabase
          if (data.status === 'ready' && dbSessionId) {
            updateSession(dbSessionId, {
              hosted_url: data.gcsUrl || data.hostedUrl || null,
              status: 'completed',
            });
          }
        }
      }
    } catch {
      // Silently retry on next poll
    }
  }, [videoId, dbSessionId]);

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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-5 py-8"
        >
          {/* Waveform animation */}
          <div className="flex items-center justify-center gap-1 mb-4">
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

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-3">
            <div className={`flex items-center gap-1.5 ${status === 'queued' ? 'text-primary' : 'text-primary'}`}>
              <div className={`w-3 h-3 rounded-full ${status === 'queued' ? 'bg-primary animate-progress-pulse' : 'bg-primary'}`} />
              <span className="text-sm font-medium">Queued</span>
            </div>
            <div className="w-8 h-px bg-secondary" />
            <div className={`flex items-center gap-1.5 ${status === 'generating' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-3 h-3 rounded-full ${status === 'generating' ? 'bg-primary animate-progress-pulse' : 'bg-secondary'}`} />
              <span className="text-sm font-medium">Generating</span>
            </div>
            <div className="w-8 h-px bg-secondary" />
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="w-3 h-3 rounded-full bg-secondary" />
              <span className="text-sm font-medium">Ready</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {status === 'queued' ? 'Your video is queued for processing...' : 'Your video is being generated...'}
          </p>
          <p className="text-xs text-muted-foreground">Elapsed: {formatTime(elapsedSeconds)}</p>
        </motion.div>
      )}

      {/* Error State */}
      {(status === 'error' || errorMessage) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center space-y-3"
        >
          <div className="w-12 h-12 mx-auto bg-destructive/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <p className="text-sm text-destructive">{errorMessage}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground text-sm font-medium rounded-lg hover:brightness-110 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </motion.div>
      )}

      {/* Ready State — Video Player */}
      {status === 'ready' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
            <p className="text-sm text-primary font-medium">Your video is ready!</p>
          </div>

          <div className="glass-card overflow-hidden glow-border">
            <div className="aspect-video bg-card">
              <video
                src={downloadUrl || hostedUrl}
                controls
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {downloadUrl && (
              <button
                onClick={() => downloadWithFilename(downloadUrl, downloadFileName || 'video.mp4')}
                className="btn-primary-glow flex-1 flex items-center justify-center gap-2 text-center"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className="btn-ghost-outline flex-1 flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Start Over */}
      <div className="pt-4 border-t border-white/[0.08]">
        <button
          onClick={onReset}
          className="btn-ghost-outline w-full flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Create Another Video
        </button>
      </div>
    </div>
  );
}
