import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../../Context/LanguageContext';
import { supabase } from '../../../Context/supabaseClient';
import { bomService, BomHeader, BomItem } from '../../../service/bomService';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import SearchableProductSelect from '../../../components/SearchableProductSelect';
import { SearchableDropdown } from '../../../components/SearchableDropdown';
import SearchableUomDropdown from '../../../components/SearchableUomDropdown';
import { fetchAllUomsSafe, UomItem } from '../../../service/uomService';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import {
  MdPrecisionManufacturing,
  MdAdd,
  MdDelete,
  MdSave,
  MdArrowBack,
  MdArrowForward,
  MdTrendingUp,
  MdInventory2,
  MdLayers,
  MdInfoOutline,
  MdCheckCircle,
  MdEngineering,
  MdFormatListBulleted
} from 'react-icons/md';

const AddBOM: React.FC = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 3-Step Tab State
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

  // Master lists from database
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [availableUoms, setAvailableUoms] = useState<string[]>([]);
  const [allUomsList, setAllUomsList] = useState<UomItem[]>([]);

  // Step 1: Finished Product Output State
  const [bomNumber, setBomNumber] = useState('');
  const [finishedProductName, setFinishedProductName] = useState('');
  const [finishedProductCode, setFinishedProductCode] = useState('');
  const [finishedProductId, setFinishedProductId] = useState('');

  // 3-Level Cascading Categories (identical to AddProduct.tsx)
  const [subSubCategory, setSubSubCategory] = useState(''); // Parent Category (top level)
  const [subCategory, setSubCategory] = useState('');       // Sub Category (middle level)
  const [category, setCategory] = useState('');             // Category (bottom level)

  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [uom, setUom] = useState('PCS');
  const [status, setStatus] = useState<'Active' | 'Trial' | 'Draft'>('Active');

  // Step 2: Raw Materials Table
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

  // Step 3: Labor, Overheads & SOP
  const [laborCost, setLaborCost] = useState<number>(0);
  const [overheadCost, setOverheadCost] = useState<number>(0);
  const [packagingCost, setPackagingCost] = useState<number>(0);
  const [targetSellingPrice, setTargetSellingPrice] = useState<number>(0);
  const [syncCatalogPrice, setSyncCatalogPrice] = useState<boolean>(false);
  const [notes, setNotes] = useState('');

  // Load catalog products, 3-level categories, and active UOMs
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [prodRes, catRes, uomsList] = await Promise.all([
          supabase
            .from('products')
            .select('id, product_name, item_sr_no, purchase_price, sales_price, retail_price, uom, category, sub_category, sub_sub_category')
            .limit(1000),
          supabase
            .from('inventory_categories')
            .select('id, name, parent_id')
            .order('name', { ascending: true }),
          fetchAllUomsSafe()
        ]);

        if (prodRes.data) setCatalogProducts(prodRes.data);
        if (catRes.data) setAllCategories(catRes.data);
        if (uomsList) setAllUomsList(uomsList.filter(u => u.is_active));

        const activeUomCodes = uomsList
          .filter(u => u.is_active)
          .map(u => u.short_code.toUpperCase());
        setAvailableUoms(Array.from(new Set(activeUomCodes)));
      } catch (err) {
        console.warn('Error fetching master data for BOM:', err);
      }
    };
    fetchMasterData();
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
            setCategory(existing.category || '');
            setBatchQuantity(existing.batch_quantity || 1);
            setUom(existing.uom || 'PCS');
            setStatus(existing.status === 'Trial' ? 'Trial' : existing.status === 'Draft' ? 'Trial' : 'Active');
            setLaborCost(existing.labor_cost || 0);
            setOverheadCost(existing.overhead_cost || 0);
            setPackagingCost(existing.packaging_cost || 0);
            setTargetSellingPrice(existing.target_selling_price || 0);
            setNotes(existing.notes || '');
            if (existing.items && existing.items.length > 0) {
              setItems(existing.items);
            }

            // Find matching product in catalog to prepopulate parent & sub categories
            const prod = catalogProducts.find(
              p => String(p.id) === String(existing.finished_product_id) ||
                   p.product_name?.toLowerCase() === existing.finished_product_name.toLowerCase()
            );
            if (prod) {
              if (prod.sub_sub_category) setSubSubCategory(prod.sub_sub_category);
              if (prod.sub_category) setSubCategory(prod.sub_category);
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
  }, [id, isEditMode, isRTL, navigate, catalogProducts]);

  // Handle Finished Product selection from catalog
  const handleSelectFinishedProduct = (prodName: string, selectedProd?: any) => {
    setFinishedProductName(prodName);
    const found = selectedProd || catalogProducts.find(
      p => p.product_name?.toLowerCase() === prodName.toLowerCase()
    );
    if (found) {
      if (found.item_sr_no) setFinishedProductCode(found.item_sr_no);
      if (found.id) setFinishedProductId(String(found.id));
      if (found.category) setCategory(found.category);
      if (found.sub_category) setSubCategory(found.sub_category);
      if (found.sub_sub_category) setSubSubCategory(found.sub_sub_category);
      if (found.uom) setUom(found.uom);
      const existingPrice = Number(found.retail_price ?? found.sales_price ?? 0);
      if (existingPrice > 0) setTargetSellingPrice(existingPrice);
    }
  };

  // Row operations for Raw Materials (Step 2)
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

      // Recalculate line total: Qty * UnitCost * (1 + Wastage% / 100)
      const qty = Number(row.quantity) || 0;
      const uCost = Number(row.unit_cost) || 0;
      const waste = Number(row.wastage_percentage) || 0;
      row.total_cost = Math.round(qty * uCost * (1 + waste / 100));

      updated[index] = row;
      return updated;
    });
  };

  // Live Cost & Margin Calculations (Shared persistently across all 3 tabs)
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

  // Tab Navigation Validation
  const handleNextTab = () => {
    if (activeTab === 1) {
      if (!finishedProductName.trim()) {
        toast.error(isRTL ? 'براہ کرم تیار پروڈکٹ کا نام درج کریں' : 'Please enter Finished Product Name');
        return;
      }
      if (!batchQuantity || Number(batchQuantity) <= 0) {
        toast.error(isRTL ? 'بیچ کی مقدار 0 سے زیادہ ہونی چاہیے' : 'Batch output quantity must be greater than 0');
        return;
      }
      setActiveTab(2);
    } else if (activeTab === 2) {
      const invalid = items.filter(it => !it.item_name.trim());
      if (invalid.length > 0) {
        toast.error(isRTL ? 'تمام قطاروں میں خام مال کا نام درج کریں' : 'Please specify material name for all raw material rows');
        return;
      }
      setActiveTab(3);
    }
  };

  const handlePrevTab = () => {
    if (activeTab === 3) setActiveTab(2);
    else if (activeTab === 2) setActiveTab(1);
  };

  // Form Submission & Auto-Creation in Product Catalog
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!finishedProductName.trim()) {
      setActiveTab(1);
      toast.error(isRTL ? 'براہ کرم تیار پروڈکٹ کا نام درج کریں' : 'Please specify Finished Product Name');
      return;
    }

    if (!batchQuantity || Number(batchQuantity) <= 0) {
      setActiveTab(1);
      toast.error(isRTL ? 'بیچ کی مقدار 0 سے زیادہ ہونی چاہیے' : 'Batch output quantity must be greater than 0');
      return;
    }

    const invalidItems = items.filter(it => !it.item_name.trim());
    if (invalidItems.length > 0) {
      setActiveTab(2);
      toast.error(isRTL ? 'تمام قطاروں میں خام مال کا نام درج کریں' : 'Please specify material name for all raw material rows');
      return;
    }

    try {
      setSaving(true);

      let effectiveProductId = finishedProductId;
      const cleanName = finishedProductName.trim();
      const cleanCode = finishedProductCode.trim() || undefined;
      const effectiveCategory = category || subCategory || subSubCategory || 'General';

      // 1. Auto-create product in `products` catalog if it doesn't already exist!
      const existingInCatalog = catalogProducts.find(
        p => p.product_name?.toLowerCase() === cleanName.toLowerCase() ||
             (cleanCode && p.item_sr_no && p.item_sr_no.toLowerCase() === cleanCode.toLowerCase())
      );

      if (!existingInCatalog) {
        try {
          const newProductPayload = {
            product_name: cleanName,
            item_sr_no: cleanCode || null,
            sub_sub_category: subSubCategory || null,
            sub_category: subCategory || null,
            category: effectiveCategory,
            uom: uom || 'PCS',
            purchase_price: calculations.unitCost,
            sales_price: Number(targetSellingPrice) || calculations.unitCost,
            retail_price: Number(targetSellingPrice) || calculations.unitCost,
            product_description: `[Manufactured Good] ${cleanName} | Output UOM: ${uom} | Batch Size: ${batchQuantity}`,
            item_type: 'goods',
            tenant_id: 'uzair'
          };

          const { data: newProd, error: prodErr } = await supabase
            .from('products')
            .insert([newProductPayload])
            .select('id')
            .single();

          if (!prodErr && newProd) {
            effectiveProductId = String(newProd.id);
            toast.success(
              isRTL
                ? `پروڈکٹ لسٹ میں "${cleanName}" کا اندراج کر دیا گیا ہے`
                : `Product "${cleanName}" automatically created in Products Catalog!`
            );
          }
        } catch (err) {
          console.warn('Product auto-insert notice:', err);
        }
      } else if (!effectiveProductId && existingInCatalog.id) {
        effectiveProductId = String(existingInCatalog.id);
      }

      // 1b. If user enabled "Sync to Catalog Price" for existing product, update catalog price
      if (existingInCatalog && syncCatalogPrice && effectiveProductId) {
        try {
          const updatePricePayload: Record<string, any> = {
            retail_price: Number(targetSellingPrice) || 0,
            sales_price: Number(targetSellingPrice) || 0
          };
          const { error: syncErr } = await supabase
            .from('products')
            .update(updatePricePayload)
            .eq('id', effectiveProductId);

          if (!syncErr) {
            toast.success(
              isRTL
                ? 'پروڈکٹ کیٹلاگ کی سیل پرائس بھی اپڈیٹ کر دی گئی ہے'
                : 'Product catalog selling price updated!'
            );
          }
        } catch (syncErr) {
          console.warn('Catalog price sync notice:', syncErr);
        }
      }

      // 2. Save BOM Recipe
      const payload: Partial<BomHeader> & { items: BomItem[] } = {
        id: isEditMode && id ? id : undefined,
        bom_number: bomNumber,
        finished_product_name: cleanName,
        finished_product_code: cleanCode || '',
        finished_product_id: effectiveProductId,
        category: effectiveCategory,
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
            : 'نیا نسخہ اور پروڈکٹ کامیابی سے محفوظ ہو گئے'
          : isEditMode
          ? 'BOM recipe updated successfully'
          : 'New BOM recipe saved successfully!'
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

      {/* HEADER BAR (Clean Title + Recipe Status Pill Selector + See List Button) */}
      <div className="mb-6 rounded-2xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
              {bomNumber}
            </span>
            <h1 className="text-xl font-black text-black dark:text-white">
              {isRTL
                ? isEditMode
                  ? 'نسخہ میں ترمیم کریں'
                  : 'نیا مینوفیکچرنگ نسخہ (BOM)'
                : isEditMode
                ? 'Edit Bill of Materials Recipe'
                : 'Create Manufacturing BOM'}
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isRTL
              ? 'تیار پروڈکٹ، خام مال کی کھپت، اور پیداواری اخراجات کا جامع فارمولا'
              : 'Formulate bill of materials, raw consumption, wastage allowances, and overhead allocations'}
          </p>
        </div>

        {/* Right side: Recipe Status Pill Selector & See List Link */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Status Pill Selector (Active / Trial) */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-meta-4 p-1 rounded-xl border border-stroke dark:border-strokedark">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-2">
              {isRTL ? 'اسٹیٹس:' : 'Status:'}
            </span>

            {/* Active Pill */}
            <button
              type="button"
              onClick={() => setStatus('Active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                status === 'Active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${status === 'Active' ? 'bg-white' : 'bg-emerald-500'}`} />
              <span>{isRTL ? 'فعال (Active)' : 'Active'}</span>
            </button>

            {/* Trial Pill */}
            <button
              type="button"
              onClick={() => setStatus('Trial')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                status === 'Trial' || status === 'Draft'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${status === 'Trial' || status === 'Draft' ? 'bg-white' : 'bg-amber-400'}`} />
              <span>{isRTL ? 'آزمائشی (Trial)' : 'Trial'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-6 w-[1px] bg-stroke dark:bg-strokedark" />

          {/* See List Link */}
          <button
            type="button"
            onClick={() => navigate('/Manufacturing/list')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <MdFormatListBulleted className="text-base" />
            <span>{isRTL ? '← لسٹ دیکھیں (See List)' : '← See List'}</span>
          </button>
        </div>
      </div>

      {/* 3 TABS STEPPER HEADER */}
      <div className="mb-6 grid grid-cols-3 gap-2 p-1.5 bg-gray-100 dark:bg-meta-4 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveTab(1)}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 1
              ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
              : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            activeTab === 1 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            1
          </span>
          <span className="truncate">{isRTL ? '1. تیار پروڈکٹ کی تفصیل' : '1. Product & Output'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!finishedProductName.trim()) {
              toast.error(isRTL ? 'پہلے پروڈکٹ کا نام درج کریں' : 'Please enter Finished Product Name first');
              return;
            }
            setActiveTab(2);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 2
              ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
              : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            activeTab === 2 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            2
          </span>
          <span className="truncate">{isRTL ? '2. خام مال (اجزاء)' : '2. Raw Materials'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!finishedProductName.trim()) {
              toast.error(isRTL ? 'پہلے پروڈکٹ کا نام درج کریں' : 'Please enter Finished Product Name first');
              return;
            }
            setActiveTab(3);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
            activeTab === 3
              ? 'bg-white dark:bg-boxdark text-primary shadow-sm'
              : 'text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
          }`}
        >
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
            activeTab === 3 ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            3
          </span>
          <span className="truncate">{isRTL ? '3. لیبر، اوور ہیڈ اور SOP' : '3. Labor & Overheads'}</span>
        </button>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT: Left Tab Content (2 cols) + Sticky Cost & Margin Card (1 col, present on all 3 tabs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT PANE: 3 TAB PANELS (with Back / Next / Save at bottom) */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* TAB 1: FINISHED PRODUCT OUTPUT & 3-LEVEL CATEGORIES */}
          {activeTab === 1 && (
            <div className="rounded-2xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark space-y-4">
              <div className="flex items-center gap-2 border-b border-stroke pb-3 dark:border-strokedark">
                <MdInventory2 className="text-xl text-primary" />
                <h2 className="text-base font-semibold text-black dark:text-white">
                  {isRTL ? 'تیار شدہ پروڈکٹ کا تعین (Finished Good Output)' : '1. Finished Product Output & Categorization'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name (Interactive Combobox: Type new name or choose existing) */}
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    {isRTL ? 'تیار پروڈکٹ کا نام *' : 'Finished Product Name *'}
                  </label>
                  <SearchableProductSelect
                    products={catalogProducts}
                    value={finishedProductName}
                    onChange={(name, selectedProd) => handleSelectFinishedProduct(name, selectedProd)}
                    placeholder={
                      isRTL
                        ? 'تیار پروڈکٹ منتخب کریں یا نیا نام لکھیں...'
                        : 'Search or type finished product (e.g., Embroidered Lawn Suit, Glazed Floor Tile 60x120)...'
                    }
                    allowCustom={true}
                    priceType="sales"
                    isRTL={isRTL}
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    {isRTL
                      ? 'اگر یہ نیا پروڈکٹ ہے تو نسخہ محفوظ کرنے پر یہ خود بخود پروڈکٹ لسٹ میں شامل ہو جائے گا۔'
                      : 'If this is a new product, saving this recipe will automatically register it in the Product Catalog.'}
                  </span>
                </div>

                {/* Product Code / SKU & Output Unit (UOM) */}
                <div className="sm:col-span-2 sm:grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                      {isRTL ? 'پروڈکٹ کوڈ / SKU' : 'Product Code / SKU'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., ESK-PREM-01"
                      value={finishedProductCode}
                      onChange={e => setFinishedProductCode(e.target.value)}
                      className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-xs font-mono outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                      {isRTL ? 'پیداواری اکائی (Output UOM) *' : 'Finished Good Unit (UOM) *'}
                    </label>
                    <SearchableUomDropdown
                      value={uom}
                      onChange={val => setUom(val)}
                      uoms={allUomsList.length > 0 ? allUomsList : availableUoms}
                      placeholder={isRTL ? 'پیداواری اکائی منتخب کریں' : 'Select Output UOM'}
                      isRTL={isRTL}
                    />
                  </div>
                </div>

                {/* 3-LEVEL CASCADING CATEGORIES (Identical to AddProduct.tsx) */}
                <div className="sm:col-span-2 pt-2 border-t border-stroke dark:border-strokedark">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                    {isRTL ? 'کیٹیگری کا درجہ بندی (3 سطحی)' : '3-Level Product Categorization'}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Level 1: Parent Category */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-black dark:text-white">
                        {isRTL ? 'Parent Category' : 'Parent Category'}
                      </label>
                      <SearchableDropdown
                        value={subSubCategory}
                        onChange={(val) => {
                          setSubSubCategory(val);
                          setSubCategory('');
                          setCategory('');
                        }}
                        options={allCategories.filter(c => c.parent_id === null).map(c => c.name)}
                        placeholder={isRTL ? 'Parent Category منتخب کریں' : 'Parent Category'}
                        allowAll={false}
                      />
                    </div>

                    {/* Level 2: Sub Category */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-black dark:text-white">
                        {isRTL ? 'Sub Category' : 'Sub Category'}
                      </label>
                      <SearchableDropdown
                        value={subCategory}
                        onChange={(val) => {
                          setSubCategory(val);
                          setCategory('');
                        }}
                        options={(() => {
                          const parent = allCategories.find(c => c.parent_id === null && c.name?.trim().toLowerCase() === String(subSubCategory || '').trim().toLowerCase());
                          if (!parent) return [];
                          return allCategories.filter(c => c.parent_id === parent.id).map(c => c.name);
                        })()}
                        placeholder={isRTL ? 'Sub Category منتخب کریں' : 'Sub Category'}
                        allowAll={false}
                        disabled={!subSubCategory}
                      />
                    </div>

                    {/* Level 3: Category */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-black dark:text-white">
                        {isRTL ? 'Category' : 'Category'}
                      </label>
                      <SearchableDropdown
                        value={category}
                        onChange={(val) => setCategory(val)}
                        options={(() => {
                          const parent = allCategories.find(c => c.parent_id === null && c.name?.trim().toLowerCase() === String(subSubCategory || '').trim().toLowerCase());
                          if (!parent) return [];
                          const sub = allCategories.find(c => c.parent_id === parent.id && c.name?.trim().toLowerCase() === String(subCategory || '').trim().toLowerCase());
                          if (!sub) return [];
                          return allCategories.filter(c => c.parent_id === sub.id).map(c => c.name);
                        })()}
                        placeholder={isRTL ? 'Category منتخب کریں' : 'Category'}
                        allowAll={false}
                        disabled={!subCategory}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RAW MATERIALS RECIPE TABLE */}
          {activeTab === 2 && (
            <div className="rounded-2xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark space-y-4">
              {/* Batch Production Target Card (Moved to Tab 2) */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 rounded-xl border border-primary/25 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary text-white shadow-xs">
                    <MdPrecisionManufacturing className="text-xl" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-black dark:text-white block">
                      {isRTL ? 'بیچ پیداواری مقدار (Batch Production Quantity) *' : 'Batch Production Quantity *'}
                    </label>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {isRTL
                        ? `یہ نسخہ نیچے دیے گئے تمام خام مال سے تیار ہونے والی کل مقدار (${uom}) کو ظاہر کرتا ہے۔`
                        : `Total output produced by this recipe run. Raw materials below formulate this exact batch size.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={batchQuantity}
                    onChange={e => setBatchQuantity(parseFloat(e.target.value) || 0)}
                    className="w-36 rounded-xl border-2 border-primary/40 bg-white py-2 px-3 text-sm font-mono font-bold text-primary dark:bg-meta-4 outline-none focus:border-primary shadow-xs text-center"
                    placeholder="1"
                  />
                  <span className="font-bold text-xs bg-white dark:bg-meta-4 border border-stroke dark:border-strokedark px-3 py-2 rounded-xl text-black dark:text-white uppercase font-mono">
                    {uom}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stroke pb-3 dark:border-strokedark">
                <div className="flex items-center gap-2">
                  <MdLayers className="text-xl text-primary" />
                  <div>
                    <h2 className="text-base font-semibold text-black dark:text-white">
                      {isRTL ? 'خام مال اور اجزائے ترکیبی (Raw Materials & Ingredients)' : '2. Raw Materials & Components'}
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

              <div className="overflow-x-auto min-h-[300px] pb-32">
                <table className="w-full min-w-[1040px] table-fixed text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-gray-300 uppercase font-semibold">
                      <th className={`p-2.5 ${isRTL ? 'text-right' : 'text-left'} w-[280px]`}>
                        {isRTL ? 'خام مال / جزو *' : 'Material / Component Name *'}
                      </th>
                      <th className="p-2.5 text-center w-[110px]">
                        {isRTL ? 'مقدار *' : 'Quantity *'}
                      </th>
                      <th className="p-2.5 text-center w-[100px]">
                        {isRTL ? 'اکائی (UOM)' : 'UOM'}
                      </th>
                      <th className="p-2.5 text-center w-[130px]">
                        {isRTL ? 'فی یونٹ ریٹ' : 'Unit Cost'}
                      </th>
                      <th className="p-2.5 text-center w-[90px]">
                        {isRTL ? 'ضیاع %' : 'Waste %'}
                      </th>
                      <th className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'} w-[140px]`}>
                        {isRTL ? 'کل لاگت' : 'Total Cost'}
                      </th>
                      <th className={`p-2.5 ${isRTL ? 'text-right' : 'text-left'} w-[140px]`}>
                        {isRTL ? 'نوٹ' : 'Note'}
                      </th>
                      <th className="p-2.5 text-center w-[50px]">
                        {isRTL ? 'حذف' : 'Del'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark">
                    {items.map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-meta-4/20 relative z-10 focus-within:z-30 hover:z-20">
                        <td className="p-2 w-[280px] relative">
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

                        <td className="p-2 w-[110px]">
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            required
                            value={row.quantity}
                            onChange={e =>
                              handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded border border-stroke bg-white dark:bg-meta-4 py-1.5 px-2 font-mono text-center outline-none focus:border-primary dark:border-strokedark font-medium"
                          />
                        </td>

                        <td className="p-2 w-[100px] relative">
                          <SearchableUomDropdown
                            value={row.uom}
                            onChange={val => handleUpdateItem(idx, 'uom', val)}
                            uoms={allUomsList.length > 0 ? allUomsList : availableUoms}
                            compact={true}
                            isRTL={isRTL}
                          />
                        </td>

                        <td className="p-2 w-[130px]">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.unit_cost}
                            onChange={e =>
                              handleUpdateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded border border-stroke bg-white dark:bg-meta-4 py-1.5 px-2 font-mono text-center outline-none focus:border-primary dark:border-strokedark font-medium"
                          />
                        </td>

                        <td className="p-2 w-[90px]">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={row.wastage_percentage}
                            onChange={e =>
                              handleUpdateItem(idx, 'wastage_percentage', parseFloat(e.target.value) || 0)
                            }
                            className="w-full rounded border border-stroke bg-white dark:bg-meta-4 py-1.5 px-2 font-mono text-center outline-none focus:border-primary dark:border-strokedark font-medium"
                            placeholder="0"
                          />
                        </td>

                        <td
                          className={`p-2 w-[140px] font-mono font-bold text-black dark:text-white ${
                            isRTL ? 'text-left' : 'text-right'
                          }`}
                        >
                          PKR {row.total_cost.toLocaleString()}
                        </td>

                        <td className="p-2 w-[140px]">
                          <input
                            type="text"
                            placeholder={isRTL ? 'نوٹ...' : 'scrap, color...'}
                            value={row.notes || ''}
                            onChange={e => handleUpdateItem(idx, 'notes', e.target.value)}
                            className="w-full rounded border border-stroke bg-white dark:bg-meta-4 py-1.5 px-2 outline-none focus:border-primary dark:border-strokedark"
                          />
                        </td>

                        <td className="p-2 w-[50px] text-center">
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

              <div className="flex justify-between items-center pt-2 border-t border-stroke dark:border-strokedark">
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
                  <span className="font-mono text-primary text-sm mr-1 ml-1 font-bold">
                    PKR {calculations.rawMaterialCost.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LABOR, OVERHEADS & PRODUCTION SOP */}
          {activeTab === 3 && (
            <div className="rounded-2xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark space-y-5">
              <div className="flex items-center gap-2 border-b border-stroke pb-3 dark:border-strokedark">
                <MdEngineering className="text-xl text-primary" />
                <div>
                  <h2 className="text-base font-semibold text-black dark:text-white">
                    {isRTL
                      ? 'لیبر، مشینری اور فیکٹری اخراجات (Overheads & SOP)'
                      : '3. Labor, Machine, Packaging Overheads & SOP'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {isRTL
                      ? 'خام مال کے علاوہ اس بیچ پر آنے والے تمام اضافی پیداواری اخراجات درج کریں'
                      : 'Add direct conversion labor, utilities, packaging, and standard operating procedures'}
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
                    className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-xs font-mono outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    {isRTL ? 'سلائی، پریسنگ، کٹنگ یا کاریگر اجرت' : 'Tailoring, cutting, machine operators'}
                  </span>
                </div>

                {/* Machine & Utility Overheads */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    {isRTL ? 'مشینری، ایندھن اور بجلی (PKR)' : 'Machinery & Fuel (PKR)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={overheadCost}
                    onChange={e => setOverheadCost(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-xs font-mono outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    {isRTL ? 'جنریٹر، بجلی اور پلانٹ رننگ' : 'Electricity, generator, machine runtime'}
                  </span>
                </div>

                {/* Packaging & Finishing */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-black dark:text-white">
                    {isRTL ? 'پیکنگ و فنشنگ (PKR)' : 'Packaging & Finishing (PKR)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={packagingCost}
                    onChange={e => setPackagingCost(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full rounded-lg border border-stroke bg-transparent py-2.5 px-3 text-xs font-mono outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                  />
                  <span className="text-[11px] text-gray-500 mt-1 block">
                    {isRTL ? 'باکس، ہینگر، شاپر اور بارکوڈ' : 'Boxes, bags, hangers & barcodes'}
                  </span>
                </div>
              </div>

              {/* SOP Instructions */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-black dark:text-white mb-1.5">
                  {isRTL ? 'پیداواری ہدایات و نوٹس (Production SOP & Notes)' : 'Production SOP & Quality Instructions'}
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
                  className="w-full rounded-lg border border-stroke bg-transparent py-2 px-3 text-xs outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
                />
              </div>
            </div>
          )}

          {/* BOTTOM STEPPER CONTROLS (Back, Next, Save) */}
          <div className="flex items-center justify-between rounded-2xl border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
            <div>
              {activeTab > 1 && (
                <button
                  type="button"
                  onClick={handlePrevTab}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stroke px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 dark:border-strokedark dark:text-gray-300 dark:hover:bg-meta-4 transition"
                >
                  <MdArrowBack className={`text-base ${isRTL ? 'rotate-180' : ''}`} />
                  <span>{isRTL ? 'پیچھے (Back)' : 'Back'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {activeTab < 3 ? (
                <button
                  type="button"
                  onClick={handleNextTab}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-opacity-90 transition"
                >
                  <span>{isRTL ? 'اگلا مرحلہ (Next)' : 'Next Step'}</span>
                  <MdArrowForward className={`text-base ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-opacity-90 disabled:opacity-50 transition"
                >
                  <MdSave className="text-base" />
                  <span>
                    {saving
                      ? isRTL
                        ? 'محفوظ ہو رہا ہے...'
                        : 'Saving Recipe...'
                      : isRTL
                      ? 'نسخہ محفوظ کریں'
                      : 'Save Recipe'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: STICKY LIVE COST & MARGIN SUMMARY CARD (Visible on all 3 tabs) */}
        <div className="sticky top-24 rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 via-white to-white p-5 shadow-sm dark:from-primary/10 dark:via-boxdark dark:to-boxdark dark:border-strokedark flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stroke pb-3 dark:border-strokedark">
              <div className="flex items-center gap-2">
                <MdTrendingUp className="text-xl text-primary" />
                <h3 className="text-base font-bold text-black dark:text-white">
                  {isRTL ? 'پیداواری لاگت اور منافع' : 'Cost & Margin Summary'}
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase bg-primary text-white px-2 py-0.5 rounded">
                LIVE
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                <span>{isRTL ? 'کل خام مال کی لاگت:' : 'Raw Materials Cost:'}</span>
                <span className="font-mono font-bold text-black dark:text-white">
                  PKR {calculations.rawMaterialCost.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                <span>{isRTL ? 'لیبر اور اوور ہیڈز:' : 'Labor & Overheads:'}</span>
                <span className="font-mono font-bold text-black dark:text-white">
                  PKR {calculations.totalOverheads.toLocaleString()}
                </span>
              </div>

              <div className="border-t border-dashed border-stroke dark:border-strokedark pt-2 flex justify-between items-center font-bold text-black dark:text-white">
                <span>{isRTL ? 'کل بیچ پیداواری لاگت:' : 'Total Batch Cost:'}</span>
                <span className="font-mono text-sm text-primary">
                  PKR {calculations.totalBatchCost.toLocaleString()}
                </span>
              </div>

              {/* Highlighted Net Unit Cost */}
              <div className="bg-white dark:bg-meta-4 p-3 rounded-xl border border-stroke dark:border-strokedark">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">
                  {isRTL ? 'خالص فی یونٹ پیداواری لاگت:' : 'Net Unit Production Cost:'}
                </span>
                <div className="text-xl font-bold font-mono text-black dark:text-white mt-0.5">
                  PKR {calculations.unitCost.toLocaleString()}
                  <span className="text-xs font-normal text-gray-400 mr-1 ml-1">
                    / {uom}
                  </span>
                </div>
              </div>

              {/* Target Selling Price */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-black dark:text-white">
                  {isRTL ? 'ہدف سیلز پرائس (PKR فی یونٹ)' : 'Target Selling Price (PKR / Unit)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={targetSellingPrice}
                  onChange={e => setTargetSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-primary/50 bg-white py-2 px-3 text-xs font-mono font-bold text-emerald-600 dark:bg-meta-4 outline-none focus:border-primary"
                  placeholder="0"
                />

                {/* Sync to Catalog Pill Selector */}
                <button
                  type="button"
                  onClick={() => setSyncCatalogPrice(prev => !prev)}
                  className={`mt-2 w-full flex items-center justify-between p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    syncCatalogPrice
                      ? 'bg-primary/10 border-primary/40 text-primary dark:bg-primary/20 dark:border-primary/50'
                      : 'bg-white/80 border-stroke text-gray-500 hover:bg-gray-50 dark:bg-meta-4 dark:border-strokedark dark:text-gray-400'
                  }`}
                  title={
                    isRTL
                      ? 'اگر فعال ہو تو پروڈکٹ لسٹ میں بھی سیلز پرائس اپڈیٹ ہو جائے گی'
                      : 'When enabled, this price will also update the product sales price in Products Catalog'
                  }
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                        syncCatalogPrice
                          ? 'bg-primary border-primary text-white'
                          : 'border-stroke bg-white dark:border-strokedark dark:bg-boxdark text-transparent'
                      }`}
                    >
                      <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                        <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-semibold leading-tight">
                      {isRTL ? 'کیٹلاگ پرائس بھی اپڈیٹ کریں' : 'Also update Catalog Price'}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-all ${
                      syncCatalogPrice
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {syncCatalogPrice ? (isRTL ? 'فعال' : 'ON') : (isRTL ? 'غیر فعال' : 'OFF')}
                  </span>
                </button>
              </div>

              {/* Profit Breakdown */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-semibold">
                    {isRTL ? 'فی یونٹ منافع' : 'Unit Profit'}
                  </span>
                  <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                    PKR {calculations.unitProfit.toLocaleString()}
                  </span>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-semibold">
                    {isRTL ? 'منافع مارجن' : 'Gross Margin'}
                  </span>
                  <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                    {calculations.marginPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stroke dark:border-strokedark text-[11px] text-gray-400">
            <MdInfoOutline className="inline mr-1 text-xs text-primary" />
            {isRTL
              ? 'تینوں مراحل میں کسی بھی قیمت یا خام مال کی تبدیلی سے لاگت فوراً اپڈیٹ ہوتی ہے۔'
              : 'Unit cost dynamically recalculates whenever raw items, waste, or batch quantities change.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddBOM;
