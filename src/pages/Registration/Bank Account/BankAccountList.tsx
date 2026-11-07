import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import TableActions from '../../../ui/TableActions';
import { MdAccountBalance } from 'react-icons/md';
import { LuStore } from 'react-icons/lu';
import { useLanguage } from '../../../Context/LanguageContext';
import { posService } from '../../../service/posService';

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

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('banks')
        .select('*')
        .order('id', { ascending: true });

      if (error) throw error;
      setBanks(data || []);
      (data || []).forEach(b => posService.syncBankToPOSAccount(b));
    } catch (err: any) {
      console.warn('Supabase query error:', err);
      toast.error('Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const isShownInPos = (bank: any): boolean => {
    const posAccounts = posService.getPaymentAccounts();
    const found = posAccounts.find(a => a.id === String(bank.id) || a.account_number === (bank.accountNumber || bank.account_number));
    if (found) return found.show_in_pos;
    return bank.show_in_pos !== undefined ? Boolean(bank.show_in_pos) : true;
  };

  const handleTogglePOS = async (bank: any) => {
    const current = isShownInPos(bank);
    const next = !current;
    posService.syncBankToPOSAccount(bank, next);
    posService.toggleAccountPOSVisibility(String(bank.id), next);

    try {
      await supabase.from('banks').update({ show_in_pos: next }).eq('id', bank.id);
    } catch {}

    setBanks(prev => prev.map(b => b.id === bank.id ? { ...b, show_in_pos: next } : b));
    toast.success(`${bank.accountTitle || bank.account_title || bank.bankName || bank.bank_name} is now ${next ? 'ENABLED' : 'DISABLED'} for POS checkout!`);
  };

  const handleDelete = async (id: any) => {
    if (window.confirm('Are you sure you want to permanently delete this bank account ledger?')) {
      try {
        const { error } = await supabase.from('banks').delete().eq('id', id);
        if (error) throw error;
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
              <th className="py-3.5 px-4 font-bold">Current Balance</th>
              <th className="py-3.5 px-4 font-bold">Branch Name</th>
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
                  <p>{isRTL ? "کوئی بینک ریکارڈ نہیں ملا۔" : "No bank records found."}</p>
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
                      <span className="font-extrabold text-slate-900 dark:text-white text-xs">{b.bank_name || b.bankName || 'Bank'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">{b.account_title || b.accountTitle}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-200 font-bold">{b.account_number || b.accountNumber}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    Rs. {Number(b.current_balance ?? b.currentBalance ?? b.opening_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{b.branch_name || b.branchName || 'N/A'}</td>
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
