import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import {
  createEmptyPermissionActionSet,
  SECURITY_PERMISSION_MODULES,
} from '../mocks/security-administration.mock';
import {
  ModulePermissionVm,
  PermissionActionKey,
  ProfileDetailVm,
  ProfileFormValue,
  ProfileRowVm,
  RoleFormValue,
  RoleRowVm,
  SecurityListFilters,
  SecurityRecordStatus,
  UserCompanyAssignmentVm,
  UserFormValue,
  UserRowVm,
} from '../models/security-administration.model';
import {
  normalizePermissionActionSet,
  SECURITY_REAL_PERMISSION_ACTION_KEYS,
  summarizeProfilePermissions,
} from '../utils/security-authorization.utils';
import { SecurityAdministrationMockRepository } from './security-administration-mock.repository';
import { SecurityAdministrationRepository } from './security-administration.repository';

interface BackendCompanyAssignmentDto {
  empresa_id: string;
  rol_id?: number | string | null;
  perfil_id?: number | string | null;
}

interface BackendUserDto {
  id: number | string;
  nombre?: string;
  apellido?: string;
  username?: string;
  email: string;
  cargo?: string;
  celular?: string;
  telefono?: string;
  telefono_fijo?: string;
  foto?: string;
  foto_url?: string;
  avatar_url?: string;
  imagen_url?: string;
  estado?: boolean;
  empresas?: BackendCompanyAssignmentDto[];
}

interface BackendRoleDto {
  id: number | string;
  nombre?: string;
  descripcion?: string;
  estado?: boolean;
  activo?: boolean;
  empresa_id?: string | null;
  global?: boolean;
}

interface BackendProfileDto {
  id: number | string;
  nombre?: string;
  descripcion?: string;
  estado?: boolean;
  activo?: boolean;
  empresa_id?: string | null;
  permisos?: string[];
}

interface BackendPermissionDto {
  id: number | string;
  codigo?: string;
  clave?: string;
  permiso?: string;
  modulo_accion?: string;
  nombre?: string;
  modulo?: string;
  modulo_nombre?: string;
  accion?: string;
}

const SECURITY_MODULE_LABELS: Record<string, string> = {
  usuarios: 'Usuarios',
  roles: 'Roles',
  perfiles: 'Perfiles',
  configuracion: 'Configuración',
  auditoria: 'Auditoría',
};

