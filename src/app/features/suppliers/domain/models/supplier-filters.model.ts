import { SupplierStatus } from './supplier.model';
import { SupplyType } from './supply-type.model';

export type SupplierListStatusFilter = SupplierStatus | 'TODOS';

export interface SupplierFilters {
  empresaId?: string | null;
  estado?: SupplierListStatusFilter | null;
  search?: string | null;
  ciudadId?: string | null;
  tipoAbastecimiento?: SupplyType | null;
  productoPrincipal?: string | null;
  page?: number;
  pageSize?: number;
}

export const DEFAULT_SUPPLIER_FILTERS: Required<SupplierFilters> = {
  empresaId: null,
  estado: 'TODOS',
  search: '',
  ciudadId: null,
  tipoAbastecimiento: null,
  productoPrincipal: null,
  page: 0,
  pageSize: 10,
};
