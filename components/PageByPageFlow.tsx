'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Download, RotateCcw } from 'lucide-react';
import { PageByPageStep, PageScript, PageVideo } from '@/types';
import { API_BASE } from '@/lib/api';
import { updateSession, getSessionById } from '@/lib/sessions';
import { downloadWithFilename } from '@/lib/download';
import { checkCredits, deductCredits } from '@/lib/credits';

interface PbpSessionData {
  step: PageByPageStep;
  imageUrls: string[];
  localPaths: string[];
  scripts: PageScript[];
  pageVideos: PageVideo[];
  totalVideos: number;
  outputVideoUrl: string | null;
}

interface PageByPageFlowProps {
  pdfFile: File | null;
  extractedText: string;
  pageCount: number;
  onReset: () => void;
  dbSessionId: string | null;
  downloadFileName?: string;
  userEmail?: string;
  userName?: string;
  creditBalance?: number;
  onCreditsChanged?: (balance: number) => void;
}


export default function PageByPageFlow({
  pdfFile,
  extractedText,
  pageCount,
  onReset,
  dbSessionId,
  downloadFileName,
  userEmail,
  userName,
  creditBalance,
  onCreditsChanged,
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

  // Insufficient credits prompt state
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [creditsNeeded, setCreditsNeeded] = useState(0);
  const [creditsAvailable, setCreditsAvailable] = useState(0);
  const [affordablePageCount, setAffordablePageCount] = useState(0);
  // Store pipeline data needed to resume after user choice
  const pendingPipelineRef = useRef<{
    allScripts: PageScript[];
    convertData: { imageUrls: string[]; localPaths: string[] };
  } | null>(null);

  // Save page-by-page state to Supabase
  const savePbpToDb = useCallback(async (data: PbpSessionData) => {
    if (!dbSessionId) return;
    await updateSession(dbSessionId, {
      current_step: 'page-by-page',
      pbp_data: data as unknown as Record<string, unknown>,
      ...(data.step === 'done' ? { status: 'completed' } : {}),
    });
  }, [dbSessionId]);

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

  // Stitch videos into final output
  const stitchVideos = useCallback(async (readyVideos: PageVideo[], savedLocalPaths: string[]) => {
    setStep('stitching');

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
        imageUrls: savedLocalPaths,
      }),
    });
    const stitchData = await stitchRes.json();

    if (!stitchData.success) {
      throw new Error(stitchData.error || 'Failed to stitch videos');
    }

    // Save GCS URL to Supabase hosted_url
    if (dbSessionId && stitchData.gcsUrl) {
      await updateSession(dbSessionId, { hosted_url: stitchData.gcsUrl });
    }

    return stitchData.outputUrl as string;
  }, [dbSessionId]);

  // Resume from generating-videos step (poll + stitch)
  const resumeFromVideos = useCallback(async (videos: PageVideo[], savedLocalPaths: string[]) => {
    setStep('generating-videos');
    setPageVideos(videos);
    setTotalVideos(videos.length);

    const readyVideos = await pollVideos(videos);
    setPageVideos(readyVideos);

    // Save progress before stitching
    await savePbpToDb({
      step: 'stitching',
      imageUrls,
      localPaths: savedLocalPaths,
      scripts,
      pageVideos: readyVideos,
      totalVideos: readyVideos.length,
      outputVideoUrl: null,
    });

    const outputUrl = await stitchVideos(readyVideos, savedLocalPaths);

    setOutputVideoUrl(outputUrl);
    setStep('done');

    await savePbpToDb({
      step: 'done',
      imageUrls,
      localPaths: savedLocalPaths,
      scripts,
      pageVideos: readyVideos,
      totalVideos: readyVideos.length,
      outputVideoUrl: outputUrl,
    });

    // Deduct credits based on total script word count
    if (userEmail && scripts.length > 0) {
      const totalWords = scripts.reduce((sum, s) => sum + (s.wordCount || 0), 0);
      const totalMinutes = Math.round((totalWords / 150) * 100) / 100;
      if (totalMinutes > 0) {
        const result = await deductCredits({
          user_email: userEmail,
          amount: totalMinutes,
          video_session_id: dbSessionId || undefined,
          description: downloadFileName ? `Video: ${downloadFileName.replace(/\.mp4$/, '')}` : 'Page-by-page video',
        });
        onCreditsChanged?.(result.balance);
      }
    }

    // Send email notification (non-blocking)
    if (userEmail) {
      console.log('[PageByPageFlow:resume] Sending email notification — email:', userEmail, '| videoUrl:', outputUrl);
      fetch(`${API_BASE}/api/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          userName,
          videoUrl: outputUrl,
          mode: 'page-by-page',
        }),
      })
        .then((r) => r.json())
        .then((r) => console.log('[PageByPageFlow:resume] Notification response:', r))
        .catch((err) => console.error('[PageByPageFlow:resume] Notification error:', err));
    }
  }, [pollVideos, stitchVideos, savePbpToDb, imageUrls, scripts, userEmail, userName, dbSessionId, downloadFileName, onCreditsChanged]);

  // Generate videos, stitch, deduct credits, and send notification
  const generateVideosAndFinish = useCallback(async (
    scriptsToUse: PageScript[],
    convertData: { imageUrls: string[]; localPaths: string[] },
  ) => {
    setStep('generating-videos');
    setScripts(scriptsToUse);
    const numVideos = scriptsToUse.length;
    setTotalVideos(numVideos);

    const videos: PageVideo[] = [];

    for (const scriptItem of scriptsToUse) {
      const payload: Record<string, string> = {
        script: scriptItem.script,
        videoName: scriptItem.pageNumber === 0
          ? 'Intro'
          : `Page ${scriptItem.pageNumber}`,
        ...(userEmail ? { user_email: userEmail } : {}),
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

    // Save session so refresh can resume from here
    await savePbpToDb({
      step: 'generating-videos',
      imageUrls: convertData.imageUrls,
      localPaths: convertData.localPaths,
      scripts: scriptsToUse,
      pageVideos: videos,
      totalVideos: numVideos,
      outputVideoUrl: null,
    });

    // Poll until all ready
    const readyVideos = await pollVideos(videos);
    setPageVideos(readyVideos);

    // Stitch videos
    await savePbpToDb({
      step: 'stitching',
      imageUrls: convertData.imageUrls,
      localPaths: convertData.localPaths,
      scripts: scriptsToUse,
      pageVideos: readyVideos,
      totalVideos: numVideos,
      outputVideoUrl: null,
    });

    const outputUrl = await stitchVideos(readyVideos, convertData.localPaths);

    setOutputVideoUrl(outputUrl);
    setStep('done');

    // Save final state
    await savePbpToDb({
      step: 'done',
      imageUrls: convertData.imageUrls,
      localPaths: convertData.localPaths,
      scripts: scriptsToUse,
      pageVideos: readyVideos,
      totalVideos: numVideos,
      outputVideoUrl: outputUrl,
    });

    // Deduct credits based on total script word count
    if (userEmail) {
      const totalWords = scriptsToUse.reduce((sum: number, s: PageScript) => sum + (s.wordCount || 0), 0);
      const totalMinutes = Math.round((totalWords / 150) * 100) / 100;
      if (totalMinutes > 0) {
        const result = await deductCredits({
          user_email: userEmail,
          amount: totalMinutes,
          video_session_id: dbSessionId || undefined,
          description: downloadFileName ? `Video: ${downloadFileName.replace(/\.mp4$/, '')}` : 'Page-by-page video',
        });
        onCreditsChanged?.(result.balance);
      }
    }

    // Send email notification (non-blocking)
    if (userEmail) {
      fetch(`${API_BASE}/api/send-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          userName,
          videoUrl: outputUrl,
          mode: 'page-by-page',
        }),
      })
        .then((r) => r.json())
        .then((r) => console.log('[PageByPageFlow] Notification response:', r))
        .catch((err) => console.error('[PageByPageFlow] Notification error:', err));
    }
  }, [userEmail, userName, dbSessionId, downloadFileName, onCreditsChanged, savePbpToDb, pollVideos, stitchVideos]);

  // Handle user choosing to create partial video
  const handleCreatePartial = useCallback(async () => {
    setShowCreditPrompt(false);
    const pending = pendingPipelineRef.current;
    if (!pending) return;

    try {
      const partialScripts = pending.allScripts.slice(0, affordablePageCount);
      // Also trim localPaths to match — intro (page 0) has no background image,
      // so localPaths correspond to pages 1..N
      const pagesWithImages = partialScripts.filter(s => s.pageNumber > 0).length;
      const partialLocalPaths = pending.convertData.localPaths.slice(0, pagesWithImages);

      await generateVideosAndFinish(partialScripts, {
        imageUrls: pending.convertData.imageUrls.slice(0, pagesWithImages),
        localPaths: partialLocalPaths,
      });
    } catch (err) {
      console.error('Page-by-page flow error:', err);
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(msg.replace(/tavus/gi, 'video service'));
      setStep('error');
    }
  }, [affordablePageCount, generateVideosAndFinish]);

  // Handle user choosing to buy credits
  const handleBuyCredits = useCallback(() => {
    setShowCreditPrompt(false);
    // Navigate to pricing section
    window.location.href = '#pricing';
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Try to restore from Supabase
    const restoreAndRun = async () => {
      let saved: PbpSessionData | null = null;

      // Load saved pbp_data from Supabase
      if (dbSessionId) {
        try {
          const session = await getSessionById(dbSessionId);
          if (session?.pbp_data) {
            saved = session.pbp_data as unknown as PbpSessionData;
          }
        } catch { /* ignore */ }
      }

      if (saved) {
        // If done, show the final video immediately
        if (saved.step === 'done' && saved.outputVideoUrl) {
          setStep('done');
          setOutputVideoUrl(saved.outputVideoUrl);
          setImageUrls(saved.imageUrls);
          setLocalPaths(saved.localPaths);
          setScripts(saved.scripts);
          setPageVideos(saved.pageVideos);
          setTotalVideos(saved.totalVideos);
          setVideosReady(saved.totalVideos);
          return;
        }

        // If videos were submitted, resume polling + stitching
        if (
          (saved.step === 'generating-videos' || saved.step === 'stitching') &&
          saved.pageVideos.length > 0
        ) {
          setImageUrls(saved.imageUrls);
          setLocalPaths(saved.localPaths);
          setScripts(saved.scripts);

          try {
            await resumeFromVideos(saved.pageVideos, saved.localPaths);
          } catch (err) {
            console.error('Page-by-page resume error:', err);
            const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(msg.replace(/tavus/gi, 'video service'));
            setStep('error');
          }
          return;
        }

        // For earlier steps, we need the PDF file which can't be restored
        if (!pdfFile) {
          setError('Your session was interrupted during an early step. Please start over.');
          setStep('error');
          return;
        }
      }

      // No saved session or can't resume — need pdfFile to start fresh
      if (!pdfFile) {
        setError('No PDF file available. Please start over.');
        setStep('error');
        return;
      }

      await runFreshPipeline();
    };

    const runFreshPipeline = async () => {
      try {
        // Credit check before starting
        if (userEmail) {
          const creditCheck = await checkCredits(userEmail);
          if (!creditCheck.hasCredits) {
            setError('You need at least 1 credit to generate a video. Purchase credits to continue.');
            setStep('error');
            return;
          }
        }

        // Step 1: Convert pages to images
        setStep('converting-pages');
        const formData = new FormData();
        formData.append('file', pdfFile!);

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

        // Step 3: Check credits before generating videos
        const allScripts: PageScript[] = scriptsData.scripts;
        const totalWords = allScripts.reduce((sum: number, s: PageScript) => sum + (s.wordCount || 0), 0);
        const totalCreditsNeeded = Math.round((totalWords / 150) * 100) / 100;
        const currentBalance = creditBalance ?? 0;

        if (userEmail && totalCreditsNeeded > currentBalance) {
          // Calculate how many pages the user can afford
          // Include scripts cumulatively until we exceed the balance
          let affordableWords = 0;
          let affordableCount = 0;
          for (const s of allScripts) {
            const newTotal = affordableWords + (s.wordCount || 0);
            const newCredits = Math.round((newTotal / 150) * 100) / 100;
            if (newCredits > currentBalance) break;
            affordableWords = newTotal;
            affordableCount++;
          }

          setCreditsNeeded(totalCreditsNeeded);
          setCreditsAvailable(currentBalance);
          setAffordablePageCount(affordableCount);
          pendingPipelineRef.current = {
            allScripts,
            convertData: {
              imageUrls: convertData.imageUrls,
              localPaths: convertData.localPaths || [],
            },
          };
          setShowCreditPrompt(true);
          return; // Pause pipeline — user must choose
        }

        // User has enough credits — proceed with all scripts
        await generateVideosAndFinish(allScripts, {
          imageUrls: convertData.imageUrls,
          localPaths: convertData.localPaths || [],
        });
      } catch (err) {
        console.error('Page-by-page flow error:', err);
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(msg.replace(/tavus/gi, 'video service'));
        setStep('error');
      }
    };

    restoreAndRun();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFile, extractedText, pageCount, pollVideos, stitchVideos, resumeFromVideos, savePbpToDb, dbSessionId]);

  // Compute progress percentage based on real pipeline stage
  const getProgressPercent = () => {
    switch (step) {
      case 'converting-pages': return 10;
      case 'generating-scripts': return 25;
      case 'generating-videos':
        if (totalVideos === 0) return 30;
        return 30 + Math.round((videosReady / totalVideos) * 50);
      case 'stitching': return 90;
      case 'done': return 100;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6">

      {/* Generic Processing State */}
      {step !== 'done' && step !== 'error' && !showCreditPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-5 py-12"
        >
          <h2 className="text-xl font-semibold text-foreground">We&apos;re creating your video</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This usually takes about 10–15 minutes. Feel free to close this tab. We&apos;ll send you an email with the download link once it&apos;s ready.
          </p>

          {/* Progress bar */}
          <div className="w-72 mx-auto bg-secondary rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${getProgressPercent()}%` }}
              transition={{ duration: 1, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}

      {/* Insufficient Credits Prompt */}
      {showCreditPrompt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-white/[0.12] rounded-xl p-6 space-y-5"
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Not Enough Credits</h3>
            <p className="text-sm text-muted-foreground">
              This video requires <span className="text-foreground font-medium">{creditsNeeded.toFixed(1)} credits</span> but
              you only have <span className="text-foreground font-medium">{creditsAvailable.toFixed(1)} credits</span>.
              You need <span className="text-foreground font-medium">{(creditsNeeded - creditsAvailable).toFixed(1)} more credits</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Option 1: Partial Video */}
            <button
              onClick={handleCreatePartial}
              disabled={affordablePageCount === 0}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-white/[0.08] bg-secondary hover:bg-secondary/80 transition-all text-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-sm font-semibold text-foreground">Create Partial Video</span>
              <span className="text-xs text-muted-foreground">
                {affordablePageCount > 0
                  ? `Generate ${affordablePageCount} of ${pendingPipelineRef.current?.allScripts.length ?? 0} sections with your available credits`
                  : 'Not enough credits for even 1 section'}
              </span>
            </button>

            {/* Option 2: Buy Credits */}
            <button
              onClick={handleBuyCredits}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all text-center"
            >
              <span className="text-sm font-semibold text-primary">Buy More Credits</span>
              <span className="text-xs text-muted-foreground">
                You need ~{Math.ceil(creditsNeeded - creditsAvailable)} more credits for the full video
              </span>
            </button>
          </div>
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
          {error?.includes('credit') && (
            <a href="#pricing" className="inline-block mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">
              Buy Credits
            </a>
          )}
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

          <button
            onClick={() => downloadWithFilename(outputVideoUrl, downloadFileName || 'video.mp4')}
            className="btn-primary-glow w-full flex items-center justify-center gap-2 text-center"
          >
            <Download className="w-5 h-5" />
            Download Video
          </button>
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
