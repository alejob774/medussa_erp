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

function normalizeNullableString(value: string | null | undefined): string | null {
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

function mapAuthMeCompanies(
  response: BackendAuthMeResponse,
  companies: readonly Company[],
): Company[] {
  const mergedCompanies = new Map<string, Company>();

  normalizeCompanies(companies).forEach((company) => {
    const identity = company.backendId ?? company.id;
    mergedCompanies.set(identity, company);
  });

  (response.empresas ?? []).forEach((company) => {
    const backendId = normalizeNullableString(company.empresa_id);

    if (!backendId) {
      return;
    }

    const currentCompany = mergedCompanies.get(backendId);

    mergedCompanies.set(backendId, {
      id: currentCompany?.id ?? backendId,
      dbId: currentCompany?.dbId ?? null,
      backendId,
      name:
        normalizeNullableString(company.nombre_empresa) ??
        currentCompany?.name ??
        `Empresa ${backendId}`,
      code: currentCompany?.code ?? backendId,
      description: currentCompany?.description,
      icon: currentCompany?.icon,
      accentColor: currentCompany?.accentColor,
    });
  });

  return Array.from(mergedCompanies.values());
}

function resolveActiveAuthMeCompany(
  response: BackendAuthMeResponse,
  session: LoginResponse,
): BackendAuthMeCompany | null {
  const responseCompanies = response.empresas ?? [];
  const requestedBackendCompanyId =
    normalizeNullableString(response.empresa_activa) ??
    normalizeNullableString(response.empresa_id) ??
    session.activeBackendCompanyId ??
    null;

  if (!responseCompanies.length) {
    return null;
  }

  if (requestedBackendCompanyId) {
    const matchingCompany = responseCompanies.find(
      (company) => normalizeNullableString(company.empresa_id) === requestedBackendCompanyId,
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
        normalizeNullableString(company.empresa_id) ===
        normalizeNullableString(sessionCompany?.backendId ?? sessionCompany?.id),
    );

    if (matchingCompany) {
      return matchingCompany;
    }

    const normalizedSessionCompanyName = normalizeComparableText(sessionCompany?.name);

    if (normalizedSessionCompanyName) {
      const matchingCompanyByName = responseCompanies.find(
        (company) =>
          normalizeComparableText(company.nombre_empresa) === normalizedSessionCompanyName,
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
  const roleName = user.rol ?? user.roles?.[0] ?? null;

  return {
    id: String(user.id),
    username,
    email: user.email,
    displayName: buildDisplayName(user.nombre, user.apellido),
    roles: dedupeStrings([...(user.roles ?? []), roleName]),
    roleName,
    profileName: user.perfil ?? null,
    permissions: normalizeEffectivePermissions(extractPermissionCodes(user.permisos)),
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
  const roleName = activeCompany?.rol ?? response.rol ?? currentUser?.roleName ?? null;
  const profileName =
    activeCompany?.perfil ?? response.perfil ?? currentUser?.profileName ?? null;
  const extractedPermissions = extractPermissionCodes(
    activeCompany?.permisos ?? response.permisos,
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
      response.rol,
      activeCompany?.rol,
      ...(response.empresas ?? []).map((company) => company.rol ?? undefined),
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
      normalizeNullableString(response.empresa_id) ??
      normalizeNullableString(activeCompany?.empresa_id) ??
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
  const companies = response.companies ?? [];
  const loginCompanyId = normalizeNullableString(response.active_company_id);
  const loginBackendCompanyId = normalizeNullableString(
    response.user?.empresa_id ?? response.empresa_id,
  );
  const hasLocalCompanyId = !!loginCompanyId && companies.some((company) => company.id === loginCompanyId);
  const companyState = resolveCompanyIdentityState(companies, {
    activeCompanyId: hasLocalCompanyId ? loginCompanyId : null,
    activeBackendCompanyId:
      loginBackendCompanyId ?? (hasLocalCompanyId ? null : loginCompanyId) ?? null,
  });

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    token_type: response.token_type,
    expires_in: response.expires_in,
    user: response.user ? mapBackendUserToAuthUser(response.user) : undefined,
    activeCompanyId: companyState.activeCompanyId,
    activeBackendCompanyId: companyState.activeBackendCompanyId,
    requiresCompanySelection: response.requires_company_selection ?? false,
    companies: companyState.companies,
  };
}
