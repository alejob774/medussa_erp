import { Company } from '../../../core/company/models/company.model';
import { normalizeEffectivePermissions } from '../../../core/permissions/utils/permission.utils';
import { AuthUser } from '../models/auth-user.model';
import {
  BackendAuthMeCompany,
  BackendAuthMeResponse,
} from '../models/backend-auth-me-response.model';
import { BackendAuthUser } from '../models/backend-auth-user.model';
import { BackendLoginResponse } from '../models/backend-login-response.model';
import { LoginResponse } from '../models/login-response.model';

function resolveUsername(
  email: string | undefined,
  explicitUsername?: string,
  fallbackId?: string | number,
): string {
  const normalizedUsername = explicitUsername?.trim();

  if (normalizedUsername) {
    return normalizedUsername;
  }

  const emailPrefix = email?.split('@')[0]?.trim();

  if (emailPrefix) {
    return emailPrefix;
  }

  return fallbackId ? `user-${fallbackId}` : 'usuario';
}

function dedupeStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));
}

function normalizeNullableString(value: number | string | null | undefined): string | null {
  if (typeof value === 'number') {
    return String(value);
  }

  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function normalizeComparableText(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeCompanies(companies: readonly Company[] = []): Company[] {
  return companies.map((company) => ({
    ...company,
    backendId: normalizeNullableString(company.backendId),
  }));
}

function buildDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  fallback?: string,
): string | undefined {
  const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ').trim();
  return fullName || fallback;
}

function extractPermissionCodes(permissionSource: unknown): string[] {
  if (!permissionSource) {
    return [];
  }

  if (typeof permissionSource === 'string') {
    const normalizedPermission = permissionSource.trim();
    return normalizedPermission ? [normalizedPermission] : [];
  }

  if (Array.isArray(permissionSource)) {
    return permissionSource.flatMap((entry) => extractPermissionCodes(entry));
  }

  if (typeof permissionSource !== 'object') {
    return [];
  }

  const permissionObject = permissionSource as Record<string, unknown>;
  const directCode =
    typeof permissionObject['codigo'] === 'string'
      ? permissionObject['codigo']
      : typeof permissionObject['code'] === 'string'
        ? permissionObject['code']
        : typeof permissionObject['key'] === 'string'
          ? permissionObject['key']
          : typeof permissionObject['permission'] === 'string'
            ? permissionObject['permission']
            : null;

  if (directCode) {
    return [directCode.trim()];
  }

  const directModule =
    typeof permissionObject['modulo'] === 'string'
      ? permissionObject['modulo']
      : typeof permissionObject['module'] === 'string'
        ? permissionObject['module']
        : null;
  const directAction =
    typeof permissionObject['accion'] === 'string'
      ? permissionObject['accion']
      : typeof permissionObject['action'] === 'string'
        ? permissionObject['action']
        : null;

  if (directModule && directAction) {
    return [`${directModule.trim().toLowerCase()}_${directAction.trim().toLowerCase()}`];
  }

  return Object.entries(permissionObject).flatMap(([moduleKey, value]) => {
    const normalizedModuleKey = moduleKey.trim().toLowerCase();

    if (!normalizedModuleKey) {
      return [];
    }

    if (typeof value === 'string') {
      return [`${normalizedModuleKey}_${value.trim().toLowerCase()}`];
    }

    if (Array.isArray(value)) {
      return value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => `${normalizedModuleKey}_${entry.trim().toLowerCase()}`);
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .filter(([, enabled]) => !!enabled)
        .map(([actionKey]) => `${normalizedModuleKey}_${actionKey.trim().toLowerCase()}`);
    }

    return [];
  });
}

function extractNameCodes(values: unknown): string[] {
  if (!values) {
    return [];
  }

  if (typeof values === 'string') {
    return values.trim() ? [values.trim()] : [];
  }

  if (!Array.isArray(values)) {
    return [];
  }

  return values.flatMap((value) => {
    if (typeof value === 'string') {
      return value.trim() ? [value.trim()] : [];
    }

    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const name =
        record['nombre'] ?? record['name'] ?? record['rol'] ?? record['role'] ?? record['perfil'] ?? record['profile'];
      return typeof name === 'string' && name.trim() ? [name.trim()] : [];
    }

    return [];
  });
}

function isFrontendCompany(company: Company | BackendAuthMeCompany): company is Company {
  return 'name' in company && 'code' in company;
}

