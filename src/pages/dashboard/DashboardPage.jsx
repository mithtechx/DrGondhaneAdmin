import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, FileText, TrendingUp, ShoppingCart, AlertTriangle, ArrowRight } from 'lucide-react';

export default function DashboardPage({ setActiveTab }) {
  const [stats, setStats] = useState({ medicinesCount: 0, todayRevenue: 0, lowStock: 0 });

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    const { data: meds } = await supabase.from('medicines').select('stock');
    
    // Get today's date string (YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: bills } = await supabase
      .from('bills')
      .select('total_amount, created_at')
      .gte('created_at', `${todayStr}T00:00:00`)
      .lte('created_at', `${todayStr}T23:59:59`);

    const todayRev = bills ? bills.reduce((sum, b) => sum + Number(b.total_amount), 0) : 0;
    const lowStockItems = meds ? meds.filter(m => (m.stock || 0) <= 5).length : 0;

    setStats({
      medicinesCount: meds ? meds.length : 0,
      todayRevenue: todayRev,
      lowStock: lowStockItems
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="bg-emerald-700 text-emerald-100 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider">Doctor Control Hub</span>
          <h2 className="text-2xl sm:text-3xl font-black mt-2">Welcome, Dr. Gondhane</h2>
          <p className="text-xs sm:text-sm text-emerald-100 mt-1">Manage inventory, fast-track prescriptions, and monitor daily revenue effortlessly.</p>
        </div>
        <button 
          onClick={() => setActiveTab('billing')} 
          className="px-5 py-3 bg-white text-emerald-900 font-bold rounded-2xl text-xs flex items-center gap-2 hover:bg-emerald-50 transition shadow-sm"
        >
          <ShoppingCart size={16}/> Open Billing Counter <ArrowRight size={14}/>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Medicines</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{stats.medicinesCount}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Active items in stock catalog</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-700">
            <Package size={28}/>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</p>
            <h3 className="text-3xl font-black text-emerald-700 mt-2">₹{stats.todayRevenue}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Total collection for today</p>
          </div>
          <div className="bg-teal-50 p-4 rounded-2xl text-teal-700">
            <TrendingUp size={28}/>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock Refills</p>
            <h3 className={`text-3xl font-black mt-2 ${stats.lowStock > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{stats.lowStock}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Items with 5 or less units</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl text-rose-600">
            <AlertTriangle size={28}/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <div onClick={() => setActiveTab('billing')} className="bg-white border border-slate-200/80 p-6 rounded-3xl cursor-pointer hover:border-emerald-500 transition shadow-sm group">
          <div className="bg-emerald-50 text-emerald-700 w-10 h-10 rounded-xl flex items-center justify-center mb-4"><ShoppingCart size={20}/></div>
          <h4 className="text-base font-bold text-slate-900">Create Patient Bill</h4>
          <p className="text-xs text-slate-500 mt-1">Fast checkout counter with automated stock deduction & WhatsApp.</p>
        </div>

        <div onClick={() => setActiveTab('inventory')} className="bg-white border border-slate-200/80 p-6 rounded-3xl cursor-pointer hover:border-emerald-500 transition shadow-sm group">
          <div className="bg-blue-50 text-blue-700 w-10 h-10 rounded-xl flex items-center justify-center mb-4"><Package size={20}/></div>
          <h4 className="text-base font-bold text-slate-900">Manage Inventory</h4>
          <p className="text-xs text-slate-500 mt-1">Add new medicines, update batch details, pricing & stock levels.</p>
        </div>

        <div onClick={() => setActiveTab('reports')} className="bg-white border border-slate-200/80 p-6 rounded-3xl cursor-pointer hover:border-emerald-500 transition shadow-sm group">
          <div className="bg-purple-50 text-purple-700 w-10 h-10 rounded-xl flex items-center justify-center mb-4"><TrendingUp size={20}/></div>
          <h4 className="text-base font-bold text-slate-900">Sales Track & Analytics</h4>
          <p className="text-xs text-slate-500 mt-1">Filter revenue reports by day-wise, month-wise, or custom range.</p>
        </div>
      </div>
    </div>
  );
}