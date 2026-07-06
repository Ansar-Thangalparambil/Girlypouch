'use client';
 
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
 
export default function Navbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 
  const activeTab = searchParams.get('tab') || 'overview';
 
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
 
  const linkClass = (path: string) => {
    const baseClass = "font-body-md text-body-md transition-all duration-200 py-1 ";
    const isActive = pathname === path;
    return isActive 
      ? `${baseClass} text-brand-800 font-bold border-b-2 border-brand-800` 
      : `${baseClass} text-brand-dark/70 hover:text-brand-800`;
  };
 
  const b2bLinkClass = (tabName: string) => {
    const baseClass = "font-body-md text-body-md transition-all duration-200 py-1 ";
    const isActive = pathname === '/account' && activeTab === tabName;
    return isActive 
      ? `${baseClass} text-brand-800 font-bold border-b-2 border-brand-800` 
      : `${baseClass} text-brand-dark/70 hover:text-brand-800`;
  };
 
  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
      scrolled 
        ? 'py-3 bg-white/60 backdrop-blur-lg shadow-sm border-b border-white/20' 
        : 'py-4 bg-[#faf9f6]/30 backdrop-blur-md border-b border-[#ddc0ba]/10'
    }`}>
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="font-display text-2xl font-extrabold text-brand-800 hover:opacity-90 transition-opacity">
          GirlyPouch
        </Link>
 
        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-10">
          {user && pathname !== '/' && pathname !== '/account' && (
            user.is_b2b ? (
              <>
                <Link 
                  href="/account" 
                  className={pathname === '/account' 
                    ? 'font-body-md text-body-md transition-all duration-200 py-1 text-brand-800 font-bold border-b-2 border-brand-800' 
                    : 'font-body-md text-body-md transition-all duration-200 py-1 text-brand-dark/70 hover:text-brand-800'
                  }
                >
                  Wholesale Console
                </Link>
              </>
            ) : (
              <>
                <Link href="/" className={linkClass('/')}>Home</Link>
                <Link href="/customize" className={linkClass('/customize')}>Customize Pouch</Link>
                <Link href="/blog" className={linkClass('/blog')}>Wellness Blog</Link>
                <Link href="/account" className={linkClass('/account')}>
                  My Account
                </Link>
              </>
            )
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:block relative group">
                <button className="flex items-center gap-1 text-brand-dark/70 hover:text-brand-800 transition-colors py-1 focus:outline-none">
                  <span className="material-symbols-outlined text-xl">account_circle</span>
                  <span className="text-xs font-bold uppercase tracking-wider">{user.username}</span>
                  <span className="material-symbols-outlined text-xs">expand_more</span>
                </button>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-brand-200/50 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] overflow-hidden">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-brand-100/50 bg-brand-50/30">
                      <span className="block text-xs font-bold text-brand-dark">{user.username}</span>
                      <span className="block text-[10px] text-brand-dark/50 font-semibold truncate">{user.email}</span>
                    </div>
                    <Link href="/account" className="flex items-center gap-2 px-4 py-2 text-xs text-brand-dark/70 hover:bg-brand-50 hover:text-brand-800 transition-colors">
                      <span className="material-symbols-outlined text-md">person</span>
                      Profile Settings
                    </Link>
                    {(user.username === 'admin' || user.email === 'admin@girlypouch.com') && (
                      <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-xs text-brand-dark/70 hover:bg-brand-50 hover:text-brand-800 transition-colors">
                        <span className="material-symbols-outlined text-md">dashboard</span>
                        Admin Panel
                      </Link>
                    )}
                    <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-55 transition-colors border-t border-brand-100/50 text-left">
                      <span className="material-symbols-outlined text-md">logout</span>
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
              {pathname === '/' && (
                <Link href="/account" className="bg-[#9f402d] text-white px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all shadow-sm">
                  Console
                </Link>
              )}
            </>
          ) : (
            <Link href="/account" className="bg-[#9f402d] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all shadow-sm">
              Get Started
            </Link>
          )}

          {/* Mobile Menu Button */}
          {user && pathname !== '/' && pathname !== '/account' && (
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1 text-brand-dark"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d={mobileMenuOpen ? "M6 18 18 6M6 6l12 12" : "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"} />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-brand-100 py-4 px-6 space-y-4 shadow-inner flex flex-col">
          <Link 
            href="/" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-md ${pathname === '/' ? 'text-brand-800 font-bold' : 'text-brand-dark/70'}`}
          >
            Home
          </Link>
          <Link 
            href="/customize" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-md ${pathname === '/customize' ? 'text-brand-800 font-bold' : 'text-brand-dark/70'}`}
          >
            Customize Pouch
          </Link>
          <Link 
            href="/blog" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-md ${pathname === '/blog' ? 'text-brand-800 font-bold' : 'text-brand-dark/70'}`}
          >
            Wellness Blog
          </Link>
          <Link 
            href="/account" 
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-md ${pathname === '/account' ? 'text-brand-800 font-bold' : 'text-brand-dark/70'}`}
          >
            {user ? (user.is_b2b ? 'B2B Wholesale Portal' : 'My Account') : 'Login / Register'}
          </Link>
          {user && (user.username === 'admin' || user.email === 'admin@girlypouch.com') && (
            <Link 
              href="/admin" 
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 text-md ${pathname === '/admin' ? 'text-brand-800 font-bold' : 'text-brand-dark/70'}`}
            >
              Admin Portal
            </Link>
          )}
          {user && (
            <div className="pt-4 border-t border-brand-100 flex items-center justify-between">
              <span className="text-xs bg-brand-100 text-brand-800 px-3 py-1 rounded-full font-semibold">
                {user.username}
              </span>
              <button 
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }} 
                className="text-red-600 font-medium text-sm"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
