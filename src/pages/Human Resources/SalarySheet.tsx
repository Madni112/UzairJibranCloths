import React, { useMemo, useState } from 'react';
import { isoDay } from '../../utils/dateRange';
import {
  AlertTriangle,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Coins,
  Eye,
  FileSpreadsheet,
  Info,
  Layers,
  Play,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  Undo2,
  Users,
  X
} from 'lucide-react';
import { useTenant } from '../../Context/TenantContext';
import { useAuth } from '../../Context/AuthContext';
import { getBrandConfig } from '../../utils/brand';
import {
  approveSheet,
  createSheet,
  deleteSheet,
  getSheet,
  getSheets,
  HrSettings,
  LoanRecoveryItem,
  monthNamed,
  PayItem,
  PayrollLine,
  previewSheet,
  SalarySheetHead,
  SalarySheetView,
  paySheet,
  saveHrSettings,
  saveSheetLines,
  SheetStatus,
  unapproveSheet,
  updateSheet
} from '../../services/hr.service';
import {
  Area,
  Check as CheckBox,
  DeleteConfirm,
  Field,
  IconAction,
  NumCell,
  Pick,
  SearchBox,
  SortHeader,
  SortState,
  StatusPills,
  TableEmpty,
  Text
} from '../Masters/masterUi';
import { useHub } from '../Setup/useHub';
import { ExportColumn, footerRow } from '../../utils/exportTable';

const money = (n: number) => Math.round(Number(n || 0)).toLocaleString();
const thisMonth = () => isoDay().slice(0, 7);
const dayFig = (n: number) => String(Math.round(Number(n || 0) * 10) / 10);
const addUp = (lines: PayrollLine[], f: (l: PayrollLine) => number) =>
  lines.reduce((s, l) => s + f(l), 0);

const SHEET_TONE: Record<string, string> = {
  Draft: 'bg-gray-100 dark:bg-meta-4 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-strokedark',
  Approved: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40',
  Paid: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
};

const itemsOf = (
  lines: PayrollLine[],
  kind: 'earnings' | 'extraEarnings' | 'deductions' | 'extraDeductions'
) => {
  const map: Record<string, number> = {};
  lines.forEach((l) =>
    l[kind].forEach((i) => {
      map[i.name] = (map[i.name] || 0) + i.amount;
    })
  );
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
};

