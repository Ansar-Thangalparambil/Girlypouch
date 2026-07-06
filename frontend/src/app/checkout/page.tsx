'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../../services/api';

interface Subscription {
  id: number;
  status: string;
  next_delivery_date: string;
  kit_product: {
    name: string;
    price: string;
  };
  items: {
    id: number;
    pad_component: {
      name: string;
    };
    quantity: number;
  }[];
}

function CheckoutConfirmContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    async function confirmSession() {
      if (!sessionId) {
        setError('No checkout session identifier found. If you cancelled your payment, you can build your pouch again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await api.subscriptions.confirm(sessionId);
        if (data.status === 'success') {
          setSubscription(data.subscription);
        } else {
          throw new Error(data.error || 'Failed to activate subscription.');
        }
      } catch (err: any) {
        console.error('Confirmation error:', err);
        setError(err.message || 'Payment verification failed. Please contact support if your account was charged.');
      } finally {
        setLoading(false);
      }
    }
    confirmSession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 px-6 text-center">
        <div className="w-12 h-12 border-4 border-brand-800 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-xl font-bold font-display text-brand-dark">Verifying payment details...</h2>
        <p className="text-sm text-brand-dark/60 max-w-sm">We are communicating with Stripe to activate your customized subscription pouch. Please do not close this window.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center max-w-xl mx-auto">
        <span className="material-symbols-outlined text-red-600 text-6xl mb-4">error</span>
        <h2 className="text-2xl font-bold font-display text-brand-dark mb-3">Verification Failed</h2>
        <p className="text-sm text-brand-dark/60 leading-relaxed mb-8">{error}</p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link href="/customize" className="btn-primary">
            Try Customizing Again
          </Link>
          <Link href="/account" className="btn-secondary">
            Go to Account Portal
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-12">
      <div className="bg-white p-8 md:p-12 rounded-2xl border border-brand-200/50 shadow-lg text-center max-w-2xl w-full">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <span className="material-symbols-outlined text-4xl">check_circle</span>
        </div>

        <h1 className="text-3xl font-extrabold font-display text-brand-dark mb-2">Welcome to GirlyPouch!</h1>
        <p className="text-brand-dark/70 text-sm mb-8">Your payment succeeded, and your customized pouch is active.</p>

        {subscription && (
          <div className="bg-brand-50 p-6 rounded-xl border border-brand-200/40 text-left mb-8 space-y-4">
            <h3 className="font-bold text-brand-dark text-sm uppercase tracking-wider">Subscription Overview</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-brand-dark/50 block">Base Plan</span>
                <span className="font-semibold text-brand-dark">{subscription.kit_product.name}</span>
              </div>
              <div>
                <span className="text-xs text-brand-dark/50 block">Next Ship Date</span>
                <span className="font-semibold text-brand-dark">{subscription.next_delivery_date || 'Processing'}</span>
              </div>
            </div>

            <div className="border-t border-brand-200/30 pt-4">
              <span className="text-xs text-brand-dark/50 block mb-2">Your Pouch Components</span>
              <div className="space-y-1.5">
                {subscription.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-xs">
                    <span className="text-brand-dark/80 font-medium">{item.pad_component.name}</span>
                    <span className="bg-brand-800/10 text-brand-800 px-2 py-0.5 rounded font-bold">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/account" className="btn-primary w-full sm:w-auto">
            Go to My Dashboard
          </Link>
          <Link href="/blog" className="btn-secondary w-full sm:w-auto">
            Read Period Wellness Blog
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-800 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-brand-dark/70">Loading checkout parameters...</p>
      </div>
    }>
      <CheckoutConfirmContent />
    </Suspense>
  );
}
