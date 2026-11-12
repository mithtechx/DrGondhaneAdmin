
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Eye,
  Printer,
  MessageSquare,
  X,
  Trash2
} from 'lucide-react';

export default function BillHistoryPage() {
  const [bills, setBills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [deletingBillId, setDeletingBillId] = useState(null);

  useEffect(() => {
    fetchBills();
  }, []);

  async function fetchBills() {
    try {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setBills(data);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      window.alert('Unable to load bill history.');
    }
  }

  const filteredBills = bills.filter(b =>
    (b.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.patient_phone || '').includes(searchQuery) ||
    (b.locality || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ADMIN ONLY: Delete a bill
  async function deleteBill(bill) {
    if (deletingBillId) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete this bill?\n\n` +
      `Patient: ${bill.patient_name}\n` +
      `Amount: ₹${Number(bill.total_amount || 0).toFixed(2)}\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingBillId(bill.id);

    try {
      const { data, error } = await supabase
        .from('bills')
        .delete()
        .eq('id', bill.id)
        .select('id');

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error(
          'Bill was not deleted. Check your Supabase Admin DELETE permissions.'
        );
      }

      setBills(currentBills =>
        currentBills.filter(item => item.id !== bill.id)
      );

      if (selectedBill?.id === bill.id) {
        setSelectedBill(null);
      }

      window.alert('Bill deleted successfully.');
    } catch (error) {
      console.error('Bill deletion error:', error);

      if (
        error.code === '23503' ||
        error.message?.toLowerCase().includes('foreign key')
      ) {
        window.alert(
          'This bill has linked records in the database. ' +
          'It cannot be deleted until the related records are handled safely.'
        );
      } else {
        window.alert(error.message || 'Unable to delete bill.');
      }
    } finally {
      setDeletingBillId(null);
    }
  }

  const printReceipt = (bill) => {
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      window.alert('Please allow pop-ups to print the receipt.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${bill.patient_name}</title>
          <style>
            body {
              font-family: monospace;
              padding: 20px;
              width: 300px;
              margin: auto;
              color: #000;
            }
            h2, h3 {
              text-align: center;
              margin: 5px 0;
            }
            .line {
              border-bottom: 1px dashed #000;
              margin: 10px 0;
            }
            table {
              width: 100%;
              font-size: 12px;
              border-collapse: collapse;
            }
            th, td {
              text-align: left;
              padding: 4px 0;
            }
            .right {
              text-align: right;
            }
          </style>
        </head>
        <body>
          <h2>Dr. Gondhane Skin Care Clinic</h2>
          <h3>Official Patient Receipt</h3>
          <p style="text-align:center; font-size: 11px;">
            Date: ${new Date(bill.created_at).toLocaleString()}
          </p>
          <div class="line"></div>
          <p><strong>Patient:</strong> ${bill.patient_name || 'N/A'}</p>
          <p><strong>Phone:</strong> ${bill.patient_phone || 'N/A'}</p>
          <p><strong>Locality:</strong> ${bill.locality || 'Clinic'}</p>
          <p><strong>Payment Mode:</strong> ${bill.payment_mode || 'Cash'}</p>
          <div class="line"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th class="right">Amt</th>
              </tr>
            </thead>
            <tbody>
              ${(bill.items || []).map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.qty}</td>
                  <td class="right">
                    ₹${((item.selling_price || item.price || 0) * item.qty).toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="line"></div>
          <h3>
            Grand Total: ₹${Number(bill.total_amount || 0).toFixed(2)}
          </h3>
          <div class="line"></div>
          <p style="text-align:center; font-size: 10px;">
            Thank you for visiting!<br/>
            Software by MithTechX (8261039902)
          </p>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => printWindow.print(), 500);
  };

  const sendWhatsApp = (bill) => {
    const itemsList = (bill.items || [])
      .map(i =>
        `• ${i.name} (x${i.qty}) - ₹${(
          (i.selling_price || i.price || 0) * i.qty
        ).toFixed(2)}`
      )
      .join('\n');

    const msg =
      `Hello *${bill.patient_name}*,\n` +
      `Thank you for visiting *Dr. Gondhane Skin Care Clinic*.\n\n` +
      `*Billed Items:*\n${itemsList}\n\n` +
      `Payment Mode: *${bill.payment_mode || 'Cash'}*\n` +
      `Total Amount: *₹${Number(bill.total_amount || 0).toFixed(2)}*\n\n` +
      `Software by MithTechX.`;

    const encoded = encodeURIComponent(msg);
    const phoneClean = (bill.patient_phone || '').replace(/\D/g, '');

    window.open(
      `https://wa.me/91${phoneClean}?text=${encoded}`,
      '_blank'
    );
  };

  return (
    <div className="space-y-6">

      {/* SEARCH BAR */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">

        <div className="relative w-full sm:w-96">
          <Search
            size={18}
            className="absolute left-4 top-3.5 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search bills by patient name or phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
          {filteredBills.length} Bills Recorded
        </span>
      </div>

      {/* BILL HISTORY TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">

          <table className="w-full text-left border-collapse text-sm">

            <thead>
              <tr className="bg-slate-50/70 text-slate-400 text-xs uppercase border-b border-slate-200">
                <th className="p-4">Date & Time</th>
                <th className="p-4">Patient Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Locality</th>
                <th className="p-4">Payment Mode</th>
                <th className="p-4">Total Amount</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">

              {filteredBills.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="text-center py-8 text-slate-400 text-xs"
                  >
                    No bills found.
                  </td>
                </tr>
              ) : (

                filteredBills.map(bill => (
                  <tr
                    key={bill.id}
                    className="hover:bg-slate-50/50 transition"
                  >

                    <td className="p-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(bill.created_at).toLocaleString()}
                    </td>

                    <td className="p-4 font-bold text-slate-900">
                      {bill.patient_name}
                    </td>

                    <td className="p-4 font-mono text-xs text-slate-600">
                      {bill.patient_phone || 'N/A'}
                    </td>

                    <td className="p-4 text-xs text-slate-600">
                      {bill.locality || 'Clinic'}
                    </td>

                    <td className="p-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl text-xs font-bold uppercase">
                        {bill.payment_mode || 'Cash'}
                      </span>
                    </td>

                    <td className="p-4 font-black text-emerald-700 whitespace-nowrap">
                      ₹{Number(bill.total_amount || 0).toFixed(2)}
                    </td>

                    {/* ACTION BUTTONS */}
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">

                        {/* VIEW */}
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition"
                          title="View Receipt"
                        >
                          <Eye size={16} />
                        </button>

                        {/* PRINT */}
                        <button
                          onClick={() => printReceipt(bill)}
                          className="p-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
                          title="Print Receipt"
                        >
                          <Printer size={16} />
                        </button>

                        {/* WHATSAPP */}
                        <button
                          onClick={() => sendWhatsApp(bill)}
                          className="p-2 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition"
                          title="WhatsApp Receipt"
                        >
                          <MessageSquare size={16} />
                        </button>

                        {/* ADMIN DELETE */}
                        <button
                          onClick={() => deleteBill(bill)}
                          disabled={deletingBillId !== null}
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Bill"
                        >
                          {deletingBillId === bill.id ? (
                            <span className="block w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}

            </tbody>
          </table>

        </div>
      </div>

      {/* RECEIPT VIEW MODAL */}
      {selectedBill && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">

          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setSelectedBill(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 font-bold p-2 bg-slate-100 rounded-full"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-1 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">
                Dr. Gondhane Skin Care Clinic
              </h3>

              <p className="text-xs text-slate-400">
                Official Patient Receipt / Prescription Bill
              </p>

              <p className="text-[11px] font-semibold text-emerald-700">
                {new Date(selectedBill.created_at).toLocaleString()}
              </p>
            </div>

            {/* PATIENT DETAILS */}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-1.5 text-xs text-slate-700">
              <p>
                <strong>Patient Name:</strong> {selectedBill.patient_name}
              </p>

              <p>
                <strong>Phone:</strong> {selectedBill.patient_phone || 'N/A'}
              </p>

              <p>
                <strong>Locality:</strong> {selectedBill.locality || 'Clinic'}
              </p>

              <p>
                <strong>Payment Mode:</strong>{' '}
                <span className="uppercase font-bold text-emerald-700">
                  {selectedBill.payment_mode || 'Cash'}
                </span>
              </p>
            </div>

            {/* BILLED ITEMS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Billed Items
              </h4>

              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">

                {(selectedBill.items || []).length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-400">
                    No items recorded for this bill.
                  </p>
                ) : (

                  selectedBill.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-3 text-xs bg-white"
                    >

                      <div>
                        <p className="font-bold text-slate-900">
                          {item.name}
                        </p>

                        <p className="text-slate-400">
                          Qty: {item.qty} × ₹{item.selling_price || item.price || 0}
                        </p>
                      </div>

                      <span className="font-black text-emerald-700">
                        ₹{(
                          (item.selling_price || item.price || 0) * item.qty
                        ).toFixed(2)}
                      </span>

                    </div>
                  ))
                )}

              </div>
            </div>

            {/* TOTAL */}
            <div className="flex justify-between items-center border-t border-slate-100 pt-4 text-base font-black text-slate-900">
              <span>Grand Total:</span>

              <span className="text-emerald-700 text-2xl">
                ₹{Number(selectedBill.total_amount || 0).toFixed(2)}
              </span>
            </div>

            {/* RECEIPT ACTIONS */}
            <div className="grid grid-cols-2 gap-3 pt-2">

              <button
                onClick={() => sendWhatsApp(selectedBill)}
                className="py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                <MessageSquare size={16} />
                Send WhatsApp
              </button>

              <button
                onClick={() => printReceipt(selectedBill)}
                className="py-3 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                <Printer size={16} />
                Print Receipt
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
