import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { useAuth } from '../../../Context/Auth';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import {
  MdArrowBack,
  MdSave,
  MdPerson,
  MdPhone,
  MdEmail,
  MdLocationOn,
  MdBusiness,
  MdAccountBalance,
  MdCalendarToday,
  MdPeople,
  MdCheckCircle,
  MdInfoOutline,
  MdCreditCard,
  MdReceipt,
  MdNotes,
  MdLanguage,
  MdTag,
  MdArrowForward
} from 'react-icons/md';
import { SearchableDropdown } from '../../../components/SearchableDropdown';
import SearchableAddableDropdown from '../../../components/SearchableAddableDropdown';

const TIER_OPTIONS = [
  'Retail / General',
  'Contractor / Builder',
  'Wholesaler / Dealer',
  'Registered Corporate'
];

const DEFAULT_AREAS = [
  'Resham Gali | Cloth Market',
  'Main Sarafa Bazaar | Cloth Market',
  'Boulton Market | Saddar',
  'Liaquat Market | Malir',
  'Tariq Road | PECHS',
  'Hyderi Market | North Nazimabad',
  'Jama Cloth Market | M.A. Jinnah Road',
  'Shershah Market | SITE',
  'Station Road | Sukkur',
  'Cloth Market | Hyderabad',
  'Shahi Bazaar | Hyderabad',
  'Anarkali Bazaar | Lahore',
  'Azam Cloth Market | Lahore',
  'Rail Bazaar | Faisalabad',
  'Karkhano Market | Peshawar',
];

