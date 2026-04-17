import { ClientStatus } from './client.model';

export type ClientListStatusFilter = ClientStatus | 'TODOS';

export interface ClientFilters {
  empresaId?: string | null;
  estado?: ClientListStatusFilter | null;
  ciudadId?: string | null;
  zona?: string | null;
  search?: string | null;
  page?: number;
  pageSize?: number;
}

export const DEFAULT_CLIENT_FILTERS: Required<ClientFilters> = {
  empresaId: null,
  estado: 'TODOS',
  ciudadId: null,
  zona: null,
  search: '',
  page: 0,
  pageSize: 10,
};