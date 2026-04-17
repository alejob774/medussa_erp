import { Routes } from '@angular/router';
import { companyContextGuard } from './core/company/guards/company-context.guard';
import { pendingChangesGuard } from './core/forms/guards/pending-changes.guard';
import { permissionGuard } from './core/permissions/guards/permission.guard';
import { ErpShellComponent } from './core/shell/components/erp-shell/erp-shell.component';
import { authGuard } from './features/auth/guards/auth.guard';
import { LoginPageComponent } from './features/auth/pages/login-page/login-page.component';
import { CompanySelectorPageComponent } from './features/company/pages/company-selector-page/company-selector-page.component';
import { CompaniesPageComponent } from './features/companies/presentation/pages/companies-page/companies-page.component';
import { DashboardPageComponent } from './features/dashboard/pages/dashboard-page/dashboard-page.component';
import { ModulePlaceholderPageComponent } from './features/dashboard/pages/module-placeholder-page/module-placeholder-page.component';
import { AuditLogsPageComponent } from './features/security/pages/audit-logs-page/audit-logs-page.component';
import { ProfilesPermissionsPageComponent } from './features/security/pages/profiles-permissions-page/profiles-permissions-page.component';
import { UsersRolesPageComponent } from './features/security/pages/users-roles-page/users-roles-page.component';
import { GeneralSettingsPageComponent } from './features/settings/pages/general-settings-page/general-settings-page.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
  },
  {
    path: 'select-company',
    canActivate: [authGuard],
    component: CompanySelectorPageComponent,
  },
  {
    path: '',
    canActivate: [authGuard, companyContextGuard],
    component: ErpShellComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardPageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'dashboard.view',
        },
      },
      {
        path: 'ventas',
        component: ModulePlaceholderPageComponent,
        canActivate: [permissionGuard],
        data: {
          title: 'Ventas',
          description: 'Pipeline comercial y gestión de pedidos por empresa activa.',
          hint: 'HU-001 puede conectar aquí el tablero comercial real.',
          permission: 'sales.view',
        },
      },
      {
        path: 'ventas/clientes',
        pathMatch: 'full',
        redirectTo: 'supply-chain-management/clientes',
      },
      {
        path: 'ventas/vendedores',
        pathMatch: 'full',
        redirectTo: 'supply-chain-management/vendedores',
      },
      {
        path: 'ventas/conductores',
        pathMatch: 'full',
        redirectTo: 'supply-chain-management/conductores',
      },
      {
        path: 'compras',
        component: ModulePlaceholderPageComponent,
        canActivate: [permissionGuard],
        data: {
          title: 'Compras',
          description: 'Base para solicitudes, órdenes y abastecimiento por contexto multiempresa.',
          hint: 'HU siguiente: flujo de requisiciones y órdenes de compra.',
          permission: 'purchases.view',
        },
      },
      {
        path: 'supply-chain-management',
        children: [
          {
            path: '',
            component: ModulePlaceholderPageComponent,
            canActivate: [permissionGuard],
            data: {
              title: 'Supply Chain Management',
              description: 'Vista marco para coordinación de abastecimiento, inventarios, almacén y compras.',
              hint: 'Desde aquí cuelgan los maestros de productos, clientes, vendedores y conductores, además de la operación logística.',
              permission: 'warehouse.view',
            },
          },
          {
            path: 'productos',
            loadComponent: () =>
              import('./features/products/presentation/pages/products-page/products-page.component').then(
                (module) => module.ProductsPageComponent,
              ),
            canActivate: [permissionGuard],
            canDeactivate: [pendingChangesGuard],
            data: {
              permission: 'products.view',
            },
          },
          {
            path: 'clientes',
            loadComponent: () =>
              import('./features/clients/presentation/pages/clients-page/clients-page.component').then(
                (module) => module.ClientsPageComponent,
              ),
            canActivate: [permissionGuard],
            canDeactivate: [pendingChangesGuard],
            data: {
              permission: 'clients.view',
            },
          },
          {
            path: 'vendedores',
            loadComponent: () =>
              import('./features/vendors/presentation/pages/vendors-page/vendors-page.component').then(
                (module) => module.VendorsPageComponent,
              ),
            canActivate: [permissionGuard],
            canDeactivate: [pendingChangesGuard],
            data: {
              permission: 'vendors.view',
            },
          },
          {
            path: 'conductores',
            loadComponent: () =>
              import('./features/drivers/presentation/pages/drivers-page/drivers-page.component').then(
                (module) => module.DriversPageComponent,
              ),
            canActivate: [permissionGuard],
            canDeactivate: [pendingChangesGuard],
            data: {
              permission: 'drivers.view',
            },
          },
        ],
      },
      {
        path: 'finanzas',
        component: ModulePlaceholderPageComponent,
        canActivate: [permissionGuard],
        data: {
          title: 'Finanzas',
          description: 'Espacio reservado para tesorería, cuentas y KPIs financieros.',
          hint: 'HU siguiente: widgets financieros y movimientos por empresa.',
          permission: 'finance.view',
        },
      },
      {
        path: 'produccion',
        component: ModulePlaceholderPageComponent,
        canActivate: [permissionGuard],
        data: {
          title: 'Producción',
          description: 'Base para órdenes de producción y capacidad operativa.',
          hint: 'HU siguiente: programación y seguimiento de planta.',
          permission: 'production.view',
        },
      },
      {
        path: 'rrhh',
        component: ModulePlaceholderPageComponent,
        canActivate: [permissionGuard],
        data: {
          title: 'RRHH',
          description: 'Placeholder para talento, asistencia y novedades del personal.',
          hint: 'HU siguiente: fichas de colaboradores y organigrama.',
          permission: 'hr.view',
        },
      },
      {
        path: 'atencion',
        component: ModulePlaceholderPageComponent,
        canActivate: [permissionGuard],
        data: {
          title: 'Atención',
          description: 'Base para tickets, soporte y experiencia del cliente.',
          hint: 'HU siguiente: bandeja de casos y SLA.',
          permission: 'support.view',
        },
      },
      {
        path: 'marketing',
        component: ModulePlaceholderPageComponent,
        canActivate: [permissionGuard],
        data: {
          title: 'Marketing',
          description: 'Espacio inicial para campañas y desempeño comercial.',
          hint: 'HU siguiente: campañas, medios y métricas.',
          permission: 'marketing.view',
        },
      },
      {
        path: 'gestion-almacen',
        component: ModulePlaceholderPageComponent,
        canActivate: [permissionGuard],
        data: {
          title: 'Gestión de almacén',
          description: 'Base para entradas, salidas, ubicaciones y picking.',
          hint: 'HU siguiente: tablero de almacén y operaciones.',
          permission: 'warehouse.view',
        },
      },
      {
        path: 'inventarios',
        pathMatch: 'full',
        redirectTo: 'supply-chain-management/productos',
      },
      {
        path: 'configuracion/empresas',
        component: CompaniesPageComponent,
        canActivate: [permissionGuard],
        canDeactivate: [pendingChangesGuard],
        data: {
          permission: 'settings.companies.view',
        },
      },
      {
        path: 'configuracion/parametros-generales',
        component: GeneralSettingsPageComponent,
        canActivate: [permissionGuard],
        canDeactivate: [pendingChangesGuard],
        data: {
          permission: 'settings.general.view',
        },
      },
      {
        path: 'configuracion/rutas',
        loadComponent: () =>
          import('./features/routes/presentation/pages/routes-page/routes-page.component').then(
            (module) => module.RoutesPageComponent,
          ),
        canActivate: [permissionGuard],
        canDeactivate: [pendingChangesGuard],
        data: {
          permission: 'routes.view',
        },
      },
      {
        path: 'configuracion/proveedores',
        loadComponent: () =>
          import('./features/suppliers/presentation/pages/suppliers-page/suppliers-page.component').then(
            (module) => module.SuppliersPageComponent,
          ),
        canActivate: [permissionGuard],
        canDeactivate: [pendingChangesGuard],
        data: {
          permission: 'suppliers.view',
        },
      },
      {
        path: 'configuracion/equipos',
        loadComponent: () =>
          import('./features/equipments/presentation/pages/equipments-page/equipments-page.component').then(
            (module) => module.EquipmentsPageComponent,
          ),
        canActivate: [permissionGuard],
        canDeactivate: [pendingChangesGuard],
        data: {
          permission: 'equipments.view',
        },
      },
      {
        path: 'seguridad/usuarios-roles',
        component: UsersRolesPageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'security.users.view',
        },
      },
      {
        path: 'seguridad/perfiles-permisos',
        component: ProfilesPermissionsPageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'security.profiles.view',
        },
      },
      {
        path: 'seguridad/auditoria',
        component: AuditLogsPageComponent,
        canActivate: [permissionGuard],
        data: {
          permission: 'security.audit.view',
        },
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
