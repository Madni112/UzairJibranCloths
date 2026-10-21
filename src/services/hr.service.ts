/**
 * Human Resource Service with Supabase Backend & Resilient Offline/Local Fallback
 */
import { supabase } from '../Context/supabaseClient';
import { isoDay } from '../utils/dateRange';

export type PayHeadKind = 'Earning' | 'Deduction';
export type SheetStatus = 'Draft' | 'Approved' | 'Paid';
export type HrMark = 'Present' | 'Absent' | 'Half Day' | 'Leave' | 'Off' | 'Holiday' | 'On Duty';
export type LeaveStatus = 'Applied' | 'Approved' | 'Rejected' | 'Cancelled' | 'Expired';

export interface Employee {
  id: number;
  code: string;
  name: string;
  fatherName?: string;
  cnic?: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  departmentId?: number | null;
  departmentName?: string;
  designationId?: number | null;
  designationName?: string;
  grade?: string;
  branchId?: number;
  employmentType?: string;
  status: 'Active' | 'On Leave' | 'Notice Period' | 'Resigned' | 'Terminated';
  joiningDate?: string;
  confirmationDate?: string;
  exitDate?: string;
  exitReason?: string;
  basicSalary: number;
  gross: number;
  net: number;
  loanBalance: number;
  bankName?: string;
  bankAccount?: string;
  weeklyOff?: string;
  userId?: string | null;
  notes?: string;
  isActive?: boolean;
  account_code?: string;
  accountCode?: string;
}

export interface PayHead {
  id: number;
  name: string;
  code: string;
  kind: PayHeadKind;
  basis: 'Fixed' | 'Basic %' | 'Gross %';
  rate: number;
  amount: number;
  accountId?: string | number | null;
  accountName?: string;
  auto: boolean;
  rule: string;
  taxable: boolean;
  sequence: number;
  isActive: boolean;
  description?: string;
}

export interface StructureLine {
  id?: number;
  headId: number;
  name: string;
  kind: 'Earning' | 'Deduction';
  basis: 'Fixed' | 'Basic %' | 'Gross %' | string;
  rate: number;
  amount: number;
  isDefault?: boolean;
}

export interface SalaryStructureView {
  employeeId: number;
  code: string;
  name: string;
  department: string;
  designation: string;
  grade: string;
  basic: number;
  gross: number;
  net: number;
  revisedOn?: string;
  notes?: string;
  lines: StructureLine[];
  history?: { revisedOn: string; basic: number; gross: number; net: number; notes?: string }[];
}

export interface PayItem {
  name: string;
  amount: number;
}

export interface LoanRecoveryItem {
  loanId: number;
  number: string;
  kind: 'Loan' | 'Advance' | 'Advance Salary';
  amount: number;
  installmentAmount: number;
  balance: number;
  deductAmount: number;
  isSkipped: boolean;
}

export interface PayrollLine {
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  code: string;
  name: string;
  department: string;
  designation: string;
  grade: string;
  basic: number;
  bonus: number;
  absentCut: number;
  advanceDeduction: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  halfDays?: number;
  lateDays: number;
  overtimeHours: number;
  earnings: PayItem[];
  extraEarnings: PayItem[];
  deductions: PayItem[];
  extraDeductions: PayItem[];
  loanDeduction: number;
  loanRecoveries?: LoanRecoveryItem[];
  gross: number;
  totalDeductions: number;
  netPay: number;
  net?: number;
  absence?: number;
  recoveries?: { loanId?: number; number: string; amount: number; kind?: string; isSkipped?: boolean }[];
  payableDays?: number;
  present?: number;
  absent?: number;
  leaves?: number;
  unpaidDays?: number;
  paid?: boolean;
  bankAccount?: string;
  bankName?: string;
  status: string;
  remarks?: string;
  attendanceDays?: Record<string, HrMark | ''>;
}

export interface SalarySheetHead {
  id: number;
  month: string;
  totalBasic: number;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
  totalLoans: number;
  status: SheetStatus;
  approvedBy?: string;
  paidDate?: string;
  paidThrough?: string;
  createdAt?: string;
}

export interface SalarySheetView {
  sheet: SalarySheetHead;
  lines: PayrollLine[];
}

export interface HrSettings {
  standardWorkingDays: number;
  lateDeductionRatio: number;
  overtimeHourlyRate: number;
  defaultWeeklyOff: string;
}

export interface PayslipRow {
  number: string;
  month: string;
  monthLabel: string;
  employeeId: number;
  employeeName: string;
  basic: number;
  gross: number;
  net: number;
  status: string;
  paid: boolean;
}

export interface ApprovedLeaveMeta {
  id: number;
  number?: string;
  leaveType: string;
  halfDay: boolean;
  from: string;
  to: string;
}

export interface AttendanceRow {
  employeeId: number;
  code: string;
  name: string;
  department: string;
  designation: string;
  grade: string;
  days: Record<string, HrMark | ''>;
  approvedLeaveDays?: Record<string, ApprovedLeaveMeta>;
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  off: number;
  holiday: number;
  onDuty: number;
  totalWorkingDays: number;
  lateDays: number;
  overtimeHours: number;
  note?: string;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  daysPerYear: number;
  carryForward: number;
  paid: boolean;
  requiresProof: boolean;
  isActive: boolean;
  description?: string;
}

export interface LeaveApplication {
  id: number;
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  department?: string;
  designation?: string;
  leaveTypeId: number;
  leaveTypeName?: string;
  customType?: string;
  from: string;
  to: string;
  days: number;
  halfDay: boolean;
  reason: string;
  addressOnLeave?: string;
  status: LeaveStatus;
  appliedOn?: string;
  approvedBy?: string;
  decidedBy?: string;
  remarks?: string;
  expiryDate?: string;
}

export interface LeaveBalanceRow {
  leaveTypeId: number;
  leaveTypeName: string;
  allowed: number;
  taken: number;
  balance: number;
}

export interface EmployeeLoan {
  id: number;
  number?: string;
  employeeId: number;
  employeeCode?: string;
  employeeName?: string;
  department?: string;
  kind: 'Loan' | 'Advance' | 'Advance Salary';
  purpose: string;
  sanctionedOn: string;
  amount: number;
  installments: number;
  installmentAmount: number;
  startMonth: string;
  recoveredAmount?: number;
  balanceAmount?: number;
  paidOutOf?: 'Cash' | 'Bank' | 'Split';
  accountId?: number | null;
  accountName?: string;
  cashAmount?: number;
  bankId?: number | null;
  bankName?: string;
  bankAmount?: number;
  chequeNo?: string;
  remarks?: string;
  status: 'Active' | 'Closed' | 'Cancelled';
  installmentsPaid?: number;
  deducted?: number;
  balance?: number;
  left?: number;
  journalNumber?: string;
  skippedMonths?: string[];
  deductionHistory?: { month: string; amount: number; skipped?: boolean; sheetId?: number; date?: string }[];
}

export interface PayslipRow {
  month: string;
  basic: number;
  gross: number;
  deductions: number;
  net: number;
  paidOn?: string;
  paidThrough?: string;
}

