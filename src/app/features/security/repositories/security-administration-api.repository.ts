import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../auth/services/auth-session.service';
import {
  buildPermissionMatrix,
  createEmptyPermissionActionSet,
  SECURITY_PERMISSION_MODULES,
} from '../mocks/security-administration.mock';
import {
  PerfilBackendResponse,
  PerfilCreateBackendRequest,
  PerfilUpdateBackendRequest,
  RolBackendResponse,
  RolCreateBackendRequest,
  RolUpdateBackendRequest,
  UsuarioBackendListItem,
  UsuarioCreateBackendRequest,
  UsuarioDetalleBackendResponse,
  UsuarioEmpresaBackendMembership,
} from '../models/security-backend.model';
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

const SECURITY_MODULE_LABELS: Record<string, string> = {
  usuarios: 'Usuarios',
  roles: 'Roles',
  perfiles: 'Perfiles',
  configuracion: 'Configuración',
  auditoria: 'Auditoría',
};

interface UserShadowRecord {
  userId: string;
  row: UserRowVm;
  deletedRemotely: boolean;
  updatedAt: string;
}

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
  private readonly rolesUrl = `${environment.apiUrl}/seguridad/roles`;
  private readonly profilesUrl = `${environment.apiUrl}/seguridad/empresas`;
  private readonly userShadowStorageKey = 'medussa.erp.security.user-shadow';

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
            this.mergeUserRowsWithShadow(
              companyId,
              users
                .map((user) => this.mapUserRow(user, companyId, roles, profiles))
                .filter((user) => !!user.activeAssignment),
            )
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
        ).pipe(map((entries) => Object.fromEntries(entries) as Record<string, RoleRowVm[]>));
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
        ).pipe(map((entries) => Object.fromEntries(entries) as Record<string, ProfileRowVm[]>));
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
                .post<UsuarioBackendListItem>(
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

            return this.fetchUserDetail(userId).pipe(
              map((user) => this.mapUserRow(user, companyId, activeRoles, activeProfiles)),
              catchError(() =>
                of(
                  this.buildUserRowFromPayload(
                    userId,
                    companyId,
                    payload,
                    roles,
                    profiles,
                  ),
                ),
              ),
              map((currentUser) =>
                this.buildUserRowFromPayload(
                  userId,
                  companyId,
                  payload,
                  roles,
                  profiles,
                  currentUser,
                ),
              ),
              map((shadowRow) => {
                this.upsertUserShadow(shadowRow, false);
                return shadowRow;
              }),
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
      () => {
        if (status === 'active') {
          const shadow = this.getUserShadow(userId);

          if (shadow) {
            const restoredRow: UserRowVm = {
              ...shadow.row,
              status: 'active',
            };

            this.upsertUserShadow(restoredRow, false);
            return of(restoredRow);
          }

          return forkJoin({
            roles: this.fetchRolesCatalog(companyId, true),
            profiles: this.fetchProfilesCatalog(companyId, true).pipe(
              map((profiles) => profiles.map((profile) => this.mapProfileRow(profile, companyId))),
            ),
          }).pipe(
            switchMap(({ roles, profiles }) => this.loadUserRow(userId, companyId, roles, profiles)),
          );
        }

        return forkJoin({
          roles: this.fetchRolesCatalog(companyId, true),
          profiles: this.fetchProfilesCatalog(companyId, true).pipe(
            map((profiles) => profiles.map((profile) => this.mapProfileRow(profile, companyId))),
          ),
        }).pipe(
          switchMap(({ roles, profiles }) =>
            this.loadUserRow(userId, companyId, roles, profiles).pipe(
              switchMap((currentUser) =>
                this.http
                  .delete<void>(`${this.withTrailingSlash(this.usersUrl)}${userId}`)
                  .pipe(
                    map(() => {
                      const inactiveUser: UserRowVm = {
                        ...currentUser,
                        status: 'inactive',
                      };

                      this.upsertUserShadow(inactiveUser, true);
                      return inactiveUser;
                    }),
                  ),
              ),
            ),
          ),
        );
      },
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
        const requestBody = this.buildRolePayload(companyId, payload);

        if (roleId) {
          return this.http
            .put<void>(`${this.withTrailingSlash(this.rolesUrl)}${roleId}`, requestBody)
            .pipe(switchMap(() => this.loadRoleById(companyId, roleId)));
        }

        return this.http
          .post<RolBackendResponse>(this.withTrailingSlash(this.rolesUrl), requestBody)
          .pipe(
            switchMap((createdRole) =>
              this.loadRoleById(companyId, this.resolveId(createdRole?.id, 'rol')),
            ),
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
        if (status === 'inactive') {
          return this.http
            .delete<void>(`${this.withTrailingSlash(this.rolesUrl)}${roleId}`)
            .pipe(map(() => this.buildInactiveRoleFallback(companyId, roleId)));
        }

        return this.loadRoleById(companyId, roleId).pipe(
          switchMap((role) =>
            this.http
              .put<void>(
                `${this.withTrailingSlash(this.rolesUrl)}${roleId}`,
                this.buildRolePayload(companyId, {
                  name: role.name,
                  description: role.description ?? '',
                  status,
                }),
              )
              .pipe(switchMap(() => this.loadRoleById(companyId, roleId))),
          ),
        );
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
        this.fetchProfilesCatalog(companyId, true).pipe(
          map((profiles) => {
            const profile = profiles.find(
              (candidate) => this.resolveId(candidate.id, 'perfil') === profileId,
            );

            if (!profile) {
              throw new Error('No se encontró el perfil solicitado.');
            }

            return this.mapProfileDetail(profile, companyId);
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
    return this.withFallback(
      () => {
        const requestBody = this.buildProfilePayload(companyId, payload);

        if (profileId) {
          return this.http
            .put<void>(
              `${this.getProfilesByCompanyUrl(companyId)}/${profileId}`,
              requestBody,
            )
            .pipe(switchMap(() => this.loadProfileById(companyId, profileId)));
        }

        return this.http
          .post<PerfilBackendResponse>(this.getProfilesByCompanyUrl(companyId), requestBody)
          .pipe(
            switchMap((createdProfile) =>
              this.loadProfileById(companyId, this.resolveId(createdProfile?.id, 'perfil')),
            ),
          );
      },
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
      () => {
        if (status === 'inactive') {
          return this.http
            .delete<void>(`${this.getProfilesByCompanyUrl(companyId)}/${profileId}`)
            .pipe(map(() => this.buildInactiveProfileFallback(companyId, profileId)));
        }

        return this.loadProfileById(companyId, profileId).pipe(
          switchMap((profile) =>
            this.http
              .put<void>(
                `${this.getProfilesByCompanyUrl(companyId)}/${profileId}`,
                this.buildProfilePayload(companyId, {
                  name: profile.name,
                  description: profile.description ?? '',
                  status,
                  permissions: profile.permissions,
                }),
              )
              .pipe(switchMap(() => this.loadProfileById(companyId, profileId))),
          ),
        );
      },
      () => this.mockRepository.updateProfileStatus(companyId, profileId, status),
      'perfil',
    );
  }

  listPermissionModules(): Observable<ModulePermissionVm[]> {
    return of(
      buildPermissionMatrix().map((permission) => ({
        ...permission,
        actions: normalizePermissionActionSet(permission.actions),
      })),
    );
  }

  private fetchUsers(): Observable<UsuarioBackendListItem[]> {
    return this.http
      .get<unknown>(this.withTrailingSlash(this.usersUrl))
      .pipe(map((response) => this.extractArrayPayload<UsuarioBackendListItem>(response)));
  }

  private fetchUserDetail(userId: string): Observable<UsuarioDetalleBackendResponse> {
    return this.http.get<UsuarioDetalleBackendResponse>(`${this.withTrailingSlash(this.usersUrl)}${userId}`);
  }

  private fetchRolesCatalog(
    companyId: string,
    includeInactive: boolean,
  ): Observable<RoleRowVm[]> {
    return this.http
      .get<unknown>(`${this.withTrailingSlash(this.rolesUrl)}empresa/${this.resolveRequestCompanyId(companyId)}`)
      .pipe(
        map((response) =>
          this.extractArrayPayload<RolBackendResponse>(response)
            .map((role) => this.mapRoleRow(role, companyId))
            .filter((role) => includeInactive || role.status === 'active')
            .sort((left, right) => left.name.localeCompare(right.name)),
        ),
      );
  }

  private fetchProfilesCatalog(
    companyId: string,
    includeInactive: boolean,
  ): Observable<PerfilBackendResponse[]> {
    return this.http
      .get<unknown>(this.getProfilesByCompanyUrl(companyId))
      .pipe(
        map((response) =>
          this.extractArrayPayload<PerfilBackendResponse>(response).filter((profile) =>
            includeInactive ? true : this.resolveStatus(profile.estado ?? profile.activo) === 'active',
          ),
        ),
      );
  }

  private getProfilesByCompanyUrl(companyId: string): string {
    return `${this.withTrailingSlash(this.profilesUrl)}${this.resolveRequestCompanyId(companyId)}/perfiles`;
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

  private loadProfileById(companyId: string, profileId: string): Observable<ProfileDetailVm> {
    return this.fetchProfilesCatalog(companyId, true).pipe(
      map((profiles) => {
        const profile = profiles.find(
          (candidate) => this.resolveId(candidate.id, 'perfil') === profileId,
        );

        if (!profile) {
          throw new Error('No se encontró el perfil solicitado.');
        }

        return this.mapProfileDetail(profile, companyId);
      }),
    );
  }

  private mapUserRow(
    user: UsuarioBackendListItem,
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

  private mapRoleRow(role: RolBackendResponse, companyId: string): RoleRowVm {
    const resolvedCompanyId = role.empresa_id
      ? this.resolveFrontendCompanyId(role.empresa_id)
      : companyId;

    return {
      id: this.resolveId(role.id, 'rol'),
      companyId: resolvedCompanyId,
      name: role.nombre?.trim() || 'Rol sin nombre',
      description: role.descripcion?.trim() || '',
      status: this.resolveStatus(role.estado ?? role.activo),
      scope: 'company',
    };
  }

  private mapProfileRow(profile: PerfilBackendResponse, companyId: string): ProfileRowVm {
    const permissions = this.buildPermissionModules(profile.permisos);
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
    profile: PerfilBackendResponse,
    companyId: string,
  ): ProfileDetailVm {
    return {
      ...this.mapProfileRow(profile, companyId),
      permissions: this.buildPermissionModules(profile.permisos),
    };
  }

  private buildPermissionModules(permissionSource: unknown): ModulePermissionVm[] {
    const modules = new Map<string, ModulePermissionVm>(
      buildPermissionMatrix().map((module) => [module.moduleKey, {
        ...module,
        actions: normalizePermissionActionSet(module.actions),
      }]),
    );

    const applyAction = (moduleKey: string, action: PermissionActionKey, enabled: boolean): void => {
      const normalizedModuleKey = moduleKey.trim().toLowerCase();

      if (!normalizedModuleKey) {
        return;
      }

      const currentModule = modules.get(normalizedModuleKey) ?? {
        moduleKey: normalizedModuleKey,
        moduleName:
          SECURITY_MODULE_LABELS[normalizedModuleKey] ??
          SECURITY_PERMISSION_MODULES.find((module) => module.key === normalizedModuleKey)?.name ??
          this.humanizeModuleKey(normalizedModuleKey),
        actions: createEmptyPermissionActionSet(),
      };

      currentModule.actions[action] = enabled;
      modules.set(normalizedModuleKey, currentModule);
    };

    const applyFromEntry = (entry: unknown): void => {
      if (!entry) {
        return;
      }

      if (typeof entry === 'string') {
        const parsedPermission = this.parsePermissionCode(entry);

        if (parsedPermission) {
          applyAction(parsedPermission.moduleKey, parsedPermission.action, true);
        }

        return;
      }

      if (Array.isArray(entry)) {
        entry.forEach((item) => applyFromEntry(item));
        return;
      }

      if (typeof entry !== 'object') {
        return;
      }

      const permissionObject = entry as Record<string, unknown>;
      const moduleKeyCandidate =
        typeof permissionObject['modulo'] === 'string'
          ? permissionObject['modulo']
          : typeof permissionObject['module'] === 'string'
            ? permissionObject['module']
            : null;
      const actionCandidate =
        typeof permissionObject['accion'] === 'string'
          ? permissionObject['accion']
          : typeof permissionObject['action'] === 'string'
            ? permissionObject['action']
            : null;

      if (moduleKeyCandidate && actionCandidate) {
        const normalizedAction = actionCandidate.trim().toLowerCase() as PermissionActionKey;

        if (SECURITY_REAL_PERMISSION_ACTION_KEYS.includes(normalizedAction)) {
          applyAction(moduleKeyCandidate, normalizedAction, true);
          return;
        }
      }

      Object.entries(permissionObject).forEach(([moduleKey, value]) => {
        if (Array.isArray(value)) {
          value.forEach((actionValue) => {
            if (typeof actionValue !== 'string') {
              return;
            }

            const normalizedAction = actionValue.trim().toLowerCase() as PermissionActionKey;

            if (SECURITY_REAL_PERMISSION_ACTION_KEYS.includes(normalizedAction)) {
              applyAction(moduleKey, normalizedAction, true);
            }
          });
          return;
        }

        if (value && typeof value === 'object') {
          Object.entries(value as Record<string, unknown>).forEach(([actionKey, enabled]) => {
            const normalizedAction = actionKey.trim().toLowerCase() as PermissionActionKey;

            if (SECURITY_REAL_PERMISSION_ACTION_KEYS.includes(normalizedAction)) {
              applyAction(moduleKey, normalizedAction, !!enabled);
            }
          });
        }
      });
    };

    applyFromEntry(permissionSource);

    return Array.from(modules.values())
      .map((permission) => ({
        ...permission,
        actions: normalizePermissionActionSet(permission.actions),
      }))
      .sort((left, right) => left.moduleName.localeCompare(right.moduleName));
  }

  private parsePermissionCode(
    permissionCode?: string | null,
  ): { moduleKey: string; action: PermissionActionKey } | null {
    const normalizedCode = permissionCode?.trim();

    if (!normalizedCode || !normalizedCode.includes('_')) {
      return null;
    }

    const separatorIndex = normalizedCode.lastIndexOf('_');
    const moduleKey = normalizedCode.slice(0, separatorIndex).toLowerCase();
    const actionKey = normalizedCode.slice(separatorIndex + 1).toLowerCase() as PermissionActionKey;

    if (!moduleKey || !SECURITY_REAL_PERMISSION_ACTION_KEYS.includes(actionKey)) {
      return null;
    }

    return {
      moduleKey,
      action: actionKey,
    };
  }

  private serializePermissionMatrix(
    permissions: readonly ModulePermissionVm[],
  ): Record<string, string[]> {
    return Object.fromEntries(
      permissions
        .map((permission) => [
          permission.moduleKey,
          SECURITY_REAL_PERMISSION_ACTION_KEYS.filter((action) => permission.actions[action]),
        ] as const)
        .filter(([, actions]) => actions.length > 0),
    );
  }

  private buildCreateUserPayload(payload: UserFormValue): UsuarioCreateBackendRequest {
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
      empresas: payload.assignedCompanies.map((assignment) =>
        this.buildCompanyAssignment(assignment.companyId, assignment.roleId, assignment.profileId),
      ),
    };
  }

  private buildRolePayload(
    companyId: string,
    payload: RoleFormValue,
  ): RolCreateBackendRequest | RolUpdateBackendRequest {
    return {
      empresa_id: this.resolveRequestCompanyId(companyId),
      nombre: payload.name.trim(),
      descripcion: payload.description.trim(),
      estado: payload.status === 'active' ? 'activo' : 'inactivo',
      permisos: [],
    };
  }

  private buildProfilePayload(
    companyId: string,
    payload: ProfileFormValue,
  ): PerfilCreateBackendRequest | PerfilUpdateBackendRequest {
    return {
      empresa_id: this.resolveRequestCompanyId(companyId),
      nombre: payload.name.trim(),
      descripcion: payload.description.trim(),
      estado: payload.status === 'active' ? 'activo' : 'inactivo',
      permisos: this.serializePermissionMatrix(payload.permissions),
    };
  }

  private buildCompanyAssignment(
    companyId: string,
    roleId: string | null,
    profileId: string | null,
  ): UsuarioEmpresaBackendMembership {
    return {
      empresa_id: this.resolveRequestCompanyId(companyId),
      rol_id: this.toBackendId(roleId),
      perfil_id: this.toBackendId(profileId),
    };
  }

  private buildUserRowFromPayload(
    userId: string,
    activeCompanyId: string,
    payload: UserFormValue,
    roleCatalogs: Record<string, RoleRowVm[]>,
    profileCatalogs: Record<string, ProfileRowVm[]>,
    currentUser?: UserRowVm,
  ): UserRowVm {
    const assignedCompanies = payload.assignedCompanies.map((assignment) => {
      const role = roleCatalogs[assignment.companyId]?.find((item) => item.id === assignment.roleId) ?? null;
      const profile = profileCatalogs[assignment.companyId]?.find((item) => item.id === assignment.profileId) ?? null;

      return {
        companyId: assignment.companyId,
        companyName: this.resolveCompanyName(assignment.companyId),
        roleId: assignment.roleId,
        roleName: role?.name ?? null,
        profileId: assignment.profileId,
        profileName: profile?.name ?? null,
      } satisfies UserCompanyAssignmentVm;
    });
    const activeAssignment = assignedCompanies.find(
      (assignment) => assignment.companyId === activeCompanyId,
    ) ?? null;

    return {
      userId,
      firstName: payload.firstName.trim() || currentUser?.firstName || 'Usuario',
      lastName: payload.lastName.trim() || currentUser?.lastName || '',
      name: `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim() || currentUser?.name || 'Usuario',
      position: payload.position.trim(),
      email: payload.email.trim().toLowerCase(),
      mobilePhone: payload.mobilePhone.trim(),
      landlinePhone: payload.landlinePhone.trim(),
      photoUrl: payload.photoUrl ?? currentUser?.photoUrl ?? null,
      status: payload.status,
      assignedCompanies,
      activeAssignment,
      roleId: activeAssignment?.roleId ?? null,
      roleName: activeAssignment?.roleName ?? null,
      profileId: activeAssignment?.profileId ?? null,
      profileName: activeAssignment?.profileName ?? null,
    };
  }

  private buildInactiveRoleFallback(companyId: string, roleId: string): RoleRowVm {
    return {
      id: roleId,
      companyId,
      name: 'Rol inactivado',
      description: '',
      status: 'inactive',
      scope: 'company',
    };
  }

  private buildInactiveProfileFallback(companyId: string, profileId: string): ProfileDetailVm {
    return {
      id: profileId,
      companyId,
      name: 'Perfil inactivado',
      description: '',
      status: 'inactive',
      modulesSummary: [],
      permissionsSummary: [],
      permissionCount: 0,
      permissions: buildPermissionMatrix(),
    };
  }

  private mapUserAssignments(
    user: UsuarioBackendListItem,
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

  private mergeUserRowsWithShadow(
    companyId: string,
    users: readonly UserRowVm[],
  ): UserRowVm[] {
    const mergedUsers = new Map<string, UserRowVm>(users.map((user) => [user.userId, user]));

    this.listUserShadowsForCompany(companyId).forEach((shadow) => {
      const currentUser = mergedUsers.get(shadow.userId);

      mergedUsers.set(shadow.userId, currentUser ? { ...currentUser, ...shadow.row } : shadow.row);
    });

    return Array.from(mergedUsers.values()).filter((user) => !!user.activeAssignment);
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
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
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
        throw new Error('Selecciona un rol válido para la empresa asignada.');
      }

      if (
        !profileCatalogs[assignment.companyId]?.some(
          (profile) => profile.id === assignment.profileId,
        )
      ) {
        throw new Error('Selecciona un perfil válido para la empresa asignada.');
      }
    });
  }

  private resolveStatus(value: unknown): SecurityRecordStatus {
    if (value === false || value === 0) {
      return 'inactive';
    }

    if (typeof value === 'string') {
      const normalizedValue = value.trim().toLowerCase();

      if (['inactivo', 'inactive', '0', 'false'].includes(normalizedValue)) {
        return 'inactive';
      }
    }

    return 'active';
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

  private readUserShadowStore(): Record<string, UserShadowRecord> {
    if (typeof window === 'undefined') {
      return {};
    }

    const raw = localStorage.getItem(this.userShadowStorageKey);

    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, UserShadowRecord>;
    } catch {
      localStorage.removeItem(this.userShadowStorageKey);
      return {};
    }
  }

  private writeUserShadowStore(store: Record<string, UserShadowRecord>): void {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.userShadowStorageKey, JSON.stringify(store));
  }

  private upsertUserShadow(row: UserRowVm, deletedRemotely: boolean): void {
    const store = this.readUserShadowStore();

    store[row.userId] = {
      userId: row.userId,
      row,
      deletedRemotely,
      updatedAt: new Date().toISOString(),
    };

    this.writeUserShadowStore(store);
  }

  private getUserShadow(userId: string): UserShadowRecord | null {
    return this.readUserShadowStore()[userId] ?? null;
  }

  private listUserShadowsForCompany(companyId: string): UserShadowRecord[] {
    return Object.values(this.readUserShadowStore()).filter((shadow) =>
      shadow.row.assignedCompanies.some((assignment) => assignment.companyId === companyId),
    );
  }

  private withFallback<T>(
    apiOperation: () => Observable<T>,
    mockOperation: () => Observable<T>,
    resourceLabel?: string,
  ): Observable<T> {
    return apiOperation().pipe(
      catchError((error: unknown) => {
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
    if (!Array.isArray(error.error?.detail)) {
      return this.extractBackendDetail(error);
    }

    return error.error.detail
      .map((issue: { loc?: unknown[]; msg?: string }) => {
        const field = Array.isArray(issue.loc) ? issue.loc.join('.') : 'campo';
        return `${field}: ${issue.msg ?? 'Error de validación'}`;
      })
      .join(' | ');
  }
}
