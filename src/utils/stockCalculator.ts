/**
 * stockCalculator.ts
 *
 * Single source of truth for "Available Stock (To Sell)" calculations.
 * Uses the exact same formula as ProductList breakdown modal:
 *
 *   available = (opening + purchased + salesReturned + transferredIn)
 *             - sold - purchaseReturned - rejected - transferredOut
 */

import { supabase } from '../Context/supabaseClient';

export interface WarehouseBreakdown {
  opening: number;
  purchased: number;
  sold: number;
  salesReturned: number;
  purchaseReturned: number;
  rejected: number;
  transferredIn: number;
  transferredOut: number;
  hold: number;
  purchaseHold: number;
  available: number;
  onHand: number;
}

export interface StockResult {
  totalAvailable: number;
  byWarehouse: Record<string, WarehouseBreakdown>;
}

// One-time snapshot of every ledger table the stock formula needs.
// Pages should load this ONCE (page mount) and reuse it for every row/product
// instead of re-fetching all 8 tables per product/warehouse check.
export type StockDataset = {
  openStocks: any[];
  purchases: any[];
  grnReceipts: any[];
  sales: any[];
  sReturns: any[];
  pReturns: any[];
  stockTransfers: any[];
  deliveryChallans: any[];
};

export async function fetchStockDataset(): Promise<any> {
  // Fast path: when the server-side stock_balances table is available & filled,
  // use it (one small table instead of the 8 ledgers). Otherwise fall back to
  // fetching all ledgers exactly as before.
  try {
    const probe = await supabase.from('stock_balances').select('product_name, warehouse_name, quantity').limit(1);
    if (!probe.error && probe.data && probe.data.length > 0) {
      const { data: rows } = await supabase.from('stock_balances').select('product_name, warehouse_name, quantity');
      if (rows && rows.length > 0) {
        return { balancesMode: true, balances: rows };
      }
    }
  } catch {
    /* table missing — fall through to ledgers */
  }
  return fetchAllStockData() as unknown as StockDataset;
}

function balancesMatch(name: string, wh: string) {
  const n = String(name || '').trim().toLowerCase();
  const w = String(wh || '').trim().toLowerCase();
  return (r: any) =>
    String(r.product_name || '').trim().toLowerCase() === n &&
    String(r.warehouse_name || '').trim().toLowerCase() === w;
}

function zeroBreakdown(available: number): WarehouseBreakdown {
  return {
    opening: 0, purchased: 0, sold: 0, salesReturned: 0, purchaseReturned: 0,
    rejected: 0, transferredIn: 0, transferredOut: 0, hold: 0, purchaseHold: 0,
    available, onHand: available,
  };
}

function isBalancesDataset(d: any): d is { balancesMode: true; balances: any[] } {
  return !!(d && d.balancesMode && Array.isArray(d.balances));
}

async function fetchAllStockData() {
  const [
    { data: openStocks },
    { data: purchases },
    { data: rData },
    { data: iData },
    { data: sales },
    { data: sReturns },
    { data: pReturns },
    { data: stockTransfers },
    { data: deliveryChallans },
  ] = await Promise.all([
    supabase.from('opening_stocks').select('product_name, itemname, quantity, qty, location, item_code, skucode'),
    supabase.from('supplier_purchases').select('id, purchase_no, items, payment_term, metadata, target_warehouse'),
    supabase.from('grn_receipts').select('*'),
    supabase.from('grn_items').select('*'),
    supabase.from('sales_invoices').select('items, sale_status, dispatch_warehouse'),
    supabase.from('sales_returns').select('items, status, inward_status, received_items, warehouse_name'),
    supabase.from('purchase_returns').select('items, status'),
    supabase.from('stock_transfers').select('items, from_location, to_location, status'),
    supabase.from('delivery_challans').select('items, status, dispatch_warehouse'),
  ]);

  const itemsByGrn: Record<string, any[]> = {};
  (iData || []).forEach((it: any) => {
    const gId = String(it.grn_id || '');
    if (!itemsByGrn[gId]) itemsByGrn[gId] = [];
    itemsByGrn[gId].push(it);
  });
  const grnReceipts = (rData || []).map((g: any) => ({
    ...g,
    grn_items: itemsByGrn[String(g.id)] || []
  }));

  return { openStocks, purchases, grnReceipts, sales, sReturns, pReturns, stockTransfers, deliveryChallans };
}

