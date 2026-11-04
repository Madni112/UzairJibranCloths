import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import TableActions from '../../../ui/TableActions';
import { MdAccountBalance } from 'react-icons/md';
import { LuStore, LuSparkles } from 'react-icons/lu';
import { useLanguage } from '../../../Context/LanguageContext';
import { posService } from '../../../service/posService';

const DEFAULT_DEMO_BANKS = [
  {
    bankName: 'Meezan Bank Ltd',
    accountTitle: 'Uzair Jibran Cloth - Main Collection',
    accountNumber: '0214-0104829101',
    branchName: 'Cloth Market Branch',
    branchCode: 'MEZN-0214',
    branchNumber: '0214',
    contactPerson: 'Muhammad Tariq',
    phoneNumber: '0300-1234567',
    address: 'Shop #12, Cloth Market, Hyderabad',
    openingBalance: 250000,
    openingBalanceDate: new Date().toISOString().split('T')[0],
    show_in_pos: true
  },
  {
    bankName: 'Habib Bank Limited (HBL)',
    accountTitle: 'Uzair Jibran Cloth - Current Account',
    accountNumber: '0042-7901234503',
    branchName: 'Saddar Branch',
    branchCode: 'HBL-0042',
    branchNumber: '0042',
    contactPerson: 'Muhammad Asif',
    phoneNumber: '0321-4567890',
    address: 'Main Saddar Road, Hyderabad',
    openingBalance: 500000,
    openingBalanceDate: new Date().toISOString().split('T')[0],
    show_in_pos: true
  },
  {
    bankName: 'JazzCash Business',
    accountTitle: 'Uzair Jibran Cloth - Merchant Till',
    accountNumber: '0300-9876543',
    branchName: 'Digital Wallet Till',
    branchCode: 'JC-TILL',
    branchNumber: '01',
    contactPerson: 'Uzair Jibran',
    phoneNumber: '0300-9876543',
    address: 'Cloth Market, Hyderabad',
    openingBalance: 75000,
    openingBalanceDate: new Date().toISOString().split('T')[0],
    show_in_pos: true
  },
  {
    bankName: 'Easypaisa / Raast',
    accountTitle: 'Uzair Jibran Cloth - Raast P2M',
    accountNumber: '0312-8039911',
    branchName: 'Raast Instant Pay',
    branchCode: 'RAAST-PK',
    branchNumber: '01',
    contactPerson: 'Uzair Jibran',
    phoneNumber: '0312-8039911',
    address: 'Cloth Market, Hyderabad',
    openingBalance: 45000,
    openingBalanceDate: new Date().toISOString().split('T')[0],
    show_in_pos: true
  }
];

