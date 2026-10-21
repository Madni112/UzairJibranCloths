import React, { useMemo, useState, useEffect } from 'react';
import { CalendarDays, Check, MailX, Pencil, Trash2, X, Eye, Printer, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTenant } from '../../Context/TenantContext';
import { useAuth } from '../../Context/AuthContext';
import { isoDay } from '../../utils/dateRange';
import {
  decideLeave, deleteLeave, deleteLeaveType, getLeave, getLeaveExpiryDate, LeaveApplication, LeaveBalanceRow,
  LeaveStatus, LeaveType, saveLeave, saveLeaveType, updateLeave, updateLeaveType,
  getAttendance, AttendanceRow, HrMark, monthNamed
} from '../../services/hr.service';
import {
  Area, Check as CheckBox, DateWindow, DeleteConfirm, Field, FormFooter, IconAction, ListToolbar,
  NumCell, Pick, RegisterStat, SearchBox, SearchPick, SortHeader, SortState, StatStrip,
  StatusPills, TabStrip, TableEmpty, Text
} from '../Masters/masterUi';
import { useHub } from '../Setup/useHub';
import Spinner from '../../ui/Spinner';

const TABS = ['Applications', 'Balances'];

const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CELL: Record<HrMark, { short: string; label: string; cls: string; pillCls: string; printCls: string }> = {
  Present: {
    short: 'P',
    label: 'Present',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
    pillCls: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    printCls: 'bg-emerald-50 text-emerald-800 font-bold'
  },
  Absent: {
    short: 'A',
    label: 'Absent',
    cls: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700',
    pillCls: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    printCls: 'bg-rose-50 text-rose-800 font-bold'
  },
  'Half Day': {
    short: '½',
    label: 'Half Day',
    cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
    pillCls: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    printCls: 'bg-amber-50 text-amber-800'
  },
  Leave: {
    short: 'L',
    label: 'Leave',
    cls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700',
    pillCls: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    printCls: 'bg-blue-50 text-blue-800'
  },
  Off: {
    short: 'O',
    label: 'Off Day',
    cls: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
    pillCls: 'bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300',
    printCls: 'bg-slate-100 text-slate-700'
  },
  Holiday: {
    short: 'H',
    label: 'Holiday (Friday)',
    cls: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700',
    pillCls: 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    printCls: 'bg-purple-50 text-purple-800 font-bold'
  },
  'On Duty': {
    short: 'D',
    label: 'On Duty',
    cls: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-700',
    pillCls: 'bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    printCls: 'bg-cyan-50 text-cyan-800'
  }
};

const daysInMonth = (month?: string) => {
  if (!month) return 30;
  const [y, m] = String(month).split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
};

const dowFullOf = (month: string, day: number) => {
  if (!month) return 'Sunday';
  const d = new Date(`${month}-${String(day).padStart(2, '0')}T00:00:00Z`);
  if (isNaN(d.getTime())) return 'Sunday';
  return DAY_FULL[d.getUTCDay()];
};

const isFriday = (month: string, day: number) => {
  if (!month) return false;
  const d = new Date(`${month}-${String(day).padStart(2, '0')}T00:00:00Z`);
  return d.getUTCDay() === 5;
};

const isDateFriday = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const d = new Date(`${dateStr}T00:00:00`);
  return !isNaN(d.getTime()) && d.getDay() === 5;
};

const printIsolatedElement = (
  elementId: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  title: string = 'Document'
) => {
  const elem = document.getElementById(elementId);
  if (!elem) return;

  const existingIframe = document.getElementById('zac-leave-att-print-frame');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'zac-leave-att-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        ${styles}
        <style>
          @page {
            size: A4 ${orientation};
            margin: ${orientation === 'portrait' ? '6mm 8mm' : '4mm 6mm'};
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, button {
            display: none !important;
          }
        </style>
      </head>
      <body class="p-2 bg-white text-black">
        ${elem.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      iframe.remove();
    }, 1000);
  }, 250);
};

const blankApp = (): Partial<LeaveApplication> => ({
  employeeId: 0,
  leaveTypeId: 1,
  leaveTypeName: 'Casual Leave',
  customType: '',
  from: isoDay(),
  to: isoDay(),
  days: 1,
  halfDay: false,
  reason: ''
});

const blankType = (): Partial<LeaveType> => ({
  name: '',
  code: '',
  daysPerYear: 10,
  carryForward: 0,
  paid: true,
  requiresProof: false,
  isActive: true,
  description: ''
});

const STATUS_TONE: Record<string, string> = {
  Applied: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  Approved: 'bg-teal-50 text-[#25a195] dark:bg-teal-950/40 dark:text-teal-300',
  Rejected: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300',
  Cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  Expired: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
};

const days = (n: number) => String(Math.round(Number(n || 0) * 10) / 10);

