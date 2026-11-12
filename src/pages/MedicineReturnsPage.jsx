
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';

import { supabase } from '../lib/supabase';

import {
  RotateCcw,
  Package,
  Search,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  IndianRupee,
  CalendarDays,
  ClipboardList,
  Plus,
  AlertTriangle
} from 'lucide-react';


// ==================================================
// HELPERS
// ==================================================

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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


// ==================================================
// SUMMARY CARD
// ==================================================

function SummaryCard({ title, value, description, icon: Icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">

      <div className="flex items-center justify-between gap-3">

        <div className="min-w-0">

          <p className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-400">
            {title}
          </p>

          <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 break-words">
            {value}
          </h3>

          <p className="text-[10px] text-slate-400 mt-1">
            {description}
          </p>

        </div>

        <div className="w-11 h-11 shrink-0 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
          <Icon size={21} />
        </div>

      </div>

    </div>
  );
}


// ==================================================
// MAIN MEDICINE RETURNS PAGE
// ==================================================

export default function MedicineReturnsPage({ onRefresh }) {

  // MEDICINES
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');

  // RETURN FORM
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [itemCondition, setItemCondition] = useState('resellable');

  // HISTORY
  const [returns, setReturns] = useState([]);
  const [search, setSearch] = useState('');

  // LOADING AND MESSAGES
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');


  // --------------------------------------------------
  // SELECTED MEDICINE
  // --------------------------------------------------

  const selectedMedicine = useMemo(() => {
    return medicines.find(
      medicine => medicine.id === selectedMedicineId
    ) || null;
  }, [medicines, selectedMedicineId]);


  // --------------------------------------------------
  // VALIDATION AND PRICE CALCULATION
  // --------------------------------------------------

  const numericQuantity = Number(quantity);

  const validQuantity =
    Number.isInteger(numericQuantity) &&
    numericQuantity > 0;

  const unitPrice = Number(
    selectedMedicine?.selling_price || 0
  );

  const estimatedReturnValue = validQuantity
    ? unitPrice * numericQuantity
    : 0;

  const isExpired = Boolean(
    selectedMedicine?.expiry_date &&
    selectedMedicine.expiry_date < getLocalDateKey(new Date())
  );

  const willIncreaseStock =
    itemCondition === 'resellable' && !isExpired;

  const expectedStockAdded = willIncreaseStock
    ? numericQuantity
    : 0;


  // --------------------------------------------------
  // FETCH MEDICINES AND RETURN HISTORY
  // --------------------------------------------------

  const fetchData = useCallback(async () => {

    setLoading(true);
    setError('');

    try {

      const [
        medicinesResult,
        returnsResult
      ] = await Promise.all([

        supabase
          .from('medicines')
          .select(`
            id,
            name,
            category,
            batch_no,
            expiry_date,
            selling_price,
            stock
          `)
          .order('name', { ascending: true }),

        supabase
          .from('medicine_returns')
          .select(`
            id,
            medicine_id,
            medicine_name,
            batch_no,
            quantity,
            unit_price,
            total_amount,
            reason,
            item_condition,
            stock_added,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(100)

      ]);

      if (medicinesResult.error) {
        throw medicinesResult.error;
      }

      if (returnsResult.error) {
        throw returnsResult.error;
      }

      setMedicines(medicinesResult.data || []);
      setReturns(returnsResult.data || []);

    } catch (err) {

      setError(
        err.message || 'Unable to load medicine return data.'
      );

    } finally {

      setLoading(false);
    }

  }, []);


  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // --------------------------------------------------
  // SEARCH RETURN HISTORY
  // --------------------------------------------------

  const filteredReturns = useMemo(() => {

    const query = search.trim().toLowerCase();

    if (!query) return returns;

    return returns.filter(item => {

      return (
        String(item.medicine_name || '')
          .toLowerCase()
          .includes(query) ||

        String(item.reason || '')
          .toLowerCase()
          .includes(query) ||

        String(item.batch_no || '')
          .toLowerCase()
          .includes(query)
      );

    });

  }, [returns, search]);


  // --------------------------------------------------
  // RECENT RETURN SUMMARY
  // --------------------------------------------------

  const summary = useMemo(() => {

    return returns.reduce((result, item) => {

      result.count += 1;

      result.quantity += Number(item.quantity || 0);

      result.stockAdded += Number(item.stock_added || 0);

      result.value += Number(item.total_amount || 0);

      return result;

    }, {
      count: 0,
      quantity: 0,
      stockAdded: 0,
      value: 0
    });

  }, [returns]);


  // --------------------------------------------------
  // RECORD A MEDICINE RETURN
  // --------------------------------------------------

  async function handleSubmitReturn(e) {

    e.preventDefault();

    setError('');
    setMessage('');

    if (!selectedMedicine) {
      setError('Please select a medicine.');
      return;
    }

    if (!validQuantity) {
      setError('Enter a valid whole-number return quantity.');
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please enter a valid return reason.');
      return;
    }

    if (!['resellable', 'not_resellable'].includes(itemCondition)) {
      setError('Please select a valid item condition.');
      return;
    }

    setSaving(true);

    try {

      // Call the database function.
      // The function saves the return and updates stock atomically.

      const {
        data,
        error: returnError
      } = await supabase.rpc('record_medicine_return', {

        p_medicine_id: selectedMedicine.id,

        p_quantity: numericQuantity,

        p_reason: reason.trim(),

        p_item_condition: itemCondition

      });

      if (returnError) {
        throw returnError;
      }

      const savedReturn = Array.isArray(data)
        ? data[0]
        : data;

      if (!savedReturn) {
        throw new Error(
          'The return could not be confirmed. Refresh the page and verify the return history before retrying.'
        );
      }

      if (Number(savedReturn.stock_added || 0) > 0) {

        setMessage(
          `Return recorded successfully. ${savedReturn.stock_added} unit(s) added to inventory.`
        );

      } else {

        setMessage(
          'Return recorded successfully. The item was not added to available stock because it is marked damaged or has expired.'
        );

      }

      setQuantity('1');
      setReason('');
      setItemCondition('resellable');

      await fetchData();

      if (onRefresh) {
        await onRefresh();
      }

    } catch (err) {

      setError(
        err.message || 'Unable to record the medicine return.'
      );

    } finally {

      setSaving(false);
    }
  }


  // ==================================================
  // UI
  // ==================================================

  return (

    <div className="space-y-6">


      {/* ============================================
          PAGE HEADER
      ============================================ */}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-start gap-3">

            <div className="w-12 h-12 shrink-0 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center">

              <RotateCcw size={23} />

            </div>

            <div>

              <span className="text-[10px] text-emerald-700 font-black uppercase tracking-wider">
                Inventory Management
              </span>

              <h2 className="text-2xl font-black text-slate-900 mt-1">
                Medicine Returns
              </h2>

              <p className="text-xs text-slate-400 mt-1">
                Record returned medicines and manage their stock.
              </p>

            </div>

          </div>


          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 disabled:opacity-50"
          >

            <RefreshCw
              size={15}
              className={loading ? 'animate-spin' : ''}
            />

            Refresh

          </button>

        </div>

      </div>


      {/* ============================================
          NOTIFICATIONS
      ============================================ */}

      {error && (

        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">

          <AlertCircle
            size={19}
            className="shrink-0 text-rose-600"
          />

          <p className="text-xs font-semibold text-rose-700 break-words">
            {error}
          </p>

        </div>

      )}


      {message && (

        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">

          <CheckCircle
            size={19}
            className="shrink-0 text-emerald-700"
          />

          <p className="text-xs font-semibold text-emerald-800 break-words">
            {message}
          </p>

        </div>

      )}


      {/* ============================================
          SUMMARY CARDS
      ============================================ */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <SummaryCard
          title="Recent Returns"
          value={summary.count}
          description="Last 100 recorded returns"
          icon={ClipboardList}
        />

        <SummaryCard
          title="Units Returned"
          value={summary.quantity}
          description="Quantity in recent records"
          icon={Package}
        />

        <SummaryCard
          title="Stock Added"
          value={summary.stockAdded}
          description="Resellable units added"
          icon={CheckCircle}
        />

        <SummaryCard
          title="Return Value"
          value={formatCurrency(summary.value)}
          description="Value of recent returns"
          icon={IndianRupee}
        />

      </div>


      {/* ============================================
          NEW RETURN FORM
      ============================================ */}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

        <div className="p-5 sm:p-6 border-b border-slate-100">

          <div className="flex items-center gap-2">

            <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">

              <Plus size={19} />

            </div>

            <div>

              <h3 className="font-black text-slate-900">
                Record New Return
              </h3>

              <p className="text-[11px] text-slate-400 mt-0.5">
                Fill in the medicine return details.
              </p>

            </div>

          </div>

        </div>


        <form
          onSubmit={handleSubmitReturn}
          className="p-5 sm:p-6 space-y-5"
        >


          {/* MEDICINE SELECT */}

          <div className="space-y-2">

            <label className="text-xs font-bold text-slate-600">
              Select Medicine
            </label>

            <select
              value={selectedMedicineId}
              onChange={e => {
                setSelectedMedicineId(e.target.value);
                setError('');
                setMessage('');
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600"
              required
              disabled={loading || saving}
            >

              <option value="">
                Choose a medicine...
              </option>

              {medicines.map(medicine => (

                <option
                  key={medicine.id}
                  value={medicine.id}
                >

                  {medicine.name}
                  {medicine.batch_no
                    ? ` | Batch: ${medicine.batch_no}`
                    : ''}
                  {` | Stock: ${medicine.stock ?? 0}`}

                </option>

              ))}

            </select>

            {medicines.length === 0 && !loading && (

              <p className="text-[11px] text-amber-600">
                No medicines found in your inventory.
              </p>

            )}

          </div>


          {/* SELECTED MEDICINE DETAILS */}

          {selectedMedicine && (

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">

              <div className="flex items-center gap-2 mb-3">

                <Package size={17} className="text-emerald-700" />

                <p className="font-black text-sm text-slate-900">
                  Selected Medicine Details
                </p>

              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                <div>

                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    Category
                  </p>

                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {selectedMedicine.category || 'General'}
                  </p>

                </div>


                <div>

                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    Batch Number
                  </p>

                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {selectedMedicine.batch_no || '—'}
                  </p>

                </div>


                <div>

                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    Current Stock
                  </p>

                  <p className="text-xs font-bold text-emerald-700 mt-1">
                    {selectedMedicine.stock ?? 0} units
                  </p>

                </div>


                <div>

                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    Selling Price
                  </p>

                  <p className="text-xs font-bold text-slate-800 mt-1">
                    {formatCurrency(unitPrice)}
                  </p>

                </div>

              </div>


              {isExpired && (

                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2">

                  <AlertTriangle
                    size={16}
                    className="text-amber-700 shrink-0"
                  />

                  <p className="text-[11px] text-amber-800 font-semibold">
                    This medicine has expired. A return can be recorded, but its quantity will not be added to saleable stock.
                  </p>

                </div>

              )}

            </div>

          )}


          {/* QUANTITY AND CONDITION */}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">


            {/* QUANTITY */}

            <div className="space-y-2">

              <label className="text-xs font-bold text-slate-600">
                Returned Quantity
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={e => {
                  setQuantity(e.target.value);
                  setError('');
                  setMessage('');
                }}
                placeholder="Enter quantity"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600"
                required
                disabled={saving}
              />

            </div>


            {/* CONDITION */}

            <div className="space-y-2">

              <label className="text-xs font-bold text-slate-600">
                Returned Item Condition
              </label>

              <select
                value={itemCondition}
                onChange={e => {
                  setItemCondition(e.target.value);
                  setError('');
                  setMessage('');
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600"
                disabled={saving}
              >

                <option value="resellable">
                  Good / Resellable
                </option>

                <option value="not_resellable">
                  Damaged / Not Resellable
                </option>

              </select>

            </div>

          </div>


          {/* RETURN REASON */}

          <div className="space-y-2">

            <label className="text-xs font-bold text-slate-600">
              Reason for Return
            </label>

            <textarea
              rows="3"
              value={reason}
              onChange={e => {
                setReason(e.target.value);
                setError('');
                setMessage('');
              }}
              maxLength={250}
              placeholder="Enter the reason for returning this medicine..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none resize-y focus:border-emerald-600"
              required
              disabled={saving}
            />

            <p className="text-right text-[10px] text-slate-400">
              {reason.length}/250 characters
            </p>

          </div>


          {/* RETURN VALUE */}

          {selectedMedicine && (

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">

              <div className="flex justify-between gap-3 text-xs">

                <span className="text-slate-600 font-semibold">
                  Price per unit
                </span>

                <span className="font-bold text-slate-900">
                  {formatCurrency(unitPrice)}
                </span>

              </div>


              <div className="flex justify-between gap-3 text-xs">

                <span className="text-slate-600 font-semibold">
                  Returned quantity
                </span>

                <span className="font-bold text-slate-900">
                  {validQuantity ? numericQuantity : '—'}
                </span>

              </div>


              <div className="border-t border-emerald-200 pt-3 flex justify-between items-center gap-3">

                <span className="font-black text-slate-900 text-sm">
                  Estimated Return Value
                </span>

                <span className="text-lg font-black text-emerald-800">
                  {formatCurrency(estimatedReturnValue)}
                </span>

              </div>


              <div className="text-[11px] font-semibold text-emerald-800">

                {expectedStockAdded > 0
                  ? `${expectedStockAdded} unit(s) will be added to inventory.`
                  : 'No units will be added to available stock.'}

              </div>

            </div>

          )}


          {/* SUBMIT BUTTON */}

          <button
            type="submit"
            disabled={
              saving ||
              loading ||
              !selectedMedicine ||
              !validQuantity ||
              !reason.trim()
            }
            className="w-full sm:w-auto px-7 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black shadow-md transition flex items-center justify-center gap-2"
          >

            {saving ? (

              <>
                <Loader2 size={17} className="animate-spin" />
                Saving Return...
              </>

            ) : (

              <>
                <RotateCcw size={17} />
                Record Medicine Return
              </>

            )}

          </button>


        </form>

      </div>


      {/* ============================================
          RECENT RETURNS HISTORY
      ============================================ */}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div>

            <h3 className="font-black text-slate-900">
              Recent Return History
            </h3>

            <p className="text-[11px] text-slate-400 mt-1">
              Latest 100 recorded medicine returns.
            </p>

          </div>


          <div className="relative w-full sm:w-64">

            <Search
              size={16}
              className="absolute left-3.5 top-3.5 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search medicine or reason..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-600"
            />

          </div>

        </div>


        {loading ? (

          <div className="py-12 text-center">

            <Loader2
              size={28}
              className="animate-spin text-emerald-700 mx-auto"
            />

            <p className="text-xs font-semibold text-slate-400 mt-3">
              Loading return history...
            </p>

          </div>

        ) : filteredReturns.length === 0 ? (

          <div className="py-12 px-4 text-center">

            <RotateCcw
              size={30}
              className="mx-auto text-slate-300"
            />

            <p className="text-sm font-bold text-slate-600 mt-3">
              No return records found.
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Recorded returns will appear here.
            </p>

          </div>

        ) : (

          <>

            {/* MOBILE RETURN CARDS */}

            <div className="md:hidden divide-y divide-slate-100">

              {filteredReturns.map(item => (

                <div key={item.id} className="p-4 space-y-3">

                  <div className="flex justify-between items-start gap-3">

                    <div className="min-w-0">

                      <p className="font-bold text-sm text-slate-900">
                        {item.medicine_name}
                      </p>

                      <p className="text-[10px] text-slate-400 mt-1">
                        Batch: {item.batch_no || '—'}
                      </p>

                    </div>

                    <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      Number(item.stock_added) > 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {Number(item.stock_added) > 0
                        ? 'Stock Added'
                        : 'Not Restocked'}
                    </span>

                  </div>


                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        Returned Quantity
                      </p>

                      <p className="text-xs font-bold text-slate-800 mt-1">
                        {item.quantity} units
                      </p>

                    </div>


                    <div>

                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        Return Value
                      </p>

                      <p className="text-xs font-black text-emerald-700 mt-1">
                        {formatCurrency(item.total_amount)}
                      </p>

                    </div>

                  </div>


                  <div className="text-[11px] text-slate-500">
                    Reason: {item.reason}
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center gap-1">

                    <CalendarDays size={12} />

                    {formatDateTime(item.created_at)}

                  </div>

                </div>

              ))}

            </div>


            {/* DESKTOP TABLE */}

            <div className="hidden md:block overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead>

                  <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">

                    <th className="p-4">Medicine</th>

                    <th className="p-4">Batch</th>

                    <th className="p-4 text-center">Quantity</th>

                    <th className="p-4">Reason</th>

                    <th className="p-4">Condition</th>

                    <th className="p-4 text-right">Value</th>

                    <th className="p-4 text-center">Stock Added</th>

                    <th className="p-4">Date</th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-slate-100">

                  {filteredReturns.map(item => (

                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition"
                    >

                      <td className="p-4 font-bold text-slate-900">
                        {item.medicine_name}
                      </td>

                      <td className="p-4 text-xs text-slate-500">
                        {item.batch_no || '—'}
                      </td>

                      <td className="p-4 text-center font-bold">
                        {item.quantity}
                      </td>

                      <td className="p-4 text-xs text-slate-600 max-w-48">
                        {item.reason}
                      </td>

                      <td className="p-4">

                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          item.item_condition === 'resellable'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {item.item_condition === 'resellable'
                            ? 'Resellable'
                            : 'Not Resellable'}
                        </span>

                      </td>

                      <td className="p-4 text-right font-black text-emerald-700 whitespace-nowrap">
                        {formatCurrency(item.total_amount)}
                      </td>

                      <td className="p-4 text-center">

                        <span className={`font-bold text-xs ${
                          Number(item.stock_added) > 0
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}>
                          +{item.stock_added}
                        </span>

                      </td>

                      <td className="p-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(item.created_at)}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </>

        )}

      </div>

    </div>
  );
}
