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
        component: ModulePlaceholderPageComponent,
        canActivate: [permissionGuard],
        data: {
          title: 'Supply Chain Management',
          description: 'Vista marco para coordinación de abastecimiento, inventarios, almacén y compras.',
          hint: 'Siguiente iteración: orquestar abastecimiento y ejecución operativa desde un tablero unificado.',
          permission: 'warehouse.view',
        },
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
        component: ModulePlaceholderPageComponent,
        canActivate: [permissionGuard],
        data: {
          title: 'Manejo de inventarios',
          description: 'Placeholder para stock, conteos y trazabilidad.',
          hint: 'HU siguiente: stock en tiempo real y alertas.',
          permission: 'inventory.view',
        },
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