export function mapBackendCompaniesToCompanies(
  companiesInput: ReadonlyArray<Company | BackendAuthMeCompany> = [],
  fallbackCompanies: readonly Company[] = [],
): Company[] {
  const mergedCompanies = new Map<string, Company>();

  normalizeCompanies(fallbackCompanies).forEach((company) => {
    const identity = company.backendId ?? company.id;
    mergedCompanies.set(identity, company);
  });

  companiesInput.forEach((company) => {
    if (isFrontendCompany(company)) {
      const normalizedCompany: Company = {
        ...company,
        id: normalizeNullableString(company.id) ?? company.id,
        dbId: normalizeNullableString(company.dbId) ?? null,
        backendId: normalizeNullableString(company.backendId),
      };
      const identity = normalizedCompany.backendId ?? normalizedCompany.id;
      const currentCompany = mergedCompanies.get(identity);

      mergedCompanies.set(identity, {
        ...currentCompany,
        ...normalizedCompany,
        dbId: normalizedCompany.dbId ?? currentCompany?.dbId ?? null,
        backendId: normalizedCompany.backendId ?? currentCompany?.backendId ?? null,
      });
      return;
    }

    const backendId = normalizeNullableString(
      company.empresa_id ??
        company.empresaId ??
        company.companyId ??
        company.backend_id ??
        company.backendId ??
        company.id,
    );

    if (!backendId) {
      return;
    }

    const currentCompany = mergedCompanies.get(backendId);

    mergedCompanies.set(backendId, {
      id: currentCompany?.id ?? backendId,
      dbId: currentCompany?.dbId ?? null,
      backendId,
      name:
        normalizeNullableString(company.nombre_empresa ?? company.nombre ?? company.name) ??
        currentCompany?.name ??
        `Empresa ${backendId}`,
      code: normalizeNullableString(company.codigo ?? company.code) ?? currentCompany?.code ?? backendId,
      description:
        normalizeNullableString(company.descripcion ?? company.description) ??
        currentCompany?.description,
      icon: currentCompany?.icon,
      accentColor: currentCompany?.accentColor,
    });
  });

  return Array.from(mergedCompanies.values());
}

function mapAuthMeCompanies(
  response: BackendAuthMeResponse,
  companies: readonly Company[],
): Company[] {
  const empresaActiva =
    response.empresaActiva && typeof response.empresaActiva === 'object'
      ? [response.empresaActiva]
      : response.empresa_activa_obj
        ? [response.empresa_activa_obj]
        : [];

  return mapBackendCompaniesToCompanies(
    [...(response.empresas ?? []), ...(response.companies ?? []), ...empresaActiva],
    companies,
  );
}

function resolveActiveAuthMeCompany(
  response: BackendAuthMeResponse,
  session: LoginResponse,
): BackendAuthMeCompany | null {
  const responseCompanies = response.empresas ?? response.companies ?? [];
  const requestedBackendCompanyId =
    (response.empresaActiva && typeof response.empresaActiva === 'object'
      ? normalizeNullableString(
          response.empresaActiva.empresa_id ??
            response.empresaActiva.empresaId ??
            response.empresaActiva.companyId ??
            response.empresaActiva.backend_id ??
            response.empresaActiva.backendId ??
            response.empresaActiva.id,
        )
      : normalizeNullableString(response.empresaActiva)) ??
    normalizeNullableString(response.empresa_activa) ??
    normalizeNullableString(response.active_company_id) ??
    normalizeNullableString(response.activeCompanyId) ??
    normalizeNullableString(response.empresa_id) ??
    normalizeNullableString(response.empresaId) ??
    session.activeBackendCompanyId ??
    null;

  if (!responseCompanies.length) {
    return null;
  }

  if (requestedBackendCompanyId) {
    const matchingCompany = responseCompanies.find(
      (company) =>
        normalizeNullableString(
          company.empresa_id ??
            company.empresaId ??
            company.companyId ??
            company.backend_id ??
            company.backendId ??
            company.id,
        ) === requestedBackendCompanyId,
    );

    if (matchingCompany) {
      return matchingCompany;
    }
  }

  if (session.activeCompanyId) {
    const sessionCompany = session.companies?.find(
      (company) => company.id === session.activeCompanyId,
    );
    const matchingCompany = responseCompanies.find(
      (company) =>
        normalizeNullableString(
          company.empresa_id ??
            company.empresaId ??
            company.companyId ??
            company.backend_id ??
            company.backendId ??
            company.id,
        ) ===
        normalizeNullableString(sessionCompany?.backendId ?? sessionCompany?.id),
    );

    if (matchingCompany) {
      return matchingCompany;
    }

    const normalizedSessionCompanyName = normalizeComparableText(sessionCompany?.name);

    if (normalizedSessionCompanyName) {
      const matchingCompanyByName = responseCompanies.find(
        (company) =>
          normalizeComparableText(company.nombre_empresa ?? company.nombre ?? company.name) ===
          normalizedSessionCompanyName,
      );

      if (matchingCompanyByName) {
        return matchingCompanyByName;
      }
    }
  }

  return responseCompanies.length === 1 ? responseCompanies[0] : null;
}

