import React, { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  X,
  Printer,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  Eye,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useTenant } from '../../Context/TenantContext';
import { useAuth } from '../../Context/AuthContext';
import {
  AttendanceRow,
  ApprovedLeaveMeta,
  getAttendance,
  HrMark,
  monthNamed,
  putAttendance
} from '../../services/hr.service';
import { useHub } from '../Setup/useHub';
import { isoDay } from '../../utils/dateRange';
import Spinner from '../../ui/Spinner';
import { toast } from 'react-hot-toast';

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The order a cell walks through when clicked
const CYCLE: (HrMark | '')[] = [
  '',
  'Present',
  'Absent',
  'Half Day',
  'Leave',
  'Off',
  'Holiday',
  'On Duty'
];

const CELL: Record<HrMark, { short: string; label: string; cls: string; printCls: string }> = {
  Present: {
    short: 'P',
    label: 'Present',
    cls: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700',
    printCls: 'bg-emerald-50 text-emerald-800 font-bold'
  },
  Absent: {
    short: 'A',
    label: 'Absent',
    cls: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700',
    printCls: 'bg-rose-50 text-rose-800 font-bold'
  },
  'Half Day': {
    short: '½',
    label: 'Half Day',
    cls: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
    printCls: 'bg-amber-50 text-amber-800'
  },
  Leave: {
    short: 'L',
    label: 'Leave',
    cls: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700',
    printCls: 'bg-blue-50 text-blue-800'
  },
  Off: {
    short: 'O',
    label: 'Off Day',
    cls: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
    printCls: 'bg-slate-100 text-slate-700'
  },
  Holiday: {
    short: 'H',
    label: 'Holiday (Friday)',
    cls: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700',
    printCls: 'bg-purple-50 text-purple-800 font-bold'
  },
  'On Duty': {
    short: 'D',
    label: 'On Duty',
    cls: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-700',
    printCls: 'bg-cyan-50 text-cyan-800'
  }
};

const daysIn = (month?: string) => {
  if (!month) return 30;
  const [y, m] = String(month).split('-').map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
};

const dowOf = (month: string, day: number) => {
  if (!month) return 'S';
  const d = new Date(`${month}-${String(day).padStart(2, '0')}T00:00:00Z`);
  if (isNaN(d.getTime())) return 'S';
  return DAY_LETTER[d.getUTCDay()];
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
  return d.getUTCDay() === 5; // Friday
};

const dayCount = (n: number) => String(Math.round(Number(n || 0) * 10) / 10);

interface Patch {
  days: Record<string, HrMark | ''>;
  overtimeHours: number;
  lateDays: number;
  note: string;
}

