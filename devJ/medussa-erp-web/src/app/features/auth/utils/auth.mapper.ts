import { AuthUser } from '../models/auth-user.model';
import { BackendAuthUser } from '../models/backend-auth-user.model';

export function mapBackendUserToAuthUser(user: BackendAuthUser): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
    permissions: user.permisos,
  };
}