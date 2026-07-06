'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

interface KitProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  max_components: number;
  is_subscription_only: boolean;
}

interface SubscriptionItem {
  id: number;
  pad_component: {
    name: string;
    component_type: string;
  };
  quantity: number;
}

interface Subscription {
  id: number;
  status: string;
  delivery_interval_days: number;
  next_delivery_date: string;
  kit_product: {
    id: number;
    name: string;
    price: string;
    max_components: number;
  };
  items: SubscriptionItem[];
}

interface OrderItem {
  id: number;
  pad_component: {
    name: string;
  };
  quantity: number;
  price_at_purchase: string;
}

interface Order {
  id: number;
  order_type: string;
  status: string;
  total_amount: string;
  shipping_address: string;
  created_at: string;
  items: OrderItem[];
}

interface WholesaleInvoice {
  id: number;
  company_name: string;
  vat_number: string;
  billing_terms: string;
  tax_rate: string;
  pdf_status: string;
  payment_status: string;
  pdf_file_path: string;
  created_at: string;
  order: {
    id: number;
    status: string;
    total_amount: string;
    items?: OrderItem[];
  };
}

export default function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, loading: authLoading, login, register, refreshProfile } = useAuth();

  // Navigation redirect after login
  const redirectPath = searchParams.get('redirect') || '';

  // Tab State (login vs register)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [isB2BReg, setIsB2BReg] = useState(false);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');

  // UI States
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Dashboard States (D2C / B2B)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [wholesaleInvoices, setWholesaleInvoices] = useState<WholesaleInvoice[]>([]);
  const [componentsCatalog, setComponentsCatalog] = useState<any[]>([]);
  const [kits, setKits] = useState<KitProduct[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [savedQuizRec, setSavedQuizRec] = useState<{
    flow: string;
    active: string;
    preference: string;
    kitName: string;
    mix: Record<string, number>;
  } | null>(null);

  // B2B Wholesale Order Creator state
  const [wholesaleQuantities, setWholesaleQuantities] = useState<Record<number, number>>({});
  const [wholesaleShipping, setWholesaleShipping] = useState('');
  const [wholesaleBillingTerms, setWholesaleBillingTerms] = useState('net_30');
  const [bulkOrderError, setBulkOrderError] = useState<string | null>(null);
  const [bulkOrderSuccess, setBulkOrderSuccess] = useState<string | null>(null);
  const [bulkOrderLoading, setBulkOrderLoading] = useState(false);

  // Tab State for Portal Dashboard
  const [dashboardTab, setDashboardTab] = useState<'dashboard' | 'settings'>('dashboard');
  const [b2bSubTab, setB2bSubTab] = useState<'overview' | 'shop' | 'financials' | 'variants'>('overview');
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({
    "GP-LUX-001": 0,
    "GP-LUX-002": 0,
    "GP-LUX-003": 0
  });
  const [authMode, setAuthMode] = useState<'d2c' | 'b2b'>('d2c');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Profile Settings Form State
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profileVat, setProfileVat] = useState('');
  const [profileShipping, setProfileShipping] = useState('');
  const [profileBilling, setProfileBilling] = useState('');
  
  // Security
  const [twoFactor, setTwoFactor] = useState(true);

  // Form notifications
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Sync profile settings inputs when user record loads
  useEffect(() => {
    if (user) {
      setProfileEmail(user.email || '');
      setProfileCompany(user.company_name || '');
      setProfileVat(user.vat_number || '');
      setProfileShipping(user.shipping_address || '');
      setProfileBilling(user.billing_address || '');
    }
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      const payload: any = {
        email: profileEmail,
        shipping_address: profileShipping,
        billing_address: profileBilling,
      };

      if (user?.is_b2b) {
        payload.company_name = profileCompany;
        payload.vat_number = profileVat;
      }

      await api.auth.updateProfile(payload);
      await refreshProfile();
      setSettingsSuccess('Profile settings updated successfully!');
      setTimeout(() => setSettingsSuccess(null), 4000);
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to update settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Load saved quiz recommendation from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('girlypouch_quiz_recommendation');
      if (saved) {
        try {
          setSavedQuizRec(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse saved quiz rec:', e);
        }
      }
    }
  }, []);

  // Load Dashboard Data if authenticated
  useEffect(() => {
    if (token && user) {
      loadDashboardData();
    }
  }, [token, user]);

  const loadDashboardData = async () => {
    try {
      setDashboardLoading(true);
      const [catalog, loadedKits] = await Promise.all([
        api.products.getComponents(),
        api.products.getKits()
      ]);
      setComponentsCatalog(catalog);
      setKits(loadedKits);

      if (user?.is_b2b) {
        // B2B view
        const invoices = await api.orders.listWholesaleInvoices();
        setWholesaleInvoices(invoices);
        setWholesaleShipping(user.shipping_address || '');
        
        // Init wholesale quantities dynamically based on database catalog
        const initialQty: Record<number, number> = {};
        catalog.forEach((c: any) => {
          initialQty[c.id] = 0;
        });
        setWholesaleQuantities(initialQty);
      } else {
        // D2C view
        const [subs, loadedOrders] = await Promise.all([
          api.subscriptions.list(),
          api.orders.list()
        ]);
        setSubscriptions(subs);
        setOrders(loadedOrders);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  // Handle Login / Registration submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      if (authTab === 'login') {
        await login(username, password);
        if (redirectPath) {
          router.push(redirectPath);
        }
      } else {
        const payload: any = {
          username,
          password,
          email,
          is_b2b: isB2BReg,
        };
        if (isB2BReg) {
          payload.company_name = companyName;
          payload.vat_number = vatNumber;
          payload.shipping_address = shippingAddress;
          payload.billing_address = billingAddress;
        }
        await register(payload);
        if (redirectPath) {
          router.push(redirectPath);
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Authorization failed. Check your inputs.');
    } finally {
      setFormLoading(false);
    }
  };

  // Modify active subscription status (pause, resume, cancel)
  const handleSubscriptionStatus = async (subId: number, newStatus: string) => {
    try {
      setDashboardLoading(true);
      await api.subscriptions.update(subId, { status: newStatus });
      // Reload details
      const subs = await api.subscriptions.list();
      setSubscriptions(subs);
    } catch (err: any) {
      alert(`Failed to update subscription status: ${err.message}`);
    } finally {
      setDashboardLoading(false);
    }
  };

  // B2B Wholesale Order calculations
  const getWholesaleOrderTotals = () => {
    let subtotal = 0;
    
    componentsCatalog.forEach(comp => {
      const qty = wholesaleQuantities[comp.id] || 0;
      if (qty > 0) {
        const price = parseFloat(comp.contract_price || comp.wholesale_price || '0.50');
        subtotal += price * qty;
      }
    });

    const tax = subtotal * 0.20; // 20% VAT
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleWholesaleQtyChange = (id: number, val: string) => {
    const qty = parseInt(val) || 0;
    if (qty < 0) return;
    setWholesaleQuantities({
      ...wholesaleQuantities,
      [id]: qty
    });
  };

  // Place Wholesale Order
  const handlePlaceWholesaleOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBulkOrderError(null);
    setBulkOrderSuccess(null);

    const items: any[] = [];
    Object.entries(wholesaleQuantities).forEach(([id, qty]) => {
      if (qty > 0) {
        items.push({
          pad_component_id: parseInt(id),
          quantity: qty
        });
      }
    });

    if (items.length === 0) {
      setBulkOrderError('Please add at least one product to the wholesale order.');
      return;
    }

    if (!wholesaleShipping) {
      setBulkOrderError('Corporate delivery shipping destination is required.');
      return;
    }

    try {
      setBulkOrderLoading(true);
      await api.orders.createWholesale({
        items,
        company_name: user?.company_profile?.legal_business_name || user?.company_name,
        vat_number: user?.company_profile?.vat_tax_number || user?.vat_number,
        billing_terms: wholesaleBillingTerms,
        shipping_address: wholesaleShipping
      });
      
      setBulkOrderSuccess('Wholesale order placed successfully! Stripe Invoicing API triggered.');
      
      // Reset quantities dynamically
      const resetQty: Record<number, number> = {};
      componentsCatalog.forEach((c: any) => {
        resetQty[c.id] = 0;
      });
      setWholesaleQuantities(resetQty);
      setIsConfirmModalOpen(false);

      // Reload invoices and profile to update credit limit usage in real-time
      const [invoices] = await Promise.all([
        api.orders.listWholesaleInvoices(),
        refreshProfile()
      ]);
      setWholesaleInvoices(invoices);
    } catch (err: any) {
      setBulkOrderError(err.message || 'Wholesale transaction failed. Verify stock levels.');
    } finally {
      setBulkOrderLoading(false);
    }
  };

  const handleVariantQtyChange = (sku: string, val: string) => {
    const qty = parseInt(val) || 0;
    if (qty < 0) return;
    setVariantQuantities({
      ...variantQuantities,
      [sku]: qty
    });
  };

  // Place Wholesale Variant Matrix Order
  const handlePlaceVariantOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkOrderError(null);
    setBulkOrderSuccess(null);

    // Map variant quantities to components (Day, Night, Gym pads)
    const items: any[] = [];
    const variantMapping = [
      { sku: 'GP-LUX-001', type: 'day_pad' },
      { sku: 'GP-LUX-002', type: 'night_pad' },
      { sku: 'GP-LUX-003', type: 'gym_pad' }
    ];

    variantMapping.forEach(mapping => {
      const qty = variantQuantities[mapping.sku] || 0;
      if (qty > 0) {
        const comp = componentsCatalog.find(c => c.component_type === mapping.type);
        if (comp) {
          items.push({
            pad_component_id: comp.id,
            quantity: qty * 12 // case quantity has 12 items
          });
        }
      }
    });

    if (items.length === 0) {
      setBulkOrderError('Please set at least one case quantity for the variant order.');
      return;
    }

    if (!wholesaleShipping) {
      setBulkOrderError('Corporate delivery shipping destination is required.');
      return;
    }

    try {
      setBulkOrderLoading(true);
      await api.orders.createWholesale({
        items,
        company_name: user?.company_name,
        vat_number: user?.vat_number,
        billing_terms: wholesaleBillingTerms,
        shipping_address: wholesaleShipping
      });
      
      setBulkOrderSuccess('Wholesale variant matrix order placed successfully! Invoiced as 12-pack cases.');
      
      // Reset quantities
      setVariantQuantities({
        "GP-LUX-001": 0,
        "GP-LUX-002": 0,
        "GP-LUX-003": 0
      });

      // Reload invoices
      const invoices = await api.orders.listWholesaleInvoices();
      setWholesaleInvoices(invoices);
    } catch (err: any) {
      setBulkOrderError(err.message || 'Wholesale transaction failed. Verify stock levels.');
    } finally {
      setBulkOrderLoading(false);
    }
  };

  // Handle B2B Invoice PDF Download
  const handleDownloadInvoice = async (invoiceId: number) => {
    try {
      const blob = await api.orders.downloadInvoice(invoiceId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      alert(`Invoice download failed: ${err.message}`);
    }
  };

  // Loading Shell
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-800 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-brand-dark/70">Connecting to authentication services...</p>
      </div>
    );
  }

  // 1. Logged Out View (Login / Register Portal)
  if (!token || !user) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-12 pt-28">
        {/* Top-Level Portal Type Selector */}
        <div className="flex justify-center mb-8 bg-brand-50 p-1.5 rounded-2xl max-w-md mx-auto border border-brand-200/50">
          <button
            type="button"
            onClick={() => {
              setAuthMode('d2c');
              setIsB2BReg(false);
              setFormError(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'd2c'
                ? 'bg-[#9f402d] text-white shadow-sm'
                : 'text-brand-dark/60 hover:text-brand-dark'
            }`}
          >
            <span className="material-symbols-outlined text-sm">person</span>
            Individual Customer
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('b2b');
              setIsB2BReg(true);
              setFormError(null);
            }}
            className={`flex-1 py-3 px-4 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'b2b'
                ? 'bg-[#9f402d] text-white shadow-sm'
                : 'text-brand-dark/60 hover:text-brand-dark'
            }`}
          >
            <span className="material-symbols-outlined text-sm">corporate_fare</span>
            Wholesale Partner
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Form Card */}
          <div className={`${authMode === 'b2b' ? 'lg:col-span-7' : 'lg:col-span-12 max-w-2xl mx-auto w-full'} bg-white rounded-2xl border border-brand-200/50 p-8 shadow-lg flex flex-col justify-between`}>
            <div>
              {/* Form Tabs (Login vs Register) */}
              <div className="flex border-b border-brand-200/45 mb-8">
                <button
                  type="button"
                  onClick={() => { setAuthTab('login'); setFormError(null); }}
                  className={`flex-1 pb-4 text-center font-display font-extrabold text-sm uppercase tracking-wider transition-colors ${
                    authTab === 'login' ? 'border-b-2 border-[#9f402d] text-[#9f402d]' : 'text-brand-dark/40 hover:text-brand-dark/70'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthTab('register'); setFormError(null); }}
                  className={`flex-1 pb-4 text-center font-display font-extrabold text-sm uppercase tracking-wider transition-colors ${
                    authTab === 'register' ? 'border-b-2 border-[#9f402d] text-[#9f402d]' : 'text-brand-dark/40 hover:text-brand-dark/70'
                  }`}
                >
                  Register
                </button>
              </div>

              <header className="mb-6 text-center lg:text-left">
                <h1 className="text-xl font-extrabold text-brand-dark font-display leading-tight">
                  {authMode === 'b2b' 
                    ? (authTab === 'login' ? 'GirlyPouch Wholesale Partner Sign In' : 'Establish Wholesale Corporate Account')
                    : (authTab === 'login' ? 'Welcome Back to GirlyPouch' : 'Create Your Wellness Account')
                  }
                </h1>
                <p className="text-xs text-brand-dark/50 mt-1.5 leading-relaxed font-semibold">
                  {authMode === 'b2b'
                    ? (authTab === 'login' ? 'Access your merchant contracts, invoicing statements, and batch matrices.' : 'Configure priority allocations and custom Net invoicing options.')
                    : (authTab === 'login' ? 'Access your personalized subscription cycles and pouch builder configurations.' : 'Set up custom quantities, cycle intervals, and eco-friendly selections.')
                  }
                </p>
              </header>

              {authMode === 'b2b' && (
                <div className="mb-6 p-4 bg-[#ffdad3]/50 border border-[#ffdad3]/70 text-[#802918] rounded-xl text-xs font-semibold flex gap-2.5 items-start animate-fadeIn">
                  <span className="material-symbols-outlined text-sm shrink-0">warning</span>
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[9px] mb-0.5">Business Registration Portal</p>
                    Wholesale profiles require verified Tax/VAT identification. If you are ordering for personal use, please switch to the{' '}
                    <button 
                      type="button" 
                      onClick={() => { setAuthMode('d2c'); setIsB2BReg(false); setFormError(null); }} 
                      className="underline font-extrabold hover:text-[#9f402d] focus:outline-none"
                    >
                      Individual Customer
                    </button>{' '}
                    portal.
                  </div>
                </div>
              )}

              {formError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  <strong>Error:</strong> {formError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-field py-2.5 text-xs"
                    placeholder="e.g. wholesale_admin"
                  />
                </div>

                {authTab === 'register' && (
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field py-2.5 text-xs"
                      placeholder="e.g. purchasing@corporate.com"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field py-2.5 text-xs"
                    placeholder="••••••••"
                  />
                </div>

                {/* B2B Specific Form Fields */}
                {authMode === 'b2b' && authTab === 'register' && (
                  <div className="pt-4 border-t border-brand-100 space-y-4 animate-fadeIn">
                    <h4 className="text-xs uppercase text-[#9f402d] font-extrabold tracking-widest mb-2">Corporate Information</h4>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1">Company Registered Name</label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="input-field text-xs py-2 px-3"
                          placeholder="e.g. Wellness Bulk Distributors LLC"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1">VAT / Tax Registration ID</label>
                        <input
                          type="text"
                          required
                          value={vatNumber}
                          onChange={(e) => setVatNumber(e.target.value)}
                          className="input-field text-xs py-2 px-3"
                          placeholder="e.g. IE99F82734L"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1">Corporate Delivery Destination Address</label>
                      <textarea
                        required
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        rows={2}
                        className="input-field text-xs py-2 px-3"
                        placeholder="e.g. Warehouse Block D, Industrial Hub Road..."
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-[9px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1">Invoice Billing Address</label>
                      <textarea
                        required
                        value={billingAddress}
                        onChange={(e) => setBillingAddress(e.target.value)}
                        rows={2}
                        className="input-field text-xs py-2 px-3"
                        placeholder="e.g. Suite 400, Financial Square Boulevard..."
                      ></textarea>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full btn-primary py-3.5 mt-6 flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">
                        {authTab === 'login' ? 'login' : 'how_to_reg'}
                      </span>
                      <span>
                        {authTab === 'login' ? 'Sign In to Portal' : 'Register Corporate Account'}
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: B2B Values Proposition (Visible only in B2B mode) */}
          {authMode === 'b2b' && (
            <div className="lg:col-span-5 bg-[#5e2217] text-white rounded-2xl p-8 flex flex-col justify-between shadow-lg relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                {/* Warning Banner at the top of partner card */}
                <div className="bg-yellow-500/10 border border-yellow-500/25 rounded-xl p-4 flex gap-3 text-yellow-100">
                  <span className="material-symbols-outlined text-lg shrink-0 text-yellow-300">warning</span>
                  <div className="text-[11px] font-medium leading-relaxed">
                    <p className="font-bold text-white mb-0.5 uppercase tracking-wider text-[9px]">Corporate Access Only</p>
                    This channel is strictly for commercial purchases, corporate offices, hotels, and retail outlets.
                  </div>
                </div>

                <div>
                  <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Premium Partner Program</span>
                  <h3 className="text-xl font-bold font-display mt-3">GirlyPouch Corporate Partner Account</h3>
                  <p className="text-xs text-brand-100 leading-relaxed font-semibold">Join thousands of hotels, corporate hubs, and high-end boutiques providing luxurious period care support.</p>
                </div>

                <div className="space-y-3.5 pt-4 border-t border-white/10">
                  <div className="flex gap-2.5 items-start text-xs font-semibold">
                    <span className="material-symbols-outlined text-green-400 text-md">check_circle</span>
                    <span>Net-15 to Net-60 Invoicing Terms.</span>
                  </div>
                  <div className="flex gap-2.5 items-start text-xs font-semibold">
                    <span className="material-symbols-outlined text-green-400 text-md">check_circle</span>
                    <span>Priority Stock Allocations on Bulk Cases.</span>
                  </div>
                  <div className="flex gap-2.5 items-start text-xs font-semibold">
                    <span className="material-symbols-outlined text-green-400 text-md">check_circle</span>
                    <span>Dynamic Variant Case Batch builders.</span>
                  </div>
                  <div className="flex gap-2.5 items-start text-xs font-semibold">
                    <span className="material-symbols-outlined text-green-400 text-md">check_circle</span>
                    <span>Automated PDF invoice ledger downloads.</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-6 border-t border-white/10 text-[9px] uppercase tracking-widest text-brand-200 font-bold flex justify-between">
                <span>Support Available 24/7</span>
                <span>partners@girlypouch.com</span>
              </div>

              {/* Decorative background shape */}
              <div className="absolute -bottom-16 -right-16 opacity-5 pointer-events-none">
                <span className="material-symbols-outlined text-[200px]">shield</span>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // 2. Logged In View (Portal Dashboard)
  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-12 pt-28">
      {/* Welcome Banner (D2C Customer Only) */}
      {!user.is_b2b && (
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-brand-200/30 pb-8">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-brand-dark">
              Welcome back, {user.username}
            </h1>
            <p className="text-sm text-brand-dark/60">
              Configure your active wellness cycles and subscription pouches.
            </p>
          </div>
        </header>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-brand-200 mb-8 gap-6">
        <button
          onClick={() => {
            setDashboardTab('dashboard');
            setSettingsError(null);
            setSettingsSuccess(null);
          }}
          className={`pb-3 font-semibold text-xs uppercase tracking-widest transition-all border-b-2 ${
            dashboardTab === 'dashboard'
              ? 'border-brand-800 text-brand-800 font-bold'
              : 'border-transparent text-brand-dark/50 hover:text-brand-800'
          }`}
        >
          {user.is_b2b ? 'Corporate Console' : 'Customer Console'}
        </button>
        <button
          onClick={() => {
            setDashboardTab('settings');
            setSettingsError(null);
            setSettingsSuccess(null);
          }}
          className={`pb-3 font-semibold text-xs uppercase tracking-widest transition-all border-b-2 ${
            dashboardTab === 'settings'
              ? 'border-brand-800 text-brand-800 font-bold'
              : 'border-transparent text-brand-dark/50 hover:text-brand-800'
          }`}
        >
          Profile Settings
        </button>
      </div>

      {dashboardLoading && (
        <div className="mb-6 p-4 bg-brand-100 text-brand-800 rounded-xl text-xs flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-brand-800 border-t-transparent rounded-full animate-spin"></div>
          Reloading client records...
        </div>
      )}

      {/* D2C CUSTOMER VIEW */}
      {dashboardTab === 'dashboard' && !user.is_b2b && (
        <div className="space-y-12">
          {/* Saved Wellness Profile Card */}
          {savedQuizRec && (
            <div className="bg-white p-6 rounded-2xl border border-brand-200/50 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffdad3]/15 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#9f402d] text-2xl">spa</span>
                    <h3 className="text-lg font-bold font-display text-brand-dark">Your Wellness Profile Recommendation</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[9px] font-extrabold uppercase tracking-wider">
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full">
                      Flow: {savedQuizRec.flow}
                    </span>
                    <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full">
                      Movement: {savedQuizRec.active}
                    </span>
                    <span className="bg-brand-50 border border-brand-200 text-[#9f402d] px-2.5 py-1 rounded-full">
                      Preference: {savedQuizRec.preference.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-[#56423e] leading-relaxed font-semibold">
                    Recommended Package: <strong className="text-brand-dark">{savedQuizRec.kitName}</strong>
                  </p>
                </div>

                <div className="flex gap-3 items-center">
                  <Link 
                    href="/customize?quiz=true"
                    className="px-4 py-2 border border-[#ddc0ba] text-brand-dark/70 hover:text-brand-dark font-bold text-xs uppercase tracking-wider rounded-xl transition-colors bg-white hover:bg-brand-50"
                  >
                    Retake Quiz
                  </Link>
                  {subscriptions.length === 0 && (
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          const matchedKit = kits.find(k => k.name === savedQuizRec.kitName) || kits[0];
                          if (matchedKit) {
                            sessionStorage.setItem('pending_customize_kit', JSON.stringify(matchedKit));
                            sessionStorage.setItem('pending_customize_items', JSON.stringify(savedQuizRec.mix));
                            router.push('/customize');
                          }
                        }
                      }}
                      className="px-5 py-2 bg-[#9f402d] hover:bg-[#802918] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-[#9f402d]/10"
                    >
                      Apply & Subscribe
                    </button>
                  )}
                </div>
              </div>

              {/* Breakdown detail panel */}
              <div className="mt-4 pt-4 border-t border-brand-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] font-semibold text-brand-dark/70">
                {componentsCatalog.map((comp) => {
                  const qty = savedQuizRec.mix[comp.id] || 0;
                  if (qty <= 0) return null;
                  return (
                    <div key={comp.id} className="bg-brand-50/50 p-2.5 rounded-xl border border-brand-100 flex items-center justify-between">
                      <span className="truncate">{comp.name}:</span>
                      <span className="font-bold text-[#9f402d] bg-white px-2 py-0.5 rounded border border-brand-200">x{qty}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {subscriptions.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-brand-200/50 text-center space-y-4 max-w-2xl mx-auto shadow-sm">
              <span className="material-symbols-outlined text-brand-200 text-6xl">shopping_basket</span>
              <h3 className="text-xl font-bold text-brand-dark font-display">No Active Custom Pouch</h3>
              <p className="text-xs text-brand-dark/50 max-w-sm mx-auto">Build your first period customization pouch based on your flow size requirements.</p>
              <Link href="/customize" className="btn-primary inline-block py-3 px-6 text-xs">
                Build Custom Pouch
              </Link>
            </div>
          ) : (
            <>
              {/* Active Subscription details */}
              {subscriptions.map((sub) => {
                const totalQty = sub.items.reduce((acc, item) => acc + item.quantity, 0);
                const maxCapacity = sub.kit_product.max_components;
                const percentFilled = Math.min(100, Math.round((totalQty / maxCapacity) * 100));
                const isPaused = sub.status === 'paused';
                
                return (
                  <div key={sub.id} className="space-y-12">
                    {/* Hero Section */}
                    <section className="flex flex-col lg:flex-row gap-8 items-start">
                      <div className="flex-1 space-y-3">
                        <span className="text-[10px] font-bold text-brand-800 uppercase tracking-widest bg-brand-800/10 px-3 py-1 rounded-full">
                          Member Dashboard
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-brand-dark leading-tight">
                          Welcome back, {user.username}.
                        </h1>
                        <p className="text-sm sm:text-base text-brand-dark/70 max-w-xl leading-relaxed">
                          Your wellness journey is on track. We've curated this month's selection based on your previous preferences and cycle logs.
                        </p>
                      </div>

                      {/* Next Delivery Card */}
                      <div className="w-full lg:w-96 bg-white rounded-2xl p-6 shadow-md border border-brand-200/30 relative overflow-hidden group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-800/5 rounded-full blur-3xl group-hover:bg-brand-800/10 transition-colors"></div>
                        <div className="relative z-10 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              sub.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : sub.status === 'paused' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {sub.status === 'active' ? 'Next Delivery' : sub.status}
                            </span>
                            <span className="material-symbols-outlined text-brand-800">local_shipping</span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold font-display text-brand-dark">
                              {sub.next_delivery_date ? new Date(sub.next_delivery_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Pending Confirm'}
                            </h3>
                            <p className="text-xs text-brand-dark/50">{sub.kit_product.name} (${parseFloat(sub.kit_product.price).toFixed(2)}/mo)</p>
                          </div>
                          
                          {/* Manage Buttons */}
                          <div className="flex gap-2 border-t border-brand-100 pt-4 mt-2">
                            {isPaused ? (
                              <button
                                onClick={() => handleSubscriptionStatus(sub.id, 'active')}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all text-center"
                              >
                                Resume
                              </button>
                            ) : (
                              <button
                                onClick={() => handleSubscriptionStatus(sub.id, 'paused')}
                                className="flex-1 bg-brand-800 hover:bg-brand-900 text-white font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all text-center"
                              >
                                Pause
                              </button>
                            )}
                            <button
                              onClick={() => handleSubscriptionStatus(sub.id, 'skipped')}
                              className="flex-1 border border-brand-300 hover:bg-brand-50 text-brand-800 font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all text-center"
                            >
                              Skip Month
                            </button>
                            {sub.status !== 'cancelled' && (
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to cancel this subscription?')) {
                                    handleSubscriptionStatus(sub.id, 'cancelled');
                                  }
                                }}
                                className="px-2 text-red-600 hover:bg-red-50 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Bento Layout for Status and Insights */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Pouch Preparation Progress */}
                      <div className="lg:col-span-7 bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-brand-200/50 space-y-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <h2 className="text-xl font-bold font-display text-brand-dark">Your Pouch Status</h2>
                            <p className="text-xs text-brand-dark/50 font-semibold mt-1">
                              {totalQty} items added, {maxCapacity - totalQty} spaces remaining
                            </p>
                          </div>
                          <span className="material-symbols-outlined text-brand-800 text-3xl">inventory_2</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-semibold text-brand-dark/70">
                            <span>Pouch Capacity</span>
                            <span className="text-brand-800">{percentFilled}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-brand-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-800 rounded-full transition-all duration-500" style={{ width: `${percentFilled}%` }}></div>
                          </div>
                        </div>

                        {/* Visual representations of items */}
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                          {sub.items.map((item) => {
                            let icon = "eco";
                            if (item.pad_component.component_type === 'gym_pad') icon = "fitness_center";
                            if (item.pad_component.component_type === 'night_pad') icon = "dark_mode";
                            
                            // Render a block for each item quantity
                            return Array.from({ length: item.quantity }).map((_, idx) => (
                              <div key={`${item.id}-${idx}`} className="flex-shrink-0 w-12 h-12 bg-brand-800/10 rounded-xl flex items-center justify-center border border-brand-200" title={item.pad_component.name}>
                                <span className="material-symbols-outlined text-brand-800 text-md">{icon}</span>
                              </div>
                            ));
                          })}
                        </div>
                      </div>

                      {/* Wellness Insights Card (Terracotta theme) */}
                      <div className="lg:col-span-5 bg-brand-800 text-white rounded-2xl p-6 md:p-8 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[220px]">
                        <div className="relative z-10 space-y-3">
                          <span className="material-symbols-outlined text-3xl">lightbulb</span>
                          <h2 className="text-xl font-bold font-display leading-tight">Luteal Phase Tip</h2>
                          <p className="text-xs text-brand-100/90 leading-relaxed max-w-sm">
                            Focus on magnesium-rich foods like dark chocolate and spinach this week to help ease muscle tension and improve sleep quality.
                          </p>
                        </div>
                        <Link href="/blog" className="font-bold text-xs uppercase tracking-widest text-brand-200 hover:text-white transition-colors flex items-center gap-1 mt-4 relative z-10">
                          Read Wellness Blog
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                        {/* Decorative background icon */}
                        <div className="absolute -bottom-10 -right-10 opacity-10 pointer-events-none">
                          <span className="material-symbols-outlined text-[160px]">spa</span>
                        </div>
                      </div>
                    </section>

                    {/* Custom Pack Breakdown Grid */}
                    <section className="bg-white p-6 rounded-2xl border border-brand-200/50 shadow-sm space-y-4">
                      <h4 className="text-xs uppercase text-brand-dark/50 tracking-wider font-bold">Custom Pack Breakdown</h4>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {sub.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-brand-50 border border-brand-100 rounded-xl text-xs">
                            <span className="font-semibold text-brand-dark">{item.pad_component.name}</span>
                            <span className="bg-brand-800/10 text-brand-800 px-2 py-0.5 rounded font-bold">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                );
              })}
              
              {/* Recommended Products Grid */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold font-display text-brand-dark">Recommended for Your Cycle</h2>
                  <Link href="/customize" className="text-xs font-bold text-brand-800 flex items-center gap-1 hover:underline">
                    View Customizer
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Product 1 */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-brand-200/30 flex flex-col hover:-translate-y-1 transition-all duration-300">
                    <div className="h-48 bg-brand-100 relative">
                      <img className="w-full h-full object-cover" alt="Organic Bamboo Day Pads" src="/organic_bamboo_pads.png" />
                      <span className="absolute top-3 left-3 bg-white/95 backdrop-blur px-2.5 py-0.5 rounded text-[9px] font-bold text-brand-dark shadow-sm uppercase">Bestseller</span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-brand-dark text-sm">Ultra-Soft Day Pads</h3>
                          <span className="text-brand-800 font-extrabold text-sm">$12.00</span>
                        </div>
                        <p className="text-xs text-brand-dark/50">100% Organic Bamboo, 12pk.</p>
                      </div>
                      <Link href="/customize" className="w-full bg-brand-100 hover:bg-brand-200 text-brand-800 font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                        Quick Reorder
                      </Link>
                    </div>
                  </div>

                  {/* Product 2 */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-brand-200/30 flex flex-col hover:-translate-y-1 transition-all duration-300">
                    <div className="h-48 bg-brand-100 relative">
                      <img className="w-full h-full object-cover" alt="Moon Cycle Tea" src="/moon_cycle_tea.png" />
                      <span className="absolute top-3 left-3 bg-brand-800 text-white px-2.5 py-0.5 rounded text-[9px] font-bold shadow-sm uppercase">Cycle Support</span>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-brand-dark text-sm">Moon Cycle Tea</h3>
                          <span className="text-brand-800 font-extrabold text-sm">$18.00</span>
                        </div>
                        <p className="text-xs text-brand-dark/50">Ginger, Raspberry Leaf & Rose.</p>
                      </div>
                      <Link href="/customize" className="w-full bg-brand-100 hover:bg-brand-200 text-brand-800 font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                        Quick Reorder
                      </Link>
                    </div>
                  </div>

                  {/* Product 3 */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-brand-200/30 flex flex-col hover:-translate-y-1 transition-all duration-300">
                    <div className="h-48 bg-brand-100 relative">
                      <img className="w-full h-full object-cover" alt="Featherweight Liners" src="/featherweight_liners.png" />
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <h3 className="font-bold text-brand-dark text-sm">Featherweight Liners</h3>
                          <span className="text-brand-800 font-extrabold text-sm">$9.00</span>
                        </div>
                        <p className="text-xs text-brand-dark/50">Breathable cotton, 24pk.</p>
                      </div>
                      <Link href="/customize" className="w-full bg-brand-100 hover:bg-brand-200 text-brand-800 font-bold py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                        Quick Reorder
                      </Link>
                    </div>
                  </div>
                </div>
              </section>

              {/* D2C Order History */}
              <div className="pt-6">
                <h2 className="text-xl font-bold font-display text-brand-dark mb-4">Past Transactions Log</h2>
                <div className="bg-white rounded-2xl border border-brand-200/50 shadow-sm overflow-hidden">
                  {orders.length === 0 ? (
                    <div className="text-center py-10 text-brand-dark/40 text-sm">
                      No orders have been dispatched yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="bg-brand-100/50 border-b border-brand-200/30 text-brand-dark/60 font-semibold">
                            <th className="p-4">Order ID</th>
                            <th className="p-4">Date Placed</th>
                            <th className="p-4">Delivery Status</th>
                            <th className="p-4 text-right">Amount Charged</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-200/20 text-brand-dark/80">
                          {orders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-brand-50/40 transition-colors">
                              <td className="p-4 font-bold text-brand-800">#ORD-{ord.id}</td>
                              <td className="p-4">{new Date(ord.created_at).toLocaleDateString()}</td>
                              <td className="p-4">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  ord.status === 'dispatched' 
                                    ? 'bg-green-100 text-green-800' 
                                    : ord.status === 'cancelled' 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {ord.status}
                                </span>
                              </td>
                              <td className="p-4 text-right font-bold">${parseFloat(ord.total_amount).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* B2B CORPORATE VIEW */}
      {dashboardTab === 'dashboard' && user.is_b2b && (
        <div className="space-y-8 animate-fadeIn">
          {/* Safety Stock Warnings Alert Banner */}
          {componentsCatalog.some(comp => (wholesaleQuantities[comp.id] || 0) > comp.stock_level) && (
            <div className="bg-[#FFF4E5] border border-[#FFD591] px-6 py-4 rounded-2xl flex items-center justify-between text-[#B45309] text-xs font-semibold shadow-sm animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">warning</span>
                <span>Requested unit volume exceeds live stock. Splitting into back-order allocations automatically.</span>
              </div>
            </div>
          )}

          {/* 1. Account Summary Block */}
          <section className="bg-white border border-brand-200/50 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div>
              <span className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-widest block mb-1">Company Profile</span>
              <h2 className="text-lg font-bold font-display text-brand-dark truncate" title={user.company_profile?.legal_business_name || user.company_name}>{user.company_profile?.legal_business_name || user.company_name || 'Wellness Bulk Partner'}</h2>
              <p className="text-[10px] text-brand-dark/50 font-semibold mt-1">Ref ID: <span className="font-mono text-brand-800 font-bold">GP-{user.id}-B2B</span></p>
            </div>

            <div className="bg-brand-50 p-4 rounded-xl border border-brand-200/30">
              <span className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-wider block mb-1">Tax Identification & Terms</span>
              <p className="text-xs font-bold text-brand-dark">VAT: {user.company_profile?.vat_tax_number || user.vat_number || 'N/A'}</p>
              <p className="text-xs font-bold text-brand-dark mt-1">Terms: {user.company_profile?.payment_terms === 'net_60' ? 'Net-60 Invoicing' : 'Net-30 Invoicing'}</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="bg-brand-800/10 text-brand-800 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  {user.company_profile?.discount_tier === 'tier_2' ? 'Tier 2 (15% Off)' : 'Tier 1 (10% Off)'} Contract Pricing
                </span>
              </div>
              <div className="bg-brand-800/5 border border-brand-800/10 p-4 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-bold text-brand-800 uppercase tracking-wider block">Available Credit Line</span>
                  <span className="text-lg font-black text-brand-800 font-display">
                    ${(parseFloat(user.company_profile?.credit_limit || '50000.00') - parseFloat(user.company_profile?.credit_used || '0.00')).toFixed(2)}
                  </span>
                </div>
                <span className="material-symbols-outlined text-brand-800 text-xl">payments</span>
              </div>
            </div>
          </section>

          {/* 2. Bulk Quick-Order Matrix */}
          <section className="bg-white p-6 md:p-8 rounded-2xl border border-brand-200/50 shadow-md space-y-6">
            <div>
              <h2 className="text-xl font-bold font-display text-brand-dark flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-800">shopping_cart</span>
                Bulk Quick-Order Matrix
              </h2>
              <p className="text-xs text-brand-dark/50 mt-1">Specify bulk wholesale unit volumes. Pre-negotiated discount rates are dynamically calculated.</p>
            </div>

            {bulkOrderError && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                <strong>Order Failed:</strong> {bulkOrderError}
              </div>
            )}
            {bulkOrderSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs">
                <strong>Success:</strong> {bulkOrderSuccess}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-brand-100/50 border-b border-brand-200/30 text-brand-dark/60 font-semibold">
                    <th className="p-4">Product Details</th>
                    <th className="p-4">Live Warehouse Stock</th>
                    <th className="p-4">Base Wholesale Price</th>
                    <th className="p-4 text-brand-800 font-bold">Your Contract Price</th>
                    <th className="p-4 text-center">Massive Qty (Units)</th>
                    <th className="p-4 text-right">Line Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-200/20 text-brand-dark/80">
                  {componentsCatalog.map((comp) => {
                    const qty = wholesaleQuantities[comp.id] || 0;
                    const discount = user.company_profile?.discount_tier === 'tier_2' ? 0.15 : 0.10;
                    const basePrice = parseFloat(comp.wholesale_price || '0.50');
                    const contractPrice = basePrice * (1.0 - discount);
                    const lineTotal = qty * contractPrice;
                    const isOverstock = qty > comp.stock_level;

                    let sku = "GP-RP-WH";
                    if (comp.component_type === 'gym_pad') sku = "GP-GP-WH";
                    if (comp.component_type === 'night_pad') sku = "GP-NP-WH";
                    if (comp.component_type === 'panty_liner') sku = "GP-PL-WH";

                    return (
                      <tr key={comp.id} className="hover:bg-brand-50/40 transition-colors">
                        <td className="p-4 font-bold text-brand-dark">
                          <div>{comp.name}</div>
                          <div className="text-[10px] text-brand-dark/40 font-mono mt-0.5">SKU: {sku}</div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            isOverstock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {comp.stock_level} units
                          </span>
                        </td>
                        <td className="p-4 text-brand-dark/50">${basePrice.toFixed(2)}</td>
                        <td className="p-4 font-extrabold text-brand-800">${contractPrice.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={qty || ''}
                            onChange={(e) => handleWholesaleQtyChange(comp.id, e.target.value)}
                            className="w-24 bg-brand-50 border-brand-200 rounded-xl py-1.5 px-2.5 focus:ring-0 focus:border-brand-800 text-brand-dark font-bold text-xs text-center outline-none"
                          />
                        </td>
                        <td className="p-4 text-right font-extrabold text-brand-dark">${lineTotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Delivery address & terms inputs */}
            <div className="grid md:grid-cols-12 gap-6 pt-4 border-t border-brand-100">
              <div className="md:col-span-8">
                <label className="block text-xs font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5">Delivery Destination Address</label>
                <textarea
                  required
                  value={wholesaleShipping}
                  onChange={(e) => setWholesaleShipping(e.target.value)}
                  rows={2}
                  className="input-field text-xs py-2 px-3 outline-none"
                  placeholder="Enter corporate delivery warehouse address..."
                ></textarea>
              </div>

              <div className="md:col-span-4">
                <label className="block text-xs font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5">Billing Terms</label>
                <select
                  value={wholesaleBillingTerms}
                  onChange={(e) => setWholesaleBillingTerms(e.target.value)}
                  className="input-field text-xs outline-none"
                >
                  <option value="net_15">Net-15 Invoice</option>
                  <option value="net_30">Net-30 Invoice</option>
                  <option value="net_45">Net-45 Invoice</option>
                  <option value="net_60">Net-60 Invoice</option>
                </select>
              </div>
            </div>

            {/* Dynamic Totals box */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-brand-50 p-6 rounded-xl border border-brand-200/40 gap-4 mt-6">
              <div className="text-center sm:text-left text-xs md:text-sm space-y-1">
                <div className="text-brand-dark/50">Subtotal: <span className="font-semibold text-brand-dark">${getWholesaleOrderTotals().subtotal.toFixed(2)}</span></div>
                <div className="text-brand-dark/50">VAT Tax (20%): <span className="font-semibold text-brand-dark">${getWholesaleOrderTotals().tax.toFixed(2)}</span></div>
                <div className="text-lg font-bold text-brand-dark pt-1">Grand Total: <span className="text-brand-800">${getWholesaleOrderTotals().total.toFixed(2)}</span></div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const hasItems = Object.values(wholesaleQuantities).some(qty => qty > 0);
                  if (!hasItems) {
                    alert("Please specify at least one product and quantity to build your wholesale order.");
                    return;
                  }
                  if (!wholesaleShipping) {
                    alert("A shipping delivery destination is required.");
                    return;
                  }
                  setIsConfirmModalOpen(true);
                }}
                disabled={bulkOrderLoading}
                className="w-full sm:w-auto btn-primary py-3.5 px-8 flex items-center justify-center gap-2 shadow-lg"
              >
                <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                <span>Place Wholesale Order</span>
              </button>
            </div>
          </section>

          {/* 3. Interactive Invoice Ledger */}
          <section className="bg-white border border-brand-200/50 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-display text-brand-dark flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-800">receipt_long</span>
                  Invoice Ledger
                </h2>
                <p className="text-xs text-brand-dark/50 mt-1">Search, track payment status, and download PDF invoices for B2B orders.</p>
              </div>
              <div>
                <div className="relative">
                  <span className="material-symbols-outlined text-brand-dark/40 absolute left-3 top-2 text-md">search</span>
                  <input
                    type="text"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-brand-50 border border-brand-200 rounded-xl text-xs outline-none focus:border-brand-400"
                    placeholder="Search ledger..."
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="bg-brand-100/50 border-b border-brand-200/30 text-brand-dark/60 font-semibold">
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Breakdown</th>
                    <th className="p-4 text-right">Total (incl. VAT)</th>
                    <th className="p-4">Payment Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-200/20 text-brand-dark/80">
                  {wholesaleInvoices
                    .filter(inv => {
                      const query = invoiceSearch.toLowerCase();
                      const invId = `#INV-2026-00${inv.id}`.toLowerCase();
                      const company = inv.company_name.toLowerCase();
                      const terms = inv.billing_terms.toLowerCase();
                      const items = inv.order.items
                        ? inv.order.items.map((it: any) => it.pad_component.name).join(' ').toLowerCase()
                        : '';
                      return invId.includes(query) || company.includes(query) || terms.includes(query) || items.includes(query);
                    })
                    .map((inv) => {
                      const itemsBreakdown = inv.order.items
                        ? inv.order.items.map((item: any) => `${item.quantity}x ${item.pad_component.name}`).join(', ')
                        : 'Wholesale order package';

                      let badgeClass = "bg-yellow-100 text-yellow-800";
                      let statusText = "Pending";
                      if (inv.payment_status === 'paid') {
                        badgeClass = "bg-green-100 text-green-800";
                        statusText = "Paid";
                      } else if (inv.payment_status === 'overdue') {
                        badgeClass = "bg-red-100 text-red-800";
                        statusText = "Overdue";
                      }

                      return (
                        <tr key={inv.id} className="hover:bg-brand-50/40 transition-colors">
                          <td className="p-4 font-mono font-bold text-brand-800">#INV-2026-00{inv.id}</td>
                          <td className="p-4">{new Date(inv.created_at).toLocaleDateString()}</td>
                          <td className="p-4 truncate max-w-[250px]" title={itemsBreakdown}>{itemsBreakdown}</td>
                          <td className="p-4 text-right font-extrabold text-brand-dark">${parseFloat(inv.order.total_amount).toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                              {statusText}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDownloadInvoice(inv.id)}
                              disabled={inv.pdf_status !== 'generated'}
                              className="p-1.5 text-brand-800 hover:text-brand-900 bg-brand-100 hover:bg-brand-200 rounded-lg disabled:opacity-30 disabled:pointer-events-none transition-colors"
                              title="Download PDF"
                            >
                              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. Confirmation Modal */}
          {isConfirmModalOpen && (
            <div className="fixed inset-0 z-[100] bg-brand-dark/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fadeIn">
              <div className="bg-white rounded-2xl p-8 max-w-lg w-full border border-brand-200/50 shadow-xl space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-800/10 flex items-center justify-center text-brand-800">
                    <span className="material-symbols-outlined text-2xl">shopping_cart_checkout</span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-lg font-bold text-brand-dark">Confirm Bulk Order</h3>
                    <p className="text-xs text-brand-dark/50">Verify large financial commitments before submission.</p>
                  </div>
                </div>

                <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 text-xs space-y-2 max-h-40 overflow-y-auto">
                  {componentsCatalog.map(comp => {
                    const qty = wholesaleQuantities[comp.id] || 0;
                    if (qty <= 0) return null;
                    const discount = user.company_profile?.discount_tier === 'tier_2' ? 0.15 : 0.10;
                    const price = parseFloat(comp.wholesale_price || '0.50') * (1.0 - discount);
                    return (
                      <div key={comp.id} className="flex justify-between items-center">
                        <span className="font-semibold text-brand-dark">{qty}x {comp.name}</span>
                        <span className="font-bold text-brand-800">${(qty * price).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-brand-100 pt-4 text-xs text-brand-dark/70 font-semibold space-y-1">
                  <div className="flex justify-between">
                    <span>Terms:</span>
                    <span className="text-brand-dark font-bold uppercase">{wholesaleBillingTerms.replace('_', '-')} Invoicing</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Rate:</span>
                    <span>20% VAT</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-dashed border-brand-200">
                    <span className="text-brand-dark">Total Amount Due:</span>
                    <span className="text-brand-800">${getWholesaleOrderTotals().total.toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-[10px] text-brand-dark/50 leading-relaxed font-medium">
                  By clicking Confirm Execution, you agree to place this bulk wholesale order under Net billing terms. This generates a legally binding invoice for your company profile.
                </p>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="flex-1 font-semibold text-brand-dark/70 border border-brand-300 py-2.5 rounded-xl hover:bg-brand-50 transition-colors text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePlaceWholesaleOrder()}
                    disabled={bulkOrderLoading}
                    className="flex-1 btn-primary py-2.5 text-xs text-center"
                  >
                    Confirm Execution
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {dashboardTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Settings Sidebar navigation */}
          <aside className="lg:col-span-3 bg-white p-4 rounded-2xl border border-brand-200/50 shadow-sm space-y-1">
            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left bg-brand-800/10 text-brand-800 font-bold border-l-4 border-brand-800">
              <span className="material-symbols-outlined text-md">person</span>
              <span className="text-xs uppercase tracking-wider font-semibold">Personal Info</span>
            </button>
            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left text-brand-dark/50 hover:bg-brand-50 hover:text-brand-800 transition-colors">
              <span className="material-symbols-outlined text-md">shield</span>
              <span className="text-xs uppercase tracking-wider font-semibold">Security</span>
            </button>
            {!user.is_b2b && (
              <>
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left text-brand-dark/50 hover:bg-brand-50 hover:text-brand-800 transition-colors">
                  <span className="material-symbols-outlined text-md">notifications</span>
                  <span className="text-xs uppercase tracking-wider font-semibold">Notifications</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-left text-brand-dark/50 hover:bg-brand-50 hover:text-brand-800 transition-colors">
                  <span className="material-symbols-outlined text-md">credit_card</span>
                  <span className="text-xs uppercase tracking-wider font-semibold">Payments</span>
                </button>
              </>
            )}
          </aside>

          {/* Settings Form Column */}
          <div className="lg:col-span-9 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-brand-200/50 shadow-sm space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-brand-100">
                <h2 className="text-xl font-bold font-display text-brand-dark">Personal Information</h2>
                <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Verified Account
                </span>
              </div>

              {settingsError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  <strong>Save Failed:</strong> {settingsError}
                </div>
              )}
              {settingsSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs">
                  <strong>Success:</strong> {settingsSuccess}
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">
                      Full Username
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user.username}
                      className="input-field text-xs py-2.5 px-3 bg-brand-50/55 text-brand-dark/55 cursor-not-allowed border-brand-200/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="input-field text-xs py-2.5 px-3"
                    />
                  </div>

                  {user.is_b2b && (
                    <>
                      <div>
                        <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">
                          Company Name
                        </label>
                        <input
                          type="text"
                          required
                          value={profileCompany}
                          onChange={(e) => setProfileCompany(e.target.value)}
                          className="input-field text-xs py-2.5 px-3"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">
                          VAT Tax ID Number
                        </label>
                        <input
                          type="text"
                          required
                          value={profileVat}
                          onChange={(e) => setProfileVat(e.target.value)}
                          className="input-field text-xs py-2.5 px-3"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">
                      Shipping Destination Address
                    </label>
                    <textarea
                      required
                      value={profileShipping}
                      onChange={(e) => setProfileShipping(e.target.value)}
                      rows={2}
                      className="input-field text-xs py-2.5 px-3"
                      placeholder="Street, City, Postal Code, Country..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">
                      Billing Invoice Address
                    </label>
                    <textarea
                      required
                      value={profileBilling}
                      onChange={(e) => setProfileBilling(e.target.value)}
                      rows={2}
                      className="input-field text-xs py-2.5 px-3"
                      placeholder="Billing street address for receipts/invoices..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-brand-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDashboardTab('dashboard');
                      setSettingsError(null);
                      setSettingsSuccess(null);
                    }}
                    className="px-4 py-2 border border-brand-300 hover:bg-brand-50 text-brand-800 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="btn-primary px-6 py-2 text-xs flex items-center gap-2"
                  >
                    {settingsLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Security Section mock */}
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-brand-200/50 shadow-sm space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-brand-100">
                <span className="material-symbols-outlined text-brand-800 text-lg">shield</span>
                <h2 className="text-xl font-bold font-display text-brand-dark">Security & Password</h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">Current Password</label>
                  <input type="password" placeholder="••••••••••••" disabled className="input-field text-xs py-2.5 px-3 bg-brand-50/50 cursor-not-allowed border-brand-200/50" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-brand-dark/50 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                  <input type="password" placeholder="••••••••••••" disabled className="input-field text-xs py-2.5 px-3 bg-brand-50/50 cursor-not-allowed border-brand-200/50" />
                </div>
              </div>
              <div className="flex justify-between items-center p-4 bg-brand-50 rounded-xl border border-brand-200/30">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-brand-dark block">Two-Factor Authentication (2FA)</span>
                  <span className="text-[10px] text-brand-dark/50 block font-semibold">Verify identity via secure SMS or email alerts.</span>
                </div>
                <button 
                  onClick={() => setTwoFactor(!twoFactor)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${twoFactor ? 'bg-brand-800' : 'bg-brand-200'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${twoFactor ? 'translate-x-6' : ''}`}></div>
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50/50 p-6 md:p-8 rounded-2xl border border-red-200 space-y-4">
              <h3 className="font-bold text-red-800 text-sm">Danger Zone</h3>
              {user.is_b2b ? (
                <p className="text-xs text-brand-dark/65 leading-relaxed font-semibold">
                  Corporate wholesale accounts cannot be self-deleted due to financial auditing and invoicing compliance. Please contact your dedicated account representative at <a href="mailto:wholesale@girlypouch.com" className="text-brand-800 hover:underline">wholesale@girlypouch.com</a> to terminate business agreements.
                </p>
              ) : (
                <>
                  <p className="text-xs text-brand-dark/60 leading-relaxed">
                    Once you request account deletion, all active subscriptions, pending corporate bulk orders, and invoice histories will be permanently removed.
                  </p>
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to request account deletion? This action is permanent.')) {
                        alert('Account deletion request registered. Our customer support will contact you within 24 hours.');
                      }
                    }}
                    className="px-4 py-2 border border-red-600 hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Delete Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
