import { Company } from '../../../core/company/models/company.model';
import { normalizeEffectivePermissions } from '../../../core/permissions/utils/permission.utils';
import { AuthUser } from '../models/auth-user.model';
import { BackendAuthMeResponse } from '../models/backend-auth-me-response.model';
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

function normalizeCompanies(companies: readonly Company[] = []): Company[] {
  return companies.map((company) => ({
    ...company,
    backendId: normalizeNullableString(company.backendId),
  }));
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
    displayName: user.nombre?.trim() || undefined,
    roles: dedupeStrings([...(user.roles ?? []), roleName]),
    roleName,
    profileName: user.perfil ?? null,
    permissions: normalizeEffectivePermissions(user.permisos ?? []),
  };
}

export function mapBackendAuthMeToAuthUser(
  response: BackendAuthMeResponse,
  currentUser?: AuthUser,
): AuthUser {
  const username = resolveUsername(response.email, currentUser?.username, response.id);

  return {
    id: String(response.id),
    username,
    email: response.email,
    displayName: response.nombre?.trim() || currentUser?.displayName,
    roles: dedupeStrings([response.rol]),
    roleName: response.rol ?? null,
    profileName: response.perfil ?? null,
    permissions: normalizeEffectivePermissions(response.permisos ?? []),
  };
}

export function mergeAuthenticatedContextIntoSession(
  session: LoginResponse,
  response: BackendAuthMeResponse,
): LoginResponse {
  const nextUser = mapBackendAuthMeToAuthUser(response, session.user);
  const companyState = resolveCompanyIdentityState(session.companies ?? [], {
    activeCompanyId: session.activeCompanyId ?? null,
    activeBackendCompanyId:
      response.empresa_id ?? response.empresa_activa ?? session.activeBackendCompanyId ?? null,
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