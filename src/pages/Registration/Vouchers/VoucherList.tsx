import React, { useEffect, useState } from 'react';
import TablePagination from '../../../components/TablePagination';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import TableActions from '../../../ui/TableActions';
import { MdReceipt, MdAssignment, MdShoppingCart, MdPayments, MdKeyboardReturn, MdAccountBalanceWallet, MdAssignmentReturn, MdPayment } from 'react-icons/md';
import { useAuth } from '../../../Context/Auth';

export interface VoucherListProps {
  voucherTypePreset?: 'SAV' | 'SRV' | 'CRV' | 'PAV' | 'PRV' | 'VPV' | 'EXP' | string;
}

interface VoucherConfig {
  title: string;
  subtitle: string;
  prefix: string;
  addRoute: string;
  addLabel: string;
  icon: React.ElementType;
  badgeLabel: string;
  badgeClass: string;
  filter: (v: any) => boolean;
}

const VOUCHER_CONFIGS: Record<string, VoucherConfig> = {
  SAV: {
    title: 'Sale Amount Vouchers',
    subtitle: 'Customer sales credit entries & opening balances (SAV / OB)',
    prefix: 'SAV',
    addRoute: '/Vouchers/Sale-Amount/Add',
    addLabel: '+ Add Sale Voucher',
    icon: MdReceipt,
    badgeLabel: 'Sale Voucher',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600',
    filter: (v: any) => {
      const no = String(v.voucher_no || '').toUpperCase();
      const type = String(v.voucher_type || '').toLowerCase();
      if (no.startsWith('SAV-') || type.includes('sale amount voucher')) return true;
      if (no.startsWith('OB-') && !no.startsWith('OB-2010') && !no.startsWith('OB-V')) {
        return String(v.account_code || '').startsWith('2020-') || !String(v.account_code || '').startsWith('2010-');
      }
      return false;
    }
  },
  SRV: {
    title: 'Sale Amount Returns',
    subtitle: 'Returns & deductions from customer receivables (SRV)',
    prefix: 'SRV',
    addRoute: '/Vouchers/Sale-Return/Add',
    addLabel: '+ Add Sale Return',
    icon: MdAssignmentReturn,
    badgeLabel: 'Sale Return',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600',
    filter: (v: any) => {
      const no = String(v.voucher_no || '').toUpperCase();
      const type = String(v.voucher_type || '').toLowerCase();
      return no.startsWith('SRV-') || type.includes('sale return') || type.includes('sale amount return');
    }
  },
  CRV: {
    title: 'Customer Receive Vouchers',
    subtitle: 'Payment receipts collected from customers (CRV)',
    prefix: 'CRV',
    addRoute: '/Vouchers/Customer-Receive/Add',
    addLabel: '+ Add Receive Voucher',
    icon: MdPayments,
    badgeLabel: 'Customer Receipt',
    badgeClass: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600',
    filter: (v: any) => {
      const no = String(v.voucher_no || '').toUpperCase();
      const type = String(v.voucher_type || '').toLowerCase();
      return no.startsWith('CRV-') || type.includes('customer receive') || type.includes('cash receipt') || type.includes('bank receipt');
    }
  },
  PAV: {
    title: 'Purchase Amount Vouchers',
    subtitle: 'Vendor purchases & mill billing entries (PAV / OB-V)',
    prefix: 'PAV',
    addRoute: '/Vouchers/Purchase-Amount/Add',
    addLabel: '+ Add Purchase Voucher',
    icon: MdShoppingCart,
    badgeLabel: 'Purchase Voucher',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600',
    filter: (v: any) => {
      const no = String(v.voucher_no || '').toUpperCase();
      const type = String(v.voucher_type || '').toLowerCase();
      if (no.startsWith('PAV-') || type.includes('purchase amount voucher')) return true;
      if (no.startsWith('OB-2010') || no.startsWith('OB-V')) return true;
      if (no.startsWith('OB-') && String(v.account_code || '').startsWith('2010-')) return true;
      return false;
    }
  },
  PRV: {
    title: 'Purchase Amount Return Vouchers',
    subtitle: 'Returns to vendors & mill debit deductions (PRV)',
    prefix: 'PRV',
    addRoute: '/Vouchers/Purchase-Return/Add',
    addLabel: '+ Add Purchase Return',
    icon: MdKeyboardReturn,
    badgeLabel: 'Purchase Return',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600',
    filter: (v: any) => {
      const no = String(v.voucher_no || '').toUpperCase();
      const type = String(v.voucher_type || '').toLowerCase();
      return no.startsWith('PRV-') || type.includes('purchase return') || type.includes('purchase amount return');
    }
  },
  VPV: {
    title: 'Vendor Payment Vouchers',
    subtitle: 'Payments disbursed to vendors & suppliers (VPV)',
    prefix: 'VPV',
    addRoute: '/Vouchers/Vendor-Payment/Add',
    addLabel: '+ Add Vendor Payment',
    icon: MdPayment,
    badgeLabel: 'Vendor Payment',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600',
    filter: (v: any) => {
      const no = String(v.voucher_no || '').toUpperCase();
      const type = String(v.voucher_type || '').toLowerCase();
      return no.startsWith('VPV-') || type.includes('vendor payment') || (type.includes('payment') && String(v.account_code || '').startsWith('2010-'));
    }
  },
  EXP: {
    title: 'Expense Vouchers',
    subtitle: 'Shop utilities, rent, carriage, tea & operational expenses (EXP)',
    prefix: 'EXP',
    addRoute: '/Vouchers/Expense/Add',
    addLabel: '+ Add Expense Voucher',
    icon: MdAccountBalanceWallet,
    badgeLabel: 'Expense Voucher',
    badgeClass: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600',
    filter: (v: any) => {
      const no = String(v.voucher_no || '').toUpperCase();
      const type = String(v.voucher_type || '').toLowerCase();
      return no.startsWith('EXP-') || type.includes('expense') || String(v.account_code || '').startsWith('5');
    }
  }
};

