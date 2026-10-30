import React, { useEffect, useState } from 'react';
import { supabase } from '../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../ui/Spinner';
import { useAuth } from '../../Context/Auth';
import { useLanguage } from '../../Context/LanguageContext';
import { MdAdd, MdCheckCircle, MdLayers, MdClose, MdEdit, MdDelete } from 'react-icons/md';
import {
  fetchAllUomsSafe,
  setLocalActiveOverride,
  saveCustomLocalUom,
  deleteCustomLocalUom,
  UomItem
} from '../../service/uomService';

const CATEGORY_OPTIONS = [
  'Count & Units',
  'Packaging & Containers',
  'Area & Surface',
  'Length & Distance',
  'Weight & Mass',
  'Volume & Liquid'
];

const UomManager = () => {
  const { tenantId } = useAuth();
  const { isRTL } = useLanguage();

  const getCategoryLabel = (cat: string) => {
    if (!isRTL) return cat;
    const map: Record<string, string> = {
      'Count & Units': 'شمار اور اکائیاں',
      'Packaging & Containers': 'پیکنگ اور کنٹینرز',
      'Area & Surface': 'رقبہ اور سطح',
      'Length & Distance': 'لمبائی اور فاصلہ',
      'Weight & Mass': 'وزن اور کمیت',
      'Volume & Liquid': 'حجم اور مائع',
    };
    return map[cat] || cat;
  };

  const getUomLabel = (name: string) => {
    if (!isRTL || !name) return name;
    const map: Record<string, string> = {
      'Box / Carton': 'ڈبہ / کارٹن',
      'Pieces': 'تھان / پیس',
      'Numbers': 'تعداد',
      'Each': 'فی عدد',
      'Sets': 'سیٹ',
      'Pairs': 'جوڑا',
      'Dozen (12 Pcs)': 'درجن (12 پیس)',
      'Carton': 'کارٹن',
      'Packet / Pack': 'پیکٹ',
      'Bag / Sack': 'تھیلا / بوری',
      'Bundle': 'بنڈل',
      'Roll': 'تھان / رول',
      'Square Feet (Sq. Ft)': 'مربع فٹ',
      'Square Meter (Sq. Mtr)': 'مربع میٹر',
      'Square Yard (Guz)': 'مربع گز',
      'Meter (Linear Mtr)': 'میٹر',
      'Foot / Feet': 'فٹ',
      'Inches': 'انچ',
      'Millimeter': 'ملی میٹر',
      'Yard (Guz)': 'گز',
      'Kilogram (Kg)': 'کلوگرام',
      'Gram (g)': 'گرام',
      'Metric Ton': 'میٹرک ٹن',
      'Pound (lb)': 'پاؤنڈ',
      'Liter (Ltr)': 'لیٹر',
      'Milliliter (ml)': 'ملی لیٹر',
      'Gallon': 'گیلن'
    };
    return map[name] || name;
  };

  const [uoms, setUoms] = useState<UomItem[]>([]);
  const [uomUsageCounts, setUomUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Count & Units');
  const [savingNew, setSavingNew] = useState(false);

  // Edit Modal State
  const [editingUom, setEditingUom] = useState<any>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Count & Units');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchUomCatalog();
  }, [tenantId]);

  const fetchUomCatalog = async () => {
    try {
      setLoading(true);

      const [data, prodRes] = await Promise.all([
        fetchAllUomsSafe(tenantId),
        supabase.from('products').select('uom')
      ]);

      // Calculate usage counts across products
      const counts: Record<string, number> = {};
      if (prodRes.data) {
        prodRes.data.forEach((p: any) => {
          if (p.uom) {
            const code = String(p.uom).trim().toUpperCase();
            counts[code] = (counts[code] || 0) + 1;
          }
        });
      }
      setUomUsageCounts(counts);
      setUoms(data);
    } catch (err: any) {
      toast.error('Failed to load units list: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleState = async (unit: UomItem) => {
    const code = String(unit.short_code || '').trim().toUpperCase();
    const count = uomUsageCounts[code] || 0;

    // Rule: Cannot disable currently using UOM
    if (unit.is_active && count > 0) {
      toast.error(`Cannot disable "${unit.short_code}": Currently used by ${count} product(s). Please reassign those products first.`);
      return;
    }

    const nextStatus = !unit.is_active;

    // 1. Immediately update UI & LocalStorage override
    setUoms(prev => prev.map(u => u.short_code.toUpperCase() === code ? { ...u, is_active: nextStatus } : u));
    setLocalActiveOverride(code, nextStatus);

    // 2. Safely attempt Supabase sync (without breaking if is_active column doesn't exist)
    if (typeof unit.id === 'number') {
      try {
        await supabase
          .from('inventory_uom')
          .update({ is_active: nextStatus })
          .eq('id', unit.id);
      } catch {
        // quiet fallback to local override
      }
    }

    toast.success(`UOM '${unit.short_code}' ${nextStatus ? 'Turned ON' : 'Turned OFF'}`);
  };

  const handleAddCustomUom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      toast.error('Please enter both Short Code and Full Name.');
      return;
    }

    setSavingNew(true);
    const formattedCode = newCode.trim().toUpperCase();
    const activeTenant = tenantId || 'bashir';

    const newUnit: UomItem = {
      id: `custom-${Date.now()}`,
      short_code: formattedCode,
      full_name: newName.trim(),
      category: newCategory,
      tenant_id: activeTenant,
      is_active: true
    };

    try {
      // 1. Try DB insert
      const { data, error } = await supabase
        .from('inventory_uom')
        .insert([{
          short_code: formattedCode,
          full_name: newName.trim(),
          category: newCategory,
          tenant_id: activeTenant
        }])
        .select('*')
        .single();

      if (!error && data) {
        newUnit.id = data.id;
      }
    } catch {
      // quiet fallback
    }

    // 2. Persist locally
    saveCustomLocalUom(newUnit);
    setLocalActiveOverride(formattedCode, true);

    setUoms(prev => [...prev, newUnit]);
    setShowAddModal(false);
    setNewCode('');
    setNewName('');
    toast.success(`Unit '${formattedCode}' added successfully!`);
    setSavingNew(false);
  };

  const openEditModal = (uom: any) => {
    setEditingUom(uom);
    setEditCode(uom.short_code || '');
    setEditName(uom.full_name || '');
    setEditCategory(uom.category || 'Count & Units');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUom) return;
    if (!editCode.trim() || !editName.trim()) {
      toast.error('Please enter both Short Code and Full Name.');
      return;
    }

    setSavingEdit(true);
    const formattedCode = editCode.trim().toUpperCase();
    const oldCode = editingUom.short_code;
    const updatedFields = {
      short_code: formattedCode,
      full_name: editName.trim(),
      category: editCategory
    };

    try {
      if (typeof editingUom.id === 'number') {
        await supabase
          .from('inventory_uom')
          .update(updatedFields)
          .eq('id', editingUom.id);
      }
    } catch {
      // fallback
    }

    // Update local persistence
    saveCustomLocalUom({ ...editingUom, ...updatedFields });

    // Automatically cascade update to existing products using this UOM code
    if (oldCode && oldCode !== formattedCode) {
      try {
        await supabase
          .from('products')
          .update({ uom: formattedCode })
          .ilike('uom', oldCode);
      } catch {
        // fallback
      }
    }

    toast.success(`Unit '${formattedCode}' updated successfully!`);
    setUoms(prev => prev.map(u => u.id === editingUom.id ? { ...u, ...updatedFields } : u));
    setEditingUom(null);
    setSavingEdit(false);
  };

  const handleDeleteUom = async (uom: any) => {
    const code = String(uom.short_code || '').trim().toUpperCase();
    const count = uomUsageCounts[code] || 0;

    if (count > 0) {
      toast.error(`Cannot delete "${uom.short_code}": Currently in use by ${count} product(s). Please reassign those products before deleting.`);
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to delete the unit "${uom.short_code} - ${uom.full_name}"?`);
    if (!confirmDelete) return;

    try {
      if (typeof uom.id === 'number') {
        await supabase
          .from('inventory_uom')
          .delete()
          .eq('id', uom.id);
      }
    } catch {
      // fallback
    }

    deleteCustomLocalUom(uom.id);
    deleteCustomLocalUom(code);

    toast.success(`Unit '${uom.short_code}' deleted successfully!`);
    setUoms(prev => prev.filter(u => u.id !== uom.id));
  };

  const filteredUoms = uoms.filter(u =>
    u.short_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedUoms = filteredUoms.reduce((acc: any, curr: any) => {
    const cat = curr.category || 'Count & Units';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(curr);
    return acc;
  }, {});

  const activeCount = uoms.filter(u => u.is_active).length;

  return (
    <div className={`mx-auto max-w-7xl flex flex-col gap-6 relative text-xs ${isRTL ? 'font-urdu' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Component Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <MdLayers className="text-primary" size={24} />
            {isRTL ? "پیمائش کی اکائیاں (سوئچ بورڈ)" : "Units of Measurement (UOM) Switchboard"}
          </h2>
          <p className="text-gray-400 mt-0.5 text-xs">
            {isRTL ? "مختلف اکائیوں کو آن یا آف کریں، نام تبدیل کریں یا غیر ضروری کسٹم اکائیاں حذف کریں۔" : "Turn individual units On or Off, edit names, or delete unwanted custom units across active ERP forms."}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder={isRTL ? "اکائی یا کیٹیگری تلاش کریں..." : "Search units or category..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-stroke bg-white px-3.5 py-2 text-xs text-black outline-none transition focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary shadow-xs"
          />

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-opacity-90 transition active:scale-95"
          >
            <MdAdd size={16} />
            {isRTL ? "+ نئی اکائی شامل کریں" : "+ Add Custom Unit"}
          </button>
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-xl bg-gray-100 dark:bg-meta-4 px-3 py-1 font-semibold text-black dark:text-white">
          {isRTL ? "کل اکائیاں:" : "Total Units:"} {uoms.length}
        </span>
        <span className="rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-3 py-1 font-semibold flex items-center gap-1.5">
          <MdCheckCircle size={14} />
          {isRTL ? "فعال اکائیاں:" : "Active Units:"} {activeCount}
        </span>
        <span className="rounded-xl bg-gray-500/10 text-gray-500 dark:text-gray-400 border border-gray-500/20 px-3 py-1 font-semibold">
          {isRTL ? "غیر فعال اکائیاں:" : "Inactive Units:"} {uoms.length - activeCount}
        </span>
      </div>

      {/* Grid of Grouped Category Cards */}
      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-default">
          <Spinner />
        </div>
      ) : Object.keys(groupedUoms).length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-default text-gray-400">
          <MdLayers size={48} className="opacity-40 mb-3" />
          <p className="font-semibold">{isRTL ? "کوئی اکائی نہیں ملی" : "No Units Found"}</p>
          <p className="text-xs">{isRTL ? "تلاش کے الفاظ تبدیل کریں یا نئی اکائی شامل کریں۔" : "Try matching your search or add a custom unit."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {CATEGORY_OPTIONS.map((catKey) => {
            const list = groupedUoms[catKey] || [];
            if (list.length === 0) return null;

            const categoryActiveCount = list.filter((u: any) => u.is_active).length;

            return (
              <div
                key={catKey}
                className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-default overflow-hidden"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-stroke dark:border-strokedark bg-gray-50/50 dark:bg-meta-4/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-black dark:text-white">
                      {getCategoryLabel(catKey)}
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-gray-400">
                    {categoryActiveCount}/{list.length} {isRTL ? "فعال" : "Active"}
                  </span>
                </div>

                {/* Units List */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((u: any) => {
                    const usage = uomUsageCounts[String(u.short_code).trim().toUpperCase()] || 0;

                    return (
                      <div
                        key={u.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          u.is_active
                            ? 'border-stroke dark:border-strokedark bg-white dark:bg-boxdark hover:border-primary/50'
                            : 'border-stroke/40 dark:border-strokedark/40 bg-gray-50/40 dark:bg-meta-4/10 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span
                            className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded-lg border ${
                              u.is_active
                                ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20'
                                : 'bg-gray-100 text-gray-500 dark:bg-meta-4 border-stroke dark:border-strokedark'
                            }`}
                          >
                            {u.short_code}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-black dark:text-white text-xs truncate">
                              {getUomLabel(u.full_name)}
                            </p>
                            {usage > 0 && (
                              <p className="text-[10px] text-primary font-medium">
                                {isRTL ? `پروڈکٹس میں استعمال: ${usage}` : `Used in ${usage} product(s)`}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Controls: Edit, Delete, Switch */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1 text-gray-400 hover:text-primary transition rounded"
                            title={isRTL ? "ترمیم کریں" : "Edit"}
                          >
                            <MdEdit size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteUom(u)}
                            className={`p-1 transition rounded ${
                              usage > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-danger'
                            }`}
                            title={usage > 0 ? (isRTL ? "یہ پروڈکٹس میں استعمال ہو رہا ہے، حذف نہیں کیا جا سکتا" : "Cannot delete unit used by active products") : (isRTL ? "حذف کریں" : "Delete")}
                            disabled={usage > 0}
                          >
                            <MdDelete size={14} />
                          </button>

                          {/* Toggle Switch */}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(u.is_active)}
                              onChange={() => handleToggleState(u)}
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-meta-4 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom UOM Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-boxdark border border-stroke dark:border-strokedark animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-stroke dark:border-strokedark mb-4">
              <h3 className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
                <MdAdd className="text-primary" size={18} />
                {isRTL ? "نئی پیمائش کی اکائی شامل کریں" : "Add Custom Unit of Measurement"}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-black dark:hover:text-white"
              >
                <MdClose size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomUom} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1 text-black dark:text-white">
                  {isRTL ? "مختصر کوڈ (Short Code) *" : "Short Code *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MTR, BNDL, THN"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full font-mono uppercase rounded-xl border border-stroke bg-white px-3.5 py-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-black dark:text-white">
                  {isRTL ? "مکمل نام (Full Name) *" : "Full Description Name *"}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meter (Linear Meter), Thaan"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-stroke bg-white px-3.5 py-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-black dark:text-white">
                  {isRTL ? "کیٹیگری *" : "Measurement Category *"}
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-xl border border-stroke bg-white px-3.5 py-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {getCategoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-stroke px-4 py-2 font-semibold text-gray-500 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4 transition"
                >
                  {isRTL ? "منسوخ کریں" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="rounded-xl bg-primary px-4 py-2 font-semibold text-white shadow-xs hover:bg-opacity-90 transition disabled:opacity-50"
                >
                  {savingNew ? (isRTL ? "محفوظ ہو رہا ہے..." : "Adding...") : (isRTL ? "اکائی محفوظ کریں" : "Add Unit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit UOM Modal */}
      {editingUom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-boxdark border border-stroke dark:border-strokedark animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-stroke dark:border-strokedark mb-4">
              <h3 className="font-bold text-sm text-black dark:text-white flex items-center gap-2">
                <MdEdit className="text-primary" size={18} />
                {isRTL ? "اکائی کی معلومات میں ترمیم کریں" : "Edit Unit of Measurement"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingUom(null)}
                className="text-gray-400 hover:text-black dark:hover:text-white"
              >
                <MdClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1 text-black dark:text-white">
                  {isRTL ? "مختصر کوڈ (Short Code) *" : "Short Code *"}
                </label>
                <input
                  type="text"
                  required
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full font-mono uppercase rounded-xl border border-stroke bg-white px-3.5 py-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-black dark:text-white">
                  {isRTL ? "مکمل نام (Full Name) *" : "Full Description Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-stroke bg-white px-3.5 py-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-black dark:text-white">
                  {isRTL ? "کیٹیگری *" : "Measurement Category *"}
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-xl border border-stroke bg-white px-3.5 py-2 text-xs text-black outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {getCategoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUom(null)}
                  className="rounded-xl border border-stroke px-4 py-2 font-semibold text-gray-500 hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4 transition"
                >
                  {isRTL ? "منسوخ کریں" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-primary px-4 py-2 font-semibold text-white shadow-xs hover:bg-opacity-90 transition disabled:opacity-50"
                >
                  {savingEdit ? (isRTL ? "محفوظ ہو رہا ہے..." : "Saving...") : (isRTL ? "تبدیلیاں محفوظ کریں" : "Save Changes")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UomManager;
