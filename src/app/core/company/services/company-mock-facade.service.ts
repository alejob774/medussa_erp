import { Injectable } from '@angular/core';
import { PermissionKey } from '../../permissions/models/permission.model';
import { Company } from '../models/company.model';

export interface MockSessionContext {
  companies: Company[];
  roles: string[];
  permissions: PermissionKey[];
  defaultCompanyId: string | null;
}

const COMPANY_CATALOG: Record<string, Company> = {
  'medussa-holding': {
    id: 'medussa-holding',
    backendId: 'EMP-001',
    name: 'Industrias Alimenticias El Arbolito',
    code: 'ARB',
    description: 'Operacion principal de demo para SCM, maestros y contexto multiempresa.',
    icon: 'storefront',
    accentColor: '#0f766e',
  },
  'medussa-retail': {
    id: 'medussa-retail',
    name: 'Medussa Holding',
    code: 'HOLD',
    description:
      'Contexto corporativo secundario para comparativos multiempresa y evidencia del grupo.',
    icon: 'domain',
    accentColor: '#2f855a',
  },
  'medussa-industrial': {
    id: 'medussa-industrial',
    name: 'Medussa Industrial',
    code: 'IND',
    description: 'Produccion, almacen e inventario.',
    icon: 'precision_manufacturing',
    accentColor: '#ea580c',
  },
  'medussa-services': {
    id: 'medussa-services',
    name: 'Medussa Services',
    code: 'SRV',
    description: 'Servicios, RRHH y soporte interno.',
    icon: 'support_agent',
    accentColor: '#2563eb',
  },
};

const ALL_PERMISSIONS: PermissionKey[] = [
  'dashboard.view',
  'sales.view',
  'clients.view',
  'clients.create',
  'clients.edit',
  'clients.delete',
  'purchases.view',
  'finance.view',
  'production.view',
  'hr.view',
  'support.view',
  'marketing.view',
  'warehouse.view',
  'inventory.view',
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'vendors.view',
  'vendors.create',
  'vendors.edit',
  'vendors.delete',
  'drivers.view',
  'drivers.create',
  'drivers.edit',
  'drivers.delete',
  'routes.view',
  'routes.create',
  'routes.edit',
  'routes.delete',
  'suppliers.view',
  'suppliers.create',
  'suppliers.edit',
  'suppliers.delete',
  'equipments.view',
  'equipments.create',
  'equipments.edit',
  'equipments.delete',
  'demand.view',
  'demand.generate',
  'demand.adjust',
  'demand.approve',
  'demand.analysis.view',
  'demand.analysis.refresh',
  'product.development.view',
  'product.development.edit',
  'product.development.approve',
  'product.development.launch',
  'purchase.analysis.view',
  'purchase.analysis.refresh',
  'settings.companies.view',
  'settings.general.view',
  'security.users.view',
  'security.profiles.view',
  'security.audit.view',
  'auditoria_export',
];

@Injectable({
  providedIn: 'root',
})
export class CompanyMockFacadeService {
  getSessionContext(username?: string | null): MockSessionContext {
    const normalizedUsername = (username ?? '').trim().toLowerCase();

    switch (normalizedUsername) {
      case 'ventas':
        return {
          companies: [COMPANY_CATALOG['medussa-holding']],
          roles: ['sales-manager'],
          permissions: [
            'dashboard.view',
            'sales.view',
            'clients.view',
            'clients.create',
            'clients.edit',
            'clients.delete',
            'vendors.view',
            'vendors.create',
            'vendors.edit',
            'vendors.delete',
            'drivers.view',
            'drivers.create',
            'drivers.edit',
            'drivers.delete',
            'routes.view',
            'routes.create',
            'routes.edit',
            'routes.delete',
            'suppliers.view',
            'suppliers.create',
            'suppliers.edit',
            'suppliers.delete',
            'equipments.view',
            'equipments.create',
            'equipments.edit',
            'equipments.delete',
            'demand.view',
            'demand.generate',
            'demand.adjust',
            'demand.analysis.view',
            'demand.analysis.refresh',
            'product.development.view',
            'product.development.edit',
            'purchase.analysis.view',
            'purchase.analysis.refresh',
            'marketing.view',
            'support.view',
          ],
          defaultCompanyId: 'medussa-holding',
        };
      case 'rrhh':
        return {
          companies: [COMPANY_CATALOG['medussa-services']],
          roles: ['hr-manager'],
          permissions: ['dashboard.view', 'hr.view', 'settings.general.view'],
          defaultCompanyId: 'medussa-services',
        };
      case 'produccion':
        return {
          companies: [COMPANY_CATALOG['medussa-industrial']],
          roles: ['operations-lead'],
          permissions: [
            'dashboard.view',
            'production.view',
            'warehouse.view',
            'inventory.view',
            'products.view',
            'products.create',
            'products.edit',
            'products.delete',
            'vendors.view',
            'vendors.create',
            'vendors.edit',
            'vendors.delete',
            'drivers.view',
            'drivers.create',
            'drivers.edit',
            'drivers.delete',
            'routes.view',
            'routes.create',
            'routes.edit',
            'routes.delete',
            'suppliers.view',
            'suppliers.create',
            'suppliers.edit',
            'suppliers.delete',
            'equipments.view',
            'equipments.create',
            'equipments.edit',
            'equipments.delete',
            'demand.view',
            'demand.generate',
            'demand.adjust',
            'demand.approve',
            'demand.analysis.view',
            'demand.analysis.refresh',
            'product.development.view',
            'product.development.edit',
            'product.development.approve',
            'product.development.launch',
            'purchase.analysis.view',
            'purchase.analysis.refresh',
            'purchases.view',
          ],
          defaultCompanyId: 'medussa-industrial',
        };
      case 'admin':
      default:
        return {
          companies: [
            COMPANY_CATALOG['medussa-holding'],
            COMPANY_CATALOG['medussa-retail'],
            COMPANY_CATALOG['medussa-industrial'],
            COMPANY_CATALOG['medussa-services'],
          ],
          roles: ['super-admin'],
          permissions: ALL_PERMISSIONS,
          defaultCompanyId: 'medussa-holding',
        };
    }
  }
}
