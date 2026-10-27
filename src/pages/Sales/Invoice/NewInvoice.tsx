import React, { useState, useEffect, useRef } from 'react';
import { getAvailableStock, getTotalAvailableStock, getWarehouseAvailableStock, fetchStockDataset } from '../../../utils/stockCalculator';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiPrinter, FiSave, FiCheck, FiX, FiUserCheck, FiTrash2, FiUser, FiAlertTriangle, FiArrowRight, FiPlus, FiSearch, FiMapPin, FiPhone, FiHash, FiBriefcase, FiChevronDown } from 'react-icons/fi';
import { SearchableDropdown } from '../../../components/SearchableDropdown';
import { useAuth } from '../../../Context/Auth';
import { logActivity } from '../../../service/auditLogger';
import { triggerFeedbackSound } from '../../../utils/audioFeedback';
import { fetchCustomerCreditLimits } from '../../../utils/creditLimitUtils';

// Universal comprehensive search helper matching across Name, Code, Category, Sub Cat, Parent Cat, Brand, and Description
const matchesProductSearch = (p: any, query: string): boolean => {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  const name = String(p?.product_name || p?.itemName || '').toLowerCase();
  const code = String(p?.item_sr_no || p?.skuCode || '').toLowerCase();
  const cat = String(p?.category || '').toLowerCase();
  const subCat = String(p?.sub_category || '').toLowerCase();
  const parentCat = String(p?.sub_sub_category || '').toLowerCase();
  const brand = String(p?.brand || p?.bin || '').toLowerCase();
  const desc = String(p?.product_description || '').toLowerCase();
  const sku = ('sku-' + (p?.id || '')).toLowerCase();

  return (
    name.includes(q) ||
    code.includes(q) ||
    cat.includes(q) ||
    subCat.includes(q) ||
    parentCat.includes(q) ||
    brand.includes(q) ||
    desc.includes(q) ||
    sku.includes(q)
  );
};

// Helper to identify Tile products based on parent category
const isTileProduct = (p: any) => {
  const parent = String(p?.sub_sub_category || '').toLowerCase().trim();
  return parent.includes('tile');
};