export function resolveCompanyIdentityState(
  companiesInput: readonly Company[] = [],
  options: {
    activeCompanyId?: string | null;
    activeBackendCompanyId?: string | null;
  } = {},
): {
  companies: Company[];
  activeCompanyId: string | null;
  activeBackendCompanyId: string | null;
} {
  const companies = normalizeCompanies(companiesInput);
  const requestedActiveCompanyId = normalizeNullableString(options.activeCompanyId);
  const requestedActiveBackendCompanyId = normalizeNullableString(
    options.activeBackendCompanyId,
  );
  const companyByLocalId = requestedActiveCompanyId
    ? companies.find((company) => company.id === requestedActiveCompanyId) ?? null
    : null;
  const companyByBackendId = requestedActiveBackendCompanyId
    ? companies.find((company) => company.backendId === requestedActiveBackendCompanyId) ?? null
    : null;
  const activeCompanyId =
    companyByLocalId?.id ?? companyByBackendId?.id ?? (companies.length === 1 ? companies[0].id : null);
  const activeCompany = activeCompanyId
    ? companies.find((company) => company.id === activeCompanyId) ?? null
    : null;
  const activeBackendCompanyId =
    requestedActiveBackendCompanyId ?? activeCompany?.backendId ?? null;
  const nextCompanies =
    activeCompany && activeBackendCompanyId && activeCompany.backendId !== activeBackendCompanyId
      ? companies.map((company) =>
          company.id === activeCompany.id
            ? {
                ...company,
                backendId: activeBackendCompanyId,
              }
            : company,
        )
      : companies;

  return {
    companies: nextCompanies,
    activeCompanyId,
    activeBackendCompanyId,
  };
}

export function mapBackendUserToAuthUser(user: BackendAuthUser): AuthUser {
  const username = resolveUsername(user.email, user.username, user.id);
  const roleName = user.rol ?? user.role ?? user.roles?.[0] ?? null;

  return {
    id: String(user.id),
    username,
    email: user.email,
    displayName: buildDisplayName(user.nombre, user.apellido),
    roles: dedupeStrings([...(user.roles ?? []), roleName]),
    roleName,
    profileName: user.perfil ?? user.profile ?? null,
    permissions: normalizeEffectivePermissions(
      extractPermissionCodes(user.permisos ?? user.permissions),
    ),
  };
}

export function mapBackendAuthMeToAuthUser(
  response: BackendAuthMeResponse,
  currentUser?: AuthUser,
  activeCompany?: BackendAuthMeCompany | null,
): AuthUser {
  const username = resolveUsername(
    response.email,
    normalizeNullableString(response.username) ?? currentUser?.username,
    response.id,
  );
  const roleName =
    activeCompany?.rol ??
    activeCompany?.role ??
    response.rol ??
    response.role ??
    extractNameCodes(response.roles)[0] ??
    currentUser?.roleName ??
    null;
  const profileName =
    activeCompany?.perfil ??
    activeCompany?.profile ??
    response.perfil ??
    response.profile ??
    extractNameCodes(response.perfiles)[0] ??
    currentUser?.profileName ??
    null;
  const extractedPermissions = extractPermissionCodes(
    activeCompany?.permisos ??
      activeCompany?.permissions ??
      response.permisos ??
      response.permissions,
  );
  const permissions = extractedPermissions.length
    ? normalizeEffectivePermissions(extractedPermissions)
    : [...(currentUser?.permissions ?? [])];

  return {
    id: response.id !== null && response.id !== undefined ? String(response.id) : currentUser?.id ?? 'usuario',
    username,
    email: normalizeNullableString(response.email) ?? currentUser?.email ?? `${username}@medussa.local`,
    displayName:
      buildDisplayName(response.nombre, response.apellido, currentUser?.displayName) ??
      currentUser?.displayName,
    roles: dedupeStrings([
      ...(currentUser?.roles ?? []),
      ...extractNameCodes(response.roles),
      response.rol,
      response.role,
      activeCompany?.rol,
      activeCompany?.role,
      ...(response.empresas ?? response.companies ?? []).map(
        (company) => company.rol ?? company.role ?? undefined,
      ),
    ]),
    roleName,
    profileName,
    permissions,
  };
}

