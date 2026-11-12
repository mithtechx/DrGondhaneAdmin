import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingCart, Send, Save, CheckCircle, Search, User, Phone, MapPin, ArrowRight, ArrowLeft, Trash2, Printer, MessageSquare, Filter } from 'lucide-react';

export default function BillingPage() {
  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState(1);

  const [patient, setPatient] = useState({ name: '', phone: '', locality: '' });
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [cashPaid, setCashPaid] = useState('');
  const [existingCredit, setExistingCredit] = useState(0);
  const [payOldBalance, setPayOldBalance] = useState(false);
  const [partialOldPay, setPartialOldPay] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchMedicines();
  }, []);

  async function fetchMedicines() {
    const { data } = await supabase.from('medicines').select('*').order('name');
    if (data) setMedicines(data);
  }

  // Extract unique categories
  const categories = ['All', ...Array.from(new Set(medicines.map(m => (m.category || 'General').trim()).filter(Boolean)))];

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
      setPartialOldPay(totalPend);
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

  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.selling_price || item.price || 0) * item.qty), 0);

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
    if (!patient.name) {
      alert('Please enter patient name.');
      return;
    }
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

    const { data: billData, error: billError } = await supabase.from('bills').insert([{
      patient_name: patient.name || 'Walk-in Patient',
      patient_phone: patient.phone || '0000000000',
      locality: patient.locality || 'Clinic',
      total_amount: finalBillAmount,
      payment_mode: paymentMode,
      items: cart
    }]).select().single();

    if (billError) {
      alert('Error saving bill: ' + billError.message);
      return;
    }

    for (let item of cart) {
      await supabase.from('medicines').update({ stock: Math.max(0, (item.stock || 0) - item.qty) }).eq('id', item.id);
    }

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

    if (creditAmt > 0 && patient.phone) {
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
      const itemsList = cart.map(i => `• ${i.name} (x${i.qty}) - Rs. ${((i.selling_price || i.price || 0) * i.qty).toFixed(2)}`).join('\n');
      let message = `Hello *${patient.name}*,\nThank you for visiting *Dr. Gondhane Skin Care Clinic*.:\n\n*Billed Items:*\n${itemsList}\n\nPayment Mode: *${paymentMode}*\nTotal Amount: *Rs. ${finalBillAmount.toFixed(2)}*.\nSoftware by MithTechX.`;
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
    setStep(1);
    fetchMedicines();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || (m.category || 'General').trim().toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const totalCartQty = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="space-y-6 pb-20">
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm">
          <CheckCircle size={16}/> {successMsg}
        </div>
      )}

      {step === 1 ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Side Category Filter Sidebar */}
          <div className="w-full lg:w-64 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm shrink-0 space-y-3 h-fit">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-sm">
              <Filter size={16} className="text-emerald-700"/> Categories
            </div>
            <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition text-left whitespace-nowrap ${selectedCategory === cat ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Right Side Search & Medicines Grid */}
          <div className="flex-1 space-y-4">
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full">
                <Search size={18} className="absolute left-4 top-3.5 text-slate-400"/>
                <input
                  type="text"
                  placeholder="Search medicines by name or category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium"
                />
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl shrink-0">
                {filteredMedicines.length} items
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredMedicines.map(med => {
                const inCart = cart.find(item => item.id === med.id);
                return (
                  <div
                    key={med.id}
                    onClick={() => (med.stock || 0) > 0 && addToCart(med)}
                    className={`bg-white p-4 rounded-3xl border transition flex flex-col justify-between space-y-3 cursor-pointer group shadow-2xs ${inCart ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200/80 hover:border-emerald-400'} ${(med.stock || 0) <= 0 ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
                  >
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        {med.category || 'General'}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-emerald-900">{med.name}</h4>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-slate-100">
                      <span className="text-sm font-black text-emerald-700">Rs. {med.selling_price || med.price || 0}</span>
                      <div className="flex items-center gap-1.5">
                        {inCart && <span className="w-5 h-5 bg-emerald-700 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{inCart.qty}</span>}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${(med.stock || 0) > 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                          Stock: {med.stock || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-2xl z-40">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-700 text-white p-2.5 rounded-2xl shadow-md">
                  <ShoppingCart size={20}/>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selected Cart</p>
                  <p className="text-sm sm:text-base font-black text-slate-900">
                    {totalCartQty} items • Subtotal: <span className="text-emerald-700">Rs. {subtotal.toFixed(2)}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (cart.length === 0) {
                    alert('Please select at least one item before proceeding.');
                    return;
                  }
                  setStep(2);
                }}
                className="px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-sm shadow-lg transition flex items-center gap-2"
              >
                Next: Patient Details & Billing <ArrowRight size={18}/>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-slate-700">
                <ArrowLeft size={18}/>
              </button>
              <div>
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">Step 2 of 2</span>
                <h3 className="font-black text-slate-900 text-lg mt-1">Current Bill Counter</h3>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
              {totalCartQty} Items in Cart
            </span>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <User size={16} className="absolute left-4 top-3.5 text-slate-400"/>
              <input
                type="text"
                placeholder="Patient Name *"
                value={patient.name}
                onChange={e => setPatient({...patient, name: e.target.value})}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium"
                required
              />
            </div>
            <div className="relative">
              <Phone size={16} className="absolute left-4 top-3.5 text-slate-400"/>
              <input
                type="text"
                placeholder="Phone Number (for WhatsApp & Credit)"
                value={patient.phone}
                onChange={e => {
                  setPatient({...patient, phone: e.target.value});
                  checkPatientCredit(e.target.value);
                }}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium"
              />
            </div>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-3.5 text-slate-400"/>
              <input
                type="text"
                placeholder="Locality / Address"
                value={patient.locality}
                onChange={e => setPatient({...patient, locality: e.target.value})}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          </div>

          {existingCredit > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                <span>⚠️ Total Pending Due:</span>
                <span className="text-rose-600 text-sm font-black">Rs. {existingCredit}</span>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-2 border-t border-amber-100">
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
                    className="w-full px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-500"
                    placeholder="Enter amount..."
                  />
                </div>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 max-h-40 overflow-y-auto space-y-2 pr-1">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-100 gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{item.name}</p>
                  <p className="text-emerald-700 font-semibold">Rs. {item.selling_price || item.price || 0} each</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100">-</button>
                  <span className="w-6 text-center font-bold text-xs">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100">+</button>
                  <button onClick={() => removeFromCart(item.id)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg ml-1"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Discounts</label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => { setDiscountType('percent'); setDiscountValue(pct); }}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${discountType === 'percent' && discountValue === pct ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Flat discount amount (Rs.)..."
              value={discountType === 'flat' ? discountValue : ''}
              onChange={e => { setDiscountType('flat'); setDiscountValue(e.target.value); }}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Mode</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'Cash' },
                { id: 'online', label: 'Online' },
                { id: 'credit', label: 'Credit' },
                { id: 'split', label: 'Split' }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMode(m.id)}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${paymentMode === m.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
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
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-emerald-500 font-medium mt-1"
              />
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 bg-slate-50 p-4 rounded-2xl space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between"><span>Subtotal:</span><span>Rs. {subtotal.toFixed(2)}</span></div>
            {discountAmount > 0 && <div className="flex justify-between text-emerald-700 font-semibold"><span>Discount Applied:</span><span>-Rs. {discountAmount.toFixed(2)}</span></div>}
            {payOldBalance && oldBalanceToAdd > 0 && <div className="flex justify-between text-amber-700 font-semibold"><span>Old Balance Payment:</span><span>+Rs. {oldBalanceToAdd.toFixed(2)}</span></div>}
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-black text-slate-900 text-base">
              <span>Grand Total:</span>
              <span className="text-emerald-700 text-2xl">Rs. {totalWithOldBalance.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={() => handleCheckout(false)} className="py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md">
              <Save size={16}/> Save Bill & Items
            </button>
            <button onClick={() => handleCheckout(true)} className="py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md">
              <MessageSquare size={16}/> WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}