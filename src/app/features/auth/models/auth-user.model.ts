import { PermissionKey } from '../../../core/permissions/models/permission.model';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: PermissionKey[];
}