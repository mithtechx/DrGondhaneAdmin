
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

import { supabase } from '../../lib/supabase';

import {
  CalendarDays,
  CalendarRange,
  TrendingUp,
  Receipt,
  IndianRupee,
  RefreshCw,
  Loader2,
  AlertCircle,
  Filter,
  FileText
} from 'lucide-react';


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  if (!value) return null;

  const parts = value.split('-').map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  if (
    date.getFullYear() !== parts[0] ||
    date.getMonth() !== parts[1] - 1 ||
    date.getDate() !== parts[2]
  ) {
    return null;
  }

  return date;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getRange(period, anchorDate, customStart, customEnd) {
  const selectedDate = parseLocalDate(anchorDate);

  if (!selectedDate && period !== 'custom') {
    return {
      error: 'Please select a valid date.'
    };
  }

  let start;
  let end;

  if (period === 'day') {
    start = new Date(selectedDate);
    end = new Date(selectedDate);
    end.setDate(end.getDate() + 1);
  }

  if (period === 'week') {
    start = new Date(selectedDate);

    const day = start.getDay();
    const difference = day === 0 ? 6 : day - 1;

    start.setDate(start.getDate() - difference);

    end = new Date(start);
    end.setDate(end.getDate() + 7);
  }

  if (period === 'month') {
    start = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1
    );

    end = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + 1,
      1
    );
  }

  if (period === 'year') {
    start = new Date(selectedDate.getFullYear(), 0, 1);
    end = new Date(selectedDate.getFullYear() + 1, 0, 1);
  }

  if (period === 'custom') {
    const customStartDate = parseLocalDate(customStart);
    const customEndDate = parseLocalDate(customEnd);

    if (!customStartDate || !customEndDate) {
      return {
        error: 'Please select both starting and ending dates.'
      };
    }

    if (customStartDate > customEndDate) {
      return {
        error: 'Starting date cannot be after ending date.'
      };
    }

    start = customStartDate;
    end = new Date(customEndDate);
    end.setDate(end.getDate() + 1);
  }

  return {
    start,
    end,
    error: ''
  };
}


// --------------------------------------------------
// REUSABLE SUMMARY CARD
// --------------------------------------------------

function SummaryCard({ title, value, description, icon: Icon }) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">

      <div className="flex items-center justify-between gap-3">

        <div className="min-w-0">

          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 break-words">
            {value}
          </h3>

          <p className="text-[11px] text-slate-400 mt-1">
            {description}
          </p>

        </div>

        <div className="w-11 h-11 shrink-0 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center">
          <Icon size={21} />
        </div>

      </div>

    </div>
  );
}


// --------------------------------------------------
// MAIN SALES TRACK PAGE
// --------------------------------------------------

