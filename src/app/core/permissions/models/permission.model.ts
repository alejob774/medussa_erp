export type PermissionKey =
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
  | 'settings.general.view'
  | 'security.users.view'
  | 'security.profiles.view'
  | 'security.audit.view';

export interface Permission {
  key: PermissionKey;
  label: string;
  description?: string;
}
