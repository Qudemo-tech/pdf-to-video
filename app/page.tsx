'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import FeatureStrip from '@/components/landing/FeatureStrip';
import DemoSection from '@/components/landing/DemoSection';
import HowItWorks from '@/components/landing/HowItWorks';
import UseCases from '@/components/landing/UseCases';
import PricingSection from '@/components/landing/PricingSection';
import Footer from '@/components/landing/Footer';
import StatusTracker from '@/components/StatusTracker';
import PDFUploader from '@/components/PDFUploader';
import ScriptEditor from '@/components/ScriptEditor';
import VideoPlayer from '@/components/VideoPlayer';
import ModeSelector from '@/components/ModeSelector';
import PageByPageFlow from '@/components/PageByPageFlow';
import { PipelineStep, VideoMode } from '@/types';
import { API_BASE } from '@/lib/api';
import {
  createSession,
  getActiveSession,
  updateSession,
  deleteSession,
  VideoSession,
} from '@/lib/sessions';

export default function Home() {
  const { data: authSession } = useSession();
  const [currentStep, setCurrentStep] = useState<PipelineStep>('upload');
  const [selectedMode, setSelectedMode] = useState<VideoMode | null>(null);
  const [restored, setRestored] = useState(false);

  // Database session ID
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);

  // PDF file reference (needed for page-by-page mode to re-upload for conversion)
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string>('');

  // Step 1 → 2 data
  const [extractedText, setExtractedText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);

  // Step 2 → 3 data (summary mode)
  const [videoId, setVideoId] = useState('');
  const [hostedUrl, setHostedUrl] = useState('');

  // Video generation state
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const restoredRef = useRef(false);

  // Restore session from Supabase on mount
  useEffect(() => {
    if (restoredRef.current) return;
    if (!authSession?.user?.email) return;

    restoredRef.current = true;

    const restore = async () => {
      const saved = await getActiveSession(authSession.user!.email!);
      if (saved) {
        setDbSessionId(saved.id);

        // Restore PDF filename from pbp_data metadata
        if (saved.pbp_data && typeof saved.pbp_data === 'object' && 'pdfFileName' in saved.pbp_data) {
          setPdfFileName(saved.pbp_data.pdfFileName as string);
        }

        // Summary mode: resume if video is in progress or done
        if (saved.selected_mode === 'summary' && saved.current_step === 'video' && saved.video_id) {
          setCurrentStep('video');
          setSelectedMode('summary');
          setVideoId(saved.video_id);
          setHostedUrl(saved.hosted_url || '');
          setExtractedText(saved.extracted_text || '');
          setPageCount(saved.page_count);
          setCharacterCount(saved.character_count);
        }
        // Page-by-page mode: let PageByPageFlow handle its own restoration
        else if (saved.selected_mode === 'page-by-page' && saved.current_step === 'page-by-page') {
          setCurrentStep('page-by-page');
          setSelectedMode('page-by-page');
          setExtractedText(saved.extracted_text || '');
          setPageCount(saved.page_count);
          setCharacterCount(saved.character_count);
        }
        // For other steps (upload, mode-select, script), start fresh
      }
      setRestored(true);
    };

    restore();
  }, [authSession]);

  // Persist session to Supabase
  const persistSession = useCallback(async (
    step: PipelineStep,
    mode: VideoMode | null,
    vid: string,
    hosted: string,
    text: string,
    pages: number,
    chars: number,
    pdfUrl?: string,
    pbpData?: Record<string, unknown>,
  ) => {
    if (!dbSessionId) return;
    await updateSession(dbSessionId, {
      current_step: step,
      selected_mode: mode,
      video_id: vid || null,
      hosted_url: hosted || null,
      extracted_text: text || null,
      page_count: pages,
      character_count: chars,
      ...(pdfUrl !== undefined ? { pdf_url: pdfUrl } : {}),
      ...(pbpData !== undefined ? { pbp_data: pbpData } : {}),
    });
  }, [dbSessionId]);

  const handleTextExtracted = async (text: string, pages: number, chars: number, file?: File, pdfUrl?: string) => {
    setExtractedText(text);
    setPageCount(pages);
    setCharacterCount(chars);
    if (file) {
      setPdfFile(file);
      setPdfFileName(file.name.replace(/\.pdf$/i, ''));
    }

    // Create a new session in Supabase
    const fileName = file ? file.name.replace(/\.pdf$/i, '') : '';
    console.log('[page] Creating session — authSession email:', authSession?.user?.email);
    if (authSession?.user?.email) {
      const session = await createSession({
        user_email: authSession.user.email,
        user_name: authSession.user.name || undefined,
        pdf_url: pdfUrl,
        extracted_text: text,
        page_count: pages,
        character_count: chars,
        pbp_data: { pdfFileName: fileName },
      });
      console.log('[page] Session created:', session?.id || 'FAILED');
      if (session) {
        setDbSessionId(session.id);
      }
    } else {
      console.warn('[page] No auth session — dbSessionId will be null, email notifications will not work');
    }

    setCurrentStep('mode-select');
  };

  const handleModeSelect = (mode: VideoMode) => {
    setSelectedMode(mode);
    if (mode === 'summary') {
      setCurrentStep('script');
      persistSession('script', 'summary', '', '', extractedText, pageCount, characterCount);
    } else {
      setCurrentStep('page-by-page');
      persistSession('page-by-page', 'page-by-page', '', '', extractedText, pageCount, characterCount);
    }
  };

  const handleVideoGenerate = async (script: string) => {
    setIsGeneratingVideo(true);
    setVideoError(null);
    setCurrentStep('video');

    try {
      const response = await fetch(`${API_BASE}/api/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          videoName: `PDF Video - ${new Date().toLocaleDateString()}`,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        const errMsg = (data.error || 'Failed to generate video').replace(/tavus/gi, 'video service');
        setVideoError(errMsg);
        setCurrentStep('script');
        return;
      }

      setVideoId(data.videoId);
      setHostedUrl(data.hostedUrl);
      // Save session so refresh can resume polling
      persistSession('video', 'summary', data.videoId, data.hostedUrl, extractedText, pageCount, characterCount);
    } catch {
      setVideoError('Failed to start video generation. Please try again.');
      setCurrentStep('script');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleReset = async () => {
    // Mark session as completed in Supabase
    if (dbSessionId) {
      await updateSession(dbSessionId, { status: 'completed' });
    }

    setCurrentStep('upload');
    setSelectedMode(null);
    setPdfFile(null);
    setPdfFileName('');
    setExtractedText('');
    setPageCount(0);
    setCharacterCount(0);
    setVideoId('');
    setHostedUrl('');
    setVideoError(null);
    setDbSessionId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeatureStrip />
      <DemoSection />
      <HowItWorks />
      <UseCases />

      {/* Upload / App Section */}
      <section id="upload" className="section-padding grain-overlay">
        <div className="container mx-auto max-w-3xl relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-foreground text-center mb-4"
          >
            Try It Now
          </motion.h2>
          <p className="text-center text-muted-foreground mb-12">Upload your PDF and watch the magic happen.</p>

          {/* Progress Tracker — only show for summary mode or before mode selection */}
          {currentStep !== 'page-by-page' && (
            <StatusTracker currentStep={currentStep} />
          )}

          {/* Step Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card p-6 md:p-8"
          >
            {/* Step 1: Upload */}
            {currentStep === 'upload' && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Upload Your PDF</h2>
                <PDFUploader onTextExtracted={handleTextExtracted} />
              </div>
            )}

            {/* Step 1.5: Mode Selection */}
            {currentStep === 'mode-select' && (
              <ModeSelector onModeSelect={handleModeSelect} />
            )}

            {/* Step 2: Script (Summary Mode) */}
            {currentStep === 'script' && selectedMode === 'summary' && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Generate Video Script</h2>
                {videoError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
                    <p className="text-sm text-destructive">{videoError}</p>
                  </div>
                )}
                <ScriptEditor
                  extractedText={extractedText}
                  pageCount={pageCount}
                  characterCount={characterCount}
                  onVideoGenerate={handleVideoGenerate}
                />
                {isGeneratingVideo && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm font-medium">Starting video generation...</span>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Video (Summary Mode) */}
            {currentStep === 'video' && videoId && selectedMode === 'summary' && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Your Video</h2>
                <VideoPlayer
                  videoId={videoId}
                  initialHostedUrl={hostedUrl}
                  onReset={handleReset}
                  dbSessionId={dbSessionId}
                  downloadFileName={pdfFileName ? `${pdfFileName}.mp4` : undefined}
                  userEmail={authSession?.user?.email || undefined}
                  userName={authSession?.user?.name || undefined}
                />
              </div>
            )}

            {/* Page-by-Page Mode */}
            {currentStep === 'page-by-page' && (
              <PageByPageFlow
                pdfFile={pdfFile}
                extractedText={extractedText}
                pageCount={pageCount}
                onReset={handleReset}
                dbSessionId={dbSessionId}
                downloadFileName={pdfFileName ? `${pdfFileName}.mp4` : undefined}
                userEmail={authSession?.user?.email || undefined}
                userName={authSession?.user?.name || undefined}
              />
            )}
          </motion.div>
        </div>
      </section>

      <div id="pricing">
        <PricingSection />
      </div>
      <Footer />
    </div>
  );
}
