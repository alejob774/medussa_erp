import { AuthUser } from '../models/auth-user.model';
import { BackendAuthUser } from '../models/backend-auth-user.model';
import { BackendLoginResponse } from '../models/backend-login-response.model';
import { LoginResponse } from '../models/login-response.model';

export function mapBackendUserToAuthUser(user: BackendAuthUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
    permissions: user.permisos,
  };
}

export function mapBackendLoginResponseToLoginResponse(
  response: BackendLoginResponse,
  selectedServer: string = 'produccion',
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
    selectedServer,
  };
}