export const monthNamed = (isoMonth: string) => {
  if (!isoMonth) return '';
  const [y, m] = isoMonth.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// -------------------------------------------------------------
// LOCAL STORAGE CACHE HELPERS FOR INSTANT RESPONSIVENESS
// -------------------------------------------------------------
const getLocal = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(`zac_hr_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setLocal = (key: string, val: any) => {
  try {
    localStorage.setItem(`zac_hr_${key}`, JSON.stringify(val));
  } catch (_) {}
};

// Seed initial default pay heads if empty
const DEFAULT_PAY_HEADS: PayHead[] = [
  { id: 1, name: 'Bonus', code: 'BONUS', kind: 'Earning', basis: 'Fixed', rate: 0, amount: 0, auto: false, rule: '', taxable: false, sequence: 1, isActive: true, description: 'Monthly performance bonus' },
  { id: 2, name: 'Advance / Loan Recovery', code: 'LOAN_REC', kind: 'Deduction', basis: 'Fixed', rate: 0, amount: 0, auto: true, rule: 'LoanRecovery', taxable: false, sequence: 2, isActive: true, description: 'Monthly staff advance / loan repayment' }
];

export const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  { id: 1, name: 'Casual Leave', code: 'CL', daysPerYear: 10, carryForward: 0, paid: true, requiresProof: false, isActive: true, description: 'Casual personal leaves' },
  { id: 2, name: 'Sick Leave', code: 'SL', daysPerYear: 5, carryForward: 0, paid: true, requiresProof: false, isActive: true, description: 'Medical illness leaves' },
  { id: 3, name: 'Other (Please Specify)', code: 'OTHER', daysPerYear: 0, carryForward: 0, paid: true, requiresProof: false, isActive: true, description: 'Custom/Special Leave' }
];

// =============================================================
// 1. EMPLOYEES
// =============================================================
export const getEmployees = async (_tenantSlug?: string, _branchId?: number) => {
  let formatted: Employee[] = [];
  try {
    const { data, error } = await supabase.from('hr_employees').select('*').order('id', { ascending: false });
    if (!error && data && data.length > 0) {
      formatted = data.map((d: any) => ({
        id: d.id,
        code: d.code || `EMP-${d.id}`,
        name: d.name,
        fatherName: d.father_name,
        cnic: d.cnic,
        gender: d.gender || 'Male',
        phone: d.phone,
        email: d.email,
        address: d.address,
        city: d.city,
        departmentId: d.department_id,
        departmentName: d.department_name || 'Operations',
        designationId: d.designation_id,
        designationName: d.designation_name || 'Staff',
        grade: d.grade || 'G-3',
        branchId: d.branch_id || 1,
        employmentType: d.employment_type || 'Permanent',
        status: d.status || 'Active',
        joiningDate: d.joining_date || isoDay(),
        confirmationDate: d.confirmation_date,
        exitDate: d.exit_date,
        exitReason: d.exit_reason,
        basicSalary: Number(d.basic_salary || 0),
        gross: Number(d.gross || d.basic_salary || 0),
        net: Number(d.net || d.basic_salary || 0),
        loanBalance: Number(d.loan_balance || 0),
        bankName: d.bank_name,
        bankAccount: d.bank_account,
        weeklyOff: d.weekly_off || 'Sunday',
        userId: d.user_id,
        notes: d.notes,
        isActive: d.is_active !== false,
        account_code: d.account_code || d.accountCode || '',
        accountCode: d.account_code || d.accountCode || ''
      }));
      setLocal('employees', formatted);
    }
  } catch (e) {
    console.warn('Supabase hr_employees read skipped, using local cache:', e);
  }

  if (formatted.length === 0) {
    formatted = getLocal<Employee[]>('employees', []);
  }

  const defaultDepts = [
    { id: 1, name: 'Operations' },
    { id: 2, name: 'Sales' },
    { id: 3, name: 'Accounts' },
    { id: 4, name: 'Warehouse' },
    { id: 5, name: 'Administration' }
  ];
  const defaultDesigs = [
    { id: 1, name: 'Manager' },
    { id: 2, name: 'Officer' },
    { id: 3, name: 'Accountant' },
    { id: 4, name: 'Salesman' },
    { id: 5, name: 'Staff' }
  ];
  const statuses = ['Active', 'On Leave', 'Notice Period', 'Resigned', 'Terminated'];

  return {
    data: formatted,
    departments: defaultDepts,
    designations: defaultDesigs,
    statuses
  };
};

export const saveEmployee = async (emp: Partial<Employee>, _tenantSlug?: string, _branchId?: number) => {
  const current = (await getEmployees()).data;
  const newId = current.length ? Math.max(...current.map(c => c.id)) + 1 : 1;
  const code = (emp.code || '').trim();
  const account_code = (emp.account_code || emp.accountCode || '').trim();
  const full: Employee = {
    ...emp,
    id: newId,
    code,
    account_code,
    accountCode: account_code,
    name: emp.name || 'Unnamed Employee',
    gender: emp.gender || 'Male',
    status: emp.status || 'Active',
    basicSalary: Number(emp.basicSalary || 0),
    gross: Number(emp.basicSalary || 0) * 1.45,
    net: Number(emp.basicSalary || 0) * 1.40,
    loanBalance: 0,
    isActive: true
  } as Employee;

  try {
    await supabase.from('hr_employees').insert([{
      id: newId,
      code: full.code,
      name: full.name,
      father_name: full.fatherName,
      cnic: full.cnic,
      gender: full.gender,
      phone: full.phone,
      email: full.email,
      address: full.address,
      city: full.city,
      department_name: full.departmentName,
      designation_name: full.designationName,
      grade: full.grade,
      basic_salary: full.basicSalary,
      gross: full.gross,
      net: full.net,
      status: full.status,
      joining_date: full.joiningDate,
      bank_name: full.bankName,
      bank_account: full.bankAccount,
      weekly_off: full.weeklyOff,
      notes: full.notes,
      account_code: full.account_code
    }]);
  } catch (_) {}

  const updated = [full, ...current];
  setLocal('employees', updated);
  return { data: full };
};

export const updateEmployee = async (
  arg1: number | Partial<Employee>,
  arg2?: Partial<Employee> | string,
  _tenantSlug?: string,
  _branchId?: number
) => {
  const targetId = typeof arg1 === 'number' ? arg1 : (arg1.id as number);
  const emp: Partial<Employee> = typeof arg1 === 'number' ? (arg2 as Partial<Employee>) : arg1;
  const account_code = emp.account_code !== undefined ? emp.account_code : emp.accountCode;

  try {
    await supabase.from('hr_employees').update({
      code: emp.code !== undefined ? (emp.code || '') : '',
      name: emp.name,
      father_name: emp.fatherName,
      cnic: emp.cnic,
      gender: emp.gender,
      phone: emp.phone,
      email: emp.email,
      address: emp.address,
      city: emp.city,
      department_name: emp.departmentName,
      designation_name: emp.designationName,
      grade: emp.grade,
      basic_salary: emp.basicSalary,
      status: emp.status,
      joining_date: emp.joiningDate,
      bank_name: emp.bankName,
      bank_account: emp.bankAccount,
      weekly_off: emp.weeklyOff,
      notes: emp.notes,
      ...(account_code !== undefined ? { account_code } : {})
    }).eq('id', targetId);
  } catch (_) {}

  const current = (await getEmployees()).data;
  const updated = current.map(c => (c.id === targetId ? {
    ...c,
    ...emp,
    code: emp.code !== undefined ? emp.code : c.code,
    account_code: account_code !== undefined ? account_code : c.account_code,
    accountCode: account_code !== undefined ? account_code : c.accountCode
  } : c));
  setLocal('employees', updated);
  return { data: updated.find(c => c.id === targetId) };
};

export const deleteEmployee = async (id: number, _tenantSlug?: string, _branchId?: number) => {
  try {
    const { data: emp } = await supabase.from('hr_employees').select('*').eq('id', id).maybeSingle();
    await supabase.from('hr_employees').delete().eq('id', id);

    if (emp) {
      const code = (emp.account_code || '').trim();
      const name = (emp.name || '').trim();
      if (code) {
        await supabase.from('chart_of_accounts').delete().eq('account_code', code);
      }
      if (name) {
        await supabase.from('chart_of_accounts').delete()
          .in('control_code', ['Employees', 'Salaries Payable'])
          .ilike('account_title', name);
      }
    }
  } catch (_) {}
  const current = (await getEmployees()).data;
  const filtered = current.filter(c => c.id !== id);
  setLocal('employees', filtered);
  return { success: true };
};

export const checkEmployeeHasTransactions = async (
  emp: Employee
): Promise<{ hasHistory: boolean; reason?: string }> => {
  const code = (emp.account_code || emp.accountCode || '').trim();
  const empId = emp.id;

  try {
    // 1. Check financial vouchers
    if (code) {
      const { data: vouchers } = await supabase.from('financial_vouchers').select('items');
      if (vouchers && Array.isArray(vouchers)) {
        for (const v of vouchers) {
          if (Array.isArray(v.items)) {
            const hasItem = v.items.some(
              (it: any) =>
                String(it.accountCode || '').trim().toLowerCase() === code.toLowerCase() &&
                (Number(it.debit || 0) > 0 || Number(it.credit || 0) > 0)
            );
            if (hasItem) {
              return {
                hasHistory: true,
                reason: `Financial Journal / Payment Vouchers recorded under ledger (${code})`
              };
            }
          }
        }
      }
    }

    // 2. Check payroll sheets
    const { data: sheets } = await getSheets();
    for (const s of sheets || []) {
      const lines = getLocal<any[]>(`sheet_lines_${s.id}`, []);
      const match = lines.find((l) => l.employeeId === empId && (Number(l.net || 0) > 0 || l.paid));
      if (match) {
        return {
          hasHistory: true,
          reason: `Payroll & Salary Sheet processed for month ${s.monthYear || s.date}`
        };
      }
    }

    // 3. Check loans
    const { data: loans } = await getLoans();
    const hasLoan = (loans || []).some((l) => l.employeeId === empId);
    if (hasLoan) {
      return {
        hasHistory: true,
        reason: 'Active or past Loan & Advance records exist for this employee'
      };
    }
  } catch (err) {
    console.warn('checkEmployeeHasTransactions check skipped:', err);
  }

  return { hasHistory: false };
};

/**
 * Ensures exactly ONE Chart of Accounts record exists for an employee.
 * Updates in-place if existing, deletes any duplicates, or inserts 1 record.
 */
export const syncEmployeeCOA = async (
  empName: string,
  newCode: string,
  oldCode?: string,
  notes?: string
) => {
  const cleanName = (empName || '').trim();
  const cleanNewCode = (newCode || '').trim();
  const cleanOldCode = (oldCode || '').trim();

  if (!cleanName || !cleanNewCode) return;

  try {
    const { data: allAccounts } = await supabase.from('chart_of_accounts').select('*');
    const list = (allAccounts || []).filter((a: any) => {
      const matchNew = cleanNewCode && String(a.account_code).trim().toLowerCase() === cleanNewCode.toLowerCase();
      const matchOld = cleanOldCode && String(a.account_code).trim().toLowerCase() === cleanOldCode.toLowerCase();
      const matchName =
        (a.control_code === 'Salaries Payable' || a.control_code === 'Employees') &&
        String(a.account_title || '').trim().toLowerCase() === cleanName.toLowerCase();
      return matchNew || matchOld || matchName;
    });

    const coaPayload: any = {
      category_code: '2. LIABILITIES',
      sub_category_code: 'Current Liabilities',
      control_code: 'Salaries Payable',
      account_code: cleanNewCode,
      account_title: cleanName,
      notes: notes || `Employee payroll ledger account for ${cleanName}`
    };

    if (list.length > 0) {
      // Update the first matching account in place
      const primary = list[0];
      await supabase.from('chart_of_accounts').update(coaPayload).eq('id', primary.id);

      // Clean up any extra duplicate rows
      if (list.length > 1) {
        const extraIds = list.slice(1).map((x: any) => x.id);
        await supabase.from('chart_of_accounts').delete().in('id', extraIds);
      }
    } else {
      await supabase.from('chart_of_accounts').insert([coaPayload]);
    }
  } catch (err) {
    console.warn('syncEmployeeCOA error:', err);
  }
};

/**
 * Removes orphan Salaries Payable / 2030-xxx accounts from chart_of_accounts
 * if no active employee exists.
 */
export const cleanupOrphanEmployeeAccounts = async () => {
  try {
    const { data: employees } = await getEmployees();
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_title, control_code');

    const empList = employees || [];
    const accList = accounts || [];

    const orphanIds: number[] = [];

    accList.forEach((a: any) => {
      const isEmployeeLedger =
        a.control_code === 'Salaries Payable' ||
        a.control_code === 'Employees' ||
        String(a.account_code || '').startsWith('2030-');

      if (isEmployeeLedger) {
        const hasOwner = empList.some((e: any) => {
          const eCode = (e.account_code || e.accountCode || '').trim().toLowerCase();
          const aCode = String(a.account_code || '').trim().toLowerCase();
          const eName = String(e.name || '').trim().toLowerCase();
          const aName = String(a.account_title || '').trim().toLowerCase();

          return (eCode && eCode === aCode) || (eName && eName === aName);
        });

        if (!hasOwner) {
          orphanIds.push(a.id);
        }
      }
    });

    if (orphanIds.length > 0) {
      await supabase.from('chart_of_accounts').delete().in('id', orphanIds);
    }
  } catch (err) {
    console.warn('cleanupOrphanEmployeeAccounts error:', err);
  }
};

export const getPayslips = async (employeeId: number, _tenantSlug?: string, _branchId?: number): Promise<PayslipRow[]> => {
  const current = (await getSheets()).data;
  const rows: PayslipRow[] = [];
  current.forEach((s) => {
    const lines = getLocal<PayrollLine[]>(`sheet_lines_${s.id}`, []);
    const match = lines.find((l) => l.employeeId === employeeId);
    if (match) {
      rows.push({
        number: s.sheetNumber || `SS-${s.id}`,
        month: s.month,
        monthLabel: monthNamed(s.month),
        employeeId: match.employeeId,
        employeeName: match.name,
        basic: match.basic || 0,
        gross: match.gross || 0,
        net: match.netPay || match.basic || 0,
        status: s.status,
        paid: s.status === 'Paid'
      });
    }
  });
  return rows;
};

// =============================================================
// 2. PAY HEADS
// =============================================================
export const getPayHeads = async (_tenantSlug?: string, _branchId?: number) => {
  let formatted: PayHead[] = [];
  try {
    const { data, error } = await supabase.from('hr_pay_heads').select('*').order('sequence', { ascending: true });
    if (!error && data && data.length > 0) {
      formatted = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        kind: d.kind,
        basis: d.basis,
        rate: Number(d.rate || 0),
        amount: Number(d.amount || 0),
        accountId: d.account_id,
        accountName: d.account_name,
        auto: !!d.auto,
        rule: d.rule || '',
        taxable: !!d.taxable,
        sequence: Number(d.sequence || 0),
        isActive: d.is_active !== false,
        description: d.description
      }));
      setLocal('pay_heads', formatted);
    }
  } catch (_) {}

  if (formatted.length === 0) {
    formatted = getLocal<PayHead[]>('pay_heads', DEFAULT_PAY_HEADS);
  }

  const kinds = ['Earning', 'Deduction'];
  const bases = ['Fixed', 'Basic %', 'Gross %'];
  const statuses = ['Active', 'Inactive'];

  return { data: formatted, accounts: [], kinds, bases, statuses };
};

export const savePayHead = async (head: Partial<PayHead>, _tenantSlug?: string, _branchId?: number) => {
  const current = (await getPayHeads()).data;
  const newId = current.length ? Math.max(...current.map(c => c.id)) + 1 : 1;
  const full: PayHead = {
    ...head,
    id: newId,
    name: head.name || 'New Head',
    code: head.code || `PH-${newId}`,
    kind: head.kind || 'Earning',
    basis: head.basis || 'Fixed',
    rate: Number(head.rate || 0),
    amount: Number(head.amount || 0),
    auto: !!head.auto,
    rule: head.rule || '',
    taxable: !!head.taxable,
    sequence: head.sequence || (current.length + 1) * 10,
    isActive: true
  };

  try {
    await supabase.from('hr_pay_heads').insert([{
      id: newId,
      name: full.name,
      code: full.code,
      kind: full.kind,
      basis: full.basis,
      rate: full.rate,
      amount: full.amount,
      auto: full.auto,
      rule: full.rule,
      taxable: full.taxable,
      sequence: full.sequence,
      is_active: full.isActive,
      description: full.description
    }]);
  } catch (_) {}

  const updated = [...current, full];
  setLocal('pay_heads', updated);
  return { data: full };
};

export const updatePayHead = async (id: number, head: Partial<PayHead>, _tenantSlug?: string, _branchId?: number) => {
  try {
    await supabase.from('hr_pay_heads').update({
      name: head.name,
      code: head.code,
      kind: head.kind,
      basis: head.basis,
      rate: head.rate,
      amount: head.amount,
      auto: head.auto,
      rule: head.rule,
      taxable: head.taxable,
      sequence: head.sequence,
      is_active: head.isActive,
      description: head.description
    }).eq('id', id);
  } catch (_) {}

  const current = (await getPayHeads()).data;
  const updated = current.map(c => (c.id === id ? { ...c, ...head } : c));
  setLocal('pay_heads', updated);
  return { data: updated.find(c => c.id === id) };
};

export const deletePayHead = async (id: number, _tenantSlug?: string, _branchId?: number) => {
  try {
    await supabase.from('hr_pay_heads').delete().eq('id', id);
  } catch (_) {}
  const current = (await getPayHeads()).data;
  const filtered = current.filter(c => c.id !== id);
  setLocal('pay_heads', filtered);
  return { success: true };
};

// =============================================================
// 3. SALARY STRUCTURE
// =============================================================
export const getStructures = async (_tenantSlug?: string, _branchId?: number) => {
  const employees = (await getEmployees()).data;
  const heads = (await getPayHeads()).data;

  const list: SalaryStructureView[] = employees.map(emp => {
    const saved = getLocal<StructureLine[]>(`struct_${emp.id}`, []);
    const lines = saved.length > 0 ? saved : heads.filter(h => h.auto).map(h => ({
      headId: h.id,
      name: h.name,
      kind: h.kind,
      basis: h.basis,
      rate: h.rate,
      amount: h.basis === 'Basic %' ? Math.round(emp.basicSalary * h.rate / 100) : h.amount,
      isDefault: true
    }));

    const earnings = lines.filter(l => l.kind === 'Earning').reduce((s, l) => s + (l.basis === 'Basic %' ? Math.round(emp.basicSalary * l.rate / 100) : l.amount), 0);
    const deductions = lines.filter(l => l.kind === 'Deduction').reduce((s, l) => s + (l.basis === 'Basic %' ? Math.round(emp.basicSalary * l.rate / 100) : l.amount), 0);

    return {
      employeeId: emp.id,
      code: emp.code,
      name: emp.name,
      department: emp.designationName || emp.departmentName || 'Staff',
      designation: emp.designationName || 'Staff',
      grade: emp.grade || 'G-3',
      basic: emp.basicSalary,
      gross: emp.basicSalary + earnings,
      net: emp.basicSalary + earnings - deductions,
      revisedOn: emp.joiningDate || isoDay(),
      notes: '',
      lines
    };
  });

  return { data: list, heads };
};

export const getStructure = async (employeeId: number, _tenantSlug?: string, _branchId?: number) => {
  const all = (await getStructures()).data;
  const found = all.find(s => s.employeeId === employeeId);
  return { data: found };
};

export const saveStructure = async (employeeId: number, lines: StructureLine[], notes?: string, _tenantSlug?: string, _branchId?: number) => {
  setLocal(`struct_${employeeId}`, lines);
  return { success: true };
};

export const resetStructure = async (employeeId: number, _tenantSlug?: string, _branchId?: number) => {
  localStorage.removeItem(`zac_hr_struct_${employeeId}`);
  return { success: true };
};

// =============================================================
// 4. ATTENDANCE
// =============================================================
export const getAttendance = async (arg1?: any, arg2?: any, arg3?: any) => {
  let monthStr = [arg3, arg1, arg2].find((a) => typeof a === 'string' && /^\d{4}-\d{2}$/.test(a));
  if (!monthStr) {
    monthStr = isoDay().slice(0, 7);
  }

  const employees = (await getEmployees()).data;
  const rawApps = getLocal<LeaveApplication[]>('leave_apps', []);
  const approvedLeaves = rawApps.filter((a) => a.status === 'Approved');

  const [y, m] = monthStr.split('-').map(Number);
  const totalDays = new Date(y || 2026, m || 10, 0).getDate();

  const saved = getLocal<Record<number, any>>(`att_${monthStr}`, {});

  const rows: AttendanceRow[] = employees.map((emp) => {
    const patch = saved[emp.id] || { days: {}, overtimeHours: 0, lateDays: 0, note: '' };
    const days: Record<string, HrMark | ''> = {};
    const approvedLeaveDays: Record<string, ApprovedLeaveMeta> = {};

    const empLeaves = approvedLeaves.filter((a) => a.employeeId === emp.id);
    empLeaves.forEach((a) => {
      const fromDate = a.from;
      const toDate = a.halfDay ? a.from : (a.to || a.from);
      if (!fromDate) return;

      const start = new Date(`${fromDate}T00:00:00`);
      const end = new Date(`${toDate}T00:00:00`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

      for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
        const curMonth = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        if (curMonth === monthStr) {
          const dayKey = String(cur.getDate());
          approvedLeaveDays[dayKey] = {
            id: a.id,
            number: a.number || String(a.id),
            leaveType: a.leaveTypeName || a.customType || 'Casual Leave',
            halfDay: !!a.halfDay,
            from: a.from,
            to: a.to || a.from
          };
        }
      }
    });

    let present = 0, absent = 0, halfDay = 0, leave = 0, off = 0, holiday = 0, onDuty = 0;

    for (let d = 1; d <= totalDays; d++) {
      const key = String(d);
      const dow = new Date(y || 2026, (m || 10) - 1, d).getDay();
      const offDayName = emp.weeklyOff || 'Friday';
      const offDow = offDayName === 'Sunday' ? 0 : offDayName === 'Saturday' ? 6 : offDayName === 'Thursday' ? 4 : 5; // Default Friday (5)
      const isFriHoliday = dow === offDow;

      let mark: HrMark | '' = '';
      if (isFriHoliday) {
        mark = 'Holiday';
      } else if (approvedLeaveDays[key]) {
        mark = approvedLeaveDays[key].halfDay ? 'Half Day' : 'Leave';
      } else if (patch.days?.[key] !== undefined) {
        mark = patch.days[key];
      }
      days[key] = mark;

      if (mark === 'Present') present++;
      else if (mark === 'Absent') absent++;
      else if (mark === 'Half Day') halfDay++;
      else if (mark === 'Leave') leave++;
      else if (mark === 'Off') off++;
      else if (mark === 'Holiday') holiday++;
      else if (mark === 'On Duty') onDuty++;
    }

    return {
      employeeId: emp.id,
      code: emp.code,
      name: emp.name,
      department: emp.departmentName || 'Operations',
      designation: emp.designationName || 'Staff',
      grade: emp.grade || 'G-3',
      days,
      approvedLeaveDays,
      present,
      absent,
      halfDay,
      leave,
      off,
      holiday,
      onDuty,
      totalWorkingDays: totalDays - off - holiday,
      lateDays: patch.lateDays || 0,
      overtimeHours: patch.overtimeHours || 0,
      note: patch.note || ''
    };
  });

  return {
    data: rows,
    month: monthStr,
    monthLabel: monthNamed(monthStr)
  };
};

export const putAttendance = async (
  arg1?: any,
  arg2?: any,
  arg3?: any,
  arg4?: any
) => {
  let monthStr = [arg1, arg2, arg3].find((a) => typeof a === 'string' && /^\d{4}-\d{2}$/.test(a));
  if (!monthStr) {
    monthStr = isoDay().slice(0, 7);
  }

  let patchList: any[] = [];
  let patchMap: Record<number, any> = {};

  if (Array.isArray(arg4)) patchList = arg4;
  else if (Array.isArray(arg2)) patchList = arg2;
  else if (typeof arg2 === 'object' && arg2 !== null) patchMap = arg2;
  else if (typeof arg4 === 'object' && arg4 !== null) patchMap = arg4;

  patchList.forEach((item) => {
    if (item && item.employeeId) {
      patchMap[item.employeeId] = item;
    }
  });

  const current = getLocal<Record<number, any>>(`att_${monthStr}`, {});
  const merged = { ...current, ...patchMap };
  setLocal(`att_${monthStr}`, merged);

  try {
    const recordsToUpsert = Object.entries(merged).map(([empId, p]: [string, any]) => ({
      employee_id: Number(empId),
      month: monthStr,
      days: p.days || {},
      overtime_hours: p.overtimeHours || 0,
      late_days: p.lateDays || 0,
      note: p.note || ''
    }));
    await supabase.from('hr_attendance').upsert(recordsToUpsert, { onConflict: 'employee_id,month' });
  } catch (_) {}

  return { success: true, data: Object.keys(merged) };
};

// =============================================================
// 5. SALARY SHEET (PAYROLL)
// =============================================================
export const getSheets = async (_tenantSlug?: string, _branchId?: number) => {
  const sheets = getLocal<SalarySheetHead[]>('salary_sheets', []);
  const heads = (await getPayHeads()).data;
  const defaultSettings: HrSettings = {
    payDaysInMonth: 30,
    standardWorkingDays: 30,
    lateDeductionRatio: 0.33,
    overtimeHourlyRate: 150,
    weeklyOff: 'Friday',
    defaultWeeklyOff: 'Friday',
    paySalaryThrough: 'Bank Transfer',
    defaultPayAccountName: 'Main Bank Account',
    deductForAbsence: true,
    recoverLoans: true
  };
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });
  const payThrough = ['Bank Transfer', 'Cheque', 'Cash'];
  return { data: sheets, heads, accounts: [], settings: defaultSettings, months, payThrough };
};

export const getSheet = async (arg1: any, _arg2?: any, arg3?: any) => {
  const id = typeof arg1 === 'number' ? arg1 : Number(arg3 || arg1);
  const sheets = (await getSheets()).data;
  const sheet = sheets.find((s) => s.id === id);
  if (!sheet) throw new Error('Salary sheet not found');
  const employees = (await getEmployees()).data || [];
  const rawLines = getLocal<PayrollLine[]>(`sheet_lines_${id}`, []);
  const lines = rawLines.map((l) => {
    const emp = employees.find((e) => e.id === l.employeeId);
    const desig = emp?.designationName || l.designation || emp?.departmentName || l.department || 'Staff';
    return {
      ...l,
      designation: desig,
      department: desig
    };
  });
  return {
    ...sheet,
    lines
  };
};

export const syncLoansFromPayroll = async (monthStr: string, lines: PayrollLine[], isApprovedOrPaid: boolean) => {
  if (!lines || !lines.length) return;
  const currentLoans = getLocal<EmployeeLoan[]>('loans', []);
  let changed = false;

  const updatedLoans = currentLoans.map((loan) => {
    let matchingRecovery: LoanRecoveryItem | undefined;
    for (const line of lines) {
      if (line.loanRecoveries) {
        const found = line.loanRecoveries.find((r) => r.loanId === loan.id);
        if (found) {
          matchingRecovery = found;
          break;
        }
      }
    }

    if (!matchingRecovery) return loan;

    const skipped = matchingRecovery.isSkipped || matchingRecovery.deductAmount === 0;
    let skippedMonths = Array.isArray(loan.skippedMonths) ? [...loan.skippedMonths] : [];

    if (skipped) {
      if (!skippedMonths.includes(monthStr)) {
        skippedMonths.push(monthStr);
        changed = true;
      }
    } else {
      if (skippedMonths.includes(monthStr)) {
        skippedMonths = skippedMonths.filter((m) => m !== monthStr);
        changed = true;
      }
    }

    if (isApprovedOrPaid && !skipped && matchingRecovery.deductAmount > 0) {
      const deductVal = matchingRecovery.deductAmount;
      const history = Array.isArray(loan.deductionHistory) ? [...loan.deductionHistory] : [];
      const existingHistoryIdx = history.findIndex((h) => h.month === monthStr);
      if (existingHistoryIdx >= 0) {
        history[existingHistoryIdx] = { month: monthStr, amount: deductVal, date: isoDay() };
      } else {
        history.push({ month: monthStr, amount: deductVal, date: isoDay() });
      }

      const totalDeducted = history.reduce((sum, h) => sum + (h.amount || 0), 0);
      const balance = Math.max(0, Number(loan.amount || 0) - totalDeducted);
      const installmentsPaid = history.filter((h) => (h.amount || 0) > 0).length;
      const status = balance <= 0 ? ('Closed' as const) : ('Active' as const);

      changed = true;
      return {
        ...loan,
        skippedMonths,
        deductionHistory: history,
        deducted: totalDeducted,
        recoveredAmount: totalDeducted,
        balance,
        balanceAmount: balance,
        installmentsPaid,
        left: Math.max(0, Number(loan.installments || 1) - installmentsPaid),
        status
      };
    }

    return {
      ...loan,
      skippedMonths
    };
  });

  if (changed) {
    setLocal('loans', updatedLoans);
  }
};

export const previewSheet = async (arg1?: any, arg2?: any, arg3?: any, arg4?: any) => {
  let monthStr = [arg3, arg1, arg2].find((a) => typeof a === 'string' && /^\d{4}-\d{2}$/.test(a));
  if (!monthStr) {
    monthStr = isoDay().slice(0, 7);
  }

  const opts = [arg4, arg3, arg2, arg1].find((a) => typeof a === 'object' && a !== null) || {};
  const deductAbsence = opts.deduct ?? opts.deductForAbsence ?? false;
  const recoverLoans = opts.recover ?? opts.recoverLoans ?? true;

  const structures = (await getStructures()).data || [];
  const attendance = (await getAttendance(monthStr)).data || [];
  const loans = (await getLoans()).data || [];
  const employees = (await getEmployees()).data || [];

  const [y, m] = monthStr.split('-').map(Number);
  const totalDays = new Date(y || 2026, m || 10, 0).getDate();

  const lines: PayrollLine[] = structures.map((st) => {
    const att = attendance.find((a) => a.employeeId === st.employeeId);
    
    // Find active loans & advances for this employee that are eligible in this month
    const empLoans = loans.filter((l) => {
      if (l.employeeId !== st.employeeId || l.status !== 'Active') return false;
      const bal = Number(l.balance ?? (l.amount - (l.deducted || l.recoveredAmount || 0)));
      if (bal <= 0) return false;
      if (l.startMonth && l.startMonth > monthStr) return false;
      return true;
    });

    const loanRecoveries: LoanRecoveryItem[] = empLoans.map((l) => {
      const isAdv = String(l.kind || '').toLowerCase().includes('adv');
      const bal = Number(l.balance ?? (l.amount - (l.deducted || l.recoveredAmount || 0)));
      const isSkipped = !recoverLoans || (Array.isArray(l.skippedMonths) && l.skippedMonths.includes(monthStr));
      const standardInst = isAdv ? bal : Math.min(bal, Number(l.installmentAmount || Math.round(l.amount / Math.max(1, l.installments || 1))));
      const deductAmount = isSkipped ? 0 : standardInst;
      return {
        loanId: l.id,
        number: l.number || (isAdv ? `ADV-${String(l.id).padStart(4, '0')}` : `LN-${String(l.id).padStart(4, '0')}`),
        kind: (l.kind || (isAdv ? 'Advance' : 'Loan')) as any,
        amount: Number(l.amount || 0),
        installmentAmount: standardInst,
        balance: bal,
        deductAmount,
        isSkipped
      };
    });

    const advanceDeduction = loanRecoveries
      .filter((r) => String(r.kind).toLowerCase().includes('adv'))
      .reduce((s, r) => s + (r.isSkipped ? 0 : r.deductAmount), 0);

    const loanDeduction = loanRecoveries
      .filter((r) => !String(r.kind).toLowerCase().includes('adv'))
      .reduce((s, r) => s + (r.isSkipped ? 0 : r.deductAmount), 0);

    const recoveries = loanRecoveries.map((r) => ({
      loanId: r.loanId,
      number: r.number,
      amount: r.isSkipped ? 0 : r.deductAmount,
      kind: r.kind,
      isSkipped: r.isSkipped
    }));

    const absentDays = att?.absent || 0;
    const halfDays = att?.halfDay || 0;
    const unpaidDays = absentDays + halfDays * 0.5;
    const rawAbsentPenalty = att && totalDays > 0 ? Math.round((st.basic / totalDays) * unpaidDays) : 0;
    const absentPenalty = deductAbsence ? rawAbsentPenalty : 0;
    
    const bonus = opts.payBonus ? Number(opts.bonusAmount || 0) : 0;
    const bonusReason = opts.payBonus ? String(opts.bonusReason || '') : '';
    const absentCut = absentPenalty;
    const gross = st.basic + bonus;
    const totalDeductions = absentCut + advanceDeduction + loanDeduction;
    const net = Math.max(0, gross - totalDeductions);

    const empObj = employees.find((e) => e.id === st.employeeId);
    const desigName = empObj?.designationName || st.designation || 'Staff';

    const payableDays = att?.totalWorkingDays || (totalDays - (att?.off || 0) - (att?.holiday || 0));
    const presentDays = Math.max(0, payableDays - unpaidDays);

    return {
      employeeId: st.employeeId,
      employeeCode: st.code || `EMP-${st.employeeId}`,
      employeeName: st.name || 'Staff',
      code: st.code || `EMP-${st.employeeId}`,
      name: st.name || 'Staff',
      department: desigName,
      designation: desigName,
      grade: st.grade || 'A',
      basic: st.basic || 0,
      bonus,
      bonusReason,
      absentCut: absentPenalty,
      advanceDeduction,
      loanDeduction,
      loanRecoveries,
      recoveries,
      earnings: [],
      extraEarnings: [],
      deductions: [],
      extraDeductions: [],
      absence: absentPenalty,
      gross,
      totalDeductions,
      net,
      netPay: net,
      totalDays,
      payableDays,
      present: presentDays,
      absent: absentDays,
      leaves: att?.leave || 0,
      halfDays,
      unpaidDays,
      paid: false,
      remarks: '',
      attendanceDays: att?.days || {}
    };
  });

  const deptMap: Record<string, { staff: number; gross: number; net: number }> = {};
  lines.forEach((l) => {
    const d = l.designation || l.department || 'General';
    if (!deptMap[d]) deptMap[d] = { staff: 0, gross: 0, net: 0 };
    deptMap[d].staff += 1;
    deptMap[d].gross += l.gross;
    deptMap[d].net += (l.netPay ?? l.net ?? 0);
  });
  const byDepartment = Object.entries(deptMap).map(([department, data]) => ({
    department,
    ...data
  }));

  const byHead = [
    { head: 'Basic Salary', kind: 'Earning' as const, amount: lines.reduce((s, l) => s + l.basic, 0) },
    { head: 'Bonus', kind: 'Earning' as const, amount: lines.reduce((s, l) => s + (l.bonus || 0), 0) },
    { head: 'Absent Cut', kind: 'Deduction' as const, amount: lines.reduce((s, l) => s + (l.absentCut || 0), 0) },
    { head: 'Advance / Loan Recovery', kind: 'Deduction' as const, amount: lines.reduce((s, l) => s + (l.advanceDeduction + l.loanDeduction), 0) }
  ];

  const unmarked = employees
    .filter((emp) => !attendance.some((a) => a.employeeId === emp.id))
    .map((emp) => emp.name);

  const totalGross = lines.reduce((s, l) => s + l.gross, 0);
  const totalDeductions = lines.reduce((s, l) => s + l.totalDeductions, 0);
  const totalNet = lines.reduce((s, l) => s + (l.netPay ?? l.net ?? 0), 0);
  const totalUnpaidDays = lines.reduce((s, l) => s + (l.unpaidDays || 0), 0);

  return {
    data: {
      month: monthStr,
      monthLabel: monthNamed(monthStr),
      employees: lines.length,
      gross: totalGross,
      deductions: totalDeductions,
      netPayable: totalNet,
      unpaidDays: totalUnpaidDays,
      lines,
      byDepartment,
      byHead,
      unmarked,
      totals: {
        basic: lines.reduce((s, l) => s + l.basic, 0),
        gross: totalGross,
        deductions: totalDeductions,
        net: totalNet,
        loans: lines.reduce((s, l) => s + (l.advanceDeduction + l.loanDeduction), 0)
      }
    },
    settings: (await getSheets()).settings
  };
};

export const createSheet = async (arg1: any, arg2?: any, arg3?: any, _arg4?: any) => {
  const opts = [arg3, arg1, arg2].find((a) => typeof a === 'object' && a !== null) || {};
  let month = typeof arg1 === 'string' && /^\d{4}-\d{2}$/.test(arg1)
    ? arg1
    : (typeof arg3 === 'string' && /^\d{4}-\d{2}$/.test(arg3) ? arg3 : (opts?.month || arg1?.month || isoDay().slice(0, 7)));
  const preview = (await previewSheet(month, opts)).data;
  const sheets = (await getSheets()).data;
  const newId = sheets.length ? Math.max(...sheets.map((s) => s.id)) + 1 : 1;
  const numStr = `PAY-${month.replace('-', '')}-${String(newId).padStart(3, '0')}`;

  const newSheet: any = {
    id: newId,
    number: numStr,
    month,
    monthLabel: monthNamed(month),
    employees: preview.lines.length,
    gross: preview.gross,
    deductions: preview.deductions,
    netPayable: preview.netPayable,
    unpaidDays: preview.unpaidDays,
    totalBasic: preview.totals.basic,
    totalGross: preview.gross,
    totalNet: preview.netPayable,
    totalDeductions: preview.deductions,
    totalLoans: preview.totals.loans,
    status: 'Draft',
    payThrough: arg3?.payThrough || 'Bank Transfer',
    accountName: '',
    journalNumber: '',
    paymentJournalNumber: '',
    createdOn: isoDay(),
    createdAt: isoDay()
  };

  const updatedSheets = [newSheet, ...sheets];
  setLocal('salary_sheets', updatedSheets);
  setLocal(`sheet_lines_${newId}`, preview.lines);

  return {
    ...newSheet,
    lines: preview.lines
  };
};

export const saveSheetLines = async (sheetId: number, lines: any[]) => {
  setLocal(`sheet_lines_${sheetId}`, lines);
  const sheets = (await getSheets()).data;
  const gross = lines.reduce((s, l) => s + (Number(l.basic || 0) + Number(l.bonus || 0) + (l.extraEarnings || []).reduce((es: number, e: any) => es + Number(e.amount || 0), 0)), 0);
  const deductions = lines.reduce((s, l) => s + (Number(l.absentCut || l.absence || 0) + Number(l.advanceDeduction || 0) + Number(l.loanDeduction || 0) + (l.extraDeductions || []).reduce((ds: number, d: any) => ds + Number(d.amount || 0), 0)), 0);
  const netPayable = lines.reduce((s, l) => s + Number(l.netPay ?? l.net ?? 0), 0);
  const totalBasic = lines.reduce((s, l) => s + Number(l.basic || 0), 0);
  const totalLoans = lines.reduce((s, l) => s + (Number(l.advanceDeduction || 0) + Number(l.loanDeduction || 0)), 0);

  const updated = sheets.map((s) => (s.id === sheetId ? {
    ...s,
    gross,
    deductions,
    netPayable,
    totalBasic,
    totalGross: gross,
    totalNet: netPayable,
    totalDeductions: deductions,
    totalLoans
  } : s));
  setLocal('salary_sheets', updated);
  const sheet = updated.find((s) => s.id === sheetId);
  return { ...sheet, lines };
};

export const updateSheet = async (arg1: any, arg2?: any, arg3?: any, arg4?: any) => {
  let id = typeof arg1 === 'number' ? arg1 : (typeof arg3 === 'number' ? arg3 : 0);
  let payload: any = typeof arg2 === 'object' && arg2 !== null ? arg2 : (typeof arg4 === 'object' && arg4 !== null ? arg4 : {});
  if (!id && typeof arg3 === 'number') id = arg3;
  if (!id && typeof arg1 === 'string' && /^\d+$/.test(arg1)) id = Number(arg1);

  const sheets = (await getSheets()).data;
  const sheet = sheets.find((s) => s.id === id);
  if (!sheet) throw new Error('Sheet not found');

  let lines = getLocal<PayrollLine[]>(`sheet_lines_${id}`, []);
  if (payload.lines && Array.isArray(payload.lines)) {
    lines = lines.map((l) => {
      const match = payload.lines.find((pl: any) => pl.employeeId === l.employeeId);
      if (!match) return l;

      const extraEarnings = match.extraEarnings ?? l.extraEarnings ?? [];
      const extraDeductions = match.extraDeductions ?? l.extraDeductions ?? [];
      const remarks = match.remarks ?? l.remarks ?? '';
      const loanRecoveries = match.loanRecoveries ?? l.loanRecoveries ?? [];

      const sumExtraEarnings = extraEarnings.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
      const sumExtraDeductions = extraDeductions.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

      const advDeduct = loanRecoveries
        .filter((r: any) => String(r.kind || '').toLowerCase().includes('adv'))
        .reduce((s: number, r: any) => s + (r.isSkipped ? 0 : Number(r.deductAmount || 0)), 0);

      const loanDeduct = loanRecoveries
        .filter((r: any) => !String(r.kind || '').toLowerCase().includes('adv'))
        .reduce((s: number, r: any) => s + (r.isSkipped ? 0 : Number(r.deductAmount || 0)), 0);

      const advanceDeduction = loanRecoveries.length ? advDeduct : Number(match.advanceDeduction ?? l.advanceDeduction ?? 0);
      const loanDeduction = loanRecoveries.length ? loanDeduct : Number(match.loanDeduction ?? l.loanDeduction ?? 0);
      const absentCut = Number(match.absentCut ?? l.absentCut ?? l.absence ?? 0);
      const bonus = Number(match.bonus ?? l.bonus ?? 0);
      const basic = Number(l.basic || 0);

      const gross = basic + bonus + sumExtraEarnings;
      const totalDeductions = absentCut + advanceDeduction + loanDeduction + sumExtraDeductions;
      const netPay = Math.max(0, gross - totalDeductions);

      const recoveries = loanRecoveries.map((r: any) => ({
        loanId: r.loanId,
        number: r.number,
        amount: r.isSkipped ? 0 : Number(r.deductAmount || 0),
        kind: r.kind,
        isSkipped: r.isSkipped
      }));

      return {
        ...l,
        extraEarnings,
        extraDeductions,
        remarks,
        loanRecoveries,
        recoveries: loanRecoveries.length ? recoveries : l.recoveries,
        advanceDeduction,
        loanDeduction,
        gross,
        totalDeductions,
        netPay,
        net: netPay
      };
    });

    setLocal(`sheet_lines_${id}`, lines);
  }

  const totalGross = lines.reduce((s, l) => s + Number(l.gross || 0), 0);
  const totalDeductions = lines.reduce((s, l) => s + Number(l.totalDeductions || 0), 0);
  const totalNet = lines.reduce((s, l) => s + Number(l.netPay ?? l.net ?? 0), 0);
  const totalBasic = lines.reduce((s, l) => s + Number(l.basic || 0), 0);
  const totalLoans = lines.reduce((s, l) => s + (Number(l.advanceDeduction || 0) + Number(l.loanDeduction || 0)), 0);

  const updatedSheet = {
    ...sheet,
    totalGross,
    gross: totalGross,
    totalDeductions,
    deductions: totalDeductions,
    totalNet,
    netPayable: totalNet,
    totalBasic,
    totalLoans
  };

  const updatedSheets = sheets.map((s) => (s.id === id ? updatedSheet : s));
  setLocal('salary_sheets', updatedSheets);

  await syncLoansFromPayroll(sheet.month, lines, sheet.status === 'Approved' || sheet.status === 'Paid');

  return {
    ...updatedSheet,
    lines
  };
};

export const deleteSheet = async (arg1: any, _arg2?: any, arg3?: any) => {
  const id = typeof arg1 === 'number' ? arg1 : Number(arg3 || arg1);
  const sheets = (await getSheets()).data;
  setLocal('salary_sheets', sheets.filter(s => s.id !== id));
  localStorage.removeItem(`zac_hr_sheet_lines_${id}`);
  return { success: true };
};

export const approveSheet = async (arg1: any, _arg2?: any, arg3?: any) => {
  const id = typeof arg1 === 'number' ? arg1 : Number(arg3 || arg1);
  const sheets = (await getSheets()).data;
  const jNum = `JV-SAL-${String(id).padStart(4, '0')}`;
  const updated = sheets.map(s => (s.id === id ? {
    ...s,
    status: 'Approved' as SheetStatus,
    approvedBy: 'Admin',
    journalNumber: jNum,
    approvedOn: isoDay()
  } : s));
  setLocal('salary_sheets', updated);
  const sheet = updated.find(s => s.id === id);
  const lines = getLocal<PayrollLine[]>(`sheet_lines_${id}`, []);
  if (sheet) {
    await syncLoansFromPayroll(sheet.month, lines, true);
  }
  return { ...sheet, lines };
};

export const unapproveSheet = async (arg1: any, _arg2?: any, arg3?: any) => {
  const id = typeof arg1 === 'number' ? arg1 : Number(arg3 || arg1);
  const sheets = (await getSheets()).data;
  const updated = sheets.map(s => (s.id === id ? {
    ...s,
    status: 'Draft' as SheetStatus,
    approvedBy: undefined,
    journalNumber: '',
    approvedOn: undefined
  } : s));
  setLocal('salary_sheets', updated);
  const sheet = updated.find(s => s.id === id);
  const lines = getLocal<any[]>(`sheet_lines_${id}`, []);
  return { ...sheet, lines };
};

export const paySheet = async (arg1: any, payData: any, _tenantSlug?: string, _branchId?: number) => {
  const id = typeof arg1 === 'number' ? arg1 : Number(_branchId || arg1);
  const sheets = (await getSheets()).data;
  const pNum = `PAY-JE-${String(id).padStart(4, '0')}`;
  const updated = sheets.map(s => (s.id === id ? {
    ...s,
    status: 'Paid' as SheetStatus,
    paidDate: payData?.date || isoDay(),
    paidOn: payData?.date || isoDay(),
    payThrough: payData?.payThrough || 'Bank Transfer',
    accountName: payData?.accountName || 'Main Bank Account',
    paymentJournalNumber: pNum
  } : s));
  setLocal('salary_sheets', updated);
  const sheet = updated.find(s => s.id === id);
  const lines = getLocal<PayrollLine[]>(`sheet_lines_${id}`, []).map(l => ({ ...l, paid: true }));
  setLocal(`sheet_lines_${id}`, lines);
  if (sheet) {
    await syncLoansFromPayroll(sheet.month, lines, true);
  }
  return { ...sheet, lines };
};

export const saveHrSettings = async (settings: HrSettings, _tenantSlug?: string, _branchId?: number) => {
  setLocal('settings', settings);
  return settings;
};

// =============================================================
export const getLeaveExpiryDate = (toDate?: string, fromDate?: string): string => {
  const base = toDate || fromDate;
  if (!base) return '';
  const parts = String(base).split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(y, m, day + 2);
    const yearStr = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  }
  const d = new Date(`${base}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 2);
  return d.toISOString().split('T')[0];
};

