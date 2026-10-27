import { supabase } from '../Context/supabaseClient';

export interface CustomerCreditStatus {
  status: 'NO_LIMIT' | 'SAFE' | 'NEAR_LIMIT' | 'EXCEEDED';
  label: string;
  badgeClass: string;
  percentage: number;
}

const LOCAL_STORAGE_KEY = 'erp_customer_credit_limits_cache';
const TENANT_CREDIT_SLUG = '__credit_limits_config__';

/**
 * Fetch all customer credit limits from cloud / cache
 * Returns a dictionary mapping customerId -> creditLimit (number)
 */
export const fetchCustomerCreditLimits = async (): Promise<Record<string, number>> => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('seller_address')
      .eq('slug', TENANT_CREDIT_SLUG)
      .maybeSingle();

    if (!error && data && data.seller_address) {
      try {
        const parsed = JSON.parse(data.seller_address);
        if (parsed && typeof parsed === 'object') {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse customer credit limits:', e);
      }
    }
  } catch (err) {
    console.warn('Error fetching credit limits from Supabase:', err);
  }

  // Fallback to local storage cache
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_) {}

  return {};
};

/**
 * Save credit limit for a customer
 */
export const saveCustomerCreditLimit = async (
  customerId: string | number,
  limit: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentLimits = await fetchCustomerCreditLimits();
    const updated = {
      ...currentLimits,
      [String(customerId)]: Number(limit) || 0,
    };

    const payload = {
      name: 'Customer Credit Limits Registry',
      slug: TENANT_CREDIT_SLUG,
      email: 'credit@erp.system',
      business_activity: 'CONFIG',
      seller_address: JSON.stringify(updated),
    };

    const { error } = await supabase
      .from('tenants')
      .upsert([payload], { onConflict: 'slug' });

    if (error) throw error;

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent('erp_credit_limits_updated', {
        detail: { customerId: String(customerId), limit: Number(limit) || 0 },
      })
    );
    return { success: true };
  } catch (err: any) {
    console.error('Failed to save customer credit limit:', err);
    // Local fallback
    const currentLimits = (() => {
      try {
        return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}');
      } catch (_) {
        return {};
      }
    })();
    currentLimits[String(customerId)] = Number(limit) || 0;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentLimits));
    return { success: false, error: err.message || 'Failed to update credit limit' };
  }
};

/**
 * Calculate credit usage status based on current customer balance vs credit limit
 */
export const getCustomerCreditStatus = (
  balance: number,
  creditLimit: number
): CustomerCreditStatus => {
  const parsedLimit = Number(creditLimit) || 0;
  const currentBalance = Number(balance) || 0;

  if (parsedLimit <= 0) {
    return {
      status: 'NO_LIMIT',
      label: 'No Limit Set',
      badgeClass:
        'bg-gray-100 text-gray-600 dark:bg-meta-4/40 dark:text-gray-300 border border-stroke dark:border-strokedark',
      percentage: 0,
    };
  }

  // If customer has no debt (balance <= 0)
  if (currentBalance <= 0) {
    return {
      status: 'SAFE',
      label: 'Safe (0% Used)',
      badgeClass:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
      percentage: 0,
    };
  }

  const ratio = (currentBalance / parsedLimit) * 100;
  const roundedRatio = Math.round(ratio);

  if (ratio > 100) {
    return {
      status: 'EXCEEDED',
      label: `Limit Exceeded (${roundedRatio}%)`,
      badgeClass:
        'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold animate-pulse',
      percentage: roundedRatio,
    };
  }

  if (ratio >= 75) {
    return {
      status: 'NEAR_LIMIT',
      label: `Near Limit (${roundedRatio}%)`,
      badgeClass:
        'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold',
      percentage: roundedRatio,
    };
  }

  return {
    status: 'SAFE',
    label: `Safe (${roundedRatio}%)`,
    badgeClass:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
    percentage: roundedRatio,
  };
};
