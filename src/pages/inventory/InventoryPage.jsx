import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Plus, Trash2, Edit3, X, Search, Tag, Calendar, Layers, Hash } from 'lucide-react';

export default function InventoryPage() {
  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMed, setNewMed] = useState({ name: '', category: '', batch_no: '', expiry_date: '', price: '', stock: '' });
  const [editingId, setEditingId] = useState(null);

  // Refs for auto-advancing on Enter
  const inputRefs = useRef([]);

  useEffect(() => {
    fetchMedicines();
  }, []);

  async function fetchMedicines() {
    const { data } = await supabase.from('medicines').select('*').order('name');
    if (data) setMedicines(data);
  }

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index < inputRefs.current.length - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        handleSaveMedicine(e);
      }
    }
  };

  const handleSaveMedicine = async (e) => {
    e.preventDefault();
    const itemData = {
      name: newMed.name || 'Unnamed Medicine',
      category: newMed.category || '',
      batch_no: newMed.batch_no || '',
      expiry_date: newMed.expiry_date || null,
      selling_price: newMed.price ? Number(newMed.price) : 0,
      stock: newMed.stock ? Number(newMed.stock) : 0
    };

    if (editingId) {
      const { error } = await supabase.from('medicines').update(itemData).eq('id', editingId);
      if (error) alert('Error updating: ' + error.message);
      else {
        setNewMed({ name: '', category: '', batch_no: '', expiry_date: '', price: '', stock: '' });
        setEditingId(null);
        fetchMedicines();
        alert('Medicine updated successfully!');
      }
    } else {
      const { error } = await supabase.from('medicines').insert([itemData]);
      if (error) alert('Error: ' + error.message);
      else {
        setNewMed({ name: '', category: '', batch_no: '', expiry_date: '', price: '', stock: '' });
        fetchMedicines();
        inputRefs.current[0]?.focus();
      }
    }
  };

  const handleEditClick = (med) => {
    setEditingId(med.id);
    setNewMed({
      name: med.name || '',
      category: med.category || '',
      batch_no: med.batch_no || '',
      expiry_date: med.expiry_date || '',
      price: med.selling_price || '',
      stock: med.stock || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewMed({ name: '', category: '', batch_no: '', expiry_date: '', price: '', stock: '' });
  };

  const handleDeleteMedicine = async (id) => {
    if (confirm('Are you sure you want to delete this medicine?')) {
      await supabase.from('medicines').delete().eq('id', id);
      fetchMedicines();
    }
  };

  const filteredMedicines = medicines.filter(m => (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.category || '').toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Enhanced Add / Edit Form Card (Clean 2-Row Grid) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm transition-all">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl text-white shadow-sm ${editingId ? 'bg-amber-600' : 'bg-emerald-700'}`}>
              {editingId ? <Edit3 size={20}/> : <Plus size={20}/>}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                {editingId ? 'Edit Medicine Details' : 'Add New Medicine Catalog Item'}
              </h3>
              <p className="text-xs text-slate-400">Press Enter to move to next field & save instantly</p>
            </div>
          </div>
          {editingId && (
            <button onClick={cancelEdit} className="text-xs font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition">
              <X size={14}/> Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSaveMedicine} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-slate-400"><Tag size={16}/></span>
            <input 
              ref={el => inputRefs.current[0] = el}
              onKeyDown={e => handleKeyDown(e, 0)}
              type="text" 
              placeholder="Medicine Name" 
              value={newMed.name} 
              onChange={e => setNewMed({...newMed, name: e.target.value})} 
              className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium" 
            />
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-slate-400"><Layers size={16}/></span>
            <input 
              ref={el => inputRefs.current[1] = el}
              onKeyDown={e => handleKeyDown(e, 1)}
              type="text" 
              placeholder="Category (e.g. Tablet, Syrup)" 
              value={newMed.category} 
              onChange={e => setNewMed({...newMed, category: e.target.value})} 
              className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium" 
            />
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-slate-400"><Hash size={16}/></span>
            <input 
              ref={el => inputRefs.current[2] = el}
              onKeyDown={e => handleKeyDown(e, 2)}
              type="text" 
              placeholder="Batch No" 
              value={newMed.batch_no} 
              onChange={e => setNewMed({...newMed, batch_no: e.target.value})} 
              className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium" 
            />
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-slate-400"><Calendar size={16}/></span>
            <input 
              ref={el => inputRefs.current[3] = el}
              onKeyDown={e => handleKeyDown(e, 3)}
              type="date" 
              value={newMed.expiry_date} 
              onChange={e => setNewMed({...newMed, expiry_date: e.target.value})} 
              className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-medium text-slate-600" 
            />
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-3.5 text-emerald-700 font-bold">₹</span>
            <input 
              ref={el => inputRefs.current[4] = el}
              onKeyDown={e => handleKeyDown(e, 4)}
              type="number" 
              placeholder="Price (₹)" 
              value={newMed.price} 
              onChange={e => setNewMed({...newMed, price: e.target.value})} 
              className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-black text-emerald-700" 
            />
          </div>

          <div className="flex gap-2">
            <input 
              ref={el => inputRefs.current[5] = el}
              onKeyDown={e => handleKeyDown(e, 5)}
              type="number" 
              placeholder="Stock Qty" 
              value={newMed.stock} 
              onChange={e => setNewMed({...newMed, stock: e.target.value})} 
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500 font-bold text-center" 
            />
            <button 
              type="submit" 
              className={`font-bold px-8 py-3.5 rounded-2xl text-sm text-white transition shadow-sm shrink-0 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800'}`}
            >
              {editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {/* Inventory Catalog Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-700"><Package size={20}/></div>
            <div>
              <h3 className="font-black text-slate-900">Inventory Catalog</h3>
              <p className="text-xs text-slate-400">{filteredMedicines.length} items registered in system</p>
            </div>
          </div>
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-4 top-3.5 text-slate-400"/>
            <input type="text" placeholder="Search inventory name or category..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-emerald-500"/>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/70 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 sm:p-5">Medicine Name</th>
                <th className="p-4 sm:p-5">Category</th>
                <th className="p-4 sm:p-5">Batch No</th>
                <th className="p-4 sm:p-5">Expiry Date</th>
                <th className="p-4 sm:p-5">Price</th>
                <th className="p-4 sm:p-5">Stock Qty</th>
                <th className="p-4 sm:p-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400 text-xs">No medicines found in catalog.</td>
                </tr>
              ) : (
                filteredMedicines.map(med => (
                  <tr key={med.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-4 sm:p-5 font-bold text-slate-900">{med.name}</td>
                    <td className="p-4 sm:p-5"><span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">{med.category || 'General'}</span></td>
                    <td className="p-4 sm:p-5 text-slate-500 text-xs font-mono">{med.batch_no || '-'}</td>
                    <td className="p-4 sm:p-5 text-slate-500 text-xs">{med.expiry_date || '-'}</td>
                    <td className="p-4 sm:p-5 text-emerald-700 font-black text-base">₹{med.selling_price || 0}</td>
                    <td className="p-4 sm:p-5">
                      <span className={`px-3 py-1 rounded-xl text-xs font-extrabold shadow-sm ${(med.stock || 0) > 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                        {med.stock || 0} units
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-right flex items-center justify-end gap-1.5">
                      <button onClick={() => handleEditClick(med)} className="p-2.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-2xl transition shadow-sm" title="Edit Medicine">
                        <Edit3 size={16}/>
                      </button>
                      <button onClick={() => handleDeleteMedicine(med.id)} className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-2xl transition shadow-sm" title="Delete Medicine">
                        <Trash2 size={16}/>
                      </button>
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