'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../services/api';

interface Kit {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  max_components: number;
  is_subscription_only: boolean;
}

export default function LandingPageMinimalEfficiency() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadKits() {
      try {
        const data = await api.products.getKits();
        setKits(data);
      } catch (err) {
        console.error('Failed to load products:', err);
        // Fallbacks if backend is slow/offline
        setKits([
          {
            id: 1,
            name: "Emergency Kit",
            slug: "emergency-kit",
            description: "A compact, travel-friendly kit designed for unexpected moments. Customizes exactly 5 items.",
            price: "15.00",
            max_components: 5,
            is_subscription_only: false
          },
          {
            id: 2,
            name: "Home Essential Kit",
            slug: "home-essential-kit",
            description: "Our flagship 10-pack period customization pack designed for home storage. Customizes exactly 10 items.",
            price: "29.99",
            max_components: 10,
            is_subscription_only: true
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadKits();
  }, []);

  return (
    <main className="pt-20 bg-[#faf9f6] text-[#1a1c1a] font-sans antialiased overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative px-6 md:px-16 py-8 md:py-14 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 items-center relative z-10">
          <div className="flex flex-col gap-5">
            <div className="inline-flex items-center px-3.5 py-1 bg-[#ffdad3] text-[#802918] rounded-full text-[10px] font-bold w-fit uppercase tracking-widest">
              Subscription Wellness
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold font-display text-[#1a1c1a] leading-tight tracking-tight">
              Customized period care for your unique cycle
            </h1>
            <p className="text-md md:text-lg text-[#56423e] leading-relaxed max-w-lg">
              Ditch the drugstore panic. Get premium, organic supplies tailored to your flow, delivered exactly when you need them.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-1">
              <Link 
                href="/customize" 
                className="bg-[#9f402d] text-white px-8 py-3 rounded-xl font-semibold text-xs tracking-wider uppercase hover:bg-[#802918] transition-all hover:scale-[1.02] active:scale-[0.98] text-center shadow-md shadow-[#9f402d]/10"
              >
                Build Your Kit
              </Link>
              <a 
                href="#how-it-works" 
                className="border border-[#ddc0ba] text-[#1a1c1a] px-8 py-3 rounded-xl font-semibold text-xs tracking-wider uppercase hover:bg-[#f4f3f1] transition-all text-center active:scale-[0.98]"
              >
                How It Works
              </a>
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border border-[#ddc0ba]/30 bg-white relative group">
              <img 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" 
                alt="High-resolution premium GirlyPouch subscription wellness box and organic cotton supplies" 
                src="/hero_wellness_box.png"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
            </div>
            {/* Floating Stat Chip */}
            <div className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-lg hidden lg:flex items-center gap-3 border border-[#ddc0ba]/40 hover:-translate-y-1 transition-transform">
              <div className="w-9 h-9 rounded-full bg-[#dee6c4] flex items-center justify-center text-[#5a6147]">
                <span className="material-symbols-outlined text-md">check_circle</span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#1a1c1a]">Physician Approved</p>
                <p className="text-[9px] text-[#56423e] font-semibold uppercase tracking-wider">100% Organic Cotton</p>
              </div>
            </div>
          </div>
        </div>
        {/* Background Decorative Element */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#ffdad3] rounded-full blur-[120px] opacity-15"></div>
      </section>

      {/* Dynamic Base Kits Section */}
      <section className="bg-white py-12 md:py-16 px-6 md:px-16 border-y border-[#ddc0ba]/20" id="shop">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1a1c1a]">Choose Your Base Kit</h2>
            <p className="text-[#56423e] text-sm leading-relaxed">Select a kit size that fits your routine, and customize the contents to match your personal flow.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {kits.map((kit) => {
              const isSub = kit.is_subscription_only;
              return (
                <div 
                  key={kit.id} 
                  className={`bg-[#faf9f6]/50 p-7 rounded-3xl flex flex-col justify-between min-h-[380px] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg border ${
                    isSub ? 'border-2 border-[#9f402d]' : 'border-[#ddc0ba]/30'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-5">
                      <span className="material-symbols-outlined text-3xl text-[#9f402d]">
                        {isSub ? 'calendar_today' : 'emergency_home'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase ${
                        isSub ? 'bg-[#ffdad3] text-[#802918]' : 'bg-brand-200 text-brand-800'
                      }`}>
                        {isSub ? 'Subscription' : 'One-Time'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-[#1a1c1a] mb-2">{kit.name}</h3>
                    <p className="text-[#56423e] text-xs leading-relaxed mb-5 font-semibold">{kit.description}</p>
                    <ul className="space-y-1.5 text-xs text-[#56423e] mb-5 font-semibold">
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600 text-sm">check</span>
                        Fits exactly {kit.max_components} products
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600 text-sm">check</span>
                        Tailor mix anytime online
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600 text-sm">check</span>
                        Premium 100% organic cotton
                      </li>
                    </ul>
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-[#1a1c1a] mb-5">
                      ${parseFloat(kit.price).toFixed(2)}
                      {isSub && <span className="text-xs font-normal text-[#56423e]"> / month</span>}
                    </div>
                    <Link 
                      href={`/customize?kit=${kit.slug}`} 
                      className={`block w-full py-2.5 rounded-xl text-center font-bold text-[10px] uppercase tracking-widest transition-colors ${
                        isSub 
                          ? 'bg-[#9f402d] text-white hover:opacity-90 shadow-md' 
                          : 'bg-[#ffdad3] text-[#802918] hover:bg-[#ffb4a5]'
                      }`}
                    >
                      {isSub ? 'Subscribe & Customize' : 'Get Kit'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Value Propositions Section */}
      <section className="bg-[#f4f3f1]/70 py-12 md:py-16 px-6 md:px-16" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1a1c1a]">The GirlyPouch Standard</h2>
            <p className="text-[#56423e] mt-1 text-sm font-semibold">Crafted for your body, simplified for your life.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Value 1 */}
            <div className="bg-white p-7 rounded-3xl flex flex-col gap-3 items-start text-left shadow-sm hover:shadow-md transition-shadow border border-[#ddc0ba]/30">
              <div className="w-11 h-11 bg-[#ffdad3] rounded-xl flex items-center justify-center mb-1">
                <span className="material-symbols-outlined text-[#9f402d] text-2xl">calendar_month</span>
              </div>
              <h3 className="text-lg font-bold text-[#1a1c1a]">Custom 28-Day Cycles</h3>
              <p className="text-[#56423e] text-xs leading-relaxed font-semibold">
                Your cycle isn't a calendar month. We sync your delivery to your biology, ensuring you're never caught off guard.
              </p>
            </div>
            {/* Value 2 */}
            <div className="bg-white p-7 rounded-3xl flex flex-col gap-3 items-start text-left shadow-sm hover:shadow-md transition-shadow border border-[#ddc0ba]/30">
              <div className="w-11 h-11 bg-[#dee6c4] rounded-xl flex items-center justify-center mb-1">
                <span className="material-symbols-outlined text-[#5a6147] text-2xl">spa</span>
              </div>
              <h3 className="text-lg font-bold text-[#1a1c1a]">100% Organic Cotton</h3>
              <p className="text-[#56423e] text-xs leading-relaxed font-semibold">
                No synthetics, no fragrances, no chlorine. Just pure, breathable organic cotton that respects your body.
              </p>
            </div>
            {/* Value 3 */}
            <div className="bg-white p-7 rounded-3xl flex flex-col gap-3 items-start text-left shadow-sm hover:shadow-md transition-shadow border border-[#ddc0ba]/30">
              <div className="w-11 h-11 bg-[#ffd9e3] rounded-xl flex items-center justify-center mb-1">
                <span className="material-symbols-outlined text-[#834f60] text-2xl">local_shipping</span>
              </div>
              <h3 className="text-lg font-bold text-[#1a1c1a]">Automated Delivery</h3>
              <p className="text-[#56423e] text-xs leading-relaxed font-semibold">
                Set it and forget it. Our intelligent logistics predict your needs and deliver your personalized pouch discreetly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Focus Section */}
      <section className="py-12 md:py-16 px-6 md:px-16 max-w-7xl mx-auto">
        <div className="bg-[#9f402d] text-white rounded-[32px] overflow-hidden grid md:grid-cols-2 items-stretch shadow-lg">
          <div className="p-8 md:p-14 flex flex-col justify-center gap-5">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Ready to redefine your cycle?
            </h2>
            <p className="text-[#ffdad3] text-sm leading-relaxed max-w-md">
              Take the 2-minute quiz to build your custom profile. We'll recommend the perfect mix of liners, tampons, and pads based on your actual flow.
            </p>
            <div className="flex items-center gap-5 mt-1">
              <Link 
                href="/customize" 
                className="bg-white text-[#9f402d] px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#ffdad3] transition-colors active:scale-95 text-center shadow-md"
              >
                Start Quiz
              </Link>
              <span className="text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 text-[#ffdad3]">
                <span className="material-symbols-outlined text-sm">lock</span>
                Cancel Anytime
              </span>
            </div>
          </div>
          <div className="relative min-h-[250px]">
            <img 
              className="absolute inset-0 w-full h-full object-cover" 
              alt="High-resolution lifestyle setup representing premium wellness care routine" 
              src="/lifestyle_shelf.png"
            />
          </div>
        </div>
      </section>

      {/* Pouch Component Details Section */}
      <section className="py-12 md:py-16 px-6 md:px-16 max-w-7xl mx-auto overflow-hidden">
        <div className="flex flex-col md:flex-row gap-10 items-center">
          <div className="w-full md:w-1/2 order-2 md:order-1">
            <div className="relative">
              {/* Pouch Visual Card */}
              <div className="bg-white border border-[#ddc0ba]/40 rounded-3xl p-6 shadow-md relative z-10 max-w-sm mx-auto md:mx-0">
                <div className="flex justify-between items-start mb-5">
                  <div className="font-extrabold text-[#9f402d] text-xs uppercase tracking-widest">Your Monthly Pouch</div>
                  <span className="material-symbols-outlined text-[#9f402d]">inventory_2</span>
                </div>
                <div className="space-y-2.5 text-xs font-semibold text-[#56423e]">
                  <div className="flex justify-between items-center pb-2 border-b border-brand-100">
                    <span>Regular Pads</span>
                    <span className="font-bold text-[#1a1c1a]">x12</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-brand-100">
                    <span>Gym Pads</span>
                    <span className="font-bold text-[#1a1c1a]">x8</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-brand-100">
                    <span>Night Pads</span>
                    <span className="font-bold text-[#1a1c1a]">x6</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Panty Liners</span>
                    <span className="font-bold text-[#1a1c1a]">x4</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-brand-100/60">
                  <div className="flex justify-between text-[9px] font-bold text-[#9f402d] uppercase tracking-wider">
                    <span>Next Delivery</span>
                    <span>May 12th</span>
                  </div>
                  <div className="w-full h-1 bg-[#ffdad3] rounded-full mt-2 overflow-hidden">
                    <div className="w-[70%] h-full bg-[#9f402d] transition-all duration-1000"></div>
                  </div>
                </div>
              </div>
              {/* Decorative Abstract Shape */}
              <div className="absolute -top-10 -left-10 w-48 h-48 bg-[#dee6c4] rounded-full blur-[60px] opacity-20 -z-10"></div>
            </div>
          </div>
          <div className="w-full md:w-1/2 order-1 md:order-2 flex flex-col gap-5">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#1a1c1a]">Precision-engineered for peace of mind.</h2>
            <p className="text-[#56423e] leading-relaxed text-sm">
              Our "Pouch" isn't just a box—it's a smart inventory system for your wellness. Adjust your counts month-to-month through our intuitive dashboard.
            </p>
            <ul className="space-y-2.5 font-semibold text-xs text-[#56423e]">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#9f402d] text-sm">task_alt</span>
                <span>Fully biodegradable packaging</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#9f402d] text-sm">task_alt</span>
                <span>Pause or skip any month easily</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#9f402d] text-sm">task_alt</span>
                <span>Complimentary travel bag with first box</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
