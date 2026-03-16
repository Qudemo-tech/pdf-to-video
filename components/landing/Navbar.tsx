'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { GetStartedButton } from '@/components/GetStartedButton';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto max-w-7xl flex items-center justify-between h-16 px-4 md:px-6">
        <a href="/" className="text-lg font-bold text-foreground tracking-tight">
          Slide<span className="text-gradient-primary">ToVideo</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          <a href="#demo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Demo</a>
          <GetStartedButton className="text-sm text-muted-foreground hover:text-foreground transition-colors">Try It</GetStartedButton>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <GetStartedButton
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all"
            showLogoutWhenSignedIn
          >
            Get Started
          </GetStartedButton>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/[0.04] bg-background/95 backdrop-blur-xl px-4 py-4 space-y-3">
          <a href="#demo" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground py-2">Demo</a>
          <GetStartedButton className="block text-sm text-muted-foreground py-2" onClick={() => setOpen(false)}>Try It</GetStartedButton>
          <a href="#pricing" onClick={() => setOpen(false)} className="block text-sm text-muted-foreground py-2">Pricing</a>
          <GetStartedButton
            className="block text-center px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium w-full"
            onClick={() => setOpen(false)}
            showLogoutWhenSignedIn
          >
            Get Started
          </GetStartedButton>
        </div>
      )}
    </nav>
  );
}
