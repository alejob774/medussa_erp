import { PermissionKey } from '../../../core/permissions/models/permission.model';

export interface BackendAuthUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permisos: PermissionKey[];
}