import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Barcode from 'react-barcode';
import {
  LuReceipt,
  LuSearch,
  LuCalendar,
  LuUser,
  LuCreditCard,
  LuBanknote,
  LuQrCode,
  LuPrinter,
  LuRotateCcw,
  LuFileSpreadsheet,
  LuArrowLeft,
  LuX,
  LuCheck,
  LuMinus,
  LuPlus,
  LuFilter,
  LuClock,
  LuStore
} from 'react-icons/lu';
import { MdPointOfSale } from 'react-icons/md';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useAuth } from '../../Context/Auth';
import { useLanguage } from '../../Context/LanguageContext';
import { getSavedAccentColor, getContrastTextColor } from '../../constant/themeConfig';
import { posService, PosOrder, PosSettings } from '../../service/posService';

interface POSOrdersProps {
  embedded?: boolean;
  defaultStatus?: string;
  isReturnsOnly?: boolean;
  onBack?: () => void;
}

export const POSOrders: React.FC<POSOrdersProps> = ({ embedded, defaultStatus, isReturnsOnly, onBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userEmail } = useAuth();
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
  const [orders, setOrders] = useState<PosOrder[]>(() => posService.getAllOrders());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>(defaultStatus || 'All');
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'Yesterday' | 'Last7Days' | 'Custom'>('All');
  const [customDate, setCustomDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [confirmRefundOrder, setConfirmRefundOrder] = useState<PosOrder | null>(null);
  const [refundItems, setRefundItems] = useState<{
    product_id: string;
    product_name: string;
    unit_price: number;
    original_qty: number;
    return_qty: number;
    selected: boolean;
  }[]>([]);
  const [refundReason, setRefundReason] = useState<string>('Customer Return');
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<'Cash' | 'Original'>('Cash');

  // Computed refund totals
  const selectedRefundItems = refundItems.filter(it => it.selected && it.return_qty > 0);
  const totalRefundAmount = selectedRefundItems.reduce((sum, it) => sum + (it.return_qty * it.unit_price), 0);
  const totalOriginalItemsCount = refundItems.reduce((sum, it) => sum + it.original_qty, 0);
  const totalReturnedCount = selectedRefundItems.reduce((sum, it) => sum + it.return_qty, 0);
  const isFullRefund = totalReturnedCount >= totalOriginalItemsCount && totalOriginalItemsCount > 0;

  // Modal for thermal receipt reprint
  const [selectedOrder, setSelectedOrder] = useState<PosOrder | null>(null);
  const [receiptSize, setReceiptSize] = useState<'80mm' | '58mm'>(posConfig.receipt_paper_size || '80mm');

  // Check URL query parameters for action
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'returns') {
      toast('Displaying orders for return & refund processing', { icon: '↩️' });
    }
  }, [location.search]);

  // Filtered Orders (by Tender, Status, Date, and Query)
  const filteredOrders = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    return orders.filter((o) => {
      if (isReturnsOnly) {
        const isReturn = o.status === 'Refunded' || o.status === 'Partially Refunded';
        if (!isReturn) return false;
        if (statusFilter !== 'All' && o.status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      } else {
        if (statusFilter !== 'All' && o.status.toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      if (methodFilter !== 'All' && o.payment_method.toLowerCase() !== methodFilter.toLowerCase()) {
        return false;
      }
      const orderDate = new Date(o.created_at);
      const orderDateStr = orderDate.toISOString().split('T')[0];

      if (dateFilter === 'Today' && orderDateStr !== todayStr) return false;
      if (dateFilter === 'Yesterday' && orderDateStr !== yesterdayStr) return false;
      if (dateFilter === 'Last7Days' && orderDate < sevenDaysAgo) return false;
      if (dateFilter === 'Custom' && orderDateStr !== customDate) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.cashier_name.toLowerCase().includes(q)
      );
    });
  }, [orders, methodFilter, statusFilter, dateFilter, customDate, searchQuery]);

  // Financial Stats
  const stats = useMemo(() => {
    if (isReturnsOnly) {
      const returnOrders = filteredOrders;
      const totalRefundValue = returnOrders.reduce((sum, o) => {
        const match = (o.notes || '').match(/Refunded Rs\.\s*([\d,]+)/i);
        if (match) {
          const parsed = parseFloat(match[1].replace(/,/g, ''));
          if (parsed > 0) return sum + parsed;
        }
        return sum + (o.subtotal || o.total_amount || 0);
      }, 0);

      const cashReturns = returnOrders.filter(o => o.payment_method === 'Cash').reduce((sum, o) => {
        const match = (o.notes || '').match(/Refunded Rs\.\s*([\d,]+)/i);
        if (match) {
          const parsed = parseFloat(match[1].replace(/,/g, ''));
          if (parsed > 0) return sum + parsed;
        }
        return sum + (o.subtotal || o.total_amount || 0);
      }, 0);

      const cardReturns = Math.max(0, totalRefundValue - cashReturns);
      const totalCount = returnOrders.length;
      const avgRefund = totalCount > 0 ? Math.round(totalRefundValue / totalCount) : 0;

      return { totalRev: totalRefundValue, cashTotal: cashReturns, cardTotal: cardReturns, digitalTotal: 0, avgTicket: avgRefund, count: totalCount };
    }

    const totalRev = filteredOrders.reduce((sum, o) => sum + (o.status === 'Completed' ? o.total_amount : 0), 0);
    const cashTotal = filteredOrders.filter((o) => o.payment_method === 'Cash' && o.status === 'Completed').reduce((sum, o) => sum + o.total_amount, 0);
    const cardTotal = filteredOrders.filter((o) => o.payment_method === 'Card' && o.status === 'Completed').reduce((sum, o) => sum + o.total_amount, 0);
    const digitalTotal = filteredOrders.filter((o) => o.payment_method === 'Digital' && o.status === 'Completed').reduce((sum, o) => sum + o.total_amount, 0);
    const completedCount = filteredOrders.filter((o) => o.status === 'Completed').length;
    const avgTicket = completedCount > 0 ? Math.round(totalRev / completedCount) : 0;
    return { totalRev, cashTotal, cardTotal, digitalTotal, avgTicket, count: completedCount };
  }, [filteredOrders, isReturnsOnly]);

  // Process Return / Refund
  const handleRefundOrder = (order: PosOrder) => {
    if (order.status === 'Refunded') {
      toast.error('This ticket is already fully refunded');
      return;
    }
    const initialItems = (order.items || []).map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name,
      unit_price: it.unit_price,
      original_qty: it.quantity,
      return_qty: it.quantity,
      selected: true
    }));
    setRefundItems(initialItems);
    setRefundReason('Customer Return');
    setRefundPaymentMethod('Cash');
    setConfirmRefundOrder(order);
  };

  const handleExecuteRefund = () => {
    if (!confirmRefundOrder || totalRefundAmount <= 0) return;

    // 🔒 Manager Override Password Check for Customer Refund
    const managerPass = prompt('🔒 Manager Authorization Required:\nEnter POS Admin / Manager Password to approve refund:');
    if (managerPass === null) return; // Cashier cancelled
    if (!posService.verifyManagerOverride('pos1', managerPass)) {
      toast.error('Invalid Manager Password. Refund not authorized.', { icon: '🔒' });
      return;
    }

    const remainingTotal = Math.max(0, confirmRefundOrder.total_amount - totalRefundAmount);
    const newStatus = isFullRefund ? ('Refunded' as const) : ('Partially Refunded' as const);

    const updated = orders.map((o) => {
      if (o.id !== confirmRefundOrder.id) return o;
      return {
        ...o,
        status: newStatus,
        total_amount: remainingTotal,
        refunded_at: new Date().toISOString(),
        refund_amount: (o.refund_amount || 0) + totalRefundAmount,
        refund_reason: refundReason,
        notes: (o.notes ? o.notes + ' | ' : '') + `Refunded Rs. ${totalRefundAmount.toLocaleString()} (${totalReturnedCount} item${totalReturnedCount > 1 ? 's' : ''}) on ${new Date().toLocaleDateString()} - ${refundReason}`
      };
    });

    setOrders(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('uj_pos_orders_v1', JSON.stringify(updated));
    }

    // Deduct cash from active drawer shift if paying cash
    if (refundPaymentMethod === 'Cash') {
      const activeShift = posService.getActiveShift();
      if (activeShift) {
        posService.recordCashMovement(activeShift.id, 'out', totalRefundAmount);
      }
    }

    toast.success(
      isFullRefund
        ? `Ticket ${confirmRefundOrder.order_number} fully refunded (Rs. ${totalRefundAmount.toLocaleString()})`
        : `Partial refund of Rs. ${totalRefundAmount.toLocaleString()} issued for ${confirmRefundOrder.order_number}`
    );
    setConfirmRefundOrder(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredOrders.map((o) => ({
      'Ticket #': o.order_number,
      'Sold Date': new Date(o.created_at).toLocaleString(),
      'Refunded Date': o.refunded_at ? new Date(o.refunded_at).toLocaleString() : 'N/A',
      'Refund Reason': o.refund_reason || 'N/A',
      'Customer': o.customer_name,
      'Cashier': o.cashier_name,
      'Terminal': o.terminal_code,
      'Payment Tender': o.payment_method,
      'Subtotal': o.subtotal,
      'Discount': o.discount_amount,
      'Tax': o.tax_amount,
      'Grand Total': o.total_amount,
      'Cash Tendered': o.cash_tendered,
      'Change Due': o.change_due,
      'Status': o.status,
      'Total Items': o.items.length
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'POS_Receipts');
    const buf = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `POS_Sales_Receipts_${Date.now()}.xlsx`);
    toast.success('POS orders exported to Excel');
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
              {isReturnsOnly ? <LuRotateCcw className="text-rose-500" /> : <LuReceipt className="text-sky-500" />}
              <span>{isReturnsOnly ? 'Returns & Refund Ledger' : 'POS Transactions & Thermal Receipts'}</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isReturnsOnly
                ? 'Audit history of refunded orders, returned items, and customer cash/card refunds.'
                : 'Review transaction logs, reprint thermal receipts, and process customer returns.'}
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

          <button
            type="button"
            onClick={() => { if (onBack) onBack(); else navigate('/pos/terminal'); }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: accentColor,
              color: contrastText,
              border: isAccentWhite ? '1px solid #cbd5e1' : undefined
            }}
          >
            <MdPointOfSale size={16} />
            <span>{embedded ? 'Back to Cashier Register' : 'Launch POS Terminal'}</span>
          </button>
        </div>
      </div>

      {/* Financial KPIs Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
            {isReturnsOnly ? 'Total Refunded Value' : 'Total POS Revenue'}
          </span>
          <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
            Rs. {stats.totalRev.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {stats.count} {isReturnsOnly ? 'refunded orders' : 'tickets completed'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
            {isReturnsOnly ? 'Cash Refunded' : 'Cash Tenders'}
          </span>
          <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            Rs. {stats.cashTotal.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isReturnsOnly ? 'Drawer cash outflow' : 'Physical drawer cash'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
            {isReturnsOnly ? 'Card / Digital Reversals' : 'Card (POS) Sales'}
          </span>
          <div className="text-xl font-black font-mono text-sky-600 dark:text-sky-400 mt-1">
            Rs. {stats.cardTotal.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isReturnsOnly ? 'Electronic reversals' : 'Credit/Debit machine'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
            {isReturnsOnly ? 'Average Refund Size' : 'Average Ticket Size'}
          </span>
          <div className="text-xl font-black font-mono text-purple-600 dark:text-purple-400 mt-1">
            Rs. {stats.avgTicket.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {isReturnsOnly ? 'Per return claim' : 'Per counter receipt'}
          </span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket #, customer, cashier..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#1A2234] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Date Presets */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-0.5 border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold">
            {(['All', 'Today', 'Yesterday', 'Last7Days'] as const).map((mode) => {
              const label = mode === 'All' ? 'All Dates' : mode === 'Last7Days' ? '7 Days' : mode;
              const isSelected = dateFilter === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDateFilter(mode)}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer text-[11px] ${
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

          {/* Custom Date Input */}
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

          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All">All Tender Types</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Digital">Digital / QR</option>
            <option value="Split">Split</option>
          </select>

          {isReturnsOnly ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All Return Types</option>
              <option value="Refunded">Fully Refunded</option>
              <option value="Partially Refunded">Partially Refunded</option>
            </select>
          ) : (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Refunded">Refunded</option>
              <option value="Partially Refunded">Partially Refunded</option>
            </select>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111622] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Ticket #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Payment Tender</th>
                <th className="py-3 px-4">Grand Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <LuRotateCcw size={32} className="text-slate-300 dark:text-slate-600" />
                      <span className="font-bold text-sm text-slate-700 dark:text-slate-200">
                        {isReturnsOnly ? 'No returns or refunds recorded yet' : 'No transactions match the selected filters.'}
                      </span>
                      <span className="text-xs text-slate-400 max-w-sm">
                        {isReturnsOnly
                          ? 'When a refund is processed from the Transactions page, the refunded ticket will appear here in this return ledger.'
                          : 'Try adjusting your search query, date filter, or payment tender.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      {o.order_number}
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      {o.refunded_at ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400">
                              Refunded
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {new Date(o.refunded_at).toLocaleDateString()}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {new Date(o.refunded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                            <span className="font-semibold uppercase tracking-wider text-[9px]">Sold:</span>
                            <span>{new Date(o.created_at).toLocaleDateString()}</span>
                            <span className="font-mono">{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400">
                          <div>{new Date(o.created_at).toLocaleDateString()}</div>
                          <div className="font-mono">
                            {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 capitalize">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0 font-bold">
                          {o.cashier_name ? o.cashier_name.charAt(0).toUpperCase() : 'C'}
                        </span>
                        <span className="truncate max-w-[120px]">{o.cashier_name || 'Cashier'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 pl-6.5">
                        {o.terminal_code ? o.terminal_code.replace(/\s*\(.*?\)/g, '') : 'Register 01'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {o.customer_name}
                      </div>
                      {o.notes && (
                        <div className="text-[10px] text-rose-500 dark:text-rose-400 font-medium mt-0.5 max-w-xs truncate" title={o.notes}>
                          {o.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {o.items.length} items
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {o.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-extrabold text-slate-900 dark:text-white">
                      Rs. {o.total_amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.status === 'Completed'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          title="Reprint Thermal Receipt"
                        >
                          <LuPrinter size={14} />
                        </button>

                        {!isReturnsOnly && (
                          <button
                            type="button"
                            disabled={o.status === 'Refunded'}
                            onClick={() => handleRefundOrder(o)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition cursor-pointer disabled:opacity-30"
                            title="Process Return & Refund"
                          >
                            <LuRotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: THERMAL RECEIPT REPRINT PREVIEW
         ───────────────────────────────────────────────────────────── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Actions */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReceiptSize('80mm')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    receiptSize === '80mm'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  80mm Standard
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptSize('58mm')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    receiptSize === '58mm'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  58mm Compact
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <LuPrinter size={13} />
                  <span>Reprint</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
                >
                  <LuX size={18} />
                </button>
              </div>
            </div>

            {/* Thermal Slip Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-200 dark:bg-slate-900 flex justify-center">
              <div
                className={`bg-white text-black p-5 shadow-lg font-mono text-xs rounded-sm transition-all duration-200 ${
                  receiptSize === '80mm' ? 'w-[320px]' : 'w-[240px]'
                }`}
              >
                {/* Store Header */}
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-black">
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">
                    {posConfig.store_title}
                  </h3>
                  <p className="text-[10px] leading-tight text-slate-700">{posConfig.store_address}</p>
                  <p className="text-[10px] text-slate-700">Phone: {posConfig.store_phone}</p>
                  <p className="text-[10px] font-bold text-slate-800">TAX / NTN: {posConfig.tax_id}</p>
                </div>

                {/* Ticket Meta */}
                <div className="py-2.5 border-b border-dashed border-black space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Ticket #:</span>
                    <span className="font-bold">{selectedOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(selectedOrder.created_at).toLocaleDateString()} {new Date(selectedOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{selectedOrder.cashier_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span className="font-bold">{selectedOrder.customer_name}</span>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="py-2.5 border-b border-dashed border-black space-y-1.5 text-[11px]">
                  <div className="flex justify-between font-bold pb-1 border-b border-dotted border-black/40">
                    <span className="w-1/2">Item</span>
                    <span className="w-1/4 text-center">Rate</span>
                    <span className="w-1/4 text-right">Total</span>
                  </div>

                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="w-1/2 truncate font-semibold" title={it.product_name}><span className="font-bold">{it.quantity} × </span>{it.product_name}</span>
                      <span className="w-1/4 text-center font-mono">{it.unit_price.toLocaleString()}</span>
                      <span className="w-1/4 text-right font-bold font-mono">
                        {it.line_total.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="py-2.5 border-b border-dashed border-black space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono">Rs. {selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedOrder.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount ({selectedOrder.discount_percentage}%):</span>
                      <span className="font-mono">- Rs. {selectedOrder.discount_amount.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedOrder.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span>Tax ({selectedOrder.tax_percentage}%):</span>
                      <span className="font-mono">+ Rs. {selectedOrder.tax_amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-dotted border-black">
                    <span>TOTAL:</span>
                    <span className="font-mono">Rs. {selectedOrder.total_amount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Tender & Change */}
                <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span>Tendered ({selectedOrder.payment_method}):</span>
                    <span className="font-mono">Rs. {selectedOrder.cash_tendered.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Change Due:</span>
                    <span className="font-mono">Rs. {selectedOrder.change_due.toLocaleString()}</span>
                  </div>
                </div>

                {/* Barcode & Footer Disclaimer */}
                <div className="pt-3 text-center space-y-2">
                  <div className="flex justify-center">
                    <Barcode
                      value={selectedOrder.order_number}
                      width={1.2}
                      height={35}
                      fontSize={10}
                      margin={0}
                    />
                  </div>
                  <p className="text-[9px] leading-tight text-slate-600">
                    {posConfig.footer_message}
                  </p>
                  <p className="text-[8px] text-slate-400 font-medium">{posConfig.software_credit || "Software Developed by: NHT ENTERPRISES - +92 312 8039911"}</p>
                  <p className="text-[7.5px] text-slate-400">Reprinted Copy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centered Item-Level & Full Refund Modal */}
      {confirmRefundOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setConfirmRefundOrder(null)}
        >
          <div
            className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#111622] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 animate-scaleIn flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <LuRotateCcw size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    Issue Return & Refund
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {confirmRefundOrder.order_number}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {confirmRefundOrder.customer_name} • {new Date(confirmRefundOrder.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmRefundOrder(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <LuX size={18} />
              </button>
            </div>

            {/* Sub-header Controls: Select All toggle & Refund Mode Badge */}
            <div className="py-2.5 flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  const allSelected = refundItems.every(i => i.selected);
                  setRefundItems(prev => prev.map(i => ({ ...i, selected: !allSelected })));
                }}
                className="flex items-center gap-1.5 font-bold text-primary hover:underline cursor-pointer"
              >
                <span>
                  {refundItems.every(i => i.selected) ? 'Deselect All' : 'Select All Items'}
                </span>
              </button>
              <div className="flex items-center gap-2 text-[11px]">
                <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                  isFullRefund
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  {isFullRefund ? 'Full Order Refund' : 'Specific Item(s) Refund'}
                </span>
              </div>
            </div>

            {/* Scrollable Item List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 max-h-[340px] pr-1">
              {refundItems.map((item, idx) => {
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      item.selected
                        ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 opacity-60'
                    }`}
                  >
                    {/* Checkbox & Name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRefundItems(prev =>
                            prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it)
                          );
                        }}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 cursor-pointer ${
                          item.selected
                            ? 'bg-primary border-primary text-white shadow-xs'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {item.selected && <LuCheck size={13} className="stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.product_name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Rate: Rs. {item.unit_price.toLocaleString()} • Sold: {item.original_qty}
                        </p>
                      </div>
                    </div>

                    {/* Quantity Selector [-] Qty [+] */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                        <button
                          type="button"
                          disabled={!item.selected || item.return_qty <= 1}
                          onClick={() => {
                            setRefundItems(prev =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, return_qty: Math.max(1, it.return_qty - 1) } : it
                              )
                            );
                          }}
                          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                          <LuMinus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-slate-900 dark:text-white">
                          {item.return_qty}
                        </span>
                        <button
                          type="button"
                          disabled={!item.selected || item.return_qty >= item.original_qty}
                          onClick={() => {
                            setRefundItems(prev =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, return_qty: Math.min(it.original_qty, it.return_qty + 1) } : it
                              )
                            );
                          }}
                          className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                        >
                          <LuPlus size={12} />
                        </button>
                      </div>

                      {/* Refund line subtotal */}
                      <span className="w-24 text-right font-mono font-black text-xs text-slate-900 dark:text-white">
                        Rs. {(item.selected ? item.return_qty * item.unit_price : 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Return Reason & Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Reason for Return
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="Customer Return">Customer Return</option>
                  <option value="Size / Color Exchange">Size / Color Exchange</option>
                  <option value="Defective / Damaged">Defective / Damaged</option>
                  <option value="Wrong Item Dispatched">Wrong Item Dispatched</option>
                  <option value="Customer Changed Mind">Customer Changed Mind</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Refund Payout Method
                </label>
                <select
                  value={refundPaymentMethod}
                  onChange={(e) => setRefundPaymentMethod(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none cursor-pointer"
                >
                  <option value="Cash">Cash Out (Drawer Float)</option>
                  <option value="Original">Original Tender ({confirmRefundOrder.payment_method})</option>
                </select>
              </div>
            </div>

            {/* Total Refund Summary & Actions */}
            <div className="pt-4 mt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-1">
                  Total Refund Amount
                </span>
                <span className="font-mono font-black text-lg text-rose-600 dark:text-rose-400">
                  Rs. {totalRefundAmount.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ({totalReturnedCount} of {totalOriginalItemsCount} items selected)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmRefundOrder(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={totalRefundAmount <= 0}
                  onClick={handleExecuteRefund}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide text-white transition shadow-md cursor-pointer bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Refund Rs. {totalRefundAmount.toLocaleString()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSOrders;