function buildBreakdown(
  name: string,
  { openStocks, purchases, grnReceipts, sales, sReturns, pReturns, stockTransfers, deliveryChallans }: any,
  code?: string
): { totalAvailable: number; byWarehouse: Record<string, WarehouseBreakdown> } {
  const whBreakdowns: Record<string, any> = {};
  const getWh = (whName: string) => {
    const key = String(whName || 'Global / Unassigned').trim();
    if (!whBreakdowns[key]) {
      whBreakdowns[key] = { opening: 0, purchased: 0, sold: 0, salesReturned: 0, purchaseReturned: 0, rejected: 0, transferredIn: 0, transferredOut: 0, hold: 0, purchaseHold: 0 };
    }
    return whBreakdowns[key];
  };

  const pCode = String(code || '').trim().toLowerCase();

  const isMatch = (item: any) => {
    const itemCode = String(item.item_code || item.item_sr_no || item.skuCode || item.sku || item.code || '').trim().toLowerCase();
    if (pCode && itemCode) {
      return pCode === itemCode;
    }
    if (pCode) {
      return false;
    }
    const iName = String(item.product_name || item.itemName || item.item_name || item.item_details || item.pDescription || '').trim().toLowerCase();
    return iName === name;
  };

  // 1. Opening stocks
  let totalOpening = 0;
  (openStocks || []).forEach((os: any) => {
    const osCode = String(os.item_code || os.item_sr_no || os.skucode || os.sku || os.code || '').trim().toLowerCase();
    const osName = String(os.product_name || os.itemname || os.itemName || '').trim().toLowerCase();
    let matches = false;
    if (pCode && osCode) {
      matches = (pCode === osCode);
    } else if (pCode) {
      matches = false;
    } else {
      matches = (osName === name || osName.includes(name) || name.includes(osName));
    }
    if (matches) {
      const qty = Number(os.quantity || os.qty || 0);
      totalOpening += qty;
      getWh(os.location || 'Global / Unassigned').opening += qty;
    }
  });

  // 2. Purchases (skip GRN-linked to prevent double-count)
  let totalPurchased = 0;
  (purchases || []).forEach((p: any) => {
    const termClean = String(p.payment_term || '').trim().toLowerCase();
    const metadata = typeof p.metadata === 'string' ? JSON.parse(p.metadata || '{}') : (p.metadata || {});
    const hasGrn =
      metadata?.grn_id ||
      (Array.isArray(metadata?.grn_ids) && metadata.grn_ids.length > 0) ||
      (grnReceipts || []).some((g: any) =>
        (p.purchase_no && g.grn_no?.includes(p.purchase_no)) ||
        (p.id && g.metadata?.linkedPurchaseId === p.id)
      );
    if (termClean !== 'cancel' && termClean !== 'deleted' && termClean !== 'draft' && !hasGrn) {
      const items = Array.isArray(p.items) ? p.items : JSON.parse(p.items || '[]');
      items.forEach((item: any) => {
        if (isMatch(item)) {
          const qty = Number(item.qty || item.quantity || 0);
          totalPurchased += qty;
          getWh(item.warehouse || item.location || p.target_warehouse || p.receiving_warehouse || p.warehouse || 'Global / Unassigned').purchased += qty;
        }
      });
    }
  });

  // 2.5 GRN receipts
  let totalRejected = 0;
  (grnReceipts || []).forEach((grn: any) => {
    if (['Pending Inward', 'Confirm', 'Partially Received', 'Billed', 'Rejected'].includes(grn.status)) {
      (grn.grn_items || []).forEach((item: any) => {
        if (isMatch(item)) {
          const isUnverified = (item.accepted_qty == null) || (item.accepted_qty === 0 && item.rejected_qty === 0 && Number(item.qty) > 0 && ['Pending Inward', 'Partially Received'].includes(grn.status));
          const accepted = isUnverified ? 0 : Number(item.accepted_qty ?? item.qty ?? 0);
          const rejected = Number(item.rejected_qty ?? 0);
          const holdQty = Number(item.hold_qty ?? 0) + (isUnverified ? Number(item.qty) : 0);
          const fullQty = accepted + rejected;
          totalPurchased += fullQty;
          totalRejected += rejected;
          const wh = item.warehouse_name || grn.target_warehouse || grn.warehouse || 'Global / Unassigned';
          getWh(wh).purchased += fullQty;
          getWh(wh).rejected += rejected;
          getWh(wh).purchaseHold += holdQty;
        }
      });
    }
  });

  // 3. Sales
  let totalSold = 0;
  (sales || []).forEach((s: any) => {
    const status = String(s.sale_status || '').trim().toLowerCase();
    if (status !== 'cancel' && status !== 'deleted') {
      const items = Array.isArray(s.items) ? s.items : JSON.parse(s.items || '[]');
      items.forEach((item: any) => {
        if (isMatch(item)) {
          const qty = Number(item.qty || item.quantity || 0);
          totalSold += qty;
          getWh(item.warehouse || item.location || s.dispatch_warehouse || s.warehouse || 'Global / Unassigned').sold += qty;
        }
      });
    }
  });

  // 4. Sales returns (Only physically verified/received stock increments inventory)
  let totalSalesReturned = 0;
  (sReturns || []).forEach((sr: any) => {
    const statusLower = String(sr.status || '').trim().toLowerCase();
    const inwardLower = String(sr.inward_status || '').trim().toLowerCase();

    // Skip cancelled, deleted, or rejected returns
    if (statusLower === 'cancel' || statusLower === 'deleted' || inwardLower === 'rejected') return;

    // If inward_status is explicitly 'Pending Inward' or 'Pending', physical stock has NOT been verified yet
    const isPendingInward = inwardLower === 'pending inward' || inwardLower === 'pending';

    const items = Array.isArray(sr.items) ? sr.items : JSON.parse(sr.items || '[]');
    const receivedItems = Array.isArray(sr.received_items) ? sr.received_items : JSON.parse(sr.received_items || '[]');

    items.forEach((item: any) => {
      if (isMatch(item)) {
        let acceptedQty = 0;
        let holdQty = 0;

        if (isPendingInward) {
          // Awaiting physical warehouse inspection — held out of available stock
          acceptedQty = 0;
          holdQty = Number(item.qty || item.quantity || 0);
        } else if (inwardLower === 'partially received') {
          // Check specific accepted qty from received_items
          const rec = receivedItems.find((r: any) =>
            (r.skuCode && String(r.skuCode).trim().toLowerCase() === String(item.sku || item.skuCode || '').trim().toLowerCase()) ||
            (r.itemName && String(r.itemName).trim().toLowerCase() === String(item.itemName || item.product_name || '').trim().toLowerCase())
          );
          acceptedQty = rec ? Number(rec.acceptedQty || 0) : 0;
          holdQty = rec ? Number(rec.holdQty || 0) : 0;
        } else {
          // 'Received', 'Completed', or older legacy records without inward_status tracking
          acceptedQty = Number(item.qty || item.quantity || 0);
        }

        if (acceptedQty > 0) {
          totalSalesReturned += acceptedQty;
          const wh = item.warehouse || item.location || sr.receiving_warehouse || sr.warehouse_name || sr.warehouse || 'Global / Unassigned';
          getWh(wh).salesReturned += acceptedQty;
        }
        if (holdQty > 0) {
          const wh = item.warehouse || item.location || sr.receiving_warehouse || sr.warehouse_name || sr.warehouse || 'Global / Unassigned';
          getWh(wh).purchaseHold = (getWh(wh).purchaseHold || 0) + holdQty;
        }
      }
    });
  });

  // 5. Purchase returns
  let totalPurchaseReturned = 0;
  (pReturns || []).forEach((pr: any) => {
    const status = String(pr.status || '').trim().toLowerCase();
    if (status !== 'cancel' && status !== 'deleted') {
      const items = Array.isArray(pr.items) ? pr.items : JSON.parse(pr.items || '[]');
      items.forEach((item: any) => {
        if (isMatch(item)) {
          const qty = Number(item.qty || item.quantity || 0);
          totalPurchaseReturned += qty;
          getWh(item.warehouse || item.location || pr.dispatch_warehouse || pr.warehouse || 'Global / Unassigned').purchaseReturned += qty;
        }
      });
    }
  });

  // 6. Stock transfers
  // Every recorded transfer is a real movement (the app never saves drafts)
  (stockTransfers || []).forEach((st: any) => {
    const items = Array.isArray(st.items) ? st.items : JSON.parse(st.items || '[]');
    items.forEach((item: any) => {
      if (isMatch(item)) {
        const qty = Number(item.qty || item.quantity || item.transfer_qty || 0);
        const srcWh = String(st.from_location || item.from_location || 'Global / Unassigned').trim();
        const destWh = String(st.to_location || item.to_location || 'Global / Unassigned').trim();
        getWh(srcWh).transferredOut += qty;
        getWh(destWh).transferredIn += qty;
      }
    });
  });

  // 7. Hold (delivery challans)
  let totalHold = 0;
  (deliveryChallans || []).forEach((dc: any) => {
    const status = String(dc.status || '').trim().toLowerCase();
    if (status === 'cancel' || status === 'deleted') return;
    const items = Array.isArray(dc.items) ? dc.items : JSON.parse(dc.items || '[]');
    items.forEach((item: any) => {
      if (isMatch(item)) {
        const orderQty = Number(item.orderQty ?? item.qty ?? 0);
        const dispatchedQty = Number(
          item.dispatchedQty ??
          (['approved', 'dispatched', 'fully dispatched'].includes(status) ? orderQty : 0)
        );
        const holdQty =
          status === 'pending approval' || status === 'pending'
            ? orderQty
            : Number(item.holdQty !== undefined ? item.holdQty : Math.max(0, orderQty - dispatchedQty));
        totalHold += holdQty;
        getWh(item.warehouse || item.location || dc.dispatch_warehouse || dc.warehouse || 'Global / Unassigned').hold += holdQty;
      }
    });
  });

  const totalAvailable =
    (totalOpening + totalPurchased + totalSalesReturned) - totalSold - totalPurchaseReturned - totalRejected;

  const byWarehouse: Record<string, WarehouseBreakdown> = {};
  Object.keys(whBreakdowns).forEach((key) => {
    const w = whBreakdowns[key];
    const tIn = w.transferredIn || 0;
    const tOut = w.transferredOut || 0;
    const avail = (w.opening + w.purchased + w.salesReturned + tIn) - w.sold - w.purchaseReturned - (w.rejected || 0) - tOut;
    byWarehouse[key] = {
      opening: w.opening,
      purchased: w.purchased,
      sold: w.sold,
      salesReturned: w.salesReturned,
      purchaseReturned: w.purchaseReturned,
      rejected: w.rejected || 0,
      transferredIn: tIn,
      transferredOut: tOut,
      hold: w.hold || 0,
      purchaseHold: w.purchaseHold || 0,
      available: avail,
      onHand: avail + (w.hold || 0),
    };
  });

  return { totalAvailable, byWarehouse };
}

