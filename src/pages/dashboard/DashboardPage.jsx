
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Package,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  RotateCcw,
  IndianRupee,
  Activity,
  FileText,
  AlertCircle
} from 'lucide-react';

const getTodayRange = () => {
  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  );

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
};

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const StatCard = ({ card, loading }) => {
  const Icon = card.icon;

  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700'
  };

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:rounded-3xl sm:p-6">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
          {card.title}
        </p>

        <h3 className="mt-2 break-words text-2xl font-black text-slate-900 sm:text-3xl">
          {loading ? '...' : card.value}
        </h3>

        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          {card.subtitle}
        </p>
      </div>

      <div className={`shrink-0 rounded-2xl p-3 sm:p-4 ${colors[card.color]}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export default function DashboardPage({ setActiveTab }) {
  const [stats, setStats] = useState({
    medicinesCount: 0,
    todayRevenue: 0,
    lowStock: 0,
    outOfStock: 0,
    todayReturns: 0,
    todayReturnQuantity: 0,
    todayReturnValue: 0,
    todayBills: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [returnTableWarning, setReturnTableWarning] = useState('');

  const fetchDashboardStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');
    setReturnTableWarning('');

    try {
      const { start, end } = getTodayRange();

      const [
        medicinesResult,
        billsResult,
        returnsResult
      ] = await Promise.all([
        supabase
          .from('medicines')
          .select('stock'),

        supabase
          .from('bills')
          .select('total_amount, created_at')
          .gte('created_at', start)
          .lt('created_at', end),

        supabase
          .from('medicine_returns')
          .select('quantity, total_amount, created_at')
          .gte('created_at', start)
          .lt('created_at', end)
      ]);

      // Medicines and bills are required for the main dashboard.
      if (medicinesResult.error) {
        throw new Error(
          `Medicines: ${medicinesResult.error.message}`
        );
      }

      if (billsResult.error) {
        throw new Error(
          `Bills: ${billsResult.error.message}`
        );
      }

      const medicines = medicinesResult.data || [];
      const bills = billsResult.data || [];

      // Returns are optional until the returns feature is configured.
      let returns = [];

      if (returnsResult.error) {
        console.warn(
          'Medicine returns summary unavailable:',
          returnsResult.error
        );

        setReturnTableWarning(
          'Today’s returns summary is unavailable. Please check that the medicine_returns table and its required columns exist, and that your Supabase permissions allow reading them.'
        );
      } else {
        returns = returnsResult.data || [];
      }

      const todayRevenue = bills.reduce(
        (sum, bill) =>
          sum + Number(bill.total_amount || 0),
        0
      );

      const lowStock = medicines.filter((medicine) => {
        const stock = Number(medicine.stock || 0);
        return stock > 0 && stock <= 5;
      }).length;

      const outOfStock = medicines.filter(
        (medicine) => Number(medicine.stock || 0) <= 0
      ).length;

      const todayReturnQuantity = returns.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0),
        0
      );

      const todayReturnValue = returns.reduce(
        (sum, item) =>
          sum + Number(item.total_amount || 0),
        0
      );

      setStats({
        medicinesCount: medicines.length,
        todayRevenue,
        lowStock,
        outOfStock,
        todayReturns: returns.length,
        todayReturnQuantity,
        todayReturnValue,
        todayBills: bills.length
      });

    } catch (err) {
      console.error('Dashboard error:', err);
      setError(err.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const openTab = (tab) => {
    if (typeof setActiveTab === 'function') {
      setActiveTab(tab);
    }
  };

  const quickActions = [
    {
      title: 'Create Patient Bill',
      description: 'Generate bills and manage medicine sales.',
      icon: ShoppingCart,
      color: 'emerald',
      tab: 'billing'
    },
    {
      title: 'Manage Inventory',
      description: 'Add medicines and manage available stock.',
      icon: Package,
      color: 'blue',
      tab: 'inventory'
    },
    {
      title: 'Sales Track & Analytics',
      description: 'View sales, transactions and revenue reports.',
      icon: TrendingUp,
      color: 'purple',
      tab: 'reports'
    },
    {
      title: 'Medicine Returns',
      description: 'Record returned medicines and update stock.',
      icon: RotateCcw,
      color: 'amber',
      tab: 'returns'
    }
  ];

  const summaryCards = [
    {
      title: 'Total Medicines',
      value: stats.medicinesCount,
      subtitle: 'Items in medicine catalog',
      icon: Package,
      color: 'emerald'
    },
    {
      title: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue),
      subtitle: `${stats.todayBills} bills generated today`,
      icon: TrendingUp,
      color: 'blue'
    },
    {
      title: 'Low Stock Refills',
      value: stats.lowStock,
      subtitle: 'Medicines with 1–5 units',
      icon: AlertTriangle,
      color: 'amber'
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStock,
      subtitle: 'Medicines requiring restocking',
      icon: Package,
      color: 'rose'
    }
  ];

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">

      {/* WELCOME HEADER */}

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-800 to-teal-900 p-5 text-white shadow-md sm:rounded-3xl sm:p-8">

        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-emerald-700 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">
              Doctor Control Hub
            </span>

            <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              Welcome, Dr. Gondhane
            </h2>

            <p className="mt-2 max-w-xl text-xs leading-relaxed text-emerald-100 sm:text-sm">
              Manage clinic inventory, patient billing,
              medicine returns and daily financial reports
              from one centralized dashboard.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">

            <button
              type="button"
              onClick={() => fetchDashboardStats(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={refreshing ? 'animate-spin' : ''}
              />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              type="button"
              onClick={() => openTab('billing')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
            >
              <ShoppingCart size={16} />
              Open Billing
              <ArrowRight size={14} />
            </button>

          </div>
        </div>
      </section>

      {/* MAIN ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />

          <div className="min-w-0">
            <p className="font-bold">Dashboard data could not be loaded</p>
            <p className="mt-1 break-words text-xs">{error}</p>

            <button
              type="button"
              onClick={() => fetchDashboardStats(true)}
              className="mt-2 text-xs font-bold underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* MAIN STATISTICS */}

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 sm:text-lg">
              Clinic Overview
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Your important clinic statistics
            </p>
          </div>

          <Activity size={20} className="text-emerald-700" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            [1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 sm:rounded-3xl"
              />
            ))
          ) : (
            summaryCards.map((card) => (
              <StatCard
                key={card.title}
                card={card}
                loading={loading}
              />
            ))
          )}
        </div>
      </section>

      {/* TODAY'S RETURNS */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6">

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-2xl bg-amber-50 p-3 text-amber-700">
              <RotateCcw size={22} />
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 sm:text-base">
                Today's Medicine Returns
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Summary of returned medicines today
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openTab('returns')}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 transition hover:bg-amber-100 sm:w-auto"
          >
            View Returns
            <ArrowRight size={14} />
          </button>
        </div>

        {returnTableWarning && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>{returnTableWarning}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <FileText size={16} />
              <span className="text-xs font-bold">
                Return Transactions
              </span>
            </div>

            <h3 className="mt-3 text-2xl font-black text-slate-900">
              {loading ? '...' : stats.todayReturns}
            </h3>

            <p className="mt-1 text-[10px] text-slate-400">
              Recorded return entries
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <Package size={16} />
              <span className="text-xs font-bold">
                Units Returned
              </span>
            </div>

            <h3 className="mt-3 text-2xl font-black text-emerald-800">
              {loading ? '...' : stats.todayReturnQuantity}
            </h3>

            <p className="mt-1 text-[10px] text-emerald-700/70">
              Total quantity recorded
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-700">
              <IndianRupee size={16} />
              <span className="text-xs font-bold">
                Return Value
              </span>
            </div>

            <h3 className="mt-3 break-words text-xl font-black text-amber-800 sm:text-2xl">
              {loading ? '...' : formatCurrency(stats.todayReturnValue)}
            </h3>

            <p className="mt-1 text-[10px] text-amber-700/70">
              Recorded value of returned items
            </p>
          </div>

        </div>

        <p className="mt-4 text-[10px] leading-relaxed text-slate-400">
          Return value represents the recorded value of returned medicines.
          It does not necessarily represent the amount refunded to customers.
        </p>

      </section>

      {/* QUICK ACTIONS */}

      <section className="space-y-4">

        <div>
          <h3 className="text-base font-black text-slate-900 sm:text-lg">
            Quick Actions
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Quickly access important clinic operations
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">

          {quickActions.map((action) => {
            const Icon = action.icon;

            const colors = {
              emerald: 'bg-emerald-50 text-emerald-700',
              blue: 'bg-blue-50 text-blue-700',
              purple: 'bg-purple-50 text-purple-700',
              amber: 'bg-amber-50 text-amber-700'
            };

            return (
              <button
                key={action.tab}
                type="button"
                onClick={() => openTab(action.tab)}
                className="group flex min-w-0 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:block sm:rounded-3xl sm:p-5"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:mb-4 ${colors[action.color]}`}>
                  <Icon size={21} />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-slate-900">
                    {action.title}
                  </h4>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {action.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center justify-center self-center sm:mt-4 sm:justify-end">
                  <ArrowRight
                    size={17}
                    className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-emerald-700"
                  />
                </div>
              </button>
            );
          })}

        </div>
      </section>

      {/* FOOTER */}

      <footer className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-3xl">

        <div>
          <p className="text-xs font-bold text-slate-700">
            Dr. Gondhane Skin Care Clinic
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            Clinic Management System
          </p>
        </div>

        <span className="w-fit rounded-xl bg-emerald-100 px-3 py-2 text-[10px] font-bold text-emerald-700">
          Powered by MithTechX
        </span>

      </footer>

    </div>
  );
}
