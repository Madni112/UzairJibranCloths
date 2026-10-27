import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { useAuth } from '../../../Context/Auth';
import { FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import {
  SubAreaAreaInput,
  DEFAULT_SUB_AREAS,
  DEFAULT_AREAS,
  DEFAULT_SUBAREA_AREAS_MAP,
} from '../../../components/SubAreaAreaInput';

const AddVendor = () => {
  const [loading, setLoading] = useState(false);
  const { tenantId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const editData = location.state?.vendorRecord || location.state?.vendor;
  const isEditMode = !!editData;

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
    return { subArea, area };
  };

  const initialLoc = getInitialLocation();

  const validationSchema = Yup.object().shape({
    vendorName: Yup.string().trim().required('Vendor Name is required'),
    subArea: Yup.string().trim().required('City is required'),
    cellNo: Yup.string().nullable(),
    email: Yup.string().email('Please enter a valid email address').nullable(),
  });

  return (
    <div className="mx-auto max-w-4xl text-black dark:text-bodydark text-xs pb-12">
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        {/* Header Bar */}
        <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark flex justify-between items-center">
          <div>
            <h3 className="font-bold text-black dark:text-white text-base">
              {isEditMode ? `Modify Vendor: ${editData?.vendor_name || editData?.name}` : 'Add New Commercial Vendor'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Register wholesale suppliers and factory merchant accounts</p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Purchase/Vendor/List`)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/20"
          >
            <FiArrowLeft size={14} /> Back to Vendor Directory
          </button>
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

              const sVal = values.subArea ? values.subArea.trim() : '';
              const aVal = values.area ? values.area.trim() : '';
              let fullAddress = values.address ? values.address.trim() : '';

              // Ensure City and Area are preserved in address string if address is present or as standalone
              const locSegments = [aVal, sVal].filter(Boolean);
              if (locSegments.length > 0) {
                const locStr = locSegments.join(', ');
                if (!fullAddress) {
                  fullAddress = locStr;
                } else if (!fullAddress.toLowerCase().includes(sVal.toLowerCase())) {
                  fullAddress = `${fullAddress}, ${locStr}`;
                }
              }

              const databasePayload: any = {
                vendor_name: values.vendorName.trim(),
                name: values.vendorName.trim(),
                vendor_code: values.vendor_code ? values.vendor_code.trim() : null,
                vendorCode: values.vendor_code ? values.vendor_code.trim() : null,
                page_no: values.page_no ? String(values.page_no).trim() : null,
                pageNo: values.page_no ? String(values.page_no).trim() : null,
                contact_name: values.contactName.trim() || null,
                cell_no: values.cellNo.trim() || null,
                phone: values.cellNo.trim() || null,
                phone_no: values.phoneNo.trim() || null,
                email: values.email.trim() || null,
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

              // Auto-fallback: if PostgREST reports any missing column in schema cache (e.g. city or sub_area), strip it and retry
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

              toast.success(isEditMode ? 'Vendor profile updated successfully!' : 'New vendor registered successfully!');
              navigate(`${tenantId ? `/${tenantId}` : ''}/Purchase/Vendor/List`);
            } catch (err: any) {
              toast.error('Transaction Error: ' + err.message);
            } finally {
              setLoading(false);
            }
          }}
        >
          {({ handleChange, values, errors, touched, setFieldValue }) => (
            <Form className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Vendor Corporate Name */}
                <div>
                  <label className="block text-gray-500 mb-1.5 font-bold uppercase tracking-wide">
                    Vendor Corporate Name: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="vendorName"
                    onChange={handleChange}
                    value={values.vendorName}
                    className={`w-full rounded border px-3 h-10 bg-white dark:bg-boxdark text-xs font-bold text-black dark:text-white outline-none focus:border-primary ${
                      touched.vendorName && errors.vendorName ? 'border-red-500 bg-red-50/10' : 'border-stroke dark:border-strokedark'
                    }`}
                    placeholder="e.g., Master Tiles & Ceramics / Sonex Sanitary"
                  />
                  {touched.vendorName && errors.vendorName && (
                    <p className="text-red-500 font-bold text-[10px] mt-1">{String(errors.vendorName)}</p>
                  )}
                </div>

                {/* Vendor Code & Page # */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-500 mb-1.5 font-bold uppercase tracking-wide">Vendor Code (Optional):</label>
                    <input
                      type="text"
                      name="vendor_code"
                      onChange={handleChange}
                      value={values.vendor_code}
                      className="w-full rounded border border-stroke dark:border-strokedark px-3 h-10 bg-white dark:bg-boxdark text-xs font-mono font-bold text-black dark:text-white outline-none focus:border-primary"
                      placeholder="e.g., VEND-001 or V01"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 mb-1.5 font-bold uppercase tracking-wide">Page # (Optional):</label>
                    <input
                      type="text"
                      name="page_no"
                      onChange={handleChange}
                      value={values.page_no}
                      className="w-full rounded border border-stroke dark:border-strokedark px-3 h-10 bg-white dark:bg-boxdark text-xs font-mono font-bold text-black dark:text-white outline-none focus:border-primary"
                      placeholder="e.g., 142 or Pg-12"
                    />
                  </div>
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-gray-500 mb-1.5 font-bold uppercase tracking-wide">Contact Person / Representative:</label>
                  <input
                    type="text"
                    name="contactName"
                    onChange={handleChange}
                    value={values.contactName}
                    className="w-full rounded border border-stroke dark:border-strokedark px-3 h-10 bg-white dark:bg-boxdark text-xs font-medium text-black dark:text-white outline-none focus:border-primary"
                    placeholder="e.g., M. Tariq (Manager)"
                  />
                </div>

                {/* Mobile / WhatsApp */}
                <div>
                  <label className="block text-gray-500 mb-1.5 font-bold uppercase tracking-wide">Mobile / WhatsApp No.:</label>
                  <input
                    type="text"
                    name="cellNo"
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/[^0-9]/g, '');
                      handleChange(e);
                    }}
                    value={values.cellNo}
                    className="w-full rounded border border-stroke dark:border-strokedark px-3 h-10 bg-white dark:bg-boxdark text-xs font-bold font-mono text-black dark:text-white outline-none focus:border-primary"
                    placeholder="e.g., 0300-1234567"
                  />
                </div>

                {/* Email Address */}
                <div className="md:col-span-2">
                  <label className="block text-gray-500 mb-1.5 font-bold uppercase tracking-wide">Email Address (Optional):</label>
                  <input
                    type="email"
                    name="email"
                    onChange={handleChange}
                    value={values.email}
                    className={`w-full rounded border px-3 h-10 bg-white dark:bg-boxdark text-xs text-black dark:text-white outline-none focus:border-primary ${
                      touched.email && errors.email ? 'border-red-500' : 'border-stroke dark:border-strokedark'
                    }`}
                    placeholder="vendor@domain.com"
                  />
                  {touched.email && errors.email && (
                    <p className="text-red-500 font-bold text-[10px] mt-1">{String(errors.email)}</p>
                  )}
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
                    <p className="text-red-500 font-bold text-[10px] mt-1">{String(errors.subArea)}</p>
                  )}
                </div>

                {/* Physical Address */}
                <div className="md:col-span-2">
                  <label className="block text-gray-500 mb-1.5 font-bold uppercase tracking-wide">
                    Business / Factory Physical Address:
                  </label>
                  <input
                    type="text"
                    name="address"
                    onChange={handleChange}
                    value={values.address}
                    className="w-full rounded border border-stroke dark:border-strokedark px-3 h-10 bg-white dark:bg-boxdark text-xs text-black dark:text-white outline-none focus:border-primary"
                    placeholder="Plot reference, industrial area, street..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stroke dark:border-strokedark">
                <button
                  type="button"
                  onClick={() => navigate(`${tenantId ? `/${tenantId}` : ''}/Purchase/Vendor/List`)}
                  className="rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-3 px-6 font-bold text-slate-700 dark:text-slate-300 transition shadow-sm text-xs cursor-pointer"
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
                      <FiCheckCircle size={15} />{' '}
                      <span>{isEditMode ? 'Update Vendor Account' : 'Save Vendor Profile'}</span>
                    </>
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

export default AddVendor;
