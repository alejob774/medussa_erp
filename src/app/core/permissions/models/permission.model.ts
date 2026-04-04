export type LegacyPermissionKey =
  | 'dashboard.view'
  | 'sales.view'
  | 'purchases.view'
  | 'finance.view'
  | 'production.view'
  | 'hr.view'
  | 'support.view'
  | 'marketing.view'
  | 'warehouse.view'
  | 'inventory.view'
  | 'settings.companies.view'
  | 'settings.general.view'
  | 'security.users.view'
  | 'security.profiles.view'
  | 'security.audit.view';

export type PermissionKey = LegacyPermissionKey | string;

export interface Permission {
  key: PermissionKey;
  label: string;
  description?: string;
}
