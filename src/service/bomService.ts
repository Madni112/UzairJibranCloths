import { supabase } from '../Context/supabaseClient';

export interface BomItem {
  id?: string;
  bom_id?: string;
  item_id?: string;
  item_name: string;
  item_code?: string;
  quantity: number;
  uom: string;
  unit_cost: number;
  wastage_percentage: number;
  total_cost: number;
  notes?: string;
}

export interface BomHeader {
  id: string;
  tenant_id?: string;
  bom_number: string;
  finished_product_id?: string;
  finished_product_name: string;
  finished_product_code?: string;
  category: string;
  batch_quantity: number;
  uom: string;
  raw_material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  packaging_cost: number;
  total_cost: number;
  unit_cost: number;
  target_selling_price: number;
  margin_percentage: number;
  status: 'Active' | 'Draft' | 'Archived';
  notes?: string;
  items: BomItem[];
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY = 'uj_manufacturing_boms_v1';

// Initial preloaded global sample templates for instant out-of-the-box demonstration
const DEFAULT_SAMPLE_BOMS: BomHeader[] = [
  {
    id: 'bom-sample-001',
    tenant_id: 'uzair',
    bom_number: 'BOM-2026-0001',
    finished_product_name: 'Premium Embroidered Shalwar Kameez (Finished)',
    finished_product_code: 'ESK-PREM-01',
    category: 'Fabrics & Garments',
    batch_quantity: 50,
    uom: 'Suits',
    raw_material_cost: 65000,
    labor_cost: 15000,
    overhead_cost: 4000,
    packaging_cost: 3500,
    total_cost: 87500,
    unit_cost: 1750,
    target_selling_price: 3200,
    margin_percentage: 45.31,
    status: 'Active',
    notes: 'Standard 50-suit production run using high-grade Egyptian cotton lawn and metallic embroidery thread.',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    items: [
      {
        id: 'item-1-1',
        item_name: 'Superfine Cotton Grey Cloth',
        item_code: 'RAW-COT-01',
        quantity: 225,
        uom: 'Meters',
        unit_cost: 220,
        wastage_percentage: 4,
        total_cost: 51480,
        notes: '4.5 meters per suit plus cutting allowance'
      },
      {
        id: 'item-1-2',
        item_name: 'Gold Zari Embroidery Yarn',
        item_code: 'RAW-ZAR-09',
        quantity: 15,
        uom: 'Spools',
        unit_cost: 450,
        wastage_percentage: 2,
        total_cost: 6885,
        notes: 'Neckline & daman motif embroidery'
      },
      {
        id: 'item-1-3',
        item_name: 'Mother of Pearl Fancy Buttons',
        item_code: 'ACC-BTN-03',
        quantity: 350,
        uom: 'Pcs',
        unit_cost: 12,
        wastage_percentage: 0,
        total_cost: 4200,
        notes: '7 buttons per suit'
      },
      {
        id: 'item-1-4',
        item_name: 'Collar & Cuff Interlining (Bukram)',
        item_code: 'ACC-BUK-01',
        quantity: 25,
        uom: 'Meters',
        unit_cost: 95,
        wastage_percentage: 2,
        total_cost: 2435,
        notes: 'Hard stiff collar fuse'
      }
    ]
  },
  {
    id: 'bom-sample-002',
    tenant_id: 'uzair',
    bom_number: 'BOM-2026-0002',
    finished_product_name: 'Glazed Porcelain Floor Tile 60x120 High Gloss',
    finished_product_code: 'TILE-GLZ-60120',
    category: 'Ceramics & Tiles',
    batch_quantity: 200,
    uom: 'Boxes',
    raw_material_cost: 320000,
    labor_cost: 45000,
    overhead_cost: 38000,
    packaging_cost: 18000,
    total_cost: 421000,
    unit_cost: 2105,
    target_selling_price: 3350,
    margin_percentage: 37.16,
    status: 'Active',
    notes: '2 tiles per box = 1.44 sq. meters per box. Continuous roller kiln firing run.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    items: [
      {
        id: 'item-2-1',
        item_name: 'Raw Ceramic Clay Powder Mix (Grade A)',
        item_code: 'RAW-CLY-01',
        quantity: 4500,
        uom: 'Kg',
        unit_cost: 48,
        wastage_percentage: 5,
        total_cost: 226800,
        notes: 'Hydraulic press feed'
      },
      {
        id: 'item-2-2',
        item_name: 'Liquid Italian Glaze & Frits',
        item_code: 'RAW-GLZ-04',
        quantity: 320,
        uom: 'Liters',
        unit_cost: 240,
        wastage_percentage: 3,
        total_cost: 79104,
        notes: 'Airless bell glazing machine application'
      },
      {
        id: 'item-2-3',
        item_name: 'Digital Inkjet Nano Pigment (Onyx Black & Gold)',
        item_code: 'RAW-INK-02',
        quantity: 8,
        uom: 'Liters',
        unit_cost: 1750,
        wastage_percentage: 1,
        total_cost: 14140,
        notes: 'HD marble veining print'
      }
    ]
  }
];

