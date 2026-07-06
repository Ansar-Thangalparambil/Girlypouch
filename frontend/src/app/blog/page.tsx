'use client';

import React, { useState } from 'react';

interface Article {
  id: number;
  title: string;
  category: string;
  readTime: string;
  date: string;
  summary: string;
  content: string;
}

const wellnessArticles: Article[] = [
  {
    id: 1,
    title: "Understanding Your Cycle: The Four Phases of Period Wellness",
    category: "Cycle Tracking",
    readTime: "5 min read",
    date: "July 2, 2026",
    summary: "Your menstrual cycle is much more than just your period. Learn about the follicular, ovulatory, luteal, and menstrual phases and how to align your nutrition and workout routines accordingly.",
    content: "Menstruation is merely the beginning. By dividing your cycle into four distinct stages—follicular, ovulatory, luteal, and menstrual—you can unlock a personalized routine that coordinates with your biological rhythms. During the follicular phase, energy rises, making it the perfect time for strength training. In contrast, the luteal phase requires nurturing restorative care."
  },
  {
    id: 2,
    title: "Organic Cotton vs. Synthetic Plastics: The Hidden Toxins in Daily Hygiene",
    category: "Material Science",
    readTime: "8 min read",
    date: "June 28, 2026",
    summary: "Traditional period products contain up to 90% crude oil-derived plastics, chlorine bleaches, and synthetic fragrances. Discover how switching to certified 100% organic cotton protects your body and the earth.",
    content: "Most women do not realize that standard grocery store sanitary pads are heavily laden with plastics. Over a lifetime, exposure to synthetic binders and chlorine-bleached fibers can cause skin irritation and accumulate environmental waste. Organic cotton pads, like those featured in GirlyPouch customizations, are completely free of pesticides, fragrance, and plastic backing."
  },
  {
    id: 3,
    title: "Breathwork and Meditation: Calming the Luteal Phase Stress Spike",
    category: "Mindfulness",
    readTime: "4 min read",
    date: "June 15, 2026",
    summary: "As progesterone surges during the late luteal phase, many experience elevated stress and sleep disturbances. These quick, research-backed breathing exercises restore calm and regulate hormone-induced anxiety.",
    content: "Progesterone fluctuations can stimulate the amygdala, triggering a fight-or-flight response. Incorporating box breathing (inhale for 4, hold for 4, exhale for 4, hold for 4) for just five minutes daily can soothe the autonomic nervous system and lower cortisol spike levels."
  },
  {
    id: 4,
    title: "B2B Distribution: Why Sustainable Care is a Growing Retail Trend",
    category: "Market Insights",
    readTime: "6 min read",
    date: "May 30, 2026",
    summary: "Consumer trends are shifting rapidly towards conscious consumption. Read our wholesale market analysis explaining why eco-friendly hygiene products see higher customer retention and retail space growth.",
    content: "Eco-conscious shoppers seek out plastic-free, toxin-free wellness options. Retail stores and wellness boutique clinics offering custom-curated, biodegradable subscriptions see a 24% year-over-year increase in repeat customers, proving that sustainable hygiene is good for both the body and business."
  }
];

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const filteredArticles = searchQuery
    ? wellnessArticles.filter(art => 
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        art.summary.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : wellnessArticles;

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-12">
      {/* Blog Header */}
      <header className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-brand-dark">Period Awareness & Wellness Blog</h1>
          <p className="text-sm text-brand-dark/60 max-w-xl">
            Thoughtful insights, research-backed cycle tracking, and material safety analysis to support your wellness routine.
          </p>
        </div>

        {/* Simple Search bar */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field py-2 text-sm pl-10"
          />
          <span className="material-symbols-outlined text-brand-dark/40 absolute left-3 top-2.5 text-lg">search</span>
        </div>
      </header>

      {/* Main Layout (Featured or Grid vs Detail view) */}
      {selectedArticle ? (
        <article className="bg-white rounded-2xl border border-brand-200/50 shadow-md p-8 md:p-12 max-w-3xl mx-auto space-y-6">
          <button 
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-800 uppercase tracking-widest hover:text-brand-900 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Articles
          </button>

          <header className="space-y-4">
            <span className="inline-block px-3 py-1 bg-brand-800/10 text-brand-800 rounded-full text-xs font-bold uppercase tracking-wider">
              {selectedArticle.category}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-brand-dark leading-tight">{selectedArticle.title}</h2>
            <div className="flex gap-4 text-xs text-brand-dark/50">
              <span>{selectedArticle.date}</span>
              <span>•</span>
              <span>{selectedArticle.readTime}</span>
            </div>
          </header>

          <p className="font-semibold text-brand-dark/80 border-l-4 border-brand-800 pl-4 italic text-sm sm:text-base leading-relaxed">
            {selectedArticle.summary}
          </p>

          <div className="text-sm sm:text-base text-brand-dark/70 leading-relaxed pt-4 border-t border-brand-100">
            {selectedArticle.content}
          </div>
        </article>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {filteredArticles.map((art) => (
            <article 
              key={art.id} 
              className="glass-card p-6 flex flex-col justify-between hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs text-brand-dark/50">
                  <span className="font-bold text-brand-800 uppercase tracking-wider">{art.category}</span>
                  <span>{art.date}</span>
                </div>
                <h2 className="text-xl font-bold font-display text-brand-dark leading-snug">{art.title}</h2>
                <p className="text-xs sm:text-sm text-brand-dark/65 leading-relaxed line-clamp-3">{art.summary}</p>
              </div>

              <div className="flex justify-between items-center pt-6 mt-6 border-t border-brand-100/50">
                <span className="text-xs text-brand-dark/40 font-medium">{art.readTime}</span>
                <button 
                  onClick={() => setSelectedArticle(art)}
                  className="text-xs font-bold text-brand-800 hover:text-brand-900 uppercase tracking-widest flex items-center gap-1 hover:gap-1.5 transition-all"
                >
                  Read Article
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
