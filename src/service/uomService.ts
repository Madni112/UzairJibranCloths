import { supabase } from '../Context/supabaseClient';

export interface UomItem {
  id: number | string;
  tenant_id?: string;
  short_code: string;
  full_name: string;
  category: string;
  is_active: boolean;
}

const STORAGE_ACTIVE_OVERRIDES_KEY = 'uj_uom_active_status_overrides';
const STORAGE_CUSTOM_UOMS_KEY = 'uj_custom_uoms_list';

export const DEFAULT_UOM_TEMPLATES = [
  { short_code: 'BOX', full_name: 'Box / Carton', category: 'Packaging & Containers', is_active: true },
  { short_code: 'PCS', full_name: 'Pieces', category: 'Count & Units', is_active: true },
  { short_code: 'NOS', full_name: 'Numbers', category: 'Count & Units', is_active: true },
  { short_code: 'EACH', full_name: 'Each', category: 'Count & Units', is_active: true },
  { short_code: 'SET', full_name: 'Sets', category: 'Count & Units', is_active: true },
  { short_code: 'PAIR', full_name: 'Pairs', category: 'Count & Units', is_active: true },
  { short_code: 'DOZ', full_name: 'Dozen (12 Pcs)', category: 'Count & Units', is_active: true },
  { short_code: 'CTN', full_name: 'Carton', category: 'Packaging & Containers', is_active: true },
  { short_code: 'PKT', full_name: 'Packet / Pack', category: 'Packaging & Containers', is_active: true },
  { short_code: 'BAG', full_name: 'Bag / Sack', category: 'Packaging & Containers', is_active: true },
  { short_code: 'BNDL', full_name: 'Bundle', category: 'Packaging & Containers', is_active: true },
  { short_code: 'ROLL', full_name: 'Roll', category: 'Packaging & Containers', is_active: true },
  { short_code: 'SQFT', full_name: 'Square Feet (Sq. Ft)', category: 'Area & Surface', is_active: true },
  { short_code: 'SQM', full_name: 'Square Meter (Sq. Mtr)', category: 'Area & Surface', is_active: true },
  { short_code: 'SQYD', full_name: 'Square Yard (Guz)', category: 'Area & Surface', is_active: false },
  { short_code: 'MTR', full_name: 'Meter (Linear Mtr)', category: 'Length & Distance', is_active: true },
  { short_code: 'FT', full_name: 'Foot / Feet', category: 'Length & Distance', is_active: true },
  { short_code: 'INCH', full_name: 'Inches', category: 'Length & Distance', is_active: true },
  { short_code: 'MM', full_name: 'Millimeter', category: 'Length & Distance', is_active: false },
  { short_code: 'YD', full_name: 'Yard (Guz)', category: 'Length & Distance', is_active: false },
  { short_code: 'KG', full_name: 'Kilogram (Kg)', category: 'Weight & Mass', is_active: true },
  { short_code: 'GM', full_name: 'Gram (g)', category: 'Weight & Mass', is_active: false },
  { short_code: 'TON', full_name: 'Metric Ton', category: 'Weight & Mass', is_active: true },
  { short_code: 'LBS', full_name: 'Pound (lb)', category: 'Weight & Mass', is_active: false },
  { short_code: 'LTR', full_name: 'Liter (Ltr)', category: 'Volume & Liquid', is_active: true },
  { short_code: 'ML', full_name: 'Milliliter (ml)', category: 'Volume & Liquid', is_active: false },
  { short_code: 'GAL', full_name: 'Gallon', category: 'Volume & Liquid', is_active: false }
];

export const getLocalActiveOverrides = (): Record<string, boolean> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_ACTIVE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setLocalActiveOverride = (code: string, isActive: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalActiveOverrides();
    current[code.toUpperCase()] = isActive;
    localStorage.setItem(STORAGE_ACTIVE_OVERRIDES_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Error saving local active override:', err);
  }
};