export const getLeave = async (_tenantSlug?: string, _branchId?: number) => {
  const rawApps = getLocal<LeaveApplication[]>('leave_apps', []);
  let rawTypes = getLocal<LeaveType[]>('leave_types', DEFAULT_LEAVE_TYPES);
  if (rawTypes.some(t => t.id === 1 && t.daysPerYear === 12)) {
    rawTypes = rawTypes.map(t => {
      if (t.id === 1) return { ...t, daysPerYear: 10 };
      if (t.id === 2) return { ...t, daysPerYear: 5 };
      return t;
    });
    setLocal('leave_types', rawTypes);
  }
  const employees = (await getEmployees()).data;
  const today = isoDay();
  let hasExpiredUpdates = false;

  const applications = rawApps.map(a => {
    const emp = employees.find(e => e.id === a.employeeId);
    const isApproved = a.status === 'Approved';
    const expDate = isApproved ? '' : getLeaveExpiryDate(a.to, a.from);
    let currentStatus = a.status;
    let remarks = a.remarks;

    // Auto-expire unapproved pending applications once expiry date arrives/passes
    if (currentStatus === 'Applied' && expDate && today >= expDate) {
      currentStatus = 'Expired';
      remarks = remarks ? remarks : 'Auto-expired: Leave date passed without approval';
      hasExpiredUpdates = true;
    } else if (currentStatus === 'Expired' && expDate && today < expDate) {
      // Revert if wrongly marked expired before 2-day expiry date
      currentStatus = 'Applied';
      if (remarks === 'Auto-expired: Leave date passed without approval') remarks = '';
      hasExpiredUpdates = true;
    }

    if (a.expiryDate !== expDate) {
      hasExpiredUpdates = true;
    }

    return {
      ...a,
      status: currentStatus,
      remarks,
      expiryDate: expDate,
      employeeName: a.employeeName || emp?.name || '',
      employeeCode: a.employeeCode || emp?.code || '',
      designation: a.designation || emp?.designationName || emp?.departmentName || 'Staff'
    };
  });

  if (hasExpiredUpdates) {
    setLocal('leave_apps', applications.map(a => ({
      id: a.id,
      number: a.number,
      employeeId: a.employeeId,
      employeeCode: a.employeeCode,
      employeeName: a.employeeName,
      department: a.department,
      designation: a.designation,
      leaveTypeId: a.leaveTypeId,
      leaveTypeName: a.leaveTypeName,
      customType: a.customType,
      from: a.from,
      to: a.to,
      days: a.days,
      halfDay: a.halfDay,
      reason: a.reason,
      addressOnLeave: a.addressOnLeave,
      status: a.status,
      appliedOn: a.appliedOn,
      approvedBy: a.approvedBy,
      decidedBy: a.decidedBy,
      remarks: a.remarks,
      expiryDate: a.expiryDate
    })));
  }

  const types = rawTypes.map(t => {
    const isOtherType = t.id === 3 || t.code === 'OTHER' || t.name.toLowerCase().includes('other');
    const applied = applications.filter(a => {
      if (a.leaveTypeId === t.id) return true;
      if (isOtherType) {
        return a.leaveTypeId === 3 || a.leaveTypeName === 'Other' || !!a.customType || !rawTypes.some(ot => ot.id === a.leaveTypeId);
      }
      return a.leaveTypeName?.toLowerCase() === t.name.toLowerCase();
    }).length;
    return {
      ...t,
      applied
    };
  });

  const TOTAL_ANNUAL_QUOTA = 15;
  const balances = employees.map(emp => {
    const empApps = applications.filter(a => a.employeeId === emp.id && a.status === 'Approved');
    const totalTaken = empApps.reduce((s, a) => s + a.days, 0);
    const balance = Math.max(0, TOTAL_ANNUAL_QUOTA - totalTaken);
    const rows: LeaveBalanceRow[] = [
      {
        leaveTypeId: 1,
        leaveTypeName: 'Annual Leave Quota',
        allowed: TOTAL_ANNUAL_QUOTA,
        taken: totalTaken,
        balance: balance
      }
    ];
    return {
      employeeId: emp.id,
      code: emp.code,
      name: emp.name,
      department: emp.departmentName || 'Operations',
      designation: emp.designationName || emp.departmentName || 'Staff',
      rows
    };
  });

  const statuses = ['Applied', 'Approved', 'Rejected', 'Cancelled', 'Expired'];

  return {
    data: applications,
    types,
    employees,
    balances,
    statuses
  };
};