function VoucherList({ voucherTypePreset }: VoucherListProps) {
  const { tenantId } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activePreset = (voucherTypePreset || searchParams.get('type') || '').toUpperCase();
  const activeConfig = VOUCHER_CONFIGS[activePreset];

  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('voucher_no');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'total_amount' || field === 'voucher_date' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchVoucherLedgerHistory();
  }, [activePreset]);

  const fetchVoucherLedgerHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('financial_vouchers')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      // Safe deduplication: ONLY deduplicate OB- vouchers if duplicated in database
      const seenOBKeys = new Set<string>();
      const safeList: any[] = [];

      (data || []).forEach((v: any) => {
        const rawNo = String(v.voucher_no || '').trim().toUpperCase();
        if (rawNo.startsWith('OB-')) {
          const numMatch = rawNo.match(/OB-(?:2020-)?(\d+)/);
          const normNo = numMatch ? `OB-${numMatch[1].padStart(3, '0')}` : rawNo;
          const custCode = String(v.account_code || '').trim().toLowerCase();
          const uniqueOBKey = `${normNo}_${custCode}`;
          if (seenOBKeys.has(uniqueOBKey)) {
            return; // skip duplicate OB entry
          }
          seenOBKeys.add(uniqueOBKey);
        }
        safeList.push(v);
      });

      // Filter by preset if active
      let filtered = safeList;
      if (activeConfig) {
        filtered = safeList.filter(activeConfig.filter);
      }

      setVouchers(filtered);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch vouchers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVoucher = async (voucher: any) => {
    const rawNo = String(voucher.voucher_no || '').trim().toUpperCase();
    const isOB = rawNo.startsWith('OB-') || 
      String(voucher.voucher_type || '').toLowerCase().includes('opening balance') || 
      String(voucher.narration || '').toLowerCase().includes('opening balance') || 
      String(voucher.notes || '').toLowerCase().includes('opening balance');

    if (isOB) {
      toast.error('Opening Balance vouchers cannot be deleted.');
      return;
    }

    const vNo = voucher.voucher_no || `VCH-${voucher.id}`;
    const amountFormatted = Number(voucher.total_amount || voucher.debit || voucher.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    
    if (!window.confirm(`Are you sure you want to permanently delete voucher "${vNo}" (Rs. ${amountFormatted})?\n\nThis action will remove the voucher and reverse its khata balance impact.`)) {
      return;
    }

    try {
      setLoading(true);

      const effectiveAmt = Number(voucher.total_amount || voucher.debit || voucher.credit || 0);
      const vType = String(voucher.voucher_type || '').toLowerCase();
      const vPrefix = rawNo.split('-')[0] || '';
      const metadata = voucher.metadata || {};
      const activePreset = metadata.preset || vPrefix;

      // 1. Identify target customer / vendor account code if any
      const custItem = Array.isArray(voucher.items)
        ? voucher.items.find((it: any) => (it.accountCode || it.account_code || '').startsWith('2020-'))
        : null;
      const custCode = custItem ? (custItem.accountCode || custItem.account_code || '').trim() : (String(voucher.account_code || '').startsWith('2020-') ? voucher.account_code.trim() : '');

      const vendItem = Array.isArray(voucher.items)
        ? voucher.items.find((it: any) => (it.accountCode || it.account_code || '').startsWith('2010-'))
        : null;
      const vendCode = vendItem ? (vendItem.accountCode || vendItem.account_code || '').trim() : (String(voucher.account_code || '').startsWith('2010-') ? voucher.account_code.trim() : '');

      // 2. Delete voucher from database
      const { error: delErr } = await supabase
        .from('financial_vouchers')
        .delete()
        .eq('id', voucher.id);

      if (delErr) throw delErr;

      // 3. Recalculate true Khata balance for affected Customer from all remaining transactions + OB
      if (custCode) {
        try {
          const [{ data: remVchs }, { data: coaItem }, { data: custRecord }] = await Promise.all([
            supabase.from('financial_vouchers').select('debit, credit, total_amount, items, account_code'),
            supabase.from('chart_of_accounts').select('opening_balance, balance_nature').eq('account_code', custCode).maybeSingle(),
            supabase.from('customers').select('id, opening_balance').or(`customer_code.eq.${custCode},account_code.eq.${custCode}`).maybeSingle()
          ]);

          let totalD = 0;
          let totalC = 0;
          (remVchs || []).forEach((v: any) => {
            if (Array.isArray(v.items) && v.items.length > 0) {
              v.items.forEach((it: any) => {
                if (String(it.accountCode || it.account_code || '').trim() === custCode) {
                  totalD += Number(it.debit || 0);
                  totalC += Number(it.credit || 0);
                }
              });
            } else if (String(v.account_code || '').trim() === custCode) {
              totalD += Number(v.debit || (v.credit ? 0 : v.total_amount) || 0);
              totalC += Number(v.credit || 0);
            }
          });

          const op = Number(coaItem?.opening_balance ?? custRecord?.opening_balance ?? 0);
          const isCr = coaItem?.balance_nature?.toLowerCase() === 'credit';
          const exactCustBal = (isCr ? -op : op) + (totalD - totalC);

          if (custRecord?.id) {
            await supabase.from('customers').update({ balance: exactCustBal, currentBalance: exactCustBal }).eq('id', custRecord.id);
          }
        } catch (syncErr) {
          console.warn('Customer balance recalculation note:', syncErr);
        }
      }

      // 4. Recalculate true Khata balance for affected Vendor from all remaining transactions + OB
      if (vendCode) {
        try {
          const [{ data: remVchs }, { data: coaItem }, { data: vendRecord }] = await Promise.all([
            supabase.from('financial_vouchers').select('debit, credit, total_amount, items, account_code'),
            supabase.from('chart_of_accounts').select('opening_balance, balance_nature').eq('account_code', vendCode).maybeSingle(),
            supabase.from('vendors').select('id, opening_balance').eq('vendor_code', vendCode).maybeSingle()
          ]);

          let totalD = 0;
          let totalC = 0;
          (remVchs || []).forEach((v: any) => {
            if (Array.isArray(v.items) && v.items.length > 0) {
              v.items.forEach((it: any) => {
                if (String(it.accountCode || it.account_code || '').trim() === vendCode) {
                  totalD += Number(it.debit || 0);
                  totalC += Number(it.credit || 0);
                }
              });
            } else if (String(v.account_code || '').trim() === vendCode) {
              totalD += Number(v.debit || (v.credit ? 0 : v.total_amount) || 0);
              totalC += Number(v.credit || 0);
            }
          });

          const op = Number(coaItem?.opening_balance ?? vendRecord?.opening_balance ?? 0);
          const isDr = coaItem?.balance_nature?.toLowerCase() === 'debit';
          const exactVendBal = (isDr ? -op : op) + (totalC - totalD);

          if (vendRecord?.id) {
            await supabase.from('vendors').update({ balance: exactVendBal, currentBalance: exactVendBal, current_balance: exactVendBal }).eq('id', vendRecord.id);
          }
        } catch (syncErr) {
          console.warn('Vendor balance recalculation note:', syncErr);
        }
      }

      // 4. Log audit log
      try {
        await supabase.from('audit_logs').insert([{
          action_type: 'DELETE',
          table_name: 'financial_vouchers',
          performed_by: tenantId || 'admin',
          details: {
            voucher_no: vNo,
            voucher_type: voucher.voucher_type,
            amount: effectiveAmt,
            account_code: voucher.account_code,
            account_title: voucher.account_title,
            timestamp: new Date().toISOString()
          }
        }]);
      } catch (_) {}

      toast.success(`Voucher ${vNo} deleted successfully.`);
      await fetchVoucherLedgerHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete voucher');
    } finally {
      setLoading(false);
    }
  };

  const filteredVouchers = vouchers.filter((v) =>
    v.voucher_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.voucher_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.account_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.account_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.narration?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedVouchers = [...filteredVouchers].sort((a, b) => {
    let valA: any = a[sortField];
    let valB: any = b[sortField];

    if (sortField === 'total_amount') {
      valA = Number(valA || a.debit || a.credit || 0);
      valB = Number(valB || b.debit || b.credit || 0);
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    if (sortField === 'voucher_date') {
      const timeA = new Date(valA || a.created_at || 0).getTime();
      const timeB = new Date(valB || b.created_at || 0).getTime();
      return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
    }

    if (sortField === 'voucher_no') {
      return sortDirection === 'asc'
        ? String(valA || '').localeCompare(String(valB || ''), undefined, { numeric: true, sensitivity: 'base' })
        : String(valB || '').localeCompare(String(valA || ''), undefined, { numeric: true, sensitivity: 'base' });
    }

    const strA = String(valA || a.narration || a.notes || '').toLowerCase();
    const strB = String(valB || b.narration || b.notes || '').toLowerCase();
    return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
  });

  const totalEntries = sortedVouchers.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedVouchers = sortedVouchers.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const pageTitle = activeConfig ? activeConfig.title : 'General Ledger Financial Vouchers';
  const pageSubtitle = activeConfig ? activeConfig.subtitle : 'Complete transaction history and double-entry general ledger';
  const addRoute = activeConfig ? activeConfig.addRoute : '/Registration/Vouchers/Add';
  const addLabel = activeConfig ? activeConfig.addLabel : '+ Add New Voucher';
  const HeaderIcon = activeConfig ? activeConfig.icon : MdReceipt;

  const renderSortIndicator = (field: string) => {
    if (sortField !== field) {
      return <span className="text-[10px] text-gray-400 opacity-40 group-hover:opacity-100 transition">↕</span>;
    }
    return (
      <span className="text-[10px] text-primary font-bold">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 relative text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <HeaderIcon className="text-primary text-2xl" />
            <span>{pageTitle}</span>
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            {pageSubtitle}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(addRoute)}
            className="flex items-center justify-center rounded-lg bg-primary py-2 px-4 text-xs font-bold text-white hover:bg-opacity-90 transition duration-150 shadow-sm cursor-pointer"
          >
            {addLabel}
          </button>
        </div>
      </div>

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded border border-stroke py-1 px-2 bg-transparent dark:border-strokedark outline-none text-xs font-semibold text-black dark:text-white"
            >
              {[10, 25, 50, 100].map((size: number) => (
                <option key={size} value={size} className="dark:bg-boxdark">{size}</option>
              ))}
            </select>
            <span>entries</span>
          </div>
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto text-gray-500 dark:text-gray-400">
            <span>Search:</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search voucher slip, party, account..."
              className="w-full sm:w-64 rounded border border-stroke py-1.5 px-3 bg-transparent dark:border-strokedark outline-none text-xs text-black dark:text-white"
            />
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4 text-xs font-bold uppercase tracking-wider text-black dark:text-white border-b border-stroke dark:border-strokedark">
                <th className="py-4 px-4 font-semibold w-16 text-center">S#</th>
                <th
                  onClick={() => handleSort('voucher_no')}
                  className="py-4 px-4 font-semibold w-36 cursor-pointer select-none hover:text-primary transition group"
                  title="Click to sort by Voucher Slip No"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Voucher Slip No</span>
                    {renderSortIndicator('voucher_no')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('voucher_type')}
                  className="py-4 px-4 font-semibold w-48 cursor-pointer select-none hover:text-primary transition group"
                  title="Click to sort by Classification Type"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Classification Type</span>
                    {renderSortIndicator('voucher_type')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('account_title')}
                  className="py-4 px-4 font-semibold cursor-pointer select-none hover:text-primary transition group"
                  title="Click to sort by Description Note / Accounts"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Description Note / Accounts</span>
                    {renderSortIndicator('account_title')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_amount')}
                  className="py-4 px-4 font-semibold text-right w-36 cursor-pointer select-none hover:text-primary transition group"
                  title="Click to sort by Total Amount"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Amount</span>
                    {renderSortIndicator('total_amount')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('voucher_date')}
                  className="py-4 px-4 font-semibold text-center w-36 cursor-pointer select-none hover:text-primary transition group"
                  title="Click to sort by Voucher Date"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Voucher Date</span>
                    {renderSortIndicator('voucher_date')}
                  </div>
                </th>
                <th className="py-4 px-4 font-semibold text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><Spinner /></td></tr>
              ) : paginatedVouchers.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No transaction voucher slips documented inside this module history.</td></tr>
              ) : (
                paginatedVouchers.map((v, idx) => {
                  const serialNumber = startIndex + idx + 1;
                  const isOB = String(v.voucher_no || '').toUpperCase().startsWith('OB-') ||
                    String(v.voucher_type || '').toLowerCase().includes('opening balance') ||
                    String(v.narration || '').toLowerCase().includes('opening balance') ||
                    String(v.notes || '').toLowerCase().includes('opening balance');
                  return (
                    <tr key={v.id} className="border-b border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/10 duration-150">
                      <td className="py-3.5 px-4 font-medium text-black dark:text-white text-center">{serialNumber}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-primary tracking-wide">{v.voucher_no}</td>
                      <td className="py-3.5 px-4">
                        {(() => {
                          if (activeConfig) {
                            return (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${activeConfig.badgeClass}`}>
                                <HeaderIcon size={11} /> {isOB ? 'Opening Balance' : activeConfig.badgeLabel}
                              </span>
                            );
                          }
                          const isJV = v.voucher_type === 'Journal Voucher' || v.voucher_type === 'JV';
                          const isReceipt = v.voucher_type?.includes('Receipt') || v.voucher_type === 'CRV' || v.voucher_type === 'BRV';
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]
                              ${isJV ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600' :
                                isReceipt ? 'bg-success/10 text-success' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'}`}>
                              <MdAssignment size={11} /> {isJV ? (isOB ? 'Opening Balance' : 'Journal Voucher') : v.voucher_type}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400 font-medium max-w-xs">
                        <div className="flex flex-col gap-0.5">
                          {(v.account_title || v.account_code) && (
                            <div className="text-[11px] font-bold text-black dark:text-white">
                              {v.account_title || v.account_code} {v.debit > 0 ? `(Dr: ${Number(v.debit).toLocaleString()})` : v.credit > 0 ? `(Cr: ${Number(v.credit).toLocaleString()})` : ''}
                            </div>
                          )}
                          {!isOB && v.items && v.items.filter((it: any) => it.accountCode !== '3010-001').map((item: any, itIdx: number) => {
                            const amountStr = item.debit > 0 ? `(Dr: ${Number(item.debit).toLocaleString()})` : `(Cr: ${Number(item.credit).toLocaleString()})`;
                            return (
                              <div key={itIdx} className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                <span className="font-bold text-black dark:text-white">{item.accountCode}</span> {amountStr}
                              </div>
                            );
                          })}
                          {(v.notes || v.narration) && (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 border-t border-stroke dark:border-strokedark mt-1 pt-0.5 italic">
                              Note: {v.notes || v.narration}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-black dark:text-white font-mono">
                        {Number(v.total_amount || v.debit || v.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center text-gray-500 font-medium">{v.voucher_date}</td>
                      <td className="py-3.5 px-4 text-center">
                        <TableActions
                          onEdit={() => {
                            const targetEditRoute = activeConfig ? activeConfig.addRoute : '/Registration/Vouchers/Add';
                            navigate(`${targetEditRoute}?id=${v.id}`, { state: { voucher: v } });
                          }}
                          onDelete={isOB ? undefined : () => handleDeleteVoucher(v)}
                          canDelete={!isOB}
                          editTitle="View or Edit Voucher"
                          deleteTitle={isOB ? 'Opening balance vouchers cannot be deleted' : 'Delete Voucher'}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={totalEntries}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          itemName="entries"
        />
      </div>
    </div>
  );
}

export default VoucherList;
