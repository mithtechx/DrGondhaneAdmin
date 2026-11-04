import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingCart, Send, Save, CheckCircle, Search, User, Phone, MapPin } from 'lucide-react';

export default function BillingPage() {
  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [patient, setPatient] = useState({ name: '', phone: '', locality: '' });
  
  // Billing states for discounts and credit handling
  const [discountType, setDiscountType] = useState('none'); // 'none', 'percent', 'flat'
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash', 'online', 'credit', 'split'
  const [cashPaid, setCashPaid] = useState('');
  const [existingCredit, setExistingCredit] = useState(0);
  const [payOldBalance, setPayOldBalance] = useState(false);
  const [partialOldPay, setPartialOldPay] = useState(''); // Allows custom partial payment of old balance
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchMedicines();
  }, []);

  async function fetchMedicines() {
    const { data } = await supabase.from('medicines').select('*').order('name');
    if (data) setMedicines(data);
  }

  // Check if patient phone has pending credit/due balance
  async function checkPatientCredit(phone) {
    if (!phone || phone.length < 10) {
      setExistingCredit(0);
      setPayOldBalance(false);
      setPartialOldPay('');
      return;
    }
    const { data } = await supabase
      .from('credits')
      .select('credit_amount')
      .eq('patient_phone', phone.trim())
      .eq('status', 'Pending');

    if (data && data.length > 0) {
      const totalPend = data.reduce((sum, c) => sum + Number(c.credit_amount), 0);
      setExistingCredit(totalPend);
      setPartialOldPay(totalPend); // Default to full amount, editable for partial
    } else {
      setExistingCredit(0);
      setPayOldBalance(false);
      setPartialOldPay('');
    }
  }

  const addToCart = (med) => {
    const existing = cart.find(item => item.id === med.id);
    if (existing) {
      setCart(cart.map(item => item.id === med.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...med, qty: 1 }]);
    }
  };

  const updateQty = (id, qty) => {
    const numericQty = Number(qty);
    if (numericQty <= 0 || isNaN(numericQty)) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      setCart(cart.map(item => item.id === id ? { ...item, qty: numericQty } : item));
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.selling_price || 0) * item.qty), 0);
  
  let discountAmount = 0;
  if (discountType === 'percent') {
    discountAmount = (subtotal * Number(discountValue || 0)) / 100;
  } else if (discountType === 'flat') {
    discountAmount = Number(discountValue || 0);
  }
  
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const oldBalanceToAdd = payOldBalance ? Number(partialOldPay || 0) : 0;
  const totalWithOldBalance = grandTotal + oldBalanceToAdd;

  const handleCheckout = async (openWhatsApp = false) => {
    if (cart.length === 0 && (!payOldBalance || oldBalanceToAdd <= 0)) {
      alert('Please add medicines or enter an old balance payment amount.');
      return;
    }

    const finalBillAmount = totalWithOldBalance;
    let paidAmt = finalBillAmount;
    let creditAmt = 0;

    if (paymentMode === 'credit') {
      paidAmt = 0;
      creditAmt = finalBillAmount;
    } else if (paymentMode === 'split') {
      paidAmt = Number(cashPaid || 0);
      creditAmt = Math.max(0, finalBillAmount - paidAmt);
    }

    // Insert Bill record
    const { data: billData, error: billError } = await supabase.from('bills').insert([{
      patient_name: patient.name || 'Walk-in Patient',
      patient_phone: patient.phone || '0000000000',
      locality: patient.locality || 'Clinic',
      total_amount: finalBillAmount
    }]).select().single();

    if (billError) {
      alert('Error saving bill: ' + billError.message);
      return;
    }

    // Insert cart items & reduce stock
    for (let item of cart) {
      await supabase.from('bill_items').insert([{
        bill_id: billData.id,
        medicine_id: item.id,
        quantity: item.qty,
        price: item.selling_price || 0
      }]);
      await supabase.from('medicines').update({ stock: Math.max(0, (item.stock || 0) - item.qty) }).eq('id', item.id);
    }

    // Handle Credit / Old Balance settlement & new credit generation
    if (payOldBalance && oldBalanceToAdd > 0) {
      const { data: pendingCredits } = await supabase
        .from('credits')
        .select('*')
        .eq('patient_phone', patient.phone.trim())
        .eq('status', 'Pending')
        .order('created_at', { ascending: true });

      let remainingToPay = oldBalanceToAdd;
      if (pendingCredits) {
        for (let creditRecord of pendingCredits) {
          if (remainingToPay <= 0) break;
          const dueOnThis = Number(creditRecord.credit_amount);
          if (remainingToPay >= dueOnThis) {
            await supabase.from('credits').update({ status: 'Settled' }).eq('id', creditRecord.id);
            remainingToPay -= dueOnThis;
          } else {
            const newDue = dueOnThis - remainingToPay;
            await supabase.from('credits').update({ credit_amount: newDue }).eq('id', creditRecord.id);
            remainingToPay = 0;
          }
        }
      }
    }

    if (creditAmt > 0) {
      await supabase.from('credits').insert([{
        patient_name: patient.name || 'Patient',
        patient_phone: patient.phone || '0000000000',
        total_bill_amount: finalBillAmount,
        paid_amount: paidAmt,
        credit_amount: creditAmt,
        status: 'Pending'
      }]);
    }

    setSuccessMsg('Bill Saved Successfully!');
    
    if (openWhatsApp && patient.phone) {
      let message = `*Dr. Gondhane Clinic*\nPatient: ${patient.name || 'Patient'}\nDate: ${new Date().toLocaleString()}\n\n`;
      if (cart.length > 0) {
        message += `*Prescribed Medicines:*\n`;
        cart.forEach(i => {
          message += `- ${i.name} (${i.qty} x ₹${i.selling_price}) = ₹${i.qty * i.selling_price}\n`;
        });
      }
      if (discountAmount > 0) message += `Discount: -₹${discountAmount}\n`;
      if (payOldBalance && oldBalanceToAdd > 0) message += `Old Balance Paid: ₹${oldBalanceToAdd}\n`;
      message += `\n*Grand Total: ₹${finalBillAmount}*\nPaid: ₹${paidAmt} | Credit/Due: ₹${creditAmt}\nThank you! Get well soon.`;
      
      const encodedMsg = encodeURIComponent(message);
      const phoneClean = patient.phone.replace(/\D/g, '');
      window.open(`https://wa.me/91${phoneClean}?text=${encodedMsg}`, '_blank');
    }

    setCart([]);
    setPatient({ name: '', phone: '', locality: '' });
    setDiscountType('none');
    setDiscountValue(0);
    setPaymentMode('cash');
    setCashPaid('');
    setExistingCredit(0);
    setPayOldBalance(false);
    setPartialOldPay('');
    fetchMedicines();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredMedicines = medicines.filter(m => (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.category || '').toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Catalog & Search */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <Search size={18} className="text-slate-400"/>
          <input 
            type="text" 
            placeholder="Search medicines by name or category..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="w-full text-sm outline-none bg-transparent"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-[65vh] overflow-y-auto pr-1">
          {filteredMedicines.map(med => (
            <div 
              key={med.id} 
              onClick={() => (med.stock || 0) > 0 && addToCart(med)} 
              className={`p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between cursor-pointer transition hover:border-emerald-500 ${(med.stock || 0) <= 0 ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
            >
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">{med.category || 'General'}</span>
                <h4 className="font-bold text-slate-900 mt-2 text-sm">{med.name}</h4>
              </div>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-emerald-700 font-black text-sm">₹{med.selling_price || 0}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${(med.stock || 0) > 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                  Stock: {med.stock || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart size={18} className="text-emerald-700"/> Current Bill Counter
            </h3>
            {successMsg && <span className="text-xs text-emerald-700 font-bold flex items-center gap-1"><CheckCircle size={14}/> {successMsg}</span>}
          </div>

          <div className="space-y-2.5">
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-3 text-slate-400"/>
              <input type="text" placeholder="Patient Name" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"/>
            </div>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-3 text-slate-400"/>
              <input 
                type="text" 
                placeholder="Phone Number (for WhatsApp & Credit)" 
                value={patient.phone} 
                onChange={e => { 
                  setPatient({...patient, phone: e.target.value}); 
                  checkPatientCredit(e.target.value); 
                }} 
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-3 text-slate-400"/>
              <input type="text" placeholder="Locality / Address" value={patient.locality} onChange={e => setPatient({...patient, locality: e.target.value})} className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"/>
            </div>
          </div>

          {/* Pending Due & Partial Payment Section */}
          {existingCredit > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold text-amber-800">
                <span>⚠️ Total Pending Due:</span>
                <span className="text-rose-600 text-sm font-black">₹{existingCredit}</span>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1 border-t border-amber-100">
                <input type="checkbox" checked={payOldBalance} onChange={e => setPayOldBalance(e.target.checked)} className="rounded text-emerald-700 w-4 h-4"/>
                Pay Old Balance in this bill
              </label>

              {payOldBalance && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-bold text-amber-900 uppercase">Amount to pay now (Full or Partial):</label>
                  <input 
                    type="number" 
                    max={existingCredit}
                    value={partialOldPay} 
                    onChange={e => setPartialOldPay(e.target.value)} 
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                    placeholder="Enter amount..."
                  />
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 max-h-36 overflow-y-auto space-y-2 pr-1">
            {cart.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-6">No medicines added to cart yet.</p>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-100 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-slate-500">₹{item.selling_price || 0} each</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center">-</button>
                    <input 
                      type="number" 
                      value={item.qty} 
                      onChange={e => updateQty(item.id, e.target.value)} 
                      className="w-12 h-7 bg-white border border-slate-200 rounded-lg text-center font-bold text-slate-900 text-xs outline-none focus:border-emerald-500"
                    />
                    <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center">+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Discounts Module */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Discounts</label>
            <div className="grid grid-cols-4 gap-1">
              {[5, 10, 15, 20].map(pct => (
                <button 
                  key={pct}
                  onClick={() => { setDiscountType('percent'); setDiscountValue(pct); }}
                  className={`py-1.5 rounded-xl text-xs font-bold border transition ${discountType === 'percent' && discountValue === pct ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <input 
              type="number" 
              placeholder="Flat discount amount (₹)..." 
              value={discountType === 'flat' ? discountValue : ''}
              onChange={e => { setDiscountType('flat'); setDiscountValue(e.target.value); }}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500"
            />
          </div>

          {/* Payment Mode Selection */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Mode</label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'cash', label: 'Cash' },
                { id: 'online', label: 'Online' },
                { id: 'credit', label: 'Credit' },
                { id: 'split', label: 'Split' }
              ].map(m => (
                <button 
                  key={m.id}
                  onClick={() => setPaymentMode(m.id)}
                  className={`py-1.5 rounded-xl text-[11px] font-bold border transition ${paymentMode === m.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {paymentMode === 'split' && (
              <input 
                type="number" 
                placeholder="Enter spot payment (Cash/Online)..." 
                value={cashPaid}
                onChange={e => setCashPaid(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 mt-1"
              />
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
          <div className="space-y-1 text-xs text-slate-500">
            <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-rose-600"><span>Discount:</span><span>-₹{discountAmount}</span></div>}
            {payOldBalance && oldBalanceToAdd > 0 && <div className="flex justify-between text-amber-700"><span>Old Balance Payment:</span><span>+₹{oldBalanceToAdd}</span></div>}
            <div className="flex justify-between items-center font-black text-base text-slate-900 pt-1 border-t border-slate-100">
              <span>Grand Total:</span>
              <span className="text-emerald-700 text-lg">₹{totalWithOldBalance}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleCheckout(false)} className="py-3 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm">
              <Save size={14}/> Save Bill
            </button>
            <button onClick={() => handleCheckout(true)} className="py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm">
              <Send size={14}/> WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}