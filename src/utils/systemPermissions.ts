import { supabase } from '../Context/supabaseClient';

export interface SystemMasterConfig {
  allow_backup_global: boolean; // Master system switch for backups
  allow_backup_super_admin: boolean; // Can Super Admin perform backups
  backup_allowed_users: string[]; // Specific employee emails/slugs allowed to backup
  allow_credit_limit_super_admin: boolean; // Can Super Admin edit credit limits
  credit_limit_allowed_users: string[]; // Specific employee emails/slugs allowed to edit credit limits
}

export const DEFAULT_SYSTEM_CONFIG: SystemMasterConfig = {
  allow_backup_global: true,
  allow_backup_super_admin: true,
  backup_allowed_users: [],
  allow_credit_limit_super_admin: true,
  credit_limit_allowed_users: [],
};

const LOCAL_STORAGE_KEY = 'erp_system_master_permissions_cache';
const TENANT_CONFIG_SLUG = '__system_master_config__';

/**
 * Fetch the master system permissions from Supabase (or fallback to localStorage cache)
 */
export const fetchSystemMasterConfig = async (): Promise<SystemMasterConfig> => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('seller_address')
      .eq('slug', TENANT_CONFIG_SLUG)
      .maybeSingle();

    if (!error && data && data.seller_address) {
      try {
        const parsed = JSON.parse(data.seller_address);
        const merged: SystemMasterConfig = {
          ...DEFAULT_SYSTEM_CONFIG,
          ...parsed,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      } catch (parseErr) {
        console.warn('Failed to parse system master permissions from cloud:', parseErr);
      }
    }
  } catch (err) {
    console.warn('Error fetching system permissions from Supabase:', err);
  }

  // Fallback to local storage cache
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return { ...DEFAULT_SYSTEM_CONFIG, ...JSON.parse(cached) };
    }
  } catch (_) {}

  return { ...DEFAULT_SYSTEM_CONFIG };
};

/**
 * Save master system permissions to both Supabase cloud and local storage
 */
export const saveSystemMasterConfig = async (
  config: SystemMasterConfig
): Promise<{ success: boolean; error?: string }> => {
  try {
    const payload = {
      name: 'System Master Permissions',
      slug: TENANT_CONFIG_SLUG,
      email: 'master@dev.erp',
      business_activity: 'CONFIG',
      seller_address: JSON.stringify(config),
    };

    const { error } = await supabase
      .from('tenants')
      .upsert([payload], { onConflict: 'slug' });

    if (error) throw error;

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('erp_system_permissions_updated', { detail: config }));
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save system permissions:', err);
    // Still save locally so dev settings work immediately
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('erp_system_permissions_updated', { detail: config }));
    return { success: false, error: err.message || 'Failed to sync to database' };
  }
};

/**
 * Check if a specific user has permission to backup/export ERP data
 */
export const canUserBackup = (
  userEmail: string | null | undefined,
  role: string | null | undefined,
  config?: SystemMasterConfig | null
): boolean => {
  const activeConfig = config || DEFAULT_SYSTEM_CONFIG;

  // 1. If global backup switch is turned off, nobody (including Super Admin) can backup
  if (!activeConfig.allow_backup_global) {
    return false;
  }

  const cleanRole = (role || '').trim().toLowerCase();
  const isSuperAdmin =
    cleanRole === 'super admin' ||
    cleanRole === 'superadmin' ||
    cleanRole === 'developer' ||
    cleanRole === 'admin';

  // 2. If user is Super Admin, check the allow_backup_super_admin toggle explicitly
  if (isSuperAdmin) {
    return Boolean(activeConfig.allow_backup_super_admin);
  }

  // 3. For any other user, check if their email or slug is in the whitelist
  if (!userEmail) return false;
  const cleanEmail = userEmail.trim().toLowerCase();
  return (activeConfig.backup_allowed_users || []).some(
    e => e.trim().toLowerCase() === cleanEmail
  );
};

/**
 * Check if a specific user has permission to edit/add customer credit limits
 */
export const canUserEditCreditLimit = (
  userEmail: string | null | undefined,
  role: string | null | undefined,
  config?: SystemMasterConfig | null
): boolean => {
  const activeConfig = config || DEFAULT_SYSTEM_CONFIG;

  const cleanRole = (role || '').trim().toLowerCase();
  const isSuperAdmin =
    cleanRole === 'super admin' ||
    cleanRole === 'superadmin' ||
    cleanRole === 'developer' ||
    cleanRole === 'admin';

  // 1. If user is Super Admin, check the allow_credit_limit_super_admin toggle explicitly
  if (isSuperAdmin) {
    return Boolean(activeConfig.allow_credit_limit_super_admin);
  }

  // 2. For any other user, check if their email or slug is in the whitelist
  if (!userEmail) return false;
  const cleanEmail = userEmail.trim().toLowerCase();
  return (activeConfig.credit_limit_allowed_users || []).some(
    e => e.trim().toLowerCase() === cleanEmail
  );
};
