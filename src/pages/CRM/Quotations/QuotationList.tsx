import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { supabase } from '../../../Context/supabaseClient';
import { useAuth, usePermission } from '../../../Context/Auth';
import { getBrandConfig } from '../../../utils/brand';
import Spinner from '../../../ui/Spinner';
import { toast } from 'react-hot-toast';
import {
  MdAdd,
  MdSearch,
  MdFilterList,
  MdReceipt,
  MdPrint,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdTransform,
  MdCalendarToday,
  MdPerson,
  MdTrendingUp,
  MdHourglassEmpty,
  MdClose
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import TableActions from '../../../ui/TableActions';

export interface QuotationRow {
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
  status?: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Converted to Invoice' | string;
  items?: any[];
  notes?: string;
  created_at: string;
}

const QuotationList: React.FC = () => {
  const navigate = useNavigate();
  const { tenantId, businessName } = useAuth();
  const perm = usePermission('/crm/quotations');

  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [convertingId, setConvertingId] = useState<string | number | null>(null);
  const [isCloudTableAvailable, setIsCloudTableAvailable] = useState<boolean>(true);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('crm_quotations')
        .select('*')
        .order('id', { ascending: false });

      if (error) {
        console.warn('crm_quotations cloud query note:', error.message);
        setIsCloudTableAvailable(false);
        try {
          const cached = localStorage.getItem('zac_quotations_records');
          if (cached) {
            setQuotations(JSON.parse(cached));
          } else {
            setQuotations([]);
          }
        } catch (_) {
          setQuotations([]);
        }
      } else {
        setIsCloudTableAvailable(true);
        setQuotations(data || []);
        try {
          localStorage.setItem('zac_quotations_records', JSON.stringify(data || []));
        } catch (_) {}
      }
    } catch (err: any) {
      console.warn('Error fetching quotations:', err);
      setIsCloudTableAvailable(false);
      try {
        const cached = localStorage.getItem('zac_quotations_records');
        if (cached) setQuotations(JSON.parse(cached));
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this quotation? This cannot be undone.')) {
      return;
    }

    try {
      await supabase
        .from('crm_quotations')
        .delete()
        .eq('id', id);
    } catch (_) {}

    const updated = quotations.filter(q => q.id !== id);
    setQuotations(updated);
    try {
      localStorage.setItem('zac_quotations_records', JSON.stringify(updated));
    } catch (_) {}
    toast.success('Quotation deleted successfully');
  };

  const handleUpdateStatus = async (id: string | number, newStatus: string) => {
    try {
      await supabase
        .from('crm_quotations')
        .update({ status: newStatus })
        .eq('id', id);
    } catch (_) {}

    const updated = quotations.map(q => q.id === id ? { ...q, status: newStatus } : q);
    setQuotations(updated);
    try {
      localStorage.setItem('zac_quotations_records', JSON.stringify(updated));
    } catch (_) {}
    toast.success(`Quotation marked as ${newStatus}`);
  };

  const handleConvertToInvoice = async (quote: QuotationRow) => {
    if (quote.status === 'Converted to Invoice') {
      toast('This quotation has already been converted to an invoice.', { icon: 'ℹ️' });
      return;
    }

    if (!window.confirm(`Convert Quotation ${quote.quotation_number || quote.quote_no || ''} for ${quote.customer_name || quote.customer} into an official Sales Invoice?`)) {
      return;
    }

    try {
      setConvertingId(quote.id);
      const nextInvNo = `INV-${Date.now().toString().slice(-6)}`;
      const items = Array.isArray(quote.items) ? quote.items : (typeof quote.items === 'string' ? JSON.parse(quote.items || '[]') : []);

      // 1. Create Sales Invoice
      const invoicePayload = {
        tenant_id: tenantId || 'bashir',
        invoice_no: nextInvNo,
        customer_name: quote.customer_name || quote.customer || 'Customer',
        total_amount: Number(quote.total_amount || quote.amount || 0),
        invoice_date: new Date().toISOString().split('T')[0],
        receipt_status: 'Unpaid',
        sale_status: 'Final',
        items: items,
        quotation_id: String(quote.id),
      };

      const { data: invData, error: invError } = await supabase
        .from('sales_invoices')
        .insert([invoicePayload])
        .select('id, invoice_no')
        .single();

      if (invError) throw invError;

      // 2. Update quotation status
      await supabase
        .from('crm_quotations')
        .update({ status: 'Converted to Invoice' })
        .eq('id', quote.id);

      toast.success(`Converted! Sales Invoice ${nextInvNo} generated successfully.`);
      setQuotations(prev => prev.map(q => q.id === quote.id ? { ...q, status: 'Converted to Invoice' } : q));

      if (invData?.id) {
        navigate(`${tenantId ? `/${tenantId}` : ''}/Sales/Invoice/Print/${invData.id}`);
      }
    } catch (err: any) {
      console.error('Conversion error:', err);
      toast.error(err.message || 'Failed to convert quotation to invoice');
    } finally {
      setConvertingId(null);
    }
  };

  const handleSendWhatsApp = (quote: QuotationRow) => {
    const quoteNo = quote.quotation_number || quote.quote_no || `QT-${quote.id}`;
    const custName = quote.customer_name || quote.customer || 'Customer';
    const amount = Number(quote.total_amount || quote.amount || 0).toLocaleString();
    const phone = (quote.customer_phone || '').replace(/[^0-9]/g, '');

    const items = Array.isArray(quote.items) ? quote.items : (typeof quote.items === 'string' ? JSON.parse(quote.items || '[]') : []);
    const itemsText = items.map((it: any, idx: number) => `${idx + 1}. ${it.product_name} (${it.qty} ${it.unit || 'units'} @ PKR ${Number(it.rate || 0).toLocaleString()})`).join('\n');

    const msg = `Hello *${custName}*,\n\nHere is your official Price Quotation from *${businessName || getBrandConfig().name}*:\n\n` +
      `📄 *Quotation No:* ${quoteNo}\n` +
      `📅 *Date:* ${quote.date || ''}\n` +
      `⏳ *Validity:* ${quote.valid_until || '15 Days'}\n` +
      `💰 *Total Amount:* PKR ${amount}\n\n` +
      `*Quoted Items:*\n${itemsText}\n\n` +
      `Please let us know if you approve this estimate!`;

    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // KPI Calculations
  const totalCount = quotations.length;
  const totalValue = quotations.reduce((sum, q) => sum + Number(q.total_amount || q.amount || 0), 0);
  const pendingQuotes = quotations.filter(q => q.status === 'Sent' || q.status === 'Draft');
  const pendingValue = pendingQuotes.reduce((sum, q) => sum + Number(q.total_amount || q.amount || 0), 0);
  const acceptedQuotes = quotations.filter(q => q.status === 'Accepted' || q.status === 'Converted to Invoice');
  const acceptedValue = acceptedQuotes.reduce((sum, q) => sum + Number(q.total_amount || q.amount || 0), 0);

  // Filtering
  const filteredQuotations = quotations.filter(q => {
    const qNo = (q.quotation_number || q.quote_no || '').toLowerCase();
    const cName = (q.customer_name || q.customer || '').toLowerCase();
    const phone = (q.customer_phone || '').toLowerCase();
    const sName = (q.salesman_name || '').toLowerCase();
    const matchSearch = qNo.includes(searchTerm.toLowerCase()) ||
      cName.includes(searchTerm.toLowerCase()) ||
      phone.includes(searchTerm.toLowerCase()) ||
      sName.includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;
    if (statusFilter !== 'All' && q.status !== statusFilter) return false;
    return true;
  });

  const copySupabaseSql = () => {
    const sql = `CREATE TABLE IF NOT EXISTS public.crm_quotations (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) DEFAULT 'bashir',
    quotation_number VARCHAR(64),
    quote_no VARCHAR(64),
    customer VARCHAR(255),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(64),
    customer_address TEXT,
    date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    amount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    status VARCHAR(64) DEFAULT 'Draft',
    salesman_name VARCHAR(255),
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crm_quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read-write for crm_quotations" ON public.crm_quotations FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.crm_quotations TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;`;

    navigator.clipboard.writeText(sql);
    toast.success('SQL copied to clipboard! Paste and run it in Supabase SQL editor.');
  };

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 space-y-6">
      <Breadcrumb pageName="Customer Price Quotations" />

      {/* Cloud DB Notice if table not created yet */}
      {!isCloudTableAvailable && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <div>
            <p className="font-bold">Cloud Sync Setup Required</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
              Quotations are currently functioning in instant local mode. To enable real-time cloud sync across all your ERP users, run the 1-click SQL in your Supabase SQL Editor.
            </p>
          </div>
          <button
            type="button"
            onClick={copySupabaseSql}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shrink-0 cursor-pointer shadow-xs"
          >
            Copy SQL Script
          </button>
        </div>
      )}

      {/* ── KPI Metrics Overview ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quotes */}
        <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Quotations</p>
            <p className="text-xl font-black text-black dark:text-white mt-1">{totalCount}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 font-mono">PKR {totalValue.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl font-bold">
            <MdReceipt />
          </div>
        </div>

        {/* Pending / In-Negotiation */}
        <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Pending & Sent</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{pendingQuotes.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 font-mono">PKR {pendingValue.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl font-bold">
            <MdHourglassEmpty />
          </div>
        </div>

        {/* Accepted / Won */}
        <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Confirmed / Won</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{acceptedQuotes.length}</p>
            <p className="text-[11px] text-emerald-600/80 mt-0.5 font-mono font-bold">PKR {acceptedValue.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-bold">
            <MdCheckCircle />
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Quotation Win Rate</p>
            <p className="text-xl font-black text-black dark:text-white mt-1">
              {totalCount > 0 ? Math.round((acceptedQuotes.length / totalCount) * 100) : 0}%
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Based on client confirmations</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl font-bold">
            <MdTrendingUp />
          </div>
        </div>
      </div>

      {/* ── Search, Filters & Create Action Bar ────────────────────────────── */}
      <div className="bg-white dark:bg-boxdark p-4 rounded-2xl border border-stroke dark:border-strokedark shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <MdSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search Quote #, customer, phone..."
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4/40 text-black dark:text-white focus:outline-hidden"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white"
            >
              <MdClose size={14} />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto overflow-x-auto w-full md:w-auto">
          {['All', 'Draft', 'Sent', 'Accepted', 'Rejected', 'Converted to Invoice'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-[11px] px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                  : 'bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Create Button (Guarded with granular permission) */}
        {perm.canAdd && (
          <button
            onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/crm/quotations/add`)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0 w-full md:w-auto justify-center"
          >
            <MdAdd size={18} />
            <span>New Quotation</span>
          </button>
        )}
      </div>

      {/* ── Quotations Table ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="w-8 h-8" />
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <MdReceipt className="text-4xl mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-bold">No quotations found</p>
            <p className="text-xs text-gray-400 mt-1">
              {searchTerm ? 'Try adjusting your search criteria' : 'Create your first price quotation using the button above'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-100 dark:bg-meta-4/40 text-gray-700 dark:text-gray-300 font-bold border-b border-stroke dark:border-strokedark">
                  <th className="p-3.5">Quotation #</th>
                  <th className="p-3.5">Date & Validity</th>
                  <th className="p-3.5">Customer / Contact</th>
                  <th className="p-3.5">Items Summary</th>
                  <th className="p-3.5 text-right">Amount (PKR)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark">
                {filteredQuotations.map(quote => {
                  const quoteNo = quote.quotation_number || quote.quote_no || `QT-${quote.id}`;
                  const custName = quote.customer_name || quote.customer || 'Customer';
                  const itemsList = Array.isArray(quote.items) ? quote.items : (typeof quote.items === 'string' ? JSON.parse(quote.items || '[]') : []);
                  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();
                  const total = Number(quote.total_amount || quote.amount || 0);

                  return (
                    <tr key={quote.id} className="hover:bg-gray-50/50 dark:hover:bg-meta-4/10 transition">
                      {/* Quote Number */}
                      <td className="p-3.5 font-bold font-mono text-emerald-700 dark:text-emerald-400">
                        {quoteNo}
                      </td>

                      {/* Date & Validity */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 font-semibold text-gray-800 dark:text-gray-200">
                          <MdCalendarToday size={12} className="text-gray-400" />
                          <span>{quote.date ? new Date(quote.date).toLocaleDateString('en-GB') : '-'}</span>
                        </div>
                        {quote.valid_until && (
                          <span className={`inline-block text-[10px] mt-0.5 px-1.5 py-0.2 rounded font-bold ${
                            isExpired ? 'bg-rose-100 text-rose-700' : 'text-gray-500'
                          }`}>
                            {isExpired ? 'Expired' : `Valid to ${new Date(quote.valid_until).toLocaleDateString('en-GB')}`}
                          </span>
                        )}
                      </td>

                      {/* Customer Info */}
                      <td className="p-3.5">
                        <p className="font-bold text-black dark:text-white">{custName}</p>
                        {quote.customer_phone && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{quote.customer_phone}</p>
                        )}
                      </td>

                      {/* Items Summary */}
                      <td className="p-3.5">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">
                          {itemsList.length} Line Item{itemsList.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[200px]">
                          {itemsList.map((i: any) => i.product_name).filter(Boolean).join(', ') || 'No item descriptions'}
                        </p>
                      </td>

                      {/* Total Amount */}
                      <td className="p-3.5 text-right font-black font-mono text-black dark:text-white">
                        PKR {total.toLocaleString()}
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5 text-center">
                        <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          quote.status === 'Accepted'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : quote.status === 'Converted to Invoice'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                            : quote.status === 'Sent'
                            ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                            : quote.status === 'Rejected'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-meta-4 dark:text-gray-300'
                        }`}>
                          {quote.status || 'Draft'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Print Button */}
                          <button
                            type="button"
                            onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/crm/quotations/print/${quote.id}`)}
                            title="Print Quotation PDF"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                          >
                            <MdPrint size={15} />
                          </button>

                          {/* 2. WhatsApp Button */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(quote)}
                            title="Send on WhatsApp"
                            className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition cursor-pointer"
                          >
                            <FaWhatsapp size={15} />
                          </button>

                          {/* 3. Convert to Invoice Button */}
                          {quote.status !== 'Converted to Invoice' && (
                            <button
                              type="button"
                              disabled={convertingId === quote.id}
                              onClick={() => handleConvertToInvoice(quote)}
                              title="1-Click Convert to Sales Invoice"
                              className="p-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition cursor-pointer disabled:opacity-50"
                            >
                              {convertingId === quote.id ? <Spinner size="w-3.5 h-3.5" /> : <MdTransform size={15} />}
                            </button>
                          )}

                          {/* 4. Edit / Delete with TableActions */}
                          <TableActions
                            canEdit={perm.canEdit}
                            canDelete={perm.canDelete}
                            onEdit={() => navigate(`${tenantId ? `/${tenantId}` : ''}/crm/quotations/edit/${quote.id}`)}
                            onDelete={() => handleDelete(quote.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationList;
