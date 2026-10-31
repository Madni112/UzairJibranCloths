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
  MdLocationCity,
  MdStorefront
} from 'react-icons/md';

interface VendorImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface ParsedVendor {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  city: string;
  area: string;
  address: string;
  province: string;
  pageNo: string;
  balance: number;
  balanceNature: 'Credit' | 'Debit';
  isValid: boolean;
  validationError?: string;
  isExisting?: boolean;
  existingId?: string | number;
  existingBalance?: number;
  existingCity?: string;
}

export const VendorImportModal: React.FC<VendorImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedVendor[]>([]);
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

  // Parse 2D matrix of sheet rows into strongly typed vendor objects with existing vendor matching
  const parseMatrix = async (matrix: any[][]) => {
    if (!matrix || matrix.length < 2) {
      toast.error('Spreadsheet is empty or missing headers');
      return;
    }

    // 1. Pre-fetch existing vendors from database for duplicate/update detection
    let existingDbVendors: any[] = [];
    try {
      const { data: dbVendors, error: vendErr } = await supabase
        .from('vendors')
        .select('*');
      if (!vendErr && dbVendors) {
        existingDbVendors = dbVendors;
      }
    } catch (e) {
      console.warn('Could not query existing vendors for duplicate detection:', e);
    }

    // 2. Find header row indices (case-insensitive substring matches supporting English and Urdu)
    const headerRow = matrix[0].map((h) => String(h || '').trim().toLowerCase());
    let nameIdx = -1;
    let companyIdx = -1;
    let phoneIdx = -1;
    let cityIdx = -1;
    let areaIdx = -1;
    let addressIdx = -1;
    let provinceIdx = -1;
    let pageIdx = -1;
    let balIdx = -1;
    let natureIdx = -1;

    headerRow.forEach((col, idx) => {
      // Vendor / Supplier Name
      if (
        col.includes('vendor') ||
        col.includes('supplier') ||
        col.includes('party') ||
        col.includes('mill') ||
        col.includes('title') ||
        col.includes('سپلائر') ||
        col.includes('وینڈر') ||
        col.includes('پارٹی') ||
        col.includes('مل') ||
        col === 'name'
      ) {
        if (nameIdx === -1) nameIdx = idx;
      }
      // Company / Firm Name
      else if (
        col.includes('company') ||
        col.includes('firm') ||
        col.includes('کمپنی') ||
        col.includes('ادارہ')
      ) {
        if (companyIdx === -1) companyIdx = idx;
      }
      // Phone / Mobile
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
        col.includes('تحصیل')
      ) {
        if (cityIdx === -1) cityIdx = idx;
      }
      // Area / Market
      else if (
        col.includes('area') ||
        col.includes('market') ||
        col.includes('location') ||
        col.includes('علاقہ') ||
        col.includes('مارکیٹ') ||
        col.includes('بازار') ||
        col.includes('bazaar') ||
        col.includes('bazar')
      ) {
        if (areaIdx === -1) areaIdx = idx;
      }
      // Address / Street / Shop
      else if (
        col.includes('address') ||
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
      // Page Number
      else if (
        col.includes('page') ||
        col.includes('صفحہ') ||
        col.includes('کھاتہ صفحہ')
      ) {
        if (pageIdx === -1) pageIdx = idx;
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
      // Balance Nature (Cr / Dr)
      else if (
        col.includes('nature') ||
        col.includes('dr/cr') ||
        col.includes('cr/dr') ||
        col.includes('debit/credit') ||
        col.includes('credit/debit') ||
        col.includes('نوعیت') ||
        col.includes('کھاتہ') ||
        col === 'cr' ||
        col === 'dr'
      ) {
        if (natureIdx === -1) natureIdx = idx;
      }
    });

    // Fallbacks if exact headers were omitted
    if (nameIdx === -1) nameIdx = 0;
    if (phoneIdx === -1 && matrix[0].length > 1) phoneIdx = 1;
    if (cityIdx === -1 && matrix[0].length > 2) cityIdx = 2;
    if (areaIdx === -1 && matrix[0].length > 3) areaIdx = 3;
    if (balIdx === -1 && matrix[0].length > 4) balIdx = 4;
    if (natureIdx === -1 && matrix[0].length > 5) natureIdx = 5;

    const list: ParsedVendor[] = [];

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
      const companyName = companyIdx !== -1 && row[companyIdx] !== undefined ? String(row[companyIdx]).trim() : '';
      const phone = phoneIdx !== -1 && row[phoneIdx] !== undefined ? String(row[phoneIdx]).trim() : '';
      let city = cityIdx !== -1 && row[cityIdx] !== undefined ? String(row[cityIdx]).trim() : '';
      const area = areaIdx !== -1 && row[areaIdx] !== undefined ? String(row[areaIdx]).trim() : '';
      const address = addressIdx !== -1 && row[addressIdx] !== undefined ? String(row[addressIdx]).trim() : '';
      const province = provinceIdx !== -1 && row[provinceIdx] !== undefined ? String(row[provinceIdx]).trim() : 'Sindh';
      const pageNo = pageIdx !== -1 && row[pageIdx] !== undefined ? String(row[pageIdx]).trim() : '';

      // Opening Balance & Balance Nature
      const rawBal = balIdx !== -1 && row[balIdx] !== undefined ? String(row[balIdx]).trim() : '';
      const parsedBalNum = rawBal ? parseFloat(rawBal.replace(/[^0-9.-]/g, '')) || 0 : 0;
      const balance = Math.abs(parsedBalNum);

      const rawNature = natureIdx !== -1 && row[natureIdx] !== undefined ? String(row[natureIdx]).trim().toLowerCase() : '';
      // For Vendors, default is Credit (Accounts Payable = company owes supplier)
      let balanceNature: 'Credit' | 'Debit' = 'Credit';
      if (rawNature.startsWith('dr') || rawNature.includes('debit') || parsedBalNum < 0) {
        balanceNature = 'Debit';
      } else {
        balanceNature = 'Credit';
      }

      let isValid = true;
      let validationError = '';

      if (!name) {
        isValid = false;
        validationError = 'Vendor / Supplier Name is required';
      } else if (!city) {
        city = 'Hyderabad';
      }

      // Duplicate / Existing Vendor Check
      const cleanName = normalizeText(name);
      const matchedDbVendor = existingDbVendors.find((v) => {
        const vName = normalizeText(v.vendor_name || v.name || v.company_name || '');
        return vName === cleanName;
      });

      const isExisting = Boolean(matchedDbVendor);
      const existingId = matchedDbVendor?.id;
      const existingBalance = matchedDbVendor?.currentBalance ?? matchedDbVendor?.balance ?? matchedDbVendor?.opening_balance;
      const existingCity = matchedDbVendor?.city || (matchedDbVendor?.address && matchedDbVendor.address.includes('ماتلی') ? 'ماتلی' : undefined);

      list.push({
        id: `row-${r}-${Date.now()}`,
        name,
        companyName,
        phone,
        city,
        area,
        address,
        province: province || 'Sindh',
        pageNo,
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
      toast.error('No valid vendor data rows detected in spreadsheet.');
    } else {
      setParsedData(list);
      const existingCount = list.filter((r) => r.isExisting).length;
      const newCount = list.length - existingCount;
      if (existingCount > 0) {
        toast.success(`Parsed ${list.length} records (${existingCount} existing will be updated, ${newCount} new to add)!`);
      } else {
        toast.success(`Parsed ${list.length} new vendor records!`);
      }
    }
  };

  // Download official Excel format template with Address & Province columns
  const handleDownloadTemplate = () => {
    const templateData = [
      [
        'Vendor Name *',
        'Company / Mill Name',
        'Primary Contact Phone',
        'City *',
        'Area',
        'Office / Mill Address',
        'Province',
        'Opening Balance',
        'Balance Nature (Cr / Dr)',
        'Page #'
      ],
      [
        'Al-Karam Textile Mills',
        'Al-Karam Studio',
        '0300-1122334',
        'Karachi',
        'SITE Area',
        'Plot # 45, Industrial Zone, SITE',
        'Sindh',
        450000,
        'Credit',
        '101'
      ],
      [
        'Gul Ahmed Fabrics',
        'Gul Ahmed Group',
        '0321-9988776',
        'Karachi',
        'Landhi Industrial',
        'Sector 12, Landhi Industrial Area',
        'Sindh',
        820000,
        'Credit',
        '102'
      ],
      [
        'Kohinoor Textile Traders',
        'Kohinoor Mills',
        '0333-5566778',
        'Faisalabad',
        'Clock Tower Market',
        'Shop 18, Main Cloth Market, Faisalabad',
        'Punjab',
        125000,
        'Credit',
        '103'
      ],
      [
        'Sindh Yarn & Dyeing',
        'Sindh Yarn Corp',
        '0303-3344556',
        'ماتلی',
        'مین بازار',
        'نزد ریلوے روڈ، ماتلی',
        'Sindh',
        65000,
        'Credit',
        '104'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 28 }, // Vendor Name
      { wch: 24 }, // Company Name
      { wch: 22 }, // Phone
      { wch: 18 }, // City
      { wch: 20 }, // Area
      { wch: 38 }, // Address
      { wch: 16 }, // Province
      { wch: 18 }, // Opening Balance
      { wch: 24 }, // Balance Nature
      { wch: 12 }, // Page #
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendors Format');
    XLSX.writeFile(wb, 'Vendor_Upload_Format.xlsx');
    toast.success('Downloaded Vendor_Upload_Format.xlsx!');
  };

  // Batch insert new vendors & update existing vendors in Supabase
  const handleExecuteImport = async () => {
    const validRows = parsedData.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid vendors ready to import.');
      return;
    }

    setImporting(true);
    try {
      // 1. Probe database columns to set only valid columns
      const dbColumns: string[] = [];
      try {
        const { data: probeData } = await supabase.from('vendors').select('*').limit(1);
        if (probeData && probeData.length > 0) {
          dbColumns.push(...Object.keys(probeData[0]));
        }
      } catch (e) {
        console.warn('Vendor schema probe notice:', e);
      }

      const hasCol = (colName: string) =>
        dbColumns.some((c) => c.toLowerCase() === colName.toLowerCase());
      const getExactCols = (fieldKey: string) =>
        dbColumns.filter((c) => c.toLowerCase() === fieldKey.toLowerCase());

      const toUpdate = validRows.filter((r) => r.isExisting && r.existingId);
      const toInsert = validRows.filter((r) => !r.isExisting);

      let updatedCount = 0;
      let insertedCount = 0;

      // 2. Process UPDATES for existing vendors
      for (const r of toUpdate) {
        const rawBal = Number(r.balance) || 0;
        // For vendors, Credit is positive payable liability
        const computedBal = r.balanceNature === 'Debit' ? -Math.abs(rawBal) : Math.abs(rawBal);
        const locSegments = [r.address, r.area, r.city].filter(Boolean);
        const fullAddress = locSegments.length > 0 ? locSegments.join(', ') : (r.address || r.city || '');

        const updatePayload: Record<string, any> = {
          balance: computedBal,
          currentBalance: computedBal,
        };

        if (hasCol('opening_balance')) updatePayload.opening_balance = Math.abs(rawBal);
        if (hasCol('current_balance')) updatePayload.current_balance = computedBal;
        if (hasCol('address')) updatePayload.address = fullAddress;
        if (hasCol('province') && r.province) updatePayload.province = r.province;
        if (r.phone) {
          if (hasCol('phone')) updatePayload.phone = r.phone;
          if (hasCol('cell_no')) updatePayload.cell_no = r.phone;
          if (hasCol('phone_no')) updatePayload.phone_no = r.phone;
        }
        if (r.pageNo) {
          if (hasCol('page_no')) updatePayload.page_no = r.pageNo;
          if (hasCol('pageNo')) updatePayload.pageNo = r.pageNo;
        }

        const { error: updateErr } = await supabase
          .from('vendors')
          .update(updatePayload)
          .eq('id', r.existingId);

        if (updateErr) {
          console.warn(`Failed to update vendor ${r.name}:`, updateErr);
        } else {
          updatedCount++;
        }
      }

      // 3. Process INSERTS for new vendors
      if (toInsert.length > 0) {
        // Query highest vendor code
        let maxCodeNum = 0;
        try {
          const { data: codeData } = await supabase.from('vendors').select('vendor_code, vendorCode');
          (codeData || []).forEach((v: any) => {
            const codeStr = v.vendor_code || v.vendorCode || '';
            const match = String(codeStr).match(/2010-(\d+)/);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              if (num > maxCodeNum) maxCodeNum = num;
            }
          });
        } catch (_) {}

        const insertPayloads = toInsert.map((r, i) => {
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
          const computedBal = r.balanceNature === 'Debit' ? -Math.abs(rawBal) : Math.abs(rawBal);
          const locSegments = [r.address, r.area, r.city].filter(Boolean);
          const fullAddress = locSegments.length > 0 ? locSegments.join(', ') : (r.address || r.city || '');
          const assignedCode = `2010-${String(maxCodeNum + i + 1).padStart(3, '0')}`;

          if (dbColumns.length === 0) {
            item['vendor_name'] = r.name;
            item['name'] = r.name;
            if (r.companyName) item['company_name'] = r.companyName;
            item['vendor_code'] = assignedCode;
            item['vendorCode'] = assignedCode;
            if (r.phone) {
              item['phone'] = r.phone;
              item['cell_no'] = r.phone;
            }
            item['address'] = fullAddress;
            item['province'] = r.province || 'Sindh';
            if (r.pageNo) item['page_no'] = r.pageNo;
            item['balance'] = computedBal;
            item['currentBalance'] = computedBal;
          } else {
            setCol('vendor_name', r.name);
            setCol('name', r.name);
            if (r.companyName) setCol('company_name', r.companyName);

            setCol('vendor_code', assignedCode);
            setCol('vendorCode', assignedCode);

            if (r.phone) {
              setCol('phone', r.phone);
              setCol('cell_no', r.phone);
              setCol('phone_no', r.phone);
            }

            setCol('address', fullAddress);
            if (hasCol('province')) setCol('province', r.province || 'Sindh');
            if (hasCol('city')) setCol('city', r.city);
            if (hasCol('area')) setCol('area', r.area);

            if (r.pageNo) {
              setCol('page_no', r.pageNo);
              setCol('pageNo', r.pageNo);
            }

            setCol('balance', computedBal);
            setCol('currentBalance', computedBal);
            setCol('current_balance', computedBal);
            if (hasCol('opening_balance')) setCol('opening_balance', Math.abs(rawBal));
          }

          return item;
        });

        const { data: insertedData, error: insertErr } = await supabase
          .from('vendors')
          .insert(insertPayloads)
          .select('id, vendor_name, name, vendor_code');

        if (insertErr) {
          throw insertErr;
        } else {
          insertedCount = insertedData?.length || toInsert.length;
        }
      }

      toast.success(
        `Bulk Import Complete: ${insertedCount} new vendors added, ${updatedCount} existing updated!`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Execute import error:', err);
      toast.error('Import failed: ' + (err.message || 'Database error'));
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedData.filter((r) => r.isValid).length;
  const invalidCount = parsedData.length - validCount;
  const existingCount = parsedData.filter((r) => r.isExisting).length;
  const newCount = validCount - existingCount;

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#121926] shadow-2xl border border-stroke dark:border-strokedark overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark bg-slate-50/70 dark:bg-meta-4/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
              <MdStorefront size={22} />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                Import Vendors & Suppliers from Excel
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Bulk upload suppliers, smart address & city mapping, and existing vendor balance sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 dark:text-purple-300 transition shadow-xs cursor-pointer"
              title="Download standard Excel upload format"
            >
              <MdFileDownload size={16} />
              <span>Download Excel Format</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-meta-4 cursor-pointer"
            >
              <MdClose size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Dropzone Container */}
          <div
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
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-2 ${
              dragActive
                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-purple-400 hover:bg-slate-50/40 dark:hover:bg-meta-4/10'
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

            <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <MdCloudUpload size={26} />
            </div>

            <div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Click to browse or drag & drop Excel / CSV here
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                or simply press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 text-[10px]">Ctrl + V</kbd> anywhere in this popup to paste copied cells
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10.5px] text-slate-400 pt-1">
              <span>Columns:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Vendor Name *</span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Company</span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Phone</span>
              <span>•</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">City * (e.g. ماتلی)</span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Area</span>
              <span>•</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">Address</span>
              <span>•</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">Province</span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Opening Balance</span>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Nature (Cr / Dr)</span>
            </div>
          </div>

          {/* Parsing Spinner */}
          {parsing && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
              <Spinner size="w-4 h-4" />
              <span>Inspecting spreadsheet and matching with registered vendors...</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-100/70 dark:bg-meta-4/30 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    Preview ({parsedData.length} records)
                  </span>
                  {newCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      <MdPersonAdd size={11} /> {newCount} New Vendors
                    </span>
                  )}
                  {existingCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      <MdSync size={11} /> {existingCount} Existing Vendors (Will Update Balance & City)
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                      <MdWarning size={11} /> {invalidCount} Invalid
                    </span>
                  )}
                  {fileName && (
                    <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
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
                  className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 self-end sm:self-auto cursor-pointer"
                >
                  <MdDeleteOutline size={14} /> Clear List
                </button>
              </div>

              {/* Data Table */}
              <div className="max-h-64 overflow-y-auto border border-stroke dark:border-strokedark rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-stroke dark:border-strokedark text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 min-w-[150px]">Vendor Name *</th>
                      <th className="p-2.5 min-w-[80px]">Action</th>
                      <th className="p-2.5 min-w-[100px]">City *</th>
                      <th className="p-2.5 min-w-[100px]">Area</th>
                      <th className="p-2.5 min-w-[130px]">Address</th>
                      <th className="p-2.5 min-w-[80px]">Province</th>
                      <th className="p-2.5 min-w-[100px]">Phone</th>
                      <th className="p-2.5 min-w-[110px] text-right">Opening Bal.</th>
                      <th className="p-2.5 min-w-[90px] text-center">Nature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark font-medium">
                    {parsedData.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-meta-4/20 transition-colors ${
                          !row.isValid ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-100">
                          {row.name}
                          {!row.isValid && (
                            <span className="block text-[10px] text-rose-500 font-normal">
                              {row.validationError}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          {row.isExisting ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              <MdSync size={10} /> UPDATE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              <MdCheckCircle size={10} /> NEW
                            </span>
                          )}
                        </td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-semibold text-[11px]">
                            {row.city || 'Hyderabad'}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300 text-[11px]">
                          {row.area || '-'}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300 text-[11px] truncate max-w-[140px]" title={row.address}>
                          {row.address || '-'}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300 text-[11px]">
                          {row.province || 'Sindh'}
                        </td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                          {row.phone || '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                          Rs. {row.balance.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.balanceNature === 'Credit'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
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
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition shadow-md disabled:opacity-40 cursor-pointer flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Spinner color="border-white" size="w-3.5 h-3.5" />
                  <span>Processing Vendors...</span>
                </>
              ) : (
                <>
                  <MdCloudUpload size={16} />
                  <span>
                    Import & Update {validCount > 0 ? `(${validCount} Vendors)` : ''}
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

export default VendorImportModal;

