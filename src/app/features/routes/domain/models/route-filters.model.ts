import { RouteStatus } from './route.model';

export type RouteListStatusFilter = RouteStatus | 'TODOS';

export interface RouteFilters {
  empresaId?: string | null;
  estado?: RouteListStatusFilter | null;
  search?: string | null;
  zona?: string | null;
  vendedorId?: string | null;
  conductorId?: string | null;
  page?: number;
  pageSize?: number;
}

export const DEFAULT_ROUTE_FILTERS: Required<RouteFilters> = {
  empresaId: null,
  estado: 'TODOS',
  search: '',
  zona: null,
  vendedorId: null,
  conductorId: null,
  page: 0,
  pageSize: 10,
};