export default function SalesTrackPage() {

  const today = getLocalDateKey(new Date());

  const [period, setPeriod] = useState('day');
  const [anchorDate, setAnchorDate] = useState(today);

  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const [bills, setBills] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [lastUpdated, setLastUpdated] = useState(null);


  // --------------------------------------------------
  // CALCULATE SELECTED DATE RANGE
  // --------------------------------------------------

  const range = useMemo(() => {
    return getRange(
      period,
      anchorDate,
      customStart,
      customEnd
    );
  }, [period, anchorDate, customStart, customEnd]);


  // --------------------------------------------------
  // FETCH SALES FROM SUPABASE
  // --------------------------------------------------

  const fetchSales = useCallback(async () => {

    if (range.error) {
      setError(range.error);
      setBills([]);
      return;
    }

    if (!range.start || !range.end) return;

    setLoading(true);
    setError('');

    try {

      const {
        data,
        error: fetchError
      } = await supabase
        .from('bills')
        .select('*')
        .gte('created_at', range.start.toISOString())
        .lt('created_at', range.end.toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setBills(data || []);
      setLastUpdated(new Date());

    } catch (err) {

      setBills([]);

      setError(
        err.message || 'Unable to load sales records.'
      );

    } finally {
      setLoading(false);
    }

  }, [range]);


  useEffect(() => {
    fetchSales();
  }, [fetchSales]);


  // --------------------------------------------------
  // CALCULATE SUMMARY
  // --------------------------------------------------

  const totalSales = useMemo(() => {
    return bills.reduce(
      (sum, bill) => sum + Number(bill.total_amount || 0),
      0
    );
  }, [bills]);


  const totalBills = bills.length;

  const averageBill = totalBills > 0
    ? totalSales / totalBills
    : 0;


  // --------------------------------------------------
  // DATE-WISE BREAKDOWN
  // --------------------------------------------------

  const dailySummary = useMemo(() => {

    const grouped = {};

    bills.forEach(bill => {

      const key = getLocalDateKey(new Date(bill.created_at));

      if (!grouped[key]) {
        grouped[key] = {
          date: key,
          bills: 0,
          sales: 0
        };
      }

      grouped[key].bills += 1;

      grouped[key].sales += Number(
        bill.total_amount || 0
      );

    });

    return Object.values(grouped).sort(
      (a, b) => b.date.localeCompare(a.date)
    );

  }, [bills]);


  // --------------------------------------------------
  // REPORT HEADING
  // --------------------------------------------------

  const rangeTitle = useMemo(() => {

    if (range.error || !range.start || !range.end) {
      return 'Select a reporting period';
    }

    const lastIncludedDate = new Date(range.end);
    lastIncludedDate.setDate(lastIncludedDate.getDate() - 1);

    if (period === 'day') {
      return formatDate(range.start);
    }

    if (period === 'week') {
      return `${formatDate(range.start)} – ${formatDate(lastIncludedDate)}`;
    }

    if (period === 'month') {
      return range.start.toLocaleDateString('en-IN', {
        month: 'long',
        year: 'numeric'
      });
    }

    if (period === 'year') {
      return String(range.start.getFullYear());
    }

    return `${formatDate(range.start)} – ${formatDate(lastIncludedDate)}`;

  }, [period, range]);


  // --------------------------------------------------
  // PERIOD CHANGE
  // --------------------------------------------------

  function handlePeriodChange(value) {
    setPeriod(value);
    setError('');
  }


  // --------------------------------------------------
  // DOWNLOAD CSV REPORT
  // --------------------------------------------------

  function downloadCSV() {

    if (bills.length === 0) return;

    const headers = [
      'Bill ID',
      'Date',
      'Patient Name',
      'Total Amount'
    ];

    const escapeCSV = value => {
      const string = String(value ?? '');
      return `"${string.replace(/"/g, '""')}"`;
    };

    const rows = bills.map(bill => [
      bill.id ?? '',
      bill.created_at ?? '',
      bill.patient_name ?? '',
      bill.total_amount ?? 0
    ]);

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob(
      ['\uFEFF' + csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = `clinic-sales-${getLocalDateKey(new Date())}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }


  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (

    <div className="space-y-6">

      {/* PAGE HEADER */}

      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>

            <div className="flex items-center gap-2 text-emerald-700">

              <TrendingUp size={19} />

              <span className="text-[10px] font-black uppercase tracking-wider">
                Clinic Reports
              </span>

            </div>

            <h2 className="text-2xl font-black text-slate-900 mt-2">
              Sales Track & Analytics
            </h2>

            <p className="text-xs text-slate-400 mt-1">
              View and analyse sales across different time periods.
            </p>

          </div>


          <button
            onClick={fetchSales}
            disabled={loading || Boolean(range.error)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-bold text-slate-700 disabled:opacity-50"
          >

            <RefreshCw
              size={15}
              className={loading ? 'animate-spin' : ''}
            />

            Refresh Report

          </button>

        </div>

      </div>


      {/* FILTER SECTION */}

      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">

        <div className="flex items-center gap-2">

          <Filter size={18} className="text-emerald-700" />

          <h3 className="font-black text-slate-900">
            Filter Sales Report
          </h3>

        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* PERIOD SELECTOR */}

          <div className="space-y-2">

            <label className="text-xs font-bold text-slate-500">
              Select Report Type
            </label>

            <select
              value={period}
              onChange={e => handlePeriodChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600"
            >

              <option value="day">Daily Report</option>
              <option value="week">Weekly Report</option>
              <option value="month">Monthly Report</option>
              <option value="year">Yearly Report</option>
              <option value="custom">Custom Date Range</option>

            </select>

          </div>


          {/* SINGLE DATE SELECTOR */}

          {period !== 'custom' && (

            <div className="space-y-2">

              <label className="text-xs font-bold text-slate-500">
                {period === 'day'
                  ? 'Select Date'
                  : 'Choose a Reference Date'}
              </label>

              <div className="relative">

                <CalendarDays
                  size={17}
                  className="absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  type="date"
                  value={anchorDate}
                  onChange={e => setAnchorDate(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600"
                />

              </div>

              <p className="text-[10px] text-slate-400">
                {period === 'week'
                  ? 'The complete Monday–Sunday week containing this date will be shown.'
                  : period === 'month'
                    ? 'The entire month containing this date will be shown.'
                    : period === 'year'
                      ? 'The entire year containing this date will be shown.'
                      : 'Sales will be shown only for this date.'}
              </p>

            </div>

          )}


          {/* CUSTOM DATE RANGE */}

          {period === 'custom' && (

            <>

              <div className="space-y-2">

                <label className="text-xs font-bold text-slate-500">
                  Starting Date
                </label>

                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600"
                />

              </div>


              <div className="space-y-2">

                <label className="text-xs font-bold text-slate-500">
                  Ending Date
                </label>

                <input
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600"
                />

              </div>

            </>

          )}

        </div>


        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">

          <div>

            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
              Selected Reporting Period
            </p>

            <p className="text-sm font-black text-emerald-700 mt-1">
              {rangeTitle}
            </p>

          </div>

          <button
            onClick={fetchSales}
            disabled={loading || Boolean(range.error)}
            className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-black transition"
          >
            Apply Filter
          </button>

        </div>

      </div>


      {/* ERROR MESSAGE */}

      {error && (

        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">

          <AlertCircle size={18} className="text-rose-600 shrink-0" />

          <p className="text-xs font-semibold text-rose-700">
            {error}
          </p>

        </div>

      )}


      {/* SUMMARY CARDS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <SummaryCard
          title="Total Sales"
          value={formatCurrency(totalSales)}
          description="For selected period"
          icon={IndianRupee}
        />

        <SummaryCard
          title="Total Bills"
          value={totalBills.toLocaleString('en-IN')}
          description="Bills created in selected period"
          icon={Receipt}
        />

        <SummaryCard
          title="Average Bill Value"
          value={formatCurrency(averageBill)}
          description="Average sales per bill"
          icon={TrendingUp}
        />

      </div>


      {/* LOADING */}

      {loading && (

        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">

          <Loader2
            size={30}
            className="animate-spin text-emerald-700 mx-auto"
          />

          <p className="text-xs text-slate-400 font-semibold mt-3">
            Loading sales records...
          </p>

        </div>

      )}


      {!loading && !error && (

        <>

          {/* DATE-WISE BREAKDOWN */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

            <div className="p-5 sm:p-6 border-b border-slate-100">

              <div className="flex items-center gap-2">

                <CalendarRange
                  size={19}
                  className="text-emerald-700"
                />

                <div>

                  <h3 className="font-black text-slate-900">
                    Date-wise Sales Breakdown
                  </h3>

                  <p className="text-[11px] text-slate-400 mt-1">
                    Daily sales and bill count within the selected period.
                  </p>

                </div>

              </div>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead>

                  <tr className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">

                    <th className="p-4">Date</th>
                    <th className="p-4 text-center">Bills</th>
                    <th className="p-4 text-right">Total Sales</th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-slate-100">

                  {dailySummary.length === 0 ? (

                    <tr>

                      <td
                        colSpan="3"
                        className="text-center py-10 text-slate-400 text-xs"
                      >
                        No sales recorded for this period.
                      </td>

                    </tr>

                  ) : (

                    dailySummary.map(day => (

                      <tr
                        key={day.date}
                        className="hover:bg-slate-50 transition"
                      >

                        <td className="p-4 font-bold text-slate-700 whitespace-nowrap">
                          {formatDate(day.date)}
                        </td>

                        <td className="p-4 text-center font-semibold text-slate-600">
                          {day.bills}
                        </td>

                        <td className="p-4 text-right font-black text-emerald-700 whitespace-nowrap">
                          {formatCurrency(day.sales)}
                        </td>

                      </tr>

                    ))

                  )}

                </tbody>


                {dailySummary.length > 0 && (

                  <tfoot>

                    <tr className="bg-emerald-50 border-t border-emerald-100">

                      <td className="p-4 font-black text-slate-900">
                        Total
                      </td>

                      <td className="p-4 text-center font-black text-slate-900">
                        {totalBills}
                      </td>

                      <td className="p-4 text-right font-black text-emerald-800 whitespace-nowrap">
                        {formatCurrency(totalSales)}
                      </td>

                    </tr>

                  </tfoot>

                )}

              </table>

            </div>

          </div>


          {/* INDIVIDUAL BILL RECORDS */}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <FileText
                  size={19}
                  className="text-emerald-700"
                />

                <div>

                  <h3 className="font-black text-slate-900">
                    Individual Sales Records
                  </h3>

                  <p className="text-[11px] text-slate-400 mt-1">
                    Every bill recorded during the selected period.
                  </p>

                </div>

              </div>


              <button
                onClick={downloadCSV}
                disabled={bills.length === 0}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 text-emerald-800 rounded-xl text-xs font-bold"
              >
                Export CSV
              </button>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead>

                  <tr className="bg-slate-50 text-xs uppercase text-slate-400 border-b border-slate-100">

                    <th className="p-4">Bill ID</th>
                    <th className="p-4">Patient</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4 text-right">Amount</th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-slate-100">

                  {bills.length === 0 ? (

                    <tr>

                      <td
                        colSpan="4"
                        className="text-center py-10 text-slate-400 text-xs"
                      >
                        No bills found for this period.
                      </td>

                    </tr>

                  ) : (

                    bills.map((bill, index) => (

                      <tr
                        key={bill.id ?? `${bill.created_at}-${index}`}
                        className="hover:bg-slate-50 transition"
                      >

                        <td className="p-4 text-xs font-bold text-slate-500">
                          {bill.id
                            ? String(bill.id).slice(0, 8).toUpperCase()
                            : `Record ${index + 1}`}
                        </td>

                        <td className="p-4 font-semibold text-slate-800">
                          {bill.patient_name || 'Walk-in'}
                        </td>

                        <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                          {formatDateTime(bill.created_at)}
                        </td>

                        <td className="p-4 text-right font-black text-emerald-700 whitespace-nowrap">
                          {formatCurrency(bill.total_amount)}
                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

          </div>

          <div className="text-right text-[10px] text-slate-400">
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleTimeString('en-IN')}`
              : ''}
          </div>

        </>

      )}

    </div>
  );
}
