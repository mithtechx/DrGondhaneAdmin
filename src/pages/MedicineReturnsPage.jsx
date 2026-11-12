
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef
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
  AlertTriangle,
  Trash2,
  ChevronDown,
  X
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

function isMedicineExpired(medicine) {
  if (!medicine?.expiry_date) return false;

  return medicine.expiry_date < getLocalDateKey(new Date());
}

function createReturnRow(id) {
  return {
    id,
    medicineId: '',
    quantity: '1',
    itemCondition: 'resellable',
    reason: ''
  };
}


// ==================================================
// SEARCHABLE MEDICINE SELECTOR
// ==================================================

function SearchableMedicineSelect({
  medicines,
  value,
  onChange,
  excludedIds = [],
  disabled = false
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedMedicine = medicines.find(
    medicine => medicine.id === value
  ) || null;

  const selectedLabel = selectedMedicine
    ? `${selectedMedicine.name}${
        selectedMedicine.batch_no
          ? ` | Batch: ${selectedMedicine.batch_no}`
          : ''
      }`
    : '';

  const filteredMedicines = useMemo(() => {
    const query = search.trim().toLowerCase();

    return medicines
      .filter(medicine => {
        if (excludedIds.includes(medicine.id)) {
          return false;
        }

        if (!query) return true;

        const searchableText = [
          medicine.name,
          medicine.category,
          medicine.batch_no
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(query);
      })
      .slice(0, 100);
  }, [medicines, search, excludedIds]);

  function openDropdown() {
    if (disabled) return;

    setSearch(selectedMedicine?.name || '');
    setIsOpen(true);
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
    setIsOpen(true);

    // Clear the previous selection when the user starts searching
    // for another medicine.
    if (value) {
      onChange('');
    }
  }

  function selectMedicine(medicine) {
    onChange(medicine.id);
    setSearch('');
    setIsOpen(false);
  }

  function clearMedicine() {
    onChange('');
    setSearch('');
    setIsOpen(true);
  }

  return (
    <div className="relative w-full">

      <div className="relative">

        <Search
          size={17}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />

        <input
          type="text"
          value={isOpen ? search : selectedLabel}
          onChange={handleSearchChange}
          onFocus={openDropdown}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 150);
          }}
          placeholder="Search medicine by name, batch or category..."
          disabled={disabled}
          autoComplete="off"
          className="w-full pl-10 pr-20 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
        />

        {value && !disabled && (
          <button
            type="button"
            onMouseDown={event => event.preventDefault()}
            onClick={clearMedicine}
            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-600"
            title="Clear selection"
          >
            <X size={16} />
          </button>
        )}

        <ChevronDown
          size={17}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />

      </div>

      {isOpen && !disabled && (
        <div className="absolute z-40 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">

          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">

            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Available Medicines
            </span>

            <span className="text-[10px] font-bold text-emerald-700">
              {filteredMedicines.length} found
            </span>

          </div>

          <div className="max-h-64 overflow-y-auto">

            {filteredMedicines.length === 0 ? (

              <div className="p-5 text-center">

                <Package
                  size={22}
                  className="mx-auto text-slate-300"
                />

                <p className="text-xs font-bold text-slate-600 mt-2">
                  No medicines found
                </p>

                <p className="text-[10px] text-slate-400 mt-1">
                  Try another medicine name or batch number.
                </p>

              </div>

            ) : (

              filteredMedicines.map(medicine => (

                <button
                  key={medicine.id}
                  type="button"
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => selectMedicine(medicine)}
                  className="w-full px-4 py-3 text-left border-b border-slate-50 last:border-0 hover:bg-emerald-50 transition flex items-center justify-between gap-3"
                >

                  <div className="min-w-0">

                    <p className="text-xs font-bold text-slate-800">
                      {medicine.name}
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                      {medicine.category || 'General'}
                      {medicine.batch_no
                        ? ` · Batch ${medicine.batch_no}`
                        : ''}
                    </p>

                  </div>

                  <div className="shrink-0 text-right">

                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      Stock: {medicine.stock ?? 0}
                    </span>

                  </div>

                </button>

              ))

            )}

          </div>

        </div>
      )}

    </div>
  );
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

  // INVENTORY
  const [medicines, setMedicines] = useState([]);

  // MULTIPLE RETURN ROWS
  const [returnItems, setReturnItems] = useState([
    createReturnRow(1)
  ]);

  const nextRowId = useRef(2);

  // RETURN HISTORY
  const [returns, setReturns] = useState([]);
  const [search, setSearch] = useState('');

  // LOADING AND MESSAGES
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');


  // --------------------------------------------------
  // UPDATE A RETURN ROW
  // --------------------------------------------------

  const updateReturnItem = useCallback((rowId, changes) => {

    setReturnItems(currentItems =>
      currentItems.map(item =>
        item.id === rowId
          ? { ...item, ...changes }
          : item
      )
    );

    setError('');
    setMessage('');

  }, []);


  // --------------------------------------------------
  // ADD A MEDICINE ROW
  // --------------------------------------------------

  function addReturnItem() {

    setReturnItems(currentItems => [
      ...currentItems,
      createReturnRow(nextRowId.current++)
    ]);

    setError('');
    setMessage('');
  }


  // --------------------------------------------------
  // REMOVE A MEDICINE ROW
  // --------------------------------------------------

  function removeReturnItem(rowId) {

    setReturnItems(currentItems => {

      if (currentItems.length <= 1) {
        return currentItems;
      }

      return currentItems.filter(item => item.id !== rowId);

    });

    setError('');
    setMessage('');
  }


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
  // FILTER RETURN HISTORY
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
  // RETURN SUMMARY
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
  // SELECTED MEDICINE SUMMARY
  // --------------------------------------------------

  const selectedReturnSummary = useMemo(() => {

    return returnItems.reduce((result, item) => {

      const medicine = medicines.find(
        med => med.id === item.medicineId
      );

      if (!medicine) return result;

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return result;
      }

      const price = Number(medicine.selling_price || 0);
      const expired = isMedicineExpired(medicine);

      const stockAdded =
        item.itemCondition === 'resellable' && !expired
          ? quantity
          : 0;

      result.items += 1;
      result.quantity += quantity;
      result.value += price * quantity;
      result.stockAdded += stockAdded;

      return result;

    }, {
      items: 0,
      quantity: 0,
      value: 0,
      stockAdded: 0
    });

  }, [returnItems, medicines]);


  // --------------------------------------------------
  // RECORD MULTIPLE MEDICINE RETURNS
  // --------------------------------------------------

  async function handleSubmitReturn(event) {

    event.preventDefault();

    if (saving) return;

    setError('');
    setMessage('');

    if (returnItems.length === 0) {
      setError('Please add at least one medicine.');
      return;
    }

    const usedMedicineIds = new Set();

    // Validate every medicine row before making any database calls.
    for (let index = 0; index < returnItems.length; index++) {

      const item = returnItems[index];
      const rowNumber = index + 1;

      const medicine = medicines.find(
        med => med.id === item.medicineId
      );

      if (!medicine) {
        setError(`Please select a medicine in return item ${rowNumber}.`);
        return;
      }

      if (usedMedicineIds.has(item.medicineId)) {
        setError(
          `${medicine.name} has been selected more than once. Please keep only one row for the same inventory medicine.`
        );
        return;
      }

      usedMedicineIds.add(item.medicineId);

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        setError(
          `Enter a valid whole-number quantity for ${medicine.name}.`
        );
        return;
      }

      if (
        !['resellable', 'not_resellable'].includes(item.itemCondition)
      ) {
        setError(
          `Please select a valid condition for ${medicine.name}.`
        );
        return;
      }

      if (!item.reason.trim() || item.reason.trim().length < 3) {
        setError(
          `Please enter a return reason of at least 3 characters for ${medicine.name}.`
        );
        return;
      }

    }

    setSaving(true);

    const successfulRows = [];
    let failedReturn = null;

    try {

      // Process one medicine at a time through the existing RPC.
      // Each individual RPC saves the return and adjusts stock atomically.

      for (const item of returnItems) {

        const medicine = medicines.find(
          med => med.id === item.medicineId
        );

        const numericQuantity = Number(item.quantity);

        try {

          const {
            data,
            error: returnError
          } = await supabase.rpc('record_medicine_return', {

            p_medicine_id: medicine.id,
            p_quantity: numericQuantity,
            p_reason: item.reason.trim(),
            p_item_condition: item.itemCondition

          });

          if (returnError) {
            throw returnError;
          }

          const savedReturn = Array.isArray(data)
            ? data[0]
            : data;

          if (!savedReturn) {
            throw new Error(
              'The database did not confirm this return. Check the return history before retrying.'
            );
          }

          successfulRows.push({
            rowId: item.id,
            medicineName: medicine.name,
            quantity: numericQuantity,
            stockAdded: Number(savedReturn.stock_added || 0)
          });

        } catch (err) {

          failedReturn = {
            item,
            medicineName: medicine.name,
            error: err.message || 'Unable to record this return.'
          };

          // Stop here so that unsuccessful and unprocessed rows
          // remain available for correction.
          break;
        }

      }

      // Remove only confirmed successful rows.
      // Failed and unprocessed rows stay in the form.

      const successfulIds = new Set(
        successfulRows.map(item => item.rowId)
      );

      if (successfulRows.length > 0) {

        setReturnItems(currentItems =>
          currentItems.filter(item => !successfulIds.has(item.id))
        );

        await fetchData();

        if (onRefresh) {
          await onRefresh();
        }

      }

      const totalSuccessfulStock = successfulRows.reduce(
        (sum, item) => sum + item.stockAdded,
        0
      );

      if (failedReturn) {

        if (successfulRows.length > 0) {

          setMessage(
            `${successfulRows.length} medicine return(s) recorded successfully. ${totalSuccessfulStock} unit(s) added to inventory.`
          );

          setError(
            `Could not record ${failedReturn.medicineName}: ${failedReturn.error} Successful returns have been removed from the form. Correct the remaining entries and submit again.`
          );

        } else {

          setError(
            `Could not record ${failedReturn.medicineName}: ${failedReturn.error}`
          );

        }

      } else {

        setReturnItems([
          createReturnRow(nextRowId.current++)
        ]);

        const totalUnits = successfulRows.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

        setMessage(
          `${successfulRows.length} medicine return(s) recorded successfully. ${totalUnits} unit(s) returned; ${totalSuccessfulStock} unit(s) added to available stock.`
        );

      }

    } catch (err) {

      setError(
        err.message || 'Unable to complete the medicine returns.'
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

      {/* PAGE HEADER */}

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
                Record one or multiple returned medicines and manage inventory stock.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading || saving}
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


      {/* NOTIFICATIONS */}

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


      {/* SUMMARY CARDS */}

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


      {/* MULTIPLE MEDICINE RETURN FORM */}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-visible">

        <div className="p-5 sm:p-6 border-b border-slate-100">

          <div className="flex items-center gap-2">

            <div className="w-9 h-9 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center">

              <Plus size={19} />

            </div>

            <div>

              <h3 className="font-black text-slate-900">
                Record New Returns
              </h3>

              <p className="text-[11px] text-slate-400 mt-0.5">
                Add multiple medicines and enter the return details for each one.
              </p>

            </div>

          </div>

        </div>


        <form
          onSubmit={handleSubmitReturn}
          className="p-5 sm:p-6 space-y-5"
        >

          {/* MEDICINE ROWS */}

          <div className="space-y-4">

            {returnItems.map((item, index) => {

              const selectedMedicine = medicines.find(
                medicine => medicine.id === item.medicineId
              ) || null;

              const quantity = Number(item.quantity);

              const validQuantity =
                Number.isInteger(quantity) && quantity > 0;

              const unitPrice = Number(
                selectedMedicine?.selling_price || 0
              );

              const expired = isMedicineExpired(selectedMedicine);

              const expectedStockAdded =
                selectedMedicine &&
                item.itemCondition === 'resellable' &&
                !expired &&
                validQuantity
                  ? quantity
                  : 0;

              const estimatedReturnValue =
                selectedMedicine && validQuantity
                  ? unitPrice * quantity
                  : 0;

              const excludedIds = returnItems
                .filter(other => other.id !== item.id)
                .map(other => other.medicineId)
                .filter(Boolean);

              return (

                <div
                  key={item.id}
                  className="relative bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4"
                >

                  {/* ROW HEADER */}

                  <div className="flex items-center justify-between gap-3">

                    <div className="flex items-center gap-2">

                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">
                        {index + 1}
                      </div>

                      <div>

                        <p className="text-sm font-black text-slate-800">
                          Medicine Return #{index + 1}
                        </p>

                        <p className="text-[10px] text-slate-400">
                          Enter details for this medicine
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() => removeReturnItem(item.id)}
                      disabled={saving || returnItems.length === 1}
                      className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove this medicine"
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>


                  {/* SEARCHABLE MEDICINE SELECT */}

                  <div className="space-y-2">

                    <label className="text-xs font-bold text-slate-600">
                      Select Medicine
                    </label>

                    <SearchableMedicineSelect
                      medicines={medicines}
                      value={item.medicineId}
                      excludedIds={excludedIds}
                      disabled={loading || saving}
                      onChange={medicineId =>
                        updateReturnItem(item.id, {
                          medicineId
                        })
                      }
                    />

                  </div>


                  {/* MEDICINE DETAILS */}

                  {selectedMedicine && (

                    <div className="bg-white border border-slate-200 rounded-xl p-4">

                      <div className="flex items-center gap-2 mb-3">

                        <Package
                          size={16}
                          className="text-emerald-700"
                        />

                        <p className="font-black text-xs text-slate-900">
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

                      {expired && (

                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2">

                          <AlertTriangle
                            size={16}
                            className="text-amber-700 shrink-0"
                          />

                          <p className="text-[11px] text-amber-800 font-semibold">
                            This medicine has expired. A return can be recorded, but the quantity will not be added to saleable stock.
                          </p>

                        </div>

                      )}

                    </div>

                  )}


                  {/* QUANTITY AND CONDITION */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="space-y-2">

                      <label className="text-xs font-bold text-slate-600">
                        Returned Quantity
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={event =>
                          updateReturnItem(item.id, {
                            quantity: event.target.value
                          })
                        }
                        placeholder="Enter quantity"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600"
                        disabled={saving}
                      />

                    </div>


                    <div className="space-y-2">

                      <label className="text-xs font-bold text-slate-600">
                        Returned Item Condition
                      </label>

                      <select
                        value={item.itemCondition}
                        onChange={event =>
                          updateReturnItem(item.id, {
                            itemCondition: event.target.value
                          })
                        }
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-emerald-600"
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
                      rows="2"
                      value={item.reason}
                      onChange={event =>
                        updateReturnItem(item.id, {
                          reason: event.target.value.slice(0, 250)
                        })
                      }
                      maxLength={250}
                      placeholder="Enter the reason for returning this medicine..."
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none resize-y focus:border-emerald-600"
                      disabled={saving}
                    />

                    <p className="text-right text-[10px] text-slate-400">
                      {item.reason.length}/250 characters
                    </p>

                  </div>


                  {/* INDIVIDUAL RETURN VALUE */}

                  {selectedMedicine && (

                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2">

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
                          {validQuantity ? quantity : '—'}
                        </span>

                      </div>

                      <div className="border-t border-emerald-200 pt-3 flex justify-between items-center gap-3">

                        <span className="font-black text-slate-900 text-sm">
                          Return Value
                        </span>

                        <span className="text-lg font-black text-emerald-800">
                          {formatCurrency(estimatedReturnValue)}
                        </span>

                      </div>

                      <div className="text-[10px] font-semibold text-emerald-800">

                        {expectedStockAdded > 0
                          ? `${expectedStockAdded} unit(s) will be added to inventory.`
                          : 'No units will be added to available stock.'}

                      </div>

                    </div>

                  )}

                </div>

              );

            })}

          </div>


          {/* ADD ANOTHER MEDICINE */}

          <button
            type="button"
            onClick={addReturnItem}
            disabled={
              saving ||
              loading ||
              medicines.length === 0 ||
              returnItems.length >= medicines.length
            }
            className="w-full border-2 border-dashed border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-800 rounded-2xl p-4 flex items-center justify-center gap-2 text-sm font-black transition disabled:opacity-40 disabled:cursor-not-allowed"
          >

            <Plus size={18} />

            Add Another Medicine

          </button>


          {/* EMPTY INVENTORY MESSAGE */}

          {medicines.length === 0 && !loading && (

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
              No medicines are currently available in inventory.
            </div>

          )}


          {/* TOTAL RETURN SUMMARY */}

          <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-4">

            <div className="flex items-center justify-between gap-3">

              <div>

                <p className="text-xs font-bold text-slate-300">
                  Combined Return Summary
                </p>

                <p className="text-[10px] text-slate-400 mt-1">
                  All selected medicines
                </p>

              </div>

              <Package
                size={22}
                className="text-emerald-400"
              />

            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

              <div>

                <p className="text-[10px] uppercase text-slate-400 font-bold">
                  Medicines
                </p>

                <p className="text-xl font-black mt-1">
                  {selectedReturnSummary.items}
                </p>

              </div>

              <div>

                <p className="text-[10px] uppercase text-slate-400 font-bold">
                  Total Units
                </p>

                <p className="text-xl font-black mt-1">
                  {selectedReturnSummary.quantity}
                </p>

              </div>

              <div>

                <p className="text-[10px] uppercase text-slate-400 font-bold">
                  Stock Added
                </p>

                <p className="text-xl font-black text-emerald-400 mt-1">
                  {selectedReturnSummary.stockAdded}
                </p>

              </div>

              <div>

                <p className="text-[10px] uppercase text-slate-400 font-bold">
                  Total Value
                </p>

                <p className="text-lg sm:text-xl font-black text-emerald-400 mt-1 break-words">
                  {formatCurrency(selectedReturnSummary.value)}
                </p>

              </div>

            </div>

          </div>


          {/* SUBMIT */}

          <button
            type="submit"
            disabled={saving || loading || medicines.length === 0}
            className="w-full px-7 py-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black shadow-md transition flex items-center justify-center gap-2"
          >

            {saving ? (

              <>
                <Loader2 size={18} className="animate-spin" />
                Recording Medicine Returns...
              </>

            ) : (

              <>
                <RotateCcw size={18} />
                Record {returnItems.length} Medicine Return{returnItems.length === 1 ? '' : 's'}
              </>

            )}

          </button>

          <p className="text-center text-[10px] text-slate-400">
            Each medicine is recorded separately using your existing secure return function.
          </p>

        </form>

      </div>


      {/* RECENT RETURNS HISTORY */}

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
              onChange={event => setSearch(event.target.value)}
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

                <div
                  key={item.id}
                  className="p-4 space-y-3"
                >

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

                  <div className="flex flex-wrap items-center gap-2">

                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      item.item_condition === 'resellable'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {item.item_condition === 'resellable'
                        ? 'Resellable'
                        : 'Not Resellable'}
                    </span>

                  </div>

                  <div className="text-[11px] text-slate-500 break-words">
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
