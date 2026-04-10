import { VendorStatus } from './vendor.model';

export type VendorListStatusFilter = VendorStatus | 'TODOS';

export interface VendorFilters {
  empresaId?: string | null;
  estado?: VendorListStatusFilter | null;
  zona?: string | null;
  canal?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}

export const DEFAULT_VENDOR_FILTERS: Required<VendorFilters> = {
  empresaId: null,
  estado: 'TODOS',
  zona: null,
  canal: null,
  search: '',
  page: 0,
  pageSize: 10,
};