export const saveLeave = async (app: Partial<LeaveApplication>, _tenantSlug?: string, _branchId?: number) => {
  const current = (await getLeave()).data;
  const newId = current.length ? Math.max(...current.map(c => c.id)) + 1 : 1;
  const toDate = app.to || app.from || isoDay();
  const fromDate = app.from || toDate;
  const expDate = app.expiryDate || getLeaveExpiryDate(toDate, fromDate);
  const full: LeaveApplication = {
    ...app,
    id: newId,
    from: fromDate,
    to: toDate,
    days: app.halfDay ? 0.5 : (app.days || 1),
    status: 'Applied',
    expiryDate: expDate,
    appliedOn: isoDay()
  } as LeaveApplication;

  setLocal('leave_apps', [full, ...current]);
  return { data: full };
};

export const updateLeave = async (id: number, app: Partial<LeaveApplication>, _tenantSlug?: string, _branchId?: number) => {
  const current = (await getLeave()).data;
  const toDate = app.to || app.from;
  const fromDate = app.from || toDate;
  const expDate = app.expiryDate || (toDate || fromDate ? getLeaveExpiryDate(toDate, fromDate) : undefined);
  const updated = current.map(c => (c.id === id ? {
    ...c,
    ...app,
    ...(expDate ? { expiryDate: expDate } : {})
  } : c));
  setLocal('leave_apps', updated);
  return { data: updated.find(c => c.id === id) };
};

