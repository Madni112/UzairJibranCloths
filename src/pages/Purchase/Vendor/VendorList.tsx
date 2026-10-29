import React, { useEffect, useState } from 'react';
import TablePagination from '../../../components/TablePagination';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import TableActions from '../../../ui/TableActions';
import { DEFAULT_SUB_AREAS } from '../../../components/SubAreaAreaInput';
import { MdEdit, MdDelete, MdMoreVert, MdEmail, MdPhone, MdPerson, MdBusiness, MdAccountBalanceWallet, MdAdd, MdClose, MdCheckCircle, MdArrowUpward, MdArrowDownward } from 'react-icons/md';

const VendorList = () => {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState<any[]>([]);
    const [coaAccounts, setCoaAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    const [accountCodeInput, setAccountCodeInput] = useState('');
    const [openingBalanceInput, setOpeningBalanceInput] = useState('');
    const [balanceNatureInput, setBalanceNatureInput] = useState<'Debit' | 'Credit'>('Credit');
    const [savingAccount, setSavingAccount] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSortOrder, setPageSortOrder] = useState<'asc' | 'desc' | null>('asc');

    const fetchRegisteredVendorsAndCOA = async () => {
        try {
            setLoading(true);
            const [vendRes, coaRes] = await Promise.all([
                supabase.from('vendors').select('*').order('id', { ascending: false }),
                supabase.from('chart_of_accounts').select('*')
            ]);

            if (vendRes.error) throw vendRes.error;
            setVendors(vendRes.data || []);
            if (coaRes.data) setCoaAccounts(coaRes.data);
        } catch (err: any) {
            toast.error('Registry Lookup Broken: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRegisteredVendorsAndCOA();
    }, []);

    const getVendorCOA = (vend: any) => {
        const vName = (vend.vendor_name || vend.name || '').trim().toLowerCase();
        return coaAccounts.find(a => 
            (vend.account_code && String(a.account_code).trim() === String(vend.account_code).trim()) ||
            ((a.control_code === 'Vendor' || a.control_code === 'Vendors') && (a.account_title || '').trim().toLowerCase() === vName) ||
            ((a.account_title || '').trim().toLowerCase() === vName)
        );
    };

    const getNextSuggestedCode = () => {
        const vendAccounts = coaAccounts.filter(a => a.control_code === 'Vendor' || a.control_code === 'Vendors' || String(a.account_code).startsWith('2010-'));
        let maxNum = 0;
        vendAccounts.forEach(a => {
            const match = String(a.account_code || '').match(/2010-(\d+)/);
            if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        return `2010-${String(maxNum + 1).padStart(3, '0')}`;
    };

    const handleOpenAccountModal = (vend: any) => {
        setSelectedVendor(vend);
        const existingCOA = getVendorCOA(vend);
        if (existingCOA) {
            setAccountCodeInput(existingCOA.account_code || '');
            setOpeningBalanceInput(existingCOA.opening_balance !== undefined && existingCOA.opening_balance !== null ? String(existingCOA.opening_balance) : '');
            setBalanceNatureInput(existingCOA.balance_nature || 'Credit');
        } else {
            setAccountCodeInput(getNextSuggestedCode());
            setOpeningBalanceInput('');
            setBalanceNatureInput('Credit');
        }
        setShowAccountModal(true);
    };

    const handleSaveAccountCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVendor) return;
        const cleanCode = accountCodeInput.trim();
        if (!cleanCode) {
            toast.error('Account Code is mandatory');
            return;
        }

        try {
            setSavingAccount(true);
            const existingCOA = getVendorCOA(selectedVendor);

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

            const vendorName = (selectedVendor.vendor_name || selectedVendor.name || '').trim();
            const coaPayload: any = {
                category_code: '2. LIABILITIES',
                sub_category_code: 'Current Liabilities',
                control_code: 'Vendor',
                account_code: cleanCode,
                account_title: vendorName,
                notes: `Vendor ledger account for ${vendorName}${openingBalanceInput ? ` (Opening Balance: ${openingBalanceInput} ${balanceNatureInput})` : ''}`
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

            // Record Opening Balance in financial_vouchers if opening balance > 0
            if (openingBalanceInput && Number(openingBalanceInput) > 0) {
                const bal = Number(openingBalanceInput);
                try {
                    await supabase.from('financial_vouchers').insert([{
                        voucher_no: `OB-${cleanCode}`,
                        voucher_type: 'JV',
                        voucher_date: new Date().toISOString().split('T')[0],
                        account_code: cleanCode,
                        account_title: vendorName,
                        debit: balanceNatureInput === 'Debit' ? bal : 0,
                        credit: balanceNatureInput === 'Credit' ? bal : 0,
                        narration: `Opening Balance for Vendor ${vendorName}`
                    }]);
                } catch (_) {
                    // Non-blocking
                }
            }

            // Try updating vendor record with account_code and currentBalance
            try {
                const vendUpdates: any = { account_code: cleanCode };
                if (openingBalanceInput) {
                    const bal = Number(openingBalanceInput);
                    vendUpdates.balance = balanceNatureInput === 'Credit' ? bal : -bal;
                    vendUpdates.opening_balance = bal;
                }
                await supabase
                    .from('vendors')
                    .update(vendUpdates)
                    .eq('id', selectedVendor.id);
            } catch (_) {
                try {
                    await supabase
                        .from('vendors')
                        .update({ account_code: cleanCode })
                        .eq('id', selectedVendor.id);
                } catch (_) {}
            }

            toast.success(`Chart of Account for "${vendorName}" assigned successfully!`);
            setShowAccountModal(false);
            await fetchRegisteredVendorsAndCOA();
        } catch (err: any) {
            toast.error('Failed to save account: ' + err.message);
        } finally {
            setSavingAccount(false);
        }
    };

    const handleDeleteVendorRecord = async (id: string | number) => {
        if (!window.confirm('Are you absolutely certain you want to delete this vendor account entry?')) return;

        try {
            const { error } = await supabase.from('vendors').delete().eq('id', id);
            if (error) throw error;

            toast.success('Vendor profile dropped from enterprise directory successfully.');
            fetchRegisteredVendorsAndCOA();
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const parsePageNumber = (val?: string | null): number | null => {
        if (!val) return null;
        const match = String(val).match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
    };

    const getVendorLocation = (v: any) => {
        let city = v.sub_area || v.subArea || v.city || '';
        let area = v.area || '';

        // Fallback: If city is missing, scan address for known cities
        if (!city && v.address) {
            const addr = String(v.address).toLowerCase();
            for (const c of DEFAULT_SUB_AREAS) {
                if (addr.includes(c.toLowerCase())) {
                    city = c;
                    break;
                }
            }
        }

        return { city, area };
    };

    const filteredVendors = vendors
        .filter(v => {
            const term = searchTerm.trim().toLowerCase();
            if (!term) return true;

            const cleanTerm = term.replace(/[\s-]/g, '');
            const loc = getVendorLocation(v);
            const coa = getVendorCOA(v);

            const name = (v.vendor_name || v.name || '').toLowerCase();
            const code = (v.vendor_code || v.vendorCode || '').toLowerCase();
            const pageNo = String(v.page_no || v.pageNo || '').toLowerCase();
            const contact = (v.contact_name || '').toLowerCase();
            const city = (loc.city || v.sub_area || v.subArea || v.city || '').toLowerCase();
            const area = (loc.area || v.area || '').toLowerCase();
            const address = (v.address || '').toLowerCase();
            const coaCode = String(coa?.account_code || v.account_code || '').toLowerCase();
            const email = (v.email || '').toLowerCase();

            // Phone numbers
            const rawCell = String(v.cell_no || '').toLowerCase();
            const rawPhone = String(v.phone_no || v.phone || '').toLowerCase();
            const cleanCell = rawCell.replace(/[\s-]/g, '');
            const cleanPhone = rawPhone.replace(/[\s-]/g, '');

            return (
                name.includes(term) ||
                code.includes(term) ||
                pageNo.includes(term) ||
                contact.includes(term) ||
                city.includes(term) ||
                area.includes(term) ||
                address.includes(term) ||
                coaCode.includes(term) ||
                email.includes(term) ||
                rawCell.includes(term) ||
                rawPhone.includes(term) ||
                (cleanTerm.length > 0 && (cleanCell.includes(cleanTerm) || cleanPhone.includes(cleanTerm)))
            );
        })
        .sort((a, b) => {
            if (!pageSortOrder) {
                return (a.vendor_name || a.name || '').localeCompare(b.vendor_name || b.name || '');
            }

            const pageA = a.page_no || a.pageNo;
            const pageB = b.page_no || b.pageNo;
            const numA = parsePageNumber(pageA);
            const numB = parsePageNumber(pageB);

            // If both have numeric page numbers
            if (numA !== null && numB !== null) {
                if (numA !== numB) {
                    return pageSortOrder === 'asc' ? numA - numB : numB - numA;
                }
                return String(pageA).localeCompare(String(pageB), undefined, { numeric: true });
            }

            // If only one has a page number
            if (numA !== null && numB === null) return pageSortOrder === 'asc' ? -1 : 1;
            if (numA === null && numB !== null) return pageSortOrder === 'asc' ? 1 : -1;

            // If both have text/alphanumeric page numbers
            if (pageA && pageB) {
                return pageSortOrder === 'asc'
                    ? String(pageA).localeCompare(String(pageB), undefined, { numeric: true })
                    : String(pageB).localeCompare(String(pageA), undefined, { numeric: true });
            }
            if (pageA && !pageB) return pageSortOrder === 'asc' ? -1 : 1;
            if (!pageA && pageB) return pageSortOrder === 'asc' ? 1 : -1;

            // Fallback secondary sort: alphabetical by vendor name
            return (a.vendor_name || a.name || '').localeCompare(b.vendor_name || b.name || '');
        });

    const totalEntries = filteredVendors.length;
    const totalPages = Math.ceil(totalEntries / pageSize);
    const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalEntries);
    const paginatedVendors = filteredVendors.slice(startIndex, startIndex + pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, pageSize, pageSortOrder]);

    return (
        <div className="mx-auto max-w-7xl flex flex-col gap-6 relative text-black dark:text-bodydark text-xs">

            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-black dark:text-white">Wholesale Vendor Master Directory</h2>
                    <p className="text-xs text-gray-400">Browse supply business profiles, manage tax coordinates, and map Chart of Account codes</p>
                </div>
                <button
                    type="button"
                    onClick={() => navigate('/Purchase/Vendor/Add')}
                    className="flex items-center justify-center rounded bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-opacity-90 transition shadow-sm cursor-pointer"
                >
                    + Add New Vendor
                </button>
            </div>

            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6">

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>Show</span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="rounded border border-stroke py-1 px-2 bg-transparent dark:border-strokedark outline-none text-black dark:text-white font-bold"
                        >
                            {[10, 25, 50, 100].map((size) => (
                                <option key={size} value={size} className="dark:bg-boxdark">{size}</option>
                            ))}
                        </select>
                        <span>entries</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm w-full sm:w-auto text-gray-500 dark:text-gray-400">
                        <span>Search:</span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search name, phone, city, area, account, page #..."
                            className="w-full sm:w-64 rounded border border-stroke py-1.5 px-3 bg-transparent dark:border-strokedark outline-none text-black dark:text-white text-xs font-semibold"
                        />
                    </div>
                </div>

                <div className="max-w-full overflow-x-auto">
                    <table className="w-full table-auto border-collapse">
                        <thead>
                            <tr className="bg-gray-2 text-left dark:bg-meta-4 text-xs font-bold uppercase tracking-wider text-black dark:text-white border-b border-stroke dark:border-strokedark">
                                <th 
                                    onClick={() => setPageSortOrder(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')}
                                    className="py-4 px-4 font-semibold min-w-[95px] cursor-pointer select-none hover:text-primary transition"
                                    title="Click to toggle Page # sorting"
                                >
                                    <div className="flex items-center gap-1">
                                        <span>Page #</span>
                                        {pageSortOrder === 'asc' && <MdArrowUpward size={14} className="text-primary font-bold" />}
                                        {pageSortOrder === 'desc' && <MdArrowDownward size={14} className="text-primary font-bold" />}
                                        {!pageSortOrder && <span className="text-[10px] text-gray-400 font-normal">⇅</span>}
                                    </div>
                                </th>
                                <th className="py-4 px-4 font-semibold min-w-[100px]">Code</th>
                                <th className="py-4 px-4 font-semibold min-w-[170px]">Vendor / Business Name</th>
                                <th className="py-4 px-4 font-semibold min-w-[130px]">Contact Person</th>
                                <th className="py-4 px-4 font-semibold min-w-[120px]">Mobile / Phone</th>
                                <th className="py-4 px-4 font-semibold min-w-[130px]">City / Area</th>
                                <th className="py-4 px-4 font-semibold min-w-[130px]">Address</th>
                                <th className="py-4 px-4 font-semibold min-w-[150px]">Accounts</th>
                                <th className="py-4 px-4 font-semibold w-24 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="text-center py-12 text-sm"><Spinner /></td></tr>
                            ) : paginatedVendors.length === 0 ? (
                                <tr><td colSpan={9} className="text-center py-10 text-sm text-gray-500 dark:text-gray-400 italic">No business merchant vendors registered yet.</td></tr>
                            ) : (
                                paginatedVendors.map((vendor) => {
                                    const coa = getVendorCOA(vendor);
                                    const vendCode = vendor.vendor_code || vendor.vendorCode;
                                    const pageNo = vendor.page_no || vendor.pageNo;
                                    const loc = getVendorLocation(vendor);

                                    return (
                                        <tr key={vendor.id} className="border-b border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/10 duration-150 font-semibold text-black dark:text-white text-xs">
                                            {/* 1. Page # */}
                                            <td className="py-3.5 px-4">
                                                {pageNo ? (
                                                    <span className="font-mono font-bold text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded">
                                                        {pageNo}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 font-mono text-xs">-</span>
                                                )}
                                            </td>

                                            {/* 2. Code */}
                                            <td className="py-3.5 px-4">
                                                {vendCode ? (
                                                    <span className="font-mono font-bold text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded">
                                                        {vendCode}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 font-mono text-xs">-</span>
                                                )}
                                            </td>

                                            {/* 3. Vendor Name */}
                                            <td className="py-3.5 px-4 font-bold text-primary dark:text-white">
                                                <div className="flex items-center gap-1.5">
                                                    <MdBusiness className="text-gray-400 shrink-0" size={16} />
                                                    <span>{vendor.vendor_name || vendor.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                                                <span className="inline-flex items-center gap-1">
                                                    <MdPerson size={14} className="text-gray-400" />
                                                    {vendor.contact_name || '-'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                                                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                                                    <MdPhone size={14} className="text-gray-400" />
                                                    {vendor.cell_no || vendor.phone_no || vendor.phone || '-'}
                                                </span>
                                            </td>
                                            {/* City / Area */}
                                            <td className="py-3.5 px-4">
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
                                            <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                                {vendor.address || '-'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {coa ? (
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-mono font-black text-[11px] text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-700 px-2 py-0.5 rounded shadow-2xs">
                                                            {coa.account_code}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenAccountModal(vendor)}
                                                            className="text-[11px] text-primary hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5"
                                                            title="Edit Account Code"
                                                        >
                                                            <MdEdit size={12} /> Edit
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenAccountModal(vendor)}
                                                        className="inline-flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded text-xs font-bold transition duration-150 shadow-xs cursor-pointer"
                                                    >
                                                        <MdAdd size={14} /> Link Account
                                                    </button>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <TableActions
                                                    onEdit={() => navigate(`/Purchase/Vendor/Edit/${vendor.id}`, { state: { vendor } })}
                                                    onDelete={() => handleDeleteVendorRecord(vendor.id)}
                                                    editTitle="Edit Supplier"
                                                    deleteTitle="Delete Supplier"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Strip */}
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

            {/* ── ASSIGN / EDIT VENDOR ACCOUNT CODE MODAL ── */}
            {showAccountModal && selectedVendor && (
                <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="w-full max-w-lg rounded-lg border border-stroke bg-white p-6 shadow-2xl dark:border-strokedark dark:bg-boxdark">
                        <div className="flex items-center justify-between border-b border-stroke pb-3 mb-4 dark:border-strokedark">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600">
                                    <MdAccountBalanceWallet size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-black dark:text-white text-sm">Assign Chart of Account Code</h4>
                                    <p className="text-xs text-gray-500">Maps vendor directly into Accounts Payable liability ledger</p>
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
                                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Vendor / Business Name:</label>
                                <input
                                    type="text"
                                    value={selectedVendor.vendor_name || selectedVendor.name || ''}
                                    disabled
                                    className="w-full rounded border border-stroke dark:border-strokedark px-3 h-9 bg-gray-100 dark:bg-meta-4/30 font-bold text-black dark:text-white text-xs cursor-not-allowed"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded border border-slate-200 dark:border-slate-700">
                                <div>
                                    <span className="block text-[10px] uppercase font-bold text-gray-400">Category:</span>
                                    <span className="font-bold text-black dark:text-white text-xs">2. LIABILITIES</span>
                                </div>
                                <div>
                                    <span className="block text-[10px] uppercase font-bold text-gray-400">Sub-Category:</span>
                                    <span className="font-bold text-black dark:text-white text-xs">Current Liabilities</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="block text-[10px] uppercase font-bold text-gray-400">Control Group:</span>
                                    <span className="font-bold text-purple-700 dark:text-purple-400 text-xs">Vendor (Trade Creditors)</span>
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
                                    placeholder="e.g. 2010-001"
                                    required
                                    className="w-full rounded border border-stroke dark:border-strokedark px-3 h-10 bg-transparent font-mono font-bold text-sm text-black dark:text-white outline-none focus:border-primary"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Auto-suggested prefix <code className="font-mono text-purple-600">2010-xxx</code>. You can also customize this code.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Opening Balance:</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={openingBalanceInput}
                                        onChange={(e) => setOpeningBalanceInput(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full rounded border border-stroke dark:border-strokedark px-3 h-9 bg-transparent font-mono font-bold text-xs text-black dark:text-white outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Balance Nature:</label>
                                    <select
                                        value={balanceNatureInput}
                                        onChange={(e) => setBalanceNatureInput(e.target.value as 'Debit' | 'Credit')}
                                        className="w-full rounded border border-stroke dark:border-strokedark px-3 h-9 bg-transparent font-bold text-xs text-black dark:text-white outline-none focus:border-primary dark:bg-boxdark"
                                    >
                                        <option value="Credit">Credit (Cr - Normal Payable)</option>
                                        <option value="Debit">Debit (Dr - Advance Paid)</option>
                                    </select>
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
                                    className="rounded bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {savingAccount ? <Spinner size="w-3.5 h-3.5" color="border-white" /> : <MdCheckCircle size={15} />}
                                    <span>Save & Sync to COA</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};

export default VendorList;
