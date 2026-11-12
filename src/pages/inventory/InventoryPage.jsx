
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Package,
  Plus,
  Trash2,
  Edit3,
  X,
  Search,
  Tag,
  Calendar,
  Layers,
  Hash,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Filter,
  IndianRupee,
  Clock,
  Boxes
} from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  category: '',
  batch_no: '',
  expiry_date: '',
  price: '',
  stock: ''
};

const inputClass =
  'w-full min-w-0 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition';

const money = value =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getExpiryStatus = expiryDate => {
  if (!expiryDate) return 'none';

  const today = todayKey();

  if (expiryDate < today) return 'expired';

  const expiry = new Date(`${expiryDate}T00:00:00`);
  const current = new Date(`${today}T00:00:00`);

  const days = Math.ceil(
    (expiry.getTime() - current.getTime()) / 86400000
  );

  if (days <= 60) return 'soon';

  return 'healthy';
};

const formatDate = value => {
  if (!value) return 'Not specified';

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
};

export default function InventoryPage() {
  const [medicines, setMedicines] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');

  const [newMed, setNewMed] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('medicines')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setMedicines(data || []);
    } catch (err) {
      console.error('Inventory loading error:', err);
      setError(`Unable to load inventory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(
        medicines
          .map(m => (m.category || 'General').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return ['All', ...unique];
  }, [medicines]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      const q = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !q ||
        [m.name, m.category, m.batch_no].some(value =>
          String(value || '').toLowerCase().includes(q)
        );

      const matchesCategory =
        categoryFilter === 'All' ||
        (m.category || 'General').trim().toLowerCase() ===
          categoryFilter.toLowerCase();

      const stock = Number(m.stock || 0);

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && stock > 0 && stock <= 5) ||
        (stockFilter === 'out' && stock <= 0) ||
        (stockFilter === 'healthy' && stock > 5);

      const expiryStatus = getExpiryStatus(m.expiry_date);

      const matchesExpiry =
        expiryFilter === 'all' ||
        (expiryFilter === 'expired' && expiryStatus === 'expired') ||
        (expiryFilter === 'soon' && expiryStatus === 'soon') ||
        (expiryFilter === 'valid' && expiryStatus === 'healthy');

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock &&
        matchesExpiry
      );
    });
  }, [
    medicines,
    searchQuery,
    categoryFilter,
    stockFilter,
    expiryFilter
  ]);

  const totalUnits = medicines.reduce(
    (sum, m) => sum + Math.max(0, Number(m.stock || 0)),
    0
  );

  const lowStockCount = medicines.filter(m => {
    const stock = Number(m.stock || 0);
    return stock > 0 && stock <= 5;
  }).length;

  const outOfStockCount = medicines.filter(
    m => Number(m.stock || 0) <= 0
  ).length;

  const expiredCount = medicines.filter(
    m => getExpiryStatus(m.expiry_date) === 'expired'
  ).length;

  const nearExpiryCount = medicines.filter(
    m => getExpiryStatus(m.expiry_date) === 'soon'
  ).length;

  function resetForm() {
    setNewMed(EMPTY_FORM);
    setEditingId(null);
  }

  function handleEditClick(med) {
    setEditingId(med.id);

    setNewMed({
      name: med.name || '',
      category: med.category || '',
      batch_no: med.batch_no || '',
      expiry_date: med.expiry_date || '',
      price: String(med.selling_price ?? med.price ?? ''),
      stock: String(med.stock ?? 0)
    });

    setError('');
    setNotice('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async function handleSaveMedicine(e) {
    e.preventDefault();

    if (saving) return;

    const name = newMed.name.trim();
    const price = Number(newMed.price);
    const stock = Number(newMed.stock);

    if (!name) {
      setError('Please enter a medicine name.');
      return;
    }

    if (
      newMed.price === '' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError('Please enter a valid selling price.');
      return;
    }

    if (
      newMed.stock === '' ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      setError('Stock must be a whole number greater than or equal to zero.');
      return;
    }

    if (
      newMed.expiry_date &&
      newMed.expiry_date < todayKey()
    ) {
      const confirmExpired = window.confirm(
        'The entered expiry date is in the past. Do you still want to save this medicine?'
      );

      if (!confirmExpired) return;
    }

    const itemData = {
      name,
      category: newMed.category.trim(),
      batch_no: newMed.batch_no.trim(),
      expiry_date: newMed.expiry_date || null,
      selling_price: price,
      stock
    };

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const result = editingId
        ? await supabase
            .from('medicines')
            .update(itemData)
            .eq('id', editingId)
        : await supabase
            .from('medicines')
            .insert([itemData]);

      if (result.error) throw result.error;

      setNotice(
        editingId
          ? 'Medicine details updated successfully.'
          : 'New medicine added successfully.'
      );

      resetForm();

      await fetchMedicines();

    } catch (err) {
      console.error('Medicine save error:', err);
      setError(`Unable to save medicine: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMedicine(med) {
    const confirmed = window.confirm(
      `Delete "${med.name}" from the medicine catalog? Existing bill history will remain unchanged.`
    );

    if (!confirmed || deletingId) return;

    setDeletingId(med.id);
    setError('');
    setNotice('');

    try {
      const { error: deleteError } = await supabase
        .from('medicines')
        .delete()
        .eq('id', med.id);

      if (deleteError) throw deleteError;

      setNotice(`${med.name} deleted from inventory.`);

      if (editingId === med.id) resetForm();

      await fetchMedicines();

    } catch (err) {
      console.error('Delete medicine error:', err);
      setError(`Unable to delete medicine: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  function stockBadge(stock) {
    const value = Number(stock || 0);

    if (value <= 0) {
      return 'bg-rose-50 text-rose-700';
    }

    if (value <= 5) {
      return 'bg-amber-50 text-amber-700';
    }

    return 'bg-emerald-50 text-emerald-700';
  }

  function expiryBadge(status) {
    if (status === 'expired') {
      return 'bg-rose-50 text-rose-700';
    }

    if (status === 'soon') {
      return 'bg-amber-50 text-amber-700';
    }

    return 'bg-emerald-50 text-emerald-700';
  }

  function renderActions(med) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleEditClick(med)}
          className="p-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
          title="Edit medicine"
          aria-label={`Edit ${med.name}`}
        >
          <Edit3 size={16} />
        </button>

        <button
          type="button"
          onClick={() => handleDeleteMedicine(med)}
          disabled={deletingId === med.id || deletingId !== null}
          className="p-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
          title="Delete medicine"
          aria-label={`Delete ${med.name}`}
        >
          {deletingId === med.id
            ? <RefreshCw size={16} className="animate-spin" />
            : <Trash2 size={16} />}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">

      {/* Notifications */}

      {(error || notice) && (
        <div
          role="alert"
          className={`rounded-2xl border p-3 sm:p-4 text-sm font-semibold flex items-start gap-3 ${
            error
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          {error
            ? <AlertTriangle size={19} className="shrink-0 mt-0.5" />
            : <CheckCircle2 size={19} className="shrink-0 mt-0.5" />}

          <span className="flex-1 break-words">
            {error || notice}
          </span>

          <button
            type="button"
            onClick={() => {
              setError('');
              setNotice('');
            }}
            aria-label="Dismiss message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Page Heading */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Medicine Inventory
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage medicines, batches, pricing and stock levels.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMedicines}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">

        {[
          {
            label: 'Catalog Medicines',
            value: medicines.length,
            tone: 'text-slate-900',
            icon: Package,
            iconTone: 'bg-slate-100 text-slate-600'
          },
          {
            label: 'Total Available Units',
            value: totalUnits.toLocaleString('en-IN'),
            tone: 'text-emerald-700',
            icon: Boxes,
            iconTone: 'bg-emerald-50 text-emerald-700'
          },
          {
            label: 'Low Stock (1–5)',
            value: lowStockCount,
            tone: 'text-amber-600',
            icon: AlertTriangle,
            iconTone: 'bg-amber-50 text-amber-700'
          },
          {
            label: 'Out of Stock',
            value: outOfStockCount,
            tone: 'text-rose-600',
            icon: Package,
            iconTone: 'bg-rose-50 text-rose-700'
          }
        ].map(card => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm min-w-0"
            >
              <div className="flex justify-between items-center gap-2">
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {card.label}
                </p>

                <div className={`p-2 rounded-xl ${card.iconTone}`}>
                  <Icon size={17} />
                </div>
              </div>

              <p className={`text-2xl sm:text-3xl font-black mt-3 ${card.tone}`}>
                {loading ? '...' : card.value}
              </p>
            </div>
          );
        })}

      </div>

      {/* Expiry Alerts */}

      {(expiredCount > 0 || nearExpiryCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {expiredCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex gap-3">
              <AlertTriangle
                size={20}
                className="text-rose-600 shrink-0"
              />

              <div>
                <p className="font-bold text-rose-800 text-sm">
                  {expiredCount} Expired Medicines
                </p>

                <p className="text-xs text-rose-700 mt-1">
                  Review these products and prevent dispensing expired stock.
                </p>
              </div>
            </div>
          )}

          {nearExpiryCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <Clock
                size={20}
                className="text-amber-600 shrink-0"
              />

              <div>
                <p className="font-bold text-amber-800 text-sm">
                  {nearExpiryCount} Medicines Expiring Soon
                </p>

                <p className="text-xs text-amber-700 mt-1">
                  These medicines have an expiry date within the next 60 days.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Add / Edit Medicine Form */}

      <section
        className="bg-white p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm"
      >

        <div className="flex flex-wrap justify-between items-center gap-3 mb-5 pb-4 border-b border-slate-100">

          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl text-white ${
                editingId ? 'bg-amber-600' : 'bg-emerald-700'
              }`}
            >
              {editingId
                ? <Edit3 size={20} />
                : <Plus size={20} />}
            </div>

            <div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg">
                {editingId ? 'Edit Medicine' : 'Add New Medicine'}
              </h3>

              <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                Enter the medicine information below.
              </p>
            </div>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-1"
            >
              <X size={14} />
              Cancel
            </button>
          )}

        </div>

        <form
          onSubmit={handleSaveMedicine}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        >

          <label className="min-w-0 space-y-1.5">
            <span className="text-xs font-bold text-slate-600">
              Medicine Name *
            </span>

            <div className="relative">
              <Tag
                size={16}
                className="absolute left-3.5 top-3.5 text-slate-400"
              />

              <input
                className={`${inputClass} pl-10`}
                value={newMed.name}
                onChange={e =>
                  setNewMed(p => ({ ...p, name: e.target.value }))
                }
                placeholder="Enter medicine name"
                maxLength={150}
                required
              />
            </div>
          </label>

          <label className="min-w-0 space-y-1.5">
            <span className="text-xs font-bold text-slate-600">
              Category
            </span>

            <div className="relative">
              <Layers
                size={16}
                className="absolute left-3.5 top-3.5 text-slate-400"
              />

              <input
                className={`${inputClass} pl-10`}
                value={newMed.category}
                onChange={e =>
                  setNewMed(p => ({ ...p, category: e.target.value }))
                }
                placeholder="Tablet, Cream, Syrup..."
                maxLength={100}
              />
            </div>
          </label>

          <label className="min-w-0 space-y-1.5">
            <span className="text-xs font-bold text-slate-600">
              Batch Number
            </span>

            <div className="relative">
              <Hash
                size={16}
                className="absolute left-3.5 top-3.5 text-slate-400"
              />

              <input
                className={`${inputClass} pl-10`}
                value={newMed.batch_no}
                onChange={e =>
                  setNewMed(p => ({ ...p, batch_no: e.target.value }))
                }
                placeholder="Enter batch number"
                maxLength={100}
              />
            </div>
          </label>

          <label className="min-w-0 space-y-1.5">
            <span className="text-xs font-bold text-slate-600">
              Expiry Date
            </span>

            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none"
              />

              <input
                type="date"
                className={`${inputClass} pl-10`}
                value={newMed.expiry_date}
                onChange={e =>
                  setNewMed(p => ({ ...p, expiry_date: e.target.value }))
                }
              />
            </div>
          </label>

          <label className="min-w-0 space-y-1.5">
            <span className="text-xs font-bold text-slate-600">
              Selling Price (₹) *
            </span>

            <div className="relative">
              <IndianRupee
                size={16}
                className="absolute left-3.5 top-3.5 text-slate-400"
              />

              <input
                type="number"
                min="0"
                step="0.01"
                className={`${inputClass} pl-10`}
                value={newMed.price}
                onChange={e =>
                  setNewMed(p => ({ ...p, price: e.target.value }))
                }
                placeholder="0.00"
                required
              />
            </div>
          </label>

          <label className="min-w-0 space-y-1.5">
            <span className="text-xs font-bold text-slate-600">
              Current Stock *
            </span>

            <div className="relative">
              <Package
                size={16}
                className="absolute left-3.5 top-3.5 text-slate-400"
              />

              <input
                type="number"
                min="0"
                step="1"
                className={`${inputClass} pl-10`}
                value={newMed.stock}
                onChange={e =>
                  setNewMed(p => ({ ...p, stock: e.target.value }))
                }
                placeholder="0"
                required
              />
            </div>
          </label>

          <div className="sm:col-span-2 xl:col-span-3 flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className={`px-6 py-3 rounded-xl text-white font-bold text-sm transition disabled:opacity-60 ${
                editingId
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Update Medicine'
                  : 'Save Medicine'}
            </button>

          </div>

        </form>

      </section>

      {/* Inventory Catalog */}

      <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

        <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4">

          <div className="flex flex-wrap justify-between items-center gap-3">

            <div>
              <h3 className="font-black text-slate-900 flex items-center gap-2">
                <Package size={19} className="text-emerald-700" />
                Inventory Catalog
              </h3>

              <p className="text-xs text-slate-400 mt-1">
                Showing {filteredMedicines.length} of {medicines.length} medicines
              </p>
            </div>

            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
              {totalUnits.toLocaleString('en-IN')} total units
            </div>

          </div>

          {/* Search */}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            <div className="relative md:col-span-2">
              <Search
                size={17}
                className="absolute left-4 top-3.5 text-slate-400"
              />

              <input
                className={`${inputClass} pl-11`}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search medicine, category or batch number..."
              />
            </div>

            <select
              className={inputClass}
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'All' ? 'All Categories' : category}
                </option>
              ))}
            </select>

          </div>

          {/* Stock Filters */}

          <div className="space-y-2">

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Filter size={14} />
              Stock Filter
            </div>

            <div className="flex flex-wrap gap-2">

              {[
                ['all', 'All Stock'],
                ['low', 'Low Stock'],
                ['out', 'Out of Stock'],
                ['healthy', 'Healthy Stock']
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStockFilter(id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                    stockFilter === id
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}

            </div>

          </div>

          {/* Expiry Filters */}

          <div className="space-y-2">

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Calendar size={14} />
              Expiry Filter
            </div>

            <div className="flex flex-wrap gap-2">

              {[
                ['all', 'All Expiry'],
                ['expired', 'Expired'],
                ['soon', 'Expiring Soon'],
                ['valid', 'Valid']
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setExpiryFilter(id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                    expiryFilter === id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}

            </div>

          </div>

        </div>

        {/* Loading */}

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw size={28} className="animate-spin mb-3 text-emerald-700" />
            <p className="text-sm font-semibold">Loading inventory...</p>
          </div>
        ) : filteredMedicines.length === 0 ? (

          <div className="py-16 px-5 text-center">
            <Package size={38} className="mx-auto text-slate-300 mb-3" />

            <h4 className="font-bold text-slate-700">
              No medicines found
            </h4>

            <p className="text-xs text-slate-400 mt-2">
              Try changing your search or filters.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('All');
                setStockFilter('all');
                setExpiryFilter('all');
              }}
              className="mt-4 text-xs font-bold text-emerald-700"
            >
              Clear all filters
            </button>
          </div>

        ) : (

          <>

            {/* MOBILE AND TABLET CARDS */}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3 p-3 sm:p-4">

              {filteredMedicines.map(med => {
                const stock = Number(med.stock || 0);
                const expiryStatus = getExpiryStatus(med.expiry_date);

                return (
                  <article
                    key={med.id}
                    className="border border-slate-200 rounded-2xl p-4 hover:border-emerald-300 transition min-w-0"
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">
                        <h4 className="font-black text-slate-900 text-sm sm:text-base break-words">
                          {med.name}
                        </h4>

                        <p className="text-xs text-slate-500 mt-1">
                          {med.category || 'General'}
                        </p>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shrink-0 ${stockBadge(stock)}`}>
                        {stock <= 0
                          ? 'OUT OF STOCK'
                          : stock <= 5
                            ? 'LOW STOCK'
                            : 'IN STOCK'}
                      </span>

                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">

                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Selling Price
                        </p>

                        <p className="text-sm font-black text-emerald-700 mt-1">
                          {money(med.selling_price ?? med.price)}
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                          Stock Quantity
                        </p>

                        <p className="text-sm font-black text-slate-900 mt-1">
                          {stock} units
                        </p>
                      </div>

                    </div>

                    <div className="mt-3 space-y-2">

                      <div className="flex justify-between gap-2 text-xs">
                        <span className="text-slate-400">Batch Number</span>
                        <span className="font-semibold text-slate-700 break-all text-right">
                          {med.batch_no || 'Not specified'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-2 text-xs">
                        <span className="text-slate-400">Expiry Date</span>

                        <span className={`px-2 py-1 rounded-lg font-bold ${expiryBadge(expiryStatus)}`}>
                          {expiryStatus === 'expired'
                            ? 'Expired'
                            : expiryStatus === 'soon'
                              ? 'Expiring Soon'
                              : expiryStatus === 'healthy'
                                ? 'Valid'
                                : 'Not specified'}
                          {med.expiry_date
                            ? ` · ${formatDate(med.expiry_date)}`
                            : ''}
                        </span>
                      </div>

                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">

                      <span className="text-[10px] text-slate-400 font-semibold">
                        Medicine ID: {String(med.id).slice(0, 8)}
                      </span>

                      {renderActions(med)}

                    </div>

                  </article>
                );
              })}

            </div>

            {/* DESKTOP TABLE */}

            <div className="hidden lg:block overflow-x-auto">

              <table className="w-full text-left text-sm min-w-[950px]">

                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-wider">
                    <th className="p-4">Medicine</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Batch</th>
                    <th className="p-4">Expiry</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">

                  {filteredMedicines.map(med => {
                    const stock = Number(med.stock || 0);
                    const expiryStatus = getExpiryStatus(med.expiry_date);

                    return (
                      <tr
                        key={med.id}
                        className="hover:bg-slate-50/70 transition"
                      >

                        <td className="p-4">
                          <p className="font-bold text-slate-900">
                            {med.name}
                          </p>
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold">
                            {med.category || 'General'}
                          </span>
                        </td>

                        <td className="p-4 text-xs text-slate-500 font-mono">
                          {med.batch_no || '—'}
                        </td>

                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${expiryBadge(expiryStatus)}`}>
                            {expiryStatus === 'expired'
                              ? 'EXPIRED'
                              : expiryStatus === 'soon'
                                ? 'EXPIRING SOON'
                                : expiryStatus === 'healthy'
                                  ? 'VALID'
                                  : '—'}
                          </span>

                          <p className="text-xs text-slate-500 mt-1">
                            {formatDate(med.expiry_date)}
                          </p>
                        </td>

                        <td className="p-4 font-black text-emerald-700">
                          {money(med.selling_price ?? med.price)}
                        </td>

                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold ${stockBadge(stock)}`}>
                            {stock} units
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex justify-end">
                            {renderActions(med)}
                          </div>
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

          </>

        )}

      </section>

      {/* Footer Note */}

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-700">Inventory reminder:</strong>{' '}
          Verify batch numbers and expiry dates before dispensing.
          Returned medicines should be processed through the Medicine
          Returns section so that the return history is maintained.
        </p>
      </div>

    </div>
  );
}