export const deleteLeave = async (id: number, _tenantSlug?: string, _branchId?: number) => {
  const current = (await getLeave()).data;
  setLocal('leave_apps', current.filter(c => c.id !== id));
  return { success: true };
};

export const decideLeave = async (id: number, decision: 'Approve' | 'Reject' | 'Cancel' | 'Reapply', remarks?: string, _tenantSlug?: string, _branchId?: number) => {
  const current = (await getLeave()).data;
  const updated = current.map(c => (c.id === id ? {
    ...c,
    status: (decision === 'Approve' ? 'Approved' : decision === 'Reject' ? 'Rejected' : decision === 'Cancel' ? 'Cancelled' : 'Applied') as LeaveStatus,
    approvedBy: decision === 'Reapply' ? '' : (c.approvedBy || 'Admin'),
    remarks: remarks || c.remarks
  } : c));
  setLocal('leave_apps', updated);
  return { success: true };
};

export const saveLeaveType = async (type: Partial<LeaveType>, _tenantSlug?: string, _branchId?: number) => {
  const current = (await getLeave()).types;
  const newId = current.length ? Math.max(...current.map(c => c.id)) + 1 : 1;
  const full: LeaveType = {
    ...type,
    id: newId,
    name: type.name || 'New Leave Type',
    code: type.code || `LT-${newId}`,
    daysPerYear: Number(type.daysPerYear || 10),
    carryForward: Number(type.carryForward || 0),
    paid: type.paid !== false,
    requiresProof: !!type.requiresProof,
    isActive: true
  };
  setLocal('leave_types', [...current, full]);
  return { data: full };
};