const BankAccountList = () => {
  const { isRTL } = useLanguage();

  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => { 
    fetchBanks(); 
  }, []);

  const seedDemoAccounts = async (silent = false) => {
    setLoading(true);
    try {
      // 1. Prepare clean DB payload matching Supabase 'banks' schema
      const dbPayload = DEFAULT_DEMO_BANKS.map(b => ({
        bank_name: b.bankName,
        "bankName": b.bankName,
        account_title: b.accountTitle,
        "accountTitle": b.accountTitle,
        account_number: b.accountNumber,
        "accountNumber": b.accountNumber,
        branch_name: b.branchName,
        current_balance: b.openingBalance
      }));

      // 2. Insert into Supabase 'banks' table
      let savedRecords: any[] = [];
      try {
        const { data, error } = await supabase.from('banks').insert(dbPayload).select();
        if (!error && data && data.length > 0) {
          savedRecords = data;

          // Also auto-link each demo bank in chart_of_accounts
          try {
            const coaPayload = savedRecords.map(b => ({
              account_code: b.accountNumber,
              account_title: `${b.bankName} (A/C: ${b.accountNumber})`,
              category_code: '1. ASSETS',
              sub_category_code: 'Current Assets',
              control_code: 'Banks',
              linked_bank_id: String(b.id),
              notes: `Auto-linked bank ledger for ${b.accountTitle}`
            }));
            await supabase.from('chart_of_accounts').insert(coaPayload);
          } catch (coaErr) {
            console.warn('COA linking optional warning:', coaErr);
          }
        } else if (error) {
          console.warn('Supabase banks insert error:', error.message);
        }
      } catch (insertErr) {
        console.warn('Could not insert demo accounts to remote Supabase, falling back locally', insertErr);
      }

      // If remote Supabase was not reachable, use local fallback records
      if (savedRecords.length === 0) {
        savedRecords = DEFAULT_DEMO_BANKS.map((b, idx) => ({
          id: 99001 + idx,
          ...b
        }));
      }

      // Sync all demo accounts into POS active accounts
      savedRecords.forEach(b => {
        posService.syncBankToPOSAccount(b, true);
      });

      setBanks(savedRecords);
      if (!silent) {
        toast.success(isRTL ? "ڈیمو بینک اکاؤنٹس کامیابی سے ڈیٹا بیس میں محفوظ ہوگئے!" : "Demo bank accounts successfully saved to database!");
      }
    } catch (err: any) {
      console.error(err);
      const fallback = DEFAULT_DEMO_BANKS.map((b, idx) => ({ id: 99001 + idx, ...b }));
      fallback.forEach(b => posService.syncBankToPOSAccount(b, true));
      setBanks(fallback);
      if (!silent) {
        toast.success("Demo accounts loaded locally!");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('accountTitle', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Table is empty, seed demo accounts automatically
        await seedDemoAccounts(true);
        return;
      }

      setBanks(data);
      data.forEach(b => posService.syncBankToPOSAccount(b));
    } catch (err: any) {
      console.warn('Supabase query error, loading fallback demo accounts:', err);
      await seedDemoAccounts(true);
    } finally {
      setLoading(false);
    }
  };

  const isShownInPos = (bank: any): boolean => {
    const posAccounts = posService.getPaymentAccounts();
    const found = posAccounts.find(a => a.id === String(bank.id) || a.account_number === bank.accountNumber);
    if (found) return found.show_in_pos;
    return bank.show_in_pos !== undefined ? Boolean(bank.show_in_pos) : true;
  };

  const handleTogglePOS = async (bank: any) => {
    const current = isShownInPos(bank);
    const next = !current;
    posService.syncBankToPOSAccount(bank, next);
    posService.toggleAccountPOSVisibility(String(bank.id), next);

    try {
      if (!String(bank.id).startsWith('demo-')) {
        await supabase.from('banks').update({ show_in_pos: next }).eq('id', bank.id);
      }
    } catch {}

    setBanks(prev => prev.map(b => b.id === bank.id ? { ...b, show_in_pos: next } : b));
    toast.success(`${bank.accountTitle || bank.bankName} is now ${next ? 'ENABLED' : 'DISABLED'} for POS checkout!`);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this bank account ledger?')) {
      try {
        if (!String(id).startsWith('demo-')) {
          const { error } = await supabase.from('banks').delete().eq('id', id);
          if (error) throw error;
        }
        setBanks(prev => prev.filter(b => b.id !== id));
        posService.toggleAccountPOSVisibility(String(id), false);
        toast.success('Account record removed successfully');
      } catch (err: any) {
        toast.error(err.message || 'Failed to delete account');
      }
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-[#111827]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <MdAccountBalance className="text-emerald-600 dark:text-emerald-400 text-2xl" /> {isRTL ? "بینک اکاؤنٹس ڈائریکٹری" : "Bank Accounts Directory"}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{isRTL ? "بینک اکاؤنٹس، برانچز اور کھاتہ جات کا انتظام کریں" : "Manage enterprise bank accounts, branches & IBAN ledgers"}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => seedDemoAccounts(false)}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-2.5 px-3.5 rounded-xl text-xs transition flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer"
            title="Populate demo bank accounts"
          >
            <LuSparkles className="text-amber-500" size={14} />
            <span>{isRTL ? "ڈیمو اکاؤنٹس بنائیں" : "Reset / Seed Demo Accounts"}</span>
          </button>
          <button 
            onClick={() => navigate('/Registration/Bank-Account/AddBank')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm cursor-pointer"
          >
            {isRTL ? "+ نیا بینک اکاؤنٹ شامل کریں" : "+ Add Bank Account"}
          </button>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full table-auto text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800">
              <th className="py-3.5 px-4 font-bold">Bank Name</th>
              <th className="py-3.5 px-4 font-bold">Account Title</th>
              <th className="py-3.5 px-4 font-bold">Account Number</th>
              <th className="py-3.5 px-4 font-bold">Branch Name</th>
              <th className="py-3.5 px-4 font-bold">Branch Code</th>
              <th className="py-3.5 px-4 font-bold text-center w-32">Show in POS</th>
              <th className="py-3.5 px-4 font-bold text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10"><Spinner /></td></tr>
            ) : banks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 italic">
                  <div className="space-y-3">
                    <p>{isRTL ? "کوئی بینک ریکارڈ نہیں ملا۔" : "No bank records found."}</p>
                    <button
                      type="button"
                      onClick={() => seedDemoAccounts(false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs shadow-sm hover:bg-emerald-700 transition cursor-pointer"
                    >
                      <LuSparkles size={13} />
                      <span>{isRTL ? "ڈیمو اکاؤنٹس لوڈ کریں" : "Populate Demo Accounts"}</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              banks.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage).map((b) => (
                <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                        <MdAccountBalance size={17} />
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-white text-xs">{b.bankName || 'Bank'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{b.accountTitle}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-200 font-bold">{b.accountNumber}</td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{b.branchName || 'N/A'}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">{b.branchCode || 'N/A'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleTogglePOS(b)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                        isShownInPos(b)
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs hover:bg-emerald-500/25'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                      title="Click to toggle account availability in POS checkout"
                    >
                      <span className={`w-2 h-2 rounded-full ${isShownInPos(b) ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      <LuStore size={12} className={isShownInPos(b) ? 'text-emerald-500' : 'text-slate-400'} />
                      <span>{isShownInPos(b) ? 'Active in POS' : 'Hidden'}</span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <TableActions
                      onEdit={() => navigate('/Registration/Bank-Account/AddBank', { state: { bank: b } })}
                      onDelete={() => handleDelete(b.id)}
                      editTitle="Edit Account"
                      deleteTitle="Delete Account"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div>
          {isRTL ? `کل ${banks.length} میں سے ${banks.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0} تا ${Math.min(currentPage * entriesPerPage, banks.length)} ریکارڈز` : `Showing ${banks.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0} to ${Math.min(currentPage * entriesPerPage, banks.length)} of ${banks.length} entries`}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold disabled:opacity-40 cursor-pointer text-xs"
          >
            {isRTL ? "پچھلا" : "Previous"}
          </button>
          <span className="px-3 py-1.5 font-bold text-teal-600 text-xs">
            {isRTL ? `صفحہ ${currentPage} از ${Math.ceil(banks.length / entriesPerPage) || 1}` : `Page ${currentPage} of ${Math.ceil(banks.length / entriesPerPage) || 1}`}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(Math.ceil(banks.length / entriesPerPage), p + 1))}
            disabled={currentPage === Math.ceil(banks.length / entriesPerPage) || banks.length === 0}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold disabled:opacity-40 cursor-pointer text-xs"
          >
            {isRTL ? "اگلا" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BankAccountList;
