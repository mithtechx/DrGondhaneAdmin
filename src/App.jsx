import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { LayoutDashboard, ShoppingCart, Package, FileText, TrendingUp, LogOut, Menu, X, Stethoscope, Lock, User, KeyRound, ShieldCheck, LogIn, CreditCard, PhoneCall, Check } from 'lucide-react';

import DashboardPage from './pages/dashboard/DashboardPage';
import BillingPage from './pages/billing/BillingPage';
import InventoryPage from './pages/inventory/InventoryPage';
import BillHistoryPage from './pages/bills/BillHistoryPage';
import SalesTrackPage from './pages/reports/SalesTrackPage';

export default function AdminApp() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Login Form State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Change Password Modal State
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeUser, setChangeUser] = useState('');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [changeMsg, setChangeMsg] = useState('');

  // Credits state for ledger tab
  const [credits, setCredits] = useState([]);

  React.useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  async function fetchCredits() {
    const { data } = await supabase.from('credits').select('*').order('created_at', { ascending: false });
    if (data) setCredits(data);
  }

  const settleCreditDirectly = async (creditId) => {
    const { error } = await supabase.from('credits').update({ status: 'Settled' }).eq('id', creditId);
    if (!error) {
      fetchCredits();
      alert('Credit marked as settled successfully!');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const { data, error } = await supabase
      .from('clinic_users')
      .select('*')
      .eq('username', loginUser.trim())
      .eq('password', loginPass.trim())
      .maybeSingle();

    if (error || !data) {
      setLoginError('Invalid username or password.');
    } else {
      setUser(data);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangeMsg('');

    const { data, error } = await supabase
      .from('clinic_users')
      .select('*')
      .eq('username', changeUser.trim())
      .eq('password', oldPass.trim())
      .maybeSingle();

    if (error || !data) {
      setChangeMsg('❌ Incorrect username or old password.');
      return;
    }

    const { error: updateErr } = await supabase
      .from('clinic_users')
      .update({ password: newPass.trim() })
      .eq('id', data.id);

    if (updateErr) {
      setChangeMsg('❌ Error updating password.');
    } else {
      setChangeMsg('✅ Password updated successfully! Please login.');
      setTimeout(() => {
        setShowChangeModal(false);
        setChangeMsg('');
        setChangeUser('');
        setOldPass('');
        setNewPass('');
      }, 2000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans antialiased">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6 border border-slate-200">
          <div className="text-center space-y-2">
            <div className="bg-emerald-700 text-white w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-md">
              <ShieldCheck size={28}/>
            </div>
            <h2 className="text-2xl font-black text-slate-900">Dr. Gondhane Admin</h2>
            <p className="text-xs text-slate-500">Secure Admin Portal • Powered by MithTechX</p>
          </div>

          {loginError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-2xl font-bold text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-3.5 text-slate-400"/>
                <input 
                  type="text" 
                  required
                  placeholder="Enter admin username"
                  value={loginUser} 
                  onChange={e => setLoginUser(e.target.value)} 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-3.5 text-slate-400"/>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={loginPass} 
                  onChange={e => setLoginPass(e.target.value)} 
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2">
              <LogIn size={18}/> Login to Admin Portal
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <button onClick={() => setShowChangeModal(true)} className="text-xs font-bold text-emerald-700 hover:underline flex items-center justify-center gap-1 mx-auto">
              <KeyRound size={14}/> Change Password
            </button>
          </div>
        </div>

        {showChangeModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 relative">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2"><KeyRound size={18} className="text-emerald-700"/> Change Password</h3>
                <button onClick={() => setShowChangeModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
              </div>

              {changeMsg && (
                <div className={`text-xs p-3 rounded-2xl font-bold text-center ${changeMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                  {changeMsg}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <input type="text" required placeholder="Username" value={changeUser} onChange={e => setChangeUser(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500"/>
                <input type="password" required placeholder="Old Password" value={oldPass} onChange={e => setOldPass(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500"/>
                <input type="password" required placeholder="New Password" value={newPass} onChange={e => setNewPass(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500"/>
                
                <button type="submit" className="w-full py-3 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-sm shadow-sm transition">
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'Create Bill', icon: ShoppingCart },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'bills', label: 'Bill History', icon: FileText },
    { id: 'credits', label: 'Credit Ledger', icon: CreditCard },
    { id: 'reports', label: 'Sales Track', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row antialiased">
      {/* Mobile Top Nav */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-700 p-2 rounded-lg text-white"><Stethoscope size={18}/></div>
          <div>
            <h2 className="text-xs font-black tracking-wide text-slate-900">DR. GONDHANE</h2>
            <p className="text-[10px] text-emerald-700 font-bold uppercase">Admin Portal</p>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg">
          {mobileMenuOpen ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2 z-40 sticky top-[65px] shadow-lg">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button 
                key={item.id} 
                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} 
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === item.id ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Icon size={18}/> {item.label}
              </button>
            );
          })}
        </div>
      )}

      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 p-6 flex-col justify-between shrink-0 shadow-sm sticky top-0 h-screen">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700 p-2.5 rounded-xl text-white shadow-md"><Stethoscope size={22}/></div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-slate-900">DR. GONDHANE</h2>
              <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Admin Portal</p>
            </div>
          </div>
          <nav className="space-y-1.5">
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <button 
                  key={item.id} 
                  onClick={() => setActiveTab(item.id)} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === item.id ? 'bg-emerald-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Icon size={18}/> {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="text-center">
            <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Dr. Gondhane Clinic System</p>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Powered by MithTechX</p>
          </div>
          <button onClick={() => setUser(null)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition">
            <LogOut size={16}/> Logout ({user.username})
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
        {activeTab === 'billing' && <BillingPage />}
        {activeTab === 'inventory' && <InventoryPage />}
        {activeTab === 'bills' && <BillHistoryPage />}
        {activeTab === 'reports' && <SalesTrackPage />}
        
        {activeTab === 'credits' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900">Customer Credit Ledger (Udhar Khata)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Track pending balances, call customers directly, or settle accounts.</p>
              </div>
              <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-xl">
                {credits.filter(c => c.status === 'Pending').length} Pending Accounts
              </span>
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
                  {credits.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-8 text-slate-400 text-xs">No credit records found.</td></tr>
                  ) : (
                    credits.map(cr => (
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
        )}
      </main>
    </div>
  );
}