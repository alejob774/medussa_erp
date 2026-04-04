export type SecurityRecordStatus = 'active' | 'inactive';

export type SecurityListStatusFilter = 'all' | SecurityRecordStatus;

export type SecurityRoleScope = 'company' | 'global';

export interface UserCompanyAssignmentVm {
  companyId: string;
  companyName: string;
  roleId: string | null;
  roleName: string | null;
  profileId: string | null;
  profileName: string | null;
}

export interface UserDetailVm {
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  position: string;
  email: string;
  mobilePhone: string;
  landlinePhone: string;
  photoUrl: string | null;
  status: SecurityRecordStatus;
  assignedCompanies: UserCompanyAssignmentVm[];
}

export interface UserRowVm {
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  position: string;
  email: string;
  mobilePhone: string;
  landlinePhone: string;
  photoUrl: string | null;
  status: SecurityRecordStatus;
  assignedCompanies: UserCompanyAssignmentVm[];
  activeAssignment: UserCompanyAssignmentVm | null;
  roleId: string | null;
  roleName: string | null;
  profileId: string | null;
  profileName: string | null;
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
  export: boolean;
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
  firstName: string;
  lastName: string;
  position: string;
  email: string;
  mobilePhone: string;
  landlinePhone: string;
  photoUrl: string | null;
  assignedCompanies: Array<{
    companyId: string;
    roleId: string;
    profileId: string;
  }>;
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
  users: UserDetailVm[];
  roles: RoleRowVm[];
  profiles: ProfileDetailVm[];
}