@Injectable({
  providedIn: 'root',
})
export class SecurityAdministrationApiRepository
  implements SecurityAdministrationRepository
{
  private readonly http = inject(HttpClient);
  private readonly authSessionService = inject(AuthSessionService);
  private readonly mockRepository = inject(SecurityAdministrationMockRepository);
  private readonly usersUrl = `${environment.apiUrl}/usuarios`;
  private readonly rolesUrl = `${environment.apiUrl}/roles`;
  private readonly profilesUrl = `${environment.apiUrl}/perfiles`;
  private readonly permissionsUrl = `${environment.apiUrl}/permisos`;

  listUsers(companyId: string, filters: SecurityListFilters): Observable<UserRowVm[]> {
    return this.withFallback(
      () =>
        forkJoin({
          users: this.fetchUsers(),
          roles: this.fetchRolesCatalog(companyId, true),
          profiles: this.fetchProfilesCatalog(companyId, true).pipe(
            map((profiles) => profiles.map((profile) => this.mapProfileRow(profile, companyId))),
          ),
        }).pipe(
          map(({ users, roles, profiles }) =>
            users
              .map((user) => this.mapUserRow(user, companyId, roles, profiles))
              .filter((user) => !!user.activeAssignment)
              .filter((user) => this.matchesUserFilters(user, filters))
              .sort((left, right) => left.name.localeCompare(right.name)),
          ),
        ),
      () => this.mockRepository.listUsers(companyId, filters),
    );
  }

  listRoles(companyId: string): Observable<RoleRowVm[]> {
    return this.withFallback(
      () =>
        this.fetchRolesCatalog(companyId, true).pipe(
          map((roles) =>
            roles
              .filter((role) => role.companyId === companyId && role.scope === 'company')
              .sort((left, right) => left.name.localeCompare(right.name)),
          ),
        ),
      () => this.mockRepository.listRoles(companyId),
    );
  }

  listRoleCatalogs(companyIds: string[]): Observable<Record<string, RoleRowVm[]>> {
    return this.withFallback(
      () => {
        if (!companyIds.length) {
          return of({});
        }

        return forkJoin(
          companyIds.map((companyId) =>
            this.fetchRolesCatalog(companyId, true).pipe(
              map(
                (roles) =>
                  [
                    companyId,
                    roles.filter(
                      (role) => role.companyId === companyId && role.scope === 'company',
                    ),
                  ] as const,
              ),
            ),
          ),
        ).pipe(
          map((entries) => Object.fromEntries(entries) as Record<string, RoleRowVm[]>),
        );
      },
      () => this.mockRepository.listRoleCatalogs(companyIds),
      'catalogo de roles',
    );
  }

  listProfileCatalogs(companyIds: string[]): Observable<Record<string, ProfileRowVm[]>> {
    return this.withFallback(
      () => {
        if (!companyIds.length) {
          return of({});
        }

        return forkJoin(
          companyIds.map((companyId) =>
            this.fetchProfilesCatalog(companyId, true).pipe(
              map(
                (profiles) =>
                  [
                    companyId,
                    profiles
                      .map((profile) => this.mapProfileRow(profile, companyId))
                      .sort((left, right) => left.name.localeCompare(right.name)),
                  ] as const,
              ),
            ),
          ),
        ).pipe(
          map((entries) => Object.fromEntries(entries) as Record<string, ProfileRowVm[]>),
        );
      },
      () => this.mockRepository.listProfileCatalogs(companyIds),
      'catalogo de perfiles',
    );
  }

  saveUser(
    companyId: string,
    payload: UserFormValue,
    userId?: string,
  ): Observable<UserRowVm> {
    const catalogCompanyIds = this.collectCatalogCompanyIds(
      companyId,
      payload.assignedCompanies.map((assignment) => assignment.companyId),
    );

    return this.withFallback(
      () =>
        forkJoin({
          roles: this.listRoleCatalogs(catalogCompanyIds),
          profiles: this.listProfileCatalogs(catalogCompanyIds),
        }).pipe(
          switchMap(({ roles, profiles }) => {
            this.validateUserReferences(payload, roles, profiles);
            const activeRoles = roles[companyId] ?? [];
            const activeProfiles = profiles[companyId] ?? [];

            if (!userId) {
              return this.http
                .post<BackendUserDto>(
                  this.withTrailingSlash(this.usersUrl),
                  this.buildCreateUserPayload(payload),
                )
                .pipe(
                  switchMap((createdUser) =>
                    this.loadUserRow(
                      this.resolveId(createdUser?.id, 'usuario'),
                      companyId,
                      activeRoles,
                      activeProfiles,
                    ),
                  ),
                );
            }

            return this.http
              .put<BackendUserDto>(
                `${this.withTrailingSlash(this.usersUrl)}${userId}`,
                this.buildUpdateUserPayload(payload),
              )
              .pipe(
                switchMap(() => this.loadUserRow(userId, companyId, activeRoles, activeProfiles)),
              );
          }),
        ),
      () => this.mockRepository.saveUser(companyId, payload, userId),
      'usuario',
    );
  }

  updateUserStatus(
    companyId: string,
    userId: string,
    status: SecurityRecordStatus,
  ): Observable<UserRowVm> {
    return this.withFallback(
      () =>
        forkJoin({
          roles: this.fetchRolesCatalog(companyId, true),
          profiles: this.fetchProfilesCatalog(companyId, true).pipe(
            map((profiles) => profiles.map((profile) => this.mapProfileRow(profile, companyId))),
          ),
        }).pipe(
          switchMap(({ roles, profiles }) =>
            this.http
              .put<void>(`${this.withTrailingSlash(this.usersUrl)}${userId}`, {
                estado: status === 'active',
              })
              .pipe(switchMap(() => this.loadUserRow(userId, companyId, roles, profiles))),
          ),
        ),
      () => this.mockRepository.updateUserStatus(companyId, userId, status),
      'usuario',
    );
  }

  saveRole(
    companyId: string,
    payload: RoleFormValue,
    roleId?: string,
  ): Observable<RoleRowVm> {
    return this.withFallback(
      () => {
        const requestBody = {
          nombre: payload.name.trim(),
          descripcion: payload.description.trim(),
          estado: payload.status === 'active',
        };

        if (roleId) {
          return this.http
            .put<void>(`${this.withTrailingSlash(this.rolesUrl)}${roleId}`, requestBody)
            .pipe(switchMap(() => this.loadRoleById(companyId, roleId)));
        }

        return this.http
          .post<BackendRoleDto>(this.withTrailingSlash(this.rolesUrl), requestBody)
          .pipe(
            switchMap((createdRole) => {
              const createdRoleId = this.resolveId(createdRole?.id, 'rol');

              if (payload.status === 'inactive') {
                return this.http
                  .delete<void>(`${this.withTrailingSlash(this.rolesUrl)}${createdRoleId}`)
                  .pipe(switchMap(() => this.loadRoleById(companyId, createdRoleId)));
              }

              return this.loadRoleById(companyId, createdRoleId);
            }),
          );
      },
      () => this.mockRepository.saveRole(companyId, payload, roleId),
      'rol',
    );
  }

  updateRoleStatus(
    companyId: string,
    roleId: string,
    status: SecurityRecordStatus,
  ): Observable<RoleRowVm> {
    return this.withFallback(
      () => {
        const request$ =
          status === 'inactive'
            ? this.http.delete<void>(`${this.withTrailingSlash(this.rolesUrl)}${roleId}`)
            : this.http.put<void>(`${this.withTrailingSlash(this.rolesUrl)}${roleId}`, {
                estado: true,
              });

        return request$.pipe(switchMap(() => this.loadRoleById(companyId, roleId)));
      },
      () => this.mockRepository.updateRoleStatus(companyId, roleId, status),
      'rol',
    );
  }

  listProfiles(companyId: string, filters: SecurityListFilters): Observable<ProfileRowVm[]> {
    return this.withFallback(
      () =>
        this.fetchProfilesCatalog(companyId, true).pipe(
          map((profiles) =>
            profiles
              .map((profile) => this.mapProfileRow(profile, companyId))
              .filter((profile) => this.matchesProfileFilters(profile, filters))
              .sort((left, right) => left.name.localeCompare(right.name)),
          ),
        ),
      () => this.mockRepository.listProfiles(companyId, filters),
    );
  }

  getProfile(companyId: string, profileId: string): Observable<ProfileDetailVm> {
    return this.withFallback(
      () =>
        forkJoin({
          profiles: this.fetchProfilesCatalog(companyId, true),
          permissionCatalog: this.fetchPermissionsCatalog().pipe(catchError(() => of([]))),
        }).pipe(
          map(({ profiles, permissionCatalog }) => {
            const profile = profiles.find(
              (candidate) => this.resolveId(candidate.id, 'perfil') === profileId,
            );

            if (!profile) {
              throw new Error('No se encontró el perfil solicitado.');
            }

            return this.mapProfileDetail(profile, companyId, permissionCatalog);
          }),
        ),
      () => this.mockRepository.getProfile(companyId, profileId),
      'perfil',
    );
  }

  saveProfile(
    companyId: string,
    payload: ProfileFormValue,
    profileId?: string,
  ): Observable<ProfileDetailVm> {
    const hasEnabledPermissions = payload.permissions.some((permission) =>
      Object.values(permission.actions).some(Boolean),
    );

    return this.withFallback(
      () =>
        this.fetchPermissionsCatalog().pipe(
          switchMap((permissionCatalog) => {
            if (!profileId && !hasEnabledPermissions) {
              throw new Error('Debes activar al menos un permiso para guardar el perfil.');
            }

            const permissionIds = hasEnabledPermissions
              ? this.resolvePermissionIds(payload.permissions, permissionCatalog)
              : [];
            const requestBody = {
              nombre: payload.name.trim(),
              descripcion: payload.description.trim(),
              estado: payload.status === 'active',
            };

            const profileRequest$ = profileId
              ? this.http.put<void>(`${this.withTrailingSlash(this.profilesUrl)}${profileId}`, requestBody).pipe(map(() => profileId))
              : this.http
                  .post<BackendProfileDto>(this.withTrailingSlash(this.profilesUrl), requestBody)
                  .pipe(
                    map((createdProfile) => this.resolveId(createdProfile?.id, 'perfil')),
                  );

            return profileRequest$.pipe(
              switchMap((resolvedProfileId) => {
                if (!hasEnabledPermissions) {
                  return of(resolvedProfileId);
                }

                return this.http
                  .post<void>(
                    `${this.withTrailingSlash(this.profilesUrl)}${resolvedProfileId}/permisos`,
                    { permisos_ids: permissionIds },
                  )
                  .pipe(map(() => resolvedProfileId));
              }),
              switchMap((resolvedProfileId) => {
                if (payload.status === 'active') {
                  return of(resolvedProfileId);
                }

                return this.http
                  .delete<void>(`${this.withTrailingSlash(this.profilesUrl)}${resolvedProfileId}`)
                  .pipe(map(() => resolvedProfileId));
              }),
              switchMap((resolvedProfileId) =>
                this.loadProfileById(companyId, resolvedProfileId, permissionCatalog),
              ),
            );
          }),
        ),
      () => this.mockRepository.saveProfile(companyId, payload, profileId),
      'perfil',
    );
  }

  updateProfileStatus(
    companyId: string,
    profileId: string,
    status: SecurityRecordStatus,
  ): Observable<ProfileDetailVm> {
    return this.withFallback(
      () =>
        this.fetchPermissionsCatalog().pipe(
          catchError(() => of([])),
          switchMap((permissionCatalog) => {
        const request$ =
          status === 'inactive'
            ? this.http.delete<void>(`${this.withTrailingSlash(this.profilesUrl)}${profileId}`)
            : this.http.put<void>(`${this.withTrailingSlash(this.profilesUrl)}${profileId}`, {
                estado: true,
              });

            return request$.pipe(
              switchMap(() => this.loadProfileById(companyId, profileId, permissionCatalog)),
            );
          }),
        ),
      () => this.mockRepository.updateProfileStatus(companyId, profileId, status),
      'perfil',
    );
  }

  listPermissionModules(): Observable<ModulePermissionVm[]> {
    return this.withFallback(
      () =>
        this.fetchPermissionsCatalog().pipe(
          map((permissions) => this.buildPermissionModules([], permissions)),
        ),
      () => this.mockRepository.listPermissionModules(),
    );
  }

  private fetchUsers(): Observable<BackendUserDto[]> {
    return this.http
      .get<unknown>(this.withTrailingSlash(this.usersUrl))
      .pipe(map((response) => this.extractArrayPayload<BackendUserDto>(response)));
  }

  private fetchUserDetail(userId: string): Observable<BackendUserDto> {
    return this.http.get<BackendUserDto>(`${this.withTrailingSlash(this.usersUrl)}${userId}`);
  }

  private fetchRolesCatalog(
    companyId: string,
    includeInactive: boolean,
  ): Observable<RoleRowVm[]> {
    return this.http
      .get<unknown>(
        this.withTrailingSlash(this.rolesUrl),
        this.buildScopedRequestOptions(companyId, includeInactive),
      )
      .pipe(
        map((response) =>
          this.extractArrayPayload<BackendRoleDto>(response)
            .map((role) => this.mapRoleRow(role, companyId))
            .sort((left, right) => left.name.localeCompare(right.name)),
        ),
      );
  }

  private fetchProfilesCatalog(
    companyId: string,
    includeInactive: boolean,
  ): Observable<BackendProfileDto[]> {
    return this.http
      .get<unknown>(
        this.withTrailingSlash(this.profilesUrl),
        this.buildScopedRequestOptions(companyId, includeInactive),
      )
      .pipe(map((response) => this.extractArrayPayload<BackendProfileDto>(response)));
  }

  private fetchPermissionsCatalog(): Observable<BackendPermissionDto[]> {
    return this.http
      .get<unknown>(this.withTrailingSlash(this.permissionsUrl))
      .pipe(map((response) => this.extractArrayPayload<BackendPermissionDto>(response)));
  }

  private loadUserRow(
    userId: string,
    companyId: string,
    roles: readonly RoleRowVm[],
    profiles: readonly ProfileRowVm[],
  ): Observable<UserRowVm> {
    return this.fetchUserDetail(userId).pipe(
      map((user) => this.mapUserRow(user, companyId, roles, profiles)),
    );
  }

  private loadRoleById(companyId: string, roleId: string): Observable<RoleRowVm> {
    return this.fetchRolesCatalog(companyId, true).pipe(
      map((roles) => {
        const role = roles.find(
          (candidate) =>
            candidate.id === roleId && candidate.companyId === companyId && candidate.scope === 'company',
        );

        if (!role) {
          throw new Error('No se encontró el rol solicitado.');
        }

        return role;
      }),
    );
  }

  private loadProfileById(
    companyId: string,
    profileId: string,
    permissionCatalog: readonly BackendPermissionDto[],
  ): Observable<ProfileDetailVm> {
    return this.fetchProfilesCatalog(companyId, true).pipe(
      map((profiles) => {
        const profile = profiles.find(
          (candidate) => this.resolveId(candidate.id, 'perfil') === profileId,
        );

        if (!profile) {
          throw new Error('No se encontró el perfil solicitado.');
        }

        return this.mapProfileDetail(profile, companyId, permissionCatalog);
      }),
    );
  }

  private mapUserRow(
    user: BackendUserDto,
    companyId: string,
    roles: readonly RoleRowVm[],
    profiles: readonly ProfileRowVm[],
  ): UserRowVm {
    const assignedCompanies = this.mapUserAssignments(user, companyId, roles, profiles);
    const activeAssignment = assignedCompanies.find(
      (assignment) => assignment.companyId === companyId,
    ) ?? null;

    return {
      userId: this.resolveId(user.id, 'usuario'),
      firstName: user.nombre?.trim() || 'Usuario',
      lastName: user.apellido?.trim() || '',
      name: this.composePersonName(user.nombre, user.apellido, user.email),
      position: user.cargo?.trim() || '',
      email: user.email.trim().toLowerCase(),
      mobilePhone: user.celular?.trim() || '',
      landlinePhone: user.telefono_fijo?.trim() || user.telefono?.trim() || '',
      photoUrl:
        user.foto_url?.trim() ||
        user.avatar_url?.trim() ||
        user.foto?.trim() ||
        user.imagen_url?.trim() ||
        null,
      status: this.resolveStatus(user.estado),
      assignedCompanies,
      activeAssignment,
      roleId: activeAssignment?.roleId ?? null,
      roleName: activeAssignment?.roleName ?? null,
      profileId: activeAssignment?.profileId ?? null,
      profileName: activeAssignment?.profileName ?? null,
    };
  }

  private mapRoleRow(role: BackendRoleDto, companyId: string): RoleRowVm {
    const isGlobal = role.global === true || role.empresa_id === null;

    return {
      id: this.resolveId(role.id, 'rol'),
      companyId: isGlobal ? null : companyId,
      name: role.nombre?.trim() || 'Rol sin nombre',
      description: role.descripcion?.trim() || '',
      status: this.resolveStatus(role.estado ?? role.activo),
      scope: isGlobal ? 'global' : 'company',
    };
  }

  private mapProfileRow(profile: BackendProfileDto, companyId: string): ProfileRowVm {
    const permissions = this.buildPermissionModules(profile.permisos ?? []);
    const summary = summarizeProfilePermissions(permissions);

    return {
      id: this.resolveId(profile.id, 'perfil'),
      companyId,
      name: profile.nombre?.trim() || 'Perfil sin nombre',
      description: profile.descripcion?.trim() || '',
      status: this.resolveStatus(profile.estado ?? profile.activo),
      modulesSummary: summary.modulesSummary,
      permissionsSummary: summary.permissionsSummary,
      permissionCount: summary.permissionCount,
    };
  }

  private mapProfileDetail(
    profile: BackendProfileDto,
    companyId: string,
    permissionCatalog: readonly BackendPermissionDto[] = [],
  ): ProfileDetailVm {
    return {
      ...this.mapProfileRow(profile, companyId),
      permissions: this.buildPermissionModules(profile.permisos ?? [], permissionCatalog),
    };
  }

  private buildPermissionModules(
    permissionCodes: readonly string[],
    permissionCatalog: readonly BackendPermissionDto[] = [],
  ): ModulePermissionVm[] {
    const fallbackModuleNames = new Map(
      SECURITY_PERMISSION_MODULES.map((module) => [module.key, module.name]),
    );
    const modules = new Map<string, ModulePermissionVm>(
      SECURITY_PERMISSION_MODULES.map((module) => [
        module.key,
        {
          moduleKey: module.key,
          moduleName: module.name,
          actions: createEmptyPermissionActionSet(),
        },
      ]),
    );

    permissionCatalog.forEach((permission) => {
      const parsedPermission = this.parsePermissionCode(this.resolvePermissionCode(permission));

      if (!parsedPermission) {
        return;
      }

      this.ensurePermissionModule(
        modules,
        parsedPermission.moduleKey,
        permission.modulo_nombre?.trim() ||
          permission.modulo?.trim() ||
          fallbackModuleNames.get(parsedPermission.moduleKey) ||
          this.humanizeModuleKey(parsedPermission.moduleKey),
      );
    });

    permissionCodes.forEach((permissionCode) => {
      const parsedPermission = this.parsePermissionCode(permissionCode);

      if (!parsedPermission) {
        return;
      }

      const permissionModule = this.ensurePermissionModule(
        modules,
        parsedPermission.moduleKey,
        fallbackModuleNames.get(parsedPermission.moduleKey) ||
          SECURITY_MODULE_LABELS[parsedPermission.moduleKey] ||
          this.humanizeModuleKey(parsedPermission.moduleKey),
      );

      permissionModule.actions[parsedPermission.action] = true;
    });

    return Array.from(modules.values())
      .map((permission) => ({
        ...permission,
        actions: normalizePermissionActionSet(permission.actions),
      }))
      .sort((left, right) => left.moduleName.localeCompare(right.moduleName));
  }

  private ensurePermissionModule(
    modules: Map<string, ModulePermissionVm>,
    moduleKey: string,
    moduleName: string,
  ): ModulePermissionVm {
    const currentModule = modules.get(moduleKey);

    if (currentModule) {
      return currentModule;
    }

    const nextModule: ModulePermissionVm = {
      moduleKey,
      moduleName,
      actions: createEmptyPermissionActionSet(),
    };

    modules.set(moduleKey, nextModule);
    return nextModule;
  }

  private parsePermissionCode(
    permissionCode?: string | null,
  ): { moduleKey: string; action: PermissionActionKey } | null {
    const normalizedCode = permissionCode?.trim();

    if (!normalizedCode || !normalizedCode.includes('_')) {
      return null;
    }

    const separatorIndex = normalizedCode.lastIndexOf('_');
    const moduleKey = normalizedCode.slice(0, separatorIndex);
    const actionKey = normalizedCode.slice(separatorIndex + 1) as PermissionActionKey;

    if (!moduleKey || !SECURITY_REAL_PERMISSION_ACTION_KEYS.includes(actionKey)) {
      return null;
    }

    return {
      moduleKey,
      action: actionKey,
    };
  }

  private resolvePermissionCode(permission: BackendPermissionDto): string | null {
    const candidates = [
      permission.codigo,
      permission.modulo_accion,
      permission.clave,
      permission.permiso,
    ];

    return candidates.find((candidate) => !!candidate?.trim())?.trim() ?? null;
  }

  private resolvePermissionIds(
    permissions: readonly ModulePermissionVm[],
    permissionCatalog: readonly BackendPermissionDto[],
  ): Array<number | string> {
    if (!permissionCatalog.length) {
      throw new HttpErrorResponse({
        status: 404,
        statusText: 'Permission catalog unavailable',
      });
    }

    const permissionIdMap = new Map<string, number | string>();

    permissionCatalog.forEach((permission) => {
      const permissionCode = this.resolvePermissionCode(permission);

      if (!permissionCode) {
        return;
      }

      permissionIdMap.set(permissionCode, permission.id);
    });

    const requestedCodes = permissions.flatMap((permission) =>
      SECURITY_REAL_PERMISSION_ACTION_KEYS.filter(
        (action) => permission.actions[action],
      ).map((action) => `${permission.moduleKey}_${action}`),
    );

    const missingCodes = requestedCodes.filter((permissionCode) => !permissionIdMap.has(permissionCode));

    if (missingCodes.length) {
      throw new Error(
        `No fue posible resolver los permisos del backend para: ${missingCodes.join(', ')}.`,
      );
    }

    return requestedCodes
      .map((permissionCode) => permissionIdMap.get(permissionCode))
      .filter((permissionId): permissionId is number | string => permissionId !== undefined);
  }

  private buildCreateUserPayload(payload: UserFormValue): Record<string, unknown> {
    const normalizedEmail = payload.email.trim().toLowerCase();

    return {
      nombre: payload.firstName.trim(),
      apellido: payload.lastName.trim(),
      username: this.buildUsername(
        normalizedEmail,
        `${payload.firstName.trim()} ${payload.lastName.trim()}`,
      ),
      email: normalizedEmail,
      password: 'TempMedussa123!',
      cargo: payload.position.trim(),
      celular: payload.mobilePhone.trim(),
      telefono_fijo: payload.landlinePhone.trim() || undefined,
      foto_url: payload.photoUrl ?? undefined,
      estado: payload.status === 'active',
      empresas: payload.assignedCompanies.map((assignment) =>
        this.buildCompanyAssignment(assignment.companyId, assignment.roleId, assignment.profileId),
      ),
    };
  }

  private buildUpdateUserPayload(payload: UserFormValue): Record<string, unknown> {
    return {
      nombre: payload.firstName.trim(),
      apellido: payload.lastName.trim(),
      email: payload.email.trim().toLowerCase(),
      cargo: payload.position.trim(),
      celular: payload.mobilePhone.trim(),
      telefono_fijo: payload.landlinePhone.trim() || undefined,
      foto_url: payload.photoUrl ?? undefined,
      estado: payload.status === 'active',
      empresas: payload.assignedCompanies.map((assignment) =>
        this.buildCompanyAssignment(assignment.companyId, assignment.roleId, assignment.profileId),
      ),
    };
  }

  private buildCompanyAssignment(
    companyId: string,
    roleId: string | null,
    profileId: string | null,
  ): BackendCompanyAssignmentDto {
    return {
      empresa_id: this.resolveRequestCompanyId(companyId),
      rol_id: this.toBackendId(roleId),
      perfil_id: this.toBackendId(profileId),
    };
  }

  private validateUserReferences(
    payload: UserFormValue,
    roleCatalogs: Record<string, RoleRowVm[]>,
    profileCatalogs: Record<string, ProfileRowVm[]>,
  ): void {
    if (!payload.firstName.trim()) {
      throw new Error('El nombre es obligatorio.');
    }

    if (!payload.lastName.trim()) {
      throw new Error('El apellido es obligatorio.');
    }

    if (!payload.position.trim()) {
      throw new Error('El cargo es obligatorio.');
    }

    if (!payload.email.trim()) {
      throw new Error('El correo es obligatorio.');
    }

    if (!payload.assignedCompanies.length) {
      throw new Error('Debes asignar al menos una empresa al usuario.');
    }

    const uniqueCompanyIds = new Set(payload.assignedCompanies.map((assignment) => assignment.companyId));

    if (uniqueCompanyIds.size !== payload.assignedCompanies.length) {
      throw new Error('No puedes repetir una empresa dentro de las asignaciones del usuario.');
    }

    payload.assignedCompanies.forEach((assignment) => {
      if (!assignment.roleId) {
        throw new Error('Cada empresa asignada debe tener un rol.');
      }

      if (!assignment.profileId) {
        throw new Error('Cada empresa asignada debe tener un perfil de acceso.');
      }

      if (!roleCatalogs[assignment.companyId]?.some((role) => role.id === assignment.roleId)) {
        throw new Error('Selecciona un rol valido para la empresa asignada.');
      }

      if (
        !profileCatalogs[assignment.companyId]?.some(
          (profile) => profile.id === assignment.profileId,
        )
      ) {
        throw new Error('Selecciona un perfil valido para la empresa asignada.');
      }
    });
  }

  private mapUserAssignments(
    user: BackendUserDto,
    activeCompanyId: string,
    roles: readonly RoleRowVm[],
    profiles: readonly ProfileRowVm[],
  ): UserCompanyAssignmentVm[] {
    return (user.empresas ?? []).map((assignment) => {
      const resolvedCompanyId = this.resolveFrontendCompanyId(assignment.empresa_id);
      const roleId = this.resolveOptionalId(assignment.rol_id);
      const profileId = this.resolveOptionalId(assignment.perfil_id);
      const isActiveCompanyAssignment = resolvedCompanyId === activeCompanyId;

      return {
        companyId: resolvedCompanyId,
        companyName: this.resolveCompanyName(resolvedCompanyId),
        roleId,
        roleName: isActiveCompanyAssignment
          ? roles.find((role) => role.id === roleId)?.name ?? null
          : null,
        profileId,
        profileName: isActiveCompanyAssignment
          ? profiles.find((profile) => profile.id === profileId)?.name ?? null
          : null,
      };
    });
  }

  private matchesUserFilters(user: UserRowVm, filters: SecurityListFilters): boolean {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const matchesStatus = filters.status === 'all' || user.status === filters.status;

    if (!normalizedSearch) {
      return matchesStatus;
    }

    return (
      matchesStatus &&
      [
        user.name,
        user.email,
        user.position,
        user.roleName ?? '',
        user.profileName ?? '',
        ...user.assignedCompanies.map((assignment) => assignment.companyName),
      ]
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }

  private matchesProfileFilters(
    profile: ProfileRowVm,
    filters: SecurityListFilters,
  ): boolean {
    const normalizedSearch = filters.search.trim().toLowerCase();
    const matchesStatus = filters.status === 'all' || profile.status === filters.status;

    if (!normalizedSearch) {
      return matchesStatus;
    }

    return (
      matchesStatus &&
      [
        profile.name,
        profile.description ?? '',
        ...(profile.modulesSummary ?? []),
        ...(profile.permissionsSummary ?? []),
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }

  private resolveStatus(value: unknown): SecurityRecordStatus {
    return value === false || value === 0 || value === 'inactive' ? 'inactive' : 'active';
  }

  private composePersonName(
    firstName?: string,
    lastName?: string,
    email?: string,
  ): string {
    const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ').trim();

    return fullName || email?.split('@')[0] || 'Usuario sin nombre';
  }

  private buildUsername(email: string, fullName: string): string {
    const emailPrefix = email.split('@')[0]?.trim();

    if (emailPrefix) {
      return emailPrefix;
    }

    return fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'usuario';
  }

  private extractArrayPayload<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) {
      return payload as T[];
    }

    if (payload && typeof payload === 'object') {
      const candidate = payload as {
        items?: unknown[];
        results?: unknown[];
        data?: unknown[];
      };

      if (Array.isArray(candidate.items)) {
        return candidate.items as T[];
      }

      if (Array.isArray(candidate.results)) {
        return candidate.results as T[];
      }

      if (Array.isArray(candidate.data)) {
        return candidate.data as T[];
      }
    }

    return [];
  }

  private buildInactiveParams(includeInactive: boolean): HttpParams | undefined {
    return includeInactive
      ? new HttpParams().set('incluir_inactivos', 'true')
      : undefined;
  }

  private buildScopedRequestOptions(
    companyId: string,
    includeInactive: boolean,
  ): { headers: HttpHeaders; params?: HttpParams } {
    return {
      headers: new HttpHeaders({
        'X-Company-ID': this.resolveRequestCompanyId(companyId),
      }),
      params: this.buildInactiveParams(includeInactive),
    };
  }

  private withTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }

  private resolveId(value: unknown, label: string): string {
    if (value === null || value === undefined || value === '') {
      throw new Error(`El backend no devolvió un identificador válido para ${label}.`);
    }

    return String(value);
  }

  private resolveOptionalId(value: unknown): string | null {
    return value === null || value === undefined || value === '' ? null : String(value);
  }

  private toBackendId(value: string | null): number | string | null {
    if (!value) {
      return null;
    }

    return /^\d+$/.test(value) ? Number(value) : value;
  }

  private humanizeModuleKey(moduleKey: string): string {
    return moduleKey
      .split(/[_-]+/)
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
      .join(' ');
  }

  private matchesRequestedCompanyId(
    backendCompanyId: string | null | undefined,
    companyId: string,
  ): boolean {
    return this.resolveFrontendCompanyId(backendCompanyId) === companyId;
  }

  private resolveFrontendCompanyId(backendCompanyId: string | null | undefined): string {
    const normalizedBackendCompanyId = backendCompanyId?.trim();

    if (!normalizedBackendCompanyId) {
      return '';
    }

    const company = this.authSessionService
      .getSession()
      ?.companies?.find(
        (candidate) =>
          candidate.backendId === normalizedBackendCompanyId || candidate.id === normalizedBackendCompanyId,
      );

    return company?.id ?? normalizedBackendCompanyId;
  }

  private collectCatalogCompanyIds(activeCompanyId: string, companyIds: string[]): string[] {
    return Array.from(new Set([activeCompanyId, ...companyIds.filter(Boolean)]));
  }

  private resolveCompanyName(companyId: string): string {
    return (
      this.authSessionService.getSession()?.companies?.find((company) => company.id === companyId)?.name ??
      companyId
    );
  }

  private resolveRequestCompanyId(companyId: string): string {
    const session = this.authSessionService.getSession();
    const company = session?.companies?.find((candidate) => candidate.id === companyId);

    if (company?.backendId) {
      return company.backendId;
    }

    if (session?.activeCompanyId === companyId && session.activeBackendCompanyId) {
      return session.activeBackendCompanyId;
    }

    return companyId;
  }

  private withFallback<T>(
    apiOperation: () => Observable<T>,
    mockOperation: () => Observable<T>,
    resourceLabel?: string,
  ): Observable<T> {
    return apiOperation().pipe(
      catchError((error: unknown) => {
        // Temporary fallback while security endpoints are progressively deployed in another branch.
        if (environment.enableSecurityAdministrationFallback && this.shouldFallbackToMock(error)) {
          return mockOperation();
        }

        return throwError(() => this.mapHttpError(error, resourceLabel));
      }),
    );
  }

  private shouldFallbackToMock(error: unknown): boolean {
    const status = (error as HttpErrorResponse)?.status;

    return status === 0 || status === 404 || status === 405 || status === 501 || status === 502 || status === 503 || status === 504;
  }

  private mapHttpError(error: unknown, resourceLabel = 'registro'): Error {
    if (!(error instanceof HttpErrorResponse)) {
      return error instanceof Error ? error : new Error(`No fue posible procesar ${resourceLabel}.`);
    }

    if (error.status === 409) {
      return new Error(
        resourceLabel === 'usuario'
          ? 'Ya existe un usuario con ese correo registrado.'
          : `Ya existe un ${resourceLabel} con esa información.`,
      );
    }

    if (error.status === 400) {
      return new Error(
        this.extractBackendDetail(error) ||
          'El backend rechazó la solicitud. Revisa empresa, rol y perfil seleccionados.',
      );
    }

    if (error.status === 403) {
      return new Error('No tienes permisos sobre la empresa activa o el acceso fue denegado por el backend.');
    }

    if (error.status === 422) {
      return new Error(
        this.extractValidationDetail(error) ||
          'El backend reportó errores de validación en los campos enviados.',
      );
    }

    return new Error(
      this.extractBackendDetail(error) ||
        `No fue posible completar la operación de ${resourceLabel}.`,
    );
  }

  private extractBackendDetail(error: HttpErrorResponse): string | null {
    if (typeof error.error?.detail === 'string') {
      return error.error.detail;
    }

    if (typeof error.error?.message === 'string') {
      return error.error.message;
    }

    return null;
  }

  private extractValidationDetail(error: HttpErrorResponse): string | null {
    const detail = error.error?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (!Array.isArray(detail)) {
      return null;
    }

    return detail
      .map((entry) => {
        const location = Array.isArray(entry?.loc) ? entry.loc.join('.') : 'campo';
        const message = typeof entry?.msg === 'string' ? entry.msg : 'valor inválido';
        return `${location}: ${message}`;
      })
      .join(' | ');
  }
}