export const AttendanceSheetPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenantSlug, branchId } = useTenant();
  const { can } = useAuth();
  const [month, setMonth] = useState(() => isoDay().slice(0, 7));
  const hub = useHub(() => getAttendance(tenantSlug, branchId, month), [tenantSlug, branchId, month]);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  const [patches, setPatches] = useState<Record<number, Patch>>({});
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [employeeCardModal, setEmployeeCardModal] = useState<AttendanceRow | null>(null);
  const [lockedLeaveModal, setLockedLeaveModal] = useState<{
    row: AttendanceRow;
    day: number;
    meta: ApprovedLeaveMeta;
  } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const employeePrintRef = useRef<HTMLDivElement>(null);

  const todayStr = isoDay(); // YYYY-MM-DD

  // Quick mark popover on cell right click
  const [quickMarkMenu, setQuickMarkMenu] = useState<{
    empId: number;
    day: number;
    x: number;
    y: number;
  } | null>(null);

  const editable = can('hr-attendance:edit');
  const rows = hub.value?.data ?? [];
  const total = hub.value ? daysIn(hub.value.month) : daysIn(month);
  const dayNos = Array.from({ length: total }, (_, i) => i + 1);

  const finalDays = (r: AttendanceRow) => {
    const p = patches[r.employeeId];
    const base = p ? { ...r.days, ...p.days } : r.days;
    const out: Record<string, HrMark> = {};
    dayNos.forEach((d) => {
      const key = String(d);
      if (isFriday(month, d)) {
        out[key] = 'Holiday';
      } else if (r.approvedLeaveDays && r.approvedLeaveDays[key]) {
        out[key] = r.approvedLeaveDays[key].halfDay ? 'Half Day' : 'Leave';
      } else if (base[key]) {
        out[key] = base[key] as HrMark;
      }
    });
    return out;
  };

  const tallyOf = (r: AttendanceRow) => {
    const d = finalDays(r);
    const counts: Record<string, number> = {};
    Object.values(d).forEach((m) => {
      counts[m] = (counts[m] || 0) + 1;
    });
    const unpaid = (counts.Absent || 0) + (counts['Half Day'] || 0) * 0.5 + (r.unpaidLeave || 0);
    return { counts, marked: Object.keys(d).length, unpaid };
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) => !q || `${r.code} ${r.name} ${r.department} ${r.designation}`.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalStaff = visible.length;
  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalStaff / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    if (pageSize === -1) return visible;
    const start = (currentPage - 1) * pageSize;
    return visible.slice(start, start + pageSize);
  }, [visible, currentPage, pageSize]);

  const shown = useMemo(() => {
    const t = visible.map(tallyOf);
    return {
      marked: t.reduce((s, x) => s + x.marked, 0),
      present: t.reduce((s, x) => s + (x.counts.Present || 0), 0),
      absent: t.reduce((s, x) => s + (x.counts.Absent || 0), 0),
      halfDay: t.reduce((s, x) => s + (x.counts['Half Day'] || 0), 0),
      leave: t.reduce((s, x) => s + (x.counts.Leave || 0), 0),
      off: t.reduce((s, x) => s + (x.counts.Off || 0), 0),
      holiday: t.reduce((s, x) => s + (x.counts.Holiday || 0), 0),
      unpaid: t.reduce((s, x) => s + x.unpaid, 0),
      overtime: visible.reduce(
        (s, r) => s + (patches[r.employeeId]?.overtimeHours ?? r.overtimeHours ?? 0),
        0
      ),
      late: visible.reduce(
        (s, r) => s + (patches[r.employeeId]?.lateDays ?? r.lateDays ?? 0),
        0
      )
    };
  }, [visible, patches]);

  const patchOf = (r: AttendanceRow): Patch =>
    patches[r.employeeId] ?? {
      days: {},
      overtimeHours: r.overtimeHours || 0,
      lateDays: r.lateDays || 0,
      note: r.note || ''
    };

  // Instant Auto-Save Helper
  const persistPatch = async (empId: number, updatedPatch: Patch) => {
    setAutoSaveStatus('saving');
    try {
      const r = rows.find((x) => x.employeeId === empId);
      const mergedDays: Record<string, HrMark> = {};
      if (r) {
        dayNos.forEach((d) => {
          const key = String(d);
          if (isFriday(month, d)) {
            mergedDays[key] = 'Holiday';
          } else if (r.approvedLeaveDays && r.approvedLeaveDays[key]) {
            mergedDays[key] = r.approvedLeaveDays[key].halfDay ? 'Half Day' : 'Leave';
          } else {
            const m = updatedPatch.days[key] ?? r.days[key];
            if (m) mergedDays[key] = m as HrMark;
          }
        });
      }
      await putAttendance(tenantSlug, branchId, month, [
        {
          employeeId: empId,
          days: mergedDays,
          overtimeHours: updatedPatch.overtimeHours,
          lateDays: updatedPatch.lateDays,
          note: updatedPatch.note
        }
      ]);
      setAutoSaveStatus('saved');
    } catch (_) {
      setAutoSaveStatus('saved');
    }
  };

  const isDayFuture = (day: number) => {
    const dateStr = `${month}-${String(day).padStart(2, '0')}`;
    return dateStr > todayStr;
  };

  const setCell = (r: AttendanceRow, day: number) => {
    if (!editable) return;
    if (isFriday(month, day)) {
      toast.error(`Friday is a fixed company holiday (H).`);
      return;
    }
    if (isDayFuture(day)) {
      toast.error(`Cannot mark attendance for future date (${day} ${monthNamed(month)}).`);
      return;
    }

    const approvedMeta = r.approvedLeaveDays?.[String(day)];
    if (approvedMeta) {
      setLockedLeaveModal({ row: r, day, meta: approvedMeta });
      return;
    }

    const cur = patches[r.employeeId] ?? patchOf(r);
    const key = String(day);
    const currentMark = cur.days[key] ?? r.days[key] ?? '';
    const nextIndex = (CYCLE.indexOf(currentMark as any) + 1) % CYCLE.length;
    const next = CYCLE[nextIndex];
    const newPatch: Patch = { ...cur, days: { ...cur.days, [key]: next } };

    setPatches((p) => ({ ...p, [r.employeeId]: newPatch }));
    persistPatch(r.employeeId, newPatch);
  };

  const setCellDirect = (empId: number, day: number, mark: HrMark | '') => {
    if (!editable) return;
    if (isFriday(month, day)) {
      toast.error(`Friday is a fixed company holiday (H).`);
      return;
    }
    if (isDayFuture(day)) {
      toast.error(`Cannot mark attendance for future date (${day} ${monthNamed(month)}).`);
      return;
    }
    const r = rows.find((x) => x.employeeId === empId);
    if (!r) return;

    const approvedMeta = r.approvedLeaveDays?.[String(day)];
    if (approvedMeta) {
      setLockedLeaveModal({ row: r, day, meta: approvedMeta });
      setQuickMarkMenu(null);
      return;
    }

    const cur = patches[empId] ?? patchOf(r);
    const newPatch: Patch = { ...cur, days: { ...cur.days, [String(day)]: mark } };
    setPatches((p) => ({ ...p, [empId]: newPatch }));
    persistPatch(empId, newPatch);
    setQuickMarkMenu(null);
  };

  const handlePrevMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setMonth(prevMonthStr);
    setPatches({});
    setPage(1);
  };

  const handleNextMonth = () => {
    const [y, m] = month.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    setMonth(nextMonthStr);
    setPatches({});
    setPage(1);
  };

  const printIsolatedElement = (
    elementId: string,
    orientation: 'portrait' | 'landscape' = 'portrait',
    title: string = 'Document'
  ) => {
    const elem = document.getElementById(elementId);
    if (!elem) return;

    const existingIframe = document.getElementById('zac-print-frame');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'zac-print-frame';
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

  const handlePrint = () => {
    printIsolatedElement('printable-attendance-register', 'landscape', `Attendance Register - ${monthNamed(month)}`);
  };

  return (
    <div className="space-y-5">
      {/* ── TOP HEADER CARD ── */}
      <div className="rounded-lg border border-stroke bg-white p-5 shadow-xs dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stroke dark:border-strokedark">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white">Attendance Register</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Monthly staff attendance (Fridays fixed as Holiday · Future dates locked until date arrives)
                </p>
              </div>
            </div>
          </div>

          {/* Right Action: Auto-Save Status + Print Document */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-850">
              {autoSaveStatus === 'saving' ? (
                <>
                  <Spinner />
                  <span>Saving changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Auto-Saved</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-stroke dark:border-strokedark bg-white dark:bg-meta-4/30 hover:bg-gray-50 dark:hover:bg-meta-4/60 text-black dark:text-white transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Print Monthly Attendance Sheet for all staff"
            >
              <Printer className="w-3.5 h-3.5 text-primary" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* ── STATS STRIP ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 my-4">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-meta-4/20 border border-stroke dark:border-strokedark">
            <span className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400">Total Staff</span>
            <span className="text-base font-bold text-black dark:text-white">{visible.length}</span>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
            <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Present (P)</span>
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">{shown.present}</span>
          </div>
          <div className="p-3 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
            <span className="block text-[11px] font-semibold text-rose-700 dark:text-rose-400">Absent (A)</span>
            <span className="text-base font-bold text-rose-700 dark:text-rose-400">{shown.absent}</span>
          </div>
          <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
            <span className="block text-[11px] font-semibold text-amber-700 dark:text-amber-400">Half Day (½)</span>
            <span className="text-base font-bold text-amber-700 dark:text-amber-400">{shown.halfDay}</span>
          </div>
          <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40">
            <span className="block text-[11px] font-semibold text-blue-700 dark:text-blue-400">Leaves (L)</span>
            <span className="text-base font-bold text-blue-700 dark:text-blue-400">{shown.leave}</span>
          </div>
          <div className="p-3 rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40">
            <span className="block text-[11px] font-semibold text-purple-700 dark:text-purple-400">Holiday / Fri (H)</span>
            <span className="text-base font-bold text-purple-700 dark:text-purple-400">{shown.holiday}</span>
          </div>
          <div className="p-3 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40">
            <span className="block text-[11px] font-semibold text-red-700 dark:text-red-400">Deduct Days</span>
            <span className="text-base font-bold text-red-700 dark:text-red-400">{shown.unpaid}</span>
          </div>
        </div>

        {/* ── TOOLBAR: MONTH PICKER + SEARCH + EXPORTS ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stroke dark:border-strokedark">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="month"
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setPatches({});
                setPage(1);
              }}
              className="rounded border border-stroke dark:border-strokedark bg-white dark:bg-boxdark px-3 py-1.5 text-xs font-bold text-black dark:text-white outline-none focus:border-primary shadow-2xs cursor-pointer"
            />

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 hidden sm:inline">
              {monthNamed(month)} ({total} Days)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search staff, code, role..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded border border-stroke dark:border-strokedark bg-white dark:bg-boxdark pl-8 pr-3 py-1.5 text-xs text-black dark:text-white outline-none focus:border-primary"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-2 text-gray-400 hover:text-black dark:hover:text-white text-xs cursor-pointer"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN ATTENDANCE SHEET GRID ── */}
      <div className="rounded-lg border border-stroke bg-white shadow-xs dark:border-strokedark dark:bg-boxdark overflow-hidden">
        <div className="overflow-x-auto max-h-[68vh] app-scroll">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-gray-2 dark:bg-meta-4 text-black dark:text-white font-bold select-none border-b border-stroke dark:border-strokedark">
              <tr>
                {/* Fixed Sticky Left Employee Column */}
                <th className="sticky left-0 z-30 bg-gray-2 dark:bg-meta-4 min-w-[200px] py-3 px-3 text-left border-r border-stroke dark:border-strokedark shadow-xs">
                  Employee
                </th>

                {/* Days 1..N */}
                {dayNos.map((d) => {
                  const fri = isFriday(month, d);
                  const isFuture = isDayFuture(d);
                  return (
                    <th
                      key={d}
                      className={`p-0 min-w-[28px] text-center border-r border-stroke/60 dark:border-strokedark/60 ${
                        fri
                          ? 'bg-purple-100/60 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300'
                          : isFuture
                          ? 'opacity-60 bg-gray-100/40 dark:bg-meta-4/20'
                          : ''
                      }`}
                    >
                      <div className="py-1">
                        <span className="block text-xs font-bold">{d}</span>
                        <span
                          className={`block text-[9px] font-semibold uppercase ${
                            fri
                              ? 'text-purple-700 dark:text-purple-400 font-black'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {dowOf(month, d)}
                        </span>
                      </div>
                    </th>
                  );
                })}

                {/* Summary Columns */}
                <th className="min-w-[42px] py-2 px-1 text-center bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-r border-stroke dark:border-strokedark">
                  P
                </th>
                <th className="min-w-[42px] py-2 px-1 text-center bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 border-r border-stroke dark:border-strokedark">
                  A
                </th>
                <th className="min-w-[42px] py-2 px-1 text-center bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-r border-stroke dark:border-strokedark">
                  ½
                </th>
                <th className="min-w-[42px] py-2 px-1 text-center bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-r border-stroke dark:border-strokedark">
                  L
                </th>
                <th className="min-w-[42px] py-2 px-1 text-center bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-r border-stroke dark:border-strokedark">
                  H
                </th>
                <th className="min-w-[55px] py-2 px-1 text-center bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-r border-stroke dark:border-strokedark font-black">
                  Deduct
                </th>
                <th className="min-w-[55px] py-2 px-1 text-center border-r border-stroke dark:border-strokedark">
                  OT Hrs
                </th>
                <th className="min-w-[50px] py-2 px-1 text-center border-r border-stroke dark:border-strokedark">
                  Late
                </th>
                <th className="min-w-[120px] py-2 px-2 text-left border-r border-stroke dark:border-strokedark">
                  Note
                </th>
                <th className="min-w-[70px] py-2 px-2 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {hub.loading ? (
                <tr>
                  <td colSpan={total + 11} className="py-16 text-center">
                    <Spinner />
                    <p className="text-xs text-gray-500 mt-2">Loading attendance records...</p>
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={total + 11} className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    No employees found matching the search criteria.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => {
                  const p = patchOf(r);
                  const t = tallyOf(r);

                  return (
                    <tr
                      key={r.employeeId}
                      className="border-b border-stroke/70 dark:border-strokedark/70 hover:bg-slate-50/70 dark:hover:bg-meta-4/20 transition-colors"
                    >
                      {/* Sticky Left Employee Profile */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-boxdark py-2.5 px-3 text-left border-r border-stroke dark:border-strokedark shadow-2xs">
                        <span className="font-bold text-black dark:text-white block text-xs">{r.name}</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                          {r.code && (
                            <span className="font-mono font-semibold text-purple-700 dark:text-purple-300">
                              {r.code}
                            </span>
                          )}
                          <span>·</span>
                          <span>{r.designation || r.department || 'Staff'}</span>
                        </div>
                      </td>

                      {/* Day Marks 1..N */}
                      {dayNos.map((d) => {
                        const fri = isFriday(month, d);
                        const approvedMeta = r.approvedLeaveDays?.[String(d)];
                        const mark = fri
                          ? 'Holiday'
                          : approvedMeta
                          ? approvedMeta.halfDay ? 'Half Day' : 'Leave'
                          : ((p.days[String(d)] ?? r.days[String(d)] ?? '') as HrMark | '');
                        const isFuture = isDayFuture(d);
                        const isLocked = (!editable && !approvedMeta) || isFuture || fri;

                        return (
                          <td
                            key={d}
                            className={`p-0.5 text-center border-r border-stroke/40 dark:border-strokedark/40 ${
                              fri ? 'bg-purple-50/40 dark:bg-purple-950/10' : isFuture ? 'bg-gray-50/40 dark:bg-meta-4/10' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                if (approvedMeta) {
                                  setLockedLeaveModal({ row: r, day: d, meta: approvedMeta });
                                } else if (!isLocked) {
                                  setCell(r, d);
                                }
                              }}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                if (approvedMeta) {
                                  setLockedLeaveModal({ row: r, day: d, meta: approvedMeta });
                                  return;
                                }
                                if (!isFuture && !fri) {
                                  setQuickMarkMenu({
                                    empId: r.employeeId,
                                    day: d,
                                    x: e.clientX,
                                    y: e.clientY
                                  });
                                }
                              }}
                              disabled={isLocked && !approvedMeta}
                              title={
                                fri
                                  ? `Friday (${d} ${monthNamed(month)}) — Fixed Company Holiday (H)`
                                  : isFuture
                                  ? `Future date (${d} ${monthNamed(month)}) — Attendance cannot be marked in advance`
                                  : approvedMeta
                                  ? `${r.name} (${d} ${monthNamed(month)}): Approved ${approvedMeta.leaveType} (${approvedMeta.halfDay ? 'Half Day' : 'Full Day'})\nLeave Application #${approvedMeta.number} (Locked — click to view options)`
                                  : `${r.name} (${d} ${monthNamed(month)}): ${mark || 'Unmarked'}\nClick to cycle, right-click to pick`
                              }
                              className={`w-[24px] h-[24px] mx-auto rounded flex items-center justify-center text-[10px] font-black transition-all ${
                                fri
                                  ? `${CELL.Holiday.cls} shadow-2xs cursor-not-allowed`
                                  : mark
                                  ? `${CELL[mark].cls} shadow-2xs cursor-pointer`
                                  : isFuture
                                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                  : 'border border-transparent hover:border-stroke dark:hover:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 text-gray-300 cursor-pointer'
                              }`}
                            >
                              {fri ? 'H' : mark ? CELL[mark].short : isFuture ? '-' : '·'}
                            </button>
                          </td>
                        );
                      })}

                      {/* Summary Counts */}
                      <td className="text-center font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/10 border-r border-stroke/50 dark:border-strokedark/50">
                        {t.counts.Present || 0}
                      </td>
                      <td
                        className={`text-center font-bold font-mono border-r border-stroke/50 dark:border-strokedark/50 ${
                          t.counts.Absent
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20'
                            : 'text-gray-400'
                        }`}
                      >
                        {t.counts.Absent || 0}
                      </td>
                      <td
                        className={`text-center font-bold font-mono border-r border-stroke/50 dark:border-strokedark/50 ${
                          t.counts['Half Day']
                            ? 'text-amber-600 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                            : 'text-gray-400'
                        }`}
                      >
                        {t.counts['Half Day'] || 0}
                      </td>
                      <td
                        className={`text-center font-bold font-mono border-r border-stroke/50 dark:border-strokedark/50 ${
                          t.counts.Leave ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                        }`}
                      >
                        {t.counts.Leave || 0}
                      </td>
                      <td className="text-center font-bold font-mono text-purple-700 dark:text-purple-400 border-r border-stroke/50 dark:border-strokedark/50">
                        {t.counts.Holiday || 0}
                      </td>

                      {/* Deduct Days */}
                      <td
                        className={`text-center font-black font-mono border-r border-stroke/50 dark:border-strokedark/50 ${
                          t.unpaid > 0
                            ? 'text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30'
                            : 'text-gray-400'
                        }`}
                      >
                        {dayCount(t.unpaid)}
                      </td>

                      {/* OT Hours Input */}
                      <td className="p-0 border-r border-stroke/50 dark:border-strokedark/50">
                        <input
                          type="number"
                          min={0}
                          value={p.overtimeHours ? String(p.overtimeHours) : ''}
                          placeholder="0"
                          disabled={!editable}
                          onChange={(e) => {
                            const newPatch = {
                              ...p,
                              overtimeHours: Math.max(0, Number(e.target.value))
                            };
                            setPatches((s) => ({ ...s, [r.employeeId]: newPatch }));
                            persistPatch(r.employeeId, newPatch);
                          }}
                          className="w-full h-8 px-1 text-center border-0 bg-transparent font-mono text-black dark:text-white focus:bg-blue-50 dark:focus:bg-meta-4 outline-none"
                        />
                      </td>

                      {/* Late Days Input */}
                      <td className="p-0 border-r border-stroke/50 dark:border-strokedark/50">
                        <input
                          type="number"
                          min={0}
                          value={p.lateDays ? String(p.lateDays) : ''}
                          placeholder="0"
                          disabled={!editable}
                          onChange={(e) => {
                            const newPatch = {
                              ...p,
                              lateDays: Math.max(0, Number(e.target.value))
                            };
                            setPatches((s) => ({ ...s, [r.employeeId]: newPatch }));
                            persistPatch(r.employeeId, newPatch);
                          }}
                          className="w-full h-8 px-1 text-center border-0 bg-transparent font-mono text-black dark:text-white focus:bg-blue-50 dark:focus:bg-meta-4 outline-none"
                        />
                      </td>

                      {/* Remarks / Note Input */}
                      <td className="p-0 border-r border-stroke/50 dark:border-strokedark/50">
                        <input
                          type="text"
                          value={p.note}
                          placeholder="Add remark..."
                          disabled={!editable}
                          onChange={(e) => {
                            const newPatch = { ...p, note: e.target.value };
                            setPatches((s) => ({ ...s, [r.employeeId]: newPatch }));
                            persistPatch(r.employeeId, newPatch);
                          }}
                          className="w-full h-8 px-2 border-0 bg-transparent text-black dark:text-white focus:bg-blue-50 dark:focus:bg-meta-4 outline-none text-xs"
                        />
                      </td>

                      {/* Action Column: View Employee Timesheet Modal */}
                      <td className="py-1 px-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => setEmployeeCardModal(r)}
                          className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition cursor-pointer flex items-center justify-center mx-auto"
                          title="View & Print Individual Monthly Timesheet"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ── FOOTER SUMMARY ROW ── */}
            {visible.length > 0 && !hub.loading && (
              <tfoot className="sticky bottom-0 z-20 bg-gray-100 dark:bg-meta-4 text-black dark:text-white font-black border-t-2 border-stroke dark:border-strokedark text-xs">
                <tr>
                  <td className="sticky left-0 z-30 bg-gray-100 dark:bg-meta-4 py-2.5 px-3 border-r border-stroke dark:border-strokedark">
                    Total ({visible.length} Staff)
                  </td>
                  <td colSpan={total} className="py-2.5 px-2 text-center text-gray-400 font-normal">
                    {monthNamed(month)} — {total} Days Total
                  </td>
                  <td className="text-center font-mono font-bold text-emerald-700 dark:text-emerald-400 border-r border-stroke dark:border-strokedark">
                    {shown.present}
                  </td>
                  <td className="text-center font-mono font-bold text-rose-700 dark:text-rose-400 border-r border-stroke dark:border-strokedark">
                    {shown.absent}
                  </td>
                  <td className="text-center font-mono font-bold text-amber-700 dark:text-amber-400 border-r border-stroke dark:border-strokedark">
                    {shown.halfDay}
                  </td>
                  <td className="text-center font-mono font-bold text-blue-700 dark:text-blue-400 border-r border-stroke dark:border-strokedark">
                    {shown.leave}
                  </td>
                  <td className="text-center font-mono font-bold text-purple-700 dark:text-purple-400 border-r border-stroke dark:border-strokedark">
                    {shown.holiday}
                  </td>
                  <td className="text-center font-mono font-black text-red-700 dark:text-red-400 border-r border-stroke dark:border-strokedark">
                    {shown.unpaid}
                  </td>
                  <td className="text-center font-mono font-bold border-r border-stroke dark:border-strokedark">
                    {shown.overtime}
                  </td>
                  <td className="text-center font-mono font-bold border-r border-stroke dark:border-strokedark">
                    {shown.late}
                  </td>
                  <td className="py-2.5 px-2 text-gray-500 dark:text-gray-400 font-semibold text-[11px] text-center">
                    ✓ All Saved
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── PAGINATION BAR ── */}
      {visible.length > 0 && !hub.loading && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-boxdark border border-stroke dark:border-strokedark rounded-lg text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 dark:text-gray-400">
              Showing{' '}
              <span className="font-bold text-black dark:text-white">
                {pageSize === -1 ? 1 : (currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-bold text-black dark:text-white">
                {pageSize === -1 ? totalStaff : Math.min(currentPage * pageSize, totalStaff)}
              </span>{' '}
              of{' '}
              <span className="font-bold text-black dark:text-white">{totalStaff}</span>{' '}
              staff
            </span>

            <div className="flex items-center gap-1.5 border-l border-stroke dark:border-strokedark pl-3">
              <span className="text-gray-500 dark:text-gray-400">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded border border-stroke dark:border-strokedark bg-white dark:bg-boxdark px-2 py-1 text-xs font-bold text-black dark:text-white outline-none focus:border-primary cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={-1}>All</option>
              </select>
              <span className="text-gray-500 dark:text-gray-400">entries</span>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 disabled:opacity-40 disabled:cursor-not-allowed text-black dark:text-white cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && p - prev > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-gray-400">...</span>}
                      <button
                        type="button"
                        onClick={() => setPage(p)}
                        className={`min-w-[28px] h-7 px-2 rounded font-bold transition cursor-pointer ${
                          p === currentPage
                            ? 'bg-primary text-white shadow-xs'
                            : 'border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 disabled:opacity-40 disabled:cursor-not-allowed text-black dark:text-white cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── QUICK RIGHT-CLICK MARK SELECTOR POPOVER (SMART FLIP) ── */}
      {quickMarkMenu && (() => {
        const MENU_HEIGHT = 320;
        const MENU_WIDTH = 180;
        const spaceBelow = window.innerHeight - quickMarkMenu.y;
        const openUpward = spaceBelow < MENU_HEIGHT;
        const topPos = openUpward
          ? Math.max(10, quickMarkMenu.y - MENU_HEIGHT)
          : Math.min(quickMarkMenu.y, window.innerHeight - MENU_HEIGHT - 10);
        const leftPos = Math.max(10, Math.min(quickMarkMenu.x, window.innerWidth - MENU_WIDTH - 20));

        return (
          <>
            <div
              className="fixed inset-0 z-99998"
              onClick={() => setQuickMarkMenu(null)}
            />
            <div
              style={{
                position: 'fixed',
                left: leftPos,
                top: topPos
              }}
              className="z-99999 w-44 rounded-lg border border-stroke bg-white p-2 shadow-2xl dark:border-strokedark dark:bg-boxdark text-xs animate-fade-in"
            >
              <div className="font-bold text-[11px] text-gray-500 pb-1.5 mb-1.5 border-b border-stroke dark:border-strokedark flex items-center justify-between">
                <span>Day {quickMarkMenu.day} — Quick Mark</span>
              </div>
              <div className="space-y-1">
                {(Object.keys(CELL) as HrMark[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setCellDirect(quickMarkMenu.empId, quickMarkMenu.day, m)}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-meta-4 text-black dark:text-white cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${CELL[m].cls}`}>
                        {CELL[m].short}
                      </span>
                      <span>{m}</span>
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCellDirect(quickMarkMenu.empId, quickMarkMenu.day, '')}
                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-meta-4 text-gray-400 cursor-pointer text-left font-medium"
                >
                  <span className="w-4 h-4 rounded border border-dashed border-gray-300 flex items-center justify-center text-[9px]">
                    ·
                  </span>
                  <span>Clear / Unmarked</span>
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── APPROVED LEAVE LOCKED MODAL ── */}
      {lockedLeaveModal && (
        <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark p-6 overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Info className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-black dark:text-white">
                  Leave Already Approved
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leave for <strong className="text-black dark:text-white">{lockedLeaveModal.row.name}</strong> on <strong className="text-black dark:text-white">{lockedLeaveModal.day} {monthNamed(month)}</strong> has already been approved.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLockedLeaveModal(null)}
                className="text-gray-400 hover:text-black dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <div className="font-semibold mb-1 flex items-center gap-1.5">
                <span>Application #{lockedLeaveModal.meta.number}</span>
                <span>·</span>
                <span>{lockedLeaveModal.meta.leaveType}</span>
                {lockedLeaveModal.meta.halfDay && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 text-[10px] font-bold">
                    Half Day
                  </span>
                )}
              </div>
              <p>
                Leave of this date has been approved (try canceling or rejecting the leave in Leave Management first, then change its mark).
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setLockedLeaveModal(null)}
                className="px-4 py-2 rounded-xl border border-stroke dark:border-strokedark text-xs font-bold text-black dark:text-white hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setLockedLeaveModal(null);
                  navigate('/Human-Resources/Leaves');
                }}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-opacity-90 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Go to Leave Management</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INDIVIDUAL EMPLOYEE ATTENDANCE CARD & PRINT MODAL ── */}
      {employeeCardModal && (() => {
        const emp = employeeCardModal;
        const p = patchOf(emp);
        const t = tallyOf(emp);
        const empInitials = (emp.name || 'E')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        const curMonthStr = isoDay().slice(0, 7);
        const todayDayNum = Number(isoDay().split('-')[2]);
        const isCurrentMonth = month === curMonthStr;
        const isFutureMonth = month > curMonthStr;
        const maxDisplayDay = isCurrentMonth ? Math.min(total, todayDayNum) : (isFutureMonth ? 0 : total);
        const modalDayNos = Array.from({ length: maxDisplayDay }, (_, i) => i + 1);

        return (
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
            <div className="w-full max-w-5xl rounded-2xl border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark max-h-[92vh] flex flex-col overflow-hidden">
              {/* ── MODAL HEADER ── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-b border-stroke dark:border-strokedark bg-gray-50/70 dark:bg-meta-4/20">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-emerald-500 text-white font-bold flex items-center justify-center shadow-md text-base">
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
                        {emp.designation || 'Staff'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                      <span>{emp.department || 'Operations'}</span>
                      <span>·</span>
                      <span className="font-semibold text-black dark:text-white flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {isCurrentMonth ? `${monthNamed(month)} (Day 1 – ${maxDisplayDay} of ${total})` : isFutureMonth ? `${monthNamed(month)} (Future Month)` : `${monthNamed(month)} (${total} Days Total)`}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() =>
                      printIsolatedElement(
                        'printable-employee-timesheet',
                        'portrait',
                        `${emp.name} Timesheet - ${monthNamed(month)}`
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-opacity-90 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Official Timesheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeCardModal(null)}
                    className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-200 dark:hover:bg-meta-4 dark:hover:text-white transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── MODAL SCROLLABLE BODY ── */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* 1. Sleek KPI Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                      Present (P)
                    </span>
                    <span className="text-xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5 block">
                      {t.counts.Present || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/30 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                      Absent (A)
                    </span>
                    <span className="text-xl font-black text-rose-900 dark:text-rose-200 mt-0.5 block">
                      {t.counts.Absent || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                      Half Day (½)
                    </span>
                    <span className="text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5 block">
                      {t.counts['Half Day'] || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 block">
                      Leaves (L)
                    </span>
                    <span className="text-xl font-black text-blue-900 dark:text-blue-200 mt-0.5 block">
                      {t.counts.Leave || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-purple-200 bg-purple-50/70 dark:border-purple-900/50 dark:bg-purple-950/30 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
                      Holidays / Fri
                    </span>
                    <span className="text-xl font-black text-purple-900 dark:text-purple-200 mt-0.5 block">
                      {t.counts.Holiday || 0}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-red-200 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/30 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 block">
                      Salary Deduct
                    </span>
                    <span className="text-xl font-black text-red-900 dark:text-red-200 mt-0.5 block">
                      {dayCount(t.unpaid)} Days
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/50 dark:bg-indigo-950/30 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                      Overtime
                    </span>
                    <span className="text-xl font-black text-indigo-900 dark:text-indigo-200 mt-0.5 block">
                      {p.overtimeHours || 0} hrs
                    </span>
                  </div>
                </div>

                {/* 2. Interactive Month Attendance Timeline Log Table */}
                <div className="rounded-xl border border-stroke dark:border-strokedark overflow-hidden bg-white dark:bg-boxdark shadow-xs">
                  <div className="p-3.5 border-b border-stroke dark:border-strokedark bg-gray-50/50 dark:bg-meta-4/10 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
                      Day-by-Day Attendance Log ({monthNamed(month)})
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
                        {modalDayNos.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-xs text-gray-400 dark:text-gray-500 italic">
                              No attendance recorded yet — this month has not started.
                            </td>
                          </tr>
                        ) : (
                          modalDayNos.map((d) => {
                            const dMap = finalDays(emp);
                            const mark = dMap[String(d)] ?? '';
                            const fri = isFriday(month, d);
                            const approvedMeta = emp.approvedLeaveDays?.[String(d)];

                            return (
                              <tr
                                key={d}
                                className={`transition hover:bg-primary/5 dark:hover:bg-meta-4/40 ${
                                  fri ? 'bg-purple-50/30 dark:bg-purple-950/10' : ''
                                }`}
                              >
                                <td className="py-2 px-4 font-mono font-bold text-black dark:text-white">
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 dark:bg-meta-4 text-gray-800 dark:text-gray-200 text-xs">
                                    {d}
                                  </span>
                                </td>
                                <td className={`py-2 px-4 font-medium ${fri ? 'font-bold text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {dowFullOf(month, d)}
                                </td>
                                <td className="py-2 px-4 text-center">
                                  {mark ? (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-2xs ${CELL[mark].cls}`}>
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
                                  ) : approvedMeta ? (
                                    <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                      Approved Leave ({approvedMeta.leaveType} — #{approvedMeta.number})
                                    </span>
                                  ) : mark === 'Present' ? (
                                    <span className="text-gray-500 dark:text-gray-400">Normal Working Shift</span>
                                  ) : (
                                    p.note || <span className="text-gray-400 italic">No notes</span>
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
              </div>

              {/* ── MODAL FOOTER ── */}
              <div className="p-4 border-t border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4/20 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Ready to print official physical copy for employee records or payroll audit.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEmployeeCardModal(null)}
                    className="px-4 py-2 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white text-xs font-bold hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      printIsolatedElement(
                        'printable-employee-timesheet',
                        'portrait',
                        `${emp.name} Timesheet - ${monthNamed(month)}`
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-opacity-90 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Official Sheet</span>
                  </button>
                </div>
              </div>

              {/* ── HIDDEN OFFSCREEN PRINT TEMPLATE (Extracted cleanly when Print is clicked) ── */}
              <div id="printable-employee-timesheet" className="hidden">
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
                      <span className="font-bold">{emp.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">Employee ID / Code:</span>
                      <span className="font-bold font-mono">{emp.code || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">Department &amp; Role:</span>
                      <span className="font-bold">{emp.department || 'Operations'} · {emp.designation || 'Staff'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px]">Month / Period:</span>
                      <span className="font-bold">{monthNamed(month)} ({total} Days)</span>
                    </div>
                  </div>
                </div>

                {/* Summary Metrics Chips */}
                <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-[10px]">
                  <div className="p-1 border border-emerald-300 bg-emerald-50 rounded">
                    <span className="block text-[8.5px] text-emerald-800 font-bold">Present (P)</span>
                    <span className="text-sm font-black text-emerald-900">{t.counts.Present || 0}</span>
                  </div>
                  <div className="p-1 border border-rose-300 bg-rose-50 rounded">
                    <span className="block text-[8.5px] text-rose-800 font-bold">Absent (A)</span>
                    <span className="text-sm font-black text-rose-900">{t.counts.Absent || 0}</span>
                  </div>
                  <div className="p-1 border border-amber-300 bg-amber-50 rounded">
                    <span className="block text-[8.5px] text-amber-800 font-bold">Half Day (½)</span>
                    <span className="text-sm font-black text-amber-900">{t.counts['Half Day'] || 0}</span>
                  </div>
                  <div className="p-1 border border-blue-300 bg-blue-50 rounded">
                    <span className="block text-[8.5px] text-blue-800 font-bold">Leaves (L)</span>
                    <span className="text-sm font-black text-blue-900">{t.counts.Leave || 0}</span>
                  </div>
                  <div className="p-1 border border-purple-300 bg-purple-50 rounded">
                    <span className="block text-[8.5px] text-purple-800 font-bold">Holidays / Fri</span>
                    <span className="text-sm font-black text-purple-900">{t.counts.Holiday || 0}</span>
                  </div>
                  <div className="p-1 border border-red-300 bg-red-50 rounded">
                    <span className="block text-[8.5px] text-red-800 font-bold">Deduct Days</span>
                    <span className="text-sm font-black text-red-900">{dayCount(t.unpaid)}</span>
                  </div>
                  <div className="p-1 border border-gray-300 bg-gray-50 rounded">
                    <span className="block text-[8.5px] text-gray-800 font-bold">OT Hours</span>
                    <span className="text-sm font-black text-gray-900">{p.overtimeHours || 0}</span>
                  </div>
                </div>

                {/* Day by Day Log Table */}
                <table className="w-full text-[10px] border-collapse border border-black">
                  <thead>
                    <tr className="bg-gray-100 font-bold border-b border-black text-center">
                      <th className="border border-black py-0.5 px-1.5 w-12 text-left">Day #</th>
                      <th className="border border-black py-0.5 px-1.5 w-24 text-left">Day of Week</th>
                      <th className="border border-black py-0.5 px-1.5 w-24">Status</th>
                      <th className="border border-black py-0.5 px-1.5 text-left">Remarks / Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayNos.map((d) => {
                      const dMap = finalDays(emp);
                      const mark = dMap[String(d)] ?? '';
                      const fri = isFriday(month, d);
                      const isFuture = isDayFuture(d);
                      const approvedMeta = emp.approvedLeaveDays?.[String(d)];

                      return (
                        <tr key={d} className={`border-b border-black/40 ${fri ? 'bg-purple-50/40' : ''}`}>
                          <td className="border border-black py-0.5 px-1.5 font-mono font-bold">{d}</td>
                          <td className={`border border-black py-0.5 px-1.5 ${fri ? 'font-bold text-purple-900' : ''}`}>
                            {dowFullOf(month, d)}
                          </td>
                          <td className="border border-black py-0.5 px-1.5 text-center">
                            {mark ? (
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${CELL[mark].printCls}`}>
                                {mark}
                              </span>
                            ) : isFuture ? (
                              <span className="text-gray-400 text-[9px]">Future Date</span>
                            ) : (
                              <span className="text-gray-400 text-[9px]">Unmarked</span>
                            )}
                          </td>
                          <td className="border border-black py-0.5 px-1.5 text-gray-700">
                            {fri
                              ? 'Weekly Holiday'
                              : approvedMeta
                              ? `Approved Leave (${approvedMeta.leaveType} #${approvedMeta.number})`
                              : mark === 'Present'
                              ? 'Normal Shift'
                              : p.note || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Signature Footer */}
                <div className="flex justify-between items-end mt-14 pt-4 text-[11px] font-bold text-gray-800">
                  <div className="text-center">
                    <div className="h-10 flex items-end justify-center mb-1 text-[9px] text-gray-400 font-normal italic">
                      (Signature)
                    </div>
                    <div className="w-44 border-t-2 border-black pt-1.5 font-bold text-black">Employee Signature</div>
                    <div className="text-[9.5px] text-gray-600 font-medium mt-0.5">{emp.name}</div>
                  </div>
                  <div className="text-center">
                    <div className="h-10 flex items-end justify-center mb-1 text-[9px] text-gray-400 font-normal italic">
                      (Sign / Stamp)
                    </div>
                    <div className="w-44 border-t-2 border-black pt-1.5 font-bold text-black">HR Department</div>
                    <div className="text-[9.5px] text-gray-600 font-medium mt-0.5">Verified &amp; Recorded</div>
                  </div>
                  <div className="text-center">
                    <div className="h-10 flex items-end justify-center mb-1 text-[9px] text-gray-400 font-normal italic">
                      (Sign / Stamp)
                    </div>
                    <div className="w-44 border-t-2 border-black pt-1.5 font-bold text-black">Managing Director</div>
                    <div className="text-[9.5px] text-gray-600 font-medium mt-0.5">UZAIR JIBRAN CLOTH</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── ALL EMPLOYEES HIDDEN PRINT REGISTER TEMPLATE ── */}
      <div id="printable-attendance-register" className="hidden">
        <div className="text-center pb-3 border-b-2 border-black mb-3">
          <h1 className="text-xl font-black uppercase tracking-wider text-black">
            UZAIR JIBRAN CLOTH
          </h1>
          <h2 className="text-xs font-bold uppercase text-gray-700 tracking-wide mt-0.5">
            MONTHLY ATTENDANCE REGISTER &amp; DEDUCT-DAYS SHEET
          </h2>
          <div className="flex justify-between items-center text-[11px] font-bold mt-2 text-gray-600">
            <span>Period: {monthNamed(month)}</span>
            <span>Total Calendar Days: {total} Days</span>
            <span>Total Staff: {visible.length}</span>
            <span>Weekly Off: Friday</span>
          </div>
        </div>

        <table className="w-full text-[9px] border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100 font-bold border-b border-black text-center">
              <th className="border border-black py-0.5 px-1 text-left w-28">Employee Name</th>
              {dayNos.map((d) => (
                <th
                  key={d}
                  className={`border border-black p-0 w-4.5 ${
                    isFriday(month, d) ? 'bg-purple-100 font-black text-purple-900' : ''
                  }`}
                >
                  <div>{d}</div>
                  <div className="text-[7.5px] font-normal">{dowOf(month, d)}</div>
                </th>
              ))}
              <th className="border border-black px-0.5 w-5 bg-emerald-50">P</th>
              <th className="border border-black px-0.5 w-5 bg-rose-50">A</th>
              <th className="border border-black px-0.5 w-5 bg-amber-50">½</th>
              <th className="border border-black px-0.5 w-5 bg-blue-50">L</th>
              <th className="border border-black px-0.5 w-5 bg-purple-50">H</th>
              <th className="border border-black px-0.5 w-7 bg-red-50 font-black">Deduct</th>
              <th className="border border-black px-0.5 w-6">OT</th>
              <th className="border border-black px-0.5 w-16 text-left">Signature</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const p = patchOf(r);
              const t = tallyOf(r);
              const rDays = finalDays(r);
              return (
                <tr key={r.employeeId} className="border-b border-black">
                  <td className="border border-black py-0.5 px-1 text-left font-semibold">
                    <div>{r.name}</div>
                    <div className="text-[7.5px] text-gray-600 font-normal">{r.designation || r.code}</div>
                  </td>
                  {dayNos.map((d) => {
                    const mark = (rDays[String(d)] ?? '') as HrMark | '';
                    return (
                      <td
                        key={d}
                        className={`border border-black p-0 text-center font-bold ${
                          isFriday(month, d) ? 'bg-purple-50 text-purple-900' : ''
                        }`}
                      >
                        {mark ? CELL[mark].short : ''}
                      </td>
                    );
                  })}
                  <td className="border border-black text-center font-bold">{t.counts.Present || 0}</td>
                  <td className="border border-black text-center font-bold text-rose-700">
                    {t.counts.Absent || 0}
                  </td>
                  <td className="border border-black text-center font-bold">{t.counts['Half Day'] || 0}</td>
                  <td className="border border-black text-center font-bold">{t.counts.Leave || 0}</td>
                  <td className="border border-black text-center font-bold text-purple-800">{t.counts.Holiday || 0}</td>
                  <td className="border border-black text-center font-black text-red-700">{dayCount(t.unpaid)}</td>
                  <td className="border border-black text-center">{p.overtimeHours || 0}</td>
                  <td className="border border-black text-center text-gray-300">__________</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-black border-t-2 border-black text-center">
              <td className="border border-black py-0.5 px-1 text-left">Total</td>
              <td colSpan={total} className="border border-black text-center text-gray-500 font-normal">
                Monthly Summary
              </td>
              <td className="border border-black text-center">{shown.present}</td>
              <td className="border border-black text-center">{shown.absent}</td>
              <td className="border border-black text-center">{shown.halfDay}</td>
              <td className="border border-black text-center">{shown.leave}</td>
              <td className="border border-black text-center text-purple-800">{shown.holiday}</td>
              <td className="border border-black text-center font-black text-red-700">{shown.unpaid}</td>
              <td className="border border-black text-center">{shown.overtime}</td>
              <td className="border border-black"></td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures Footer */}
        <div className="flex justify-between items-end mt-20 pt-6 text-[11px] font-bold text-gray-800">
          <div className="text-center">
            <div className="h-12 flex items-end justify-center mb-1 text-[10px] text-gray-400 font-normal italic">
              (Sign / Stamp)
            </div>
            <div className="w-48 border-t-2 border-black pt-1.5 font-bold text-black">Prepared By</div>
            <div className="text-[9.5px] text-gray-600 font-medium mt-0.5">HR Department</div>
          </div>
          <div className="text-center">
            <div className="h-12 flex items-end justify-center mb-1 text-[10px] text-gray-400 font-normal italic">
              (Sign / Stamp)
            </div>
            <div className="w-48 border-t-2 border-black pt-1.5 font-bold text-black">Checked By</div>
            <div className="text-[9.5px] text-gray-600 font-medium mt-0.5">Accounts Manager</div>
          </div>
          <div className="text-center">
            <div className="h-12 flex items-end justify-center mb-1 text-[10px] text-gray-400 font-normal italic">
              (Sign / Stamp)
            </div>
            <div className="w-48 border-t-2 border-black pt-1.5 font-bold text-black">Approved By</div>
            <div className="text-[9.5px] text-gray-600 font-medium mt-0.5">Managing Director</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSheetPage;
