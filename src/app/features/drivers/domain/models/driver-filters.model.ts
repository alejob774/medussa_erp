import { DriverStatus } from './driver.model';

export type DriverListStatusFilter = DriverStatus | 'TODOS';

export interface DriverFilters {
  empresaId?: string | null;
  estado?: DriverListStatusFilter | null;
  ciudadId?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}

export const DEFAULT_DRIVER_FILTERS: Required<DriverFilters> = {
  empresaId: null,
  estado: 'TODOS',
  ciudadId: null,
  search: '',
  page: 0,
  pageSize: 10,
};