export const updateLeaveType = async (id: number, type: Partial<LeaveType>, _tenantSlug?: string, _branchId?: number) => {
  const current = (await getLeave()).types;
  const updated = current.map(c => (c.id === id ? { ...c, ...type } : c));
  setLocal('leave_types', updated);
  return { data: updated.find(c => c.id === id) };
};

export const deleteLeaveType = async (id: number, _tenantSlug?: string, _branchId?: number) => {
  const current = (await getLeave()).types;
  setLocal('leave_types', current.filter(c => c.id !== id));
  return { success: true };
};

// =============================================================
// =============================================================
// 7. LOANS & ADVANCES
// =============================================================
export const getLoans = async (_tenantSlug?: string, _branchId?: number) => {
  const rawLoans = getLocal<EmployeeLoan[]>('loans', []).filter(l => l && (l.employeeId || Number(l.amount || 0) > 0));
  const employees = (await getEmployees()).data;
  let banks: any[] = [];
  let cashAccounts: any[] = [];
  try {
    const { data: bankData } = await supabase.from('banks').select('id, bankName, accountTitle, accountNumber');
    if (bankData && bankData.length > 0) banks = bankData;
  } catch (e) {
    console.warn('Banks query skipped:', e);
  }
  if (banks.length === 0) {
    banks = [
      { id: 1, bankName: 'Meezan Bank', accountTitle: 'UZAIR JIBRAN CLOTH', accountNumber: '0102030405' },
      { id: 2, bankName: 'Habib Bank Limited (HBL)', accountTitle: 'UZAIR JIBRAN CLOTH', accountNumber: '9876543210' }
    ];
  }

  try {
    const { data: coaData } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_title, category_code, control_code')
      .order('account_code');

    if (coaData && coaData.length > 0) {
      // Filter strictly for Asset Cash Drawers (Category 1 Assets, Code 1010% / Cash in Hand), excluding any Liability accounts (Category 2)
      const cashAssetOnly = coaData.filter((acc: any) => {
        const code = String(acc.account_code || '').trim();
        const cat = String(acc.category_code || '').trim();
        const title = String(acc.account_title || '').toLowerCase();
        const ctrl = String(acc.control_code || '').toLowerCase();

        // Exclude non-assets (Liabilities 2xxx, Equity 3xxx, Revenue 4xxx, Expenses 5xxx)
        if (cat && cat !== '1' && !cat.toLowerCase().includes('asset')) return false;
        if (code.startsWith('2') || code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) return false;

        // Include liquid cash assets
        return (
          code.startsWith('1010') ||
          code.startsWith('1001') ||
          ctrl.includes('cash in hand') ||
          ctrl.includes('cash and cash') ||
          title.includes('cash drawer') ||
          title.includes('cash in hand') ||
          title.includes('petty cash') ||
          title.includes('counter cash')
        );
      });

      if (cashAssetOnly.length > 0) {
        cashAccounts = cashAssetOnly;
      }
    }
  } catch (e) {
    console.warn('Cash accounts query skipped:', e);
  }

  if (cashAccounts.length === 0) {
    cashAccounts = [
      { id: 1, account_code: '1010-001', account_title: 'Main Cash in Hand (Cash Drawer)' },
      { id: 2, account_code: '1010-002', account_title: 'Petty Cash Account' }
    ];
  }

  const advances = rawLoans.filter(l => String(l.kind || '').toLowerCase().includes('adv')).sort((a, b) => a.id - b.id);
  const loans = rawLoans.filter(l => !String(l.kind || '').toLowerCase().includes('adv')).sort((a, b) => a.id - b.id);

  const advIndexMap = new Map(advances.map((l, idx) => [l.id, idx + 1]));
  const loanIndexMap = new Map(loans.map((l, idx) => [l.id, idx + 1]));

  const mappedLoans: EmployeeLoan[] = rawLoans.map(l => {
    const emp = employees.find(e => e.id === l.employeeId);
    const amount = Number(l.amount || 0);
    const installments = Math.max(1, Number(l.installments || 1));
    const installmentAmount = Number(l.installmentAmount || Math.round(amount / installments));
    const recovered = Number(l.recoveredAmount || l.deducted || 0);
    const balance = Math.max(0, amount - recovered);
    const paidCount = installmentAmount > 0 ? Math.min(installments, Math.floor(recovered / installmentAmount)) : (recovered >= amount ? installments : 0);
    const isAdv = String(l.kind || '').toLowerCase().includes('adv');
    const prefix = isAdv ? 'ADV' : 'LN';
    const seqNum = isAdv ? (advIndexMap.get(l.id) || 1) : (loanIndexMap.get(l.id) || 1);
    const number = `${prefix}-${String(seqNum).padStart(4, '0')}`;
    const journalNumber = `JV-${prefix}-${String(seqNum).padStart(4, '0')}`;

    return {
      ...l,
      number,
      journalNumber,
      employeeName: l.employeeName || emp?.name || '—',
      employeeCode: l.employeeCode || emp?.code || '—',
      department: l.department || emp?.department || '—',
      amount,
      installments,
      installmentAmount,
      deducted: recovered,
      balance,
      left: Math.max(0, installments - paidCount),
      installmentsPaid: paidCount
    };
  });

  // Keep local storage synchronized with normalized sequence numbers
  try {
    const rawLocal = getLocal<EmployeeLoan[]>('loans', []);
    if (rawLocal.length > 0) {
      let changed = false;
      const synced = rawLocal.map(l => {
        const isAdv = String(l.kind || '').toLowerCase().includes('adv');
        const prefix = isAdv ? 'ADV' : 'LN';
        const seqNum = isAdv ? (advIndexMap.get(l.id) || 1) : (loanIndexMap.get(l.id) || 1);
        const number = `${prefix}-${String(seqNum).padStart(4, '0')}`;
        const journalNumber = `JV-${prefix}-${String(seqNum).padStart(4, '0')}`;
        if (l.number !== number || l.journalNumber !== journalNumber) {
          changed = true;
          return { ...l, number, journalNumber };
        }
        return l;
      });
      if (changed) {
        setLocal('loans', synced);
      }
    }
  } catch (_) {}

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    return d.toISOString().slice(0, 7);
  });
  const statuses = ['Active', 'Closed', 'Cancelled'];
  const kinds = ['Advance', 'Loan'];
  return {
    data: mappedLoans,
    months,
    statuses,
    kinds,
    employees,
    banks,
    cashAccounts
  };
};

