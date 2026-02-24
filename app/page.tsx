'use client';

import { useState } from 'react';
import StatusTracker from '@/components/StatusTracker';
import PDFUploader from '@/components/PDFUploader';
import ScriptEditor from '@/components/ScriptEditor';
import VideoPlayer from '@/components/VideoPlayer';
import { PipelineStep } from '@/types';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<PipelineStep>('upload');

  // Step 1 → 2 data
  const [extractedText, setExtractedText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);

  // Step 2 → 3 data
  const [videoId, setVideoId] = useState('');
  const [hostedUrl, setHostedUrl] = useState('');

  // Video generation state
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const handleTextExtracted = (text: string, pages: number, chars: number) => {
    setExtractedText(text);
    setPageCount(pages);
    setCharacterCount(chars);
    setCurrentStep('script');
  };

  const handleVideoGenerate = async (script: string) => {
    setIsGeneratingVideo(true);
    setVideoError(null);
    setCurrentStep('video');

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script,
          videoName: `PDF Video - ${new Date().toLocaleDateString()}`,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setVideoError(data.error || 'Failed to generate video');
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
    setExtractedText('');
    setPageCount(0);
    setCharacterCount(0);
    setVideoId('');
    setHostedUrl('');
    setVideoError(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">PDF to Video Converter</h1>
          <p className="mt-2 text-gray-600">
            Upload a PDF, generate a script, and create a talking-head video
          </p>
        </div>

        {/* Progress Tracker */}
        <StatusTracker currentStep={currentStep} />

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Your PDF</h2>
              <PDFUploader onTextExtracted={handleTextExtracted} />
            </div>
          )}

          {/* Step 2: Script */}
          {currentStep === 'script' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Generate Video Script</h2>
              {videoError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700">{videoError}</p>
                </div>
              )}
              <ScriptEditor
                extractedText={extractedText}
                pageCount={pageCount}
                characterCount={characterCount}
                onVideoGenerate={handleVideoGenerate}
              />
              {isGeneratingVideo && (
                <div className="mt-4 flex items-center justify-center gap-2 text-blue-600">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-sm font-medium">Starting video generation...</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Video */}
          {currentStep === 'video' && videoId && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Video</h2>
              <VideoPlayer
                videoId={videoId}
                initialHostedUrl={hostedUrl}
                onReset={handleReset}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by Claude AI &amp; Tavus
        </p>
      </div>
    </main>
  );
}
