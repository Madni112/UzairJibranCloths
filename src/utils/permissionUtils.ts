/**
 * Fine-Grained Role & Module Permissions Utilities
 * Supports: Untick (None), View Only, Full Access (Tick), and Custom (Add, Edit, Delete).
 */

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete';
export type PermissionLevel = 'none' | 'view' | 'full' | 'custom';

export interface ModulePermissionState {
  hasAccess: boolean;
  level: PermissionLevel;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * List of prefixes and route IDs that are strictly read-only by nature
 * (e.g., Dashboards, Reports, Audit Logs, Ledgers, Inquiries).
 * These only support simple Access (Tick) or No Access (Untick).
 */
export const READ_ONLY_MODULE_PREFIXES = [
  'dashboards',
  '/dashboard',
  '/Reports',
  '/reports',
  '/crm/due-list',
  '/crm/recovery-history',
  '/purchase/vendor-ledger',
  '/inventory/stock-ledger',
  '/inventory/scheduled-valuations',
  '/registration/bank-reconciliation',
  '/registration/trial-balance',
];

export function isReadOnlyModule(moduleId: string): boolean {
  if (!moduleId) return false;
  const clean = moduleId.toLowerCase().trim();
  return READ_ONLY_MODULE_PREFIXES.some(prefix => clean.startsWith(prefix.toLowerCase()));
}

/**
 * Normalizes a route token to its base path by stripping any :action suffix.
 */
export function cleanBaseModuleId(token: string): string {
  if (!token) return '';
  return token.split(':')[0].trim();
}

/**
 * Inspects a user's allowed_modules list for a specific module path and returns its granular CRUD rights.
 */
export function getModulePermissions(
  allowedModules: string[] | null | undefined,
  moduleId: string,
  userRole?: string | null
): ModulePermissionState {
  // If allowedModules array is explicitly defined, strictly respect the configured permissions!
  // Only default to unrestricted access if allowedModules is not defined or empty and user is admin
  if ((!allowedModules || !Array.isArray(allowedModules) || allowedModules.length === 0) && userRole && userRole.toLowerCase().includes('admin')) {
    return {
      hasAccess: true,
      level: 'full',
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
    };
  }

  if (!allowedModules || !Array.isArray(allowedModules) || allowedModules.length === 0) {
    return {
      hasAccess: false,
      level: 'none',
      canView: false,
      canAdd: false,
      canEdit: false,
      canDelete: false,
    };
  }

  const cleanTarget = moduleId.toLowerCase().trim();

  // Find all tokens in allowedModules that belong to this moduleId
  const matchingTokens = allowedModules.filter(m => {
    const base = cleanBaseModuleId(String(m)).toLowerCase();
    return base === cleanTarget;
  });

  if (matchingTokens.length === 0) {
    return {
      hasAccess: false,
      level: 'none',
      canView: false,
      canAdd: false,
      canEdit: false,
      canDelete: false,
    };
  }

  // 1. Full Access: presence of raw moduleId or :all
  const hasFull = matchingTokens.some(t => {
    const str = String(t).trim();
    return str.toLowerCase() === cleanTarget || str.toLowerCase().endsWith(':all');
  });

  if (hasFull) {
    return {
      hasAccess: true,
      level: 'full',
      canView: true,
      canAdd: true,
      canEdit: true,
      canDelete: true,
    };
  }

  // 2. View Only: presence of :view without other action flags
  const actions = new Set<string>();
  matchingTokens.forEach(t => {
    const parts = String(t).split(':');
    if (parts.length > 1) {
      const act = parts[1].toLowerCase().trim();
      if (act) actions.add(act);
    }
  });

  if (actions.size === 1 && actions.has('view')) {
    return {
      hasAccess: true,
      level: 'view',
      canView: true,
      canAdd: false,
      canEdit: false,
      canDelete: false,
    };
  }

  // 3. Custom: Granular combination of view / add / edit / delete
  const canAdd = actions.has('add');
  const canEdit = actions.has('edit');
  const canDelete = actions.has('delete');
  const canView = actions.has('view') || canAdd || canEdit || canDelete;

  return {
    hasAccess: true,
    level: 'custom',
    canView,
    canAdd,
    canEdit,
    canDelete,
  };
}

/**
 * Updates a module's permissions in the allowedModules array based on the requested level & actions.
 */
export function setModulePermissions(
  currentIds: string[],
  moduleId: string,
  level: PermissionLevel,
  customActions: { view?: boolean; add?: boolean; edit?: boolean; delete?: boolean } = { view: true, add: false, edit: false, delete: false }
): string[] {
  const cleanTarget = moduleId.toLowerCase().trim();

  // Filter out any existing tokens for this moduleId
  const filtered = currentIds.filter(id => cleanBaseModuleId(String(id)).toLowerCase() !== cleanTarget);

  if (level === 'none') {
    return filtered;
  }

  if (level === 'full') {
    return [...filtered, moduleId];
  }

  if (level === 'view') {
    return [...filtered, `${moduleId}:view`];
  }

  if (level === 'custom') {
    const newTokens: string[] = [];
    if (customActions.view) newTokens.push(`${moduleId}:view`);
    if (customActions.add) newTokens.push(`${moduleId}:add`);
    if (customActions.edit) newTokens.push(`${moduleId}:edit`);
    if (customActions.delete) newTokens.push(`${moduleId}:delete`);

    // If nothing was checked in custom, default to view
    if (newTokens.length === 0) {
      newTokens.push(`${moduleId}:view`);
    }

    return [...filtered, ...newTokens];
  }

  return filtered;
}