/**
 * Detailed breakdown for one product (Opening / Purchases / Sold / Returns /
 * Rejected / Transfers per warehouse). Reads the ledgers on demand — use this
 * only when the user explicitly asks for details (e.g. the breakdown modal).
 */
export async function getDetailedBreakdown(productName: string, productCode?: string) {
  const data = (await fetchAllStockData()) as any;
  const res = buildBreakdown(productName.trim().toLowerCase(), data, productCode);

  const agg = {
    opening: 0, purchased: 0, sold: 0, salesReturned: 0, purchaseReturned: 0,
    hold: 0, purchaseHold: 0, rejected: 0, transferredIn: 0, transferredOut: 0,
  };
  Object.values(res.byWarehouse).forEach((w: any) => {
    agg.opening += w.opening || 0;
    agg.purchased += w.purchased || 0;
    agg.sold += w.sold || 0;
    agg.salesReturned += w.salesReturned || 0;
    agg.purchaseReturned += w.purchaseReturned || 0;
    agg.hold += w.hold || 0;
    agg.purchaseHold += w.purchaseHold || 0;
    agg.rejected += w.rejected || 0;
    agg.transferredIn += w.transferredIn || 0;
    agg.transferredOut += w.transferredOut || 0;
  });

  return {
    breakdown: {
      ...agg,
      available: res.totalAvailable,
      onHand: res.totalAvailable + agg.hold,
    },
    warehouseBreakdowns: res.byWarehouse,
  };
}

