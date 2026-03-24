'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import DemoSection from '@/components/landing/DemoSection';
import HowItWorks from '@/components/landing/HowItWorks';
import UseCases from '@/components/landing/UseCases';
import PricingSection from '@/components/landing/PricingSection';
import Footer from '@/components/landing/Footer';
import PDFUploader from '@/components/PDFUploader';
import PageByPageFlow from '@/components/PageByPageFlow';
import { PipelineStep, VideoMode } from '@/types';
import {
  createSession,
  getActiveSession,
  updateSession,
} from '@/lib/sessions';
import { getCredits } from '@/lib/credits';

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

  // Credits
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Step 1 → 2 data
  const [extractedText, setExtractedText] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);


  const restoredRef = useRef(false);

  // Restore session from Supabase on mount
  useEffect(() => {
    if (restoredRef.current) return;
    if (!authSession?.user?.email) return;

    restoredRef.current = true;

    const restore = async () => {
      // Fetch credit balance
      const credits = await getCredits(authSession.user!.email!);
      setCreditBalance(credits.balance);

      // Check for payment success redirect
      const params = new URLSearchParams(window.location.search);
      if (params.get('payment') === 'success') {
        setPaymentSuccess(true);
        // Clean URL and scroll to Try It Now section
        window.history.replaceState({}, '', window.location.pathname + '#upload');
        document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
        // Re-fetch credits after short delay for webhook processing
        setTimeout(async () => {
          const updated = await getCredits(authSession.user!.email!);
          setCreditBalance(updated.balance);
        }, 2000);
      }

      const saved = await getActiveSession(authSession.user!.email!);
      if (saved) {
        setDbSessionId(saved.id);

        // Restore PDF filename from pbp_data metadata
        if (saved.pbp_data && typeof saved.pbp_data === 'object' && 'pdfFileName' in saved.pbp_data) {
          setPdfFileName(saved.pbp_data.pdfFileName as string);
        }

        // Restore page-by-page session (PageByPageFlow handles its own state restoration)
        if (saved.current_step === 'page-by-page') {
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

    // Go directly to page-by-page mode
    setSelectedMode('page-by-page');
    setCurrentStep('page-by-page');
    // persistSession needs dbSessionId which is set async above, so use a small delay
    setTimeout(() => {
      persistSession('page-by-page', 'page-by-page', '', '', text, pages, chars);
    }, 500);
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
    setDbSessionId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar creditBalance={creditBalance} />
      <HeroSection />
      {/* <DemoSection /> */}
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

          {/* Step Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card p-6 md:p-8"
          >
            {/* Step 1: Upload (requires auth) */}
            {currentStep === 'upload' && (
              authSession ? (
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-4">Upload Your PDF</h2>
                  <PDFUploader onTextExtracted={handleTextExtracted} />
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <h2 className="text-xl font-semibold text-foreground">Sign in to get started</h2>
                  <p className="text-muted-foreground text-sm">Sign in with Google to upload your PDF and generate videos.</p>
                  <button
                    onClick={() => signIn('google', { callbackUrl: '/#upload' })}
                    className="btn-primary-glow inline-flex items-center gap-2 px-6 py-3"
                  >
                    Sign in with Google
                  </button>
                </div>
              )
            )}

            {/* Video Generation */}
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
                creditBalance={creditBalance}
                onCreditsChanged={setCreditBalance}
              />
            )}
          </motion.div>
        </div>
      </section>

      <div id="pricing">
        {paymentSuccess && (
          <div className="container mx-auto max-w-3xl px-4 pt-8">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
              <p className="text-sm text-primary font-medium">Payment successful! Your credits have been added.</p>
            </div>
          </div>
        )}
        <PricingSection />
      </div>
      <Footer />
    </div>
  );
}
