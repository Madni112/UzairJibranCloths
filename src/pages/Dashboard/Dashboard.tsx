import React, { useEffect, useState, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../Context/supabaseClient';
import { fetchFinancialMetrics, FinancialSummary } from '../../service/financialCalculations';
import Spinner from '../../ui/Spinner';
import {
  MdShoppingCart,
  MdCompareArrows,
  MdAccountBalanceWallet,
  MdAccountBalance,
  MdTrendingUp,
  MdTrendingDown,
  MdArrowUpward,
  MdArrowDownward,
  MdReceiptLong,
  MdPerson,
  MdCalendarToday,
  MdOutlineReceipt,
  MdClose,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdShowChart,
  MdBarChart,
  MdAssignmentReturn,
  MdFormatListNumbered,
  MdCorporateFare,
  MdPayments,
  MdAttachMoney,
  MdReceipt,
  MdCheckCircle
} from 'react-icons/md';
import StatCard from '../../ui/StatCard';
import ActionCard from '../../ui/ActionCard';
import { useAuth } from '../../Context/Auth';
import { useLanguage } from '../../Context/LanguageContext';

// Types for Wholesale Cloth Accounting Dashboard
interface ReceivableCustomer {
  id: string | number;
  invoiceNo: string;
  customerName: string;
  salesman: string;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  outstandingBalance: number;
  daysPending: number;
}

interface PayableVendor {
  id: string | number;
  vendorCode: string;
  vendorName: string;
  city: string;
  phone: string;
  outstandingBalance: number;
}

interface RecentVoucherItem {
  id: string | number;
  voucherNo: string;
  voucherType: string;
  voucherDate: string;
  accountTitle: string;
  narration: string;
  amount: number;
}

interface TopKhataParty {
  id: string | number;
  name: string;
  code: string;
  balance: number;
  percentageOfTotal: number;
}

interface CashTransaction {
  id: string | number;
  date: string;
  type: 'Inflow' | 'Outflow';
  source: string;
  party: string;
  amount: number;
  description: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isRTL, t } = useLanguage();

  const [metrics, setMetrics] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Operational Ledgers State
  const [receivablesList, setReceivablesList] = useState<ReceivableCustomer[]>([]);
  const [payablesList, setPayablesList] = useState<PayableVendor[]>([]);
  const [recentVouchers, setRecentVouchers] = useState<RecentVoucherItem[]>([]);
  const [topKhatas, setTopKhatas] = useState<TopKhataParty[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);

  // Interactive Tab Controllers
  const [chartViewTab, setChartViewTab] = useState<'daily' | 'monthly'>('monthly');
  const [liquidityTab, setLiquidityTab] = useState<'bank' | 'cash'>('bank');
  const [activeBreakdownModal, setActiveBreakdownModal] = useState<'cash' | 'bank' | 'receivables' | 'payables' | null>(null);
  const [showOperationalDetails, setShowOperationalDetails] = useState<boolean>(() => {
    return localStorage.getItem('ujc_dashboard_show_details') === 'true';
  });

  const toggleOperationalDetails = () => {
    setShowOperationalDetails(prev => {
      const next = !prev;
      localStorage.setItem('ujc_dashboard_show_details', String(next));
      return next;
    });
  };

  // Customer Sales Trend Data
  const [customerSalesDaily, setCustomerSalesDaily] = useState<{ dates: string[]; sales: number[] }>({ dates: [], sales: [] });
  const [customerSalesMonthly, setCustomerSalesMonthly] = useState<{ months: string[]; sales: number[] }>({ months: [], sales: [] });

  useEffect(() => {
    loadCompleteDashboard();
  }, []);

  const loadCompleteDashboard = async () => {
    try {
      setLoading(true);

      const [
        metricsData,
        invoicesRes,
        vouchersRes,
        custRecoveriesRes,
        customersRes,
        vendorsRes
      ] = await Promise.all([
        fetchFinancialMetrics(),
        supabase.from('sales_invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('financial_vouchers').select('*').order('voucher_date', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('customer_recoveries').select('*'),
        supabase.from('customers').select('*').order('customerName', { ascending: true }),
        supabase.from('vendors').select('*').order('vendor_name', { ascending: true })
      ]);

      setMetrics(metricsData);

      const invoices = invoicesRes.data || [];
      const vouchers = vouchersRes.data || [];
      const recoveries = custRecoveriesRes.data || [];
      const customersData = customersRes?.data || [];
      const vendorsData = vendorsRes?.data || [];

      // ==========================================
      // 1. CUSTOMER RECEIVABLES WITH AGING
      // ==========================================
      const extractedReceivables: ReceivableCustomer[] = [];

      customersData.forEach((c: any) => {
        const rawBal = Number(c.currentBalance !== undefined && c.currentBalance !== null && c.currentBalance !== ''
          ? c.currentBalance
          : (c.balance !== undefined && c.balance !== null && c.balance !== '' ? c.balance : c.opening_balance || 0));
        const nature = String(c.balance_nature || c.balanceNature || '').toLowerCase();
        let effectiveBal = rawBal;
        if (nature.includes('cr') || nature.includes('credit')) {
          effectiveBal = -Math.abs(rawBal);
        } else if (rawBal > 0) {
          effectiveBal = Math.abs(rawBal);
        }

        if (effectiveBal > 0.5) {
          extractedReceivables.push({
            id: `cust-${c.id}`,
            invoiceNo: c.customer_code || `CUST-${String(c.id).padStart(3, '0')}`,
            customerName: c.customerName || 'Customer',
            salesman: c.city ? `City: ${c.city}` : (c.primaryPhone || 'Direct Ledger'),
            invoiceDate: c.created_at ? c.created_at.split('T')[0] : 'Opening Bal',
            totalAmount: effectiveBal,
            paidAmount: 0,
            outstandingBalance: effectiveBal,
            daysPending: 30
          });
        }
      });

      // Map recoveries per invoice
      const invoiceRecoveriesMap: Record<string, number> = {};
      recoveries.forEach((rec: any) => {
        const invId = String(rec.invoice_id || rec.invoiceId || rec.invoice_no || '').trim();
        if (invId) {
          const amt = Number(rec.net_collected_amount || rec.amount_paid || rec.amount || 0);
          invoiceRecoveriesMap[invId] = (invoiceRecoveriesMap[invId] || 0) + amt;
        }
      });

      const today = new Date();

      invoices.forEach((inv: any) => {
        const total = Number(inv.total_amount || 0);
        const initialPaid = Number(inv.cash_amount_paid || inv.paid_amount || 0);
        const invKey = String(inv.id).trim();
        const invNoKey = String(inv.invoice_no || '').trim();

        const extraRecoveries = (invoiceRecoveriesMap[invKey] || 0) + (invNoKey ? (invoiceRecoveriesMap[invNoKey] || 0) : 0);
        const outstanding = Math.max(0, total - initialPaid - extraRecoveries);

        if (outstanding > 0.5) {
          const rawDate = inv.sale_date || inv.invoice_date || inv.created_at || '';
          const invDate = rawDate ? new Date(rawDate) : today;
          const diffTime = Math.max(0, today.getTime() - invDate.getTime());
          const daysPending = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          extractedReceivables.push({
            id: inv.id,
            invoiceNo: inv.invoice_no || `INV-${String(inv.id).padStart(4, '0')}`,
            customerName: inv.customer_name || 'Walk-in Customer',
            salesman: inv.salesman || 'Direct Sales',
            invoiceDate: rawDate ? rawDate.split('T')[0] : 'Today',
            totalAmount: total,
            paidAmount: initialPaid + extraRecoveries,
            outstandingBalance: outstanding,
            daysPending
          });
        }
      });

      extractedReceivables.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
      setReceivablesList(extractedReceivables.slice(0, 15));

      // ==========================================
      // 2. VENDOR PAYABLES LEDGER
      // ==========================================
      const extractedPayables: PayableVendor[] = [];
      vendorsData.forEach((v: any) => {
        const rawBal = Number(v.current_balance !== undefined && v.current_balance !== null
          ? v.current_balance
          : (v.balance !== undefined && v.balance !== null ? v.balance : v.opening_balance || 0));
        const nature = String(v.balance_nature || v.balanceNature || '').toLowerCase();
        let effectiveBal = rawBal;
        if (nature.includes('dr') || nature.includes('debit')) {
          effectiveBal = -Math.abs(rawBal);
        } else if (rawBal > 0) {
          effectiveBal = Math.abs(rawBal);
        }

        if (effectiveBal > 0.5) {
          extractedPayables.push({
            id: v.id,
            vendorCode: v.vendor_code || v.vendorCode || `V-${String(v.id).padStart(3, '0')}`,
            vendorName: v.vendor_name || v.name || 'Vendor / Mill',
            city: v.city || v.address || 'Cloth Market',
            phone: v.phone || v.phone_no || v.cell_no || '-',
            outstandingBalance: effectiveBal
          });
        }
      });

      extractedPayables.sort((a, b) => b.outstandingBalance - a.outstandingBalance);
      setPayablesList(extractedPayables.slice(0, 15));

      // ==========================================
      // 3. RECENT FINANCIAL VOUCHERS FLOW
      // ==========================================
      const recentList: RecentVoucherItem[] = vouchers.slice(0, 15).map((v: any) => ({
        id: v.id,
        voucherNo: v.voucher_no || `VCH-${v.id}`,
        voucherType: v.voucher_type || 'Journal Voucher',
        voucherDate: v.voucher_date || (v.created_at ? v.created_at.split('T')[0] : 'Today'),
        accountTitle: v.account_title || v.party_name || 'General Khata',
        narration: v.narration || v.notes || v.remarks || 'Cloth Khata Entry',
        amount: Number(v.total_amount || v.amount || 0)
      }));
      setRecentVouchers(recentList);

      // ==========================================
      // 4. TOP ACTIVE KHATAS
      // ==========================================
      const totalRec = metricsData.totalReceivables || 1;
      const topList: TopKhataParty[] = extractedReceivables.slice(0, 7).map((c) => ({
        id: c.id,
        name: c.customerName,
        code: c.invoiceNo,
        balance: c.outstandingBalance,
        percentageOfTotal: Math.min(100, Math.max(1, (c.outstandingBalance / totalRec) * 100))
      }));
      setTopKhatas(topList);

      // ==========================================
      // 5. CUSTOMER SALES GRAPH (DAILY & MONTHLY)
      // ==========================================
      const dailyMap: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dailyMap[key] = 0;
      }

      // Add invoices
      invoices.forEach((inv: any) => {
        const rawDate = String(inv.sale_date || inv.invoice_date || inv.created_at || '').split('T')[0];
        if (dailyMap.hasOwnProperty(rawDate)) {
          dailyMap[rawDate] += Number(inv.total_amount || 0);
        }
      });

      // Add SAV vouchers
      vouchers.forEach((v: any) => {
        const vNo = String(v.voucher_no || '').toUpperCase();
        const vDate = String(v.voucher_date || v.created_at || '').split('T')[0];
        if (dailyMap.hasOwnProperty(vDate)) {
          if (vNo.startsWith('SAV')) {
            dailyMap[vDate] += Number(v.total_amount || v.amount || 0);
          } else if (vNo.startsWith('SRV')) {
            dailyMap[vDate] = Math.max(0, dailyMap[vDate] - Number(v.total_amount || v.amount || 0));
          }
        }
      });

      setCustomerSalesDaily({
        dates: Object.keys(dailyMap).map(d => {
          const dt = new Date(d);
          return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        sales: Object.values(dailyMap)
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlySalesMap: Record<number, number> = {};
      monthNames.forEach((_, idx) => { monthlySalesMap[idx] = 0; });
      const currentYear = new Date().getFullYear();

      invoices.forEach((inv: any) => {
        const rawDate = inv.sale_date || inv.invoice_date || inv.created_at || '';
        if (rawDate) {
          const d = new Date(rawDate);
          if (d.getFullYear() === currentYear) {
            monthlySalesMap[d.getMonth()] += Number(inv.total_amount || 0);
          }
        }
      });

      vouchers.forEach((v: any) => {
        const rawDate = v.voucher_date || v.created_at || '';
        if (rawDate) {
          const d = new Date(rawDate);
          if (d.getFullYear() === currentYear) {
            const vNo = String(v.voucher_no || '').toUpperCase();
            const amt = Number(v.total_amount || v.amount || 0);
            if (vNo.startsWith('SAV')) {
              monthlySalesMap[d.getMonth()] += amt;
            } else if (vNo.startsWith('SRV')) {
              monthlySalesMap[d.getMonth()] = Math.max(0, monthlySalesMap[d.getMonth()] - amt);
            }
          }
        }
      });

      setCustomerSalesMonthly({
        months: monthNames,
        sales: monthNames.map((_, idx) => monthlySalesMap[idx])
      });

      // ==========================================
      // 6. CASH DRAWER TRANSACTIONS
      // ==========================================
      const cashTxns: CashTransaction[] = [];
      vouchers.forEach((v: any) => {
        const mode = String(v.mode_of_payment || v.voucher_type || '').toLowerCase();
        const vNo = String(v.voucher_no || '').toUpperCase();
        if (!mode.includes('bank')) {
          const isReceipt = String(v.voucher_type || '').toLowerCase().includes('receive') || vNo.startsWith('CRV');
          const isPayment = String(v.voucher_type || '').toLowerCase().includes('payment') || vNo.startsWith('VPV') || vNo.startsWith('EXP');
          if (isReceipt || isPayment) {
            cashTxns.push({
              id: `v-${v.id}`,
              date: v.voucher_date || String(v.created_at || '').split('T')[0],
              type: isReceipt ? 'Inflow' : 'Outflow',
              source: v.voucher_no || v.voucher_type || 'Cash Voucher',
              party: v.party_name || v.account_title || 'Cash Counter',
              amount: Number(v.total_amount || v.amount || 0),
              description: v.narration || 'Cash settlement'
            });
          }
        }
      });

      setCashTransactions(cashTxns.slice(0, 15));

    } catch (err: any) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // --- ApexCharts Configurations ---
  const hasMonthlyTrend = Boolean(metrics.monthlySalesTrend && metrics.monthlySalesTrend.length > 0);
  const monthlyCategories = hasMonthlyTrend ? metrics.monthlySalesTrend.map((m) => m.month) : ['Jan', 'Feb', 'Mar'];
  const grossSalesData = hasMonthlyTrend ? metrics.monthlySalesTrend.map((m) => m.sales) : [0, 0, 0];
  const procurementData = hasMonthlyTrend ? metrics.monthlySalesTrend.map((m) => m.purchases) : [0, 0, 0];

  const salesVsPurchasesOptions: any = {
    chart: { type: 'area', height: 300, toolbar: { show: false }, zoom: { enabled: false } },
    colors: ['#059669', '#2563EB'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    xaxis: {
      categories: monthlyCategories,
      labels: { style: { colors: '#64748B', fontSize: '11px' } }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `Rs. ${(val / 1000).toFixed(0)}k`,
        style: { colors: '#64748B', fontSize: '11px' }
      }
    },
    tooltip: { y: { formatter: (val: number) => `Rs. ${Number(val || 0).toLocaleString()}` } },
    legend: { position: 'top', horizontalAlign: 'right' }
  };

  const salesVsPurchasesSeries = [
    { name: 'Gross Sales (SAV)', data: grossSalesData },
    { name: 'Supplier Purchases (PAV)', data: procurementData }
  ];

  const customerGraphCategories = chartViewTab === 'daily' ? customerSalesDaily.dates : customerSalesMonthly.months;
  const customerGraphData = chartViewTab === 'daily' ? customerSalesDaily.sales : customerSalesMonthly.sales;

  const customerSalesChartOptions: any = {
    chart: { type: 'bar', height: 300, toolbar: { show: false } },
    colors: ['#059669'],
    plotOptions: {
      bar: {
        borderRadius: 4,
        columnWidth: chartViewTab === 'daily' ? '45%' : '35%',
        distributed: false
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: customerGraphCategories,
      labels: { style: { colors: '#64748B', fontSize: '10px' } }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => `Rs. ${(val / 1000).toFixed(0)}k`,
        style: { colors: '#64748B', fontSize: '11px' }
      }
    },
    tooltip: {
      y: { formatter: (val: number) => `Rs. ${Number(val || 0).toLocaleString()}` }
    }
  };

  const customerSalesChartSeries = [
    { name: chartViewTab === 'daily' ? 'Daily Customer Sales' : 'Monthly Customer Sales', data: customerGraphData }
  ];

  const totalBankBalance = metrics.bankAccounts ? metrics.bankAccounts.reduce((acc, b) => acc + Math.max(0, b.netBalance), 0) : 0;

  const bankDonutOptions: any = {
    chart: { type: 'donut' },
    colors: totalBankBalance > 0 ? ['#059669', '#0D9488', '#2563EB', '#7C3AED', '#334155'] : ['#CBD5E1'],
    labels: totalBankBalance > 0 ? metrics.bankAccounts.map((b) => b.accountTitle) : ['Zero Balance'],
    legend: { position: 'bottom' },
    tooltip: { y: { formatter: (val: number) => `Rs. ${totalBankBalance > 0 ? Number(val || 0).toLocaleString() : '0.00'}` } }
  };

  const bankDonutSeries = totalBankBalance > 0
    ? metrics.bankAccounts.map((b) => Math.max(0, b.netBalance))
    : [1];

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 text-slate-800 dark:text-slate-100 text-xs pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('executive_dashboard_title', 'Executive Management Dashboard')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('executive_dashboard_subtitle', 'Real-time customer khata balances, vendor payables & cash/bank ledgers')}
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-3.5 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-300 shadow-xs flex items-center gap-1.5">
            <MdCalendarToday className="text-emerald-600" />
            <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* --- TOP VOUCHER QUICK ACTIONS (ROW 1: CORE DAILY KHATA ACTIONS) --- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5">
        <ActionCard
          title="Sale Voucher"
          subtitle="Customer Sale (SAV)"
          Icon={MdReceiptLong}
          bgGradient="bg-gradient-to-br from-emerald-600 to-teal-800"
          onClick={() => navigate('/Vouchers/Sale-Amount/Add')}
        />
        <ActionCard
          title="Customer Receive"
          subtitle="Payment Inflow (CRV)"
          Icon={MdAttachMoney}
          bgGradient="bg-gradient-to-br from-teal-600 to-cyan-800"
          onClick={() => navigate('/Vouchers/Customer-Receive/Add')}
        />
        <ActionCard
          title="Purchase Voucher"
          subtitle="Vendor Purchase (PAV)"
          Icon={MdShoppingCart}
          bgGradient="bg-gradient-to-br from-blue-600 to-indigo-800"
          onClick={() => navigate('/Vouchers/Purchase-Amount/Add')}
        />
        <ActionCard
          title="Vendor Payment"
          subtitle="Pay Supplier (VPV)"
          Icon={MdAccountBalanceWallet}
          bgGradient="bg-gradient-to-br from-purple-600 to-slate-900"
          onClick={() => navigate('/Vouchers/Vendor-Payment/Add')}
        />
      </div>

      {/* --- TOP VOUCHER QUICK ACTIONS (ROW 2: RETURNS, EXPENSES & FULL LEDGER) --- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-5">
        <ActionCard
          title="Sale Return"
          subtitle="Customer Credit (SRV)"
          Icon={MdCompareArrows}
          bgGradient="bg-gradient-to-br from-amber-600 to-orange-800"
          onClick={() => navigate('/Vouchers/Sale-Return/Add')}
        />
        <ActionCard
          title="Purchase Return"
          subtitle="Vendor Debit (PRV)"
          Icon={MdAssignmentReturn}
          bgGradient="bg-gradient-to-br from-rose-600 to-slate-900"
          onClick={() => navigate('/Vouchers/Purchase-Return/Add')}
        />
        <ActionCard
          title="Expense Voucher"
          subtitle="Record Expense (EXP)"
          Icon={MdTrendingDown}
          bgGradient="bg-gradient-to-br from-orange-600 to-rose-800"
          onClick={() => navigate('/Vouchers/Expense/Add')}
        />
        <ActionCard
          title="All Vouchers"
          subtitle="Full Audit Ledger (VCH)"
          Icon={MdFormatListNumbered}
          bgGradient="bg-gradient-to-br from-slate-700 to-slate-900"
          onClick={() => navigate('/Registration/Vouchers/List')}
        />
      </div>

      {/* --- FINANCIAL KPI STAT CARDS (4 PILLAR BALANCES) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Cash"
          value={metrics.cashBalance}
          Icon={MdAccountBalanceWallet}
          bgColor="bg-gradient-to-br from-emerald-500 to-teal-600"
          thisMonthValue={metrics.thisMonthCashInflow}
          thisMonthLabel="This Month"
          onClick={() => setActiveBreakdownModal('cash')}
        />
        <StatCard
          title="Bank Balance"
          value={metrics.totalBankBalance}
          Icon={MdAccountBalance}
          bgColor="bg-gradient-to-br from-teal-600 to-cyan-700"
          thisMonthValue={metrics.thisMonthBankInflow}
          thisMonthLabel="This Month"
          onClick={() => setActiveBreakdownModal('bank')}
        />
        <StatCard
          title="Receivables"
          value={metrics.totalReceivables}
          Icon={MdReceiptLong}
          bgColor="bg-gradient-to-br from-emerald-600 to-teal-700"
          thisMonthValue={metrics.thisMonthReceivables}
          thisMonthLabel="This Month"
          onClick={() => setActiveBreakdownModal('receivables')}
        />
        <StatCard
          title="Payables"
          value={metrics.totalPayables}
          Icon={MdCorporateFare}
          bgColor="bg-gradient-to-br from-rose-600 to-slate-900"
          thisMonthValue={metrics.thisMonthPayables}
          thisMonthLabel="This Month"
          onClick={() => setActiveBreakdownModal('payables')}
        />
      </div>

      {/* --- QUICK METRIC TURNOVER STRIP --- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs font-mono text-xs">
        <div className="flex flex-col px-2 border-r border-slate-200/70 dark:border-slate-700/70">
          <span className="text-[10.5px] uppercase font-bold text-slate-400">Today's Sales (SAV)</span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            Rs. {metrics.todaysSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex flex-col px-2 border-r border-slate-200/70 dark:border-slate-700/70">
          <span className="text-[10.5px] uppercase font-bold text-slate-400">This Month Sales</span>
          <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">
            Rs. {metrics.thisMonthSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex flex-col px-2 border-r border-slate-200/70 dark:border-slate-700/70">
          <span className="text-[10.5px] uppercase font-bold text-slate-400">This Month Purchases</span>
          <span className="text-sm font-black text-blue-600 dark:text-blue-400 mt-0.5">
            Rs. {metrics.thisMonthPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex flex-col px-2">
          <span className="text-[10.5px] uppercase font-bold text-slate-400">Liquid Reserves (Cash + Bank)</span>
          <span className="text-sm font-black text-teal-600 dark:text-teal-400 mt-0.5">
            Rs. {(metrics.cashBalance + metrics.totalBankBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXPANDABLE OPERATIONAL DETAILS TOGGLE BAR                                */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-center pt-1 pb-1">
        <button
          onClick={toggleOperationalDetails}
          className="group flex items-center gap-3 px-5 py-2 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              {showOperationalDetails
                ? (isRTL ? 'آپریشنل لیجرز اور تجزیات چھپائیں' : 'Hide Operational Ledgers & Analytics')
                : (isRTL ? 'آپریشنل لیجرز اور تجزیات دکھائیں' : 'Show Operational Ledgers & Analytics')}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono font-bold border border-slate-200/70 dark:border-slate-700/60">
              {isRTL ? 'لیجرز اور چارٹس' : 'Khata Ledgers & Flow'}
            </span>
          </div>
          <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-transform duration-200 group-hover:bg-slate-200/70 dark:group-hover:bg-slate-700">
            {showOperationalDetails ? <MdKeyboardArrowUp size={16} /> : <MdKeyboardArrowDown size={16} />}
          </div>
        </button>
      </div>

      {/* COLLAPSIBLE OPERATIONAL SECTIONS */}
      {showOperationalDetails && (
        <div className="space-y-6">
          {/* ========================================================================= */}
          {/* SECTION 1: CUSTOMER RECEIVABLES (AGING) & VENDOR PAYABLES LEDGER           */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* WIDGET 1: CUSTOMER RECEIVABLES AGING LEDGER (7 COLS) */}
            <div className="lg:col-span-7 relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs hover:shadow-xs p-5 flex flex-col justify-between overflow-hidden transition-all duration-200 group">
              <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-indigo-500 shadow-xs transition-all duration-200 group-hover:w-2" />

              <div>
                <div className="flex justify-between items-center mb-3.5 border-b border-slate-100 dark:border-slate-800/80 pb-3 pl-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/60 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <MdOutlineReceipt size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Customer Receivables (Khata Balances)
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                        Top outstanding client debits with aging pending
                      </p>
                    </div>
                  </div>
                  <span className="text-[10.5px] px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold font-mono border border-indigo-200/70 dark:border-indigo-800/60 shrink-0">
                    {receivablesList.length} Due Balances
                  </span>
                </div>

                <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800 max-h-[295px] overflow-y-auto pr-1">
                  <table className="w-full table-auto border-collapse font-sans text-xs">
                    <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-800/90 backdrop-blur-xs z-10 shadow-2xs">
                      <tr className="text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-700/80 text-left text-[10.5px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Account Code</th>
                        <th className="py-2.5 px-3">Customer Title</th>
                        <th className="py-2.5 px-3">City / Contact</th>
                        <th className="py-2.5 px-3">Aging Status</th>
                        <th className="py-2.5 px-3 text-right">Debit Balance (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {receivablesList.length > 0 ? (
                        receivablesList.map((rec) => {
                          let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
                          if (rec.daysPending > 30) {
                            badgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60';
                          } else if (rec.daysPending > 7) {
                            badgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60';
                          } else if (rec.daysPending === 0) {
                            badgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60';
                          }

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/90 dark:hover:bg-slate-800/50 duration-150 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                {rec.invoiceNo}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100 max-w-[140px] truncate" title={rec.customerName}>
                                {rec.customerName}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-[110px] truncate" title={rec.salesman}>
                                <span className="inline-flex items-center gap-1 font-medium">
                                  <MdPerson size={13} className="text-slate-400" />
                                  {rec.salesman}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono tracking-tight ${badgeClass}`}>
                                  {rec.daysPending === 0 ? 'Today' : `${rec.daysPending}d Pending`}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-xs">
                                Rs. {rec.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                            No outstanding customer balances found. All accounts settled! 🎉
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-[11px] text-slate-400 pl-2.5 mt-2">
                <span>Showing top outstanding customer balances</span>
                <button
                  onClick={() => navigate('/Reports/Account-Report', { state: { activeTab: 0 } })}
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Customer Balances Report</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* WIDGET 2: VENDOR PAYABLES LEDGER (5 COLS) */}
            <div className="lg:col-span-5 relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs hover:shadow-xs p-5 flex flex-col justify-between overflow-hidden transition-all duration-200 group">
              <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-rose-500 shadow-xs transition-all duration-200 group-hover:w-2" />

              <div>
                <div className="flex justify-between items-center mb-3.5 border-b border-slate-100 dark:border-slate-800/80 pb-3 pl-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <MdCorporateFare size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Vendor Payables
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                        Fabric suppliers & mills liabilities
                      </p>
                    </div>
                  </div>
                  <span className="text-[10.5px] px-2.5 py-1 rounded-full font-bold font-mono border bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60 shrink-0">
                    {payablesList.length} Suppliers Due
                  </span>
                </div>

                <div className="space-y-2 max-h-[295px] overflow-y-auto pr-1">
                  {payablesList.length > 0 ? (
                    payablesList.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 sm:p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 flex justify-between items-center gap-2.5 duration-150 group/item transition-all"
                      >
                        <div className="min-w-0 flex-1 pl-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate group-hover/item:text-rose-600 dark:group-hover/item:text-rose-400 transition-colors" title={p.vendorName}>
                            {p.vendorName}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{p.vendorCode}</span>
                            <span>•</span>
                            <span className="truncate">{p.city}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-black text-rose-600 dark:text-rose-400 text-xs">
                            Rs. {p.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            onClick={() => navigate('/Vouchers/Vendor-Payment/Add')}
                            className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10.5px] font-bold hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition shadow-2xs cursor-pointer"
                            title="Make Vendor Payment"
                          >
                            + Pay
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center gap-2">
                      <MdCheckCircle size={32} />
                      <span className="font-bold text-xs">All Vendor Liabilities are Cleared</span>
                      <span className="text-[11px] text-slate-400">No pending payable balances.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-right mt-2">
                <button
                  onClick={() => navigate('/Reports/Account-Report', { state: { activeTab: 1 } })}
                  className="text-rose-600 dark:text-rose-400 font-bold hover:underline text-[11px] inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Vendor Balance Report</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: RECENT VOUCHERS FLOW & TOP KHATAS                              */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* WIDGET 3: RECENT FINANCIAL VOUCHERS STREAM (7 COLS) */}
            <div className="lg:col-span-7 relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs hover:shadow-xs p-5 flex flex-col justify-between overflow-hidden transition-all duration-200 group">
              <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-emerald-500 shadow-xs transition-all duration-200 group-hover:w-2" />

              <div>
                <div className="flex justify-between items-center mb-3.5 border-b border-slate-100 dark:border-slate-800/80 pb-3 pl-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <MdReceipt size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Recent Vouchers Stream
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                        Live stream of sales, purchases, payments & receipts
                      </p>
                    </div>
                  </div>
                  <span className="text-[10.5px] px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold font-mono border border-emerald-200/70 dark:border-emerald-800/60 shrink-0">
                    Live Vouchers
                  </span>
                </div>

                <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800 max-h-[295px] overflow-y-auto pr-1">
                  <table className="w-full table-auto border-collapse font-sans text-xs">
                    <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-800/90 backdrop-blur-xs z-10 shadow-2xs">
                      <tr className="text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-700/80 text-left text-[10.5px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Voucher #</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Party / Account Title</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3 text-right">Amount (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {recentVouchers.length > 0 ? (
                        recentVouchers.map((v) => {
                          let badgeBg = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                          const vUpper = v.voucherNo.toUpperCase();
                          if (vUpper.startsWith('SAV')) badgeBg = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
                          else if (vUpper.startsWith('SRV')) badgeBg = 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
                          else if (vUpper.startsWith('CRV')) badgeBg = 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800';
                          else if (vUpper.startsWith('PAV')) badgeBg = 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
                          else if (vUpper.startsWith('PRV')) badgeBg = 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
                          else if (vUpper.startsWith('VPV')) badgeBg = 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
                          else if (vUpper.startsWith('EXP')) badgeBg = 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800';

                          return (
                            <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 duration-150 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                {v.voucherNo}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${badgeBg}`}>
                                  {v.voucherNo.split('-')[0] || 'VCH'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200 max-w-[160px] truncate" title={v.accountTitle}>
                                {v.accountTitle}
                                <div className="text-[10px] text-slate-400 truncate">{v.narration}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 font-mono text-[10.5px]">
                                {v.voucherDate}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 dark:text-white">
                                Rs. {v.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-slate-400 italic">
                            No vouchers registered yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-[11px] mt-2">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Real-time ledger postings</span>
                <button
                  onClick={() => navigate('/Registration/Vouchers/List')}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Open All Vouchers Registry</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* WIDGET 4: TOP CUSTOMER BALANCES (5 COLS) */}
            <div className="lg:col-span-5 relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs hover:shadow-xs p-5 flex flex-col justify-between overflow-hidden transition-all duration-200 group">
              <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-teal-500 shadow-xs transition-all duration-200 group-hover:w-2" />

              <div>
                <div className="flex justify-between items-center mb-3.5 border-b border-slate-100 dark:border-slate-800/80 pb-3 pl-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200/70 dark:border-teal-800/60 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <MdPayments size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Top Active Khatas
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                        Ranked by outstanding debit balance
                      </p>
                    </div>
                  </div>
                  <span className="text-[10.5px] px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold font-mono border border-teal-200/70 dark:border-teal-800/60 shrink-0">
                    Khatas
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[295px] overflow-y-auto pr-1">
                  {topKhatas.length > 0 ? (
                    topKhatas.map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-2.5 sm:p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 flex items-center gap-3 transition-all duration-150 group/item"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : <span className="font-mono text-slate-500 dark:text-slate-400">#{idx + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs group-hover/item:text-teal-600 dark:group-hover/item:text-teal-400 transition-colors" title={p.name}>
                              {p.name}
                            </span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs shrink-0 ml-2">
                              Rs. {(p.balance / 1000).toFixed(1)}k
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 mb-1.5 font-medium">
                            <span className="font-mono">{p.code}</span>
                            <span className="shrink-0">{p.percentageOfTotal.toFixed(1)}% of total debt</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                              style={{ width: `${Math.max(8, p.percentageOfTotal)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 italic">
                      No active customer khata balances.
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-right mt-2">
                <button
                  onClick={() => navigate('/Sales/Customers/List')}
                  className="text-teal-600 dark:text-teal-400 font-bold hover:underline text-[11px] inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Customers Directory</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: LIQUIDITY CENTER (BANK ACCOUNTS & CASH DRAWER DUAL TABS)       */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Bank Allocation Donut Chart (4 cols) */}
            <div className="lg:col-span-4 relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs hover:shadow-xs p-5 sm:p-6 flex flex-col justify-between overflow-hidden transition-all duration-200 group">
              <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-cyan-500 shadow-xs transition-all duration-200 group-hover:w-2" />

              <div>
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3 pl-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 border border-cyan-200/70 dark:border-cyan-800/60 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <MdAccountBalance size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Bank Balance
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                        Distribution across corporate liquid accounts
                      </p>
                    </div>
                  </div>
                </div>
                <ReactApexChart options={bankDonutOptions} series={bankDonutSeries} type="donut" height={260} />
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-2 font-medium">
                Net Liquid Reserves: <span className="font-bold text-slate-800 dark:text-slate-100 font-mono">Rs. {(metrics.totalBankBalance + metrics.cashBalance).toLocaleString()}</span>
              </div>
            </div>

            {/* Liquid Ledgers (Bank Accounts & Cash Drawer Tabs) (8 cols) */}
            <div className="lg:col-span-8 relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs hover:shadow-xs p-5 sm:p-6 flex flex-col justify-between overflow-hidden transition-all duration-200 group">
              <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-emerald-500 shadow-xs transition-all duration-200 group-hover:w-2" />

              <div>
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3 pl-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                      <MdAccountBalanceWallet size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                        Cash & Bank Ledgers
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                        Reconciled bank accounts & cash drawer settlements
                      </p>
                    </div>
                  </div>

                  {/* Dual Tab */}
                  <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 font-bold text-xs">
                    <button
                      onClick={() => setLiquidityTab('bank')}
                      className={`px-3 py-1 rounded-md text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${liquidityTab === 'bank'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                        }`}
                    >
                      <MdAccountBalance size={14} />
                      <span>Bank Accounts ({metrics.bankAccounts?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => setLiquidityTab('cash')}
                      className={`px-3 py-1 rounded-md text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${liquidityTab === 'cash'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                        }`}
                    >
                      <MdAccountBalanceWallet size={14} />
                      <span>Cash Drawer</span>
                    </button>
                  </div>
                </div>

                {/* TAB 1: BANK ACCOUNTS */}
                {liquidityTab === 'bank' && (
                  <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800 max-h-[260px] overflow-y-auto">
                    <table className="w-full table-auto border-collapse font-mono text-xs">
                      <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-800/90 backdrop-blur-xs z-10 shadow-2xs">
                        <tr className="text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-700/80 text-left text-[10.5px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Bank Title</th>
                          <th className="py-2.5 px-3">Account Number</th>
                          <th className="py-2.5 px-3 text-right">Debit (+In)</th>
                          <th className="py-2.5 px-3 text-right">Credit (-Out)</th>
                          <th className="py-2.5 px-3 text-right font-black">Net Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {metrics.bankAccounts && metrics.bankAccounts.length > 0 ? (
                          metrics.bankAccounts.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 duration-150 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100 font-sans flex items-center gap-2">
                                <span className="p-1 rounded-md bg-cyan-50 text-cyan-600 dark:bg-cyan-950/40 dark:text-cyan-400 border border-cyan-200/60 dark:border-cyan-800/50">
                                  <MdAccountBalance size={14} />
                                </span>
                                {b.bankName} - {b.accountTitle}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono">{b.accountNumber || '-'}</td>
                              <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                                {b.totalInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right text-rose-500 dark:text-rose-400 font-semibold font-mono">
                                {b.totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white font-mono">
                                Rs. {b.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                              No corporate bank accounts registered.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAB 2: CASH DRAWER */}
                {liquidityTab === 'cash' && (
                  <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800 max-h-[260px] overflow-y-auto">
                    <table className="w-full table-auto border-collapse font-mono text-xs">
                      <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-800/90 backdrop-blur-xs z-10 shadow-2xs">
                        <tr className="text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200/80 dark:border-slate-700/80 text-left text-[10.5px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Voucher #</th>
                          <th className="py-2.5 px-3">Particulars / Party</th>
                          <th className="py-2.5 px-3 text-center">Type</th>
                          <th className="py-2.5 px-3 text-right">Amount (Rs.)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {cashTransactions.length > 0 ? (
                          cashTransactions.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 duration-150 transition-colors">
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono">{c.date}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100 font-sans">{c.source}</td>
                              <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-sans max-w-[140px] truncate" title={c.party}>
                                {c.party}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${c.type === 'Inflow'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50'
                                  }`}>
                                  {c.type === 'Inflow' ? '+ Received' : '- Paid'}
                                </span>
                              </td>
                              <td className={`py-2.5 px-3 text-right font-black font-mono ${c.type === 'Inflow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                Rs. {c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                              No recent cash drawer movements found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center text-xs mt-2">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {liquidityTab === 'bank' ? 'Real-time verified bank reconciliation' : `Current Cash In Hand: Rs. ${metrics.cashBalance.toLocaleString()}`}
                </span>
                <button
                  onClick={() => navigate('/Reports/Account-Report')}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline text-xs flex items-center gap-1 cursor-pointer"
                >
                  <span>View Full General Ledger</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: CHARTS (SALES VS PURCHASES & CUSTOMER SALES WITH DAILY/MONTHLY)*/}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CHART 1: SALES VS PROCUREMENT */}
            <div className="relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs hover:shadow-xs p-5 sm:p-6 overflow-hidden transition-all duration-200 group">
              <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-blue-500 shadow-xs transition-all duration-200 group-hover:w-2" />

              <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3 pl-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                    <MdShowChart size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      Sales vs Purchases
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Monthly comparative velocity (SAV vs PAV)</p>
                  </div>
                </div>
                <span className="text-[10.5px] px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold font-mono border border-blue-200/70 dark:border-blue-800/60 shrink-0">
                  Live Sync
                </span>
              </div>
              <ReactApexChart options={salesVsPurchasesOptions} series={salesVsPurchasesSeries} type="area" height={300} />
            </div>

            {/* CHART 2: CUSTOMER SALES VOLUME GRAPH */}
            <div className="relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-2xs hover:shadow-xs p-5 sm:p-6 overflow-hidden transition-all duration-200 group">
              <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-purple-500 shadow-xs transition-all duration-200 group-hover:w-2" />

              <div className="flex flex-wrap justify-between items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3 pl-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200/70 dark:border-purple-800/60 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                    <MdBarChart size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      Customer Sales Trend
                    </h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Timeframe aggregation (Daily / Monthly)</p>
                  </div>
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 font-bold text-xs">
                  <button
                    onClick={() => setChartViewTab('daily')}
                    className={`px-3 py-1 rounded-md text-[11px] transition-all cursor-pointer ${chartViewTab === 'daily'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                      }`}
                  >
                    📅 Daily (Last 14d)
                  </button>
                  <button
                    onClick={() => setChartViewTab('monthly')}
                    className={`px-3 py-1 rounded-md text-[11px] transition-all cursor-pointer ${chartViewTab === 'monthly'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                      }`}
                  >
                    📆 Monthly
                  </button>
                </div>
              </div>
              <ReactApexChart options={customerSalesChartOptions} series={customerSalesChartSeries} type="bar" height={300} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FINANCIAL METRIC BREAKDOWN POPUP MODAL                                    */}
      {/* ========================================================================= */}
      {activeBreakdownModal && metrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-2xs border ${
                  activeBreakdownModal === 'cash'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/60'
                    : activeBreakdownModal === 'bank'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200/70 dark:border-blue-800/60'
                    : activeBreakdownModal === 'receivables'
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200/70 dark:border-indigo-800/60'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200/70 dark:border-rose-800/60'
                }`}>
                  {activeBreakdownModal === 'cash' && <MdAccountBalanceWallet size={22} />}
                  {activeBreakdownModal === 'bank' && <MdAccountBalance size={22} />}
                  {activeBreakdownModal === 'receivables' && <MdReceiptLong size={22} />}
                  {activeBreakdownModal === 'payables' && <MdCorporateFare size={22} />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                    {activeBreakdownModal === 'cash' && 'Cash Liquidity & Inflow Ledger'}
                    {activeBreakdownModal === 'bank' && 'Corporate Bank Accounts'}
                    {activeBreakdownModal === 'receivables' && 'Customer Receivables & Aging'}
                    {activeBreakdownModal === 'payables' && 'Vendor Payables & Supplier Balances'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeBreakdownModal === 'cash' && 'Cash drawer inflows, outflows & balances'}
                    {activeBreakdownModal === 'bank' && 'Verified multi-bank treasury accounts'}
                    {activeBreakdownModal === 'receivables' && 'Outstanding customer debt & collection status'}
                    {activeBreakdownModal === 'payables' && 'Liabilities owed to fabric suppliers and mills'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveBreakdownModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
              >
                <MdClose size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* === 1. CASH MODAL === */}
              {activeBreakdownModal === 'cash' && (
                <div className="space-y-4">
                  <div className="relative p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs overflow-hidden">
                    <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-emerald-500 shadow-xs" />
                    <div className="pl-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Net Cash in Hand
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Reconciled Treasury
                        </span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-black mt-1.5 font-mono tracking-tight text-slate-900 dark:text-white">
                        Rs. {metrics.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                      <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block">Total Cash Inflows</span>
                      <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                        +Rs. {metrics.totalCashInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40">
                      <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 block">Total Cash Outflows</span>
                      <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400 mt-1 block">
                        -Rs. {metrics.totalCashOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 space-y-2.5 font-sans text-xs">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">This Month Cash Collected:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                        Rs. {metrics.thisMonthCashInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 font-bold text-sm bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                      <span className="text-slate-900 dark:text-white">Net Cash Balance:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono text-lg font-black">
                        Rs. {metrics.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* === 2. BANK MODAL === */}
              {activeBreakdownModal === 'bank' && (
                <div className="space-y-4">
                  <div className="relative p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs overflow-hidden">
                    <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-blue-500 shadow-xs" />
                    <div className="pl-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Bank Balance</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {metrics.bankAccounts.length} Verified Accounts
                        </span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-black mt-1.5 font-mono tracking-tight text-slate-900 dark:text-white">
                        Rs. {metrics.totalBankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 space-y-3 font-sans text-xs max-h-60 overflow-y-auto">
                    {metrics.bankAccounts.length === 0 ? (
                      <p className="text-center text-slate-400 py-3">No active corporate bank accounts recorded.</p>
                    ) : (
                      metrics.bankAccounts.map((b, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{b.accountTitle || b.bankName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{b.accountNumber || 'Primary Account'}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            Rs. {Number(b.netBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* === 3. RECEIVABLES MODAL === */}
              {activeBreakdownModal === 'receivables' && (
                <div className="space-y-4">
                  <div className="relative p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs overflow-hidden">
                    <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-indigo-500 shadow-xs" />
                    <div className="pl-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Customer Receivables</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-100/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {receivablesList.length} Active Accounts
                        </span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-black mt-1.5 font-mono tracking-tight text-slate-900 dark:text-white">
                        Rs. {metrics.totalReceivables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 space-y-2 font-sans text-xs max-h-56 overflow-y-auto">
                    {receivablesList.slice(0, 8).map((rec, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{rec.customerName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{rec.invoiceNo} • {rec.salesman}</span>
                        </div>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          Rs. {rec.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* === 4. PAYABLES MODAL === */}
              {activeBreakdownModal === 'payables' && (
                <div className="space-y-4">
                  <div className="relative p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs overflow-hidden">
                    <span className="absolute left-0 top-3.5 bottom-3.5 w-1.25 rounded-r-full bg-rose-500 shadow-xs" />
                    <div className="pl-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Vendor Payables</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100/80 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          {payablesList.length} Suppliers Due
                        </span>
                      </div>
                      <div className="text-3xl sm:text-4xl font-black mt-1.5 font-mono tracking-tight text-slate-900 dark:text-white">
                        Rs. {metrics.totalPayables.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 space-y-2 font-sans text-xs max-h-56 overflow-y-auto">
                    {payablesList.slice(0, 8).map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-200/60 dark:border-slate-700/60 last:border-0">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block">{p.vendorName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{p.vendorCode} • {p.city}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                            Rs. {p.outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            onClick={() => {
                              setActiveBreakdownModal(null);
                              navigate('/Vouchers/Vendor-Payment/Add');
                            }}
                            className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-bold hover:bg-purple-100 cursor-pointer"
                          >
                            Pay
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end">
              <button
                onClick={() => setActiveBreakdownModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
