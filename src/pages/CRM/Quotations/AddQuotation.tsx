import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { supabase } from '../../../Context/supabaseClient';
import { useAuth } from '../../../Context/Auth';
import CustomerCombobox, { CustomerComboboxItem } from '../../../components/CustomerCombobox';
import Spinner from '../../../ui/Spinner';
import { toast } from 'react-hot-toast';
import {
  MdAdd,
  MdDeleteOutline,
  MdSave,
  MdArrowBack,
  MdReceipt,
  MdPerson,
  MdCalendarToday,
  MdOutlineNotes,
  MdCheckCircle,
  MdLocalOffer,
  MdInventory2,
  MdPrint
} from 'react-icons/md';
import { FaWhatsapp } from 'react-icons/fa';
import { QuotationItem } from './PrintQuotation';

const AddQuotation: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { tenantId, userName } = useAuth();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  // Catalogs
  const [customerDirectory, setCustomerDirectory] = useState<CustomerComboboxItem[]>([]);
  const [productsCatalog, setProductsCatalog] = useState<any[]>([]);

  // Form State
  const [quoteNo, setQuoteNo] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | number>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [salesmanName, setSalesmanName] = useState(userName || '');
  const [status, setStatus] = useState<'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Converted to Invoice'>('Draft');
  const [notes, setNotes] = useState('Prices quoted are valid for 15 days. Delivery charges extra if outside municipal limits.');

  // Items State
  const [items, setItems] = useState<QuotationItem[]>([
    {
      product_name: '',
      unit: 'Sqft',
      qty: 1,
      rate: 0,
      discount_percent: 0,
      discount_amount: 0,
      amount: 0,
      notes: ''
    }
  ]);

  useEffect(() => {
    fetchCatalogs();
    if (isEditMode) {
      loadQuotationToEdit();
    } else {
      generateQuotationNumber();
    }
  }, [id]);

  const generateQuotationNumber = async () => {
    try {
      const year = new Date().getFullYear();
      const { count, error } = await supabase
        .from('crm_quotations')
        .select('*', { count: 'exact', head: true });

      const nextNum = (count || 0) + 1;
      setQuoteNo(`QT-${year}-${String(nextNum).padStart(4, '0')}`);
    } catch {
      setQuoteNo(`QT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
    }
  };

  const fetchCatalogs = async () => {
    try {
      // 1. Fetch Customers
      const { data: custData } = await supabase
        .from('customers')
        .select('id, customer_name, phone, address, city')
        .order('customer_name');

      if (custData) {
        setCustomerDirectory(
          custData.map(c => ({
            id: c.id,
            name: c.customer_name,
            phone: c.phone || '',
            address: c.address || c.city || ''
          }))
        );
      }

      // 2. Fetch Products
      const { data: prodData } = await supabase
        .from('products')
        .select('id, product_name, category, uom, sale_price, price, current_stock')
        .order('product_name');

      if (prodData) {
        setProductsCatalog(prodData);
      }
    } catch (err) {
      console.error('Error fetching catalogs:', err);
    }
  };

  const loadQuotationToEdit = async () => {
    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from('crm_quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setQuoteNo(data.quotation_number || data.quote_no || '');
        setCustomerName(data.customer_name || data.customer || '');
        setCustomerPhone(data.customer_phone || '');
        setCustomerAddress(data.customer_address || '');
        if (data.date) setQuoteDate(data.date);
        if (data.valid_until) setValidUntil(data.valid_until);
        if (data.salesman_name) setSalesmanName(data.salesman_name);
        if (data.status) setStatus(data.status);
        if (data.notes) setNotes(data.notes);

        const loadedItems = Array.isArray(data.items)
          ? data.items
          : typeof data.items === 'string'
          ? JSON.parse(data.items || '[]')
          : [];

        if (loadedItems.length > 0) {
          setItems(loadedItems);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load quotation details');
      navigate(`${tenantId ? `/${tenantId}` : ''}/crm/quotations`);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleCustomerSelect = (cust: CustomerComboboxItem | null) => {
    if (cust) {
      setSelectedCustomerId(cust.id);
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone || '');
      setCustomerAddress(cust.address || '');
    }
  };

  const setValidityDays = (days: number) => {
    const base = quoteDate ? new Date(quoteDate) : new Date();
    base.setDate(base.getDate() + days);
    setValidUntil(base.toISOString().split('T')[0]);
  };

  // Line Item Helpers
  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'product_name') {
        const found = productsCatalog.find(p => p.product_name === value);
        if (found) {
          item.product_id = found.id;
          item.category = found.category || '';
          item.unit = found.uom || item.unit || 'Sqft';
          item.rate = Number(found.sale_price ?? found.price ?? item.rate ?? 0);
        }
      }

      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const gross = qty * rate;

      if (field === 'discount_percent') {
        const perc = Number(value || 0);
        item.discount_amount = (gross * perc) / 100;
      } else if (field === 'discount_amount') {
        const amt = Number(value || 0);
        item.discount_percent = gross > 0 ? (amt / gross) * 100 : 0;
      } else {
        item.discount_amount = (gross * Number(item.discount_percent || 0)) / 100;
      }

      item.amount = Math.max(0, gross - Number(item.discount_amount || 0));
      updated[index] = item;
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        product_name: '',
        unit: 'Sqft',
        qty: 1,
        rate: 0,
        discount_percent: 0,
        discount_amount: 0,
        amount: 0,
        notes: ''
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast.error('Quotation must contain at least 1 line item.');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Calculation totals
  const subtotal = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const totalDiscount = items.reduce((sum, item) => sum + Number(item.discount_amount || 0), 0);
  const grandTotal = Math.max(0, subtotal - totalDiscount);

  const handleSubmit = async (actionAfterSave: 'list' | 'print' | 'whatsapp') => {
    if (!customerName.trim()) {
      toast.error('Please enter or select a Customer name');
      return;
    }
    const invalidItem = items.find(it => !it.product_name.trim() || Number(it.qty) <= 0);
    if (invalidItem) {
      toast.error('All line items must have a product name and quantity greater than 0');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        tenant_id: tenantId || 'bashir',
        quotation_number: quoteNo,
        quote_no: quoteNo,
        customer: customerName.trim(),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        date: quoteDate,
        valid_until: validUntil,
        salesman_name: salesmanName.trim(),
        amount: grandTotal,
        total_amount: grandTotal,
        status: status,
        items: items,
        notes: notes.trim(),
      };

      let savedId = id;

      if (isEditMode) {
        try {
          await supabase
            .from('crm_quotations')
            .update(payload)
            .eq('id', id);
        } catch (_) {}

        try {
          const cached = JSON.parse(localStorage.getItem('zac_quotations_records') || '[]');
          const updated = cached.map((q: any) => String(q.id) === String(id) ? { ...q, ...payload } : q);
          localStorage.setItem('zac_quotations_records', JSON.stringify(updated));
        } catch (_) {}

        toast.success('Quotation updated successfully!');
      } else {
        let cloudId = null;
        try {
          const { data, error } = await supabase
            .from('crm_quotations')
            .insert([payload])
            .select('id')
            .single();

          if (!error && data?.id) {
            cloudId = data.id;
          }
        } catch (_) {}

        savedId = cloudId || `LOCAL-${Date.now()}`;
        payload.id = savedId;

        try {
          const cached = JSON.parse(localStorage.getItem('zac_quotations_records') || '[]');
          localStorage.setItem('zac_quotations_records', JSON.stringify([payload, ...cached]));
        } catch (_) {}

        toast.success('Quotation generated successfully!');
      }

      if (actionAfterSave === 'print' && savedId) {
        navigate(`${tenantId ? `/${tenantId}` : ''}/crm/quotations/print/${savedId}`);
      } else if (actionAfterSave === 'whatsapp') {
        const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
        const greeting = `Hello *${customerName}*,\n\nHere is your official Price Quotation from *Zoaib Ali & Company*:\n\n` +
          `📄 *Quotation No:* ${quoteNo}\n` +
          `📅 *Date:* ${quoteDate}\n` +
          `⏳ *Valid Until:* ${validUntil}\n` +
          `💰 *Total Amount:* PKR ${grandTotal.toLocaleString()}\n\n` +
          `*Items Summary:*\n` +
          items.map((it, idx) => `${idx + 1}. ${it.product_name} - ${it.qty} ${it.unit || 'units'} @ PKR ${Number(it.rate).toLocaleString()}`).join('\n') +
          `\n\nThank you for considering us!`;

        const encoded = encodeURIComponent(greeting);
        const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
        window.open(url, '_blank');
        navigate(`${tenantId ? `/${tenantId}` : ''}/crm/quotations`);
      } else {
        navigate(`${tenantId ? `/${tenantId}` : ''}/crm/quotations`);
      }
    } catch (err: any) {
      console.error('Error saving quotation:', err);
      toast.error(err.message || 'Failed to save quotation');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spinner size="w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 space-y-6">
      <Breadcrumb
        pageName={isEditMode ? `Edit Quotation (${quoteNo})` : 'New Price Quotation'}
      />

      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-boxdark p-5 rounded-2xl border border-stroke dark:border-strokedark shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/crm/quotations`)}
            className="p-2.5 rounded-xl border border-stroke dark:border-strokedark hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer text-gray-600 dark:text-gray-300"
          >
            <MdArrowBack size={18} />
          </button>
          <div>
            <h2 className="text-lg font-black text-black dark:text-white flex items-center gap-2">
              <MdReceipt className="text-emerald-600" />
              <span>{isEditMode ? 'Modify Quotation' : 'Create Customer Quotation'}</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Draft formal price estimates, share directly on WhatsApp or print for customer signing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">Status:</span>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as any)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:outline-hidden cursor-pointer"
          >
            <option value="Draft">Draft</option>
            <option value="Sent">Sent to Client</option>
            <option value="Accepted">Accepted / Confirmed</option>
            <option value="Rejected">Rejected</option>
            <option value="Converted to Invoice">Converted to Invoice</option>
          </select>
        </div>
      </div>

      {/* 1. Header Information Section */}
      <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-xs p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 pb-2 border-b border-stroke dark:border-strokedark">
          <MdPerson /> 1. Customer & Quotation Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Quotation # <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={quoteNo}
              onChange={e => setQuoteNo(e.target.value)}
              className="w-full text-xs font-bold font-mono px-3 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-gray-50 dark:bg-meta-4/40 text-black dark:text-white focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Customer Name / Business <span className="text-red-500">*</span>
            </label>
            <CustomerCombobox
              customers={customerDirectory}
              value={customerName}
              onChange={name => setCustomerName(name)}
              onSelectCustomer={handleCustomerSelect}
              placeholder="Search or type customer name..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Contact Phone (WhatsApp)
            </label>
            <input
              type="text"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              placeholder="e.g. 03001234567"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Site / Project Address
            </label>
            <input
              type="text"
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
              placeholder="e.g. Plot 42, Sector C, DHA Phase 6"
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Quotation Date
            </label>
            <input
              type="date"
              value={quoteDate}
              onChange={e => setQuoteDate(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:outline-hidden"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Valid Until
              </label>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setValidityDays(7)}
                  className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-meta-4 hover:bg-emerald-50 text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  +7d
                </button>
                <button
                  type="button"
                  onClick={() => setValidityDays(15)}
                  className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-meta-4 hover:bg-emerald-50 text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  +15d
                </button>
                <button
                  type="button"
                  onClick={() => setValidityDays(30)}
                  className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-meta-4 hover:bg-emerald-50 text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  +30d
                </button>
              </div>
            </div>
            <input
              type="date"
              value={validUntil}
              onChange={e => setValidUntil(e.target.value)}
              className="w-full text-xs px-3 py-2.5 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:outline-hidden font-semibold"
            />
          </div>
        </div>
      </div>

      {/* 2. Line Items Table */}
      <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stroke dark:border-strokedark">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <MdInventory2 /> 2. Quoted Items & Pricing
          </h3>

          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
          >
            <MdAdd size={16} />
            <span>Add Item</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="bg-gray-100 dark:bg-meta-4/40 text-gray-700 dark:text-gray-300 font-bold">
                <th className="p-2.5 w-10 text-center">#</th>
                <th className="p-2.5">Product Name / Specs</th>
                <th className="p-2.5 w-24">Unit</th>
                <th className="p-2.5 w-24 text-right">Quantity</th>
                <th className="p-2.5 w-28 text-right">Rate (PKR)</th>
                <th className="p-2.5 w-24 text-right">Disc %</th>
                <th className="p-2.5 w-32 text-right">Total (PKR)</th>
                <th className="p-2.5 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke dark:divide-strokedark">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-meta-4/10">
                  <td className="p-2.5 text-center font-bold text-gray-400">{idx + 1}</td>
                  <td className="p-2.5">
                    <input
                      type="text"
                      list={`products-list-${idx}`}
                      value={item.product_name}
                      onChange={e => handleItemChange(idx, 'product_name', e.target.value)}
                      placeholder="Type or pick product..."
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white font-medium focus:border-emerald-500 focus:outline-hidden"
                    />
                    <datalist id={`products-list-${idx}`}>
                      {productsCatalog.map(p => (
                        <option key={p.id} value={p.product_name}>
                          {p.category ? `[${p.category}] ` : ''}Rate: PKR {p.sale_price ?? p.price}
                        </option>
                      ))}
                    </datalist>
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={e => handleItemChange(idx, 'notes', e.target.value)}
                      placeholder="Optional spec note (e.g. Master bath floor)"
                      className="w-full text-[11px] px-2 py-0.5 mt-1 rounded border border-transparent hover:border-stroke dark:hover:border-strokedark bg-transparent text-gray-500 italic focus:bg-white dark:focus:bg-boxdark focus:outline-hidden"
                    />
                  </td>

                  <td className="p-2.5">
                    <select
                      value={item.unit || 'Sqft'}
                      onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:outline-hidden cursor-pointer"
                    >
                      <option value="Sqft">Sqft</option>
                      <option value="Boxes">Boxes</option>
                      <option value="Pieces">Pieces</option>
                      <option value="Meters">Meters</option>
                      <option value="Sets">Sets</option>
                    </select>
                  </td>

                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={item.qty}
                      onChange={e => handleItemChange(idx, 'qty', e.target.value)}
                      className="w-full text-xs text-right font-bold px-2 py-1.5 rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:outline-hidden"
                    />
                  </td>

                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate}
                      onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                      className="w-full text-xs text-right font-bold px-2 py-1.5 rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:outline-hidden"
                    />
                  </td>

                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={item.discount_percent || 0}
                      onChange={e => handleItemChange(idx, 'discount_percent', e.target.value)}
                      className="w-full text-xs text-right px-2 py-1.5 rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:outline-hidden"
                    />
                  </td>

                  <td className="p-2.5 text-right font-black font-mono text-black dark:text-white">
                    PKR {item.amount.toLocaleString()}
                  </td>

                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      title="Remove Item"
                    >
                      <MdDeleteOutline size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3. Summary & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stroke dark:border-strokedark">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
              <MdOutlineNotes />
              <span>Terms, Conditions & Bank Transfer Details</span>
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark text-black dark:text-white focus:outline-hidden"
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-meta-4/20 rounded-2xl border border-stroke dark:border-strokedark space-y-2 text-xs">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal:</span>
              <span className="font-bold font-mono">PKR {subtotal.toLocaleString()}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Total Discount:</span>
                <span className="font-bold font-mono">- PKR {totalDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-stroke dark:border-strokedark pt-2 flex justify-between text-base font-black text-black dark:text-white">
              <span>Grand Total:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                PKR {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Submit Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-xs">
        <button
          type="button"
          onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/crm/quotations`)}
          className="px-5 py-2.5 rounded-xl border border-stroke dark:border-strokedark text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-meta-4 transition cursor-pointer"
        >
          Cancel
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit('whatsapp')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <FaWhatsapp size={16} />
            <span>Save & WhatsApp</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit('print')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <MdPrint size={16} />
            <span>Save & Print</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit('list')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {loading ? <Spinner color="border-white" size="w-3.5 h-3.5" /> : <MdSave size={16} />}
            <span>{isEditMode ? 'Update Quotation' : 'Save Quotation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddQuotation;
