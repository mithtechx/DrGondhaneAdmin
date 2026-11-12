
import React, {
  useState,
  useEffect,
  useCallback
} from 'react';

import { supabase } from './lib/supabase';

import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  Receipt,
  CreditCard,
  TrendingUp,
  LogOut,
  User,
  Lock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  RotateCcw
} from 'lucide-react';

// EXISTING APPLICATION PAGES
import BillingPage from './pages/billing/BillingPage';
import BillHistoryPage from './pages/bills/BillHistoryPage';
import CreditLedgerPage from './pages/credits/CreditLedgerPage';
import InventoryPage from './pages/inventory/InventoryPage';

// REPORTS
import SalesTrackPage from './pages/reports/SalesTrackPage';

// MEDICINE RETURNS
import MedicineReturnsPage from './pages/MedicineReturnsPage';


// ==================================================
// HELPER FUNCTIONS
// ==================================================

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getLocalDateKey(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}


// ==================================================
// MAIN APPLICATION
// ==================================================

export default function App() {

  // --------------------------------------------------
  // 1. AUTHENTICATION STATES
  // --------------------------------------------------

  const [session, setSession] = useState(null);
  const [clinicUser, setClinicUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [authError, setAuthError] = useState('');
  const [logoutError, setLogoutError] = useState('');


  // --------------------------------------------------
  // 2. NAVIGATION
  // --------------------------------------------------

  const [activeTab, setActiveTab] = useState('dashboard');


  // --------------------------------------------------
  // 3. DASHBOARD DATA
  // --------------------------------------------------

  const [stats, setStats] = useState({
    todaySales: 0,
    totalStock: 0,
    pendingCredits: 0,
    totalBills: 0,
    todayReturns: 0,
    todayReturnQuantity: 0,
    todayReturnValue: 0,
    todayStockRestored: 0
  });

  const [medicines, setMedicines] = useState([]);
  const [credits, setCredits] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'General'
  });

  const [expenseMessage, setExpenseMessage] = useState('');


  // --------------------------------------------------
  // 4. USER ROLE
  // --------------------------------------------------

  const role = String(clinicUser?.role || '').toLowerCase();

  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';


  // ==================================================
  // 5. INITIALIZE SUPABASE AUTHENTICATION
  // ==================================================

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {

      if (!mounted) return;

      setSession(newSession);
      setClinicUser(null);

      setAuthError('');
      setLogoutError('');

      setProfileLoading(Boolean(newSession));
    });


    async function initializeAuth() {
      try {

        const {
          data,
          error
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          setAuthError(error.message);
        }

        const currentSession = data?.session ?? null;

        setSession(currentSession);
        setProfileLoading(Boolean(currentSession));

      } catch (error) {

        if (!mounted) return;

        setAuthError(
          error.message || 'Unable to initialize authentication.'
        );

        setSession(null);

      } finally {

        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };

  }, []);


  // ==================================================
  // 6. FETCH LOGGED-IN CLINIC USER PROFILE
  // ==================================================

  useEffect(() => {
    let active = true;

    async function fetchClinicProfile() {

      if (!session?.user?.id) {
        setClinicUser(null);
        setProfileLoading(false);
        return;
      }

      setClinicUser(null);
      setProfileLoading(true);
      setAuthError('');

      try {

        const {
          data,
          error
        } = await supabase
          .from('clinic_users')
          .select('id, username, role, auth_user_id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (!active) return;

        if (error) {
          setAuthError(
            'Unable to load your clinic profile: ' + error.message
          );

          setClinicUser(null);
          return;
        }

        if (!data) {
          setAuthError(
            'Your account is not linked to a clinic user. Please contact the administrator.'
          );

          setClinicUser(null);
          return;
        }

        const userRole = String(data.role || '').toLowerCase();

        if (!['admin', 'staff'].includes(userRole)) {
          setAuthError(
            'Your clinic account has an unsupported role.'
          );

          setClinicUser(null);
          return;
        }

        setClinicUser({
          ...data,
          role: userRole
        });

        setAuthError('');

      } catch (error) {

        if (!active) return;

        setAuthError(
          error.message || 'Unable to verify your clinic account.'
        );

        setClinicUser(null);

      } finally {

        if (active) {
          setProfileLoading(false);
        }
      }
    }

    fetchClinicProfile();

    return () => {
      active = false;
    };

  }, [session?.user?.id]);


  // ==================================================
  // 7. FETCH DASHBOARD AND APPLICATION DATA
  // ==================================================

  const fetchDashboardData = useCallback(async () => {

    if (!session || !clinicUser) return;

    setDataLoading(true);
    setDataError('');

    try {

      // Local date boundaries for today's returns.

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);


      // Fetch all required data.

      const [
        medicinesResult,
        billsResult,
        creditsResult,
        expensesResult,
        returnsResult
      ] = await Promise.all([

        // MEDICINES
        supabase
          .from('medicines')
          .select('*'),

        // BILLS
        supabase
          .from('bills')
          .select('total_amount, created_at'),

        // CREDITS - ADMIN ONLY
        isAdmin
          ? supabase
              .from('credits')
              .select('*')
              .order('created_at', { ascending: false })
          : Promise.resolve({
              data: [],
              error: null
            }),

        // EXPENSES - ADMIN ONLY
        isAdmin
          ? supabase
              .from('expenses')
              .select('*')
              .order('created_at', { ascending: false })
          : Promise.resolve({
              data: [],
              error: null
            }),

        // TODAY'S MEDICINE RETURNS
        supabase
          .from('medicine_returns')
          .select('quantity, total_amount, created_at, stock_added')
          .gte('created_at', todayStart.toISOString())
          .lt('created_at', tomorrowStart.toISOString())

      ]);


      const errors = [];


      // ----------------------------------------------
      // MEDICINES
      // ----------------------------------------------

      let totalStock = 0;

      if (medicinesResult.error) {

        errors.push(
          'Inventory: ' + medicinesResult.error.message
        );

      } else {

        const medicineData = medicinesResult.data || [];

        setMedicines(medicineData);

        totalStock = medicineData.reduce(
          (sum, medicine) =>
            sum + Number(medicine.stock || 0),
          0
        );
      }


      // ----------------------------------------------
      // BILLS
      // ----------------------------------------------

      let todaySales = 0;
      let totalBills = 0;

      if (billsResult.error) {

        errors.push(
          'Bills: ' + billsResult.error.message
        );

      } else {

        const billData = billsResult.data || [];

        const todayKey = getLocalDateKey(new Date());

        todaySales = billData
          .filter(bill =>
            getLocalDateKey(bill.created_at) === todayKey
          )
          .reduce(
            (sum, bill) =>
              sum + Number(bill.total_amount || 0),
            0
          );

        totalBills = billData.length;
      }


      // ----------------------------------------------
      // CREDITS
      // ----------------------------------------------

      let pendingCredits = 0;

      if (creditsResult.error) {

        errors.push(
          'Credits: ' + creditsResult.error.message
        );

      } else {

        const creditData = creditsResult.data || [];

        setCredits(creditData);

        pendingCredits = creditData
          .filter(credit => credit.status === 'Pending')
          .reduce(
            (sum, credit) =>
              sum + Number(credit.credit_amount || 0),
            0
          );
      }


      // ----------------------------------------------
      // EXPENSES
      // ----------------------------------------------

      if (expensesResult.error) {

        errors.push(
          'Expenses: ' + expensesResult.error.message
        );

      } else {

        setExpenses(expensesResult.data || []);
      }


      // ----------------------------------------------
      // TODAY'S RETURNS
      // ----------------------------------------------

      let todayReturns = 0;
      let todayReturnQuantity = 0;
      let todayReturnValue = 0;
      let todayStockRestored = 0;

      if (returnsResult.error) {

        errors.push(
          'Medicine Returns: ' + returnsResult.error.message
        );

      } else {

        const returnData = returnsResult.data || [];

        todayReturns = returnData.length;

        todayReturnQuantity = returnData.reduce(
          (sum, item) =>
            sum + Number(item.quantity || 0),
          0
        );

        todayReturnValue = returnData.reduce(
          (sum, item) =>
            sum + Number(item.total_amount || 0),
          0
        );

        todayStockRestored = returnData.reduce(
          (sum, item) =>
            sum + Number(item.stock_added || 0),
          0
        );
      }


      // ----------------------------------------------
      // UPDATE DASHBOARD STATISTICS
      // ----------------------------------------------

      setStats({
        todaySales,
        totalStock,
        pendingCredits,
        totalBills,
        todayReturns,
        todayReturnQuantity,
        todayReturnValue,
        todayStockRestored
      });


      if (errors.length > 0) {
        setDataError(errors.join(' | '));
      }

    } catch (error) {

      setDataError(
        error.message || 'Unable to load clinic data.'
      );

    } finally {

      setDataLoading(false);
    }

  }, [session, clinicUser, isAdmin]);


  // REFRESH WHEN USER OR ACTIVE PAGE CHANGES

  useEffect(() => {

    if (session && clinicUser) {
      fetchDashboardData();
    }

  }, [
    session,
    clinicUser,
    activeTab,
    fetchDashboardData
  ]);


  // ==================================================
  // 8. LOGIN
  // ==================================================

  async function handleLogin(e) {

    e.preventDefault();

    setAuthError('');
    setLoginLoading(true);

    try {

      const {
        error
      } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setPassword('');

    } catch (error) {

      setAuthError(
        error.message || 'Login failed. Please try again.'
      );

    } finally {

      setLoginLoading(false);
    }
  }


  // ==================================================
  // 9. LOGOUT
  // ==================================================

  async function handleLogout() {

    setLogoutError('');

    try {

      const {
        error
      } = await supabase.auth.signOut({ scope: 'local' });

      if (error) {
        setLogoutError(error.message);
        return;
      }

      setClinicUser(null);
      setActiveTab('dashboard');
      setPassword('');

    } catch (error) {

      setLogoutError(
        error.message || 'Unable to logout.'
      );
    }
  }


  // ==================================================
  // 10. ADD EXPENSE
  // ==================================================

  async function handleAddExpense(e) {

    e.preventDefault();

    if (!isAdmin) {
      setExpenseMessage(
        'You are not authorized to add expenses.'
      );
      return;
    }

    const title = newExpense.title.trim();
    const amount = Number(newExpense.amount);

    if (!title || !Number.isFinite(amount) || amount <= 0) {
      setExpenseMessage(
        'Enter a valid expense title and amount.'
      );
      return;
    }

    setExpenseMessage('');

    try {

      const {
        error
      } = await supabase
        .from('expenses')
        .insert([{
          title,
          amount,
          category: newExpense.category
        }]);

      if (error) {
        setExpenseMessage(error.message);
        return;
      }

      setNewExpense({
        title: '',
        amount: '',
        category: 'General'
      });

      setExpenseMessage(
        'Expense added successfully.'
      );

      await fetchDashboardData();

    } catch (error) {

      setExpenseMessage(
        error.message || 'Unable to add expense.'
      );
    }
  }


  // ==================================================
  // 11. NAVIGATION AND PERMISSIONS
  // ==================================================

  const navigationItems = [

    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowed: true
    },

    {
      id: 'billing',
      label: 'Create Bill',
      icon: ShoppingCart,
      allowed: true
    },

    {
      id: 'inventory',
      label: 'Inventory',
      icon: Package,
      allowed: true
    },

    {
      id: 'returns',
      label: 'Medicine Returns',
      icon: RotateCcw,
      allowed: true
    },

    {
      id: 'bills',
      label: 'Bill History',
      icon: FileText,
      allowed: true
    },

    {
      id: 'expenses',
      label: 'Expense Tracker',
      icon: Receipt,
      allowed: isAdmin
    },

    {
      id: 'credits',
      label: 'Credit Ledger',
      icon: CreditCard,
      allowed: isAdmin
    },

    {
      id: 'sales',
      label: 'Sales Track',
      icon: TrendingUp,
      allowed: isAdmin
    }

  ];

  const visibleNavigationItems = navigationItems.filter(
    item => item.allowed
  );


  // ==================================================
  // 12. INITIAL LOADING SCREEN
  // ==================================================

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">

        <div className="text-center space-y-3">

          <Loader2
            size={38}
            className="animate-spin text-emerald-700 mx-auto"
          />

          <p className="font-bold text-slate-500">
            Loading Dr. Gondhane Platform...
          </p>

        </div>

      </div>
    );
  }


  // ==================================================
  // 13. LOGIN SCREEN
  // ==================================================

  if (!session) {

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">

        <div className="bg-white max-w-md w-full p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">

          <div className="text-center space-y-2">

            <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg">
              <ShieldCheck size={27} />
            </div>

            <h2 className="text-xl font-black text-slate-900">
              Dr. Gondhane Skin Care Clinic
            </h2>

            <p className="text-xs text-slate-500 font-medium">
              Secure Clinic Management Portal
            </p>

          </div>


          <form onSubmit={handleLogin} className="space-y-4">

            <div className="space-y-1.5">

              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>

              <div className="relative">

                <User
                  size={16}
                  className="absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium"
                  required
                  disabled={loginLoading}
                />

              </div>

            </div>


            <div className="space-y-1.5">

              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>

              <div className="relative">

                <Lock
                  size={16}
                  className="absolute left-4 top-3.5 text-slate-400"
                />

                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium"
                  required
                  disabled={loginLoading}
                />

              </div>

            </div>


            {authError && (

              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700">

                <AlertCircle
                  size={17}
                  className="shrink-0 mt-0.5"
                />

                <p className="text-xs font-semibold">
                  {authError}
                </p>

              </div>

            )}


            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm shadow-lg transition flex items-center justify-center gap-2"
            >

              {loginLoading ? (

                <>
                  <Loader2 size={17} className="animate-spin" />
                  Signing in...
                </>

              ) : (

                'Secure Login'

              )}

            </button>

          </form>


          <div className="text-center pt-4 border-t border-slate-100 text-[11px] text-slate-400 font-semibold">
            Software by MithTechX (8261039902)
          </div>

        </div>

      </div>
    );
  }


  // ==================================================
  // 14. PROFILE VERIFICATION
  // ==================================================

  if (session && profileLoading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">

        <div className="text-center space-y-3">

          <Loader2
            size={38}
            className="animate-spin text-emerald-700 mx-auto"
          />

          <p className="font-bold text-slate-600">
            Verifying your clinic account...
          </p>

        </div>

      </div>
    );
  }


  // ==================================================
  // 15. UNLINKED OR INVALID ACCOUNT
  // ==================================================

  if (session && !clinicUser) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">

        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center space-y-4">

          <ShieldCheck
            size={42}
            className="mx-auto text-rose-600"
          />

          <h2 className="text-xl font-black text-slate-900">
            Account Verification Failed
          </h2>

          <p className="text-sm text-slate-500">
            {authError || 'Your clinic profile could not be verified.'}
          </p>

          <button
            onClick={handleLogout}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-xl font-bold transition"
          >
            Logout
          </button>

        </div>

      </div>
    );
  }


  // ==================================================
  // 16. MAIN APPLICATION
  // ==================================================

  return (

    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">


      {/* ==============================================
          SIDEBAR
      ============================================== */}

      <aside className="w-full md:w-72 md:min-h-screen bg-white border-r border-slate-200/80 p-4 sm:p-6 flex flex-col justify-between shrink-0 shadow-sm">

        <div className="space-y-5 md:space-y-8">


          {/* CLINIC BRANDING */}

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 bg-emerald-700 text-white rounded-2xl flex items-center justify-center font-black shadow-md shrink-0">
              DG
            </div>

            <div className="min-w-0">

              <h1 className="font-black text-slate-900 text-sm leading-tight">
                Dr. Gondhane
              </h1>

              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Skin Care Clinic
              </p>

            </div>

          </div>


          {/* LOGGED-IN USER */}

          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl">

            <div className="flex items-center gap-2">

              <div className="w-8 h-8 bg-emerald-700 text-white rounded-xl flex items-center justify-center">
                <User size={15} />
              </div>

              <div className="min-w-0">

                <p className="text-xs font-black text-slate-900 capitalize truncate">
                  {clinicUser.username}
                </p>

                <p className="text-[10px] text-emerald-700 font-bold uppercase">
                  {clinicUser.role} Account
                </p>

              </div>

            </div>

          </div>


          {/* NAVIGATION */}

          <nav className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">

            {visibleNavigationItems.map(item => {

              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (

                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setDataError('');
                  }}
                  className={`shrink-0 md:shrink w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 rounded-xl md:rounded-2xl font-bold text-xs transition ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/20'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >

                  <Icon size={17} />

                  <span>{item.label}</span>

                </button>

              );

            })}

          </nav>

        </div>


        {/* SIDEBAR FOOTER */}

        <div className="space-y-3 pt-4 md:pt-6 border-t border-slate-100 mt-4">

          <div className="hidden md:block bg-slate-50 p-3.5 rounded-2xl text-[11px] text-slate-500 font-medium space-y-1">

            <p className="font-bold text-slate-900">
              Dr. Gondhane Clinic
            </p>

            <p>Software by MithTechX</p>

            <p className="text-emerald-700 font-bold">
              Contact: 8261039902
            </p>

          </div>


          {logoutError && (

            <p className="text-xs text-rose-600 font-semibold">
              {logoutError}
            </p>

          )}


          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center md:justify-start gap-2 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-2xl font-bold text-xs transition"
          >

            <LogOut size={16} />

            Logout ({clinicUser.username})

          </button>

        </div>

      </aside>


      {/* ==============================================
          MAIN CONTENT AREA
      ============================================== */}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full min-w-0">


        {/* GENERAL DATA ERROR */}

        {dataError && (

          <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">

            <AlertCircle
              size={18}
              className="shrink-0 mt-0.5"
            />

            <div className="flex-1 min-w-0">

              <p className="font-bold text-xs">
                Some application data could not be loaded.
              </p>

              <p className="text-xs mt-1 break-words">
                {dataError}
              </p>

            </div>

            <button
              onClick={fetchDashboardData}
              className="shrink-0 text-xs font-bold underline"
            >
              Retry
            </button>

          </div>

        )}


        {/* ============================================
            DASHBOARD
        ============================================ */}

        {activeTab === 'dashboard' && (

          <div className="space-y-6">


            {/* DASHBOARD HEADER */}

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

              <div>

                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">

                  {isAdmin ? 'Admin Dashboard' : 'Staff Dashboard'}

                </span>

                <h2 className="text-2xl font-black text-slate-900 mt-3">
                  Welcome Back, {clinicUser.username}
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  Here is today's clinic performance overview.
                </p>

              </div>


              <div className="flex gap-2 flex-wrap">

                <button
                  onClick={fetchDashboardData}
                  disabled={dataLoading}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
                >

                  <RefreshCw
                    size={15}
                    className={dataLoading ? 'animate-spin' : ''}
                  />

                  Refresh

                </button>


                <button
                  onClick={() => setActiveTab('billing')}
                  className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-xs shadow-lg transition flex items-center gap-2"
                >

                  <ShoppingCart size={16} />

                  Create New Bill

                </button>

              </div>

            </div>


            {/* DASHBOARD STATISTICS */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">


              {/* TODAY'S SALES */}

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">

                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Today's Sales
                </span>

                <div className="text-2xl sm:text-3xl font-black text-emerald-700 break-words">
                  {formatCurrency(stats.todaySales)}
                </div>

                <p className="text-[11px] text-slate-400 font-medium">
                  Recorded today
                </p>

              </div>


              {/* PENDING CREDITS */}

              {isAdmin && (

                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">

                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Pending Credits
                  </span>

                  <div className="text-2xl sm:text-3xl font-black text-rose-600 break-words">
                    {formatCurrency(stats.pendingCredits)}
                  </div>

                  <p className="text-[11px] text-slate-400 font-medium">
                    Udhar Khata dues
                  </p>

                </div>

              )}


              {/* TOTAL STOCK */}

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">

                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Medicines Stock
                </span>

                <div className="text-3xl font-black text-slate-900">
                  {stats.totalStock}
                </div>

                <p className="text-[11px] text-slate-400 font-medium">
                  Units available
                </p>

              </div>


              {/* TOTAL BILLS */}

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">

                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total Bills Created
                </span>

                <div className="text-3xl font-black text-emerald-700">
                  {stats.totalBills}
                </div>

                <p className="text-[11px] text-slate-400 font-medium">
                  All-time invoices
                </p>

              </div>

            </div>


            {/* TODAY'S MEDICINE RETURNS SUMMARY */}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">

                <div className="flex items-center gap-3">

                  <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">
                    <RotateCcw size={20} />
                  </div>

                  <div>

                    <h3 className="font-black text-slate-900">
                      Today's Medicine Returns
                    </h3>

                    <p className="text-[11px] text-slate-400">
                      Return activity recorded today
                    </p>

                  </div>

                </div>


                <button
                  onClick={() => setActiveTab('returns')}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                >
                  Open Returns →
                </button>

              </div>


              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                <div>

                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Return Records
                  </p>

                  <p className="text-xl font-black text-slate-900 mt-1">
                    {stats.todayReturns}
                  </p>

                </div>


                <div>

                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Units Returned
                  </p>

                  <p className="text-xl font-black text-slate-900 mt-1">
                    {stats.todayReturnQuantity}
                  </p>

                </div>


                <div>

                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Stock Restored
                  </p>

                  <p className="text-xl font-black text-emerald-700 mt-1">
                    {stats.todayStockRestored}
                  </p>

                </div>


                <div>

                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Return Value
                  </p>

                  <p className="text-xl font-black text-rose-600 mt-1">
                    {formatCurrency(stats.todayReturnValue)}
                  </p>

                </div>

              </div>

            </div>


            {dataLoading && (

              <div className="flex items-center gap-2 text-xs text-slate-400">

                <Loader2
                  size={15}
                  className="animate-spin"
                />

                Updating clinic data...

              </div>

            )}

          </div>

        )}


        {/* ============================================
            BILLING
        ============================================ */}

        {activeTab === 'billing' && (
          <BillingPage />
        )}


        {/* ============================================
            INVENTORY - FULL INVENTORY COMPONENT
        ============================================ */}

        {activeTab === 'inventory' && (
          <InventoryPage />
        )}


        {/* ============================================
            MEDICINE RETURNS
        ============================================ */}

        {activeTab === 'returns' && (
          <MedicineReturnsPage
            onRefresh={fetchDashboardData}
          />
        )}


        {/* ============================================
            BILL HISTORY
        ============================================ */}

        {activeTab === 'bills' && (
          <BillHistoryPage />
        )}


        {/* ============================================
            EXPENSE TRACKER - ADMIN ONLY
        ============================================ */}

        {activeTab === 'expenses' && isAdmin && (

          <div className="space-y-6 max-w-4xl mx-auto">


            {/* ADD EXPENSE */}

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">

              <div>

                <h3 className="font-bold text-slate-900">
                  Add Clinic Expense
                </h3>

                <p className="text-xs text-slate-400">
                  Record clinic expenditure.
                </p>

              </div>


              <form
                onSubmit={handleAddExpense}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >

                <input
                  type="text"
                  placeholder="Expense title..."
                  value={newExpense.title}
                  onChange={e =>
                    setNewExpense({
                      ...newExpense,
                      title: e.target.value
                    })
                  }
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-emerald-500 font-medium"
                  required
                />


                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount (₹)..."
                  value={newExpense.amount}
                  onChange={e =>
                    setNewExpense({
                      ...newExpense,
                      amount: e.target.value
                    })
                  }
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:border-emerald-500 font-medium"
                  required
                />


                <button
                  type="submit"
                  className="py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-bold text-xs transition shadow-md"
                >
                  Add Expense
                </button>

              </form>


              {expenseMessage && (

                <p className="text-xs font-semibold text-slate-600">
                  {expenseMessage}
                </p>

              )}

            </div>


            {/* EXPENSE HISTORY */}

            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">

              <div className="p-5 border-b border-slate-100">

                <h3 className="font-bold text-slate-900">
                  Expense History
                </h3>

              </div>


              <div className="overflow-x-auto">

                <table className="w-full text-left border-collapse text-sm">

                  <thead>

                    <tr className="bg-slate-50/70 text-slate-400 text-xs uppercase border-b border-slate-200">

                      <th className="p-4">Date</th>
                      <th className="p-4">Title</th>
                      <th className="p-4">Category</th>
                      <th className="p-4 text-right">Amount</th>

                    </tr>

                  </thead>


                  <tbody className="divide-y divide-slate-100">

                    {expenses.length === 0 ? (

                      <tr>

                        <td
                          colSpan="4"
                          className="text-center py-8 text-slate-400 text-xs"
                        >
                          No expenses recorded.
                        </td>

                      </tr>

                    ) : (

                      expenses.map(exp => (

                        <tr
                          key={exp.id}
                          className="hover:bg-slate-50/50 transition"
                        >

                          <td className="p-4 text-slate-500 text-xs whitespace-nowrap">
                            {exp.created_at
                              ? new Date(exp.created_at).toLocaleDateString('en-IN')
                              : '—'}
                          </td>

                          <td className="p-4 font-bold text-slate-900">
                            {exp.title}
                          </td>

                          <td className="p-4 text-xs font-semibold text-slate-600">
                            {exp.category || 'General'}
                          </td>

                          <td className="p-4 text-right font-black text-rose-600 whitespace-nowrap">
                            {formatCurrency(exp.amount)}
                          </td>

                        </tr>

                      ))

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        )}


        {/* ============================================
            CREDIT LEDGER - ADMIN ONLY
        ============================================ */}

        {activeTab === 'credits' && isAdmin && (

          <CreditLedgerPage
            credits={credits}
            onRefresh={fetchDashboardData}
          />

        )}


        {/* ============================================
            SALES TRACK - ADMIN ONLY
        ============================================ */}

        {activeTab === 'sales' && isAdmin && (
          <SalesTrackPage />
        )}


      </main>

    </div>
  );
}
