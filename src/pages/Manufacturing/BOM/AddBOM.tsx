import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../../Context/LanguageContext';
import { supabase } from '../../../Context/supabaseClient';
import { bomService, BomHeader, BomItem } from '../../../service/bomService';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import SearchableProductSelect from '../../../components/SearchableProductSelect';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import {
  MdPrecisionManufacturing,
  MdAdd,
  MdDelete,
  MdSave,
  MdArrowBack,
  MdAttachMoney,
  MdTrendingUp,
  MdInventory2,
  MdLayers,
  MdInfoOutline,
  MdCheckCircle,
  MdEngineering,
  MdLocalShipping
} from 'react-icons/md';

const COMMON_UOMS = [
  'PCS',
  'Meters',
  'Suits',
  'Boxes',
  'Kg',
  'Grams',
  'Yards',
  'Liters',
  'Rolls',
  'Sets',
  'Packets',
  'Pairs'
];

const COMMON_CATEGORIES = [
  'General',
  'Fabrics & Garments',
  'Ceramics & Tiles',
  'Textiles & Embroidery',
  'Electronics & Hardware',
  'Packaging & Printing',
  'Chemicals & Glazes'
];

const AddBOM: React.FC = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Catalog products for quick autocomplete
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

  // Form State
  const [bomNumber, setBomNumber] = useState('');
  const [finishedProductName, setFinishedProductName] = useState('');
  const [finishedProductCode, setFinishedProductCode] = useState('');
  const [finishedProductId, setFinishedProductId] = useState('');
  const [category, setCategory] = useState('General');
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [uom, setUom] = useState('PCS');
  const [status, setStatus] = useState<'Active' | 'Draft'>('Active');
  const [notes, setNotes] = useState('');

  // Overheads
  const [laborCost, setLaborCost] = useState<number>(0);
  const [overheadCost, setOverheadCost] = useState<number>(0);
  const [packagingCost, setPackagingCost] = useState<number>(0);
  const [targetSellingPrice, setTargetSellingPrice] = useState<number>(0);

  // Raw Materials Rows
  const [items, setItems] = useState<BomItem[]>([
    {
      id: 'row-1',
      item_name: '',
      item_code: '',
      quantity: 1,
      uom: 'PCS',
      unit_cost: 0,
      wastage_percentage: 0,
      total_cost: 0,
      notes: ''
    }
  ]);

  // Load catalog products for suggestions
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('id, product_name, item_sr_no, purchase_price, sales_price, uom, category')
          .limit(500);
        if (data && data.length > 0) {
          setCatalogProducts(data);
        }
      } catch {
        // quiet fallback
      }
    };
    fetchCatalog();
  }, []);

  // Initialize BOM Number or load existing BOM for editing
  useEffect(() => {
    const init = async () => {
      if (isEditMode && id) {
        setLoading(true);
        try {
          const existing = await bomService.getById(id);
          if (existing) {
            setBomNumber(existing.bom_number);
            setFinishedProductName(existing.finished_product_name);
            setFinishedProductCode(existing.finished_product_code || '');
            setFinishedProductId(existing.finished_product_id || '');
            setCategory(existing.category || 'General');
            setBatchQuantity(existing.batch_quantity || 1);
            setUom(existing.uom || 'PCS');
            setStatus(existing.status === 'Draft' ? 'Draft' : 'Active');
            setLaborCost(existing.labor_cost || 0);
            setOverheadCost(existing.overhead_cost || 0);
            setPackagingCost(existing.packaging_cost || 0);
            setTargetSellingPrice(existing.target_selling_price || 0);
            setNotes(existing.notes || '');
            if (existing.items && existing.items.length > 0) {
              setItems(existing.items);
            }
          } else {
            toast.error(isRTL ? 'نسخہ نہیں ملا' : 'BOM not found');
            navigate('/Manufacturing/list');
          }
        } catch {
          toast.error(isRTL ? 'لوڈ کرنے میں ناکامی' : 'Failed to load BOM');
        } finally {
          setLoading(false);
        }
      } else {
        const nextNum = await bomService.getNextBomNumber();
        setBomNumber(nextNum);
      }
    };
    init();
  }, [id, isEditMode, isRTL, navigate]);

  // Handle Finished Product selection from catalog
  const handleSelectFinishedProduct = (prodName: string) => {
    setFinishedProductName(prodName);
    const found = catalogProducts.find(
      p => p.product_name?.toLowerCase() === prodName.toLowerCase()
    );
    if (found) {
      if (found.item_sr_no) setFinishedProductCode(found.item_sr_no);
      if (found.id) setFinishedProductId(String(found.id));
      if (found.category) setCategory(found.category);
      if (found.uom) setUom(found.uom);
      if (found.sales_price) setTargetSellingPrice(Number(found.sales_price));
    }
  };

  // Row operations
  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${prev.length + 1}`,
        item_name: '',
        item_code: '',
        quantity: 1,
        uom: 'PCS',
        unit_cost: 0,
        wastage_percentage: 0,
        total_cost: 0,
        notes: ''
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) {
      toast.error(
        isRTL ? 'نسخے میں کم از کم ایک خام مال ہونا ضروری ہے' : 'BOM must contain at least 1 raw material'
      );
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateItem = (index: number, field: keyof BomItem, val: any) => {
    setItems(prev => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: val };

      // If user selected an item name from catalog, auto-populate unit cost & uom
      if (field === 'item_name') {
        const found = catalogProducts.find(
          p => p.product_name?.toLowerCase() === String(val).toLowerCase()
        );
        if (found) {
          if (found.purchase_price) row.unit_cost = Number(found.purchase_price);
          if (found.item_sr_no) row.item_code = found.item_sr_no;
          if (found.uom) row.uom = found.uom;
          if (found.id) row.item_id = String(found.id);
        }
      }

      // Recalculate line total: Qty * UnitCost * (1 + Wastage% / 100)
      const qty = Number(row.quantity) || 0;
      const uCost = Number(row.unit_cost) || 0;
      const waste = Number(row.wastage_percentage) || 0;
      row.total_cost = Math.round(qty * uCost * (1 + waste / 100));

      updated[index] = row;
      return updated;
    });
  };

  // Live Cost & Margin Calculations
  const calculations = useMemo(() => {
    const rawMaterialCost = items.reduce((sum, it) => sum + (Number(it.total_cost) || 0), 0);
    const totalOverheads =
      (Number(laborCost) || 0) + (Number(overheadCost) || 0) + (Number(packagingCost) || 0);
    const totalBatchCost = rawMaterialCost + totalOverheads;
    const batchQty = Number(batchQuantity) > 0 ? Number(batchQuantity) : 1;
    const unitCost = Math.round((totalBatchCost / batchQty) * 100) / 100;

    const targetPrice = Number(targetSellingPrice) || 0;
    const unitProfit = targetPrice - unitCost;
    const marginPercentage =
      targetPrice > 0 ? Math.round(((targetPrice - unitCost) / targetPrice) * 10000) / 100 : 0;

    return {
      rawMaterialCost,
      totalOverheads,
      totalBatchCost,
      unitCost,
      unitProfit,
      marginPercentage
    };
  }, [items, laborCost, overheadCost, packagingCost, batchQuantity, targetSellingPrice]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!finishedProductName.trim()) {
      toast.error(
        isRTL ? 'براہ کرم تیار پروڈکٹ کا نام درج کریں' : 'Please specify Finished Product Name'
      );
      return;
    }

    if (!batchQuantity || Number(batchQuantity) <= 0) {
      toast.error(
        isRTL ? 'بیچ کی مقدار 0 سے زیادہ ہونی چاہیے' : 'Batch output quantity must be greater than 0'
      );
      return;
    }

    const invalidItems = items.filter(it => !it.item_name.trim());
    if (invalidItems.length > 0) {
      toast.error(
        isRTL
          ? 'براہ کرم تمام قطاروں میں خام مال کا نام درج کریں'
          : 'Please specify material name for all raw material rows'
      );
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<BomHeader> & { items: BomItem[] } = {
        id: isEditMode && id ? id : undefined,
        bom_number: bomNumber,
        finished_product_name: finishedProductName.trim(),
        finished_product_code: finishedProductCode.trim(),
        finished_product_id: finishedProductId,
        category,
        batch_quantity: Number(batchQuantity),
        uom,
        raw_material_cost: calculations.rawMaterialCost,
        labor_cost: Number(laborCost) || 0,
        overhead_cost: Number(overheadCost) || 0,
        packaging_cost: Number(packagingCost) || 0,
        total_cost: calculations.totalBatchCost,
        unit_cost: calculations.unitCost,
        target_selling_price: Number(targetSellingPrice) || 0,
        margin_percentage: calculations.marginPercentage,
        status,
        notes: notes.trim(),
        items
      };

      await bomService.save(payload);
      toast.success(
        isRTL
          ? isEditMode
            ? 'نسخہ کامیابی سے اپڈیٹ ہو گیا'
            : 'نیا نسخہ کامیابی سے محفوظ ہو گیا'
          : isEditMode
          ? 'BOM recipe updated successfully'
          : 'New BOM recipe saved successfully'
      );
      navigate('/Manufacturing/list');
    } catch (err: any) {
      toast.error(
        isRTL ? 'محفوظ کرنے میں خرابی ہوئی' : `Failed to save BOM: ${err?.message || 'Unknown error'}`
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-7xl p-4 md:p-6 ${isRTL ? 'font-urdu' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Breadcrumb
        pageName={
          isRTL
            ? isEditMode
              ? 'ترمیم نسخہ (Edit BOM)'
              : 'نیا تیاری نسخہ (Create BOM)'
            : isEditMode
            ? 'Edit BOM Recipe'
            : 'Create Manufacturing BOM'
        }
      />

      {/* Header Banner */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-boxdark p-5 rounded-xl shadow-sm border border-stroke dark:border-strokedark">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/Manufacturing/list')}
            className="p-2 rounded-lg border border-stroke text-gray-500 hover:bg-gray-100 hover:text-black dark:border-strokedark dark:text-gray-300 dark:hover:bg-meta-4"
            title={isRTL ? 'واپس جائیں' : 'Go Back'}
          >
            <MdArrowBack className={`text-xl ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                {bomNumber}
              </span>
              <h1 className="text-xl font-bold text-black dark:text-white">
                {isRTL
                  ? isEditMode
                    ? 'نسخہ میں ترمیم کریں'
                    : 'نیا بل آف میٹریلز (BOM) نسخہ'
                  : isEditMode
                  ? 'Edit Bill of Materials Recipe'
                  : 'New Bill of Materials (BOM) Recipe'}
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isRTL
                ? 'تیار پروڈکٹ، خام مال کی کھپت، ضیاع، لیبر اور منافع کے ہدف کا تعین'
                : 'Formulate bill of materials, raw consumption, wastage allowances, and overhead allocations'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/Manufacturing/list')}
            className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-strokedark dark:text-gray-300 dark:hover:bg-meta-4"
          >
            {isRTL ? 'منسوخ کریں' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-opacity-90 shadow-sm disabled:opacity-50"
          >
            <MdSave className="text-lg" />
            <span>
              {saving
                ? isRTL
                  ? 'محفوظ ہو رہا ہے...'
                  : 'Saving...'
                : isRTL
                ? 'نسخہ محفوظ کریں'
                : 'Save Recipe'}
            </span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Grid: Product Details & Sticky Costing Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section 1: Finished Product Details (2 cols on desktop) */}
          <div className="lg:col-span-2 rounded-xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark space-y-4">
            <div className="flex items-center gap-2 border-b border-stroke pb-3 dark:border-strokedark">
              <MdInventory2 className="text-xl text-primary" />
              <h2 className="text-base font-semibold text-black dark:text-white">
                {isRTL ? '1. تیار شدہ پروڈکٹ کی تفصیل (Finished Good)' : '1. Finished Product Output'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name (Searchable Dropdown with Custom Add Support) */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                  {isRTL ? 'تیار پروڈکٹ کا نام *' : 'Finished Product Name *'}
                </label>
                <SearchableProductSelect
                  products={catalogProducts}
                  value={finishedProductName}
                  onChange={(name, selectedProd) => {
                    setFinishedProductName(name);
                    if (selectedProd) {
                      if (selectedProd.item_sr_no) setFinishedProductCode(selectedProd.item_sr_no);
                      if (selectedProd.id) setFinishedProductId(String(selectedProd.id));
                      if (selectedProd.category) setCategory(selectedProd.category);
                      if (selectedProd.uom) setUom(selectedProd.uom);
                      if (selectedProd.sales_price) setTargetSellingPrice(Number(selectedProd.sales_price));
                    }
                  }}
                  placeholder={
                    isRTL
                      ? 'تیار پروڈکٹ منتخب کریں یا نیا نام لکھیں...'
                      : 'Search or type finished product (e.g., Embroidered Lawn Suit 3-Piece, Glazed Floor Tile 60x120)...'
                  }
                  allowCustom={true}
                  priceType="sales"
                  isRTL={isRTL}
                />
              </div>

              {/* Product Code / SKU */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                  {isRTL ? 'پروڈکٹ کوڈ / SKU' : 'Product Code / SKU'}
                </label>
                <input
                  type="text"
                  placeholder="e.g., ESK-PREM-01"
                  value={finishedProductCode}
                  onChange={e => setFinishedProductCode(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-sm font-mono outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                  {isRTL ? 'کیٹیگری' : 'Category'}
                </label>
                <input
                  type="text"
                  list="recipe-categories"
                  placeholder="e.g. Fabrics & Garments"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                />
                <datalist id="recipe-categories">
                  {COMMON_CATEGORIES.map(c => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Batch Output Quantity */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                  {isRTL ? 'بیچ پیداواری مقدار (Batch Qty) *' : 'Batch Production Quantity *'}
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={batchQuantity}
                  onChange={e => setBatchQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-sm font-mono font-semibold outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                />
                <span className="text-[11px] text-gray-500 mt-1 block">
                  {isRTL
                    ? 'یہ نسخہ ایک وقت میں کتنے یونٹس تیار کرے گا؟'
                    : 'Standard run quantity produced per batch recipe'}
                </span>
              </div>

              {/* Unit of Measure */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                  {isRTL ? 'پیمائش کی اکائی (UOM)' : 'Output Unit (UOM)'}
                </label>
                <select
                  value={uom}
                  onChange={e => setUom(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                >
                  {COMMON_UOMS.map(u => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipe Status */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                  {isRTL ? 'نسخے کا اسٹیٹس' : 'Recipe Status'}
                </label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as 'Active' | 'Draft')}
                  className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                >
                  <option value="Active">{isRTL ? 'فعال (Active - فیکٹری پروڈکشن میں منظور شدہ)' : 'Active (Approved for production)'}</option>
                  <option value="Draft">{isRTL ? 'ڈرافٹ (Draft - زیر غور)' : 'Draft (Under trial/review)'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Live Cost & Margin Sticky Card (1 col on desktop) */}
          <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 via-white to-white p-5 shadow-sm dark:from-primary/10 dark:via-boxdark dark:to-boxdark dark:border-strokedark flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-stroke pb-3 dark:border-strokedark">
                <div className="flex items-center gap-2">
                  <MdTrendingUp className="text-xl text-primary" />
                  <h3 className="text-base font-bold text-black dark:text-white">
                    {isRTL ? 'پیداواری لاگت اور منافع' : 'Cost & Margin Summary'}
                  </h3>
                </div>
                <span className="text-[11px] font-mono uppercase bg-primary text-white px-2 py-0.5 rounded">
                  Live
                </span>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                  <span>{isRTL ? 'کل خام مال کی لاگت:' : 'Raw Materials Cost:'}</span>
                  <span className="font-mono font-medium text-black dark:text-white">
                    PKR {calculations.rawMaterialCost.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                  <span>{isRTL ? 'لیبر اور اوور ہیڈز:' : 'Labor & Overheads:'}</span>
                  <span className="font-mono font-medium text-black dark:text-white">
                    PKR {calculations.totalOverheads.toLocaleString()}
                  </span>
                </div>

                <div className="border-t border-dashed border-stroke dark:border-strokedark pt-2 flex justify-between items-center font-semibold text-black dark:text-white">
                  <span>{isRTL ? 'کل بیچ پیداواری لاگت:' : 'Total Batch Cost:'}</span>
                  <span className="font-mono text-base text-primary">
                    PKR {calculations.totalBatchCost.toLocaleString()}
                  </span>
                </div>

                {/* Highlighted Net Unit Cost */}
                <div className="bg-white dark:bg-meta-4 p-3 rounded-lg border border-stroke dark:border-strokedark">
                  <span className="text-xs text-gray-500 uppercase tracking-wider block">
                    {isRTL ? 'خالص فی یونٹ پیداواری لاگت:' : 'Net Unit Production Cost:'}
                  </span>
                  <div className="text-2xl font-bold font-mono text-black dark:text-white mt-0.5">
                    PKR {calculations.unitCost.toLocaleString()}
                    <span className="text-xs font-normal text-gray-400 mr-1 ml-1">
                      / {uom}
                    </span>
                  </div>
                </div>

                {/* Target Selling Price */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    {isRTL ? 'ہدف سیلز پرائس (PKR فی یونٹ)' : 'Target Selling Price (PKR / Unit)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={targetSellingPrice}
                    onChange={e => setTargetSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-primary/50 bg-white py-2 px-3 text-sm font-mono font-bold text-emerald-600 dark:bg-meta-4 outline-none focus:border-primary"
                    placeholder="0"
                  />
                </div>

                {/* Profit Breakdown */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block">
                      {isRTL ? 'فی یونٹ منافع' : 'Unit Profit'}
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      PKR {calculations.unitProfit.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block">
                      {isRTL ? 'منافع مارجن' : 'Gross Margin'}
                    </span>
                    <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      {calculations.marginPercentage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stroke dark:border-strokedark text-[11px] text-gray-500">
              <MdInfoOutline className="inline mr-1 text-xs text-primary" />
              {isRTL
                ? 'بیچ سائز یا کسی بھی خام مال کے ریٹ تبدیل کرنے سے لاگت فوراً اپڈیٹ ہو جائے گی۔'
                : 'Unit cost dynamically recalculates whenever raw items, waste, or batch quantities change.'}
            </div>
          </div>
        </div>

        {/* Section 3: Raw Materials Recipe Table */}
        <div className="rounded-xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stroke pb-3 dark:border-strokedark">
            <div className="flex items-center gap-2">
              <MdLayers className="text-xl text-primary" />
              <div>
                <h2 className="text-base font-semibold text-black dark:text-white">
                  {isRTL ? '2. خام مال اور اجزائے ترکیبی (Raw Materials & Ingredients)' : '2. Raw Materials & Components'}
                </h2>
                <p className="text-xs text-gray-500">
                  {isRTL
                    ? 'اس بیچ کی تیاری کے لیے درکار تمام خام اشیاء اور ان کا ضیاع درج کریں'
                    : 'List all raw materials, inputs, quantities, wastage allowances & unit costs for this batch'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddItemRow}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 text-xs font-semibold transition"
            >
              <MdAdd className="text-base" />
              <span>{isRTL ? '+ نیا خام مال شامل کریں' : '+ Add Material Item'}</span>
            </button>
          </div>

          <div className="overflow-x-auto min-h-[320px] pb-36">
            <table className="w-full table-auto text-xs">
              <thead>
                <tr className="bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-gray-300 uppercase font-semibold">
                  <th className={`p-2.5 ${isRTL ? 'text-right' : 'text-left'} w-1/3 min-w-[280px]`}>
                    {isRTL ? 'خام مال / جزو *' : 'Material / Component Name *'}
                  </th>
                  <th className="p-2.5 text-center w-24">
                    {isRTL ? 'مقدار *' : 'Quantity *'}
                  </th>
                  <th className="p-2.5 text-center w-24">
                    {isRTL ? 'اکائی (UOM)' : 'UOM'}
                  </th>
                  <th className="p-2.5 text-center w-32">
                    {isRTL ? 'فی یونٹ ریٹ (PKR)' : 'Unit Cost (PKR)'}
                  </th>
                  <th className="p-2.5 text-center w-24">
                    {isRTL ? 'ضیاع %' : 'Waste %'}
                  </th>
                  <th className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'} w-32`}>
                    {isRTL ? 'کل لاگت (PKR)' : 'Total Cost'}
                  </th>
                  <th className={`p-2.5 ${isRTL ? 'text-right' : 'text-left'} w-44`}>
                    {isRTL ? 'مرحلہ / نوٹ' : 'Process / Stage Note'}
                  </th>
                  <th className="p-2.5 text-center w-12">
                    {isRTL ? 'حذف' : 'Del'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {items.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-meta-4/20 relative z-10 focus-within:z-30 hover:z-20">
                    {/* Material Name with Searchable Product Select */}
                    <td className="p-2 min-w-[280px] relative">
                      <SearchableProductSelect
                        products={catalogProducts}
                        value={row.item_name}
                        onChange={(name, selectedProd) => {
                          handleUpdateItem(idx, 'item_name', name);
                          if (selectedProd) {
                            if (selectedProd.purchase_price) {
                              handleUpdateItem(idx, 'unit_cost', Number(selectedProd.purchase_price));
                            }
                            if (selectedProd.item_sr_no) {
                              handleUpdateItem(idx, 'item_code', selectedProd.item_sr_no);
                            }
                            if (selectedProd.uom) {
                              handleUpdateItem(idx, 'uom', selectedProd.uom);
                            }
                            if (selectedProd.id) {
                              handleUpdateItem(idx, 'item_id', String(selectedProd.id));
                            }
                          }
                        }}
                        placeholder={
                          isRTL
                            ? 'خام مال تلاش کریں یا نیا نام لکھیں...'
                            : 'Search or type raw material...'
                        }
                        allowCustom={true}
                        priceType="purchase"
                        isRTL={isRTL}
                      />
                    </td>

                    {/* Quantity */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        required
                        value={row.quantity}
                        onChange={e =>
                          handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded border border-stroke bg-transparent py-1.5 px-2 font-mono text-center outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                      />
                    </td>

                    {/* UOM */}
                    <td className="p-2">
                      <select
                        value={row.uom}
                        onChange={e => handleUpdateItem(idx, 'uom', e.target.value)}
                        className="w-full rounded border border-stroke bg-transparent py-1.5 px-1.5 text-center outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                      >
                        {COMMON_UOMS.map(u => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Unit Cost */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.unit_cost}
                        onChange={e =>
                          handleUpdateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded border border-stroke bg-transparent py-1.5 px-2 font-mono text-center outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                      />
                    </td>

                    {/* Wastage % */}
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={row.wastage_percentage}
                        onChange={e =>
                          handleUpdateItem(idx, 'wastage_percentage', parseFloat(e.target.value) || 0)
                        }
                        className="w-full rounded border border-stroke bg-transparent py-1.5 px-2 font-mono text-center outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                        placeholder="0"
                      />
                    </td>

                    {/* Line Total */}
                    <td
                      className={`p-2 font-mono font-bold text-black dark:text-white ${
                        isRTL ? 'text-left' : 'text-right'
                      }`}
                    >
                      PKR {row.total_cost.toLocaleString()}
                    </td>

                    {/* Notes */}
                    <td className="p-2">
                      <input
                        type="text"
                        placeholder={isRTL ? 'مرحلہ یا نوٹ...' : 'e.g., cutting scrap, dye mix'}
                        value={row.notes || ''}
                        onChange={e => handleUpdateItem(idx, 'notes', e.target.value)}
                        className="w-full rounded border border-stroke bg-transparent py-1.5 px-2 outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                      />
                    </td>

                    {/* Remove Action */}
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1 text-gray-400 hover:text-danger rounded hover:bg-gray-100 dark:hover:bg-meta-4"
                        title={isRTL ? 'حذف کریں' : 'Remove row'}
                      >
                        <MdDelete className="text-base" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={handleAddItemRow}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-stroke px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-primary hover:text-primary dark:border-strokedark dark:text-gray-300"
            >
              <MdAdd className="text-base" />
              <span>{isRTL ? '+ نئی قطار شامل کریں' : '+ Add Another Item'}</span>
            </button>

            <div className="text-xs font-semibold text-black dark:text-white">
              {isRTL ? 'خام مال کا میزان:' : 'Total Raw Materials:'}{' '}
              <span className="font-mono text-primary text-sm mr-1 ml-1">
                PKR {calculations.rawMaterialCost.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Labor, Machine & Factory Overheads */}
        <div className="rounded-xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark space-y-4">
          <div className="flex items-center gap-2 border-b border-stroke pb-3 dark:border-strokedark">
            <MdEngineering className="text-xl text-primary" />
            <div>
              <h2 className="text-base font-semibold text-black dark:text-white">
                {isRTL
                  ? '3. لیبر، مشینری اور فیکٹری اخراجات (Overheads & Production Costs)'
                  : '3. Labor, Machine, Packaging & Factory Overheads'}
              </h2>
              <p className="text-xs text-gray-500">
                {isRTL
                  ? 'خام مال کے علاوہ اس بیچ پر آنے والے تمام اضافی پیداواری اخراجات درج کریں'
                  : 'Add direct conversion labor, machinery utilities, packaging, and facility overhead costs per batch'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Direct Labor */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                {isRTL ? 'براہ راست لیبر / مزدوری (PKR)' : 'Direct Labor Cost (PKR)'}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={laborCost}
                onChange={e => setLaborCost(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-sm font-mono outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                {isRTL ? 'سلائی، پریسنگ، کٹنگ یا کاریگر اجرت' : 'Tailoring, assembly, cutting, machine operators'}
              </span>
            </div>

            {/* Machine & Utility Overheads */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                {isRTL ? 'مشینری، ایندھن اور بجلی (PKR)' : 'Machinery, Fuel & Utilities (PKR)'}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={overheadCost}
                onChange={e => setOverheadCost(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-sm font-mono outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                {isRTL ? 'بھٹی، جنریٹر، موٹر پاور اور پلانٹ رننگ' : 'Kiln gas, power, equipment depreciation'}
              </span>
            </div>

            {/* Packaging & Finishing */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                {isRTL ? 'پیکنگ، کارٹن اور لیبلنگ (PKR)' : 'Packaging & Finishing (PKR)'}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={packagingCost}
                onChange={e => setPackagingCost(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-sm font-mono outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
              />
              <span className="text-[11px] text-gray-500 mt-1 block">
                {isRTL ? 'باکس، ہینگر، شاپر اور بارکوڈ اسٹیکر' : 'Cardboard boxes, polybags, tags & branding'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 5: Production Notes & SOP Instructions */}
        <div className="rounded-xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
            {isRTL ? '4. پیداواری ہدایات و نوٹس (Production SOP & Notes)' : '4. Production SOP & Assembly Notes'}
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={
              isRTL
                ? 'فیکٹری مینیجر یا کاریگر کے لیے ضروری ہدایات، کوالٹی کنٹرول چیکس وغیرہ یہاں لکھیں...'
                : 'Special factory instructions, mixing ratios, baking temperatures, cutting tolerances or quality standards...'
            }
            className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
          />
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stroke dark:border-strokedark">
          <button
            type="button"
            onClick={() => navigate('/Manufacturing/list')}
            className="rounded-lg border border-stroke px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-strokedark dark:text-gray-300 dark:hover:bg-meta-4"
          >
            {isRTL ? 'منسوخ کریں' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-opacity-90 shadow-sm disabled:opacity-50"
          >
            <MdSave className="text-lg" />
            <span>
              {saving
                ? isRTL
                  ? 'محفوظ ہو رہا ہے...'
                  : 'Saving Recipe...'
                : isRTL
                ? 'نسخہ محفوظ کریں'
                : 'Save BOM Recipe'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBOM;
