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
  UserCompanyAssignmentVm,
  UserDetailVm,
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
    const normalizedSearch = filters.search.trim().toLowerCase();

    const users = this.readStore()
      .users.map((user) => this.mapUserRow(user, companyId))
      .filter((user) => !!user.activeAssignment)
      .filter((user) => {
        const matchesStatus = filters.status === 'all' || user.status === filters.status;
        const matchesSearch =
          !normalizedSearch ||
          [
            user.name,
            user.email,
            user.position,
            user.roleName ?? '',
            user.profileName ?? '',
            ...user.assignedCompanies.map((assignment) => assignment.companyName),
          ].some((value) => value.toLowerCase().includes(normalizedSearch));

        return matchesStatus && matchesSearch;
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    return of(users).pipe(delay(280));
  }

  listRoles(companyId: string): Observable<RoleRowVm[]> {
    return of(this.listVisibleRoles(this.readStore().roles, companyId)).pipe(delay(220));
  }

  listRoleCatalogs(companyIds: string[]): Observable<Record<string, RoleRowVm[]>> {
    const store = this.readStore();
    const catalog = companyIds.reduce<Record<string, RoleRowVm[]>>((accumulator, companyId) => {
      accumulator[companyId] = this.listVisibleRoles(store.roles, companyId);
      return accumulator;
    }, {});

    return of(catalog).pipe(delay(180));
  }

  listProfileCatalogs(companyIds: string[]): Observable<Record<string, ProfileRowVm[]>> {
    const store = this.readStore();
    const catalog = companyIds.reduce<Record<string, ProfileRowVm[]>>((accumulator, companyId) => {
      accumulator[companyId] = this.listVisibleProfiles(store.profiles, companyId)
        .map((profile) => this.mapProfileRow(profile))
        .sort((left, right) => left.name.localeCompare(right.name));
      return accumulator;
    }, {});

    return of(catalog).pipe(delay(180));
  }

  saveUser(
    companyId: string,
    payload: UserFormValue,
    userId?: string,
  ): Observable<UserRowVm> {
    const store = this.readStore();
    const currentUser = userId
      ? store.users.find((user) => user.userId === userId)
      : undefined;

    const validationError = this.validateUserPayload(store, payload, userId);

    if (validationError) {
      return throwError(() => new Error(validationError));
    }

    const nextUser: UserDetailVm = {
      userId: currentUser?.userId ?? this.buildId('user'),
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      name: this.buildFullName(payload.firstName, payload.lastName),
      position: payload.position.trim(),
      email: payload.email.trim().toLowerCase(),
      mobilePhone: payload.mobilePhone.trim(),
      landlinePhone: payload.landlinePhone.trim(),
      photoUrl: payload.photoUrl,
      status: payload.status,
      assignedCompanies: payload.assignedCompanies.map((assignment) =>
        this.mapAssignmentFromPayload(store, assignment),
      ),
    };

    const nextUsers = currentUser
      ? store.users.map((user) => (user.userId === currentUser.userId ? nextUser : user))
      : [...store.users, nextUser];

    this.writeStore({
      ...store,
      users: nextUsers,
    });

    return of(this.mapUserRow(nextUser, companyId)).pipe(delay(420));
  }

  updateUserStatus(
    companyId: string,
    userId: string,
    status: SecurityRecordStatus,
  ): Observable<UserRowVm> {
    const store = this.readStore();
    const currentUser = store.users.find((user) => user.userId === userId);

    if (!currentUser) {
      return throwError(() => new Error('No se encontro el usuario solicitado.'));
    }

    const nextUser: UserDetailVm = {
      ...currentUser,
      status,
      assignedCompanies: currentUser.assignedCompanies.map((assignment) => ({
        ...assignment,
      })),
    };

    this.writeStore({
      ...store,
      users: store.users.map((user) => (user.userId === userId ? nextUser : user)),
    });

    return of(this.mapUserRow(nextUser, companyId)).pipe(delay(320));
  }

  saveRole(
    companyId: string,
    payload: RoleFormValue,
    roleId?: string,
  ): Observable<RoleRowVm> {
    const store = this.readStore();
    const currentRole = roleId
      ? store.roles.find((role) => role.id === roleId && role.companyId === companyId)
      : undefined;
    const normalizedName = payload.name.trim().toLowerCase();

    if (
      store.roles.some(
        (role) =>
          role.id !== roleId &&
          role.companyId === companyId &&
          role.scope === 'company' &&
          role.name.trim().toLowerCase() === normalizedName,
      )
    ) {
      return throwError(
        () => new Error('Ya existe un rol con ese nombre en la empresa activa.'),
      );
    }

    const nextRole: RoleRowVm = {
      id: currentRole?.id ?? this.buildId('role'),
      companyId,
      name: payload.name.trim(),
      description: payload.description.trim(),
      status: payload.status,
      scope: 'company',
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
      (role) => role.id === roleId && role.companyId === companyId && role.scope === 'company',
    );

    if (!currentRole) {
      return throwError(() => new Error('No se encontro el rol solicitado.'));
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

    const profiles = this.listVisibleProfiles(this.readStore().profiles, companyId)
      .map((profile) => this.mapProfileRow(profile))
      .filter((profile) => {
        const matchesStatus = filters.status === 'all' || profile.status === filters.status;
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
      return throwError(() => new Error('No se encontro el perfil solicitado.'));
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

    const hasEnabledPermissions = payload.permissions.some((permission) =>
      Object.values(permission.actions).some(Boolean),
    );

    if (!currentProfile && !hasEnabledPermissions) {
      return throwError(() => new Error('Debes activar al menos un permiso para guardar el perfil.'));
    }

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
      permissions: clonePermissionMatrix(
        hasEnabledPermissions
          ? payload.permissions
          : currentProfile?.permissions ?? payload.permissions,
      ),
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
      return throwError(() => new Error('No se encontro el perfil solicitado.'));
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

  private mapUserRow(user: UserDetailVm, companyId: string): UserRowVm {
    const assignedCompanies = user.assignedCompanies.map((assignment) => ({ ...assignment }));
    const activeAssignment = assignedCompanies.find(
      (assignment) => assignment.companyId === companyId,
    ) ?? null;

    return {
      ...user,
      assignedCompanies,
      activeAssignment,
      roleId: activeAssignment?.roleId ?? null,
      roleName: activeAssignment?.roleName ?? null,
      profileId: activeAssignment?.profileId ?? null,
      profileName: activeAssignment?.profileName ?? null,
    };
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

  private mapAssignmentFromPayload(
    store: SecurityAdministrationStore,
    assignment: UserFormValue['assignedCompanies'][number],
  ): UserCompanyAssignmentVm {
    const role = store.roles.find(
      (candidate) =>
        candidate.id === assignment.roleId &&
        candidate.companyId === assignment.companyId &&
        candidate.scope === 'company',
    );
    const profile = store.profiles.find(
      (candidate) =>
        candidate.id === assignment.profileId && candidate.companyId === assignment.companyId,
    );

    return {
      companyId: assignment.companyId,
      companyName:
        profile?.companyId === assignment.companyId
          ? this.resolveCompanyName(store, assignment.companyId, role, profile)
          : this.resolveCompanyName(store, assignment.companyId, role),
      roleId: assignment.roleId,
      roleName: role?.name ?? null,
      profileId: assignment.profileId,
      profileName: profile?.name ?? null,
    };
  }

  private validateUserPayload(
    store: SecurityAdministrationStore,
    payload: UserFormValue,
    userId?: string,
  ): string | null {
    if (!payload.firstName.trim()) {
      return 'El nombre es obligatorio.';
    }

    if (!payload.lastName.trim()) {
      return 'El apellido es obligatorio.';
    }

    if (!payload.position.trim()) {
      return 'El cargo es obligatorio.';
    }

    if (!payload.email.trim()) {
      return 'El correo es obligatorio.';
    }

    const normalizedEmail = payload.email.trim().toLowerCase();

    if (
      store.users.some(
        (user) => user.userId !== userId && user.email.trim().toLowerCase() === normalizedEmail,
      )
    ) {
      return 'Ya existe un usuario con ese correo registrado.';
    }

    if (!payload.assignedCompanies.length) {
      return 'Debes asignar al menos una empresa al usuario.';
    }

    const uniqueCompanyIds = new Set(payload.assignedCompanies.map((assignment) => assignment.companyId));

    if (uniqueCompanyIds.size !== payload.assignedCompanies.length) {
      return 'No puedes repetir una empresa dentro de las asignaciones del usuario.';
    }

    for (const assignment of payload.assignedCompanies) {
      if (!assignment.roleId) {
        return 'Cada empresa asignada debe tener un rol.';
      }

      if (!assignment.profileId) {
        return 'Cada empresa asignada debe tener un perfil de acceso.';
      }

      const role = store.roles.find(
        (candidate) =>
          candidate.id === assignment.roleId &&
          candidate.companyId === assignment.companyId &&
          candidate.scope === 'company',
      );

      if (!role) {
        return 'Selecciona un rol valido para la empresa asignada.';
      }

      const profile = store.profiles.find(
        (candidate) =>
          candidate.id === assignment.profileId && candidate.companyId === assignment.companyId,
      );

      if (!profile) {
        return 'Selecciona un perfil valido para la empresa asignada.';
      }
    }

    return null;
  }

  private listVisibleRoles(roles: readonly RoleRowVm[], companyId: string): RoleRowVm[] {
    return roles
      .filter((role) => role.companyId === companyId && role.scope === 'company')
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private listVisibleProfiles(
    profiles: readonly ProfileDetailVm[],
    companyId: string,
  ): ProfileDetailVm[] {
    return profiles.filter((profile) => profile.companyId === companyId);
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
      const parsedStore = JSON.parse(rawStore) as SecurityAdministrationStore;
      const normalizedStore = this.normalizeStore(parsedStore);

      if (normalizedStore !== parsedStore) {
        this.writeStore(normalizedStore);
      }

      return normalizedStore;
    } catch {
      this.writeStore(INITIAL_SECURITY_ADMINISTRATION_STORE);
      return this.cloneStore(INITIAL_SECURITY_ADMINISTRATION_STORE);
    }
  }

  private normalizeStore(store: SecurityAdministrationStore): SecurityAdministrationStore {
    if (
      !Array.isArray(store.users) ||
      !Array.isArray(store.roles) ||
      !Array.isArray(store.profiles) ||
      store.users.some((user) => !Array.isArray((user as Partial<UserDetailVm>).assignedCompanies))
    ) {
      return this.cloneStore(INITIAL_SECURITY_ADMINISTRATION_STORE);
    }

    return this.cloneStore(store);
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

  private buildFullName(firstName: string, lastName: string): string {
    return `${firstName.trim()} ${lastName.trim()}`.trim();
  }

  private resolveCompanyName(
    store: SecurityAdministrationStore,
    companyId: string,
    _role?: RoleRowVm,
    _profile?: ProfileDetailVm,
  ): string {
    const existingAssignment = store.users
      .flatMap((user) => user.assignedCompanies)
      .find((assignment) => assignment.companyId === companyId);

    const companyNames: Record<string, string> = {
      'medussa-holding': 'Medussa Holding',
      'medussa-retail': 'Medussa Retail',
      'medussa-industrial': 'Medussa Industrial',
      'medussa-services': 'Medussa Services',
    };

    return (
      existingAssignment?.companyName ??
      companyNames[companyId] ??
      companyId
    );
  }
}