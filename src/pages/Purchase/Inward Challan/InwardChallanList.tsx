import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../Context/supabaseClient';
import { toast } from 'react-hot-toast';
import Spinner from '../../../ui/Spinner';
import { MdInbox, MdHistory, MdAssignmentReturn, MdAddCircle } from 'react-icons/md';
import { useAuth } from '../../../Context/Auth';
import { useModal } from '../../../Context/Modal';
import VerifyInward from './VerifyInward';
import InwardChallanHistory from './InwardChallanHistory';
import VerifyReturnChallan from '../../Warehouse/Return Challan/VerifyReturnChallan';
import ReturnChallanHistory from '../../Warehouse/Return Challan/ReturnChallanHistory';
import ReceiveGrnModal from '../GRN/ReceiveGrnModal';
import { isShopLocation } from '../../../utils/locationUtils';

interface InwardChallanListProps {
  locationFilter?: 'SHOP' | 'WAREHOUSE' | 'ALL';
}

const InwardChallanList: React.FC<InwardChallanListProps> = ({ locationFilter = 'ALL' }) => {
  const [challans, setChallans] = useState<any[]>([]);
  const [pendingReturns, setPendingReturns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'PURCHASES' | 'RETURNS'>('PURCHASES');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);
  const { tenantId, userLocationName } = useAuth();
  const { showModal, hideModal } = useModal();

  const openHistoryModal = () => {
    if (activeTab === 'RETURNS') {
      showModal(
        <ReturnChallanHistory 
          onView={(id) => {
            showModal(
              <VerifyReturnChallan 
                returnId={id} 
                readonly={true}
                onCancel={() => openHistoryModal()} 
              />,
              "View Return Receipt Details",
              undefined,
              "max-w-5xl"
            );
          }}
        />,
        "Processed Customer Return Receipts",
        undefined,
        "max-w-5xl"
      );
    } else {
      showModal(
        <InwardChallanHistory 
          locationFilter={locationFilter}
          onView={(id) => {
            showModal(
              <VerifyInward 
                inwardId={id} 
                locationFilter={locationFilter}
                readonly={true}
                onCancel={() => openHistoryModal()} 
              />,
              "View GRN Details",
              undefined,
              "max-w-6xl"
            );
          }}
        />,
        "Processed Inward Challans",
        undefined,
        "max-w-5xl"
      );
    }
  };

  const [productMeta, setProductMeta] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchPendingInwards();
  }, [locationFilter]);

  const fetchPendingInwards = async () => {
    setLoading(true);
    try {
      const [ receiptsRes, itemsRes, { data: purchases }, { data: productsData }, returnsRes ] = await Promise.all([
        supabase.from('grn_receipts').select('*').order('created_at', { ascending: false }),
        supabase.from('grn_items').select('*'),
        supabase.from('supplier_purchases').select('id, purchase_no, metadata'),
        supabase.from('products').select('product_name, category, pcs_per_box, pieces_per_box, pieces_per_packing, scenario_name, uom'),
        supabase.from('sales_returns').select('*').in('inward_status', ['Pending Inward', 'Partially Received']).order('created_at', { ascending: false })
      ]);

      if (receiptsRes.error) throw receiptsRes.error;

      const itemsByGrn: Record<string, any[]> = {};
      (itemsRes.data || []).forEach((it: any) => {
        const gId = String(it.grn_id || '');
        if (!itemsByGrn[gId]) itemsByGrn[gId] = [];
        itemsByGrn[gId].push(it);
      });

      const combinedData = (receiptsRes.data || []).map((g: any) => ({
        ...g,
        grn_items: itemsByGrn[String(g.id)] || []
      }));

      const pMap: Record<string, any> = {};
      (productsData || []).forEach((p: any) => {
        if (p.product_name) pMap[String(p.product_name).trim().toLowerCase()] = p;
      });
      setProductMeta(pMap);
      
      let filteredData = combinedData;
      filteredData = filteredData.map(g => {
        const pur = (purchases || []).find(p => p.metadata?.grn_id === g.id || (Array.isArray(p.metadata?.grn_ids) && p.metadata.grn_ids.includes(g.id)) || (p.purchase_no && g.grn_no?.includes(p.purchase_no)));
        return { ...g, purchase_no: pur?.purchase_no || '' };
      });
      
      const isItemPending = (item: any) => {
        if (item.accepted_qty == null) return true;
        const resolved = Number(item.accepted_qty || 0) + Number(item.rejected_qty || 0);
        const total = Number(item.qty || 0);
        const hold = Number(item.hold_qty || 0);
        return (resolved < total && total > 0) || hold > 0;
      };
      
      // Strict filter for Warehouse Managers locked to a location
      if (userLocationName) {
        filteredData = filteredData.filter(grn => {
          return grn.grn_items?.some((item: any) => {
            const matchesLocation = String(item.warehouse_name).toUpperCase() === String(userLocationName).toUpperCase();
            return matchesLocation && isItemPending(item);
          });
        });
      } else if (locationFilter !== 'ALL') {
        filteredData = filteredData.filter(grn => {
          if (locationFilter === 'SHOP') {
            // Include if there are any SHOP/Showroom items that are pending/partial
            return grn.grn_items?.some((item: any) => {
              const isShop = isShopLocation(item.warehouse_name);
              return isShop && isItemPending(item);
            });
          } else {
            // Include if there are any WAREHOUSE (non-shop) items that are pending/partial
            return grn.grn_items?.some((item: any) => {
              const isShop = isShopLocation(item.warehouse_name);
              return !isShop && isItemPending(item);
            });
          }
        });
      } else {
        // For ALL locations, include any GRN that has at least one pending/partial item
        filteredData = filteredData.filter(grn => {
          return grn.grn_items?.some((item: any) => isItemPending(item));
        });
      }
      
      setChallans(filteredData);

      // Process and filter Customer Returns
      let filteredReturns = (returnsRes?.data || []);
      const normalizeWh = (name: string) => (name || '').replace(/[-_\s]/g, '').toUpperCase();
      
      if (userLocationName) {
        const normUserLoc = normalizeWh(userLocationName);
        filteredReturns = filteredReturns.filter((ret: any) => {
          const retWhNorm = normalizeWh(ret.warehouse_name || ret.source_warehouse);
          const hasMatchingItem = Array.isArray(ret.items) && ret.items.some((it: any) => {
            const itWhNorm = normalizeWh(it.warehouse || it.location);
            return itWhNorm === normUserLoc || 
              (normUserLoc.includes('FATEH') && itWhNorm.includes('FATEH')) || 
              (normUserLoc.includes('A39') && itWhNorm.includes('A39'));
          });
          return retWhNorm === normUserLoc || 
            (normUserLoc.includes('FATEH') && retWhNorm.includes('FATEH')) || 
            (normUserLoc.includes('A39') && retWhNorm.includes('A39')) || 
            hasMatchingItem;
        });
      } else if (locationFilter !== 'ALL') {
        filteredReturns = filteredReturns.filter((ret: any) => {
          const isShop = normalizeWh(ret.warehouse_name || ret.source_warehouse) === 'SHOP' || 
            (Array.isArray(ret.items) && ret.items.some((it: any) => normalizeWh(it.warehouse || it.location) === 'SHOP'));
          return locationFilter === 'SHOP' ? isShop : !isShop;
        });
      }
      
      setPendingReturns(filteredReturns);

      // If no purchases are waiting but customer returns are waiting, default to Returns tab
      if (filteredData.length === 0 && filteredReturns.length > 0) {
        setActiveTab('RETURNS');
      }
    } catch (err: any) {
      toast.error('Failed to load pending inward challans.');
    } finally {
      setLoading(false);
    }
  };

  const formatItemQty = (productName: string, qty: number) => {
    if (qty === 0) return '0';
    const meta = productMeta[String(productName || '').trim().toLowerCase()];
    const rawPcs = Number(meta?.pieces_per_box ?? meta?.pcs_per_box ?? meta?.pieces_per_packing ?? 0);
    const isTile = rawPcs > 1 || String(meta?.scenario_name || '').toUpperCase().includes('TILE') || String(meta?.category || '').toUpperCase().includes('TILE') || String(meta?.uom || '').toUpperCase() === 'BOX';
    const pcsPerBox = rawPcs > 1 ? rawPcs : 4;

    if (isTile && pcsPerBox > 1) {
      const totalPieces = Math.round(Number(qty || 0) * pcsPerBox);
      const b = Math.floor(totalPieces / pcsPerBox);
      const p = totalPieces % pcsPerBox;
      if (b > 0 && p > 0) return `${b} Box + ${p} Pcs`;
      if (b > 0) return `${b} Box`;
      if (p > 0) return `${p} Pcs`;
      return '0';
    }
    return `${qty}`;
  };

  const filteredChallans = challans.filter(c =>
    String(c.grn_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(c.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(c.purchase_no || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReturns = pendingReturns.filter(r =>
    String(r.return_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(r.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(r.invoice_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(r.warehouse_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeList = activeTab === 'PURCHASES' ? filteredChallans : filteredReturns;
  const totalPages = Math.ceil(activeList.length / entriesPerPage);
  const currentData = activeList.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-6 text-black dark:text-white text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <MdInbox size={24} className="text-primary" />
            {locationFilter === 'SHOP' ? 'Shop Receiving Queue' : locationFilter === 'WAREHOUSE' ? 'Warehouse Inward Challans' : 'Receiving / QC Queue (Shop & Warehouse)'}
          </h2>
          <p className="text-gray-400 mt-0.5">Approve incoming goods and update physical inventory for your location</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeTab === 'PURCHASES' && (
            <button
              onClick={() => showModal(<ReceiveGrnModal defaultLocation={locationFilter} onClose={() => { hideModal(); fetchPendingInwards(); }} />, "Receive Goods (GRN)", undefined, "max-w-2xl")}
              className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition shadow-sm w-full sm:w-auto"
            >
              <MdAddCircle size={18} />
              + Receive GRN
            </button>
          )}
          <button
            onClick={openHistoryModal}
            className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-meta-4 dark:hover:bg-meta-4/80 px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 transition w-full sm:w-auto"
          >
            <MdHistory size={18} />
            {activeTab === 'RETURNS' ? 'Return History' : 'Processed History'}
          </button>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'RETURNS' ? "Search customer, Return No..." : "Search vendor, Purchase No..."}
            className="w-full sm:w-64 rounded-xl border border-stroke py-2 px-3 bg-white dark:bg-boxdark outline-none focus:border-primary font-semibold text-black dark:text-white text-xs shadow-xs"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stroke dark:border-strokedark">
        <button
          type="button"
          onClick={() => { setActiveTab('PURCHASES'); setCurrentPage(1); }}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'PURCHASES'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-black dark:hover:text-white'
          }`}
        >
          <MdInbox size={16} />
          Supplier Deliveries (GRN)
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'PURCHASES' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-meta-4 text-slate-500'
          }`}>
            {challans.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('RETURNS'); setCurrentPage(1); }}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'RETURNS'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-black dark:hover:text-white'
          }`}
        >
          <MdAssignmentReturn size={16} />
          Customer Returns (Sales Returns)
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            pendingReturns.length > 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 dark:bg-meta-4 text-slate-500'
          }`}>
            {pendingReturns.length}
          </span>
        </button>
      </div>

      <div className="rounded-2xl border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark p-6 overflow-hidden">
        <div className="max-w-full overflow-x-auto">
          {activeTab === 'PURCHASES' ? (
            <table className="w-full table-auto border-collapse text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-meta-4 text-[10px] font-black uppercase tracking-wider border-b border-stroke text-slate-700 dark:text-white">
                  <th className="py-3.5 px-4 whitespace-nowrap">Purchase #</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Vendor</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Items Summary</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap text-emerald-700">Received</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 text-center w-28 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Spinner /></td></tr>
                ) : filteredChallans.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-500 font-bold italic">No pending supplier inwards for this location.</td></tr>
                ) : (
                  currentData.map((rec) => {
                    const items = rec.grn_items || [];
                    const visibleItems = locationFilter === 'ALL' ? items : items.filter((item: any) => {
                      const isShop = isShopLocation(item.warehouse_name);
                      return locationFilter === 'SHOP' ? isShop : !isShop;
                    });

                    const totalItemCount = visibleItems.length;
                    const fullyVerifiedItemCount = visibleItems.filter((i: any) => {
                      const resolvedQty = Number(i.accepted_qty || 0) + Number(i.rejected_qty || 0);
                      return resolvedQty >= Number(i.qty || 0) && Number(i.qty || 0) > 0;
                    }).length;

                    const itemProgressPct = totalItemCount > 0 
                      ? Math.round((visibleItems.reduce((acc: number, i: any) => {
                          const q = Number(i.qty || 0);
                          if (q <= 0) return acc + 1;
                          const res = Number(i.accepted_qty || 0) + Number(i.rejected_qty || 0);
                          return acc + Math.min(1, res / q);
                        }, 0) / totalItemCount) * 100)
                      : 0;

                    return (
                      <tr key={rec.id} className="border-b border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/10 duration-150 font-semibold text-xs text-black dark:text-white">
                        <td className="py-3 px-4 font-bold font-mono whitespace-nowrap">
                          <span className="text-primary">{rec.purchase_no ? `PUR-${rec.purchase_no}` : '—'}</span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{rec.receipt_date}</td>
                        <td className="py-3 px-4 font-sans font-bold whitespace-nowrap">{rec.vendor_name}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5 max-w-[200px]">
                            {visibleItems.slice(0, 3).map((item: any, idx: number) => {
                              const acc = Number(item.accepted_qty || 0);
                              const rem = Math.max(0, Number(item.qty || 0) - acc);
                              return (
                                <div key={idx} className="text-[9px] text-slate-600 dark:text-slate-300 truncate">
                                  <span className="font-bold">{item.product_name}</span>
                                  <span className="ml-1 text-emerald-600">✓{formatItemQty(item.product_name, acc)}</span>
                                  {rem > 0 && <span className="ml-1 text-amber-600">⏳{formatItemQty(item.product_name, rem)}</span>}
                                </div>
                              );
                            })}
                            {visibleItems.length > 3 && (
                              <span className="text-[9px] text-slate-400">+{visibleItems.length - 3} more items</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="font-black text-emerald-600">{fullyVerifiedItemCount}</span>
                          <span className="text-slate-400 ml-0.5 text-[9px]">/ {totalItemCount} Items</span>
                          {itemProgressPct > 0 && fullyVerifiedItemCount < totalItemCount && (
                            <span className="text-[9px] font-bold text-amber-600 ml-1">({itemProgressPct}%)</span>
                          )}
                          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1 mt-1">
                            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${itemProgressPct}%` }} />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex rounded-md py-0.5 px-2.5 text-[9px] font-black uppercase tracking-wide ${
                            rec.status === 'Partially Received'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              showModal(
                                <VerifyInward 
                                  inwardId={rec.id} 
                                  locationFilter={locationFilter}
                                  onSuccess={() => {
                                    hideModal();
                                    fetchPendingInwards();
                                  }} 
                                  onCancel={() => hideModal()}
                                />,
                                "Receive Stock",
                                undefined,
                                "max-w-6xl"
                              );
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold transition shadow-sm cursor-pointer"
                          >
                            Receive Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full table-auto border-collapse text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-meta-4 text-[10px] font-black uppercase tracking-wider border-b border-stroke text-slate-700 dark:text-white">
                  <th className="py-3.5 px-4 whitespace-nowrap">Return # / Invoice #</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Customer</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Items Summary</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Warehouse Destination</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Inward Status</th>
                  <th className="py-3.5 px-4 text-center w-28 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-12"><Spinner /></td></tr>
                ) : filteredReturns.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-500 font-bold italic">No pending customer returns for this location.</td></tr>
                ) : (
                  currentData.map((rec) => {
                    const items = Array.isArray(rec.items) ? rec.items : [];
                    return (
                      <tr key={rec.id} className="border-b border-stroke dark:border-strokedark hover:bg-slate-50 dark:hover:bg-meta-4/10 duration-150 font-semibold text-xs text-black dark:text-white">
                        <td className="py-3 px-4 font-bold font-mono whitespace-nowrap">
                          <span className="text-primary">{rec.return_no || `SR-${rec.id}`}</span>
                          {rec.invoice_no && rec.invoice_no !== rec.return_no && (
                            <div className="text-[10px] text-gray-400 font-normal">Inv #{rec.invoice_no}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{rec.return_date || String(rec.created_at || '').substring(0, 10)}</td>
                        <td className="py-3 px-4 font-sans font-bold whitespace-nowrap">{rec.customer_name}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5 max-w-[260px]">
                            {items.map((it: any, idx: number) => {
                              const itName = it.itemName || it.product_name;
                              return (
                                <div key={idx} className="text-[10px] text-slate-700 dark:text-slate-200">
                                  <span className="font-bold">{itName}</span>
                                  <span className="ml-1 text-primary font-mono font-bold">
                                    ({it.isTileItem && it.boxQty !== undefined ? `${it.boxQty} Box` : `${it.qty} ${it.uom || ''}`})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex rounded-md py-0.5 px-2 text-[10px] font-black uppercase tracking-wide bg-slate-100 dark:bg-meta-4 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-600">
                            {rec.warehouse_name || rec.source_warehouse || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex rounded-md py-0.5 px-2.5 text-[9px] font-black uppercase tracking-wide ${
                            rec.inward_status === 'Partially Received'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {rec.inward_status || 'Pending Inward'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              showModal(
                                <VerifyReturnChallan 
                                  returnId={rec.id} 
                                  locationFilter={locationFilter}
                                  onSuccess={() => {
                                    hideModal();
                                    fetchPendingInwards();
                                  }} 
                                  onCancel={() => hideModal()}
                                />,
                                "Verify Customer Return (QC & Inward)",
                                undefined,
                                "max-w-5xl"
                              );
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
                          >
                            Receive Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing {activeList.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0} to {Math.min(currentPage * entriesPerPage, activeList.length)} of {activeList.length} entries
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold disabled:opacity-40 cursor-pointer text-xs"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 font-bold text-teal-600 text-xs">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold disabled:opacity-40 cursor-pointer text-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InwardChallanList;
