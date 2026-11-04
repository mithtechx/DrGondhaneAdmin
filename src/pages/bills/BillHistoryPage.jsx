import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Eye, Send, Printer, X } from 'lucide-react';

export default function BillHistoryPage() {
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    fetchBills();
  }, []);

  async function fetchBills() {
    const { data } = await supabase.from('bills').select('*, bill_items(*, medicines(name))').order('created_at', { ascending: false });
    if (data) setBills(data);
  }

  const handleDeleteBill = async (id) => {
    if (confirm('Are you sure you want to delete this bill record?')) {
      await supabase.from('bills').delete().eq('id', id);
      fetchBills();
      alert('Bill deleted successfully.');
    }
  };

  const sendWhatsAppFromHistory = (bill) => {
    let message = `*Dr. Gondhane Clinic*\nPatient: ${bill.patient_name}\nDate: ${new Date(bill.created_at).toLocaleString()}\n\n*Prescribed Items:*\n`;
    if (bill.bill_items && bill.bill_items.length > 0) {
      bill.bill_items.forEach(item => {
        const medName = item.medicines?.name || 'Medicine';
        message += `- ${medName} (${item.quantity} x ₹${item.price}) = ₹${item.quantity * item.price}\n`;
      });
    }
    message += `\n*Total Amount: ₹${bill.total_amount}*\nThank you! Get well soon.`;
    
    const encodedMsg = encodeURIComponent(message);
    const phoneClean = (bill.patient_phone || '').replace(/\D/g, '');
    if (!phoneClean) {
      alert('No valid phone number found for this bill.');
      return;
    }
    window.open(`https://wa.me/91${phoneClean}?text=${encodedMsg}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 font-bold text-slate-900">Patient Bill History & Moderation</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-slate-400 text-xs uppercase border-b border-slate-200">
                <th className="p-4">Date & Time</th>
                <th className="p-4">Patient Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Locality</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.map(bill => (
                <tr key={bill.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4 text-slate-500 text-xs">{new Date(bill.created_at).toLocaleString()}</td>
                  <td className="p-4 font-bold text-slate-900">{bill.patient_name}</td>
                  <td className="p-4 text-slate-600 text-xs">{bill.patient_phone}</td>
                  <td className="p-4 text-slate-600">{bill.locality}</td>
                  <td className="p-4 text-emerald-700 font-black">₹{bill.total_amount}</td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button onClick={() => setSelectedBill(bill)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1">
                      <Eye size={14}/> View
                    </button>
                    <button onClick={() => sendWhatsAppFromHistory(bill)} className="px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition flex items-center gap-1">
                      <Send size={14}/> WhatsApp
                    </button>
                    <button onClick={() => handleDeleteBill(bill.id)} className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW BILL MODAL */}
      {selectedBill && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-6 relative border border-slate-200">
            <button onClick={() => setSelectedBill(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"><X size={20}/></button>
            <div className="text-center border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">Dr. Gondhane Clinic</h2>
              <p className="text-xs text-slate-500">Official Patient Receipt / Prescription Bill</p>
              <p className="text-[11px] text-slate-400 mt-1">{new Date(selectedBill.created_at).toLocaleString()}</p>
            </div>
            <div className="space-y-1.5 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p><strong className="text-slate-700">Patient Name:</strong> {selectedBill.patient_name}</p>
              <p><strong className="text-slate-700">Phone:</strong> {selectedBill.patient_phone}</p>
              <p><strong className="text-slate-700">Locality:</strong> {selectedBill.locality}</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Billed Items</h4>
              <div className="max-h-40 overflow-y-auto space-y-2 divide-y divide-slate-100 pr-1">
                {selectedBill.bill_items && selectedBill.bill_items.map((item, idx) => (
                  <div key={idx} className="pt-2 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-bold text-slate-900">{item.medicines?.name || 'Medicine'}</p>
                      <p className="text-xs text-slate-500">Qty: {item.quantity} × ₹{item.price}</p>
                    </div>
                    <span className="font-extrabold text-slate-900">₹{item.quantity * item.price}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
              <span className="font-extrabold text-base text-slate-900">Grand Total:</span>
              <span className="text-xl font-black text-emerald-700">₹{selectedBill.total_amount}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => sendWhatsAppFromHistory(selectedBill)} className="py-3 bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-800 transition"><Send size={14}/> Send WhatsApp</button>
              <button onClick={() => window.print()} className="py-3 bg-slate-900 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-black transition"><Printer size={14}/> Print Receipt</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}