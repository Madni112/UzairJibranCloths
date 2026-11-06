import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import AccountCombobox from '../../../components/AccountCombobox';
import {
  MdReceiptLong,
  MdCompareArrows,
  MdShoppingCart,
  MdAssignmentReturn,
  MdAccountBalanceWallet,
  MdPayments,
  MdTrendingDown,
  MdPerson,
  MdCorporateFare,
  MdPhone,
  MdLocationOn,
  MdCheckCircle,
  MdOutlineReceipt,
  MdCalendarToday,
  MdArrowForward,
  MdAccountBalance
} from 'react-icons/md';

export interface AddVoucherProps {
  voucherTypePreset?: 'SAV' | 'SRV' | 'CRV' | 'PAV' | 'PRV' | 'VPV' | 'EXP' | string;
}

interface PresetMeta {
  title: string;
  prefix: string;
  typeName: string;
  listRoute: string;
  isSingleRow: boolean;
  defaultDebitOrCredit: 'Debit' | 'Credit';
  amountLabel: string;
  partyLabel: string;
  descPlaceholder: string;
  badgeColor: string;
  badgeBg: string;
}

const PRESET_DEFINITIONS: Record<string, PresetMeta> = {
  SAV: {
    title: 'Sale Amount Voucher',
    prefix: 'SAV',
    typeName: 'Sale Amount Voucher',
    listRoute: '/Vouchers/Sale-Amount',
    isSingleRow: true,
    defaultDebitOrCredit: 'Debit',
    amountLabel: 'Sale Amount (PKR)',
    partyLabel: 'Customer Account',
    descPlaceholder: 'e.g. Sale of 50 thaan Latha / Bill # 104',
    badgeColor: 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/50'
  },
  SRV: {
    title: 'Sale Amount Return',
    prefix: 'SRV',
    typeName: 'Sale Amount Return',
    listRoute: '/Vouchers/Sale-Return',
    isSingleRow: true,
    defaultDebitOrCredit: 'Credit',
    amountLabel: 'Return Credit Amount (PKR)',
    partyLabel: 'Customer Account',
    descPlaceholder: 'e.g. Return of 10 thaan defective cloth',
    badgeColor: 'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/50'
  },
  CRV: {
    title: 'Customer Receive Voucher',
    prefix: 'CRV',
    typeName: 'Customer Receive Voucher',
    listRoute: '/Vouchers/Customer-Receive',
    isSingleRow: false,
    defaultDebitOrCredit: 'Credit',
    amountLabel: 'Received Amount (PKR)',
    partyLabel: 'Customer Account',
    descPlaceholder: 'e.g. Cash / Bank receipt on account',
    badgeColor: 'text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/50'
  },
  PAV: {
    title: 'Purchase Amount Voucher',
    prefix: 'PAV',
    typeName: 'Purchase Amount Voucher',
    listRoute: '/Vouchers/Purchase-Amount',
    isSingleRow: true,
    defaultDebitOrCredit: 'Credit',
    amountLabel: 'Purchase Amount (PKR)',
    partyLabel: 'Vendor / Supplier Account',
    descPlaceholder: 'e.g. Purchase from mill / weaving invoice # 205',
    badgeColor: 'text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/50'
  },
  PRV: {
    title: 'Purchase Amount Return',
    prefix: 'PRV',
    typeName: 'Purchase Amount Return',
    listRoute: '/Vouchers/Purchase-Return',
    isSingleRow: true,
    defaultDebitOrCredit: 'Debit',
    amountLabel: 'Return Debit Amount (PKR)',
    partyLabel: 'Vendor / Supplier Account',
    descPlaceholder: 'e.g. Return of damaged thaan to supplier',
    badgeColor: 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/50'
  },
  VPV: {
    title: 'Vendor Payment Voucher',
    prefix: 'VPV',
    typeName: 'Vendor Payment Voucher',
    listRoute: '/Vouchers/Vendor-Payment',
    isSingleRow: false,
    defaultDebitOrCredit: 'Debit',
    amountLabel: 'Paid Amount (PKR)',
    partyLabel: 'Vendor / Supplier Account',
    descPlaceholder: 'e.g. Payment disbursed to mill / vendor',
    badgeColor: 'text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/50'
  },
  EXP: {
    title: 'Expense Voucher',
    prefix: 'EXP',
    typeName: 'Expense Voucher',
    listRoute: '/Vouchers/Expense',
    isSingleRow: false,
    defaultDebitOrCredit: 'Debit',
    amountLabel: 'Expense Amount (PKR)',
    partyLabel: 'Expense Head',
    descPlaceholder: 'e.g. Shop rent, electricity bill, tea, carriage',
    badgeColor: 'text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/50'
  }
};

const normalizeVoucherType = (type?: string) => {
  if (!type) return '';
  const t = type.trim();
  if (t === 'JV' || t.toLowerCase().includes('journal')) return 'Journal Voucher';
  if (t === 'CPV' || t.toLowerCase().includes('cash payment')) return 'Cash Payment Voucher';
  if (t === 'CRV' || t.toLowerCase().includes('cash receipt')) return 'Cash Receipt Voucher';
  if (t === 'BPV' || t.toLowerCase().includes('bank payment')) return 'Bank Payment Voucher';
  if (t === 'BRV' || t.toLowerCase().includes('bank receipt')) return 'Bank Receipt Voucher';
  return t;
};

interface PartyMetadata {
  code: string;
  name: string;
  type: string;
  phone: string;
  city: string;
  address: string;
  currentBalance: number;
  balanceNature: string;
}

