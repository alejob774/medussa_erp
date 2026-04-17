import { DEFAULT_PRODUCT_FILTERS, ProductFilters } from './product-filters.model';
import { Product } from './product.model';

export type ProductAuditAction = 'create' | 'edit' | 'delete' | 'activate' | 'deactivate';

export type ProductMutationAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'inactivated';

export interface ProductAuditDraft {
  module: 'productos';
  action: ProductAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  filters: ProductFilters;
}

export interface ProductMutationResult {
  action: ProductMutationAction;
  product: Product | null;
  message: string;
  auditDraft: ProductAuditDraft;
}

export interface ProductStore {
  products: Product[];
  catalogs: {
    families: string[];
    units: string[];
  };
  auditTrail: ProductAuditDraft[];
}

export const EMPTY_PRODUCT_LIST_RESPONSE: ProductListResponse = {
  items: [],
  total: 0,
  page: DEFAULT_PRODUCT_FILTERS.page,
  pageSize: DEFAULT_PRODUCT_FILTERS.pageSize,
  filters: { ...DEFAULT_PRODUCT_FILTERS },
};