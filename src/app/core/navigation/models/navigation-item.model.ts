import { PermissionKey } from '../../permissions/models/permission.model';

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  description?: string;
  requiredPermissions?: PermissionKey[];
  companyIds?: string[];
  children?: NavigationItem[];
}

export interface NavigationSection {
  id: string;
  label: string;
  icon: string;
  hint: string;
  items: NavigationItem[];
}
