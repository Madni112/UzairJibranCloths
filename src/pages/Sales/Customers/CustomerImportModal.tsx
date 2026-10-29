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
  MdContentPaste
} from 'react-icons/md';

interface CustomerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedCustomer {
  id: string;
  name: string;
  tier: string;
  phone: string;
  city: string;
  area: string;
  balance: number;
  balanceNature: 'Debit' | 'Credit';
  isValid: boolean;
  validationError?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear state on modal close
  useEffect(() => {
    if (!isOpen) {
      setParsedData([]);
      setFileName('');
      setImporting(false);
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
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        parseMatrix(rows);
      } catch (err: any) {
        console.error('File parse error:', err);
        toast.error('Failed to parse Excel file. Please ensure valid .xlsx or .csv format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Process raw tabular text pasted via Ctrl + V
  const processRawText = (text: string) => {
    try {
      const workbook = XLSX.read(text, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      setFileName('Pasted Clipboard Data');
      parseMatrix(rows);
      toast.success('Pasted clipboard data successfully parsed!');
    } catch (err) {
      console.error('Clipboard text parse error:', err);
      toast.error('Could not parse pasted data. Please copy rows directly from Excel.');
    }
  };

  // Parse 2D matrix of sheet rows into strongly typed customer objects
  const parseMatrix = (matrix: any[][]) => {
    if (!matrix || matrix.length < 2) {
      toast.error('Spreadsheet is empty or missing headers');
      return;
    }

    // Find header row indices (case-insensitive substring matches)
    const headerRow = matrix[0].map((h) => String(h || '').trim().toLowerCase());
    let nameIdx = -1;
    let tierIdx = -1;
    let phoneIdx = -1;
    let cityIdx = -1;
    let areaIdx = -1;
    let balIdx = -1;
    let natureIdx = -1;

    headerRow.forEach((col, idx) => {
      if (col.includes('customer name') || col.includes('client name') || col === 'name') {
        nameIdx = idx;
      } else if (col.includes('tier') || col.includes('category') || col.includes('type')) {
        tierIdx = idx;
      } else if (col.includes('phone') || col.includes('mobile') || col.includes('contact') || col.includes('cell')) {
        phoneIdx = idx;
      } else if (col.includes('city') || col.includes('sub area') || col.includes('sub_area') || col.includes('district')) {
        cityIdx = idx;
      } else if (col.includes('area') || col.includes('market') || col.includes('location')) {
        areaIdx = idx;
      } else if (col.includes('balance') || col.includes('opening') || col === 'bal' || col === 'op bal') {
        balIdx = idx;
      } else if (col.includes('nature') || col.includes('dr/cr') || col.includes('debit/credit') || col === 'dr') {
        natureIdx = idx;
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

    for (let r = 1; r < matrix.length; r++) {
      const row = matrix[r];
      if (!row || row.every((c) => String(c).trim() === '')) continue;

      const name = nameIdx !== -1 && row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';
      const tier = tierIdx !== -1 && row[tierIdx] !== undefined ? String(row[tierIdx]).trim() : '';
      const phone = phoneIdx !== -1 && row[phoneIdx] !== undefined ? String(row[phoneIdx]).trim() : '';
      let city = cityIdx !== -1 && row[cityIdx] !== undefined ? String(row[cityIdx]).trim() : '';
      const area = areaIdx !== -1 && row[areaIdx] !== undefined ? String(row[areaIdx]).trim() : '';

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

      // City validation: City is required. If missing, default to Hyderabad and mark warning
      let isValid = true;
      let validationError = '';

      if (!name) {
        isValid = false;
        validationError = 'Customer Name is required';
      } else if (!city) {
        // Auto-assign default city if empty
        city = 'Hyderabad';
      }

      list.push({
        id: `row-${r}-${Date.now()}`,
        name,
        tier,
        phone,
        city,
        area,
        balance,
        balanceNature,
        isValid,
        validationError,
      });
    }

    if (list.length === 0) {
      toast.error('No valid customer data rows detected in spreadsheet.');
    } else {
      setParsedData(list);
      toast.success(`Parsed ${list.length} customer records!`);
    }
  };

  // Download official Excel format template
  const handleDownloadTemplate = () => {
    const templateData = [
      ['Customer Name *', 'Customer Tier / Category', 'Primary Contact Phone', 'City *', 'Area', 'Opening Balance', 'Balance Nature'],
      ['Tariq Fabric Centre', 'Wholesaler / Dealer', '0300-9281734', 'Hyderabad', 'Resham Gali', 85000, 'Debit'],
      ['Al-Madina Cloth House', 'Retail / General', '0312-7654321', 'Karachi', 'Jama Cloth Market', 0, 'Debit'],
      ['Ibrahim Textile Traders', 'Boutique / Tailor', '0333-8889991', 'Sukkur', 'Cloth Market', 25000, 'Credit'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    // Set friendly column widths
    ws['!cols'] = [
      { wch: 30 }, // Customer Name
      { wch: 25 }, // Tier
      { wch: 22 }, // Phone
      { wch: 18 }, // City
      { wch: 22 }, // Area
      { wch: 18 }, // Opening Balance
      { wch: 18 }, // Balance Nature
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers Format');
    XLSX.writeFile(wb, 'Customer_Upload_Format.xlsx');
    toast.success('Downloaded Customer_Upload_Format.xlsx!');
  };

  // Batch insert into Supabase database
  const handleExecuteImport = async () => {
    const validRows = parsedData.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid customers ready to import.');
      return;
    }

    setImporting(true);
    try {
      // 1. Probe database columns to set all variants
      const dbColumns: string[] = [];
      try {
        const { data: probeData } = await supabase.from('customers').select('*').limit(1);
        if (probeData && probeData.length > 0) {
          dbColumns.push(...Object.keys(probeData[0]));
        }
      } catch (e) {
        console.warn('Schema probe notice:', e);
      }

      const getExactCols = (fieldKey: string) =>
        dbColumns.filter((c) => c.toLowerCase() === fieldKey.toLowerCase());

      // 2. Build rows payload
      const payloads = validRows.map((r) => {
        const item: any = {};
        const setCol = (key: string, val: any) => {
          const exacts = getExactCols(key);
          if (exacts.length > 0) {
            exacts.forEach((c) => {
              item[c] = val;
            });
          } else if (dbColumns.length === 0) {
            item[key] = val;
          }
        };

        // Name
        setCol('customerName', r.name);
        setCol('customername', r.name);
        setCol('customer_name', r.name);
        setCol('name', r.name);

        // Tier / Registration Type
        setCol('registrationType', r.tier || 'Retail / General');
        setCol('registrationtype', r.tier || 'Retail / General');

        // Phone
        setCol('primaryPhone', r.phone);
        setCol('primaryphone', r.phone);
        setCol('phone', r.phone);

        // Location (City & Area)
        setCol('city', r.city || 'Hyderabad');
        setCol('sub_area', r.city || 'Hyderabad');
        setCol('subArea', r.city || 'Hyderabad');
        setCol('area', r.area || '');
        setCol('province', 'Sindh');

        // Opening Balance & Balance Nature
        const rawBal = Number(r.balance) || 0;
        const computedBal = r.balanceNature === 'Credit' ? -Math.abs(rawBal) : Math.abs(rawBal);
        setCol('opening_balance', Math.abs(rawBal));
        setCol('openingBalance', Math.abs(rawBal));
        setCol('balance', computedBal);
        setCol('currentBalance', computedBal);
        setCol('current_balance', computedBal);
        setCol('balance_nature', r.balanceNature || 'Debit');
        setCol('balanceNature', r.balanceNature || 'Debit');

        // Location in notes if area specified
        if (r.area) {
          setCol('notes', `Location: ${r.city} | ${r.area}`);
        }

        return item;
      });

      // 3. Insert in batches of 50
      const batchSize = 50;
      let insertedCount = 0;

      for (let i = 0; i < payloads.length; i += batchSize) {
        const batch = payloads.slice(i, i + batchSize);
        const { error } = await supabase.from('customers').insert(batch);
        if (error) throw error;
        insertedCount += batch.length;
      }

      toast.success(`Successfully imported ${insertedCount} customers!`);
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

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
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
                Bulk upload customer directory via Excel file or direct copy-paste (Ctrl + V)
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
                <span className="font-bold text-black dark:text-white">City *</span>
                <span>•</span>
                <span>Area</span>
                <span>•</span>
                <span>Opening Balance</span>
                <span>•</span>
                <span>Balance Nature</span>
              </div>
            </div>
          </div>

          {/* Parsed Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Preview ({parsedData.length} detected)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {validCount} Ready
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                      {invalidCount} Invalid
                    </span>
                  )}
                  {fileName && (
                    <span className="text-xs text-slate-400 font-mono truncate max-w-xs">
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

              <div className="max-h-64 overflow-y-auto rounded-xl border border-stroke dark:border-strokedark">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-meta-4/40 sticky top-0 font-bold text-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-8">#</th>
                      <th className="py-2.5 px-3">Customer Name *</th>
                      <th className="py-2.5 px-3">Tier / Category</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">City *</th>
                      <th className="py-2.5 px-3">Area</th>
                      <th className="py-2.5 px-3 text-right">Opening Bal.</th>
                      <th className="py-2.5 px-3 text-center">Nature</th>
                      <th className="py-2.5 px-3 text-center w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark">
                    {parsedData.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={
                          row.isValid
                            ? 'hover:bg-slate-50 dark:hover:bg-meta-4/10'
                            : 'bg-rose-50/50 dark:bg-rose-950/20'
                        }
                      >
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                          {row.name || (
                            <span className="text-rose-500 italic">Missing Name</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {row.tier || <span className="text-slate-400">Retail / General</span>}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                          {row.phone || '-'}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-meta-4 text-[11px]">
                            {row.city}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                          {row.area || '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-700 dark:text-slate-200">
                          {row.balance ? `Rs. ${row.balance.toLocaleString()}` : <span className="text-slate-400">0</span>}
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
                        <td className="py-2 px-3 text-center">
                          {row.isValid ? (
                            <MdCheckCircle className="text-emerald-500 inline-block" size={16} />
                          ) : (
                            <span
                              title={row.validationError}
                              className="inline-flex items-center text-rose-500 cursor-help"
                            >
                              <MdWarning size={16} />
                            </span>
                          )}
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
                Ready to import <strong className="text-slate-900 dark:text-white">{validCount}</strong> customers
              </span>
            )}

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={importing || validCount === 0}
              className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md disabled:opacity-40 cursor-pointer flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Spinner color="border-white" size="w-3.5 h-3.5" />
                  <span>Importing Customers...</span>
                </>
              ) : (
                <>
                  <MdCloudUpload size={16} />
                  <span>Import {validCount > 0 ? `${validCount} Customers` : ''}</span>
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