export const saveLoan = async (arg1: any, arg2?: any, arg3?: any) => {
  // Support both saveLoan(payload, tenantSlug, branchId) and saveLoan(tenantSlug, branchId, payload)
  const loan: Partial<EmployeeLoan> = typeof arg1 === 'object' && arg1 !== null ? arg1 : (typeof arg3 === 'object' && arg3 !== null ? arg3 : {});
  const current = getLocal<EmployeeLoan[]>('loans', []);
  const employees = (await getEmployees()).data;
  const emp = employees.find(e => e.id === loan.employeeId);
  const newId = current.length ? Math.max(...current.map(c => c.id)) + 1 : 1;
  const amount = Number(loan.amount || 0);
  const installments = Math.max(1, Number(loan.installments || 1));
  const installmentAmount = Number(loan.installmentAmount || Math.round(amount / installments));
  const kind = loan.kind || 'Advance';
  const isAdv = kind.toLowerCase().includes('adv');
  const prefix = isAdv ? 'ADV' : 'LN';
  const sameKindCount = current.filter(c => (c.kind || '').toLowerCase().includes('adv') === isAdv).length + 1;
  const number = loan.number || `${prefix}-${String(sameKindCount).padStart(4, '0')}`;
  const journalNumber = loan.journalNumber || `JV-${prefix}-${String(sameKindCount).padStart(4, '0')}`;

  const full: EmployeeLoan = {
    ...loan,
    id: newId,
    number,
    journalNumber,
    employeeName: loan.employeeName || emp?.name || '—',
    employeeCode: loan.employeeCode || emp?.code || '—',
    department: loan.department || emp?.department || '—',
    kind,
    sanctionedOn: loan.sanctionedOn || isoDay(),
    amount,
    installments,
    installmentAmount,
    startMonth: loan.startMonth || isoDay().slice(0, 7),
    recoveredAmount: 0,
    balanceAmount: amount,
    deducted: 0,
    balance: amount,
    installmentsPaid: 0,
    status: 'Active'
  } as EmployeeLoan;

  setLocal('loans', [full, ...current]);
  return { data: full, number: full.number, amount: full.amount, employeeName: full.employeeName, balance: full.amount };
};

