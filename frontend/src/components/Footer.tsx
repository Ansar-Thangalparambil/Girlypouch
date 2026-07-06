'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

export default function Footer() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide footer entirely on the login/register page if user is not authenticated
  if (pathname === '/account' && !user) {
    return null;
  }

  return (
    <footer className="w-full bg-white border-t border-brand-200/50 py-12">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="font-display text-xl font-bold text-brand-800">GirlyPouch</div>
          <p className="text-xs text-brand-dark/50 font-normal">© 2026 GirlyPouch. All rights reserved.</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-8 text-sm">
          <Link href="/privacy" className="text-brand-dark/60 hover:text-brand-800 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="text-brand-dark/60 hover:text-brand-800 transition-colors">Terms of Service</Link>
          <Link href="/contact" className="text-brand-dark/60 hover:text-brand-800 transition-colors">Contact Us</Link>
          <Link href="/account" className="text-brand-dark/60 hover:text-brand-800 font-semibold transition-colors">Wholesale Portal</Link>
        </div>

        <div className="flex gap-4">
          <a href="#" className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 hover:bg-brand-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186.002-.006a2.25 2.25 0 0 1 3.933-2.185m-3.935 2.191 3.935 2.196m0-2.196a2.25 2.25 0 1 0 0 2.186m0-2.186-.002-.006a2.25 2.25 0 0 1-3.933-2.185m3.935 2.191-3.935 2.196" />
            </svg>
          </a>
          <a href="#" className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 hover:bg-brand-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
