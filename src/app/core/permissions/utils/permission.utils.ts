import { LegacyPermissionKey, PermissionKey } from '../models/permission.model';

const LEGACY_TO_BACKEND_PERMISSION_ALIASES: Partial<
  Record<LegacyPermissionKey, string[]>
> = {
  'clients.view': ['clientes_view', 'sales.view'],
  'clients.create': ['clientes_create', 'sales.view'],
  'clients.edit': ['clientes_edit', 'sales.view'],
  'clients.delete': ['clientes_delete', 'sales.view'],
  'products.view': ['productos_view', 'inventory.view'],
  'products.create': ['productos_create', 'inventory.view'],
  'products.edit': ['productos_edit', 'inventory.view'],
  'products.delete': ['productos_delete', 'inventory.view'],
  'settings.companies.view': ['empresas_view'],
  'settings.general.view': ['configuracion_view'],
  'security.users.view': ['usuarios_view', 'roles_view'],
  'security.profiles.view': ['perfiles_view'],
  'security.audit.view': ['auditoria_view'],
};

const BACKEND_TO_LEGACY_PERMISSION_ALIASES = Object.entries(
  LEGACY_TO_BACKEND_PERMISSION_ALIASES,
).reduce<Record<string, LegacyPermissionKey[]>>((aliases, [legacyPermission, backendPermissions]) => {
  backendPermissions?.forEach((backendPermission) => {
    aliases[backendPermission] = [
      ...(aliases[backendPermission] ?? []),
      legacyPermission as LegacyPermissionKey,
    ];
  });

  return aliases;
}, {});

export function mapLegacyPermissionToBackendPermissions(
  permission: PermissionKey,
): string[] {
  return LEGACY_TO_BACKEND_PERMISSION_ALIASES[
    permission as LegacyPermissionKey
  ] ?? [permission];
}

export function mapBackendPermissionToLegacyPermissions(
  permission: string,
): LegacyPermissionKey[] {
  return BACKEND_TO_LEGACY_PERMISSION_ALIASES[permission] ?? [];
}

export function normalizeEffectivePermissions(
  permissions: readonly string[] = [],
): string[] {
  const normalizedPermissions = new Set<string>();

  permissions
    .map((permission) => permission.trim())
    .filter(Boolean)
    .forEach((permission) => {
      normalizedPermissions.add(permission);
      mapBackendPermissionToLegacyPermissions(permission).forEach((alias) => {
        normalizedPermissions.add(alias);
      });
    });

  if (normalizedPermissions.size > 0) {
    normalizedPermissions.add('dashboard.view');
  }

  return Array.from(normalizedPermissions);
}

export function hasRequiredPermissions(
  userPermissions: readonly string[] = [],
  required?: PermissionKey | PermissionKey[],
): boolean {
  if (!required) {
    return true;
  }

  const requiredPermissions = Array.isArray(required) ? required : [required];
  const normalizedPermissions = new Set(normalizeEffectivePermissions(userPermissions));

  return requiredPermissions.every((permission) => {
    const candidatePermissions = new Set<string>([
      permission,
      ...mapLegacyPermissionToBackendPermissions(permission),
    ]);

    return Array.from(candidatePermissions).some((candidate) =>
      normalizedPermissions.has(candidate),
    );
  });
}
