import {
  ModulePermissionVm,
  PermissionActionKey,
  PermissionActionSet,
} from '../models/security-administration.model';

export const SECURITY_PERMISSION_ACTION_LABELS: Record<PermissionActionKey, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  manage: 'Administrar',
};

export function clonePermissionMatrix(
  permissions: readonly ModulePermissionVm[] = [],
): ModulePermissionVm[] {
  return permissions.map((permission) => ({
    moduleKey: permission.moduleKey,
    moduleName: permission.moduleName,
    actions: { ...permission.actions },
  }));
}

export function getEnabledActionKeys(
  actions: PermissionActionSet,
): PermissionActionKey[] {
  return Object.entries(actions)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key as PermissionActionKey);
}

export function getEnabledActionLabels(actions: PermissionActionSet): string[] {
  return getEnabledActionKeys(actions).map(
    (action) => SECURITY_PERMISSION_ACTION_LABELS[action],
  );
}

export function summarizeProfilePermissions(permissions: readonly ModulePermissionVm[] = []): {
  modulesSummary: string[];
  permissionsSummary: string[];
  permissionCount: number;
} {
  const activeModules = permissions.filter((permission) =>
    getEnabledActionKeys(permission.actions).length > 0,
  );

  return {
    modulesSummary: activeModules.map((permission) => permission.moduleName),
    permissionsSummary: activeModules.map((permission) => {
      const labels = getEnabledActionLabels(permission.actions);
      return `${permission.moduleName}: ${labels.join(', ')}`;
    }),
    permissionCount: activeModules.reduce(
      (total, permission) => total + getEnabledActionKeys(permission.actions).length,
      0,
    ),
  };
}

export function hasModuleAccess(
  permissions: readonly ModulePermissionVm[] = [],
  moduleKey: string,
): boolean {
  const modulePermission = permissions.find(
    (permission) => permission.moduleKey === moduleKey,
  );

  if (!modulePermission) {
    return false;
  }

  return getEnabledActionKeys(modulePermission.actions).length > 0;
}

export function canPerform(
  permissions: readonly ModulePermissionVm[] = [],
  moduleKey: string,
  action: PermissionActionKey,
): boolean {
  return (
    permissions.find((permission) => permission.moduleKey === moduleKey)?.actions[action] ??
    false
  );
}

export function canView(
  permissions: readonly ModulePermissionVm[] = [],
  moduleKey: string,
): boolean {
  return canPerform(permissions, moduleKey, 'view');
}

export function canCreate(
  permissions: readonly ModulePermissionVm[] = [],
  moduleKey: string,
): boolean {
  return canPerform(permissions, moduleKey, 'create');
}

export function canEdit(
  permissions: readonly ModulePermissionVm[] = [],
  moduleKey: string,
): boolean {
  return canPerform(permissions, moduleKey, 'edit');
}

export function canDelete(
  permissions: readonly ModulePermissionVm[] = [],
  moduleKey: string,
): boolean {
  return canPerform(permissions, moduleKey, 'delete');
}

export function canApprove(
  permissions: readonly ModulePermissionVm[] = [],
  moduleKey: string,
): boolean {
  return canPerform(permissions, moduleKey, 'approve');
}

export function canManage(
  permissions: readonly ModulePermissionVm[] = [],
  moduleKey: string,
): boolean {
  return canPerform(permissions, moduleKey, 'manage');
}