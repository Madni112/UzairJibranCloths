import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { useAuth } from '../../../Context/Auth';
import Spinner from '../../../ui/Spinner';
import { FiPrinter, FiArrowLeft } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';

export interface QuotationItem {
  id?: string | number;
  product_id?: string | number;
  product_name: string;
  category?: string;
  unit?: string;
  qty: number;
  rate: number;
  discount_percent?: number;
  discount_amount?: number;
  amount: number;
  notes?: string;
}

export interface QuotationData {
  id: number | string;
  tenant_id?: string;
  quotation_number?: string;
  quote_no?: string;
  customer?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  date?: string;
  valid_until?: string;
  salesman_name?: string;
  amount?: number;
  total_amount?: number;
  status?: string;
  items?: QuotationItem[];
  notes?: string;
  terms_conditions?: string;
  created_at: string;
}

const numberToWords = (num: number): string => {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n === 0) return 'Zero';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  };

  const integerPart = Math.floor(Math.abs(num));
  return inWords(integerPart) + ' Rupees Only';
};

const PrintQuotation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenantId, businessName } = useAuth();
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const fetchQuotation = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setQuotation(data);
    } catch (err: any) {
      console.error('Error fetching quotation:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50 dark:bg-boxdark">
        <Spinner size="w-10 h-10" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="text-center py-20 bg-slate-50 dark:bg-boxdark min-h-screen text-slate-500 font-bold">
        Quotation record not found.
      </div>
    );
  }

  const items: QuotationItem[] = Array.isArray(quotation.items)
    ? quotation.items
    : typeof quotation.items === 'string'
    ? JSON.parse(quotation.items || '[]')
    : [];

  const quoteNo = quotation.quotation_number || quotation.quote_no || `QT-${String(quotation.id).padStart(4, '0')}`;
  const quoteDate = quotation.date
    ? new Date(quotation.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date(quotation.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const validUntilFormatted = quotation.valid_until
    ? new Date(quotation.valid_until).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '15 Days from Date';

  const customerName = quotation.customer_name || quotation.customer || 'Valued Customer';
  const customerPhone = quotation.customer_phone || '';
  const customerAddress = quotation.customer_address || '';

  // Financial calculations
  let subtotal = 0;
  let totalDiscount = 0;

  items.forEach(item => {
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const gross = qty * rate;
    const disc = Number(item.discount_amount || (gross * Number(item.discount_percent || 0)) / 100 || 0);
    subtotal += gross;
    totalDiscount += disc;
  });

  const grandTotal = Number(quotation.total_amount || quotation.amount || Math.max(0, subtotal - totalDiscount));

  const handleSendWhatsApp = () => {
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    const greeting = `Hello *${customerName}*,\n\nHere is your official Price Quotation from *${businessName || 'Zoaib Ali & Company'}*:\n\n` +
      `📄 *Quotation No:* ${quoteNo}\n` +
      `📅 *Date:* ${quoteDate}\n` +
      `⏳ *Validity:* Valid Until ${validUntilFormatted}\n` +
      `💰 *Total Amount:* PKR ${grandTotal.toLocaleString()}\n\n` +
      `*Items Summary:*\n` +
      items.map((it, idx) => `${idx + 1}. ${it.product_name} - ${it.qty} ${it.unit || 'units'} @ PKR ${Number(it.rate).toLocaleString()}`).join('\n') +
      `\n\nThank you for considering us. Let us know if you'd like to proceed!`;

    const encoded = encodeURIComponent(greeting);
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-6 print:p-0 print:bg-white text-slate-900 font-sans">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            font-size: 11px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th {
            background-color: #0f172a !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ── Top Toolbar (No-Print) ─────────────────────────────────────────── */}
      <div className="no-print max-w-4xl mx-auto flex flex-wrap justify-between items-center gap-3 mb-6 bg-slate-900 text-white p-4 rounded-2xl shadow-md">
        <button
          onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/crm/quotations`)}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <FiArrowLeft size={16} />
          <span>Back to Quotations</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSendWhatsApp}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 px-4 text-xs font-bold text-white transition shadow-xs cursor-pointer"
            title="Open WhatsApp with pre-filled Quotation summary"
          >
            <FaWhatsapp size={16} />
            <span>Send on WhatsApp</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-2 px-5 text-xs font-bold text-white transition shadow-xs cursor-pointer"
          >
            <FiPrinter size={16} />
            <span>Print Quotation</span>
          </button>
        </div>
      </div>

      {/* ── Official A4 Printable Quotation ─────────────────────────────────── */}
      <div className="print-card max-w-4xl mx-auto border border-slate-300 rounded-3xl p-6 sm:p-10 bg-white shadow-xl print:border-none print:p-0 print:shadow-none">

        {/* 1. Header / Letterhead */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-900 pb-5 mb-5 gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-5 w-5 bg-emerald-600 rounded-md"></span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 uppercase">
                {businessName || 'ZOAIB ALI & COMPANY'}
              </h1>
            </div>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              Premium Tiles, Sanitary Ware, Porcelain & Construction Finishes
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Showroom & Main Display: Hyderabad / Karachi, Pakistan | Phone: +92 300 0000000
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black tracking-widest uppercase rounded-md">
              OFFICIAL QUOTATION
            </span>
            <p className="text-base font-black text-slate-900 mt-2 font-mono">{quoteNo}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Date: {quoteDate}</p>
            <p className="text-xs font-bold text-emerald-700 mt-0.5">Valid Until: {validUntilFormatted}</p>
          </div>
        </div>

        {/* 2. Customer & Quotation Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6 text-xs">
          <div>
            <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Customer / Client Information</p>
            <p className="text-sm font-black text-slate-900 mt-0.5">{customerName}</p>
            {customerPhone && <p className="text-slate-600 font-semibold mt-0.5">Phone: {customerPhone}</p>}
            {customerAddress && <p className="text-slate-600 mt-0.5">Delivery / Project Site: {customerAddress}</p>}
          </div>

          <div className="sm:text-right flex flex-col justify-between">
            <div>
              <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">Prepared By</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {quotation.salesman_name || 'Showroom Sales Division'}
              </p>
            </div>
            <div className="mt-2">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                quotation.status === 'Accepted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : quotation.status === 'Sent'
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                Status: {quotation.status || 'Draft'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Itemized Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-left text-xs border border-slate-200">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Product Description / Specifications</th>
                <th className="py-2.5 px-3 w-20 text-center">Unit</th>
                <th className="py-2.5 px-3 w-20 text-right">Quantity</th>
                <th className="py-2.5 px-3 w-28 text-right">Rate (PKR)</th>
                <th className="py-2.5 px-3 w-24 text-right">Discount</th>
                <th className="py-2.5 px-3 w-32 text-right">Total (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => {
                const qty = Number(item.qty || 0);
                const rate = Number(item.rate || 0);
                const gross = qty * rate;
                const discAmt = Number(item.discount_amount || (gross * Number(item.discount_percent || 0)) / 100 || 0);
                const lineTotal = Number(item.amount || (gross - discAmt));

                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900">{item.product_name}</p>
                      {item.notes && <p className="text-[10px] text-slate-500 italic mt-0.5">{item.notes}</p>}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-slate-600">{item.unit || 'Sqft'}</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">{qty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700">{rate.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">
                      {discAmt > 0 ? `PKR ${discAmt.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">{lineTotal.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. Financial Summary & Amount in Words */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 items-start">
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount in Words</p>
              <p className="text-xs font-black text-slate-900 mt-1 italic">{numberToWords(grandTotal)}</p>
            </div>

            {quotation.notes && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                <p className="font-bold text-amber-900 text-[11px] mb-1">Quotation Remarks:</p>
                <p className="text-amber-800 text-[11px] whitespace-pre-wrap">{quotation.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-bold font-mono">PKR {subtotal.toLocaleString()}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Total Discount:</span>
                <span className="font-bold font-mono">- PKR {totalDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t-2 border-slate-900 pt-2 flex justify-between text-sm sm:text-base font-black text-slate-950">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-700">PKR {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 5. Terms & Conditions */}
        <div className="border-t border-slate-200 pt-4 mb-8 text-[10px] text-slate-600 space-y-1">
          <p className="font-bold uppercase tracking-wider text-slate-900 text-[11px] mb-1">Terms & Conditions:</p>
          <p>1. This quotation is valid until <strong>{validUntilFormatted}</strong>. Prices are subject to revision thereafter.</p>
          <p>2. Stock availability will be confirmed at the time of final booking and purchase order receipt.</p>
          <p>3. Standard payment terms: 50% advance upon order confirmation, balance payable prior to warehouse dispatch.</p>
          <p>4. Breakage during transit at customer's transporter responsibility unless official delivery challan transit is booked.</p>
          <p>5. Colors and tile shades may have slight shade lot variation standard to ceramic/porcelain manufacturing.</p>
        </div>

        {/* 6. Signature Blocks */}
        <div className="grid grid-cols-2 gap-10 pt-10 border-t border-slate-200 text-center text-xs">
          <div>
            <div className="border-b border-slate-400 w-44 mx-auto mb-2"></div>
            <p className="font-bold text-slate-900">Authorized Signature</p>
            <p className="text-[10px] text-slate-500">{businessName || 'Zoaib Ali & Company'}</p>
          </div>
          <div>
            <div className="border-b border-slate-400 w-44 mx-auto mb-2"></div>
            <p className="font-bold text-slate-900">Client Acceptance Signature</p>
            <p className="text-[10px] text-slate-500">I accept terms and confirm order</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrintQuotation;
