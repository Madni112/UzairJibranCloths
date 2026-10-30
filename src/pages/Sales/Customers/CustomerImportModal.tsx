import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import {
  MdClose,
  MdCloudUpload,
  MdFileDownload,
  MdCheckCircle,
  MdWarning,
  MdDeleteOutline,
  MdSync,
  MdPersonAdd,
  MdLocationCity
} from 'react-icons/md';

interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface ParsedCustomer {
  id: string;
  name: string;
  tier: string;
  phone: string;
  city: string;
  area: string;
  address: string;
  province: string;
  balance: number;
  balanceNature: 'Debit' | 'Credit';
  isValid: boolean;
  validationError?: string;
  isExisting?: boolean;
  existingId?: string | number;
  existingBalance?: number;
  existingCity?: string;
}

export const CustomerImportModal: React.FC<CustomerImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedCustomer[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear state on modal close
  useEffect(() => {
    if (!isOpen) {
      setParsedData([]);
      setFileName('');
      setImporting(false);
      setParsing(false);
    }
  }, [isOpen]);

  // Global Ctrl + V clipboard paste handler when modal is active
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      // 1. Check if an Excel / CSV file was copied to clipboard
      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.xls') ||
          file.name.endsWith('.csv')
        ) {
          e.preventDefault();
          processFile(file);
          return;
        }
      }

      // 2. Check if tabular data was copied directly from Excel / Sheets cells
      if (e.clipboardData) {
        const text = e.clipboardData.getData('text/plain');
        if (text && (text.includes('\t') || text.includes('\n'))) {
          e.preventDefault();
          processRawText(text);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  // Process uploaded or dropped File
  const processFile = (file: File) => {
    setFileName(file.name);
    setParsing(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        await parseMatrix(rows);
      } catch (err: any) {
        console.error('File parse error:', err);
        toast.error('Failed to parse Excel file. Please ensure valid .xlsx or .csv format.');
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Process raw tabular text pasted via Ctrl + V
  const processRawText = async (text: string) => {
    setParsing(true);
    try {
      const workbook = XLSX.read(text, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      setFileName('Pasted Clipboard Data');
      await parseMatrix(rows);
      toast.success('Pasted clipboard data successfully parsed!');
    } catch (err) {
      console.error('Clipboard text parse error:', err);
      toast.error('Could not parse pasted data. Please copy rows directly from Excel.');
    } finally {
      setParsing(false);
    }
  };

  // Parse 2D matrix of sheet rows into strongly typed customer objects with existing customer matching
  const parseMatrix = async (matrix: any[][]) => {
    if (!matrix || matrix.length < 2) {
      toast.error('Spreadsheet is empty or missing headers');
      return;
    }

    // 1. Pre-fetch existing customers from database for duplicate/update detection
    let existingDbCustomers: any[] = [];
    try {
      const { data: dbCusts, error: custErr } = await supabase
        .from('customers')
        .select('id, customerName, customername, customer_name, city, province, address, balance, currentBalance, opening_balance');
      if (!custErr && dbCusts) {
        existingDbCustomers = dbCusts;
      } else {
        const { data: fallbackCusts } = await supabase.from('customers').select('*');
        if (fallbackCusts) existingDbCustomers = fallbackCusts;
      }
    } catch (e) {
      console.warn('Could not query existing customers for duplicate detection:', e);
    }

    // 2. Find header row indices (case-insensitive substring matches supporting English and Urdu)
    const headerRow = matrix[0].map((h) => String(h || '').trim().toLowerCase());
    let nameIdx = -1;
    let tierIdx = -1;
    let phoneIdx = -1;
    let cityIdx = -1;
    let areaIdx = -1;
    let addressIdx = -1;
    let provinceIdx = -1;
    let balIdx = -1;
    let natureIdx = -1;

    headerRow.forEach((col, idx) => {
      // Customer Name
      if (
        col.includes('customer name') ||
        col.includes('client name') ||
        col.includes('party name') ||
        col.includes('account title') ||
        col.includes('پارٹی') ||
        col.includes('کسٹمر') ||
        col.includes('گاہک') ||
        col === 'name' ||
        col === 'customer'
      ) {
        if (nameIdx === -1) nameIdx = idx;
      }
      // Tier / Category
      else if (
        col.includes('tier') ||
        col.includes('category') ||
        col.includes('type') ||
        col.includes('قسم') ||
        col.includes('رجسٹریشن')
      ) {
        if (tierIdx === -1) tierIdx = idx;
      }
      // Phone
      else if (
        col.includes('phone') ||
        col.includes('mobile') ||
        col.includes('contact') ||
        col.includes('cell') ||
        col.includes('فون') ||
        col.includes('موبائل') ||
        col.includes('رابطہ') ||
        col.includes('whatsapp')
      ) {
        if (phoneIdx === -1) phoneIdx = idx;
      }
      // City (City, Town, District, Tehsil, شہر, ضلع)
      else if (
        col.includes('city') ||
        col.includes('town') ||
        col.includes('district') ||
        col.includes('tehsil') ||
        col.includes('sub area') ||
        col.includes('sub_area') ||
        col.includes('subarea') ||
        col.includes('شہر') ||
        col.includes('ضلع') ||
        col.includes('تحصیل') ||
        col === 'shehar' ||
        col === 'shahar'
      ) {
        if (cityIdx === -1) cityIdx = idx;
      }
      // Area / Market
      else if (
        col.includes('area') ||
        col.includes('market') ||
        col.includes('location') ||
        col.includes('سیکٹر') ||
        col.includes('علاقہ') ||
        col.includes('مارکیٹ') ||
        col.includes('bazaar') ||
        col.includes('bazar')
      ) {
        if (areaIdx === -1) areaIdx = idx;
      }
      // Delivery Address / Street / Shop
      else if (
        col.includes('address') ||
        col.includes('delivery address') ||
        col.includes('street') ||
        col.includes('shop') ||
        col.includes('site') ||
        col.includes('پتہ') ||
        col.includes('ایڈریس') ||
        col.includes('مقام')
      ) {
        if (addressIdx === -1) addressIdx = idx;
      }
      // Province / State
      else if (
        col.includes('province') ||
        col.includes('state') ||
        col.includes('صوبہ') ||
        col.includes('region')
      ) {
        if (provinceIdx === -1) provinceIdx = idx;
      }
      // Balance / Opening
      else if (
        col.includes('balance') ||
        col.includes('opening') ||
        col.includes('op bal') ||
        col.includes('بقایا') ||
        col.includes('ابتدائی') ||
        col === 'bal'
      ) {
        if (balIdx === -1) balIdx = idx;
      }
      // Balance Nature (Dr / Cr)
      else if (
        col.includes('nature') ||
        col.includes('dr/cr') ||
        col.includes('dr cr') ||
        col.includes('debit/credit') ||
        col.includes('نوعیت') ||
        col.includes('کھاتہ') ||
        col === 'dr' ||
        col === 'cr'
      ) {
        if (natureIdx === -1) natureIdx = idx;
      }
    });

    // Fallbacks if exact headers were omitted
    if (nameIdx === -1) nameIdx = 0;
    if (tierIdx === -1 && matrix[0].length > 1) tierIdx = 1;
    if (phoneIdx === -1 && matrix[0].length > 2) phoneIdx = 2;
    if (cityIdx === -1 && matrix[0].length > 3) cityIdx = 3;
    if (areaIdx === -1 && matrix[0].length > 4) areaIdx = 4;
    if (balIdx === -1 && matrix[0].length > 5) balIdx = 5;
    if (natureIdx === -1 && matrix[0].length > 6) natureIdx = 6;

    const list: ParsedCustomer[] = [];

    const normalizeText = (s: string) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '')
        .replace(/[\u064B-\u065F]/g, '')
        .replace(/[يى]/g, 'ی')
        .replace(/[ك]/g, 'ک')
        .replace(/[ة]/g, 'ہ')
        .replace(/[أإآ]/g, 'ا')
        .replace(/\s+/g, ' ');

    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.every((c) => String(c).trim() === '')) continue;

      const name = nameIdx !== -1 && row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';
      const tier = tierIdx !== -1 && row[tierIdx] !== undefined ? String(row[tierIdx]).trim() : '';
      const phone = phoneIdx !== -1 && row[phoneIdx] !== undefined ? String(row[phoneIdx]).trim() : '';
      let city = cityIdx !== -1 && row[cityIdx] !== undefined ? String(row[cityIdx]).trim() : '';
      const area = areaIdx !== -1 && row[areaIdx] !== undefined ? String(row[areaIdx]).trim() : '';
      const address = addressIdx !== -1 && row[addressIdx] !== undefined ? String(row[addressIdx]).trim() : '';
      const province = provinceIdx !== -1 && row[provinceIdx] !== undefined ? String(row[provinceIdx]).trim() : 'Sindh';

      // Opening Balance & Balance Nature
      const rawBal = balIdx !== -1 && row[balIdx] !== undefined ? String(row[balIdx]).trim() : '';
      const parsedBalNum = rawBal ? parseFloat(rawBal.replace(/[^0-9.-]/g, '')) || 0 : 0;
      const balance = Math.abs(parsedBalNum);

      const rawNature = natureIdx !== -1 && row[natureIdx] !== undefined ? String(row[natureIdx]).trim().toLowerCase() : '';
      let balanceNature: 'Debit' | 'Credit' = 'Debit';
      if (rawNature.startsWith('cr') || rawNature.includes('credit') || parsedBalNum < 0) {
        balanceNature = 'Credit';
      } else {
        balanceNature = 'Debit';
      }

      // City validation & preservation
      let isValid = true;
      let validationError = '';

      if (!name) {
        isValid = false;
        validationError = 'Customer Name is required';
      } else if (!city) {
        // Fallback: If city was empty, check if area or address mentions a city, otherwise default
        city = 'Hyderabad';
      }

      // Duplicate / Existing Customer Check
      const cleanName = normalizeText(name);
      const matchedDbCustomer = existingDbCustomers.find((c) => {
        const cName = normalizeText(c.customerName || c.customername || c.customer_name || c.name || '');
        return cName === cleanName;
      });

      const isExisting = Boolean(matchedDbCustomer);
      const existingId = matchedDbCustomer?.id;
      const existingBalance = matchedDbCustomer?.currentBalance ?? matchedDbCustomer?.balance ?? matchedDbCustomer?.opening_balance;
      const existingCity = matchedDbCustomer?.city;

      list.push({
        id: `row-${r}-${Date.now()}`,
        name,
        tier,
        phone,
        city,
        area,
        address,
        province: province || 'Sindh',
        balance,
        balanceNature,
        isValid,
        validationError,
        isExisting,
        existingId,
        existingBalance: existingBalance !== undefined ? Number(existingBalance) : undefined,
        existingCity
      });
    }

    if (list.length === 0) {
      toast.error('No valid customer data rows detected in spreadsheet.');
    } else {
      setParsedData(list);
      const existingCount = list.filter((r) => r.isExisting).length;
      const newCount = list.length - existingCount;
      if (existingCount > 0) {
        toast.success(`Parsed ${list.length} records (${existingCount} existing will be updated, ${newCount} new to add)!`);
      } else {
        toast.success(`Parsed ${list.length} new customer records!`);
      }
    }
  };

  // Download official Excel format template with Address & Province columns
  const handleDownloadTemplate = () => {
    const templateData = [
      [
        'Customer Name *',
        'Customer Tier / Category',
        'Primary Contact Phone',
        'City *',
        'Area',
        'Delivery Address',
        'Province',
        'Opening Balance',
        'Balance Nature'
      ],
      [
        'Tariq Fabric Centre',
        'Wholesaler / Dealer',
        '0300-9281734',
        'Hyderabad',
        'Resham Gali',
        'Shop # 14, Resham Gali Market',
        'Sindh',
        85000,
        'Debit'
      ],
      [
        'Al-Madina Cloth House',
        'Retail / General',
        '0312-7654321',
        'ماتلی',
        'مین بازار',
        'مین بازار، نزد اسٹیشن روڈ، ماتلی',
        'Sindh',
        15000,
        'Debit'
      ],
      [
        'Ibrahim Textile Traders',
        'Boutique / Tailor',
        '0333-8889991',
        'Sukkur',
        'Cloth Market',
        'Shop 4, Main Sarafa Bazaar',
        'Sindh',
        25000,
        'Credit'
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 30 }, // Customer Name
      { wch: 24 }, // Tier
      { wch: 22 }, // Phone
      { wch: 18 }, // City
      { wch: 20 }, // Area
      { wch: 34 }, // Delivery Address
      { wch: 16 }, // Province
      { wch: 18 }, // Opening Balance
      { wch: 16 }, // Balance Nature
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers Format');
    XLSX.writeFile(wb, 'Customer_Upload_Format.xlsx');
    toast.success('Downloaded Customer_Upload_Format.xlsx!');
  };

  // Batch insert new customers & update existing customers in Supabase
  const handleExecuteImport = async () => {
    const validRows = parsedData.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid customers ready to import.');
      return;
    }

    setImporting(true);
    try {
      // 1. Probe database columns to set only valid columns
      const dbColumns: string[] = [];
      try {
        const { data: probeData } = await supabase.from('customers').select('*').limit(1);
        if (probeData && probeData.length > 0) {
          dbColumns.push(...Object.keys(probeData[0]));
        }
      } catch (e) {
        console.warn('Schema probe notice:', e);
      }

      const hasCol = (colName: string) =>
        dbColumns.some((c) => c.toLowerCase() === colName.toLowerCase());
      const getExactCols = (fieldKey: string) =>
        dbColumns.filter((c) => c.toLowerCase() === fieldKey.toLowerCase());

      const toUpdate = validRows.filter((r) => r.isExisting && r.existingId);
      const toInsert = validRows.filter((r) => !r.isExisting);

      let updatedCount = 0;
      let insertedCount = 0;

      // 2. Process UPDATES for existing customers
      for (const r of toUpdate) {
        const rawBal = Number(r.balance) || 0;
        const computedBal = r.balanceNature === 'Credit' ? -Math.abs(rawBal) : Math.abs(rawBal);
        const locText = [r.city, r.area].filter(Boolean).join(' | ');

        const updatePayload: Record<string, any> = {
          opening_balance: Math.abs(rawBal),
          balance: computedBal,
          currentBalance: computedBal,
        };

        if (r.city && hasCol('city')) updatePayload.city = r.city;
        if (r.province && hasCol('province')) updatePayload.province = r.province;
        if (r.address && hasCol('address')) updatePayload.address = r.address;
        if (r.phone && hasCol('primaryPhone')) updatePayload.primaryPhone = r.phone;
        if (r.phone && hasCol('phone')) updatePayload.phone = r.phone;
        if (r.tier && hasCol('registrationType')) updatePayload.registrationType = r.tier;
        if (hasCol('notes') && locText) {
          updatePayload.notes = `Location: ${locText}`;
        }

        const { error: updateErr } = await supabase
          .from('customers')
          .update(updatePayload)
          .eq('id', r.existingId);

        if (updateErr) {
          console.warn(`Failed to update customer ${r.name}:`, updateErr);
        } else {
          updatedCount++;
        }
      }

      // 3. Process INSERTS for new customers
      if (toInsert.length > 0) {
        const insertPayloads = toInsert.map((r) => {
          const item: any = {};
          const setCol = (key: string, val: any) => {
            const exacts = getExactCols(key);
            if (exacts.length > 0) {
              exacts.forEach((c) => {
                item[c] = val;
              });
            }
          };

          const rawBal = Number(r.balance) || 0;
          const computedBal = r.balanceNature === 'Credit' ? -Math.abs(rawBal) : Math.abs(rawBal);
          const locText = [r.city, r.area].filter(Boolean).join(' | ');

          if (dbColumns.length === 0) {
            item['customerName'] = r.name;
            if (r.phone) item['primaryPhone'] = r.phone;
            item['city'] = r.city;
            item['province'] = r.province || 'Sindh';
            if (r.address) item['address'] = r.address;
            if (r.tier) item['registrationType'] = r.tier;
            item['opening_balance'] = Math.abs(rawBal);
            item['currentBalance'] = computedBal;
            item['balance'] = computedBal;
            if (locText) {
              item['notes'] = `Location: ${locText}`;
            }
          } else {
            setCol('customerName', r.name);
            setCol('customername', r.name);
            setCol('customer_name', r.name);
            setCol('name', r.name);

            if (r.tier) {
              setCol('registrationType', r.tier);
              setCol('registrationtype', r.tier);
            }

            if (r.phone) {
              setCol('primaryPhone', r.phone);
              setCol('primaryphone', r.phone);
              setCol('phone', r.phone);
            }

            // Location & Address
            if (hasCol('city')) setCol('city', r.city);
            if (hasCol('sub_area')) setCol('sub_area', r.city);
            if (hasCol('subArea')) setCol('subArea', r.city);
            if (hasCol('area')) setCol('area', r.area);
            if (hasCol('address') && r.address) setCol('address', r.address);
            if (hasCol('province')) setCol('province', r.province || 'Sindh');

            if (locText) {
              setCol('notes', `Location: ${locText}`);
            }

            setCol('opening_balance', Math.abs(rawBal));
            setCol('openingBalance', Math.abs(rawBal));
            setCol('balance', computedBal);
            setCol('currentBalance', computedBal);
            setCol('current_balance', computedBal);
          }

          return item;
        });

        const batchSize = 50;
        for (let i = 0; i < insertPayloads.length; i += batchSize) {
          let batch = insertPayloads.slice(i, i + batchSize);
          let { error } = await supabase.from('customers').insert(batch);

          // Auto-heal missing columns reported by PostgREST schema cache
          if (error && (error.code === 'PGRST204' || error.message?.includes('schema cache'))) {
            for (let attempt = 0; attempt < 8 && error; attempt++) {
              const errMsg = error.message || '';
              const colMatch = errMsg.match(/Could not find the '([^']+)' column/i);
              if (colMatch && colMatch[1]) {
                const missingCol = colMatch[1].toLowerCase();
                batch = batch.map((rowItem) => {
                  const copy = { ...rowItem };
                  const foundKey = Object.keys(copy).find((k) => k.toLowerCase() === missingCol);
                  if (foundKey) delete copy[foundKey];
                  return copy;
                });
                const retryRes = await supabase.from('customers').insert(batch);
                error = retryRes.error;
              } else {
                break;
              }
            }
          }

          if (error) throw error;
          insertedCount += batch.length;
        }
      }

      toast.success(
        `Import completed successfully! (${insertedCount} new created, ${updatedCount} existing updated)`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || 'Failed to import customers.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedData.filter((r) => r.isValid).length;
  const invalidCount = parsedData.length - validCount;
  const existingCount = parsedData.filter((r) => r.isExisting && r.isValid).length;
  const newCount = validCount - existingCount;

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-meta-4/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MdCloudUpload size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Import Customers from Excel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bulk upload, smart city auto-mapping, address & province support, and existing customer balance sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Download standard format template"
            >
              <MdFileDownload size={16} />
              <span>Download Excel Format</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <MdClose size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Dropzone & Paste Canvas */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              dragActive
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-meta-4/10 hover:border-primary/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  processFile(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <MdCloudUpload size={24} />
              </div>

              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Click to browse or drag & drop Excel / CSV here
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  or simply press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px] text-slate-700 dark:text-slate-300 font-bold">Ctrl + V</kbd> anywhere in this popup to paste copied cells
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[11px] text-slate-500 font-mono">
                <span>Columns:</span>
                <span className="font-bold text-black dark:text-white">Customer Name *</span>
                <span>•</span>
                <span>Tier</span>
                <span>•</span>
                <span>Phone</span>
                <span>•</span>
                <span className="font-bold text-black dark:text-white">City * (e.g. ماتلی)</span>
                <span>•</span>
                <span>Area</span>
                <span>•</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Address</span>
                <span>•</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Province</span>
                <span>•</span>
                <span>Opening Balance</span>
                <span>•</span>
                <span>Nature (Dr / Cr)</span>
              </div>
            </div>
          </div>

          {/* Loading parsing spinner */}
          {parsing && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Spinner />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Checking existing customer names and matching columns...
              </span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedData.length > 0 && !parsing && (
            <div className="space-y-3">
              {/* Summary Stats Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-100 dark:bg-meta-4/30 border border-stroke dark:border-strokedark">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Preview ({parsedData.length} records)
                  </span>

                  {newCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <MdPersonAdd size={14} />
                      <span>{newCount} New Customers</span>
                    </span>
                  )}

                  {existingCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      <MdSync size={14} />
                      <span>{existingCount} Existing (Will update balances & location)</span>
                    </span>
                  )}

                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      <MdWarning size={14} />
                      <span>{invalidCount} Invalid</span>
                    </span>
                  )}

                  {fileName && (
                    <span className="text-xs text-slate-400 font-mono truncate max-w-xs ml-1">
                      ({fileName})
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setParsedData([]);
                    setFileName('');
                  }}
                  className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <MdDeleteOutline size={15} />
                  <span>Clear List</span>
                </button>
              </div>

              {/* Data Table */}
              <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-xl border border-stroke dark:border-strokedark">
                <table className="w-full min-w-[850px] text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-meta-4/60 sticky top-0 font-bold text-slate-700 dark:text-slate-200 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Customer Name *</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                      <th className="py-2.5 px-3">City *</th>
                      <th className="py-2.5 px-3">Area</th>
                      <th className="py-2.5 px-3">Address</th>
                      <th className="py-2.5 px-3">Province</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3 text-right">Opening Bal.</th>
                      <th className="py-2.5 px-3 text-center">Nature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark">
                    {parsedData.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={
                          !row.isValid
                            ? 'bg-rose-50/50 dark:bg-rose-950/20'
                            : row.isExisting
                            ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60 dark:hover:bg-amber-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-meta-4/10'
                        }
                      >
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          <div>
                            {row.name || (
                              <span className="text-rose-500 italic">Missing Name</span>
                            )}
                          </div>
                          {row.tier && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {row.tier}
                            </span>
                          )}
                        </td>

                        {/* Status / Action: New vs Existing */}
                        <td className="py-2 px-3 text-center">
                          {row.isExisting ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                              title="Existing customer in system. Opening balance and details will be updated."
                            >
                              <MdSync size={11} />
                              <span>UPDATE</span>
                            </span>
                          ) : row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <MdCheckCircle size={11} />
                              <span>NEW</span>
                            </span>
                          ) : (
                            <span
                              title={row.validationError}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300"
                            >
                              <MdWarning size={11} />
                              <span>INVALID</span>
                            </span>
                          )}
                        </td>

                        {/* City (Preserves custom / Urdu city like ماتلی) */}
                        <td className="py-2 px-3">
                          <span className="font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary dark:bg-primary/20 text-[11px]">
                            {row.city}
                          </span>
                        </td>

                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {row.area || '-'}
                        </td>

                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-[150px]" title={row.address}>
                          {row.address || '-'}
                        </td>

                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {row.province || 'Sindh'}
                        </td>

                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {row.phone || '-'}
                        </td>

                        <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-200 font-bold">
                          {row.balance ? `Rs. ${row.balance.toLocaleString()}` : <span className="text-slate-400 font-normal">0</span>}
                        </td>

                        <td className="py-2 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.balanceNature === 'Credit'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {row.balanceNature === 'Credit' ? 'Credit (Cr)' : 'Debit (Dr)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-meta-4/20">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {parsedData.length > 0 && (
              <span className="text-xs text-slate-500">
                Ready: <strong className="text-slate-900 dark:text-white">{newCount} new</strong> to add,{' '}
                <strong className="text-amber-600 dark:text-amber-400">{existingCount} existing</strong> to update
              </span>
            )}

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing || validCount === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md disabled:opacity-40 cursor-pointer flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Spinner color="border-white" size="w-3.5 h-3.5" />
                  <span>Processing Customers...</span>
                </>
              ) : (
                <>
                  <MdCloudUpload size={16} />
                  <span>
                    Import & Update {validCount > 0 ? `(${validCount} Customers)` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerImportModal;
