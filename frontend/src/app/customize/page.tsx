'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

interface PadComponent {
  id: number;
  name: string;
  component_type: string;
  stock_level: number;
  is_low_stock: boolean;
  wholesale_price: string;
}

interface KitProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  max_components: number;
  is_subscription_only: boolean;
}

const loadingItems = [
  { icon: "spa", thing: "Organic Pads", status: "Sorting organic cotton pads..." },
  { icon: "water_drop", thing: "Water Bottle", status: "Filling up your water bottle..." },
  { icon: "cookie", thing: "Chocolates", status: "Stocking up on comforting chocolates..." },
  { icon: "thermostat", thing: "Hot Water Bag", status: "Warming up the virtual hot water bag..." },
  { icon: "healing", thing: "Care Essentials", status: "Packing your cycle comfort essentials..." }
];

const relaxingQuotes = [
  "Rest is productive. Take a deep breath.",
  "Listen to your body. It knows exactly what it needs.",
  "A warm cup of tea and a moment for yourself.",
  "You are strong, but it's okay to slow down.",
  "Prioritizing your comfort, one cycle at a time.",
  "Self-care is not selfish. It is essential.",
  "Be gentle with yourself. You are doing great.",
  "Your body is doing incredible work right now.",
  "Take it easy today. Your body deserves the rest.",
  "Cozy socks, warm tea, and a quiet moment.",
  "Resting is a form of healing. Allow yourself to pause.",
  "Listen to the quiet whispers of your body.",
  "It's okay to cancel plans and stay cozy in bed.",
  "Your comfort is our top priority.",
  "Slow down, breathe in, and let go of the rush.",
  "Nourish your body, calm your mind, rest your soul.",
  "A hot water bottle and your favorite movie await you.",
  "Soft fabrics, warm drinks, and complete relaxation.",
  "Give yourself permission to just be.",
  "Every phase of your cycle has its own purpose.",
  "Honor your body's rhythm today.",
  "A quiet room, a warm blanket, and peace of mind.",
  "Let us handle the cycle worries while you rest.",
  "You are allowed to take up space and take a break.",
  "Wrap yourself in comfort today.",
  "Breathe. You have everything you need within you.",
  "Choose comfort. Choose peace. Choose you today.",
  "Taking a pause today helps you shine tomorrow.",
  "Warm blankets, soft cushions, and pure peace.",
  "Listen to the rhythm of your heart.",
  "Take this moment to stretch and release tension.",
  "Your body knows. Trust it, nourish it, care for it.",
  "A little dark chocolate and soft music can work wonders."
];

