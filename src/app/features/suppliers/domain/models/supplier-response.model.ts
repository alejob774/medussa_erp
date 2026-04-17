import { DEFAULT_SUPPLIER_FILTERS, SupplierFilters } from './supplier-filters.model';
import { Supplier } from './supplier.model';

export type SupplierAuditAction = 'create' | 'edit' | 'delete' | 'activate' | 'deactivate';

export type SupplierMutationAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'inactivated';

export interface SupplierAuditDraft {
  module: 'proveedores';
  action: SupplierAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface SupplierListResponse {
  items: Supplier[];
  total: number;
  page: number;
  pageSize: number;
  filters: SupplierFilters;
}

export interface SupplierMutationResult {
  action: SupplierMutationAction;
  supplier: Supplier | null;
  message: string;
  auditDraft: SupplierAuditDraft;
}

export interface SupplierStore {
  suppliers: Supplier[];
  auditTrail: SupplierAuditDraft[];
}

export const EMPTY_SUPPLIER_LIST_RESPONSE: SupplierListResponse = {
  items: [],
  total: 0,
  page: DEFAULT_SUPPLIER_FILTERS.page,
  pageSize: DEFAULT_SUPPLIER_FILTERS.pageSize,
  filters: { ...DEFAULT_SUPPLIER_FILTERS },
};
