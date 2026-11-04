import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, FileText, PackageCheck, Clock, User } from 'lucide-react';

export default function SalesTrackPage() {
  const [bills, setBills] = useState([]);
  const [todayItems, setTodayItems] = useState([]);
  const [filterPeriod, setFilterPeriod] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  async function fetchData() {
    // 1. Fetch all bills for general sales track
    const { data: billsData } = await supabase.from('bills').select('*, bill_items(*, medicines(name))').order('created_at', { ascending: false });
    if (billsData) setBills(billsData);

    // 2. Fetch specific item-level stock sold for the selected date (defaults to today)
    const { data: itemsData } = await supabase
      .from('bill_items')
      .select('*, bills!inner(created_at, patient_name), medicines(name)')
      .gte('bills.created_at', `${selectedDate}T00:00:00`)
      .lte('bills.created_at', `${selectedDate}T23:59:59`)
      .order('bills(created_at)', { ascending: false });

    if (itemsData) setTodayItems(itemsData);
  }

  const filteredSalesBills = bills.filter(bill => {
    const billDate = new Date(bill.created_at);
    const billDateString = billDate.toISOString().split('T')[0];
    const billMonthString = billDate.toISOString().slice(0, 7);
    const billYearString = billDate.getFullYear().toString();

    if (filterPeriod === 'day') return billDateString === selectedDate;
    if (filterPeriod === 'month') return billMonthString === selectedMonth;
    if (filterPeriod === 'year') return billYearString === selectedYear;
    if (filterPeriod === 'custom' && customStart && customEnd) {
      return billDate >= new Date(customStart) && billDate <= new Date(customEnd + 'T23:59:59');
    }
    return true;
  });

  const filteredRevenue = filteredSalesBills.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const totalItemsSoldTodayCount = todayItems.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <div className="space-y-6">
      {/* Filter Control Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <TrendingUp size={18} className="text-emerald-700"/> Sales Track & Analytics
          </div>
          
          <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl">
            {[
              { id: 'day', label: 'Day-Wise' },
              { id: 'month', label: 'Month-Wise' },
              { id: 'year', label: 'Year-Wise' },
              { id: 'custom', label: 'Custom' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setFilterPeriod(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${filterPeriod === tab.id ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Range:</span>
          
          {filterPeriod === 'day' && (
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none"/>
          )}

          {filterPeriod === 'month' && (
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none"/>
          )}

          {filterPeriod === 'year' && (
            <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none">
              {['2024', '2025', '2026', '2027'].map(yr => <option key={yr} value={yr}>{yr}</option>)}
            </select>
          )}

          {filterPeriod === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none"/>
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none"/>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bills Generated</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{filteredSalesBills.length}</h3>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-700"><FileText size={28}/></div>
        </div>

        <div className="bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stock Units Sold ({selectedDate})</p>
            <h3 className="text-3xl font-black text-teal-700 mt-2">{totalItemsSoldTodayCount}</h3>
          </div>
          <div className="bg-teal-50 p-4 rounded-2xl text-teal-700"><PackageCheck size={28}/></div>
        </div>

        <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-6 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Filtered Revenue</p>
            <h3 className="text-3xl font-black mt-2">₹{filteredRevenue}</h3>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl"><TrendingUp size={28} className="text-emerald-200"/></div>
        </div>
      </div>

      {/* STOCK SOLD TODAY (ITEMIZED LIST) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="bg-teal-50 p-2 rounded-xl text-teal-700"><PackageCheck size={20}/></div>
            <div>
              <h4 className="font-black text-slate-900 text-sm">Stock Sold Breakdown ({selectedDate})</h4>
              <p className="text-xs text-slate-400">All individual items and quantities sold on this date</p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl">{todayItems.length} line items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 sm:p-5">Time</th>
                <th className="p-4 sm:p-5">Patient Name</th>
                <th className="p-4 sm:p-5">Medicine / Item Sold</th>
                <th className="p-4 sm:p-5">Quantity Sold</th>
                <th className="p-4 sm:p-5">Unit Price</th>
                <th className="p-4 sm:p-5 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {todayItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-slate-400 text-xs">No stock items sold on {selectedDate}.</td>
                </tr>
              ) : (
                todayItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/65 transition">
                    <td className="p-4 sm:p-5 text-slate-500 text-xs flex items-center gap-1.5 pt-5">
                      <Clock size={14}/> {new Date(item.bills.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-slate-900">
                      <span className="flex items-center gap-1.5"><User size={14} className="text-slate-400"/> {item.bills.patient_name}</span>
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-emerald-900">{item.medicines?.name || 'Unknown Item'}</td>
                    <td className="p-4 sm:p-5">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-extrabold">{item.quantity} units</span>
                    </td>
                    <td className="p-4 sm:p-5 text-slate-600">₹{item.price}</td>
                    <td className="p-4 sm:p-5 text-right font-black text-emerald-700">₹{item.quantity * item.price}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Summary Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center">
          <h4 className="font-bold text-sm text-slate-900">Transactions Summary ({filteredSalesBills.length})</h4>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl">Total: ₹{filteredRevenue}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 sm:p-5">Date & Time</th>
                <th className="p-4 sm:p-5">Patient Name</th>
                <th className="p-4 sm:p-5">Phone</th>
                <th className="p-4 sm:p-5">Locality</th>
                <th className="p-4 sm:p-5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredSalesBills.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-8 text-slate-400 text-xs">No bills found for the selected period.</td></tr>
              ) : (
                filteredSalesBills.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4 sm:p-5 text-slate-500 text-xs">{new Date(b.created_at).toLocaleString()}</td>
                    <td className="p-4 sm:p-5 font-bold text-slate-900">{b.patient_name}</td>
                    <td className="p-4 sm:p-5 text-slate-600 text-xs">{b.patient_phone}</td>
                    <td className="p-4 sm:p-5 text-slate-600">{b.locality}</td>
                    <td className="p-4 sm:p-5 text-right font-black text-emerald-700">₹{b.total_amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}