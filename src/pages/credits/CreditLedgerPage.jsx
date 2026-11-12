import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, PhoneCall, Check, Search, Calendar } from 'lucide-react';

export default function CreditLedgerPage({ credits, onRefresh }) {
  const [creditFilter, setCreditFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredCredits = credits.filter(cr => {
    const crDate = cr.created_at ? cr.created_at.split('T')[0] : '';
    if (creditFilter === 'today') {
      return crDate === todayStr;
    } else if (creditFilter === 'week') {
      const d = new Date(crDate);
      const now = new Date();
      const diffTime = Math.abs(now - d);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    } else if (creditFilter === 'month') {
      return crDate.startsWith(todayStr.slice(0, 7));
    } else if (creditFilter === 'year') {
      return crDate.startsWith(todayStr.slice(0, 4));
    } else if (creditFilter === 'custom') {
      if (startDate && endDate) {
        return crDate >= startDate && crDate <= endDate;
      }
    }
    return true;
  });

  const todaysTotalCredit = credits
    .filter(c => (c.created_at || '').split('T')[0] === todayStr && c.status === 'Pending')
    .reduce((sum, c) => sum + Number(c.credit_amount || 0), 0);

  const totalPendingAll = credits
    .filter(c => c.status === 'Pending')
    .reduce((sum, c) => sum + Number(c.credit_amount || 0), 0);

  async function settleCreditDirectly(creditId) {
    const { error } = await supabase.from('credits').update({ status: 'Settled', credit_amount: 0 }).eq('id', creditId);
    if (error) {
      alert('Error settling credit: ' + error.message);
    } else {
      if (onRefresh) onRefresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Total Pending Credit</span>
          <div className="text-3xl font-black text-amber-600">₹{todaysTotalCredit.toFixed(2)}</div>
          <p className="text-[11px] text-slate-400 font-medium">New credit added today</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pending Due (All Time)</span>
          <div className="text-3xl font-black text-rose-600">₹{totalPendingAll.toFixed(2)}</div>
          <p className="text-[11px] text-slate-400 font-medium">{credits.filter(c => c.status === 'Pending').length} Pending Accounts</p>
        </div>
      </div>

      {/* Filter & Sort Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'year', label: 'This Year' },
            { id: 'custom', label: 'Custom Range' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setCreditFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${creditFilter === f.id ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {creditFilter === 'custom' && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500"
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-slate-900">Customer Credit Ledger (Udhar Khata)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Showing {filteredCredits.length} filtered credit records.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-slate-400 text-xs uppercase border-b border-slate-200">
                <th className="p-4">Date</th>
                <th className="p-4">Patient Name</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Bill Total</th>
                <th className="p-4">Paid</th>
                <th className="p-4">Due Credit</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCredits.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-slate-400 text-xs">No credit records found for this filter.</td></tr>
              ) : (
                filteredCredits.map(cr => (
                  <tr key={cr.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 text-slate-500 text-xs">{new Date(cr.created_at).toLocaleDateString()}</td>
                    <td className="p-4 font-bold text-slate-900">{cr.patient_name}</td>
                    <td className="p-4 font-mono text-slate-700 text-xs">{cr.patient_phone}</td>
                    <td className="p-4 font-bold">₹{cr.total_bill_amount}</td>
                    <td className="p-4 text-emerald-700">₹{cr.paid_amount}</td>
                    <td className="p-4 text-rose-600 font-black">₹{cr.credit_amount}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${cr.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {cr.status}
                      </span>
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <a href={`tel:${cr.patient_phone}`} className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition" title="Call Customer">
                        <PhoneCall size={14}/>
                      </a>
                      {cr.status === 'Pending' && (
                        <button onClick={() => settleCreditDirectly(cr.id)} className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition flex items-center gap-1">
                          <Check size={14}/> Settle
                        </button>
                      )}
                    </td>
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