/**
 * Get available stock for a product across all warehouses.
 */
export async function getStockResult(productName: string, dataset?: StockDataset | any, itemCode?: string): Promise<StockResult> {
  const data = dataset || await fetchStockDataset();

  if (isBalancesDataset(data)) {
    const n = String(productName || '').trim().toLowerCase();
    const byWarehouse: Record<string, WarehouseBreakdown> = {};
    let totalAvailable = 0;
    (data.balances || []).forEach((r: any) => {
      if (String(r.product_name || '').trim().toLowerCase() !== n) return;
      const qty = Number(r.quantity) || 0;
      totalAvailable += qty;
      const key = String(r.warehouse_name || 'Global / Unassigned').trim();
      byWarehouse[key] = zeroBreakdown(qty);
    });
    return { totalAvailable, byWarehouse };
  }

  const result = buildBreakdown(productName.trim().toLowerCase(), data, itemCode);

  // Background sync: overwrite warehouse_inventory for all warehouses for this product
  Object.entries(result.byWarehouse).forEach(([wh, breakdown]) => {
    if (wh !== 'Global / Unassigned') {
      syncWarehouseInventoryRecord(productName.trim(), wh, breakdown.available);
    }
  });

  return result;
}

/**
 * Synchronous available stock check using an already-fetched dataset.
 */
