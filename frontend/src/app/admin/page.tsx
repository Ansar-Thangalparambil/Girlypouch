'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

interface PadComponent {
  id: number;
  name: string;
  component_type: string;
  stock_level: number;
  wholesale_price: string;
}

interface Shipment {
  id: string;
  companyName: string;
  logoLetters: string;
  items: string;
  date: string;
  status: 'Ready to Ship' | 'Processing' | 'Shipped';
}

const mockShipments: Shipment[] = [
  {
    id: '#WS-9842',
    companyName: 'EcoLiving Co.',
    logoLetters: 'EL',
    items: '500x Organic Pouches',
    date: 'Oct 22, 2026',
    status: 'Ready to Ship'
  },
  {
    id: '#WS-9843',
    companyName: 'Wellness West',
    logoLetters: 'WW',
    items: '250x Deluxe Bundles',
    date: 'Oct 23, 2026',
    status: 'Processing'
  },
  {
    id: '#WS-9844',
    companyName: 'Sustainably New',
    logoLetters: 'SN',
    items: '1,000x Liner Refills',
    date: 'Oct 24, 2026',
    status: 'Ready to Ship'
  }
];

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [components, setComponents] = useState<PadComponent[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>(mockShipments);
  const [chartPeriod, setChartPeriod] = useState('Last 6 Months');
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  // Load actual inventory from database
  useEffect(() => {
    async function loadInventory() {
      try {
        setInventoryLoading(true);
        const data = await api.products.getComponents();
        setComponents(data);
      } catch (err) {
        console.error('Failed to load components inventory:', err);
      } finally {
        setInventoryLoading(false);
      }
    }
    if (user && (user.username === 'admin' || user.email === 'admin@girlypouch.com')) {
      loadInventory();
    }
  }, [user]);

  const handleShipNow = (shipmentId: string) => {
    setShipments(prev => 
      prev.map(ship => 
        ship.id === shipmentId ? { ...ship, status: 'Shipped' as const } : ship
      )
    );
    setNotification(`Shipment ${shipmentId} was dispatched and status updated to Shipped!`);
    setTimeout(() => setNotification(null), 4000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-50">
        <div className="w-8 h-8 border-4 border-brand-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Security gate - only allow admin
  const isAdmin = user && (user.username === 'admin' || user.email === 'admin@girlypouch.com');
  if (!isAdmin) {
    return (
      <main className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 bg-brand-50">
        <div className="bg-white p-8 rounded-2xl border border-brand-200/50 shadow-md max-w-md space-y-6">
          <span className="material-symbols-outlined text-6xl text-red-500">lock_hazard</span>
          <h2 className="text-2xl font-bold font-display text-brand-dark">Access Denied</h2>
          <p className="text-sm text-brand-dark/60 leading-relaxed">
            This portal is restricted to authorized GirlyPouch administrators. Please sign in with an administrator account to view metrics and ship wholesale orders.
          </p>
          <div className="flex gap-4">
            <Link href="/" className="btn-secondary flex-1 text-center py-2 text-xs">
              Home
            </Link>
            <Link href="/account" className="btn-primary flex-1 text-center py-2 text-xs">
              Sign In Page
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Calculate live low stock count (threshold < 150)
  const lowStockCount = components.filter(c => c.stock_level < 150).length;

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-12 py-12 space-y-8">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 bg-brand-800 text-white px-6 py-3.5 rounded-xl shadow-lg flex items-center gap-3 border border-brand-700/50 z-50 animate-bounce">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span className="text-xs font-bold uppercase tracking-wider">{notification}</span>
        </div>
      )}

      {/* Admin header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-brand-200/30 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-800 font-bold">admin_panel_settings</span>
            <span className="text-xs font-bold text-brand-800 uppercase tracking-widest">GirlyPouch Administration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-brand-dark">Admin Console</h1>
          <p className="text-sm text-brand-dark/60">
            Overview metrics for {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </header>

      {/* Bento Row Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white p-6 rounded-2xl border border-brand-200/50 shadow-sm hover:-translate-y-0.5 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-brand-dark/50 text-xs font-bold uppercase tracking-wider">Total Revenue</span>
            <span className="material-symbols-outlined text-brand-800">payments</span>
          </div>
          <div className="flex items-baseline gap-1">
            <h2 className="text-2xl font-extrabold text-brand-dark font-display">$142,380.00</h2>
            <span className="text-green-600 text-xs font-bold flex items-center">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>12%
            </span>
          </div>
          <div className="mt-4 h-2 bg-brand-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-800 w-[75%] rounded-full"></div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white p-6 rounded-2xl border border-brand-200/50 shadow-sm hover:-translate-y-0.5 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-brand-dark/50 text-xs font-bold uppercase tracking-wider">Active Subscriptions</span>
            <span className="material-symbols-outlined text-brand-800">calendar_today</span>
          </div>
          <div className="flex items-baseline gap-1">
            <h2 className="text-2xl font-extrabold text-brand-dark font-display">8,421</h2>
            <span className="text-green-600 text-xs font-bold flex items-center">
              <span className="material-symbols-outlined text-[14px]">trending_up</span>4.2%
            </span>
          </div>
          <div className="mt-4 flex gap-1">
            <div className="h-2 flex-1 rounded-full bg-brand-800"></div>
            <div className="h-2 flex-1 rounded-full bg-brand-800"></div>
            <div className="h-2 flex-1 rounded-full bg-brand-800 opacity-30"></div>
          </div>
        </div>

        {/* Pending Shipments */}
        <div className="bg-white p-6 rounded-2xl border border-brand-200/50 shadow-sm hover:-translate-y-0.5 transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-brand-dark/50 text-xs font-bold uppercase tracking-wider">Pending Wholesale</span>
            <span className="material-symbols-outlined text-brand-800">local_shipping</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-extrabold text-brand-dark font-display">
              {shipments.filter(s => s.status !== 'Shipped').length}
            </h2>
            <span className="bg-brand-800/10 text-brand-800 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
              Critical
            </span>
          </div>
          <p className="text-[10px] text-brand-dark/50 mt-4 font-semibold">Requires packaging attention</p>
        </div>

        {/* Low Stock Warning */}
        <div className={`p-6 rounded-2xl border transition-all ${
          lowStockCount > 0 ? 'bg-red-50/50 border-red-200' : 'bg-white border-brand-200/50'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <span className="text-brand-dark/50 text-xs font-bold uppercase tracking-wider">Low Stock Alerts</span>
            <span className={`material-symbols-outlined ${lowStockCount > 0 ? 'text-red-600' : 'text-brand-800'}`}>warning</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className={`text-2xl font-extrabold font-display ${lowStockCount > 0 ? 'text-red-700' : 'text-brand-dark'}`}>
              {lowStockCount} Items
            </h2>
            <span className="text-xs text-brand-dark/50">threshold &lt; 150</span>
          </div>
          <div className="mt-4 h-2 bg-brand-200 rounded-full overflow-hidden">
            <div className={`h-full ${lowStockCount > 0 ? 'bg-red-500' : 'bg-brand-800'} w-[85%]`}></div>
          </div>
        </div>
      </section>

      {/* Main Charts & Feed Area */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Subscription Growth Chart Block */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-brand-200/50 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold font-display text-brand-dark">Subscription Growth</h3>
              <p className="text-xs text-brand-dark/50 font-semibold">Last 6 months performance</p>
            </div>
            <select 
              value={chartPeriod}
              onChange={(e) => setChartPeriod(e.target.value)}
              className="bg-brand-50 border-none rounded-xl text-xs py-2 px-3 font-semibold text-brand-dark/70 focus:ring-2 focus:ring-brand-800"
            >
              <option>Last 6 Months</option>
              <option>Year to Date</option>
            </select>
          </div>

          {/* Fake Visual Chart Bar graphs */}
          <div className="h-56 flex items-end justify-between gap-6 px-4 pt-4 border-b border-brand-100">
            {[
              { month: 'May', height: 'h-[40%]', count: '3,210' },
              { month: 'Jun', height: 'h-[55%]', count: '4,560' },
              { month: 'Jul', height: 'h-[48%]', count: '4,100' },
              { month: 'Aug', height: 'h-[70%]', count: '5,920' },
              { month: 'Sep', height: 'h-[78%]', count: '6,840' },
              { month: 'Oct', height: 'h-[92%]', count: '8,421', current: true },
            ].map((bar, idx) => (
              <div key={idx} className="group relative flex flex-col items-center flex-1 space-y-2">
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-brand-dark text-white text-[10px] py-1 px-2 rounded font-bold transition-opacity whitespace-nowrap shadow-md">
                  {bar.count} Subs
                </div>
                <div className={`w-full rounded-t-lg transition-all duration-300 ${
                  bar.current 
                    ? 'bg-brand-800 shadow-md shadow-brand-800/10 hover:opacity-90' 
                    : 'bg-brand-200 group-hover:bg-brand-300'
                } ${bar.height}`}></div>
                <span className={`text-[10px] font-semibold ${bar.current ? 'text-brand-800 font-bold' : 'text-brand-dark/50'}`}>
                  {bar.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Inventory Stock Levels Panel */}
        <div className="bg-white p-6 rounded-2xl border border-brand-200/50 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold font-display text-brand-dark">Live Stock Levels</h3>
            <p className="text-xs text-brand-dark/50 font-semibold">Real-time database inventory levels</p>
          </div>

          {inventoryLoading ? (
            <div className="py-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-brand-800 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {components.map((comp) => {
                const isLow = comp.stock_level < 150;
                return (
                  <div key={comp.id} className="flex justify-between items-center p-3 bg-brand-50 rounded-xl border border-brand-200/20">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-brand-dark">{comp.name}</span>
                      <div className="text-[10px] text-brand-dark/40 font-semibold uppercase">{comp.component_type}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isLow ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {comp.stock_level} Left
                      </span>
                      <div className="text-[9px] text-brand-dark/40 font-semibold mt-1">Wholesale: ${parseFloat(comp.wholesale_price).toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Shipment Ship table */}
      <section className="bg-white rounded-2xl border border-brand-200/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-brand-200/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold font-display text-brand-dark">Pending Wholesale Shipments</h3>
            <p className="text-xs text-brand-dark/50 font-semibold">Manage outgoing bulk orders for partners</p>
          </div>
          <div className="flex gap-2">
            <button className="bg-brand-100 hover:bg-brand-200 px-4 py-2 rounded-xl text-xs font-bold text-brand-800 transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">filter_list</span> Filter
            </button>
            <button className="bg-brand-800 hover:bg-brand-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">file_download</span> Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="bg-brand-100/50 text-brand-dark/60 font-semibold border-b border-brand-200/30">
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-200/20 text-brand-dark/80">
              {shipments.map((ship) => (
                <tr key={ship.id} className="hover:bg-brand-50/40 transition-colors">
                  <td className="p-4 font-bold text-brand-800">{ship.id}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded bg-brand-200 text-brand-800 flex items-center justify-center font-bold text-[10px]">
                        {ship.logoLetters}
                      </div>
                      <span className="font-semibold text-brand-dark">{ship.companyName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-brand-dark/60">{ship.items}</td>
                  <td className="p-4 text-brand-dark/60">{ship.date}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      ship.status === 'Shipped' 
                        ? 'bg-green-100 text-green-800' 
                        : ship.status === 'Ready to Ship' 
                          ? 'bg-brand-200 text-brand-800' 
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {ship.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {ship.status !== 'Shipped' ? (
                      <button 
                        onClick={() => handleShipNow(ship.id)}
                        className="bg-brand-800 hover:bg-brand-900 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-800/10"
                      >
                        Ship Now
                      </button>
                    ) : (
                      <span className="text-green-600 font-bold text-xs flex items-center justify-end gap-1">
                        <span className="material-symbols-outlined text-sm">done</span> Dispatched
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-brand-100/30 flex justify-between items-center text-brand-dark/50 text-[10px] font-semibold border-t border-brand-200/10">
          <span>Showing 1-{shipments.length} of 24 pending shipments</span>
          <div className="flex gap-2">
            <button className="p-1 hover:text-brand-800 transition-colors"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
            <button className="p-1 hover:text-brand-800 transition-colors"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
          </div>
        </div>
      </section>
    </main>
  );
}