// Clean Isolated Printing Utility with Self-Contained CSS
const printIsolatedElement = (
  elementId: string,
  orientation: 'landscape' | 'portrait' = 'landscape',
  title = 'Salary Sheet'
) => {
  const elem = document.getElementById(elementId);
  if (!elem) return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: 10mm 8mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 4px;
            width: 100%;
          }
          .print-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .print-header h1 {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .print-header h2 {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            color: #222;
            margin-bottom: 8px;
          }
          .meta-grid {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: 600;
            color: #333;
            padding: 0 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 11px;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 6px 8px;
            vertical-align: middle;
          }
          th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
            text-align: center;
          }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: monospace; font-weight: bold; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          .bg-gray { background-color: #f3f4f6 !important; }
          .footer-signatures {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 55px;
            padding-top: 10px;
          }
          .signature-box {
            text-align: center;
            width: 220px;
          }
          .sign-line {
            border-top: 1.5px solid #000;
            padding-top: 4px;
            font-size: 11.5px;
            font-weight: bold;
            color: #000;
          }
          .sign-title {
            font-size: 10px;
            color: #444;
            font-weight: 500;
            margin-top: 1px;
          }
          .sign-stamp {
            height: 45px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            font-size: 10px;
            font-style: italic;
            color: #888;
            margin-bottom: 4px;
          }
        </style>
      </head>
      <body>
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

export const SalarySheetPage: React.FC = () => {
  const { tenantSlug, branchId } = useTenant();
  const { can } = useAuth();
  const hub = useHub(() => getSheets(tenantSlug, branchId), [tenantSlug, branchId]);
  const [month, setMonth] = useState(thisMonth());
  const [opts, setOpts] = useState({ deductForAbsence: false, recoverLoans: true, payBonus: false, bonusAmount: 10000, bonusReason: '' });
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewSheet>>['data'] | null>(null);
  const [prepared, setPrepared] = useState(false);
  const [detail, setDetail] = useState<SalarySheetView | null>(null);
  const [originalDetail, setOriginalDetail] = useState<SalarySheetView | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [adjust, setAdjust] = useState<{
    extraEarnings: PayItem[];
    extraDeductions: PayItem[];
    loanRecoveries: LoanRecoveryItem[];
    remarks: string;
  }>({
    extraEarnings: [],
    extraDeductions: [],
    loanRecoveries: [],
    remarks: ''
  });
  const [pay, setPay] = useState<{
    open: boolean;
    payThrough: string;
    accountId: string;
    date: string;
  }>({
    open: false,
    payThrough: 'Bank Transfer',
    accountId: '',
    date: isoDay()
  });
  const [settings, setSettings] = useState<HrSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [searchEpoch, setSearchEpoch] = useState(0);
  const [status, setStatus] = useState<SheetStatus | ''>('');
  const [sort, setSort] = useState<SortState | null>({ key: 'month', dir: 'desc' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const editable = can('hr-salary-sheet:edit');
  const sheets = hub.value?.data ?? [];
  const heads = hub.value?.heads ?? [];
  const accounts = hub.value?.accounts ?? [];
  const flags = settings ?? hub.value?.settings ?? null;

  const existingSheet = useMemo(
    () => sheets.find((s) => s.month === month),
    [sheets, month]
  );

  const inScope = useMemo(
    () =>
      sheets.filter(
        (s) =>
          !search.trim() ||
          `${s.number} ${s.monthLabel} ${s.status} ${s.payThrough} ${s.accountName} ${s.journalNumber}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())
      ),
    [sheets, search]
  );

  const visible = useMemo(() => {
    const list = status ? inScope.filter((s) => s.status === status) : inScope;
    if (!sort) return list;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a: any, b: any) => {
      const av = a[sort.key],
        bv = b[sort.key];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [inScope, status, sort]);

  const onSort = (k: string) =>
    setSort((s) =>
      s?.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }
    );

  const shown = useMemo(
    () => ({
      employees: visible.reduce((s, x) => s + x.employees, 0),
      gross: visible.reduce((s, x) => s + x.gross, 0),
      deductions: visible.reduce((s, x) => s + x.deductions, 0),
      netPayable: visible.reduce((s, x) => s + x.netPayable, 0),
      unpaidDays: visible.reduce((s, x) => s + x.unpaidDays, 0)
    }),
    [visible]
  );

  const statusCounts = [
    { value: '', label: 'All', count: inScope.length },
    ...(['Draft', 'Approved', 'Paid'] as SheetStatus[]).map((s) => ({
      value: s,
      label: s,
      count: inScope.filter((x) => x.status === s).length
    }))
  ];

  const activeFilters = [
    search && `search “${search}”`,
    status && `status ${status}`
  ].filter(Boolean) as string[];

  const clearAll = () => {
    setStatus('');
    if (search) {
      setSearch('');
      setSearchEpoch((n) => n + 1);
    }
  };

  const applyPayrollOptions = (newOpts: { deductForAbsence: boolean; recoverLoans: boolean; payBonus?: boolean; bonusAmount?: number; bonusReason?: string }) => {
    setOpts((prev) => ({ ...prev, ...newOpts }));
    if (!detail || detail.status !== 'Draft') return;

    const [y, m] = (detail.month || month).split('-').map(Number);
    const totalMonthDays = new Date(y || 2026, m || 10, 0).getDate() || 30;

    const updatedLines = detail.lines.map((cur) => {
      // 1. Calculate absence cut
      let absentCut = 0;
      if (newOpts.deductForAbsence) {
        const unpaidDays = Number(cur.unpaidDays ?? (Number(cur.absent || 0) + Number(cur.halfDays || 0) * 0.5));
        absentCut = totalMonthDays > 0 ? Math.round((Number(cur.basic || 0) / totalMonthDays) * unpaidDays) : 0;
      }

      // 2. Calculate loan recoveries
      const existingRecoveries = cur.loanRecoveries && cur.loanRecoveries.length ? cur.loanRecoveries : (cur.recoveries || []);
      const loanRecoveries = existingRecoveries.map((r: any) => {
        const standardInst = Number(r.installmentAmount || r.amount || 0);
        const deductAmount = newOpts.recoverLoans ? standardInst : 0;
        return {
          ...r,
          deductAmount,
          isSkipped: !newOpts.recoverLoans || deductAmount === 0
        };
      });

      const advanceDeduction = loanRecoveries
        .filter((r: any) => String(r.kind || '').toLowerCase().includes('adv'))
        .reduce((s: number, r: any) => s + (r.isSkipped ? 0 : Number(r.deductAmount || 0)), 0);

      const loanDeduction = loanRecoveries
        .filter((r: any) => !String(r.kind || '').toLowerCase().includes('adv'))
        .reduce((s: number, r: any) => s + (r.isSkipped ? 0 : Number(r.deductAmount || 0)), 0);

      const recoveries = loanRecoveries.map((r: any) => ({
        loanId: r.loanId,
        number: r.number,
        amount: r.isSkipped ? 0 : Number(r.deductAmount || 0),
        kind: r.kind,
        isSkipped: r.isSkipped
      }));

      // 3. Calculate Bonus & Reason
      let bonus = Number(cur.bonus || 0);
      let bonusReason = cur.bonusReason || '';
      if (newOpts.payBonus !== undefined || newOpts.bonusAmount !== undefined || newOpts.bonusReason !== undefined) {
        const shouldPay = newOpts.payBonus !== undefined ? newOpts.payBonus : opts.payBonus;
        const amt = newOpts.bonusAmount !== undefined ? newOpts.bonusAmount : opts.bonusAmount;
        const rsn = newOpts.bonusReason !== undefined ? newOpts.bonusReason : opts.bonusReason;
        bonus = shouldPay ? Number(amt || 0) : 0;
        bonusReason = shouldPay ? rsn : '';
      }

      const gross = Number(cur.basic || 0) + bonus;
      const totalDeductions = absentCut + advanceDeduction + loanDeduction;
      const netPay = Math.max(0, gross - totalDeductions);

      return {
        ...cur,
        absentCut,
        absence: absentCut,
        advanceDeduction,
        loanDeduction,
        loanRecoveries,
        recoveries,
        bonus,
        bonusReason,
        gross,
        totalDeductions,
        netPay,
        net: netPay
      };
    });

    const gross = updatedLines.reduce((s, l) => s + (Number(l.basic || 0) + Number(l.bonus || 0)), 0);
    const deductions = updatedLines.reduce((s, l) => s + (Number(l.absentCut || l.absence || 0) + Number(l.advanceDeduction || 0) + Number(l.loanDeduction || 0)), 0);
    const netPayable = updatedLines.reduce((s, l) => s + Number(l.netPay ?? l.net ?? 0), 0);

    setDetail((d: any) => ({ ...d, lines: updatedLines, gross, deductions, netPayable }));
    setHasUnsavedChanges(true);
  };

  const saveDraftChanges = async () => {
    if (!detail) return;
    setBusy(true);
    setError('');
    try {
      await saveSheetLines(detail.id, detail.lines);
      setOriginalDetail(JSON.parse(JSON.stringify(detail)));
      setHasUnsavedChanges(false);
      setNotice(`All changes saved to ${detail.number}.`);
      hub.reload();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const discardDraftChanges = () => {
    if (originalDetail) {
      setDetail(JSON.parse(JSON.stringify(originalDetail)));
    }
    setHasUnsavedChanges(false);
    setNotice('Unsaved changes discarded.');
  };

  const closeDetail = () => {
    if (hasUnsavedChanges && originalDetail) {
      setDetail(JSON.parse(JSON.stringify(originalDetail)));
    }
    setDetail(null);
    setOriginalDetail(null);
    setHasUnsavedChanges(false);
    setAdjusting(null);
  };

  const handleGenerateClick = () => {
    const existing = sheets.find((s) => s.month === month);
    if (existing) {
      open(existing);
      setNotice(`Opened existing ${existing.number} for ${existing.monthLabel} (${existing.status}).`);
      return;
    }
    setShowGenerateModal(true);
  };

  const handleConfirmGenerate = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const existing = sheets.find((s) => s.month === month);
      if (existing) {
        await open(existing);
        setNotice(`Opened existing ${existing.number} for ${existing.monthLabel} (${existing.status}).`);
        setShowGenerateModal(false);
        setBusy(false);
        return;
      }

      const s = await createSheet(tenantSlug, branchId, {
        month,
        deductForAbsence: opts.deductForAbsence,
        recoverLoans: opts.recoverLoans,
        payBonus: opts.payBonus,
        bonusAmount: opts.bonusAmount,
        bonusReason: opts.bonusReason,
        payThrough: flags?.paySalaryThrough,
        accountId: null,
        notes: ''
      });
      setShowGenerateModal(false);
      setNotice(
        `${s.number} raised for ${s.monthLabel} — ${s.employees} staff, Rs. ${money(
          s.netPayable
        )} payable.`
      );
      setPreview(null);
      setPrepared(false);
      hub.reload();
      setDetail(s);
      setOriginalDetail(JSON.parse(JSON.stringify(s)));
      setHasUnsavedChanges(false);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const open = async (head: SalarySheetHead) => {
    setError('');
    setNotice('');
    setAdjusting(null);
    try {
      const s = await getSheet(tenantSlug, branchId, head.id);
      setDetail(s);
      setOriginalDetail(JSON.parse(JSON.stringify(s)));
      setHasUnsavedChanges(false);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const act = async (
    fn: () => Promise<SalarySheetView>,
    message: (out: SalarySheetView) => string
  ) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const out = await fn();
      setDetail(out);
      setNotice(message(out));
      hub.reload();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  const approve = (s: SalarySheetView) =>
    act(
      () => approveSheet(tenantSlug, branchId, s.id),
      (out) =>
        `${out.number} approved — journal ${out.journalNumber} posted for Rs. ${money(
          out.netPayable
        )} payable.`
    );

  const unapprove = (s: SalarySheetView) =>
    act(
      () => unapproveSheet(tenantSlug, branchId, s.id),
      (out) =>
        `${out.number} returned to Draft and journal ${out.journalNumber || ''} reversed.`
    );

  const payOut = (s: SalarySheetView) =>
    act(
      () =>
        paySheet(tenantSlug, branchId, s.id, {
          payThrough: pay.payThrough,
          accountId: Number(pay.accountId) || undefined,
          accountName: accounts.find((a) => a.id === Number(pay.accountId))?.name,
          date: pay.date
        }),
      (out) =>
        `${out.number} paid Rs. ${money(out.netPayable)} via ${
          out.accountName || out.payThrough
        } — payment journal ${out.paymentJournalNumber}.`
    );

  const removeSheet = async (s: SalarySheetHead) => {
    setError('');
    setNotice('');
    setConfirmId(null);
    try {
      await deleteSheet(tenantSlug, branchId, s.id);
      setNotice(`${s.number} has been deleted.`);
      if (detail?.id === s.id) {
        setDetail(null);
        setPreview(null);
      }
      hub.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const [attendanceModalLine, setAttendanceModalLine] = useState<PayrollLine | null>(null);

  const onBonusChange = (empId: number, bonusVal: number) => {
    if (!detail) return;
    const updatedLines = detail.lines.map((l) => {
      if (l.employeeId !== empId) return l;
      const bonus = Math.max(0, Number(bonusVal) || 0);
      const gross = Number(l.basic || 0) + bonus;
      const totalDeductions = Number(l.absentCut || l.absence || 0) + Number(l.advanceDeduction || l.loanDeduction || 0);
      const netPay = Math.max(0, gross - totalDeductions);
      return { ...l, bonus, gross, netPay, net: netPay, totalDeductions };
    });
    const gross = updatedLines.reduce((s, l) => s + (Number(l.basic || 0) + Number(l.bonus || 0)), 0);
    const deductions = updatedLines.reduce((s, l) => s + (Number(l.absentCut || l.absence || 0) + Number(l.advanceDeduction || l.loanDeduction || 0)), 0);
    const netPayable = updatedLines.reduce((s, l) => s + Number(l.netPay ?? l.net ?? 0), 0);
    setDetail((d: any) => ({ ...d, lines: updatedLines, gross, deductions, netPayable }));
    setHasUnsavedChanges(true);
  };

  const onBonusReasonChange = (empId: number, reason: string) => {
    if (!detail) return;
    const updatedLines = detail.lines.map((l) => {
      if (l.employeeId !== empId) return l;
      return { ...l, bonusReason: reason };
    });
    setDetail((d: any) => ({ ...d, lines: updatedLines }));
    setHasUnsavedChanges(true);
  };

  const onAbsentCutChange = (empId: number, cutVal: number) => {
    if (!detail) return;
    const updatedLines = detail.lines.map((l) => {
      if (l.employeeId !== empId) return l;
      const absentCut = Math.max(0, Number(cutVal) || 0);
      const gross = Number(l.basic || 0) + Number(l.bonus || 0);
      const totalDeductions = absentCut + Number(l.advanceDeduction || l.loanDeduction || 0);
      const netPay = Math.max(0, gross - totalDeductions);
      return { ...l, absentCut, absence: absentCut, gross, netPay, net: netPay, totalDeductions };
    });
    const gross = updatedLines.reduce((s, l) => s + (Number(l.basic || 0) + Number(l.bonus || 0)), 0);
    const deductions = updatedLines.reduce((s, l) => s + (Number(l.absentCut || l.absence || 0) + Number(l.advanceDeduction || l.loanDeduction || 0)), 0);
    const netPayable = updatedLines.reduce((s, l) => s + Number(l.netPay ?? l.net ?? 0), 0);
    setDetail((d: any) => ({ ...d, lines: updatedLines, gross, deductions, netPayable }));
    setHasUnsavedChanges(true);
  };

  const onLoanRecoveryAmountChange = (empId: number, loanId: number, newAmount: number) => {
    if (!detail) return;
    const updatedLines = detail.lines.map((l) => {
      if (l.employeeId !== empId) return l;
      const loanRecoveries = (l.loanRecoveries || []).map((r) => {
        if (r.loanId !== loanId) return r;
        const val = Math.max(0, Number(newAmount) || 0);
        return {
          ...r,
          deductAmount: val,
          isSkipped: val === 0
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
      const gross = Number(l.basic || 0) + Number(l.bonus || 0);
      const absentCut = Number(l.absentCut || l.absence || 0);
      const totalDeductions = absentCut + advanceDeduction + loanDeduction;
      const netPay = Math.max(0, gross - totalDeductions);
      return {
        ...l,
        loanRecoveries,
        recoveries,
        advanceDeduction,
        loanDeduction,
        gross,
        totalDeductions,
        netPay,
        net: netPay
      };
    });
    const gross = updatedLines.reduce((s, l) => s + (Number(l.basic || 0) + Number(l.bonus || 0)), 0);
    const deductions = updatedLines.reduce((s, l) => s + (Number(l.absentCut || l.absence || 0) + Number(l.advanceDeduction || l.loanDeduction || 0)), 0);
    const netPayable = updatedLines.reduce((s, l) => s + Number(l.netPay ?? l.net ?? 0), 0);
    setDetail((d: any) => ({ ...d, lines: updatedLines, gross, deductions, netPayable }));
    setHasUnsavedChanges(true);
  };

  const startAdjust = (l: PayrollLine) => {
    setAdjusting(l.employeeId);
    setAdjust({
      extraEarnings: (l.extraEarnings || []).map((i) => ({ ...i })),
      extraDeductions: (l.extraDeductions || []).map((i) => ({ ...i })),
      loanRecoveries: (l.loanRecoveries || []).map((r) => ({ ...r })),
      remarks: l.remarks || ''
    });
  };

  const addItem = (kind: 'extraEarnings' | 'extraDeductions', headId: number) => {
    const head = heads.find((h) => h.id === headId);
    if (!head) return;
    setAdjust((a) => ({
      ...a,
      [kind]: [...a[kind], { headId: head.id, name: head.name, amount: 0 }]
    }));
  };

  const saveAdjust = async (s: SalarySheetView, employeeId: number) => {
    await act(
      () =>
        updateSheet(tenantSlug, branchId, s.id, {
          lines: [
            {
              employeeId,
              extraEarnings: adjust.extraEarnings,
              extraDeductions: adjust.extraDeductions,
              loanRecoveries: adjust.loanRecoveries,
              remarks: adjust.remarks
            }
          ]
        }),
      () => 'Payslip lines and loan deductions updated.'
    );
    setAdjusting(null);
  };

  const saveFlags = async (next: HrSettings) => {
    setSettings(next);
    setError('');
    setNotice('');
    try {
      const saved = await saveHrSettings(tenantSlug, branchId, next);
      setSettings(saved);
      hub.reload();
      setNotice('Payroll settings updated successfully.');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const lineColumns = (_lines: PayrollLine[]): ExportColumn<PayrollLine>[] => [
    { label: 'Employee #', value: (l) => l.employeeCode || l.code },
    { label: 'Staff Name', value: (l) => l.employeeName || l.name },
    { label: 'Designation', value: (l) => l.designation || l.department || '—' },
    { label: 'Basic Salary', value: (l) => money(l.basic), align: 'right' },
    { label: 'Bonus', value: (l) => money(l.bonus || 0), align: 'right' },
    { label: 'Absent Cut', value: (l) => money(l.absentCut || l.absence || 0), align: 'right' },
    { label: 'Advance Deduction', value: (l) => money(l.advanceDeduction || l.loanDeduction || 0), align: 'right' },
    { label: 'Net Salary', value: (l) => money(l.netPay ?? l.net ?? 0), align: 'right' },
    { label: 'Attendance', value: (l) => `${l.present ?? 0} P / ${l.absent ?? 0} A`, align: 'center' }
  ];

  const totalRow = (cols: ExportColumn<PayrollLine>[], lines: PayrollLine[]) => {
    const cells: Record<number, string> = { 0: 'Total' };
    const idx = (label: string) => cols.findIndex((c) => c.label === label);
    const sum = (f: (l: PayrollLine) => number) =>
      money(lines.reduce((s, l) => s + f(l), 0));
    const put = (label: string, v: string) => {
      const i = idx(label);
      if (i >= 0) cells[i] = v;
    };
    put('Basic Salary', sum((l) => l.basic));
    put('Bonus', sum((l) => l.bonus || 0));
    put('Absent Cut', sum((l) => l.absentCut || l.absence || 0));
    put('Advance Deduction', sum((l) => l.advanceDeduction || l.loanDeduction || 0));
    put('Net Salary', sum((l) => l.netPay ?? l.net ?? 0));
    return footerRow(cols.length, cells);
  };

  const lines = detail?.lines ?? preview?.lines ?? [];
  const cols = lineColumns(lines);
  const draftMode = !!detail && detail.status === 'Draft' && editable;

  const sheetColumns: ExportColumn<SalarySheetHead>[] = [
    { label: 'Sheet #', value: (s) => s.number },
    { label: 'Month', value: (s) => s.monthLabel },
    { label: 'Staff', value: (s) => String(s.employees), align: 'right' },
    { label: 'Gross', value: (s) => money(s.gross), align: 'right' },
    { label: 'Withheld', value: (s) => money(s.deductions), align: 'right' },
    { label: 'Net Payable', value: (s) => money(s.netPayable), align: 'right' },
    { label: 'Unpaid Days', value: (s) => String(s.unpaidDays), align: 'right' },
    { label: 'Pay Through', value: (s) => s.payThrough },
    { label: 'Paid Account', value: (s) => s.accountName || '-' },
    { label: 'Accrual JE', value: (s) => s.journalNumber || '-' },
    { label: 'Payment JE', value: (s) => s.paymentJournalNumber || '-' },
    { label: 'Status', value: (s) => s.status }
  ];

  const subtitle = activeFilters.length
    ? activeFilters.join(' · ')
    : `Salary Sheets Register (${inScope.length})`;

  const deptSum = (f: (d: { staff: number; gross: number; net: number }) => number) =>
    (preview?.byDepartment ?? []).reduce((s, d) => s + f(d), 0);
  const headSum = (kind: string) =>
    (preview?.byHead ?? [])
      .filter((h) => h.kind === kind)
      .reduce((s, h) => s + h.amount, 0);

  return (
    <div className="space-y-5">
      {/* ── TOP HEADER CARD ── */}
      <div className="rounded-lg border border-stroke bg-white p-5 shadow-xs dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stroke dark:border-strokedark">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white">
                  Salary Sheet &amp; Payroll
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Generate monthly staff payslips, absence pay cuts, and loan recoveries with ledger integration
                </p>
              </div>
            </div>
          </div>
          {!detail && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(true)}
                disabled={busy || !editable}
                className="px-4 py-2.5 rounded-xl bg-primary hover:bg-opacity-90 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Salary Sheet</span>
              </button>
            </div>
          )}
        </div>

        {/* ── STATS CARDS STRIP ── */}
        {!detail && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-meta-4/20 border border-stroke dark:border-strokedark flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Total Employees
                </span>
                <span className="text-2xl font-black text-black dark:text-white">
                  {shown.employees}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                  Total Salaries
                </span>
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  Rs. {money(shown.netPayable || shown.gross)}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Banknote className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {/* ── TOOLBAR (SEARCH + STATUS PILLS) ── */}
        {!detail && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stroke dark:border-strokedark mt-4">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              <SearchBox
                key={searchEpoch}
                placeholder="Search sheet #, month, account or journal..."
                onSearch={setSearch}
              />
              <StatusPills
                value={status}
                onChange={(v) => setStatus(v as SheetStatus | '')}
                counts={statusCounts}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── ALERT NOTICES ── */}
      {(error || hub.error || notice) && (
        <div
          className={`text-xs font-semibold rounded-xl p-3.5 flex items-center justify-between ${
            error || hub.error
              ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900'
              : 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900'
          }`}
        >
          <span>{error || hub.error || notice}</span>
          <button
            type="button"
            onClick={() => {
              setError('');
              setNotice('');
            }}
            className="p-1 rounded hover:bg-black/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT (DETAIL VIEW OR LIST TABLE) ── */}
      <div className="rounded-xl border border-stroke bg-white shadow-xs dark:border-strokedark dark:bg-boxdark overflow-hidden">
        {detail ? (
          <>
            {/* Sheet Detail Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50/70 dark:bg-meta-4/20 border-b border-stroke dark:border-strokedark">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={closeDetail}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>All Sheets</span>
                </button>
                <span className="text-gray-300 dark:text-gray-600">/</span>
                <h3 className="font-bold text-black dark:text-white text-base">
                  {detail.number} — {detail.monthLabel}
                </h3>
                <span
                  className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    SHEET_TONE[detail.status]
                  }`}
                >
                  {detail.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    printIsolatedElement(
                      'printable-salary-sheet-detail',
                      'landscape',
                      `${detail.number} - ${detail.monthLabel} Payroll`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-primary" />
                  <span>Print Sheet Register</span>
                </button>

                {detail.status === 'Draft' && hasUnsavedChanges && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={saveDraftChanges}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer animate-pulse"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={discardDraftChanges}
                      className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </>
                )}

                {detail.status === 'Draft' && (
                  <button
                    type="button"
                    disabled={busy || !editable}
                    onClick={() => approve(detail)}
                    className="px-4 py-1.5 rounded-xl bg-primary hover:bg-opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve &amp; Post Journal</span>
                  </button>
                )}

                {detail.status === 'Approved' && (
                  <>
                    <button
                      type="button"
                      disabled={busy || !editable}
                      onClick={() =>
                        setPay((p) => ({
                          ...p,
                          open: !p.open,
                          payThrough: detail.payThrough,
                          accountId: String(detail.accountId ?? '')
                        }))
                      }
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Pay Out</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy || !editable}
                      onClick={() => unapprove(detail)}
                      className="px-3 py-1.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>Un-approve</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={closeDetail}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pay Out Drawer */}
            {pay.open && detail.status === 'Approved' && (
              <div className="p-4 border-b border-stroke dark:border-strokedark bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-wrap items-end gap-3 animate-fade-in">
                <Field label="Pay Through" className="w-44">
                  <Pick
                    value={pay.payThrough}
                    onChange={(e) => setPay((p) => ({ ...p, payThrough: e.target.value }))}
                  >
                    {(hub.value?.payThrough ?? ['Bank Transfer', 'Cheque', 'Cash']).map(
                      (x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      )
                    )}
                  </Pick>
                </Field>

                <Field label="From Account" required className="w-64">
                  <Pick
                    value={pay.accountId}
                    onChange={(e) => setPay((p) => ({ ...p, accountId: e.target.value }))}
                  >
                    <option value="">Choose bank / cash account...</option>
                    {accounts
                      .filter((a) => !/payable|loan|wage|salary/i.test(a.name))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </option>
                      ))}
                  </Pick>
                </Field>

                <Field label="Payment Date" className="w-44">
                  <Text
                    type="date"
                    value={pay.date}
                    onChange={(e) => setPay((p) => ({ ...p, date: e.target.value }))}
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => payOut(detail)}
                  disabled={busy || !pay.accountId}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Post Payment of Rs. {money(detail.netPayable)}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPay((p) => ({ ...p, open: false }))}
                  className="px-3 py-2 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Sheet Detail Summary Badges & Batch Pill Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-stroke dark:border-strokedark bg-gray-50/30 dark:bg-meta-4/10">
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-300">
                <span>
                  Staff: <strong className="text-black dark:text-white">{detail.employees}</strong>
                </span>
                <span>·</span>
                <span>
                  Gross: <strong className="text-black dark:text-white">{money(detail.gross)}</strong>
                </span>
                <span>·</span>
                <span>
                  Withheld: <strong className="text-amber-600">{money(detail.deductions)}</strong>
                </span>
                <span>·</span>
                <span>
                  Net Payable: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{money(detail.netPayable)}</strong>
                </span>
                <span>·</span>
                <span>
                  Unpaid Days: <strong>{dayFig(detail.unpaidDays)}</strong>
                </span>
              </div>

              {/* Pill Selectors for Draft Sheet */}
              {detail.status === 'Draft' && editable && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyPayrollOptions({ ...opts, deductForAbsence: !opts.deductForAbsence })}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      opts.deductForAbsence
                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 shadow-2xs'
                        : 'bg-white text-gray-500 border-gray-200 dark:bg-boxdark dark:text-gray-400 dark:border-strokedark hover:border-gray-300'
                    }`}
                    title="Toggle automatic pay cuts for absent days"
                  >
                    <span className={`w-2 h-2 rounded-full ${opts.deductForAbsence ? 'bg-amber-600' : 'bg-gray-400'}`} />
                    <span>Absent Cut: {opts.deductForAbsence ? 'Active' : 'Off'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPayrollOptions({ ...opts, recoverLoans: !opts.recoverLoans })}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      opts.recoverLoans
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs'
                        : 'bg-white text-gray-500 border-gray-200 dark:bg-boxdark dark:text-gray-400 dark:border-strokedark hover:border-gray-300'
                    }`}
                    title="Toggle loan & advance installment recoveries"
                  >
                    <span className={`w-2 h-2 rounded-full ${opts.recoverLoans ? 'bg-emerald-600' : 'bg-gray-400'}`} />
                    <span>Loan Recovery: {opts.recoverLoans ? 'Active' : 'Off'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyPayrollOptions({ ...opts, payBonus: !opts.payBonus })}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        opts.payBonus
                          ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 shadow-2xs'
                          : 'bg-white text-gray-500 border-gray-200 dark:bg-boxdark dark:text-gray-400 dark:border-strokedark hover:border-gray-300'
                      }`}
                      title="Toggle flat bonus for all employees"
                    >
                      <span className={`w-2 h-2 rounded-full ${opts.payBonus ? 'bg-blue-600' : 'bg-gray-400'}`} />
                      <span>Bonus: {opts.payBonus ? `Rs. ${money(opts.bonusAmount)}` : 'Off'}</span>
                    </button>
                    {opts.payBonus && (
                      <div className="flex items-center gap-1 animate-fade-in">
                        <input
                          type="number"
                          min="0"
                          value={opts.bonusAmount}
                          onChange={(e) => applyPayrollOptions({ ...opts, bonusAmount: Number(e.target.value) })}
                          className="w-20 px-2 py-0.5 text-right text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-lg focus:outline-none focus:border-blue-500"
                          placeholder="10000"
                          title="Bonus amount per staff"
                        />
                        <input
                          type="text"
                          value={opts.bonusReason}
                          onChange={(e) => applyPayrollOptions({ ...opts, bonusReason: e.target.value })}
                          className="w-28 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-lg focus:outline-none focus:border-blue-500"
                          placeholder="Bonus Reason"
                          title="Bonus reason"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payslip Lines Table */}
            <div className="overflow-x-auto max-h-[64vh]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-gray-100/70 dark:bg-meta-4/30 text-gray-700 dark:text-gray-300 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Emp #</th>
                    <th className="py-2.5 px-3 font-bold">Staff Name</th>
                    <th className="py-2.5 px-3 font-bold">Designation</th>
                    <th className="py-2.5 px-3 font-bold text-right">Basic</th>
                    <th className="py-2.5 px-3 font-bold text-right">Bonus</th>
                    <th className="py-2.5 px-3 font-bold text-right">Deductions</th>
                    <th className="py-2.5 px-3 font-bold text-right">Absence</th>
                    <th className="py-2.5 px-3 font-bold text-right">Net Pay</th>
                    <th className="py-2.5 px-3 font-bold text-right">Days (P/A/L)</th>
                    <th className="py-2.5 px-3 font-bold">Recoveries</th>
                    <th className="py-2.5 px-3 font-bold text-center">Status</th>
                    <th className="py-2.5 px-3 font-bold text-right w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-strokedark">
                  {detail.lines.map((l) => (
                    <React.Fragment key={l.employeeId}>
                      <tr
                        className={`transition hover:bg-primary/5 dark:hover:bg-meta-4/40 ${
                          adjusting === l.employeeId ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold">{l.employeeCode}</td>
                        <td className="py-2.5 px-3">
                          <span className="block font-bold text-black dark:text-white">
                            {l.employeeName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-black dark:text-white">
                          {l.designation || l.department || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">{money(l.basic)}</td>
                        <td className="py-2 px-2 text-right">
                          {detail.status === 'Draft' ? (
                            <div className="flex flex-col items-end gap-1">
                              <input
                                type="number"
                                min="0"
                                value={l.bonus ?? Math.max(0, l.gross - l.basic) ?? 0}
                                onChange={(e) => onBonusChange(l.employeeId, Number(e.target.value))}
                                className="w-20 px-2 py-1 text-right text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark focus:border-blue-500 rounded-lg focus:outline-none transition"
                                title="Bonus amount for this employee"
                              />
                              <input
                                type="text"
                                placeholder="Bonus Reason"
                                value={l.bonusReason || ''}
                                onChange={(e) => onBonusReasonChange(l.employeeId, e.target.value)}
                                className="w-24 px-1.5 py-0.5 text-right text-[10px] text-gray-600 dark:text-gray-300 bg-transparent border-b border-stroke dark:border-strokedark focus:border-blue-500 focus:outline-none placeholder:text-gray-400"
                                title="Custom bonus reason for this employee"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {money(l.bonus ?? Math.max(0, l.gross - l.basic))}
                              </span>
                              <span className="block text-[10px] text-gray-400">
                                {l.bonusReason || l.earnings
                                  .filter((i) => i.headId)
                                  .map((i) => `${i.name} ${money(i.amount)}`)
                                  .join(' · ') || (l.extraEarnings && l.extraEarnings.length > 0 ? l.extraEarnings.map((i) => `${i.name} ${money(i.amount)}`).join(' · ') : 'no heads')}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-600 font-semibold">
                          {money(l.totalDeductions)}
                          <span className="block text-[10px] text-gray-400">
                            {l.deductions.map((i) => `${i.name} ${money(i.amount)}`).join(' · ') ||
                              'none'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          {detail.status === 'Draft' ? (
                            <div className="flex items-center justify-end">
                              <input
                                type="number"
                                min="0"
                                value={l.absentCut ?? l.absence ?? 0}
                                onChange={(e) => onAbsentCutChange(l.employeeId, Number(e.target.value))}
                                className="w-20 px-2 py-1 text-right text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark focus:border-rose-500 rounded-lg focus:outline-none transition"
                                title="Custom absence deduction for this employee"
                              />
                            </div>
                          ) : l.absence ? (
                            <span className="text-rose-600 font-semibold">{money(l.absence)}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {money(l.net)}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="text-emerald-600 font-bold">{l.present}</span>
                          <span className="text-gray-300"> / </span>
                          <span className={l.absent ? 'text-rose-600 font-bold' : ''}>
                            {l.absent}
                          </span>
                          <span className="text-gray-300"> / </span>
                          <span>{l.leaves}</span>
                          <span className="block text-[10px] text-gray-400">
                            of {l.payableDays} days
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          {((l.loanRecoveries && l.loanRecoveries.length) ? l.loanRecoveries : l.recoveries) && ((l.loanRecoveries && l.loanRecoveries.length) ? l.loanRecoveries : l.recoveries).length ? (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {((l.loanRecoveries && l.loanRecoveries.length) ? l.loanRecoveries : l.recoveries).map((r: any, ri: number) => (
                                detail.status === 'Draft' ? (
                                  <div
                                    key={ri}
                                    className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition ${
                                      (r.deductAmount ?? r.amount ?? 0) === 0 || r.isSkipped
                                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    }`}
                                  >
                                    <span className="font-mono text-[10px]">{r.number}:</span>
                                    <span className="text-[10px] text-gray-500">Rs.</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={r.deductAmount ?? r.amount ?? 0}
                                      onChange={(e) => onLoanRecoveryAmountChange(l.employeeId, r.loanId, Number(e.target.value))}
                                      className="w-16 px-1.5 py-0.5 text-right font-bold text-black dark:text-white bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded focus:outline-none focus:border-amber-500"
                                      title="Edit loan recovery deduction for this employee"
                                    />
                                  </div>
                                ) : (
                                  <span
                                    key={ri}
                                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                      r.isSkipped || (r.deductAmount ?? r.amount) === 0
                                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                    }`}
                                  >
                                    {r.number} {r.isSkipped || (r.deductAmount ?? r.amount) === 0 ? '(Skipped)' : `Rs. ${money(r.deductAmount ?? r.amount)}`}
                                  </span>
                                )
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                          {l.extraEarnings.length + l.extraDeductions.length > 0 && (
                            <span className="block text-[10px] text-gray-400 italic mt-0.5">
                              {[...l.extraEarnings, ...l.extraDeductions]
                                .map((i) => `${i.name} ${money(i.amount)}`)
                                .join(' · ')}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {l.paid ? (
                            <span className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                              Paid
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <IconAction
                              title="Adjust payslip lines"
                              tone="primary"
                              disabled={!draftMode}
                              onClick={() =>
                                adjusting === l.employeeId
                                  ? setAdjusting(null)
                                  : startAdjust(l)
                              }
                            >
                              <Settings2 className="w-4 h-4" />
                            </IconAction>
                          </div>
                        </td>
                      </tr>

                      {/* Manual Line Adjuster Drawer */}
                      {adjusting === l.employeeId && draftMode && (
                        <tr>
                          <td colSpan={12} className="bg-gray-50 dark:bg-meta-4/20 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border border-stroke dark:border-strokedark p-4 rounded-xl bg-white dark:bg-boxdark">
                              <div>
                                <span className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-2">
                                  Manual Additions
                                </span>
                                {adjust.extraEarnings.map((i, n) => (
                                  <div key={n} className="flex items-center gap-1.5 mb-1.5">
                                    <span className="flex-1 text-xs">{i.name}</span>
                                    <NumCell
                                      className="w-24"
                                      value={i.amount}
                                      onChange={(e) =>
                                        setAdjust((a) => ({
                                          ...a,
                                          extraEarnings: a.extraEarnings.map((x, j) =>
                                            j === n ? { ...x, amount: Number(e.target.value) } : x
                                          )
                                        }))
                                      }
                                    />
                                    <IconAction
                                      title="Remove"
                                      tone="danger"
                                      onClick={() =>
                                        setAdjust((a) => ({
                                          ...a,
                                          extraEarnings: a.extraEarnings.filter((_, j) => j !== n)
                                        }))
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </IconAction>
                                  </div>
                                ))}
                                <Pick
                                  className="w-full mt-2"
                                  value=""
                                  onChange={(e) => {
                                    addItem('extraEarnings', Number(e.target.value));
                                    e.target.value = '';
                                  }}
                                >
                                  <option value="">+ Add a bonus head...</option>
                                  {heads
                                    .filter((h) => h.kind === 'Earning')
                                    .map((h) => (
                                      <option key={h.id} value={h.id}>
                                        {h.name}
                                      </option>
                                    ))}
                                </Pick>
                              </div>

                              <div>
                                <span className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-2">
                                  Manual Deductions
                                </span>
                                {adjust.extraDeductions.map((i, n) => (
                                  <div key={n} className="flex items-center gap-1.5 mb-1.5">
                                    <span className="flex-1 text-xs">{i.name}</span>
                                    <NumCell
                                      className="w-24"
                                      value={i.amount}
                                      onChange={(e) =>
                                        setAdjust((a) => ({
                                          ...a,
                                          extraDeductions: a.extraDeductions.map((x, j) =>
                                            j === n ? { ...x, amount: Number(e.target.value) } : x
                                          )
                                        }))
                                      }
                                    />
                                    <IconAction
                                      title="Remove"
                                      tone="danger"
                                      onClick={() =>
                                        setAdjust((a) => ({
                                          ...a,
                                          extraDeductions: a.extraDeductions.filter((_, j) => j !== n)
                                        }))
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </IconAction>
                                  </div>
                                ))}
                                <Pick
                                  className="w-full mt-2"
                                  value=""
                                  onChange={(e) => {
                                    addItem('extraDeductions', Number(e.target.value));
                                    e.target.value = '';
                                  }}
                                >
                                  <option value="">+ Add a deduction head...</option>
                                  {heads
                                    .filter((h) => h.kind === 'Deduction')
                                    .map((h) => (
                                      <option key={h.id} value={h.id}>
                                        {h.name}
                                      </option>
                                    ))}
                                </Pick>
                              </div>

                              {/* Loan & Advance Recovery Section */}
                              <div>
                                <span className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-2">
                                  Loan / Advance Recovery
                                </span>
                                {adjust.loanRecoveries.length > 0 ? (
                                  <div className="space-y-2">
                                    {adjust.loanRecoveries.map((r, n) => {
                                      const isAdv = String(r.kind || '').toLowerCase().includes('adv');
                                      return (
                                        <div
                                          key={r.loanId}
                                          className={`p-2.5 rounded-lg border text-xs ${
                                            r.isSkipped
                                              ? 'border-purple-200 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/20'
                                              : 'border-stroke dark:border-strokedark bg-white dark:bg-boxdark'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-1.5">
                                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isAdv ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'}`}>
                                                {isAdv ? 'Advance' : 'Loan'}
                                              </span>
                                              <span className="font-mono font-bold text-black dark:text-white">{r.number}</span>
                                            </div>
                                            <span className="text-[11px] text-gray-400">
                                              Bal: Rs. {money(r.balance)}
                                            </span>
                                          </div>

                                          <div className="flex items-center justify-between gap-1.5 mt-2">
                                            {!r.isSkipped ? (
                                              <div className="flex items-center gap-1 flex-1">
                                                <span className="text-[10px] text-gray-500">Cut:</span>
                                                <NumCell
                                                  className="w-20 text-right font-mono text-xs"
                                                  value={r.deductAmount}
                                                  onChange={(e) => {
                                                    const val = Math.max(0, Math.min(r.balance, Number(e.target.value) || 0));
                                                    setAdjust((a) => ({
                                                      ...a,
                                                      loanRecoveries: a.loanRecoveries.map((x, j) =>
                                                        j === n ? { ...x, deductAmount: val } : x
                                                      )
                                                    }));
                                                  }}
                                                />
                                              </div>
                                            ) : (
                                              <div className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold flex-1">
                                                ⏸️ Rs. 0 (Grace Month)
                                              </div>
                                            )}

                                            <button
                                              type="button"
                                              onClick={() => {
                                                setAdjust((a) => ({
                                                  ...a,
                                                  loanRecoveries: a.loanRecoveries.map((x, j) =>
                                                    j === n
                                                      ? {
                                                          ...x,
                                                          isSkipped: !x.isSkipped,
                                                          deductAmount: !x.isSkipped ? 0 : x.installmentAmount
                                                        }
                                                      : x
                                                  )
                                                }));
                                              }}
                                              className={`px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer whitespace-nowrap ${
                                                r.isSkipped
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
                                                  : 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 hover:bg-purple-100'
                                              }`}
                                              title={r.isSkipped ? 'Resume deduction for this month' : 'Skip deduction for this month (Grace Month)'}
                                            >
                                              {r.isSkipped ? '↩️ Resume' : '⏸️ Skip Month'}
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="p-3 rounded-lg border border-dashed border-stroke dark:border-strokedark text-gray-400 text-center text-xs">
                                    No active loans or salary advances.
                                  </div>
                                )}
                              </div>

                              <div>
                                <span className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-2">
                                  Payslip Remarks
                                </span>
                                <Area
                                  rows={3}
                                  value={adjust.remarks}
                                  onChange={(e) =>
                                    setAdjust((a) => ({ ...a, remarks: e.target.value }))
                                  }
                                />
                                <div className="flex items-center gap-2 mt-3">
                                  <button
                                    type="button"
                                    onClick={() => saveAdjust(detail, l.employeeId)}
                                    disabled={busy}
                                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-opacity-90 transition cursor-pointer disabled:opacity-50"
                                  >
                                    Save Payslip
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setAdjusting(null)}
                                    className="px-3 py-2 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-xs font-bold hover:bg-gray-100 transition cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100/80 dark:bg-meta-4/40 font-black text-black dark:text-white">
                    <td colSpan={3} className="py-2.5 px-3">
                      Total ({detail.employees} Staff)
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {money(addUp(detail.lines, (l) => l.basic))}
                    </td>
                    <td className="py-2.5 px-3 text-right text-blue-600 dark:text-blue-400">
                      {money(addUp(detail.lines, (l) => Math.max(0, l.gross - l.basic)))}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-600">
                      {money(detail.deductions)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600">
                      {money(addUp(detail.lines, (l) => Number(l.absentCut ?? l.absence ?? 0)))}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                      {money(detail.netPayable)}
                    </td>
                    <td colSpan={4} className="py-2.5 px-3 text-[11px] text-gray-500 font-normal">
                      Net Amount Payable to staff after all deductions and loan recoveries
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Hidden Printable Salary Sheet Detail for A4 Landscape printout */}
            <div id="printable-salary-sheet-detail" className="hidden">
              <div className="print-header">
                <h1>{getBrandConfig().fullName}</h1>
                <h2>MONTHLY SALARY SHEET &amp; PAYROLL REGISTER — {detail.monthLabel}</h2>
                <div className="meta-grid">
                  <span><strong>Sheet #:</strong> {detail.number}</span>
                  <span><strong>Period:</strong> {detail.monthLabel}</span>
                  <span><strong>Staff Count:</strong> {detail.employees}</span>
                  <span><strong>Disbursement Via:</strong> {detail.payThrough}</span>
                  <span><strong>Status:</strong> {detail.status}</span>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th className="text-left" style={{ width: '80px' }}>Emp #</th>
                    <th className="text-left">Employee Name</th>
                    <th className="text-left" style={{ width: '130px' }}>Designation</th>
                    <th className="text-right" style={{ width: '100px' }}>Basic Pay</th>
                    <th className="text-right" style={{ width: '90px' }}>Bonus</th>
                    <th className="text-right" style={{ width: '90px' }}>Absence Cut</th>
                    <th className="text-right" style={{ width: '105px' }}>Loan / Adv</th>
                    <th className="text-right font-black" style={{ width: '110px' }}>Net Pay</th>
                    <th className="text-center" style={{ width: '120px' }}>Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((l) => (
                    <tr key={l.employeeId}>
                      <td className="font-mono text-left">{l.employeeCode}</td>
                      <td className="font-bold text-left">{l.employeeName}</td>
                      <td className="text-left">{l.designation || l.department || 'Staff'}</td>
                      <td className="text-right">{money(l.basic)}</td>
                      <td className="text-right">{money(l.bonus || 0)}</td>
                      <td className="text-right">{money(l.absentCut || l.absence || 0)}</td>
                      <td className="text-right">{money(l.advanceDeduction || l.loanDeduction || 0)}</td>
                      <td className="text-right font-black">{money(l.netPay ?? l.net ?? 0)}</td>
                      <td className="text-center" style={{ color: '#aaa' }}>___________</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray font-black">
                    <td colSpan={3} className="text-left font-black">Total ({detail.employees} Employees)</td>
                    <td className="text-right font-black">{money(addUp(detail.lines, (l) => l.basic))}</td>
                    <td className="text-right font-black">{money(addUp(detail.lines, (l) => l.bonus || 0))}</td>
                    <td className="text-right font-black">{money(addUp(detail.lines, (l) => Number(l.absentCut ?? l.absence ?? 0)))}</td>
                    <td className="text-right font-black">{money(addUp(detail.lines, (l) => Number(l.advanceDeduction || l.loanDeduction || 0)))}</td>
                    <td className="text-right font-black" style={{ fontSize: '12px' }}>{money(detail.netPayable)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>

              {/* Signature Footer */}
              <div className="footer-signatures">
                <div className="signature-box">
                  <div className="sign-stamp">(Sign / Stamp)</div>
                  <div className="sign-line">Prepared By</div>
                  <div className="sign-title">HR Department</div>
                </div>
                <div className="signature-box">
                  <div className="sign-stamp">(Sign / Stamp)</div>
                  <div className="sign-line">Checked By</div>
                  <div className="sign-title">Accounts Manager</div>
                </div>
                <div className="signature-box">
                  <div className="sign-stamp">(Sign / Stamp)</div>
                  <div className="sign-line">Approved By</div>
                  <div className="sign-title">Managing Director</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Salary Sheets Master Register Table */
          <div className="overflow-x-auto max-h-[64vh]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-100/70 dark:bg-meta-4/30 text-gray-700 dark:text-gray-300 sticky top-0 z-10">
                <tr>
                  <SortHeader label="Sheet #" sortKey="number" sort={sort} onSort={onSort} />
                  <SortHeader label="Month" sortKey="month" sort={sort} onSort={onSort} />
                  <SortHeader label="Staff" sortKey="employees" sort={sort} onSort={onSort} />
                  <SortHeader label="Gross" sortKey="gross" sort={sort} onSort={onSort} />
                  <SortHeader label="Withheld" sortKey="deductions" sort={sort} onSort={onSort} />
                  <SortHeader label="Net Payable" sortKey="netPayable" sort={sort} onSort={onSort} />
                  <SortHeader label="Unpaid Days" sortKey="unpaidDays" sort={sort} onSort={onSort} />
                  <th className="py-2.5 px-3 font-bold">Pay Through</th>
                  <th className="py-2.5 px-3 font-bold">Journals</th>
                  <SortHeader label="Status" sortKey="status" sort={sort} onSort={onSort} />
                  <th className="py-2.5 px-3 font-bold text-right w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {hub.loading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={11} className="p-4">
                        <div
                          className="h-4 rounded bg-gray-100 dark:bg-meta-4 animate-pulse"
                          style={{ width: `${100 - i * 8}%` }}
                        />
                      </td>
                    </tr>
                  ))}
                {!hub.loading && !visible.length && (
                  <TableEmpty
                    colSpan={11}
                    noun="salary sheets"
                    filters={activeFilters}
                    cleared={clearAll}
                    addLabel={
                      sheets.length
                        ? undefined
                        : preview?.lines.length
                        ? 'RAISE THE SHEET'
                        : 'RUN THE SELECTED MONTH'
                    }
                    onAdd={() => (preview?.lines.length ? create() : run())}
                  />
                )}
                {!hub.loading &&
                  visible.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => open(s)}
                      className="transition hover:bg-primary/5 dark:hover:bg-meta-4/40 cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-black dark:text-white">
                        {s.number}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{s.monthLabel}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{s.employees}</td>
                      <td className="py-2.5 px-3 text-right font-medium">{money(s.gross)}</td>
                      <td className="py-2.5 px-3 text-right text-amber-600 font-semibold">
                        {money(s.deductions)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {money(s.netPayable)}
                      </td>
                      <td className="py-2.5 px-3 text-right">{dayFig(s.unpaidDays)}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium">{s.payThrough}</span>
                        {s.accountName && (
                          <span className="block text-[10px] text-gray-400">
                            {s.accountName}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[10px]">
                        {s.journalNumber ? (
                          <span className="font-mono text-primary font-bold">
                            {s.journalNumber}
                          </span>
                        ) : (
                          <span className="text-gray-300">not posted</span>
                        )}
                        {s.paymentJournalNumber && (
                          <span className="block text-gray-400">
                            payment {s.paymentJournalNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            SHEET_TONE[s.status]
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          {s.status === 'Draft' ? (
                            <button
                              type="button"
                              onClick={() => open(s)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                              title="Open sheet to review, edit, and approve"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                              <span>Review &amp; Edit</span>
                            </button>
                          ) : s.status === 'Approved' ? (
                            <button
                              type="button"
                              onClick={() => open(s)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                              title="Disburse and post payment"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Pay Salary</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => open(s)}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-meta-4 dark:hover:bg-meta-4/80 text-gray-700 dark:text-gray-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                              title="View paid salary sheet and journal entries"
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                              <span>View Sheet</span>
                            </button>
                          )}
                          <IconAction
                            title={
                              s.status !== 'Draft'
                                ? 'Un-approve before deleting'
                                : 'Delete the draft sheet'
                            }
                            tone="danger"
                            disabled={!editable || s.status !== 'Draft'}
                            onClick={() => setConfirmId(s.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconAction>
                          {confirmId === s.id && (
                            <DeleteConfirm
                              title={`Delete Draft Sheet ${s.number}`}
                              message={`Are you sure you want to delete ${s.number} (${s.monthLabel})? This will remove this sheet draft.`}
                              onConfirm={() => {
                                removeSheet(s);
                                setConfirmId(null);
                              }}
                              onCancel={() => setConfirmId(null)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
              {!!visible.length && !hub.loading && (
                <tfoot>
                  <tr className="bg-gray-100/80 dark:bg-meta-4/40 font-black text-black dark:text-white">
                    <td colSpan={2} className="py-2.5 px-3">
                      Total ({visible.length} Sheets)
                    </td>
                    <td className="py-2.5 px-3 text-right">{shown.employees}</td>
                    <td className="py-2.5 px-3 text-right">{money(shown.gross)}</td>
                    <td className="py-2.5 px-3 text-right text-amber-600">
                      {money(shown.deductions)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                      {money(shown.netPayable)}
                    </td>
                    <td className="py-2.5 px-3 text-right">{dayFig(shown.unpaidDays)}</td>
                    <td colSpan={4} className="py-2.5 px-3 text-[11px] text-gray-500 font-normal">
                      Withheld is what the payslips keep back; Net Payable is what staff are handed
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── PREVIEW SECTION (WHEN RUNNING PAYROLL) ── */}
      {!detail && lines.length > 0 && preview && (
        <div className="rounded-xl border border-stroke bg-white shadow-xs dark:border-strokedark dark:bg-boxdark p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stroke dark:border-strokedark">
            <div>
              <h3 className="font-bold text-black dark:text-white text-base">
                Payroll Preview — {preview.monthLabel}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {preview.lines.length} staff payslip calculations ready. Review department &amp; head distributions before raising.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Designation Breakdown */}
            <div className="rounded-xl border border-stroke dark:border-strokedark overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-gray-100/70 dark:bg-meta-4/30 text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="py-2 px-3 font-bold">Designation</th>
                    <th className="py-2 px-3 font-bold text-right">Staff</th>
                    <th className="py-2 px-3 font-bold text-right">Gross</th>
                    <th className="py-2 px-3 font-bold text-right">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-strokedark">
                  {(preview.byDepartment || []).map((d) => (
                    <tr key={d.department}>
                      <td className="py-2 px-3 font-medium">{d.department}</td>
                      <td className="py-2 px-3 text-right">{d.staff}</td>
                      <td className="py-2 px-3 text-right">{money(d.gross)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {money(d.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100/80 dark:bg-meta-4/40 font-bold">
                    <td className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-right">{deptSum((d) => d.staff)}</td>
                    <td className="py-2 px-3 text-right">{money(deptSum((d) => d.gross))}</td>
                    <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      {money(deptSum((d) => d.net))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Salary Head Breakdown */}
            <div className="rounded-xl border border-stroke dark:border-strokedark overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-gray-100/70 dark:bg-meta-4/30 text-gray-700 dark:text-gray-300">
                  <tr>
                    <th className="py-2 px-3 font-bold">Salary Head</th>
                    <th className="py-2 px-3 font-bold">Type</th>
                    <th className="py-2 px-3 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke dark:divide-strokedark">
                  {(preview.byHead || []).map((h) => (
                    <tr key={`${h.kind}-${h.head}`}>
                      <td className="py-2 px-3 font-medium">{h.head}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            h.kind === 'Earning'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {h.kind}
                        </span>
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-semibold ${
                          h.kind === 'Deduction' ? 'text-amber-600' : ''
                        }`}
                      >
                        {money(h.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100/80 dark:bg-meta-4/40 font-bold">
                    <td className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-[10px] text-gray-500">
                      Bonus less deductions
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {money(headSum('Earning') - headSum('Deduction'))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRMATION MODAL FOR GENERATING SALARY SHEET ── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-boxdark border border-stroke dark:border-strokedark shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary/10 via-transparent to-transparent border-b border-stroke dark:border-strokedark flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary text-white shadow-md">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-black dark:text-white">
                    Generate Salary Sheet
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Select month and calculation rules
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                disabled={busy}
                className="p-1.5 text-gray-400 hover:text-black dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Payroll Month Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Payroll Month
                </label>
                <Pick
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                >
                  {(hub.value?.months ?? [month]).map((m) => (
                    <option key={m} value={m}>
                      {monthNamed(m)} {sheets.some((s) => s.month === m) ? '— (Already Generated)' : ''}
                    </option>
                  ))}
                </Pick>
              </div>

              {existingSheet ? (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-start gap-2.5 animate-fade-in">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-bold">Salary Sheet Already Generated</p>
                    <p className="mt-0.5">
                      <strong>{existingSheet.number}</strong> has already been created for <strong>{existingSheet.monthLabel}</strong> ({existingSheet.status}). Click below to open and review or edit it.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5">
                      Payroll Calculation Rules
                    </h4>
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl border border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4/20 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-black dark:text-white">
                            Absence Pay Deductions
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Auto-deduct unpaid / absent days from basic pay
                          </p>
                        </div>
                        <CheckBox
                          checked={opts.deductForAbsence}
                          onChange={(v) => setOpts((prev) => ({ ...prev, deductForAbsence: v }))}
                        />
                      </div>

                      <div className="p-3 rounded-xl border border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4/20 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-black dark:text-white">
                            Loan &amp; Advance Recovery
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            Deduct monthly installment for active employee loans
                          </p>
                        </div>
                        <CheckBox
                          checked={opts.recoverLoans}
                          onChange={(v) => setOpts((prev) => ({ ...prev, recoverLoans: v }))}
                        />
                      </div>

                      <div className="p-3 rounded-xl border border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-black dark:text-white">
                              Include Staff Bonus
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                              Add extra bonus allowance across all employees
                            </p>
                          </div>
                          <CheckBox
                            checked={opts.payBonus}
                            onChange={(v) => setOpts((prev) => ({ ...prev, payBonus: v }))}
                          />
                        </div>
                        {opts.payBonus && (
                          <div className="pt-2 border-t border-stroke dark:border-strokedark grid grid-cols-2 gap-2 animate-fade-in">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                                Bonus Amount (Rs.)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={opts.bonusAmount}
                                onChange={(e) => setOpts((prev) => ({ ...prev, bonusAmount: Number(e.target.value) }))}
                                className="w-full px-2.5 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder="10000"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-1">
                                Bonus Reason
                              </label>
                              <input
                                type="text"
                                value={opts.bonusReason}
                                onChange={(e) => setOpts((prev) => ({ ...prev, bonusReason: e.target.value }))}
                                className="w-full px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-200 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-lg focus:outline-none focus:border-blue-500"
                                placeholder="Bonus Reason"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                      Calculates payslips for <strong>{monthNamed(month)}</strong> and creates a <strong>Draft</strong> sheet. You can adjust lines before approval.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-meta-4/30 border-t border-stroke dark:border-strokedark flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                disabled={busy}
                className="px-4 py-2 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer"
              >
                Cancel
              </button>
              {existingSheet ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowGenerateModal(false);
                    open(existingSheet);
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Open {existingSheet.monthLabel} Sheet</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmGenerate}
                  disabled={busy}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-opacity-90 text-white text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {busy ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Generate Salary Sheet</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalarySheetPage;