const getLocalBoms = (): BomHeader[] => {
  if (typeof window === 'undefined') return DEFAULT_SAMPLE_BOMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SAMPLE_BOMS));
      return DEFAULT_SAMPLE_BOMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SAMPLE_BOMS;
  } catch (err) {
    console.warn('Error reading local BOMs:', err);
    return DEFAULT_SAMPLE_BOMS;
  }
};

const setLocalBoms = (boms: BomHeader[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boms));
  } catch (err) {
    console.warn('Error saving local BOMs:', err);
  }
};

export const bomService = {
  // Fetch all BOM recipes (with Supabase fallback to local storage)
  async getAll(): Promise<BomHeader[]> {
    try {
      const { data: headers, error: hError } = await supabase
        .from('bom_headers')
        .select('*')
        .order('created_at', { ascending: false });

      if (hError || !headers) {
        return getLocalBoms();
      }

      const { data: items, error: iError } = await supabase
        .from('bom_items')
        .select('*');

      const itemsByBom: Record<string, BomItem[]> = {};
      (items || []).forEach((it: any) => {
        const bid = String(it.bom_id);
        if (!itemsByBom[bid]) itemsByBom[bid] = [];
        itemsByBom[bid].push({
          id: it.id,
          bom_id: it.bom_id,
          item_id: it.item_id,
          item_name: it.item_name,
          item_code: it.item_code,
          quantity: Number(it.quantity) || 0,
          uom: it.uom || 'PCS',
          unit_cost: Number(it.unit_cost) || 0,
          wastage_percentage: Number(it.wastage_percentage) || 0,
          total_cost: Number(it.total_cost) || 0,
          notes: it.notes || ''
        });
      });

      const combined: BomHeader[] = headers.map((h: any) => ({
        id: String(h.id),
        tenant_id: h.tenant_id,
        bom_number: h.bom_number,
        finished_product_id: h.finished_product_id,
        finished_product_name: h.finished_product_name,
        finished_product_code: h.finished_product_code,
        category: h.category || 'General',
        batch_quantity: Number(h.batch_quantity) || 1,
        uom: h.uom || 'PCS',
        raw_material_cost: Number(h.raw_material_cost) || 0,
        labor_cost: Number(h.labor_cost) || 0,
        overhead_cost: Number(h.overhead_cost) || 0,
        packaging_cost: Number(h.packaging_cost) || 0,
        total_cost: Number(h.total_cost) || 0,
        unit_cost: Number(h.unit_cost) || 0,
        target_selling_price: Number(h.target_selling_price) || 0,
        margin_percentage: Number(h.margin_percentage) || 0,
        status: h.status || 'Active',
        notes: h.notes || '',
        created_at: h.created_at,
        updated_at: h.updated_at,
        items: itemsByBom[String(h.id)] || []
      }));

      // Cache locally for fast offline access
      setLocalBoms(combined);
      return combined;
    } catch {
      return getLocalBoms();
    }
  },

  // Fetch single BOM recipe by ID
  async getById(id: string): Promise<BomHeader | null> {
    const all = await this.getAll();
    return all.find(b => String(b.id) === String(id) || b.bom_number === id) || null;
  },

  // Save or update BOM
  async save(bom: Partial<BomHeader> & { items: BomItem[] }): Promise<BomHeader> {
    const isEdit = Boolean(bom.id);
    const id = bom.id || `bom-${Date.now()}`;
    const now = new Date().toISOString();

    const fullBom: BomHeader = {
      id,
      tenant_id: bom.tenant_id || 'uzair',
      bom_number: bom.bom_number || `BOM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      finished_product_id: bom.finished_product_id || '',
      finished_product_name: bom.finished_product_name || 'Custom Assembly Product',
      finished_product_code: bom.finished_product_code || '',
      category: bom.category || 'General',
      batch_quantity: Number(bom.batch_quantity) || 1,
      uom: bom.uom || 'PCS',
      raw_material_cost: Number(bom.raw_material_cost) || 0,
      labor_cost: Number(bom.labor_cost) || 0,
      overhead_cost: Number(bom.overhead_cost) || 0,
      packaging_cost: Number(bom.packaging_cost) || 0,
      total_cost: Number(bom.total_cost) || 0,
      unit_cost: Number(bom.unit_cost) || 0,
      target_selling_price: Number(bom.target_selling_price) || 0,
      margin_percentage: Number(bom.margin_percentage) || 0,
      status: bom.status || 'Active',
      notes: bom.notes || '',
      created_at: bom.created_at || now,
      updated_at: now,
      items: (bom.items || []).map((it, idx) => ({
        ...it,
        id: it.id || `item-${Date.now()}-${idx}`,
        bom_id: id
      }))
    };

    // 1. Try Supabase save
    try {
      const headerRow = {
        bom_number: fullBom.bom_number,
        finished_product_id: fullBom.finished_product_id,
        finished_product_name: fullBom.finished_product_name,
        finished_product_code: fullBom.finished_product_code,
        category: fullBom.category,
        batch_quantity: fullBom.batch_quantity,
        uom: fullBom.uom,
        raw_material_cost: fullBom.raw_material_cost,
        labor_cost: fullBom.labor_cost,
        overhead_cost: fullBom.overhead_cost,
        packaging_cost: fullBom.packaging_cost,
        total_cost: fullBom.total_cost,
        unit_cost: fullBom.unit_cost,
        target_selling_price: fullBom.target_selling_price,
        margin_percentage: fullBom.margin_percentage,
        status: fullBom.status,
        notes: fullBom.notes,
        updated_at: now
      };

      if (isEdit) {
        await supabase.from('bom_headers').update(headerRow).eq('id', id);
        await supabase.from('bom_items').delete().eq('bom_id', id);
      } else {
        await supabase.from('bom_headers').insert([{ ...headerRow, id, created_at: now }]);
      }

      if (fullBom.items.length > 0) {
        const itemRows = fullBom.items.map(it => ({
          bom_id: id,
          item_id: it.item_id,
          item_name: it.item_name,
          item_code: it.item_code,
          quantity: it.quantity,
          uom: it.uom,
          unit_cost: it.unit_cost,
          wastage_percentage: it.wastage_percentage,
          total_cost: it.total_cost,
          notes: it.notes
        }));
        await supabase.from('bom_items').insert(itemRows);
      }
    } catch {
      // Supabase tables might not exist yet; gracefully fallback
    }

    // 2. Always persist locally
    const existing = getLocalBoms();
    let updated: BomHeader[];
    if (isEdit) {
      updated = existing.map(b => (b.id === id ? fullBom : b));
    } else {
      updated = [fullBom, ...existing];
    }
    setLocalBoms(updated);

    return fullBom;
  },

  // Delete BOM
  async delete(id: string): Promise<boolean> {
    try {
      await supabase.from('bom_headers').delete().eq('id', id);
    } catch {
      // fallback
    }
    const existing = getLocalBoms();
    const filtered = existing.filter(b => b.id !== id);
    setLocalBoms(filtered);
    return true;
  },

  // Generate next sequential BOM number
  async getNextBomNumber(): Promise<string> {
    const all = await this.getAll();
    const year = new Date().getFullYear();
    const prefix = `BOM-${year}-`;
    const nums = all
      .filter(b => b.bom_number.startsWith(prefix))
      .map(b => parseInt(b.bom_number.replace(prefix, ''), 10))
      .filter(n => !isNaN(n));

    const max = nums.length > 0 ? Math.max(...nums) : 0;
    const next = max + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }
};
