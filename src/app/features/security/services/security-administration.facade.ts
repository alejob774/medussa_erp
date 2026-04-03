import { Injectable, inject } from '@angular/core';
import { defer, Observable, throwError } from 'rxjs';
import { CompanyContextService } from '../../../core/company/services/company-context.service';
import { environment } from '../../../../environments/environment';
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
import { SecurityAdministrationApiRepository } from '../repositories/security-administration-api.repository';
import { SecurityAdministrationMockRepository } from '../repositories/security-administration-mock.repository';
import { SecurityAdministrationRepository } from '../repositories/security-administration.repository';

@Injectable({
  providedIn: 'root',
})
export class SecurityAdministrationFacadeService {
  private readonly companyContextService = inject(CompanyContextService);
  private readonly mockRepository = inject(SecurityAdministrationMockRepository);
  private readonly apiRepository = inject(SecurityAdministrationApiRepository);

  readonly activeCompany$ = this.companyContextService.activeCompany$;

  listUsers(filters: SecurityListFilters): Observable<UserRowVm[]> {
    return this.withActiveCompany((companyId) =>
      this.repository.listUsers(companyId, filters),
    );
  }

  listRoles(): Observable<RoleRowVm[]> {
    return this.withActiveCompany((companyId) => this.repository.listRoles(companyId));
  }

  saveUser(payload: UserFormValue, assignmentId?: string): Observable<UserRowVm> {
    return this.withActiveCompany((companyId) =>
      this.repository.saveUser(companyId, payload, assignmentId),
    );
  }

  updateUserStatus(
    assignmentId: string,
    status: SecurityRecordStatus,
  ): Observable<UserRowVm> {
    return this.withActiveCompany((companyId) =>
      this.repository.updateUserStatus(companyId, assignmentId, status),
    );
  }

  saveRole(payload: RoleFormValue, roleId?: string): Observable<RoleRowVm> {
    return this.withActiveCompany((companyId) =>
      this.repository.saveRole(companyId, payload, roleId),
    );
  }

  updateRoleStatus(roleId: string, status: SecurityRecordStatus): Observable<RoleRowVm> {
    return this.withActiveCompany((companyId) =>
      this.repository.updateRoleStatus(companyId, roleId, status),
    );
  }

  listProfiles(filters: SecurityListFilters): Observable<ProfileRowVm[]> {
    return this.withActiveCompany((companyId) =>
      this.repository.listProfiles(companyId, filters),
    );
  }

  getProfile(profileId: string): Observable<ProfileDetailVm> {
    return this.withActiveCompany((companyId) =>
      this.repository.getProfile(companyId, profileId),
    );
  }

  saveProfile(
    payload: ProfileFormValue,
    profileId?: string,
  ): Observable<ProfileDetailVm> {
    return this.withActiveCompany((companyId) =>
      this.repository.saveProfile(companyId, payload, profileId),
    );
  }

  updateProfileStatus(
    profileId: string,
    status: SecurityRecordStatus,
  ): Observable<ProfileDetailVm> {
    return this.withActiveCompany((companyId) =>
      this.repository.updateProfileStatus(companyId, profileId, status),
    );
  }

  listPermissionModules(): Observable<ModulePermissionVm[]> {
    return this.repository.listPermissionModules();
  }

  getActiveCompanyId(): string | null {
    return this.companyContextService.getActiveCompany()?.id ?? null;
  }

  private withActiveCompany<T>(
    operation: (companyId: string) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const companyId = this.getActiveCompanyId();

      if (!companyId) {
        return throwError(() => new Error('No hay una empresa activa seleccionada.'));
      }

      return operation(companyId);
    });
  }

  private get repository(): SecurityAdministrationRepository {
    return environment.useSecurityAdministrationMock
      ? this.mockRepository
      : this.apiRepository;
  }
}