export default function CustomizePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token } = useAuth();

  // Catalog States
  const [kits, setKits] = useState<KitProduct[]>([]);
  const [components, setComponents] = useState<PadComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configuration States
  const [selectedKit, setSelectedKit] = useState<KitProduct | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({}); // componentId -> quantity
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Quiz States
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizFlow, setQuizFlow] = useState<'light' | 'moderate' | 'heavy' | 'very_heavy' | null>(null);
  const [quizActive, setQuizActive] = useState<'active' | 'moderate' | 'low' | null>(null);
  const [quizPreference, setQuizPreference] = useState<'pads_only' | 'liners_only' | 'balanced' | null>(null);
  const [quizRecommendation, setQuizRecommendation] = useState<{
    kit: KitProduct;
    mix: Record<number, number>;
  } | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [currentQuote, setCurrentQuote] = useState('');

  // Load kits and components
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [loadedKits, loadedComponents] = await Promise.all([
          api.products.getKits(),
          api.products.getComponents()
        ]);
        setKits(loadedKits);
        setComponents(loadedComponents);

        // Pre-select kit based on query params
        const kitParam = searchParams.get('kit');
        const preselected = loadedKits.find((k: KitProduct) => k.slug === kitParam) || loadedKits[0] || null;
        setSelectedKit(preselected);

        // Initialize quantities to 0
        const initialQty: Record<number, number> = {};
        loadedComponents.forEach((c: PadComponent) => {
          initialQty[c.id] = 0;
        });
        setQuantities(initialQty);

        // Manage initial quiz step based on auth status
        if (searchParams.get('quiz') === 'true') {
          setQuizStep(1);
          setShowQuiz(true);
        }
      } catch (err: any) {
        console.error('Failed to load customize data:', err);
        setError(err.message || 'Failed to connect to the backend database.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [searchParams]);

  // Adjust quantities with constraints
  const adjustQuantity = (componentId: number, delta: number) => {
    if (!selectedKit) return;

    const currentTotal = Object.values(quantities).reduce((a, b) => a + b, 0);
    const currentVal = quantities[componentId] || 0;

    // Check bounds
    if (delta > 0 && currentTotal >= selectedKit.max_components) return; // limit capacity
    if (delta < 0 && currentVal <= 0) return; // cannot go negative

    setQuantities({
      ...quantities,
      [componentId]: currentVal + delta
    });
  };

  const totalSelected = Object.values(quantities).reduce((a, b) => a + b, 0);
  const isPouchFull = selectedKit ? totalSelected === selectedKit.max_components : false;

  // Handle Checkout / Subscription Creation
  const handleCheckout = async () => {
    if (!selectedKit) return;
    if (!isPouchFull) {
      alert(`Please select exactly ${selectedKit.max_components} items to fill your pouch.`);
      return;
    }

    if (!token) {
      // Save configuration in session storage so it can be restored after login
      sessionStorage.setItem('pending_customize_kit', JSON.stringify(selectedKit));
      sessionStorage.setItem('pending_customize_items', JSON.stringify(quantities));
      router.push('/account?redirect=/customize');
      return;
    }

    try {
      setCheckoutLoading(true);
      setError(null);

      // 1. Map quantities to subscription items
      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([id, qty]) => ({
          pad_component_id: parseInt(id),
          quantity: qty
        }));

      // 2. Create the subscription (it will be created with 'paused' status)
      const sub = await api.subscriptions.create(selectedKit.id, items);

      // 3. Create Stripe Checkout Session
      const successUrl = `${window.location.origin}/checkout`;
      const cancelUrl = `${window.location.origin}/customize?kit=${selectedKit.slug}`;
      const stripeSession = await api.subscriptions.createCheckoutSession(sub.id, successUrl, cancelUrl);

      // 4. Redirect to Stripe Hosted Checkout
      if (stripeSession.checkout_url) {
        window.location.href = stripeSession.checkout_url;
      } else {
        throw new Error('Stripe redirect URL was not returned from the server.');
      }
    } catch (err: any) {
      console.error('Checkout failed:', err);
      setError(err.message || 'An error occurred during payment processing.');
      setCheckoutLoading(false);
    }
  };

  // Restore configuration from sessionStorage on login return
  useEffect(() => {
    if (components.length > 0 && token) {
      const savedKit = sessionStorage.getItem('pending_customize_kit');
      const savedItems = sessionStorage.getItem('pending_customize_items');

      if (savedKit && savedItems) {
        try {
          const parsedKit = JSON.parse(savedKit);
          const parsedItems = JSON.parse(savedItems);

          // Ensure the kit matches one of the loaded ones
          const matchedKit = kits.find(k => k.id === parsedKit.id);
          if (matchedKit) {
            setSelectedKit(matchedKit);
            setQuantities(parsedItems);
          }
        } catch (e) {
          console.error('Failed to parse saved config:', e);
        } finally {
          // Clear so it does not trigger again
          sessionStorage.removeItem('pending_customize_kit');
          sessionStorage.removeItem('pending_customize_items');
        }
      }
    }
  }, [components, token, kits]);

  // Quiz Recommendation Logic with Zomato/Swiggy loading sequence
  const handleCalculateRecommendation = () => {
    if (!quizFlow || !quizActive || !quizPreference) return;

    setQuizStep(3.5); // Trigger loading sequence
    setLoadingMsgIdx(0);
    setCurrentQuote(relaxingQuotes[Math.floor(Math.random() * relaxingQuotes.length)]);

    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % loadingItems.length);
      setCurrentQuote(relaxingQuotes[Math.floor(Math.random() * relaxingQuotes.length)]);
    }, 900);

    setTimeout(() => {
      clearInterval(interval);

      // Choose kit size
      const suggestedKit = kits.find(k => k.max_components === 10) || kits[0];
      if (!suggestedKit) return;

      const maxPads = suggestedKit.max_components;

      // Fetch component references dynamically (corrected backend mismatch regular_pad)
      const dayPad = components.find(c => c.component_type === 'regular_pad');
      const nightPad = components.find(c => c.component_type === 'night_pad');
      const gymPad = components.find(c => c.component_type === 'gym_pad');
      const pantyLiner = components.find(c => c.component_type === 'panty_liner');

      if (!dayPad || !nightPad || !gymPad || !pantyLiner) return;

      const recommendedQty: Record<number, number> = {};
      components.forEach(c => {
        recommendedQty[c.id] = 0;
      });

      // Smart distribution mapping based on flow and activity
      if (quizPreference === 'liners_only') {
        recommendedQty[pantyLiner.id] = maxPads;
      } else if (quizPreference === 'pads_only') {
        if (quizFlow === 'light') {
          recommendedQty[dayPad.id] = maxPads - 2;
          recommendedQty[nightPad.id] = 2;
        } else if (quizFlow === 'heavy' || quizFlow === 'very_heavy') {
          if (quizActive === 'active') {
            recommendedQty[gymPad.id] = 5;
            recommendedQty[nightPad.id] = 3;
            recommendedQty[dayPad.id] = 2;
          } else {
            recommendedQty[nightPad.id] = 5;
            recommendedQty[dayPad.id] = 5;
          }
        } else { // Moderate
          if (quizActive === 'active') {
            recommendedQty[gymPad.id] = 4;
            recommendedQty[dayPad.id] = 4;
            recommendedQty[nightPad.id] = 2;
          } else {
            recommendedQty[dayPad.id] = 7;
            recommendedQty[nightPad.id] = 3;
          }
        }
      } else { // Balanced (Pads + Liners mix)
        if (quizFlow === 'light') {
          recommendedQty[pantyLiner.id] = 6;
          recommendedQty[dayPad.id] = 3;
          recommendedQty[nightPad.id] = 1;
        } else if (quizFlow === 'heavy' || quizFlow === 'very_heavy') {
          recommendedQty[pantyLiner.id] = 2;
          if (quizActive === 'active') {
            recommendedQty[gymPad.id] = 4;
            recommendedQty[nightPad.id] = 3;
            recommendedQty[dayPad.id] = 1;
          } else {
            recommendedQty[nightPad.id] = 4;
            recommendedQty[dayPad.id] = 4;
          }
        } else { // Moderate flow
          recommendedQty[pantyLiner.id] = 3;
          if (quizActive === 'active') {
            recommendedQty[gymPad.id] = 3;
            recommendedQty[dayPad.id] = 3;
            recommendedQty[nightPad.id] = 1;
          } else {
            recommendedQty[dayPad.id] = 4;
            recommendedQty[nightPad.id] = 3;
          }
        }
      }

      // Double check sum matches maxPads exactly due to rounding
      const sum = Object.values(recommendedQty).reduce((a, b) => a + b, 0);
      if (sum !== maxPads && dayPad) {
        const difference = maxPads - sum;
        recommendedQty[dayPad.id] = (recommendedQty[dayPad.id] || 0) + difference;
      }

      setQuizRecommendation({
        kit: suggestedKit,
        mix: recommendedQty
      });
      setQuizStep(4);
    }, 2700);
  };

  const handleApplyRecommendation = () => {
    if (quizRecommendation) {
      setSelectedKit(quizRecommendation.kit);
      setQuantities(quizRecommendation.mix);
      setShowQuiz(false);
      setQuizStep(0);
      setQuizFlow(null);
      setQuizActive(null);
      setQuizPreference(null);
      setQuizRecommendation(null);
    }
  };

  // Helper for dynamically building Cycle Coverage Timeline Map
  const getCycleTimeline = () => {
    if (quizPreference === 'liners_only') {
      return [
        { label: "Days 1 - 2", title: "Daily Wear Refresh", icon: "spa", desc: "Ultra-breathable daily liner comfort", color: "text-[#ddc0ba] bg-[#ddc0ba]/10 border-[#ddc0ba]" },
        { label: "Days 3 - 4", title: "Daily Freshness", icon: "spa", desc: "Ultra-breathable daily liner comfort", color: "text-[#ddc0ba] bg-[#ddc0ba]/10 border-[#ddc0ba]" },
        { label: "Days 5 - 7", title: "Clean Finish", icon: "spa", desc: "Clean, ultra-thin dry coverage", color: "text-[#ddc0ba] bg-[#ddc0ba]/10 border-[#ddc0ba]" }
      ];
    }

    const timeline = [];

    // Early Days
    if (quizFlow === 'heavy' || quizFlow === 'very_heavy') {
      timeline.push({ label: "Days 1 - 2 (Heavy)", title: "Maximum Lock Protection", icon: "thermostat", desc: "Cozy Overnight absorbency mapping", color: "text-indigo-600 bg-indigo-50 border-indigo-200" });
    } else {
      timeline.push({ label: "Days 1 - 2 (Regular)", title: "Everyday Core Day Pads", icon: "spa", desc: "Clean regular wing protection", color: "text-[#9f402d] bg-[#ffdad3]/20 border-[#9f402d]/20" });
    }

    // Mid Days
    if (quizActive === 'active') {
      timeline.push({ label: "Days 3 - 4 (Active)", title: "Flexible Gym Fit Protection", icon: "fitness_center", desc: "Athletic zero-feel wing flexibility", color: "text-emerald-600 bg-emerald-50 border-emerald-200" });
    } else {
      timeline.push({ label: "Days 3 - 4 (Recovery)", title: "Comfort Day Protection", icon: "spa", desc: "Soft breathable core pads", color: "text-[#9f402d] bg-[#ffdad3]/20 border-[#9f402d]/20" });
    }

    // End Days
    if (quizPreference === 'balanced') {
      timeline.push({ label: "Days 5 - 7 (Tail)", title: "Clean Panty Liner Finish", icon: "water_drop", desc: "Lightweight panty liner refresh", color: "text-amber-600 bg-amber-50 border-amber-200" });
    } else {
      timeline.push({ label: "Days 5 - 7 (Tail)", title: "Light Day protection", icon: "spa", desc: "Breathable low-flow wing pads", color: "text-[#9f402d] bg-[#ffdad3]/20 border-[#9f402d]/20" });
    }

    return timeline;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#9f402d] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-brand-dark/70">Fetching inventory components...</p>
      </div>
    );
  }

  // ==================== GUEST VIEW ====================
  // If unauthenticated, block workspace access entirely. Render only a full-screen standalone Wellness Quiz.
  if (!token || !user) {
    return (
      <main className="min-h-[85vh] bg-[#faf9f6] text-[#1a1c1a] font-sans antialiased overflow-x-hidden relative flex flex-col items-center justify-center p-4">
        {/* Apple-style background blur glow shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[10%] -left-[10%] w-[50%] h-[40%] bg-[#ffdad3] rounded-full blur-[140px] opacity-25"></div>
          <div className="absolute bottom-[10%] -right-[10%] w-[50%] h-[40%] bg-[#dee6c4] rounded-full blur-[140px] opacity-20"></div>
        </div>

        {/* Standalone Centered Quiz Card */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/40 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[520px] animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9f402d] bg-[#ffdad3]/50 px-3 py-1 rounded-full">
              {quizStep < 4 ? `Step ${quizStep < 3.5 ? Math.floor(quizStep) : 3} of 3` : 'Recommendation'}
            </span>
            <button 
              onClick={() => router.push('/')} 
              className="text-[#9f402d]/70 hover:text-[#9f402d] focus:outline-none flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Exit
            </button>
          </div>

          {/* Steps Rendering */}
          <div className="flex-grow flex flex-col justify-center">
            {quizStep === 0 && (
              <div className="text-center space-y-6">
                <span className="material-symbols-outlined text-5xl text-[#9f402d] animate-pulse">spa</span>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold font-display text-brand-dark leading-tight">Wellness Quiz</h2>
                  <p className="text-xs text-brand-dark/60 leading-relaxed max-w-sm mx-auto font-semibold font-sans">
                    Take our 2-minute quiz to find the perfect mix of regular, gym, and night protection for your cycle.
                  </p>
                </div>
                <button
                  onClick={() => setQuizStep(1)}
                  className="btn-primary py-3 px-8 text-xs tracking-wider uppercase font-bold self-center shadow-md shadow-[#9f402d]/10"
                >
                  Start Quiz
                </button>
              </div>
            )}

            {quizStep === 1 && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold font-display text-brand-dark">How would you describe your heaviest flow days?</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: 'light', label: 'Light', desc: 'Primarily spots or light protection needed' },
                    { key: 'moderate', label: 'Moderate', desc: 'Standard protection, standard intervals' },
                    { key: 'heavy', label: 'Heavy', desc: 'Needs frequent changes or gym fit support' },
                    { key: 'very_heavy', label: 'Very Heavy', desc: 'Maximum silhouette absorption preferred' }
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setQuizFlow(opt.key as any);
                        setQuizStep(2);
                      }}
                      className="p-4 rounded-xl text-left border border-[#ddc0ba]/40 bg-white/50 hover:bg-[#ffdad3]/20 hover:border-[#9f402d]/40 transition-all flex flex-col"
                    >
                      <span className="font-bold text-xs text-brand-dark">{opt.label}</span>
                      <span className="text-[10px] text-brand-dark/50 font-semibold">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {quizStep === 2 && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold font-display text-brand-dark">How active is your lifestyle during your cycle?</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: 'active', label: 'Highly Active', desc: 'Frequent workouts, running, athletic focus' },
                    { key: 'moderate', label: 'Moderate Movement', desc: 'Yoga, walks, general flexibility support' },
                    { key: 'low', label: 'Low / Rest Focus', desc: 'Prefers quiet recovery, stretching, comfort' }
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setQuizActive(opt.key as any);
                        setQuizStep(3);
                      }}
                      className="p-4 rounded-xl text-left border border-[#ddc0ba]/40 bg-white/50 hover:bg-[#ffdad3]/20 hover:border-[#9f402d]/40 transition-all flex flex-col"
                    >
                      <span className="font-bold text-xs text-brand-dark">{opt.label}</span>
                      <span className="text-[10px] text-brand-dark/50 font-semibold">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {quizStep === 3 && (
              <div className="space-y-5">
                <h3 className="text-lg font-bold font-display text-brand-dark">What is your preference for care coverage?</h3>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: 'pads_only', label: 'Pads Only', desc: 'Day, night, and gym fit pads' },
                    { key: 'liners_only', label: 'Liners Only', desc: 'Ultra-light daily panty liners' },
                    { key: 'balanced', label: 'Balanced Mix', desc: 'Flexible combination of pads and liners' }
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        setQuizPreference(opt.key as any);
                      }}
                      className={`p-4 rounded-xl text-left border transition-all flex flex-col ${
                        quizPreference === opt.key 
                          ? 'border-[#9f402d] bg-[#ffdad3]/25'
                          : 'border-[#ddc0ba]/40 bg-white/50 hover:bg-[#ffdad3]/20'
                      }`}
                    >
                      <span className="font-bold text-xs text-brand-dark">{opt.label}</span>
                      <span className="text-[10px] text-brand-dark/50 font-semibold">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Zomato/Swiggy-style Loading Sequence */}
            {quizStep === 3.5 && (
              <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center animate-fadeIn">
                {/* Dashed outer ring with clean center item */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#ffdad3] animate-spin" style={{ animationDuration: '8s' }}></div>
                  <span className="material-symbols-outlined text-4xl text-[#9f402d] animate-bounce">
                    {loadingItems[loadingMsgIdx].icon}
                  </span>
                </div>
                <div className="space-y-3 px-4">
                  {/* Thinking Brain adjacent to status header */}
                  <h4 className="text-sm font-extrabold text-brand-dark leading-tight flex items-center justify-center gap-1.5">
                    <span className="material-symbols-outlined text-[#9f402d] text-lg animate-pulse">psychology</span>
                    {loadingItems[loadingMsgIdx].status}
                  </h4>
                  <p className="text-xs text-[#56423e] italic font-semibold max-w-sm mx-auto leading-relaxed">
                    "{currentQuote}"
                  </p>
                </div>
              </div>
            )}

            {/* Recommendation Analytics Dashboard View */}
            {quizStep === 4 && quizRecommendation && (
              <div className="space-y-6 max-h-[420px] overflow-y-auto pr-1">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl text-[#9f402d] mb-1">analytics</span>
                  <h3 className="text-lg font-bold font-display text-brand-dark">Pouch Allocation Analytics</h3>
                  <p className="text-[10px] text-brand-dark/50 font-semibold">Dynamic visual distribution of your recommended cycle builder.</p>
                </div>

                {/* Recommended Kit & Quantities Card (The Result!) */}
                <div className="bg-[#ffdad3]/20 border border-[#ddc0ba]/40 p-4 rounded-2xl space-y-3 text-left">
                  <div className="flex justify-between items-center pb-2.5 border-b border-[#ddc0ba]/30">
                    <span className="font-bold text-xs text-brand-dark">Recommended Kit:</span>
                    <span className="text-xs bg-[#9f402d] text-white px-2.5 py-0.5 rounded-full font-bold">
                      {quizRecommendation.kit.name}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {components.map(comp => {
                      const qty = quizRecommendation.mix[comp.id] || 0;
                      if (qty <= 0) return null;
                      return (
                        <div key={comp.id} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-brand-dark/70">{comp.name}</span>
                          <span className="font-bold text-brand-dark">x{qty} items</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Flow and active insights badges */}
                <div className="flex justify-center gap-2 mt-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full">
                    Flow: {quizFlow}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full">
                    Movement: {quizActive}
                  </span>
                </div>

                {/* Stacked Analytics Bar Chart */}
                <div className="space-y-2">
                  <div className="flex h-5 w-full rounded-full overflow-hidden border border-brand-200/50 shadow-inner bg-brand-100">
                    {components.map((comp) => {
                      const qty = quizRecommendation.mix[comp.id] || 0;
                      if (qty <= 0) return null;
                      const percentage = (qty / quizRecommendation.kit.max_components) * 100;
                      
                      let color = "bg-[#9f402d]"; // Day
                      if (comp.component_type === "night_pad") color = "bg-indigo-600";
                      else if (comp.component_type === "gym_pad") color = "bg-emerald-600";
                      else if (comp.component_type === "panty_liner") color = "bg-[#ddc0ba]";

                      return (
                        <div 
                          key={comp.id} 
                          className={`${color} h-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                          title={`${comp.name}: ${qty} items (${Math.round(percentage)}%)`}
                        />
                      );
                    })}
                  </div>

                  {/* Legends list */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-brand-dark/70 bg-brand-50/50 p-3 rounded-xl border border-brand-100">
                    {components.map((comp) => {
                      const qty = quizRecommendation.mix[comp.id] || 0;
                      if (qty <= 0) return null;
                      
                      let dotColor = "bg-[#9f402d]";
                      if (comp.component_type === "night_pad") dotColor = "bg-indigo-600";
                      else if (comp.component_type === "gym_pad") dotColor = "bg-emerald-600";
                      else if (comp.component_type === "panty_liner") dotColor = "bg-[#ddc0ba]";

                      return (
                        <div key={comp.id} className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`}></span>
                          <span className="truncate">{comp.name}:</span>
                          <span className="font-bold text-brand-dark">x{qty} ({Math.round((qty / quizRecommendation.kit.max_components) * 100)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 7-Day Cycle Timeline Map */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#9f402d] border-b border-[#ddc0ba]/30 pb-1">7-Day Cycle Coverage Map</h4>
                  <div className="flex flex-col gap-2">
                    {getCycleTimeline().map((item, idx) => (
                      <div key={idx} className={`flex items-center gap-3 p-2.5 border rounded-xl transition-all ${item.color}`}>
                        <span className="material-symbols-outlined text-lg shrink-0">{item.icon}</span>
                        <div className="text-left leading-normal">
                          <div className="text-[10px] font-extrabold">{item.label}: {item.title}</div>
                          <div className="text-[9px] opacity-80 font-medium">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kit Briefing - Standard Design System */}
                <div className="border-t border-[#ddc0ba]/30 pt-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#9f402d]">Available Packages</h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="p-3 bg-white/40 border border-[#ddc0ba]/20 rounded-xl">
                      <p className="text-xs font-bold text-brand-dark">Home Essential Kit (10 Pads)</p>
                      <p className="text-[10px] text-brand-dark/60 leading-relaxed font-semibold">Our most popular monthly bundle. Holds exactly 10 customized pads or liners. Fully flexible to adapt to standard 28-day cycles.</p>
                    </div>
                    <div className="p-3 bg-white/40 border border-[#ddc0ba]/20 rounded-xl">
                      <p className="text-xs font-bold text-brand-dark">Emergency Kit (5 Pads)</p>
                      <p className="text-[10px] text-brand-dark/60 leading-relaxed font-semibold">Compact, travel-ready pouch holding exactly 5 custom protection items. Perfect for active weeks or irregular flows.</p>
                    </div>
                  </div>
                </div>

                {/* Login Context Warning Card */}
                <div className="bg-[#ffdad3]/50 border border-[#ffdad3] rounded-xl p-3.5 flex gap-2.5 text-[#802918]">
                  <span className="material-symbols-outlined text-md shrink-0">lock</span>
                  <div className="text-[10px] font-semibold leading-relaxed">
                    <p className="font-bold text-brand-dark mb-0.5">Authorization Required</p>
                    For complete builder workspace access, customized shipping schedules, and Net invoicing, sign in or register below.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="mt-8 flex justify-between gap-4">
            {quizStep > 1 && quizStep < 4 && quizStep !== 3.5 && (
              <button
                onClick={() => setQuizStep(quizStep - 1)}
                className="px-5 py-2 border border-[#ddc0ba] text-[#1a1c1a] rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-brand-50 transition-colors"
              >
                Back
              </button>
            )}
            {quizStep === 3 && (
              <button
                onClick={handleCalculateRecommendation}
                disabled={!quizPreference}
                className="ml-auto px-6 py-2 bg-[#9f402d] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#802918] transition-colors disabled:opacity-50 shadow-md shadow-[#9f402d]/10"
              >
                Get Recommendation
              </button>
            )}
            {quizStep === 4 && quizRecommendation && (
              <>
                <button
                  onClick={() => setQuizStep(1)}
                  className="px-5 py-2 border border-[#ddc0ba] text-[#1a1c1a] rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-brand-50 transition-colors"
                >
                  Retake Quiz
                </button>
                <button
                  onClick={() => {
                    sessionStorage.setItem('pending_customize_kit', JSON.stringify(quizRecommendation.kit));
                    sessionStorage.setItem('pending_customize_items', JSON.stringify(quizRecommendation.mix));
                    router.push('/account?redirect=/customize');
                  }}
                  className="px-6 py-2 bg-[#9f402d] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#802918] transition-colors shadow-md shadow-[#9f402d]/10"
                >
                  Login/Register to Save & Subscribe
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ==================== AUTHENTICATED VIEW ====================
  // Render full builder workspace layout with modal quiz overlay options
  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-12 relative">
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
          <span><strong>Error:</strong> {error}</span>
          <button onClick={() => setError(null)} className="text-red-900 font-bold">×</button>
        </div>
      )}

      {/* Intro Header */}
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-brand-200/20 pb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-brand-dark mb-3">Tailor Your Pouch</h1>
          <p className="text-sm sm:text-base text-brand-dark/70 max-w-2xl">
            Mix and match premium, biodegradable protection designed for every move of your week. Choose a pack size below to start building.
          </p>
        </div>
        <button 
          onClick={() => {
            setQuizStep(1);
            setShowQuiz(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#ddc0ba] text-[#9f402d] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-brand-50 transition-colors shadow-sm self-start md:self-end"
        >
          <span className="material-symbols-outlined text-md">quiz</span>
          Start Wellness Quiz
        </button>
      </header>

      {/* Wellness Quiz Glassmorphic Modal */}
      {showQuiz && (
        <div className="fixed inset-0 z-50 bg-[#1c1616]/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[420px] animate-fadeIn">
            {/* Background design accents */}
            <div className="absolute -top-20 -left-20 w-44 h-44 bg-[#ffdad3] rounded-full blur-[80px] opacity-35 -z-10"></div>
            <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-[#dee6c4] rounded-full blur-[80px] opacity-30 -z-10"></div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#9f402d] bg-[#ffdad3]/50 px-3 py-1 rounded-full">
                {quizStep < 4 ? `Step ${quizStep < 3.5 ? Math.floor(quizStep) : 3} of 3` : 'Recommendation'}
              </span>
              <button 
                onClick={() => {
                  setShowQuiz(false);
                  setQuizStep(0);
                }} 
                className="text-brand-dark/40 hover:text-brand-dark focus:outline-none"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Steps Rendering */}
            <div className="flex-grow flex flex-col justify-center">
              {quizStep === 1 && (
                <div className="space-y-5">
                  <h3 className="text-xl font-bold font-display text-brand-dark">How would you describe your heaviest flow days?</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { key: 'light', label: 'Light', desc: 'Primarily spots or light protection needed' },
                      { key: 'moderate', label: 'Moderate', desc: 'Standard protection, standard intervals' },
                      { key: 'heavy', label: 'Heavy', desc: 'Needs frequent changes or gym fit support' },
                      { key: 'very_heavy', label: 'Very Heavy', desc: 'Maximum silhouette absorption preferred' }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setQuizFlow(opt.key as any);
                          setQuizStep(2);
                        }}
                        className="p-4 rounded-xl text-left border border-[#ddc0ba]/40 bg-white/50 hover:bg-[#ffdad3]/20 hover:border-[#9f402d]/40 transition-all flex flex-col"
                      >
                        <span className="font-bold text-xs text-brand-dark">{opt.label}</span>
                        <span className="text-[10px] text-brand-dark/50 font-semibold">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {quizStep === 2 && (
                <div className="space-y-5">
                  <h3 className="text-xl font-bold font-display text-brand-dark">How active is your lifestyle during your cycle?</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { key: 'active', label: 'Highly Active', desc: 'Frequent workouts, running, athletic focus' },
                      { key: 'moderate', label: 'Moderate Movement', desc: 'Yoga, walks, general flexibility support' },
                      { key: 'low', label: 'Low / Rest Focus', desc: 'Prefers quiet recovery, stretching, comfort' }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setQuizActive(opt.key as any);
                          setQuizStep(3);
                        }}
                        className="p-4 rounded-xl text-left border border-[#ddc0ba]/40 bg-white/50 hover:bg-[#ffdad3]/20 hover:border-[#9f402d]/40 transition-all flex flex-col"
                      >
                        <span className="font-bold text-xs text-brand-dark">{opt.label}</span>
                        <span className="text-[10px] text-brand-dark/50 font-semibold">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {quizStep === 3 && (
                <div className="space-y-5">
                  <h3 className="text-xl font-bold font-display text-brand-dark">What is your preference for care coverage?</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { key: 'pads_only', label: 'Pads Only', desc: 'Day, night, and gym fit pads' },
                      { key: 'liners_only', label: 'Liners Only', desc: 'Ultra-light daily panty liners' },
                      { key: 'balanced', label: 'Balanced Mix', desc: 'Flexible combination of pads and liners' }
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setQuizPreference(opt.key as any);
                        }}
                        className={`p-4 rounded-xl text-left border transition-all flex flex-col ${
                          quizPreference === opt.key 
                            ? 'border-[#9f402d] bg-[#ffdad3]/25'
                            : 'border-[#ddc0ba]/40 bg-white/50 hover:bg-[#ffdad3]/20'
                        }`}
                      >
                        <span className="font-bold text-xs text-brand-dark">{opt.label}</span>
                        <span className="text-[10px] text-brand-dark/50 font-semibold">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Zomato/Swiggy-style Loading Sequence */}
              {quizStep === 3.5 && (
                <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center animate-fadeIn">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#ffdad3] animate-spin" style={{ animationDuration: '8s' }}></div>
                    <span className="material-symbols-outlined text-4xl text-[#9f402d] animate-bounce">
                      {loadingItems[loadingMsgIdx].icon}
                    </span>
                  </div>
                  <div className="space-y-3 px-4">
                    <h4 className="text-sm font-extrabold text-brand-dark leading-tight flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[#9f402d] text-lg animate-pulse">psychology</span>
                      {loadingItems[loadingMsgIdx].status}
                    </h4>
                    <p className="text-xs text-[#56423e] italic font-semibold max-w-sm mx-auto leading-relaxed">
                      "{currentQuote}"
                    </p>
                  </div>
                </div>
              )}

              {/* Recommendation Analytics Dashboard View */}
              {quizStep === 4 && quizRecommendation && (
                <div className="space-y-6 max-h-[380px] overflow-y-auto pr-1">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-[#9f402d] mb-1">analytics</span>
                    <h3 className="text-xl font-bold font-display text-brand-dark">Pouch Allocation Analytics</h3>
                    <p className="text-xs text-brand-dark/50">Dynamic visual distribution of your recommended cycle builder.</p>
                  </div>

                  {/* Recommended Kit & Quantities Card (The Result!) */}
                  <div className="bg-[#ffdad3]/20 border border-[#ddc0ba]/40 p-4 rounded-2xl space-y-3 text-left">
                    <div className="flex justify-between items-center pb-2.5 border-b border-[#ddc0ba]/30">
                      <span className="font-bold text-xs text-brand-dark">Recommended Kit:</span>
                      <span className="text-xs bg-[#9f402d] text-white px-2.5 py-0.5 rounded-full font-bold">
                        {quizRecommendation.kit.name}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {components.map(comp => {
                        const qty = quizRecommendation.mix[comp.id] || 0;
                        if (qty <= 0) return null;
                        return (
                          <div key={comp.id} className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-brand-dark/70">{comp.name}</span>
                            <span className="font-bold text-brand-dark">x{qty} items</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Flow and active insights badges */}
                  <div className="flex justify-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full">
                      Flow: {quizFlow}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full">
                      Movement: {quizActive}
                    </span>
                  </div>

                  {/* Stacked Analytics Bar Chart */}
                  <div className="space-y-2">
                    <div className="flex h-5 w-full rounded-full overflow-hidden border border-brand-200/50 shadow-inner bg-brand-100">
                      {components.map((comp) => {
                        const qty = quizRecommendation.mix[comp.id] || 0;
                        if (qty <= 0) return null;
                        const percentage = (qty / quizRecommendation.kit.max_components) * 100;
                        
                        let color = "bg-[#9f402d]"; // Day
                        if (comp.component_type === "night_pad") color = "bg-indigo-600";
                        else if (comp.component_type === "gym_pad") color = "bg-emerald-600";
                        else if (comp.component_type === "panty_liner") color = "bg-[#ddc0ba]";

                        return (
                          <div 
                            key={comp.id} 
                            className={`${color} h-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                            title={`${comp.name}: ${qty} items (${Math.round(percentage)}%)`}
                          />
                        );
                      })}
                    </div>

                    {/* Legends list */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold text-brand-dark/70 bg-brand-50/50 p-3 rounded-xl border border-brand-100">
                      {components.map((comp) => {
                        const qty = quizRecommendation.mix[comp.id] || 0;
                        if (qty <= 0) return null;
                        
                        let dotColor = "bg-[#9f402d]";
                        if (comp.component_type === "night_pad") dotColor = "bg-indigo-600";
                        else if (comp.component_type === "gym_pad") dotColor = "bg-emerald-600";
                        else if (comp.component_type === "panty_liner") dotColor = "bg-[#ddc0ba]";

                        return (
                          <div key={comp.id} className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`}></span>
                            <span className="truncate">{comp.name}:</span>
                            <span className="font-bold text-brand-dark">x{qty} ({Math.round((qty / quizRecommendation.kit.max_components) * 100)}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 7-Day Cycle Timeline Map */}
                  <div className="space-y-2.5">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#9f402d] border-b border-[#ddc0ba]/30 pb-1">7-Day Cycle Coverage Map</h4>
                    <div className="flex flex-col gap-2">
                      {getCycleTimeline().map((item, idx) => (
                        <div key={idx} className={`flex items-center gap-3 p-2.5 border rounded-xl transition-all ${item.color}`}>
                          <span className="material-symbols-outlined text-lg shrink-0">{item.icon}</span>
                          <div className="text-left leading-normal">
                            <div className="text-[10px] font-extrabold">{item.label}: {item.title}</div>
                            <div className="text-[9px] opacity-80 font-medium">{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kit Briefing - Standard Design System */}
                  <div className="border-t border-[#ddc0ba]/30 pt-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#9f402d]">Available Packages</h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      <div className="p-3 bg-white/40 border border-[#ddc0ba]/20 rounded-xl">
                        <p className="text-xs font-bold text-brand-dark">Home Essential Kit (10 Pads)</p>
                        <p className="text-[10px] text-brand-dark/60 leading-relaxed font-semibold">Our most popular monthly bundle. Holds exactly 10 customized pads or liners. Fully flexible to adapt to standard 28-day cycles.</p>
                      </div>
                      <div className="p-3 bg-white/40 border border-[#ddc0ba]/20 rounded-xl">
                        <p className="text-xs font-bold text-brand-dark">Emergency Kit (5 Pads)</p>
                        <p className="text-[10px] text-brand-dark/60 leading-relaxed font-semibold">Compact, travel-ready pouch holding exactly 5 custom protection items. Perfect for active weeks or irregular flows.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="mt-8 flex justify-between gap-4">
              {quizStep > 1 && quizStep < 4 && quizStep !== 3.5 && (
                <button
                  onClick={() => setQuizStep(quizStep - 1)}
                  className="px-5 py-2 border border-[#ddc0ba] text-[#1a1c1a] rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-brand-50"
                >
                  Back
                </button>
              )}
              {quizStep === 3 && (
                <button
                  onClick={handleCalculateRecommendation}
                  disabled={!quizPreference}
                  className="ml-auto px-6 py-2 bg-[#9f402d] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#802918] transition-colors disabled:opacity-50"
                >
                  Get Recommendation
                </button>
              )}
              {quizStep === 4 && quizRecommendation && (
                <>
                  <button
                    onClick={() => setQuizStep(1)}
                    className="px-5 py-2 border border-[#ddc0ba] text-[#1a1c1a] rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-brand-50"
                  >
                    Retake Quiz
                  </button>
                  {token ? (
                    <button
                      onClick={handleApplyRecommendation}
                      className="px-6 py-2 bg-[#9f402d] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#802918] transition-colors shadow-md"
                    >
                      Apply suggestion
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (quizRecommendation) {
                          sessionStorage.setItem('pending_customize_kit', JSON.stringify(quizRecommendation.kit));
                          sessionStorage.setItem('pending_customize_items', JSON.stringify(quizRecommendation.mix));
                          router.push('/account?redirect=/customize');
                        }
                      }}
                      className="px-6 py-2 bg-[#9f402d] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#802918] transition-colors shadow-md"
                    >
                      Login/Register to Save & Subscribe
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Base Kit Toggle */}
      <div className="mb-12 bg-white p-6 rounded-2xl border border-brand-200/50 shadow-sm">
        <h3 className="font-display font-bold text-brand-dark text-lg mb-4">Step 1: Choose Pouch Capacity</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {kits.map((kit) => {
            const isSelected = selectedKit?.id === kit.id;
            return (
              <button
                key={kit.id}
                onClick={() => {
                  setSelectedKit(kit);
                  // Reset quantities when kit capacity changes
                  const resetQty: Record<number, number> = {};
                  components.forEach(c => { resetQty[c.id] = 0; });
                  setQuantities(resetQty);
                }}
                className={`p-5 rounded-xl text-left border-2 transition-all flex flex-col justify-between ${
                  isSelected 
                    ? 'border-[#9f402d] bg-brand-100/30' 
                    : 'border-brand-200/40 bg-brand-50 hover:bg-brand-100/10'
                }`}
              >
                <div className="flex justify-between items-center w-full mb-2">
                  <span className="font-bold text-brand-dark">{kit.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-[#9f402d] text-white' : 'bg-brand-200 text-brand-800'
                  }`}>
                    {kit.max_components} Pads
                  </span>
                </div>
                <p className="text-xs text-brand-dark/50 mb-4">{kit.description}</p>
                <div className="text-lg font-bold text-[#9f402d]">${parseFloat(kit.price).toFixed(2)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Customizer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Sticky summary widget */}
        <aside className="lg:col-span-4 lg:sticky lg:top-28 order-1 lg:order-2">
          <div className="bg-white p-6 rounded-2xl border border-brand-200/50 shadow-md">
            <div className="flex items-center gap-2 mb-6 text-brand-dark">
              <span className="material-symbols-outlined text-[#9f402d] text-2xl">shopping_bag</span>
              <h2 className="text-xl font-bold font-display">Your Custom Pouch</h2>
            </div>

            {/* Capacity Meter */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-brand-dark/50 uppercase tracking-widest font-semibold">Filled Capacity</span>
                <span className="text-lg font-bold text-[#9f402d]">
                  {totalSelected}/{selectedKit?.max_components || 0}
                </span>
              </div>
              <div className="w-full h-2 bg-brand-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    isPouchFull ? 'bg-green-600' : 'bg-[#9f402d]'
                  }`}
                  style={{ width: `${selectedKit ? (totalSelected / selectedKit.max_components) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-xs text-brand-dark/50 mt-2">
                {selectedKit 
                  ? (isPouchFull 
                      ? 'Pouch is ready for subscription!' 
                      : `Add ${selectedKit.max_components - totalSelected} more pads to complete your pack.`)
                  : 'Select a kit capacity above.'
                }
              </p>
            </div>

            {/* Selected items review */}
            <div className="border-t border-brand-100 py-6 min-h-[120px]">
              <h4 className="text-xs uppercase text-brand-dark/40 tracking-wider font-semibold mb-3">Pouch Contents</h4>
              {totalSelected === 0 ? (
                <div className="text-center py-6 border border-dashed border-brand-200 rounded-xl bg-brand-50/50">
                  <span className="material-symbols-outlined text-brand-200 text-3xl">add_circle</span>
                  <p className="text-xs text-brand-dark/40 mt-1">Configure item quantities below</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {components.map(comp => {
                    const qty = quantities[comp.id] || 0;
                    if (qty <= 0) return null;
                    return (
                      <div key={comp.id} className="flex justify-between items-center p-3 bg-brand-50 border border-brand-100 rounded-xl text-sm">
                        <span className="font-medium text-brand-dark">{comp.name}</span>
                        <span className="bg-[#9f402d]/10 text-[#9f402d] px-3 py-0.5 rounded-full font-bold text-xs">x{qty}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Flat Price summary and Submit */}
            <div className="border-t border-brand-100 pt-6">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm text-brand-dark/50">Monthly Total</span>
                <span className="text-2xl font-bold text-brand-dark">
                  ${selectedKit ? parseFloat(selectedKit.price).toFixed(2) : '0.00'}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!isPouchFull || checkoutLoading}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Checkout...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-md">lock</span>
                    <span>{token ? 'Subscribe & Checkout' : 'Login to Subscribe'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Right column: Components Lists */}
        <section className="lg:col-span-8 order-2 lg:order-1 space-y-6">
          <h3 className="font-display font-bold text-brand-dark text-lg">Step 2: Mix & Match Components</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            {components.map((comp) => {
              const qty = quantities[comp.id] || 0;
              const isOutOfStock = comp.stock_level <= 0;
              // Match types to nice descriptions
              let desc = "Premium organic cotton protection.";
              let badge = "Essential";
              let badgeBg = "bg-brand-200 text-brand-800";
              let bgImage = "/regular_pads_flatlay.png"; // Regular

              if (comp.component_type === 'gym_pad') {
                desc = "Ultra-thin, flexible wings designed for activewear and zero-feel support during sports.";
                badge = "Gym Fit";
                badgeBg = "bg-secondary/15 text-secondary";
                bgImage = "/gym_pad_texture.png";
              } else if (comp.component_type === 'night_pad') {
                desc = "Extended silhouette shape and leak-lock absorption for full 12-hour protection.";
                badge = "Overnight";
                badgeBg = "bg-tertiary/15 text-tertiary";
                bgImage = "/night_pad_comfort.png";
              } else if (comp.component_type === 'panty_liner') {
                desc = "Featherlight liners, perfect for daily wear, clean refreshes, and cycle beginning/ends.";
                badge = "Daily wear";
                badgeBg = "bg-brand-300/35 text-brand-800";
              }

              return (
                <div 
                  key={comp.id} 
                  className={`bg-white rounded-2xl overflow-hidden border border-brand-200/50 shadow-sm flex flex-col group transition-all hover:shadow-md ${
                    isOutOfStock ? 'opacity-65 pointer-events-none' : ''
                  }`}
                >
                  <div className="h-44 relative bg-brand-100 overflow-hidden">
                    <div 
                      className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105" 
                      style={{ backgroundImage: `url('${bgImage}')` }}
                    ></div>
                    <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${badgeBg}`}>
                      {badge}
                    </span>
                  </div>

                  <div className="p-5 flex-grow flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-brand-dark text-lg mb-1">{comp.name}</h4>
                      <p className="text-xs text-brand-dark/60 leading-relaxed mb-4">{desc}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-brand-50">
                      <span className="text-xs text-brand-dark/40 font-semibold uppercase tracking-widest">
                        {isOutOfStock ? 'OUT OF STOCK' : `Stock: ${comp.stock_level}`}
                      </span>

                      <div className="flex items-center gap-3 bg-brand-100/50 rounded-full px-3 py-1">
                        <button
                          onClick={() => adjustQuantity(comp.id, -1)}
                          disabled={qty <= 0}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-brand-800 shadow-sm hover:bg-[#9f402d] hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <span className="material-symbols-outlined text-sm">remove</span>
                        </button>
                        <span className="font-bold text-sm w-6 text-center text-brand-dark">{qty}</span>
                        <button
                          onClick={() => adjustQuantity(comp.id, 1)}
                          disabled={isOutOfStock || isPouchFull}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-white text-brand-800 shadow-sm hover:bg-[#9f402d] hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