export function mergeAuthenticatedContextIntoSession(
  session: LoginResponse,
  response: BackendAuthMeResponse,
): LoginResponse {
  const companies = mapAuthMeCompanies(response, session.companies ?? []);
  const activeCompany = resolveActiveAuthMeCompany(response, {
    ...session,
    companies,
  });
  const nextUser = mapBackendAuthMeToAuthUser(response, session.user, activeCompany);
  const companyState = resolveCompanyIdentityState(companies, {
    activeCompanyId: session.activeCompanyId ?? null,
    activeBackendCompanyId:
      normalizeNullableString(response.empresa_activa) ??
      (response.empresaActiva && typeof response.empresaActiva === 'object'
        ? normalizeNullableString(
            response.empresaActiva.empresa_id ??
              response.empresaActiva.empresaId ??
              response.empresaActiva.companyId ??
              response.empresaActiva.backend_id ??
              response.empresaActiva.backendId ??
              response.empresaActiva.id,
          )
        : normalizeNullableString(response.empresaActiva)) ??
      normalizeNullableString(response.active_company_id) ??
      normalizeNullableString(response.activeCompanyId) ??
      normalizeNullableString(response.empresa_id) ??
      normalizeNullableString(response.empresaId) ??
      normalizeNullableString(
        activeCompany?.empresa_id ??
          activeCompany?.empresaId ??
          activeCompany?.companyId ??
          activeCompany?.backend_id ??
          activeCompany?.backendId ??
          activeCompany?.id,
      ) ??
      session.activeBackendCompanyId ??
      null,
  });

  return {
    ...session,
    companies: companyState.companies,
    activeCompanyId: companyState.activeCompanyId,
    activeBackendCompanyId: companyState.activeBackendCompanyId,
    requiresCompanySelection:
      companyState.companies.length > 1 && !companyState.activeCompanyId,
    user: {
      ...session.user,
      ...nextUser,
      permissions: nextUser.permissions,
      roles: nextUser.roles,
    },
  };
}

export function mapBackendLoginResponseToLoginResponse(
  response: BackendLoginResponse,
): LoginResponse {
  const companies = mapBackendCompaniesToCompanies(
    [...(response.companies ?? []), ...(response.empresas ?? [])],
  );
  const loginCompanyId = normalizeNullableString(
    response.active_company_id ?? response.activeCompanyId,
  );
  const loginBackendCompanyId = normalizeNullableString(
    response.user?.empresa_id ??
      response.user?.empresaId ??
      response.empresa_id ??
      response.empresaId,
  );
  const hasLocalCompanyId =
    !!loginCompanyId &&
    companies.some(
      (company) => company.id === loginCompanyId || company.backendId === loginCompanyId,
    );
  const companyState = resolveCompanyIdentityState(companies, {
    activeCompanyId: hasLocalCompanyId ? loginCompanyId : null,
    activeBackendCompanyId:
      loginBackendCompanyId ?? (hasLocalCompanyId ? null : loginCompanyId) ?? null,
  });

  return {
    access_token: response.access_token ?? response.accessToken ?? '',
    refresh_token: response.refresh_token ?? response.refreshToken ?? '',
    token_type: response.token_type ?? response.tokenType ?? 'bearer',
    expires_in: response.expires_in ?? response.expiresIn,
    user: response.user ? mapBackendUserToAuthUser(response.user) : undefined,
    activeCompanyId: companyState.activeCompanyId,
    activeBackendCompanyId: companyState.activeBackendCompanyId,
    requiresCompanySelection:
      response.requires_company_selection ?? response.requiresCompanySelection ?? false,
    companies: companyState.companies,
  };
}
