import { DEFAULT_ROUTE_FILTERS, RouteFilters } from './route-filters.model';
import { Route } from './route.model';

export type RouteAuditAction = 'create' | 'edit' | 'delete' | 'activate' | 'deactivate';

export type RouteMutationAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'inactivated';

export interface RouteAuditDraft {
  module: 'rutas';
  action: RouteAuditAction;
  companyId: string;
  companyName: string;
  entityId: string;
  entityName: string;
  summary: string;
  occurredAt: string;
  beforePayload: Record<string, unknown> | null;
  afterPayload: Record<string, unknown> | null;
}

export interface RouteListResponse {
  items: Route[];
  total: number;
  page: number;
  pageSize: number;
  filters: RouteFilters;
}

export interface RouteMutationResult {
  action: RouteMutationAction;
  route: Route | null;
  message: string;
  auditDraft: RouteAuditDraft;
}

export interface RouteStore {
  routes: Route[];
  auditTrail: RouteAuditDraft[];
}

export const EMPTY_ROUTE_LIST_RESPONSE: RouteListResponse = {
  items: [],
  total: 0,
  page: DEFAULT_ROUTE_FILTERS.page,
  pageSize: DEFAULT_ROUTE_FILTERS.pageSize,
  filters: { ...DEFAULT_ROUTE_FILTERS },
};
