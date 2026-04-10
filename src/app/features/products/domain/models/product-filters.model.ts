import { ProductStatus } from './product.model';

export type ProductListStatusFilter = ProductStatus | 'TODOS';

export interface ProductFilters {
  empresaId?: string | null;
  estado?: ProductListStatusFilter | null;
  familia?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}

export const DEFAULT_PRODUCT_FILTERS: Required<ProductFilters> = {
  empresaId: null,
  estado: 'TODOS',
  familia: null,
  search: '',
  page: 0,
  pageSize: 10,
};