function AddVoucher({ voucherTypePreset }: AddVoucherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const activePreset = (voucherTypePreset || searchParams.get('type') || '').toUpperCase();
  const presetMeta = PRESET_DEFINITIONS[activePreset];

  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(true);

  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  const [partiesMap, setPartiesMap] = useState<Record<string, PartyMetadata>>({});
  const [fetchedVoucher, setFetchedVoucher] = useState<any>(null);
  const [nextVoucherNo, setNextVoucherNo] = useState<string>('VCH-001');

  const editData = location.state?.voucher || fetchedVoucher;
  const isEditMode = !!editData;

  const isOpeningBalance = isEditMode && (
    String(editData?.voucher_no || '').startsWith('OB-') ||
    String(editData?.narration || '').toLowerCase().includes('opening balance') ||
    String(editData?.notes || '').toLowerCase().includes('opening balance')
  );

  const isSingleRowMode = presetMeta ? presetMeta.isSingleRow : isOpeningBalance;
  const isTwoPartyMode = activePreset === 'CRV' || activePreset === 'VPV' || activePreset === 'EXP';

  useEffect(() => {
    const fetchVoucherMetadata = async () => {
      try {
        setMetadataLoading(true);

        let currentVoucher = location.state?.voucher;
        const queryId = searchParams.get('id');
        if (!currentVoucher && queryId) {
          const { data: vDb } = await supabase
            .from('financial_vouchers')
            .select('*')
            .eq('id', queryId)
            .maybeSingle();
          if (vDb) {
            currentVoucher = vDb;
            setFetchedVoucher(vDb);
          }
        }

        const [coaRes, bankRes, vendRes, custRes, vchRes] = await Promise.all([
          supabase.from('chart_of_accounts').select('*').order('account_code', { ascending: true }),
          supabase.from('banks').select('*'),
          supabase.from('vendors').select('*'),
          supabase.from('customers').select('*'),
          supabase.from('financial_vouchers').select('id, voucher_no, account_code, total_amount, debit, credit, items')
        ]);

        const accountDetails: Record<string, any> = {};
        const pMap: Record<string, PartyMetadata> = {};

        // Pre-aggregate voucher debits and credits per account code
        const coaDebits: Record<string, number> = {};
        const coaCredits: Record<string, number> = {};

        if (vchRes.data && Array.isArray(vchRes.data)) {
          vchRes.data.forEach((v: any) => {
            // Exclude current voucher when in edit mode so Previous Balance reflects prior state
            if (queryId && String(v.id) === String(queryId)) return;

            if (v.items && Array.isArray(v.items) && v.items.length > 0) {
              v.items.forEach((it: any) => {
                const code = String(it.accountCode || it.account_code || '').trim();
                if (code) {
                  coaDebits[code] = (coaDebits[code] || 0) + (Number(it.debit) || 0);
                  coaCredits[code] = (coaCredits[code] || 0) + (Number(it.credit) || 0);
                }
              });
            } else if (v.account_code) {
              const code = String(v.account_code).trim();
              const d = Number(v.debit) || (v.credit ? 0 : Number(v.total_amount)) || 0;
              const c = Number(v.credit) || 0;
              coaDebits[code] = (coaDebits[code] || 0) + d;
              coaCredits[code] = (coaCredits[code] || 0) + c;
            }
          });
        }

        // 1. Chart of Accounts
        if (coaRes.data && Array.isArray(coaRes.data)) {
          coaRes.data.forEach((a: any) => {
            if (a.account_code) {
              const code = String(a.account_code).trim();
              let inferredType = a.account_type;
              if (!inferredType) {
                if (code.startsWith('2020-')) inferredType = 'Customer';
                else if (code.startsWith('2010-')) inferredType = 'Vendor';
                else if (code.startsWith('1010-')) inferredType = 'Cash';
                else if (code.startsWith('5')) inferredType = 'Expense';
                else inferredType = 'General Ledger';
              }
              const nature = a.balance_nature || (code.startsWith('5') || code.startsWith('1') ? 'Debit' : 'Credit');
              const opBal = Number(a.opening_balance || 0);
              const d = coaDebits[code] || 0;
              const c = coaCredits[code] || 0;
              const computedBal = nature.toLowerCase() === 'credit'
                ? opBal + (c - d)
                : opBal + (d - c);

              accountDetails[code] = {
                account_code: code,
                account_title: a.account_title || `Account ${code}`,
                account_type: inferredType,
                balance_nature: nature
              };
              pMap[code] = {
                code,
                name: a.account_title || code,
                type: inferredType,
                phone: '',
                city: '',
                address: '',
                currentBalance: computedBal,
                balanceNature: nature
              };
            }
          });
        }

        // 2. Customers
        if (custRes.data && Array.isArray(custRes.data)) {
          custRes.data.forEach((c: any) => {
            const code = String(c.customer_code || c.customerCode || c.account_code || c.coa_code || '').trim();
            const rawBal = Number(c.currentBalance !== undefined && c.currentBalance !== null && c.currentBalance !== ''
              ? c.currentBalance
              : (c.balance !== undefined && c.balance !== null && c.balance !== '' ? c.balance : c.opening_balance || 0));
            const phone = c.primaryPhone || c.phone || c.mobile || '';
            const city = c.city || c.area || '';
            const address = c.address || '';

            if (code) {
              const partyObj: PartyMetadata = {
                code,
                name: c.customerName || c.customer_name || `Customer ${code}`,
                type: 'Customer',
                phone,
                city,
                address,
                currentBalance: rawBal,
                balanceNature: String(c.balance_nature || 'Debit')
              };
              accountDetails[code] = {
                account_code: code,
                account_title: partyObj.name,
                account_type: 'Customer',
                balance_nature: 'Debit'
              };
              pMap[code] = partyObj;
              if (c.account_code) pMap[String(c.account_code).trim()] = partyObj;
              if (c.customer_code) pMap[String(c.customer_code).trim()] = partyObj;
              if (c.customerCode) pMap[String(c.customerCode).trim()] = partyObj;
              if (c.coa_code) pMap[String(c.coa_code).trim()] = partyObj;
            }
          });
        }

        // 3. Vendors
        if (vendRes.data && Array.isArray(vendRes.data)) {
          vendRes.data.forEach((v: any) => {
            const code = String(v.vendor_code || v.vendorCode || v.account_code || '').trim();
            const rawBal = Number(v.currentBalance !== undefined && v.currentBalance !== null && v.currentBalance !== ''
              ? v.currentBalance
              : (v.current_balance !== undefined && v.current_balance !== null
                ? v.current_balance
                : (v.balance !== undefined && v.balance !== null ? v.balance : v.opening_balance || 0)));
            const phone = v.phone || v.cell_no || v.phone_no || '';
            const city = v.city || '';
            const address = v.address || '';

            if (code) {
              const vendObj: PartyMetadata = {
                code,
                name: v.vendor_name || v.name || `Vendor ${code}`,
                type: 'Vendor',
                phone,
                city,
                address,
                currentBalance: rawBal,
                balanceNature: String(v.balance_nature || 'Credit')
              };
              accountDetails[code] = {
                account_code: code,
                account_title: vendObj.name,
                account_type: 'Vendor',
                balance_nature: 'Credit'
              };
              pMap[code] = vendObj;
              if (v.account_code) pMap[String(v.account_code).trim()] = vendObj;
              if (v.vendor_code) pMap[String(v.vendor_code).trim()] = vendObj;
              if (v.vendorCode) pMap[String(v.vendorCode).trim()] = vendObj;
            }
          });
        }

        // 4. Banks
        if (bankRes.data && Array.isArray(bankRes.data)) {
          bankRes.data.forEach((b: any) => {
            const code = String(b.accountNumber || b.id).trim();
            const netBal = Number(b.netBalance ?? b.openingBalance ?? 0);
            if (!accountDetails[code]) {
              accountDetails[code] = {
                account_code: code,
                account_title: `${b.bankName || 'Bank'} (${b.accountTitle || code})`,
                account_type: 'Bank Account',
                balance_nature: 'Debit'
              };
            }
            pMap[code] = {
              code,
              name: `${b.bankName || 'Bank'} (${b.accountTitle || code})`,
              type: 'Bank Account',
              phone: '',
              city: '',
              address: b.accountTitle || '',
              currentBalance: netBal,
              balanceNature: 'Debit'
            };
          });
        }

        // 5. Ensure Cash in Hand
        if (!accountDetails['1010-001']) {
          accountDetails['1010-001'] = {
            account_code: '1010-001',
            account_title: 'Cash in Hand (دکان کا کیش)',
            account_type: 'Cash',
            balance_nature: 'Debit'
          };
          pMap['1010-001'] = {
            code: '1010-001',
            name: 'Cash in Hand (دکان کا کیش)',
            type: 'Cash',
            phone: '',
            city: '',
            address: 'Counter Cash Drawer',
            currentBalance: 0,
            balanceNature: 'Debit'
          };
        }

        setPartiesMap(pMap);

        const mergedList = Object.values(accountDetails).sort((a, b) =>
          a.account_code.localeCompare(b.account_code)
        );
        setAllAccounts(mergedList);

        // Sequence calculation
        const targetPrefix = presetMeta ? presetMeta.prefix : 'VCH';
        try {
          const { data: vchRecords } = await supabase
            .from('financial_vouchers')
            .select('voucher_no');

          let highestSeq = 0;
          if (vchRecords && Array.isArray(vchRecords)) {
            const regex = new RegExp(`^${targetPrefix}-(\\d+)`, 'i');
            vchRecords.forEach((v: any) => {
              const rawNo = String(v.voucher_no || '').trim();
              const match = rawNo.match(regex);
              if (match && match[1]) {
                const parsed = parseInt(match[1], 10);
                if (parsed > highestSeq) highestSeq = parsed;
              }
            });
          }
          const seqFormatted = `${targetPrefix}-${String(highestSeq + 1).padStart(3, '0')}`;
          setNextVoucherNo(seqFormatted);
        } catch (seqErr) {
          console.warn('Voucher sequence calculation note:', seqErr);
        }
      } catch (err: any) {
        toast.error('Failed to load metadata: ' + err.message);
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchVoucherMetadata();
  }, [activePreset]);

  // Account filtering helper per preset and row
  const getFilteredAccounts = (rowIndex: number) => {
    if (!presetMeta) return allAccounts;

    if (activePreset === 'SAV' || activePreset === 'SRV') {
      return allAccounts.filter(
        (a) => a.account_code.startsWith('2020-') || a.account_type === 'Customer'
      );
    }

    if (activePreset === 'PAV' || activePreset === 'PRV') {
      return allAccounts.filter(
        (a) => a.account_code.startsWith('2010-') || a.account_type === 'Vendor'
      );
    }

    if (activePreset === 'CRV') {
      if (rowIndex === 0) {
        return allAccounts.filter(
          (a) => a.account_code.startsWith('1010-') || a.account_type === 'Cash' || a.account_type === 'Bank Account'
        );
      }
      return allAccounts.filter(
        (a) => a.account_code.startsWith('2020-') || a.account_type === 'Customer'
      );
    }

    if (activePreset === 'VPV') {
      if (rowIndex === 0) {
        return allAccounts.filter(
          (a) => a.account_code.startsWith('2010-') || a.account_type === 'Vendor'
        );
      }
      return allAccounts.filter(
        (a) => a.account_code.startsWith('1010-') || a.account_type === 'Cash' || a.account_type === 'Bank Account'
      );
    }

    if (activePreset === 'EXP') {
      if (rowIndex === 0) {
        return allAccounts.filter(
          (a) => a.account_code.startsWith('5') || a.account_type === 'Expense'
        );
      }
      return allAccounts.filter(
        (a) => a.account_code.startsWith('1010-') || a.account_type === 'Cash' || a.account_type === 'Bank Account'
      );
    }

    return allAccounts;
  };

  const buildInitialItems = () => {
    if (editData) {
      if (editData.items && Array.isArray(editData.items) && editData.items.length > 0) {
        return editData.items.filter((it: any) => it.accountCode !== '3010-001').map((it: any) => ({
          accountCode: it.accountCode || it.account_code || '',
          description: it.description !== undefined ? it.description : (editData.metadata?.particulars || (String(editData.narration || '').split(' | ')[0]) || ''),
          debit: Number(it.debit || 0),
          credit: Number(it.credit || 0)
        }));
      }
      const d = Number(editData.debit) || (editData.credit ? 0 : Number(editData.total_amount)) || 0;
      const c = Number(editData.credit) || 0;
      const parts = String(editData.narration || '').split(' | ');
      const desc = editData.metadata?.particulars !== undefined
        ? editData.metadata.particulars
        : (parts.length > 1 ? parts[0] : (editData.narration || ''));
      return [
        { accountCode: editData.account_code || '', description: desc, debit: d, credit: c }
      ];
    }

    if (presetMeta && presetMeta.isSingleRow) {
      return [
        { accountCode: '', description: '', debit: 0, credit: 0 }
      ];
    }

    if (activePreset === 'CRV') {
      return [
        { accountCode: '1010-001', description: 'Cash received from customer', debit: 0, credit: 0 },
        { accountCode: '', description: 'Payment on account', debit: 0, credit: 0 }
      ];
    }

    if (activePreset === 'VPV') {
      return [
        { accountCode: '', description: 'Vendor payment', debit: 0, credit: 0 },
        { accountCode: '1010-001', description: 'Cash disbursed to vendor', debit: 0, credit: 0 }
      ];
    }

    if (activePreset === 'EXP') {
      return [
        { accountCode: '5020-001', description: 'Shop expense', debit: 0, credit: 0 },
        { accountCode: '1010-001', description: 'Paid via cash', debit: 0, credit: 0 }
      ];
    }

    return [
      { accountCode: '', description: '', debit: 0, credit: 0 },
      { accountCode: '', description: '', debit: 0, credit: 0 }
    ];
  };

  const validationSchema = Yup.object().shape({
    voucherType: Yup.string().required('Please select a voucher type'),
    voucherDate: Yup.string().required('Transaction Date is required'),
    items: Yup.array().of(
      Yup.object().shape({
        accountCode: Yup.string().required('Account is required'),
        debit: Yup.number().min(0),
        credit: Yup.number().min(0),
      })
    ).min(isSingleRowMode ? 1 : 2, isSingleRowMode ? 'At least 1 row required' : 'Voucher entries require at least 2 balanced row lines')
  });

  const blockInvalidChar = (e: React.KeyboardEvent<HTMLInputElement>) =>
    ['-', 'e', 'E', '+'].includes(e.key) && e.preventDefault();

  if (metadataLoading) {
    return <div className="flex h-48 items-center justify-center"><Spinner /></div>;
  }

  const pageTitle = presetMeta ? presetMeta.title : 'General Journal Voucher';
  const listReturnRoute = presetMeta ? presetMeta.listRoute : '/Registration/Vouchers/List';

  return (
    <div className="mx-auto max-w-7xl text-xs space-y-5 pb-12">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-2xs border ${presetMeta ? presetMeta.badgeBg : 'bg-indigo-50 dark:bg-indigo-950/60'} ${presetMeta ? presetMeta.badgeColor : 'text-indigo-600 border-indigo-200'}`}>
            {activePreset === 'SAV' && <MdReceiptLong size={24} />}
            {activePreset === 'SRV' && <MdCompareArrows size={24} />}
            {activePreset === 'CRV' && <MdPayments size={24} />}
            {activePreset === 'PAV' && <MdShoppingCart size={24} />}
            {activePreset === 'PRV' && <MdAssignmentReturn size={24} />}
            {activePreset === 'VPV' && <MdAccountBalanceWallet size={24} />}
            {activePreset === 'EXP' && <MdTrendingDown size={24} />}
            {!presetMeta && <MdOutlineReceipt size={24} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {isEditMode ? `Modify ${pageTitle}: ${editData.voucher_no}` : `Create New ${pageTitle}`}
              </h2>
              {presetMeta && (
                <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-full border ${presetMeta.badgeBg} ${presetMeta.badgeColor}`}>
                  {presetMeta.prefix}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {presetMeta ? presetMeta.descPlaceholder : 'General ledger debit/credit posting'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate(listReturnRoute)}
          className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 transition cursor-pointer self-start sm:self-auto"
        >
          ← Back to List
        </button>
      </div>

      <Formik
        initialValues={{
          voucherNo: editData?.voucher_no || nextVoucherNo,
          voucherType: editData?.voucher_type ? normalizeVoucherType(editData.voucher_type) : (presetMeta ? presetMeta.typeName : 'Journal Voucher'),
          voucherDate: editData?.voucher_date || new Date().toISOString().split('T')[0],
          notes: (() => {
            if (!editData) return '';
            if (editData.metadata?.notes !== undefined) return String(editData.metadata.notes);
            const parts = String(editData.narration || '').split(' | ');
            if (parts.length > 1) return parts.slice(1).join(' | ');
            return '';
          })(),
          items: buildInitialItems()
        }}
        enableReinitialize={true}
        validationSchema={validationSchema}
        onSubmit={async (values) => {
          let sumDebits = 0;
          let sumCredits = 0;

          values.items.forEach((item: any) => {
            sumDebits += Number(item.debit) || 0;
            sumCredits += Number(item.credit) || 0;
          });

          // Single row entry validation
          if (isSingleRowMode) {
            const primaryItem = values.items[0];
            const enteredAmt = Number(primaryItem.debit) || Number(primaryItem.credit) || 0;
            if (enteredAmt <= 0) {
              toast.error('Please enter a valid amount greater than 0.');
              return;
            }
          } else {
            if (sumDebits.toFixed(2) !== sumCredits.toFixed(2) || sumDebits <= 0) {
              toast.error(`Unbalanced Entry! Total Debit (${sumDebits.toFixed(2)}) must match Total Credit (${sumCredits.toFixed(2)}).`);
              return;
            }
          }

          try {
            setLoading(true);
            const firstItem = values.items[0] || {};
            const firstAcc = allAccounts.find((a: any) => a.account_code === firstItem.accountCode);

            let effectiveDebit = Number(firstItem.debit) || 0;
            let effectiveCredit = Number(firstItem.credit) || 0;

            if (activePreset === 'SAV') {
              const amt = effectiveDebit || effectiveCredit;
              effectiveDebit = amt;
              effectiveCredit = 0;
            } else if (activePreset === 'SRV') {
              const amt = effectiveDebit || effectiveCredit;
              effectiveDebit = 0;
              effectiveCredit = amt;
            } else if (activePreset === 'PAV') {
              const amt = effectiveDebit || effectiveCredit;
              effectiveDebit = 0;
              effectiveCredit = amt;
            } else if (activePreset === 'PRV') {
              const amt = effectiveDebit || effectiveCredit;
              effectiveDebit = amt;
              effectiveCredit = 0;
            }

            const effectiveTotal = isSingleRowMode
              ? (effectiveDebit > 0 ? effectiveDebit : effectiveCredit)
              : sumDebits;

            const isCust = activePreset === 'SAV' || activePreset === 'SRV' || activePreset === 'CRV' || (firstItem.accountCode && String(firstItem.accountCode).startsWith('2020'));
            const isVend = activePreset === 'PAV' || activePreset === 'PRV' || activePreset === 'VPV' || (firstItem.accountCode && String(firstItem.accountCode).startsWith('2010'));

            // Extract particulars (bill # / thaan ref) and notes
            const primaryItemIdx = activePreset === 'CRV' ? 1 : 0;
            const primaryItem = values.items[primaryItemIdx] || values.items[0] || {};
            const particularsText = String(primaryItem.description || '').trim();
            const notesText = String(values.notes || '').trim();

            let finalNarration = '';
            if (particularsText && notesText && particularsText !== notesText) {
              finalNarration = `${particularsText} | ${notesText}`;
            } else if (particularsText) {
              finalNarration = particularsText;
            } else if (notesText) {
              finalNarration = notesText;
            } else {
              finalNarration = `${values.voucherType} for ${firstAcc?.account_title || firstItem.accountCode}`;
            }

            const databasePayload: any = {
              voucher_no: values.voucherNo,
              voucher_type: values.voucherType,
              voucher_date: values.voucherDate,
              narration: finalNarration,
              total_amount: effectiveTotal,
              items: values.items,
              account_code: firstItem.accountCode || editData?.account_code || '',
              account_title: firstAcc?.account_title || editData?.account_title || '',
              debit: isSingleRowMode ? effectiveDebit : sumDebits,
              credit: isSingleRowMode ? effectiveCredit : sumCredits,
              original_invoice_no: particularsText || editData?.original_invoice_no || null,
              metadata: {
                ...(editData?.metadata || {}),
                preset: activePreset,
                party_type: isCust ? 'customer' : isVend ? 'vendor' : 'general',
                party_code: firstItem.accountCode || editData?.account_code || '',
                party_name: firstAcc?.account_title || editData?.account_title || '',
                particulars: particularsText,
                notes: notesText
              }
            };

            const executeSave = async (payloadToTry: any) => {
              if (isEditMode) {
                return await supabase
                  .from('financial_vouchers')
                  .update(payloadToTry)
                  .eq('id', editData.id);
              } else {
                return await supabase
                  .from('financial_vouchers')
                  .insert([payloadToTry]);
              }
            };

            let saveResult = await executeSave(databasePayload);

            if (saveResult.error && (saveResult.error.code === 'PGRST204' || saveResult.error.message?.includes('schema cache'))) {
              const fallbackPayload = { ...databasePayload };
              for (let attempt = 0; attempt < 5 && saveResult.error; attempt++) {
                const errMsg = saveResult.error.message || '';
                const colMatch = errMsg.match(/Could not find the '([^']+)' column/i);
                if (colMatch && colMatch[1]) {
                  delete fallbackPayload[colMatch[1]];
                  saveResult = await executeSave(fallbackPayload);
                } else {
                  break;
                }
              }
            }

            if (saveResult.error) throw saveResult.error;

            // Two-Way Live Balance Sync
            try {
              // Synchronize Opening Balance voucher changes back to Customer Profile
              const vNumStr = String(values.voucherNo || editData?.voucher_no || '').trim().toUpperCase();
              const isOBVoucher = vNumStr.startsWith('OB-') || String(values.notes || '').toLowerCase().includes('opening balance') || String(editData?.narration || '').toLowerCase().includes('opening balance');
              
              if (isOBVoucher) {
                const targetCode = (firstItem.accountCode || editData?.account_code || '').trim();
                const targetTitle = (firstAcc?.account_title || editData?.account_title || '').trim();
                
                if (targetCode || targetTitle) {
                  let custQuery = supabase.from('customers').select('id, balance, currentBalance, opening_balance');
                  if (targetCode && targetTitle) {
                    custQuery = custQuery.or(`customer_code.eq.${targetCode},account_code.eq.${targetCode},customerCode.eq.${targetCode},customerName.eq.${targetTitle}`);
                  } else if (targetCode) {
                    custQuery = custQuery.or(`customer_code.eq.${targetCode},account_code.eq.${targetCode},customerCode.eq.${targetCode}`);
                  } else {
                    custQuery = custQuery.eq('customerName', targetTitle);
                  }
                  
                  const { data: matchedCust } = await custQuery.maybeSingle();
                  if (matchedCust) {
                    const custUpdate: any = {};
                    if (effectiveTotal > 0) {
                      custUpdate.opening_balance = effectiveTotal;
                      custUpdate.balance = effectiveTotal;
                      custUpdate.currentBalance = effectiveTotal;
                    }
                    if (Object.keys(custUpdate).length > 0) {
                      await supabase.from('customers').update(custUpdate).eq('id', matchedCust.id);
                    }
                  }
                }
              }

              if (activePreset === 'SAV' || activePreset === 'SRV' || activePreset === 'CRV') {
                const custItem = values.items.find((it: any) => (it.accountCode || '').startsWith('2020-'));
                if (custItem) {
                  const custCode = custItem.accountCode.trim();
                  const amt = effectiveTotal;
                  const { data: cData } = await supabase
                    .from('customers')
                    .select('id, balance, currentBalance')
                    .or(`customer_code.eq.${custCode},account_code.eq.${custCode}`)
                    .maybeSingle();

                  if (cData) {
                    const curBal = Number(cData.currentBalance ?? cData.balance ?? 0);
                    let newBal = curBal;
                    if (activePreset === 'SAV') {
                      newBal = curBal + amt;
                    } else if (activePreset === 'SRV' || activePreset === 'CRV') {
                      newBal = curBal - amt;
                    }
                    await supabase
                      .from('customers')
                      .update({ balance: newBal, currentBalance: newBal })
                      .eq('id', cData.id);
                  }
                }
              }

              if (activePreset === 'PAV' || activePreset === 'PRV' || activePreset === 'VPV') {
                const vendItem = values.items.find((it: any) => (it.accountCode || '').startsWith('2010-'));
                if (vendItem) {
                  const vendCode = vendItem.accountCode.trim();
                  const amt = effectiveTotal;
                  const { data: vData } = await supabase
                    .from('vendors')
                    .select('id, balance, currentBalance, current_balance')
                    .eq('vendor_code', vendCode)
                    .maybeSingle();

                  if (vData) {
                    const curBal = Number(vData.currentBalance ?? vData.current_balance ?? vData.balance ?? 0);
                    let newBal = curBal;
                    if (activePreset === 'PAV') {
                      newBal = curBal + amt;
                    } else if (activePreset === 'PRV' || activePreset === 'VPV') {
                      newBal = curBal - amt;
                    }
                    await supabase
                      .from('vendors')
                      .update({ balance: newBal, currentBalance: newBal, current_balance: newBal })
                      .eq('id', vData.id);
                  }
                }
              }
            } catch (syncErr) {
              console.warn('Customer/Vendor balance sync note:', syncErr);
            }

            toast.success(isEditMode ? 'Voucher updated successfully!' : 'Voucher recorded successfully!');
            navigate(listReturnRoute);
          } catch (err: any) {
            toast.error(err.message || 'Failed to save voucher');
          } finally {
            setLoading(false);
          }
        }}
      >
        {({ handleChange, values, setFieldValue }) => {
          // Identify Primary Party from items
          let primaryPartyCode = '';
          let primaryItemIndex = 0;

          if (isSingleRowMode) {
            primaryPartyCode = values.items[0]?.accountCode || '';
            primaryItemIndex = 0;
          } else if (activePreset === 'CRV') {
            primaryPartyCode = values.items[1]?.accountCode || '';
            primaryItemIndex = 1;
          } else if (activePreset === 'VPV') {
            primaryPartyCode = values.items[0]?.accountCode || '';
            primaryItemIndex = 0;
          } else if (activePreset === 'EXP') {
            primaryPartyCode = values.items[0]?.accountCode || '';
            primaryItemIndex = 0;
          } else {
            primaryPartyCode = values.items[0]?.accountCode || '';
          }

          const partyData = partiesMap[String(primaryPartyCode || '').trim()];

          // Amount calculation
          let currentEnteredAmount = 0;
          if (isSingleRowMode) {
            const it = values.items[0];
            currentEnteredAmount = Number(it?.debit) || Number(it?.credit) || 0;
          } else {
            const it = values.items[primaryItemIndex];
            currentEnteredAmount = Number(it?.debit) || Number(it?.credit) || 0;
          }

          // Real-time khata impact calculation
          const oldBalance = partyData ? Number(partyData.currentBalance || 0) : 0;
          let expectedNewBalance = oldBalance;
          let impactSign = '+';
          let impactDesc = 'No impact';

          if (activePreset === 'SAV') {
            impactSign = '+';
            impactDesc = 'Sale Debit (+Receivable)';
            expectedNewBalance = oldBalance + currentEnteredAmount;
          } else if (activePreset === 'SRV') {
            impactSign = '-';
            impactDesc = 'Return Credit (-Receivable)';
            expectedNewBalance = Math.max(0, oldBalance - currentEnteredAmount);
          } else if (activePreset === 'CRV') {
            impactSign = '-';
            impactDesc = 'Payment Received (-Receivable)';
            expectedNewBalance = oldBalance - currentEnteredAmount;
          } else if (activePreset === 'PAV') {
            impactSign = '+';
            impactDesc = 'Purchase Credit (+Payable)';
            expectedNewBalance = oldBalance + currentEnteredAmount;
          } else if (activePreset === 'PRV') {
            impactSign = '-';
            impactDesc = 'Return Debit (-Payable)';
            expectedNewBalance = Math.max(0, oldBalance - currentEnteredAmount);
          } else if (activePreset === 'VPV') {
            impactSign = '-';
            impactDesc = 'Payment Disbursed (-Payable)';
            expectedNewBalance = oldBalance - currentEnteredAmount;
          } else if (activePreset === 'EXP') {
            impactSign = '+';
            impactDesc = 'Expense Debit (+Expense)';
            expectedNewBalance = oldBalance + currentEnteredAmount;
          }

          // Balance Display Nature
          const isCustomer = activePreset === 'SAV' || activePreset === 'SRV' || activePreset === 'CRV' || (partyData?.type === 'Customer');
          const isVendor = activePreset === 'PAV' || activePreset === 'PRV' || activePreset === 'VPV' || (partyData?.type === 'Vendor');
          const isExpense = activePreset === 'EXP' || (partyData?.type === 'Expense');
          const balSuffix = isCustomer ? 'Dr (Receivable)' : isVendor ? 'Cr (Payable)' : isExpense ? 'Dr (Expense)' : '';

          return (
            <Form className="space-y-5">
              {/* Top Quick Meta Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs font-mono text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Voucher Slip #
                  </span>
                  <div className="font-mono font-black text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    {values.voucherNo}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Voucher Type
                  </span>
                  <div className="font-bold text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
                    {values.voucherType}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Transaction Date *
                  </span>
                  <div className="relative">
                    <input
                      type="date"
                      name="voucherDate"
                      onChange={handleChange}
                      value={values.voucherDate}
                      className="w-full font-mono font-bold text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* OPTION 1: 2-COLUMN MODERN KHATA CARD WITH LIVE IMPACT                      */}
              {/* ========================================================================= */}
              {(isSingleRowMode || isTwoPartyMode) ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  
                  {/* LEFT COLUMN: VOUCHER DETAILS & AMOUNT ENTRY (7 COLS) */}
                  <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 sm:p-6 space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                          Khata Voucher Details
                        </h3>
                      </div>
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                        Step 1 &bull; Entry
                      </span>
                    </div>

                    {/* Field 1: Party Account Selection */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        {presetMeta?.partyLabel || 'Select Account'} *
                      </label>
                      <AccountCombobox
                        accounts={getFilteredAccounts(primaryItemIndex)}
                        value={String(values.items[primaryItemIndex]?.accountCode || '')}
                        onChange={(selectedCode) => {
                          setFieldValue(`items.${primaryItemIndex}.accountCode`, selectedCode);
                        }}
                      />
                    </div>

                    {/* Optional Second Account for CRV / VPV / EXP (Cash or Bank) */}
                    {isTwoPartyMode && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <MdAccountBalanceWallet className="text-emerald-600" />
                          <span>
                            {activePreset === 'CRV' ? 'Deposit Into (Cash or Bank Account) *' :
                             activePreset === 'VPV' ? 'Paid From (Cash or Bank Account) *' :
                             'Paid From (Cash or Bank Account) *'}
                          </span>
                        </label>
                        <AccountCombobox
                          accounts={getFilteredAccounts(primaryItemIndex === 0 ? 1 : 0)}
                          value={String(values.items[primaryItemIndex === 0 ? 1 : 0]?.accountCode || '')}
                          onChange={(selectedCode) => {
                            setFieldValue(`items.${primaryItemIndex === 0 ? 1 : 0}.accountCode`, selectedCode);
                          }}
                        />
                      </div>
                    )}

                    {/* Field 2: Prominent Financial Amount Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        {presetMeta?.amountLabel || 'Voucher Amount (PKR)'} *
                      </label>
                      <div className="relative flex items-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all p-2 sm:p-2.5">
                        <span className="px-3 text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 select-none">
                          Rs.
                        </span>
                        <input
                          type="number"
                          step="any"
                          name="amountInput"
                          onKeyDown={blockInvalidChar}
                          value={currentEnteredAmount > 0 ? currentEnteredAmount : ''}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            if (isSingleRowMode) {
                              if (presetMeta?.defaultDebitOrCredit === 'Credit') {
                                setFieldValue(`items.0.credit`, val);
                                setFieldValue(`items.0.debit`, 0);
                              } else {
                                setFieldValue(`items.0.debit`, val);
                                setFieldValue(`items.0.credit`, 0);
                              }
                            } else {
                              // Balanced two-row preset
                              if (activePreset === 'CRV') {
                                setFieldValue('items.0.debit', val);
                                setFieldValue('items.0.credit', 0);
                                setFieldValue('items.1.credit', val);
                                setFieldValue('items.1.debit', 0);
                              } else if (activePreset === 'VPV') {
                                setFieldValue('items.0.debit', val);
                                setFieldValue('items.0.credit', 0);
                                setFieldValue('items.1.credit', val);
                                setFieldValue('items.1.debit', 0);
                              } else if (activePreset === 'EXP') {
                                setFieldValue('items.0.debit', val);
                                setFieldValue('items.0.credit', 0);
                                setFieldValue('items.1.credit', val);
                                setFieldValue('items.1.debit', 0);
                              }
                            }
                          }}
                          className="w-full text-xl sm:text-2xl font-black font-mono bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 pr-2"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Field 3: Bill # / Particulars Reference */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Bill # / Particulars / Thaan Reference
                      </label>
                      <input
                        type="text"
                        name={`items.${primaryItemIndex}.description`}
                        onChange={handleChange}
                        value={values.items[primaryItemIndex]?.description || ''}
                        className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        placeholder={presetMeta?.descPlaceholder || 'e.g. Bill # 104 - 50 Thaan Latha'}
                      />
                    </div>

                    {/* Field 4: Voucher Narration / Notes */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Overall Narration / Notes
                      </label>
                      <textarea
                        name="notes"
                        rows={2}
                        onChange={handleChange}
                        value={values.notes}
                        className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                        placeholder="Enter general khata remarks or details..."
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: LIVE KHATA IMPACT & PARTY PREVIEW (5 COLS) */}
                  <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 sm:p-6 flex flex-col justify-between space-y-5">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                            Khata Balance Impact
                          </h3>
                        </div>
                        <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                          Live Sync
                        </span>
                      </div>

                      {/* Party Identity Badge */}
                      {partyData ? (
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center shrink-0">
                                {partyData.type === 'Customer' ? <MdPerson size={16} /> : <MdCorporateFare size={16} />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate" title={partyData.name}>
                                  {partyData.name}
                                </h4>
                                <span className="font-mono text-[10.5px] text-slate-400 font-semibold">
                                  {partyData.code} &bull; {partyData.type}
                                </span>
                              </div>
                            </div>
                          </div>

                          {(partyData.phone || partyData.city) && (
                            <div className="flex items-center gap-3 text-[10.5px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                              {partyData.phone && (
                                <span className="flex items-center gap-1 font-mono">
                                  <MdPhone size={12} className="text-slate-400" />
                                  {partyData.phone}
                                </span>
                              )}
                              {partyData.city && (
                                <span className="flex items-center gap-1 truncate">
                                  <MdLocationOn size={12} className="text-slate-400" />
                                  {partyData.city}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-slate-400 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 mb-4">
                          <span className="block text-base mb-1">👈</span>
                          <span className="font-bold text-xs">Select an Account</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Select customer or vendor to preview real-time khata balance impact.
                          </p>
                        </div>
                      )}

                      {/* 3-Step Live Khata Flow */}
                      <div className="space-y-3 font-mono text-xs">
                        {/* 1. Current Balance */}
                        <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                          <span className="font-sans font-bold text-slate-600 dark:text-slate-300">
                            1. Previous Balance:
                          </span>
                          <span className="font-black text-slate-900 dark:text-white">
                            Rs. {oldBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            <span className="text-[10px] font-sans font-normal text-slate-400 ml-1">
                              {balSuffix}
                            </span>
                          </span>
                        </div>

                        {/* 2. Voucher Delta */}
                        <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                          <span className="font-sans font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <span>2. This Voucher:</span>
                            <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                              {impactSign}
                            </span>
                          </span>
                          <span className={`font-black ${impactSign === '+' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {impactSign}Rs. {currentEnteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* 3. Expected New Balance Hero Card */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 text-white shadow-xs space-y-1">
                          <div className="flex justify-between items-center text-[10.5px] uppercase font-bold tracking-wider text-slate-400 font-sans">
                            <span>3. Expected New Khata Balance</span>
                            <span className="text-emerald-400">Post Save</span>
                          </div>
                          <div className="text-2xl font-black font-mono tracking-tight text-white flex items-baseline justify-between pt-1">
                            <span>Rs. {expectedNewBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <span className="text-xs font-sans font-normal text-slate-300">
                              {balSuffix}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <button
                        type="submit"
                        disabled={loading || !primaryPartyCode || currentEnteredAmount <= 0}
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white text-xs transition disabled:opacity-50 shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <Spinner color="border-white" size="w-4 h-4" />
                        ) : (
                          <>
                            <MdCheckCircle size={18} />
                            <span>{isEditMode ? 'Update & Post Voucher' : 'Save & Post Voucher'}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(listReturnRoute)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-slate-600 dark:text-slate-300 text-xs transition cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ========================================================================= */
                /* GENERAL MULTI-ROW JOURNAL VOUCHER TABLE (FALLBACK FOR COMPLEX JVs)       */
                /* ========================================================================= */
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto text-center border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200 text-[11px] uppercase tracking-wide border-b">
                          <th className="p-2.5 border w-12">S.#</th>
                          <th className="p-2.5 border text-left min-w-[260px]">Chart Of Account *</th>
                          <th className="p-2.5 border min-w-[220px]">Description / Reference</th>
                          <th className="p-2.5 border w-36">Debit (Dr)</th>
                          <th className="p-2.5 border w-36">Credit (Cr)</th>
                          <th className="p-2.5 border w-10"></th>
                        </tr>
                      </thead>
                      <FieldArray name="items">
                        {({ push, remove }) => (
                          <tbody>
                            {values.items.map((item: any, idx: number) => {
                              const rowAccounts = getFilteredAccounts(idx);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="p-2 border text-slate-400 font-medium bg-slate-50/30">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2 border min-w-[260px]">
                                    <AccountCombobox
                                      accounts={rowAccounts}
                                      value={String(item.accountCode || '')}
                                      onChange={(selectedCode) => {
                                        setFieldValue(`items.${idx}.accountCode`, selectedCode);
                                      }}
                                    />
                                  </td>
                                  <td className="p-1 border">
                                    <input
                                      type="text"
                                      name={`items.${idx}.description`}
                                      onChange={handleChange}
                                      value={item.description}
                                      className="w-full px-2 outline-none bg-transparent h-8 text-slate-900 dark:text-white"
                                      placeholder="Enter line details"
                                    />
                                  </td>
                                  <td className="p-1 border">
                                    <input
                                      type="number"
                                      name={`items.${idx}.debit`}
                                      onKeyDown={blockInvalidChar}
                                      onChange={(e) => {
                                        handleChange(e);
                                        const val = Number(e.target.value) || 0;
                                        if (val > 0) setFieldValue(`items.${idx}.credit`, 0);
                                      }}
                                      value={item.debit || ''}
                                      className="w-full text-center font-mono font-bold outline-none h-8 bg-transparent text-slate-900 dark:text-white"
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="p-1 border">
                                    <input
                                      type="number"
                                      name={`items.${idx}.credit`}
                                      onKeyDown={blockInvalidChar}
                                      onChange={(e) => {
                                        handleChange(e);
                                        const val = Number(e.target.value) || 0;
                                        if (val > 0) setFieldValue(`items.${idx}.debit`, 0);
                                      }}
                                      value={item.credit || ''}
                                      className="w-full text-center font-mono font-bold outline-none h-8 bg-transparent text-slate-900 dark:text-white"
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="p-2 border text-center">
                                    {values.items.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => remove(idx)}
                                        className="text-red-500 font-bold hover:scale-110 transition cursor-pointer"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr>
                              <td colSpan={6} className="p-2.5 text-left bg-slate-50/20">
                                <button
                                  type="button"
                                  onClick={() => push({ accountCode: '', description: '', debit: 0, credit: 0 })}
                                  className="text-emerald-600 font-black hover:underline cursor-pointer"
                                >
                                  + Add Row
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        )}
                      </FieldArray>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => navigate(listReturnRoute)}
                      className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 py-3 px-6 font-bold text-slate-700 dark:text-slate-300 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 px-8 font-bold text-white text-xs cursor-pointer flex items-center gap-2"
                    >
                      {loading ? <Spinner color="border-white" size="w-4 h-4" /> : <span>Save Voucher</span>}
                    </button>
                  </div>
                </div>
              )}
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}

export default AddVoucher;