const addDaysIso = (fromStr: string, numDays: number) => {
  if (!fromStr) return '';
  const d = new Date(`${fromStr}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  const span = Math.max(0, Math.ceil(numDays) - 1);
  d.setDate(d.getDate() + span);
  return d.toISOString().split('T')[0];
};

const diffDaysIso = (fromStr: string, toStr: string, isHalf = false) => {
  if (isHalf) return 0.5;
  if (!fromStr || !toStr) return 1;
  const a = new Date(`${fromStr}T00:00:00`);
  const b = new Date(`${toStr}T00:00:00`);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 1;
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  return diff > 0 ? diff : 1;
};

type Balance = { employeeId: number; code: string; name: string; designation: string; department?: string; rows: LeaveBalanceRow[] };

export const LeavePage: React.FC = () => {
  const { tenantSlug, branchId } = useTenant();
  const { can } = useAuth();
  const hub = useHub(() => getLeave(tenantSlug, branchId), [tenantSlug, branchId]);
  const [tab, setTab] = useState(TABS[0]);
  const [search, setSearch] = useState('');
  const [searchEpoch, setSearchEpoch] = useState(0);
  const [status, setStatus] = useState('');
  const [typeState, setTypeState] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<SortState | null>({ key: 'from', dir: 'desc' });
  const [draft, setDraft] = useState<Partial<LeaveApplication> | null>(null);
  const [typeDraft, setTypeDraft] = useState<Partial<LeaveType> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);

  // Attendance Summary Modal State
  const [attModalEmpId, setAttModalEmpId] = useState<number | null>(null);
  const [attModalMonth, setAttModalMonth] = useState<string>(() => isoDay().slice(0, 7));
  const [attModalRows, setAttModalRows] = useState<AttendanceRow[] | null>(null);
  const [attModalLoading, setAttModalLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!attModalEmpId) return;
    let active = true;
    setAttModalLoading(true);
    getAttendance(tenantSlug, branchId, attModalMonth)
      .then((res) => {
        if (active) {
          setAttModalRows(res.data || []);
        }
      })
      .catch((err) => {
        console.warn('Failed to load attendance summary:', err);
      })
      .finally(() => {
        if (active) setAttModalLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attModalEmpId, attModalMonth, tenantSlug, branchId]);
  const [viewingApp, setViewingApp] = useState<LeaveApplication | null>(null);
  const [viewingBalance, setViewingBalance] = useState<Balance | null>(null);
  const [overLimitConfirmApp, setOverLimitConfirmApp] = useState<LeaveApplication | null>(null);

  const editable = can('hr-leave:edit');
  const rows = hub.value?.data ?? [];
  const types = hub.value?.types ?? [];
  const employees = hub.value?.employees ?? [];
  const allBalances = (hub.value?.balances ?? []).map(b => ({
    ...b,
    designation: b.designation || b.department || 'Staff'
  }));

  const getEmpBalanceInfo = (empId?: number | null) => {
    if (!empId) return { allowed: 15, taken: 0, remaining: 15 };
    const balObj = allBalances.find(b => b.employeeId === empId);
    const allowed = balObj?.rows?.reduce((s, r) => s + r.allowed, 0) ?? 15;
    const taken = balObj?.rows?.reduce((s, r) => s + r.taken, 0) ?? 0;
    const remaining = Math.max(0, allowed - taken);
    return { allowed, taken, remaining };
  };

  const handleApproveClick = (a: LeaveApplication) => {
    const { remaining } = getEmpBalanceInfo(a.employeeId);
    if (a.days > remaining) {
      setOverLimitConfirmApp(a);
    } else {
      decide(a, 'Approved');
    }
  };

  const inWindow = useMemo(() => rows.filter(a =>
    (!fromDate || a.from >= fromDate) && (!toDate || a.from <= toDate) &&
    (!search.trim() || `${a.number || ''} ${a.employeeName || ''} ${a.employeeCode || ''} ${a.designation || ''} ${a.leaveTypeName || ''} ${a.reason || ''}`
      .toLowerCase().includes(search.trim().toLowerCase()))),
    [rows, fromDate, toDate, search]);

  const visible = useMemo(() => {
    const list = status ? inWindow.filter(a => a.status === status) : inWindow;
    if (!sort) return list;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((x: any, y: any) => {
      const av = x[sort.key], bv = y[sort.key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [inWindow, status, sort]);

  const onSort = (k: string) => setSort(s => (s?.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }));

  const shown = useMemo(() => ({
    days: visible.reduce((s, a) => s + a.days, 0),
    waiting: visible.filter(a => a.status === 'Applied').length,
    waitingDays: visible.filter(a => a.status === 'Applied').reduce((s, a) => s + a.days, 0),
    approvedDays: visible.filter(a => a.status === 'Approved').reduce((s, a) => s + a.days, 0)
  }), [visible]);

  const statusCounts = [
    { value: '', label: 'All', count: inWindow.length },
    ...(hub.value?.statuses ?? []).map(s => ({ value: s, label: s, count: inWindow.filter(a => a.status === s).length }))
  ];

  const balances = useMemo(() => allBalances.filter(b =>
    !search.trim() || `${b.code} ${b.name} ${b.designation}`.toLowerCase().includes(search.trim().toLowerCase())),
    [allBalances, search]);

  const balanceTotals = useMemo(() => {
    const entitled = balances.reduce((sum, b) => sum + b.rows.reduce((s, r) => s + r.allowed, 0), 0);
    const used = balances.reduce((sum, b) => sum + b.rows.reduce((s, r) => s + r.taken, 0), 0);
    return {
      entitled,
      used,
      remaining: Math.max(0, entitled - used)
    };
  }, [balances]);

  const typesScoped = useMemo(() => types.filter(t =>
    !search.trim() || `${t.code} ${t.name} ${t.description}`.toLowerCase().includes(search.trim().toLowerCase())),
    [types, search]);

  const typesVisible = useMemo(() => typeState
    ? typesScoped.filter(t => (typeState === 'Active') === t.isActive) : typesScoped,
    [typesScoped, typeState]);

  const typeTotals = useMemo(() => ({
    perYear: typesVisible.reduce((s, t) => s + t.daysPerYear, 0),
    carry: typesVisible.reduce((s, t) => s + (t.carryForward || 0), 0),
    applied: typesVisible.reduce((s, t) => s + (t.applied || 0), 0),
    stopped: typesScoped.filter(t => !t.isActive).length
  }), [typesVisible, typesScoped]);

  const typeStateCounts = [
    { value: '', label: 'All', count: typesScoped.length },
    { value: 'Active', label: 'Active', count: typesScoped.filter(t => t.isActive).length },
    { value: 'Stopped', label: 'Stopped', count: typesScoped.filter(t => !t.isActive).length }
  ];

  const approvedType = new Set(rows.filter(a => a.status === 'Approved').map(a => a.leaveTypeId));

  const stats: RegisterStat[] = tab === 'Applications' ? [
    {
      label: 'Applications',
      value: status ? `${visible.length} of ${inWindow.length}` : String(inWindow.length),
      title: 'Requests currently listed on screen'
    },
    { label: 'Days asked', value: days(shown.days), title: 'Total days requested across listed applications' },
    {
      label: 'Waiting on a decision',
      value: String(shown.waiting),
      tone: shown.waiting ? 'warn' : undefined,
      title: shown.waiting ? `${days(shown.waitingDays)} day(s) of leave are pending approval` : 'Nothing is left undecided'
    },
    {
      label: 'Approved days',
      value: days(shown.approvedDays),
      tone: 'ok',
      title: 'Total leave days approved on register'
    }
  ] : tab === 'Balances' ? [
    {
      label: 'Staff',
      value: balances.length === allBalances.length ? String(balances.length) : `${balances.length} of ${allBalances.length}`,
      title: 'Members of staff listed'
    },
    { label: 'Entitled', value: days(balanceTotals.entitled), title: `Total leave days allowed for the year` },
    { label: 'Used', value: days(balanceTotals.used), tone: 'ok', title: 'Approved leaves used so far' },
    {
      label: 'Remaining',
      value: days(balanceTotals.remaining),
      tone: balanceTotals.remaining ? 'ok' : 'bad',
      title: 'Total leaves remaining across all staff'
    }
  ] : [
    {
      label: 'Leave types',
      value: typeState ? `${typesVisible.length} of ${typesScoped.length}` : String(typesScoped.length),
      title: 'Leave categories configured'
    },
    { label: 'Days a year', value: days(typeTotals.perYear), title: 'Total annual days allowed across categories' },
    { label: 'Carry forward', value: days(typeTotals.carry), title: 'Days allowed to carry forward' },
    {
      label: 'Applications',
      value: String(typeTotals.applied),
      title: 'Requests booked against these kinds'
    }
  ];

  const activeFilters = [
    search && `search “${search}”`,
    tab === 'Applications' && status && `status ${status}`,
    tab === 'Applications' && (fromDate || toDate) && `from ${fromDate || 'the beginning'} → ${toDate || 'today'}`,
    tab === 'Leave Types' && typeState && `type ${typeState.toLowerCase()}`
  ].filter(Boolean) as string[];

  const clearAll = () => {
    setStatus('');
    setTypeState('');
    setFromDate('');
    setToDate('');
    if (search) { setSearch(''); setSearchEpoch(n => n + 1); }
  };

  const appColumns: ExportColumn<LeaveApplication>[] = [
    { label: 'Application #', value: a => a.number || String(a.id) },
    { label: 'Employee', value: a => `${a.employeeCode || ''} - ${a.employeeName || ''}` },
    { label: 'Designation', value: a => a.designation || a.department || '-' },
    { label: 'Leave Type', value: a => a.leaveTypeName || a.customType || '-' },
    { label: 'From', value: a => a.from },
    { label: 'To', value: a => (a.halfDay || a.from === a.to || !a.to) ? '-' : a.to },
    { label: 'Expiry Date', value: a => a.status === 'Approved' ? '-' : (a.expiryDate || getLeaveExpiryDate(a.to, a.from) || '-') },
    { label: 'Days', value: a => days(a.days), align: 'right' },
    { label: 'Applied On', value: a => a.appliedOn || '-' },
    { label: 'Status', value: a => a.status },
    { label: 'Decided By', value: a => a.approvedBy || a.decidedBy || '-' },
    { label: 'Reason', value: a => a.reason || '-' }
  ];

  const typeColumns: ExportColumn<LeaveType>[] = [
    { label: 'Code', value: t => t.code || '-' },
    { label: 'Leave Type', value: t => t.name },
    { label: 'Days / Year', value: t => days(t.daysPerYear), align: 'right' },
    { label: 'Carry Forward', value: t => days(t.carryForward || 0), align: 'right' },
    { label: 'Applications', value: t => String(t.applied || 0), align: 'right' },
    { label: 'Status', value: t => t.isActive ? 'Active' : 'Stopped' }
  ];

  const set = (patch: Partial<LeaveApplication>) => setDraft(d => (d ? { ...d, ...patch } : d));
  const setType = (patch: Partial<LeaveType>) => setTypeDraft(d => (d ? { ...d, ...patch } : d));

  // Date and Range Bi-directional sync handlers
  const handleFromChange = (newFrom: string) => {
    if (!draft) return;
    const currentDays = draft.days || 1;
    if (draft.halfDay) {
      set({ from: newFrom, to: newFrom, days: 0.5 });
    } else {
      const newTo = addDaysIso(newFrom, currentDays);
      set({ from: newFrom, to: newTo || newFrom });
    }
  };

  const handleDaysChange = (newDaysVal: number) => {
    if (!draft) return;
    const dCount = Math.max(0.5, Number(newDaysVal) || 1);
    const baseFrom = draft.from || isoDay();
    const newTo = dCount === 0.5 ? baseFrom : addDaysIso(baseFrom, dCount);
    set({ days: dCount, from: baseFrom, to: newTo, halfDay: dCount === 0.5 });
  };

  const handleToChange = (newTo: string) => {
    if (!draft) return;
    const baseFrom = draft.from || isoDay();
    if (newTo < baseFrom) {
      set({ to: baseFrom, days: 1 });
    } else {
      const dCount = diffDaysIso(baseFrom, newTo, !!draft.halfDay);
      set({ to: newTo, days: dCount });
    }
  };

  const handleHalfDayToggle = (isHalf: boolean) => {
    if (!draft) return;
    const baseFrom = draft.from || isoDay();
    if (isHalf) {
      set({ halfDay: true, days: 0.5, to: baseFrom });
    } else {
      const dCount = Math.max(1, draft.days === 0.5 ? 1 : draft.days || 1);
      set({ halfDay: false, days: dCount, to: addDaysIso(baseFrom, dCount) });
    }
  };

  const submit = async (close = true) => {
    if (!draft) return;
    if (!draft.employeeId) { setError('Choose the employee'); return; }
    if (!draft.leaveTypeId) { setError('Choose the kind of leave'); return; }
    if (isDateFriday(draft.from)) {
      setError('From Date falls on a Friday (weekly holiday). Please choose a working day.');
      return;
    }
    if (isDateFriday(draft.to)) {
      setError('To Date falls on a Friday (weekly holiday). Please choose a working day.');
      return;
    }

    // Check if Other is picked and custom type entered
    const isOther = String(draft.leaveTypeName || '').toLowerCase().includes('other') || draft.leaveTypeId === 3;
    if (isOther && !String(draft.customType || '').trim()) {
      setError('Please specify the custom leave type');
      return;
    }

    const payload: Partial<LeaveApplication> = {
      ...draft,
      leaveTypeName: isOther ? (draft.customType || 'Other') : draft.leaveTypeName,
      // When saving an edit, reset status to 'Applied' so management can review, approve, or reject again
      status: 'Applied',
      approvedBy: ''
    };

    setSaving(true); setError(''); setNotice('');
    try {
      if (draft.id) {
        await updateLeave(draft.id, payload, tenantSlug, branchId);
        setNotice(`Leave application #${draft.number || draft.id} updated and submitted for approval.`);
      } else {
        await saveLeave(payload, tenantSlug, branchId);
        setNotice(`Leave application recorded successfully for ${draft.employeeName || 'employee'}.`);
      }
      hub.reload();
      if (close) setDraft(null);
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  };

  const decide = async (a: LeaveApplication, next: LeaveStatus) => {
    setError(''); setNotice('');
    try {
      const action = next === 'Approved' ? 'Approve' : next === 'Cancelled' ? 'Cancel' : 'Reject';
      await decideLeave(a.id, action as any, undefined, tenantSlug, branchId);
      setNotice(`Application marked as ${next} for ${a.employeeName} (${a.days} day(s)).`);
      hub.reload();
    } catch (e) { setError((e as Error).message); }
    setConfirmId(null);
  };

  const remove = async (a: LeaveApplication) => {
    setError(''); setNotice(''); setConfirmId(null);
    try {
      await deleteLeave(a.id, tenantSlug, branchId);
      setNotice(`Leave application deleted.`);
      hub.reload();
    } catch (e) { setError((e as Error).message); }
  };

  const submitType = async () => {
    if (!typeDraft) return;
    if (!String(typeDraft.name ?? '').trim()) { setError('Leave type name is required'); return; }
    setSaving(true); setError(''); setNotice('');
    try {
      if (typeDraft.id) await updateLeaveType(typeDraft.id, typeDraft, tenantSlug, branchId);
      else await saveLeaveType(typeDraft, tenantSlug, branchId);
      setNotice(`${typeDraft.name} saved.`);
      setTypeDraft(null);
      hub.reload();
    } catch (e) { setError((e as Error).message); }
    setSaving(false);
  };

  const removeType = async (t: LeaveType) => {
    setError(''); setNotice(''); setConfirmId(null);
    try {
      await deleteLeaveType(t.id, tenantSlug, branchId);
      setNotice(`${t.name} has been deleted.`);
      hub.reload();
    } catch (e) { setError((e as Error).message); }
  };

  const isOtherSelected = draft && (
    draft.leaveTypeId === 3 ||
    String(draft.leaveTypeName || '').toLowerCase().includes('other') ||
    types.find(t => t.id === draft.leaveTypeId)?.name.toLowerCase().includes('other')
  );

  const subtitle = activeFilters.length
    ? activeFilters.join(' · ')
    : tab === 'Applications' ? 'Every leave application on the book'
      : tab === 'Leave Types' ? `Leave categories configured`
        : `Staff leave balances and annual allowances`;

  return (
    <div className="space-y-6">
      {/* Header & Filter Card */}
      <div className="rounded-sm border border-stroke bg-white p-4 sm:p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stroke dark:border-strokedark">
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Leave Management
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {tab === 'Applications' && (
                <>Approving an application writes the leave onto the attendance sheet for those dates, so payroll never enters the same days twice.</>
              )}
              {tab === 'Balances' && (
                <>Entitlement is set per leave type for the year; used counts approved applications, and remaining is what may still be approved.</>
              )}
              {tab === 'Leave Types' && (
                <>Configure annual leave quotas and categories available for employee applications.</>
              )}
            </p>
          </div>
          {tab === 'Applications' && (
            <ListToolbar
              addLabel="NEW APPLICATION"
              onAdd={() => {
                setError(''); setNotice('');
                setDraft(blankApp());
              }}
            />
          )}
        </div>

        {/* Stats Summary Strip */}
        <div className="pt-4 pb-1">
          <StatStrip stats={stats} />
        </div>

        {/* Search, Filter & Date Window Toolbar */}
        <div className="flex flex-wrap items-center gap-3.5 pt-4 border-t border-stroke dark:border-strokedark">
          <SearchBox key={searchEpoch}
            placeholder={tab === 'Applications' ? 'Search by application #, staff, designation or reason'
              : tab === 'Balances' ? 'Search staff by code, name or designation'
                : 'Search leave types by code, name or description'}
            onSearch={setSearch} />
          {tab === 'Applications' && <StatusPills value={status} onChange={setStatus} counts={statusCounts} />}
          {tab === 'Leave Types' && <StatusPills value={typeState} onChange={setTypeState} counts={typeStateCounts} />}
          {tab === 'Applications' && (
            <DateWindow from={fromDate} to={toDate} onChange={(f, t) => { setFromDate(f); setToDate(t); }} />
          )}
        </div>
      </div>

      {/* Alert Notifications */}
      {(error || hub.error || notice) && (
        <div className={`text-xs font-semibold rounded-md px-4 py-3 flex items-center justify-between shadow-sm ${error || hub.error ? 'text-red-700 bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300' : 'text-green-800 bg-green-50 border border-green-200 dark:bg-green-950/40 dark:border-green-900 dark:text-green-300'}`}>
          <span>{error || hub.error || notice}</span>
          <button type="button" onClick={() => { setError(''); setNotice(''); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Record Leave Application Form Modal/Card */}
      {draft && (
        <div className="rounded-sm border border-stroke bg-white p-5 sm:p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h3 className="text-base font-bold text-black dark:text-white mb-5 pb-3 border-b border-stroke dark:border-strokedark">
            {draft.id ? `Edit Application - [${draft.number || draft.id}]` : 'Record Leave Application'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Row 1: Employee & Leave Type */}
            <div className={isOtherSelected ? "md:col-span-6" : "md:col-span-7"}>
              <div className="mb-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-black dark:text-white">
                    Employee <span className="text-meta-1">*</span>
                  </label>
                  {draft.employeeId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAttModalEmpId(draft.employeeId ?? null);
                        setAttModalMonth(isoDay().slice(0, 7));
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary border border-primary/30 px-2.5 py-0.5 rounded-lg transition-all shadow-2xs cursor-pointer"
                      title="View attendance summary and timesheet log for this employee"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Attendance</span>
                    </button>
                  ) : null}
                </div>
                <SearchPick
                  options={employees.map(e => {
                    const info = [e.code, e.designationName || e.departmentName].filter(Boolean).join(' · ');
                    return {
                      id: e.id,
                      label: e.name,
                      sub: info || undefined
                    };
                  })}
                  valueId={draft.employeeId || null}
                  valueLabel={draft.employeeName || rows.find(r => r.id === draft.id)?.employeeName}
                  onPick={o => {
                    const emp = employees.find(e => e.id === o?.id);
                    set({
                      employeeId: o?.id ?? 0,
                      employeeName: o?.label ?? '',
                      employeeCode: emp?.code ?? '',
                      designation: emp?.designationName || emp?.departmentName || ''
                    });
                  }}
                  placeholder="Search staff by name or code..." />
              </div>
            </div>

            <div className={isOtherSelected ? "md:col-span-3" : "md:col-span-5"}>
              <Field label="Kind of Leave" required>
                <Pick
                  value={String(draft.leaveTypeId ?? '1')}
                  onChange={e => {
                    const val = Number(e.target.value);
                    const picked = types.find(t => t.id === val);
                    const isOther = val === 3 || picked?.name.toLowerCase().includes('other');
                    set({
                      leaveTypeId: val,
                      leaveTypeName: picked?.name || 'Casual Leave',
                      customType: isOther ? (draft.customType || '') : undefined
                    });
                  }}>
                  {types.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Pick>
              </Field>
            </div>

            {isOtherSelected && (
              <div className="md:col-span-3">
                <Field label="Specify Leave Type" required>
                  <Text
                    value={draft.customType ?? ''}
                    onChange={e => set({ customType: e.target.value })}
                    placeholder="e.g. Emergency, Exam"
                  />
                </Field>
              </div>
            )}

            {/* Row 2: From Date, Days / Range, To Date (with Half Day) */}
            <div className="md:col-span-4">
              <div className="mb-3">
                <label className="block text-xs font-semibold text-black dark:text-white mb-1.5">
                  From Date <span className="text-meta-1">*</span>
                </label>
                <div className={isDateFriday(draft.from) ? 'rounded-md ring-1 ring-red-500' : ''}>
                  <Text type="date" value={draft.from ?? ''} onChange={e => handleFromChange(e.target.value)} />
                </div>
                {isDateFriday(draft.from) && (
                  <p className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Friday is a weekly off day. Please select a working day.</span>
                  </p>
                )}
              </div>
            </div>

            <div className="md:col-span-4">
              <Field label="Days / Range" required>
                <Text
                  type="number"
                  step={draft.halfDay ? '0.5' : '1'}
                  min="0.5"
                  value={draft.days ?? 1}
                  onChange={e => handleDaysChange(Number(e.target.value))}
                  disabled={!!draft.halfDay}
                />
              </Field>
            </div>

            <div className="md:col-span-4">
              <div className="mb-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold text-black dark:text-white">
                    To Date <span className="text-meta-1">*</span>
                  </label>
                  <CheckBox checked={!!draft.halfDay} onChange={handleHalfDayToggle} label="Half Day" />
                </div>
                <div className={isDateFriday(draft.to) ? 'rounded-md ring-1 ring-red-500' : ''}>
                  <Text
                    type="date"
                    value={draft.to ?? ''}
                    onChange={e => handleToChange(e.target.value)}
                    disabled={!!draft.halfDay}
                  />
                </div>
                {isDateFriday(draft.to) && (
                  <p className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Friday is a weekly holiday. Please choose a working day for To Date.</span>
                  </p>
                )}
              </div>
            </div>

            {/* Row 3: Reason */}
            <div className="col-span-full">
              <Field label="Reason">
                <Area
                  rows={2}
                  value={draft.reason ?? ''}
                  onChange={e => set({ reason: e.target.value })}
                  placeholder="What the leave is for — the manager sees this when deciding."
                />
              </Field>
            </div>

            {(draft.to || draft.from) && (
              <div className="col-span-full bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Application Expiry Date:
                  </span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {getLeaveExpiryDate(draft.to, draft.from)}
                  </span>
                </div>
                <span className="text-[11px] text-gray-400 dark:text-gray-500">
                  (Auto-expires 2 days after leave date if pending approval)
                </span>
              </div>
            )}

            {!!draft.employeeId && (() => {
              const { allowed, taken, remaining } = getEmpBalanceInfo(draft.employeeId);
              const requestedDays = draft.days || 1;
              const isOver = requestedDays > remaining;
              return (
                <div className="col-span-full">
                  <div className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-xs ${isOver
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-slate-700 dark:text-slate-300'
                    }`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-600 dark:text-gray-300">Annual Quota Remaining:</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${remaining <= 0
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : remaining <= 3
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                        {remaining} of {allowed} Days Left ({taken} used)
                      </span>
                    </div>
                    {isOver && (
                      <span className="font-bold text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>This request ({requestedDays}d) exceeds available balance ({remaining}d left). Approval confirmation will be required.</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="mt-6 pt-4 border-t border-stroke dark:border-strokedark">
            <FormFooter onSave={() => submit()} onClose={() => setDraft(null)} saving={saving}
              disabled={!editable} saveLabel={draft.id ? 'SAVE' : 'RECORD APPLICATION'} />
          </div>
        </div>
      )}

      {/* Leave Type Form Modal/Card */}
      {typeDraft && (
        <div className="rounded-sm border border-stroke bg-white p-5 sm:p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h3 className="text-base font-bold text-black dark:text-white mb-5 pb-3 border-b border-stroke dark:border-strokedark">
            {typeDraft.id ? `Edit Leave Type - [${typeDraft.name}]` : 'Create Leave Type'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Field label="Name" required>
              <Text value={typeDraft.name ?? ''} onChange={e => setType({ name: e.target.value })} placeholder="e.g. Casual Leave" disabled={!editable} />
            </Field>
            <Field label="Code">
              <Text value={typeDraft.code ?? ''} onChange={e => setType({ code: e.target.value.toUpperCase().slice(0, 4) })} placeholder="CL" disabled={!editable} />
            </Field>
            <Field label="Days a Year" required>
              <NumCell value={typeDraft.daysPerYear ?? 0} onChange={e => setType({ daysPerYear: Number(e.target.value) })} disabled={!editable} />
            </Field>
            <Field label="Carry Forward" hint="Days an employee may push into next year.">
              <NumCell value={typeDraft.carryForward ?? 0} onChange={e => setType({ carryForward: Number(e.target.value) })} disabled={!editable} />
            </Field>
            <div className="lg:col-span-4">
              <Field label="Description">
                <Area rows={2} value={typeDraft.description ?? ''} onChange={e => setType({ description: e.target.value })} disabled={!editable} />
              </Field>
            </div>
            <div className="flex items-center gap-4 lg:col-span-4">
              <CheckBox checked={typeDraft.isActive !== false} onChange={v => setType({ isActive: v })} label="Active" disabled={!editable} />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-stroke dark:border-strokedark">
            <FormFooter onSave={submitType} onClose={() => setTypeDraft(null)} saving={saving}
              disabled={!editable || !String(typeDraft.name ?? '').trim()} saveLabel={typeDraft.id ? 'SAVE' : 'ADD TYPE'} />
          </div>
        </div>
      )}

      {/* Table Container Card */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark overflow-hidden">
        {/* Tab Navigation (Below Record Leave Application, Directly Above List Table) */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-stroke dark:border-strokedark">
          <TabStrip tabs={TABS} active={tab} onChange={t => { setTab(t); setError(''); setNotice(''); }} />
        </div>

        <div className="overflow-x-auto max-h-[64vh]">
          {tab === 'Applications' && (
            <table className="w-full table-auto text-left text-sm text-black dark:text-white">
              <thead className="sticky top-0 z-10 bg-gray-2 dark:bg-meta-4 border-b border-stroke dark:border-strokedark">
                <tr>
                  <SortHeader label="App #" sortKey="number" sort={sort} onSort={onSort} />
                  <SortHeader label="Employee" sortKey="employeeName" sort={sort} onSort={onSort} />
                  <SortHeader label="Designation" sortKey="designation" sort={sort} onSort={onSort} />
                  <SortHeader label="Leave Type" sortKey="leaveTypeName" sort={sort} onSort={onSort} />
                  <SortHeader label="From" sortKey="from" sort={sort} onSort={onSort} />
                  <SortHeader label="Days" sortKey="days" sort={sort} onSort={onSort} />
                  <SortHeader label="To" sortKey="to" sort={sort} onSort={onSort} />
                  <SortHeader label="Expiry Date" sortKey="expiryDate" sort={sort} onSort={onSort} />
                  <SortHeader label="Applied" sortKey="appliedOn" sort={sort} onSort={onSort} />
                  <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                  <th className="py-3 px-4 font-semibold text-black dark:text-white">Decision</th>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white text-right w-32">Action</th>
                </tr>
              </thead>
              <tbody>
                {hub.loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-stroke dark:border-strokedark">
                    <td colSpan={12} className="p-4">
                      <div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" style={{ width: `${100 - i * 8}%` }} />
                    </td>
                  </tr>
                ))}
                {!hub.loading && !visible.length && (
                  <TableEmpty colSpan={12} noun="leave applications" filters={activeFilters} cleared={clearAll}
                    addLabel={rows.length ? undefined : 'NEW APPLICATION'}
                    onAdd={() => { setDraft(blankApp()); setError(''); setNotice(''); }} />
                )}
                {!hub.loading && visible.map(a => (
                  <tr key={a.id} className="border-b border-stroke hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{a.number || a.id}</td>
                    <td className="py-3 px-4">
                      <span className="block font-medium">{a.employeeName}</span>
                      <span className="block text-xs text-gray-400">{a.employeeCode}</span>
                    </td>
                    <td className="py-3 px-4">{a.designation || a.department || <span className="text-gray-300">-</span>}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{a.leaveTypeName || a.customType || 'Casual Leave'}</span>
                    </td>
                    <td className="py-3 px-4">{a.from}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold tabular-nums text-primary">{a.days}</span>
                      {a.status === 'Applied' && (() => {
                        const { remaining } = getEmpBalanceInfo(a.employeeId);
                        if (a.days > remaining) {
                          return (
                            <span
                              className="inline-block text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 rounded px-1.5 py-0.2 mt-0.5 whitespace-nowrap shadow-2xs"
                              title={`Employee has ${remaining} day(s) left out of annual quota`}
                            >
                              ⚠️ Over Limit ({remaining}d left)
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      {(a.halfDay || a.from === a.to || !a.to) ? (
                        <span className="text-gray-400 font-mono text-xs">-</span>
                      ) : (
                        a.to
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {a.status === 'Approved' ? (
                        <span className="text-gray-400 font-mono text-xs">-</span>
                      ) : (
                        <span className="font-mono text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {a.expiryDate || getLeaveExpiryDate(a.to, a.from) || '-'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{a.appliedOn || '-'}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded ${STATUS_TONE[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {a.approvedBy || a.decidedBy ? (
                        <span className="block text-xs text-gray-500">{a.approvedBy || a.decidedBy}</span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <IconAction title="View application details" tone="primary"
                          onClick={() => setViewingApp(a)}><Eye className="w-4 h-4 text-primary" /></IconAction>
                        {a.status === 'Applied' && editable && (
                          <>
                            <IconAction title="Approve this leave" tone="success" onClick={() => handleApproveClick(a)}><Check className="w-4 h-4" /></IconAction>
                            <IconAction title="Reject this leave" tone="danger" onClick={() => decide(a, 'Rejected')}><MailX className="w-4 h-4" /></IconAction>
                          </>
                        )}
                        {a.status === 'Applied' && !editable && <span className="text-xs text-gray-300">waiting</span>}
                        {a.status === 'Approved' && (
                          confirmCancelId === a.id ? (
                            <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 px-2 py-1 rounded shadow-xs">
                              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200">Cancel leave?</span>
                              <button
                                type="button"
                                disabled={!editable}
                                onClick={() => {
                                  decide(a, 'Cancelled');
                                  setConfirmCancelId(null);
                                }}
                                className="text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 px-2 py-0.5 rounded transition shadow-2xs cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmCancelId(null)}
                                className="text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 px-1.5 py-0.5 rounded transition cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!editable}
                              onClick={() => setConfirmCancelId(a.id)}
                              className="text-xs font-semibold text-gray-600 dark:text-gray-300 border border-stroke dark:border-strokedark rounded px-2.5 py-1 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-meta-4 disabled:opacity-40 transition-colors"
                              title="Cancel this approved leave"
                            >
                              Cancel
                            </button>
                          )
                        )}
                        <IconAction title="Edit application" tone="primary" disabled={!editable || a.status === 'Approved'}
                          onClick={() => { setDraft({ ...a }); setError(''); setNotice(''); }}><Pencil className="w-4 h-4" /></IconAction>
                        {confirmId === a.id ? (
                          <DeleteConfirm onConfirm={() => remove(a)} onCancel={() => setConfirmId(null)}
                            keepLabel={`Keep application #${a.id}`} />
                        ) : (
                          <IconAction title="Delete application" tone="danger" disabled={!editable || a.status === 'Approved'}
                            onClick={() => setConfirmId(a.id)}><Trash2 className="w-4 h-4" /></IconAction>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {!!visible.length && !hub.loading && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-meta-4/40 font-bold border-t border-stroke dark:border-strokedark">
                    <td colSpan={5} className="py-3 px-4 text-black dark:text-white">Total ({visible.length})</td>
                    <td className="py-3 px-4 text-center tabular-nums text-black dark:text-white">{days(shown.days)}</td>
                    <td colSpan={6} className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">
                      {shown.waiting ? `${shown.waiting} still awaiting a decision` : 'Every application on this page has been decided'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {tab === 'Balances' && (
            <table className="w-full table-auto text-left text-sm text-black dark:text-white">
              <thead className="sticky top-0 z-10 bg-gray-2 dark:bg-meta-4 border-b border-stroke dark:border-strokedark">
                <tr>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white">Employee #</th>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white">Name</th>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white">Designation</th>
                  <th className="py-3 px-4 font-semibold text-center text-black dark:text-white">Annual Entitled</th>
                  <th className="py-3 px-4 font-semibold text-center text-black dark:text-white">Leaves Used</th>
                  <th className="py-3 px-4 font-semibold text-center text-black dark:text-white">Available Balance</th>
                  <th className="py-3 px-4 font-semibold text-right text-black dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody>
                {hub.loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-stroke dark:border-strokedark">
                    <td colSpan={7} className="p-4">
                      <div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" style={{ width: `${100 - i * 8}%` }} />
                    </td>
                  </tr>
                ))}
                {!hub.loading && !balances.length && (
                  <TableEmpty colSpan={7} noun="staff balances" filters={activeFilters} cleared={clearAll} />
                )}
                {!hub.loading && balances.map(b => {
                  const allowed = b.rows.reduce((s, r) => s + r.allowed, 0);
                  const taken = b.rows.reduce((s, r) => s + r.taken, 0);
                  const available = Math.max(0, allowed - taken);

                  return (
                    <tr key={b.employeeId} className="border-b border-stroke hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4/20 transition-colors">
                      <td className="py-3.5 px-4 font-medium">
                        {b.code ? (
                          <span className="font-mono font-bold text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded">
                            {b.code}
                          </span>
                        ) : <span className="text-gray-300 font-mono">-</span>}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-black dark:text-white">{b.name}</td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{b.designation || '-'}</td>

                      {/* Annual Entitled */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
                          {allowed} Days
                        </span>
                      </td>

                      {/* Leaves Used */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold font-mono ${taken > 0 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'text-gray-400 font-normal'}`}>
                          {taken > 0 ? `${taken} Days` : '0 Days'}
                        </span>
                      </td>

                      {/* Available Balance */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black font-mono shadow-2xs ${available <= 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200' : available <= 3 ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300'}`}>
                          {available} Days Left
                        </span>
                      </td>

                      {/* Action: View Breakdown */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingBalance(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:text-white bg-primary/10 hover:bg-primary rounded-lg transition-all cursor-pointer shadow-2xs"
                          title="View category quotas & leave history"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Breakdown</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'Leave Types' && (
            <table className="w-full table-auto text-left text-sm text-black dark:text-white">
              <thead className="sticky top-0 z-10 bg-gray-2 dark:bg-meta-4 border-b border-stroke dark:border-strokedark">
                <tr>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white">Code</th>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white">Leave Type</th>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white text-right">Days / Year</th>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white text-right">Carry Forward</th>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white text-right">Applications</th>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white">Status</th>
                  <th className="py-3 px-4 font-semibold text-black dark:text-white text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {hub.loading && Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-stroke dark:border-strokedark">
                    <td colSpan={7} className="p-4">
                      <div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" style={{ width: `${100 - i * 8}%` }} />
                    </td>
                  </tr>
                ))}
                {!hub.loading && !typesVisible.length && (
                  <TableEmpty colSpan={7} noun="leave types" filters={activeFilters} cleared={clearAll}
                    addLabel={types.length ? undefined : 'ADD LEAVE TYPE'}
                    onAdd={() => { setTypeDraft(blankType()); setError(''); setNotice(''); }} />
                )}
                {!hub.loading && typesVisible.map(t => (
                  <tr key={t.id} className="border-b border-stroke hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4/20 transition-colors">
                    <td className="py-3 px-4 font-medium">{t.code}</td>
                    <td className="py-3 px-4">
                      <span className="block font-medium">{t.name}</span>
                      {t.description && <span className="block text-xs text-gray-400">{t.description}</span>}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{t.daysPerYear}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{t.carryForward || <span className="text-gray-300">-</span>}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{t.applied || 0}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded ${t.isActive ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' : 'bg-gray-100 text-gray-500'}`}>
                        {t.isActive ? 'Active' : 'Stopped'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <IconAction title="Edit leave type" tone="primary" disabled={!editable}
                          onClick={() => { setTypeDraft({ ...t }); setError(''); setNotice(''); }}><Pencil className="w-4 h-4" /></IconAction>
                        {confirmId === t.id ? (
                          <DeleteConfirm onConfirm={() => removeType(t)} onCancel={() => setConfirmId(null)}
                            keepLabel={`Keep ${t.name}`} />
                        ) : (
                          <IconAction title={approvedType.has(t.id) ? 'Has approved leave on record — switch it off instead' : 'Delete leave type'}
                            tone="danger" disabled={!editable || approvedType.has(t.id)} onClick={() => setConfirmId(t.id)}><Trash2 className="w-4 h-4" /></IconAction>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {!!typesVisible.length && !hub.loading && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-meta-4/40 font-bold border-t border-stroke dark:border-strokedark">
                    <td colSpan={2} className="py-3 px-4 text-black dark:text-white">Total ({typesVisible.length})</td>
                    <td className="py-3 px-4 text-right tabular-nums text-black dark:text-white">{days(typeTotals.perYear)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-black dark:text-white">{days(typeTotals.carry)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-black dark:text-white">{typeTotals.applied || 0}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
      {/* View Application Details Popup Modal */}
      {viewingApp && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark bg-slate-50 dark:bg-meta-4/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black dark:text-white">
                    Leave Application #{viewingApp.number || viewingApp.id}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Applied on {viewingApp.appliedOn || viewingApp.from || 'Recently'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingApp(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-black dark:hover:bg-slate-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Employee Summary Card */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <div>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Employee</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-bold text-black dark:text-white">{viewingApp.employeeName}</span>
                    {viewingApp.employeeCode && (
                      <span className="font-mono text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-1.5 py-0.2 rounded">
                        {viewingApp.employeeCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {viewingApp.designation || viewingApp.department || 'Staff'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Status</span>
                  <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${STATUS_TONE[viewingApp.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {viewingApp.status}
                  </span>
                </div>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                <div className="p-3 rounded-lg border border-stroke dark:border-strokedark">
                  <span className="text-[11px] text-gray-400 font-medium block">Leave Type</span>
                  <span className="text-xs font-bold text-black dark:text-white mt-0.5 block truncate">
                    {viewingApp.leaveTypeName || viewingApp.customType || 'Casual Leave'}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-stroke dark:border-strokedark">
                  <span className="text-[11px] text-gray-400 font-medium block">Days / Duration</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-bold text-primary font-mono">{viewingApp.days} Day(s)</span>
                    {viewingApp.halfDay && (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded">
                        Half Day
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-stroke dark:border-strokedark">
                  <span className="text-[11px] text-gray-400 font-medium block">Decision By</span>
                  <span className="text-xs font-bold text-black dark:text-white mt-0.5 block truncate">
                    {viewingApp.approvedBy || viewingApp.decidedBy || 'Pending Decision'}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-stroke dark:border-strokedark">
                  <span className="text-[11px] text-gray-400 font-medium block">From Date</span>
                  <span className="text-xs font-bold font-mono text-black dark:text-white mt-0.5 block">
                    {viewingApp.from}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-stroke dark:border-strokedark">
                  <span className="text-[11px] text-gray-400 font-medium block">To Date</span>
                  <span className="text-xs font-bold font-mono text-black dark:text-white mt-0.5 block">
                    {(viewingApp.halfDay || viewingApp.from === viewingApp.to || !viewingApp.to) ? (
                      <span className="text-gray-400 font-normal">-</span>
                    ) : (
                      viewingApp.to
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-stroke dark:border-strokedark">
                  <span className="text-[11px] text-gray-400 font-medium block">Applied On</span>
                  <span className="text-xs font-bold font-mono text-black dark:text-white mt-0.5 block">
                    {viewingApp.appliedOn || '-'}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-stroke dark:border-strokedark">
                  <span className="text-[11px] text-gray-400 font-medium block">Expiry Date</span>
                  <span className={`text-xs font-bold font-mono mt-0.5 block ${viewingApp.status === 'Approved' ? 'text-gray-400 font-normal' : 'text-rose-600 dark:text-rose-400'}`}>
                    {viewingApp.status === 'Approved' ? '-' : (viewingApp.expiryDate || getLeaveExpiryDate(viewingApp.to, viewingApp.from) || '-')}
                  </span>
                </div>
              </div>

              {/* Reason / Remarks Section */}
              <div className="p-3.5 rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-slate-900/30">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Reason for Leave
                </span>
                <p className="text-xs text-black dark:text-white whitespace-pre-wrap leading-relaxed">
                  {viewingApp.reason ? viewingApp.reason : <span className="italic text-gray-400">No reason was specified.</span>}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-stroke dark:border-strokedark bg-slate-50 dark:bg-meta-4/40">
              <div className="flex items-center gap-2">
                {viewingApp.status === 'Applied' && editable && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingApp;
                        const { remaining } = getEmpBalanceInfo(target.employeeId);
                        if (target.days > remaining) {
                          setOverLimitConfirmApp(target);
                        } else {
                          decide(target, 'Approved');
                          setViewingApp(null);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        decide(viewingApp, 'Rejected');
                        setViewingApp(null);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <MailX className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
                {viewingApp.status === 'Approved' && editable && (
                  confirmCancelId === viewingApp.id ? (
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 px-3 py-1.5 rounded-lg">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-200">Cancel approved leave?</span>
                      <button
                        type="button"
                        onClick={() => {
                          decide(viewingApp, 'Cancelled');
                          setConfirmCancelId(null);
                          setViewingApp(null);
                        }}
                        className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-2xs"
                      >
                        Yes, Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmCancelId(null)}
                        className="px-2 py-1 rounded text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmCancelId(viewingApp.id)}
                      className="px-3.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition"
                    >
                      Cancel Leave
                    </button>
                  )
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmCancelId(null);
                  setViewingApp(null);
                }}
                className="px-4 py-1.5 rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-xs font-bold text-black dark:text-white hover:bg-gray-100 dark:hover:bg-meta-4 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Over-Limit Approval Confirmation Modal */}
      {overLimitConfirmApp && (() => {
        const { allowed, taken, remaining } = getEmpBalanceInfo(overLimitConfirmApp.employeeId);
        const extra = Math.max(0, overLimitConfirmApp.days - remaining);
        return (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="relative w-full max-w-md rounded-2xl border border-amber-300 bg-white shadow-2xl dark:border-amber-700 dark:bg-boxdark overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark bg-amber-50 dark:bg-amber-950/40">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 text-lg font-bold">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-amber-900 dark:text-amber-100">
                      Approve Over-Limit Leave?
                    </h3>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Employee has exceeded annual leave quota
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOverLimitConfirmApp(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-black dark:hover:bg-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Employee:</span>
                    <span className="font-bold text-black dark:text-white">{overLimitConfirmApp.employeeName} {overLimitConfirmApp.employeeCode ? `(${overLimitConfirmApp.employeeCode})` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Annual Quota:</span>
                    <span className="font-mono font-bold text-black dark:text-white">{allowed} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Leaves Taken So Far:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{taken} Days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Available Balance:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{remaining} Days Left</span>
                  </div>
                  <div className="pt-2 border-t border-stroke dark:border-strokedark flex justify-between">
                    <span className="font-semibold text-black dark:text-white">Leave Requested:</span>
                    <span className="font-mono font-bold text-primary">{overLimitConfirmApp.days} Day(s)</span>
                  </div>
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                    <span>Exceeding Quota By:</span>
                    <span className="font-mono">+{extra} Day(s)</span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Approving this request will grant <strong className="text-black dark:text-white">{overLimitConfirmApp.employeeName}</strong> more leave days than their annual allowance. Do you still want to approve this application?
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stroke dark:border-strokedark bg-slate-50 dark:bg-meta-4/40">
                <button
                  type="button"
                  onClick={() => setOverLimitConfirmApp(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Cancel / No
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = overLimitConfirmApp;
                    setOverLimitConfirmApp(null);
                    if (viewingApp?.id === target.id) {
                      setViewingApp(null);
                    }
                    decide(target, 'Approved');
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Yes, Approve Over Limit
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Employee Leave Quota & History Breakdown Popup Modal (Plan B) */}
      {viewingBalance && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stroke dark:border-strokedark bg-slate-50 dark:bg-meta-4/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
                    <span>{viewingBalance.name}</span>
                    {viewingBalance.code && (
                      <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded">
                        {viewingBalance.code}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {viewingBalance.designation || viewingBalance.department || 'Staff Member'} · Annual Leave Quota Breakdown
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingBalance(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-black dark:hover:bg-slate-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Overview Strip */}
              {(() => {
                const totalAllowed = viewingBalance.rows.reduce((s, r) => s + r.allowed, 0);
                const totalTaken = viewingBalance.rows.reduce((s, r) => s + r.taken, 0);
                const totalLeft = Math.max(0, totalAllowed - totalTaken);
                return (
                  <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                    <div className="text-center">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Entitled Quota</span>
                      <span className="text-lg font-black text-black dark:text-white font-mono mt-0.5 block">{totalAllowed} Days</span>
                    </div>
                    <div className="text-center border-x border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Approved Used</span>
                      <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">{totalTaken} Days</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Available Balance</span>
                      <span className="text-lg font-black text-emerald-800 dark:text-emerald-300 font-mono mt-0.5 block">{totalLeft} Days Left</span>
                    </div>
                  </div>
                );
              })()}

              {/* Annual Quota Progress Card */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  Annual Leave Allowance
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {viewingBalance.rows.map((r) => {
                    const isExhausted = r.balance <= 0;
                    return (
                      <div
                        key={r.leaveTypeId}
                        className="p-4 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-black dark:text-white">{r.leaveTypeName}</span>
                          <span className={`text-xs font-black font-mono px-2.5 py-0.5 rounded-full ${isExhausted ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'}`}>
                            {r.balance} Days Left
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${isExhausted ? 'bg-rose-500' : 'bg-primary'}`}
                              style={{ width: `${r.allowed > 0 ? Math.min(100, Math.round((r.taken / r.allowed) * 100)) : 0}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                            <span>Approved Used: {r.taken} Days</span>
                            <span>Total Annual Limit: {r.allowed} Days</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Employee Leave Application History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  Application History ({viewingBalance.name})
                </h4>
                {(() => {
                  const empHistory = rows.filter(a => a.employeeId === viewingBalance.employeeId);
                  if (!empHistory.length) {
                    return (
                      <div className="p-4 text-center text-xs text-gray-400 rounded-xl border border-dashed border-stroke dark:border-strokedark">
                        No leave applications recorded yet for this staff member.
                      </div>
                    );
                  }
                  return (
                    <div className="rounded-xl border border-stroke dark:border-strokedark overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-meta-4/60 border-b border-stroke dark:border-strokedark font-semibold text-black dark:text-white">
                          <tr>
                            <th className="p-2.5">App #</th>
                            <th className="p-2.5">Leave Type</th>
                            <th className="p-2.5">Dates</th>
                            <th className="p-2.5 text-center">Days</th>
                            <th className="p-2.5">Reason</th>
                            <th className="p-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stroke dark:divide-strokedark">
                          {empHistory.map(h => (
                            <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-meta-4/20">
                              <td className="p-2.5 font-mono font-medium">{h.number || h.id}</td>
                              <td className="p-2.5 font-semibold text-black dark:text-white">{h.leaveTypeName || h.customType || 'Casual Leave'}</td>
                              <td className="p-2.5 font-mono text-gray-500">{h.from}{h.halfDay ? ' (Half Day)' : (h.to && h.to !== h.from ? ` → ${h.to}` : '')}</td>
                              <td className="p-2.5 text-center font-mono font-bold text-primary">{h.days}</td>
                              <td className="p-2.5 text-gray-500 truncate max-w-[180px]">{h.reason || '-'}</td>
                              <td className="p-2.5 text-right">
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${STATUS_TONE[h.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                  {h.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-stroke dark:border-strokedark bg-slate-50 dark:bg-meta-4/40 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const emp = employees.find(e => e.id === viewingBalance.employeeId);
                  setDraft({
                    ...blankApp(),
                    employeeId: viewingBalance.employeeId,
                    employeeName: viewingBalance.name,
                    employeeCode: viewingBalance.code,
                    designation: viewingBalance.designation
                  });
                  setViewingBalance(null);
                  setTab('Applications');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition shadow-sm"
              >
                + New Application for {viewingBalance.name}
              </button>

              <button
                type="button"
                onClick={() => setViewingBalance(null)}
                className="px-4 py-1.5 rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-xs font-bold text-black dark:text-white hover:bg-gray-100 dark:hover:bg-meta-4 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INDIVIDUAL EMPLOYEE ATTENDANCE SUMMARY & TIMESHEET MODAL ── */}
      {attModalEmpId && (() => {
        const emp = employees.find(e => e.id === attModalEmpId) || {
          id: attModalEmpId,
          name: draft?.employeeName || 'Staff Member',
          code: draft?.employeeCode || '',
          designationName: draft?.designation || 'Staff',
          departmentName: 'Operations'
        };

        const attRow = (attModalRows || []).find(r => r.employeeId === attModalEmpId);
        const [y, m] = attModalMonth.split('-').map(Number);
        const total = daysInMonth(attModalMonth);
        const todayStr = isoDay();
        const currentMonthStr = todayStr.slice(0, 7);
        const todayDayNum = Number(todayStr.split('-')[2]);

        // Only show elapsed days up to today for current month, full month for past months, and 0 for future months
        let maxDisplayDay = total;
        const isCurrentMonth = attModalMonth === currentMonthStr;
        const isFutureMonth = attModalMonth > currentMonthStr;

        if (isCurrentMonth) {
          maxDisplayDay = Math.min(total, todayDayNum);
        } else if (isFutureMonth) {
          maxDisplayDay = 0;
        }

        const dayNos = Array.from({ length: maxDisplayDay }, (_, i) => i + 1);

        const daysMap: Record<string, HrMark | ''> = {};
        dayNos.forEach((d) => {
          const key = String(d);
          if (isFriday(attModalMonth, d)) {
            daysMap[key] = 'Holiday';
          } else if (attRow?.days?.[key]) {
            daysMap[key] = attRow.days[key] as HrMark;
          } else {
            daysMap[key] = '';
          }
        });

        // Compute Counts for elapsed days only
        let presentCount = 0;
        let absentCount = 0;
        let halfDayCount = 0;
        let leaveCount = 0;
        let holidayCount = 0;

        dayNos.forEach((d) => {
          const mark = daysMap[String(d)];
          if (mark === 'Present') presentCount++;
          else if (mark === 'Absent') absentCount++;
          else if (mark === 'Half Day') halfDayCount++;
          else if (mark === 'Leave') leaveCount++;
          else if (mark === 'Holiday' || isFriday(attModalMonth, d)) holidayCount++;
        });

        const salaryDeductDays = absentCount + halfDayCount * 0.5 + (attRow?.unpaidLeave || 0);
        const overtimeHrs = attRow?.overtimeHours || 0;

        const empInitials = (emp.name || 'E')
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        const handlePrevMonth = () => {
          const prevDate = new Date(y, m - 2, 1);
          const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
          setAttModalMonth(prevStr);
        };

        const handleNextMonth = () => {
          const nextDate = new Date(y, m, 1);
          const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
          setAttModalMonth(nextStr);
        };

        return (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
            <div className="w-full max-w-5xl rounded-2xl border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark max-h-[92vh] flex flex-col overflow-hidden">
              {/* ── MODAL HEADER ── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-stroke dark:border-strokedark bg-gray-50/70 dark:bg-meta-4/20">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-emerald-500 text-white font-bold flex items-center justify-center shadow-md text-base shrink-0">
                    {empInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-black dark:text-white text-lg">
                        {emp.name}
                      </h3>
                      {emp.code && (
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {emp.code}
                        </span>
                      )}
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-meta-4 text-gray-700 dark:text-gray-300">
                        {emp.designationName || (emp as any).designation || emp.departmentName || 'Staff'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>{emp.departmentName || (emp as any).department || 'Operations'}</span>
                      <span>·</span>
                      <div className="inline-flex items-center gap-1 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-lg px-2 py-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={handlePrevMonth}
                          className="p-1 text-gray-500 hover:text-black dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer"
                          title="Previous Month"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-semibold text-black dark:text-white flex items-center gap-1 px-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {isCurrentMonth ? `${monthNamed(attModalMonth)} (Day 1 – ${maxDisplayDay} of ${total})` : isFutureMonth ? `${monthNamed(attModalMonth)} (Future Month)` : `${monthNamed(attModalMonth)} (${total} Days Total)`}
                        </span>
                        <button
                          type="button"
                          onClick={handleNextMonth}
                          className="p-1 text-gray-500 hover:text-black dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer"
                          title="Next Month"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() =>
                      printIsolatedElement(
                        'printable-leave-employee-timesheet',
                        'portrait',
                        `${emp.name} Timesheet - ${monthNamed(attModalMonth)}`
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-opacity-90 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Official Timesheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttModalEmpId(null)}
                    className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-200 dark:hover:bg-meta-4 dark:hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── MODAL SCROLLABLE BODY ── */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {attModalLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Spinner size="w-7 h-7" color="border-primary" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Loading attendance log for {monthNamed(attModalMonth)}...</span>
                  </div>
                ) : (
                  <>
                    {/* 1. Sleek KPI Metrics Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                          Present (P)
                        </span>
                        <span className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5 block">
                          {presentCount}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/30 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                          Absent (A)
                        </span>
                        <span className="text-xl font-black text-rose-900 dark:text-rose-200 mt-0.5 block">
                          {absentCount}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                          Half Day (½)
                        </span>
                        <span className="text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5 block">
                          {halfDayCount}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
                          Leaves (L)
                        </span>
                        <span className="text-xl font-black text-blue-900 dark:text-blue-200 mt-0.5 block">
                          {leaveCount}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/70 dark:border-purple-900/50 dark:bg-purple-950/30 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
                          Holidays / Fri
                        </span>
                        <span className="text-xl font-black text-purple-900 dark:text-purple-200 mt-0.5 block">
                          {holidayCount}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/30 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 block">
                          Salary Deduct
                        </span>
                        <span className="text-xl font-black text-red-900 dark:text-red-200 mt-0.5 block">
                          {days(salaryDeductDays)} Days
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/50 dark:bg-indigo-950/30 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                          Overtime
                        </span>
                        <span className="text-xl font-black text-indigo-900 dark:text-indigo-200 mt-0.5 block">
                          {overtimeHrs} hrs
                        </span>
                      </div>
                    </div>

                    {/* 2. Interactive Month Attendance Timeline Log Table */}
                    <div className="rounded-xl border border-stroke dark:border-strokedark overflow-hidden bg-white dark:bg-boxdark shadow-xs">
                      <div className="p-3.5 border-b border-stroke dark:border-strokedark bg-gray-50/50 dark:bg-meta-4/10 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                          Day-by-Day Attendance Log ({monthNamed(attModalMonth)})
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                          Fridays automatically set as Weekly Off
                        </span>
                      </div>

                      <div className="max-h-96 overflow-y-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-gray-100/70 dark:bg-meta-4/30 text-gray-700 dark:text-gray-300 sticky top-0 z-10">
                            <tr>
                              <th className="py-2.5 px-4 font-bold w-20">Day #</th>
                              <th className="py-2.5 px-4 font-bold w-36">Weekday</th>
                              <th className="py-2.5 px-4 font-bold w-40 text-center">Status</th>
                              <th className="py-2.5 px-4 font-bold">Shift Notes / Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stroke dark:divide-strokedark">
                            {dayNos.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-xs text-gray-400 dark:text-gray-500 italic">
                                  No attendance recorded yet — this month has not started.
                                </td>
                              </tr>
                            ) : (
                              dayNos.map((d) => {
                                const mark = daysMap[String(d)];
                                const fri = isFriday(attModalMonth, d);

                                return (
                                  <tr
                                    key={d}
                                    className={`transition hover:bg-primary/5 dark:hover:bg-meta-4/40 ${fri ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''
                                      }`}
                                  >
                                    <td className="py-2 px-4 font-mono font-bold text-black dark:text-white">
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-meta-4 text-gray-800 dark:text-gray-200 text-xs">
                                        {d}
                                      </span>
                                    </td>
                                    <td className={`py-2 px-4 font-medium ${fri ? 'font-bold text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                      {dowFullOf(attModalMonth, d)}
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                      {mark ? (
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-2xs ${CELL[mark].pillCls}`}>
                                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                          <span>{mark}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-850">
                                          Unmarked
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 px-4 text-gray-600 dark:text-gray-300">
                                      {fri ? (
                                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                                          Weekly Holiday
                                        </span>
                                      ) : mark === 'Present' ? (
                                        <span className="text-gray-500 dark:text-gray-400">Normal Working Shift</span>
                                      ) : (
                                        attRow?.note || <span className="text-gray-400 italic">No notes</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ── MODAL FOOTER ── */}
              <div className="p-4 border-t border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4/20 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Ready to print official physical copy for employee records or payroll audit.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAttModalEmpId(null)}
                    className="px-4 py-2 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white text-xs font-bold hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      printIsolatedElement(
                        'printable-leave-employee-timesheet',
                        'portrait',
                        `${emp.name} Timesheet - ${monthNamed(attModalMonth)}`
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Official Sheet</span>
                  </button>
                </div>
              </div>

              {/* ── HIDDEN OFFSCREEN PRINT TEMPLATE ── */}
              <div id="printable-leave-employee-timesheet" className="hidden">
                <div className="text-center pb-2 border-b-2 border-black mb-2">
                  <h1 className="text-xl font-black uppercase tracking-wider text-black">
                    UZAIR JIBRAN CLOTH
                  </h1>
                  <h2 className="text-xs font-bold uppercase text-gray-700 tracking-wide mt-0.5">
                    INDIVIDUAL EMPLOYEE MONTHLY ATTENDANCE SHEET
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] font-semibold mt-2 text-left bg-gray-50 p-2 border border-gray-300">
                    <div>
                      <span className="text-gray-500 block text-[9px]">Employee Name:</span>
                      <span className="text-black font-bold">{emp.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">Staff Code:</span>
                      <span className="text-black font-bold font-mono">{emp.code || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">Designation:</span>
                      <span className="text-black font-bold">{emp.designationName || (emp as any).designation || 'Staff'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">Month / Period:</span>
                      <span className="text-black font-bold font-mono">{monthNamed(attModalMonth)}</span>
                    </div>
                  </div>
                </div>

                {/* Printable Summary Row */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] my-3">
                  <div className="p-1.5 border border-black bg-emerald-50 font-bold">Present: {presentCount}</div>
                  <div className="p-1.5 border border-black bg-rose-50 font-bold">Absent: {absentCount}</div>
                  <div className="p-1.5 border border-black bg-amber-50 font-bold">Half Day: {halfDayCount}</div>
                  <div className="p-1.5 border border-black bg-blue-50 font-bold">Leaves: {leaveCount}</div>
                  <div className="p-1.5 border border-black bg-purple-50 font-bold">Holidays: {holidayCount}</div>
                  <div className="p-1.5 border border-black bg-red-100 font-bold">Deduct: {days(salaryDeductDays)}d</div>
                  <div className="p-1.5 border border-black bg-indigo-50 font-bold">Overtime: {overtimeHrs}h</div>
                </div>

                <table className="w-full text-[10px] border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-black p-1 w-12 text-center">Day #</th>
                      <th className="border border-black p-1 w-24">Weekday</th>
                      <th className="border border-black p-1 w-28 text-center">Status</th>
                      <th className="border border-black p-1">Shift Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayNos.map((d) => {
                      const mark = daysMap[String(d)];
                      const fri = isFriday(attModalMonth, d);
                      return (
                        <tr key={d}>
                          <td className="border border-black p-1 text-center font-bold">{d}</td>
                          <td className={`border border-black p-1 ${fri ? 'font-bold' : ''}`}>{dowFullOf(attModalMonth, d)}</td>
                          <td className={`border border-black p-1 text-center font-bold ${mark ? CELL[mark].printCls : ''}`}>
                            {mark || (fri ? 'Weekly Holiday' : '-')}
                          </td>
                          <td className="border border-black p-1 text-gray-700">
                            {fri ? 'Weekly Holiday (Off)' : mark === 'Present' ? 'Normal Shift' : (attRow?.note || '-')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-8 pt-4 flex justify-between text-[10px] font-bold">
                  <div className="border-t border-black pt-1 w-40 text-center">Employee Signature</div>
                  <div className="border-t border-black pt-1 w-40 text-center">HR / Manager Signature</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default LeavePage;