const NewInvoice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantId, role, userName, userEmail } = useAuth();
  const [customerCreditLimitsMap, setCustomerCreditLimitsMap] = useState<Record<string, number>>({});

  const checkAndAlertCreditLimit = (cust: any) => {
    if (!cust) return;
    const limit = Number(customerCreditLimitsMap[String(cust.id)] || 0);
    const bal = Number(cust.currentBalance !== undefined ? cust.currentBalance : (cust.balance || 0));
    if (limit > 0 && bal >= limit) {
      triggerFeedbackSound('warning', userEmail);
      toast.error(`Credit Limit Warning: "${cust.customerName}" has an outstanding balance of Rs. ${bal.toLocaleString()} which exceeds their agreed credit limit of Rs. ${limit.toLocaleString()}!`, { duration: 6000 });
    } else if (limit > 0 && bal >= 0.75 * limit) {
      triggerFeedbackSound('warning', userEmail);
      toast(`Credit Limit Alert: "${cust.customerName}" has reached ${Math.round((bal / limit) * 100)}% of their credit limit (Rs. ${limit.toLocaleString()}).`, { icon: '⚠️', duration: 5000 });
    }
  };
  const currentRole = (role || localStorage.getItem('zac_user_role') || '').toLowerCase();
  const currentSalesmanName = (userName || localStorage.getItem('zac_user_name') || '').trim();
  const isSalesman = currentRole.includes('salesman');
  const editData = location.state?.invoice || location.state?.record || null;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [submitAction, setSubmitAction] = useState<'save' | 'print'>('save');

  const [customersList, setCustomersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [salesmenList, setSalesmenList] = useState<any[]>([]);
  const matchedSalesman = salesmenList.find(
    (s) => (s.name || '').toLowerCase().trim() === currentSalesmanName.toLowerCase()
  )?.name || currentSalesmanName;
  const [transportList, setTransportList] = useState<any[]>([]);
  const [warehousesList, setWarehousesList] = useState<any[]>([]);
  const [stockDataset, setStockDataset] = useState<any>(null);
  const productDropdownScrollRef = useRef<HTMLDivElement>(null);
  const [banksList, setBanksList] = useState<any[]>([]);
  const [activeSkuIndex, setActiveSkuIndex] = useState<number | null>(null);
  const [highlightedSkuIndex, setHighlightedSkuIndex] = useState<number>(0);
  const [activeProdNameIndex, setActiveProdNameIndex] = useState<number | null>(null);
  const [highlightedProdNameIndex, setHighlightedProdNameIndex] = useState<number>(0);
  const [activeWhIndex, setActiveWhIndex] = useState<number | null>(null);
  const [highlightedWhIndex, setHighlightedWhIndex] = useState<number>(0);
  const [activeReturnProdIndex, setActiveReturnProdIndex] = useState<number | null>(null);
  const [highlightedReturnProdIndex, setHighlightedReturnProdIndex] = useState<number>(0);
  const [activeReturnWhIndex, setActiveReturnWhIndex] = useState<number | null>(null);
  const [highlightedReturnWhIndex, setHighlightedReturnWhIndex] = useState<number>(0);
  const [activeTileProdIndex, setActiveTileProdIndex] = useState<number | null>(null);
  const [highlightedTileProdIndex, setHighlightedTileProdIndex] = useState<number>(0);
  const [activeTileWhIndex, setActiveTileWhIndex] = useState<number | null>(null);
  const [highlightedTileWhIndex, setHighlightedTileWhIndex] = useState<number>(0);
  const [activeTileReturnProdIndex, setActiveTileReturnProdIndex] = useState<number | null>(null);
  const [highlightedTileReturnProdIndex, setHighlightedTileReturnProdIndex] = useState<number>(0);
  const [activeTileReturnWhIndex, setActiveTileReturnWhIndex] = useState<number | null>(null);
  const [highlightedTileReturnWhIndex, setHighlightedTileReturnWhIndex] = useState<number>(0);

  // Customer Searchable Combobox & Quick Add Modal State
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState<number>(0);

  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState<boolean>(false);
  const [quickCustomerName, setQuickCustomerName] = useState<string>('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState<string>('');
  const [quickCustomerAddress, setQuickCustomerAddress] = useState<string>('');
  const [quickCustomerCode, setQuickCustomerCode] = useState<string>('');
  const [quickCustomerCategory, setQuickCustomerCategory] = useState<string>('Retail / General');
  const [quickCustomerOpeningBal, setQuickCustomerOpeningBal] = useState<number | string>(0);
  const [quickCustomerBalNature, setQuickCustomerBalNature] = useState<'Debit' | 'Credit'>('Debit');
  const [isSavingQuickCustomer, setIsSavingQuickCustomer] = useState<boolean>(false);

  const getNextCustomerCode = (): string => {
    let maxNum = 0;
    customersList.forEach((c: any) => {
      const code = c.customer_code || c.customerCode || c.coa_code || '';
      const match = String(code).match(/1020-(\d+)/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `1020-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleOpenQuickCustomerModal = (initialName: string = '', setFieldValueFn?: any) => {
    if (setFieldValueFn) {
      setActiveFormikSetFieldValue(() => setFieldValueFn);
    }
    setQuickCustomerName(initialName);
    setQuickCustomerPhone('');
    setQuickCustomerAddress('');
    setQuickCustomerCode(getNextCustomerCode());
    setQuickCustomerCategory('Retail / General');
    setQuickCustomerOpeningBal(0);
    setQuickCustomerBalNature('Debit');
    setIsQuickCustomerModalOpen(true);
    setIsCustomerDropdownOpen(false);
  };

  const handleSaveQuickCustomer = async (formikSetFieldValue: any, currentShippingAddress?: string) => {
    const trimmedName = quickCustomerName.trim();
    if (!trimmedName) {
      toast.error('Customer Name is required!');
      return;
    }
    setIsSavingQuickCustomer(true);
    try {
      const cleanCode = quickCustomerCode.trim();
      const parsedOpeningBal = Number(quickCustomerOpeningBal || 0);
      const computedBalance = quickCustomerBalNature === 'Credit' ? -Math.abs(parsedOpeningBal) : Math.abs(parsedOpeningBal);

      const payload: any = {
        customerName: trimmedName,
        customer_code: cleanCode,
        customerCode: cleanCode,
        coa_code: cleanCode,
        registrationType: quickCustomerCategory,
        primaryPhone: quickCustomerPhone.trim(),
        phone: quickCustomerPhone.trim(),
        address: quickCustomerAddress.trim(),
        province: 'Sindh',
        opening_balance: computedBalance,
        currentBalance: computedBalance,
      };

      const { data: insertData, error: insertError } = await supabase
        .from('customers')
        .insert([payload])
        .select('id');

      if (insertError) throw insertError;

      const newCustomerId = insertData?.[0]?.id || Date.now();
      const createdCustObj = {
        id: newCustomerId,
        ...payload
      };

      if (cleanCode) {
        try {
          const coaPayload: any = {
            category_code: '1. ASSETS',
            sub_category_code: 'Current Assets',
            control_code: 'Customers',
            account_code: cleanCode,
            account_title: trimmedName,
            opening_balance: Math.abs(parsedOpeningBal),
            balance_nature: quickCustomerBalNature || 'Debit',
            notes: `Customer ledger account for ${trimmedName} (Synced from Quick Add)`
          };
          await supabase.from('chart_of_accounts').insert([coaPayload]);
        } catch (coaErr) {
          console.warn('COA Quick-sync warning:', coaErr);
        }
      }

      setCustomersList((prev) => [createdCustObj, ...prev]);

      if (formikSetFieldValue) {
        formikSetFieldValue('customerName', trimmedName);
        if (quickCustomerAddress.trim() && !currentShippingAddress) {
          formikSetFieldValue('shippingAddress', quickCustomerAddress.trim());
        }
      }
      setSelectedRecordedCustomer(trimmedName);
      setCustomerModalType('recorded');
      fetchCustomerPastSales(trimmedName);
      setCustomerSearchQuery('');
      setIsQuickCustomerModalOpen(false);
      toast.success(`Customer "${trimmedName}" created and selected!`);
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      toast.error(err.message || 'Failed to create customer');
    } finally {
      setIsSavingQuickCustomer(false);
    }
  };

  const [totalStockMap, setTotalStockMap] = useState<Record<string, number>>({});
  const [customerSoldMap, setCustomerSoldMap] = useState<Record<string, { boxes: number; loose: number; totalPieces: number }>>({});

  const fetchCustomerPastSales = async (customerName: string) => {
    if (!customerName || customerName.toLowerCase() === 'walk-in customer') {
      setCustomerSoldMap({});
      return;
    }
    try {
      const { data, error } = await supabase
        .from('sales_invoices')
        .select('id, invoice_no, items')
        .ilike('customer_name', customerName.trim());
      if (error || !data) return;

      const soldMap: Record<string, { boxes: number; loose: number; totalPieces: number }> = {};
      data.forEach((inv: any) => {
        let items = inv.items;
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch (_) { items = []; }
        }
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const nameKey = String(item.itemName || item.product_name || '').toLowerCase().trim();
            if (!nameKey) return;
            const ppb = Math.max(1, Number(item.piecesPerBox || item.pcsPerBox || 4));
            const boxQty = Number(item.boxQty || (item.isTileItem ? item.qty : 0) || 0);
            const loose = Number(item.loosePcs || 0);
            const pieces = (boxQty * ppb) + loose;

            if (!soldMap[nameKey]) {
              soldMap[nameKey] = { boxes: 0, loose: 0, totalPieces: 0 };
            }
            soldMap[nameKey].boxes += boxQty;
            soldMap[nameKey].loose += loose;
            soldMap[nameKey].totalPieces += pieces;
          });
        }
      });
      setCustomerSoldMap(soldMap);
    } catch (err) {
      console.error('Failed to fetch customer past sales:', err);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const calculateAllStocks = async () => {
      if (!productsList || productsList.length === 0) return;
      const map: Record<string, number> = {};

      if (stockDataset) {
        if (stockDataset.balancesMode && Array.isArray(stockDataset.balances)) {
          (stockDataset.balances || []).forEach((r: any) => {
            const name = String(r.product_name || '').toLowerCase().trim();
            map[name] = (map[name] || 0) + (Number(r.quantity) || 0);
          });
        } else {
          for (const p of productsList) {
            const name = (p.product_name || '').toLowerCase().trim();
            try {
              const val = await getTotalAvailableStock(p.product_name, stockDataset);
              map[name] = val;
            } catch {
              map[name] = Number(p.current_stock || 0);
            }
          }
        }
      }
      productsList.forEach(p => {
        const name = (p.product_name || '').toLowerCase().trim();
        if (map[name] === undefined) {
          map[name] = Number(p.current_stock || 0);
        }
      });
      if (!isCancelled) {
        setTotalStockMap(map);
      }
    };
    calculateAllStocks();
    return () => { isCancelled = true; };
  }, [stockDataset, productsList]);

  const getProductOverallStock = (p: any): number => {
    if (!p) return 0;
    const key = String(p.product_name || '').toLowerCase().trim();
    if (totalStockMap[key] !== undefined) return totalStockMap[key];
    return Number(p.current_stock || 0);
  };

  const getTileStockBreakdown = (p: any) => {
    const totStock = getProductOverallStock(p);
    let pcsPerBox = Number(p.pieces_per_box || p.pcs_per_box || p.pieces_per_packing || 0);
    if (pcsPerBox <= 1) {
      const match = String(p.product_description || '').match(/Box:\s*(\d+)\s*pcs/i);
      if (match && Number(match[1]) > 0) pcsPerBox = Number(match[1]);
      else pcsPerBox = 4;
    }
    const boxes = Math.floor(totStock);
    const loose = Math.round((totStock - boxes) * pcsPerBox);
    return { totStock, boxes, loose, pcsPerBox };
  };

  const getItemWarehouseStock = (productName: string, warehouseName: string, itemCode?: string): number => {
    if (!productName || !warehouseName) return 0;
    return getWarehouseAvailableStock(productName, warehouseName, stockDataset);
  };

  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [showStockWarningModal, setShowStockWarningModal] = useState<boolean>(false);
  const [stockWarningItems, setStockWarningItems] = useState<any[]>([]);
  const [bypassNegativeStockWarning, setBypassNegativeStockWarning] = useState<boolean>(false);
  const [activeFormikSetFieldValue, setActiveFormikSetFieldValue] = useState<any>(null);
  const [customerModalType, setCustomerModalType] = useState<'walkin' | 'recorded'>('walkin');
  const [walkinName, setWalkinName] = useState<string>('');
  const [walkinPhone, setWalkinPhone] = useState<string>('');
  const [recordWalkinCustomer, setRecordWalkinCustomer] = useState<boolean>(true);
  const [selectedRecordedCustomer, setSelectedRecordedCustomer] = useState<string>('');
  const [pendingFormValues, setPendingFormValues] = useState<any>(null);
  const [isOpeningCustomerModal, setIsOpeningCustomerModal] = useState<boolean>(false);
  const [serverToday, setServerToday] = useState<Date | null>(null);

  useEffect(() => {
    // Fetch server date so validation is not based on user's local clock
    supabase.rpc('get_server_date').then(({ data }) => {
      if (data) setServerToday(new Date(data));
      else setServerToday(new Date());
    }).catch(() => setServerToday(new Date()));

  // Fetch enterprise catalog
    const fetchCompleteEnterpriseCatalog = async () => {
      try {
        setInitialLoading(true);
        const { data: rawCust } = await supabase.from('customers').select('*');
        const { data: prod } = await supabase.from('products').select('id, product_name, current_stock, retail_price, purchase_price, item_sr_no, category, sub_category, sub_sub_category, hs_code, uom, pieces_per_box, pcs_per_box, pieces_per_packing, product_description, bin, item_type, service_charges');
        const { data: sm } = await supabase.from('salesmen').select('id, name, invoice_name, invoice_names');
        const { data: trans } = await supabase.from('logistics_transportation').select('id, name, base_charges');
        const { data: locMaster } = await supabase.from('inventory_locations').select('name');
        const { data: wh } = await supabase.from('opening_stocks').select('location');
        const { data: invWh } = await supabase.from('warehouse_inventory').select('warehouse_name');
        const { data: rawBnk } = await supabase.from('banks').select('*');

        const cust = (rawCust || []).map((c: any) => ({
          ...c,
          customerName: c.customerName || c.customername || c.name || '',
          primaryPhone: c.primaryPhone || c.primaryphone || c.phone || '',
          customer_code: c.customer_code || c.customerCode || c.customercode || ''
        }));
        const bnk = (rawBnk || []).map((b: any) => ({
          ...b,
          bankName: b.bankName || b.bankname || '',
          accountTitle: b.accountTitle || b.accounttitle || b.account_title || ''
        }));

        // Load the stock ledger snapshot once (reused for every row's availability check)
        fetchStockDataset().then(setStockDataset).catch(() => setStockDataset(null));

        if (cust) setCustomersList(cust);
        if (prod) setProductsList(prod);
        if (sm) setSalesmenList(sm);
        if (trans) setTransportList(trans);

        const combinedLocs = [
          ...(locMaster || []).map((l: any) => l.name)
        ];
        const uniqueLocations = Array.from(new Set(combinedLocs.map((loc: any) => String(loc || '').trim()).filter(Boolean)));
        setWarehousesList(uniqueLocations);

        if (bnk) setBanksList(bnk);
      } catch (err: any) {
        toast.error('Failed to aggregate core infrastructure registries: ' + err.message);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchCompleteEnterpriseCatalog();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.sku-container')) {
        setActiveSkuIndex(null);
      }
      if (!target.closest('.prod-name-container')) {
        setActiveProdNameIndex(null);
      }
      if (!target.closest('.wh-container')) {
        setActiveWhIndex(null);
      }
      if (!target.closest('.return-prod-name-container')) {
        setActiveReturnProdIndex(null);
      }
      if (!target.closest('.return-wh-container')) {
        setActiveReturnWhIndex(null);
      }
      if (!target.closest('.tile-prod-name-container')) {
        setActiveTileProdIndex(null);
      }
      if (!target.closest('.tile-wh-container')) {
        setActiveTileWhIndex(null);
      }
      if (!target.closest('.tile-return-prod-name-container')) {
        setActiveTileReturnProdIndex(null);
      }
      if (!target.closest('.tile-return-wh-container')) {
        setActiveTileReturnWhIndex(null);
      }
      if (!target.closest('.customer-combobox-container')) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editData && (editData.customer_name || editData.customerName)) {
      fetchCustomerPastSales(editData.customer_name || editData.customerName);
    }
  }, [editData]);

  const getSalesmanPrefix = (salesmanName: string, smList: any[] = salesmenList): string => {
    if (!salesmanName) return '';
    const smObj = (smList && smList.length > 0 ? smList : salesmenList).find(
      (s) => (s.name || '').toLowerCase().trim() === salesmanName.toLowerCase().trim()
    );
    const rawPrefix = (
      smObj?.invoice_name ||
      (smObj?.invoice_names && smObj?.invoice_names[0]) ||
      smObj?.name ||
      salesmanName ||
      ''
    )
      .trim()
      .toUpperCase();

    return rawPrefix ? `${rawPrefix}-` : '';
  };

  const getFormInitialValues = () => {
    if (editData) {
      const parsedItems = Array.isArray(editData.items)
        ? editData.items
        : JSON.parse(editData.items || '[]');

      // Intelligently separate standard return items from tile return items
      const rawReturnItems = Array.isArray(editData.return_items) ? editData.return_items : (parsedItems[0]?._returnItems || []);
      const rawTileReturnItems = (Array.isArray(editData.tile_return_items) && editData.tile_return_items.length > 0)
        ? editData.tile_return_items
        : (Array.isArray(parsedItems[0]?._tileReturnItems) && parsedItems[0]._tileReturnItems.length > 0
            ? parsedItems[0]._tileReturnItems
            : []);

      const isTileLikeItem = (it: any) => {
        if (it.isTileItem) return true;
        if (String(it.uom || '').toUpperCase() === 'BOX') return true;
        const matched = productsList.find((p: any) => 
          (it.skuCode && String(p.item_sr_no).trim().toLowerCase() === String(it.skuCode).trim().toLowerCase()) ||
          (it.itemName && String(p.product_name).trim().toLowerCase() === String(it.itemName).trim().toLowerCase())
        );
        if (matched && (
          String(matched.sub_sub_category).toUpperCase().includes('TILE') ||
          String(matched.uom).toUpperCase() === 'BOX' ||
          Number(matched.pieces_per_box) > 1 ||
          Number(matched.pcs_per_box) > 1
        )) {
          return true;
        }
        return false;
      };

      const migratedTileReturns = [...rawTileReturnItems];
      const nonTileReturns: any[] = [];

      rawReturnItems.forEach((r: any) => {
        if (isTileLikeItem(r)) {
          const exists = migratedTileReturns.some((t: any) =>
            (t.skuCode && t.skuCode === r.skuCode) || (t.itemName && t.itemName === r.itemName)
          );
          if (!exists) {
            migratedTileReturns.push(r);
          }
        } else {
          nonTileReturns.push(r);
        }
      });

      return {
        invoiceNo: editData.invoice_no || '',
        customerName: editData.customer_name || editData.customerName || '',
        saleDate: editData.sale_date || new Date().toISOString().split('T')[0],
        paymentTerm: editData.payment_term || 'Cash',
        dispatchWarehouse: editData.dispatch_warehouse || '',
        applyFbrTax: Boolean(editData.apply_fbr_tax || (editData.scenario_type && editData.scenario_type !== 'Standard Retail Sale (No Tax)')),
        taxScenario: editData.scenario_type || 'Goods at Standard Rate to Registered Buyers',
        salesman: editData.salesman || (isSalesman ? (matchedSalesman || currentSalesmanName) : ''),
        transportType: editData.transport_name || 'No Transport (Handover)',
        transportCharges: Number(editData.transport_charges || 0),
        settlementMode: (Number(editData.cash_amount_paid || 0) > 0 && (Number(editData.bank_amount || 0) > 0 || editData.selected_bank))
          ? 'Split'
          : (editData.selected_bank || Number(editData.bank_amount || 0) > 0 ? 'Bank' : 'Cash'),
        selectedBankTitle: editData.selected_bank || '',
        cashAmountPaid: Number(editData.cash_amount_paid || 0),
        bankAmountPaid: Number(editData.bank_amount || 0),
        dcNo: editData.dc_no || '',
        gatePasses: (() => {
          if (!editData.gate_pass_no) return {};
          try {
            if (editData.gate_pass_no.includes(':')) {
              const parts = String(editData.gate_pass_no).split(' | ');
              const obj: any = {};
              parts.forEach((p) => {
                const [k, v] = p.split(':');
                if (k && v) obj[k.trim()] = v.trim();
              });
              return obj;
            }
            return { [editData.items?.[0]?.warehouse || 'Main Warehouse']: editData.gate_pass_no };
          } catch (e) { return {}; }
        })(),
        shippingAddress: editData.shipping_address || '',
        showDiscount: parsedItems.some((i: any) => Number(i.discountAmt || i.discount_amt || i.discount || 0) > 0),
        showOverallDiscount: Number(editData.overall_discount || editData.discount_amount || parsedItems.find((i: any) => i._overallDiscount !== undefined)?._overallDiscount || 0) > 0,
        overallDiscount: Number(editData.overall_discount || editData.discount_amount || parsedItems.find((i: any) => i._overallDiscount !== undefined)?._overallDiscount || 0),
        showAdditionalCharges: Number(editData.additional_charges || 0) > 0,
        additionalCharges: Number(editData.additional_charges || 0),

        showReturnSection: nonTileReturns.length > 0,
        returnItems: nonTileReturns.map((r: any) => ({
          skuCode: r.skuCode || r.sku || '',
          itemName: r.itemName || r.product_name || '',
          warehouse: r.warehouse || editData.dispatch_warehouse || '',
          qty: Number(r.qty || 1),
          rp: Number(r.rp ?? r.rate ?? 0),
          uom: r.uom || 'PCS',
          amount: Number(r.total || (Number(r.qty || 1) * Number(r.rp ?? r.rate ?? 0)))
        })),
        showTileReturnSection: migratedTileReturns.length > 0,
        tileReturnItems: migratedTileReturns.map((t: any, tIdx: number) => {
          const matchedProd = productsList.find((p: any) => 
            (t.skuCode && String(p.item_sr_no).trim().toLowerCase() === String(t.skuCode).trim().toLowerCase()) ||
            (t.itemName && String(p.product_name).trim().toLowerCase() === String(t.itemName).trim().toLowerCase())
          );
          const pcsPerBox = Number(t.piecesPerBox ?? matchedProd?.pieces_per_box ?? matchedProd?.pcs_per_box ?? 8);
          const sqmPerBox = Number(t.sqmPerBox ?? 1.44);
          const bQty = Number(t.boxQty ?? t.qty ?? 1);
          const lPcs = Number(t.loosePcs ?? 0);
          const pBox = Number(t.pricePerBox ?? t.rp ?? t.rate ?? (matchedProd?.retail_price || 0));
          const pPiece = pBox > 0 && pcsPerBox > 0 ? (pBox / pcsPerBox) : Number(t.pricePerPiece ?? 0);
          const pSqm = pBox > 0 && sqmPerBox > 0 ? (pBox / sqmPerBox) : Number(t.pricePerSqm ?? 0);
          const totAmount = Number(t.totalAmount ?? t.total ?? t.amount ?? ((bQty * pBox) + (lPcs * pPiece)));
          const totSqm = Number(t.totalSqm ?? (bQty * sqmPerBox + (lPcs / pcsPerBox) * sqmPerBox));
          return {
            id: t.id || `tile-return-${tIdx}-${Date.now()}`,
            skuCode: t.skuCode || t.sku || matchedProd?.item_sr_no || '',
            itemName: t.itemName || t.product_name || matchedProd?.product_name || '',
            warehouse: t.warehouse || editData.dispatch_warehouse || '',
            availableQty: Number(t.availableQty || 0),
            boxQty: bQty,
            loosePcs: lPcs,
            piecesPerBox: pcsPerBox,
            sqmPerBox: sqmPerBox,
            pricePerBox: pBox,
            pricePerSqm: Number(pSqm.toFixed(2)),
            pricePerPiece: Number(pPiece.toFixed(2)),
            totalAmount: totAmount,
            totalSqm: Number(totSqm.toFixed(2)),
            isTileItem: true
          };
        }),
        showTileSection: (Array.isArray(editData.tile_items) && editData.tile_items.length > 0) || (Array.isArray(parsedItems[0]?._tileItems) && parsedItems[0]._tileItems.length > 0) || parsedItems.some((i: any) => i.isTileItem),
        tileItems: (
          Array.isArray(editData.tile_items) && editData.tile_items.length > 0
            ? editData.tile_items
            : (Array.isArray(parsedItems[0]?._tileItems) && parsedItems[0]._tileItems.length > 0
                ? parsedItems[0]._tileItems
                : parsedItems.filter((i: any) => i.isTileItem))
        ).map((t: any, tIdx: number) => ({
          id: t.id || `tile-${tIdx}-${Date.now()}`,
          skuCode: t.skuCode || t.sku || '',
          itemName: t.itemName || t.product_name || '',
          warehouse: t.warehouse || editData.dispatch_warehouse || '',
          availableQty: Number(t.availableQty || 0),
          boxQty: Number(t.boxQty ?? t.qty ?? 1),
          loosePcs: Number(t.loosePcs ?? 0),
          piecesPerBox: Number(t.piecesPerBox ?? 4),
          sqmPerBox: Number(t.sqmPerBox ?? 1.44),
          pricePerBox: Number(t.pricePerBox ?? t.rp ?? 0),
          pricePerSqm: Number(t.pricePerSqm ?? 0),
          pricePerPiece: Number(t.pricePerPiece ?? 0),
          totalAmount: Number(t.totalAmount ?? t.total ?? t.amount ?? 0),
          totalSqm: Number(t.totalSqm ?? 0),
          isTileItem: true
        })),
        items: (parsedItems.filter((i: any) => !i.isTileItem).length > 0
          ? parsedItems.filter((i: any) => !i.isTileItem)
          : [{ skuCode: '', itemName: '', warehouse: '', qty: 1, rp: 0, discountPer: 0, discountAmt: 0, gstRate: 0, fTaxPer: 0, amount: 0, availableQty: 0, itemServiceCharges: 0 }]
        ).map((it: any) => ({
          ...it,
          warehouse: it.warehouse || editData.dispatch_warehouse || '',
          discountPer: Number(it.discountPer ?? it.discount_per ?? 0),
          discountAmt: Number(it.discountAmt ?? it.discount_amt ?? it.discount ?? 0)
        })),
        excessCreditAction: editData.excess_credit_action || (parsedItems[0]?._excessCreditAction || (Number(parsedItems[0]?._refundPayoutAmount || parsedItems[0]?._excessRefundAmount || 0) > 0 ? 'refund' : 'credit')),
        excessRefundAmount: Number(parsedItems[0]?._refundPayoutAmount ?? parsedItems[0]?._excessRefundAmount ?? 0),
        excessRefundMethod: parsedItems[0]?._refundPayoutMethod ?? parsedItems[0]?._excessRefundMethod ?? 'Cash',
        excessRefundBank: parsedItems[0]?._refundPayoutBank ?? parsedItems[0]?._excessRefundBank ?? ''
      };
    }
    return {
      invoiceNo: '', customerName: '', saleDate: new Date().toISOString().split('T')[0], paymentTerm: 'Cash',
      dispatchWarehouse: '', applyFbrTax: false, showDiscount: false, showOverallDiscount: false, overallDiscount: 0, showAdditionalCharges: false, additionalCharges: 0,
      showReturnSection: false, returnItems: [],
      showTileReturnSection: false, tileReturnItems: [],
      showTileSection: false, tileItems: [],
      taxScenario: 'Goods at Standard Rate to Registered Buyers',
      salesman: isSalesman ? (matchedSalesman || currentSalesmanName) : '',
      transportType: 'No Transport (Handover)', transportCharges: 0, settlementMode: 'Cash',
      selectedBankTitle: '', cashAmountPaid: 0, bankAmountPaid: 0,
      excessCreditAction: 'credit',
      excessRefundAmount: 0,
      excessRefundMethod: 'Cash',
      excessRefundBank: '',
      dcNo: '',
      gatePasses: {},
      shippingAddress: '',
      items: [{ skuCode: '', itemName: '', warehouse: '', qty: 1, rp: 0, discountPer: 0, discountAmt: 0, gstRate: 0, fTaxPer: 0, amount: 0, availableQty: 0, itemServiceCharges: 0 }]
    };
  };

  const validationSchema = Yup.object().shape({
    invoiceNo: Yup.string()
      .required('Invoice # is required')
      .test(
        'has-digits',
        'Please enter the invoice number digits',
        function (value, ctx) {
          if (!value) return false;
          const prefix = getSalesmanPrefix(ctx.parent.salesman, salesmenList);
          if (prefix && value.trim().toUpperCase() === prefix.trim().toUpperCase()) {
            return false;
          }
          return true;
        }
      )
      .test(
        'check-invoice-unique',
        'This Invoice Number already exists!',
        async function (value) {
          if (!value) return true;
          const originalInvoiceNo = editData?.invoice_no;
          if (originalInvoiceNo && String(originalInvoiceNo).trim().toLowerCase() === String(value).trim().toLowerCase()) {
            return true;
          }
          try {
            const { data, error } = await supabase
              .from('sales_invoices')
              .select('id')
              .ilike('invoice_no', value.trim())
              .maybeSingle();
            if (error) return true;
            if (data) return false;
            return true;
          } catch (e) {
            return true;
          }
        }
      ),
    gatePasses: Yup.object().nullable().notRequired(),
    shippingAddress: Yup.string().nullable(),
    saleDate: Yup.string().required('Required Field').test('valid-date', 'Date must be within last 3 days', function(value) {
      if (!value) return false;
      if (editData && (editData.sale_date || editData.date) && value === String(editData.sale_date || editData.date).split('T')[0]) {
        return true;
      }
      const selected = new Date(value);
      selected.setHours(0,0,0,0);
      const base = serverToday ? new Date(serverToday) : new Date();
      const today = new Date(base);
      today.setHours(0,0,0,0);
      const minDate = new Date(today);
      minDate.setDate(today.getDate() - 3);
      return selected >= minDate && selected <= today;
    }),
    taxScenario: Yup.string().required('Required Field'),
    salesman: Yup.string().required('Required Field'),
    settlementMode: Yup.string().oneOf(['Cash', 'Bank', 'Split']).required('Required Field'),
    cashAmountPaid: Yup.number().min(0).nullable(),
    bankAmountPaid: Yup.number().min(0).nullable(),
    excessRefundAmount: Yup.number().min(0).nullable(),
    excessCreditAction: Yup.string().nullable(),
    excessRefundMethod: Yup.string().nullable(),
    excessRefundBank: Yup.string().nullable(),
    selectedBankTitle: Yup.string().when('settlementMode', {
      is: (val: string) => val === 'Bank' || val === 'Split',
      then: (schema) => schema.required('Please select corporate bank ledger profile'),
      otherwise: (schema) => schema.notRequired()
    }),
    items: Yup.array().of(
      Yup.object().shape({
        itemName: Yup.string().nullable(),
        warehouse: Yup.string().nullable().notRequired(),
        qty: Yup.number().when('itemName', {
          is: (val: string) => Boolean(val && val.trim()),
          then: (s) => s.min(0.001, 'Qty must be > 0').required('Qty is required'),
          otherwise: (s) => s.nullable()
        }),
        rp: Yup.number().when('itemName', {
          is: (val: string) => Boolean(val && val.trim()),
          then: (s) => s.min(0, 'Price cannot be negative').required('Price is required'),
          otherwise: (s) => s.nullable()
        }),
        discountPer: Yup.number().min(0).nullable(),
        discountAmt: Yup.number().min(0).nullable(),
        gstRate: Yup.number().min(0).nullable(),
        fTaxPer: Yup.number().min(0).nullable()
      })
    ).test('at-least-one-item', 'Please add at least one product to the invoice', function (items) {
      return Array.isArray(items) && items.some((i: any) => i && i.itemName && String(i.itemName).trim() !== '');
    }),
    returnItems: Yup.array().of(
      Yup.object().shape({
        itemName: Yup.string().required('Item Name is required'),
        warehouse: Yup.string().nullable().notRequired(),
        qty: Yup.number().min(0.001, 'Return Qty must be > 0').required('Qty is required'),
        rp: Yup.number().min(0, 'Return rate cannot be negative').required('Rate is required')
      })
    ).nullable()
  });

  const fetchStockForWarehouse = async (productName: string, chosenWarehouse: string) => {
    if (!productName) return 0;
    try {
      if (!chosenWarehouse) {
        const t = await getTotalAvailableStock(productName, stockDataset);
        console.log(`[Invoice] No WH. Total stock for ${productName}:`, t);
        return t;
      }
      const s = await getAvailableStock(productName, chosenWarehouse, stockDataset);
      console.log(`[Invoice] WH selected (${chosenWarehouse}). Stock for ${productName}:`, s);
      return s;
    } catch (err) {
      console.error("[Invoice] Error fetching stock:", err);
      return 0;
    }
  };

  // Keep the highlighted option in view while navigating with the arrow keys
  const queueProductScroll = (next: number) => {
    setTimeout(() => {
      const box = productDropdownScrollRef.current;
      if (!box) return;
      const el = box.querySelector(`[data-opt="${next}"]`) as HTMLElement | null;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }, 0);
  };

  const handleProductSelectionWithWH = async (selectedProduct: any, index: number, chosenWarehouse: string, setFieldValue: any, currentItem?: any) => {
    if (!selectedProduct) {
      setFieldValue(`items.${index}.itemName`, '');
      setFieldValue(`items.${index}.skuCode`, '');
      setFieldValue(`items.${index}.availableQty`, 0);
      setFieldValue(`items.${index}.rp`, 0);
      setFieldValue(`items.${index}.amount`, 0);
      setFieldValue(`items.${index}.discountAmt`, 0);
      setFieldValue(`items.${index}.itemServiceCharges`, 0);
      return;
    }
    const serviceCharges = Number(selectedProduct.service_charges || 0);
    const isService = selectedProduct.item_type === 'service';
    const newRp = (Number(selectedProduct.retail_price) || 0) + (isService ? serviceCharges : 0);
    setFieldValue(`items.${index}.itemName`, selectedProduct.product_name);
    setFieldValue(`items.${index}.skuCode`, selectedProduct.item_sr_no || '');
    setFieldValue(`items.${index}.rp`, newRp);
    setFieldValue(`items.${index}.uom`, selectedProduct.uom || 'MTR');
    setFieldValue(`items.${index}.itemServiceCharges`, isService ? serviceCharges : 0);
    setFieldValue(`items.${index}.hsCode`, selectedProduct.hs_code || '');

    if (currentItem && currentItem.discountPer) {
      const gross = newRp * (Number(currentItem.qty) || 1);
      const calculatedAmt = (gross * Number(currentItem.discountPer)) / 100;
      setFieldValue(`items.${index}.discountAmt`, Number(calculatedAmt.toFixed(2)));
    }

    const effectiveWarehouse = (currentItem && currentItem.warehouse) ? currentItem.warehouse : (chosenWarehouse || '');
    const availStock = await fetchStockForWarehouse(selectedProduct.product_name, effectiveWarehouse);
    setFieldValue(`items.${index}.availableQty`, availStock);
  };

  const handleTileProductSelection = async (
    selectedProduct: any,
    tIdx: number,
    chosenWarehouse: string,
    setFieldValue: any,
    currentTileItem?: any
  ) => {
    if (!selectedProduct) {
      setFieldValue(`tileItems.${tIdx}.itemName`, '');
      setFieldValue(`tileItems.${tIdx}.skuCode`, '');
      setFieldValue(`tileItems.${tIdx}.availableQty`, 0);
      setFieldValue(`tileItems.${tIdx}.pricePerBox`, 0);
      setFieldValue(`tileItems.${tIdx}.pricePerSqm`, 0);
      setFieldValue(`tileItems.${tIdx}.pricePerPiece`, 0);
      setFieldValue(`tileItems.${tIdx}.totalAmount`, 0);
      setFieldValue(`tileItems.${tIdx}.totalSqm`, 0);
      return;
    }

    let pcsPerBox = Number(selectedProduct.pieces_per_box || selectedProduct.pcs_per_box || selectedProduct.pieces_per_packing || 0);
    if (pcsPerBox <= 1) {
      const match = String(selectedProduct.product_description || '').match(/Box:\s*(\d+)\s*pcs/i);
      if (match && Number(match[1]) > 0) pcsPerBox = Number(match[1]);
      else pcsPerBox = 4;
    }

    let sqmPerBox = 1.44;
    const matchSqm = String(selectedProduct.product_description || '').match(/([\d\.]+)\s*sq\.m/i);
    if (matchSqm && Number(matchSqm[1]) > 0) {
      sqmPerBox = Number(matchSqm[1]);
    } else {
      const dimMatch = String(`${selectedProduct.sub_category || ''} ${selectedProduct.product_description || ''} ${selectedProduct.item_sr_no || ''}`).match(/(\d+(?:\.\d+)?)\s*(?:[xX×*])\s*(\d+(?:\.\d+)?)/);
      if (dimMatch) {
        const h = Number(dimMatch[1]) || 60;
        const w = Number(dimMatch[2]) || 60;
        sqmPerBox = Number((((h / 100) * (w / 100)) * pcsPerBox).toFixed(2));
      }
    }

    const pBox = Number(selectedProduct.retail_price || 0);
    const pPiece = Number((pBox / pcsPerBox).toFixed(2));
    const pSqm = Number((pBox / (sqmPerBox || 1)).toFixed(2));

    const boxQty = currentTileItem?.boxQty !== undefined ? Number(currentTileItem.boxQty) : 1;
    const loosePcs = currentTileItem?.loosePcs !== undefined ? Number(currentTileItem.loosePcs) : 0;
    const lineTotal = Number(((boxQty * pBox) + (loosePcs * pPiece)).toFixed(2));
    const lineSqm = Number(((boxQty * sqmPerBox) + ((loosePcs / pcsPerBox) * sqmPerBox)).toFixed(2));

    setFieldValue(`tileItems.${tIdx}.itemName`, selectedProduct.product_name);
    setFieldValue(`tileItems.${tIdx}.skuCode`, selectedProduct.item_sr_no || `SKU-${selectedProduct.id}`);
    setFieldValue(`tileItems.${tIdx}.piecesPerBox`, pcsPerBox);
    setFieldValue(`tileItems.${tIdx}.sqmPerBox`, sqmPerBox);
    setFieldValue(`tileItems.${tIdx}.pricePerBox`, pBox);
    setFieldValue(`tileItems.${tIdx}.pricePerPiece`, pPiece);
    setFieldValue(`tileItems.${tIdx}.pricePerSqm`, pSqm);
    setFieldValue(`tileItems.${tIdx}.boxQty`, boxQty);
    setFieldValue(`tileItems.${tIdx}.loosePcs`, loosePcs);
    setFieldValue(`tileItems.${tIdx}.totalAmount`, lineTotal);
    setFieldValue(`tileItems.${tIdx}.totalSqm`, lineSqm);
    setFieldValue(`tileItems.${tIdx}.isTileItem`, true);

    const effectiveWarehouse = (currentTileItem && currentTileItem.warehouse) ? currentTileItem.warehouse : chosenWarehouse;
    if (effectiveWarehouse) {
      const availStock = await fetchStockForWarehouse(selectedProduct.product_name, effectiveWarehouse);
      setFieldValue(`tileItems.${tIdx}.availableQty`, availStock);
    }
  };

  const handleTileItemChange = (
    tIdx: number,
    field: 'boxQty' | 'loosePcs' | 'pricePerBox' | 'pricePerSqm' | 'pricePerPiece' | 'totalSqm',
    val: any,
    tileItems: any[],
    setFieldValue: any
  ) => {
    const item = { ...tileItems[tIdx] };
    const pcsPerBox = Math.max(1, Number(item.piecesPerBox) || 4);
    const sqmPerBox = Math.max(0.01, Number(item.sqmPerBox) || 1.44);

    let bQty = Number(item.boxQty || 0);
    let lPcs = Number(item.loosePcs || 0);
    let pBox = Number(item.pricePerBox || 0);
    let pSqm = Number(item.pricePerSqm || 0);
    let pPiece = Number(item.pricePerPiece || 0);
    let lineSqm = Number(item.totalSqm || 0);

    if (field === 'boxQty') {
      bQty = Math.max(0, Number(val) || 0);
      lineSqm = Number(((bQty * sqmPerBox) + ((lPcs / pcsPerBox) * sqmPerBox)).toFixed(2));
    } else if (field === 'loosePcs') {
      let rawLoose = Math.max(0, Number(val) || 0);
      if (pcsPerBox > 1 && rawLoose >= pcsPerBox) {
        const extraBoxes = Math.floor(rawLoose / pcsPerBox);
        const remLoose = rawLoose % pcsPerBox;
        bQty = bQty + extraBoxes;
        lPcs = remLoose;
      } else {
        lPcs = rawLoose;
      }
      lineSqm = Number(((bQty * sqmPerBox) + ((lPcs / pcsPerBox) * sqmPerBox)).toFixed(2));
    } else if (field === 'totalSqm') {
      const enteredSqm = Math.max(0, Number(val) || 0);
      lineSqm = enteredSqm;
      if (sqmPerBox > 0) {
        const totalBoxesFloat = enteredSqm / sqmPerBox;
        bQty = Math.floor(totalBoxesFloat);
        const remFraction = totalBoxesFloat - bQty;
        lPcs = Math.round(remFraction * pcsPerBox);
        if (pcsPerBox > 1 && lPcs >= pcsPerBox) {
          bQty += Math.floor(lPcs / pcsPerBox);
          lPcs = lPcs % pcsPerBox;
        }
      }
    } else if (field === 'pricePerBox') {
      pBox = Math.max(0, Number(val) || 0);
      pPiece = Number((pBox / pcsPerBox).toFixed(2));
      pSqm = Number((pBox / sqmPerBox).toFixed(2));
      lineSqm = Number(((bQty * sqmPerBox) + ((lPcs / pcsPerBox) * sqmPerBox)).toFixed(2));
    } else if (field === 'pricePerSqm') {
      pSqm = Math.max(0, Number(val) || 0);
      pBox = Number((pSqm * sqmPerBox).toFixed(2));
      pPiece = Number((pBox / pcsPerBox).toFixed(2));
      lineSqm = Number(((bQty * sqmPerBox) + ((lPcs / pcsPerBox) * sqmPerBox)).toFixed(2));
    } else if (field === 'pricePerPiece') {
      pPiece = Math.max(0, Number(val) || 0);
      pBox = Number((pPiece * pcsPerBox).toFixed(2));
      pSqm = Number((pBox / sqmPerBox).toFixed(2));
      lineSqm = Number(((bQty * sqmPerBox) + ((lPcs / pcsPerBox) * sqmPerBox)).toFixed(2));
    }

    const lineTotal = Number(((bQty * pBox) + (lPcs * pPiece)).toFixed(2));

    setFieldValue(`tileItems.${tIdx}.boxQty`, bQty);
    setFieldValue(`tileItems.${tIdx}.loosePcs`, lPcs);
    setFieldValue(`tileItems.${tIdx}.pricePerBox`, pBox);
    setFieldValue(`tileItems.${tIdx}.pricePerSqm`, pSqm);
    setFieldValue(`tileItems.${tIdx}.pricePerPiece`, pPiece);
    setFieldValue(`tileItems.${tIdx}.totalAmount`, lineTotal);
    setFieldValue(`tileItems.${tIdx}.totalSqm`, lineSqm);
  };

  const handleTileReturnProductSelection = async (
    selectedProduct: any,
    tIdx: number,
    chosenWarehouse: string,
    setFieldValue: any,
    currentTileItem?: any
  ) => {
    if (!selectedProduct) {
      setFieldValue(`tileReturnItems.${tIdx}.itemName`, '');
      setFieldValue(`tileReturnItems.${tIdx}.skuCode`, '');
      setFieldValue(`tileReturnItems.${tIdx}.availableQty`, 0);
      setFieldValue(`tileReturnItems.${tIdx}.pricePerBox`, 0);
      setFieldValue(`tileReturnItems.${tIdx}.pricePerSqm`, 0);
      setFieldValue(`tileReturnItems.${tIdx}.pricePerPiece`, 0);
      setFieldValue(`tileReturnItems.${tIdx}.totalAmount`, 0);
      setFieldValue(`tileReturnItems.${tIdx}.totalSqm`, 0);
      return;
    }

    let pcsPerBox = Number(selectedProduct.pieces_per_box || selectedProduct.pcs_per_box || selectedProduct.pieces_per_packing || 0);
    if (pcsPerBox <= 1) {
      const match = String(selectedProduct.product_description || '').match(/Box:\s*(\d+)\s*pcs/i);
      if (match && Number(match[1]) > 0) pcsPerBox = Number(match[1]);
      else pcsPerBox = 4;
    }

    let sqmPerBox = 1.44;
    const matchSqm = String(selectedProduct.product_description || '').match(/([\d\.]+)\s*sq\.m/i);
    if (matchSqm && Number(matchSqm[1]) > 0) {
      sqmPerBox = Number(matchSqm[1]);
    } else {
      const dimMatch = String(`${selectedProduct.sub_category || ''} ${selectedProduct.product_description || ''} ${selectedProduct.item_sr_no || ''}`).match(/(\d+(?:\.\d+)?)\s*(?:[xX×*])\s*(\d+(?:\.\d+)?)/);
      if (dimMatch) {
        const h = Number(dimMatch[1]) || 60;
        const w = Number(dimMatch[2]) || 60;
        sqmPerBox = Number((((h / 100) * (w / 100)) * pcsPerBox).toFixed(2));
      }
    }

    const pBox = Number(selectedProduct.retail_price || 0);
    const pPiece = Number((pBox / pcsPerBox).toFixed(2));
    const pSqm = Number((pBox / (sqmPerBox || 1)).toFixed(2));

    const boxQty = currentTileItem?.boxQty !== undefined ? Number(currentTileItem.boxQty) : 1;
    const loosePcs = currentTileItem?.loosePcs !== undefined ? Number(currentTileItem.loosePcs) : 0;
    const lineTotal = Number(((boxQty * pBox) + (loosePcs * pPiece)).toFixed(2));
    const lineSqm = Number(((boxQty * sqmPerBox) + ((loosePcs / pcsPerBox) * sqmPerBox)).toFixed(2));

    setFieldValue(`tileReturnItems.${tIdx}.itemName`, selectedProduct.product_name);
    setFieldValue(`tileReturnItems.${tIdx}.skuCode`, selectedProduct.item_sr_no || `SKU-${selectedProduct.id}`);
    setFieldValue(`tileReturnItems.${tIdx}.piecesPerBox`, pcsPerBox);
    setFieldValue(`tileReturnItems.${tIdx}.sqmPerBox`, sqmPerBox);
    setFieldValue(`tileReturnItems.${tIdx}.pricePerBox`, pBox);
    setFieldValue(`tileReturnItems.${tIdx}.pricePerPiece`, pPiece);
    setFieldValue(`tileReturnItems.${tIdx}.pricePerSqm`, pSqm);
    setFieldValue(`tileReturnItems.${tIdx}.boxQty`, boxQty);
    setFieldValue(`tileReturnItems.${tIdx}.loosePcs`, loosePcs);
    setFieldValue(`tileReturnItems.${tIdx}.totalAmount`, lineTotal);
    setFieldValue(`tileReturnItems.${tIdx}.totalSqm`, lineSqm);
    setFieldValue(`tileReturnItems.${tIdx}.isTileItem`, true);

    const effectiveWarehouse = (currentTileItem && currentTileItem.warehouse) ? currentTileItem.warehouse : chosenWarehouse;
    if (effectiveWarehouse) {
      const availStock = await fetchStockForWarehouse(selectedProduct.product_name, effectiveWarehouse);
      setFieldValue(`tileReturnItems.${tIdx}.availableQty`, availStock);
    }
  };

  const handleTileReturnItemChange = (
    tIdx: number,
    field: 'boxQty' | 'loosePcs' | 'pricePerBox' | 'pricePerSqm' | 'pricePerPiece' | 'totalSqm',
    val: any,
    tileReturnItems: any[],
    setFieldValue: any
  ) => {
    const item = { ...tileReturnItems[tIdx] };
    const pcsPerBox = Math.max(1, Number(item.piecesPerBox) || 4);
    const sqmPerBox = Math.max(0.01, Number(item.sqmPerBox) || 1.44);

    let bQty = Number(item.boxQty || 0);
    let lPcs = Number(item.loosePcs || 0);
    let pBox = Number(item.pricePerBox || 0);
    let pSqm = Number(item.pricePerSqm || 0);
    let pPiece = Number(item.pricePerPiece || 0);
    let lineSqm = Number(item.totalSqm || 0);

    if (field === 'boxQty') {
      bQty = Math.max(0, Number(val) || 0);
      lineSqm = Number(((bQty * sqmPerBox) + ((lPcs / pcsPerBox) * sqmPerBox)).toFixed(2));
    } else if (field === 'loosePcs') {
      let rawLoose = Math.max(0, Number(val) || 0);
      if (pcsPerBox > 1 && rawLoose >= pcsPerBox) {
        const extraBoxes = Math.floor(rawLoose / pcsPerBox);
        const remLoose = rawLoose % pcsPerBox;
        bQty = bQty + extraBoxes;
        lPcs = remLoose;
      } else {
        lPcs = rawLoose;
      }
      lineSqm = Number(((bQty * sqmPerBox) + ((lPcs / pcsPerBox) * sqmPerBox)).toFixed(2));
    } else if (field === 'totalSqm') {
      const enteredSqm = Math.max(0, Number(val) || 0);
      lineSqm = enteredSqm;
      if (sqmPerBox > 0) {
        const totalBoxesFloat = enteredSqm / sqmPerBox;
        bQty = Math.floor(totalBoxesFloat);
        const remFraction = totalBoxesFloat - bQty;
        lPcs = Math.round(remFraction * pcsPerBox);
        if (pcsPerBox > 1 && lPcs >= pcsPerBox) {
          bQty += Math.floor(lPcs / pcsPerBox);
          lPcs = lPcs % pcsPerBox;
        }
      }
    } else if (field === 'pricePerBox') {
      pBox = Math.max(0, Number(val) || 0);
      pPiece = Number((pBox / pcsPerBox).toFixed(2));
      pSqm = Number((pBox / sqmPerBox).toFixed(2));
      lineSqm = Number(((bQty * sqmPerBox) + ((lPcs / pcsPerBox) * sqmPerBox)).toFixed(2));
    } else if (field === 'pricePerSqm') {
      pSqm = Math.max(0, Number(val) || 0);
      pBox = Number((pSqm * sqmPerBox).toFixed(2));
      pPiece = Number((pBox / pcsPerBox).toFixed(2));
      lineSqm = Number(((bQty * sqmPerBox) + ((lPcs / pcsPerBox) * sqmPerBox)).toFixed(2));
    } else if (field === 'pricePerPiece') {
      pPiece = Math.max(0, Number(val) || 0);
      pBox = Number((pPiece * pcsPerBox).toFixed(2));
      pSqm = Number((pBox / sqmPerBox).toFixed(2));
      lineSqm = Number(((bQty * sqmPerBox) + ((lPcs / pcsPerBox) * sqmPerBox)).toFixed(2));
    }

    const lineTotal = Number(((bQty * pBox) + (lPcs * pPiece)).toFixed(2));

    setFieldValue(`tileReturnItems.${tIdx}.boxQty`, bQty);
    setFieldValue(`tileReturnItems.${tIdx}.loosePcs`, lPcs);
    setFieldValue(`tileReturnItems.${tIdx}.pricePerBox`, pBox);
    setFieldValue(`tileReturnItems.${tIdx}.pricePerSqm`, pSqm);
    setFieldValue(`tileReturnItems.${tIdx}.pricePerPiece`, pPiece);
    setFieldValue(`tileReturnItems.${tIdx}.totalAmount`, lineTotal);
    setFieldValue(`tileReturnItems.${tIdx}.totalSqm`, lineSqm);
  };

  const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['-', 'e', 'E', '+'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const calculateLineTotals = (item: any, scenario: string, applyFbrTax: boolean = false) => {
    const qty = Math.max(0, Number(item.qty) || 0);
    const rp = Math.max(0, Number(item.rp) || 0);
    const grossBase = rp * qty;
    const discountAmt = Math.max(0, Number(item.discountAmt) || 0);
    const remainingRetail = grossBase - discountAmt;

    if (!applyFbrTax) {
      return {
        grossBase,
        activeGstRate: 0,
        activeFTaxPer: 0,
        gstAmt: 0,
        fTaxAmt: 0,
        discountAmt,
        remainingRetail,
        netTotal: remainingRetail
      };
    }

    let activeGstRate = Number(item.gstRate || 18);
    let activeFTaxPer = Number(item.fTaxPer || 0);

    if (scenario === 'Reduced Rate Sale') {
      activeGstRate = item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== '' ? Number(item.gstRate) : 0;
      activeFTaxPer = item.fTaxPer !== undefined && item.fTaxPer !== null && item.fTaxPer !== '' ? Number(item.fTaxPer) : 0;
    } else {
      switch (scenario) {
        case 'Goods at Standard Rate to Unregistered Buyers':
          activeGstRate = 18;
          activeFTaxPer = 4;
          break;
        case 'Exempt Goods Sale':
        case 'Zero Rated Sale':
          activeGstRate = 0;
          activeFTaxPer = 0;
          break;
        case 'Goods Sold that are Listed in SRO 297(1)/2023':
          activeGstRate = 25;
          activeFTaxPer = 0;
          break;
        case 'Sale of 3rd Schedule Goods':
          activeGstRate = 18;
          activeFTaxPer = 0;
          break;
        case 'Goods at Standard Rate to Registered Buyers':
        default:
          activeGstRate = 18;
          activeFTaxPer = 0;
          break;
      }
    }

    const isRetailBasedTax =
      scenario === 'Sale of 3rd Schedule Goods' ||
      scenario === 'Goods Sold that are Listed in SRO 297(1)/2023';

    const gstTaxBase = isRetailBasedTax ? grossBase : Math.max(0, grossBase - discountAmt);

    const gstAmt = (gstTaxBase / 100) * activeGstRate;
    const fTaxAmt = (gstTaxBase / 100) * activeFTaxPer;

    const netTotal = remainingRetail + gstAmt + fTaxAmt;

    return { grossBase, activeGstRate, activeFTaxPer, gstAmt, fTaxAmt, discountAmt, remainingRetail, netTotal };
  };

  const executeInvoicePersistence = async (values: any, customerFinalName: string, bypassNegativeCheck: boolean = false) => {
    try {
      setLoading(true);
      
      // STRICT VALIDATION: Block if quantity exceeds available stock across all rows
      const consumedInInvoice: Record<string, number> = {};
      for (let i = 0; i < values.items.length; i++) {
        const item = values.items[i];
        if (!item.itemName) continue;
        const wh = String(item.warehouse || values.dispatchWarehouse || 'Main Warehouse').trim().toLowerCase();
        const itemKey = `${String(item.skuCode || item.itemName).trim().toLowerCase()}_${wh}`;

        let maxAllowed = Number(item.availableQty || 0);
        if (editData && editData.items) {
           const oldItems = typeof editData.items === 'string' ? JSON.parse(editData.items || '[]') : (editData.items || []);
           const original = oldItems.find((oi: any) => oi.skuCode === item.skuCode && (oi.warehouse || editData.dispatch_warehouse || 'Main Warehouse') === (item.warehouse || values.dispatchWarehouse || 'Main Warehouse'));
           if (original) {
              maxAllowed += Number(original.qty || 0);
           }
        }

        const priorUsed = consumedInInvoice[itemKey] || 0;
        const availableForRow = Math.max(0, maxAllowed - priorUsed);

        if (!bypassNegativeCheck && Number(item.qty) > availableForRow) {
          toast.error(`Insufficient stock for ${item.itemName} (Row #${i + 1}). Max Available: ${availableForRow.toLocaleString()}, Requested: ${Number(item.qty).toLocaleString()}`);
          setLoading(false);
          return;
        }

        consumedInInvoice[itemKey] = priorUsed + Number(item.qty || 0);
      }

      // 2. Validate Tile Items Stock
      const validTileItems = values.showTileSection
        ? (values.tileItems || []).filter((t: any) => t.itemName && (Number(t.boxQty || 0) > 0 || Number(t.loosePcs || 0) > 0))
        : [];

      for (let i = 0; i < validTileItems.length; i++) {
        const tItem = validTileItems[i];
        const wh = String(tItem.warehouse || values.dispatchWarehouse || 'Main Warehouse').trim().toLowerCase();
        const itemKey = `${String(tItem.skuCode || tItem.itemName).trim().toLowerCase()}_${wh}`;
        const pcsPerBox = Math.max(1, Number(tItem.piecesPerBox) || 4);
        const reqPcs = (Number(tItem.boxQty || 0) * pcsPerBox) + Number(tItem.loosePcs || 0);

        let maxAllowedPcs = Math.round(Number(tItem.availableQty || 0) * pcsPerBox);
        if (editData && editData.items) {
          const oldItems = typeof editData.items === 'string' ? JSON.parse(editData.items || '[]') : (editData.items || []);
          const original = oldItems.find((oi: any) => oi.skuCode === tItem.skuCode && (oi.warehouse || editData.dispatch_warehouse || 'Main Warehouse') === (tItem.warehouse || values.dispatchWarehouse || 'Main Warehouse'));
          if (original) {
            const origPcs = original.isTileItem
              ? ((Number(original.boxQty || 0) * pcsPerBox) + Number(original.loosePcs || 0))
              : Math.round(Number(original.qty || 0) * pcsPerBox);
            maxAllowedPcs += origPcs;
          }
        }

        const priorUsed = consumedInInvoice[itemKey] || 0;
        const availableForRowPcs = Math.max(0, maxAllowedPcs - priorUsed);

        if (!bypassNegativeCheck && reqPcs > availableForRowPcs) {
          const avBoxes = Math.floor(availableForRowPcs / pcsPerBox);
          const avLoose = availableForRowPcs % pcsPerBox;
          toast.error(`Insufficient tile stock for ${tItem.itemName} (Tile Row #${i + 1}). Max Available: ${avBoxes} Boxes${avLoose > 0 ? ` + ${avLoose} Pcs` : ''} (${availableForRowPcs} Pcs total).`);
          setLoading(false);
          return;
        }

        consumedInInvoice[itemKey] = priorUsed + reqPcs;
      }

      const validReturnItems = (values.returnItems || []).filter(
        (r: any) => r.itemName && Number(r.qty || 0) > 0
      );

      const returnTotalVal = validReturnItems.reduce((acc: number, rItem: any) => {
        return acc + (Number(rItem.qty || 0) * Number(rItem.rp ?? rItem.rate ?? 0));
      }, 0);

      const validTileReturnItems = values.showTileReturnSection
        ? (values.tileReturnItems || []).filter((t: any) => t.itemName && (Number(t.boxQty || 0) > 0 || Number(t.loosePcs || 0) > 0 || Number(t.totalAmount || 0) > 0))
        : [];

      const tileReturnTotalVal = validTileReturnItems.reduce((acc: number, t: any) => acc + Number(t.totalAmount || 0), 0);
      const totalAllReturnsCredit = returnTotalVal + tileReturnTotalVal;

      const tileTotalVal = validTileItems.reduce((acc: number, t: any) => acc + Number(t.totalAmount || 0), 0);

      const convertedTileItems = validTileItems.map((t: any) => {
        const pcsPerBox = Math.max(1, Number(t.piecesPerBox) || 4);
        const bQty = Number(t.boxQty || 0);
        const lPcs = Number(t.loosePcs || 0);
        const totalPcs = (bQty * pcsPerBox) + lPcs;
        const qtyBoxDec = Number((totalPcs / pcsPerBox).toFixed(3));
        return {
          skuCode: t.skuCode,
          itemName: t.itemName,
          warehouse: t.warehouse || values.dispatchWarehouse || 'Main Warehouse',
          qty: qtyBoxDec,
          rp: Number(t.pricePerBox || 0),
          discountPer: 0,
          discountAmt: 0,
          gstRate: 0,
          fTaxPer: 0,
          amount: Number(t.totalAmount || 0),
          netTotal: Number(t.totalAmount || 0),
          uom: 'BOX',
          isTileItem: true,
          boxQty: bQty,
          loosePcs: lPcs,
          piecesPerBox: pcsPerBox,
          sqmPerBox: Number(t.sqmPerBox || 1.44),
          totalSqm: Number(t.totalSqm || 0),
          pricePerBox: Number(t.pricePerBox || 0),
          pricePerSqm: Number(t.pricePerSqm || 0),
          pricePerPiece: Number(t.pricePerPiece || 0)
        };
      });

      const validStandardItems = (values.items || []).filter((it: any) => it.itemName && it.itemName.trim() !== '');
      const allMergedItems = [...validStandardItems, ...convertedTileItems];

      const soldItemsSum = validStandardItems.reduce((acc: number, item: any) => {
        return acc + calculateLineTotals(item, values.taxScenario, values.applyFbrTax).netTotal;
      }, 0) + tileTotalVal;

      const grossAfterCharges = soldItemsSum + Number(values.transportCharges || 0) + Number(values.additionalCharges || 0) - Number(values.overallDiscount || 0);
      const calculatedGrandTotal = grossAfterCharges - totalAllReturnsCredit;

      let paidCash = 0;
      let paidBank = 0;

      if (values.settlementMode === 'Cash') {
        paidCash = Number(values.cashAmountPaid || 0);
        paidBank = 0;
      } else if (values.settlementMode === 'Bank') {
        paidCash = 0;
        paidBank = Number(values.bankAmountPaid || values.cashAmountPaid || 0);
      } else if (values.settlementMode === 'Split') {
        paidCash = Number(values.cashAmountPaid || 0);
        paidBank = Number(values.bankAmountPaid || 0);
      }

      const totalPaidCombined = paidCash + paidBank;
      if (calculatedGrandTotal >= 0 && totalPaidCombined > calculatedGrandTotal + 0.01) {
        toast.error(`Payment amount (Rs. ${totalPaidCombined.toLocaleString(undefined, { minimumFractionDigits: 2 })}) cannot exceed total bill amount (Rs. ${calculatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })})!`);
        setLoading(false);
        return;
      }
      const runningBalanceTerm = calculatedGrandTotal <= 0 
        ? 'Credit' 
        : (totalPaidCombined >= calculatedGrandTotal ? 'Cash' : 'Credit');

      const itemsToSave = (allMergedItems.length > 0 ? allMergedItems : values.items).map((it: any, idx: number) => {
        const cleanItem = {
          ...it,
          gstRate: values.applyFbrTax ? Number(it.gstRate || 0) : 0,
          fTaxPer: values.applyFbrTax ? Number(it.fTaxPer || 0) : 0
        };
        if (idx === 0) {
          return { 
            ...cleanItem, 
            _overallDiscount: Number(values.overallDiscount || 0),
            _returnItems: validReturnItems,
            _returnAmount: returnTotalVal,
            _tileItems: validTileItems,
            _tileAmount: tileTotalVal,
            _tileReturnItems: validTileReturnItems,
            _tileReturnAmount: tileReturnTotalVal,
            _totalReturnCredit: totalAllReturnsCredit,
            _excessCreditAction: values.excessCreditAction || 'credit',
            _excessRefundAmount: values.excessCreditAction === 'refund' ? Number(values.excessRefundAmount || 0) : 0,
            _excessRefundMethod: values.excessRefundMethod || 'Cash',
            _excessRefundBank: values.excessRefundBank || ''
          };
        }
        return cleanItem;
      });

      const databasePayload = {
        invoice_no: values.invoiceNo,
        customer_name: customerFinalName,
        sale_date: values.saleDate,
        payment_term: runningBalanceTerm,
        dispatch_warehouse: values.dispatchWarehouse,
        salesman: values.salesman || (isSalesman ? (matchedSalesman || currentSalesmanName) : ''),
        transport_name: values.transportType,
        transport_charges: Number(values.transportCharges || 0),
        additional_charges: Number(values.additionalCharges || 0),
        selected_bank: (values.settlementMode === 'Bank' || values.settlementMode === 'Split') ? values.selectedBankTitle : null,
        bank_amount: String(paidBank),
        cash_amount_paid: paidCash,
        total_amount: String(grossAfterCharges),
        receipt_status: (calculatedGrandTotal <= 0 && totalAllReturnsCredit > 0) ? 'Credit Adjusted' : (totalPaidCombined >= calculatedGrandTotal ? 'Paid' : 'On Credit'),
        sale_status: 'Confirm',
        shipping_address: values.shippingAddress,
        gate_pass_no: values.gatePasses && Object.keys(values.gatePasses).length > 0 ? Object.entries(values.gatePasses).map(([k, v]) => `${k}: ${v}`).join(' | ') : null,
        items: itemsToSave,
        scenario_type: values.applyFbrTax ? values.taxScenario : 'Standard Retail Sale (No Tax)'
      };

      let finalInvoiceId = editData?.id;

      if (editData && editData.id) {
        const formattedInvCode = editData.invoice_no || values.invoiceNo;
        
        // 1. Fetch DCs associated with this invoice
        const { data: dcs, error: dcErr } = await supabase
          .from('delivery_challans')
          .select('*')
          .eq('invoice_no', formattedInvCode);
        
        if (dcErr) throw dcErr;

        const isPendingStatus = (st: string) => /pending/i.test(st || '');
        const activeDCs = (dcs || []).filter(dc => !isPendingStatus(dc.status));
        const pendingDCs = (dcs || []).filter(dc => isPendingStatus(dc.status));

        // Track covered quantities by sku_warehouse from already approved DCs
        const coveredQtys: Record<string, number> = {};
        activeDCs.forEach(dc => {
          (dc.items || []).forEach((i: any) => {
            const key = `${i.skuCode}_${i.location}`;
            coveredQtys[key] = (coveredQtys[key] || 0) + Number(i.orderQty || 0);
          });
        });

        // Helper for error formatting
        const formatErrorQty = (qty: number, skuCode: string, itemName?: string) => {
          const matchedProd = productsList.find(p => p.product_name === itemName || (skuCode && (p.item_sr_no === skuCode || `SKU-${p.id}` === skuCode)));
          let displayQty = String(qty);
          if (matchedProd) {
            const isTile = Boolean(String(matchedProd.category || '').toLowerCase().includes('tile'));
            let pcsPerBox = Number(matchedProd.pieces_per_box || matchedProd.pcs_per_box || matchedProd.pieces_per_packing || 1);
            if (isTile && pcsPerBox <= 1) pcsPerBox = 4;
            if (pcsPerBox > 1) {
              const totalPcs = Math.round(qty * pcsPerBox);
              const b = Math.floor(totalPcs / pcsPerBox);
              const p = totalPcs % pcsPerBox;
              displayQty = p === 0 ? `${b} Boxes` : `${b} Boxes + ${p} Pcs`;
            }
          }
          return displayQty;
        };

        // 2. Validate against approved DCs
        for (const item of allMergedItems) {
          const wh = (item.warehouse || values.dispatchWarehouse || 'Main Warehouse').trim();
          const key = `${item.skuCode}_${wh}`;
          const covered = coveredQtys[key] || 0;
          if (Number(item.qty) < covered) {
             const fmt = formatErrorQty(covered, item.skuCode, item.itemName);
             throw new Error(`Cannot decrease quantity for ${item.itemName} below the actively processed DC amount (${fmt}).`);
          }
        }
        
        for (const key of Object.keys(coveredQtys)) {
          const covered = coveredQtys[key];
          if (covered > 0) {
            const found = allMergedItems.find((i:any) => `${i.skuCode}_${(i.warehouse || values.dispatchWarehouse || 'Main Warehouse').trim()}` === key);
            if (!found) {
               const sku = key.split('_')[0];
               const fmt = formatErrorQty(covered, sku);
               throw new Error(`Cannot remove item with SKU ${sku} because it already has actively processed DCs (${fmt}).`);
            }
          }
        }

        // 3. Update Invoice
        const { error: invoiceUpdateError } = await supabase
          .from('sales_invoices')
          .update(databasePayload)
          .eq('id', editData.id);

        if (invoiceUpdateError) throw invoiceUpdateError;

        logActivity({
          action: 'UPDATE',
          tableName: 'sales_invoices',
          details: {
            id: editData.id,
            invoice_number: editData.invoice_no || values.invoiceNo,
            customer_name: customerFinalName,
            total_amount: calculatedGrandTotal,
            item_count: allMergedItems.length,
            payment_term: runningBalanceTerm,
            warehouse: values.dispatchWarehouse,
            event: `Updated sales invoice ${editData.invoice_no || values.invoiceNo} for ${customerFinalName}`
          }
        });

        // 4. Update products.current_stock (Restore old, Deduct new)
        const oldItems = typeof editData.items === 'string' ? JSON.parse(editData.items || '[]') : (editData.items || []);
        for (const oldItem of oldItems) {
          if (!oldItem.itemName || !oldItem.itemName.trim()) continue;
          const { data: prod } = await supabase.from('products').select('id, current_stock').ilike('product_name', oldItem.itemName).maybeSingle();
          if (prod) await supabase.from('products').update({ current_stock: Number(prod.current_stock) + Number(oldItem.qty || 0) }).eq('id', prod.id);
        }
        for (const newItem of allMergedItems) {
          if (!newItem.itemName || !newItem.itemName.trim()) continue;
          const { data: prod } = await supabase.from('products').select('id, current_stock').ilike('product_name', newItem.itemName).maybeSingle();
          if (prod) await supabase.from('products').update({ current_stock: Number(prod.current_stock) - Number(newItem.qty || 0) }).eq('id', prod.id);
        }

        // 5. Sync DCs (Recalculate remaining uncovered quantities, delete old pending, create new only if needed)
        const remainingItemsByWarehouse: Record<string, any[]> = {};
        for (const item of allMergedItems) {
          if (!item.itemName || !item.itemName.trim()) continue;
          if (Number(item.qty || 0) <= 0) continue;
          const wh = (item.warehouse || values.dispatchWarehouse || 'Main Warehouse').trim();
          const key = `${item.skuCode}_${wh}`;
          const covered = coveredQtys[key] || 0;
          const remaining = Number(item.qty) - covered;

          if (remaining > 0) {
            if (!remainingItemsByWarehouse[wh]) remainingItemsByWarehouse[wh] = [];
            
            // Prorate discount if any
            const origQty = Number(item.qty) || 1;
            const proratedDisAmt = (Number(item.discountAmt) || 0) * (remaining / origQty);

            remainingItemsByWarehouse[wh].push({
              poNoSub: values.clientPoNumber || '',
              pDescription: item.itemName || 'Product',
              skuCode: item.skuCode || '',
              location: wh,
              rate: Number(item.rp) || 0,
              qty: remaining,
              disAmt: Number(proratedDisAmt.toFixed(2)),
              distPer: Number(item.discountPer) || 0,
              discount: 0,
              notes: item.notes || '',
              isTileItem: Boolean(item.isTileItem),
              boxQty: item.boxQty,
              loosePcs: item.loosePcs
            });
          }
        }

        // Delete old pending DCs so they are replaced cleanly with the adjusted lines (or removed entirely if items deleted)
        if (pendingDCs.length > 0) {
          const pendingIds = pendingDCs.map(d => d.id);
          const { error: delErr } = await supabase.from('delivery_challans').delete().in('id', pendingIds);
          if (delErr) console.error('Error deleting pending DCs:', delErr);
        }

        // Check current active DCs to compute appropriate challan code
        const { data: currentActiveDcs } = await supabase
          .from('delivery_challans')
          .select('id, challan_no, dispatch_warehouse')
          .eq('invoice_no', formattedInvCode)
          .order('id', { ascending: true });

        for (const [whName, whItems] of Object.entries(remainingItemsByWarehouse)) {
          if (whItems.length === 0) continue;
          const whQty = whItems.reduce((acc, i) => acc + Number(i.qty || 0), 0);
          if (whQty <= 0) continue;

          const whBaseAmt = whItems.reduce((acc, i) => acc + (Number(i.rate || 0) * Number(i.qty || 0)), 0);
          const whDiscAmt = whItems.reduce((acc, i) => acc + Number(i.disAmt || 0), 0);
          const whNetAmt = whBaseAmt - whDiscAmt;

          let nextChallanNo = undefined;
          const activeWhDcs = (currentActiveDcs || []).filter(dc => dc.dispatch_warehouse === whName);
          if (activeWhDcs.length > 0) {
            const baseDc = activeWhDcs[0];
            const baseCode = (baseDc.challan_no || `DC-${String(baseDc.id).padStart(4, '0')}`).replace(/-[A-Z]+$/, '');
            const existingSubCount = (currentActiveDcs || []).filter(c => (c.challan_no || `DC-${String(c.id).padStart(4, '0')}`).startsWith(baseCode)).length;
            let nextLetter = '';
            if (existingSubCount < 26) {
              nextLetter = String.fromCharCode(65 + existingSubCount);
            } else {
              nextLetter = String.fromCharCode(65 + (existingSubCount % 26)).repeat(Math.floor(existingSubCount / 26) + 1);
            }
            nextChallanNo = `${baseCode}-${nextLetter}`;
          }

          if (!nextChallanNo) {
            const prevPending = pendingDCs.find(d => d.dispatch_warehouse === whName);
            if (prevPending && prevPending.challan_no && !activeWhDcs.length) {
              nextChallanNo = prevPending.challan_no.replace(/-[A-Z]+$/, '');
            } else {
              const safePrefix = whName.toUpperCase().replace(/[^A-Z0-9]/g, '');
              const { data: allDcs } = await supabase
                .from('delivery_challans')
                .select('challan_no')
                .ilike('challan_no', `${safePrefix}-%`);

              let nextNum = 1;
              if (allDcs && allDcs.length > 0) {
                const maxNum = allDcs.reduce((max, dc) => {
                  const match = (dc.challan_no || '').match(new RegExp(`^${safePrefix}-(\\d+)`));
                  if (match && match[1]) {
                    const num = parseInt(match[1], 10);
                    return num > max ? num : max;
                  }
                  return max;
                }, 0);
                nextNum = maxNum + 1;
              }
              nextChallanNo = `${safePrefix}-${String(nextNum).padStart(4, '0')}`;
            }
          }

          await supabase.from('delivery_challans').insert([{
            challan_no: nextChallanNo,
            invoice_no: formattedInvCode,
            customer_name: customerFinalName,
            challan_date: values.saleDate || new Date().toISOString().split('T')[0],
            dispatch_warehouse: whName,
            transport_name: values.transportType || 'By Road Transport',
            transportation: values.transportType || 'By Road Transport',
            po_no: values.clientPoNumber || '',
            po_date: values.saleDate || null,
            gate_pass_no: (values.gatePasses && values.gatePasses[whName]) || null,
            vehicle_no: 'Counter Delivery',
            remarks: `Direct Counter Sale / Immediate Dispatch for ${formattedInvCode} (${whName}) [EDITED]`,
            total_quantity: whQty,
            total_amount: whBaseAmt,
            total_discount: whDiscAmt,
            total_net_amount: whNetAmt,
            status: 'Dispatched',
            items: whItems.map(i => ({
              ...i,
              orderQty: Number(i.qty || 0),
              dispatchedQty: Number(i.qty || 0),
              holdQty: 0
            }))
          }]);
        }

        toast.success('Sales Invoice changes compiled and DCs synced successfully!');
      } else {
        // Concurrency guard: Ensure this invoice number wasn't already inserted in parallel
        const { data: duplicateCheck } = await supabase
          .from('sales_invoices')
          .select('id')
          .ilike('invoice_no', values.invoiceNo.trim())
          .maybeSingle();

        if (duplicateCheck) {
          toast.error(`Invoice #${values.invoiceNo} has already been recorded!`);
          setLoading(false);
          return;
        }

        const { data: insertedInvoice, error: invoiceError } = await supabase
          .from('sales_invoices')
          .insert([databasePayload])
          .select('id')
          .single();

        if (invoiceError) throw invoiceError;

        finalInvoiceId = insertedInvoice?.id;
        const formattedInvCode = values.invoiceNo;

        logActivity({
          action: 'INSERT',
          tableName: 'sales_invoices',
          details: {
            id: insertedInvoice?.id,
            invoice_number: values.invoiceNo,
            customer_name: customerFinalName,
            total_amount: calculatedGrandTotal,
            item_count: allMergedItems.length,
            payment_term: runningBalanceTerm,
            warehouse: values.dispatchWarehouse,
            event: `Created sales invoice ${values.invoiceNo} for ${customerFinalName}`
          }
        });

        // ── AUTO-CREATE DELIVERY CHALLANS PER UNIQUE WAREHOUSE ──
        try {
          // Group invoice items by warehouse destination
          const itemsByWarehouse: Record<string, any[]> = {};
          (allMergedItems || []).forEach((item: any) => {
            if (!item.itemName || !item.itemName.trim()) return;
            if (Number(item.qty || 0) <= 0) return;
            const wh = (item.warehouse || values.dispatchWarehouse || 'Main Warehouse').trim();
            if (!itemsByWarehouse[wh]) itemsByWarehouse[wh] = [];
            itemsByWarehouse[wh].push({
              poNoSub: values.clientPoNumber || '',
              pDescription: item.itemName || 'Product',
              skuCode: item.skuCode || '',
              location: wh,
              rate: Number(item.rp) || 0,
              qty: Number(item.qty) || 0,
              disAmt: Number(item.discountAmt) || 0,
              distPer: Number(item.discountPer) || 0,
              discount: 0,
              notes: item.notes || '',
              isTileItem: Boolean(item.isTileItem),
              boxQty: item.boxQty,
              loosePcs: item.loosePcs
            });
          });

          for (const [whName, whItems] of Object.entries(itemsByWarehouse)) {
            const whQty = whItems.reduce((acc, i) => acc + Number(i.qty || 0), 0);
            const whBaseAmt = whItems.reduce((acc, i) => acc + (Number(i.rate || 0) * Number(i.qty || 0)), 0);
            const whDiscAmt = whItems.reduce((acc, i) => acc + Number(i.disAmt || 0), 0);
            const whNetAmt = whBaseAmt - whDiscAmt;

            const safePrefix = whName.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const { data: allDcs } = await supabase
              .from('delivery_challans')
              .select('challan_no')
              .ilike('challan_no', `${safePrefix}-%`);

            let nextNum = 1;
            if (allDcs && allDcs.length > 0) {
              const maxNum = allDcs.reduce((max, dc) => {
                const match = (dc.challan_no || '').match(new RegExp(`^${safePrefix}-(\\d+)`));
                if (match && match[1]) {
                  const num = parseInt(match[1], 10);
                  return num > max ? num : max;
                }
                return max;
              }, 0);
              nextNum = maxNum + 1;
            }
            
            const newChallanNo = `${safePrefix}-${String(nextNum).padStart(4, '0')}`;

            await supabase.from('delivery_challans').insert([{
              challan_no: newChallanNo,
              invoice_no: formattedInvCode,
              customer_name: customerFinalName,
              challan_date: values.saleDate || new Date().toISOString().split('T')[0],
              dispatch_warehouse: whName,
              transport_name: values.transportType || 'By Road Transport',
              transportation: values.transportType || 'By Road Transport',
              po_no: values.clientPoNumber || '',
              po_date: values.saleDate || null,
              gate_pass_no: (values.gatePasses && values.gatePasses[whName]) || null,
              vehicle_no: 'Counter Delivery',
              remarks: `Direct Counter Sale / Immediate Dispatch for ${formattedInvCode} (${whName})`,
              total_quantity: whQty,
              total_amount: whBaseAmt,
              total_discount: whDiscAmt,
              total_net_amount: whNetAmt,
              status: 'Dispatched',
              items: whItems.map(i => ({
                ...i,
                orderQty: Number(i.qty || 0),
                dispatchedQty: Number(i.qty || 0),
                holdQty: 0
              }))
            }]);
          }
        } catch (dcErr: any) {
          console.error('Delivery challan auto-generation warning:', dcErr);
          toast.error(`DC Auto-generation failed: ${dcErr.message || 'Unknown error'}`);
        }

        // Update products.current_stock only — warehouse_inventory retired
        for (const item of allMergedItems) {
          if (!item.itemName || !item.itemName.trim()) continue;
          const { data: prod } = await supabase.from('products').select('id, current_stock').ilike('product_name', item.itemName).maybeSingle();
          if (prod) await supabase.from('products').update({ current_stock: Number(prod.current_stock) - Number(item.qty) }).eq('id', prod.id);
        }
        toast.success('Sales Invoice & Delivery Challan(s) logged successfully!');
      }

      // ── AUTO-SYNC SALES RETURN RECORD (FOR IN-INVOICE RETURN / EXCHANGE) ──
      try {
        const convertedTileReturnItems = validTileReturnItems.map((t: any) => {
          const pcsPerBox = Math.max(1, Number(t.piecesPerBox) || 4);
          const bQty = Number(t.boxQty || 0);
          const lPcs = Number(t.loosePcs || 0);
          const totalPcs = (bQty * pcsPerBox) + lPcs;
          const qtyBoxDec = Number((totalPcs / pcsPerBox).toFixed(3));
          return {
            sku: t.skuCode || '',
            itemName: t.itemName,
            warehouse: t.warehouse || values.dispatchWarehouse || 'Main Warehouse',
            qty: qtyBoxDec,
            rate: Number(t.pricePerBox || 0),
            uom: 'BOX',
            total: Number(t.totalAmount || 0),
            isTileItem: true,
            boxQty: bQty,
            loosePcs: lPcs,
            piecesPerBox: pcsPerBox,
            sqmPerBox: Number(t.sqmPerBox || 1.44),
            totalSqm: Number(t.totalSqm || 0)
          };
        });

        const allCombinedReturnItems = [
          ...validReturnItems.map((i: any) => ({
            sku: i.skuCode || '',
            itemName: i.itemName,
            warehouse: i.warehouse || values.dispatchWarehouse || 'Main Warehouse',
            qty: Number(i.qty),
            rate: Number(i.rp),
            uom: i.uom || 'Nos',
            total: Number(i.qty) * Number(i.rp)
          })),
          ...convertedTileReturnItems
        ];

        if (allCombinedReturnItems.length > 0) {
          const itemWh = allCombinedReturnItems.find((i: any) => i.warehouse && i.warehouse !== 'Main Warehouse')?.warehouse;
          const defaultStorageWh = warehousesList.find((w: string) => /fateh/i.test(w) || /a[-_ ]?39/i.test(w)) || warehousesList[0] || 'Main Warehouse';
          const returnWh = itemWh || values.dispatchWarehouse || defaultStorageWh;

          const isExcessRefund = values.excessCreditAction === 'refund' && Number(values.excessRefundAmount || 0) > 0;
          const excessRefundVal = isExcessRefund ? Number(values.excessRefundAmount || 0) : 0;
          const refundMethod = values.excessRefundMethod || 'Cash';

          const settlementTerm = isExcessRefund 
            ? (totalAllReturnsCredit > excessRefundVal ? 'Exchange & Cash Refund' : (refundMethod === 'Bank' ? 'By Bank' : 'By Cash'))
            : 'Exchange On Invoice';

          const returnPayload: any = {
            return_no: values.invoiceNo,
            customer_name: customerFinalName,
            return_date: values.saleDate || new Date().toISOString().split('T')[0],
            warehouse_name: returnWh,
            source_warehouse: returnWh,
            invoice_no: values.invoiceNo,
            original_invoice_no: values.invoiceNo,
            settlement_mode: settlementTerm,
            payment_term: settlementTerm,
            total_amount: totalAllReturnsCredit,
            payout_amount_paid: excessRefundVal,
            cash_amount_paid: isExcessRefund && refundMethod === 'Cash' ? excessRefundVal : null,
            bank_amount: isExcessRefund && refundMethod === 'Bank' ? String(excessRefundVal) : null,
            selected_bank: isExcessRefund && refundMethod === 'Bank' ? values.excessRefundBank : null,
            status: isExcessRefund ? 'Refunded' : 'Credit Applied',
            inward_status: 'Pending Inward',
            remarks: `In-invoice return/exchange against Invoice #${values.invoiceNo}${isExcessRefund ? ` (Refund Paid: Rs. ${excessRefundVal} via ${refundMethod})` : ''}`,
            items: allCombinedReturnItems
          };

          const { data: existingReturn } = await supabase
            .from('sales_returns')
            .select('id')
            .eq('return_no', values.invoiceNo)
            .maybeSingle();

          if (existingReturn) {
            await supabase.from('sales_returns').update(returnPayload).eq('id', existingReturn.id);
          } else {
            await supabase.from('sales_returns').insert([returnPayload]);
          }
        } else if (editData) {
          await supabase.from('sales_returns').delete().eq('return_no', editData.invoice_no || values.invoiceNo);
        }
      } catch (retSyncErr: any) {
        console.error('Sales Return sync warning:', retSyncErr);
      }

      setShowCustomerModal(false);
      if (submitAction === 'print' && finalInvoiceId) {
        navigate(`${tenantId ? `/${tenantId}` : ''}/sales/invoice/print/${finalInvoiceId}`);
      } else {
        navigate(`${tenantId ? `/${tenantId}` : ''}/sales/invoice/list`);
      }
    } catch (err: any) {
      toast.error('Submission failure: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalCustomerModalSubmit = async () => {
    if (!pendingFormValues || loading) return;
    setLoading(true);

    try {
      // Calculate if sale is on credit
      const returnVal = (pendingFormValues.returnItems || []).reduce(
        (acc: number, r: any) => acc + (Number(r.qty || 0) * Number(r.rp ?? r.rate ?? 0)), 0
      );
      const tileReturnVal = (pendingFormValues.showTileReturnSection ? (pendingFormValues.tileReturnItems || []) : []).reduce(
        (acc: number, t: any) => acc + Number(t.totalAmount || 0), 0
      );
      const tileVal = (pendingFormValues.showTileSection ? (pendingFormValues.tileItems || []) : []).reduce(
        (acc: number, t: any) => acc + Number(t.totalAmount || 0), 0
      );
      const grossTotal = (pendingFormValues.items || []).reduce((acc: number, item: any) => {
        return acc + calculateLineTotals(item, pendingFormValues.taxScenario, pendingFormValues.applyFbrTax).netTotal;
      }, 0) + tileVal + Number(pendingFormValues.transportCharges || 0) + Number(pendingFormValues.additionalCharges || 0) - Number(pendingFormValues.overallDiscount || 0);

      const netPayable = grossTotal - returnVal - tileReturnVal;
      const currentSubtotal = Math.max(0, netPayable);

      const totalPaidNow = pendingFormValues.settlementMode === 'Cash'
        ? Number(pendingFormValues.cashAmountPaid || 0)
        : (pendingFormValues.settlementMode === 'Bank' ? Number(pendingFormValues.bankAmountPaid || 0) : (Number(pendingFormValues.cashAmountPaid || 0) + Number(pendingFormValues.bankAmountPaid || 0)));
      const remainingBal = Math.max(0, currentSubtotal - totalPaidNow);
      const isOnCredit = remainingBal > 0.01 || netPayable < -0.01;

      let finalCustomerName = '';

      if (customerModalType === 'recorded') {
        if (!selectedRecordedCustomer) {
          toast.error('Please select an existing customer account from the list.');
          setLoading(false);
          return;
        }
        finalCustomerName = selectedRecordedCustomer;
      } else {
        const cleanName = walkinName.trim();
        const cleanPhone = walkinPhone.trim();

        if (isOnCredit && (!cleanName || cleanName.toLowerCase() === 'walk-in customer')) {
          toast.error(`Customer Name is required for credit sales (Outstanding balance: Rs. ${remainingBal.toLocaleString()}) to maintain customer directory record.`);
          setLoading(false);
          return;
        }

        finalCustomerName = cleanName || 'Walk-in Customer';

        // If user specified a custom walk-in customer name
        if ((recordWalkinCustomer || isOnCredit) && cleanName && cleanName.toLowerCase() !== 'walk-in customer') {
          try {
            const { data: existing } = await supabase
              .from('customers')
              .select('id')
              .ilike('customerName', cleanName)
              .maybeSingle();

            if (!existing) {
              const { error: custErr } = await supabase.from('customers').insert([{
                customerName: cleanName,
                customer_code: null,
                customercode: null,
                primaryphone: cleanPhone || '-',
                phone: cleanPhone || '-',
                company: 'Retail Walk-in'
              }]);

              if (custErr) {
                console.error('Customer insert warning:', custErr);
              } else {
                toast.success(`Customer "${cleanName}" saved to directory!`);
              }
            }
          } catch (e: any) {
            console.error('Customer registration error:', e);
          }
        } 
        // If user did not provide a custom name, auto-create / link to unified "Walk-in Customer" profile
        else if (!cleanName || cleanName.toLowerCase() === 'walk-in customer') {
          try {
            const { data: existingWalkin } = await supabase
              .from('customers')
              .select('id')
              .ilike('customerName', 'Walk-in Customer')
              .maybeSingle();

            if (!existingWalkin) {
              const { error: walkinErr } = await supabase.from('customers').insert([{
                customerName: 'Walk-in Customer',
                customer_code: 'WALK-IN',
                customercode: 'WALK-IN',
                primaryphone: '-',
                phone: '-',
                company: 'Counter Walk-in / Direct Retail'
              }]);

              if (walkinErr) {
                console.error('Walk-in Customer profile auto-creation warning:', walkinErr);
              }
            }
          } catch (e: any) {
            console.error('Walk-in customer lookup error:', e);
          }
        }
      }

      await executeInvoicePersistence(pendingFormValues, finalCustomerName, bypassNegativeStockWarning);
    } catch (e: any) {
      console.error(e);
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="flex h-48 items-center justify-center"><Spinner /></div>;

  return (
    <div className="mx-auto max-w-7xl text-black dark:text-bodydark text-xs font-sans relative">
      
      {/* ⚠️ WAREHOUSE STOCK MISMATCH / LOW STOCK WARNING MODAL */}
      {showStockWarningModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-boxdark w-full max-w-xl rounded-2xl shadow-2xl p-6 border border-amber-300 dark:border-amber-700/60 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FiAlertTriangle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Warehouse Stock Warning
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    The chosen warehouse has insufficient stock, but items are available in another location:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStockWarningModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg transition"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* List of Warning Items */}
            <div className="my-4 max-h-72 overflow-y-auto space-y-3 pr-1">
              {stockWarningItems.map((item, wIdx) => {
                const hasAlt = item.bestAlternative && item.bestAlternative.stock > 0;
                return (
                  <div
                    key={wIdx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {item.itemName}
                        </div>
                        {item.skuCode && (
                          <div className="text-[10px] font-mono text-slate-400">Code: {item.skuCode}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold font-mono px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 text-[11px]">
                          Need: {item.itemType === 'tile' ? `${item.requestedBoxes} Box + ${item.requestedLoose} Pcs` : `${item.requestedQty} ${item.uom}`}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                      <div>
                        <span className="text-slate-400">Selected Location:</span>
                        <div className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1 font-mono">
                          <span>{item.currentWarehouse}</span>
                          <span>(Available: {item.itemType === 'tile' ? `${item.currentStock} Box + ${item.currentLoose} Pcs` : `${item.currentStock} ${item.uom}`})</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400">Stock Found in:</span>
                        {hasAlt ? (
                          <div className="flex items-center justify-between gap-1 mt-0.5">
                            <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
                              {item.bestAlternative.warehouse} ({item.itemType === 'tile' ? `${item.bestAlternative.boxes} Box + ${item.bestAlternative.loose} Pcs` : `${item.bestAlternative.stock} ${item.uom}`})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const targetWh = item.bestAlternative.warehouse;
                                if (activeFormikSetFieldValue) {
                                  if (item.itemType === 'standard') {
                                    activeFormikSetFieldValue(`items.${item.index}.warehouse`, targetWh);
                                    activeFormikSetFieldValue(`items.${item.index}.availableQty`, item.bestAlternative.stock);
                                  } else {
                                    activeFormikSetFieldValue(`tileItems.${item.index}.warehouse`, targetWh);
                                    activeFormikSetFieldValue(`tileItems.${item.index}.availableQty`, item.bestAlternative.stock);
                                  }
                                }
                                if (pendingFormValues) {
                                  if (item.itemType === 'standard' && pendingFormValues.items?.[item.index]) {
                                    pendingFormValues.items[item.index].warehouse = targetWh;
                                    pendingFormValues.items[item.index].availableQty = item.bestAlternative.stock;
                                  } else if (item.itemType === 'tile' && pendingFormValues.tileItems?.[item.index]) {
                                    pendingFormValues.tileItems[item.index].warehouse = targetWh;
                                    pendingFormValues.tileItems[item.index].availableQty = item.bestAlternative.stock;
                                  }
                                }
                                setStockWarningItems(prev => prev.filter((_, idx) => idx !== wIdx));
                                toast.success(`Switched ${item.itemName} to ${targetWh}`);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 transition cursor-pointer"
                            >
                              Switch
                            </button>
                          </div>
                        ) : (
                          <div className="font-bold text-slate-400 italic">No other warehouse has stock</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => setShowStockWarningModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition cursor-pointer"
              >
                Cancel & Edit Rows
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowStockWarningModal(false);
                    openCustomerCheckoutModal(pendingFormValues, true);
                  }}
                  className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold transition cursor-pointer text-center"
                  title="Allows invoice to proceed with negative stock in the selected location"
                >
                  Proceed with Negative Stock
                </button>

                {stockWarningItems.some(i => i.bestAlternative && i.bestAlternative.stock > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      stockWarningItems.forEach(item => {
                        if (item.bestAlternative && item.bestAlternative.stock > 0) {
                          const targetWh = item.bestAlternative.warehouse;
                          if (activeFormikSetFieldValue) {
                            if (item.itemType === 'standard') {
                              activeFormikSetFieldValue(`items.${item.index}.warehouse`, targetWh);
                              activeFormikSetFieldValue(`items.${item.index}.availableQty`, item.bestAlternative.stock);
                            } else {
                              activeFormikSetFieldValue(`tileItems.${item.index}.warehouse`, targetWh);
                              activeFormikSetFieldValue(`tileItems.${item.index}.availableQty`, item.bestAlternative.stock);
                            }
                          }
                          if (pendingFormValues) {
                            if (item.itemType === 'standard' && pendingFormValues.items?.[item.index]) {
                              pendingFormValues.items[item.index].warehouse = targetWh;
                              pendingFormValues.items[item.index].availableQty = item.bestAlternative.stock;
                            } else if (item.itemType === 'tile' && pendingFormValues.tileItems?.[item.index]) {
                              pendingFormValues.tileItems[item.index].warehouse = targetWh;
                              pendingFormValues.tileItems[item.index].availableQty = item.bestAlternative.stock;
                            }
                          }
                        }
                      });
                      toast.success('All items switched to warehouses with stock!');
                      setShowStockWarningModal(false);
                      openCustomerCheckoutModal(pendingFormValues, false);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Switch to Available Stock & Save</span>
                    <FiArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK NEW CUSTOMER MODAL */}
      {isQuickCustomerModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl border border-stroke dark:border-strokedark w-full max-w-md p-6 overflow-hidden animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-stroke dark:border-strokedark mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                  <FiUser className="text-lg" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-black dark:text-white">Quick Add Customer</h3>
                  <p className="text-[11px] text-gray-400">Instantly creates ledger account and selects for billing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCustomerModalOpen(false)}
                className="text-gray-400 hover:text-black dark:hover:text-white p-1 rounded-md"
              >
                <FiX className="text-lg" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Customer Full Name: *
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="e.g. Haji Aslam Trader"
                    value={quickCustomerName}
                    onChange={(e) => setQuickCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stroke dark:border-strokedark bg-transparent font-bold outline-none text-black dark:text-white focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Contact Phone:
                </label>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    placeholder="e.g. 0300-1234567"
                    value={quickCustomerPhone}
                    onChange={(e) => setQuickCustomerPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stroke dark:border-strokedark bg-transparent font-bold outline-none text-black dark:text-white focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    Customer Code:
                  </label>
                  <input
                    type="text"
                    value={quickCustomerCode}
                    onChange={(e) => setQuickCustomerCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stroke dark:border-strokedark bg-transparent font-bold outline-none text-black dark:text-white focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    Opening Balance:
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={quickCustomerOpeningBal}
                    onChange={(e) => setQuickCustomerOpeningBal(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-stroke dark:border-strokedark bg-transparent font-bold outline-none text-black dark:text-white focus:border-primary font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                  Shop / Delivery Address:
                </label>
                <textarea
                  rows={2}
                  placeholder="Street / Market / Delivery point..."
                  value={quickCustomerAddress}
                  onChange={(e) => setQuickCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stroke dark:border-strokedark bg-transparent font-bold outline-none text-black dark:text-white focus:border-primary"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-stroke dark:border-strokedark">
              <button
                type="button"
                onClick={() => setIsQuickCustomerModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-stroke dark:border-strokedark text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-meta-4 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingQuickCustomer}
                onClick={() => handleSaveQuickCustomer(activeFormikSetFieldValue)}
                className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-2 disabled:opacity-50 transition"
              >
                {isSavingQuickCustomer ? (
                  <>
                    <Spinner size="w-3.5 h-3.5" color="border-white" />
                    <span>Creating Profile...</span>
                  </>
                ) : (
                  <>
                    <FiCheck className="text-sm" />
                    <span>Save & Use Customer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER CHECKOUT MODAL */}
      {showCustomerModal && (() => {
        const modalReturnVal = (pendingFormValues?.returnItems || []).reduce((acc: number, r: any) => acc + (Number(r.qty || 0) * Number(r.rp ?? r.rate ?? 0)), 0);
        const modalTileReturnVal = (pendingFormValues?.showTileReturnSection ? (pendingFormValues?.tileReturnItems || []) : []).reduce((acc: number, t: any) => acc + Number(t.totalAmount || 0), 0);
        const modalTileVal = (pendingFormValues?.showTileSection ? (pendingFormValues?.tileItems || []) : []).reduce((acc: number, t: any) => acc + Number(t.totalAmount || 0), 0);
        const modalGross = pendingFormValues ? (
          (pendingFormValues.items || []).reduce((acc: number, item: any) => {
            return acc + calculateLineTotals(item, pendingFormValues.taxScenario, pendingFormValues.applyFbrTax).netTotal;
          }, 0) + modalTileVal + Number(pendingFormValues.transportCharges || 0) + Number(pendingFormValues.additionalCharges || 0) - Number(pendingFormValues.overallDiscount || 0)
        ) : 0;
        const modalNetPayable = modalGross - modalReturnVal - modalTileReturnVal;
        const modalSubtotal = Math.max(0, modalNetPayable);

        const modalPaid = pendingFormValues ? (
          pendingFormValues.settlementMode === 'Cash'
            ? Number(pendingFormValues.cashAmountPaid || 0)
            : (pendingFormValues.settlementMode === 'Bank' ? Number(pendingFormValues.bankAmountPaid || 0) : (Number(pendingFormValues.cashAmountPaid || 0) + Number(pendingFormValues.bankAmountPaid || 0)))
        ) : 0;

        const modalRemainingBal = Math.max(0, modalSubtotal - modalPaid);
        const isModalOnCredit = modalRemainingBal > 0.01 || modalNetPayable < -0.01;

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-boxdark w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-stroke dark:border-strokedark animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
                  <FiUserCheck className="text-emerald-500" /> Checkout Customer
                </h2>
                <button onClick={() => setShowCustomerModal(false)}>
                  <FiX className="text-xl text-gray-400 hover:text-black dark:hover:text-white" />
                </button>
              </div>

              {modalNetPayable < -0.01 ? (
                <div className="mb-4 p-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>
                    <strong>Customer Account Credit (Excess Return: Rs. {Math.abs(modalNetPayable).toLocaleString(undefined, { minimumFractionDigits: 2 })}):</strong> Balance will be credited to customer receivable account.
                  </span>
                </div>
              ) : isModalOnCredit && (
                <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>
                    <strong>Credit Sale (Remaining: Rs. {modalRemainingBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}):</strong> Customer account will be saved to directory.
                  </span>
                </div>
              )}

              <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                  type="button"
                  onClick={() => setCustomerModalType('walkin')} 
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition ${customerModalType === 'walkin' ? 'bg-white dark:bg-boxdark shadow-sm text-primary dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                >
                  Walk-in Sale
                </button>
                <button 
                  type="button"
                  onClick={() => setCustomerModalType('recorded')} 
                  className={`flex-1 py-2 text-xs font-bold rounded-md transition ${customerModalType === 'recorded' ? 'bg-white dark:bg-boxdark shadow-sm text-primary dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'}`}
                >
                  Recorded Client
                </button>
              </div>

              {customerModalType === 'walkin' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Customer Name {isModalOnCredit ? <span className="text-red-500 font-extrabold">*</span> : '(Optional)'}
                    </label>
                    <input 
                      type="text" 
                      placeholder={isModalOnCredit ? "Customer Name *" : "Customer Name (Optional)"} 
                      value={walkinName} 
                      onChange={(e) => setWalkinName(e.target.value)} 
                      className={`w-full p-3 border rounded-lg bg-white dark:bg-boxdark dark:border-strokedark outline-none text-xs font-bold text-black dark:text-white ${
                        isModalOnCredit && !walkinName.trim() ? 'border-amber-500 focus:border-amber-600 bg-amber-50/5' : 'focus:border-primary'
                      }`} 
                    />
                    {isModalOnCredit && !walkinName.trim() && (
                      <p className="text-amber-600 dark:text-amber-400 text-[10px] font-semibold mt-1">
                        * Required for credit sale
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Phone Number (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="Phone Number (Optional)" 
                      value={walkinPhone} 
                      onChange={(e) => setWalkinPhone(e.target.value)} 
                      className="w-full p-3 border rounded-lg bg-white dark:bg-boxdark dark:border-strokedark outline-none text-xs text-black dark:text-white focus:border-primary" 
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-400">
                    <input 
                      type="checkbox" 
                      checked={recordWalkinCustomer || isModalOnCredit} 
                      disabled={isModalOnCredit}
                      onChange={(e) => setRecordWalkinCustomer(e.target.checked)} 
                    />
                    <span>Save this customer to directory {isModalOnCredit && <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">(Auto-enabled for credit)</span>}</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400">Select Customer Profile</label>
                  <select 
                    value={selectedRecordedCustomer} 
                    onChange={(e) => setSelectedRecordedCustomer(e.target.value)} 
                    className="w-full p-3 border rounded-lg bg-white dark:bg-boxdark dark:border-strokedark outline-none text-xs font-bold text-black dark:text-white focus:border-primary"
                  >
                    <option value="" className="bg-white dark:bg-boxdark text-black dark:text-white">-- Search Customer --</option>
                    {customersList.map(c => {
                      const code = c.customer_code || c.customerCode;
                      return (
                        <option key={c.id} value={c.customerName} className="bg-white dark:bg-boxdark text-black dark:text-white">
                          {code ? `[${code}] ${c.customerName}` : c.customerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setShowCustomerModal(false)} className="flex-1 py-2.5 rounded-lg border border-stroke dark:border-strokedark font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
                <button type="button" onClick={handleFinalCustomerModalSubmit} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><FiCheck /> {loading ? 'Processing...' : 'Finalize & Log'}</button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <div className="flex items-center justify-between border-b border-stroke pb-4 mb-6 dark:border-strokedark">
          <h3 className="font-semibold text-black dark:text-white text-base">
            {editData ? `Modify Historical Sales Invoice Reference # ${editData.id}` : 'Generate Commercial Sales Invoice'}
          </h3>
          <button type="button" onClick={() => navigate('/sales/invoice/list')} className="text-sm font-medium text-primary hover:underline">See Logs List</button>
        </div>

        <Formik
          initialValues={getFormInitialValues()}
          enableReinitialize={true}
          validationSchema={validationSchema}
          onSubmit={async (values) => {
            if (isSalesman) {
              values.salesman = matchedSalesman || currentSalesmanName || values.salesman;
            }
            setPendingFormValues(values);

            // Calculate return deductions and check if on credit
            const returnVal = (values.returnItems || []).reduce(
              (acc: number, r: any) => acc + (Number(r.qty || 0) * Number(r.rp ?? r.rate ?? 0)), 0
            );
            const tileReturnVal = (values.showTileReturnSection ? (values.tileReturnItems || []) : []).reduce(
              (acc: number, t: any) => acc + Number(t.totalAmount || 0), 0
            );
            const tileVal = (values.showTileSection ? (values.tileItems || []) : []).reduce(
              (acc: number, t: any) => acc + Number(t.totalAmount || 0), 0
            );
            const grossTotal = (values.items || []).reduce((acc: number, item: any) => {
              return acc + calculateLineTotals(item, values.taxScenario, values.applyFbrTax).netTotal;
            }, 0) + tileVal + Number(values.transportCharges || 0) + Number(values.additionalCharges || 0) - Number(values.overallDiscount || 0);

            const netPayable = grossTotal - returnVal - tileReturnVal;
            const currentSubtotal = Math.max(0, netPayable);
            const totalPaidNow = values.settlementMode === 'Cash'
              ? Number(values.cashAmountPaid || 0)
              : (values.settlementMode === 'Bank' ? Number(values.bankAmountPaid || 0) : (Number(values.cashAmountPaid || 0) + Number(values.bankAmountPaid || 0)));
            const remainingBal = Math.max(0, currentSubtotal - totalPaidNow);
            const isOnCredit = remainingBal > 0.01 || netPayable < -0.01;

            const selectedCust = (values.customerName || selectedRecordedCustomer || '').trim();

            // 1. If recorded customer is selected upfront: direct persist!
            if (selectedCust && selectedCust.toLowerCase() !== 'walk-in customer') {
              setSelectedRecordedCustomer(selectedCust);
              setCustomerModalType('recorded');
              await executeInvoicePersistence(values, selectedCust, false);
              return;
            }

            // 2. If Walk-in and paid in full (no remaining debt): direct persist!
            if (!isOnCredit) {
              setCustomerModalType('walkin');
              await executeInvoicePersistence(values, 'Walk-in Customer', false);
              return;
            }

            // 3. If credit sale with Walk-in, open customer modal to capture directory details
            if (editData && editData.customer_name) {
              const custName = String(editData.customer_name).trim();
              const isExistingRecorded = customersList.some(c => (c.customerName || '').toLowerCase() === custName.toLowerCase());

              if (isExistingRecorded) {
                const found = customersList.find(c => (c.customerName || '').toLowerCase() === custName.toLowerCase());
                setSelectedRecordedCustomer(found?.customerName || custName);
                setCustomerModalType('recorded');
              } else {
                setCustomerModalType('walkin');
                setWalkinName(custName);
                setWalkinPhone('');
                setRecordWalkinCustomer(false);
              }
            } else {
              setCustomerModalType('walkin');
              setWalkinName('');
              setWalkinPhone('');
              setRecordWalkinCustomer(true);
            }
            setIsOpeningCustomerModal(false);
            setShowCustomerModal(true);
          }}
        >
          {({ values, handleChange, setFieldValue, errors, touched, submitCount, submitForm, isSubmitting, isValidating }) => {
            // Keep setFieldValue available for stock modal auto-switch
            if (activeFormikSetFieldValue !== setFieldValue) {
              setActiveFormikSetFieldValue(() => setFieldValue);
            }
            const hasAttempted = submitCount > 0;
            const isModalLoading = isOpeningCustomerModal || isSubmitting || isValidating;
            const returnTotalValue = (values.returnItems || []).reduce((acc: number, rItem: any) => {
              return acc + (Number(rItem.qty || 0) * Number(rItem.rp ?? rItem.rate ?? 0));
            }, 0);

            const tileReturnTotalValue = (values.showTileReturnSection ? (values.tileReturnItems || []) : []).reduce((acc: number, tItem: any) => {
              return acc + Number(tItem.totalAmount || 0);
            }, 0);

            const tileTotalValue = (values.showTileSection ? (values.tileItems || []) : []).reduce((acc: number, tItem: any) => {
              return acc + Number(tItem.totalAmount || 0);
            }, 0);

            const grossSubtotalValue = values.items.reduce((acc: number, item: any) => {
              return acc + calculateLineTotals(item, values.taxScenario, values.applyFbrTax).netTotal;
            }, 0) + tileTotalValue + Number(values.transportCharges || 0) + Number(values.additionalCharges || 0);

            const netPayableBeforeFloor = grossSubtotalValue - Number(values.overallDiscount || 0) - returnTotalValue - tileReturnTotalValue;
            const currentSubtotalValue = Math.max(
              0,
              netPayableBeforeFloor
            );

            const currentPrefix = getSalesmanPrefix(values.salesman, salesmenList);

            // Extract user-typed suffix
            let rawSuffix = values.invoiceNo || '';
            if (currentPrefix && rawSuffix.toUpperCase().startsWith(currentPrefix.toUpperCase())) {
              rawSuffix = rawSuffix.slice(currentPrefix.length);
            }

            // Auto-lock salesman value if logged in as salesman
            if (isSalesman && (matchedSalesman || currentSalesmanName)) {
              const currentOfficer = matchedSalesman || currentSalesmanName;
              if (values.salesman !== currentOfficer) {
                setTimeout(() => {
                  setFieldValue('salesman', currentOfficer);
                }, 0);
              }
            }

            return (
              <Form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-gray-50 dark:bg-meta-4/5 p-4 rounded-sm border border-stroke dark:border-strokedark">
                  <div className="md:col-span-5">
                    <label className="block font-bold text-gray-500 mb-1">Invoice Number #: *</label>
                    <div className={`flex items-center rounded border overflow-hidden bg-white dark:bg-boxdark ${hasAttempted && errors.invoiceNo ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus-within:border-primary'}`}>
                      <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 font-mono font-black text-xs sm:text-sm border-r border-stroke dark:border-strokedark select-none whitespace-nowrap shrink-0 flex items-center justify-center">
                        {currentPrefix || <span className="text-gray-400 font-normal text-xs">Prefix-</span>}
                      </span>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="invoiceNo" 
                        placeholder={currentPrefix ? "e.g. 001 or 26388" : "Select salesman first"} 
                        value={rawSuffix} 
                        onKeyDown={(e) => {
                          if (
                            !/[\d]/.test(e.key) &&
                            !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) &&
                            !e.ctrlKey &&
                            !e.metaKey
                          ) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '');
                          if (currentPrefix) {
                            setFieldValue('invoiceNo', `${currentPrefix}${digitsOnly}`);
                          } else {
                            setFieldValue('invoiceNo', digitsOnly);
                          }
                        }} 
                        className="w-full min-w-0 p-2 text-sm bg-transparent font-bold outline-none text-black dark:text-white placeholder:font-normal placeholder:text-xs placeholder:text-gray-400 font-mono" 
                      />
                    </div>
                    {hasAttempted && errors.invoiceNo && <p className="text-red-500 text-xs font-bold mt-1">{String(errors.invoiceNo)}</p>}
                  </div>

                  <div className="md:col-span-3">
                    <label className="block font-bold text-gray-500 mb-1">Billing Date: *</label>
                    <input 
                      type="date" 
                      name="saleDate" 
                      value={values.saleDate} 
                      onChange={handleChange}
                      min={editData ? undefined : new Date(new Date().setDate(new Date().getDate() - 3)).toISOString().split('T')[0]}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full rounded border p-2 text-sm bg-transparent font-bold outline-none text-black dark:text-white ${hasAttempted && errors.saleDate ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}`} 
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block font-bold text-gray-500 mb-1">
                      Assigned Salesman: * {isSalesman && <span className="text-[11px] text-emerald-600 font-semibold">(Locked)</span>}
                    </label>
                    {isSalesman ? (
                      <div className="relative">
                        <input
                          type="text"
                          name="salesman"
                          value={values.salesman || matchedSalesman || currentSalesmanName}
                          readOnly
                          className="w-full rounded border p-2 text-sm bg-gray-100 dark:bg-slate-800 font-bold outline-none text-slate-800 dark:text-slate-100 border-stroke dark:border-strokedark cursor-not-allowed select-none"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          🔒 Logged In
                        </div>
                      </div>
                    ) : (
                      <select
                        name="salesman"
                        value={values.salesman}
                        onChange={(e) => {
                          const selectedSm = e.target.value;
                          setFieldValue('salesman', selectedSm);
                          const newPrefix = getSalesmanPrefix(selectedSm, salesmenList);
                          if (rawSuffix) {
                            setFieldValue('invoiceNo', newPrefix ? `${newPrefix}${rawSuffix}` : rawSuffix);
                          } else {
                            setFieldValue('invoiceNo', newPrefix ? `${newPrefix}` : '');
                          }
                        }}
                        className={`w-full rounded border p-2 text-sm bg-white dark:bg-boxdark font-bold outline-none text-black dark:text-white ${hasAttempted && errors.salesman ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}`}
                      >
                        <option value="">-- Select Officer --</option>
                        {salesmenList.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name} {s.invoice_name ? `(${s.invoice_name})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {hasAttempted && errors.salesman && (
                      <p className="text-red-500 text-xs font-bold mt-1">{String(errors.salesman)}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-meta-4/5 p-4 rounded-sm border border-stroke dark:border-strokedark">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-gray-500">
                        Customer Account / Profile:
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenQuickCustomerModal(customerSearchQuery, setFieldValue)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded"
                        title="Quickly add new customer without leaving invoice"
                      >
                        <FiPlus className="text-xs" /> New Customer
                      </button>
                    </div>

                    <div className="relative customer-combobox-container">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder="Search customer by name, code, phone or select Walk-in..."
                          value={
                            isCustomerDropdownOpen
                              ? customerSearchQuery
                              : (values.customerName || selectedRecordedCustomer || 'Walk-in Customer (Counter)')
                          }
                          onFocus={() => {
                            setIsCustomerDropdownOpen(true);
                            setCustomerSearchQuery('');
                            setHighlightedCustomerIndex(0);
                          }}
                          onChange={(e) => {
                            setCustomerSearchQuery(e.target.value);
                            setIsCustomerDropdownOpen(true);
                            setHighlightedCustomerIndex(0);
                          }}
                          onKeyDown={(e) => {
                            if (!isCustomerDropdownOpen) {
                              if (e.key === 'ArrowDown' || e.key === 'Enter') {
                                setIsCustomerDropdownOpen(true);
                                e.preventDefault();
                              }
                              return;
                            }

                            const filtered = [
                              { id: 'walkin', customerName: 'Walk-in Customer (Counter)', isWalkin: true },
                              ...customersList.filter((c: any) => {
                                const q = customerSearchQuery.toLowerCase().trim();
                                if (!q) return true;
                                const name = String(c.customerName || c.name || '').toLowerCase();
                                const code = String(c.customer_code || c.customerCode || c.coa_code || '').toLowerCase();
                                const phone = String(c.primaryPhone || c.phone || '').toLowerCase();
                                return name.includes(q) || code.includes(q) || phone.includes(q);
                              })
                            ];

                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setHighlightedCustomerIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setHighlightedCustomerIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              if (filtered[highlightedCustomerIndex]) {
                                const item = filtered[highlightedCustomerIndex];
                                if (item.isWalkin) {
                                  setFieldValue('customerName', '');
                                  setSelectedRecordedCustomer('');
                                  setCustomerModalType('walkin');
                                  setCustomerSoldMap({});
                                } else {
                                  setFieldValue('customerName', item.customerName);
                                  setSelectedRecordedCustomer(item.customerName);
                                  setCustomerModalType('recorded');
                                  fetchCustomerPastSales(item.customerName);
                                  if (item.address && !values.shippingAddress) {
                                    setFieldValue('shippingAddress', item.address);
                                  }
                                }
                                setIsCustomerDropdownOpen(false);
                                setCustomerSearchQuery('');
                              } else if (customerSearchQuery.trim()) {
                                handleOpenQuickCustomerModal(customerSearchQuery.trim(), setFieldValue);
                              }
                            } else if (e.key === 'Escape') {
                              setIsCustomerDropdownOpen(false);
                            }
                          }}
                          className="w-full rounded border border-stroke dark:border-strokedark p-2 pr-16 text-sm bg-white dark:bg-boxdark font-bold outline-none text-black dark:text-white focus:border-primary shadow-sm"
                        />
                        <div className="absolute right-2 flex items-center gap-1.5">
                          {(values.customerName || selectedRecordedCustomer) && (
                            <button
                              type="button"
                              onClick={() => {
                                setFieldValue('customerName', '');
                                setSelectedRecordedCustomer('');
                                setCustomerModalType('walkin');
                                setCustomerSoldMap({});
                                setCustomerSearchQuery('');
                              }}
                              className="text-gray-400 hover:text-red-500 text-xs p-1"
                              title="Reset to Walk-in"
                            >
                              <FiX />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                            className="text-gray-400 hover:text-primary text-xs p-1"
                          >
                            <FiChevronDown className={`transition-transform duration-200 ${isCustomerDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Dropdown Menu */}
                      {isCustomerDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark shadow-2xl z-50 py-1">
                          {/* Walkin Option */}
                          <div
                            onClick={() => {
                              setFieldValue('customerName', '');
                              setSelectedRecordedCustomer('');
                              setCustomerModalType('walkin');
                              setCustomerSoldMap({});
                              setIsCustomerDropdownOpen(false);
                              setCustomerSearchQuery('');
                            }}
                            className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between border-b border-stroke/50 dark:border-strokedark/50 ${
                              highlightedCustomerIndex === 0
                                ? 'bg-primary/10 text-primary font-bold'
                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-meta-4'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                              <span>Walk-in Customer (Counter)</span>
                            </div>
                            <span className="text-[10px] bg-slate-100 dark:bg-meta-4 text-slate-500 px-1.5 py-0.5 rounded font-mono">Counter</span>
                          </div>

                          {/* Filtered Customer List */}
                          {customersList
                            .filter((c: any) => {
                              const q = customerSearchQuery.toLowerCase().trim();
                              if (!q) return true;
                              const name = String(c.customerName || c.name || '').toLowerCase();
                              const code = String(c.customer_code || c.customerCode || c.coa_code || '').toLowerCase();
                              const phone = String(c.primaryPhone || c.phone || '').toLowerCase();
                              return name.includes(q) || code.includes(q) || phone.includes(q);
                            })
                            .map((c: any, index: number) => {
                              const listIndex = index + 1;
                              const code = c.customer_code || c.customerCode || c.coa_code;
                              const isSelected = (values.customerName || selectedRecordedCustomer) === c.customerName;
                              const isHighlighted = highlightedCustomerIndex === listIndex;

                              return (
                                <div
                                  key={c.id || index}
                                  onMouseEnter={() => setHighlightedCustomerIndex(listIndex)}
                                  onClick={() => {
                                    setFieldValue('customerName', c.customerName);
                                    setSelectedRecordedCustomer(c.customerName);
                                    setCustomerModalType('recorded');
                                    fetchCustomerPastSales(c.customerName);
                                    if (c.address && !values.shippingAddress) {
                                      setFieldValue('shippingAddress', c.address);
                                    }
                                    setIsCustomerDropdownOpen(false);
                                    setCustomerSearchQuery('');
                                  }}
                                  className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition ${
                                    isSelected
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold'
                                      : isHighlighted
                                      ? 'bg-primary/10 text-primary font-semibold'
                                      : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-meta-4'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-primary/60'}`}></span>
                                    <span className="truncate">{c.customerName}</span>
                                    {c.primaryPhone && <span className="text-[10px] text-gray-400">({c.primaryPhone})</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {code && (
                                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-meta-4 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                        {code}
                                      </span>
                                    )}
                                    {c.currentBalance !== undefined && (
                                      <span className={`text-[10px] font-bold ${Number(c.currentBalance) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        Rs. {Number(c.currentBalance || 0).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                          {/* Quick Add Option */}
                          <div
                            onClick={() => handleOpenQuickCustomerModal(customerSearchQuery, setFieldValue)}
                            className="px-3 py-2 text-xs cursor-pointer flex items-center gap-2 border-t border-stroke dark:border-strokedark text-primary hover:bg-primary/10 font-bold"
                          >
                            <FiPlus className="text-sm" />
                            <span>
                              {customerSearchQuery.trim()
                                ? `Add "${customerSearchQuery.trim()}" as New Customer`
                                : 'Add New Customer Profile'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-500 mb-1">Shipping Address (Optional):</label>
                    <textarea 
                      name="shippingAddress" 
                      placeholder="Enter full shipping address if applicable..." 
                      value={values.shippingAddress} 
                      onChange={handleChange} 
                      rows={2}
                      className="w-full rounded border border-stroke p-2 text-sm bg-white dark:bg-boxdark font-bold outline-none text-black dark:text-white focus:border-primary dark:border-strokedark" 
                    />
                  </div>
                </div>

                {/* 🌟 TAX & DISCOUNT TOGGLE BAR: CLEAN & UNCLUTTERED DEFAULT UI */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-meta-4/20 border border-stroke dark:border-strokedark rounded-sm">
                  <div className="flex flex-wrap items-center gap-6">
                    {/* Tax Invoicing Toggle (Commented out - ready to be re-enabled if client requests GST/FBR Tax Invoicing) */}
                    {/*
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={values.applyFbrTax}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setFieldValue('applyFbrTax', isChecked);
                        }}
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                      />
                      <span className="font-bold text-xs text-black dark:text-white">Enable GST / FBR Tax Invoicing</span>
                    </label>
                    */}

                    {/* Discount Column Toggle */}
                    <div 
                      onClick={() => {
                        const isChecked = !values.showDiscount;
                        setFieldValue('showDiscount', isChecked);
                        if (!isChecked) {
                          values.items.forEach((_: any, idx: number) => {
                            setFieldValue(`items.${idx}.discountPer`, 0);
                            setFieldValue(`items.${idx}.discountAmt`, 0);
                          });
                        }
                      }}
                      className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-full transition select-none flex items-center justify-center border ${
                        values.showDiscount 
                          ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800' 
                          : 'bg-white text-slate-500 border-stroke dark:bg-boxdark dark:text-slate-400 dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4'
                      }`}
                    >
                      Discounts
                    </div>

                    {/* Overall Bill Discount Toggle */}
                    <div
                      onClick={() => {
                        const isChecked = !values.showOverallDiscount;
                        setFieldValue('showOverallDiscount', isChecked);
                        if (!isChecked) setFieldValue('overallDiscount', 0);
                      }}
                      className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-full transition select-none flex items-center justify-center border ${
                        values.showOverallDiscount
                          ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800'
                          : 'bg-white text-slate-500 border-stroke dark:bg-boxdark dark:text-slate-400 dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4'
                      }`}
                    >
                      Overall Discount
                    </div>

                    {/* Freight Charges Toggle */}
                    <div
                      onClick={() => {
                        const isChecked = !values.showAdditionalCharges;
                        setFieldValue('showAdditionalCharges', isChecked);
                        if (!isChecked) setFieldValue('additionalCharges', 0);
                      }}
                      className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-full transition select-none flex items-center justify-center border ${
                        values.showAdditionalCharges
                          ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800'
                          : 'bg-white text-slate-500 border-stroke dark:bg-boxdark dark:text-slate-400 dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4'
                      }`}
                    >
                      Freight Charges
                    </div>

                    {/* Return / Exchange Toggle Pill */}
                    <div
                      onClick={() => {
                        const isChecked = !values.showReturnSection;
                        setFieldValue('showReturnSection', isChecked);
                        const defaultReturnWh = values.dispatchWarehouse || warehousesList.find((w: string) => /fateh/i.test(w) || /a[-_ ]?39/i.test(w)) || warehousesList[0] || '';
                        if (!isChecked) {
                          setFieldValue('returnItems', []);
                        } else if ((values.returnItems || []).length === 0) {
                          setFieldValue('returnItems', [{
                            itemName: '',
                            skuCode: '',
                            warehouse: defaultReturnWh,
                            qty: 1,
                            rp: 0,
                            amount: 0
                          }]);
                        }
                      }}
                      className={`cursor-pointer px-3 py-1.5 text-xs font-bold rounded-full transition select-none flex items-center justify-center border ${
                        values.showReturnSection
                          ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800'
                          : 'bg-white text-slate-500 border-stroke dark:bg-boxdark dark:text-slate-400 dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4'
                      }`}
                    >
                      Return
                    </div>
                  </div>

                  {values.applyFbrTax && (
                    <div className="w-full sm:w-auto">
                      <select
                        name="taxScenario"
                        value={values.taxScenario}
                        onChange={handleChange}
                        className="w-full sm:w-auto text-xs font-bold bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded p-1.5 outline-none text-black dark:text-white"
                      >
                        <option value="Goods at Standard Rate to Registered Buyers">Standard Rate to Registered Buyers (18% GST)</option>
                        <option value="Goods at Standard Rate to Unregistered Buyers">Standard Rate to Unregistered Buyers (18% GST + 4% F.Tax)</option>
                        <option value="Reduced Rate Sale">Custom / Reduced Rate Sale</option>
                        <option value="Sale of 3rd Schedule Goods">3rd Schedule Goods (18% Retail GST)</option>
                        <option value="Goods Sold that are Listed in SRO 297(1)/2023">SRO 297(1)/2023 (25% GST)</option>
                        <option value="Exempt Goods Sale">Exempt Goods Sale (0% Tax)</option>
                        <option value="Zero Rated Sale">Zero Rated Sale (0% Tax)</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="border border-stroke dark:border-strokedark rounded-sm mt-4 relative z-30 overflow-visible pb-4">
                  <FieldArray name="items">
                    {({ push, remove }) => {
                      const showDiscount = values.showDiscount;
                      return (
                        <div className="w-full min-w-[900px]">
                          <table className="w-full table-auto border-collapse text-left">
                            <thead className="bg-gray-100 dark:bg-meta-4 text-[10px] font-black uppercase text-black dark:text-white border-b">
                              <tr>
                                <th className="p-2 w-8 text-center">S#</th>
                                <th className="p-2 min-w-[260px]">Product (Name / Code)</th>
                                <th className="p-2 w-32 text-center bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold">Available Stock</th>
                                <th className="p-2 w-48 text-center">Qty (UOM)</th>
                                <th className="p-2 w-28 text-right">Sale Price</th>
                                {showDiscount && (
                                  <>
                                    <th className="p-2 w-24 text-center bg-amber-50/80 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">Discount %</th>
                                    <th className="p-2 w-32 text-right bg-amber-50/80 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">Discount Amt</th>
                                  </>
                                )}
                                {values.applyFbrTax && (
                                  <>
                                    <th className="p-2 w-16 text-center">GST %</th>
                                    <th className="p-2 w-16 text-center">F.Tax %</th>
                                    <th className="p-2 w-24 text-right">GST Amt</th>
                                    <th className="p-2 w-24 text-right">F.Tax Amt</th>
                                  </>
                                )}
                                <th className="p-2 w-36 text-right pr-4">Net Total Line</th>
                                <th className="p-2 w-8 text-center"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {values.items.map((item: any, idx: number) => {
                                const lineCalc = calculateLineTotals(item, values.taxScenario, values.applyFbrTax);
                                const hasItemError = hasAttempted && errors.items && (errors.items as any)[idx]?.itemName;
                                const isCurrentActive = activeSkuIndex === idx;
                                const isCurrentProdNameActive = activeProdNameIndex === idx;

                                const selectedProd = productsList.find(p => p.product_name === item.itemName || (item.skuCode && (p.item_sr_no === item.skuCode || `SKU-${p.id}` === item.skuCode)));
                                const isTile = false;
                                const pcsPerBox = 1;
                                const uomName = item.uom || selectedProd?.uom || 'MTR';

                                // Calculate available stock breakdown
                                let effectiveAvailStock = Number(item.availableQty || 0);
                                if (editData && editData.items) {
                                  const oldItems = typeof editData.items === 'string' ? JSON.parse(editData.items || '[]') : (editData.items || []);
                                  const original = oldItems.find((oi: any) => oi.skuCode === item.skuCode && (oi.warehouse || editData.dispatch_warehouse || 'Main Warehouse') === (item.warehouse || values.dispatchWarehouse || 'Main Warehouse'));
                                  if (original) {
                                     effectiveAvailStock += Number(original.qty || 0);
                                  }
                                }

                                // Deduct quantities already allocated to prior rows in this invoice
                                const priorConsumed = values.items.slice(0, idx).reduce((sum: number, prev: any) => {
                                  const prevName = String(prev.itemName || '').trim().toLowerCase();
                                  const currName = String(item.itemName || '').trim().toLowerCase();
                                  const prevSku = String(prev.skuCode || '').trim().toLowerCase();
                                  const currSku = String(item.skuCode || '').trim().toLowerCase();
                                  const prevWh = String(prev.warehouse || values.dispatchWarehouse || 'Main Warehouse').trim().toLowerCase();
                                  const currWh = String(item.warehouse || values.dispatchWarehouse || 'Main Warehouse').trim().toLowerCase();
                                  
                                  const isMatch = (currName && prevName === currName) || (currSku && prevSku === currSku);
                                  if (isMatch && prevWh === currWh) {
                                    return sum + (Number(prev.qty) || 0);
                                  }
                                  return sum;
                                }, 0);

                                const totalAvailStock = Math.max(0, effectiveAvailStock - priorConsumed);
                                const totalPieces = isTile && pcsPerBox > 1 ? Math.round(totalAvailStock * pcsPerBox) : 0;
                                const availBoxes = isTile && pcsPerBox > 1 ? Math.floor(totalPieces / pcsPerBox) : Math.floor(totalAvailStock);
                                const availLoosePcs = isTile && pcsPerBox > 1 ? (totalPieces % pcsPerBox) : 0;

                                return (
                                  <tr key={idx} className={`border-b border-stroke dark:border-strokedark font-mono font-semibold text-black dark:text-white ${isCurrentActive || isCurrentProdNameActive || activeWhIndex === idx ? 'relative z-30' : 'relative z-10'} ${hasItemError ? 'bg-red-50/5' : ''}`}>
                                    <td className="p-2 text-center font-sans text-gray-400">{idx + 1}</td>

                                    {/* Legacy SKU cell kept hidden — code now shows under the product name */}
                                    <td className="hidden sku-container">
                                      {(() => {
                                        const nonTileList = productsList.filter(p => !isTileProduct(p));
                                        const filteredProds = nonTileList.filter(p => {
                                          if (!item.skuCode) return true;
                                          const query = item.skuCode.toLowerCase().trim();
                                          const sku = (p.item_sr_no || `SKU-${p.id}`).toLowerCase();
                                          const name = (p.product_name || '').toLowerCase();
                                          return sku.includes(query) || name.includes(query);
                                        });

                                        return (
                                          <>
                                            <input
                                              type="text"
                                              autoComplete="off"
                                              value={item.skuCode || ''}
                                              onFocus={() => {
                                                setActiveSkuIndex(idx);
                                                setHighlightedSkuIndex(0);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'ArrowDown') {
                                                  e.preventDefault();
                                                  setHighlightedSkuIndex((prev) =>
                                                    prev < filteredProds.length - 1 ? prev + 1 : 0
                                                  );
                                                } else if (e.key === 'ArrowUp') {
                                                  e.preventDefault();
                                                  setHighlightedSkuIndex((prev) =>
                                                    prev > 0 ? prev - 1 : filteredProds.length - 1
                                                  );
                                                } else if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  if (filteredProds.length > 0) {
                                                    const selected = filteredProds[highlightedSkuIndex] || filteredProds[0];
                                                    handleProductSelectionWithWH(selected, idx, values.dispatchWarehouse, setFieldValue, item);
                                                    setActiveSkuIndex(null);
                                                  }
                                                } else if (e.key === 'Tab' || e.key === 'Escape') {
                                                  setActiveSkuIndex(null);
                                                }
                                              }}
                                              onChange={(e) => {
                                                const typed = e.target.value;
                                                setFieldValue(`items.${idx}.skuCode`, typed);
                                                setActiveSkuIndex(idx);
                                                setHighlightedSkuIndex(0);

                                                // Only auto-fill if the user has typed the EXACT FULL Code (e.g. SKU-002)
                                                const matched = productsList.find(
                                                  p => p.item_sr_no && p.item_sr_no.toLowerCase() === typed.trim().toLowerCase()
                                                );
                                                if (matched) {
                                                  handleProductSelectionWithWH(matched, idx, values.dispatchWarehouse, setFieldValue, item);
                                                }
                                              }}
                                              placeholder="Type SKU..."
                                              className="w-full bg-slate-50 dark:bg-slate-800 font-mono font-bold border border-stroke dark:border-strokedark rounded p-2 outline-none text-xs text-primary focus:border-primary uppercase shadow-inner"
                                            />

                                            {/* RICH FULL-WIDTH SKU DROPDOWN (UPPER LAYER ON Z-AXIS) */}
                                            {isCurrentActive && (
                                              <div className="absolute left-2 right-2 top-full mt-1.5 z-[99999] min-w-[320px] max-w-[380px] max-h-[290px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A222C] shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                                                {filteredProds.map((p, pIdx) => {
                                                  const displaySku = p.item_sr_no || `SKU-${p.id}`;
                                                  const isHighlighted = pIdx === highlightedSkuIndex;
                                                  return (
                                                    <div
                                                      key={p.id}
                                                      onMouseEnter={() => setHighlightedSkuIndex(pIdx)}
                                                      onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleProductSelectionWithWH(p, idx, values.dispatchWarehouse, setFieldValue, item);
                                                        setActiveSkuIndex(null);
                                                      }}
                                                      onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleProductSelectionWithWH(p, idx, values.dispatchWarehouse, setFieldValue, item);
                                                        setActiveSkuIndex(null);
                                                      }}
                                                      className={`p-3 cursor-pointer transition flex items-center justify-between group ${isHighlighted
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                                        }`}
                                                    >
                                                      <div className="flex flex-col gap-0.5 text-left">
                                                        <span className="font-mono font-bold text-xs text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                                          {displaySku}
                                                        </span>
                                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-1">
                                                          {p.product_name}
                                                        </span>
                                                      </div>
                                                      <div className="text-right font-mono shrink-0 pl-2 flex flex-col items-end justify-center">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-white">Rs. {Number(p.retail_price || 0).toLocaleString()}</span>
                                                        <span className={`text-[10px] font-bold ${getProductOverallStock(p) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                          {getProductOverallStock(p).toLocaleString()} {p.uom || 'Nos'}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                                {filteredProds.length === 0 && (
                                                  <div className="p-4 text-center text-xs text-slate-400 italic">
                                                    No matching products or SKUs
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </td>

                                    {/* Description & DESCRIPTION (SEARCHABLE TWO-WAY INPUT WITH RICH DROPDOWN) */}
                                    <td className="p-2 relative prod-name-container min-w-[220px] max-w-[320px]">
                                      {(() => {
                                        const normText = (v: any) => String(v || '').toLowerCase().replace(/\s+/g, ' ').trim();
                                        const exactSelected = productsList.some(p => normText(p.product_name) === normText(item.itemName));
                                        const query = exactSelected ? '' : normText(item.itemName);
                                        const nonTileList = productsList.filter(p => !isTileProduct(p));
                                        let filteredByName = query
                                          ? nonTileList.filter(p =>
                                              normText(p.product_name).includes(query) ||
                                              normText(p.item_sr_no).includes(query) ||
                                              normText(p.category).includes(query)
                                            )
                                          : nonTileList.slice();
                                        filteredByName = filteredByName
                                          .slice()
                                          .sort((a, b) =>
                                            (Number(b.current_stock) || 0) - (Number(a.current_stock) || 0) ||
                                            String(a.product_name || '').localeCompare(String(b.product_name || ''))
                                          )
                                          .slice(0, 60);

                                        return (
                                          <div className="relative">
                                            <input
                                              type="text"
                                              autoComplete="off"
                                              value={item.itemName || ''}
                                              onFocus={() => {
                                                setActiveProdNameIndex(idx);
                                                setActiveSkuIndex(null);
                                                setHighlightedProdNameIndex(0);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'ArrowDown') {
                                                  e.preventDefault();
                                                  if (filteredByName.length === 0) return;
                                                  setHighlightedProdNameIndex((prev) => {
                                                    const next = prev < filteredByName.length - 1 ? prev + 1 : 0;
                                                    queueProductScroll(next);
                                                    return next;
                                                  });
                                                } else if (e.key === 'ArrowUp') {
                                                  e.preventDefault();
                                                  if (filteredByName.length === 0) return;
                                                  setHighlightedProdNameIndex((prev) => {
                                                    const next = prev > 0 ? prev - 1 : filteredByName.length - 1;
                                                    queueProductScroll(next);
                                                    return next;
                                                  });
                                                } else if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  if (filteredByName.length > 0) {
                                                    const selected = filteredByName[highlightedProdNameIndex] || filteredByName[0];
                                                    handleProductSelectionWithWH(selected, idx, values.dispatchWarehouse, setFieldValue, item);
                                                    setActiveProdNameIndex(null);
                                                  }
                                                } else if (e.key === 'Tab' || e.key === 'Escape') {
                                                  setActiveProdNameIndex(null);
                                                }
                                              }}
                                              onChange={(e) => {
                                                const typed = e.target.value;
                                                setFieldValue(`items.${idx}.itemName`, typed);
                                                setFieldValue(`items.${idx}.skuCode`, '');
                                                setActiveProdNameIndex(idx);
                                                setHighlightedProdNameIndex(0);

                                                // Exact Description match auto-sync
                                                const matched = productsList.find(
                                                  p => p.product_name && p.product_name.toLowerCase() === typed.trim().toLowerCase()
                                                );
                                                if (matched) {
                                                  handleProductSelectionWithWH(matched, idx, values.dispatchWarehouse, setFieldValue, item);
                                                }
                                              }}
                                              placeholder="Search Description..."
                                              className="w-full bg-white dark:bg-boxdark font-bold border border-stroke dark:border-strokedark rounded p-2 pr-7 outline-none text-xs text-black dark:text-white focus:border-primary shadow-sm"
                                            />

                                            {Boolean(item.itemName || item.skuCode) && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleProductSelectionWithWH(null, idx, values.dispatchWarehouse, setFieldValue, item);
                                                  setActiveProdNameIndex(null);
                                                }}
                                                className="absolute right-2 top-[17px] -translate-y-1/2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-meta-4 transition-colors z-10"
                                                title="Deselect Product"
                                              >
                                                <FiX className="w-3.5 h-3.5" />
                                              </button>
                                            )}

                                            {selectedProd?.bin && (
                                              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-sans mt-0.5 truncate">
                                                BIN Location: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedProd.bin || 'N/A'}</span> {selectedProd.category ? `• ${selectedProd.category}` : ''}
                                              </div>
                                            )}

                                            {item.skuCode && (
                                              <div className="text-[10px] font-mono font-bold text-primary dark:text-blue-400 mt-0.5 truncate">
                                                Code: {item.skuCode}
                                              </div>
                                            )}

                                            {/* SEARCHABLE PRODUCT DROPDOWN (UPPER LAYER ON Z-AXIS) */}
                                            {isCurrentProdNameActive && (
                                              <div ref={productDropdownScrollRef} className="absolute left-0 top-full mt-1.5 z-[99999] min-w-[340px] max-w-[420px] max-h-[300px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1A222C] shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                                                {filteredByName.map((p, pIdx) => {
                                                  const displaySku = p.item_sr_no || `SKU-${p.id}`;
                                                  const isHighlighted = pIdx === highlightedProdNameIndex;
                                                  return (
                                                    <div
                                                      key={p.id}
                                                      data-opt={pIdx}
                                                      onMouseEnter={() => setHighlightedProdNameIndex(pIdx)}
                                                      onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleProductSelectionWithWH(p, idx, values.dispatchWarehouse, setFieldValue, item);
                                                        setActiveProdNameIndex(null);
                                                      }}
                                                      onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleProductSelectionWithWH(p, idx, values.dispatchWarehouse, setFieldValue, item);
                                                        setActiveProdNameIndex(null);
                                                      }}
                                                      className={`p-3 cursor-pointer transition flex items-center justify-between group ${isHighlighted
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500'
                                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                                        }`}
                                                    >
                                                      <div className="flex flex-col gap-0.5 text-left pr-2">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 leading-tight">
                                                          {p.product_name}
                                                        </span>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                                          <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-bold text-primary">
                                                            {displaySku}
                                                          </span>

                                                          {p.category && <span>• {p.category}</span>}
                                                        </div>
                                                      </div>
                                                      {(() => {
                                                        const totStock = getProductOverallStock(p);
                                                        return (
                                                          <div className="text-right font-mono shrink-0 pl-2 flex flex-col items-end justify-center">
                                                            <span className="text-xs font-bold text-slate-800 dark:text-white">
                                                              Rs. {Number(p.retail_price || 0).toLocaleString()}
                                                            </span>
                                                            <span className={`text-[11px] font-bold ${totStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                              {totStock.toLocaleString()} {p.uom || 'Nos'}
                                                            </span>
                                                          </div>
                                                        );
                                                      })()}
                                                    </div>
                                                  );
                                                })}
                                                {filteredByName.length === 0 && (
                                                  <div className="p-4 text-center text-xs text-slate-400 italic">
                                                    No matching products found
                                                  </div>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                      {hasItemError && <p className="text-red-500 text-[9px] font-bold mt-0.5">Required Field</p>}
                                    </td>

                                    {/* AVAILABLE STOCK */}
                                    <td className="p-2 text-center bg-success/5 text-xs w-[140px]">
                                      <div className="flex flex-col items-center justify-center font-mono">
                                        <span className="font-black text-success text-xs">
                                          {totalAvailStock.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-sans">
                                          {item.uom || selectedProd?.uom || 'MTR'}
                                        </span>
                                      </div>
                                    </td>

                                    {/* QTY (UOM) */}
                                    <td className="p-2 min-w-[140px]">
                                      {(() => {
                                        const u = String(uomName || selectedProd?.uom || 'MTR').trim().toUpperCase();
                                        const isDecimalUom = [
                                          'MTR', 'METER', 'METERS', 'YD', 'YARD', 'YARDS', 'KG', 'LBS',
                                          'LTR', 'FT', 'FEET', 'INCH', 'SQM', 'SQ.M'
                                        ].some(du => u.includes(du));
                                        const isOverStock = Boolean(item.itemName && Number(item.qty || 0) > totalAvailStock);

                                        return (
                                          <div className={`flex items-center gap-1.5 rounded px-2 py-1.5 border transition ${isOverStock ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-400 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-800 border-stroke dark:border-strokedark'}`}>
                                            <input
                                              type="text"
                                              inputMode={isDecimalUom ? "decimal" : "numeric"}
                                              onKeyDown={(e) => {
                                                blockInvalidChar(e);
                                                if (!isDecimalUom && (e.key === '.' || e.key === 'Decimal')) {
                                                  e.preventDefault();
                                                }
                                              }}
                                              name={`items.${idx}.qty`}
                                              value={item.qty === 0 ? '' : item.qty}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const regex = isDecimalUom ? /^\d*\.?\d*$/ : /^\d*$/;
                                                if (val === '' || regex.test(val)) {
                                                  setFieldValue(`items.${idx}.qty`, val);
                                                  const newQty = parseFloat(val) || 0;
                                                  const currentRp = Math.max(0, Number(item.rp) || 0);
                                                  const gross = newQty * currentRp;
                                                  const disPer = Math.max(0, Number(item.discountPer) || 0);
                                                  if (disPer > 0) {
                                                    setFieldValue(`items.${idx}.discountAmt`, Number(((gross * disPer) / 100).toFixed(2)));
                                                  }
                                                }
                                              }}
                                              placeholder="1"
                                              className="w-full bg-transparent text-center font-black text-sm text-primary outline-none"
                                            />
                                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap select-none">
                                              {uomName || selectedProd?.uom || 'MTR'}
                                            </span>
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        min="0"
                                        onKeyDown={blockInvalidChar}
                                        onInput={(e: any) => { if (Number(e.target.value) < 0) e.target.value = 0; }}
                                        name={`items.${idx}.rp`}
                                        value={item.rp}
                                        onChange={(e) => {
                                          const newRp = Math.max(0, Number(e.target.value) || 0);
                                          setFieldValue(`items.${idx}.rp`, newRp);
                                          const currentQty = Math.max(0, Number(item.qty) || 0);
                                          const gross = newRp * currentQty;
                                          const disPer = Math.max(0, Number(item.discountPer) || 0);
                                          if (disPer > 0) {
                                            setFieldValue(`items.${idx}.discountAmt`, Number(((gross * disPer) / 100).toFixed(2)));
                                          }
                                        }}
                                        className={`w-full bg-transparent text-right font-bold outline-none border rounded p-1 ${hasAttempted && (errors.items as any)?.[idx] && (!item.rp || item.rp < 0) ? 'border-red-500 bg-red-50/10' : 'border-transparent'}`}
                                      />
                                      {Number(item.itemServiceCharges) > 0 && (
                                        <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold text-right mt-0.5 whitespace-nowrap">
                                          Svc: Rs.{Number(item.itemServiceCharges).toFixed(0)}
                                        </div>
                                      )}
                                    </td>

                                    {showDiscount && (
                                      <>
                                        <td className="p-2">
                                          <input
                                            type="number"
                                            min="0"
                                            onKeyDown={blockInvalidChar}
                                            onInput={(e: any) => { if (Number(e.target.value) < 0) e.target.value = 0; }}
                                            name={`items.${idx}.discountPer`}
                                            value={item.discountPer ?? 0}
                                            onChange={(e) => {
                                              const val = Math.max(0, Number(e.target.value) || 0);
                                              setFieldValue(`items.${idx}.discountPer`, val);
                                              const gross = Math.max(0, Number(item.qty) || 0) * Math.max(0, Number(item.rp) || 0);
                                              const amt = (gross * val) / 100;
                                              setFieldValue(`items.${idx}.discountAmt`, Number(amt.toFixed(2)));
                                            }}
                                            placeholder="0"
                                            className="w-full bg-amber-50/40 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-center font-black outline-none border border-amber-300 dark:border-amber-700 rounded p-1 text-xs focus:border-amber-500"
                                          />
                                        </td>
                                        <td className="p-2">
                                          <input
                                            type="number"
                                            min="0"
                                            onKeyDown={blockInvalidChar}
                                            onInput={(e: any) => { if (Number(e.target.value) < 0) e.target.value = 0; }}
                                            name={`items.${idx}.discountAmt`}
                                            value={item.discountAmt ?? 0}
                                            onChange={(e) => {
                                              const val = Math.max(0, Number(e.target.value) || 0);
                                              setFieldValue(`items.${idx}.discountAmt`, val);
                                              const gross = Math.max(0, Number(item.qty) || 0) * Math.max(0, Number(item.rp) || 0);
                                              const per = gross > 0 ? (val / gross) * 100 : 0;
                                              setFieldValue(`items.${idx}.discountPer`, Number(per.toFixed(2)));
                                            }}
                                            placeholder="0"
                                            className="w-full bg-amber-50/40 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-right font-black outline-none border border-amber-300 dark:border-amber-700 rounded p-1 text-xs focus:border-amber-500"
                                          />
                                        </td>
                                      </>
                                    )}

                                    {values.applyFbrTax && (
                                      <>
                                        {values.taxScenario === 'Reduced Rate Sale' ? (
                                          <>
                                            <td className="p-2 w-20">
                                              <input
                                                type="number"
                                                min="0"
                                                onKeyDown={blockInvalidChar}
                                                onInput={(e: any) => { if (Number(e.target.value) < 0) e.target.value = 0; }}
                                                name={`items.${idx}.gstRate`}
                                                value={item.gstRate ?? 0}
                                                onChange={(e) => setFieldValue(`items.${idx}.gstRate`, Math.max(0, Number(e.target.value) || 0))}
                                                placeholder="0"
                                                className="w-full bg-emerald-50/40 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 text-center font-black outline-none border border-emerald-300 dark:border-emerald-700 rounded p-1 text-xs focus:border-emerald-500"
                                              />
                                            </td>
                                            <td className="p-2 w-20">
                                              <input
                                                type="number"
                                                min="0"
                                                onKeyDown={blockInvalidChar}
                                                onInput={(e: any) => { if (Number(e.target.value) < 0) e.target.value = 0; }}
                                                name={`items.${idx}.fTaxPer`}
                                                value={item.fTaxPer ?? 0}
                                                onChange={(e) => setFieldValue(`items.${idx}.fTaxPer`, Math.max(0, Number(e.target.value) || 0))}
                                                placeholder="0"
                                                className="w-full bg-emerald-50/40 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 text-center font-black outline-none border border-emerald-300 dark:border-emerald-700 rounded p-1 text-xs focus:border-emerald-500"
                                              />
                                            </td>
                                          </>
                                        ) : (
                                          <>
                                            <td className="p-2 text-center text-gray-400 font-sans">{lineCalc.activeGstRate}%</td>
                                            <td className="p-2 text-center text-gray-400 font-sans">{lineCalc.activeFTaxPer}%</td>
                                          </>
                                        )}
                                        <td className="p-2 text-right pr-2 text-gray-400">Rs. {lineCalc.gstAmt.toFixed(2)}</td>
                                        <td className="p-2 text-right pr-2 text-gray-400">Rs. {lineCalc.fTaxAmt.toFixed(2)}</td>
                                      </>
                                    )}
                                    <td className="p-2 text-right pr-4 text-success font-black">Rs. {lineCalc.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="p-1 w-8 text-center">{values.items.length > 1 && <button type="button" onClick={() => { remove(idx); triggerFeedbackSound('delete', userEmail); }} className="text-gray-400 hover:text-danger cursor-pointer"><FiTrash2 size={14} /></button>}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <div className="p-2 bg-gray-50/10 dark:bg-meta-4/10 border-t border-stroke dark:border-strokedark text-left">
                            <button
                              type="button"
                              onClick={() => push({ itemName: '', skuCode: '', qty: 1, rp: 0, discountPer: 0, discountAmt: 0, gstRate: 0, fTaxPer: 0, amount: 0, availableQty: 0 })}
                              className="text-success font-bold hover:underline cursor-pointer"
                            >
                              + Append Item Row
                            </button>
                          </div>
                        </div>
                      );
                    }}
                  </FieldArray>
                </div>

                {/* --- TILE INVENTORY PRODUCTS DYNAMIC FIELDARRAY --- */}
                {false && (
                  <div className={`border border-teal-400 dark:border-teal-800/80 bg-teal-50/20 dark:bg-teal-950/10 rounded-sm mt-6 relative ${activeTileProdIndex !== null || activeTileWhIndex !== null ? 'z-30' : 'z-20'} overflow-visible pb-4`}>
                    <FieldArray name="tileItems">
                      {({ push, remove }) => {
                        const tileTotalSum = (values.tileItems || []).reduce((acc: number, t: any) => acc + (Number(t.totalAmount || 0)), 0);
                        const totalBoxesCount = (values.tileItems || []).reduce((acc: number, t: any) => acc + (Number(t.boxQty || 0)), 0);
                        const totalLoosePcsCount = (values.tileItems || []).reduce((acc: number, t: any) => acc + (Number(t.loosePcs || 0)), 0);
                        const totalSqmCount = (values.tileItems || []).reduce((acc: number, t: any) => acc + (Number(t.totalSqm || 0)), 0);

                        return (
                          <div className="w-full min-w-[980px]">
                            <div className="p-3 bg-teal-100/70 dark:bg-teal-900/40 border-b border-teal-300 dark:border-teal-800 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-teal-600 text-white font-mono text-[10px] font-black tracking-wider uppercase">
                                  Tiles
                                </span>
                                <span className="font-bold text-xs text-teal-950 dark:text-teal-200">
                                  Tile Items (Boxes, Loose Pieces & Sq. Mtr Sales)
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs font-mono font-bold text-teal-800 dark:text-teal-300">
                                <span>Boxes: <strong className="font-black text-black dark:text-white">{totalBoxesCount}</strong></span>
                                <span>Pcs: <strong className="font-black text-black dark:text-white">{totalLoosePcsCount}</strong></span>
                                <span>Sq.M Given: <strong className="font-black text-teal-950 dark:text-teal-100 bg-teal-200/80 dark:bg-teal-800/80 px-2 py-0.5 rounded shadow-sm">{totalSqmCount.toFixed(2)} m²</strong></span>
                                <span className="text-teal-950 dark:text-teal-100 font-black text-sm">
                                  Total Tiles: Rs. {tileTotalSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                            <table className="w-full table-auto border-collapse text-left">
                              <thead className="bg-teal-50/80 dark:bg-teal-950/60 text-[10px] font-black uppercase text-teal-950 dark:text-teal-300 border-b border-teal-200 dark:border-teal-800">
                                <tr>
                                  <th className="p-2 w-8 text-center">S#</th>
                                  <th className="p-2 min-w-[240px]">Product (NAME / CODE)</th>
                                  <th className="p-2 w-44">Warehouse ZONE SOURCE</th>
                                  <th className="p-2 w-32 text-center text-teal-800 dark:text-teal-400">Stock in Warehouse</th>
                                  <th className="p-2 w-24 text-center">QTY (Box)</th>
                                  <th className="p-2 w-24 text-center">Pcs (Loose)</th>
                                  <th className="p-2 w-28 text-right">Sale Price (Per Box)</th>
                                  <th className="p-2 w-28 text-right">Sale Price (Per Sq. Mtr)</th>
                                  <th className="p-2 w-28 text-right">Sale Price (Per Piece)</th>
                                  <th className="p-2 w-32 text-right pr-3 font-mono">Net Total</th>
                                  <th className="p-2 w-8 text-center"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(values.tileItems || []).map((tItem: any, tIdx: number) => {
                                  const isCurrentProdActive = activeTileProdIndex === tIdx;
                                  const isCurrentWhActive = activeTileWhIndex === tIdx;
                                  const pcsPerBox = Math.max(1, Number(tItem.piecesPerBox) || 4);
                                  const sqmPerBox = Math.max(0.01, Number(tItem.sqmPerBox) || 1.44);
                                  const currentStockVal = Number(tItem.availableQty || 0);
                                  const availBoxes = Math.floor(currentStockVal);
                                  const availLoose = Math.round((currentStockVal - availBoxes) * pcsPerBox);
                                  const totalAvailPieces = Math.round(currentStockVal * pcsPerBox);
                                  const totalAvailSqm = Number((currentStockVal * sqmPerBox).toFixed(2));
                                  const itemLineSqm = Number(tItem.totalSqm) > 0
                                    ? Number(tItem.totalSqm)
                                    : Number(((Number(tItem.boxQty || 0) * sqmPerBox) + ((Number(tItem.loosePcs || 0) / pcsPerBox) * sqmPerBox)).toFixed(2));

                                  const tileProducts = productsList.filter(p => isTileProduct(p));
                                  const exactTileSelected = tileProducts.some((p: any) => String(p.product_name || '').toLowerCase().trim() === String(tItem.itemName || '').toLowerCase().trim());
                                  const tileSearch = exactTileSelected ? '' : (tItem.itemName || '').toLowerCase().trim();
                                  const filteredTileProds = tileProducts.filter((p: any) => {
                                    if (!tileSearch) return true;
                                    return (
                                      (p.product_name && p.product_name.toLowerCase().includes(tileSearch)) ||
                                      (p.item_sr_no && p.item_sr_no.toLowerCase().includes(tileSearch)) ||
                                      (`sku-${p.id}`.includes(tileSearch))
                                    );
                                  });

                                  const currentWh = tItem.warehouse !== undefined ? tItem.warehouse : (values.dispatchWarehouse || '');
                                  const exactTileWhSelected = warehousesList.some(w => String(w || '').toLowerCase().trim() === String(currentWh || '').toLowerCase().trim());
                                  const tileWhQuery = exactTileWhSelected ? '' : currentWh.toLowerCase().trim();
                                  let filteredWhs = tileWhQuery
                                    ? warehousesList.filter(w => w.toLowerCase().includes(tileWhQuery))
                                    : warehousesList;
                                  if (filteredWhs.length === 0 && warehousesList.length > 0) {
                                    filteredWhs = warehousesList;
                                  }

                                  return (
                                    <tr key={tItem.id || tIdx} className={`border-b border-teal-100 dark:border-teal-900/40 hover:bg-teal-50/30 ${isCurrentProdActive || isCurrentWhActive ? 'relative z-30' : 'relative z-10'}`}>
                                      <td className="p-2 text-center text-gray-500 font-mono text-xs">{tIdx + 1}</td>

                                      {/* TILE PRODUCT SELECTOR */}
                                      <td className="p-2 relative tile-prod-name-container">
                                        <div className="relative">
                                          <input
                                            type="text"
                                            autoComplete="off"
                                            value={tItem.itemName || ''}
                                            onFocus={() => {
                                              setActiveTileProdIndex(tIdx);
                                              setHighlightedTileProdIndex(0);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                if (filteredTileProds.length === 0) return;
                                                setHighlightedTileProdIndex(prev => prev < filteredTileProds.length - 1 ? prev + 1 : 0);
                                              } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                if (filteredTileProds.length === 0) return;
                                                setHighlightedTileProdIndex(prev => prev > 0 ? prev - 1 : filteredTileProds.length - 1);
                                              } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (filteredTileProds.length > 0) {
                                                  const sel = filteredTileProds[highlightedTileProdIndex] || filteredTileProds[0];
                                                  handleTileProductSelection(sel, tIdx, values.dispatchWarehouse, setFieldValue, tItem);
                                                  setActiveTileProdIndex(null);
                                                }
                                              } else if (e.key === 'Tab' || e.key === 'Escape') {
                                                setActiveTileProdIndex(null);
                                              }
                                            }}
                                            onChange={(e) => {
                                              const typed = e.target.value;
                                              setFieldValue(`tileItems.${tIdx}.itemName`, typed);
                                              setActiveTileProdIndex(tIdx);
                                              setHighlightedTileProdIndex(0);

                                              const match = tileProducts.find(p => p.product_name && p.product_name.toLowerCase() === typed.trim().toLowerCase());
                                              if (match) {
                                                handleTileProductSelection(match, tIdx, values.dispatchWarehouse, setFieldValue, tItem);
                                              }
                                            }}
                                            placeholder="Search tile product..."
                                            className="w-full bg-white dark:bg-boxdark font-bold border border-teal-300 dark:border-teal-800 rounded p-2 pr-7 outline-none text-xs text-black dark:text-white focus:border-teal-500 shadow-sm"
                                          />

                                          {Boolean(tItem.itemName || tItem.skuCode) && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleTileProductSelection(null, tIdx, values.dispatchWarehouse, setFieldValue, tItem);
                                                setActiveTileProdIndex(null);
                                              }}
                                              className="absolute right-2 top-[17px] -translate-y-1/2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-meta-4 transition-colors z-10"
                                              title="Deselect Tile Product"
                                            >
                                              <FiX className="w-3.5 h-3.5" />
                                            </button>
                                          )}

                                          {tItem.skuCode && (
                                            <div className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400 mt-0.5 truncate">
                                              Code: {tItem.skuCode} • Packing: {pcsPerBox} pcs/box {tItem.sqmPerBox ? `(${tItem.sqmPerBox} m²)` : ''}
                                            </div>
                                          )}

                                          {/* TILE PRODUCT DROPDOWN */}
                                          {isCurrentProdActive && (
                                            <div className="absolute left-0 top-full mt-1.5 z-[99999] min-w-[340px] max-w-[440px] max-h-[260px] overflow-y-auto rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-[#1A222C] shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                                              {filteredTileProds.map((p, pIdx) => {
                                                const displaySku = p.item_sr_no || `SKU-${p.id}`;
                                                const isHighlighted = pIdx === highlightedTileProdIndex;
                                                const pPcsPerBox = Number(p.pieces_per_box || p.pcs_per_box || 4);
                                                return (
                                                  <div
                                                    key={p.id}
                                                    onMouseEnter={() => setHighlightedTileProdIndex(pIdx)}
                                                    onMouseDown={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleTileProductSelection(p, tIdx, values.dispatchWarehouse, setFieldValue, tItem);
                                                      setActiveTileProdIndex(null);
                                                    }}
                                                    className={`p-2.5 cursor-pointer transition flex items-center justify-between ${isHighlighted ? 'bg-teal-50 dark:bg-teal-950/40 border-l-4 border-teal-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'}`}
                                                  >
                                                    <div className="flex flex-col text-left pr-2">
                                                      <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                                        {p.product_name}
                                                      </span>
                                                      <span className="text-[10px] text-slate-500 font-mono">
                                                        {displaySku} {p.sub_sub_category ? `• ${p.sub_sub_category}` : ''} • {pPcsPerBox} pcs/box
                                                      </span>
                                                    </div>
                                                    {(() => {
                                                      const { boxes, loose } = getTileStockBreakdown(p);
                                                      const hasStock = boxes > 0 || loose > 0;
                                                      return (
                                                        <div className="text-right font-mono shrink-0 pl-2 flex flex-col items-end justify-center">
                                                          <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                                                            Rs. {Number(p.retail_price || 0).toLocaleString()} / Box
                                                          </span>
                                                          <span className={`text-[11px] font-bold ${hasStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                            {boxes} Box{boxes !== 1 ? 'es' : ''}
                                                          </span>
                                                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">
                                                            {loose} Pc{loose !== 1 ? 's' : ''}
                                                          </span>
                                                        </div>
                                                      );
                                                    })()}
                                                  </div>
                                                );
                                              })}
                                              {filteredTileProds.length === 0 && (
                                                <div className="p-4 text-center text-xs text-slate-400 italic">No tile products found (Parent Category: Tile)</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* TILE WAREHOUSE SELECTOR */}
                                      <td className="p-2 w-44 relative tile-wh-container">
                                        <div className="relative">
                                          <input
                                            type="text"
                                            autoComplete="off"
                                            value={currentWh}
                                            onFocus={() => {
                                              setActiveTileWhIndex(tIdx);
                                              setHighlightedTileWhIndex(0);
                                            }}
                                            onClick={() => {
                                              setActiveTileWhIndex(tIdx);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                if (filteredWhs.length === 0) return;
                                                setHighlightedTileWhIndex(prev => prev < filteredWhs.length - 1 ? prev + 1 : 0);
                                              } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                if (filteredWhs.length === 0) return;
                                                setHighlightedTileWhIndex(prev => prev > 0 ? prev - 1 : filteredWhs.length - 1);
                                              } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (filteredWhs[highlightedTileWhIndex]) {
                                                  const selWh = filteredWhs[highlightedTileWhIndex];
                                                  setFieldValue(`tileItems.${tIdx}.warehouse`, selWh);
                                                  if (tItem.itemName) {
                                                    fetchStockForWarehouse(tItem.itemName, selWh).then(avail => {
                                                      setFieldValue(`tileItems.${tIdx}.availableQty`, avail);
                                                    });
                                                  }
                                                  setActiveTileWhIndex(null);
                                                }
                                              } else if (e.key === 'Escape' || e.key === 'Tab') {
                                                setActiveTileWhIndex(null);
                                              }
                                            }}
                                            onChange={(e) => {
                                              const newWh = e.target.value;
                                              setFieldValue(`tileItems.${tIdx}.warehouse`, newWh);
                                              setActiveTileWhIndex(tIdx);
                                              setHighlightedTileWhIndex(0);
                                            }}
                                            placeholder={`Default (${values.dispatchWarehouse || 'None'})`}
                                            className="w-full bg-white dark:bg-boxdark border border-teal-300 dark:border-teal-800 rounded p-1.5 pr-6 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-teal-500 shadow-sm"
                                          />

                                          {Boolean(currentWh) && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setFieldValue(`tileItems.${tIdx}.warehouse`, '');
                                                if (tItem.itemName) {
                                                  fetchStockForWarehouse(tItem.itemName, values.dispatchWarehouse || '').then(avail => {
                                                    setFieldValue(`tileItems.${tIdx}.availableQty`, avail);
                                                  });
                                                }
                                                setActiveTileWhIndex(null);
                                              }}
                                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-meta-4 transition-colors z-10"
                                              title="Deselect Warehouse"
                                            >
                                              <FiX className="w-3 h-3" />
                                            </button>
                                          )}

                                          {isCurrentWhActive && filteredWhs.length > 0 && (
                                            <div className="absolute left-0 min-w-[250px] max-w-[320px] top-full mt-1 z-[99999] max-h-[180px] overflow-y-auto rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-[#1A222C] shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                                              {filteredWhs.map((wh, wIdx) => {
                                                const pcsPerBox = Math.max(1, Number(tItem.piecesPerBox) || 4);
                                                const whStock = tItem.itemName ? getItemWarehouseStock(tItem.itemName, wh) : null;
                                                const whBoxes = whStock !== null ? Math.floor(whStock) : 0;
                                                const whLoose = whStock !== null ? Math.round((whStock - whBoxes) * pcsPerBox) : 0;
                                                const hasStock = whStock !== null && whStock > 0;
                                                return (
                                                  <div
                                                    key={wh}
                                                    onMouseEnter={() => setHighlightedTileWhIndex(wIdx)}
                                                    onMouseDown={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setFieldValue(`tileItems.${tIdx}.warehouse`, wh);
                                                      if (tItem.itemName) {
                                                        fetchStockForWarehouse(tItem.itemName, wh).then(avail => {
                                                          setFieldValue(`tileItems.${tIdx}.availableQty`, avail);
                                                        });
                                                      }
                                                      setActiveTileWhIndex(null);
                                                    }}
                                                    className={`p-2.5 cursor-pointer transition text-xs font-bold flex items-center justify-between gap-2 ${wIdx === highlightedTileWhIndex ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-l-4 border-teal-500' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80'}`}
                                                  >
                                                    <span className="truncate">{wh}</span>
                                                    {tItem.itemName && (
                                                      <div className="text-right font-mono shrink-0 pl-2 flex flex-col items-end leading-none">
                                                        <span className={`text-[11px] font-bold ${hasStock ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                          {whBoxes} Box{whBoxes !== 1 ? 'es' : ''}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                                          {whLoose} Pc{whLoose !== 1 ? 's' : ''}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* STOCK IN WAREHOUSE */}
                                      <td className="p-2 w-32 text-center">
                                        <div className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                          {availBoxes} Boxes{availLoose > 0 ? ` + ${availLoose} Pcs` : ''}
                                        </div>
                                        <div className="text-[10px] text-teal-700 dark:text-teal-300 font-mono font-bold">
                                          {totalAvailSqm.toFixed(2)} m²
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-mono">
                                          ({totalAvailPieces} Total Pcs)
                                        </div>
                                      </td>

                                      {/* QTY (BOX) */}
                                      <td className="p-2 w-24 text-center">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={tItem.boxQty ?? 0}
                                          onKeyDown={blockInvalidChar}
                                          onChange={(e) => {
                                            handleTileItemChange(tIdx, 'boxQty', e.target.value, values.tileItems, setFieldValue);
                                          }}
                                          className="w-full text-center bg-white dark:bg-boxdark border border-teal-300 dark:border-teal-800 rounded p-1.5 text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-teal-500"
                                        />
                                      </td>

                                      {/* PCS (LOOSE) - AUTO ROLLS UP TO BOX IF >= PIECES PER BOX */}
                                      <td className="p-2 w-24 text-center">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={tItem.loosePcs ?? 0}
                                          onKeyDown={blockInvalidChar}
                                          onChange={(e) => {
                                            handleTileItemChange(tIdx, 'loosePcs', e.target.value, values.tileItems, setFieldValue);
                                          }}
                                          className="w-full text-center bg-white dark:bg-boxdark border border-teal-300 dark:border-teal-800 rounded p-1.5 text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-teal-500"
                                        />
                                      </td>

                                      {/* SALE PRICE (PER BOX) */}
                                      <td className="p-2 w-28 text-right">
                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={tItem.pricePerBox ?? 0}
                                          onKeyDown={blockInvalidChar}
                                          onChange={(e) => {
                                            handleTileItemChange(tIdx, 'pricePerBox', e.target.value, values.tileItems, setFieldValue);
                                          }}
                                          className="w-full text-right bg-white dark:bg-boxdark border border-teal-300 dark:border-teal-800 rounded p-1.5 text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-teal-500"
                                        />
                                      </td>

                                      {/* SALE PRICE (PER SQ. MTR) */}
                                      <td className="p-2 w-28 text-right">
                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={tItem.pricePerSqm ?? 0}
                                          onKeyDown={blockInvalidChar}
                                          onChange={(e) => {
                                            handleTileItemChange(tIdx, 'pricePerSqm', e.target.value, values.tileItems, setFieldValue);
                                          }}
                                          className="w-full text-right bg-white dark:bg-boxdark border border-teal-300 dark:border-teal-800 rounded p-1.5 text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-teal-500"
                                        />
                                        <div className="mt-1 text-right font-mono">
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-1.5 py-0.5 rounded border border-teal-200/80 dark:border-teal-800/60" title="Total Sq. Mtr being given for this item">
                                            <span className="text-[9px] text-teal-600 dark:text-teal-400 font-medium">Sq.M:</span>
                                            <strong className="text-teal-950 dark:text-teal-100 font-black">{itemLineSqm.toFixed(2)} m²</strong>
                                          </span>
                                        </div>
                                      </td>

                                      {/* SALE PRICE (PER PIECE) */}
                                      <td className="p-2 w-28 text-right">
                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={tItem.pricePerPiece ?? 0}
                                          onKeyDown={blockInvalidChar}
                                          onChange={(e) => {
                                            handleTileItemChange(tIdx, 'pricePerPiece', e.target.value, values.tileItems, setFieldValue);
                                          }}
                                          className="w-full text-right bg-white dark:bg-boxdark border border-teal-300 dark:border-teal-800 rounded p-1.5 text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-teal-500"
                                        />
                                      </td>

                                      {/* NET TOTAL */}
                                      <td className="p-2 w-32 text-right pr-3 font-mono font-black text-xs text-teal-800 dark:text-teal-300">
                                        Rs. {Number(tItem.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </td>

                                      {/* DELETE ROW */}
                                      <td className="p-2 w-8 text-center">
                                        <button
                                          type="button"
                                          onClick={() => remove(tIdx)}
                                          className="text-slate-400 hover:text-red-600 transition p-1"
                                          title="Remove tile item"
                                        >
                                          <FiTrash2 size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            <div className="p-2 bg-teal-50/50 dark:bg-teal-950/20 border-t border-teal-200 dark:border-teal-900/50 text-left">
                              <button
                                type="button"
                                onClick={() => push({
                                  id: Date.now(),
                                  itemName: '',
                                  skuCode: '',
                                  warehouse: values.dispatchWarehouse || '',
                                  availableQty: 0,
                                  boxQty: 1,
                                  loosePcs: 0,
                                  piecesPerBox: 4,
                                  sqmPerBox: 1.44,
                                  pricePerBox: 0,
                                  pricePerSqm: 0,
                                  pricePerPiece: 0,
                                  totalAmount: 0,
                                  totalSqm: 1.44,
                                  isTileItem: true
                                })}
                                className="text-teal-700 dark:text-teal-400 font-bold hover:underline cursor-pointer text-xs"
                              >
                                + Append Tile Item Row
                              </button>
                            </div>
                          </div>
                        );
                      }}
                    </FieldArray>
                  </div>
                )}

                {/* --- RETURN / EXCHANGE PRODUCTS DYNAMIC FIELDARRAY --- */}
                {values.showReturnSection && (
                  <div className={`border border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 rounded-sm mt-6 relative ${activeReturnProdIndex !== null || activeReturnWhIndex !== null ? 'z-30' : 'z-10'} overflow-visible pb-4`}>
                    <FieldArray name="returnItems">
                      {({ push, remove }) => {
                        return (
                          <div className="w-full min-w-[800px]">
                            <div className="p-3 bg-rose-100/60 dark:bg-rose-900/30 border-b border-rose-200 dark:border-rose-800 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono text-[10px] font-black tracking-wider uppercase">
                                  Return / Exchange
                                </span>
                                <span className="font-bold text-xs text-rose-900 dark:text-rose-200">
                                  Returned Items (Credit Subtracted From This Invoice)
                                </span>
                              </div>
                              <div className="text-xs font-mono font-black text-rose-700 dark:text-rose-300">
                                Total Return Credit: Rs. {returnTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            <table className="w-full table-auto border-collapse text-left">
                              <thead className="bg-rose-50/70 dark:bg-rose-950/40 text-[10px] font-black uppercase text-rose-900 dark:text-rose-300 border-b border-rose-200 dark:border-rose-800">
                                <tr>
                                  <th className="p-2 w-8 text-center">S#</th>
                                  <th className="p-2 min-w-[240px]">Returned Product (Name / Code)</th>
                                  <th className="p-2 w-32 text-center">Return Qty</th>
                                  <th className="p-2 w-32 text-right">Return Rate (RP)</th>
                                  <th className="p-2 w-36 text-right pr-4">Line Credit Total</th>
                                  <th className="p-2 w-14 text-center"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(values.returnItems || []).map((rItem: any, rIdx: number) => {
                                  const isCurrentProdActive = activeReturnProdIndex === rIdx;
                                  const isCurrentWhActive = activeReturnWhIndex === rIdx;
                                  const lineTotal = Number(rItem.qty || 0) * Number(rItem.rp ?? rItem.rate ?? 0);

                                  const exactReturnSelected = productsList.some((p: any) => !isTileProduct(p) && String(p.product_name || '').toLowerCase().trim() === String(rItem.itemName || '').toLowerCase().trim());
                                  const returnSearch = exactReturnSelected ? '' : (rItem.itemName || '').toLowerCase().trim();
                                  const filteredProducts = productsList.filter((p: any) => {
                                    if (isTileProduct(p)) return false;
                                    if (!returnSearch) return true;
                                    return (
                                      (p.product_name && p.product_name.toLowerCase().includes(returnSearch)) ||
                                      (p.item_sr_no && p.item_sr_no.toLowerCase().includes(returnSearch)) ||
                                      (`sku-${p.id}`.includes(returnSearch))
                                    );
                                  });

                                  const currentWh = rItem.warehouse !== undefined ? rItem.warehouse : (values.dispatchWarehouse || '');
                                  const exactReturnWhSelected = warehousesList.some(w => String(w || '').toLowerCase().trim() === String(currentWh || '').toLowerCase().trim());
                                  const returnWhQuery = exactReturnWhSelected ? '' : currentWh.toLowerCase().trim();
                                  let filteredWhs = returnWhQuery
                                    ? warehousesList.filter(w => w.toLowerCase().includes(returnWhQuery))
                                    : warehousesList;
                                  if (filteredWhs.length === 0 && warehousesList.length > 0) {
                                    filteredWhs = warehousesList;
                                  }

                                  return (
                                    <tr key={rIdx} className={`border-b border-rose-100 dark:border-rose-900/30 hover:bg-rose-50/30 ${isCurrentProdActive || isCurrentWhActive ? 'relative z-30' : 'relative z-10'}`}>
                                      <td className="p-2 text-center text-gray-500 font-mono text-xs">{rIdx + 1}</td>
                                      
                                      {/* RETURN PRODUCT SELECTOR */}
                                      <td className="p-2 relative return-prod-name-container">
                                        <div className="relative">
                                          <input
                                            type="text"
                                            autoComplete="off"
                                            value={rItem.itemName || ''}
                                            onFocus={() => {
                                              setActiveReturnProdIndex(rIdx);
                                              setHighlightedReturnProdIndex(0);
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                if (filteredProducts.length === 0) return;
                                                setHighlightedReturnProdIndex(prev => prev < filteredProducts.length - 1 ? prev + 1 : 0);
                                              } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                if (filteredProducts.length === 0) return;
                                                setHighlightedReturnProdIndex(prev => prev > 0 ? prev - 1 : filteredProducts.length - 1);
                                              } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (filteredProducts.length > 0) {
                                                  const sel = filteredProducts[highlightedReturnProdIndex] || filteredProducts[0];
                                                  setFieldValue(`returnItems.${rIdx}.itemName`, sel.product_name);
                                                  setFieldValue(`returnItems.${rIdx}.skuCode`, sel.item_sr_no || `SKU-${sel.id}`);
                                                  setFieldValue(`returnItems.${rIdx}.rp`, Number(sel.retail_price || 0));
                                                  setFieldValue(`returnItems.${rIdx}.uom`, sel.uom || 'Nos');
                                                  setActiveReturnProdIndex(null);
                                                }
                                              } else if (e.key === 'Tab' || e.key === 'Escape') {
                                                setActiveReturnProdIndex(null);
                                              }
                                            }}
                                            onChange={(e) => {
                                              const typed = e.target.value;
                                              setFieldValue(`returnItems.${rIdx}.itemName`, typed);
                                              setActiveReturnProdIndex(rIdx);
                                              setHighlightedReturnProdIndex(0);

                                              const match = productsList.find(p => p.product_name && p.product_name.toLowerCase() === typed.trim().toLowerCase());
                                              if (match) {
                                                setFieldValue(`returnItems.${rIdx}.skuCode`, match.item_sr_no || `SKU-${match.id}`);
                                                setFieldValue(`returnItems.${rIdx}.rp`, Number(match.retail_price || 0));
                                                setFieldValue(`returnItems.${rIdx}.uom`, match.uom || 'Nos');
                                              }
                                            }}
                                            placeholder="Search product to return..."
                                            className="w-full bg-white dark:bg-boxdark font-bold border border-rose-200 dark:border-rose-900 rounded p-2 pr-7 outline-none text-xs text-black dark:text-white focus:border-rose-500 shadow-sm"
                                          />

                                          {Boolean(rItem.itemName || rItem.skuCode) && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setFieldValue(`returnItems.${rIdx}.itemName`, '');
                                                setFieldValue(`returnItems.${rIdx}.skuCode`, '');
                                                setFieldValue(`returnItems.${rIdx}.rp`, 0);
                                                setFieldValue(`returnItems.${rIdx}.amount`, 0);
                                                setActiveReturnProdIndex(null);
                                              }}
                                              className="absolute right-2 top-[17px] -translate-y-1/2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-meta-4 transition-colors z-10"
                                              title="Deselect Return Product"
                                            >
                                              <FiX className="w-3.5 h-3.5" />
                                            </button>
                                          )}

                                          {rItem.skuCode && (
                                            <div className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5 truncate">
                                              Code: {rItem.skuCode}
                                            </div>
                                          )}

                                          {/* PRODUCT DROPDOWN */}
                                          {isCurrentProdActive && (
                                            <div className="absolute left-0 top-full mt-1.5 z-[99999] min-w-[340px] max-w-[420px] max-h-[260px] overflow-y-auto rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-[#1A222C] shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                                              {filteredProducts.map((p, pIdx) => {
                                                const displaySku = p.item_sr_no || `SKU-${p.id}`;
                                                const isHighlighted = pIdx === highlightedReturnProdIndex;
                                                return (
                                                  <div
                                                    key={p.id}
                                                    onMouseEnter={() => setHighlightedReturnProdIndex(pIdx)}
                                                    onMouseDown={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setFieldValue(`returnItems.${rIdx}.itemName`, p.product_name);
                                                      setFieldValue(`returnItems.${rIdx}.skuCode`, displaySku);
                                                      setFieldValue(`returnItems.${rIdx}.rp`, Number(p.retail_price || 0));
                                                      setFieldValue(`returnItems.${rIdx}.uom`, p.uom || 'Nos');
                                                      setActiveReturnProdIndex(null);
                                                    }}
                                                    className={`p-2.5 cursor-pointer transition flex items-center justify-between ${isHighlighted ? 'bg-rose-50 dark:bg-rose-950/40 border-l-4 border-rose-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'}`}
                                                  >
                                                    <div className="flex flex-col text-left pr-2">
                                                      <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                                        {p.product_name}
                                                      </span>
                                                      <span className="text-[10px] text-slate-500 font-mono">
                                                        {displaySku} {p.category ? `• ${p.category}` : ''}
                                                      </span>
                                                    </div>
                                                    {(() => {
                                                      const isTile = isTileProduct(p);
                                                      if (isTile) {
                                                        const { boxes, loose } = getTileStockBreakdown(p);
                                                        const hasStock = boxes > 0 || loose > 0;
                                                        return (
                                                          <div className="text-right font-mono shrink-0 pl-2 flex flex-col items-end justify-center">
                                                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                                              Rs. {Number(p.retail_price || 0).toLocaleString()}
                                                            </span>
                                                            <span className={`text-[11px] font-bold ${hasStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                              {boxes} Box{boxes !== 1 ? 'es' : ''}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">
                                                              {loose} Pc{loose !== 1 ? 's' : ''}
                                                            </span>
                                                          </div>
                                                        );
                                                      }
                                                      const totStock = getProductOverallStock(p);
                                                      return (
                                                        <div className="text-right font-mono shrink-0 pl-2 flex flex-col items-end justify-center">
                                                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                                                            Rs. {Number(p.retail_price || 0).toLocaleString()}
                                                          </span>
                                                          <span className={`text-[10px] font-bold ${totStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                            {totStock.toLocaleString()} {p.uom || 'Nos'}
                                                          </span>
                                                        </div>
                                                      );
                                                    })()}
                                                  </div>
                                                );
                                              })}
                                              {filteredProducts.length === 0 && (
                                                <div className="p-4 text-center text-xs text-slate-400 italic">No products found</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </td>


                                      {/* RETURN QTY */}
                                      <td className="p-2 w-32">
                                        <input
                                          type="number"
                                          min="1"
                                          onKeyDown={blockInvalidChar}
                                          value={rItem.qty === 0 ? '' : rItem.qty}
                                          onChange={(e) => {
                                            const val = e.target.value.trim();
                                            const num = val === '' ? 0 : Math.max(0, Number(val) || 0);
                                            setFieldValue(`returnItems.${rIdx}.qty`, num);
                                          }}
                                          placeholder="1"
                                          className="w-full bg-white dark:bg-boxdark font-black text-xs text-center border border-rose-200 dark:border-rose-900 rounded p-1.5 outline-none focus:border-rose-500 shadow-sm text-black dark:text-white"
                                        />
                                      </td>

                                      {/* RETURN RATE / RP */}
                                      <td className="p-2 w-32">
                                        <input
                                          type="number"
                                          min="0"
                                          onKeyDown={blockInvalidChar}
                                          value={rItem.rp === 0 ? '' : rItem.rp}
                                          onChange={(e) => {
                                            const val = e.target.value.trim();
                                            const num = val === '' ? 0 : Math.max(0, Number(val) || 0);
                                            setFieldValue(`returnItems.${rIdx}.rp`, num);
                                          }}
                                          placeholder="0"
                                          className="w-full bg-white dark:bg-boxdark font-black text-xs text-right border border-rose-200 dark:border-rose-900 rounded p-1.5 outline-none focus:border-rose-500 shadow-sm text-black dark:text-white"
                                        />
                                      </td>

                                      {/* LINE CREDIT TOTAL */}
                                      <td className="p-2 text-right pr-4 text-rose-600 dark:text-rose-400 font-black font-mono">
                                        - Rs. {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </td>

                                      {/* ACTION */}
                                      <td className="p-1 w-14 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          
                                          <button
                                            type="button"
                                            onClick={() => { remove(rIdx); triggerFeedbackSound('delete', userEmail); }}
                                            className="text-gray-400 hover:text-danger cursor-pointer p-0.5"
                                            title="Remove Return Item"
                                          >
                                            <FiTrash2 size={13} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            <div className="p-2 bg-rose-50/40 dark:bg-rose-950/20 border-t border-rose-200 dark:border-rose-900/50 text-left">
                              <button
                                type="button"
                                onClick={() => push({ itemName: '', skuCode: '', warehouse: values.dispatchWarehouse || '', qty: 1, rp: 0, amount: 0 })}
                                className="text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer text-xs"
                              >
                                + Append Returned Item Row
                              </button>
                            </div>
                          </div>
                        );
                      }}
                    </FieldArray>
                  </div>
                )}

                {/* --- RETURN TILE PRODUCTS DYNAMIC FIELDARRAY --- */}
                {false && (
                  <div className={`border border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 rounded-sm mt-6 relative ${activeTileReturnProdIndex !== null || activeTileReturnWhIndex !== null ? 'z-30' : 'z-10'} overflow-visible pb-4`}>
                    <FieldArray name="tileReturnItems">
                      {({ push, remove }) => {
                        return (
                          <div className="w-full min-w-[800px]">
                            <div className="p-3 bg-amber-100/60 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono text-[10px] font-black tracking-wider uppercase">
                                  Return Tile
                                </span>
                                <span className="font-bold text-xs text-amber-900 dark:text-amber-200">
                                  Returned Tile Items (Credit Subtracted From This Invoice)
                                </span>
                              </div>
                              <div className="text-xs font-mono font-black text-amber-700 dark:text-amber-300">
                                Total Tile Return Credit: Rs. {tileReturnTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                            </div>

                            <table className="w-full table-auto border-collapse text-left">
                              <thead className="bg-amber-50/70 dark:bg-amber-950/40 text-[10px] font-black uppercase text-amber-900 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800">
                                <tr>
                                  <th className="p-2 w-8 text-center">S#</th>
                                  <th className="p-2 min-w-[240px]">Returned Tile Product (Name / Sku)</th>
                                  <th className="p-2 w-44">Return Warehouse Zone</th>
                                  <th className="p-2 w-32 text-center">Sold Qty</th>
                                  <th className="p-2 w-24 text-center">Return (Box)</th>
                                  <th className="p-2 w-24 text-center">Return Pcs</th>
                                  <th className="p-2 w-28 text-right">RP / Box</th>
                                  <th className="p-2 w-28 text-right">RP / m²</th>
                                  <th className="p-2 w-28 text-right">RP / Piece</th>
                                  <th className="p-2 w-32 text-right pr-3">Line Credit Total</th>
                                  <th className="p-2 w-8 text-center"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(values.tileReturnItems || []).map((tItem: any, tIdx: number) => {
                                  const isCurrentProdActive = activeTileReturnProdIndex === tIdx;
                                  const isCurrentWhActive = activeTileReturnWhIndex === tIdx;

                                  const exactMatchSelected = productsList.some(
                                    (p: any) => String(p.product_name || '').toLowerCase().trim() === String(tItem.itemName || '').toLowerCase().trim()
                                  );
                                  const currentSearchTerm = exactMatchSelected ? '' : (tItem.itemName || '').toLowerCase().trim();

                                  const filteredProducts = productsList.filter((p: any) => {
                                    if (!isTileProduct(p)) return false;
                                    if (!currentSearchTerm) return true;
                                    return (
                                      (p.product_name && p.product_name.toLowerCase().includes(currentSearchTerm)) ||
                                      (p.item_sr_no && p.item_sr_no.toLowerCase().includes(currentSearchTerm)) ||
                                      (`sku-${p.id}`.includes(currentSearchTerm))
                                    );
                                  });

                                  const currentWh = tItem.warehouse !== undefined ? tItem.warehouse : (values.dispatchWarehouse || '');
                                  const exactWhSelected = warehousesList.some(w => String(w || '').toLowerCase().trim() === String(currentWh || '').toLowerCase().trim());
                                  const whSearchTerm = exactWhSelected ? '' : currentWh.toLowerCase().trim();
                                  let filteredWhs = whSearchTerm 
                                    ? warehousesList.filter(w => String(w || '').toLowerCase().includes(whSearchTerm))
                                    : warehousesList;

                                  if (filteredWhs.length === 0 && currentWh) {
                                    filteredWhs = [currentWh];
                                  }

                                  const ppb = Math.max(1, Number(tItem.piecesPerBox) || 4);
                                  const spb = Number(tItem.sqmPerBox) || 1.44;
                                  const sqmPerPiece = spb / ppb;

                                  const selectedProductObj = productsList.find(
                                    (p: any) => String(p.product_name || '').toLowerCase().trim() === String(tItem.itemName || '').toLowerCase().trim()
                                  );

                                  let availTotalPieces = 0;
                                  if (selectedProductObj) {
                                    const totalUnits = Number(tItem.availableQty ?? selectedProductObj.stock_quantity ?? 0);
                                    availTotalPieces = totalUnits;
                                  }
                                  const availBoxes = Math.floor(availTotalPieces / ppb);
                                  const availLoose = availTotalPieces % ppb;
                                  const totalAvailSqm = availTotalPieces * sqmPerPiece;
                                  const totalAvailPieces = availTotalPieces;

                                  const itemLineTotalPieces = (Number(tItem.boxQty || 0) * ppb) + Number(tItem.loosePcs || 0);
                                  const itemLineSqm = itemLineTotalPieces * sqmPerPiece;

                                  return (
                                    <tr key={tItem.id || tIdx} className="border-b border-amber-100 dark:border-amber-900/40 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-xs">
                                      {/* S# */}
                                      <td className="p-2 text-center font-bold text-amber-700 dark:text-amber-400">
                                        {tIdx + 1}
                                      </td>

                                      {/* PRODUCT SEARCH */}
                                      <td className="p-2 relative">
                                        <div className="relative tile-return-prod-name-container">
                                          <input
                                            type="text"
                                            value={tItem.itemName || ''}
                                            onFocus={() => {
                                              setActiveTileReturnProdIndex(tIdx);
                                              setHighlightedTileReturnProdIndex(0);
                                            }}
                                            onChange={(e) => {
                                              const typed = e.target.value;
                                              setFieldValue(`tileReturnItems.${tIdx}.itemName`, typed);
                                              setActiveTileReturnProdIndex(tIdx);
                                              setHighlightedTileReturnProdIndex(0);
                                              const match = filteredProducts.find((p: any) => p.product_name && p.product_name.toLowerCase() === typed.trim().toLowerCase());
                                              if (match) {
                                                handleTileReturnProductSelection(match, tIdx, values.dispatchWarehouse, setFieldValue, tItem);
                                              }
                                            }}
                                            onKeyDown={(e) => {
                                              if (!isCurrentProdActive) return;
                                              if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                setHighlightedTileReturnProdIndex((prev) =>
                                                  prev < filteredProducts.length - 1 ? prev + 1 : prev
                                                );
                                              } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                setHighlightedTileReturnProdIndex((prev) => (prev > 0 ? prev - 1 : 0));
                                              } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (filteredProducts[highlightedTileReturnProdIndex]) {
                                                  handleTileReturnProductSelection(
                                                    filteredProducts[highlightedTileReturnProdIndex],
                                                    tIdx,
                                                    values.dispatchWarehouse,
                                                    setFieldValue,
                                                    tItem
                                                  );
                                                  setActiveTileReturnProdIndex(null);
                                                }
                                              } else if (e.key === 'Tab' || e.key === 'Escape') {
                                                setActiveTileReturnProdIndex(null);
                                              }
                                            }}
                                            placeholder="Type tile product name..."
                                            className="w-full bg-white dark:bg-boxdark border border-amber-300 dark:border-amber-800 rounded p-1.5 pr-7 text-xs font-bold text-black dark:text-white outline-none focus:border-amber-500"
                                          />
                                          {Boolean(tItem.itemName || tItem.skuCode) && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleTileReturnProductSelection(null, tIdx, values.dispatchWarehouse, setFieldValue, tItem);
                                                setActiveTileReturnProdIndex(null);
                                              }}
                                              className="absolute right-2 top-3 -translate-y-1/2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-meta-4 transition-colors z-10"
                                              title="Clear Return Tile Product"
                                            >
                                              <FiX className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                          {tItem.skuCode && (
                                            <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-0.5 truncate font-bold">
                                              Code: {tItem.skuCode}
                                            </div>
                                          )}

                                          {/* PRODUCT DROPDOWN */}
                                          {isCurrentProdActive && (
                                            <div className="absolute left-0 top-full mt-1.5 z-[99999] min-w-[340px] max-w-[420px] max-h-[260px] overflow-y-auto rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-[#1A222C] shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                                              {filteredProducts.map((p, pIdx) => {
                                                const displaySku = p.item_sr_no || `SKU-${p.id}`;
                                                const isHighlighted = pIdx === highlightedTileReturnProdIndex;
                                                const { boxes, loose } = getTileStockBreakdown(p);
                                                const hasStock = boxes > 0 || loose > 0;
                                                const pSold = customerSoldMap[String(p.product_name || '').toLowerCase().trim()];

                                                return (
                                                  <div
                                                    key={p.id}
                                                    onMouseEnter={() => setHighlightedTileReturnProdIndex(pIdx)}
                                                    onMouseDown={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      handleTileReturnProductSelection(p, tIdx, values.dispatchWarehouse, setFieldValue, tItem);
                                                      setActiveTileReturnProdIndex(null);
                                                    }}
                                                    className={`p-2.5 cursor-pointer transition flex items-center justify-between ${
                                                      isHighlighted ? 'bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                                    }`}
                                                  >
                                                    <div className="flex flex-col text-left pr-2">
                                                      <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                                                        {p.product_name}
                                                      </span>
                                                      <span className="text-[10px] text-slate-500 font-mono">
                                                        {displaySku} {p.category ? `• ${p.category}` : ''}
                                                      </span>
                                                    </div>
                                                    <div className="text-right font-mono shrink-0 pl-2 flex flex-col items-end justify-center">
                                                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                                                        Rs. {Number(p.retail_price || 0).toLocaleString()}
                                                      </span>
                                                      {pSold ? (
                                                        <>
                                                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                            Sold: {pSold.boxes} Box{pSold.boxes !== 1 ? 'es' : ''}
                                                          </span>
                                                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">
                                                            {pSold.loose > 0 ? `+ ${pSold.loose} Pcs` : `${pSold.totalPieces} Pcs`}
                                                          </span>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <span className={`text-[11px] font-bold ${hasStock ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                                                            Stock: {boxes} Box{boxes !== 1 ? 'es' : ''}
                                                          </span>
                                                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">
                                                            {loose} Pcs
                                                          </span>
                                                        </>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* WAREHOUSE SELECTOR */}
                                      <td className="p-2 relative">
                                        <div className="relative tile-return-wh-container">
                                          <input
                                            type="text"
                                            value={currentWh}
                                            onFocus={() => {
                                              setActiveTileReturnWhIndex(tIdx);
                                              setHighlightedTileReturnWhIndex(0);
                                            }}
                                            onChange={(e) => {
                                              const newWh = e.target.value;
                                              setFieldValue(`tileReturnItems.${tIdx}.warehouse`, newWh);
                                              setActiveTileReturnWhIndex(tIdx);
                                              setHighlightedTileReturnWhIndex(0);
                                              if (tItem.itemName) {
                                                fetchStockForWarehouse(tItem.itemName, newWh).then((avail) => {
                                                  setFieldValue(`tileReturnItems.${tIdx}.availableQty`, avail);
                                                });
                                              }
                                            }}
                                            onKeyDown={(e) => {
                                              if (!isCurrentWhActive) return;
                                              if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                setHighlightedTileReturnWhIndex((prev) =>
                                                  prev < filteredWhs.length - 1 ? prev + 1 : prev
                                                );
                                              } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                setHighlightedTileReturnWhIndex((prev) => (prev > 0 ? prev - 1 : 0));
                                              } else if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (filteredWhs[highlightedTileReturnWhIndex]) {
                                                  const chosenWh = filteredWhs[highlightedTileReturnWhIndex];
                                                  setFieldValue(`tileReturnItems.${tIdx}.warehouse`, chosenWh);
                                                  if (tItem.itemName) {
                                                    fetchStockForWarehouse(tItem.itemName, chosenWh).then((avail) => {
                                                      setFieldValue(`tileReturnItems.${tIdx}.availableQty`, avail);
                                                    });
                                                  }
                                                  setActiveTileReturnWhIndex(null);
                                                }
                                              } else if (e.key === 'Escape') {
                                                setActiveTileReturnWhIndex(null);
                                              }
                                            }}
                                            placeholder="Warehouse..."
                                            className="w-full bg-white dark:bg-boxdark border border-amber-300 dark:border-amber-800 rounded p-1.5 text-xs font-bold text-black dark:text-white outline-none focus:border-amber-500"
                                          />

                                          {/* WAREHOUSE DROPDOWN */}
                                          {isCurrentWhActive && (
                                            <div className="absolute left-0 top-full mt-1.5 z-[99999] min-w-[260px] max-w-[320px] max-h-[220px] overflow-y-auto rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-[#1A222C] shadow-2xl divide-y divide-slate-100 dark:divide-slate-800 scrollbar-thin">
                                              {filteredWhs.map((wh, wIdx) => {
                                                const whStock = tItem.itemName ? getItemWarehouseStock(tItem.itemName, wh, tItem.skuCode) : null;
                                                const whBoxes = whStock !== null ? Math.floor(whStock) : 0;
                                                const whLoose = whStock !== null ? Math.round((whStock - whBoxes) * ppb) : 0;
                                                const hasStock = whStock !== null && whStock > 0;

                                                return (
                                                  <div
                                                    key={wh}
                                                    onMouseEnter={() => setHighlightedTileReturnWhIndex(wIdx)}
                                                    onMouseDown={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setFieldValue(`tileReturnItems.${tIdx}.warehouse`, wh);
                                                      if (tItem.itemName) {
                                                        fetchStockForWarehouse(tItem.itemName, wh).then((avail) => {
                                                          setFieldValue(`tileReturnItems.${tIdx}.availableQty`, avail);
                                                        });
                                                      }
                                                      setActiveTileReturnWhIndex(null);
                                                    }}
                                                    className={`p-2.5 cursor-pointer transition text-xs font-bold flex items-center justify-between gap-2 ${
                                                      wIdx === highlightedTileReturnWhIndex
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-l-4 border-amber-500'
                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                                    }`}
                                                  >
                                                    <span className="truncate">{wh}</span>
                                                    {tItem.itemName && (
                                                      <div className="text-right font-mono shrink-0 pl-2 flex flex-col items-end leading-none">
                                                        <span className={`text-[11px] font-bold ${hasStock ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                          {whBoxes} Box{whBoxes !== 1 ? 'es' : ''}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                                          {whLoose} Pc{whLoose !== 1 ? 's' : ''}
                                                        </span>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* SOLD QTY TO CUSTOMER */}
                                      <td className="p-2 w-32 text-center">
                                        {(() => {
                                          const nameKey = String(tItem.itemName || '').toLowerCase().trim();
                                          const soldData = customerSoldMap[nameKey];
                                          if (soldData) {
                                            return (
                                              <div>
                                                <div className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                  {soldData.boxes} Box{soldData.boxes !== 1 ? 'es' : ''}{soldData.loose > 0 ? ` + ${soldData.loose} Pcs` : ''}
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-mono font-medium">
                                                  ({soldData.totalPieces} Sold Pcs)
                                                </div>
                                              </div>
                                            );
                                          }
                                          if (values.customerName && values.customerName.toLowerCase() !== 'walk-in customer') {
                                            return (
                                              <div>
                                                <div className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                                                  0 Sold
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono font-medium">
                                                  (Not in history)
                                                </div>
                                              </div>
                                            );
                                          }
                                          return (
                                            <div>
                                              <div className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300">
                                                Open Return
                                              </div>
                                              <div className="text-[10px] text-slate-400 font-mono font-medium">
                                                (Walk-in / Direct)
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </td>

                                      {/* RETURN QTY (BOX) */}
                                      <td className="p-2 w-24 text-center">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={tItem.boxQty ?? 0}
                                          onKeyDown={blockInvalidChar}
                                          onChange={(e) => {
                                            handleTileReturnItemChange(tIdx, 'boxQty', e.target.value, values.tileReturnItems, setFieldValue);
                                          }}
                                          className="w-full text-center bg-white dark:bg-boxdark border border-amber-300 dark:border-amber-800 rounded p-1.5 text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-amber-500"
                                        />
                                      </td>

                                      {/* RETURN PCS (LOOSE) */}
                                      <td className="p-2 w-24 text-center">
                                        <input
                                          type="number"
                                          min="0"
                                          step="1"
                                          value={tItem.loosePcs ?? 0}
                                          onKeyDown={blockInvalidChar}
                                          onChange={(e) => {
                                            handleTileReturnItemChange(tIdx, 'loosePcs', e.target.value, values.tileReturnItems, setFieldValue);
                                          }}
                                          className="w-full text-center bg-white dark:bg-boxdark border border-amber-300 dark:border-amber-800 rounded p-1.5 text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-amber-500"
                                        />
                                      </td>

                                      {/* RETURN RATE (PER BOX) */}
                                      <td className="p-2 w-28 text-right">
                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={tItem.pricePerBox ?? 0}
                                          onKeyDown={blockInvalidChar}
                                          onChange={(e) => {
                                            handleTileReturnItemChange(tIdx, 'pricePerBox', e.target.value, values.tileReturnItems, setFieldValue);
                                          }}
                                          className="w-full text-right bg-white dark:bg-boxdark border border-amber-300 dark:border-amber-800 rounded p-1.5 text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-amber-500"
                                        />
                                      </td>

                                      {/* RETURN RATE (PER SQ. MTR) */}
                                      <td className="p-2 w-28 text-right">
                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={tItem.pricePerSqm ?? 0}
                                          onKeyDown={blockInvalidChar}
                                          onChange={(e) => {
                                            handleTileReturnItemChange(tIdx, 'pricePerSqm', e.target.value, values.tileReturnItems, setFieldValue);
                                          }}
                                          className="w-full text-right bg-white dark:bg-boxdark border border-amber-300 dark:border-amber-800 rounded p-1.5 text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-amber-500"
                                        />
                                        <div className="mt-1 text-right font-mono">
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200/80 dark:border-amber-800/60" title="Total Sq. Mtr returned for this item">
                                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium">Sq.M:</span>
                                            <strong className="text-amber-950 dark:text-amber-100 font-black">{itemLineSqm.toFixed(2)} m²</strong>
                                          </span>
                                        </div>
                                      </td>

                                      {/* RETURN RATE (PER PIECE) */}
                                      <td className="p-2 w-28 text-right">
                                        <input
                                          type="number"
                                          min="0"
                                          step="any"
                                          value={tItem.pricePerPiece ?? 0}
                                          onKeyDown={blockInvalidChar}
                                          onChange={(e) => {
                                            handleTileReturnItemChange(tIdx, 'pricePerPiece', e.target.value, values.tileReturnItems, setFieldValue);
                                          }}
                                          className="w-full text-right bg-white dark:bg-boxdark border border-amber-300 dark:border-amber-800 rounded p-1.5 text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-amber-500"
                                        />
                                      </td>

                                      {/* NET TOTAL */}
                                      <td className="p-2 w-32 text-right pr-3 font-mono font-black text-xs text-amber-700 dark:text-amber-400">
                                        - Rs. {Number(tItem.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                      </td>

                                      {/* DELETE ROW */}
                                      <td className="p-2 w-8 text-center">
                                        <button
                                          type="button"
                                          onClick={() => remove(tIdx)}
                                          className="text-slate-400 hover:text-red-600 transition p-1"
                                          title="Remove tile return item"
                                        >
                                          <FiTrash2 size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>

                            <div className="p-2 bg-amber-50/50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-900/50 text-left">
                              <button
                                type="button"
                                onClick={() =>
                                  push({
                                    id: Date.now(),
                                    itemName: '',
                                    skuCode: '',
                                    warehouse: values.dispatchWarehouse || '',
                                    availableQty: 0,
                                    boxQty: 1,
                                    loosePcs: 0,
                                    piecesPerBox: 4,
                                    sqmPerBox: 1.44,
                                    pricePerBox: 0,
                                    pricePerSqm: 0,
                                    pricePerPiece: 0,
                                    totalAmount: 0,
                                    totalSqm: 1.44,
                                    isTileItem: true
                                  })
                                }
                                className="text-amber-700 dark:text-amber-400 font-bold hover:underline cursor-pointer text-xs"
                              >
                                + Append Returned Tile Item Row
                              </button>
                            </div>
                          </div>
                        );
                      }}
                    </FieldArray>
                  </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-start gap-6 border border-stroke p-4 rounded-sm bg-slate-50/10 mt-6 relative z-0">
                  <div className="w-full md:w-1/2 space-y-4">
                    {netPayableBeforeFloor < 0 ? (
                      <div className="w-full p-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/30 dark:bg-teal-950/20 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-teal-200/60 dark:border-teal-800/60">
                          <div>
                            <span className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-2">
                              <span>🔄</span> Excess Return Balance
                            </span>
                            <p className="text-[11px] text-teal-700/80 dark:text-teal-400 font-medium mt-0.5">
                              Returns exceed the bill total. Amount owed to customer: 
                              <b className="font-mono font-black ml-1 text-teal-900 dark:text-teal-200">
                                Rs. {Math.abs(netPayableBeforeFloor).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </b>
                            </p>
                          </div>
                        </div>

                        {/* Action Selector: Credit vs Refund */}
                        <div className="space-y-2">
                          <label className="text-[11px] font-black uppercase text-gray-600 dark:text-gray-300 block">
                            How would you like to settle this balance? *
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setFieldValue('excessCreditAction', 'credit');
                                setFieldValue('excessRefundAmount', 0);
                              }}
                              className={`p-3 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                                values.excessCreditAction === 'credit'
                                  ? 'border-teal-600 bg-white dark:bg-boxdark ring-2 ring-teal-500/30 shadow-sm'
                                  : 'border-stroke dark:border-strokedark bg-white/50 dark:bg-boxdark/50 hover:border-teal-300 opacity-80'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <span className="text-xs font-black text-black dark:text-white flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${values.excessCreditAction === 'credit' ? 'bg-teal-600' : 'bg-gray-300'}`}></span>
                                  Customer Credit
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                                  Ledger / Balance
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                                Credit to customer's ledger account or adjust against previous debit balance.
                              </p>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFieldValue('excessCreditAction', 'refund');
                                setFieldValue('excessRefundAmount', Math.abs(netPayableBeforeFloor));
                              }}
                              className={`p-3 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                                values.excessCreditAction === 'refund'
                                  ? 'border-amber-600 bg-white dark:bg-boxdark ring-2 ring-amber-500/30 shadow-sm'
                                  : 'border-stroke dark:border-strokedark bg-white/50 dark:bg-boxdark/50 hover:border-amber-300 opacity-80'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <span className="text-xs font-black text-black dark:text-white flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${values.excessCreditAction === 'refund' ? 'bg-amber-600' : 'bg-gray-300'}`}></span>
                                  Pay Cash / Bank Refund
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                                  Immediate Payout
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                                Pay out refund amount to customer immediately in Cash or via Bank transfer.
                              </p>
                            </button>
                          </div>
                        </div>

                        {/* If Refund selected, show Refund Method, Amount, and Bank if Bank */}
                        {values.excessCreditAction === 'refund' && (
                          <div className="p-3 rounded-lg bg-white dark:bg-boxdark border border-amber-200 dark:border-amber-800/60 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-black text-gray-600 dark:text-gray-300 block mb-1">
                                  Refund Payment Method: *
                                </label>
                                <select
                                  name="excessRefundMethod"
                                  value={values.excessRefundMethod || 'Cash'}
                                  onChange={handleChange}
                                  className="w-full border border-stroke dark:border-strokedark rounded p-2 text-xs bg-transparent font-black outline-none text-black dark:text-white focus:border-amber-500"
                                >
                                  <option value="Cash">Cash Payout</option>
                                  <option value="Bank">Bank Wire Transfer</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[11px] font-black text-gray-600 dark:text-gray-300 block mb-1">
                                  Refund Amount (PKR): *
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max={Math.abs(netPayableBeforeFloor)}
                                  onKeyDown={blockInvalidChar}
                                  name="excessRefundAmount"
                                  value={values.excessRefundAmount === 0 ? '' : values.excessRefundAmount}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const num = val === '' ? 0 : Math.max(0, Number(val) || 0);
                                    setFieldValue('excessRefundAmount', Math.min(Math.abs(netPayableBeforeFloor), num));
                                  }}
                                  placeholder={String(Math.abs(netPayableBeforeFloor))}
                                  className="w-full border border-stroke dark:border-strokedark rounded p-2 text-xs bg-transparent font-mono font-black text-right outline-none text-amber-600 dark:text-amber-400 focus:border-amber-500"
                                />
                              </div>
                            </div>

                            {values.excessRefundMethod === 'Bank' && (
                              <div>
                                <label className="text-[11px] font-black text-gray-600 dark:text-gray-300 block mb-1">
                                  Paying Bank Ledger Account: *
                                </label>
                                <SearchableDropdown
                                  options={banksList.map(b => `${b.bankName} - ${b.accountTitle}`)}
                                  value={
                                    banksList.find(b => b.accountTitle === values.excessRefundBank)
                                      ? `${banksList.find(b => b.accountTitle === values.excessRefundBank)!.bankName} - ${values.excessRefundBank}`
                                      : (values.excessRefundBank || '')
                                  }
                                  onChange={(val) => {
                                    const match = banksList.find(b => `${b.bankName} - ${b.accountTitle}` === val);
                                    setFieldValue('excessRefundBank', match ? match.accountTitle : val);
                                  }}
                                  placeholder="-- Select Corporate Bank Account --"
                                  className="border-stroke dark:border-strokedark focus:border-amber-500"
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[11px] pt-1 text-gray-500 font-mono">
                              <span>Max Refund Limit:</span>
                              <span>Rs. {Math.abs(netPayableBeforeFloor).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="font-bold text-gray-500 block mb-1">Payment Method / Settlement Mode: *</span>
                          <select
                            name="settlementMode"
                            value={values.settlementMode}
                            onChange={(e) => {
                              handleChange(e);
                              if (e.target.value === 'Cash') {
                                setFieldValue('selectedBankTitle', '');
                                setFieldValue('bankAmountPaid', 0);
                              }
                            }}
                            className={`w-full border rounded p-2 text-xs bg-white dark:bg-boxdark font-black outline-none text-black dark:text-white ${hasAttempted && errors.settlementMode ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}`}
                          >
                            <option value="Cash">Cash Only</option>
                            <option value="Bank">Bank Transfer Only</option>
                            <option value="Split">Cash & Bank Combined</option>
                          </select>
                          {hasAttempted && errors.settlementMode && <p className="text-red-500 text-[10px] font-bold mt-1">{String(errors.settlementMode)}</p>}
                        </div>

                        {(values.settlementMode === 'Bank' || values.settlementMode === 'Split') && (
                          <div>
                            <span className="font-bold text-gray-500 block mb-1">Corporate Bank Ledger Profile: *</span>
                            <SearchableDropdown
                              options={banksList.map(b => `${b.bankName} - ${b.accountTitle}`)}
                              value={
                                banksList.find(b => b.accountTitle === values.selectedBankTitle)
                                  ? `${banksList.find(b => b.accountTitle === values.selectedBankTitle)!.bankName} - ${values.selectedBankTitle}`
                                  : values.selectedBankTitle
                              }
                              onChange={(val) => {
                                const match = banksList.find(b => `${b.bankName} - ${b.accountTitle}` === val);
                                handleChange({ target: { name: 'selectedBankTitle', value: match ? match.accountTitle : val } });
                              }}
                              placeholder="-- Search Account Wire Registry --"
                              className={hasAttempted && errors.selectedBankTitle ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark focus:border-primary'}
                            />
                            {hasAttempted && errors.selectedBankTitle && <p className="text-red-500 text-[10px] font-bold mt-1">{String(errors.selectedBankTitle)}</p>}
                          </div>
                        )}

                        {(() => {
                          const totalPaidNow = values.settlementMode === 'Cash'
                            ? Number(values.cashAmountPaid || 0)
                            : (values.settlementMode === 'Bank' ? Number(values.bankAmountPaid || 0) : (Number(values.cashAmountPaid || 0) + Number(values.bankAmountPaid || 0)));
                          const isOverpaid = netPayableBeforeFloor >= 0 && totalPaidNow > currentSubtotalValue + 0.01;

                          return (
                            <div className="w-full space-y-2">
                              <div className={values.settlementMode === 'Split' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'w-full'}>
                                {(values.settlementMode === 'Cash' || values.settlementMode === 'Split') && (
                                  <div>
                                    <span className={`font-bold block mb-1 ${isOverpaid ? 'text-red-600 dark:text-red-400' : 'text-danger'}`}>
                                      Cash Payment Amount (PKR): *
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      onKeyDown={blockInvalidChar}
                                      onWheel={(e: any) => e.target.blur()}
                                      name="cashAmountPaid"
                                      value={values.cashAmountPaid === 0 ? '' : values.cashAmountPaid}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const num = val === '' ? 0 : Math.max(0, Number(val) || 0);
                                        setFieldValue('cashAmountPaid', num);
                                      }}
                                      placeholder="0"
                                      className={`w-full rounded border p-2 bg-transparent text-right font-black text-sm outline-none ${
                                        isOverpaid 
                                          ? 'border-2 border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 ring-2 ring-red-400' 
                                          : (hasAttempted && errors.cashAmountPaid ? 'border-red-500 bg-red-50/10 text-danger' : 'border-stroke dark:border-strokedark focus:border-primary text-black dark:text-white')
                                      }`}
                                    />
                                    {hasAttempted && errors.cashAmountPaid && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.cashAmountPaid}</p>}
                                  </div>
                                )}

                                {(values.settlementMode === 'Bank' || values.settlementMode === 'Split') && (
                                  <div>
                                    <span className={`font-bold block mb-1 ${isOverpaid ? 'text-red-600 dark:text-red-400' : 'text-primary'}`}>
                                      Bank Payment Amount (PKR): *
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      onKeyDown={blockInvalidChar}
                                      onWheel={(e: any) => e.target.blur()}
                                      name="bankAmountPaid"
                                      value={values.bankAmountPaid === 0 ? '' : values.bankAmountPaid}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        const num = val === '' ? 0 : Math.max(0, Number(val) || 0);
                                        setFieldValue('bankAmountPaid', num);
                                      }}
                                      placeholder="0"
                                      className={`w-full rounded border p-2 bg-transparent text-right font-black text-sm outline-none ${
                                        isOverpaid 
                                          ? 'border-2 border-red-500 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 ring-2 ring-red-400' 
                                          : (hasAttempted && errors.bankAmountPaid ? 'border-red-500 bg-red-50/10 text-primary' : 'border-stroke dark:border-strokedark focus:border-primary text-black dark:text-white')
                                      }`}
                                    />
                                    {hasAttempted && errors.bankAmountPaid && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.bankAmountPaid}</p>}
                                  </div>
                                )}
                              </div>

                              {isOverpaid && (
                                <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                                  <span className="text-base">⚠️</span>
                                  <span>
                                    <strong>Payment Exceeds Total Bill:</strong> Entered Rs. {totalPaidNow.toLocaleString(undefined, { minimumFractionDigits: 2 })} on a bill of Rs. {currentSubtotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}. Please correct the amount before logging.
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>

                  {/* FINANCIAL AUDIT SUMMARY CARD */}
                  <div className="w-full md:w-1/3 space-y-2 font-mono font-bold text-xs text-black dark:text-white">
                    <div className="flex justify-between border-b pb-1 dark:border-strokedark">
                      <span>Net Invoice Value Total:</span>
                      <span>Rs. {grossSubtotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    {values.showOverallDiscount && (
                      <div className="flex justify-between items-center border-b pb-1 dark:border-strokedark text-amber-600 dark:text-amber-400">
                        <span className="text-xs">Overall Discount (PKR):</span>
                        <input
                          type="number"
                          min="0"
                          onKeyDown={blockInvalidChar}
                          name="overallDiscount"
                          value={values.overallDiscount === 0 ? '' : values.overallDiscount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFieldValue('overallDiscount', val === '' ? 0 : Math.max(0, Number(val) || 0));
                          }}
                          placeholder="0.00"
                          className="w-28 text-right font-black bg-amber-50/40 dark:bg-amber-900/10 border border-amber-300 dark:border-amber-700 rounded p-1 text-xs outline-none focus:border-amber-500 text-amber-700 dark:text-amber-300"
                        />
                      </div>
                    )}

                    {values.showOverallDiscount && (
                      <div className="flex justify-between border-b pb-1 dark:border-strokedark text-green-600 dark:text-green-400 font-black">
                        <span>Net Invoice Total (After Discount):</span>
                        <span>Rs. {currentSubtotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {values.showAdditionalCharges && (
                      <div className="flex justify-between items-center border-b pb-1 dark:border-strokedark text-blue-600 dark:text-blue-400">
                        <span className="text-xs">Freight Charges:</span>
                        <input
                          type="number"
                          min="0"
                          onKeyDown={blockInvalidChar}
                          name="additionalCharges"
                          value={values.additionalCharges === 0 ? '' : values.additionalCharges}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFieldValue('additionalCharges', val === '' ? 0 : Math.max(0, Number(val) || 0));
                          }}
                          placeholder="0.00"
                          className="w-28 text-right font-black bg-blue-50/40 dark:bg-blue-900/10 border border-blue-300 dark:border-blue-700 rounded p-1 text-xs outline-none focus:border-blue-500 text-blue-700 dark:text-blue-300"
                        />
                      </div>
                    )}

                    {(values.showReturnSection || returnTotalValue > 0) && (
                      <div className="flex justify-between border-b pb-1 dark:border-strokedark text-rose-600 dark:text-rose-400 font-bold">
                        <span>Less Return Credit:</span>
                        <span>- Rs. {returnTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {(values.showTileReturnSection || tileReturnTotalValue > 0) && (
                      <div className="flex justify-between border-b pb-1 dark:border-strokedark text-amber-600 dark:text-amber-400 font-bold">
                        <span>Less Tile Return Credit:</span>
                        <span>- Rs. {tileReturnTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    <div className={`flex justify-between border-b pb-1 dark:border-strokedark font-black ${netPayableBeforeFloor < 0 ? 'text-teal-600 dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>
                      <span>{netPayableBeforeFloor < 0 ? 'Excess Customer Credit:' : 'Net Bill Payable:'}</span>
                      <span>Rs. {Math.abs(netPayableBeforeFloor).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>

                    {(values.settlementMode === 'Cash' || values.settlementMode === 'Split') && (
                      <div className="flex justify-between border-b pb-1 dark:border-strokedark text-emerald-600">
                        <span>Received Cash Flow:</span>
                        <span>Rs. {Number(values.cashAmountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {(values.settlementMode === 'Bank' || values.settlementMode === 'Split') && (
                      <div className="flex justify-between border-b pb-1 dark:border-strokedark text-primary">
                        <span>Received Bank Wire:</span>
                        <span>Rs. {Number(values.bankAmountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {values.settlementMode === 'Split' && (
                      <div className="flex justify-between border-b pb-1 dark:border-strokedark text-success font-black">
                        <span>Total Paid (Cash + Bank):</span>
                        <span>Rs. {(Number(values.cashAmountPaid || 0) + Number(values.bankAmountPaid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {(() => {
                      const totalPaidNow = values.settlementMode === 'Cash'
                        ? Number(values.cashAmountPaid || 0)
                        : (values.settlementMode === 'Bank' ? Number(values.bankAmountPaid || 0) : (Number(values.cashAmountPaid || 0) + Number(values.bankAmountPaid || 0)));
                      
                      if (netPayableBeforeFloor < 0) {
                        const refundAmt = values.excessCreditAction === 'refund' ? Number(values.excessRefundAmount || 0) : 0;
                        const creditRetained = Math.max(0, Math.abs(netPayableBeforeFloor) - refundAmt);
                        return (
                          <div className="space-y-1.5 pt-1 border-double border-b-4 border-teal-500 dark:border-teal-400">
                            {values.excessCreditAction === 'refund' && refundAmt > 0 && (
                              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                <span className="font-sans text-[11px] font-bold">
                                  Refund Paid ({values.excessRefundMethod || 'Cash'}):
                                </span>
                                <b className="text-sm font-mono font-black">
                                  - Rs. {refundAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </b>
                              </div>
                            )}
                            {creditRetained > 0 && (
                              <div className="flex justify-between text-teal-600 dark:text-teal-400">
                                <span className="font-sans text-[11px] font-bold">
                                  {refundAmt > 0 ? 'Remaining Customer Credit:' : 'Adjusted into Customer Balance:'}
                                </span>
                                <b className="text-sm font-mono font-black">
                                  - Rs. {creditRetained.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </b>
                              </div>
                            )}
                          </div>
                        );
                      }

                      const remBalance = Math.max(0, currentSubtotalValue - totalPaidNow);
                      return (
                        <div className="flex justify-between pt-1 border-double border-b-4 border-stroke dark:border-strokedark">
                          <span className="font-sans text-[11px]">Un-invoiced Remaining Balance:</span>
                          <b className={`text-sm ${remBalance > 0 ? 'text-danger' : 'text-success'}`}>
                            Rs. {remBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </b>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-6 mt-6 border-t border-stroke dark:border-strokedark">
                  <button
                    type="button"
                    onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/sales/invoice/list`)}
                    className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-6 font-bold text-slate-700 dark:text-slate-300 transition shadow-sm text-xs cursor-pointer"
                  >
                    Cancel
                  </button>

                  {(() => {
                    const totalPaidNow = values.settlementMode === 'Cash'
                      ? Number(values.cashAmountPaid || 0)
                      : (values.settlementMode === 'Bank' ? Number(values.bankAmountPaid || 0) : (Number(values.cashAmountPaid || 0) + Number(values.bankAmountPaid || 0)));
                    const isOverpaid = netPayableBeforeFloor >= 0 && totalPaidNow > currentSubtotalValue + 0.01;

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (isOverpaid) {
                              toast.error(`Payment (Rs. ${totalPaidNow.toLocaleString()}) cannot exceed bill total (Rs. ${currentSubtotalValue.toLocaleString()})!`);
                              return;
                            }
                            setSubmitAction('print');
                            setIsOpeningCustomerModal(true);
                            submitForm().finally(() => {
                              setTimeout(() => setIsOpeningCustomerModal(false), 1200);
                            });
                          }}
                          disabled={loading || isModalLoading || isOverpaid}
                          className={`rounded-xl py-3 px-6 font-bold text-white transition shadow-md text-xs cursor-pointer flex items-center gap-2 ${
                            isOverpaid || isModalLoading ? 'bg-gray-400 cursor-not-allowed opacity-75' : 'bg-teal-600 hover:bg-teal-700'
                          }`}
                        >
                          {isModalLoading && submitAction === 'print' ? (
                            <>
                              <Spinner color="border-white" size="w-4 h-4" />
                              <span>Validating...</span>
                            </>
                          ) : (
                            <>
                              <FiPrinter size={15} /> <span>Save & Print</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (isOverpaid) {
                              toast.error(`Payment (Rs. ${totalPaidNow.toLocaleString()}) cannot exceed bill total (Rs. ${currentSubtotalValue.toLocaleString()})!`);
                              return;
                            }
                            setSubmitAction('save');
                            setIsOpeningCustomerModal(true);
                            submitForm().finally(() => {
                              setTimeout(() => setIsOpeningCustomerModal(false), 1200);
                            });
                          }}
                          disabled={loading || isModalLoading || isOverpaid}
                          className={`rounded-xl py-3 px-8 font-bold text-white transition shadow-md text-xs cursor-pointer flex items-center gap-2 ${
                            isOverpaid || isModalLoading ? 'bg-gray-400 cursor-not-allowed opacity-75' : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {isModalLoading && submitAction === 'save' ? (
                            <>
                              <Spinner color="border-white" size="w-4 h-4" />
                              <span>Validating...</span>
                            </>
                          ) : loading ? (
                            <Spinner color="border-white" size="w-4 h-4" />
                          ) : (
                            <>
                              <FiCheck size={15} /> <span>{editData ? 'Apply Updates' : 'Log Invoice'}</span>
                            </>
                          )}
                        </button>
                      </>
                    );
                  })()}
                </div>

                {/* MODAL OPENING TOAST INDICATOR */}
                {isModalLoading && !showCustomerModal && (
                  <div className="fixed bottom-6 right-6 z-[9998] flex items-center gap-3 bg-white dark:bg-boxdark border border-teal-500/40 shadow-2xl py-3 px-5 rounded-xl animate-fade-in pointer-events-none">
                    <Spinner color="border-teal-600" size="w-4 h-4" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      Validating invoice & opening client checkout...
                    </span>
                  </div>
                )}
              </Form>
            );
          }}
        </Formik>
      </div>
    </div>
  );
};

export default NewInvoice;
