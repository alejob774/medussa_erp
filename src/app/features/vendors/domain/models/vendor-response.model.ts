import { DEFAULT_VENDOR_FILTERS, VendorFilters } from './vendor-filters.model';
import { Vendor } from './vendor.model';

export type VendorAuditAction = 'create' | 'edit' | 'delete' | 'activate' | 'deactivate';

export type VendorMutationAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'inactivated';

export interface VendorAuditDraft {
  module: 'vendedores';
  action: VendorAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface VendorListResponse {
  items: Vendor[];
  total: number;
  page: number;
  pageSize: number;
  filters: VendorFilters;
}

export interface VendorMutationResult {
  action: VendorMutationAction;
  vendor: Vendor | null;
  message: string;
  auditDraft: VendorAuditDraft;
}

export interface VendorStore {
  vendors: Vendor[];
  catalogs: {
    vendorTypes: Array<{ value: string; label: string }>;
    channels: Array<{ value: string; label: string }>;
  };
  auditTrail: VendorAuditDraft[];
}

export const EMPTY_VENDOR_LIST_RESPONSE: VendorListResponse = {
  items: [],
  total: 0,
  page: DEFAULT_VENDOR_FILTERS.page,
  pageSize: DEFAULT_VENDOR_FILTERS.pageSize,
  filters: { ...DEFAULT_VENDOR_FILTERS },
};