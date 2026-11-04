import { createPortal } from 'react-dom';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LuBanknote,
  LuStore,
  LuChevronDown,
  LuCheck,
  LuSearch,
  LuClock,
  LuUser,
  LuLock,
  LuUnlock,
  LuPlus,
  LuMinus,
  LuReceipt,
  LuPrinter,
  LuFileSpreadsheet,
  LuArrowLeft,
  LuCheckCircle2,
  LuAlertTriangle,
  LuCoins,
  LuX,
  LuFileText,
  LuCalendar,
  LuFilter,
  LuBarChart3,
  LuPieChart,
  LuTrendingUp,
  LuTag,
  LuShoppingBag,
  LuArrowDownLeft,
  LuArrowUpRight,
  LuCreditCard,
  LuQrCode,
  LuSparkles
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useAuth } from '../../Context/Auth';
import { useLanguage } from '../../Context/LanguageContext';
import { getSavedAccentColor, getContrastTextColor } from '../../constant/themeConfig';
import { posService, PosShift, PosSettings, PosOrder, PosTerminalCounter } from '../../service/posService';

interface POSRegisterProps {
  embedded?: boolean;
  onBack?: () => void;
}

export const POSRegister: React.FC<POSRegisterProps> = ({ embedded, onBack }) => {
  const navigate = useNavigate();
  const { userEmail, businessName } = useAuth();
  const { isRTL } = useLanguage();
  const [accentColor, setAccentColor] = useState<string>(getSavedAccentColor());

  useEffect(() => {
    const handleTheme = () => setAccentColor(getSavedAccentColor());
    window.addEventListener('uzair_jibran_theme_color_changed', handleTheme);
    return () => window.removeEventListener('uzair_jibran_theme_color_changed', handleTheme);
  }, []);

  const contrastText = getContrastTextColor(accentColor);
  const isAccentWhite = accentColor.toLowerCase() === '#ffffff' || accentColor.toLowerCase() === '#fff';

  const [posConfig] = useState<PosSettings>(() => posService.getSettings());
  const [activeShift, setActiveShift] = useState<PosShift | null>(() => posService.getActiveShift());
  const [allShifts, setAllShifts] = useState<PosShift[]>(() => posService.getAllShifts());

  // Modal States
  const [isOpenShiftModal, setIsOpenShiftModal] = useState<boolean>(false);
  const [dayOpenDate, setDayOpenDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dayOpenPettyCash, setDayOpenPettyCash] = useState<number>(() => posService.getLastClosingPettyCash());
  const [dayOpenCashIn, setDayOpenCashIn] = useState<number>(0);
  const [dayOpenCashOut, setDayOpenCashOut] = useState<number>(0);
  const [pettyCashSource, setPettyCashSource] = useState<string>(() => {
    const lookup = posService.getPettyCashForDate(new Date().toISOString().split('T')[0]);
    return lookup.isFound ? `Auto-filled from ${lookup.foundDate} close` : 'Manual start / First day';
  });

  const handleDayOpenDateChange = (newDate: string) => {
    setDayOpenDate(newDate);
    const lookup = posService.getPettyCashForDate(newDate);
    setDayOpenPettyCash(lookup.amount);
    setPettyCashSource(lookup.isFound ? `Auto-filled from ${lookup.foundDate} close` : 'No prior shift before this date (enter manually)');
  };

  const [isCloseShiftModal, setIsCloseShiftModal] = useState<boolean>(false);
  const [dayCloseDate, setDayCloseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dayCloseCashOut, setDayCloseCashOut] = useState<number>(0);
  const [dayCloseCashIn, setDayCloseCashIn] = useState<number>(0);
  const [dayCloseNotes, setDayCloseNotes] = useState<string>('');
  const [actualCountedCash, setActualCountedCash] = useState<number>(0);

  const [isCashInOutModal, setIsCashInOutModal] = useState<boolean>(false);
  const [cashInOutType, setCashInOutType] = useState<'in' | 'out'>('in');
  const [cashInOutAmount, setCashInOutAmount] = useState<number>(0);
  const [cashInOutReason, setCashInOutReason] = useState<string>('');

  const [selectedZReport, setSelectedZReport] = useState<PosShift | null>(null);

  // Report Navigation State
  type ReportTab = 'zreport' | 'category' | 'top_items' | 'payments' | 'peak_hours' | 'petty_cash';
  const [activeTab, setActiveTab] = useState<ReportTab>('zreport');

  // Orders State
  const [allOrders, setAllOrders] = useState<PosOrder[]>(() => posService.getAllOrders());

  // Date Filter State for Daily Summary & Reports
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Yesterday' | 'Last7Days' | 'Custom'>('All');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const { posSlug } = useParams<{ posSlug?: string }>();
  const currentTerminalSlug = (posSlug || 'pos1').toLowerCase();
  const loggedInCashier = posService.getLoggedInCashier(currentTerminalSlug);
  const currentCashierName = loggedInCashier?.name || userEmail?.split('@')[0] || 'Alex Rivera';

  // Counter & Cashier Filter State
  const [selectedCounter, setSelectedCounter] = useState<string>('All');
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>('All');
  const [isMergedSlipOpen, setIsMergedSlipOpen] = useState(false);
  const [terminalsList] = useState<PosTerminalCounter[]>(() => posService.getTerminals());

  // Searchable Counter Dropdown State
  const [isCounterDropdownOpen, setIsCounterDropdownOpen] = useState(false);
  const [counterSearchQuery, setCounterSearchQuery] = useState('');
  const counterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (counterDropdownRef.current && !counterDropdownRef.current.contains(e.target as Node)) {
        setIsCounterDropdownOpen(false);
      }
    };
    if (isCounterDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCounterDropdownOpen]);

  // Filtered terminals for the searchable dropdown list
  const filteredTerminalsList = useMemo(() => {
    if (!counterSearchQuery.trim()) return terminalsList;
    const q = counterSearchQuery.toLowerCase();
    return terminalsList.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.slug.toLowerCase().includes(q) || 
      (t.location && t.location.toLowerCase().includes(q))
    );
  }, [terminalsList, counterSearchQuery]);

  // Helper to normalize counter names e.g. "Register 01 (Main Counter)" -> "register 01"
  const cleanCounterKey = (name?: string) => (name || '').toLowerCase().replace(/\s*\(.*?\)/g, '').trim();

  // Helper to normalize cashier names e.g. "Uzair Jibran" vs "uzairjibran"
  const normCashierName = (name?: string) => (name || '').toLowerCase().replace(/[\s._-]+/g, '');

  // Helper to match any shift terminal_code to a configured terminal name
  const resolveTerminalName = (shiftTermCode?: string): string => {
    if (!shiftTermCode) return terminalsList[0]?.name || 'Register 01';
    const targetClean = cleanCounterKey(shiftTermCode);
    const matched = terminalsList.find(t => 
      cleanCounterKey(t.name) === targetClean ||
      t.slug.toLowerCase() === shiftTermCode.toLowerCase() ||
      t.name.toLowerCase().includes(shiftTermCode.toLowerCase()) ||
      shiftTermCode.toLowerCase().includes(t.name.toLowerCase())
    );
    return matched ? matched.name : shiftTermCode;
  };

  // Helper to calculate cashier-wise sales breakdown for any shift
  const getShiftCashierBreakdown = (shift: POSShift) => {
    const slipOrders = allOrders.filter(o => 
      o.status !== 'Voided' &&
      (o.shift_id === shift.id || (shift.business_date && o.created_at.startsWith(shift.business_date)))
    );

    const map = new Map<string, {
      name: string;
      total: number;
      cash: number;
      card: number;
      digital: number;
      ordersCount: number;
    }>();

    slipOrders.forEach(ord => {
      const rawName = ord.cashier_name || shift.cashier_name || 'Cashier';
      const normKey = normCashierName(rawName);
      if (!map.has(normKey)) {
        map.set(normKey, {
          name: rawName,
          total: 0,
          cash: 0,
          card: 0,
          digital: 0,
          ordersCount: 0
        });
      }
      const entry = map.get(normKey)!;
      const amt = Number(ord.total_amount) || 0;
      entry.total += amt;
      entry.ordersCount += 1;
      const method = (ord.payment_method || '').toLowerCase();
      if (method.includes('card')) {
        entry.card += amt;
      } else if (method.includes('digital') || method.includes('qr') || method.includes('bank') || method.includes('online')) {
        entry.digital += amt;
      } else {
        entry.cash += amt;
      }
    });

    // Check shift total sales vs orders sum
    const totalShiftSales = (shift.cash_sales || 0) + (shift.card_sales || 0) + (shift.digital_sales || 0);
    const totalOrdersSales = Array.from(map.values()).reduce((sum, e) => sum + e.total, 0);
    const remainder = Math.max(0, totalShiftSales - totalOrdersSales);

    if (remainder > 0 || map.size === 0) {
      const shiftOwnerKey = normCashierName(shift.cashier_name);
      if (!map.has(shiftOwnerKey)) {
        map.set(shiftOwnerKey, {
          name: shift.cashier_name || 'Cashier',
          total: 0,
          cash: 0,
          card: 0,
          digital: 0,
          ordersCount: 0
        });
      }
      const ownerEntry = map.get(shiftOwnerKey)!;
      ownerEntry.total += remainder;
      const remainingCash = Math.max(0, (shift.cash_sales || 0) - Array.from(map.values()).reduce((sum, e) => e === ownerEntry ? 0 : sum + e.cash, 0));
      const remainingCard = Math.max(0, (shift.card_sales || 0) - Array.from(map.values()).reduce((sum, e) => e === ownerEntry ? 0 : sum + e.card, 0));
      const remainingDigital = Math.max(0, (shift.digital_sales || 0) - Array.from(map.values()).reduce((sum, e) => e === ownerEntry ? 0 : sum + e.digital, 0));
      ownerEntry.cash += remainingCash;
      ownerEntry.card += remainingCard;
      ownerEntry.digital += remainingDigital;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  };

  // Filtered Shifts by Date, Selected Counter, and Selected Cashier
  const filteredShifts = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    return allShifts.filter((s) => {
      const shiftDate = new Date(s.opened_at);
      const shiftDateStr = shiftDate.toISOString().split('T')[0];

      if (dateFilter === 'Today' && shiftDateStr !== todayStr) return false;
      if (dateFilter === 'Yesterday' && shiftDateStr !== yesterdayStr) return false;
      if (dateFilter === 'Last7Days' && shiftDate < sevenDaysAgo) return false;
      if (dateFilter === 'Custom' && shiftDateStr !== customDate) return false;

      // Filter by Counter (normalized via posService.matchesTerminal)
      if (selectedCounter !== 'All') {
        if (!posService.matchesTerminal(s.terminal_code, selectedCounter)) {
          return false;
        }
      }

      // Filter by Cashier (matches opener or any cashier who made sales during this shift)
      if (selectedCashierFilter !== 'All') {
        const matchesOpener = normCashierName(s.cashier_name) === normCashierName(selectedCashierFilter);
        const hasCashierOrder = allOrders.some(o => 
          (o.shift_id === s.id || (s.business_date && o.created_at.startsWith(s.business_date))) &&
          normCashierName(o.cashier_name) === normCashierName(selectedCashierFilter)
        );
        if (!matchesOpener && !hasCashierOrder) {
          return false;
        }
      }

      return true;
    });
  }, [allShifts, dateFilter, customDate, selectedCounter, selectedCashierFilter, terminalsList]);

  // Cashier Performance Cards: Dynamically scoped to Selected Counter & Date Filter
  const { cashierCards, scopeTotalSales, scopeShiftsCount } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    // Shifts matching Date AND selected Counter
    const scopedShifts = allShifts.filter((s) => {
      const shiftDate = new Date(s.opened_at);
      const shiftDateStr = shiftDate.toISOString().split('T')[0];
      const bDate = s.business_date || shiftDateStr;

      if (dateFilter === 'Today' && bDate !== todayStr) return false;
      if (dateFilter === 'Yesterday' && bDate !== yesterdayStr) return false;
      if (dateFilter === 'Last7Days' && shiftDate < sevenDaysAgo) return false;
      if (dateFilter === 'Custom' && bDate !== customDate) return false;

      if (selectedCounter !== 'All') {
        const canonicalName = resolveTerminalName(s.terminal_code);
        if (cleanCounterKey(canonicalName) !== cleanCounterKey(selectedCounter)) {
          return false;
        }
      }
      return true;
    });

    // Orders matching Date AND selected Counter
    const scopedOrders = allOrders.filter((ord) => {
      if (ord.status === 'Voided') return false;
      const orderDate = new Date(ord.created_at);
      const orderDateStr = orderDate.toISOString().split('T')[0];

      if (dateFilter === 'Today' && orderDateStr !== todayStr) return false;
      if (dateFilter === 'Yesterday' && orderDateStr !== yesterdayStr) return false;
      if (dateFilter === 'Last7Days' && orderDate < sevenDaysAgo) return false;
      if (dateFilter === 'Custom' && orderDateStr !== customDate) return false;

      if (selectedCounter !== 'All') {
        const canonicalName = resolveTerminalName(ord.terminal_code);
        if (cleanCounterKey(canonicalName) !== cleanCounterKey(selectedCounter)) {
          return false;
        }
      }
      return true;
    });

    // Determine which cashiers to display:
    const map = new Map<string, { cashierName: string; role?: string; avatarColor?: string; shiftsCount: number; totalSales: number; cashSales: number; cardSales: number }>();

    if (selectedCounter !== 'All') {
      const activeTerm = terminalsList.find(t => cleanCounterKey(t.name) === cleanCounterKey(selectedCounter));
      (activeTerm?.assigned_cashiers || []).forEach(c => {
        const normKey = normCashierName(c.name);
        map.set(normKey, {
          cashierName: c.name,
          role: c.role,
          avatarColor: c.avatar_color,
          shiftsCount: 0,
          totalSales: 0,
          cashSales: 0,
          cardSales: 0
        });
      });
    } else {
      terminalsList.forEach(t => {
        (t.assigned_cashiers || []).forEach(c => {
          const normKey = normCashierName(c.name);
          if (!map.has(normKey)) {
            map.set(normKey, {
              cashierName: c.name,
              role: c.role,
              avatarColor: c.avatar_color,
              shiftsCount: 0,
              totalSales: 0,
              cashSales: 0,
              cardSales: 0
            });
          }
        });
      });
    }

    // Include any cashiers from orders
    scopedOrders.forEach(o => {
      const normKey = normCashierName(o.cashier_name);
      if (!map.has(normKey)) {
        map.set(normKey, {
          cashierName: o.cashier_name || 'Cashier',
          shiftsCount: 0,
          totalSales: 0,
          cashSales: 0,
          cardSales: 0
        });
      }
    });

    // Include any cashiers from shifts
    scopedShifts.forEach(s => {
      const normKey = normCashierName(s.cashier_name);
      if (!map.has(normKey)) {
        map.set(normKey, {
          cashierName: s.cashier_name || 'Cashier',
          shiftsCount: 0,
          totalSales: 0,
          cashSales: 0,
          cardSales: 0
        });
      }
    });

    // Populate shift counts
    scopedShifts.forEach(s => {
      const normKey = normCashierName(s.cashier_name);
      const entry = map.get(normKey);
      if (entry) {
        entry.shiftsCount += 1;
      }
    });

    // Aggregate individual completed sales directly per cashier!
    let totalVolume = 0;
    if (scopedOrders.length > 0) {
      scopedOrders.forEach(ord => {
        const normKey = normCashierName(ord.cashier_name);
        const entry = map.get(normKey);
        const amt = Number(ord.total_amount) || 0;
        totalVolume += amt;
        if (entry) {
          entry.totalSales += amt;
          const method = (ord.payment_method || '').toLowerCase();
          if (method.includes('card')) {
            entry.cardSales += amt;
          } else {
            entry.cashSales += amt;
          }
        }
      });
    } else {
      scopedShifts.forEach(s => {
        const normKey = normCashierName(s.cashier_name);
        const entry = map.get(normKey);
        const vol = (s.cash_sales || 0) + (s.card_sales || 0) + (s.digital_sales || 0);
        totalVolume += vol;
        if (entry) {
          entry.totalSales += vol;
          entry.cashSales += (s.cash_sales || 0);
          entry.cardSales += (s.card_sales || 0) + (s.digital_sales || 0);
        }
      });
    }

    return {
      cashierCards: Array.from(map.values()),
      scopeTotalSales: totalVolume,
      scopeShiftsCount: scopedShifts.length
    };
  }, [allShifts, allOrders, dateFilter, customDate, selectedCounter, terminalsList]);

  // Hierarchical Breakdown: Counter-wise -> Cashier-wise
  const hierarchicalBreakdown = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    // Shifts matching date
    const dateShifts = allShifts.filter((s) => {
      const shiftDate = new Date(s.opened_at);
      const shiftDateStr = shiftDate.toISOString().split('T')[0];

      if (dateFilter === 'Today') return shiftDateStr === todayStr;
      if (dateFilter === 'Yesterday') return shiftDateStr === yesterdayStr;
      if (dateFilter === 'Last7Days') return shiftDate >= sevenDaysAgo;
      if (dateFilter === 'Custom') return shiftDateStr === customDate;
      return true;
    });

    // Select which terminals to include
    const targetTerminals = selectedCounter === 'All'
      ? terminalsList
      : terminalsList.filter(t => cleanCounterKey(t.name) === cleanCounterKey(selectedCounter));

    return targetTerminals.map(term => {
      // Shifts on this terminal
      const termShifts = dateShifts.filter(s => 
        cleanCounterKey(resolveTerminalName(s.terminal_code)) === cleanCounterKey(term.name)
      );

      // Collect all cashiers for this counter (assigned + historical)
      const cashierMap = new Map<string, { cashierName: string; shiftsCount: number; totalSales: number; cashSales: number; cardSales: number }>();

      (term.assigned_cashiers || []).forEach(c => {
        cashierMap.set(normCashierName(c.name), {
          cashierName: c.name,
          shiftsCount: 0,
          totalSales: 0,
          cashSales: 0,
          cardSales: 0
        });
      });

      termShifts.forEach(s => {
        const key = normCashierName(s.cashier_name);
        if (!cashierMap.has(key)) {
          cashierMap.set(key, {
            cashierName: s.cashier_name || 'Cashier',
            shiftsCount: 0,
            totalSales: 0,
            cashSales: 0,
            cardSales: 0
          });
        }
        const entry = cashierMap.get(key)!;
        const vol = (s.cash_sales || 0) + (s.card_sales || 0) + (s.digital_sales || 0);
        entry.shiftsCount += 1;
        entry.totalSales += vol;
        entry.cashSales += (s.cash_sales || 0);
        entry.cardSales += (s.card_sales || 0) + (s.digital_sales || 0);
      });

      let counterSales = 0;
      let counterCash = 0;
      let counterCard = 0;
      termShifts.forEach(s => {
        counterSales += (s.cash_sales || 0) + (s.card_sales || 0) + (s.digital_sales || 0);
        counterCash += (s.cash_sales || 0);
        counterCard += (s.card_sales || 0) + (s.digital_sales || 0);
      });

      return {
        counterName: term.name,
        counterNumber: term.counter_number || 1,
        slug: term.slug,
        location: term.location || 'Store Floor',
        totalSales: counterSales,
        cashSales: counterCash,
        cardSales: counterCard,
        shiftsCount: termShifts.length,
        cashiers: Array.from(cashierMap.values())
      };
    });
  }, [allShifts, dateFilter, customDate, selectedCounter, terminalsList]);

  // Filtered Orders by Date
  const filteredOrders = useMemo(() => {
    if (dateFilter === 'All') return allOrders;

    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    return allOrders.filter((ord) => {
      const orderDate = new Date(ord.created_at);
      const orderDateStr = orderDate.toISOString().split('T')[0];

      if (dateFilter === 'Today') return orderDateStr === todayStr;
      if (dateFilter === 'Yesterday') return orderDateStr === yesterdayStr;
      if (dateFilter === 'Last7Days') return orderDate >= sevenDaysAgo;
      if (dateFilter === 'Custom') return orderDateStr === customDate;
      return true;
    });
  }, [allOrders, dateFilter, customDate]);

  // 1. Category Sales Breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, { category: string; quantity: number; revenue: number; ordersCount: number }> = {};
    let totalCatRevenue = 0;
    let totalCatPieces = 0;

    for (const ord of filteredOrders) {
      if (ord.status === 'Voided') continue;
      for (const item of ord.items || []) {
        const cat = item.category || 'General Cloth';
        if (!map[cat]) {
          map[cat] = { category: cat, quantity: 0, revenue: 0, ordersCount: 0 };
        }
        map[cat].quantity += Number(item.quantity) || 1;
        map[cat].revenue += Number(item.line_total) || 0;
        map[cat].ordersCount += 1;
        totalCatRevenue += Number(item.line_total) || 0;
        totalCatPieces += Number(item.quantity) || 1;
      }
    }

    const list = Object.values(map).map((c) => ({
      ...c,
      percentage: totalCatRevenue > 0 ? ((c.revenue / totalCatRevenue) * 100).toFixed(1) : '0',
      averagePrice: c.quantity > 0 ? Math.round(c.revenue / c.quantity) : 0
    })).sort((a, b) => b.revenue - a.revenue);

    return { list, totalRevenue: totalCatRevenue, totalPieces: totalCatPieces };
  }, [filteredOrders]);

  // 2. Top Fast-Moving Products
  const topProductsStats = useMemo(() => {
    const map: Record<string, { id: string; name: string; code: string; category: string; quantity: number; revenue: number; unitPrice: number }> = {};
    let totalRevenue = 0;

    for (const ord of filteredOrders) {
      if (ord.status === 'Voided') continue;
      for (const item of ord.items || []) {
        const key = item.product_id || item.product_code || item.product_name;
        if (!map[key]) {
          map[key] = {
            id: key,
            name: item.product_name,
            code: item.product_code,
            category: item.category || 'Cloth',
            quantity: 0,
            revenue: 0,
            unitPrice: Number(item.unit_price) || 0
          };
        }
        map[key].quantity += Number(item.quantity) || 1;
        map[key].revenue += Number(item.line_total) || 0;
        totalRevenue += Number(item.line_total) || 0;
      }
    }

    return Object.values(map)
      .map((p) => ({
        ...p,
        share: totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [filteredOrders]);

  // 3. Payment Methods Breakdown
  const paymentStats = useMemo(() => {
    let cash = { total: 0, count: 0 };
    let card = { total: 0, count: 0 };
    let digital = { total: 0, count: 0 };
    let total = 0;

    for (const ord of filteredOrders) {
      if (ord.status === 'Voided') continue;
      const amt = Number(ord.total_amount) || 0;
      total += amt;
      const method = (ord.payment_method || '').toLowerCase();
      if (method.includes('card')) {
        card.total += amt;
        card.count += 1;
      } else if (method.includes('digital') || method.includes('qr') || method.includes('bank') || method.includes('online')) {
        digital.total += amt;
        digital.count += 1;
      } else {
        cash.total += amt;
        cash.count += 1;
      }
    }

    return {
      cash: { ...cash, share: total > 0 ? ((cash.total / total) * 100).toFixed(1) : '0' },
      card: { ...card, share: total > 0 ? ((card.total / total) * 100).toFixed(1) : '0' },
      digital: { ...digital, share: total > 0 ? ((digital.total / total) * 100).toFixed(1) : '0' },
      total
    };
  }, [filteredOrders]);

  // 4. Peak Sales Hours Analysis
  const hourlyStats = useMemo(() => {
    const buckets = [
      { id: 'morning', label: '🌅 Morning (09 AM – 01 PM)', count: 0, revenue: 0 },
      { id: 'afternoon', label: '☀️ Afternoon (01 PM – 05 PM)', count: 0, revenue: 0 },
      { id: 'evening', label: '🔥 Evening Rush (05 PM – 09 PM)', count: 0, revenue: 0 },
      { id: 'night', label: '🌙 Late Night (09 PM – 12 AM)', count: 0, revenue: 0 }
    ];

    let totalRev = 0;
    for (const ord of filteredOrders) {
      if (ord.status === 'Voided') continue;
      const date = new Date(ord.created_at);
      const hour = date.getHours();
      const amt = Number(ord.total_amount) || 0;
      totalRev += amt;

      if (hour >= 9 && hour < 13) {
        buckets[0].count += 1;
        buckets[0].revenue += amt;
      } else if (hour >= 13 && hour < 17) {
        buckets[1].count += 1;
        buckets[1].revenue += amt;
      } else if (hour >= 17 && hour < 21) {
        buckets[2].count += 1;
        buckets[2].revenue += amt;
      } else {
        buckets[3].count += 1;
        buckets[3].revenue += amt;
      }
    }

    const peak = [...buckets].sort((a, b) => b.revenue - a.revenue)[0];
    return {
      buckets: buckets.map(b => ({
        ...b,
        share: totalRev > 0 ? ((b.revenue / totalRev) * 100).toFixed(1) : '0'
      })),
      peakBucket: peak,
      totalRev
    };
  }, [filteredOrders]);

  // Daily Summary Stats for the selected date filter
  const dateStats = useMemo(() => {
    let totalVolume = 0;
    let cashSales = 0;
    let cardSales = 0;
    let digitalSales = 0;
    let totalVariance = 0;

    for (const s of filteredShifts) {
      totalVariance += (s.variance || 0);
    }

    if (filteredOrders.length > 0) {
      for (const ord of filteredOrders) {
        if (ord.status === 'Voided') continue;
        const amt = Number(ord.total_amount) || 0;
        totalVolume += amt;
        const method = (ord.payment_method || '').toLowerCase();
        if (method.includes('card')) {
          cardSales += amt;
        } else if (method.includes('digital') || method.includes('qr') || method.includes('bank')) {
          digitalSales += amt;
        } else {
          cashSales += amt;
        }
      }
    } else {
      for (const s of filteredShifts) {
        cashSales += s.cash_sales || 0;
        cardSales += s.card_sales || 0;
        digitalSales += s.digital_sales || 0;
        totalVolume += (s.cash_sales || 0) + (s.card_sales || 0) + (s.digital_sales || 0);
      }
    }

    return {
      totalVolume,
      cashSales,
      cardSales,
      digitalSales,
      totalVariance,
      count: filteredShifts.length
    };
  }, [filteredShifts, filteredOrders]);

  // Refresh shifts data
  const refreshShifts = () => {
    setActiveShift(posService.getActiveShift());
    setAllShifts(posService.getAllShifts());
    setAllOrders(posService.getAllOrders());
  };

  // Open Shift
  const handleOpenShift = async () => {
    const shift = await posService.openDayShift({
      businessDate: dayOpenDate,
      cashierName: currentCashierName,
      openingPettyCash: dayOpenPettyCash,
      cashIn: dayOpenCashIn,
      cashOut: dayOpenCashOut
    });
    refreshShifts();
    setIsOpenShiftModal(false);
    toast.success(`Day opened for ${dayOpenDate}! Opening Float: Rs. ${shift.opening_float.toLocaleString()}`);
  };

  // Close Shift & Produce Z-Report
  const handleCloseShift = async () => {
    if (!activeShift) return;
    const closed = await posService.closeDayShift({
      shiftId: activeShift.id,
      cashOut: dayCloseCashOut,
      cashIn: dayCloseCashIn,
      closingNotes: dayCloseNotes
    });
    refreshShifts();
    setIsCloseShiftModal(false);
    setSelectedZReport(closed);
    toast.success(`Day closed! Remaining Petty Cash: Rs. ${(closed.closing_petty_cash || 0).toLocaleString()} carried forward.`);
  };

  // Cash In / Cash Out
  const handleRecordMovement = () => {
    if (!activeShift) return;
    if (cashInOutAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    posService.recordCashMovement(activeShift.id, cashInOutType, cashInOutAmount);
    refreshShifts();
    setIsCashInOutModal(false);
    setCashInOutAmount(0);
    setCashInOutReason('');
    toast.success(`Cash ${cashInOutType.toUpperCase()} of Rs. ${cashInOutAmount.toLocaleString()} recorded`);
  };

  // Export Active Report to Excel
  const handleExportExcel = () => {
    let rows: any[] = [];
    let sheetName = 'POS_Report';
    let fileName = `POS_Report_${Date.now()}.xlsx`;

    if (activeTab === 'category') {
      sheetName = 'Category_Sales';
      fileName = `Category_Sales_Report_${Date.now()}.xlsx`;
      rows = categoryStats.list.map((c, i) => ({
        '#': i + 1,
        'Category Name': c.category,
        'Suits / Pieces Sold': c.quantity,
        'Gross Sales (Rs.)': c.revenue,
        '% Share of Total Sales': `${c.percentage}%`,
        'Average Item Price (Rs.)': c.averagePrice
      }));
    } else if (activeTab === 'top_items') {
      sheetName = 'Top_Fast_Movers';
      fileName = `Top_Fast_Movers_${Date.now()}.xlsx`;
      rows = topProductsStats.map((p, i) => ({
        'Rank': `#${i + 1}`,
        'Product Name': p.name,
        'SKU / Code': p.code,
        'Category': p.category,
        'Quantity Sold': p.quantity,
        'Unit Price (Rs.)': p.unitPrice,
        'Gross Revenue (Rs.)': p.revenue,
        '% Contribution': `${p.share}%`
      }));
    } else if (activeTab === 'payments') {
      sheetName = 'Payment_Methods';
      fileName = `Payment_Methods_Report_${Date.now()}.xlsx`;
      rows = [
        { 'Payment Method': 'Cash Sales', 'Total Amount (Rs.)': paymentStats.cash.total, 'Transaction Count': paymentStats.cash.count, '% Share': `${paymentStats.cash.share}%` },
        { 'Payment Method': 'Card Payments', 'Total Amount (Rs.)': paymentStats.card.total, 'Transaction Count': paymentStats.card.count, '% Share': `${paymentStats.card.share}%` },
        { 'Payment Method': 'Digital / QR Pay', 'Total Amount (Rs.)': paymentStats.digital.total, 'Transaction Count': paymentStats.digital.count, '% Share': `${paymentStats.digital.share}%` }
      ];
    } else if (activeTab === 'peak_hours') {
      sheetName = 'Peak_Hours';
      fileName = `Peak_Sales_Hours_${Date.now()}.xlsx`;
      rows = hourlyStats.buckets.map((b) => ({
        'Shopping Window': b.label,
        'Orders Count': b.count,
        'Total Revenue (Rs.)': b.revenue,
        '% Share of Day': `${b.share}%`
      }));
    } else if (activeTab === 'petty_cash') {
      sheetName = 'Petty_Cash';
      fileName = `Petty_Cash_Movement_${Date.now()}.xlsx`;
      rows = filteredShifts.map((s) => ({
        'Session #': s.session_number,
        'Date': s.business_date || new Date(s.opened_at).toLocaleDateString(),
        'Counter': s.terminal_code || 'Register 01',
        'Cashier': s.cashier_name,
        'Opening Petty Cash (Rs.)': s.opening_petty_cash ?? s.opening_float,
        'Daily Cash Sales (Rs.)': s.cash_sales,
        'Cash In (Rs.)': s.cash_in,
        'Cash Out / Drop (Rs.)': s.cash_out,
        'Closing Petty Cash Carried Forward (Rs.)': s.closing_petty_cash ?? '-',
        'Status': s.status
      }));
    } else {
      sheetName = 'Z_Report_Shifts';
      fileName = `POS_Shift_Sessions_${Date.now()}.xlsx`;
      rows = filteredShifts.map((s) => ({
        'Session #': s.session_number,
        'Cashier': s.cashier_name,
        'Date': s.business_date || new Date(s.opened_at).toLocaleDateString(),
        'Opening Float': s.opening_float,
        'Cash Sales': s.cash_sales,
        'Card Sales': s.card_sales,
        'Digital Sales': s.digital_sales,
        'Total Sales': s.cash_sales + s.card_sales + s.digital_sales,
        'Cash In': s.cash_in,
        'Cash Out': s.cash_out,
        'Closing Petty Cash': s.closing_petty_cash ?? '-',
        'Expected Cash': s.expected_cash,
        'Variance': s.variance ?? 0,
        'Status': s.status
      }));
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    const buf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), fileName);
    toast.success(`Exported ${sheetName.replace(/_/g, ' ')} to Excel!`);
  };

  return (
    <div className="space-y-6 animate-fadeIn p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => { if (onBack) onBack(); else navigate('/pos/terminal'); }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="Return to POS Terminal"
          >
            <LuArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <LuBarChart3 className="text-primary" />
              <span>POS Reports & Sales Dashboard</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Category sales, top fast-movers, payment breakdown, peak shopping hours, and daily Z-reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <LuFileSpreadsheet size={15} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Report Navigation Tabs (Default Current Report placed FIRST!) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'zreport', label: 'Daily Z-Report & Shift Summary', badge: 'Default' },
          { id: 'category', label: 'Category-Wise Sales', badge: `${categoryStats.list.length} Cats` },
          { id: 'top_items', label: 'Top Fast-Movers', badge: `${topProductsStats.length} Items` },
          { id: 'payments', label: 'Payment Breakdown', badge: 'Cash & Digital' },
          { id: 'peak_hours', label: 'Peak Sales Trends', badge: 'Hourly' },
          { id: 'petty_cash', label: 'Petty Cash & Movement', badge: 'Audit' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition duration-150 cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'shadow-sm'
                  : 'bg-white dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: accentColor,
                      color: contrastText,
                      border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                    }
                  : undefined
              }
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-black/10 dark:bg-white/15 text-current' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Global Date Filter & Unified KPI Bar (Applies to all reports) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <LuFilter className="text-primary" size={16} />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Filter Reporting Period:
            </span>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold ml-2">
              {(['All', 'Today', 'Yesterday', 'Last7Days'] as const).map((mode) => {
                const label = mode === 'All' ? 'All Dates' : mode === 'Last7Days' ? '7 Days' : mode;
                const isSelected = dateFilter === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDateFilter(mode)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                      isSelected
                        ? 'shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: accentColor,
                            color: contrastText,
                            border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                          }
                        : undefined
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
            <LuCalendar size={14} className="text-slate-400 shrink-0" />
            <span className="text-[11px] text-slate-400 font-medium">Custom:</span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateFilter('Custom');
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Global KPI Strip */}
        <div className="bg-slate-50 dark:bg-[#0c1017] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross Sales Revenue</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-base">
                Rs. {categoryStats.totalRevenue > 0 ? categoryStats.totalRevenue.toLocaleString() : dateStats.totalVolume.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Suits / Items Sold</span>
              <span className="font-extrabold text-slate-900 dark:text-white font-mono text-base">
                {categoryStats.totalPieces > 0 ? categoryStats.totalPieces : filteredOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0)} Pieces
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cash Collected</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono text-base">
                Rs. {paymentStats.cash.total > 0 ? paymentStats.cash.total.toLocaleString() : dateStats.cashSales.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Top Category</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                {categoryStats.list[0]?.category || 'Cloth Collection'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          TAB 1: DEFAULT CURRENT REPORT (DAILY Z-REPORT & SHIFT SUMMARY)
         ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'zreport' && (
        <div className="space-y-6">
          {/* Active Shift Overview Card */}
          {activeShift ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 p-5 sm:p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
                    #{activeShift.session_number}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Current Active Shift
                  </h3>
                  {(() => {
                    const stale = posService.getStaleShift();
                    const isStale = Boolean(stale && stale.id === activeShift.id);
                    return (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                        isStale ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                      }`}>
                        {isStale ? 'OVERDUE (FROM PREVIOUS DAY)' : 'OPEN'}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Opened {new Date(activeShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by <strong className="text-slate-700 dark:text-slate-300">{activeShift.cashier_name}</strong>
                </p>
              </div>
            </div>

            {/* Quick Shift Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCashInOutType('in');
                  setIsCashInOutModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <LuPlus size={14} />
                <span>Cash In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCashInOutType('out');
                  setIsCashInOutModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <LuMinus size={14} />
                <span>Cash Out</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActualCountedCash(activeShift.expected_cash);
                  setIsCloseShiftModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <LuLock size={14} />
                <span>Close Shift (Z-Report)</span>
              </button>
            </div>
          </div>

          {(() => {
            const stale = posService.getStaleShift();
            if (!stale || stale.id !== activeShift.id) return null;
            return (
              <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <LuAlertTriangle className="text-amber-500 shrink-0 text-lg" />
                  <span>
                    This shift belongs to a previous date (<strong>{posService.getShiftBusinessDate(stale)}</strong>) and was not closed. Please close this shift and generate the Z-Report so today's transactions remain accurate.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActualCountedCash(activeShift.expected_cash);
                    setIsCloseShiftModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-xs"
                >
                  Close Shift Now
                </button>
              </div>
            );
          })()}

          {/* Shift Financial Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Opening Float
              </span>
              <div className="text-base font-extrabold font-mono text-slate-800 dark:text-slate-200 mt-1">
                Rs. {activeShift.opening_float.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                Cash Sales
              </span>
              <div className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                Rs. {activeShift.cash_sales.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                Card (POS) Sales
              </span>
              <div className="text-base font-extrabold font-mono text-sky-600 dark:text-sky-400 mt-1">
                Rs. {activeShift.card_sales.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
                Digital / QR Sales
              </span>
              <div className="text-base font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-1">
                Rs. {activeShift.digital_sales.toLocaleString()}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cash Movement
              </span>
              <div className="text-xs font-bold font-mono text-slate-600 dark:text-slate-400 mt-1.5 flex items-center justify-between">
                <span className="text-emerald-500">+{activeShift.cash_in}</span>
                <span className="text-rose-500">-{activeShift.cash_out}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Expected in Drawer
              </span>
              <div className="text-base font-black font-mono text-amber-600 dark:text-amber-300 mt-1">
                Rs. {activeShift.expected_cash.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No active shift card */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-2xl">
            <LuLock size={28} />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No Register Shift Currently Open
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Start a shift with your initial cash drawer float to record transactions and enable cash reconciliation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpenShiftModal(true)}
            className="px-6 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition shadow-md cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: accentColor,
              color: contrastText,
              border: isAccentWhite ? '1px solid #cbd5e1' : undefined
            }}
          >
            Start New Register Shift
          </button>
        </div>
      )}

      {/* Shifts History & Daily Z-Report Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] shadow-sm overflow-hidden">
        {/* Section Header with Date and Counter Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <LuClock className="text-primary" />
              <span>Shift Reconciliation & Daily Z-Report History</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Filter by date and counter to view register performance and reprint official daily close summaries.
            </p>
          </div>

          {/* Filter Controls: Searchable Counter Dropdown & Date Range */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Searchable Counter Dropdown */}
            <div className="relative" ref={counterDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsCounterDropdownOpen(prev => !prev);
                  setCounterSearchQuery('');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition cursor-pointer shadow-2xs"
                title="Select Counter"
              >
                <LuStore size={14} className="text-primary shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-[200px]">
                  {selectedCounter === 'All' ? 'All Counters (Overall)' : selectedCounter}
                </span>
                <LuChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 ${isCounterDropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Searchable Popover Menu */}
              {isCounterDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl p-2 animate-fadeIn space-y-1.5"
                  style={{ zIndex: 9999 }}
                >
                  {/* Search Input */}
                  <div className="relative">
                    <LuSearch size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={counterSearchQuery}
                      onChange={(e) => setCounterSearchQuery(e.target.value)}
                      placeholder="Search counter..."
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-0.5">
                    {/* All Counters option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCounter('All');
                        setSelectedCashierFilter('All');
                        setIsCounterDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                        selectedCounter === 'All'
                          ? 'bg-primary/10 text-primary font-black'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <LuStore size={14} />
                        <span>All Counters (Store Overall)</span>
                      </div>
                      {selectedCounter === 'All' && <LuCheck size={14} className="text-primary shrink-0" />}
                    </button>

                    {/* Filtered Terminals */}
                    {filteredTerminalsList.map((t) => {
                      const isSelected = selectedCounter === t.name;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelectedCounter(t.name);
                            setSelectedCashierFilter('All');
                            setIsCounterDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-black'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div>{t.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              /{t.slug} • {t.assigned_cashiers?.length || 0} cashiers
                            </div>
                          </div>
                          {isSelected && <LuCheck size={14} className="text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold">
              {(['All', 'Today', 'Yesterday', 'Last7Days'] as const).map((mode) => {
                const label = mode === 'All' ? 'All Dates' : mode === 'Last7Days' ? '7 Days' : mode;
                const isSelected = dateFilter === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setDateFilter(mode)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                      isSelected
                        ? 'shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: accentColor,
                            color: contrastText,
                            border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                          }
                        : undefined
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Picker */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60">
              <LuCalendar size={13} className="text-slate-400 shrink-0" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setDateFilter('Custom');
                }}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Cashier Performance Cards (Dynamically scoped to selected counter) */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c1017]/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <LuUser className="text-primary" size={14} />
              <span>
                {selectedCounter === 'All' ? 'All Cashiers Performance (Store-Wide)' : `Cashiers for ${selectedCounter}`}
              </span>
            </span>

            <span className="text-[10px] text-slate-400 font-medium">
              Click any cashier card to filter shifts below
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* All Staff / All Cashiers Card */}
            <button
              type="button"
              onClick={() => setSelectedCashierFilter('All')}
              className={`p-3.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                selectedCashierFilter === 'All'
                  ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                  : 'bg-white dark:bg-[#111622] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  👥 All Cashiers
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {selectedCounter === 'All' ? 'Overall' : 'Counter Total'}
                </span>
              </div>
              <div className="mt-2.5">
                <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  Rs. {scopeTotalSales.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  {cashierCards.length} cashiers assigned • {scopeShiftsCount} {scopeShiftsCount === 1 ? 'shift' : 'shifts'}
                </div>
              </div>
            </button>

            {/* Individual Cashier Cards */}
            {cashierCards.map((c) => {
              const isSelected = normCashierName(selectedCashierFilter) === normCashierName(c.cashierName);
              const percent = scopeTotalSales > 0 ? ((c.totalSales / scopeTotalSales) * 100).toFixed(0) : '0';

              return (
                <button
                  key={c.cashierName}
                  type="button"
                  onClick={() => setSelectedCashierFilter(c.cashierName)}
                  className={`p-3.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                      : 'bg-white dark:bg-[#111622] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 truncate pr-2 capitalize">
                      👤 {c.cashierName}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${
                      c.totalSales > 0
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}>
                      {percent}% Share
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-lg font-black font-mono text-slate-900 dark:text-white">
                      Rs. {c.totalSales.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center justify-between">
                      <span>{c.shiftsCount} {c.shiftsCount === 1 ? 'shift' : 'shifts'}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Rs. {c.cashSales.toLocaleString()} cash
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Filter Summary KPI Strip */}
        <div className="bg-slate-50 dark:bg-[#0c1017] px-4 py-3 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-medium">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Filtered Sessions</span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono text-sm">
                {dateStats.count} {dateStats.count === 1 ? 'Shift' : 'Shifts'}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Sales Volume</span>
              <span className="font-extrabold text-slate-900 dark:text-white font-mono text-sm">
                Rs. {dateStats.totalVolume.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-500 block tracking-wider">Cash Sales</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                Rs. {dateStats.cashSales.toLocaleString()}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-500 block tracking-wider">Card / Digital</span>
              <span className="font-extrabold text-sky-600 dark:text-sky-400 font-mono text-sm">
                Rs. {(dateStats.cardSales + dateStats.digitalSales).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(dateFilter !== 'All' || selectedCounter !== 'All' || selectedCashierFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setDateFilter('All');
                  setSelectedCounter('All');
                  setSelectedCashierFilter('All');
                }}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMergedSlipOpen(true)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
              title="Print Merged Daily Slip (Counter & Cashier Breakdown)"
            >
              <LuReceipt size={14} className="text-primary" />
              <span>
                {selectedCashierFilter !== 'All'
                  ? `Print Slip: ${selectedCashierFilter}`
                  : 'Merged Daily Slip'}
              </span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Session #</th>
                <th className="py-3 px-4">Counter</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Time Span</th>
                <th className="py-3 px-4">Opening Float</th>
                <th className="py-3 px-4">Cash Sales</th>
                <th className="py-3 px-4">Total Shift Volume</th>
                <th className="py-3 px-4">Variance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Z-Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    <LuCalendar className="mx-auto text-2xl mb-2 opacity-40" />
                    <p className="font-bold text-sm text-slate-600 dark:text-slate-300">No shift sessions found for this date.</p>
                    <p className="text-xs text-slate-400 mt-1">Try selecting another date or click "All Dates".</p>
                  </td>
                </tr>
              ) : (
                filteredShifts.map((s) => {
                const totalVol = s.cash_sales + s.card_sales + s.digital_sales;
                const isClosed = s.status === 'Closed';

                return (
                  <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      #{s.session_number}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                        <LuStore size={11} />
                        <span>{resolveTerminalName(s.terminal_code)}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {(() => {
                        const breakdown = getShiftCashierBreakdown(s);
                        if (breakdown.length <= 1) {
                          return (
                            <div>
                              <span className="capitalize">{breakdown[0]?.name || s.cashier_name}</span>
                              <div className="text-[10px] text-slate-400 font-normal">
                                Rs. {(breakdown[0]?.total ?? totalVol).toLocaleString()}
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="flex flex-col gap-1 py-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-primary px-1.5 py-0.2 rounded bg-primary/10">
                                {breakdown.length} Cashiers Active
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {breakdown.map((c) => (
                                <span
                                  key={c.name}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] border border-slate-200/80 dark:border-slate-700/60 font-medium"
                                  title={`${c.name}: Rs. ${c.total.toLocaleString()} (${c.ordersCount} sales)`}
                                >
                                  <span className="capitalize text-slate-700 dark:text-slate-200 font-bold">{c.name}:</span>
                                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                    Rs. {c.total.toLocaleString()}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      <div>{new Date(s.opened_at).toLocaleDateString()}</div>
                      <div className="font-mono">
                        {new Date(s.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {s.closed_at ? new Date(s.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Open'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      Rs. {s.opening_float.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      Rs. {s.cash_sales.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      Rs. {totalVol.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {s.variance !== undefined ? (
                        <span className={s.variance === 0 ? 'text-emerald-500' : s.variance > 0 ? 'text-blue-500' : 'text-rose-500'}>
                          {s.variance >= 0 ? `+${s.variance}` : s.variance}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isClosed ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isClosed ? (
                        <button
                          type="button"
                          onClick={() => setSelectedZReport(s)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <LuFileText size={13} />
                          <span>View Slip</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Active</span>
                      )}
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          TAB 2: CATEGORY-WISE SALES REPORT
         ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'category' && (
        <div className="space-y-6">
          {/* Category Progress Bar */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <LuPieChart size={16} className="text-primary" />
                <span>Category Sales Distribution (% of Total Business)</span>
              </span>
              <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                Total: Rs. {categoryStats.totalRevenue.toLocaleString()}
              </span>
            </div>

            {/* Multi-colored Visual Distribution Bar */}
            <div className="h-4 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
              {categoryStats.list.map((c, i) => {
                const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-purple-500'];
                return (
                  <div
                    key={c.category}
                    style={{ width: `${c.percentage}%` }}
                    className={`${colors[i % colors.length]} transition-all duration-500`}
                    title={`${c.category}: ${c.percentage}% (Rs. ${c.revenue.toLocaleString()})`}
                  />
                );
              })}
            </div>

            {/* Category Badges Legend */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {categoryStats.list.map((c, i) => {
                const dotColors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-purple-500'];
                return (
                  <div key={c.category} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <span className={`w-2.5 h-2.5 rounded-full ${dotColors[i % dotColors.length]}`} />
                    <span>{c.category}</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{c.percentage}%</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryStats.list.map((c, i) => (
              <div
                key={c.category}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] p-5 shadow-sm space-y-4 hover:border-primary/40 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      #{i + 1}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {c.category}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {c.ordersCount} sales ticket(s)
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {c.percentage}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Sales</span>
                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                      Rs. {c.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Suits Sold</span>
                    <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                      {c.quantity} Suits
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] flex items-center justify-between text-slate-600 dark:text-slate-400 font-medium">
                  <span>Average Selling Price:</span>
                  <strong className="font-mono text-slate-900 dark:text-white">Rs. {c.averagePrice.toLocaleString()}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Category Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <LuTag className="text-primary" />
                <span>Detailed Category Sales Breakdown</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {categoryStats.list.length} Categories Analyzed
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4"># Rank</th>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4">Suits / Pieces Sold</th>
                    <th className="py-3 px-4">Gross Revenue (PKR)</th>
                    <th className="py-3 px-4">% Share of Sales</th>
                    <th className="py-3 px-4">Average Price / Suit</th>
                    <th className="py-3 px-4 text-right">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {categoryStats.list.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No category sales recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    categoryStats.list.map((c, i) => (
                      <tr key={c.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-bold font-mono">#{i + 1}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                          {c.category}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">{c.quantity} Suits</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Rs. {c.revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-primary">
                          {c.percentage}%
                        </td>
                        <td className="py-3 px-4 font-mono">Rs. {c.averagePrice.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            i === 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {i === 0 ? '🏆 Top Category' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          TAB 3: TOP FAST-MOVING ITEMS
         ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'top_items' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <LuTrendingUp className="text-emerald-500" />
                <span>Top Fast-Moving Boutique Items</span>
              </h3>
              <span className="text-xs text-slate-400">Ranked by volume & revenue</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Article / Product Name</th>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Suits Sold</th>
                    <th className="py-3 px-4">Retail Price</th>
                    <th className="py-3 px-4">Total Revenue</th>
                    <th className="py-3 px-4 text-right">Revenue Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {topProductsStats.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No product sales recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    topProductsStats.map((p, i) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-bold font-mono">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs ${
                            i === 0 ? 'bg-amber-500 text-white font-black' : i === 1 ? 'bg-slate-300 text-slate-800 font-bold' : i === 2 ? 'bg-amber-700 text-white font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                          }`}>
                            #{i + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">
                          {p.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{p.code}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {p.quantity} Suits
                        </td>
                        <td className="py-3 px-4 font-mono">Rs. {p.unitPrice.toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Rs. {p.revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-primary">
                          {p.share}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          TAB 4: PAYMENT METHODS BREAKDOWN
         ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cash Card */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <LuBanknote size={18} />
                  <span>Cash Payments</span>
                </span>
                <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                  {paymentStats.cash.share}%
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                Rs. {paymentStats.cash.total.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {paymentStats.cash.count} transaction(s) recorded in cash drawer
              </div>
            </div>

            {/* Card Card */}
            <div className="rounded-2xl border border-sky-500/30 bg-sky-50/20 dark:bg-sky-950/10 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300 flex items-center gap-2">
                  <LuCreditCard size={18} />
                  <span>Debit / Credit Cards</span>
                </span>
                <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-sky-500 text-white">
                  {paymentStats.card.share}%
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                Rs. {paymentStats.card.total.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {paymentStats.card.count} transaction(s) settled via card POS machine
              </div>
            </div>

            {/* Digital / QR Card */}
            <div className="rounded-2xl border border-purple-500/30 bg-purple-50/20 dark:bg-purple-950/10 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <LuQrCode size={18} />
                  <span>Digital / QR Pay</span>
                </span>
                <span className="text-xs font-black font-mono px-2 py-0.5 rounded-full bg-purple-500 text-white">
                  {paymentStats.digital.share}%
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                Rs. {paymentStats.digital.total.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                {paymentStats.digital.count} transaction(s) via Raast, JazzCash, or Nayapay
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          TAB 5: PEAK SALES TRENDS & HOURLY SHOPPING RUSH
         ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'peak_hours' && (
        <div className="space-y-6">
          {/* Peak Shopping Highlight Banner */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/10 p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
                <LuClock size={20} />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Busiest Retail Shopping Window
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <strong>{hourlyStats.peakBucket?.label || 'Evening Rush'}</strong> generates the highest sales revenue.
                </p>
              </div>
            </div>
            <span className="text-sm font-black font-mono text-amber-600">
              Rs. {(hourlyStats.peakBucket?.revenue || 0).toLocaleString()}
            </span>
          </div>

          {/* Time Windows Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {hourlyStats.buckets.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] p-5 shadow-sm space-y-3"
              >
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {b.label}
                </span>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  Rs. {b.revenue.toLocaleString()}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{b.count} Orders</span>
                  <span className="font-bold text-primary font-mono">{b.share}% of Sales</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${b.share}%` }}
                    className="h-full bg-primary transition-all duration-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          TAB 6: PETTY CASH & DRAWER MOVEMENT SUMMARY
         ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'petty_cash' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] p-5 shadow-sm space-y-2">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <LuCoins className="text-amber-500" />
              <span>Petty Cash Accounting & Carry Forward Flow</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Formula: <strong className="text-slate-800 dark:text-slate-200">The Sale - Cash Out + Cash In + Opening Petty Cash = Remaining Petty Cash</strong>. This remaining cash is automatically saved and auto-fills tomorrow morning's Day Open.
            </p>
          </div>

          {/* Petty Cash Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Session #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Opening Petty Cash</th>
                    <th className="py-3 px-4">Daily Cash Sales</th>
                    <th className="py-3 px-4">Cash Out (Drop)</th>
                    <th className="py-3 px-4">Cash In</th>
                    <th className="py-3 px-4">Closing Petty Cash (Carried Over)</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {filteredShifts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No shift movements found for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredShifts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-bold font-mono">#{s.session_number}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {s.business_date || new Date(s.opened_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-medium">{s.cashier_name}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          Rs. {(s.opening_petty_cash ?? s.opening_float).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          Rs. {s.cash_sales.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-500 font-bold">
                          Rs. {(s.cash_out || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-500 font-bold">
                          Rs. {(s.cash_in || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-amber-600 dark:text-amber-400">
                          {s.closing_petty_cash !== undefined ? `Rs. ${s.closing_petty_cash.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'Closed' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-600'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Day Open Modal */}
      {isOpenShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <LuUnlock className="text-emerald-500" size={18} />
                <span>Day Open (Petty Cash & Initial Change)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsOpenShiftModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Date Input */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Business Date:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Select Operating Day</span>
                </label>
                <input
                  type="date"
                  value={dayOpenDate}
                  onChange={(e) => handleDayOpenDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Opening Petty Cash */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Opening Petty Cash (Rs.):</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {pettyCashSource}
                  </span>
                </label>
                <input
                  type="number"
                  value={dayOpenPettyCash || ''}
                  onChange={(e) => setDayOpenPettyCash(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-base font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Cash In */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Cash In (Rs.):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Drawer change / extra cash</span>
                </label>
                <input
                  type="number"
                  value={dayOpenCashIn || ''}
                  onChange={(e) => setDayOpenCashIn(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Cash Out (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Cash Out (Optional) (Rs.):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Initial withdrawal if any</span>
                </label>
                <input
                  type="number"
                  value={dayOpenCashOut || ''}
                  onChange={(e) => setDayOpenCashOut(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Calculated Starting Balance Card */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Calculated Starting Drawer Float
                </span>
                <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                  Rs. {((Number(dayOpenPettyCash) || 0) + (Number(dayOpenCashIn) || 0) - (Number(dayOpenCashOut) || 0)).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  Petty Cash (Rs. {Number(dayOpenPettyCash).toLocaleString()}) + Cash In (Rs. {Number(dayOpenCashIn).toLocaleString()}) - Cash Out (Rs. {Number(dayOpenCashOut).toLocaleString()})
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOpenShiftModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenShift}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer hover:opacity-90 bg-emerald-600 hover:bg-emerald-700"
              >
                Open Day Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Day Close Modal */}
      {isCloseShiftModal && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <LuLock className="text-rose-500" size={18} />
                <span>Day Close & Petty Cash Carry Forward</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCloseShiftModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Closing Date */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Closing Date:</span>
                  <span className="text-[10px] text-slate-400 font-normal">Day being closed</span>
                </label>
                <input
                  type="date"
                  value={dayCloseDate}
                  onChange={(e) => setDayCloseDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Day Figures Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Today's Cash Sales
                  </span>
                  <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                    Rs. {(activeShift.cash_sales || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Opening Petty Cash
                  </span>
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                    Rs. {(activeShift.opening_petty_cash ?? activeShift.opening_float ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Cash Out Input (Sales Collection / Bank Deposit) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Cash Out (Owner Payout / Bank Deposit) (Rs.):</span>
                  <span className="text-[10px] text-rose-500 font-bold">Subtracted (-)</span>
                </label>
                <input
                  type="number"
                  value={dayCloseCashOut || ''}
                  onChange={(e) => setDayCloseCashOut(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Cash In Input (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Cash In (Optional) (Rs.):</span>
                  <span className="text-[10px] text-emerald-500 font-bold">Added (+)</span>
                </label>
                <input
                  type="number"
                  value={dayCloseCashIn || ''}
                  onChange={(e) => setDayCloseCashIn(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Formula & Remaining Petty Cash Card */}
              {(() => {
                const sales = activeShift.cash_sales || 0;
                const openPetty = activeShift.opening_petty_cash ?? activeShift.opening_float ?? 0;
                const remainingPetty = Math.max(0, sales - (Number(dayCloseCashOut) || 0) + (Number(dayCloseCashIn) || 0) + openPetty);
                return (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Calculated Closing Petty Cash (Carried to Next Day)
                    </span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                      Rs. {remainingPetty.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Sale (Rs. {sales.toLocaleString()}) - Cash Out (Rs. {Number(dayCloseCashOut).toLocaleString()}) + Cash In (Rs. {Number(dayCloseCashIn).toLocaleString()}) + Opening Petty (Rs. {openPetty.toLocaleString()})
                    </div>
                  </div>
                );
              })()}

              {/* Closing Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Closing Notes (Optional):
                </label>
                <input
                  type="text"
                  value={dayCloseNotes}
                  onChange={(e) => setDayCloseNotes(e.target.value)}
                  placeholder="e.g. End of day reconciliation by Alex"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCloseShiftModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseShift}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer hover:opacity-90 bg-rose-600 hover:bg-rose-700"
              >
                Confirm & Close Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: CASH IN / CASH OUT MODAL
         ───────────────────────────────────────────────────────────── */}
      {isCashInOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Record Cash {cashInOutType === 'in' ? 'In (+)' : 'Out (-)'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCashInOutModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Amount (Rs.):
                </label>
                <input
                  type="number"
                  value={cashInOutAmount || ''}
                  onChange={(e) => setCashInOutAmount(Number(e.target.value) || 0)}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2 text-sm font-bold font-mono rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Reason / Description:
                </label>
                <input
                  type="text"
                  value={cashInOutReason}
                  onChange={(e) => setCashInOutReason(e.target.value)}
                  placeholder="e.g. Petty cash / vendor payment"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCashInOutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRecordMovement}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                style={{
                  backgroundColor: accentColor,
                  color: contrastText,
                  border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

            {/* ─────────────────────────────────────────────────────────────
          MODAL: MERGED DAILY SLIP (COUNTER-WISE & CASHIER-WISE BREAKDOWN)
         ───────────────────────────────────────────────────────────── */}
      {isMergedSlipOpen && createPortal(
        <div 
          onClick={() => setIsMergedSlipOpen(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <LuReceipt className="text-primary" />
                <span>
                  {selectedCashierFilter !== 'All'
                    ? `Cashier Sales Slip (${selectedCashierFilter})`
                    : 'Merged Daily Register Slip'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsMergedSlipOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Thermal Print Slip Preview */}
            <div className="flex-1 overflow-y-auto p-4">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-merged-slip, #printable-merged-slip * {
                    visibility: visible !important;
                  }
                  #printable-merged-slip {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 78mm !important;
                    margin: 0 !important;
                    padding: 8px !important;
                    background: white !important;
                    color: black !important;
                  }
                }
              `}} />
              <div id="printable-merged-slip" className="bg-white text-black p-4 rounded-sm font-mono text-xs space-y-2.5 border border-slate-300 shadow-sm print:border-none print:shadow-none print:p-0">
                {/* Store Header */}
                <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-black">
                  <h4 className="font-extrabold text-sm uppercase">{posConfig.store_title}</h4>
                  <p className="text-[10px] font-bold">
                    {selectedCashierFilter !== 'All'
                      ? 'OFFICIAL CASHIER AUDIT SLIP'
                      : 'STORE-WIDE DAILY CONSOLIDATED SLIP'}
                  </p>
                  <p className="text-[10px]">
                    PERIOD: {dateFilter === 'All' ? 'ALL DATES' : dateFilter === 'Today' ? 'TODAY' : dateFilter}
                  </p>
                  <p className="text-[9px] text-slate-500">
                    Printed: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* SCENARIO 1: TARGETED SPECIFIC CASHIER */}
                {selectedCashierFilter !== 'All' ? (() => {
                  const targetedTerminal = terminalsList.find((t) =>
                    (t.assigned_cashiers || []).some((c: any) => normCashierName(c.name) === normCashierName(selectedCashierFilter))
                  ) || (filteredShifts.length > 0 ? terminalsList.find(t => cleanCounterKey(t.name) === cleanCounterKey(filteredShifts[0].terminal_code)) : null) || terminalsList[0];

                  return (
                    <div className="space-y-2">
                      <div className="py-1.5 border-b border-dashed border-black space-y-1 text-[11px]">
                        <div className="flex justify-between">
                          <span className="font-bold">TARGETED CASHIER:</span>
                          <span className="font-extrabold uppercase">{selectedCashierFilter}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Counter Number:</span>
                          <span className="font-extrabold font-mono">Counter #{targetedTerminal?.counter_number || 1}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Counter Name:</span>
                          <span className="font-bold">{targetedTerminal?.name || (selectedCounter !== 'All' ? selectedCounter : resolveTerminalName(filteredShifts[0]?.terminal_code))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sessions Worked:</span>
                          <span>{filteredShifts.length} Shifts</span>
                        </div>
                      </div>

                      {/* Financials for Targeted Cashier */}
                      <div className="py-1.5 border-b border-dashed border-black space-y-1 text-[11px]">
                        <div className="flex justify-between font-bold text-xs pt-0.5">
                          <span>TOTAL CASHIER SALES:</span>
                          <span>Rs. {dateStats.totalVolume.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Cash Collected:</span>
                          <span>Rs. {dateStats.cashSales.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Card / Digital:</span>
                          <span>Rs. {(dateStats.cardSales + dateStats.digitalSales).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Cash Variance:</span>
                          <span>{dateStats.totalVariance >= 0 ? `+${dateStats.totalVariance}` : dateStats.totalVariance}</span>
                        </div>
                      </div>

                      {/* Itemized Sessions list for this cashier */}
                      <div className="py-1 text-[10px] space-y-1">
                        <p className="font-bold uppercase tracking-wider text-[10px] pb-0.5 border-b border-dotted border-black/40">
                          CASHIER SESSIONS BREAKDOWN
                        </p>
                        {filteredShifts.length === 0 ? (
                          <p className="text-slate-500 italic py-1">No shifts recorded for this cashier in selected date.</p>
                        ) : (
                          filteredShifts.map((s) => (
                            <div key={s.id} className="flex justify-between">
                              <span>#{s.session_number} ({new Date(s.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                              <span className="font-bold">Rs. {(s.cash_sales + s.card_sales + s.digital_sales).toLocaleString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  /* SCENARIO 2: ALL CASHIERS - COUNTER-WISE & IN EVERY COUNTER CASHIER-WISE */
                  <div className="space-y-2.5">
                    {/* Overall Summary Box */}
                    <div className="py-1.5 border-b border-dashed border-black space-y-1 text-[11px]">
                      <div className="flex justify-between font-extrabold text-xs">
                        <span>STORE TOTAL SALES:</span>
                        <span>Rs. {dateStats.totalVolume.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Cash Sales:</span>
                        <span>Rs. {dateStats.cashSales.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Card / Digital:</span>
                        <span>Rs. {(dateStats.cardSales + dateStats.digitalSales).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Shifts Recorded:</span>
                        <span>{dateStats.count} Sessions</span>
                      </div>
                    </div>

                    {/* Counter-Wise & In every counter Cashier-Wise Section */}
                    <div className="space-y-2.5">
                      <p className="font-bold uppercase tracking-wider text-[10px] text-center bg-black/5 py-0.5">
                        *** COUNTER & CASHIER BREAKDOWN ***
                      </p>

                      {hierarchicalBreakdown.map((counter) => (
                        <div key={counter.counterName} className="p-1.5 border border-dashed border-black/60 space-y-1 text-[11px]">
                          {/* Counter Header */}
                          <div className="flex justify-between font-extrabold pb-0.5 border-b border-dotted border-black">
                            <span>COUNTER {counter.counterNumber}: {counter.counterName}</span>
                            <span>Rs. {counter.totalSales.toLocaleString()}</span>
                          </div>

                          {/* Cashiers inside this Counter */}
                          <div className="pt-0.5 space-y-0.5 text-[10px]">
                            {counter.cashiers.map((cashier) => (
                              <div key={cashier.cashierName} className="flex justify-between pl-2">
                                <span className="truncate max-w-[170px]">
                                  • {cashier.cashierName} ({cashier.shiftsCount} {cashier.shiftsCount === 1 ? 'shift' : 'shifts'})
                                </span>
                                <span className="font-bold font-mono">
                                  Rs. {cashier.totalSales.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between text-[10px] text-slate-600 pt-1 border-t border-dotted border-black/30">
                            <span>Counter Cash: Rs. {counter.cashSales.toLocaleString()}</span>
                            <span>Card: Rs. {counter.cardSales.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center pt-2 text-[9px] text-slate-500 border-t border-dashed border-black">
                  *** END OF REPORT ***
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsMergedSlipOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                style={{
                  backgroundColor: accentColor,
                  color: contrastText
                }}
              >
                <LuPrinter size={14} />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: Z-REPORT THERMAL SLIP PREVIEW
         ───────────────────────────────────────────────────────────── */}
      {selectedZReport && createPortal(
        <div 
          onClick={() => setSelectedZReport(null)}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 animate-fadeIn overflow-y-auto"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[92vh] flex flex-col my-auto rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scaleIn"
          >
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <LuFileText className="text-primary" size={16} />
                <span>Daily Z-Report Slip #{selectedZReport.session_number}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedZReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Thermal Print Receipt & Scrollable Canvas */}
            <div className="flex-1 overflow-y-auto p-4 pb-8 bg-slate-100 dark:bg-[#0c1017] flex justify-center items-start">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-zreport-slip, #printable-zreport-slip * {
                    visibility: visible !important;
                  }
                  #printable-zreport-slip {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 78mm !important;
                    margin: 0 !important;
                    padding: 8px 8px 36px 8px !important;
                    background: white !important;
                    color: black !important;
                    box-shadow: none !important;
                    border: none !important;
                    page-break-after: avoid !important;
                  }
                }
              `}} />
              <div id="printable-zreport-slip" className="w-full max-w-[340px] bg-white text-black p-5 pb-6 font-mono text-xs space-y-2.5 rounded-md border border-slate-300 shadow-md print:border-none print:shadow-none print:p-0 print:max-w-none">
              <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-black">
                <h4 className="font-extrabold text-sm uppercase">{posConfig.store_title}</h4>
                <p className="text-[10px]">DAILY Z-REPORT • CASHIER CLOSE</p>
                <p className="text-[10px]">Terminal: {resolveTerminalName(selectedZReport.terminal_code)}</p>
                {(() => {
                  const breakdown = getShiftCashierBreakdown(selectedZReport);
                  const cashierNames = breakdown.map(c => c.name);
                  return (
                    <p className="text-[10px] font-bold">
                      {cashierNames.length > 1 ? `Cashiers Active: ${cashierNames.join(', ')}` : `Cashier: ${selectedZReport.cashier_name}`}
                    </p>
                  );
                })()}
              </div>

              <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Session:</span>
                  <span className="font-bold">#{selectedZReport.session_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Opened:</span>
                  <span>{new Date(selectedZReport.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Closed:</span>
                  <span>{selectedZReport.closed_at ? new Date(selectedZReport.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Open'}</span>
                </div>
              </div>

              {/* Cashier-Wise Sales Breakdown */}
              {(() => {
                const breakdown = getShiftCashierBreakdown(selectedZReport);
                const shiftTotal = (selectedZReport.cash_sales + selectedZReport.card_sales + selectedZReport.digital_sales);
                return (
                  <div className="py-2 border-b border-dashed border-black space-y-1.5 text-[11px]">
                    <div className="font-black text-[10px] uppercase tracking-wider text-black flex justify-between items-center pb-0.5 border-b border-dotted border-black/40">
                      <span>CASHIER SALES BREAKDOWN:</span>
                      <span>AMOUNT</span>
                    </div>
                    <div className="space-y-1.5 pt-0.5">
                      {breakdown.map((c) => {
                        const share = shiftTotal > 0 ? ((c.total / shiftTotal) * 100).toFixed(0) : '0';
                        return (
                          <div key={c.name} className="space-y-0.5">
                            <div className="flex justify-between items-baseline font-bold">
                              <span className="capitalize text-black font-extrabold">• {c.name}</span>
                              <span className="font-bold font-mono">Rs. {c.total.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-600 pl-2">
                              <span>
                                {c.ordersCount > 0 ? `${c.ordersCount} ${c.ordersCount === 1 ? 'sale' : 'sales'}` : 'Shift float / opener'}
                                {c.cash > 0 && c.card > 0
                                  ? ` (Cash: Rs. ${c.cash.toLocaleString()} | Card: Rs. ${c.card.toLocaleString()})`
                                  : c.card > 0
                                  ? ` (Card: Rs. ${c.card.toLocaleString()})`
                                  : ` (Cash: Rs. ${c.cash.toLocaleString()})`
                                }
                              </span>
                              <span className="font-mono">{share}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Financial Tenders */}
              <div className="py-2 border-b border-dashed border-black space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Opening Float:</span>
                  <span>Rs. {selectedZReport.opening_float.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span>Rs. {selectedZReport.cash_sales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card Sales:</span>
                  <span>Rs. {selectedZReport.card_sales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Digital / QR Sales:</span>
                  <span>Rs. {selectedZReport.digital_sales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash In / Out:</span>
                  <span>+{selectedZReport.cash_in} / -{selectedZReport.cash_out}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-dotted border-black">
                  <span>TOTAL SALES VOLUME:</span>
                  <span>Rs. {(selectedZReport.cash_sales + selectedZReport.card_sales + selectedZReport.digital_sales).toLocaleString()}</span>
                </div>
              </div>

              {/* Reconciliation Balance */}
              <div className="py-2 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Expected Drawer Cash:</span>
                  <span>Rs. {selectedZReport.expected_cash.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Actual Counted:</span>
                  <span>Rs. {(selectedZReport.actual_counted_cash ?? selectedZReport.expected_cash).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-dotted border-black/40">
                  <span>Cash Variance:</span>
                  <span className={selectedZReport.variance && selectedZReport.variance !== 0 ? 'text-rose-600' : ''}>
                    {selectedZReport.variance !== undefined ? (selectedZReport.variance >= 0 ? `+${selectedZReport.variance}` : selectedZReport.variance) : 0}
                  </span>
                </div>
              </div>

              {/* Official Software & System Provider Footer */}
              <div className="pt-3 pb-2 text-center border-t border-dashed border-black/80 text-[10px] space-y-1">
                <p className="font-extrabold text-[10px] uppercase text-black tracking-wider">
                  NHT ENTERPRISES
                </p>
                <p className="text-[9px] text-slate-600 font-mono">
                  Cloud ERP & POS Systems
                </p>
                <p className="text-[9px] text-slate-700 font-mono font-bold">
                  Contact / Support: +92 312 8039911
                </p>
                <div className="pt-1 text-[8px] text-slate-400 font-mono">
                  Daily Reconciliation Audit Report • System Generated
                </div>
              </div>
            </div>
          </div>

            {/* Footer Buttons */}
            <div className="p-3 bg-white dark:bg-[#111622] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedZReport(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                style={{
                  backgroundColor: accentColor,
                  color: contrastText,
                  border: isAccentWhite ? '1px solid #cbd5e1' : undefined
                }}
              >
                <LuPrinter size={14} />
                <span>Print Z-Report</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default POSRegister;

