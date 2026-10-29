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
  MdBusiness,
  MdPhone,
  MdEmail,
  MdCheckCircle,
  MdInfoOutline,
  MdTag,
  MdPeople,
  MdPerson,
  MdLocationOn
} from 'react-icons/md';
import {
  SubAreaAreaInput,
  DEFAULT_SUB_AREAS,
  DEFAULT_AREAS,
  DEFAULT_SUBAREA_AREAS_MAP,
} from '../../../components/SubAreaAreaInput';

const AddVendor = () => {
  const [loading, setLoading] = useState(false);
  const [suggestedCode, setSuggestedCode] = useState<string>('');
  const { tenantId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const editData = location.state?.vendorRecord || location.state?.vendor;
  const isEditMode = !!editData;

  // Safe universal redirect helper that preserves tenant prefix if active
  const handleNavigateToList = () => {
    const segments = location.pathname.split('/').filter(Boolean);
    const tenantPrefix = (segments.length > 0 && ['bashir', 'zohaib', 'daniyal', 'nexis'].includes(segments[0].toLowerCase()))
      ? `/${segments[0]}`
      : (tenantId ? `/${tenantId}` : '');
    navigate(`${tenantPrefix}/Purchase/Vendor/List`);
  };

  // Custom added Sub Areas (Cities) - shared with Customers via localStorage
  const [subAreaOptions, setSubAreaOptions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('uj_custom_sub_areas');
      const customList: string[] = saved ? JSON.parse(saved) : [];
      return Array.from(new Set([...DEFAULT_SUB_AREAS, ...customList])).sort();
    } catch {
      return DEFAULT_SUB_AREAS;
    }
  });

  // Mapping of Sub Area (City) -> List of Areas saved under it
  const [subAreaToAreasMap, setSubAreaToAreasMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('uj_subarea_areas_map');
      const customMap = saved ? JSON.parse(saved) : {};
      return { ...DEFAULT_SUBAREA_AREAS_MAP, ...customMap };
    } catch {
      return DEFAULT_SUBAREA_AREAS_MAP;
    }
  });

  // Fetch initial metadata and calculate next suggested vendor code (2010-xxx)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        if (!isEditMode) {
          const [coaRes, vendRes] = await Promise.all([
            supabase.from('chart_of_accounts').select('account_code, control_code'),
            supabase.from('vendors').select('vendor_code, vendorCode')
          ]);

          let maxNum = 0;
          const coaList = coaRes.data || [];
          const vendList = vendRes.data || [];

          coaList.forEach((a: any) => {
            if (a.control_code === 'Vendor' || a.control_code === 'Vendors' || String(a.account_code).startsWith('2010-')) {
              const match = String(a.account_code || '').match(/2010-(\d+)/);
              if (match && match[1]) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
              }
            }
          });

          vendList.forEach((v: any) => {
            const code = v.vendor_code || v.vendorCode || '';
            const match = String(code).match(/2010-(\d+)/);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          });

          const next = `2010-${String(maxNum + 1).padStart(3, '0')}`;
          setSuggestedCode(next);
        }
      } catch (err) {
        console.warn('Metadata fetch notice:', err);
      }
    };

    fetchMetadata();
  }, [isEditMode]);

  const handleAddCustomSubArea = (newVal: string) => {
    const clean = newVal.trim();
    if (!clean) return;
    setSubAreaOptions((prev) => {
      const updated = Array.from(new Set([clean, ...prev])).sort();
      try {
        const saved = localStorage.getItem('uj_custom_sub_areas');
        const customList: string[] = saved ? JSON.parse(saved) : [];
        if (!customList.includes(clean)) {
          localStorage.setItem('uj_custom_sub_areas', JSON.stringify([...customList, clean]));
        }
      } catch (e) {
        console.error('Failed to save custom sub area:', e);
      }
      return updated;
    });
    toast.success(`Added "${clean}" to Cities`);
  };

  const handleAddCustomArea = (newArea: string, currentSubArea: string) => {
    const cleanArea = newArea.trim();
    const cleanSub = currentSubArea.trim();
    if (!cleanArea) return;

    setSubAreaToAreasMap((prev) => {
      const existing = prev[cleanSub] || DEFAULT_AREAS;
      const updatedList = Array.from(new Set([cleanArea, ...existing])).sort();
      const nextMap = { ...prev, [cleanSub]: updatedList };

      try {
        localStorage.setItem('uj_subarea_areas_map', JSON.stringify(nextMap));
      } catch (e) {
        console.error('Failed to save subarea-areas map:', e);
      }

      return nextMap;
    });

    toast.success(`Saved Area "${cleanArea}" under "${cleanSub}"`);
  };

  // Safe city & area extractor for edit mode
  const getInitialLocation = () => {
    let subArea = editData?.sub_area || editData?.subArea || editData?.city || '';
    let area = editData?.area || '';

    // If city not set directly on vendor, check if known city is present in address string
    if (!subArea && editData?.address) {
      const addr = String(editData.address).toLowerCase();
      for (const city of DEFAULT_SUB_AREAS) {
        if (addr.includes(city.toLowerCase())) {
          subArea = city;
          break;
        }
      }
    }

    // Fallback: If area not set directly, scan address for known areas
    if (!area && editData?.address) {
      const addr = String(editData.address).toLowerCase();
      for (const a of DEFAULT_AREAS) {
        if (addr.includes(a.toLowerCase())) {
          area = a;
          break;
        }
      }
    }

    if (area && subArea && area.toLowerCase() === subArea.toLowerCase()) {
      area = '';
    }

    return { subArea, area };
  };

  const initialLoc = getInitialLocation();

  // Sync edit location into options and mapping so dropdown immediately shows them
  useEffect(() => {
    if (editData) {
      const loc = getInitialLocation();
      if (loc.subArea) {
        setSubAreaOptions((prev) => Array.from(new Set([...prev, loc.subArea])).sort());
      }
      if (loc.subArea && loc.area) {
        setSubAreaToAreasMap((prev) => {
          const existing = prev[loc.subArea] || DEFAULT_AREAS;
          if (!existing.includes(loc.area)) {
            return { ...prev, [loc.subArea]: [loc.area, ...existing] };
          }
          return prev;
        });
      }
    }
  }, [editData]);

  const validationSchema = Yup.object().shape({
    vendorName: Yup.string().trim().required('Vendor Name is required'),
    subArea: Yup.string().trim().required('City is required'),
    cellNo: Yup.string().nullable(),
    phoneNo: Yup.string().nullable(),
    email: Yup.string().email('Please enter a valid email address').nullable(),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* 1. Breadcrumb Navigation */}
      <Breadcrumb pageName={isEditMode ? 'Edit Vendor Profile' : 'New Vendor Registration'} />

      {/* 2. Header Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-boxdark p-5 rounded-2xl border border-stroke dark:border-strokedark shadow-sm">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={handleNavigateToList}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-xs cursor-pointer"
            title="Back to Vendor Directory"
          >
            <MdArrowBack size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {isEditMode ? `Modify Vendor: ${editData?.vendor_name || editData?.name}` : 'Add New Commercial Vendor'}
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
              Register wholesale textile suppliers, yarn mills, dyehouses, and manufacturing merchant accounts
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
            <span>Vendor Directory</span>
          </button>
        </div>
      </div>

      <Formik
        initialValues={{
          vendorName: editData?.vendor_name || editData?.name || '',
          vendor_code: editData?.vendor_code || editData?.vendorCode || '',
          page_no: editData?.page_no || editData?.pageNo || '',
          contactName: editData?.contact_name || '',
          cellNo: editData?.cell_no || editData?.phone || '',
          phoneNo: editData?.phone_no || '',
          email: editData?.email || '',
          subArea: initialLoc.subArea,
          area: initialLoc.area,
          address: editData?.address || '',
        }}
        enableReinitialize={true}
        validationSchema={validationSchema}
        onSubmit={async (values) => {
          try {
            setLoading(true);

            const trimmedName = values.vendorName.trim();
            const sVal = values.subArea ? values.subArea.trim() : '';
            const aVal = values.area ? values.area.trim() : '';
            let fullAddress = values.address ? values.address.trim() : '';

            // Ensure City and Area are preserved in address string cleanly
            const locSegments = [aVal, sVal].filter(Boolean);
            if (locSegments.length > 0) {
              const locStr = locSegments.join(', ');
              if (!fullAddress) {
                fullAddress = locStr;
              } else if (!fullAddress.toLowerCase().includes(sVal.toLowerCase())) {
                fullAddress = `${fullAddress}, ${locStr}`;
              }
            }

            const cleanCode = values.vendor_code ? values.vendor_code.trim() : (suggestedCode || '');

            const databasePayload: any = {
              vendor_name: trimmedName,
              name: trimmedName,
              vendor_code: cleanCode || null,
              vendorCode: cleanCode || null,
              page_no: values.page_no ? String(values.page_no).trim() : null,
              pageNo: values.page_no ? String(values.page_no).trim() : null,
              contact_name: values.contactName ? values.contactName.trim() : null,
              cell_no: values.cellNo ? values.cellNo.trim() : null,
              phone: values.cellNo ? values.cellNo.trim() : null,
              phone_no: values.phoneNo ? values.phoneNo.trim() : null,
              email: values.email ? values.email.trim() : null,
              address: fullAddress || null,
              city: sVal || null,
              area: aVal || null,
              sub_area: sVal || null,
              subArea: sVal || null,
            };

            // Self-healing database executor: handles schema cache column casing/missing columns automatically
            const executeSave = async (dataPayload: any) => {
              if (isEditMode) {
                return await supabase.from('vendors').update(dataPayload).eq('id', editData.id);
              } else {
                return await supabase.from('vendors').insert([dataPayload]).select('id');
              }
            };

            let saveResponse = await executeSave(databasePayload);

            // Auto-fallback: if PostgREST reports any missing column in schema cache, strip it and retry
            if (
              saveResponse.error &&
              (saveResponse.error.code === 'PGRST204' ||
                saveResponse.error.message?.includes('schema cache') ||
                saveResponse.error.code === '42703')
            ) {
              const fallbackPayload = { ...databasePayload };
              for (let attempt = 0; attempt < 6 && saveResponse.error; attempt++) {
                const errMsg = saveResponse.error.message || '';
                const colMatch =
                  errMsg.match(/Could not find the '([^']+)' column/i) ||
                  errMsg.match(/column [^.]+\.([^ ]+) does not exist/i);
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

            // Optional auto-sync with Chart of Accounts (COA) under Current Liabilities / Suppliers
            if (cleanCode) {
              try {
                const coaPayload: any = {
                  category_code: '2. LIABILITIES',
                  sub_category_code: 'Current Liabilities',
                  control_code: 'Vendor',
                  account_code: cleanCode,
                  account_title: trimmedName,
                  notes: `Vendor ledger account for ${trimmedName} (Synced from Vendors module)`
                };

                const { data: existingCOA } = await supabase
                  .from('chart_of_accounts')
                  .select('id')
                  .eq('account_code', cleanCode)
                  .maybeSingle();

                if (existingCOA?.id) {
                  await supabase.from('chart_of_accounts').update(coaPayload).eq('id', existingCOA.id);
                } else {
                  await supabase.from('chart_of_accounts').insert([coaPayload]);
                }
              } catch (coaErr) {
                console.warn('Vendor COA auto-sync note:', coaErr);
              }
            }

            toast.success(isEditMode ? `Vendor "${trimmedName}" updated successfully!` : `Vendor "${trimmedName}" registered successfully!`);
            handleNavigateToList();
          } catch (err: any) {
            toast.error('Transaction Error: ' + err.message);
          } finally {
            setLoading(false);
          }
        }}
      >
        {({ handleChange, values, errors, touched, setFieldValue }) => (
          <Form className="space-y-6">
            
            {/* CARD 1: VENDOR COMMERCIAL PROFILE & REFERENCE */}
            <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-stroke dark:border-strokedark pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-lg">
                    <MdBusiness size={18} />
                  </span>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      1. Vendor Corporate Profile & Ledger Reference
                    </h4>
                    <p className="text-[11px] text-slate-500">Official business name, unique vendor ledger code, and paper book page number</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">* Required Fields</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Vendor Corporate Name (Full Width) */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Vendor Corporate / Trade Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vendorName"
                    onChange={handleChange}
                    value={values.vendorName}
                    placeholder="e.g. Master Tiles & Ceramics / Kohinoor Textile Mills / Sonex Sanitary"
                    className={`w-full rounded-xl border bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-3 text-xs font-semibold outline-none transition focus:bg-white dark:focus:bg-boxdark focus:ring-2 focus:ring-primary/20 ${
                      touched.vendorName && errors.vendorName 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-stroke dark:border-strokedark focus:border-primary'
                    }`}
                  />
                  {touched.vendorName && errors.vendorName ? (
                    <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
                      <MdInfoOutline size={12} /> {errors.vendorName as string}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Registered commercial identity used on purchase orders and supplier ledger accounts
                    </p>
                  )}
                </div>

                {/* Vendor / Account Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                      <MdTag size={14} className="text-primary" />
                      <span>Vendor / Account Code</span>
                    </label>
                    {!values.vendor_code && suggestedCode && (
                      <button
                        type="button"
                        onClick={() => setFieldValue('vendor_code', suggestedCode)}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        Use Suggested ({suggestedCode})
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    name="vendor_code"
                    onChange={handleChange}
                    value={values.vendor_code || ''}
                    placeholder={suggestedCode || 'e.g. 2010-001 or VEND-001'}
                    className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono font-bold outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Auto-links with Chart of Accounts ledger code under Current Liabilities (2010-xxx)
                  </p>
                </div>

                {/* Ledger Page Number */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Ledger Page # (Optional)
                  </label>
                  <input
                    type="text"
                    name="page_no"
                    onChange={handleChange}
                    value={values.page_no || ''}
                    placeholder="e.g. 142 or Pg-12"
                    className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Physical ledger book reference number for traditional paper accounting cross-checks
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 2: CONTACT & MILL / FACTORY LOCATION */}
            <div className="bg-white dark:bg-boxdark rounded-2xl border border-stroke dark:border-strokedark shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-stroke dark:border-strokedark pb-3">
                <span className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
                  <MdPhone size={18} />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    2. Contact Information & Factory / Dispatch Location
                  </h4>
                  <p className="text-[11px] text-slate-500">Representative contact details, direct communication channels, and physical manufacturing address</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Contact Person */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <MdPerson size={14} className="text-slate-400" />
                    <span>Contact Person / Representative</span>
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    onChange={handleChange}
                    value={values.contactName}
                    placeholder="e.g. M. Tariq (Sales / Accounts Manager)"
                    className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Direct point of contact for purchase orders & dispatches
                  </p>
                </div>

                {/* Mobile / WhatsApp */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Mobile / WhatsApp No.
                  </label>
                  <input
                    type="text"
                    name="cellNo"
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9+-]/g, '');
                      handleChange(e);
                    }}
                    value={values.cellNo}
                    placeholder="0300-1234567"
                    className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono font-medium outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Primary mobile line for purchase updates & communications
                  </p>
                </div>

                {/* Email Address */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <MdEmail size={14} className="text-slate-400" />
                    <span>Email Address (Optional)</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    onChange={handleChange}
                    value={values.email}
                    placeholder="vendor@domain.com"
                    className={`w-full rounded-xl border bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs outline-none transition focus:bg-white dark:focus:bg-boxdark focus:ring-2 focus:ring-primary/20 ${
                      touched.email && errors.email ? 'border-red-500' : 'border-stroke dark:border-strokedark focus:border-primary'
                    }`}
                  />
                  {touched.email && errors.email ? (
                    <p className="text-red-500 text-[11px] mt-1">{String(errors.email)}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">For receiving electronic purchase orders and digital bills</p>
                  )}
                </div>

                {/* Office / Landline Phone */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200">
                    Office / Landline Phone (Optional)
                  </label>
                  <input
                    type="text"
                    name="phoneNo"
                    onChange={handleChange}
                    value={values.phoneNo}
                    placeholder="e.g. 022-2780000 / 021-3456789"
                    className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white px-4 py-2.5 text-xs font-mono outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Head office, mill reception, or factory landline</p>
                </div>

                {/* City * | Area (Optional) Dual Unified Input */}
                <div className="md:col-span-2">
                  <SubAreaAreaInput
                    label="City | Area"
                    subAreaValue={values.subArea || ''}
                    areaValue={values.area || ''}
                    onSubAreaChange={(val) => {
                      setFieldValue('subArea', val);
                    }}
                    onAreaChange={(val) => setFieldValue('area', val)}
                    onSubAreaAdd={handleAddCustomSubArea}
                    onAreaAdd={handleAddCustomArea}
                    subAreaOptions={subAreaOptions}
                    areaOptions={
                      values.subArea && subAreaToAreasMap[values.subArea]
                        ? subAreaToAreasMap[values.subArea]
                        : DEFAULT_AREAS
                    }
                    helperText="City is required. Area is optional."
                  />
                  {touched.subArea && errors.subArea && (
                    <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
                      <MdInfoOutline size={12} /> {String(errors.subArea)}
                    </p>
                  )}
                </div>

                {/* Physical Address */}
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <MdLocationOn size={14} className="text-slate-400" />
                    <span>Business / Factory Physical Address</span>
                  </label>
                  <textarea
                    rows={2}
                    name="address"
                    onChange={handleChange}
                    value={values.address}
                    placeholder="Factory plot reference, Industrial Estate / Sector, Road / Street..."
                    className="w-full rounded-xl border border-stroke dark:border-strokedark bg-slate-50/50 dark:bg-boxdark text-slate-900 dark:text-white p-3 text-xs outline-none transition focus:bg-white dark:focus:bg-boxdark focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Physical manufacturing plant, dispatch depot, or corporate head office
                  </p>
                </div>
              </div>
            </div>

            {/* BOTTOM ACTION BAR */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleNavigateToList}
                className="rounded-xl border border-stroke dark:border-strokedark bg-white dark:bg-boxdark hover:bg-slate-50 dark:hover:bg-slate-800 py-3 px-6 font-bold text-slate-700 dark:text-slate-300 transition shadow-xs text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 px-8 font-bold text-white transition disabled:opacity-50 shadow-md text-xs cursor-pointer flex items-center gap-2"
              >
                {loading ? (
                  <Spinner color="border-white" size="w-4 h-4" />
                ) : (
                  <>
                    <MdCheckCircle size={16} />
                    <span>{isEditMode ? 'Update Vendor Account' : 'Save Vendor Profile'}</span>
                  </>
                )}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default AddVendor;
