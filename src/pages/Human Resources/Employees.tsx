import React, { useEffect, useMemo, useState } from 'react';
import TablePagination from '../../components/TablePagination';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../ui/Spinner';
import {
  MdAccountBalanceWallet,
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
  MdArrowUpward,
  MdArrowDownward,
  MdReceiptLong,
  MdWarningAmber,
  MdSave
} from 'react-icons/md';
import {
  deleteEmployee,
  updateEmployee,
  Employee,
  getEmployees,
  getPayslips,
  PayslipRow,
  syncEmployeeCOA,
  cleanupOrphanEmployeeAccounts,
  checkEmployeeHasTransactions
} from '../../services/hr.service';
import { useHub } from '../Setup/useHub';
import { useTenant } from '../../Context/TenantContext';

export const EmployeesPage: React.FC = () => {
  const { tenantSlug, branchId } = useTenant();
  const navigate = useNavigate();
  const hub = useHub(() => getEmployees(tenantSlug, branchId), [tenantSlug, branchId]);
  const [coaAccounts, setCoaAccounts] = useState<any[]>([]);
  const [loadingCOA, setLoadingCOA] = useState(false);

  // Modal State for Chart of Accounts assignment
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [accountCodeInput, setAccountCodeInput] = useState('');
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');
  const [balanceNatureInput, setBalanceNatureInput] = useState<'Debit' | 'Credit'>('Credit');
  const [savingAccount, setSavingAccount] = useState(false);

  // Modal State for Financial History / Archive Separation
  const [archiveModal, setArchiveModal] = useState<{ emp: Employee; reason?: string } | null>(null);
  const [archiveStatus, setArchiveStatus] = useState<'Terminated' | 'Resigned'>('Resigned');
  const [archiveExitDate, setArchiveExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [archiveReason, setArchiveReason] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  const [checkingDeleteId, setCheckingDeleteId] = useState<number | null>(null);

  // Payslips Drawer Modal
  const [slips, setSlips] = useState<{ employee: Employee; rows: PayslipRow[] } | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);

  // Datatable Search, Sort, Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>('asc');

  useEffect(() => {
    fetchCOA();
  }, []);

  const fetchCOA = async () => {
    try {
      setLoadingCOA(true);
      const { data, error } = await supabase.from('chart_of_accounts').select('*');
      if (!error && data) {
        setCoaAccounts(data);
      }
    } catch (_) {
      // Fallback gracefully
    } finally {
      setLoadingCOA(false);
    }
  };

  const employees: Employee[] = hub.value?.data ?? [];

  useEffect(() => {
    if (employees.length > 0) {
      Promise.all(
        employees.map((emp) => {
          const code = (emp.account_code || emp.accountCode || '').trim();
          if (code && emp.name) {
            return syncEmployeeCOA(emp.name, code);
          }
          return Promise.resolve();
        })
      ).then(() => fetchCOA());
    }
  }, [employees.length]);

  const getEmployeeCOA = (emp: any) => {
    const directCode = (emp.account_code || emp.accountCode || '').trim();
    if (directCode) {
      const match = coaAccounts.find((a) => String(a.account_code).trim() === directCode);
      return match || { account_code: directCode };
    }
    const eName = (emp.name || '').trim().toLowerCase();
    return coaAccounts.find(
      (a) =>
        ((a.control_code === 'Employees' ||
          a.control_code === 'Salaries' ||
          a.control_code === 'Salaries Payable') &&
          (a.account_title || '').trim().toLowerCase() === eName)
    );
  };

  const getNextSuggestedCode = () => {
    const usedNumbers = new Set<number>();

    // 1. From chart of accounts
    (coaAccounts || []).forEach((a) => {
      const match = String(a.account_code || '').trim().match(/^2030-(\d+)$/);
      if (match) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    });

    // 2. From loaded employees
    (employees || []).forEach((e) => {
      const code = String(e.account_code || e.accountCode || '').trim();
      const match = code.match(/^2030-(\d+)$/);
      if (match) {
        usedNumbers.add(parseInt(match[1], 10));
      }
    });

    // 3. From local storage cache
    try {
      const raw = localStorage.getItem('zac_hr_employees');
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached)) {
          cached.forEach((e: any) => {
            const code = String(e.account_code || e.accountCode || '').trim();
            const match = code.match(/^2030-(\d+)$/);
            if (match) {
              usedNumbers.add(parseInt(match[1], 10));
            }
          });
        }
      }
    } catch (_) {}

    let nextNum = 1;
    while (usedNumbers.has(nextNum)) {
      nextNum++;
    }
    return `2030-${String(nextNum).padStart(3, '0')}`;
  };

  const handleOpenAccountModal = (emp: any) => {
    setSelectedEmp(emp);
    const existingCOA = getEmployeeCOA(emp);
    if (existingCOA) {
      setAccountCodeInput(existingCOA.account_code || '');
      setOpeningBalanceInput(
        existingCOA.opening_balance !== undefined && existingCOA.opening_balance !== null
          ? String(existingCOA.opening_balance)
          : ''
      );
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
    if (!selectedEmp) return;
    const cleanCode = accountCodeInput.trim();
    if (!cleanCode) {
      toast.error('Please enter an account code');
      return;
    }

    try {
      setSavingAccount(true);
      const empName = (selectedEmp.name || '').trim();
      const existingCOA = getEmployeeCOA(selectedEmp);

      // Check if code is already used by another employee/account
      const duplicateCode = coaAccounts.find(
        (a) =>
          String(a.account_code).trim().toLowerCase() === cleanCode.toLowerCase() &&
          a.id !== existingCOA?.id &&
          (a.account_title || '').trim().toLowerCase() !== empName.toLowerCase()
      );
      if (duplicateCode) {
        const catCode =
          duplicateCode.control_code ||
          duplicateCode.category_code ||
          duplicateCode.sub_category_code ||
          'Salaries Payable';
        toast(
          `This Chart of Account '${cleanCode}' already exists for '${duplicateCode.account_title || 'Existing Account'}' in '${catCode}' category code.`,
          {
            icon: '⚠️',
            duration: 5000,
            style: {
              borderRadius: '8px',
              background: '#1e293b',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '500'
            }
          }
        );
        setSavingAccount(false);
        return;
      }

      const notes = `Employee payroll ledger account for ${empName}${openingBalanceInput ? ` (Opening Balance: ${openingBalanceInput} ${balanceNatureInput})` : ''}`;
      const oldCode = (selectedEmp.account_code || selectedEmp.accountCode || '').trim();

      // Sync 1:1 in chart_of_accounts
      await syncEmployeeCOA(empName, cleanCode, oldCode, notes);

      // Update employee in database & local state
      await updateEmployee(
        selectedEmp.id,
        {
          account_code: cleanCode,
          accountCode: cleanCode
        },
        tenantSlug
      );

      toast.success(`Account code (${cleanCode}) assigned for employee "${empName}"!`);
      setShowAccountModal(false);
      await Promise.all([fetchCOA(), hub.reload()]);
    } catch (err: any) {
      toast.error('Failed to save account: ' + err.message);
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDelete = async (emp: Employee) => {
    try {
      setCheckingDeleteId(emp.id);
      const check = await checkEmployeeHasTransactions(emp);
      if (check.hasHistory) {
        setArchiveModal({ emp, reason: check.reason });
        setArchiveStatus('Resigned');
        setArchiveExitDate(new Date().toISOString().split('T')[0]);
        setArchiveReason('');
        return;
      }

      if (
        window.confirm(
          `Are you sure you want to delete employee "${emp.name}"? This will permanently delete their profile and remove their Chart of Accounts record.`
        )
      ) {
        await deleteEmployee(emp.id, tenantSlug);
        toast.success(`Employee "${emp.name}" deleted successfully`);
        await hub.reload();
        await fetchCOA();
      }
    } catch (err: any) {
      toast.error('Action failed: ' + err.message);
    } finally {
      setCheckingDeleteId(null);
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveModal) return;
    try {
      setIsArchiving(true);
      await updateEmployee(
        archiveModal.emp.id,
        {
          status: archiveStatus,
          exitDate: archiveExitDate,
          exitReason: archiveReason.trim() || undefined,
          isActive: false
        },
        tenantSlug
      );
      toast.success(
        `Employee "${archiveModal.emp.name}" status updated to ${archiveStatus === 'Terminated' ? 'Fired' : 'Resigned'}`
      );
      setArchiveModal(null);
      await hub.reload();
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleOpenSlips = async (emp: Employee) => {
    try {
      setSlipLoading(true);
      const slipList = await getPayslips(emp.id, tenantSlug);
      setSlips({ employee: emp, rows: Array.isArray(slipList) ? slipList : [] });
    } catch (err: any) {
      toast.error('Could not load payslips: ' + err.message);
      setSlips({ employee: emp, rows: [] });
    } finally {
      setSlipLoading(false);
    }
  };

  // Filter & Sort
  const filteredEmployees = useMemo(() => {
    let list = employees.filter((e) => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      return (
        (e.code || '').toLowerCase().includes(q) ||
        (e.name || '').toLowerCase().includes(q) ||
        (e.designationName || '').toLowerCase().includes(q) ||
        (e.departmentName || '').toLowerCase().includes(q) ||
        (e.phone || '').toLowerCase().includes(q) ||
        (e.city || '').toLowerCase().includes(q)
      );
    });

    if (sortOrder) {
      list = [...list].sort((a, b) => {
        const numA = parseInt((a.code || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.code || '').replace(/\D/g, ''), 10) || 0;
        if (numA !== numB) {
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        }
        return sortOrder === 'asc'
          ? (a.name || '').localeCompare(b.name || '')
          : (b.name || '').localeCompare(a.name || '');
      });
    }

    return list;
  }, [employees, searchTerm, sortOrder]);

  const totalEntries = filteredEmployees.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, sortOrder]);

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h4 className="text-xl font-semibold text-black dark:text-white">Employee Database</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage company employees, designations, joined dates, and assign Chart of Account ledger codes
          </p>
        </div>
        <button
          onClick={() => navigate('/Human-Resources/Employees/Add')}
          className="bg-primary text-white py-2 px-4 rounded text-sm font-medium hover:bg-opacity-90 transition cursor-pointer shadow-sm flex items-center gap-1.5"
        >
          <MdAdd size={18} />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* ── FILTER CONTROLS ── */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded border border-stroke py-1 px-2 bg-transparent dark:border-strokedark outline-none focus:border-primary text-sm font-medium text-black dark:text-white"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size} className="dark:bg-boxdark">
                {size}
              </option>
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
            placeholder="Search employee #, name, designation, phone..."
            className="w-full sm:w-72 rounded border border-stroke py-1.5 px-3 bg-transparent dark:border-strokedark outline-none focus:border-primary text-sm text-black dark:text-white"
          />
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              {/* 1. Employee # */}
              <th
                onClick={() =>
                  setSortOrder((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'))
                }
                className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white text-sm cursor-pointer select-none hover:text-primary transition"
                title="Click to sort by Employee #"
              >
                <div className="flex items-center gap-1">
                  <span>Employee #</span>
                  {sortOrder === 'asc' && <MdArrowUpward size={14} className="text-primary font-bold" />}
                  {sortOrder === 'desc' && <MdArrowDownward size={14} className="text-primary font-bold" />}
                  {!sortOrder && <span className="text-[10px] text-gray-400 font-normal">⇅</span>}
                </div>
              </th>

              {/* 2. Name */}
              <th className="min-w-[200px] py-4 px-4 font-medium text-black dark:text-white text-sm">
                Name
              </th>

              {/* 3. Account */}
              <th className="min-w-[160px] py-4 px-4 font-medium text-black dark:text-white text-sm">
                Account
              </th>

              {/* 4. Designation */}
              <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white text-sm">
                Designation
              </th>

              {/* 5. Joined */}
              <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white text-sm">
                Joined
              </th>

              {/* 6. Status */}
              <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white text-sm text-center">
                Status
              </th>

              {/* 7. Action */}
              <th className="py-4 px-4 font-medium text-black dark:text-white text-sm text-center w-28">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {hub.loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Spinner />
                </td>
              </tr>
            ) : paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                  No matching employee records found.
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp) => {
                const coa = getEmployeeCOA(emp);
                return (
                  <tr
                    key={emp.id}
                    className="border-b border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/10 duration-150"
                  >
                    {/* 1. Employee # */}
                    <td className="py-3.5 px-4 text-sm">
                      {emp.code ? (
                        <span className="font-mono font-bold text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded">
                          {emp.code}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-mono text-xs">-</span>
                      )}
                    </td>

                    {/* 2. Name */}
                    <td className="py-3.5 px-4 text-sm">
                      <span className="font-medium text-black dark:text-white">{emp.name}</span>
                      {emp.phone ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {emp.phone}
                        </p>
                      ) : null}
                    </td>

                    {/* 3. Account */}
                    <td className="py-3.5 px-4 text-sm">
                      {coa ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-black text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded shadow-2xs">
                            {coa.account_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenAccountModal(emp)}
                            className="text-[11px] text-primary hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5"
                            title="Edit Account Code"
                          >
                            <MdEdit size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenAccountModal(emp)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded hover:bg-amber-100 transition cursor-pointer"
                        >
                          <MdAdd size={13} />
                          <span>Assign Account</span>
                        </button>
                      )}
                    </td>

                    {/* 4. Designation */}
                    <td className="py-3.5 px-4 text-sm font-medium text-black dark:text-white">
                      {emp.designationName || '-'}
                    </td>

                    {/* 5. Joined */}
                    <td className="py-3.5 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {emp.joiningDate || '-'}
                    </td>

                    {/* 6. Status */}
                    <td className="py-3.5 px-4 text-sm text-center">
                      {emp.status === 'Active' || !emp.status ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active
                        </span>
                      ) : emp.status === 'Resigned' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                          Resigned
                        </span>
                      ) : emp.status === 'Terminated' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                          Fired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                          {emp.status}
                        </span>
                      )}
                    </td>

                    {/* 7. Action */}
                    <td className="py-3.5 px-4 text-sm text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenSlips(emp)}
                          className="p-1.5 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="View Payslips"
                        >
                          <MdReceiptLong size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate('/Human-Resources/Employees/Add', {
                              state: {
                                employee: {
                                  ...emp,
                                  accountCode: coa?.account_code || (emp as any).account_code || ''
                                }
                              }
                            })
                          }
                          className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                          title="Edit Employee"
                        >
                          <MdEdit size={17} />
                        </button>
                        <button
                          type="button"
                          disabled={checkingDeleteId === emp.id}
                          onClick={() => handleDelete(emp)}
                          className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer disabled:opacity-75 flex items-center justify-center w-7 h-7"
                          title={checkingDeleteId === emp.id ? 'Checking transaction history...' : 'Delete Employee'}
                        >
                          {checkingDeleteId === emp.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <MdDelete size={17} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── PAGINATION FOOTER ── */}
      <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={totalEntries}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          itemName="entries"
        />

      {/* ── ASSIGN / EDIT COA ACCOUNT MODAL ── */}
      {showAccountModal && selectedEmp && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-lg border border-stroke bg-white p-6 shadow-2xl dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between border-b border-stroke pb-3 mb-4 dark:border-strokedark">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <MdAccountBalanceWallet size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-black dark:text-white text-sm">Assign Chart of Account Code</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Maps employee directly into Salaries & Wages Payable liability ledger
                  </p>
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
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Employee Name:
                </label>
                <input
                  type="text"
                  value={selectedEmp.name || ''}
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
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                    Salaries & Wages Payable
                  </span>
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
                  placeholder="e.g. 2030-001"
                  required
                  className="w-full rounded border border-stroke dark:border-strokedark px-3 h-10 bg-transparent font-mono font-bold text-sm text-black dark:text-white outline-none focus:border-primary"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Suggested format: <strong className="font-mono text-emerald-600">2030-xxx</strong>
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-stroke dark:border-strokedark">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 rounded text-xs font-semibold border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-meta-4 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="bg-emerald-600 text-white px-5 py-2 rounded text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {savingAccount ? 'Saving...' : 'Assign & Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── FINANCIAL HISTORY SEPARATION / ARCHIVE MODAL ── */}
      {archiveModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-lg border border-stroke bg-white p-6 shadow-2xl dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-start justify-between pb-3 border-b border-stroke dark:border-strokedark">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                  <MdWarningAmber size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-black dark:text-white text-base">
                    Financial History Detected
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Employee: <span className="font-semibold text-black dark:text-white">{archiveModal.emp.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setArchiveModal(null)}
                className="text-gray-400 hover:text-black dark:hover:text-white p-1 cursor-pointer"
              >
                <MdClose size={20} />
              </button>
            </div>

            <div className="my-4 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              <div className="p-3 mb-4 rounded-md bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300">
                <span className="font-bold">⚠️ Ledger records exist:</span> {archiveModal.reason || 'This employee has historical financial and payroll records.'}
                <div className="mt-1 text-[11px] opacity-90">
                  Permanent deletion is prevented to protect past accounting statements. Please select an exit separation status:
                </div>
              </div>

              {/* Status Choice */}
              <div className="space-y-2.5">
                <label className="block font-bold text-black dark:text-white">
                  Select Separation Status:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setArchiveStatus('Terminated')}
                    className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 cursor-pointer ${
                      archiveStatus === 'Terminated'
                        ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-bold shadow-xs'
                        : 'border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs">
                      🛑 <span>Fired / Terminated</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal">Discharged by company</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setArchiveStatus('Resigned')}
                    className={`p-3 rounded-lg border text-left transition flex flex-col gap-1 cursor-pointer ${
                      archiveStatus === 'Resigned'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-bold shadow-xs'
                        : 'border-stroke dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/30'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-xs">
                      📋 <span>Resigned</span>
                    </span>
                    <span className="text-[10px] text-gray-500 font-normal">Voluntary resignation</span>
                  </button>
                </div>
              </div>

              {/* Exit Date & Reason */}
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">
                    Effective Exit Date
                  </label>
                  <input
                    type="date"
                    value={archiveExitDate}
                    onChange={(e) => setArchiveExitDate(e.target.value)}
                    className="w-full rounded border border-stroke dark:border-strokedark px-3 py-2 bg-transparent text-black dark:text-white outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-black dark:text-white mb-1">
                    Reason / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Relocation, mutual agreement, performance..."
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    className="w-full rounded border border-stroke dark:border-strokedark px-3 py-2 bg-transparent text-black dark:text-white outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stroke dark:border-strokedark">
              <button
                type="button"
                onClick={() => setArchiveModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isArchiving}
                onClick={handleConfirmArchive}
                className="px-5 py-2 text-xs font-bold rounded bg-primary text-white hover:bg-opacity-90 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isArchiving ? <Spinner /> : <MdSave size={16} />}
                <span>Apply Status & Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYSLIPS MODAL ── */}
      {slips && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-2xl rounded-lg border border-stroke bg-white p-6 shadow-2xl dark:border-strokedark dark:bg-boxdark">
            <div className="flex items-center justify-between border-b border-stroke pb-3 mb-4 dark:border-strokedark">
              <div>
                <h4 className="font-bold text-black dark:text-white text-base">
                  Payslips — {slips.employee.name} ({slips.employee.code})
                </h4>
                <p className="text-xs text-gray-500">History of salary sheets and monthly payouts</p>
              </div>
              <button
                type="button"
                onClick={() => setSlips(null)}
                className="text-gray-400 hover:text-black dark:hover:text-white cursor-pointer p-1 rounded"
              >
                <MdClose size={20} />
              </button>
            </div>

            {!slips.rows || slips.rows.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">
                No payslips found for this employee yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="py-2 px-3">Sheet #</th>
                      <th className="py-2 px-3">Month</th>
                      <th className="py-2 px-3 text-right">Basic</th>
                      <th className="py-2 px-3 text-right">Gross</th>
                      <th className="py-2 px-3 text-right">Net</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(slips.rows || []).map((r) => (
                      <tr key={`${r.number}-${r.employeeId}`} className="border-b border-stroke dark:border-strokedark">
                        <td className="py-2 px-3 font-mono font-bold">{r.number}</td>
                        <td className="py-2 px-3">{r.monthLabel}</td>
                        <td className="py-2 px-3 text-right font-mono">Rs. {Number(r.basic || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono">Rs. {Number(r.gross || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                          Rs. {Number(r.net || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                            {r.paid ? 'Paid' : r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