export const getCustomLocalUoms = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_UOMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCustomLocalUom = (uom: any) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getCustomLocalUoms();
    const idx = current.findIndex(u => String(u.id) === String(uom.id) || u.short_code.toUpperCase() === uom.short_code.toUpperCase());
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...uom };
    } else {
      current.push(uom);
    }
    localStorage.setItem(STORAGE_CUSTOM_UOMS_KEY, JSON.stringify(current));
  } catch (err) {
    console.warn('Error saving custom local uom:', err);
  }
};

export const deleteCustomLocalUom = (idOrCode: string | number) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getCustomLocalUoms();
    const filtered = current.filter(u => String(u.id) !== String(idOrCode) && u.short_code.toUpperCase() !== String(idOrCode).toUpperCase());
    localStorage.setItem(STORAGE_CUSTOM_UOMS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Error deleting custom local uom:', err);
  }
};

// Unified fetcher for UOMs that safely falls back when is_active column doesn't exist in Postgres
export const fetchAllUomsSafe = async (tenantId?: string): Promise<UomItem[]> => {
  const activeOverrides = getLocalActiveOverrides();
  const customLocal = getCustomLocalUoms();
  const activeTenant = tenantId || 'bashir';

  try {
    // 1. Fetch available rows from Supabase (safe select of core standard columns)
    const { data: dbRows, error } = await supabase
      .from('inventory_uom')
      .select('id, short_code, full_name, category')
      .order('id', { ascending: true });

    let baseList: any[] = [];

    if (!error && dbRows && dbRows.length > 0) {
      baseList = [...dbRows];
    } else {
      // Seed with default templates if database is empty or errored
      baseList = DEFAULT_UOM_TEMPLATES.map((t, idx) => ({
        id: `tpl-${idx + 1}`,
        tenant_id: activeTenant,
        short_code: t.short_code,
        full_name: t.full_name,
        category: t.category,
        is_active: t.is_active
      }));
    }

    // Merge default templates if some are missing from db
    DEFAULT_UOM_TEMPLATES.forEach(tpl => {
      const exists = baseList.some(b => String(b.short_code).trim().toUpperCase() === tpl.short_code.toUpperCase());
      if (!exists) {
        baseList.push({
          id: `tpl-${tpl.short_code}`,
          tenant_id: activeTenant,
          short_code: tpl.short_code,
          full_name: tpl.full_name,
          category: tpl.category,
          is_active: tpl.is_active
        });
      }
    });

    // Merge local custom UOMs
    customLocal.forEach(cu => {
      const exists = baseList.some(b => String(b.short_code).trim().toUpperCase() === cu.short_code.toUpperCase());
      if (!exists) {
        baseList.push(cu);
      }
    });

    // Apply active status (DB / Template default + LocalStorage Switchboard override)
    const finalUoms: UomItem[] = baseList.map(u => {
      const code = String(u.short_code || '').trim().toUpperCase();
      let isActive = u.is_active !== undefined ? Boolean(u.is_active) : true;

      // Match default template status if available
      const tpl = DEFAULT_UOM_TEMPLATES.find(t => t.short_code.toUpperCase() === code);
      if (tpl && u.is_active === undefined) {
        isActive = tpl.is_active;
      }

      // Check if user toggled in Switchboard
      if (activeOverrides[code] !== undefined) {
        isActive = activeOverrides[code];
      }

      return {
        id: u.id,
        tenant_id: u.tenant_id || activeTenant,
        short_code: code,
        full_name: u.full_name || code,
        category: u.category || 'Count & Units',
        is_active: isActive
      };
    });

    return finalUoms;
  } catch (err) {
    console.warn('fetchAllUomsSafe fallback:', err);
    return DEFAULT_UOM_TEMPLATES.map((t, i) => {
      const code = t.short_code.toUpperCase();
      const isActive = activeOverrides[code] !== undefined ? activeOverrides[code] : t.is_active;
      return {
        id: i + 1,
        short_code: code,
        full_name: t.full_name,
        category: t.category,
        is_active: isActive
      };
    });
  }
};

