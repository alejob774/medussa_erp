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
  const companies = session.companies ?? [];
  const activeCompanyId = response.empresa_activa ?? session.activeCompanyId ?? null;

  return {
    ...session,
    activeCompanyId,
    requiresCompanySelection: companies.length > 1 && !activeCompanyId,
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
  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    token_type: response.token_type,
    expires_in: response.expires_in,
    user: response.user ? mapBackendUserToAuthUser(response.user) : undefined,
    activeCompanyId: response.active_company_id ?? null,
    requiresCompanySelection: response.requires_company_selection ?? false,
    companies: response.companies ?? [],
  };
}