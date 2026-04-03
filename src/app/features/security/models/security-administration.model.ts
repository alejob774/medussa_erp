export type SecurityRecordStatus = 'active' | 'inactive';

export type SecurityListStatusFilter = 'all' | SecurityRecordStatus;

export type SecurityRoleScope = 'company' | 'global';

export interface UserRowVm {
  assignmentId: string;
  userId: string;
  companyId: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  status: SecurityRecordStatus;
}

export interface RoleRowVm {
  id: string;
  companyId: string | null;
  name: string;
  description?: string;
  status: SecurityRecordStatus;
  scope: SecurityRoleScope;
}

export interface PermissionActionSet {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  manage: boolean;
}

export type PermissionActionKey = keyof PermissionActionSet;

export interface ModulePermissionVm {
  moduleKey: string;
  moduleName: string;
  actions: PermissionActionSet;
}

export interface ProfileRowVm {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  status: SecurityRecordStatus;
  modulesSummary?: string[];
  permissionsSummary?: string[];
  permissionCount?: number;
}

export interface ProfileDetailVm extends ProfileRowVm {
  permissions: ModulePermissionVm[];
}

export interface UserFormValue {
  name: string;
  email: string;
  roleId: string | null;
  status: SecurityRecordStatus;
}

export interface RoleFormValue {
  name: string;
  description: string;
  status: SecurityRecordStatus;
}

export interface ProfileFormValue {
  name: string;
  description: string;
  status: SecurityRecordStatus;
  permissions: ModulePermissionVm[];
}

export interface SecurityListFilters {
  search: string;
  status: SecurityListStatusFilter;
}

export interface SecurityAdministrationStore {
  users: UserRowVm[];
  roles: RoleRowVm[];
  profiles: ProfileDetailVm[];
}