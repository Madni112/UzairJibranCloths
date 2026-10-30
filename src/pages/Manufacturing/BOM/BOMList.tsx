import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../Context/LanguageContext';
import { bomService, BomHeader } from '../../../service/bomService';
import TablePagination from '../../../components/TablePagination';
import Breadcrumb from '../../../components/Breadcrumbs/Breadcrumb';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import {
  MdPrecisionManufacturing,
  MdAdd,
  MdSearch,
  MdEdit,
  MdDelete,
  MdContentCopy,
  MdVisibility,
  MdClose,
  MdOutlineReceiptLong,
  MdTrendingUp,
  MdAttachMoney,
  MdCategory,
  MdLayers,
  MdPrint,
  MdFilterList
} from 'react-icons/md';

const BOMList: React.FC = () => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const [boms, setBoms] = useState<BomHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedBomForView, setSelectedBomForView] = useState<BomHeader | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await bomService.getAll();
      setBoms(data);
    } catch {
      toast.error(isRTL ? 'ڈیٹا لوڈ کرنے میں خرابی ہوئی' : 'Failed to load BOM recipes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered & Searched List
  const filteredBoms = useMemo(() => {
    return boms.filter(bom => {
      const matchSearch =
        bom.finished_product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bom.bom_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bom.finished_product_code && bom.finished_product_code.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = categoryFilter === 'ALL' || bom.category === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || bom.status === statusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [boms, searchTerm, categoryFilter, statusFilter]);

  // Pagination Slice
  const totalEntries = filteredBoms.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const paginatedBoms = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBoms.slice(start, start + pageSize);
  }, [filteredBoms, currentPage, pageSize]);

  // Unique Categories for Filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    boms.forEach(b => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [boms]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = boms.length;
    const active = boms.filter(b => b.status === 'Active').length;
    const avgMargin =
      total > 0
        ? (boms.reduce((acc, b) => acc + (b.margin_percentage || 0), 0) / total).toFixed(1)
        : '0.0';
    const totalValuation = boms.reduce((acc, b) => acc + (b.total_cost || 0), 0);

    return { total, active, avgMargin, totalValuation };
  }, [boms]);

  // Handle Delete
  const handleDelete = async (id: string, name: string) => {
    const confirmMsg = isRTL
      ? `کیا آپ واقعی نسخہ "${name}" کو حذف کرنا چاہتے ہیں؟`
      : `Are you sure you want to delete BOM "${name}"?`;
    if (window.confirm(confirmMsg)) {
      try {
        await bomService.delete(id);
        toast.success(isRTL ? 'نسخہ کامیابی سے حذف ہو گیا' : 'BOM deleted successfully');
        loadData();
        if (selectedBomForView?.id === id) setSelectedBomForView(null);
      } catch {
        toast.error(isRTL ? 'حذف کرنے میں ناکامی' : 'Failed to delete BOM');
      }
    }
  };

  // Handle Duplicate
  const handleDuplicate = async (bom: BomHeader) => {
    try {
      const nextNum = await bomService.getNextBomNumber();
      const duplicated = {
        ...bom,
        id: undefined,
        bom_number: nextNum,
        finished_product_name: `${bom.finished_product_name} (Copy)`,
        status: 'Draft' as const,
        created_at: new Date().toISOString()
      };
      await bomService.save(duplicated);
      toast.success(
        isRTL
          ? `نسخہ نقل کر لیا گیا (${nextNum})`
          : `BOM duplicated successfully as ${nextNum}`
      );
      loadData();
    } catch {
      toast.error(isRTL ? 'نقل کرنے میں ناکامی' : 'Failed to duplicate BOM');
    }
  };

  return (
    <div className={`mx-auto max-w-7xl p-4 md:p-6 ${isRTL ? 'font-urdu' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Breadcrumb
        pageName={isRTL ? 'بل آف میٹریلز (BOM)' : 'Bill of Materials (BOM)'}
      />

      {/* Header Banner */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-boxdark p-5 rounded-xl shadow-sm border border-stroke dark:border-strokedark">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary dark:bg-primary/20">
              <MdPrecisionManufacturing className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white">
                {isRTL ? 'بل آف میٹریلز (BOM) ڈائریکٹری' : 'Bill of Materials (BOM) Directory'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isRTL
                  ? 'تمام مصنوعات کے تیاری نسخے، خام مال کی لاگت، لیبر اور منافع مارجن کا انتظام'
                  : 'Universal production recipes, raw material consumption, batch costings & profit margins'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/Manufacturing/add')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-center font-medium text-white hover:bg-opacity-90 shadow-sm transition-all"
        >
          <MdAdd className="text-xl" />
          <span>{isRTL ? 'نیا نسخہ بنائیں' : 'Create New BOM'}</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-boxdark p-4 rounded-xl border border-stroke dark:border-strokedark shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {isRTL ? 'کل فعال نسخے' : 'Total Active BOMs'}
            </span>
            <span className="p-2 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <MdLayers className="text-lg" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-black dark:text-white">
            {metrics.active} / {metrics.total}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
            {isRTL ? 'تیار پیداواری فارمولے' : 'Production ready recipes'}
          </span>
        </div>

        <div className="bg-white dark:bg-boxdark p-4 rounded-xl border border-stroke dark:border-strokedark shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {isRTL ? 'اوسط منافع مارجن' : 'Average Margin'}
            </span>
            <span className="p-2 rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <MdTrendingUp className="text-lg" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics.avgMargin}%
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
            {isRTL ? 'ہدف کے مطابق منافع' : 'Target gross margin'}
          </span>
        </div>

        <div className="bg-white dark:bg-boxdark p-4 rounded-xl border border-stroke dark:border-strokedark shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {isRTL ? 'کل بیچ ویلیو' : 'Total Batch Value'}
            </span>
            <span className="p-2 rounded-md bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <MdAttachMoney className="text-lg" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-black dark:text-white">
            PKR {metrics.totalValuation.toLocaleString()}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
            {isRTL ? 'تمام نسخوں کی مجموعی لاگت' : 'Combined recipe investment'}
          </span>
        </div>

        <div className="bg-white dark:bg-boxdark p-4 rounded-xl border border-stroke dark:border-strokedark shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {isRTL ? 'صنعت کا دائرہ' : 'Industry Scope'}
            </span>
            <span className="p-2 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <MdCategory className="text-lg" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-black dark:text-white">
            {categories.length > 0 ? `${categories.length} Categories` : 'Global / Universal'}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
            {isRTL ? 'کپڑا، ٹائلز اور دیگر' : 'Textile, Tiles, General'}
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white dark:bg-boxdark p-4 rounded-xl border border-stroke dark:border-strokedark shadow-sm">
        <div className="relative flex-1">
          <MdSearch className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-xl ${isRTL ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            placeholder={
              isRTL
                ? 'تیار پروڈکٹ کا نام یا BOM نمبر تلاش کریں...'
                : 'Search by finished product, SKU, or BOM #...'
            }
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={`w-full rounded-lg border border-stroke bg-transparent py-2.5 text-sm outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4 dark:focus:border-primary ${
              isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'
            }`}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <MdFilterList className="text-base" />
            <span>{isRTL ? 'فلٹرز:' : 'Filters:'}</span>
          </div>

          <select
            value={categoryFilter}
            onChange={e => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-stroke bg-transparent py-2 px-3 text-xs outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
          >
            <option value="ALL">{isRTL ? 'تمام کیٹیگریز' : 'All Categories'}</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-stroke bg-transparent py-2 px-3 text-xs outline-none focus:border-primary dark:border-strokedark dark:bg-meta-4"
          >
            <option value="ALL">{isRTL ? 'تمام اسٹیٹس' : 'All Status'}</option>
            <option value="Active">{isRTL ? 'فعال (Active)' : 'Active'}</option>
            <option value="Draft">{isRTL ? 'ڈرافٹ (Draft)' : 'Draft'}</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : paginatedBoms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-gray-100 dark:bg-meta-4 text-gray-400 mb-3">
              <MdPrecisionManufacturing className="text-4xl" />
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white">
              {isRTL ? 'کوئی نسخہ نہیں ملا' : 'No BOM Recipes Found'}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mt-1">
              {searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                ? isRTL
                  ? 'دیے گئے فلٹرز پر کوئی نسخہ پورا نہیں اترتا۔ تلاش کے الفاظ تبدیل کر کے دیکھیں۔'
                  : 'No recipes matched your search criteria. Try adjusting your query or filters.'
                : isRTL
                ? 'ابھی تک کوئی نسخہ شامل نہیں کیا گیا۔ نیا نسخہ بنانے کے لیے اوپر دیئے گئے بٹن پر کلک کریں۔'
                : 'Get started by creating your first global manufacturing recipe.'}
            </p>
            {!searchTerm && categoryFilter === 'ALL' && (
              <button
                onClick={() => navigate('/Manufacturing/add')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 shadow-sm"
              >
                <MdAdd className="text-lg" />
                <span>{isRTL ? 'پہلا نسخہ بنائیں' : 'Create First BOM'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50 dark:bg-meta-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 border-b border-stroke dark:border-strokedark">
                  <th className={`py-3.5 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'BOM نمبر' : 'BOM #'}
                  </th>
                  <th className={`py-3.5 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'تیار پروڈکٹ' : 'Finished Product'}
                  </th>
                  <th className={`py-3.5 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'کیٹیگری' : 'Category'}
                  </th>
                  <th className={`py-3.5 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'بیچ سائز' : 'Batch Output'}
                  </th>
                  <th className={`py-3.5 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'خام مال لاگت' : 'Raw Cost'}
                  </th>
                  <th className={`py-3.5 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'فی یونٹ لاگت' : 'Unit Cost'}
                  </th>
                  <th className={`py-3.5 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'ہدف سیل پرائس' : 'Target Price'}
                  </th>
                  <th className={`py-3.5 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'مارجن' : 'Margin'}
                  </th>
                  <th className={`py-3.5 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {isRTL ? 'اسٹیٹس' : 'Status'}
                  </th>
                  <th className="py-3.5 px-4 text-center">
                    {isRTL ? 'اقدامات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke dark:divide-strokedark text-sm">
                {paginatedBoms.map(bom => (
                  <tr
                    key={bom.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-meta-4/20 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-primary">
                      {bom.bom_number}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-black dark:text-white">
                      <div>{bom.finished_product_name}</div>
                      {bom.finished_product_code && (
                        <span className="inline-block mt-0.5 rounded bg-gray-100 dark:bg-meta-4 px-1.5 py-0.5 text-[11px] font-mono text-gray-500">
                          {bom.finished_product_code}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-meta-4 px-2.5 py-0.5 text-xs text-slate-700 dark:text-slate-300">
                        {bom.category || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-black dark:text-white">
                      {bom.batch_quantity} {bom.uom}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-gray-700 dark:text-gray-300">
                      PKR {bom.raw_material_cost.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-black dark:text-white">
                      PKR {bom.unit_cost.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      PKR {bom.target_selling_price ? bom.target_selling_price.toLocaleString() : '-'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center font-semibold text-xs px-2 py-0.5 rounded-full ${
                          bom.margin_percentage >= 30
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : bom.margin_percentage >= 15
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {bom.margin_percentage}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                          bom.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {bom.status === 'Active'
                          ? isRTL
                            ? 'فعال'
                            : 'Active'
                          : isRTL
                          ? 'ڈرافٹ'
                          : 'Draft'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedBomForView(bom)}
                          title={isRTL ? 'تفصیل دیکھیں' : 'View Recipe'}
                          className="p-1.5 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary rounded hover:bg-gray-100 dark:hover:bg-meta-4 transition"
                        >
                          <MdVisibility className="text-base" />
                        </button>

                        <button
                          onClick={() => navigate(`/Manufacturing/edit/${bom.id}`)}
                          title={isRTL ? 'ترمیم کریں' : 'Edit BOM'}
                          className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded hover:bg-gray-100 dark:hover:bg-meta-4 transition"
                        >
                          <MdEdit className="text-base" />
                        </button>

                        <button
                          onClick={() => handleDuplicate(bom)}
                          title={isRTL ? 'نقل کریں' : 'Duplicate'}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 rounded hover:bg-gray-100 dark:hover:bg-meta-4 transition"
                        >
                          <MdContentCopy className="text-base" />
                        </button>

                        <button
                          onClick={() => handleDelete(bom.id, bom.finished_product_name)}
                          title={isRTL ? 'حذف کریں' : 'Delete'}
                          className="p-1.5 text-gray-500 hover:text-danger dark:text-gray-400 dark:hover:text-danger rounded hover:bg-gray-100 dark:hover:bg-meta-4 transition"
                        >
                          <MdDelete className="text-base" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalEntries > 0 && (
          <div className="border-t border-stroke p-4 dark:border-strokedark">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalEntries={totalEntries}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={size => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Quick View Recipe Modal */}
      {selectedBomForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div
            className={`w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-boxdark border border-stroke dark:border-strokedark my-8 ${
              isRTL ? 'font-urdu' : ''
            }`}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stroke pb-4 dark:border-strokedark">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <MdOutlineReceiptLong className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-black dark:text-white">
                    {selectedBomForView.finished_product_name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-mono text-primary font-semibold">
                      {selectedBomForView.bom_number}
                    </span>
                    <span>•</span>
                    <span>{selectedBomForView.category}</span>
                    <span>•</span>
                    <span className="font-semibold text-black dark:text-white">
                      {selectedBomForView.batch_quantity} {selectedBomForView.uom} (
                      {isRTL ? 'بیچ سائز' : 'Batch Size'})
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedBomForView(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-black dark:hover:bg-meta-4 dark:hover:text-white"
              >
                <MdClose className="text-xl" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-4 space-y-5">
              {/* Cost Summary Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 dark:bg-meta-4 p-3.5 rounded-xl text-xs">
                <div>
                  <span className="text-gray-500">{isRTL ? 'خام مال لاگت:' : 'Raw Materials:'}</span>
                  <div className="text-sm font-bold font-mono text-black dark:text-white mt-0.5">
                    PKR {selectedBomForView.raw_material_cost.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">{isRTL ? 'لیبر اور اوور ہیڈ:' : 'Labor & Overheads:'}</span>
                  <div className="text-sm font-bold font-mono text-black dark:text-white mt-0.5">
                    PKR{' '}
                    {(
                      selectedBomForView.labor_cost +
                      selectedBomForView.overhead_cost +
                      selectedBomForView.packaging_cost
                    ).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">{isRTL ? 'فی یونٹ لاگت:' : 'Unit Cost:'}</span>
                  <div className="text-sm font-bold font-mono text-primary mt-0.5">
                    PKR {selectedBomForView.unit_cost.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">{isRTL ? 'ہدف منافع:' : 'Target Margin:'}</span>
                  <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedBomForView.margin_percentage}%
                  </div>
                </div>
              </div>

              {/* Raw Materials Breakdown Table */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  {isRTL ? 'اجزائے ترکیبی / خام مال کی تفصیل' : 'Raw Materials Composition'}
                </h4>
                <div className="overflow-x-auto rounded-lg border border-stroke dark:border-strokedark">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-meta-4 text-gray-600 dark:text-gray-300">
                        <th className={`p-2.5 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {isRTL ? 'خام مال' : 'Raw Material Item'}
                        </th>
                        <th className="p-2.5 text-center">{isRTL ? 'مقدار' : 'Quantity'}</th>
                        <th className="p-2.5 text-center">{isRTL ? 'اکائی' : 'UOM'}</th>
                        <th className="p-2.5 text-center">{isRTL ? 'فی یونٹ ریٹ' : 'Unit Cost'}</th>
                        <th className="p-2.5 text-center">{isRTL ? 'ضیاع' : 'Waste %'}</th>
                        <th className={`p-2.5 ${isRTL ? 'text-left' : 'text-right'}`}>
                          {isRTL ? 'مجموعی لاگت' : 'Line Total'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke dark:divide-strokedark">
                      {selectedBomForView.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-meta-4/20">
                          <td className="p-2.5 font-medium text-black dark:text-white">
                            {item.item_name}
                            {item.notes && (
                              <div className="text-[10px] text-gray-400 mt-0.5">{item.notes}</div>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                          <td className="p-2.5 text-center">{item.uom}</td>
                          <td className="p-2.5 text-center font-mono">
                            PKR {item.unit_cost.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center font-mono">
                            {item.wastage_percentage}%
                          </td>
                          <td
                            className={`p-2.5 font-mono font-semibold text-black dark:text-white ${
                              isRTL ? 'text-left' : 'text-right'
                            }`}
                          >
                            PKR {item.total_cost.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedBomForView.notes && (
                <div className="text-xs bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  <span className="font-semibold">{isRTL ? 'ہدایات / نوٹس:' : 'Notes / Production Instructions:'}</span>{' '}
                  {selectedBomForView.notes}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-4 flex items-center justify-between border-t border-stroke pt-4 dark:border-strokedark">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
              >
                <MdPrint className="text-base" />
                <span>{isRTL ? 'پرنٹ کریں' : 'Print Recipe'}</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedBomForView(null)}
                  className="rounded-lg border border-stroke px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-strokedark dark:text-gray-300 dark:hover:bg-meta-4"
                >
                  {isRTL ? 'بند کریں' : 'Close'}
                </button>
                <button
                  onClick={() => {
                    const id = selectedBomForView.id;
                    setSelectedBomForView(null);
                    navigate(`/Manufacturing/edit/${id}`);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-opacity-90 shadow-sm"
                >
                  <MdEdit className="text-base" />
                  <span>{isRTL ? 'نسخہ ترمیم کریں' : 'Edit BOM'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BOMList;
