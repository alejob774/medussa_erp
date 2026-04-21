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
  'vendors.view': ['vendedores_view', 'sales.view'],
  'vendors.create': ['vendedores_create', 'sales.view'],
  'vendors.edit': ['vendedores_edit', 'sales.view'],
  'vendors.delete': ['vendedores_delete', 'sales.view'],
  'drivers.view': ['conductores_view', 'warehouse.view', 'sales.view'],
  'drivers.create': ['conductores_create', 'warehouse.view', 'sales.view'],
  'drivers.edit': ['conductores_edit', 'warehouse.view', 'sales.view'],
  'drivers.delete': ['conductores_delete', 'warehouse.view', 'sales.view'],
  'routes.view': ['rutas_view', 'configuracion_view', 'warehouse.view'],
  'routes.create': ['rutas_create', 'configuracion_view', 'warehouse.view'],
  'routes.edit': ['rutas_edit', 'configuracion_view', 'warehouse.view'],
  'routes.delete': ['rutas_delete', 'configuracion_view', 'warehouse.view'],
  'suppliers.view': ['proveedores_view', 'configuracion_view', 'purchases.view'],
  'suppliers.create': ['proveedores_create', 'configuracion_view', 'purchases.view'],
  'suppliers.edit': ['proveedores_edit', 'configuracion_view', 'purchases.view'],
  'suppliers.delete': ['proveedores_delete', 'configuracion_view', 'purchases.view'],
  'equipments.view': ['equipos_view', 'configuracion_view', 'warehouse.view'],
  'equipments.create': ['equipos_create', 'configuracion_view', 'warehouse.view'],
  'equipments.edit': ['equipos_edit', 'configuracion_view', 'warehouse.view'],
  'equipments.delete': ['equipos_delete', 'configuracion_view', 'warehouse.view'],
  'demand.view': ['demanda_view', 'warehouse.view', 'inventory.view'],
  'demand.generate': ['demanda_generate', 'warehouse.view', 'inventory.view'],
  'demand.adjust': ['demanda_adjust', 'sales.view'],
  'demand.approve': ['demanda_approve', 'production.view', 'warehouse.view'],
  'bom.formula.view': ['bom_formula_view', 'production.view', 'inventory.view'],
  'bom.formula.create': ['bom_formula_create', 'production.view', 'inventory.view'],
  'bom.formula.edit': ['bom_formula_edit', 'production.view', 'inventory.view'],
  'bom.formula.approve': ['bom_formula_approve', 'production.view', 'inventory.view'],
  'bom.formula.version': ['bom_formula_version', 'production.view', 'inventory.view'],
  'quality.control.view': ['control_calidad_view', 'production.view', 'inventory.view'],
  'quality.control.create': ['control_calidad_create', 'production.view', 'inventory.view'],
  'quality.control.release': ['control_calidad_release', 'production.view', 'inventory.view'],
  'quality.control.reject': ['control_calidad_reject', 'production.view', 'inventory.view'],
  'quality.control.quarantine': ['control_calidad_quarantine', 'production.view', 'inventory.view'],
  'quality.control.nc': ['control_calidad_nc', 'production.view', 'inventory.view'],
  'demand.analysis.view': ['demanda_analisis_view', 'warehouse.view', 'inventory.view'],
  'demand.analysis.refresh': ['demanda_analisis_refresh', 'warehouse.view', 'inventory.view'],
  'product.development.view': ['desarrollo_productos_view', 'warehouse.view', 'inventory.view'],
  'product.development.edit': ['desarrollo_productos_edit', 'warehouse.view', 'inventory.view'],
  'product.development.approve': ['desarrollo_productos_approve', 'production.view', 'warehouse.view'],
  'product.development.launch': ['desarrollo_productos_launch', 'products.create', 'warehouse.view'],
  'purchase.analysis.view': ['analisis_compras_view', 'warehouse.view', 'purchases.view'],
  'purchase.analysis.refresh': ['analisis_compras_refresh', 'warehouse.view', 'purchases.view'],
  'budget.management.view': ['gestion_presupuesto_view', 'warehouse.view', 'purchases.view', 'finance.view'],
  'budget.management.create': ['gestion_presupuesto_create', 'warehouse.view', 'purchases.view'],
  'budget.management.edit': ['gestion_presupuesto_edit', 'warehouse.view', 'purchases.view'],
  'budget.management.adjust': ['gestion_presupuesto_adjust', 'warehouse.view', 'purchases.view', 'finance.view'],
  'storage.layout.view': ['layout_almacenamiento_view', 'warehouse.view', 'inventory.view'],
  'storage.layout.create': ['layout_almacenamiento_create', 'warehouse.view', 'inventory.view'],
  'storage.layout.edit': ['layout_almacenamiento_edit', 'warehouse.view', 'inventory.view'],
  'storage.layout.assign': ['layout_almacenamiento_assign', 'warehouse.view', 'inventory.view'],
  'inventory.cycle.view': ['ciclo_inventarios_view', 'warehouse.view', 'inventory.view'],
  'inventory.cycle.create': ['ciclo_inventarios_create', 'warehouse.view', 'inventory.view'],
  'inventory.cycle.approve': ['ciclo_inventarios_approve', 'warehouse.view', 'inventory.view'],
  'inventory.cycle.close': ['ciclo_inventarios_close', 'warehouse.view', 'inventory.view'],
  'picking.packing.view': ['picking_packing_view', 'warehouse.view', 'inventory.view'],
  'picking.packing.pick': ['picking_packing_pick', 'warehouse.view', 'inventory.view'],
  'picking.packing.pack': ['picking_packing_pack', 'warehouse.view', 'inventory.view'],
  'picking.packing.close': ['picking_packing_close', 'warehouse.view', 'inventory.view'],
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
