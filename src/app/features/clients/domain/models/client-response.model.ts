import { DEFAULT_CLIENT_FILTERS, ClientFilters } from './client-filters.model';
import { Client } from './client.model';

export type ClientAuditAction = 'create' | 'edit' | 'delete' | 'activate' | 'deactivate';

export type ClientMutationAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'inactivated';

export interface ClientAuditDraft {
  module: 'clientes';
  action: ClientAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface ClientListResponse {
  items: Client[];
  total: number;
  page: number;
  pageSize: number;
  filters: ClientFilters;
}

export interface ClientMutationResult {
  action: ClientMutationAction;
  client: Client | null;
  message: string;
  auditDraft: ClientAuditDraft;
}

export interface ClientStore {
  clients: Client[];
  catalogs: {
    identificationTypes: Array<{ value: string; label: string }>;
    cities: Array<{ id: string; name: string; department?: string | null }>;
  };
  auditTrail: ClientAuditDraft[];
}

export const EMPTY_CLIENT_LIST_RESPONSE: ClientListResponse = {
  items: [],
  total: 0,
  page: DEFAULT_CLIENT_FILTERS.page,
  pageSize: DEFAULT_CLIENT_FILTERS.pageSize,
  filters: { ...DEFAULT_CLIENT_FILTERS },
};