export const updateLoan = async (arg1: any, arg2?: any, arg3?: any, arg4?: any) => {
  // Support both updateLoan(id, payload, tenantSlug, branchId) and updateLoan(tenantSlug, branchId, id, payload)
  let id = typeof arg1 === 'number' ? arg1 : (typeof arg3 === 'number' ? arg3 : 0);
  let loan: Partial<EmployeeLoan> = typeof arg2 === 'object' && arg2 !== null ? arg2 : (typeof arg4 === 'object' && arg4 !== null ? arg4 : {});
  if (!id && typeof arg3 === 'number') id = arg3;

  const current = getLocal<EmployeeLoan[]>('loans', []);
  const updated = current.map(c => (c.id === id ? { ...c, ...loan } : c));
  setLocal('loans', updated);
  const found = updated.find(c => c.id === id);
  return {
    data: found,
    number: found?.number || `LN-${id}`,
    balance: found?.balanceAmount ?? (Number(found?.amount || 0) - Number(found?.recoveredAmount || 0))
  };
};

export const deleteLoan = async (arg1: any, _arg2?: any, _arg3?: any) => {
  const id = typeof arg1 === 'number' ? arg1 : (typeof _arg3 === 'number' ? _arg3 : 0);
  const current = getLocal<EmployeeLoan[]>('loans', []);
  setLocal('loans', current.filter(c => c.id !== id));
  return { success: true };
};