export function getWarehouseAvailableStock(productName: string, warehouseName: string, dataset?: StockDataset | any, itemCode?: string): number {
  if (!productName || !warehouseName || !dataset) return 0;

  if (isBalancesDataset(dataset)) {
    const row = (dataset.balances || []).find(balancesMatch(productName, warehouseName));
    return row ? (Number(row.quantity) || 0) : 0;
  }

  try {
    const result = buildBreakdown(productName.trim().toLowerCase(), dataset, itemCode);
    const matchKey = Object.keys(result.byWarehouse).find(
      (k) => k.toLowerCase() === warehouseName.trim().toLowerCase()
    );
    return matchKey ? result.byWarehouse[matchKey].available : 0;
  } catch {
    return 0;
  }
}

/**
 * Get available stock (to sell) for a product in a specific warehouse.
 * This matches exactly what ProductList breakdown shows as "Available Stock (To Sell)".
 */
export async function getAvailableStock(productName: string, warehouseName: string, dataset?: StockDataset | any, itemCode?: string): Promise<number> {
  const data = dataset || await fetchStockDataset();

  if (isBalancesDataset(data)) {
    const row = (data.balances || []).find(balancesMatch(productName, warehouseName));
    return row ? (Number(row.quantity) || 0) : 0;
  }

  const result = buildBreakdown(productName.trim().toLowerCase(), data, itemCode);
  const matchKey = Object.keys(result.byWarehouse).find(
    (k) => k.toLowerCase() === warehouseName.trim().toLowerCase()
  );
  
  console.log(`[stockCalc] getAvailableStock for "${productName}" in "${warehouseName}":`);
  console.log(`[stockCalc] byWarehouse keys:`, Object.keys(result.byWarehouse));
  console.log(`[stockCalc] matchKey:`, matchKey);

  const finalQty = matchKey ? result.byWarehouse[matchKey].available : 0;
  console.log(`[stockCalc] finalQty:`, finalQty);

  // Background sync: overwrite warehouse_inventory record for this specific check
  if (warehouseName && warehouseName !== 'Global / Unassigned') {
    syncWarehouseInventoryRecord(productName.trim(), warehouseName, finalQty);
  }

  return finalQty;
}

/**
 * Helper to overwrite the warehouse_inventory record with the true formula result in the background
 */
async function syncWarehouseInventoryRecord(productName: string, warehouseName: string, quantity: number) {
  try {
    const { data } = await supabase
      .from('warehouse_inventory')
      .select('id')
      .ilike('product_name', productName)
      .ilike('warehouse_name', warehouseName)
      .maybeSingle();

    if (data) {
      await supabase.from('warehouse_inventory').update({ quantity }).eq('id', data.id);
    } else {
      await supabase.from('warehouse_inventory').insert([{
        product_name: productName,
        warehouse_name: warehouseName,
        quantity
      }]);
    }
  } catch (err) {
    console.error("Background sync failed for warehouse_inventory:", err);
  }
}

/**
 * Get total available stock for a product across all warehouses.
 */
export async function getTotalAvailableStock(productName: string, dataset?: StockDataset | any, itemCode?: string): Promise<number> {
  const data = dataset || await fetchStockDataset();

  if (isBalancesDataset(data)) {
    const n = String(productName || '').trim().toLowerCase();
    return (data.balances || []).reduce(
      (sum: number, r: any) =>
        String(r.product_name || '').trim().toLowerCase() === n ? sum + (Number(r.quantity) || 0) : sum,
      0
    );
  }

  return buildBreakdown(productName.trim().toLowerCase(), data, itemCode).totalAvailable;
}
