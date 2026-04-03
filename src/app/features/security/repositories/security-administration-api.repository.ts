import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
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
import { SecurityAdministrationRepository } from './security-administration.repository';

@Injectable({
  providedIn: 'root',
})
export class SecurityAdministrationApiRepository
  implements SecurityAdministrationRepository
{
  listUsers(companyId: string, filters: SecurityListFilters): Observable<UserRowVm[]> {
    return this.notImplemented('listUsers', companyId, filters);
  }

  listRoles(companyId: string): Observable<RoleRowVm[]> {
    return this.notImplemented('listRoles', companyId);
  }

  saveUser(
    companyId: string,
    payload: UserFormValue,
    assignmentId?: string,
  ): Observable<UserRowVm> {
    return this.notImplemented('saveUser', companyId, payload, assignmentId);
  }

  updateUserStatus(
    companyId: string,
    assignmentId: string,
    status: SecurityRecordStatus,
  ): Observable<UserRowVm> {
    return this.notImplemented('updateUserStatus', companyId, assignmentId, status);
  }

  saveRole(
    companyId: string,
    payload: RoleFormValue,
    roleId?: string,
  ): Observable<RoleRowVm> {
    return this.notImplemented('saveRole', companyId, payload, roleId);
  }

  updateRoleStatus(
    companyId: string,
    roleId: string,
    status: SecurityRecordStatus,
  ): Observable<RoleRowVm> {
    return this.notImplemented('updateRoleStatus', companyId, roleId, status);
  }

  listProfiles(companyId: string, filters: SecurityListFilters): Observable<ProfileRowVm[]> {
    return this.notImplemented('listProfiles', companyId, filters);
  }

  getProfile(companyId: string, profileId: string): Observable<ProfileDetailVm> {
    return this.notImplemented('getProfile', companyId, profileId);
  }

  saveProfile(
    companyId: string,
    payload: ProfileFormValue,
    profileId?: string,
  ): Observable<ProfileDetailVm> {
    return this.notImplemented('saveProfile', companyId, payload, profileId);
  }

  updateProfileStatus(
    companyId: string,
    profileId: string,
    status: SecurityRecordStatus,
  ): Observable<ProfileDetailVm> {
    return this.notImplemented('updateProfileStatus', companyId, profileId, status);
  }

  listPermissionModules(): Observable<ModulePermissionVm[]> {
    return this.notImplemented('listPermissionModules');
  }

  private notImplemented<T>(method: string, ...args: unknown[]): Observable<T> {
    const detail = args.filter((value) => value !== undefined).length
      ? ` Parámetros recibidos: ${JSON.stringify(args)}.`
      : '';

    return throwError(
      () =>
        new Error(
          `SecurityAdministrationApiRepository.${method} está pendiente hasta definir el contrato backend.${detail}`,
        ),
    );
  }
}