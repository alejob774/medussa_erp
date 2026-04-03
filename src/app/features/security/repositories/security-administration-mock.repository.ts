import { Injectable } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import {
  buildPermissionMatrix,
  INITIAL_SECURITY_ADMINISTRATION_STORE,
} from '../mocks/security-administration.mock';
import {
  ModulePermissionVm,
  ProfileDetailVm,
  ProfileFormValue,
  ProfileRowVm,
  RoleFormValue,
  RoleRowVm,
  SecurityAdministrationStore,
  SecurityListFilters,
  SecurityRecordStatus,
  UserFormValue,
  UserRowVm,
} from '../models/security-administration.model';
import {
  clonePermissionMatrix,
  summarizeProfilePermissions,
} from '../utils/security-authorization.utils';
import { SecurityAdministrationRepository } from './security-administration.repository';

@Injectable({
  providedIn: 'root',
})
export class SecurityAdministrationMockRepository
  implements SecurityAdministrationRepository
{
  private readonly storageKey = 'medussa.erp.mock.security-administration';

  listUsers(companyId: string, filters: SecurityListFilters): Observable<UserRowVm[]> {
    const store = this.readStore();
    const roles = this.listVisibleRoles(store.roles, companyId);
    const normalizedSearch = filters.search.trim().toLowerCase();

    const users = store.users
      .filter((user) => user.companyId === companyId)
      .map((user) => ({
        ...user,
        roleName: roles.find((role) => role.id === user.roleId)?.name ?? null,
      }))
      .filter((user) => {
        const matchesStatus =
          filters.status === 'all' || user.status === filters.status;
        const matchesSearch =
          !normalizedSearch ||
          user.name.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch) ||
          (user.roleName ?? '').toLowerCase().includes(normalizedSearch);

        return matchesStatus && matchesSearch;
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    return of(users).pipe(delay(280));
  }

  listRoles(companyId: string): Observable<RoleRowVm[]> {
    const roles = this.listVisibleRoles(this.readStore().roles, companyId).sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    return of(roles).pipe(delay(220));
  }

  saveUser(
    companyId: string,
    payload: UserFormValue,
    assignmentId?: string,
  ): Observable<UserRowVm> {
    const store = this.readStore();
    const normalizedEmail = payload.email.trim().toLowerCase();
    const visibleRoles = this.listVisibleRoles(store.roles, companyId);

    if (
      store.users.some(
        (user) =>
          user.companyId === companyId &&
          user.assignmentId !== assignmentId &&
          user.email.trim().toLowerCase() === normalizedEmail,
      )
    ) {
      return throwError(
        () =>
          new Error(
            'Ya existe un usuario con ese correo en la empresa activa. Revisa el dato antes de guardar.',
          ),
      );
    }

    if (payload.roleId && !visibleRoles.some((role) => role.id === payload.roleId)) {
      return throwError(
        () => new Error('Selecciona un rol válido para la empresa activa.'),
      );
    }

    const currentUser = assignmentId
      ? store.users.find(
          (user) => user.assignmentId === assignmentId && user.companyId === companyId,
        )
      : undefined;

    const nextUser: UserRowVm = {
      assignmentId: currentUser?.assignmentId ?? this.buildId('assignment'),
      userId: currentUser?.userId ?? this.buildId('user'),
      companyId,
      name: payload.name.trim(),
      email: normalizedEmail,
      roleId: payload.roleId,
      roleName:
        visibleRoles.find((role) => role.id === payload.roleId)?.name ?? null,
      status: payload.status,
    };

    const nextUsers = currentUser
      ? store.users.map((user) =>
          user.assignmentId === currentUser.assignmentId ? nextUser : user,
        )
      : [...store.users, nextUser];

    this.writeStore({
      ...store,
      users: nextUsers,
    });

    return of(nextUser).pipe(delay(420));
  }

  updateUserStatus(
    companyId: string,
    assignmentId: string,
    status: SecurityRecordStatus,
  ): Observable<UserRowVm> {
    const store = this.readStore();
    const roles = this.listVisibleRoles(store.roles, companyId);
    const currentUser = store.users.find(
      (user) => user.assignmentId === assignmentId && user.companyId === companyId,
    );

    if (!currentUser) {
      return throwError(() => new Error('No se encontró el usuario solicitado.'));
    }

    const nextUser: UserRowVm = {
      ...currentUser,
      status,
      roleName: roles.find((role) => role.id === currentUser.roleId)?.name ?? null,
    };

    this.writeStore({
      ...store,
      users: store.users.map((user) =>
        user.assignmentId === assignmentId ? nextUser : user,
      ),
    });

    return of(nextUser).pipe(delay(320));
  }

  saveRole(
    companyId: string,
    payload: RoleFormValue,
    roleId?: string,
  ): Observable<RoleRowVm> {
    const store = this.readStore();
    const currentRole = roleId
      ? store.roles.find(
          (role) => role.id === roleId && (role.companyId === companyId || role.scope === 'global'),
        )
      : undefined;
    const nextScope = currentRole?.scope ?? 'company';
    const nextCompanyId = nextScope === 'global' ? null : companyId;
    const normalizedName = payload.name.trim().toLowerCase();

    if (
      store.roles.some(
        (role) =>
          role.id !== roleId &&
          role.scope === nextScope &&
          role.companyId === nextCompanyId &&
          role.name.trim().toLowerCase() === normalizedName,
      )
    ) {
      return throwError(
        () => new Error('Ya existe un rol con ese nombre en el alcance actual.'),
      );
    }

    const nextRole: RoleRowVm = {
      id: currentRole?.id ?? this.buildId('role'),
      companyId: nextCompanyId,
      name: payload.name.trim(),
      description: payload.description.trim(),
      status: payload.status,
      scope: nextScope,
    };

    this.writeStore({
      ...store,
      roles: currentRole
        ? store.roles.map((role) => (role.id === currentRole.id ? nextRole : role))
        : [...store.roles, nextRole],
    });

    return of(nextRole).pipe(delay(420));
  }

  updateRoleStatus(
    companyId: string,
    roleId: string,
    status: SecurityRecordStatus,
  ): Observable<RoleRowVm> {
    const store = this.readStore();
    const currentRole = store.roles.find(
      (role) => role.id === roleId && (role.companyId === companyId || role.scope === 'global'),
    );

    if (!currentRole) {
      return throwError(() => new Error('No se encontró el rol solicitado.'));
    }

    const nextRole: RoleRowVm = {
      ...currentRole,
      status,
    };

    this.writeStore({
      ...store,
      roles: store.roles.map((role) => (role.id === roleId ? nextRole : role)),
    });

    return of(nextRole).pipe(delay(320));
  }

  listProfiles(companyId: string, filters: SecurityListFilters): Observable<ProfileRowVm[]> {
    const normalizedSearch = filters.search.trim().toLowerCase();

    const profiles = this.readStore()
      .profiles.filter((profile) => profile.companyId === companyId)
      .map((profile) => this.mapProfileRow(profile))
      .filter((profile) => {
        const matchesStatus =
          filters.status === 'all' || profile.status === filters.status;
        const matchesSearch =
          !normalizedSearch ||
          profile.name.toLowerCase().includes(normalizedSearch) ||
          (profile.description ?? '').toLowerCase().includes(normalizedSearch) ||
          (profile.modulesSummary ?? []).some((moduleName) =>
            moduleName.toLowerCase().includes(normalizedSearch),
          );

        return matchesStatus && matchesSearch;
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    return of(profiles).pipe(delay(280));
  }

  getProfile(companyId: string, profileId: string): Observable<ProfileDetailVm> {
    const profile = this.readStore().profiles.find(
      (candidate) => candidate.id === profileId && candidate.companyId === companyId,
    );

    if (!profile) {
      return throwError(() => new Error('No se encontró el perfil solicitado.'));
    }

    return of({
      ...profile,
      permissions: clonePermissionMatrix(profile.permissions),
    }).pipe(delay(180));
  }

  saveProfile(
    companyId: string,
    payload: ProfileFormValue,
    profileId?: string,
  ): Observable<ProfileDetailVm> {
    const store = this.readStore();
    const normalizedName = payload.name.trim().toLowerCase();
    const currentProfile = profileId
      ? store.profiles.find(
          (profile) => profile.id === profileId && profile.companyId === companyId,
        )
      : undefined;

    if (
      store.profiles.some(
        (profile) =>
          profile.companyId === companyId &&
          profile.id !== profileId &&
          profile.name.trim().toLowerCase() === normalizedName,
      )
    ) {
      return throwError(
        () => new Error('Ya existe un perfil con ese nombre en la empresa activa.'),
      );
    }

    const nextProfile: ProfileDetailVm = {
      id: currentProfile?.id ?? this.buildId('profile'),
      companyId,
      name: payload.name.trim(),
      description: payload.description.trim(),
      status: payload.status,
      permissions: clonePermissionMatrix(payload.permissions),
    };

    this.writeStore({
      ...store,
      profiles: currentProfile
        ? store.profiles.map((profile) =>
            profile.id === currentProfile.id ? nextProfile : profile,
          )
        : [...store.profiles, nextProfile],
    });

    return of(nextProfile).pipe(delay(460));
  }

  updateProfileStatus(
    companyId: string,
    profileId: string,
    status: SecurityRecordStatus,
  ): Observable<ProfileDetailVm> {
    const store = this.readStore();
    const currentProfile = store.profiles.find(
      (profile) => profile.id === profileId && profile.companyId === companyId,
    );

    if (!currentProfile) {
      return throwError(() => new Error('No se encontró el perfil solicitado.'));
    }

    const nextProfile: ProfileDetailVm = {
      ...currentProfile,
      status,
      permissions: clonePermissionMatrix(currentProfile.permissions),
    };

    this.writeStore({
      ...store,
      profiles: store.profiles.map((profile) =>
        profile.id === profileId ? nextProfile : profile,
      ),
    });

    return of(nextProfile).pipe(delay(320));
  }

  listPermissionModules(): Observable<ModulePermissionVm[]> {
    return of(buildPermissionMatrix()).pipe(delay(80));
  }

  private mapProfileRow(profile: ProfileDetailVm): ProfileRowVm {
    const summary = summarizeProfilePermissions(profile.permissions);

    return {
      id: profile.id,
      companyId: profile.companyId,
      name: profile.name,
      description: profile.description,
      status: profile.status,
      modulesSummary: summary.modulesSummary,
      permissionsSummary: summary.permissionsSummary,
      permissionCount: summary.permissionCount,
    };
  }

  private listVisibleRoles(roles: readonly RoleRowVm[], companyId: string): RoleRowVm[] {
    return roles.filter(
      (role) => role.scope === 'global' || role.companyId === companyId,
    );
  }

  private readStore(): SecurityAdministrationStore {
    if (typeof window === 'undefined') {
      return this.cloneStore(INITIAL_SECURITY_ADMINISTRATION_STORE);
    }

    const rawStore = localStorage.getItem(this.storageKey);

    if (!rawStore) {
      this.writeStore(INITIAL_SECURITY_ADMINISTRATION_STORE);
      return this.cloneStore(INITIAL_SECURITY_ADMINISTRATION_STORE);
    }

    try {
      return JSON.parse(rawStore) as SecurityAdministrationStore;
    } catch {
      this.writeStore(INITIAL_SECURITY_ADMINISTRATION_STORE);
      return this.cloneStore(INITIAL_SECURITY_ADMINISTRATION_STORE);
    }
  }

  private writeStore(store: SecurityAdministrationStore): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(store));
  }

  private cloneStore(store: SecurityAdministrationStore): SecurityAdministrationStore {
    return JSON.parse(JSON.stringify(store)) as SecurityAdministrationStore;
  }

  private buildId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }
}