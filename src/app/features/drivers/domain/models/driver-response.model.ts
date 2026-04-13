import { DEFAULT_DRIVER_FILTERS, DriverFilters } from './driver-filters.model';
import { Driver } from './driver.model';
import { DocumentTypeOption } from './document-type.model';
import { LicenseCategoryOption } from './license-category.model';
import { RouteCatalogItem } from './route-catalog.model';

export type DriverAuditAction = 'create' | 'edit' | 'delete' | 'activate' | 'deactivate';

export type DriverMutationAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'inactivated';

export interface DriverAuditDraft {
  module: 'conductores';
  action: DriverAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface DriverListResponse {
  items: Driver[];
  total: number;
  page: number;
  pageSize: number;
  filters: DriverFilters;
}

export interface DriverMutationResult {
  action: DriverMutationAction;
  driver: Driver | null;
  message: string;
  auditDraft: DriverAuditDraft;
}

export interface DriverStore {
  drivers: Driver[];
  catalogs: {
    documentTypes: DocumentTypeOption[];
    licenseCategories: LicenseCategoryOption[];
    routes: RouteCatalogItem[];
  };
  auditTrail: DriverAuditDraft[];
}

export const EMPTY_DRIVER_LIST_RESPONSE: DriverListResponse = {
  items: [],
  total: 0,
  page: DEFAULT_DRIVER_FILTERS.page,
  pageSize: DEFAULT_DRIVER_FILTERS.pageSize,
  filters: { ...DEFAULT_DRIVER_FILTERS },
};