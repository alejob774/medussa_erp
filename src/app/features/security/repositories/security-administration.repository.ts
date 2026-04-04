import { Observable } from 'rxjs';
import {
  ModulePermissionVm,
  ProfileDetailVm,
  ProfileFormValue,
  ProfileRowVm,
  RoleFormValue,
  RoleRowVm,
  SecurityListFilters,
  SecurityRecordStatus,
  UserFormValue,
  UserRowVm,
} from '../models/security-administration.model';

export interface SecurityAdministrationRepository {
  listUsers(companyId: string, filters: SecurityListFilters): Observable<UserRowVm[]>;
  listRoles(companyId: string): Observable<RoleRowVm[]>;
  listRoleCatalogs(companyIds: string[]): Observable<Record<string, RoleRowVm[]>>;
  listProfileCatalogs(companyIds: string[]): Observable<Record<string, ProfileRowVm[]>>;
  saveUser(
    companyId: string,
    payload: UserFormValue,
    userId?: string,
  ): Observable<UserRowVm>;
  updateUserStatus(
    companyId: string,
    userId: string,
    status: SecurityRecordStatus,
  ): Observable<UserRowVm>;
  saveRole(
    companyId: string,
    payload: RoleFormValue,
    roleId?: string,
  ): Observable<RoleRowVm>;
  updateRoleStatus(
    companyId: string,
    roleId: string,
    status: SecurityRecordStatus,
  ): Observable<RoleRowVm>;
  listProfiles(companyId: string, filters: SecurityListFilters): Observable<ProfileRowVm[]>;
  getProfile(companyId: string, profileId: string): Observable<ProfileDetailVm>;
  saveProfile(
    companyId: string,
    payload: ProfileFormValue,
    profileId?: string,
  ): Observable<ProfileDetailVm>;
  updateProfileStatus(
    companyId: string,
    profileId: string,
    status: SecurityRecordStatus,
  ): Observable<ProfileDetailVm>;
  listPermissionModules(): Observable<ModulePermissionVm[]>;
}