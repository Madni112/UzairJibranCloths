import React, { useEffect, useState } from 'react'; 
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../../../Context/supabaseClient'; 
import { toast } from 'react-hot-toast'; 
import Spinner from '../../../ui/Spinner'; 
import TableActions from '../../../ui/TableActions';
import { useAuth } from '../../../Context/Auth';
import { useLanguage } from '../../../Context/LanguageContext';
import { DEFAULT_SUB_AREAS } from '../../../components/SubAreaAreaInput';
import { MdAccountBalanceWallet, MdAdd, MdEdit, MdClose, MdCheckCircle, MdArrowUpward, MdArrowDownward, MdCloudUpload, MdReceiptLong } from 'react-icons/md';
import CustomerImportModal from './CustomerImportModal';

const getCustomerDisplayName = (c: any): string => {
  if (!c) return '';
  return c.customerName || c.customername || c.customer_name || c.name || '';
};

const CustomerHistory = () => { 
  const { tenantId } = useAuth();
  const { t, isRTL } = useLanguage();
  const [customers, setCustomers] = useState<any[]>([]); 
  const [coaAccounts, setCoaAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); 
  const navigate = useNavigate(); 

  // Modal State
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [accountCodeInput, setAccountCodeInput] = useState('');
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');
  const [balanceNatureInput, setBalanceNatureInput] = useState<'Debit' | 'Credit'>('Debit');
  const [savingAccount, setSavingAccount] = useState(false);

  // Datatable search, sorting, and pagination trackers
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSortOrder, setPageSortOrder] = useState<'asc' | 'desc' | null>('asc');
  const [customerToDelete, setCustomerToDelete] = useState<any | null>(null);
  const [deleteCustomerCOA, setDeleteCustomerCOA] = useState<boolean>(true);
  const [deletingCustomer, setDeletingCustomer] = useState<boolean>(false);

  useEffect(() => { 
    fetchCustomersAndCOA(); 
  }, []); 

  const autoAssign2020CustomerCodes = async (silent = false) => {
    try {
      setLoading(true);
      const { data: allCusts, error: custErr } = await supabase
        .from('customers')
        .select('*');

      if (custErr) throw custErr;
      if (!allCusts || allCusts.length === 0) return;

      // Sort customers: preserve 001 (آصف اقبال) and 002 (ابراہیم کلاٹھ) at the top, then sort others
      const sorted = [...allCusts].sort((a, b) => {
        const codeA = String(a.customer_code || a.customerCode || a.coa_code || '').trim();
        const codeB = String(b.customer_code || b.customerCode || b.coa_code || '').trim();
        if (codeA === '001' || codeA === '2020-001') return -1;
        if (codeB === '001' || codeB === '2020-001') return 1;
        if (codeA === '002' || codeA === '2020-002') return -1;
        if (codeB === '002' || codeB === '2020-002') return 1;
        return (a.customerName || a.name || '').localeCompare(b.customerName || b.name || '');
      });

      const coaInserts: any[] = [];
      const voucherInserts: any[] = [];

      for (let i = 0; i < sorted.length; i++) {
        const c = sorted[i];
        const assignedCode = `2020-${String(i + 1).padStart(3, '0')}`;
        const custName = c.customerName || c.customername || c.customer_name || c.name || `Customer #${assignedCode}`;

        // 1. Update customer record
        try {
          await supabase.from('customers').update({
            customer_code: assignedCode,
            customerCode: assignedCode,
            coa_code: assignedCode
          }).eq('id', c.id);
        } catch {}

        // 2. Prepare COA ledger
        coaInserts.push({
          account_code: assignedCode,
          account_title: custName,
          category_code: '1. ASSETS',
          sub_category_code: 'Current Assets',
          control_code: 'Customers',
          notes: `Customer ledger account for ${custName} (Auto-assigned)`
        });

        // 3. Prepare opening balance voucher if has balance
        const rawBal = c.opening_balance ?? c.openingBalance ?? c.balance ?? c.currentBalance;
        const bal = Math.abs(Number(rawBal) || 0);
        if (bal > 0) {
          const nature = c.balance_nature || c.balanceNature || 'Debit';
          const isDebit = String(nature).toLowerCase() === 'debit';
          voucherInserts.push({
            voucher_no: `OB-${assignedCode}`,
            voucher_type: 'Journal Voucher',
            voucher_date: c.created_at ? c.created_at.split('T')[0] : '2026-10-31',
            account_code: assignedCode,
            account_title: custName,
            total_amount: bal,
            debit: isDebit ? bal : 0,
            credit: !isDebit ? bal : 0,
            narration: `Opening Balance for Customer ${custName}`
          });
        }
      }

      // Upsert into chart_of_accounts
      for (const coa of coaInserts) {
        try {
          const { data: existing } = await supabase.from('chart_of_accounts').select('id').eq('account_code', coa.account_code).maybeSingle();
          if (existing?.id) {
            await supabase.from('chart_of_accounts').update(coa).eq('id', existing.id);
          } else {
            await supabase.from('chart_of_accounts').insert([coa]);
          }
        } catch {}
      }

      // Replace old OB- vouchers with the clean 2020- vouchers in financial_vouchers
      try {
        await supabase.from('financial_vouchers').delete().like('voucher_no', 'OB-%');
        if (voucherInserts.length > 0) {
          await supabase.from('financial_vouchers').insert(voucherInserts);
        }
      } catch {}

      if (!silent) {
        toast.success(`Assigned auto account numbers (2020-001 to 2020-${String(sorted.length).padStart(3, '0')}) to all customers!`);
      }
      await fetchCustomersAndCOA();
    } catch (err: any) {
      console.error(err);
      if (!silent) toast.error('Error assigning 2020 codes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomersAndCOA = async () => { 
    setLoading(true); 
    try { 
      const [custRes, coaRes] = await Promise.all([
        supabase.from('customers').select('*').order('customerName', { ascending: true }),
        supabase.from('chart_of_accounts').select('*')
      ]);
      
      if (custRes.error) throw custRes.error; 
      setCustomers(custRes.data || []); 
      if (coaRes.data) setCoaAccounts(coaRes.data);
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setLoading(false); 
    } 
  }; 

  const getCustomerCOA = (cust: any) => {
    const cName = getCustomerDisplayName(cust).trim().toLowerCase();
    // Match by customer_code / account_code or exact account_title
    return coaAccounts.find(a => 
      (cust.account_code && String(a.account_code).trim() === String(cust.account_code).trim()) ||
      (a.control_code === 'Customers' && (a.account_title || '').trim().toLowerCase() === cName) ||
      ((a.account_title || '').trim().toLowerCase() === cName)
    );
  };

    const normalizeAccountCode = (code?: string | null) => {
    if (!code) return '';
    const s = String(code).trim();
    if (s.startsWith('2020-')) return s;
    const match = s.match(/^\d+$/);
    if (match) {
      return `2020-${s.padStart(3, '0')}`;
    }
    return s;
  };

  const getNextSuggestedCode = () => {
    const usedCodes = new Set<string>();

    coaAccounts.forEach(a => {
      const code = String(a.account_code || '').trim().toUpperCase();
      if (code) usedCodes.add(code);
    });

    customers.forEach((c: any) => {
      const code1 = String(c.customer_code || '').trim().toUpperCase();
      const code2 = String(c.customerCode || '').trim().toUpperCase();
      const code3 = String(c.coa_code || '').trim().toUpperCase();
      const code4 = String(c.account_code || '').trim().toUpperCase();
      if (code1) usedCodes.add(code1);
      if (code2) usedCodes.add(code2);
      if (code3) usedCodes.add(code3);
      if (code4) usedCodes.add(code4);
    });

    let seq = 1;
    while (true) {
      const candidate = `2020-${String(seq).padStart(3, '0')}`;
      if (!usedCodes.has(candidate)) {
        return candidate;
      }
      seq++;
    }
  };

  const handleOpenAccountModal = (cust: any) => {
    setSelectedCustomer(cust);
    const existingCOA = getCustomerCOA(cust);
    const rawCode = existingCOA?.account_code || cust.customer_code || cust.customerCode || cust.coa_code || cust.account_code || '';
    const initialCode = rawCode ? normalizeAccountCode(rawCode) : getNextSuggestedCode();
    setAccountCodeInput(initialCode);
    setOpeningBalanceInput(existingCOA?.opening_balance !== undefined && existingCOA?.opening_balance !== null ? String(existingCOA.opening_balance) : (cust.opening_balance || cust.balance ? String(Math.abs(Number(cust.opening_balance || cust.balance))) : ''));
    setBalanceNatureInput(existingCOA?.balance_nature || cust.balance_nature || 'Debit');
    setShowAccountModal(true);
  };

  const handleSaveAccountCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const cleanCode = accountCodeInput.trim();
    if (!cleanCode) {
      toast.error('Account Code is mandatory');
      return;
    }

    try {
      setSavingAccount(true);
      const existingCOA = getCustomerCOA(selectedCustomer);

      // Check for code uniqueness across other accounts
      const duplicateCode = coaAccounts.find(a => 
        String(a.account_code).trim().toLowerCase() === cleanCode.toLowerCase() && 
        (!existingCOA || a.id !== existingCOA.id)
      );
      if (duplicateCode) {
        toast.error(`Account code "${cleanCode}" is already used by "${duplicateCode.account_title}". Please enter a unique code.`);
        setSavingAccount(false);
        return;
      }

      const customerName = getCustomerDisplayName(selectedCustomer).trim();

      // 1. Create or Update Asset Receivable Account (1020-xxx)
      const coaPayload: any = {
        category_code: '1. ASSETS',
        sub_category_code: 'Current Assets',
        control_code: 'Customers',
        account_code: cleanCode,
        account_title: customerName,
        notes: `Customer ledger account for ${customerName}${openingBalanceInput ? ` (Opening Balance: ${openingBalanceInput} ${balanceNatureInput})` : ''}`
      };

      if (existingCOA?.id) {
        const { error } = await supabase
          .from('chart_of_accounts')
          .update(coaPayload)
          .eq('id', existingCOA.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('chart_of_accounts')
          .insert([coaPayload]);
        if (error) throw error;
      }

      // --- TWO-WAY SYNC: UPDATE OR INSERT OPENING BALANCE FINANCIAL VOUCHER ---
      if (openingBalanceInput !== undefined && openingBalanceInput !== '') {
        const bal = Math.abs(Number(openingBalanceInput) || 0);
        try {
          const { data: existingVoucher } = await supabase
            .from('financial_vouchers')
            .select('id')
            .or(`account_code.eq.${cleanCode},account_title.eq.${customerName}`)
            .maybeSingle();

          const isDebit = balanceNatureInput === 'Debit';
          const voucherPayload: any = {
            account_code: cleanCode,
            account_title: customerName,
            total_amount: bal,
            debit: isDebit ? bal : 0,
            credit: !isDebit ? bal : 0,
            narration: `Opening Balance for Customer ${customerName}`,
            items: []
          };

          if (existingVoucher) {
            await supabase
              .from('financial_vouchers')
              .update(voucherPayload)
              .eq('id', existingVoucher.id);
          } else if (bal > 0) {
            const vNum = cleanCode.replace('2020-', '');
            await supabase.from('financial_vouchers').insert([{
              voucher_no: `OB-${vNum}`,
              voucher_type: 'Journal Voucher',
              voucher_date: new Date().toISOString().split('T')[0],
              ...voucherPayload
            }]);
          }
        } catch (vErr) {
          console.warn('Voucher sync note:', vErr);
        }
      }

      // Update customer record with customer_code, customerCode, coa_code and currentBalance
      try {
        const custUpdates: any = {
          customer_code: cleanCode,
          customerCode: cleanCode,
          coa_code: cleanCode
        };
        if (openingBalanceInput) {
          const bal = Number(openingBalanceInput);
          custUpdates.balance = balanceNatureInput === 'Debit' ? bal : -bal;
        }
        await supabase
          .from('customers')
          .update(custUpdates)
          .eq('id', selectedCustomer.id);
      } catch (err) {
        console.warn('Customer record sync note:', err);
      }

      toast.success(`Customer account (${cleanCode}) assigned for "${getCustomerDisplayName(selectedCustomer)}"!`);
      setShowAccountModal(false);
      await fetchCustomersAndCOA();
    } catch (err: any) {
      toast.error('Failed to save account: ' + err.message);
    } finally {
      setSavingAccount(false);
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setDeletingCustomer(true);
    try {
      const cId = customerToDelete.id;
      const cCode = customerToDelete.customer_code || customerToDelete.customerCode || customerToDelete.coa_code || customerToDelete.account_code;

      // 1. Delete from customers table
      const { error } = await supabase.from('customers').delete().eq('id', cId);
      if (error) throw error;

      // 2. If deleteCustomerCOA is checked, also delete from chart_of_accounts & financial_vouchers
      if (deleteCustomerCOA && cCode) {
        const cleanCode = String(cCode).trim();
        const vNum = cleanCode.replace('2020-', '');

        await Promise.allSettled([
          supabase.from('chart_of_accounts').delete().eq('account_code', cleanCode),
          supabase.from('financial_vouchers').delete().eq('account_code', cleanCode),
          supabase.from('financial_vouchers').delete().eq('voucher_no', `OB-${vNum}`)
        ]);
      }

      toast.success(`Customer ${deleteCustomerCOA ? 'and linked Chart of Accounts entry ' : ''}deleted successfully!`);
      setCustomerToDelete(null);
      fetchCustomersAndCOA();
    } catch (err: any) {
      toast.error('Failed to delete customer: ' + err.message);
    } finally {
      setDeletingCustomer(false);
    }
  }; 

  // Live filter query filter condition evaluation
  const parsePageNumber = (val?: string | null): number | null => {
    if (!val) return null;
    const match = String(val).match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  const getCustomerLocation = (c: any) => {
    let city = c.city || c.sub_area || c.subArea || '';
    let area = c.area || '';

    // Check if saved inside notes (e.g. "Location: Hyderabad | Cloth Market")
    if (c.notes && c.notes.includes('Location:')) {
      const match = c.notes.match(/Location:\s*([^|\n]+)(?:\s*\|\s*([^\n]+))?/);
      if (match) {
        const noteCity = match[1]?.trim();
        const noteArea = match[2]?.trim();
        if (!city) city = noteCity;
        if (city && city.toLowerCase() === 'hyderabad' && noteCity && noteCity.toLowerCase() !== 'hyderabad') {
          city = noteCity;
        }
        if (!area && noteArea) area = noteArea;
      }
    }

    // Fallback: If city still empty, scan address for known cities
    if (!city && c.address) {
      const addr = String(c.address).toLowerCase();
      for (const dCity of DEFAULT_SUB_AREAS) {
        if (addr.includes(dCity.toLowerCase())) {
          city = dCity;
          break;
        }
      }
    }

    return { city, area };
  };

  // Live filter and natural page # sort
  const filteredCustomers = customers
    .filter(c => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return true;

      const cleanTerm = term.replace(/[\s-]/g, '');
      const loc = getCustomerLocation(c);
      const coa = getCustomerCOA(c);

      const name = getCustomerDisplayName(c).toLowerCase();
      const code = (c.customer_code || c.customerCode || '').toLowerCase();
      const pageNo = String(c.page_no || c.pageNo || '').toLowerCase();
      const city = (loc.city || c.sub_area || c.subArea || c.city || '').toLowerCase();
      const area = (loc.area || c.area || '').toLowerCase();
      const address = (c.address || '').toLowerCase();
      const province = (c.province || '').toLowerCase();
      const company = (c.company || '').toLowerCase();
      const coaCode = String(coa?.account_code || c.account_code || c.coa_code || '').toLowerCase();
      const ntn = (c.ntnNo || '').toLowerCase();

      // Phones (check both formatted and clean digits)
      const rawPhone = String(c.primaryPhone || c.phone || '').toLowerCase();
      const rawSecPhone = String(c.secondaryPhone || '').toLowerCase();
      const cleanPhone = rawPhone.replace(/[\s-]/g, '');
      const cleanSecPhone = rawSecPhone.replace(/[\s-]/g, '');

      return (
        name.includes(term) ||
        code.includes(term) ||
        pageNo.includes(term) ||
        city.includes(term) ||
        area.includes(term) ||
        address.includes(term) ||
        province.includes(term) ||
        company.includes(term) ||
        coaCode.includes(term) ||
        ntn.includes(term) ||
        rawPhone.includes(term) ||
        rawSecPhone.includes(term) ||
        (cleanTerm.length > 0 && (cleanPhone.includes(cleanTerm) || cleanSecPhone.includes(cleanTerm)))
      );
    })
    .sort((a, b) => {
      if (!pageSortOrder) {
        const rawCodeA = String(a.customer_code || a.customerCode || a.coa_code || a.account_code || '');
        const rawCodeB = String(b.customer_code || b.customerCode || b.coa_code || b.account_code || '');
        const numA = parseInt(rawCodeA.replace(/\D/g, '') || '999999', 10);
        const numB = parseInt(rawCodeB.replace(/\D/g, '') || '999999', 10);
        if (numA !== numB) return numA - numB;
        return getCustomerDisplayName(a).localeCompare(getCustomerDisplayName(b));
      }

      const pageA = a.page_no || a.pageNo;
      const pageB = b.page_no || b.pageNo;
      const numA = parsePageNumber(pageA);
      const numB = parsePageNumber(pageB);

      // If both have numeric pages
      if (numA !== null && numB !== null) {
        if (numA !== numB) {
          return pageSortOrder === 'asc' ? numA - numB : numB - numA;
        }
        return String(pageA).localeCompare(String(pageB), undefined, { numeric: true });
      }

      // If only one has a page
      if (numA !== null && numB === null) return pageSortOrder === 'asc' ? -1 : 1;
      if (numA === null && numB !== null) return pageSortOrder === 'asc' ? 1 : -1;

      // If both have text/alphanumeric
      if (pageA && pageB) {
        return pageSortOrder === 'asc' 
          ? String(pageA).localeCompare(String(pageB), undefined, { numeric: true })
          : String(pageB).localeCompare(String(pageA), undefined, { numeric: true });
      }
      if (pageA && !pageB) return pageSortOrder === 'asc' ? -1 : 1;
      if (!pageA && pageB) return pageSortOrder === 'asc' ? 1 : -1;

      // Fallback secondary sort: alphabetical by customer name
      return getCustomerDisplayName(a).localeCompare(getCustomerDisplayName(b));
    });

  // Pagination calculation vectors
  const totalEntries = filteredCustomers.length;
  const totalPages = Math.ceil(totalEntries / pageSize);
  const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, pageSortOrder]);

  return ( 
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5"> 
      
      {/* Dynamic Header Layout */}
      <div className="flex justify-between items-center mb-6"> 
        <div>
          <h4 className="text-xl font-semibold text-black dark:text-white">
            {t('customer_database', 'Customer Database')}
          </h4> 
          <p className="text-xs text-gray-500 mt-0.5">
            {t('manage_customers', 'Manage customer directory and assign Chart of Account ledger codes')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => setShowImportModal(true)} 
            className="border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 py-2 px-3.5 rounded-xl text-sm font-semibold transition cursor-pointer shadow-xs flex items-center gap-1.5" 
          > 
            <MdCloudUpload size={18} className="text-primary" />
            <span>{t('upload_excel', 'Upload Excel')}</span>
          </button>
          <button 
            onClick={() => navigate('/Sales/Customers/Add')} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl text-sm font-semibold transition cursor-pointer shadow-sm flex items-center gap-1.5" 
          > 
            {t('add_new_customer', '+ Add New Customer')}
          </button> 
        </div> 
      </div> 
      
      {/* Datatable Filter Control Header Line */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{isRTL ? 'دکھائیں' : 'Show'}</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded border border-stroke py-1 px-2 bg-transparent dark:border-strokedark outline-none focus:border-primary text-sm font-medium text-black dark:text-white"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size} className="dark:bg-boxdark">{size}</option>
            ))}
          </select>
          <span>{isRTL ? 'ریکارڈز' : 'entries'}</span>
        </div>

        <div className="flex items-center gap-2 text-sm w-full sm:w-auto text-gray-500 dark:text-gray-400">
          <span>{isRTL ? 'تلاش:' : 'Search:'}</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search_customers_placeholder', 'Search name, phone, city, area, account, page #...')}
            className="w-full sm:w-64 rounded border border-stroke py-1.5 px-3 bg-transparent dark:border-strokedark outline-none focus:border-primary text-sm text-black dark:text-white"
          />
        </div>
      </div>

      {/* Core Table Canvas Frame */}
      <div className="max-w-full overflow-x-auto"> 
        <table className="w-full table-auto border-collapse"> 
          <thead> 
            <tr className={`bg-gray-2 dark:bg-meta-4 ${isRTL ? 'text-right' : 'text-left'}`}> 
              <th className="w-16 py-4 px-4 font-bold text-black dark:text-white text-xs text-center">S#</th>
              <th className="min-w-[170px] py-4 px-4 font-bold text-black dark:text-white text-xs">{t('name', 'Name')}</th> 
              <th className="min-w-[110px] py-4 px-4 font-bold text-black dark:text-white text-xs">{t('phone', 'Phone')}</th> 
              <th className="min-w-[130px] py-4 px-4 font-bold text-black dark:text-white text-xs">{t('city_area', 'City / Area')}</th> 
              <th className="min-w-[160px] py-4 px-4 font-bold text-black dark:text-white text-xs">{t('address', 'Address')}</th> 
              <th className="min-w-[150px] py-4 px-4 font-bold text-black dark:text-white text-xs text-center">{t('accounts', 'Account Code')}</th> 
              <th className="py-4 px-4 font-bold text-black dark:text-white text-xs text-center w-28">{t('actions', 'Actions')}</th> 
            </tr> 
          </thead> 
          <tbody> 
            {loading ? ( 
              <tr><td colSpan={7} className="text-center py-12"><Spinner /></td></tr> 
            ) : paginatedCustomers.length === 0 ? ( 
              <tr><td colSpan={7} className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">No matching customer entries found.</td></tr> 
            ) : ( 
              paginatedCustomers.map((c, idx) => {
                const coa = getCustomerCOA(c);
                const loc = getCustomerLocation(c);

                return ( 
                  <tr key={c.id} className="border-b border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/10 duration-150"> 
                    {/* 1. S# */}
                    <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 text-center">
                      {startIndex + idx + 1}
                    </td>

                    {/* 3. Name */}
                    <td className="py-3.5 px-4 text-sm"> 
                      <div className="flex flex-col">
                        <span className="font-semibold text-black dark:text-white">
                          {getCustomerDisplayName(c) || 'Private Customer'}
                        </span>
                        {c.company ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{c.company}</p>
                        ) : null}
                      </div>
                    </td> 

                    {/* 4. Phone */}
                    <td className="py-3.5 px-4 text-sm text-black dark:text-white">
                      <p className="font-mono text-xs">{c.primaryPhone || c.phone || 'N/A'}</p>
                    </td> 

                    {/* 5. City / Area */}
                    <td className="py-3.5 px-4 text-sm">
                      <div className="flex flex-col items-start gap-0.5">
                        {loc.city ? (
                          <span className="font-semibold text-[11px] text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-meta-4/40 px-2 py-0.5 rounded border border-slate-200 dark:border-strokedark">
                            {loc.city}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono text-xs">-</span>
                        )}
                        {loc.area ? (
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium pl-0.5">
                            {loc.area}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* 7. Address & Province */}
                    <td className="py-3.5 px-4 text-sm">
                      {c.address ? (
                        <p className="text-black dark:text-white text-xs font-normal leading-snug">{c.address}</p>
                      ) : (
                        <p className="text-gray-400 text-xs">N/A</p>
                      )}
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                        Province: {c.province || 'Sindh'}
                      </p>
                    </td>

                    {/* Accounts Code */}
                    <td className="py-3.5 px-4 text-xs text-center">
                      {c.customer_code || c.customerCode || c.coa_code || coa?.account_code ? (
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 px-2.5 py-1 rounded-lg shadow-2xs">
                            {normalizeAccountCode(c.customer_code || c.customerCode || c.coa_code || coa?.account_code)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenAccountModal(c)}
                            className="text-[10px] text-primary hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5"
                            title="Edit Account Code"
                          >
                            <MdEdit size={11} /> Edit
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenAccountModal(c)}
                          className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-xs font-bold transition duration-150 shadow-xs cursor-pointer"
                        >
                          <MdAdd size={14} /> Link Account
                        </button>
                      )}
                    </td>

                    {/* 7. Actions */}
                    <td className="py-3.5 px-4 text-center"> 
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const cName = getCustomerDisplayName(c);
                            navigate(`/Reports/Account-Report/Print`, {
                              state: {
                                tab: 1,
                                criteria: {
                                  customer: [cName],
                                  dateFrom: '',
                                  dateTo: new Date().toISOString().split('T')[0]
                                }
                              }
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-950/50 dark:hover:bg-blue-600 dark:text-blue-300 dark:hover:text-white rounded text-xs font-bold border border-blue-200 dark:border-blue-800 transition duration-150 cursor-pointer shadow-2xs"
                          title="View Customer Account Ledger"
                        >
                          <MdReceiptLong size={14} /> Ledger
                        </button>
                        <TableActions
                          onEdit={() => {
                            navigate(`/Sales/Customers/Edit/${c.id}`, { state: { customer: c } });
                          }}
                          onDelete={() => setCustomerToDelete(c)}
                          editTitle="Edit Customer"
                          deleteTitle="Delete Customer"
                        />
                      </div>
                    </td> 
                  </tr> 
                );
              }) 
            )} 
          </tbody> 
        </table> 
      </div> 

      {/* CALCULATED DATA COORDS SUMMARY METRIC FOOTER STRIP */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-stroke dark:border-strokedark">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {startIndex + 1} to {endIndex} of {totalEntries} entries
          {searchTerm && ` (filtered from ${customers.length} total customers)`}
        </div>

        {/* Dynamic Page Controls Buttons Array Map */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold disabled:opacity-40 cursor-pointer text-xs"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 font-bold text-teal-600 text-xs">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold disabled:opacity-40 cursor-pointer text-xs"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── ASSIGN / EDIT ACCOUNT CODE MODAL ── */}
      {showAccountModal && selectedCustomer && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-lg border border-stroke bg-white p-6 shadow-2xl dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between border-b border-stroke pb-3 mb-4 dark:border-strokedark">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <MdAccountBalanceWallet size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-black dark:text-white text-sm">Assign Chart of Account Code</h4>
                  <p className="text-xs text-gray-500">Maps customer directly into Accounts Receivable asset ledger</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAccountModal(false)} 
                className="text-gray-400 hover:text-black dark:hover:text-white cursor-pointer p-1 rounded"
              >
                <MdClose size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAccountCode} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Customer Name:</label>
                <input
                  type="text"
                  value={getCustomerDisplayName(selectedCustomer)}
                  disabled
                  className="w-full rounded border border-stroke dark:border-strokedark px-3 h-9 bg-gray-100 dark:bg-meta-4/30 font-bold text-black dark:text-white text-xs cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400">Category:</span>
                  <span className="font-bold text-black dark:text-white text-xs">1. ASSETS</span>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-bold text-gray-400">Sub-Category:</span>
                  <span className="font-bold text-black dark:text-white text-xs">Current Assets</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[10px] uppercase font-bold text-gray-400">Control Group:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">Customers (Trade Debtors)</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-black dark:text-white mb-1">
                  Assign Account Code: *
                </label>
                <input
                  type="text"
                  value={accountCodeInput}
                  onChange={(e) => setAccountCodeInput(e.target.value)}
                  placeholder="e.g. 2020-001"
                  required
                  className="w-full rounded border border-stroke dark:border-strokedark px-3 h-10 bg-transparent font-mono font-bold text-sm text-black dark:text-white outline-none focus:border-primary"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                  Auto-links customer ledger under Chart of Accounts: <strong className="text-black dark:text-white font-mono">Customers ({accountCodeInput || '2020-xxx'})</strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1.5">Opening Balance (PKR):</label>
                  <input
                    type="number"
                    step="any"
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-stroke dark:border-strokedark px-3 py-2 bg-slate-50/50 dark:bg-boxdark font-mono font-bold text-xs text-black dark:text-white outline-none focus:border-primary"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Initial balance owed or advance held</p>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1.5">Balance Nature:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBalanceNatureInput('Debit')}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                        balanceNatureInput === 'Debit'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-stroke dark:border-strokedark hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {balanceNatureInput === 'Debit' && <MdCheckCircle size={13} />}
                      <span>Debit (Dr - Receivable)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceNatureInput('Credit')}
                      className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                        balanceNatureInput === 'Credit'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-stroke dark:border-strokedark hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {balanceNatureInput === 'Credit' && <MdCheckCircle size={13} />}
                      <span>Credit (Cr - Advance)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {balanceNatureInput === 'Debit' ? 'Customer owes this amount (Receivable)' : 'Customer paid advance (Excess Credit)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stroke dark:border-strokedark mt-4">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="rounded px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="rounded bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingAccount ? <Spinner size="w-3.5 h-3.5" color="border-white" /> : <MdCheckCircle size={15} />}
                  <span>Save & Sync to COA</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
                <MdDelete size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete Customer Profile</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{getCustomerDisplayName(customerToDelete)}</strong>
              {(customerToDelete.customer_code || customerToDelete.customerCode || customerToDelete.coa_code) && (
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold"> ({customerToDelete.customer_code || customerToDelete.customerCode || customerToDelete.coa_code})</span>
              )}?
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-meta-4/30 border border-slate-200 dark:border-slate-700">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteCustomerCOA}
                  onChange={(e) => setDeleteCustomerCOA(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Delete linked Chart of Accounts & Opening Balance
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Frees up account code <strong className="font-mono">{customerToDelete.customer_code || customerToDelete.customerCode || customerToDelete.coa_code || '2020-xxx'}</strong> so it can be reused for future customer entries.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={deletingCustomer}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-meta-4 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCustomer}
                disabled={deletingCustomer}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {deletingCustomer ? <Spinner size="w-3.5 h-3.5" color="border-white" /> : <MdDelete size={15} />}
                <span>Delete Customer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Customer Excel Import Modal */}
      <CustomerImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => fetchCustomersAndCOA()}
      />

    </div> 
  ); 
}; 

export default CustomerHistory;
