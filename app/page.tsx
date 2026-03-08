'use client';

import { useState } from 'react';
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

export default function Home() {
  const [currentStep, setCurrentStep] = useState<PipelineStep>('upload');
  const [selectedMode, setSelectedMode] = useState<VideoMode | null>(null);

  // PDF file reference (needed for page-by-page mode to re-upload for conversion)
  const [pdfFile, setPdfFile] = useState<File | null>(null);

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

  const handleTextExtracted = (text: string, pages: number, chars: number, file?: File) => {
    setExtractedText(text);
    setPageCount(pages);
    setCharacterCount(chars);
    if (file) setPdfFile(file);
    setCurrentStep('mode-select');
  };

  const handleModeSelect = (mode: VideoMode) => {
    setSelectedMode(mode);
    if (mode === 'summary') {
      setCurrentStep('script');
    } else {
      setCurrentStep('page-by-page');
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
    } catch {
      setVideoError('Failed to start video generation. Please try again.');
      setCurrentStep('script');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setSelectedMode(null);
    setPdfFile(null);
    setExtractedText('');
    setPageCount(0);
    setCharacterCount(0);
    setVideoId('');
    setHostedUrl('');
    setVideoError(null);
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
                />
              </div>
            )}

            {/* Page-by-Page Mode */}
            {currentStep === 'page-by-page' && pdfFile && (
              <PageByPageFlow
                pdfFile={pdfFile}
                extractedText={extractedText}
                pageCount={pageCount}
                onReset={handleReset}
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
