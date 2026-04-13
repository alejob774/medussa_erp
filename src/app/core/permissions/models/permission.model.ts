export type LegacyPermissionKey =
  | 'dashboard.view'
  | 'sales.view'
  | 'clients.view'
  | 'clients.create'
  | 'clients.edit'
  | 'clients.delete'
  | 'purchases.view'
  | 'finance.view'
  | 'production.view'
  | 'hr.view'
  | 'support.view'
  | 'marketing.view'
  | 'warehouse.view'
  | 'inventory.view'
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'vendors.view'
  | 'vendors.create'
  | 'vendors.edit'
  | 'vendors.delete'
  | 'drivers.view'
  | 'drivers.create'
  | 'drivers.edit'
  | 'drivers.delete'
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
