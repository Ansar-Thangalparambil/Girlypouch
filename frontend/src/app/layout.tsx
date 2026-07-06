import React from 'react';
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GirlyPouch | Premium Period Care Subscriptions',
  description: 'Customizable monthly D2C period protection boxes and B2B wholesale invoicing. 100% organic cotton, biodegradable, and designed for your active life.',
  keywords: 'period care, customizable subscription, organic cotton pads, panty liners, B2B wholesale hygiene',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} scroll-smooth`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-brand-50 text-brand-dark min-h-screen flex flex-col font-sans">
        <AuthProvider>
          <React.Suspense fallback={null}>
            <Navbar />
          </React.Suspense>
          <div className="flex-grow pt-24">
            {children}
          </div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
