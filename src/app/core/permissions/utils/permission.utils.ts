import { PermissionKey } from '../models/permission.model';

export function hasRequiredPermissions(
  userPermissions: readonly string[] = [],
  required?: PermissionKey | PermissionKey[],
): boolean {
  if (!required) {
    return true;
  }

  const requiredPermissions = Array.isArray(required) ? required : [required];

  return requiredPermissions.every((permission) =>
    userPermissions.includes(permission),
  );
}