const AddCustomer: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(1);
  const [companies, setCompanies] = useState<any[]>([]);
  const [suggestedCode, setSuggestedCode] = useState<string>('');
  const [areaOptions, setAreaOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('uj_custom_areas');
      const customList: string[] = saved ? JSON.parse(saved) : [];
      return Array.from(new Set([...DEFAULT_AREAS, ...customList])).sort();
    } catch {
      return DEFAULT_AREAS;
    }
  });

  const handleAddCustomArea = (newVal: string) => {
    const clean = newVal.trim();
    if (!clean) return;
    setAreaOptions((prev) => {
      const updated = Array.from(new Set([clean, ...prev])).sort();
      try {
        const saved = localStorage.getItem('uj_custom_areas');
        const customList: string[] = saved ? JSON.parse(saved) : [];
        if (!customList.includes(clean)) {
          localStorage.setItem('uj_custom_areas', JSON.stringify([...customList, clean]));
        }
      } catch (e) {
        console.error('Failed to save custom area:', e);
      }
      return updated;
    });
    toast.success(`Added "${clean}" to Sub Area | Area list`);
  };
  const { tenantId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract customer data if passed via navigation (Edit Mode)
  const editData = location.state?.customer;
  const isEditMode = !!editData;

  // Safe universal redirect helper that preserves tenant prefix if active
  const handleNavigateToList = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    const tenantPrefix = (segments.length > 0 && ['bashir', 'zohaib', 'daniyal', 'nexis'].includes(segments[0].toLowerCase()))
      ? `/${segments[0]}`
      : (tenantId ? `/${tenantId}` : '');
    navigate(`${tenantPrefix}/Sales/Customers/List`);
  };

  useEffect(() => {
    const fetchInitialMetadata = async () => {
      try {
        const [compRes, coaRes, custRes] = await Promise.all([
          supabase.from('companies').select('id, name'),
          supabase.from('chart_of_accounts').select('account_code, control_code'),
          supabase.from('customers').select('customer_code, customerCode, coa_code')
        ]);

        if (compRes.data) setCompanies(compRes.data);

        // Also merge any existing areas from customers table
        try {
          const { data: custAreaData } = await supabase.from('customers').select('city, address').limit(100);
          if (custAreaData && custAreaData.length > 0) {
            const dbAreas = custAreaData
              .map((c: any) => c.city)
              .filter((v: any) => typeof v === 'string' && v.trim().length > 1);
            if (dbAreas.length > 0) {
              setAreaOptions((prev) => Array.from(new Set([...prev, ...dbAreas])).sort());
            }
          }
        } catch (e) {
          console.warn('Could not load areas from customers table:', e);
        }

        // Derive next suggested customer ledger code (1020-xxx)
        if (!isEditMode) {
          let maxNum = 0;
          const coaList = coaRes.data || [];
          const custList = custRes.data || [];

          coaList.forEach((a: any) => {
            const match = String(a.account_code || '').match(/1020-(\d+)/);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          });

          custList.forEach((c: any) => {
            const code = c.customer_code || c.customerCode || c.coa_code || '';
            const match = String(code).match(/1020-(\d+)/);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          });

          const nextCode = `1020-${String(maxNum + 1).padStart(3, '0')}`;
          setSuggestedCode(nextCode);
        }
      } catch (err: any) {
        console.error('Error loading metadata in AddCustomer:', err);
      }
    };

    fetchInitialMetadata();
  }, [isEditMode]);

  const validationSchema = Yup.object().shape({
    customerName: Yup.string().trim().required('Customer / Business Name is required'),
    primaryPhone: Yup.string().trim().required('Primary Contact Phone is required'),
  });

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      const trimmedName = values.customerName.trim();
      const companyVal = values.company || '';

      // --- DYNAMIC DUPLICATE VALIDATION CHECK ENGINE ---
      let query = supabase
        .from('customers')
        .select('id, customerName')
        .eq('customerName', trimmedName)
        .eq('company', companyVal);

      if (isEditMode) {
        query = query.neq('id', editData.id);
      }

      const { data: existingRecords, error: checkError } = await query;
      if (checkError) throw checkError;

      if (existingRecords && existingRecords.length > 0) {
        toast.error(`A customer record named "${trimmedName}" with this branch already exists!`);
        setLoading(false);
        return;
      }

      const cleanCode = values.customer_code ? values.customer_code.trim() : '';
      const parsedOpeningBal = Number(values.openingBalance || 0);
      const computedBalance = values.balanceNature === 'Credit' ? -Math.abs(parsedOpeningBal) : Math.abs(parsedOpeningBal);

      const regTypeVal = values.registrationType || 'Retail / General';
      const secPhoneVal = values.secondaryPhone ? values.secondaryPhone.trim() : '';

      const payload: any = {
        customerName: trimmedName,
        sub_area: values.subArea ? values.subArea.trim() : '',
        subArea: values.subArea ? values.subArea.trim() : '',
        area: values.subArea ? values.subArea.trim() : '',
        city: values.subArea ? (values.subArea.includes('|') ? values.subArea.split('|')[1].trim() : values.subArea.trim()) : 'Hyderabad',
        customer_code: cleanCode,
        customerCode: cleanCode,
        coa_code: cleanCode,
        page_no: values.page_no ? String(values.page_no).trim() : '',
        pageNo: values.page_no ? String(values.page_no).trim() : '',
        registrationType: regTypeVal,
        primaryPhone: values.primaryPhone ? values.primaryPhone.trim() : '',
        phone: values.primaryPhone ? values.primaryPhone.trim() : '',
        secondaryPhone: secPhoneVal,
        email: values.email ? values.email.trim() : '',
        website: values.website ? values.website.trim() : '',
        province: values.province || 'Sindh',
        company: companyVal,
        address: values.address ? values.address.trim() : '',
        ntnNo: values.ntnNo ? values.ntnNo.trim() : '',
        cnicNo: values.cnicNo ? values.cnicNo.trim() : '',
        stRegNo: values.stRegNo ? values.stRegNo.trim() : '',
        notes: values.notes ? values.notes.trim() : '',
        followUpDate: values.followUpDate || null,
      };

      if (!isEditMode && parsedOpeningBal !== 0) {
        payload.balance = computedBalance;
      }

      let customerRecordId = editData?.id;

      // --- SMART SCHEMA-ADAPTIVE COLUMN MAPPER ---
      // Dynamically probe existing database columns to prevent 'column not found in schema cache' (e.g. registrationType vs registrationtype)
      const colMap = new Map<string, string>();
      try {
        const { data: probeData } = await supabase.from('customers').select('*').limit(1);
        if (probeData && probeData.length > 0) {
          Object.keys(probeData[0]).forEach((c) => colMap.set(c.toLowerCase(), c));
        }
      } catch (probeErr) {
        console.warn('Schema probe notice:', probeErr);
      }

      // Build sanitized payload using exact database column names
      const sanitizedPayload: any = {};
      for (const [key, val] of Object.entries(payload)) {
        if (colMap.size > 0) {
          const exactCol = colMap.get(key.toLowerCase());
          if (exactCol) {
            sanitizedPayload[exactCol] = val;
          }
        } else {
          sanitizedPayload[key] = val;
        }
      }

      // If Sub Area was entered but DB has no sub_area column, preserve in notes
      const subAreaVal = values.subArea ? values.subArea.trim() : '';
      if (subAreaVal && !colMap.has('sub_area') && !colMap.has('subarea')) {
        const notesKey = colMap.get('notes') || 'notes';
        const areaNote = `Sub Area | Area: ${subAreaVal}`;
        if (sanitizedPayload[notesKey]) {
          if (!sanitizedPayload[notesKey].includes(areaNote)) {
            sanitizedPayload[notesKey] += ` | ${areaNote}`;
          }
        } else if (colMap.has('notes')) {
          sanitizedPayload[notesKey] = areaNote;
        }
      }

      // If secondary phone was entered but DB has no secondary phone column, preserve in notes
      if (secPhoneVal && !colMap.has('secondaryphone')) {
        const notesKey = colMap.get('notes') || 'notes';
        if (sanitizedPayload[notesKey]) {
          if (!sanitizedPayload[notesKey].includes(secPhoneVal)) {
            sanitizedPayload[notesKey] += ` | Alt Phone: ${secPhoneVal}`;
          }
        } else if (colMap.has('notes')) {
          sanitizedPayload[notesKey] = `Alt Phone: ${secPhoneVal}`;
        }
      }

      // Self-healing database executor: handles schema cache column casing mismatches automatically
      const executeSave = async (dataPayload: any) => {
        if (isEditMode) {
          return await supabase
            .from('customers')
            .update(dataPayload)
            .eq('id', editData.id);
        } else {
          return await supabase
            .from('customers')
            .insert([dataPayload])
            .select('id');
        }
      };

      let saveResponse = await executeSave(sanitizedPayload);

      // Auto-fallback: if PostgREST still reports any missing column in schema cache, strip it and retry
      if (saveResponse.error && (saveResponse.error.code === 'PGRST204' || saveResponse.error.message?.includes('schema cache'))) {
        const fallbackPayload = { ...sanitizedPayload };
        for (let attempt = 0; attempt < 6 && saveResponse.error; attempt++) {
          const errMsg = saveResponse.error.message || '';
          const colMatch = errMsg.match(/Could not find the '([^']+)' column/i);
          if (colMatch && colMatch[1]) {
            const missingCol = colMatch[1].toLowerCase();
            const foundKey = Object.keys(fallbackPayload).find((k) => k.toLowerCase() === missingCol);
            if (foundKey) {
              delete fallbackPayload[foundKey];
              saveResponse = await executeSave(fallbackPayload);
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }

      if (saveResponse.error) throw saveResponse.error;

      if (isEditMode) {
        toast.success(`Customer "${trimmedName}" updated successfully!`);
      } else {
        if (saveResponse.data && saveResponse.data[0]) {
          customerRecordId = saveResponse.data[0].id;
        }
        toast.success(`Customer "${trimmedName}" registered successfully!`);
      }

      // --- AUTO-SYNC WITH CHART OF ACCOUNTS (COA) ---
      if (cleanCode) {
        try {
          const coaPayload: any = {
            category_code: '1. ASSETS',
            sub_category_code: 'Current Assets',
            control_code: 'Customers',
            account_code: cleanCode,
            account_title: trimmedName,
            opening_balance: Math.abs(parsedOpeningBal),
            balance_nature: values.balanceNature || 'Debit',
            notes: `Customer ledger account for ${trimmedName} (Synced from Customers module)`
          };

          const { data: existingCOA } = await supabase
            .from('chart_of_accounts')
            .select('id')
            .eq('account_code', cleanCode)
            .maybeSingle();

          if (existingCOA?.id) {
            await supabase
              .from('chart_of_accounts')
              .update(coaPayload)
              .eq('id', existingCOA.id);
          } else {
            await supabase
              .from('chart_of_accounts')
              .insert([coaPayload]);
          }
        } catch (coaErr) {
          console.warn('COA auto-sync note:', coaErr);
        }
      }

      handleNavigateToList();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const validateRequiredFields = (values: any): boolean => {
    if (!values.customerName || !values.customerName.trim()) {
      toast.error('Customer / Business Name is required (Step 1: Identity)');
      setActiveTab(1);
      return false;
    }
    if (!values.primaryPhone || !values.primaryPhone.trim()) {
      toast.error('Primary Contact Phone is required (Step 2: Contact & Address)');
      setActiveTab(2);
      return false;
    }
    return true;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 1. Breadcrumb Navigation */}
      <Breadcrumb pageName={isEditMode ? 'Edit Customer Profile' : 'New Customer Registration'} />

      {/* 2. Header Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-boxdark p-5 rounded-2xl border border-stroke dark:border-strokedark shadow-sm">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={handleNavigateToList}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs cursor-pointer"
            title="Back to Customer List"
          >
            <MdArrowBack size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {isEditMode ? `Edit Profile: ${editData.customerName}` : 'Add New Customer'}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                isEditMode 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' 
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}>
                {isEditMode ? 'EDIT MODE' : 'NEW REGISTRATION'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter customer commercial profile, contact information, and accounting ledger credentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleNavigateToList}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer"
          >
            <MdPeople size={16} />
            <span>Customer Directory</span>
          </button>
        </div>
      </div>

      {/* 3. Main Form Canvas */}
      <Formik
        initialValues={editData ? {
          ...editData,
          customer_code: editData.customer_code || editData.customerCode || editData.coa_code || '',
          page_no: editData.page_no || editData.pageNo || editData.page_number || '',
          registrationType: editData.registrationType || 'Retail / General',
          subArea: editData.sub_area || editData.subArea || editData.city || '',
          primaryPhone: editData.primaryPhone || editData.phone || '',
          secondaryPhone: editData.secondaryPhone || '',
          email: editData.email || '',
          address: editData.address || '',
          province: editData.province || 'Sindh',
          company: editData.company || '',
          website: editData.website || '',
          notes: editData.notes || '',
          followUpDate: editData.followUpDate || '',
          openingBalance: editData.opening_balance || editData.openingBalance || editData.currentBalance || '',
          balanceNature: (editData.currentBalance && editData.currentBalance < 0) ? 'Credit' : 'Debit'
        } : {
          customerName: '',
          subArea: '',
          customer_code: '',
          page_no: '',
          registrationType: 'Retail / General',
          primaryPhone: '',
          secondaryPhone: '',
          email: '',
          address: '',
          province: 'Sindh',
          company: '',
          website: '',
          ntnNo: '',
          cnicNo: '',
          stRegNo: '',
          notes: '',
          followUpDate: '',
          openingBalance: '',
          balanceNature: 'Debit'
        }}
        enableReinitialize={true}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ handleChange, values, errors, touched, setFieldValue }) => (
          <Form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (validateRequiredFields(values)) {
                handleSubmit(values);
              }
            }}
          >

            {/* Step Wizard Tabs Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100/80 dark:bg-slate-800/60 p-1.5 rounded-2xl border border-stroke dark:border-strokedark">
              <button
                type="button"
                onClick={() => setActiveTab(1)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 1
                    ? 'bg-white dark:bg-boxdark text-primary shadow-xs border border-stroke dark:border-strokedark'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeTab === 1 ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>1</span>
                <span className="truncate">Identity</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(2)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 2
                    ? 'bg-white dark:bg-boxdark text-primary shadow-xs border border-stroke dark:border-strokedark'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeTab === 2 ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>2</span>
                <span className="truncate">Contact & Address</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(3)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 3
                    ? 'bg-white dark:bg-boxdark text-primary shadow-xs border border-stroke dark:border-strokedark'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeTab === 3 ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>3</span>
                <span className="truncate">Tax & Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab(4)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 4
                    ? 'bg-white dark:bg-boxdark text-primary shadow-xs border border-stroke dark:border-strokedark'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeTab === 4 ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>4</span>
                <span className="truncate">Follow-up Notes</span>
              </button>
            </div>
            
            {/* Card 1: Core Business Profile & Classification */}
            {activeTab === 1 && (
              <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-sm p-6 space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-stroke dark:border-strokedark pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
                      <MdPerson size={18} />
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        1. Customer Identity & Classification
                      </h4>
                      <p className="text-[11px] text-slate-500">Official business name and classification tier</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">* Required Fields</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Customer Name */}
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Customer / Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      onChange={handleChange}
                      value={values.customerName}
                      placeholder="e.g. Haji Muhammad / Al-Madina Cloth House"
                      className={`w-full rounded-xl border bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-3 text-xs font-semibold outline-none transition focus:bg-white dark:focus:bg-boxdark focus:ring-2 focus:ring-primary/20 ${
                        touched.customerName && errors.customerName 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-stroke dark:border-strokedark focus:border-primary'
                      }`}
                    />
                    {touched.customerName && errors.customerName ? (
                      <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
                        <MdInfoOutline size={12} /> {errors.customerName as string}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-1">
                        Must be unique per business entity to prevent duplicate ledger postings
                      </p>
                    )}
                  </div>

                  {/* Sub Area | Area Searchable + Addable Dropdown */}
                  <div className="md:col-span-2">
                    <SearchableAddableDropdown
                      label="Sub Area | Area"
                      placeholder="Sub Area | Area"
                      options={areaOptions}
                      value={values.subArea || ''}
                      onChange={(val) => setFieldValue('subArea', val)}
                      onAddNew={(newVal) => {
                        handleAddCustomArea(newVal);
                        setFieldValue('subArea', newVal);
                      }}
                      helperText="Select or type a new Sub Area | Area (interactable with arrow keys & enter)"
                    />
                  </div>

                  {/* Customer Code / Account Code */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <MdTag size={14} className="text-primary" />
                        <span>Customer / Account Code</span>
                      </label>
                      {!values.customer_code && suggestedCode && (
                        <button
                          type="button"
                          onClick={() => setFieldValue('customer_code', suggestedCode)}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          Use Suggested ({suggestedCode})
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      name="customer_code"
                      onChange={handleChange}
                      value={values.customer_code || ''}
                      placeholder={suggestedCode || 'e.g. 1020-001 or CUST-100'}
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono font-bold outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Auto-links with Chart of Accounts ledger code under Customers (1020-xxx)
                    </p>
                  </div>

                  {/* Page Number */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Ledger Page # (Optional)
                    </label>
                    <input
                      type="text"
                      name="page_no"
                      onChange={handleChange}
                      value={values.page_no || ''}
                      placeholder="e.g. 142 or Pg-25"
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Physical ledger book reference number for traditional paper accounting cross-checks
                    </p>
                  </div>

                  {/* Customer Category / Type */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Customer Tier / Category
                    </label>
                    <SearchableDropdown
                      value={values.registrationType || 'Retail / General'}
                      onChange={(val) => setFieldValue('registrationType', val || 'Retail / General')}
                      options={TIER_OPTIONS}
                      placeholder="Customer Tier / Category"
                      allowAll={false}
                      allowClear={false}
                    />
                  </div>

                  {/* Client Business Entity / Branch */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Associated Branch / Business Entity
                    </label>
                    <SearchableDropdown
                      value={values.company || '-- General / NHT ENTERPRISE --'}
                      onChange={(val) => {
                        if (!val || val === '-- General / NHT ENTERPRISE --') {
                          setFieldValue('company', '');
                        } else {
                          setFieldValue('company', val);
                        }
                      }}
                      options={['-- General / NHT ENTERPRISE --', ...companies.map((c: any) => c.name)]}
                      placeholder="Associated Branch / Business Entity"
                      allowAll={false}
                      allowClear={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Card 2: Contact Information & Location */}
            {activeTab === 2 && (
              <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-sm p-6 space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 border-b border-stroke dark:border-strokedark pb-3">
                  <span className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
                    <MdPhone size={18} />
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      2. Contact Information & Delivery Location
                    </h4>
                    <p className="text-[11px] text-slate-500">Phone numbers, WhatsApp communication, and physical shipping address</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Primary Phone */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Primary Contact Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="primaryPhone"
                      onChange={handleChange}
                      value={values.primaryPhone}
                      placeholder="0300-1234567"
                      className={`w-full rounded-xl border bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono font-medium outline-none transition focus:bg-white dark:focus:bg-boxdark focus:ring-2 focus:ring-primary/20 ${
                        touched.primaryPhone && errors.primaryPhone 
                          ? 'border-red-500 focus:border-red-500' 
                          : 'border-stroke dark:border-strokedark focus:border-primary'
                      }`}
                    />
                    {touched.primaryPhone && errors.primaryPhone && (
                      <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
                        <MdInfoOutline size={12} /> {errors.primaryPhone as string}
                      </p>
                    )}
                  </div>

                  {/* Secondary Phone */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Secondary Phone / WhatsApp (Optional)
                    </label>
                    <input
                      type="text"
                      name="secondaryPhone"
                      onChange={handleChange}
                      value={values.secondaryPhone || ''}
                      placeholder="0312-7654321"
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      name="email"
                      onChange={handleChange}
                      value={values.email || ''}
                      placeholder="customer@example.com"
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Province / Region */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Province / Region
                    </label>
                    <select
                      name="province"
                      onChange={handleChange}
                      value={values.province || 'Sindh'}
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-medium outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Sindh">Sindh</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                      <option value="Balochistan">Balochistan</option>
                      <option value="Islamabad">Islamabad (ICT)</option>
                      <option value="Azad Jammu and Kashmir">Azad Jammu and Kashmir (AJK)</option>
                      <option value="Gilgit-Baltistan">Gilgit-Baltistan (GB)</option>
                    </select>
                  </div>

                  {/* Delivery / Site Address */}
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Delivery Address / Warehouse Site
                    </label>
                    <textarea
                      name="address"
                      rows={2}
                      onChange={handleChange}
                      value={values.address || ''}
                      placeholder="Shop #, Street, Plot / Area, City (e.g. Shop # 14, Ceramic Market, Saddar, Hyderabad)"
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white p-3 text-xs outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Card 3: Taxation, Identity & Opening Ledger Balance */}
            {activeTab === 3 && (
              <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-sm p-6 space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 border-b border-stroke dark:border-strokedark pb-3">
                  <span className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
                    <MdAccountBalance size={18} />
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      3. Taxation Details & Opening Ledger Balance
                    </h4>
                    <p className="text-[11px] text-slate-500">Corporate tax filings, CNIC identity, and initial financial balance</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* CNIC No */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      CNIC No. (Optional)
                    </label>
                    <input
                      type="text"
                      name="cnicNo"
                      onChange={handleChange}
                      value={values.cnicNo || ''}
                      placeholder="41303-1234567-1"
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* NTN No */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      NTN No. (Optional)
                    </label>
                    <input
                      type="text"
                      name="ntnNo"
                      onChange={handleChange}
                      value={values.ntnNo || ''}
                      placeholder="1234567-8"
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* STRN No */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Sales Tax STRN (Optional)
                    </label>
                    <input
                      type="text"
                      name="stRegNo"
                      onChange={handleChange}
                      value={values.stRegNo || ''}
                      placeholder="17-00-1234-567-89"
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {/* Opening Balance */}
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Opening Balance (PKR)
                    </label>
                    <input
                      type="number"
                      name="openingBalance"
                      onChange={handleChange}
                      value={values.openingBalance || ''}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono font-bold outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Debit = Customer owes you money (Receivable). Credit = You owe customer (Advance / Payable).
                    </p>
                  </div>

                  {/* Balance Nature */}
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Balance Nature
                    </label>
                    <select
                      name="balanceNature"
                      onChange={handleChange}
                      value={values.balanceNature || 'Debit'}
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-semibold outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Debit">Debit (Receivable from Customer)</option>
                      <option value="Credit">Credit (Advance / Liability to Customer)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Card 4: CRM Follow-Up & Remarks */}
            {activeTab === 4 && (
              <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-sm p-6 space-y-5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 border-b border-stroke dark:border-strokedark pb-3">
                  <span className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
                    <MdNotes size={18} />
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      4. Follow-up & Relationship Notes
                    </h4>
                    <p className="text-[11px] text-slate-500">Scheduled reminders and customer-specific preferences</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <MdCalendarToday size={14} className="text-amber-600" />
                      <span>Next Follow-up Date</span>
                    </label>
                    <input
                      type="date"
                      name="followUpDate"
                      onChange={handleChange}
                      value={values.followUpDate || ''}
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                      Internal CRM Notes & Payment Terms
                    </label>
                    <input
                      type="text"
                      name="notes"
                      onChange={handleChange}
                      value={values.notes || ''}
                      placeholder="e.g. Standard credit limit 15 days, preferred delivery by truck"
                      className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-stroke dark:border-strokedark">
              <div>
                {activeTab > 1 ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab(prev => Math.max(1, prev - 1))}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <MdArrowBack size={16} />
                    <span>Previous Step</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNavigateToList}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition shadow-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {activeTab < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 1 && !values.customerName?.trim()) {
                        toast.error('Customer / Business Name is required (Step 1)');
                        return;
                      }
                      if (activeTab === 2 && !values.primaryPhone?.trim()) {
                        toast.error('Primary Contact Phone is required (Step 2)');
                        return;
                      }
                      setActiveTab(prev => Math.min(4, prev + 1));
                    }}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:opacity-90 text-white font-bold text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Next Step</span>
                    <MdArrowForward size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (validateRequiredFields(values)) {
                        handleSubmit(values);
                      }
                    }}
                    className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs transition shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Spinner color="border-white" size="w-4 h-4" />
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <>
                        <MdSave size={16} />
                        <span>{isEditMode ? 'Update Customer Profile' : 'Save Customer Profile'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

          </Form>
        )}
      </Formik>
    </div>
  );
};

export default AddCustomer;
