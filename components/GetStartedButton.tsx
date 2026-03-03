'use client';

import { signIn, signOut, useSession } from 'next-auth/react';

interface GetStartedButtonProps {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  /** When true, signed-in users see a Logout button instead of a link to #upload */
  showLogoutWhenSignedIn?: boolean;
}

/**
 * Get Started button: redirects to Google Sign-In if not authenticated.
 * When signed in: shows Logout if showLogoutWhenSignedIn, else link to #upload.
 */
export function GetStartedButton({ className = '', children = 'Get Started', onClick, showLogoutWhenSignedIn = false }: GetStartedButtonProps) {
  const { data: session, status } = useSession();

  if (status === 'authenticated' && session) {
    if (showLogoutWhenSignedIn) {
      const handleLogout = async () => {
        onClick?.();
        await signOut({ redirect: false });
        window.location.href = '/';
      };
      return (
        <button type="button" onClick={handleLogout} className={`cursor-pointer ${className}`}>
          Logout
        </button>
      );
    }
    return (
      <a href="#upload" onClick={onClick} className={`cursor-pointer ${className}`}>
        {children}
      </a>
    );
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();
    signIn('google', { callbackUrl: '/#upload' });
  };

  return (
    <button type="button" onClick={handleClick} className={`cursor-pointer ${className}`}>
      {children}
    </button>
  );
}
