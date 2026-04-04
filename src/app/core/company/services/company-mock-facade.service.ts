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
    name: 'Medussa Holding',
    code: 'HOLD',
    description: 'Vista corporativa y financiera del grupo.',
    icon: 'domain',
    accentColor: '#0f766e',
  },
  'medussa-retail': {
    id: 'medussa-retail',
    name: 'Medussa Retail',
    code: 'RTL',
    description: 'Comercial, marketing y atención omnicanal.',
    icon: 'storefront',
    accentColor: '#7c3aed',
  },
  'medussa-industrial': {
    id: 'medussa-industrial',
    name: 'Medussa Industrial',
    code: 'IND',
    description: 'Producción, almacén e inventario.',
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
  'purchases.view',
  'finance.view',
  'production.view',
  'hr.view',
  'support.view',
  'marketing.view',
  'warehouse.view',
  'inventory.view',
  'settings.general.view',
  'security.users.view',
  'security.profiles.view',
  'security.audit.view',
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
          companies: [COMPANY_CATALOG['medussa-retail']],
          roles: ['sales-manager'],
          permissions: [
            'dashboard.view',
            'sales.view',
            'marketing.view',
            'support.view',
          ],
          defaultCompanyId: 'medussa-retail',
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
          defaultCompanyId: null,
        };
    }
  }
}
